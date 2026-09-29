import { ValidationPipe } from '@nestjs/common';
import { OmsService } from './oms.service';
import { HelpdeskService } from '../helpdesk/helpdesk.service';
import { PublicHelpdeskTicketDto } from '../helpdesk/dto/helpdesk.dto';
import { matchesOperation as matches, operationAccess, operationActor, projectOperation as project } from '../common/operational-access.fixture';
import { MarketplacesService } from '../marketplaces/marketplaces.service';
import { BackgroundJobsService } from '../background-jobs/background-jobs.service';

function fixture(scope = 'DEPARTMENT', writeScope = 'OWN', denied: string[] = [], extras: Record<string, string> = {}) {
  const people = [operationActor, { ...operationActor, id: 'peer' }, { ...operationActor, id: 'branch-user', departmentId: 'branch' }, { ...operationActor, id: 'foreign-user', departmentId: 'other' }, { ...operationActor, id: 'inactive', isActive: false }];
  const records = [['own', 'actor'], ['peer', 'peer'], ['branch', 'branch-user'], ['foreign', 'foreign-user'], ['participant', 'foreign-user'], ['unassigned', null]];
  const base = (id: string, owner: string | null) => ({ id, managerId: owner, manager: people.find(p => p.id === owner), assignedToId: owner, assignedTo: people.find(p => p.id === owner), accountManagerId: owner, accountManager: people.find(p => p.id === owner), source: 'OZON', status: 'NEW', priority: 'MEDIUM', finalAmount: 100, orderNumber: id.toUpperCase(), number: 'HD-' + id, subject: id, name: id, description: 'Example description', createdAt: new Date(), resolutionDueAt: new Date(0), requesterUserId: id === 'participant' ? 'actor' : null, tasks: id === 'participant' ? [{ assignedToId: 'actor', status: 'IN_PROGRESS' }] : [], customerId: null, organizationId: null, orderId: null, user: null, items: [], history: [], payments: [], helpdeskTickets: [], comments: [], guestAccessHash: 'NEVER_RETURN', checkoutRequestHash: 'NEVER_RETURN', sourcePayload: { secret: 'NEVER_RETURN' } });
  const tables: Record<string, any[]> = { order: records.map(([id, owner]) => base(id!, owner)), customer: records.map(([id, owner]) => base(id!, owner)), organization: records.map(([id, owner]) => base(id!, owner)), helpdeskTicket: [...records.map(([id, owner]) => base(id!, owner)), base('trashed', 'actor')], user: people, helpdeskComment: [] };
  const db: any = { $queryRaw: jest.fn(), $executeRaw: jest.fn(), auditLog: { create: jest.fn() }, dataTrashEntry: { findMany: jest.fn().mockResolvedValue([{ entityType: 'HELPDESK_TICKET', entityId: 'trashed' }]) }, marketplaceOrder: { upsert: jest.fn(), update: jest.fn() }, orderStatusHistory: { create: jest.fn() } };
  for (const [name, rows] of Object.entries(tables)) {
    const selected = (args: any = {}) => rows.filter(row => matches(row, args.where));
    db[name] = {
      findMany: jest.fn(async (args: any = {}) => selected(args).slice(args.skip || 0, args.take === undefined ? undefined : (args.skip || 0) + args.take).map(row => project(row, args.select))),
      findFirst: jest.fn(async args => project(selected(args)[0], args.select) || null),
      count: jest.fn(async args => selected(args).length),
      update: jest.fn(async ({ where, data, select }) => { const row = rows.find(row => matches(row, where)); Object.assign(row, Object.fromEntries(Object.entries(data).filter(([,v]) => v !== undefined))); if (data.assignedToId !== undefined) row.assignedTo = people.find(p => p.id === data.assignedToId); return project(row, select); }),
      create: jest.fn(async ({ data, select }) => { const row = { ...base('created', data.assignedToId), ...data }; rows.push(row); return project(row, select); }),
    };
  }
  db.order.aggregate = jest.fn(async ({ where }) => ({ _sum: { finalAmount: tables.order.filter(row => matches(row, where)).reduce((sum, row) => sum + row.finalAmount, 0) } }));
  db.order.groupBy = jest.fn(async ({ where, _count }) => { const rows = tables.order.filter(row => matches(row, where)); return rows.length ? [{ source: 'OZON', _count: _count === true ? rows.length : { _all: rows.length }, _sum: { finalAmount: rows.length * 100 } }] : []; });
  db.$transaction = jest.fn(async fn => { const snapshot = structuredClone(tables); try { return await fn(db); } catch (error) { for (const key of Object.keys(tables)) tables[key].splice(0, tables[key].length, ...snapshot[key]); throw error; } });
  const access = operationAccess(scope, writeScope, denied, extras), oneC = { enqueueOrder: jest.fn() };
  return { db, tables, access, oneC, oms: new OmsService(db, oneC as any, undefined, access), helpdesk: new HelpdeskService(db, access) };
}

describe('Scoped operational records (unit only; no integrations)', () => {
  it.each([
    ['OWN', ['own']], ['PARTICIPATING', ['own', 'participant']], ['DEPARTMENT', ['own', 'peer']],
    ['DEPARTMENT_TREE', ['own', 'peer', 'branch']], ['SELECTED_DEPARTMENTS', ['foreign', 'participant']],
    ['COMPANY', ['own', 'peer', 'branch', 'foreign', 'participant', 'unassigned']],
  ])('%s filters orders, tickets, marketplace and counts before returning data', async (scope: string, ids: string[]) => {
    const f = fixture(scope);
    const result = await f.oms.listOrders('actor', { page: 1, limit: 2 });
    expect(result.total).toBe(ids.length); expect(result.items.map(row => row.id)).toEqual(ids.slice(0, 2));
    expect((await f.oms.orders('actor')).map(row => row.id)).toEqual(ids);
    expect((await f.oms.marketplaceOrders('actor')).map(row => row.id)).toEqual(ids);
    expect((await f.helpdesk.tickets('actor')).map(row => row.id)).toEqual(ids);
    expect(await f.helpdesk.dashboard('actor')).toMatchObject({ total: ids.length, new: ids.length, overdue: ids.length });
    expect(await f.oms.dashboard('actor')).toMatchObject({ total: ids.length, revenue: ids.length * 100 });
    expect(await f.oms.marketplaceDashboard('actor')).toMatchObject({ total: ids.length, open: ids.length });
  });
  it.each(['foreign', 'missing'])('hides direct order and ticket %s, with no side effects', async id => {
    const f = fixture();
    await expect(f.oms.order('actor', id)).rejects.toMatchObject({ status: 404 });
    await expect(f.helpdesk.ticket('actor', id)).rejects.toMatchObject({ status: 404 });
    await expect(f.oms.update(id, { status: 'CONFIRMED' }, 'actor')).rejects.toMatchObject({ status: 404 });
    await expect(f.oms.updateMarketplace(id, 'CONFIRMED', undefined, undefined, 'actor')).rejects.toMatchObject({ status: 404 });
    await expect(f.helpdesk.update('actor', id, { status: 'OPEN' })).rejects.toMatchObject({ status: 404 });
    await expect(f.helpdesk.addComment('actor', id, { body: 'Hidden' })).rejects.toMatchObject({ status: 404 });
    expect(f.db.order.update).not.toHaveBeenCalled(); expect(f.db.helpdeskTicket.update).not.toHaveBeenCalled(); expect(f.db.helpdeskComment.create).not.toHaveBeenCalled(); expect(f.oneC.enqueueOrder).not.toHaveBeenCalled();
  });
  it('also protects order-number aliases and trashed tickets', async () => {
    const f = fixture();
    await expect(f.oms.order('actor', 'FOREIGN')).rejects.toMatchObject({ status: 404 });
    await expect(f.helpdesk.ticket('actor', 'trashed')).rejects.toMatchObject({ status: 404 });
    await expect(f.helpdesk.update('actor', 'trashed', { status: 'OPEN' })).rejects.toMatchObject({ status: 404 });
  });
  it('separates broad reading from own-record mutations and actions', async () => {
    const f = fixture('COMPANY', 'OWN');
    expect((await f.oms.order('actor', 'foreign')).canWrite).toBe(false);
    expect((await f.helpdesk.ticket('actor', 'foreign')).canWrite).toBe(false);
    await expect(f.oms.update('foreign', { status: 'CONFIRMED' }, 'actor')).rejects.toMatchObject({ status: 404 });
    await expect(f.helpdesk.update('actor', 'foreign', { status: 'OPEN' })).rejects.toMatchObject({ status: 404 });
    expect((await f.oms.update('own', { status: 'CONFIRMED' }, 'actor')).canWrite).toBe(true);
    expect((await f.helpdesk.update('actor', 'own', { status: 'OPEN' })).canWrite).toBe(true);
    expect(f.oneC.enqueueOrder).toHaveBeenCalledWith('own', 'actor');
  });
  it('write-company cannot widen read-own', async () => {
    const f = fixture('OWN', 'COMPANY');
    await expect(f.oms.update('foreign', { status: 'CONFIRMED' }, 'actor')).rejects.toMatchObject({ status: 404 });
    await expect(f.helpdesk.update('actor', 'foreign', { status: 'OPEN' })).rejects.toMatchObject({ status: 404 });
  });
  it.each(['oms', 'marketplace', 'helpdesk'])('DENY wins over COMPANY for %s', async domain => {
    const f = fixture('COMPANY', 'COMPANY', [domain + '.write']);
    const update = domain === 'oms' ? () => f.oms.update('own', { status: 'CONFIRMED' }, 'actor') : domain === 'marketplace' ? () => f.oms.updateMarketplace('own', 'CONFIRMED', undefined, undefined, 'actor') : () => f.helpdesk.update('actor', 'own', { status: 'OPEN' });
    await expect(update()).rejects.toMatchObject({ status: 403 });
    expect(f.db.order.update).not.toHaveBeenCalled(); expect(f.db.helpdeskTicket.update).not.toHaveBeenCalled();
  });
  it.each(['', 'inactive'])('rejects missing/disabled actor %s before record access', async actor => {
    const f = fixture();
    await expect(f.oms.orders(actor)).rejects.toMatchObject({ status: 403 });
    await expect(f.helpdesk.tickets(actor)).rejects.toMatchObject({ status: 403 });
    expect(f.db.order.findMany).not.toHaveBeenCalled();
  });
  it('projects safe fields and masks hidden linked records in both cards', async () => {
    const f = fixture('COMPANY', 'OWN', [], { 'customers.read': 'OWN', 'helpdesk.read': 'OWN' });
    const row = f.tables.order[0]; Object.assign(row, { customerId: 'foreign', organizationId: 'foreign', organization: f.tables.organization[3], payments: [{ id: 'payment', amount: 10, metadata: 'NEVER_RETURN' }], helpdeskTickets: f.tables.helpdeskTicket });
    const card = await f.oms.order('actor', 'own');
    expect(card).toMatchObject({ customer: null, organization: null, customerId: null, organizationId: null });
    expect(card.helpdeskTickets.map(item => item.id)).toEqual(['own']); expect(JSON.stringify(card)).not.toContain('NEVER_RETURN');
    Object.assign(f.tables.helpdeskTicket[0], { customerId: 'foreign', organizationId: 'foreign', organizationRef: 'private-inn', comments: [{ id: 'comment', body: 'visible', author: { id: 'author', email: 'safe@example.test', passwordHash: 'NEVER_RETURN' } }] });
    const ticket = await f.helpdesk.ticket('actor', 'own');
    expect(ticket).toMatchObject({ customer: null, organization: null, organizationRef: null }); expect(JSON.stringify(ticket)).not.toContain('NEVER_RETURN');
    f.tables.organization[3].name = 'SecretCompany';
    expect(await f.oms.orders('actor', undefined, undefined, 'SecretCompany')).toEqual([]);
  });
  it('cannot link an inaccessible order or organization on ticket creation', async () => {
    const f = fixture('OWN', 'OWN');
    const data = { subject: 'Example', description: 'Example problem', source: 'EMPLOYEE' as const };
    await expect(f.helpdesk.create('actor', { ...data, orderId: 'foreign' })).rejects.toMatchObject({ status: 404 });
    await expect(f.helpdesk.create('actor', { ...data, organizationRef: 'foreign' })).rejects.toMatchObject({ status: 404 });
    expect(f.db.helpdeskTicket.create).not.toHaveBeenCalled();
    expect(await f.helpdesk.create('actor', data)).toMatchObject({ assignedToId: 'actor', canWrite: true });
  });
  it('limits assignees and rolls back a transfer leaving the caller scope', async () => {
    const f = fixture('OWN', 'COMPANY');
    expect((await f.helpdesk.agents('actor')).map(row => row.id)).toEqual(['actor']);
    for (const assignedToId of [null, 'foreign-user', 'inactive']) await expect(f.helpdesk.update('actor', 'own', { assignedToId })).rejects.toMatchObject({ status: 403 });
    // Even if a target check races, the resulting record must remain accessible.
    f.db.user.findFirst.mockResolvedValue({ id: 'foreign-user' });
    await expect(f.helpdesk.update('actor', 'own', { assignedToId: 'foreign-user' })).rejects.toMatchObject({ status: 404 });
    expect(f.tables.helpdeskTicket[0].assignedToId).toBe('actor'); expect(f.db.auditLog.create).not.toHaveBeenCalled();
  });
  it('clears resolution timestamps on reopen and records comments without claiming delivery', async () => {
    const f = fixture();
    await f.helpdesk.update('actor', 'own', { status: 'CLOSED' });
    expect((await f.helpdesk.update('actor', 'own', { status: 'OPEN' }))).toMatchObject({ resolvedAt: null, closedAt: null });
    await f.helpdesk.addComment('actor', 'own', { body: 'Saved', isInternal: true });
    expect(f.db.helpdeskComment.create.mock.calls[0][0].data).toMatchObject({ ticketId: 'own', authorId: 'actor', body: 'Saved', isInternal: true });
  });
  it('import is fail-closed for restricted access, before staging or customer writes', async () => {
    const f = fixture('OWN', 'OWN');
    await expect(f.oms.assertMarketplaceImport('actor')).rejects.toMatchObject({ status: 403 });
    await expect(f.oms.ingestMarketplace({ channel: 'OZON', externalId: 'x', totalAmount: 1, items: [] }, 'actor')).rejects.toMatchObject({ status: 403 });
    expect(f.db.marketplaceOrder.upsert).not.toHaveBeenCalled(); expect(f.db.customer.create).not.toHaveBeenCalled();
  });
});

describe('Public support and import actor trust boundaries', () => {
  const data = { subject: 'Example', description: 'Example problem', requesterEmail: 'visitor@example.test' };
  it.each([{ orderId: 'secret' }, { organizationRef: 'private' }, { priority: 'CRITICAL' }, { assignedToId: 'actor' }, { source: 'EMPLOYEE' }])('rejects private intake properties %j', async extra => {
    const pipe = new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true });
    await expect(pipe.transform({ ...data, ...extra }, { type: 'body', metatype: PublicHelpdeskTicketDto })).rejects.toMatchObject({ status: 400 });
  });
  it('anonymous intake has no private lookups, automatic customer links or private response fields', async () => {
    const f = fixture();
    const result = await f.helpdesk.createPublic({ ...data, orderId: 'secret', customerId: 'foreign', assignedToId: 'actor' } as any);
    expect(Object.keys(result).sort()).toEqual(['accepted', 'number']); expect(result.accepted).toBe(true);
    const input = f.db.helpdeskTicket.create.mock.calls[0][0].data;
    expect(input).toMatchObject({ source: 'B2C', priority: 'MEDIUM' });
    for (const key of ['orderId', 'customerId', 'organizationId', 'assignedToId', 'requesterUserId']) expect(input).not.toHaveProperty(key);
    expect(f.db.customer.findFirst).not.toHaveBeenCalled(); expect(f.db.customer.create).not.toHaveBeenCalled(); expect(f.db.user.findFirst).not.toHaveBeenCalled(); expect(f.access.resolve).not.toHaveBeenCalled();
  });
  it('worker uses the stored initiator, never actor IDs inside the payload', async () => {
    const row = { id: 'run', jobName: 'TEST', queueName: 'ecosystem-operations', status: 'WAITING', attempts: 0, startedAt: null, input: { orders: ['stored'] }, initiatedById: 'stored-actor' };
    const db: any = { $queryRawUnsafe: jest.fn(), jobRun: { findUnique: jest.fn().mockResolvedValue(row), update: jest.fn(async ({ data }) => ({ ...row, ...data })) } };
    db.$transaction = (fn: any) => fn(db);
    const jobs = new BackgroundJobsService(db, {} as any, { execution: jest.fn() } as any);
    const handler = jest.fn().mockResolvedValue({ processed: 1 }); jobs.register('TEST', handler);
    const payload = { initiatedById: 'forged-admin' };
    await (jobs as any).process({ id: 'run', name: 'TEST', attemptsMade: 0, data: { jobRunId: 'run', payload }, opts: {}, discard: jest.fn(), updateProgress: jest.fn() });
    expect(handler).toHaveBeenCalledWith(row.input, expect.any(Function), { initiatedById: 'stored-actor' });
  });
  it('import rechecks the actor before enqueue and before each imported order', async () => {
    let handler: any;
    const oms = { assertMarketplaceImport: jest.fn(), ingestMarketplace: jest.fn() }, jobs = { enqueue: jest.fn(), register: (_key, fn) => handler = fn };
    const service = new MarketplacesService({} as any, oms as any, jobs as any); service.onModuleInit();
    const dto: any = { orders: [{ externalId: 'a' }, { externalId: 'b' }] };
    await service.importMany(dto, 'actor'); expect(jobs.enqueue).toHaveBeenCalledWith('MARKETPLACE_ORDERS_IMPORT', dto, 'actor');
    await handler(dto, jest.fn(), { initiatedById: 'actor' });
    expect(oms.ingestMarketplace.mock.calls).toEqual([[dto.orders[0], 'actor'], [dto.orders[1], 'actor']]);
    oms.ingestMarketplace.mockClear(); await expect(handler(dto, jest.fn(), { initiatedById: null })).rejects.toMatchObject({ status: 403 }); expect(oms.ingestMarketplace).not.toHaveBeenCalled();
    oms.assertMarketplaceImport.mockRejectedValue(new Error('Revoked'));
    await expect(service.importMany(dto, 'actor')).rejects.toThrow('Revoked'); expect(jobs.enqueue).toHaveBeenCalledTimes(1);
  });
});
