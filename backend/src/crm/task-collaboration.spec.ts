import { ValidationPipe } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AddTaskParticipantDto, CreateTaskCommentDto, CreateTaskDto, TaskPeopleQueryDto } from './dto/crm.dto';
import { notificationVisibility, notificationView } from '../staff-notifications/staff-notifications.service';
import { resolveProfileScopes, taskScopeWhere } from '../auth/access-scope-policy';

describe('Task participants and mention contracts', () => {
  const pipe = new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true });
  const validate = (value: any, metatype: any) => pipe.transform(value, { type: 'body', metatype });
  it('accepts explicit participants and mention IDs, not caller-supplied mention names', async () => {
    const id = randomUUID();
    expect(await validate({ title: 'Принтер', participantIds: [id] }, CreateTaskDto)).toMatchObject({ participantIds: [id] });
    expect(await validate({ body: '@Руководитель согласуйте', mentionIds: [id] }, CreateTaskCommentDto)).toMatchObject({ mentionIds: [id] });
    await expect(validate({ body: 'x', mentions: [{ id, name: 'Подмена' }] }, CreateTaskCommentDto)).rejects.toMatchObject({ status: 400 });
  });
  it('rejects malformed, duplicate and excessive recipients', async () => {
    const id = randomUUID();
    for (const mentionIds of ['all', ['bad'], [id, id], Array.from({ length: 21 }, () => randomUUID())]) await expect(validate({ body: 'x', mentionIds }, CreateTaskCommentDto)).rejects.toMatchObject({ status: 400 });
    await expect(validate({ title: 'x', participantIds: Array.from({ length: 31 }, () => randomUUID()) }, CreateTaskDto)).rejects.toMatchObject({ status: 400 });
    await expect(validate({ userId: id, actorId: id }, AddTaskParticipantDto)).rejects.toMatchObject({ status: 400 });
    await expect(validate({ q: ['all'], scope: 'COMPANY' }, TaskPeopleQueryDto)).rejects.toMatchObject({ status: 400 });
  });
  it('participation is explicit and does not broaden OWN or denied permissions', () => {
    const actor = { id: 'me', role: 'MANAGER_SALES', isActive: true, departmentId: null };
    const policy = (scope: string, denied: string[] = []) => resolveProfileScopes(actor, [{ profileId: 'p', profileName: 'p', scope, permissionKey: 'crm.read', departmentIds: [] }], [], denied);
    expect(JSON.stringify(taskScopeWhere(policy('PARTICIPATING'), 'crm.read'))).toContain('participants');
    expect(JSON.stringify(taskScopeWhere(policy('OWN'), 'crm.read'))).not.toContain('participants');
    expect(taskScopeWhere(policy('PARTICIPATING', ['crm.read']), 'crm.read')).toEqual({ id: { in: [] } });
    expect(JSON.stringify(notificationVisibility(actor, policy('PARTICIPATING'), []))).toContain('TASK_MENTION');
  });
  it('mention alerts open the task discussion and contain no mention recipient list', () => {
    const view = notificationView({ id: 'event', kind: 'TASK_MENTION', category: 'TASK', occurredAt: new Date(), task: { id: 'task', title: 'Принтер' }, reads: [], recipientId: 'secret' });
    expect(view).toMatchObject({ title: 'Вас упомянули в задаче', body: 'Принтер', url: '/crm/tasks?task=task&tab=comments&notification=event' });
    expect(JSON.stringify(view)).not.toContain('secret');
  });
});
