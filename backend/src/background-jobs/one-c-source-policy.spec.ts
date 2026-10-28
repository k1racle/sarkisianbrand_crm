import { JobPolicy } from './job-policy';

describe('1C order export policy', () => {
  const policy = new JobPolicy({} as any);
  const run = { jobName: '1C_ORDER_EXPORT', initiatedById: null, input: { orderId: 'order' } };

  it('allows a 1C-origin order only while it has a request awaiting processing', async () => {
    const seen: any[] = [];
    let source = 'ONE_C';
    let requestStatus: string | null = null;
    const db: any = { order: { findFirst: jest.fn(async ({ where }: any) => {
      seen.push(where);
      return where.id === 'order' && (source !== 'ONE_C' || (requestStatus && where.OR[1].oneCRequests.some.status.in.includes(requestStatus))) ? { id: 'order' } : null;
    }) } };
    await expect(policy.execution(db, run)).rejects.toMatchObject({ status: 404 });
    requestStatus = 'PENDING'; await expect(policy.execution(db, run)).resolves.toBeUndefined();
    requestStatus = 'RECEIVED'; await expect(policy.execution(db, run)).resolves.toBeUndefined();
    requestStatus = 'COMPLETED'; await expect(policy.execution(db, run)).rejects.toMatchObject({ status: 404 });
    source = 'OZON'; await expect(policy.execution(db, run)).resolves.toBeUndefined();
    expect(seen[0].OR[0]).toEqual({ source: { not: 'ONE_C' } });
  });
});
