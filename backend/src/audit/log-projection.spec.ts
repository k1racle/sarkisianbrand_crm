import { AuditService } from './audit.service';
import { SystemSettingsService } from '../system-settings/system-settings.service';
import { projectOperation } from '../common/operational-access.fixture';

describe('Administrative logs: metadata-only projection', () => {
  const secret = { payload: { password: 'secret-payload' }, result: { token: 'secret-result' }, message: 'secret-message', error: 'secret-error', details: 'secret-details', input: 'secret-input', ipAddress: 'secret-ip', userAgent: 'secret-agent' };
  function model() { return { findMany: jest.fn(async q => [projectOperation({ id: 'test', action: 'PATCH', status: 'FAILED', route: '/crm/tasks/one?token=secret-query', ...secret, actor: { id: 'actor', firstName: 'Анна', role: 'ADMIN', email: 'secret-email' } }, q.select)]) }; }
  it('audit excludes payload/result/network identity/actor email and strips query strings', async () => {
    const db: any = { auditLog: model() }; const result = await new AuditService(db).list();
    expect(JSON.stringify(result)).not.toContain('secret'); expect(result[0].route).toBe('/crm/tasks/one');
    expect(db.auditLog.findMany.mock.calls[0][0].select).not.toHaveProperty('payload');
  });
  it('technical log hides raw job/sync errors and queue connection diagnostics', async () => {
    const db: any = Object.fromEntries(['syncLog', 'marketplaceIntegration', 'auditLog', 'jobRun'].map(key => [key, model()]));
    const jobs: any = { list: jest.fn().mockResolvedValue([{ id: 'run', canRetry: false, retryReason: 'Нужна сверка' }]), health: async () => ({ connected: false, queue: 'crm', workerEnabled: false, counts: {}, error: 'secret-redis-url' }) };
    const result = await new SystemSettingsService(db, jobs, {} as any, {} as any).technicalLogs('actor');
    expect(jobs.list).toHaveBeenCalledWith('actor');
    expect(result.detailsRestricted).toBe(true); expect(JSON.stringify(result)).not.toContain('secret');
    expect(result.queue.connected).toBe(false); expect(result.recentAudit[0].route).toBe('/crm/tasks/one');
  });
});
