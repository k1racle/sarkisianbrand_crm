import { CrmReadPolicy } from '../crm/read-access';
import { resolveProfileScopes } from '../auth/access-scope-policy';
import { matchesOperation, operationDepartments, projectOperation } from '../common/operational-access.fixture';
import { LeadershipService } from './leadership.service';

describe('Leadership scope intersections (in-memory only)', () => {
  const keys = ['leadership.read', 'oms.read', 'customers.read', 'crm.read', 'helpdesk.read', 'catalog.read'];
  function fixture(scopes: Record<string, string> = {}, denied: string[] = []) {
    const actor = { id: 'actor', role: 'SUPERVISOR', isActive: true, departmentId: 'sales' };
    const access: any = { resolve: jest.fn(async (_db, id, key) => new CrmReadPolicy(id, resolveProfileScopes(actor, keys.map(permissionKey => ({ permissionKey, profileId: 'unit', profileName: 'Unit', scope: scopes[permissionKey] || 'COMPANY', departmentIds: scopes[permissionKey] === 'SELECTED_DEPARTMENTS' ? ['other'] : [] })), operationDepartments, denied), key)) };
    const rows = ['actor', 'peer', 'branch', 'other'].map((owner, index) => ({ id: owner, managerId: owner, manager: { departmentId: index < 2 ? 'sales' : owner }, accountManagerId: owner, accountManager: { departmentId: index < 2 ? 'sales' : owner }, assignedToId: owner, assignedTo: { departmentId: index < 2 ? 'sales' : owner }, status: 'NEW', paymentStatus: 'SUCCEEDED', createdAt: new Date(Date.now() - 1000), resolutionDueAt: new Date(Date.now() - 1000), finalAmount: 100 * (index + 1), source: 'WEB', secret: 'private' }));
    const filter = (q: any) => rows.filter(row => matchesOperation(row, q.where));
    const db: any = {};
    for (const key of ['customer', 'lead', 'task', 'helpdeskTicket']) db[key] = { count: jest.fn(async q => filter(q).length) };
    db.productVariant = { count: jest.fn(async () => 7) };
    db.dataTrashEntry = { findMany: jest.fn(async () => [{ entityType: 'TASK', entityId: 'peer' }, { entityType: 'CUSTOMER', entityId: 'peer' }]) };
    db.order = { aggregate: jest.fn(async q => ({ _count: filter(q).length, _sum: { finalAmount: filter(q).reduce((sum, row) => sum + row.finalAmount, 0) } })), groupBy: jest.fn(async q => [{ source: 'WEB', _count: filter(q).length, _sum: { finalAmount: filter(q).reduce((sum, row) => sum + row.finalAmount, 0) } }]), findMany: jest.fn(async q => filter(q).map(row => projectOperation(row, q.select))) };
    db.$transaction = jest.fn(fn => fn(db));
    return { db, service: new LeadershipService(db, access) };
  }
  it.each([['OWN', 1, 100], ['PARTICIPATING', 1, 100], ['DEPARTMENT', 2, 300], ['DEPARTMENT_TREE', 3, 600], ['SELECTED_DEPARTMENTS', 1, 400], ['COMPANY', 4, 1000]])('report %s limits aggregate, channels, recent rows', async (scope: string, count: number, revenue: number) => {
    const f = fixture({ 'leadership.read': scope }); const result = await f.service.overview('actor');
    expect(result.sales.orders).toBe(count); expect(result.sales.revenue).toBe(revenue);
    expect(result.channels[0].revenue).toBe(revenue); expect(result.recentOrders).toHaveLength(count);
    expect(result.recentOrders.every(row => !('secret' in row))).toBe(true);
    expect(result.operations.lowStock).toBe(scope === 'COMPANY' ? 7 : null);
  });
  it.each([['OWN', 'COMPANY'], ['COMPANY', 'OWN']])('report %s intersects with domain %s', async (report, domain) => {
    const f = fixture({ 'leadership.read': report, 'oms.read': domain, 'customers.read': domain, 'crm.read': domain, 'helpdesk.read': domain });
    const result = await f.service.overview('actor');
    expect(result.sales.revenue).toBe(100); expect(result.customers.total).toBe(1);
    expect(result.operations).toMatchObject({ activeTasks: 1, openLeads: 1, helpdeskOpen: 1 });
  });
  it('DENY returns unavailable, not zero, and skips domain queries entirely', async () => {
    const f = fixture({}, keys.filter(key => key !== 'leadership.read')); const result = await f.service.overview('actor');
    expect(result.sales.revenue).toBeNull(); expect(result.sales.growth).toBeNull(); expect(result.customers.total).toBeNull();
    expect(Object.values(result.operations).every(value => value === null)).toBe(true); expect(result.recentOrders).toEqual([]);
    for (const key of ['customer', 'lead', 'task', 'helpdeskTicket', 'productVariant']) expect(f.db[key].count).not.toHaveBeenCalled();
    for (const method of ['aggregate', 'groupBy', 'findMany']) expect(f.db.order[method]).not.toHaveBeenCalled();
  });
  it('report DENY rejects before any domain query', async () => {
    const f = fixture({}, ['leadership.read']); await expect(f.service.overview('actor')).rejects.toMatchObject({ status: 403 });
    expect(f.db.order.aggregate).not.toHaveBeenCalled();
  });
  it('trash is excluded and a missing comparison base is not invented as 100%', async () => {
    const result = await fixture().service.overview('actor');
    expect(result.customers.total).toBe(3); expect(result.operations.activeTasks).toBe(3); expect(result.sales.growth).toBeNull();
  });
});
