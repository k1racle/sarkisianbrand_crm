import { TaskStatus } from '@prisma/client';
import { overdueTasksWhere, taskStatusWhere, withDeadline } from './task-deadline';

describe('Task deadline read projection', () => {
  const now = new Date('2026-09-23T12:00:00.000Z');
  it.each(['TODO', 'BACKLOG', 'IN_PROGRESS', 'REVIEW'] as TaskStatus[])('projects overdue %s without modifying its workflow state', status => {
    const task = { id: 'task', status, dueDate: new Date(now.getTime() - 1) };
    expect(withDeadline(task, now)).toMatchObject({ workflowStatus: status, status: 'OVERDUE', isOverdue: true });
    expect(task.status).toBe(status);
  });
  it.each(['DONE', 'CANCELLED'] as TaskStatus[])('does not reopen %s because of a past date', status => {
    expect(withDeadline({ status, dueDate: new Date(0) }, now)).toMatchObject({ status, isOverdue: false });
  });
  it.each([null, new Date('2026-09-23T12:00:00Z'), new Date('2027-01-01')])('does not mark a missing or future deadline overdue', dueDate => {
    expect(withDeadline({ status: 'IN_PROGRESS', dueDate }, now)).toMatchObject({ status: 'IN_PROGRESS', isOverdue: false });
  });
  it('keeps explicitly persisted legacy OVERDUE as a workflow state', () => {
    expect(withDeadline({ status: 'OVERDUE', dueDate: null }, now)).toMatchObject({ workflowStatus: 'OVERDUE', status: 'OVERDUE' });
  });
  it('uses the same overdue rule in filters and counters', () => {
    expect(taskStatusWhere('OVERDUE', now)).toEqual(overdueTasksWhere(now));
    expect(taskStatusWhere('TODO', now)).toEqual({ AND: [{ status: 'TODO' }, { OR: [{ dueDate: null }, { dueDate: { gte: now } }] }] });
    expect(taskStatusWhere('DONE', now)).toEqual({ status: 'DONE' });
    expect(taskStatusWhere(undefined, now)).toEqual({ status: { not: 'CANCELLED' } });
  });
});
