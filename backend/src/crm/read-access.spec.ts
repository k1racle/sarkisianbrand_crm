import { CrmReadAccess, CrmReadPolicy } from './read-access';
import { resolveProfileScopes } from '../auth/access-scope-policy';

describe('CRM server-created read context', () => {
  const actor = { id: 'employee', role: 'MANAGER_SALES', isActive: true, departmentId: 'sales' };
  function fixture(user: any = actor, grants = ['crm.read'], denied: string[] = []) {
    return { user: { findUnique: jest.fn().mockResolvedValue(user) }, rolePermission: { findMany: jest.fn().mockResolvedValue(grants.map(key => ({ permission: { key } }))) },
      userPermission: { findMany: jest.fn().mockResolvedValue(denied.map(key => ({ effect: 'DENY', permission: { key } }))) },
      crmAccessProfile: { findMany: jest.fn(() => { throw Error('Drafts must not become assignments'); }) },
    } as any;
  }
  it.each([undefined, null, { ...actor, isActive: false }, { ...actor, role: 'CUSTOMER_B2B' }])('rejects unavailable/non-staff accounts', async user => {
    await expect(new CrmReadAccess().resolve(fixture(user === undefined ? null : user), actor.id)).rejects.toThrow('недоступна');
  });
  it('does not accept a missing actor or manufacture crm.read from write', async () => {
    await expect(new CrmReadAccess().resolve(fixture(), '')).rejects.toThrow('не определён');
    await expect(new CrmReadAccess().resolve(fixture(actor, ['crm.write']), actor.id)).rejects.toThrow('Нет доступа');
  });
  it('respects DENY when preparing nested read permissions', async () => {
    const policy = await new CrmReadAccess().resolve(fixture(actor, ['crm.read', 'customers.read'], ['customers.read']), actor.id);
    expect(policy.company('crm.read')).toBe(true); expect(policy.company('customers.read')).toBe(false);
    await expect(new CrmReadAccess().resolve(fixture(actor, ['crm.read'], ['crm.read']), actor.id)).rejects.toThrow('Нет доступа');
  });
  it('preserves explicit legacy visibility, but never reads draft profiles', async () => {
    const db = fixture(); const policy = await new CrmReadAccess().resolve(db, actor.id);
    expect(policy.tasks()).toEqual({}); expect(db.crmAccessProfile.findMany).not.toHaveBeenCalled();
    expect(db.rolePermission.findMany.mock.calls[0][0].where.role).toBe(actor.role);
  });
  it('content comments are limited to publication tasks, not arbitrary task IDs', async () => {
    const policy = await new CrmReadAccess().resolve(fixture(actor, ['content_plan.read']), actor.id, 'content_plan.read');
    expect(policy.tasks()).toEqual({ AND: [{}, { publication: { isNot: null } }] });
    expect(policy.leads()).toEqual({ id: { in: [] } });
  });
  it('binds scoped decisions to their actor, with no client-provided override', () => {
    const decisions = resolveProfileScopes(actor, [{ profileId: 'draft', profileName: 'Test', permissionKey: 'crm.read', scope: 'OWN', departmentIds: [] }], []);
    expect(new CrmReadPolicy(actor.id, decisions).tasks()).toEqual({ OR: [{ assignedToId: actor.id }] });
    expect(() => new CrmReadPolicy('other', decisions)).toThrow('Нет доступа');
    expect(() => new CrmReadPolicy(actor.id, [])).toThrow('Нет доступа');
  });
});
