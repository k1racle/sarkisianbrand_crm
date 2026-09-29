import { jobFixture } from './job-test.fixture';
import { retryRunId } from './background-jobs.service';

describe('Background jobs: identity, access, conservative replay (no DB/Redis/providers)', () => {
  it('creates a single successor under simultaneous retries, preserving the original actor and safe response', async () => {
    const f = jobFixture();
    const responses = await Promise.all(Array.from({ length: 12 }, () => f.service.retry('source', 'operator')));
    expect(f.rows.size).toBe(2); expect(f.queue.add).toHaveBeenCalledTimes(1); expect(f.audits).toHaveLength(1);
    expect(f.rows.get('source').status).toBe('CANCELLED'); expect(f.rows.get(retryRunId('source')).initiatedById).toBe('original');
    expect(responses.filter(row => !row.reused)).toHaveLength(1);
    expect(JSON.stringify(responses)).not.toMatch(/private-|input|result|initiatedById/);
    expect(f.audits[0]).toMatchObject({ actorId: 'operator', payload: { sourceJobRunId: 'source', originalInitiatedById: 'original', retryJobRunId: retryRunId('source') } });
    expect(f.queue.add).toHaveBeenCalledWith('MARKETPLACE_ORDERS_IMPORT', { jobRunId: retryRunId('source') }, { jobId: retryRunId('source'), attempts: 1 });
  });
  it.each(['system.manage', 'marketplace.read', 'marketplace.write', 'customers.read', 'customers.write'])('cannot borrow %s from system.manage or a broad role', async key => {
    const f = jobFixture(); f.denied.operator = [key];
    await expect(f.service.retry('source', 'operator')).rejects.toMatchObject({ status: 403 });
    expect(f.queue.add).not.toHaveBeenCalled(); expect(f.rows.size).toBe(1);
  });
  it.each(['OWN', 'PARTICIPATING', 'DEPARTMENT', 'DEPARTMENT_TREE', 'SELECTED_DEPARTMENTS'])('rejects the narrow %s operation scope', async scope => {
    const f = jobFixture(); f.scopes.operator = { 'marketplace.write': scope };
    await expect(f.service.retry('source', 'operator')).rejects.toMatchObject({ status: 403 }); expect(f.rows.size).toBe(1);
  });
  it('does not promote a missing/blocked original actor to the retrying administrator', async () => {
    const f = jobFixture(); f.inactive.add('original');
    await expect(f.service.retry('source', 'operator')).rejects.toMatchObject({ status: 403 });
    f.inactive.clear(); f.rows.get('source').initiatedById = null;
    await expect(f.service.retry('source', 'operator')).rejects.toMatchObject({ status: 403 });
    expect(f.queue.add).not.toHaveBeenCalled();
  });
  it.each([{ status: 'ACTIVE' }, { status: 'WAITING' }, { status: 'COMPLETED' }, { status: 'CANCELLED' }, { attempts: 1 }, { startedAt: new Date() }])('blocks replay outside a never-started failure: %j', async patch => {
    const f = jobFixture(); Object.assign(f.source, patch);
    await expect(f.service.retry('source', 'operator')).rejects.toMatchObject({ status: 409 });
    expect(f.queue.add).not.toHaveBeenCalled();
  });
  it('unknown job names and unrelated queues fail closed', async () => {
    const f = jobFixture(); f.source.jobName = '__proto__';
    await expect(f.service.retry('source', 'operator')).rejects.toMatchObject({ status: 403 });
    f.rows.get('source').queueName = 'other';
    await expect(f.service.retry('source', 'operator')).rejects.toMatchObject({ status: 404 });
  });
  it('rolls back source cancellation and child creation if the durable audit fails', async () => {
    const f = jobFixture(); f.db.auditLog.create.mockRejectedValueOnce(new Error('offline'));
    await expect(f.service.retry('source', 'operator')).rejects.toThrow('offline');
    expect(f.rows.size).toBe(1); expect(f.rows.get('source').status).toBe('FAILED'); expect(f.queue.add).not.toHaveBeenCalled();
  });
  it('list capability matches current rights and never returns input, original identity, result or errors', async () => {
    const f = jobFixture(); let rows = await f.service.list('operator');
    expect(rows[0].canRetry).toBe(true); expect(JSON.stringify(rows)).not.toMatch(/private-|initiatedById|input|result|error/);
    f.denied.operator = ['marketplace.write']; rows = await f.service.list('operator');
    expect(rows[0].canRetry).toBe(false); expect(rows[0].retryReason).toContain('Нет доступа');
    f.inactive.add('operator'); await expect(f.service.list('operator')).rejects.toMatchObject({ status: 403 });
  });
  it('enqueue checks permissions before persistence and returns metadata only', async () => {
    const f = jobFixture(); f.denied.original = ['marketplace.write'];
    await expect(f.service.enqueue('MARKETPLACE_ORDERS_IMPORT', {}, 'original')).rejects.toMatchObject({ status: 403 });
    expect(f.db.jobRun.create).not.toHaveBeenCalled();
    f.denied.original = [];
    const result = await f.service.enqueue('MARKETPLACE_ORDERS_IMPORT', { secret: 'private-payload' }, 'original');
    expect(JSON.stringify(result)).not.toMatch(/private-|input|result|initiatedById/);
  });
  it('worker executes DB input, not Redis input, and suppresses concurrent/duplicate deliveries', async () => {
    const f = jobFixture(); f.source.status = 'WAITING';
    const a = f.job(), b = f.job(); await Promise.all([f.process(a), f.process(b)]);
    expect(f.handler).toHaveBeenCalledTimes(1);
    expect(f.handler).toHaveBeenCalledWith(f.source.input, expect.any(Function), { initiatedById: 'original' });
    expect(a.discard).toHaveBeenCalled(); expect(f.rows.get('source').attempts).toBe(1);
    expect(await f.process()).toEqual({ skipped: true });
  });
  it.each([{ id: 'wrong' }, { name: '1C_FULL_EXCHANGE' }, { data: { jobRunId: 'different' } }])('rejects forged queue identity: %j', async extra => {
    const f = jobFixture(); f.source.status = 'WAITING';
    await expect(f.process(f.job('source', extra))).rejects.toThrow();
    expect(f.handler).not.toHaveBeenCalled(); expect(f.rows.get('source').status).toBe('WAITING');
  });
  it('revocation between enqueue and execution prevents effects', async () => {
    const f = jobFixture(); f.source.status = 'WAITING'; f.denied.original = ['customers.write'];
    await expect(f.process()).rejects.toThrow('заблокировано');
    expect(f.handler).not.toHaveBeenCalled(); expect(f.rows.get('source')).toMatchObject({ status: 'FAILED', attempts: 0, startedAt: null });
  });
  it('a failure after execution starts is not automatically or manually replayed; raw errors do not escape', async () => {
    const f = jobFixture(); f.source.status = 'WAITING'; f.handler.mockRejectedValue(new Error('private-provider-token'));
    await expect(f.process()).rejects.toThrow('сверка результата');
    expect(f.rows.get('source')).toMatchObject({ status: 'FAILED', attempts: 1, nextRetryAt: null });
    expect(f.rows.get('source').error).not.toContain('private');
    await expect(f.service.retry('source', 'operator')).rejects.toMatchObject({ status: 409 });
    expect(await f.process()).toEqual({ skipped: true }); expect(f.handler).toHaveBeenCalledTimes(1);
  });
  it('legacy RETRYING after partial effects is fenced off instead of silently rerun', async () => {
    const f = jobFixture(); f.source.status = 'RETRYING'; f.source.attempts = 2;
    await expect(f.process()).rejects.toThrow('заблокировано');
    expect(f.handler).not.toHaveBeenCalled(); expect(f.rows.get('source').status).toBe('FAILED');
  });
  it('an ambiguous queue timeout cannot turn an already completed delivery into FAILED', async () => {
    const f = jobFixture();
    f.queue.add.mockImplementation(async (_name, _data, opts) => { await f.process(f.job(opts.jobId)); throw new Error('lost acknowledgement'); });
    await expect(f.service.retry('source', 'operator')).rejects.toMatchObject({ status: 503 });
    expect(f.rows.get(retryRunId('source')).status).toBe('COMPLETED'); expect(f.handler).toHaveBeenCalledTimes(1);
    const repeated = await f.service.retry('source', 'operator'); expect(repeated.reused).toBe(true); expect(f.queue.add).toHaveBeenCalledTimes(1);
  });
  it('a late Redis delivery after an unconfirmed dispatch cannot execute the fenced source', async () => {
    const f = jobFixture(); f.queue.add.mockRejectedValueOnce(new Error('timeout'));
    await expect(f.service.retry('source', 'operator')).rejects.toMatchObject({ status: 503 });
    const id = retryRunId('source'); expect(f.rows.get(id).status).toBe('FAILED');
    expect(await f.process(f.job(id))).toEqual({ skipped: true }); expect(f.handler).not.toHaveBeenCalled();
    expect((await f.service.retry(id, 'operator')).reused).toBe(false); expect(f.rows.size).toBe(3);
  });
  it('dispatch recovery only sends never-started, undispatched WAITING records', async () => {
    const f = jobFixture(); f.source.status = 'WAITING';
    await (f.service as any).dispatchPending();
    expect(f.queue.add).toHaveBeenCalledTimes(1); expect(f.rows.get('source').externalJobId).toBe('source');
    await (f.service as any).dispatchPending(); expect(f.queue.add).toHaveBeenCalledTimes(1);
  });
  it('a failed/missing transport before claim becomes a retryable failure, not permanently WAITING', async () => {
    const f = jobFixture(); Object.assign(f.source, { status: 'WAITING', externalJobId: 'source' });
    f.queue.getJob.mockResolvedValue(null);
    await (f.service as any).dispatchPending();
    expect(f.rows.get('source')).toMatchObject({ status: 'FAILED', attempts: 0, startedAt: null });
    expect((await f.service.list('operator'))[0].canRetry).toBe(true);
  });
  it('server order exports keep null initiator and require a persisted source plus operator domain rights', async () => {
    const f = jobFixture(); Object.assign(f.source, { jobName: '1C_ORDER_EXPORT', input: { orderId: 'order' }, initiatedById: null });
    await f.service.retry('source', 'operator'); expect(f.rows.get(retryRunId('source')).initiatedById).toBeNull();
    f.db.order.findFirst.mockResolvedValue(null); await expect(f.service.retry('source', 'operator')).rejects.toMatchObject({ status: 404 });
  });
  it('bot replay rechecks the persisted webhook integration and cannot use an arbitrary actor', async () => {
    const f = jobFixture(); Object.assign(f.source, { jobName: 'BOT_WEBHOOK_PROCESS', input: { eventId: 'event' }, initiatedById: null });
    f.db.botWebhookEvent.findUnique.mockResolvedValue({ provider: 'TELEGRAM', audience: 'B2C', integration: { key: 'BOT_TELEGRAM_B2C', isEnabled: false, status: 'CONFIGURED' } });
    await expect(f.service.retry('source', 'operator')).rejects.toMatchObject({ status: 403 }); expect(f.queue.add).not.toHaveBeenCalled();
  });
  it('does not put a private handler result in Redis', async () => {
    const f = jobFixture(); f.source.status = 'WAITING';
    const result = await f.process(); expect(result).toEqual({ completed: true, jobRunId: 'source' });
    expect(f.rows.get('source').result).toEqual({ private: 'handler-result' });
  });
});
