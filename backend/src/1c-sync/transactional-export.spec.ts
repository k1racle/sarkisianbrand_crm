import { OneCSyncService } from './1c-sync.service';

describe('1C export staging: local durable outbox, no Redis or HTTP', () => {
  function fixture(integration: any) {
    const tx: any = { ecosystemIntegration: { findUnique: jest.fn().mockResolvedValue(integration) } };
    const jobs: any = { stage: jest.fn().mockResolvedValue({ id: 'run', status: 'WAITING' }) };
    const client: any = { status: jest.fn(), post: jest.fn() };
    return { tx, jobs, client, service: new OneCSyncService({} as any, jobs, client) };
  }
  it('stages a configured export inside the caller transaction', async () => {
    const f = fixture({ isEnabled: true, config: { baseUrl: 'https://example.invalid/' }, configuredSecretKeys: ['password'] });
    expect(await f.service.stageOrderExport(f.tx, 'order', 'owner')).toEqual({ id: 'run', status: 'WAITING' });
    expect(f.jobs.stage).toHaveBeenCalledWith(f.tx, '1C_ORDER_EXPORT', { orderId: 'order' }, 'owner');
    expect(f.client.status).not.toHaveBeenCalled(); expect(f.client.post).not.toHaveBeenCalled();
  });
  it.each([null, { isEnabled: false }, { isEnabled: true, config: {}, configuredSecretKeys: [] },
    { isEnabled: true, config: { baseUrl: 'https://example.invalid/' }, configuredSecretKeys: [] }])('does not activate a disabled/unconfigured integration: %j', async integration => {
    const f = fixture(integration); expect(await f.service.stageOrderExport(f.tx, 'order')).toBeNull(); expect(f.jobs.stage).not.toHaveBeenCalled();
  });
  it('propagates persistence failure so the source transaction can roll back', async () => {
    const f = fixture({ isEnabled: true, config: { baseUrl: 'https://example.invalid/' }, configuredSecretKeys: ['password'] });
    f.jobs.stage.mockRejectedValue(new Error('outbox write failed'));
    await expect(f.service.stageOrderExport(f.tx, 'order')).rejects.toThrow('outbox write failed');
  });
});
