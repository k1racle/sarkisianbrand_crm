// Real PostgreSQL policies, notification triggers and transactions. Synthetic records roll back.
const assert = require('node:assert/strict'), { randomUUID } = require('node:crypto');
const { PrismaClient } = require('@prisma/client');
const { CrmReadAccess } = require('../dist/src/crm/read-access');
const { CrmReadService } = require('../dist/src/crm/crm-read.service');
const { CrmTaskWriteService } = require('../dist/src/crm/task-write.service');
const { StaffNotificationsService } = require('../dist/src/staff-notifications/staff-notifications.service');
if (process.env.ALLOW_LOCAL_TASK_SMOKE !== 'true' || !['postgres', 'localhost', '127.0.0.1'].includes(new URL(process.env.DATABASE_URL).hostname)) throw Error('Local task smoke must be explicitly enabled');
const db = new PrismaClient(), rollback = Error('ROLLBACK_COLLABORATION');
(async () => {
  try {
    await db.$transaction(async tx => {
      let serial = 0;
      const bound = new Proxy(tx, { get(target, key) {
        if (key === '$transaction') return async fn => {
          const name = 'collaboration_' + (++serial);
          await tx.$executeRawUnsafe('SAVEPOINT ' + name);
          try { const result = await fn(tx); await tx.$executeRawUnsafe('RELEASE SAVEPOINT ' + name); return result; }
          catch (e) { await tx.$executeRawUnsafe('ROLLBACK TO SAVEPOINT ' + name); await tx.$executeRawUnsafe('RELEASE SAVEPOINT ' + name); throw e; }
        };
        const v = Reflect.get(target, key); return typeof v === 'function' ? v.bind(target) : v;
      } });
      const access = new CrmReadAccess(), writer = new CrmTaskWriteService(bound, access), reader = new CrmReadService(bound, access), notifications = new StaffNotificationsService(bound);
      const department = await tx.crmDepartment.create({ data: { name: 'QA закупки' } });
      const finance = await tx.crmDepartment.create({ data: { name: 'QA бухгалтерия' } });
      const profile = await tx.crmAccessProfile.create({ data: { name: 'QA участие', normalizedName: randomUUID() } });
      const makeUser = async (name, scope = 'PARTICIPATING', role = 'MANAGER_SALES') => {
        const user = await tx.user.create({ data: { email: `qa-${randomUUID()}@example.invalid`, password: 'not-a-login', firstName: name, role, departmentId: name === 'Бухгалтер' ? finance.id : department.id, accessProfileMode: true } });
        await tx.crmAccessAssignment.create({ data: { userId: user.id, profileId: profile.id, profileVersion: 1, snapshot: { name: 'QA', grants: ['crm.read', 'crm.write'].map(permissionKey => ({ permissionKey, scope, departmentIds: [] })) } } });
        return user;
      };
      const author = await makeUser('Заказчик'), leader = await makeUser('Руководитель'), accountant = await makeUser('Бухгалтер'), stranger = await makeUser('Посторонний'), ownOnly = await makeUser('Только свои', 'OWN'), blocked = await makeUser('Заблокирован');
      const crmRead = await tx.permission.findUniqueOrThrow({ where: { key: 'crm.read' } });
      await tx.userPermission.create({ data: { userId: blocked.id, permissionId: crmRead.id, effect: 'DENY' } });
      const task = await writer.create(author.id, { title: 'QA Заказать принтер' });
      await assert.rejects(reader.task(leader.id, task.id), /не найдена/);
      await assert.rejects(writer.addParticipant(stranger.id, task.id, stranger.id), /недоступна/);
      const people = await writer.people(author.id, '', task.id);
      assert(people.some(user => user.id === leader.id)); assert(people.some(user => user.id === accountant.id));
      assert(!people.some(user => user.id === blocked.id || user.id === ownOnly.id));
      const mention = await writer.comment(author.id, task.id, { body: '@Руководитель согласуйте покупку принтера', mentionIds: [leader.id] });
      assert.deepEqual(mention.mentions, [{ id: leader.id, name: 'Руководитель' }]);
      assert((await reader.task(leader.id, task.id)).participants.some(row => row.userId === leader.id));
      let alerts = await notifications.list(leader.id, { category: 'TASK' });
      assert.equal(alerts.items.filter(row => row.kind === 'TASK_MENTION').length, 1);
      assert.equal(alerts.items.length, 1, 'Mention must not duplicate an invitation/comment notification');
      assert(alerts.items[0].url.includes('&tab=comments&notification='));
      await writer.comment(leader.id, task.id, { body: 'Покупку согласовываю' });
      await writer.addParticipant(author.id, task.id, accountant.id);
      await writer.addParticipant(author.id, task.id, accountant.id);
      alerts = await notifications.list(accountant.id, { category: 'TASK' });
      assert.equal(alerts.items.length, 1, 'No old comments or duplicate invitations');
      assert.equal(alerts.items[0].kind, 'TASK_PARTICIPANT_ADDED');
      assert.equal((await reader.tasks(accountant.id)).filter(row => row.id === task.id).length, 1);
      await writer.comment(accountant.id, task.id, { body: 'Счёт оплачен в 1С' });
      assert((await notifications.list(leader.id, { category: 'TASK' })).items.some(row => row.kind === 'TASK_COMMENT'));
      assert.equal((await reader.comments(author.id, task.id)).length, 3);
      const before = await tx.crmTaskParticipant.count({ where: { taskId: task.id } });
      await assert.rejects(writer.comment(author.id, task.id, { body: '@Заблокирован', mentionIds: [blocked.id] }), /недоступен/);
      await assert.rejects(writer.comment(author.id, task.id, { body: 'Без упоминания', mentionIds: [stranger.id] }), /Выберите/);
      await assert.rejects(writer.addParticipant(author.id, task.id, ownOnly.id), /права/);
      assert.equal(await tx.crmTaskParticipant.count({ where: { taskId: task.id } }), before);
      const history = await reader.history(author.id, 'task', task.id);
      assert(history.items.some(row => row.payload.changes.some(change => change.field === 'participants')));
      await writer.removeParticipant(author.id, task.id, accountant.id);
      await assert.rejects(reader.task(accountant.id, task.id), /не найдена/);
      assert.equal((await notifications.list(accountant.id, { category: 'TASK' })).items.length, 0);
      await writer.comment(author.id, task.id, { body: '@Руководитель повторное упоминание', mentionIds: [leader.id, leader.id] });
      assert.equal(await tx.crmTaskParticipant.count({ where: { taskId: task.id, userId: leader.id } }), 1);
      const created = await writer.create(author.id, { title: 'QA Участники при создании', participantIds: [accountant.id] });
      assert.equal(created.participants[0].userId, accountant.id);
      const taskCount = await tx.task.count({ where: { createdById: author.id } });
      await assert.rejects(writer.create(author.id, { title: 'QA Не сохранять', participantIds: [blocked.id] }), /недоступен/);
      assert.equal(await tx.task.count({ where: { createdById: author.id } }), taskCount, 'Failed collaboration rolls back the task too');
      throw rollback;
    }, { timeout: 90000 });
  } catch (e) { if (e !== rollback) throw e; }
  console.log('PASS: printer approval/payment collaboration, cross-department participation, mention alerts without duplicates, history, revoked access, denial and rollback. All records rolled back.');
})().catch(e => { console.error(e); process.exitCode = 1; }).finally(() => db.$disconnect());
