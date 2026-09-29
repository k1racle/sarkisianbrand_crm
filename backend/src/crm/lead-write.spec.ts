import { CrmLeadWriteService } from './lead-write.service';
import { CrmReadAccess, CrmReadPolicy } from './read-access';
import { resolveProfileScopes } from '../auth/access-scope-policy';

describe('Deal mutation boundary', () => {
  const actor = { id: 'actor', role: 'MANAGER_SALES', isActive: true, departmentId: 'sales' };
  const dto = { source: 'MANUAL', contactName: 'Anna Volkova', contactPhone: '+7 (999) 000-00-00', contactEmail: 'Anna@example.test' };
  function fixture(customerRead?: string, customerWrite?: string) {
    const grants = [['crm.read', 'OWN'], ['crm.write', 'OWN'], ...(customerRead ? [['customers.read', customerRead]] : []), ...(customerWrite ? [['customers.write', customerWrite]] : [])];
    const decisions = resolveProfileScopes(actor, grants.map(([permissionKey, scope]) => ({ permissionKey, scope, profileId: 'test', profileName: 'Test', departmentIds: [] })), [{ id: 'sales', parentId: null, archivedAt: null }]);
    const db = { dataTrashEntry: { findMany: jest.fn().mockResolvedValue([]) }, customer: { findMany: jest.fn().mockResolvedValue([]), create: jest.fn().mockResolvedValue({ id: 'new-customer' }), findUnique: jest.fn(), findFirst: jest.fn() }, organization: { findUnique: jest.fn(), findFirst: jest.fn() } };
    return { service: new CrmLeadWriteService({} as any, new CrmReadAccess()) as any,
      ctx: { db, read: new CrmReadPolicy(actor.id, decisions), write: new CrmReadPolicy(actor.id, decisions, 'crm.write') }, db };
  }
  it.each([undefined, 'OWN', 'DEPARTMENT'])('does not query or mutate the customer master for %s customer scope', async scope => {
    const { service, ctx, db } = fixture(scope, 'COMPANY');
    expect(await service.customer(ctx, dto)).toBeNull();
    expect(db.customer.findMany).not.toHaveBeenCalled(); expect(db.customer.create).not.toHaveBeenCalled();
  });
  it('read alone can match an existing customer but cannot create one', async () => {
    const { service, ctx, db } = fixture('COMPANY');
    expect(await service.customer(ctx, dto)).toBeNull(); expect(db.customer.create).not.toHaveBeenCalled();
    db.customer.findMany.mockResolvedValue([{ id: 'existing' }] as never);
    expect(await service.customer(ctx, dto)).toBe('existing');
    expect(db.customer.findMany.mock.calls[0][0]).toMatchObject({ where: { AND: [{ AND: [{}, { id: { notIn: [] } }] }, { OR: [{ normalizedEmail: 'anna@example.test' }, { normalizedPhone: '79990000000' }] }] }, take: 10 });
  });
  it('creates a customer only with independent company read AND write', async () => {
    const { service, ctx, db } = fixture('COMPANY', 'COMPANY');
    expect(await service.customer(ctx, dto)).toBe('new-customer');
    expect(db.customer.create.mock.calls[0][0].data).toMatchObject({ firstName: 'Anna', lastName: 'Volkova', normalizedEmail: 'anna@example.test', normalizedPhone: '79990000000', accountManagerId: actor.id, createdById: actor.id });
  });
  it('does not promote narrow customer write to company', async () => {
    const { service, ctx, db } = fixture('COMPANY', 'OWN');
    expect(await service.customer(ctx, dto)).toBeNull(); expect(db.customer.create).not.toHaveBeenCalled();
  });
  it('rejects ambiguous contact matching without creating or choosing a random customer', async () => {
    const { service, ctx, db } = fixture('COMPANY', 'COMPANY');
    db.customer.findMany.mockResolvedValue([{ id: 'one' }, { id: 'two' }] as never);
    await expect(service.customer(ctx, dto)).rejects.toMatchObject({ response: { code: 'CRM_CUSTOMER_MATCH_AMBIGUOUS', candidates: [{ id: 'one' }, { id: 'two' }] } }); expect(db.customer.create).not.toHaveBeenCalled();
  });
  it('respects an explicit validated selection or no-customer choice without auto matching', async () => {
    const { service, ctx, db } = fixture('COMPANY', 'COMPANY');
    expect(await service.customer(ctx, { ...dto, customerId: 'chosen' })).toBe('chosen');
    expect(await service.customer(ctx, { ...dto, customerId: null })).toBeNull();
    expect(db.customer.findMany).not.toHaveBeenCalled(); expect(db.customer.create).not.toHaveBeenCalled();
  });
  it('does not look up even a supplied ID, or clear hidden references, without domain read', async () => {
    const { service, ctx, db } = fixture();
    for (const change of [{ customerId: 'hidden' }, { organizationId: 'hidden' }, { customerId: null }]) await expect(service.references(ctx, change)).rejects.toThrow('недоступна');
    expect(db.customer.findUnique).not.toHaveBeenCalled(); expect(db.organization.findUnique).not.toHaveBeenCalled();
  });
  it.each(['managerId', 'stageId', 'status', 'amount', 'probability', 'source', 'contactName', 'contactPhone', 'tags'])('rejects null %s despite IsOptional', key => {
    const { service } = fixture(); expect(() => service.validate({ [key]: null })).toThrow('нельзя очистить');
  });
  it('maps serialization conflicts to a retryable 409 response', async () => {
    const db = { $transaction: jest.fn().mockRejectedValue({ code: 'P2034' }) } as any;
    await expect(new CrmLeadWriteService(db, new CrmReadAccess()).update(actor.id, 'lead', {})).rejects.toMatchObject({ status: 409 });
    expect(db.$transaction.mock.calls[0][1]).toEqual({ isolationLevel: 'Serializable', timeout: 20000 });
  });
});
