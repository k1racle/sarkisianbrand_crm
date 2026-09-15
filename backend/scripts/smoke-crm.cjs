require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const { randomUUID } = require('crypto');
const { unlink } = require('fs/promises');
const { join } = require('path');

const prisma = new PrismaClient();
const baseUrl = 'http://127.0.0.1:3000/api/v1';
const created = {
  leadId: null,
  customerId: null,
  taskId: null,
  templateId: null,
  templateTaskId: null,
  pipelineId: null,
  messageIds: [],
};

async function request(path, token, options = {}, expectedStatus = 200) {
  const contentHeaders = options.body instanceof FormData ? {} : { 'content-type': 'application/json' };
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { authorization: `Bearer ${token}`, ...contentHeaders, ...(options.headers || {}) },
  });
  const body = await response.json().catch(() => null);
  if (response.status !== expectedStatus) {
    throw new Error(`${path}: ожидался HTTP ${expectedStatus}, получен ${response.status} ${JSON.stringify(body)}`);
  }
  return body;
}

async function main() {
  try {
    const admin = await prisma.user.findFirstOrThrow({ where: { role: 'ADMIN', isActive: true } });
    const token = jwt.sign({ sub: admin.id, role: admin.role }, process.env.JWT_SECRET, { expiresIn: '10m' });

    const parallelBootstrap = await Promise.all([
      request('/crm/pipeline', token),
      request('/crm/pipeline', token),
      request('/crm/dashboard', token),
      request('/crm/leads', token),
    ]);
    const pipeline = parallelBootstrap[0];
    if (pipeline.stages.length < 6) throw new Error('Основная воронка создана не полностью');
    const team = await request('/crm/team', token);
    if (!team.some(member => member.id === admin.id)) throw new Error('Администратор отсутствует в CRM-команде');

    const customPipeline = await request('/crm/pipelines', token, {
      method: 'POST',
      body: JSON.stringify({
        name: `Тестовая воронка ${randomUUID()}`,
        requiredFields: ['contactName', 'contactEmail'],
        lostReasons: ['Нет бюджета', 'Выбран конкурент'],
      }),
    }, 201);
    created.pipelineId = customPipeline.id;
    if (customPipeline.requiredFields.length !== 2 || customPipeline.lostReasons.length !== 2) {
      throw new Error('Настройки обязательных полей или причин отказа не сохранились');
    }
    const extraStage = await request(`/crm/pipelines/${customPipeline.id}/stages`, token, {
      method: 'POST',
      body: JSON.stringify({ name: 'Проверка качества', color: '#4f7dcf', probability: 80 }),
    }, 201);
    const updatedStage = await request(`/crm/pipeline-stages/${extraStage.id}`, token, {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Контроль качества', probability: 85 }),
    });
    if (updatedStage.name !== 'Контроль качества' || updatedStage.probability !== 85) {
      throw new Error('Редактирование этапа воронки не работает');
    }
    const stageIds = [...customPipeline.stages.map(stage => stage.id), extraStage.id].reverse();
    const reordered = await request(`/crm/pipelines/${customPipeline.id}/stages/reorder`, token, {
      method: 'POST',
      body: JSON.stringify({ stageIds }),
    }, 201);
    if (reordered.stages[0].id !== extraStage.id) throw new Error('Порядок этапов воронки не сохранился');
    await request(`/crm/pipeline-stages/${extraStage.id}`, token, { method: 'DELETE' });

    await request('/crm/leads', token, {
      method: 'POST',
      body: JSON.stringify({
        source: 'АВТОТЕСТ',
        contactName: 'Клиент без email',
        stageId: customPipeline.stages[0].id,
      }),
    }, 400);

    const template = await request('/crm/task-templates', token, {
      method: 'POST',
      body: JSON.stringify({
        name: `Шаблон автотеста ${randomUUID()}`,
        title: 'Связаться с новым клиентом',
        description: 'Задача создана из настраиваемого шаблона',
        priority: 'HIGH',
        labels: ['автотест', 'шаблон'],
        estimateMinutes: 30,
        dueInHours: 1,
        reminderBeforeMin: 120,
        defaultAssigneeId: admin.id,
      }),
    }, 201);
    created.templateId = template.id;
    const templateTask = await request(`/crm/task-templates/${template.id}/create-task`, token, {
      method: 'POST',
      body: JSON.stringify({ assignedToId: admin.id }),
    }, 201);
    created.templateTaskId = templateTask.id;
    if (templateTask.templateId !== template.id || templateTask.reminders.length !== 1) {
      throw new Error('Шаблон не создал задачу с автоматическим напоминанием');
    }
    const reminders = await request('/crm/reminders', token);
    const reminder = reminders.find(item => item.taskId === templateTask.id);
    if (!reminder) throw new Error('Автоматическое напоминание не появилось в центре уведомлений');
    await request(`/crm/reminders/${reminder.id}/dismiss`, token, { method: 'POST' }, 201);

    const email = `crm-smoke-${randomUUID()}@example.test`;
    const lead = await request('/crm/leads', token, {
      method: 'POST',
      body: JSON.stringify({
        source: 'АВТОТЕСТ',
        contactName: 'Проверочный клиент',
        contactPhone: '+79990001122',
        contactEmail: email,
        title: 'Проверка полного цикла CRM',
        amount: 125000,
        probability: 35,
        stageId: pipeline.stages[0].id,
        managerId: admin.id,
        tags: ['автотест', 'B2B'],
        expectedCloseAt: new Date(Date.now() + 14 * 864e5).toISOString(),
      }),
    }, 201);
    created.leadId = lead.id;
    created.customerId = lead.customerId;

    const qualification = pipeline.stages.find(stage => stage.code === 'QUALIFIED');
    const moved = await request(`/crm/leads/${lead.id}`, token, {
      method: 'PATCH',
      body: JSON.stringify({ stageId: qualification.id, probability: 55 }),
    });
    if (moved.status !== 'QUALIFIED' || moved.probability !== 55) throw new Error('Сделка не переместилась по воронке');

    const interaction = await request(`/crm/leads/${lead.id}/interactions`, token, {
      method: 'POST',
      body: JSON.stringify({ type: 'CALL', content: 'Проведён тестовый квалификационный звонок' }),
    }, 201);
    if (interaction.leadId !== lead.id) throw new Error('Взаимодействие не связано со сделкой');

    const startDate = new Date(Date.now() + 3600e3);
    const dueDate = new Date(Date.now() + 2 * 864e5);
    const task = await request('/crm/tasks', token, {
      method: 'POST',
      body: JSON.stringify({
        title: 'Подготовить предложение для проверочной сделки',
        description: 'Приёмочный сценарий CRM',
        assignedToId: admin.id,
        leadId: lead.id,
        status: 'TODO',
        priority: 'HIGH',
        progress: 10,
        startDate: startDate.toISOString(),
        dueDate: dueDate.toISOString(),
        estimateMinutes: 90,
        labels: ['автотест', 'предложение'],
      }),
    }, 201);
    created.taskId = task.id;
    await request(`/crm/tasks/${task.id}`, token, { method: 'PATCH', body: JSON.stringify({ status: 'IN_PROGRESS', progress: 45 }) });
    const reviewed = await request(`/crm/tasks/${task.id}`, token, { method: 'PATCH', body: JSON.stringify({ status: 'REVIEW', progress: 90 }) });
    if (reviewed.status !== 'REVIEW' || reviewed.progress !== 90) throw new Error('Задача не прошла канбан-статусы');
    await request(`/crm/tasks/${task.id}/comments`, token, {
      method: 'POST',
      body: JSON.stringify({ body: 'Предложение проверено руководителем' }),
    }, 201);

    const channelSets = await Promise.all([
      request('/platform-chat/channels', token),
      request('/platform-chat/channels', token),
      request('/platform-chat/channels', token),
    ]);
    const general = channelSets[0].find(channel => channel.name === 'Общий');
    if (!general) throw new Error('Общий канал платформы не создан');
    const message = await request(`/platform-chat/channels/${general.id}/messages`, token, {
      method: 'POST',
      body: JSON.stringify({ body: 'Проверка общего чата платформы 😀', entities: [{ type: 'TASK', id: task.id }] }),
    }, 201);
    created.messageIds.push(message.id);
    if (!message.attachments.some(item => item.kind === 'ENTITY' && item.entityId === task.id)) throw new Error('Карточка задачи не прикрепилась к сообщению');

    const upload = new FormData();
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
    upload.append('body', 'Изображение и документ для проверки предпросмотра');
    upload.append('files', new Blob([png], { type: 'image/png' }), 'preview.png');
    upload.append('files', new Blob(['Проверочный документ платформы'], { type: 'text/plain' }), 'document.txt');
    upload.append('files', new Blob([Buffer.from('platform-chat-voice-smoke')], { type: 'audio/webm' }), 'voice.webm');
    const uploaded = await request(`/platform-chat/channels/${general.id}/messages/upload`, token, { method: 'POST', body: upload }, 201);
    created.messageIds.push(uploaded.id);
    const image = uploaded.attachments.find(item => item.kind === 'IMAGE');
    const document = uploaded.attachments.find(item => item.kind === 'FILE');
    const audio = uploaded.attachments.find(item => item.kind === 'AUDIO');
    if (!image || !document || !audio) throw new Error('Файловые и голосовые вложения классифицированы неверно');
    const download = await fetch(`${baseUrl}/platform-chat/attachments/${image.id}`, { headers: { authorization: `Bearer ${token}` } });
    if (!download.ok || (await download.arrayBuffer()).byteLength !== png.length) throw new Error('Защищённая загрузка изображения не работает');

    const messages = await request(`/platform-chat/channels/${general.id}/messages`, token);
    if (!messages.some(item => item.id === message.id)) throw new Error('Сообщение не появилось в канале');
    const unread = await request('/platform-chat/unread', token);
    if (typeof unread.total !== 'number') throw new Error('Счётчик непрочитанных не отвечает');

    const dashboard = await request('/crm/dashboard', token);
    if (!Array.isArray(dashboard.funnel) || typeof dashboard.forecast !== 'number') throw new Error('CRM-аналитика вернула неполные данные');
    if (!dashboard.recentInteractions.some(item => item.id === interaction.id)) throw new Error('Контакт не появился в ленте CRM');

    const completed = await request(`/crm/tasks/${task.id}`, token, { method: 'PATCH', body: JSON.stringify({ status: 'DONE', progress: 100 }) });
    if (completed.status !== 'DONE' || !completed.completedAt) throw new Error('Завершение задачи не зафиксировано');

    console.log(JSON.stringify({
      success: true,
      pipeline: pipeline.stages.map(stage => stage.name),
      deal: 'создание → квалификация → взаимодействие',
      tasks: 'канбан → проверка → комментарий → выполнение',
      platformChat: { channel: general.name, messageDelivered: true, entityCard: true, imagePreview: true, document: true, voiceMessage: true, unreadCounter: true },
      automation: { configurablePipeline: true, requiredFields: true, taskTemplate: true, automaticReminder: true },
      analytics: { forecast: dashboard.forecast, stages: dashboard.funnel.length },
      parallelBootstrap: true,
    }, null, 2));
  } finally {
    if (created.messageIds.length) {
      const attachments = await prisma.platformChatAttachment.findMany({ where: { messageId: { in: created.messageIds } }, select: { storageKey: true } });
      await prisma.crmChatMessage.deleteMany({ where: { id: { in: created.messageIds } } });
      await Promise.all(attachments.filter(item => item.storageKey).map(item => unlink(join(process.cwd(), 'uploads', 'platform-chat', item.storageKey)).catch(() => undefined)));
    }
    if (created.templateTaskId) await prisma.task.deleteMany({ where: { id: created.templateTaskId } });
    if (created.taskId) await prisma.task.deleteMany({ where: { id: created.taskId } });
    if (created.templateId) await prisma.crmTaskTemplate.deleteMany({ where: { id: created.templateId } });
    if (created.pipelineId) await prisma.crmPipeline.deleteMany({ where: { id: created.pipelineId } });
    if (created.leadId) {
      await prisma.interaction.deleteMany({ where: { leadId: created.leadId } });
      await prisma.lead.deleteMany({ where: { id: created.leadId } });
    }
    if (created.customerId) await prisma.customer.deleteMany({ where: { id: created.customerId } });
    await prisma.$disconnect();
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
