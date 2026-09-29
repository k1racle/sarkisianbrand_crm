import { Prisma } from '@prisma/client';
import { internalWorkspaceRoles } from './workspace-role-catalog';

export const accessScopes = [
  { id: 'OWN', label: 'Свои записи', description: 'Записи, за которые сотрудник отвечает.' },
  { id: 'PARTICIPATING', label: 'Свои и с участием', description: 'Свои записи и записи с явным участием сотрудника.' },
  { id: 'DEPARTMENT', label: 'Свой отдел', description: 'Записи сотрудников текущего отдела, без подотделов.' },
  { id: 'DEPARTMENT_TREE', label: 'Отдел и подотделы', description: 'Текущий отдел и его действующие дочерние отделы.' },
  { id: 'SELECTED_DEPARTMENTS', label: 'Выбранные отделы', description: 'Только перечисленные действующие отделы, без автоматического включения подотделов.' },
  { id: 'COMPANY', label: 'Вся компания', description: 'Все записи в рамках конкретного разрешённого действия.' },
] as const;
export type Scope = typeof accessScopes[number]['id'];
export type AccessActor = { id: string; role: string; isActive: boolean; departmentId: string | null };
export type AccessDepartment = { id: string; parentId: string | null; archivedAt: Date | string | null };
export type ProfileScopeGrant = { profileId: string; profileName: string; permissionKey: string; scope: string; departmentIds: string[] };
export type ResolvedScopeGrant = ProfileScopeGrant & { allowed: boolean; effectiveScope: Scope | null; resolvedDepartmentIds: string[]; reason: string };
export type AccessDecision = { permissionKey: string; actorId: string; allowed: boolean; denied: boolean; grants: ResolvedScopeGrant[] };

/** Pure policy compiler. Not an authorization guard: draft previews never change active access. */
export function resolveProfileScopes(actor: AccessActor, grants: ProfileScopeGrant[], departments: AccessDepartment[], deniedKeys: string[] = []): AccessDecision[] {
  const active = new Map(departments.filter(item => !item.archivedAt).map(item => [item.id, item]));
  const denied = new Set(deniedKeys);
  function validBranch(id: string) {
    const visited = new Set<string>(); let current: string | null = id;
    while (current) {
      if (visited.has(current) || !active.has(current)) return false;
      visited.add(current); current = active.get(current)!.parentId;
    }
    return true;
  }
  function resolve(grant: ProfileScopeGrant): ResolvedScopeGrant {
    const result: ResolvedScopeGrant = { ...grant, allowed: false, effectiveScope: null, resolvedDepartmentIds: [], reason: '' };
    const reject = (reason: string) => ({ ...result, reason });
    if (!actor.isActive || !actor.id || !internalWorkspaceRoles.some(role => role === actor.role)) return reject('ACCOUNT_UNAVAILABLE');
    if (denied.has(grant.permissionKey)) return reject('EXPLICIT_DENY');
    if (!accessScopes.some(scope => scope.id === grant.scope)) return reject('UNKNOWN_SCOPE');
    if (grant.scope !== 'SELECTED_DEPARTMENTS' && grant.departmentIds.length) return reject('INVALID_DEPARTMENT_SELECTION');
    const scope = grant.scope as Scope;
    let ids: string[] = [];
    if (scope === 'SELECTED_DEPARTMENTS') {
      if (!grant.departmentIds.length || grant.departmentIds.some(id => !active.has(id))) return reject('SELECTED_DEPARTMENT_UNAVAILABLE');
      ids = [...new Set(grant.departmentIds)];
    }
    // Company visibility never manufactures an operation or broadens its write/finance scope.
    if ((actor.role === 'ADMIN' || actor.role === 'EXECUTIVE') && grant.permissionKey.endsWith('.read')) return { ...result, allowed: true, effectiveScope: 'COMPANY', reason: 'COMPANY_LEADERSHIP' };
    if (scope === 'DEPARTMENT' || scope === 'DEPARTMENT_TREE') {
      if (!actor.departmentId || !active.has(actor.departmentId)) return reject('DEPARTMENT_NOT_ASSIGNED');
      if (!validBranch(actor.departmentId)) return reject('INVALID_DEPARTMENT_TREE');
      ids = [actor.departmentId];
      if (scope === 'DEPARTMENT_TREE') {
        const branch = new Set(ids); let expanded = true;
        while (expanded) {
          expanded = false;
          for (const node of active.values()) if (node.parentId && branch.has(node.parentId) && !branch.has(node.id)) {
            branch.add(node.id); expanded = true;
          }
        }
        ids = [...branch];
      }
    }
    return { ...result, allowed: true, effectiveScope: scope, resolvedDepartmentIds: ids.sort(), reason: 'PROFILE' };
  }
  const keys = [...new Set(grants.map(grant => grant.permissionKey))].sort();
  return keys.map(permissionKey => {
    const resolved = grants.filter(grant => grant.permissionKey === permissionKey).map(resolve);
    return { permissionKey, actorId: actor.id, allowed: resolved.some(grant => grant.allowed), denied: denied.has(permissionKey), grants: resolved };
  });
}

/** Only compile the requested operation. Never union read scopes with write scopes. */
export function taskScopeWhere(decisions: AccessDecision[], permissionKey: string): Prisma.TaskWhereInput {
  const decision = decisions.find(item => item.permissionKey === permissionKey);
  if (!decision?.allowed || decision.denied) return { id: { in: [] } };
  const grants = decision.grants.filter(grant => grant.allowed);
  if (grants.some(grant => grant.effectiveScope === 'COMPANY')) return {};
  const where: Prisma.TaskWhereInput[] = [];
  for (const grant of grants) {
    if (grant.effectiveScope === 'OWN') where.push({ assignedToId: decision.actorId });
    else if (grant.effectiveScope === 'PARTICIPATING') where.push({ OR: [{ assignedToId: decision.actorId }, { createdById: decision.actorId }] });
    else if (grant.resolvedDepartmentIds.length) where.push({ assignedTo: { departmentId: { in: grant.resolvedDepartmentIds } } });
  }
  return where.length ? { OR: where } : { id: { in: [] } };
}

export function leadScopeWhere(decisions: AccessDecision[], permissionKey: string): Prisma.LeadWhereInput {
  const decision = decisions.find(item => item.permissionKey === permissionKey);
  if (!decision?.allowed || decision.denied) return { id: { in: [] } };
  const grants = decision.grants.filter(grant => grant.allowed);
  if (grants.some(grant => grant.effectiveScope === 'COMPANY')) return {};
  const where: Prisma.LeadWhereInput[] = [];
  for (const grant of grants) {
    if (grant.effectiveScope === 'OWN') where.push({ managerId: decision.actorId });
    else if (grant.effectiveScope === 'PARTICIPATING') where.push({ OR: [{ managerId: decision.actorId }, { createdById: decision.actorId }, { tasks: { some: { assignedToId: decision.actorId, status: { not: 'CANCELLED' } } } }] });
    else if (grant.resolvedDepartmentIds.length) where.push({ manager: { departmentId: { in: grant.resolvedDepartmentIds } } });
  }
  return where.length ? { OR: where } : { id: { in: [] } };
}

/** Order ownership is the staff manager, never the buyer's userId. */
export function orderScopeWhere(decisions: AccessDecision[], permissionKey: string): Prisma.OrderWhereInput {
  const decision = decisions.find(item => item.permissionKey === permissionKey);
  if (!decision?.allowed || decision.denied) return { id: { in: [] } };
  const grants = decision.grants.filter(item => item.allowed);
  if (grants.some(item => item.effectiveScope === 'COMPANY')) return {};
  const choices: Prisma.OrderWhereInput[] = [];
  for (const grant of grants) {
    if (grant.effectiveScope === 'OWN') choices.push({ managerId: decision.actorId });
    else if (grant.effectiveScope === 'PARTICIPATING') choices.push({ OR: [{ managerId: decision.actorId }, { tasks: { some: { assignedToId: decision.actorId, status: { not: 'CANCELLED' } } } }] });
    else if (grant.resolvedDepartmentIds.length) choices.push({ manager: { departmentId: { in: grant.resolvedDepartmentIds } } });
  }
  return choices.length ? { OR: choices } : { id: { in: [] } };
}

export function ticketScopeWhere(decisions: AccessDecision[], permissionKey: string): Prisma.HelpdeskTicketWhereInput {
  const decision = decisions.find(item => item.permissionKey === permissionKey);
  if (!decision?.allowed || decision.denied) return { id: { in: [] } };
  const grants = decision.grants.filter(item => item.allowed);
  if (grants.some(item => item.effectiveScope === 'COMPANY')) return {};
  const choices: Prisma.HelpdeskTicketWhereInput[] = [];
  for (const grant of grants) {
    if (grant.effectiveScope === 'OWN') choices.push({ assignedToId: decision.actorId });
    else if (grant.effectiveScope === 'PARTICIPATING') choices.push({ OR: [{ assignedToId: decision.actorId }, { requesterUserId: decision.actorId }] });
    else if (grant.resolvedDepartmentIds.length) choices.push({ assignedTo: { departmentId: { in: grant.resolvedDepartmentIds } } });
  }
  return choices.length ? { OR: choices } : { id: { in: [] } };
}

/** Contacts/companies have explicit staff ownership, not the customer's login or membership. */
export function customerScopeWhere(decisions: AccessDecision[], permissionKey: string): Prisma.CustomerWhereInput {
  return managedRecordScope(decisions, permissionKey);
}
export function organizationScopeWhere(decisions: AccessDecision[], permissionKey: string): Prisma.OrganizationWhereInput {
  return managedRecordScope(decisions, permissionKey);
}
type ManagedRecordWhere = { id?: { in: string[] }; accountManagerId?: string; createdById?: string; accountManager?: { departmentId: { in: string[] } }; OR?: ManagedRecordWhere[] };
function managedRecordScope(decisions: AccessDecision[], key: string): ManagedRecordWhere {
  const decision = decisions.find(item => item.permissionKey === key);
  if (!decision?.allowed || decision.denied) return { id: { in: [] } };
  const grants = decision.grants.filter(item => item.allowed);
  if (grants.some(item => item.effectiveScope === 'COMPANY')) return {};
  const choices: ManagedRecordWhere[] = [];
  for (const grant of grants) {
    if (grant.effectiveScope === 'OWN') choices.push({ accountManagerId: decision.actorId });
    else if (grant.effectiveScope === 'PARTICIPATING') choices.push({ OR: [{ accountManagerId: decision.actorId }, { createdById: decision.actorId }] });
    else if (grant.resolvedDepartmentIds.length) choices.push({ accountManager: { departmentId: { in: grant.resolvedDepartmentIds } } });
  }
  return choices.length ? { OR: choices } : { id: { in: [] } };
}
