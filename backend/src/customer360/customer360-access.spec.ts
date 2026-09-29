import 'reflect-metadata';
import { ForbiddenException } from '@nestjs/common';
import { resolveProfileScopes } from '../auth/access-scope-policy';
import { CrmReadPolicy } from '../crm/read-access';
import { Customer360Service } from './customer360.service';
import { Customer360Controller } from './customer360.controller';
import { CrmReadService } from '../crm/crm-read.service';
import { CrmLeadWriteService } from '../crm/lead-write.service';
import { CrmTaskWriteService } from '../crm/task-write.service';
import { readFileSync } from 'fs';
import { join } from 'path';

const actor = { id: 'employee', role: 'MANAGER_SALES', isActive: true, departmentId: 'sales' };
const departments = [{ id: 'sales', parentId: null, archivedAt: null }, { id: 'branch', parentId: 'sales', archivedAt: null }, { id: 'other', parentId: null, archivedAt: null }];
function policy(scope = 'DEPARTMENT', writeScope = 'OWN', key = 'customers.read', extras: [string, string][] = [], denied: string[] = []) {
  return new CrmReadPolicy(actor.id, resolveProfileScopes(actor, [['customers.read', scope], ['customers.write', writeScope], ...extras].map(([permissionKey, value]) => ({ permissionKey, scope: value, profileId: 'fixture', profileName: 'Unassigned', departmentIds: value === 'SELECTED_DEPARTMENTS' ? ['other'] : [] })), departments, denied), key);
}
// Execute the compiled predicates and nested selections over fixtures. DB concurrency
// and real PostgreSQL query semantics are separate deployment acceptance tests.
function matches(row: any, where: any): boolean {
  if (where === undefined) return true;
  if (where === null || typeof where !== 'object') return where == null ? row == null : row === where;
  const list = (v: any) => Array.isArray(v) ? v : [v];
  return Object.entries(where).every(([key, value]: [string, any]) => {
    if (key === 'AND') return list(value).every(v => matches(row, v));
    if (key === 'OR') return list(value).some(v => matches(row, v));
    if (key === 'NOT') return list(value).every(v => !matches(row, v));
    if (key === 'in') return value.includes(row);
    if (key === 'notIn') return !value.includes(row);
    if (key === 'not') return !matches(row, value);
    if (key === 'is') return row != null && matches(row, value);
    if (key === 'some') return (row || []).some(v => matches(v, value));
    if (key === 'contains') return String(row || '').toLowerCase().includes(value.toLowerCase());
    if (key === 'mode') return true;
    if (key === 'gte') return row >= value;
    return matches(row?.[key], value);
  });
}
function project(row: any, select: any): any {
  if (row == null || !select) return row;
  return Object.fromEntries(Object.entries(select).map(([key, option]: [string, any]) => {
    if (option === true) return [key, row[key]];
    if (key === '_count') return [key, Object.fromEntries(Object.entries(option.select).map(([field, rule]: [string, any]) => [field, (row[field] || []).filter(v => rule === true || matches(v, rule.where)).length]))];
    return [key, Array.isArray(row[key]) ? row[key].filter(v => matches(v, option.where)).map(v => project(v, option.select)) : project(row[key], option.select)];
  }));
}
function fixture(scope = 'DEPARTMENT', writeScope = 'OWN', extras: [string, string][] = [], denied: string[] = []) {
  const people = [{ ...actor }, { ...actor, id: 'peer' }, { ...actor, id: 'branch-user', departmentId: 'branch' }, { ...actor, id: 'foreign-user', departmentId: 'other' }, { id: 'client-user', role: 'CUSTOMER_B2C', isActive: true, firstName: 'Client', email: 'client@example.test', phone: null, customer: { id: 'own' } }];
  const base = (id: string, owner: string | null, creator: string | null = null) => ({ id, firstName: id, name: id, email: id + '@example.test', status: 'ACTIVE', accountManagerId: owner, createdById: creator, accountManager: people.find(p => p.id === owner) || null, normalizedEmail: 'hidden internal field', user: null, createdAt: new Date(), updatedAt: new Date(), orders: [], leads: [], tasks: [], interactions: [], helpdeskTickets: [], organizationMemberships: [], members: [] });
  const rows = [base('own', actor.id), base('peer', 'peer'), base('branch', 'branch-user'), base('foreign', 'foreign-user'), base('authored', 'foreign-user', actor.id), base('unassigned', null), base('trashed', actor.id)];
  const tables: Record<string, any[]> = { customer: rows, organization: rows.map(row => ({ ...row })), user: people, order: [], lead: [], interaction: [], helpdeskTicket: [], organizationMember: [] };
  const access: any = { resolve: jest.fn(async (_db, id, key) => { if (id !== actor.id) throw new ForbiddenException(); return policy(scope, writeScope, key, extras, denied); }) };
  const db: any = { $executeRaw: jest.fn(), $queryRaw: jest.fn(), auditLog: { create: jest.fn() }, partnerBusinessRegistration: { findUnique: jest.fn().mockResolvedValue(null) }, dataTrashEntry: { findMany: jest.fn().mockResolvedValue([{ entityType: 'CUSTOMER', entityId: 'trashed' }, { entityType: 'ORGANIZATION', entityId: 'trashed' }]) } };
  for (const [name, records] of Object.entries(tables)) {
    const selected = ({ where, select }: any) => records.filter(row => matches(row, where)).map(row => project(row, select));
    db[name] = { findMany: jest.fn(async args => selected(args)), findFirst: jest.fn(async args => selected(args)[0] || null), count: jest.fn(async args => selected(args).length),
      update: jest.fn(async ({ where, data, select }) => { const row = records.find(row => matches(row, where)); Object.assign(row, Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined))); if (data.accountManagerId !== undefined) row.accountManager = people.find(p => p.id === data.accountManagerId) || null; return project(row, select); }),
      create: jest.fn(async ({ data, select }) => { const row = { ...base('created', data.accountManagerId, data.createdById), ...data }; records.push(row); return project(row, select); }),
      updateMany: jest.fn(async ({ where, data }) => { const items = records.filter(row => matches(row, where)); items.forEach(row => Object.assign(row, data)); return { count: items.length }; }),
    };
  }
  db.order.aggregate = jest.fn(async ({ where }) => ({ _sum: { finalAmount: tables.order.filter(row => matches(row, where)).reduce((sum, row) => sum + row.finalAmount, 0) } }));
  db.organizationMember.upsert = jest.fn(async ({ create }) => { const row = { id: 'member', role: 'EMPLOYEE', isActive: true, ...create }; tables.organizationMember.push(row); return row; });
  db.$transaction = jest.fn(async fn => { const snapshot = structuredClone(tables); try { return await fn(db); } catch (error) { for (const name of Object.keys(tables)) tables[name].splice(0, tables[name].length, ...snapshot[name]); throw error; } });
  return { db, access, tables, service: new Customer360Service(db, access) };
}

describe('Customer 360 scoped operations', () => {
  it('rejects null values for required organization and membership fields', async () => {
    const f = fixture('COMPANY', 'COMPANY');
    for (const key of ['status', 'discountTier', 'creditLimit']) await expect(f.service.createOrganization(actor.id, { name: 'New', [key]: null } as any)).rejects.toMatchObject({ status: 400 });
    for (const key of ['role', 'canOrder', 'canSeeFinance']) await expect(f.service.addMember(actor.id, 'own', { userId: 'client-user', [key]: null } as any)).rejects.toMatchObject({ status: 400 });
    expect(f.db.organization.create).not.toHaveBeenCalled(); expect(f.db.organizationMember.upsert).not.toHaveBeenCalled();
  });
  it.each([
    ['OWN', ['own']], ['PARTICIPATING', ['own', 'authored']], ['DEPARTMENT', ['own', 'peer']],
    ['DEPARTMENT_TREE', ['own', 'peer', 'branch']], ['SELECTED_DEPARTMENTS', ['foreign', 'authored']],
    ['COMPANY', ['own', 'peer', 'branch', 'foreign', 'authored', 'unassigned']],
  ])('%s filters both registries and dashboard totals', async (scope: string, expected: string[]) => {
    const f = fixture(scope);
    expect((await f.service.customers(actor.id)).map(row => row.id).sort()).toEqual([...expected].sort());
    expect((await f.service.organizations(actor.id)).map(row => row.id).sort()).toEqual([...expected].sort());
    expect(await f.service.dashboard(actor.id)).toMatchObject({ customers: expected.length, organizations: expected.length, revenue: null });
    expect(f.db.order.aggregate).not.toHaveBeenCalled();
  });
  it.each(['customer', 'organization'])('%s returns the same denial for absent/hidden/trashed IDs', async kind => {
    const f = fixture();
    for (const id of ['foreign', 'unknown', 'trashed']) await expect(f.service[kind](actor.id, id)).rejects.toMatchObject({ status: 404 });
    expect(f.db.order.findMany).not.toHaveBeenCalled();
  });
  it('customer search cannot infer a hidden organization from a visible contact', async () => {
    const f = fixture();
    const row = f.tables.customer[0]; row.organizationMemberships = [{ isActive: true, organization: { ...f.tables.organization[3], name: 'Secret Company' } }];
    expect(await f.service.customers(actor.id, 'Secret Company')).toEqual([]);
    expect((await f.service.customer(actor.id, row.id)).organizationMemberships).toEqual([]);
    expect((await f.service.dashboard(actor.id)).b2bCustomers).toBe(0);
  });
  it('read-wide does not widen per-record editing or mutations', async () => {
    const f = fixture('COMPANY', 'OWN');
    const rows = await f.service.customers(actor.id);
    expect(rows.find(row => row.id === 'own')?.canWrite).toBe(true);
    expect(rows.find(row => row.id === 'foreign')?.canWrite).toBe(false);
    await expect(f.service.updateCustomer(actor.id, 'foreign', { firstName: 'Changed' })).rejects.toMatchObject({ status: 404 });
    await expect(f.service.updateOrganization(actor.id, 'foreign', { name: 'Changed' })).rejects.toMatchObject({ status: 404 });
    expect(f.db.customer.update).not.toHaveBeenCalled(); expect(f.db.organization.update).not.toHaveBeenCalled();
  });
  it.each(['customer', 'organization'])('%s transfer checks target and resulting visibility; failed transfer rolls back', async kind => {
    const f = fixture('OWN', 'COMPANY');
    // Model a target check race: even if it passes, the resulting OWN boundary must hold.
    f.db.user.findFirst.mockResolvedValue({ id: 'foreign-user' });
    const update = kind === 'customer' ? f.service.updateCustomer.bind(f.service) : f.service.updateOrganization.bind(f.service);
    await expect(update(actor.id, 'own', { accountManagerId: 'foreign-user' })).rejects.toMatchObject({ status: 404 });
    expect(f.tables[kind][0].accountManagerId).toBe(actor.id);
    expect(f.db.auditLog.create).not.toHaveBeenCalled();
  });
  it('ordinary assignment rejects outsiders and clearing; company can clear explicitly', async () => {
    const f = fixture('OWN', 'OWN');
    for (const target of ['foreign-user', null]) await expect(f.service.updateCustomer(actor.id, 'own', { accountManagerId: target })).rejects.toMatchObject({ status: 403 });
    expect(f.db.customer.update).not.toHaveBeenCalled();
    const all = fixture('COMPANY', 'COMPANY');
    expect((await all.service.updateCustomer(actor.id, 'own', { accountManagerId: null })).accountManagerId).toBeNull();
    expect(all.db.auditLog.create).toHaveBeenCalled();
  });
  it('new organizations are attributed to the actor, not to an inferred owner', async () => {
    const f = fixture('OWN', 'OWN');
    const row = await f.service.createOrganization(actor.id, { name: '  New  ' });
    expect(row).toMatchObject({ name: 'New', accountManagerId: actor.id, createdById: actor.id, canWrite: true });
  });
  it.each(['customers.read', 'customers.write'])('DENY %s prevents mutations before writes', async key => {
    const f = fixture('COMPANY', 'COMPANY', [], [key]);
    await expect(f.service.updateCustomer(actor.id, 'own', { firstName: 'No' })).rejects.toMatchObject({ status: 403 });
    expect(f.db.customer.update).not.toHaveBeenCalled();
  });
  it('no read grant is manufactured from write; wrong/missing actor is rejected', async () => {
    const f = fixture();
    for (const id of ['', 'another']) await expect(f.service.customers(id)).rejects.toMatchObject({ status: 403 });
    expect(f.db.customer.findMany).not.toHaveBeenCalled();
  });
  it('related data, counts and projections require their own domains', async () => {
    const f = fixture('COMPANY', 'OWN');
    const row = f.tables.customer[0], order = { id: 'closed-order', customerId: row.id, customer: row, organizationId: null, status: 'PAID', finalAmount: 123456 }, lead = { id: 'closed-lead', customerId: row.id, managerId: 'foreign-user' }, ticket = { id: 'closed-ticket', customerId: row.id };
    row.orders = [order]; row.leads = [lead]; row.helpdeskTickets = [ticket];
    f.tables.order.push(order); f.tables.lead.push(lead); f.tables.helpdeskTicket.push(ticket);
    const card = await f.service.customer(actor.id, row.id);
    expect(card.orders).toEqual([]); expect(card.leads).toEqual([]); expect(card.helpdeskTickets).toEqual([]);
    expect(card._count).toMatchObject({ orders: 0, leads: 0, helpdeskTickets: 0 });
    expect(card).not.toHaveProperty('normalizedEmail'); expect(card).not.toHaveProperty('externalIdentities');
    expect(card.relatedAccess).toEqual({ orders: false, helpdesk: false, leads: false });
  });
  it('customer visibility does not broaden CRM lead history', async () => {
    const f = fixture('COMPANY', 'OWN', [['crm.read', 'OWN']]);
    f.tables.lead.push({ id: 'mine', customerId: 'own', managerId: actor.id }, { id: 'foreign-lead', customerId: 'own', managerId: 'foreign-user' });
    expect((await f.service.customer(actor.id, 'own')).leads.map(row => row.id)).toEqual(['mine']);
  });
  it('narrow operational domains filter customer history and totals independently', async () => {
    const f = fixture('COMPANY', 'OWN', [['oms.read', 'OWN'], ['helpdesk.read', 'OWN']]);
    const customer = f.tables.customer[0];
    const orders = [{ id: 'mine', managerId: actor.id, finalAmount: 10 }, { id: 'foreign-order', managerId: 'foreign-user', finalAmount: 900 }].map(row => ({ ...row, customerId: customer.id, customer, organizationId: null, status: 'PAID' }));
    const tickets = [{ id: 'my-ticket', assignedToId: actor.id }, { id: 'foreign-ticket', assignedToId: 'foreign-user' }].map(row => ({ ...row, customerId: customer.id }));
    customer.orders = orders; customer.helpdeskTickets = tickets;
    f.tables.order.push(...orders); f.tables.helpdeskTicket.push(...tickets);
    const card = await f.service.customer(actor.id, customer.id);
    expect(card.orders.map(row => row.id)).toEqual(['mine']); expect(card.helpdeskTickets.map(row => row.id)).toEqual(['my-ticket']);
    expect(card._count).toMatchObject({ orders: 1, helpdeskTickets: 1 });
    expect(card.relatedAccess).toMatchObject({ orders: true, helpdesk: true });
    expect((await f.service.dashboard(actor.id)).revenue).toBe(10);
  });
  it('orders with an inaccessible linked company are excluded even with OMS company read', async () => {
    const f = fixture('OWN', 'OWN', [['oms.read', 'COMPANY']]);
    f.tables.order.push({ id: 'visible-order', customerId: 'own', customer: f.tables.customer[0], organizationId: null, status: 'PAID', finalAmount: 10 }, { id: 'hidden-order', customerId: 'own', customer: f.tables.customer[0], organizationId: 'foreign', organization: f.tables.organization[3], status: 'PAID', finalAmount: 5000 });
    expect((await f.service.customer(actor.id, 'own')).orders.map(row => row.id)).toEqual(['visible-order']);
    expect((await f.service.dashboard(actor.id)).revenue).toBe(10);
  });
  it.each(['ADMIN', 'SUPERVISOR', 'EXECUTIVE', 'MANAGER_SALES', 'IT_SUPPORT'])('membership never demotes a %s staff account', async role => {
    const f = fixture('COMPANY', 'COMPANY'); f.tables.user[0].role = role;
    await expect(f.service.addMember(actor.id, 'own', { userId: actor.id })).rejects.toMatchObject({ status: 404 });
    expect(f.db.organizationMember.upsert).not.toHaveBeenCalled(); expect(f.db.user.updateMany).not.toHaveBeenCalled();
  });
  it('external member must reference a visible writable customer', async () => {
    const f = fixture('OWN', 'OWN'); f.tables.user[4].customer.id = 'foreign';
    await expect(f.service.addMember(actor.id, 'own', { userId: 'client-user' })).rejects.toMatchObject({ status: 404 });
    expect(f.db.organizationMember.upsert).not.toHaveBeenCalled();
  });
  it('normal B2B membership succeeds, but concurrent staff promotion rolls back', async () => {
    const f = fixture('OWN', 'OWN');
    expect(await f.service.addMember(actor.id, 'own', { userId: 'client-user', canSeeFinance: false })).toMatchObject({ customerId: 'own', canSeeFinance: false });
    expect(f.tables.user[4].role).toBe('CUSTOMER_B2B');
    const race = fixture('OWN', 'OWN'); race.db.user.updateMany.mockResolvedValue({ count: 0 });
    await expect(race.service.addMember(actor.id, 'own', { userId: 'client-user' })).rejects.toMatchObject({ status: 409 });
    expect(race.tables.organizationMember).toEqual([]);
  });
  it('legacy /crm/customers uses the same policy rather than returning the entire master', async () => {
    const f = fixture('OWN', 'OWN');
    expect((await new CrmReadService(f.db, f.access).customers(actor.id)).map(row => row.id)).toEqual(['own']);
  });
  it('deal and task references reject hidden/trashed targets and accept scoped targets', async () => {
    const f = fixture('OWN', 'OWN', [['crm.read', 'COMPANY'], ['crm.write', 'COMPANY']]);
    const ctx = { db: f.db, read: await f.access.resolve(f.db, actor.id, 'crm.read'), write: await f.access.resolve(f.db, actor.id, 'crm.write') };
    for (const Service of [CrmLeadWriteService, CrmTaskWriteService]) {
      const service = new Service(f.db, f.access) as any;
      await service.references(ctx, { customerId: 'own', organizationId: 'own' });
      for (const id of ['foreign', 'trashed']) await expect(service.references(ctx, { customerId: id })).rejects.toMatchObject({ status: 403 });
    }
  });
  it('serialization/unique conflicts do not disclose hidden identifiers', async () => {
    for (const code of ['P2002', 'P2034']) {
      const f = fixture(); f.db.$transaction.mockRejectedValue({ code, meta: { hidden: 'private-id' } });
      await expect(f.service.updateCustomer(actor.id, 'own', {})).rejects.toMatchObject({ status: 409 });
    }
  });
  it('migration adds nullable owners without distributing existing data', () => {
    const sql = readFileSync(join(__dirname, '../../prisma/migrations/20260928100000_customer_ownership/migration.sql'), 'utf8');
    expect(sql).toContain('ON DELETE SET NULL'); expect(sql).not.toMatch(/UPDATE "Customer"|UPDATE "Organization"|DELETE FROM|DROP TABLE/);
  });
  it('controller forwards the authenticated actor on every operation', async () => {
    const service: any = Object.fromEntries(['dashboard', 'team', 'customers', 'customer', 'updateCustomer', 'organizations', 'organization', 'createOrganization', 'updateOrganization', 'addMember'].map(key => [key, jest.fn()]));
    const c = new Customer360Controller(service), req = { user: { sub: actor.id } };
    c.dashboard(req); c.team(req); c.listCustomers(req, 'q'); c.customer('id', req); c.updateCustomer('id', {}, req); c.listOrganizations(req); c.organization('id', req); c.createOrganization({ name: 'new' }, req); c.updateOrganization('id', {}, req); c.addMember('id', { userId: 'external' }, req);
    for (const method of Object.values(service) as jest.Mock[]) expect(method.mock.calls[0][0]).toBe(actor.id);
  });
});
