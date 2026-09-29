import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { resolveProfileScopes } from '../auth/access-scope-policy';
import { CrmReadPolicy } from '../crm/read-access';
import { matchesOperation, projectOperation } from '../common/operational-access.fixture';
import { DataLifecycleService } from './data-lifecycle.service';

// Isolated transactional model. No database, records, passwords or external services are used.
describe('Central trash: company/domain boundaries and transactional lifecycle', () => {
  function fixture(scopes: Record<string, string> = {}, denied: string[] = [], role = 'ADMIN') {
    const actor = { id: 'actor', role, isActive: true, departmentId: 'sales', password: bcrypt.hashSync('unit-password', 4) };
    let rows: Record<string, any[]> = {};
    const db: any = {};
    for (const model of Prisma.dmmf.datamodel.models) {
      const key = model.name[0].toLowerCase() + model.name.slice(1); rows[key] = [];
      const filtered = (q: any) => rows[key].filter(row => matchesOperation(row, q.where));
      db[key] = {
        count: jest.fn(async q => filtered(q).length),
        findMany: jest.fn(async q => filtered(q).slice(q.skip || 0, (q.skip || 0) + (q.take || Infinity)).map(row => projectOperation(row, q.select))),
        findFirst: jest.fn(async q => projectOperation(filtered(q)[0] || null, q.select)),
        findUnique: jest.fn(async q => projectOperation(filtered(q)[0] || null, q.select)),
        create: jest.fn(async q => { const row = { id: 'new-' + rows[key].length, status: 'TRASHED', ...q.data }; rows[key].push(row); return projectOperation(row, q.select); }),
        update: jest.fn(async q => { const row = filtered(q)[0]; if (!row) throw new Error('Missing fixture'); Object.assign(row, q.data); return projectOperation(row, q.select); }),
        updateMany: jest.fn(async q => { const targets = filtered(q); targets.forEach(row => Object.assign(row, q.data)); return { count: targets.length }; }),
        delete: jest.fn(async q => { const row = filtered(q)[0]; rows[key] = rows[key].filter(item => item !== row); return row; }),
        deleteMany: jest.fn(async q => { const targets = filtered(q); rows[key] = rows[key].filter(row => !targets.includes(row)); return { count: targets.length }; }),
      };
    }
    rows.user = [actor, { id: 'other', email: 'private@example.test', firstName: 'Другой', isActive: true }];
    rows.customer = [{ id: 'customer', firstName: 'Клиент', status: 'ACTIVE', email: 'private@example.test' }];
    rows.organization = [{ id: 'org', name: 'Организация', status: 'ARCHIVED' }];
    rows.product = [{ id: 'product', nameRu: 'Товар', isActive: false }];
    const entry = { id: 'entry', entityType: 'CUSTOMER', entityId: 'customer', displayName: 'Клиент', status: 'TRASHED', trashedAt: new Date(), purgeAfter: new Date(Date.now() - 1000), previousState: { status: 'ACTIVE' }, snapshot: { email: 'snapshot-secret', password: 'never-return' }, dependencySummary: { secret: 123 }, actor: { id: 'actor', firstName: 'Администратор', email: 'never-return' } };
    rows.dataTrashEntry = [entry];
    db.$executeRaw = jest.fn(); db.$queryRaw = jest.fn();
    db.$transaction = jest.fn(async (fn: any) => { const before = structuredClone(rows); try { return await fn(db); } catch (e) { rows = before; throw e; } });
    const keys = ['system.manage', 'customers.read', 'customers.write', 'catalog.read', 'catalog.write', 'oms.read', 'crm.read', 'helpdesk.read'];
    const access: any = { resolve: jest.fn(async (_tx, id, key) => new CrmReadPolicy(id, resolveProfileScopes(actor, keys.map(permissionKey => ({ permissionKey, profileId: 'unit', profileName: 'Unit', scope: scopes[permissionKey] || 'COMPANY', departmentIds: [] })), [{ id: 'sales', parentId: null, archivedAt: null }], denied), key)) };
    return { db, actor, entry, rows: () => rows, service: new DataLifecycleService(db, access), dto: { currentAdminPassword: 'unit-password', confirmation: 'Клиент' } };
  }
  it('list filters permitted types before count/pagination and never returns snapshots or actor email', async () => {
    const f = fixture({}, ['catalog.read']);
    f.rows().dataTrashEntry.push({ ...f.entry, id: 'hidden', entityType: 'PRODUCT', entityId: 'product' });
    const result = await f.service.trash('actor', { page: 1, limit: 1 });
    expect(result.total).toBe(1); expect(result.items).toHaveLength(1); expect(result.items[0].canRestore).toBe(true);
    expect(JSON.stringify(result)).not.toMatch(/snapshot-secret|never-return|previousState|dependencySummary/);
    const input = f.db.dataTrashEntry.findMany.mock.calls[0][0];
    expect(input.where.entityType.in).not.toContain('PRODUCT'); expect(input.take).toBe(1);
    expect(f.db.dataTrashEntry.count.mock.calls[0][0].where).toEqual(input.where);
  });
  it('can list without write, but direct restore and purge are denied', async () => {
    const f = fixture({ 'customers.write': 'OWN' });
    expect((await f.service.trash('actor', { page: 1, limit: 50 })).items[0].canRestore).toBe(false);
    expect((await f.service.preview('actor', 'CUSTOMER', 'customer')).canPurge).toBe(false);
    await expect(f.service.restore('actor', 'entry')).rejects.toMatchObject({ status: 403 });
    await expect(f.service.purge('entry', 'actor', f.dto)).rejects.toMatchObject({ status: 403 });
    expect(f.db.customer.delete).not.toHaveBeenCalled();
  });
  it('known IDs in denied domains return no record information', async () => {
    const f = fixture({}, ['customers.read']);
    await expect(f.service.preview('actor', 'CUSTOMER', 'customer')).rejects.toMatchObject({ status: 404 });
    await expect(f.service.restore('actor', 'entry')).rejects.toMatchObject({ status: 404 });
    expect(f.db.customer.findUnique).not.toHaveBeenCalled();
  });
  it.each(['SUPERVISOR', 'IT_SUPPORT', 'CLIENT'])('non-admin %s cannot use the central trash even with permission fixtures', async role => {
    await expect(fixture({}, [], role).service.trash('actor', { page: 1, limit: 50 })).rejects.toMatchObject({ status: 403 });
  });
  it('admin DENY and a disabled actor cannot bypass the boundary', async () => {
    await expect(fixture({}, ['system.manage']).service.trash('actor', { page: 1, limit: 50 })).rejects.toMatchObject({ status: 403 });
    const f = fixture(); f.actor.isActive = false;
    await expect(f.service.trash('actor', { page: 1, limit: 50 })).rejects.toMatchObject({ status: 403 });
  });
  it('self archive, trash, restore and purge are blocked', async () => {
    const f = fixture(); Object.assign(f.entry, { entityType: 'USER', entityId: 'actor' });
    for (const operation of [() => f.service.archive('actor', 'USER', 'actor'), () => f.service.moveToTrash('USER', 'actor', 'actor'), () => f.service.restore('actor', 'entry'), () => f.service.purge('entry', 'actor', f.dto)]) {
      await expect(operation()).rejects.toMatchObject({ status: 409 });
    }
    expect(f.db.user.update).not.toHaveBeenCalled(); expect(f.db.user.delete).not.toHaveBeenCalled();
  });
  it('trashing revokes sessions and stores only identifiers and previous state; repetition is idempotent', async () => {
    const f = fixture(); const first = await f.service.moveToTrash('USER', 'other', 'actor');
    const second = await f.service.moveToTrash('USER', 'other', 'actor');
    expect(first.id).toBe(second.id); expect(f.db.dataTrashEntry.create).toHaveBeenCalledTimes(1);
    expect(f.rows().user.find(row => row.id === 'other').isActive).toBe(false);
    expect(f.db.session.deleteMany).toHaveBeenCalledWith({ where: { userId: 'other' } });
    const data = f.db.dataTrashEntry.create.mock.calls[0][0].data;
    expect(data.snapshot).toEqual({ entityType: 'USER', entityId: 'other' }); expect(data.previousState).toEqual({ isActive: true });
    expect(JSON.stringify(first)).not.toContain('private@example.test');
  });
  it('audit failure rolls back state and trash record, rather than partially committing', async () => {
    const f = fixture(); f.db.auditLog.create.mockRejectedValueOnce(new Error('audit unavailable'));
    await expect(f.service.moveToTrash('USER', 'other', 'actor')).rejects.toThrow('audit unavailable');
    expect(f.rows().user.find(row => row.id === 'other').isActive).toBe(true); expect(f.rows().dataTrashEntry).toHaveLength(1);
    expect(f.db.$transaction.mock.calls[0][1].isolationLevel).toBe('Serializable'); expect(f.db.$queryRaw).toHaveBeenCalled();
  });
  it('restores supported historical state and closes duplicate active trash cycles', async () => {
    const f = fixture(); Object.assign(f.entry, { entityType: 'ORGANIZATION', entityId: 'org', previousState: { status: 'ON_HOLD' } });
    f.rows().dataTrashEntry.push({ ...f.entry, id: 'duplicate' });
    await f.service.restore('actor', 'entry');
    expect(f.rows().organization[0].status).toBe('ON_HOLD'); expect(f.rows().dataTrashEntry.every(row => row.status === 'RESTORED')).toBe(true);
  });
  it('rejects unknown historical state instead of silently activating', async () => {
    const f = fixture(); f.entry.previousState = { status: 'INVALID' };
    await expect(f.service.restore('actor', 'entry')).rejects.toMatchObject({ status: 409 }); expect(f.db.customer.update).not.toHaveBeenCalled();
  });
  it('redacts related domain counts but still blocks deletion', async () => {
    const f = fixture({}, ['oms.read']); f.rows().order.push({ id: 'order', customerId: 'customer' });
    const preview = await f.service.preview('actor', 'CUSTOMER', 'customer');
    expect(preview.canPurge).toBe(false); expect(preview.dependencies).toContainEqual({ key: 'restricted', label: 'Связи в закрытых разделах', count: null, blocking: true });
    expect(preview.dependencies.some(row => row.key.startsWith('Order.'))).toBe(false);
    await expect(f.service.purge('entry', 'actor', f.dto)).rejects.toMatchObject({ status: 409 }); expect(f.db.customer.delete).not.toHaveBeenCalled();
  });
  it('new schema relations and variant references are checked before product purge', async () => {
    const f = fixture(); Object.assign(f.entry, { entityType: 'PRODUCT', entityId: 'product', displayName: 'Товар' });
    f.rows().orderItem.push({ id: 'line', variant: { productId: 'product' } });
    await expect(f.service.purge('entry', 'actor', { ...f.dto, confirmation: 'Товар' })).rejects.toMatchObject({ status: 409 });
    expect(f.db.orderItem.count).toHaveBeenCalledWith({ where: { variant: { productId: 'product' } } }); expect(f.db.product.delete).not.toHaveBeenCalled();
  });
  it.each(['password', 'confirmation', 'retention'])('purge validates %s before deleting', async kind => {
    const f = fixture(); if (kind === 'password') f.dto.currentAdminPassword = 'wrong';
    if (kind === 'confirmation') f.dto.confirmation = 'wrong'; if (kind === 'retention') f.entry.purgeAfter = new Date(Date.now() + 86400000);
    await expect(f.service.purge('entry', 'actor', f.dto)).rejects.toHaveProperty('status', kind === 'password' ? 401 : kind === 'confirmation' ? 400 : 409);
    expect(f.db.customer.delete).not.toHaveBeenCalled();
  });
  it('successful mock purge clears every historical trash snapshot, not only the last', async () => {
    const f = fixture(); f.rows().dataTrashEntry.push({ ...f.entry, id: 'old', status: 'RESTORED' });
    await f.service.purge('entry', 'actor', f.dto);
    expect(f.rows().customer).toEqual([]);
    for (const entry of f.rows().dataTrashEntry) expect(entry).toMatchObject({ status: 'PURGED', displayName: 'Удалённая запись', reason: null, snapshot: { purged: true }, previousState: {}, dependencySummary: {} });
  });
  it('FK/serialization conflicts return a generic retryable error without DB detail', async () => {
    const f = fixture(); f.db.customer.delete.mockRejectedValueOnce({ code: 'P2003', meta: { private: 'secret' } });
    await expect(f.service.purge('entry', 'actor', f.dto)).rejects.toMatchObject({ status: 409 });
    expect(f.rows().dataTrashEntry[0].status).toBe('TRASHED');
  });
});
