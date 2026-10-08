import { accessScopes, AccessActor, leadScopeWhere, ProfileScopeGrant, resolveProfileScopes, taskScopeWhere } from './access-scope-policy';

const actor: AccessActor = { id: 'employee', role: 'MANAGER_SALES', isActive: true, departmentId: 'sales' };
const departments = [
  { id: 'sales', parentId: null, archivedAt: null },
  { id: 'b2b', parentId: 'sales', archivedAt: null },
  { id: 'regions', parentId: 'b2b', archivedAt: null },
  { id: 'smm', parentId: null, archivedAt: null },
  { id: 'old', parentId: 'sales', archivedAt: new Date() },
  { id: 'old-child', parentId: 'old', archivedAt: null },
];
const grant = (scope = 'OWN', permissionKey = 'crm.read', departmentIds: string[] = []): ProfileScopeGrant => ({ profileId: 'profile', profileName: 'Продажи', permissionKey, scope, departmentIds });
const resolve = (grants: ProfileScopeGrant[], current = actor, denied: string[] = []) => resolveProfileScopes(current, grants, departments, denied);

describe('Access profile scopes — per-operation, fail-closed, preview only', () => {
  it('keeps whole-company read separate from own-record write', () => {
    const decisions = resolve([grant('COMPANY'), grant('OWN', 'crm.write')]);
    expect(taskScopeWhere(decisions, 'crm.read')).toEqual({});
    expect(taskScopeWhere(decisions, 'crm.write')).toEqual({ OR: [{ assignedToId: actor.id }] });
    expect(leadScopeWhere(decisions, 'crm.write')).toEqual({ OR: [{ managerId: actor.id }] });
  });
  it('does not flatten scopes when combining different profiles', () => {
    const decisions = resolve([grant('COMPANY'), { ...grant('DEPARTMENT', 'crm.write'), profileId: 'second' }]);
    expect(decisions.find(item => item.permissionKey === 'crm.write')?.grants).toHaveLength(1);
    expect(taskScopeWhere(decisions, 'crm.write')).toEqual({ OR: [{ assignedTo: { departmentId: { in: ['sales'] } } }] });
  });
  it.each(['crm.write', 'crm.export', 'unknown.read'])('missing %s returns no records', permission => {
    const decisions = resolve([grant('COMPANY')]);
    expect(taskScopeWhere(decisions, permission)).toEqual({ id: { in: [] } });
    expect(leadScopeWhere(decisions, permission)).toEqual({ id: { in: [] } });
  });
  it.each(accessScopes.map(scope => scope.id))('explicit DENY wins over scope %s and any number of profiles', scope => {
    const decisions = resolve([grant(scope, 'crm.read', scope === 'SELECTED_DEPARTMENTS' ? ['sales'] : []), { ...grant('COMPANY'), profileId: 'second' }], actor, ['crm.read']);
    expect(decisions[0].allowed).toBe(false);
    expect(taskScopeWhere(decisions, 'crm.read')).toEqual({ id: { in: [] } });
  });
  it('department does not include children or siblings', () => {
    expect(resolve([grant('DEPARTMENT')])[0].grants[0].resolvedDepartmentIds).toEqual(['sales']);
  });
  it('department tree includes descendants but excludes other departments and archived branches', () => {
    expect(resolve([grant('DEPARTMENT_TREE')])[0].grants[0].resolvedDepartmentIds).toEqual(['b2b', 'regions', 'sales']);
  });
  it('selected departments do not expand automatically', () => {
    expect(resolve([grant('SELECTED_DEPARTMENTS', 'crm.read', ['b2b', 'smm'])])[0].grants[0].resolvedDepartmentIds).toEqual(['b2b', 'smm']);
  });
  it.each([[], ['unknown'], ['old'], ['sales', 'old']].map(ids => ({ ids })))('invalid/archived selected departments %p do not fall back to company', ({ ids }) => {
    expect(resolve([grant('SELECTED_DEPARTMENTS', 'crm.read', ids)])[0].allowed).toBe(false);
  });
  it.each([null, 'missing', 'old'])('department %p does not grant access', departmentId => {
    expect(resolve([grant('DEPARTMENT_TREE')], { ...actor, departmentId })[0].allowed).toBe(false);
  });
  it('broken/cyclic department trees fail closed', () => {
    for (const parentId of ['sales', 'missing']) expect(resolveProfileScopes(actor, [grant('DEPARTMENT_TREE')], [{ id: 'sales', parentId, archivedAt: null }])[0].allowed).toBe(false);
  });
  it.each([{ ...actor, isActive: false }, { ...actor, id: '' }, { ...actor, role: 'CUSTOMER_B2B' }, { ...actor, role: 'UNKNOWN' }])('inactive/non-staff actor cannot gain company visibility', current => {
    expect(resolve([grant('COMPANY')], current)[0].allowed).toBe(false);
  });
  it.each(['ADMIN', 'EXECUTIVE'])('%s has company visibility only for actually granted operations', role => {
    const current = { ...actor, role, departmentId: null };
    expect(taskScopeWhere(resolve([grant('DEPARTMENT')], current), 'crm.read')).toEqual({});
    expect(taskScopeWhere(resolve([grant('DEPARTMENT')], current), 'crm.write')).toEqual({ id: { in: [] } });
    expect(taskScopeWhere(resolve([grant('COMPANY')], current, ['crm.read']), 'crm.read')).toEqual({ id: { in: [] } });
  });
  it.each(['ADMIN', 'EXECUTIVE'])('%s company visibility does not broaden write or finance scopes', role => {
    const decisions = resolve([grant('OWN'), grant('OWN', 'crm.write'), grant('OWN', 'payments.refund')], { ...actor, role });
    expect(taskScopeWhere(decisions, 'crm.read')).toEqual({});
    expect(taskScopeWhere(decisions, 'crm.write')).toEqual({ OR: [{ assignedToId: actor.id }] });
    expect(decisions.find(item => item.permissionKey === 'payments.refund')?.grants[0].effectiveScope).toBe('OWN');
  });
  it('unknown scope is not silently upgraded for administrator', () => {
    expect(resolve([grant('UNRECOGNIZED')], { ...actor, role: 'ADMIN' })[0].allowed).toBe(false);
  });
  it('irrelevant selected department data is rejected', () => {
    expect(resolve([grant('OWN', 'crm.read', ['sales'])])[0].allowed).toBe(false);
  });
  it('participation stays attached to the actor, not to the whole foreign department', () => {
    const decisions = resolve([grant('PARTICIPATING')]);
    expect(taskScopeWhere(decisions, 'crm.read')).toEqual({ OR: [{ OR: [{ assignedToId: actor.id }, { createdById: actor.id }, { participants: { some: { userId: actor.id } } }] }] });
    expect(JSON.stringify(leadScopeWhere(decisions, 'crm.read'))).not.toContain('departmentId');
    expect(JSON.stringify(leadScopeWhere(decisions, 'crm.read'))).toContain('CANCELLED');
  });
});
