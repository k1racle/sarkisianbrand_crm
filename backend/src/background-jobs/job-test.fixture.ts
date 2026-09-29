// Isolated repository/queue doubles; never opens Prisma, Redis or provider connections.
import { ForbiddenException } from '@nestjs/common';
import { BackgroundJobsService } from './background-jobs.service';
import { JobPolicy, jobPolicies } from './job-policy';
import { CrmReadPolicy } from '../crm/read-access';
import { resolveProfileScopes } from '../auth/access-scope-policy';
import { matchesOperation, projectOperation } from '../common/operational-access.fixture';

export function jobFixture() {
  const source: any = { id: 'source', jobName: 'MARKETPLACE_ORDERS_IMPORT', queueName: 'ecosystem-operations', status: 'FAILED', attempts: 0, maxAttempts: 1,
    startedAt: null, finishedAt: new Date(), createdAt: new Date(), nextRetryAt: null, progress: 0, externalJobId: null,
    initiatedById: 'original', correlationId: 'chain', input: { orders: [], secret: 'private-input' }, result: { secret: 'private-result' }, error: 'private-error' };
  const rows = new Map<string, any>([['source', source]]), audits: any[] = [];
  const inactive = new Set<string>(), denied: Record<string, string[]> = {}, scopes: Record<string, Record<string, string>> = {};
  const access: any = { resolve: jest.fn(async (_db, id, key) => {
    if (!id || inactive.has(id)) throw new ForbiddenException('Unavailable');
    const actor = { id, isActive: true, role: 'IT_SUPPORT', departmentId: 'sales' };
    const keys = [...new Set(['system.manage', ...Object.values(jobPolicies).flatMap(p => p.permissions)])];
    return new CrmReadPolicy(id, resolveProfileScopes(actor, keys.map(permissionKey => ({ profileId: 'test', profileName: 'Test', permissionKey,
      scope: scopes[id]?.[permissionKey] || 'COMPANY', departmentIds: scopes[id]?.[permissionKey] === 'SELECTED_DEPARTMENTS' ? ['sales'] : [] })), [{ id: 'sales', parentId: null, archivedAt: null }], denied[id] || []), key);
  }) };
  const copy = (value: any) => value == null ? value : structuredClone(value);
  const db: any = {
    $queryRawUnsafe: jest.fn(),
    auditLog: { create: jest.fn(async ({ data }) => { audits.push(copy(data)); return data; }) },
    order: { findFirst: jest.fn().mockResolvedValue({ id: 'order' }) },
    botWebhookEvent: { findUnique: jest.fn().mockResolvedValue({ provider: 'TELEGRAM', audience: 'B2C', integration: { key: 'BOT_TELEGRAM_B2C', isEnabled: true, status: 'CONFIGURED' } }) },
    jobRun: {
      findUnique: jest.fn(async ({ where }) => copy(rows.get(where.id) || null)),
      findUniqueOrThrow: jest.fn(async ({ where }) => { if (!rows.has(where.id)) throw new Error('Missing'); return copy(rows.get(where.id)); }),
      findMany: jest.fn(async ({ where, select, take }) => [...rows.values()].filter(row => matchesOperation(row, where)).slice(0, take).map(row => copy(projectOperation(row, select)))),
      create: jest.fn(async ({ data }) => {
        const id = data.id || 'run-' + rows.size;
        if (rows.has(id)) throw Object.assign(new Error('duplicate'), { code: 'P2002' });
        const row = { ...source, status: 'WAITING', attempts: 0, startedAt: null, finishedAt: null, externalJobId: null, error: null, result: null, ...data, id };
        rows.set(id, copy(row)); return copy(row);
      }),
      update: jest.fn(async ({ where, data }) => { const row = rows.get(where.id); if (!row) throw new Error('Missing'); Object.assign(row, data); return copy(row); }),
      updateMany: jest.fn(async ({ where, data }) => { let count = 0; for (const row of rows.values()) if (matchesOperation(row, where)) { Object.assign(row, data); count++; } return { count }; }),
    },
  };
  // Serialize transactions to model the explicit source-row lock. Real PostgreSQL races are a server acceptance gate.
  let tail = Promise.resolve();
  db.$transaction = (fn: any) => {
    const pending = tail.then(async () => {
      const snapshot = copy([...rows.entries()]), count = audits.length;
      try { return await fn(db); } catch (error) { rows.clear(); for (const [id, row] of snapshot) rows.set(id, row); audits.splice(count); throw error; }
    });
    tail = pending.then(() => undefined, () => undefined); return pending;
  };
  const policy = new JobPolicy(access), service = new BackgroundJobsService(db, {} as any, policy);
  const queue = { add: jest.fn(async (_name, _data, opts) => ({ id: opts.jobId })), getJob: jest.fn().mockResolvedValue({ getState: async () => 'waiting' }) };
  (service as any).queue = queue;
  const handler = jest.fn().mockResolvedValue({ private: 'handler-result' });
  for (const name of Object.keys(jobPolicies)) service.register(name, handler);
  const job = (id = 'source', extra: any = {}) => ({ id, name: rows.get(id)?.jobName, data: { jobRunId: id, payload: { secret: 'forged-redis' } },
    opts: { attempts: 4 }, attemptsMade: 0, discard: jest.fn(), updateProgress: jest.fn(), ...extra });
  return { service, policy, rows, source, db, queue, handler, access, inactive, denied, scopes, audits, job,
    process: (input = job()) => (service as any).process(input) };
}
