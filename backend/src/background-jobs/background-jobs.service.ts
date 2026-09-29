import { ConflictException, Injectable, Logger, NotFoundException, OnApplicationBootstrap, OnModuleDestroy, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { createHash } from 'crypto';
import { Job, Queue, Worker } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { ecosystemAutomationEnabled } from '../common/ecosystem-automation';
import { JobPolicy, jobSummary, jobSummarySelect, retryBlock } from './job-policy';

export type JobProgress = (progress: number) => Promise<void>;
export type JobContext = { initiatedById: string | null };
export type JobHandler = (payload: any, progress: JobProgress, context: JobContext) => Promise<any>;

// A failed source has exactly one successor, even across processes/repeated HTTP requests.
export function retryRunId(source: string) {
  const hex = createHash('sha256').update('crm-job-retry:v1:' + source).digest('hex');
  return hex.slice(0, 8) + '-' + hex.slice(8, 12) + '-5' + hex.slice(13, 16) + '-a' + hex.slice(17, 20) + '-' + hex.slice(20, 32);
}

@Injectable()
export class BackgroundJobsService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(BackgroundJobsService.name);
  private readonly queueName = 'ecosystem-operations';
  private readonly handlers = new Map<string, JobHandler>();
  private queue!: Queue;
  private worker!: Worker;
  private dispatchTimer?: NodeJS.Timeout;
  private dispatching = false;

  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService, private readonly policy: JobPolicy) {}

  register(jobName: string, handler: JobHandler) {
    if (this.handlers.has(jobName)) throw new Error('Обработчик ' + jobName + ' уже зарегистрирован');
    this.handlers.set(jobName, handler);
  }

  async onApplicationBootstrap() {
    const connection = this.connection();
    this.queue = new Queue(this.queueName, {
      connection,
      defaultJobOptions: { attempts: 1, removeOnComplete: 250, removeOnFail: 500 },
    });
    await this.queue.waitUntilReady();
    if (ecosystemAutomationEnabled()) {
      this.worker = new Worker(this.queueName, job => this.process(job), { connection, concurrency: 3 });
      this.worker.on('error', () => this.logger.error('Ошибка транспорта очереди; требуется диагностика'));
      this.dispatchTimer = setInterval(() => void this.dispatchPending(), 10000);
      this.dispatchTimer.unref();
    }
    this.logger.log('Очередь ' + this.queueName + ' подключена к Redis');
  }

  private connection() {
    const url = new URL(this.config.get<string>('REDIS_URL', 'redis://127.0.0.1:6379'));
    return { host: url.hostname, port: Number(url.port || 6379), username: url.username || undefined,
      password: url.password || undefined, db: Number(url.pathname.slice(1) || 0),
      ...(url.protocol === 'rediss:' ? { tls: {} } : {}) } as any;
  }

  async enqueue(jobName: string, payload: any, initiatedById?: string, correlationId?: string) {
    if (!this.handlers.has(jobName)) throw new NotFoundException('Обработчик фоновой операции не зарегистрирован');
    const run = await this.prisma.$transaction(async db => {
      await this.policy.execution(db, { jobName, input: payload, initiatedById: initiatedById || null });
      return db.jobRun.create({ data: { queueName: this.queueName, jobName, input: payload as Prisma.InputJsonValue,
        initiatedById, correlationId, maxAttempts: 1 } });
    });
    await this.dispatch(run);
    return jobSummary(await this.prisma.jobRun.findUniqueOrThrow({ where: { id: run.id } }));
  }

  private async dispatch(run: { id: string; jobName: string }) {
    try {
      // Redis carries identity only. An old payload still in Redis is never trusted.
      await this.queue.add(run.jobName, { jobRunId: run.id }, { jobId: run.id, attempts: 1 });
      await this.prisma.jobRun.update({ where: { id: run.id }, data: { externalJobId: run.id } });
    } catch {
      // A queue timeout can mean acceptance. Do not overwrite an already claimed/completed run.
      await this.prisma.jobRun.updateMany({ where: { id: run.id, status: 'WAITING', attempts: 0, startedAt: null },
        data: { status: 'FAILED', error: 'Постановка в очередь не подтверждена', finishedAt: new Date() } });
      throw new ServiceUnavailableException('Постановка в очередь не подтверждена. Обновите журнал перед повтором');
    }
  }

  private async dispatchPending() {
    if (this.dispatching) return;
    this.dispatching = true;
    try {
      // Recovery of commit-before-queue crash. The stable queue ID deduplicates competing dispatchers.
      const pending = await this.prisma.jobRun.findMany({ where: { queueName: this.queueName, status: 'WAITING', externalJobId: null, attempts: 0, startedAt: null },
        select: { id: true, jobName: true }, orderBy: { createdAt: 'asc' }, take: 100 });
      for (const run of pending) { try { await this.dispatch(run); } catch { /* Safe metadata is retained in the DB. */ } }
      const waiting = await this.prisma.jobRun.findMany({ where: { queueName: this.queueName, status: 'WAITING', externalJobId: { not: null }, attempts: 0, startedAt: null },
        select: { id: true }, orderBy: { createdAt: 'asc' }, take: 100 });
      for (const run of waiting) {
        const queued = await this.queue.getJob(run.id);
        if (!queued || ['failed', 'completed'].includes(await queued.getState())) {
          // Transport ended before the DB claim. Fence any late delivery and expose a safe retry.
          await this.prisma.jobRun.updateMany({ where: { id: run.id, status: 'WAITING', attempts: 0, startedAt: null },
            data: { status: 'FAILED', error: 'Транспорт завершился до начала выполнения', finishedAt: new Date() } });
        }
      }
    } catch { this.logger.warn('Не удалось проверить неотправленные задания'); }
    finally { this.dispatching = false; }
  }

  async list(actor: string) {
    return this.prisma.$transaction(async db => {
      const operator = await this.policy.operator(db, actor);
      const rows = await db.jobRun.findMany({ where: { queueName: this.queueName }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 100,
        select: { ...jobSummarySelect, initiatedById: true, input: true } });
      return Promise.all(rows.map(async row => {
        let reason = retryBlock(row);
        if (!this.handlers.has(row.jobName)) reason = 'Обработчик операции недоступен';
        if (!reason) {
          try { this.policy.assertPermissions(operator, row.jobName); await this.policy.execution(db, row); }
          catch (error: any) {
            if (![403, 404].includes(error?.getStatus?.())) throw error;
            reason = 'Нет доступа к исходной операции или её инициатору';
          }
        }
        return { ...jobSummary(row), canRetry: !reason, retryReason: reason };
      }));
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead, timeout: 30000 });
  }

  async retry(id: string, actor: string) {
    const result = await this.prisma.$transaction(async db => {
      const operator = await this.policy.operator(db, actor);
      await db.$queryRawUnsafe('SELECT id FROM "JobRun" WHERE id = $1 FOR UPDATE', id);
      const source = await db.jobRun.findUnique({ where: { id } });
      if (!source || source.queueName !== this.queueName) throw new NotFoundException('Фоновая операция не найдена');
      this.policy.assertPermissions(operator, source.jobName);
      await this.policy.execution(db, source); // Original identity, never replaced with the retrying administrator.
      const existing = await db.jobRun.findUnique({ where: { id: retryRunId(id) } });
      if (existing) return { run: existing, reused: true };
      if (!this.handlers.has(source.jobName)) throw new ConflictException('Обработчик операции недоступен');
      const reason = retryBlock(source);
      if (reason) throw new ConflictException(reason);
      // Fence off a late Redis delivery of the source, under the same row lock used by the worker.
      await db.jobRun.update({ where: { id }, data: { status: 'CANCELLED', nextRetryAt: null } });
      const run = await db.jobRun.create({ data: { id: retryRunId(id), queueName: this.queueName, jobName: source.jobName,
        input: source.input === null ? Prisma.DbNull : source.input, initiatedById: source.initiatedById, correlationId: source.correlationId, maxAttempts: 1 } });
      await db.auditLog.create({ data: { actorId: actor, action: 'RETRY', resource: 'background-jobs', resourceId: id, correlationId: source.correlationId,
        payload: { sourceJobRunId: id, retryJobRunId: run.id, originalInitiatedById: source.initiatedById } } });
      return { run, reused: false };
    }, { timeout: 30000 });
    if (!result.reused) await this.dispatch(result.run);
    return { job: jobSummary(result.run), reused: result.reused };
  }

  async health() {
    try { return { connected: true, queue: this.queueName, counts: await this.queue.getJobCounts('waiting', 'active', 'delayed', 'completed', 'failed'), workerEnabled: ecosystemAutomationEnabled() }; }
    catch { return { connected: false, queue: this.queueName, counts: {}, workerEnabled: ecosystemAutomationEnabled() }; }
  }

  private async process(job: Job<{ jobRunId: string; payload?: any }>) {
    // No existing handler has an accepted automatic replay contract after effects start.
    job.discard();
    if (typeof job.data?.jobRunId !== 'string' || job.id !== job.data.jobRunId) throw new Error('Некорректная идентичность задания');
    const claim = await this.prisma.$transaction(async db => {
      await db.$queryRawUnsafe('SELECT id FROM "JobRun" WHERE id = $1 FOR UPDATE', job.id);
      const run = await db.jobRun.findUnique({ where: { id: job.id } });
      if (!run || run.jobName !== job.name || run.queueName !== this.queueName || (run.externalJobId && run.externalJobId !== job.id)) throw new Error('Задание не соответствует сохранённому запуску');
      if (!['WAITING', 'RETRYING'].includes(run.status)) return { run: null, blocked: false };
      if (run.attempts > 0 || run.startedAt) {
        await db.jobRun.update({ where: { id: run.id }, data: { status: 'FAILED', error: 'Нужна сверка результата предыдущего выполнения', nextRetryAt: null, finishedAt: new Date() } });
        return { run: null, blocked: true };
      }
      try {
        if (!this.handlers.has(run.jobName)) throw new NotFoundException('Обработчик недоступен');
        await this.policy.execution(db, run);
      } catch (error: any) {
        if (![403, 404].includes(error?.getStatus?.())) throw error;
        await db.jobRun.update({ where: { id: run.id }, data: { status: 'FAILED', error: 'Нет доступа к исходной операции', nextRetryAt: null, finishedAt: new Date() } });
        return { run: null, blocked: true };
      }
      const claimed = await db.jobRun.update({ where: { id: run.id }, data: { status: 'ACTIVE', attempts: 1, maxAttempts: 1, startedAt: new Date(), nextRetryAt: null, error: null } });
      return { run: claimed, blocked: false };
    }, { timeout: 30000 });
    if (!claim.run) {
      if (claim.blocked) throw new Error('Выполнение заблокировано; проверьте журнал');
      return { skipped: true };
    }
    const run = claim.run;
    const progress: JobProgress = async value => {
      if (!Number.isFinite(value)) return;
      const normalized = Math.max(0, Math.min(100, Math.round(value)));
      await job.updateProgress(normalized);
      await this.prisma.jobRun.update({ where: { id: run.id }, data: { progress: normalized } });
    };
    try {
      const result = await this.handlers.get(run.jobName)!(run.input, progress, { initiatedById: run.initiatedById });
      await this.prisma.jobRun.update({ where: { id: run.id }, data: { status: 'COMPLETED', progress: 100, result: result == null ? Prisma.DbNull : result,
        finishedAt: new Date(), nextRetryAt: null } });
      // Redis keeps only non-sensitive outcome metadata, not handler payload/result.
      return { completed: true, jobRunId: run.id };
    } catch {
      await this.prisma.jobRun.update({ where: { id: run.id }, data: { status: 'FAILED', error: 'Выполнение прервано. Перед повтором нужна сверка результата',
        finishedAt: new Date(), nextRetryAt: null } });
      throw new Error('Выполнение прервано. Перед повтором нужна сверка результата');
    }
  }

  async onModuleDestroy() {
    if (this.dispatchTimer) clearInterval(this.dispatchTimer);
    await Promise.allSettled([this.worker?.close(), this.queue?.close()].filter(Boolean));
  }
}
