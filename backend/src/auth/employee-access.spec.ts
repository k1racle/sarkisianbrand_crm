import { employeeAccess } from './employee-access';
const actor = { id: 'staff', role: 'MANAGER_SALES', isActive: true, departmentId: 'a', accessProfileMode: true };
const grant = { permissionKey: 'crm.read', scope: 'DEPARTMENT', departmentIds: [] };
function db(grants = [grant], archivedAt: Date | null = null) { return { crmAccessAssignment: { findMany: jest.fn().mockResolvedValue([{ profileId: 'profile', profileVersion: 1, profile: { archivedAt }, snapshot: { name: 'Sales v1', grants } }]) }, crmDepartment: { findMany: jest.fn().mockResolvedValue([{ id: 'a', parentId: null, archivedAt: null }]) } } as any; }
describe('Assigned employee access', () => {
 it('replaces role and personal ALLOW while preserving DENY', async () => {
  const result = await employeeAccess(db(), actor, [{ permission: { key: 'system.manage' } }], [{ effect: 'ALLOW', permission: { key: 'crm.write' } }, { effect: 'DENY', permission: { key: 'crm.read' } }]);
  expect(result.permissions).toEqual([]); expect(result.denied).toEqual(['crm.read']);
 });
 it('resolves the current department from an immutable assignment snapshot', async () => {
  const result = await employeeAccess(db(), actor, [], []);
  expect(result.permissions).toEqual(['crm.read']);
  expect(result.decisions[0].grants[0].resolvedDepartmentIds).toEqual(['a']);
 });
 it('fails closed for an empty assignment instead of falling back to role permissions', async () => {
  const connection = db(); connection.crmAccessAssignment.findMany.mockResolvedValue([]);
  expect((await employeeAccess(connection, actor, [{ permission: { key: 'crm.write' } }], [])).permissions).toEqual([]);
 });
 it('rejects archived profiles, missing departments and unsupported narrow operations', async () => {
  expect((await employeeAccess(db([grant], new Date()), actor, [], [])).permissions).toEqual([]);
  expect((await employeeAccess(db(), { ...actor, departmentId: null }, [], [])).permissions).toEqual([]);
  expect((await employeeAccess(db([{ ...grant, permissionKey: 'system.manage' }]), actor, [], [])).permissions).toEqual([]);
 });
 it('retains existing accounts until an administrator explicitly assigns a profile', async () => {
  const connection = db();
  expect((await employeeAccess(connection, { ...actor, accessProfileMode: false }, [{ permission: { key: 'crm.write' } }], [])).permissions).toEqual(['crm.write']);
  expect(connection.crmAccessAssignment.findMany).not.toHaveBeenCalled();
 });
});
