import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { CrmReadAccess } from './read-access';
import { recordCrmChange } from './history';

export const taskPerson = { id: true, firstName: true, lastName: true, email: true } as const;
export const taskParticipants = { include: { user: { select: taskPerson } }, orderBy: [{ createdAt: 'asc' as const }, { userId: 'asc' as const }] };
export const taskPersonName = (user: any) => [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;
// Match the task controller's role gate as well as the per-user permission scopes.
const taskRoles = ['ADMIN', 'MANAGER_B2B', 'MANAGER_SALES', 'SUPERVISOR', 'EXECUTIVE'] as const;

export async function canJoinTask(db: Prisma.TransactionClient, access: CrmReadAccess, userId: string, taskId?: string) {
  try {
    const policy = await access.resolve(db, userId);
    if (policy.company('crm.read') || policy.participating('crm.read')) return true;
    return !!taskId && !!await db.task.findFirst({ where: { AND: [{ id: taskId }, policy.tasks()] }, select: { id: true } });
  } catch (e) { if (e instanceof ForbiddenException) return false; throw e; }
}

export async function taskPeople(db: Prisma.TransactionClient, access: CrmReadAccess, query: string, taskId?: string) {
  const terms = query.trim().slice(0, 100).split(/\s+/).filter(Boolean);
  const rows = await db.user.findMany({ where: { isActive: true, role: { in: [...taskRoles] },
    AND: terms.map(term => ({ OR: ['firstName', 'lastName', 'email'].map(field => ({ [field]: { contains: term, mode: 'insensitive' } })) })),
  }, select: { ...taskPerson, department: { select: { name: true } } }, orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }, { id: 'asc' }], take: 40 });
  const available: typeof rows = [];
  for (const user of rows) if (await canJoinTask(db, access, user.id, taskId)) available.push(user);
  return available.slice(0, 20);
}

export async function addTaskParticipants(db: Prisma.TransactionClient, access: CrmReadAccess, taskId: string, actorId: string, userIds: string[], notify = true) {
  const ids = [...new Set(userIds)];
  if (ids.length > 30) throw new BadRequestException('Можно добавить не более 30 участников');
  const before = await db.crmTaskParticipant.findMany({ where: { taskId }, ...taskParticipants });
  const added = ids.filter(id => !before.some(row => row.userId === id));
  if (before.length + added.length > 30) throw new BadRequestException('В задаче может быть не более 30 участников');
  for (const id of ids) {
    if (!await db.user.findFirst({ where: { id, isActive: true, role: { in: [...taskRoles] } }, select: { id: true } }) || !await canJoinTask(db, access, id, taskId)) {
      throw new BadRequestException('Сотрудник недоступен или его права не позволяют участвовать в этой задаче');
    }
  }
  for (const userId of added) {
    await db.crmTaskParticipant.create({ data: { taskId, userId, addedById: actorId } });
    if (notify && userId !== actorId) await db.crmNotificationEvent.create({ data: { sourceKey: `TaskParticipant:${taskId}:${userId}:${randomUUID()}`, kind: 'TASK_PARTICIPANT_ADDED', category: 'TASK', actorId, recipientId: userId, taskId } });
  }
  const after = await db.crmTaskParticipant.findMany({ where: { taskId }, ...taskParticipants });
  if (added.length) await recordCrmChange(db, actorId, 'crm.task', taskId, { participants: before.map(row => taskPersonName(row.user)) }, { participants: after.map(row => taskPersonName(row.user)) }, ['participants'], 'Добавлены участники');
  return after;
}
