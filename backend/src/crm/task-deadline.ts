import { Prisma, TaskStatus } from '@prisma/client';

export const activeTaskStatuses: TaskStatus[] = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'REVIEW', 'OVERDUE'];
export function overdueTasksWhere(now: Date): Prisma.TaskWhereInput {
  return { OR: [{ status: 'OVERDUE' }, { status: { in: activeTaskStatuses }, dueDate: { lt: now } }] };
}
export function taskStatusWhere(status: TaskStatus | undefined, now: Date): Prisma.TaskWhereInput {
  if (!status) return { status: { not: 'CANCELLED' } };
  if (status === 'OVERDUE') return overdueTasksWhere(now);
  if (!activeTaskStatuses.includes(status)) return { status };
  return { AND: [{ status }, { OR: [{ dueDate: null }, { dueDate: { gte: now } }] }] };
}
/** OVERDUE is a response projection. Merely opening a screen must not modify workflow or audit. */
export function withDeadline<T extends { status: TaskStatus; dueDate: Date | null }>(task: T, now: Date) {
  const isOverdue = task.status === 'OVERDUE' || (activeTaskStatuses.includes(task.status) && !!task.dueDate && task.dueDate < now);
  return { ...task, workflowStatus: task.status, status: isOverdue ? TaskStatus.OVERDUE : task.status, isOverdue };
}
