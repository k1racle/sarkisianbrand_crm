import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AccessDecision, customerScopeWhere, organizationScopeWhere, leadScopeWhere, orderScopeWhere, ticketScopeWhere, resolveProfileScopes, taskScopeWhere } from '../auth/access-scope-policy';
import { effectivePermissions } from '../auth/effective-permissions';
import { internalWorkspaceRoles } from '../auth/workspace-role-catalog';

/** Server-created only. No request/query DTO accepts decisions or an access scope. */
export class CrmReadPolicy {
  constructor(readonly actorId: string, private readonly decisions: AccessDecision[], readonly permission = 'crm.read') {
    if (!actorId || decisions.some(item => item.actorId !== actorId) || !this.allowed(permission)) throw new ForbiddenException('Нет доступа к записям CRM');
  }
  allowed(key: string) { return this.decisions.some(item => item.permissionKey === key && item.allowed && !item.denied); }
  company(key: string) { return this.decisions.some(item => item.permissionKey === key && item.allowed && !item.denied && item.grants.some(grant => grant.allowed && grant.effectiveScope === 'COMPANY')); }
  tasks(permission = this.permission): Prisma.TaskWhereInput {
    const scope = taskScopeWhere(this.decisions, permission);
    return permission.startsWith('content_plan.') ? { AND: [scope, { publication: { isNot: null } }] } : scope;
  }
  leads(permission = 'crm.read') { return leadScopeWhere(this.decisions, permission); }
  customers(permission = 'customers.read') { return customerScopeWhere(this.decisions, permission); }
  organizations(permission = 'customers.read') { return organizationScopeWhere(this.decisions, permission); }
  orders(permission = 'oms.read') { return orderScopeWhere(this.decisions, permission); }
  tickets(permission = 'helpdesk.read') { return ticketScopeWhere(this.decisions, permission); }
  /** Assignment is not participation: authoring a task must not bypass a restricted target department. */
  assignees(): Prisma.UserWhereInput {
    const decision = this.decisions.find(item => item.permissionKey === this.permission);
    const staff = { isActive: true, role: { in: [...internalWorkspaceRoles] } };
    if (!decision?.allowed || decision.denied) return { id: { in: [] } };
    if (this.company(this.permission)) return staff;
    const choices: Prisma.UserWhereInput[] = [];
    for (const grant of decision.grants.filter(item => item.allowed)) {
      if (grant.effectiveScope === 'OWN' || grant.effectiveScope === 'PARTICIPATING') choices.push({ id: this.actorId });
      else if (grant.resolvedDepartmentIds.length) choices.push({ departmentId: { in: grant.resolvedDepartmentIds } });
    }
    return { AND: [staff, choices.length ? { OR: choices } : { id: { in: [] } }] };
  }
}

@Injectable()
export class CrmReadAccess {
  async resolve(db: Prisma.TransactionClient, actorId: string, permission = 'crm.read') {
    if (!actorId) throw new ForbiddenException('Сотрудник не определён');
    const actor = await db.user.findUnique({ where: { id: actorId }, select: { id: true, role: true, isActive: true, departmentId: true } });
    if (!actor?.isActive || !internalWorkspaceRoles.includes(actor.role)) throw new ForbiddenException('Учётная запись недоступна');
    const [roles, overrides] = await Promise.all([
      db.rolePermission.findMany({ where: { role: actor.role }, select: { permission: { select: { key: true } } } }),
      db.userPermission.findMany({ where: { userId: actorId }, select: { effect: true, permission: { select: { key: true } } } }),
    ]);
    const effective = effectivePermissions(roles, overrides);
    // Compatibility is explicit, not a fallback for an absent/invalid profile. Drafts remain unassigned.
    // Replace this source with versioned assignments only after every read AND write path is covered.
    const decisions = resolveProfileScopes(actor, effective.permissions.map(permissionKey => ({
      profileId: `legacy:${actor.role}`, profileName: actor.role, permissionKey, scope: 'COMPANY', departmentIds: [],
    })), [], effective.denied);
    return new CrmReadPolicy(actor.id, decisions, permission);
  }
}
