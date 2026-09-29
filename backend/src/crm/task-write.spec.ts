import { CrmTaskWriteService } from './task-write.service';
import { CrmReadAccess, CrmReadPolicy } from './read-access';
import { resolveProfileScopes } from '../auth/access-scope-policy';

describe('Task mutation boundary', () => {
  const actor = { id: 'actor', role: 'MANAGER_SALES', isActive: true, departmentId: 'sales' };
  function policy(scope: string, permission = 'crm.write') {
    return new CrmReadPolicy(actor.id, resolveProfileScopes(actor, [{ profileId: 'test', profileName: 'Test', permissionKey: permission, scope, departmentIds: [] }], [{ id: 'sales', parentId: null, archivedAt: null }]), permission);
  }
  it.each(['OWN', 'PARTICIPATING'])('%s cannot assign an out-of-scope employee by forging authorship', scope => {
    expect(policy(scope).assignees()).toMatchObject({ AND: [{ isActive: true }, { OR: [{ id: actor.id }] }] });
  });
  it('department assignment uses resolved active departments, not a client department ID', () => {
    expect(policy('DEPARTMENT').assignees()).toMatchObject({ AND: [{ isActive: true }, { OR: [{ departmentId: { in: ['sales'] } }] }] });
  });
  it('company assignment still requires an active staff account', () => {
    expect(policy('COMPANY').assignees()).toMatchObject({ isActive: true, role: { in: expect.arrayContaining(['MANAGER_SALES']) } });
  });
  it('publication write policy cannot address an arbitrary task', () => {
    expect(policy('OWN', 'content_plan.write').tasks()).toEqual({ AND: [{ OR: [{ assignedToId: actor.id }] }, { publication: { isNot: null } }] });
  });
  it('read-wide does not broaden independent write scope', () => {
    const decisions = resolveProfileScopes(actor, [
      { profileId: 'test', profileName: 'Test', permissionKey: 'crm.read', scope: 'COMPANY', departmentIds: [] },
      { profileId: 'test', profileName: 'Test', permissionKey: 'crm.write', scope: 'OWN', departmentIds: [] },
    ], []);
    expect(new CrmReadPolicy(actor.id, decisions, 'crm.read').tasks()).toEqual({});
    expect(new CrmReadPolicy(actor.id, decisions, 'crm.write').tasks()).toEqual({ OR: [{ assignedToId: actor.id }] });
  });
  it('returns a conflict for a serialization failure instead of claiming success', async () => {
    const db = { $transaction: jest.fn().mockRejectedValue({ code: 'P2034' }) } as any;
    await expect(new CrmTaskWriteService(db, new CrmReadAccess()).update(actor.id, 'task', { title: 'Change' })).rejects.toThrow('Данные изменились');
    expect(db.$transaction.mock.calls[0][1]).toEqual({ isolationLevel: 'Serializable', timeout: 20000 });
  });
  it('never starts a transaction for the archive-as-move shortcut', async () => {
    const db = { $transaction: jest.fn() } as any;
    expect(() => new CrmTaskWriteService(db, new CrmReadAccess()).move(actor.id, 'task', 'CANCELLED')).toThrow('Перенести в архив');
    expect(db.$transaction).not.toHaveBeenCalled();
  });
});
