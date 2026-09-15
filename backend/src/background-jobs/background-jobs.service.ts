import { Injectable, Logger, NotFoundException, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JobRunStatus, Prisma } from '@prisma/client';
import { Job, Queue, Worker } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';

export type JobProgress = (progress: number) => Promise<void>;
export type JobHandler = (payload: any, progress: JobProgress) => Promise<any>;

@Injectable()
export class BackgroundJobsService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(BackgroundJobsService.name);
  private readonly queueName = 'ecosystem-operations';
  private readonly handlers = new Map<string, JobHandler>();
  private queue!: Queue;
  private worker!: Worker;

  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService) {}

  register(jobName: string, handler: JobHandler) {
    if (this.handlers.has(jobName)) throw new Error(`Обработчик ${jobName} уже зарегистрирован`);
    this.handlers.set(jobName, handler);
  }

  async onApplicationBootstrap() {
    const connection = this.connection();
    this.queue = new Queue(this.queueName, {
      connection,
      defaultJobOptions: { attempts: 4, backoff: { type: 'exponential', delay: 2000 }, removeOnComplete: 250, removeOnFail: 500 },
    });
    this.worker = new Worker(this.queueName, job => this.process(job), { connection, concurrency: 3 });
    this.worker.on('error', error => this.logger.error(`Ошибка очереди: ${error.message}`));
    await this.queue.waitUntilReady();
    this.logger.log(`Очередь ${this.queueName} подключена к Redis`);
  }

  private connection() {
    const value = this.config.get<string>('REDIS_URL', 'redis://127.0.0.1:6379');
    const url = new URL(value);
    return {
      host: url.hostname,
      port: Number(url.port || 6379),
      username: url.username || undefined,
      password: url.password || undefined,
      db: Number(url.pathname.slice(1) || 0),
      ...(url.protocol === 'rediss:' ? { tls: {} } : {}),
    } as any;
  }

  async enqueue(jobName: string, payload: any, initiatedById?: string, correlationId?: string) {
    if (!this.handlers.has(jobName)) throw new NotFoundException(`Фоновая операция ${jobName} не зарегистрирована`);
    const run = await this.prisma.jobRun.create({
      data: {
        queueName: this.queueName,
        jobName,
        input: payload as Prisma.InputJsonValue,
        initiatedById,
        correlationId,
      },
    });
    try {
      const job = await this.queue.add(jobName, { jobRunId: run.id, payload }, { jobId: run.id });
      return this.prisma.jobRun.update({ where: { id: run.id }, data: { externalJobId: String(job.id) } });
    } catch (error: any) {
      await this.prisma.jobRun.update({ where: { id: run.id }, data: { status: JobRunStatus.FAILED, error: error.message, finishedAt: new Date() } });
      throw error;
    }
  }

  async retry(id: string, initiatedById?: string) {
    const run = await this.prisma.jobRun.findUnique({ where: { id } });
    if (!run) throw new NotFoundException('Фоновая операция не найдена');
    if (run.status !== JobRunStatus.FAILED && run.status !== JobRunStatus.CANCELLED) throw new NotFoundException('Повтор доступен только для завершившейся с ошибкой операции');
    return this.enqueue(run.jobName, run.input, initiatedById, run.correlationId);
  }

  async health() {
    try {
      const counts = await this.queue.getJobCounts('waiting', 'active', 'delayed', 'completed', 'failed');
      return { connected: true, queue: this.queueName, counts };
    } catch (error: any) {
      return { connected: false, queue: this.queueName, error: error.message, counts: {} };
    }
  }

  private async process(job: Job<{ jobRunId: string; payload: any }>) {
    const handler = this.handlers.get(job.name);
    if (!handler) throw new Error(`Нет обработчика операции ${job.name}`);
    const attempts = Math.max(1, job.attemptsMade);
    await this.prisma.jobRun.update({ where: { id: job.data.jobRunId }, data: { status: JobRunStatus.ACTIVE, attempts, startedAt: new Date(), nextRetryAt: null, error: null } });
    const progress: JobProgress = async value => {
      const normalized = Math.max(0, Math.min(100, Math.round(value)));
      await job.updateProgress(normalized);
      await this.prisma.jobRun.update({ where: { id: job.data.jobRunId }, data: { progress: normalized } });
    };
    try {
      const result = await handler(job.data.payload, progress);
      await this.prisma.jobRun.update({
        where: { id: job.data.jobRunId },
        data: { status: JobRunStatus.COMPLETED, progress: 100, result: result as Prisma.InputJsonValue, finishedAt: new Date(), nextRetryAt: null },
      });
      return result;
    } catch (error: any) {
      const maxAttempts = Number(job.opts.attempts || 1);
      const retrying = attempts < maxAttempts;
      const delay = 2000 * Math.pow(2, Math.max(0, attempts - 1));
      await this.prisma.jobRun.update({
        where: { id: job.data.jobRunId },
        data: { status: retrying ? JobRunStatus.RETRYING : JobRunStatus.FAILED, error: String(error.message || error).slice(0, 4000), finishedAt: retrying ? null : new Date(), nextRetryAt: retrying ? new Date(Date.now() + delay) : null },
      });
      throw error;
    }
  }

  async onModuleDestroy() {
    await Promise.allSettled([this.worker?.close(), this.queue?.close()].filter(Boolean));
  }
}
