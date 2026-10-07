import { Prisma } from '@prisma/client';
import { AccessActor, ProfileScopeGrant, resolveProfileScopes } from './access-scope-policy';
import { effectivePermissions } from './effective-permissions';

// Other operations have their own participant rules or global configuration only.
export const scopedPermissions = ['crm.read', 'crm.write', 'customers.read', 'customers.write', 'oms.read', 'oms.write', 'helpdesk.read', 'helpdesk.write', 'content_plan.read', 'content_plan.write', 'content_plan.approve'];
export const scopedControllers = ['CrmController', 'Customer360Controller', 'OmsController', 'HelpdeskController', 'CrmContentController', 'CrmDriveController'];
export async function employeeAccess(db: Prisma.TransactionClient, input: Omit<AccessActor, 'departmentId'> & { departmentId?: string | null; accessProfileMode?: boolean }, roles: Array<{ permission: { key: string } }>, overrides: Array<{ effect: string; permission: { key: string } }>) {
 const actor = { ...input, departmentId: input.departmentId || null };
 const legacy = effectivePermissions(roles, overrides);
 let grants: ProfileScopeGrant[];
 let departments: Array<{ id: string; parentId: string | null; archivedAt: Date | null }> = [];
 if (actor.accessProfileMode) {
  const assignments = await db.crmAccessAssignment.findMany({ where: { userId: actor.id }, include: { profile: { select: { archivedAt: true } } } });
  departments = await db.crmDepartment.findMany({ select: { id: true, parentId: true, archivedAt: true } });
  grants = assignments.flatMap(assignment => {
   if (assignment.profile.archivedAt) return [];
   const snapshot = assignment.snapshot as any;
   if (!snapshot || !Array.isArray(snapshot.grants)) return [];
   return snapshot.grants.filter((grant: any) => typeof grant.permissionKey === 'string' && Array.isArray(grant.departmentIds) && (grant.scope === 'COMPANY' || scopedPermissions.includes(grant.permissionKey)))
    .map((grant: any) => ({ profileId: assignment.profileId, profileName: snapshot.name, permissionKey: grant.permissionKey, scope: grant.scope, departmentIds: grant.departmentIds }));
  });
 } else grants = legacy.permissions.map(permissionKey => ({ profileId: `legacy:${actor.role}`, profileName: actor.role, permissionKey, scope: 'COMPANY', departmentIds: [] }));
 const decisions = resolveProfileScopes(actor, grants, departments, legacy.denied);
 return { permissions: actor.accessProfileMode ? decisions.filter(item => item.allowed && !item.denied).map(item => item.permissionKey) : legacy.permissions, denied: legacy.denied, decisions };
}
