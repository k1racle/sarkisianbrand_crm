import { ForbiddenException, ValidationPipe } from '@nestjs/common';
import { OmsManagerService } from './oms-manager.service';
import { AssignOrderManagerDto } from './dto/oms.dto';
import { matchesOperation as matches, operationAccess, projectOperation as project } from '../common/operational-access.fixture';

describe('Order manager assignment', () => {
  function fixture(scope = 'COMPANY', writeScope = scope) {
    const people = [
      { id: 'actor', firstName: 'Анна', lastName: 'Менеджер', role: 'MANAGER_B2B', departmentId: 'sales', isActive: true },
      { id: 'peer', firstName: 'Борис', lastName: 'Менеджер', role: 'MANAGER_B2B', departmentId: 'sales', isActive: true },
      { id: 'foreign', firstName: 'Вера', lastName: 'Другой отдел', role: 'MANAGER_B2B', departmentId: 'other', isActive: true },
      { id: 'inactive', role: 'MANAGER_B2B', departmentId: 'sales', isActive: false },
      { id: 'customer', role: 'CUSTOMER', departmentId: 'sales', isActive: true },
    ];
    const order: any = { id: 'order', status: 'NEW', managerId: 'actor', manager: people[0], items: [], payments: [] };
    const tx: any = {
      $executeRaw: jest.fn(), $queryRaw: jest.fn(), dataTrashEntry: { findMany: jest.fn().mockResolvedValue([]) },
      order: { findFirst: jest.fn(async ({ where, select }) => matches(order, where) ? structuredClone(project(order, select)) : null), update: jest.fn(async ({ data }) => { Object.assign(order, data); order.manager = people.find(p => p.id === order.managerId) || null; return { ...order }; }) },
      user: { findMany: jest.fn(async ({ where }) => people.filter(p => matches(p, where))), findFirst: jest.fn(async ({ where }) => people.find(p => matches(p, where)) || null), findUnique: jest.fn(async ({ where }) => people.find(p => p.id === where.id)) },
      orderStatusHistory: { create: jest.fn() }, auditLog: { create: jest.fn() },
    };
    const db: any = { $transaction: jest.fn(async fn => { const before = structuredClone(order); try { return await fn(tx); } catch (e) { Object.assign(order, before); throw e; } }) };
    const access = operationAccess(scope, writeScope);
    const service = new OmsManagerService(db, access);
    return { service, tx, order, access };
  }
  it('assigns without changing fulfillment and writes one history/audit event on replay', async () => {
    const f = fixture();
    await f.service.assign('actor', 'order', { managerId: 'peer', expectedManagerId: 'actor' });
    await f.service.assign('actor', 'order', { managerId: 'peer', expectedManagerId: 'actor' });
    expect(f.tx.order.update).toHaveBeenCalledTimes(1);
    expect(f.tx.order.update).toHaveBeenCalledWith({ where: { id: 'order' }, data: { managerId: 'peer' } });
    expect(f.tx.orderStatusHistory.create).toHaveBeenCalledTimes(1);
    expect(f.tx.orderStatusHistory.create.mock.calls[0][0].data).toMatchObject({ changedBy: 'actor', fromStatus: 'NEW', toStatus: 'NEW', comment: expect.stringContaining('Борис') });
    expect(f.tx.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ payload: { fromManagerId: 'actor', toManagerId: 'peer' } }) });
  });
  it('rejects a stale assignment without side effects', async () => {
    const f = fixture();
    await expect(f.service.assign('actor', 'order', { managerId: 'peer', expectedManagerId: null })).rejects.toMatchObject({ status: 409 });
    expect(f.tx.order.update).not.toHaveBeenCalled();
  });
  it.each(['inactive', 'customer', 'missing'])('rejects target %s', async managerId => {
    const f = fixture();
    await expect(f.service.assign('actor', 'order', { managerId, expectedManagerId: 'actor' })).rejects.toMatchObject({ status: 403 });
    expect(f.tx.order.update).not.toHaveBeenCalled();
  });
  it('restricts both choices and assignment to the allowed department', async () => {
    const f = fixture('DEPARTMENT');
    expect((await f.service.choices('actor', 'order')).items.map(p => p.id)).toEqual(['actor', 'peer']);
    await expect(f.service.assign('actor', 'order', { managerId: 'foreign', expectedManagerId: 'actor' })).rejects.toMatchObject({ status: 403 });
    await expect(f.service.assign('actor', 'order', { managerId: null, expectedManagerId: 'actor' })).rejects.toMatchObject({ status: 403 });
  });
  it('company access can remove the manager', async () => {
    const f = fixture(); await f.service.assign('actor', 'order', { managerId: null, expectedManagerId: 'actor' });
    expect(f.order.managerId).toBeNull(); expect(f.order.status).toBe('NEW');
  });
  it('does not reveal candidates for an inaccessible order', async () => {
    const f = fixture('OWN'); f.order.managerId = 'foreign';
    await expect(f.service.choices('actor', 'order')).rejects.toMatchObject({ status: 404 });
    await expect(f.service.assign('actor', 'order', { managerId: 'actor', expectedManagerId: 'foreign' })).rejects.toMatchObject({ status: 404 });
    expect(f.tx.user.findMany).not.toHaveBeenCalled(); expect(f.tx.order.update).not.toHaveBeenCalled();
  });
  it('honors a target permission denial for picker and direct requests', async () => {
    const f = fixture(), resolve = f.access.resolve.getMockImplementation();
    f.access.resolve.mockImplementation(async (db, id, key) => { if (id === 'peer' && key === 'oms.write') throw new ForbiddenException(); return resolve(db, id, key); });
    expect((await f.service.choices('actor', 'order')).items.map(p => p.id)).not.toContain('peer');
    await expect(f.service.assign('actor', 'order', { managerId: 'peer', expectedManagerId: 'actor' })).rejects.toMatchObject({ status: 403 });
    expect(f.tx.order.update).not.toHaveBeenCalled();
  });
  it('requires explicit nullable manager and expected manager UUIDs', async () => {
    const pipe = new ValidationPipe({ transform: true, whitelist: true });
    for (const body of [{}, { managerId: null }, { managerId: 'wrong', expectedManagerId: null }]) await expect(pipe.transform(body, { type: 'body', metatype: AssignOrderManagerDto })).rejects.toMatchObject({ status: 400 });
    await expect(pipe.transform({ managerId: null, expectedManagerId: null }, { type: 'body', metatype: AssignOrderManagerDto })).resolves.toEqual({ managerId: null, expectedManagerId: null });
  });
});
