import { Prisma } from '@prisma/client';
import { CrmReadPolicy } from './read-access';

export type DriveReadPermission = 'crm.read' | 'content_plan.read';
export type DriveWritePermission = 'crm.write' | 'content_plan.write';
export const driveReadPermission = (permission: DriveReadPermission | DriveWritePermission): DriveReadPermission => permission.startsWith('content_plan.') ? 'content_plan.read' : 'crm.read';

// Each durable origin must remain readable (and, for mutations, writable).
// Missing/deleted parents fail closed; an empty restricted ACL never grants access.
function origins(policy: CrmReadPolicy, write = false): Prisma.CrmDriveRestrictionWhereInput {
  const crm = write ? 'crm.write' : 'crm.read', content = write ? 'content_plan.write' : 'content_plan.read';
  const tasks: Prisma.TaskWhereInput[] = [];
  if (policy.allowed(crm)) tasks.push(policy.tasks(crm));
  if (policy.allowed(content)) tasks.push(policy.tasks(content));
  return { OR: [
    { originKind: 'TASK', task: { is: { OR: tasks } } },
    { originKind: 'LEAD', lead: { is: policy.leads(crm) } },
  ] };
}

export function driveWhere(read: CrmReadPolicy, scope?: string, write?: CrmReadPolicy): Prisma.CrmDriveNodeWhereInput {
  const common: Prisma.CrmDriveNodeWhereInput = { restricted: false, restrictions: { none: {} }, tasks: { none: {} }, leads: { none: {} } };
  if (write && !write.company('crm.write') && !write.company('content_plan.write')) common.ownerId = read.actorId;
  const protectedFile: Prisma.CrmDriveNodeWhereInput = { restricted: true, restrictions: { some: {}, every: origins(read) } };
  if (write) protectedFile.AND = [{ restrictions: { every: origins(write, true) } }];
  const personal = { scope: 'PERSONAL', ownerId: read.actorId };
  const team = { scope: 'TEAM', OR: [common, protectedFile] };
  return scope === 'PERSONAL' ? personal : scope === 'TEAM' ? team : { OR: [personal, team] };
}
