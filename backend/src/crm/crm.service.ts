import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { LeadStatus, Prisma, TaskStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInteractionDto, CreateLeadDto, CreatePipelineDto, CreatePipelineStageDto, CreateTaskCommentDto, CreateTaskDto, CreateTaskFromTemplateDto, CreateTaskTemplateDto, ReorderPipelineStagesDto, UpdateLeadDto, UpdatePipelineDto, UpdatePipelineStageDto, UpdateTaskDto, UpdateTaskTemplateDto } from './dto/crm.dto';

const crmRoles: UserRole[] = [UserRole.ADMIN, UserRole.MANAGER_B2B, UserRole.MANAGER_SALES, UserRole.SUPERVISOR];
const activeTaskStatuses: TaskStatus[] = [TaskStatus.BACKLOG, TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.REVIEW, TaskStatus.OVERDUE];
const stages = [
  { name: 'Новые', code: 'NEW', color: '#8b8f98', sortOrder: 10, probability: 10 },
  { name: 'Первичный контакт', code: 'CONTACTED', color: '#4f7dcf', sortOrder: 20, probability: 25 },
  { name: 'Квалификация', code: 'QUALIFIED', color: '#7f65c7', sortOrder: 30, probability: 45 },
  { name: 'Предложение и переговоры', code: 'NEGOTIATION', color: '#d58a35', sortOrder: 40, probability: 70 },
  { name: 'Успешно реализовано', code: 'WON', color: '#2d9568', sortOrder: 50, probability: 100, isWon: true },
  { name: 'Закрыто без продажи', code: 'LOST', color: '#bb5145', sortOrder: 60, probability: 0, isLost: true },
];

@Injectable()
export class CrmService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard() {
    const pipeline = await this.ensurePipeline();
    await this.refreshOverdueTasks();
    const now = new Date();
    const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const [customers, openLeads, activeTasks, overdueTasks, dueToday, wonMonth, forecast, recentInteractions] = await this.prisma.$transaction([
      this.prisma.customer.count(),
      this.prisma.lead.count({ where: { status: { notIn: [LeadStatus.WON, LeadStatus.LOST] } } }),
      this.prisma.task.count({ where: { status: { in: activeTaskStatuses } } }),
      this.prisma.task.count({ where: { status: TaskStatus.OVERDUE } }),
      this.prisma.task.count({ where: { status: { in: activeTaskStatuses }, dueDate: { gte: now, lte: todayEnd } } }),
      this.prisma.lead.aggregate({ where: { status: LeadStatus.WON, closedAt: { gte: monthStart } }, _count: { _all: true }, _sum: { amount: true } }),
      this.prisma.lead.findMany({ where: { status: { notIn: [LeadStatus.WON, LeadStatus.LOST] } }, select: { amount: true, probability: true } }),
      this.prisma.interaction.findMany({ include: { user: { select: { firstName: true, lastName: true, email: true } }, lead: { select: { id: true, title: true, contactName: true } } }, orderBy: { createdAt: 'desc' }, take: 8 }),
    ]);
    const stageRows = await this.prisma.lead.groupBy({ by: ['stageId'], _count: { _all: true }, _sum: { amount: true } });
    const stageMap = new Map(stageRows.map(row => [row.stageId, row]));
    return {
      customers, openLeads, activeTasks, overdueTasks, dueToday,
      wonMonth: { count: wonMonth._count._all, amount: Number(wonMonth._sum.amount || 0) },
      forecast: forecast.reduce((sum, item) => sum + Number(item.amount) * item.probability / 100, 0),
      funnel: pipeline.stages.map(stage => ({ id: stage.id, name: stage.name, color: stage.color, count: stageMap.get(stage.id)?._count._all || 0, amount: Number(stageMap.get(stage.id)?._sum.amount || 0) })),
      recentInteractions,
    };
  }

  team() {
    return this.prisma.user.findMany({ where: { role: { in: crmRoles }, isActive: true }, select: { id: true, firstName: true, lastName: true, email: true, role: true }, orderBy: [{ firstName: 'asc' }, { email: 'asc' }] });
  }

  async customers() {
    const customers = await this.prisma.customer.findMany({ include: { user: { select: { role: true } }, organizationMemberships: { where: { isActive: true }, include: { organization: true } }, _count: { select: { orders: true, interactions: true, tasks: true } } }, orderBy: { createdAt: 'desc' } });
    return customers.map(({ user, organizationMemberships, ...customer }) => ({ ...customer, role: user?.role || 'CUSTOMER_B2C', b2bProfile: organizationMemberships[0]?.organization || null }));
  }

  async pipeline(pipelineId?: string) {
    const pipeline = pipelineId
      ? await this.prisma.crmPipeline.findFirst({ where: { id: pipelineId, isActive: true }, include: { stages: { orderBy: { sortOrder: 'asc' } } } })
      : await this.ensurePipeline();
    if (!pipeline) throw new NotFoundException('Воронка не найдена');
    const leads = await this.leads();
    return { ...pipeline, stages: pipeline.stages.map(stage => ({ ...stage, leads: leads.filter(lead => lead.stageId === stage.id) })) };
  }

  async pipelines() {
    await this.ensurePipeline();
    return this.prisma.crmPipeline.findMany({ where: { isActive: true }, include: { stages: { orderBy: { sortOrder: 'asc' } }, _count: { select: { stages: true } } }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }] });
  }

  async createPipeline(dto: CreatePipelineDto) {
    const requiredFields = this.pipelineFields(dto.requiredFields || []);
    const created = await this.prisma.$transaction(async tx => {
      if (dto.isDefault) await tx.crmPipeline.updateMany({ data: { isDefault: false } });
      const pipeline = await tx.crmPipeline.create({ data: { name: dto.name.trim(), isDefault: Boolean(dto.isDefault), requiredFields, lostReasons: this.cleanList(dto.lostReasons) } });
      await tx.crmPipelineStage.createMany({ data: stages.map(stage => ({ ...stage, isWon: stage.isWon || false, isLost: stage.isLost || false, pipelineId: pipeline.id })) });
      return pipeline;
    });
    return this.pipeline(created.id);
  }

  async updatePipeline(id: string, dto: UpdatePipelineDto) {
    await this.pipelineRecord(id);
    if (dto.isDefault) await this.prisma.crmPipeline.updateMany({ where: { id: { not: id } }, data: { isDefault: false } });
    await this.prisma.crmPipeline.update({ where: { id }, data: { name: dto.name?.trim(), isDefault: dto.isDefault, isActive: dto.isActive, requiredFields: dto.requiredFields ? this.pipelineFields(dto.requiredFields) : undefined, lostReasons: dto.lostReasons ? this.cleanList(dto.lostReasons) : undefined } });
    return this.pipeline(id);
  }

  async archivePipeline(id: string) {
    const pipeline = await this.pipelineRecord(id);
    if (pipeline.isDefault) throw new BadRequestException('Основную воронку нельзя архивировать');
    await this.prisma.crmPipeline.update({ where: { id }, data: { isActive: false } });
    return { success: true };
  }

  async createPipelineStage(pipelineId: string, dto: CreatePipelineStageDto) {
    await this.pipelineRecord(pipelineId);
    const maximum = await this.prisma.crmPipelineStage.aggregate({ where: { pipelineId }, _max: { sortOrder: true } });
    const codeSource = (dto.code || dto.name).trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '') || `STAGE_${Date.now()}`;
    return this.prisma.crmPipelineStage.create({ data: { pipelineId, name: dto.name.trim(), code: codeSource, color: dto.color || '#f8604a', sortOrder: (maximum._max.sortOrder || 0) + 10, probability: dto.probability || 0, isWon: Boolean(dto.isWon), isLost: Boolean(dto.isLost) } });
  }

  async updatePipelineStage(id: string, dto: UpdatePipelineStageDto) {
    const stage = await this.prisma.crmPipelineStage.findUnique({ where: { id } });
    if (!stage) throw new NotFoundException('Этап воронки не найден');
    if (dto.isWon && dto.isLost) throw new BadRequestException('Этап не может одновременно означать успех и проигрыш');
    return this.prisma.crmPipelineStage.update({ where: { id }, data: { name: dto.name?.trim(), code: dto.code?.trim().toUpperCase(), color: dto.color, sortOrder: dto.sortOrder, probability: dto.probability, isWon: dto.isWon, isLost: dto.isLost } });
  }

  async deletePipelineStage(id: string) {
    const stage = await this.prisma.crmPipelineStage.findUnique({ where: { id }, include: { _count: { select: { leads: true } }, pipeline: { include: { _count: { select: { stages: true } } } } } });
    if (!stage) throw new NotFoundException('Этап воронки не найден');
    if (stage._count.leads) throw new BadRequestException('Сначала перенесите сделки с удаляемого этапа');
    if (stage.pipeline._count.stages <= 1) throw new BadRequestException('В воронке должен остаться хотя бы один этап');
    await this.prisma.crmPipelineStage.delete({ where: { id } });
    return { success: true };
  }

  async reorderPipelineStages(pipelineId: string, dto: ReorderPipelineStagesDto) {
    const pipeline = await this.pipelineRecord(pipelineId);
    const actual = new Set(pipeline.stages.map(stage => stage.id));
    if (dto.stageIds.length !== actual.size || dto.stageIds.some(id => !actual.has(id))) throw new BadRequestException('Передайте все этапы воронки в нужном порядке');
    await this.prisma.$transaction(dto.stageIds.map((id, index) => this.prisma.crmPipelineStage.update({ where: { id }, data: { sortOrder: (index + 1) * 10 } })));
    return this.pipeline(pipelineId);
  }

  async leads() {
    await this.ensurePipeline();
    return this.prisma.lead.findMany({ include: this.leadInclude(), orderBy: [{ expectedCloseAt: 'asc' }, { updatedAt: 'desc' }] });
  }

  async lead(id: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id }, include: this.leadInclude(true) });
    if (!lead) throw new NotFoundException('Сделка не найдена');
    return lead;
  }

  async createLead(dto: CreateLeadDto, actorId: string) {
    const pipeline = await this.ensurePipeline();
    let stage = pipeline.stages.find(item => item.code === (dto.status || LeadStatus.NEW)) || pipeline.stages[0];
    let requiredFields = pipeline.requiredFields;
    if (dto.stageId) {
      const selectedStage = await this.prisma.crmPipelineStage.findUnique({ where: { id: dto.stageId }, include: { pipeline: true } });
      if (!selectedStage?.pipeline.isActive) throw new BadRequestException('Этап воронки не найден');
      stage = selectedStage;
      requiredFields = selectedStage.pipeline.requiredFields;
    }
    if (!stage) throw new BadRequestException('Этап воронки не найден');
    this.assertRequiredLeadFields(requiredFields, dto);
    const normalizedEmail = dto.contactEmail?.trim().toLowerCase() || null;
    const normalizedPhone = dto.contactPhone?.replace(/\D/g, '') || null;
    const lead = await this.prisma.$transaction(async tx => {
      let customer = dto.customerId ? await tx.customer.findUnique({ where: { id: dto.customerId } }) : null;
      if (!customer && (normalizedEmail || normalizedPhone)) customer = await tx.customer.findFirst({ where: { OR: [normalizedEmail ? { normalizedEmail } : {}, normalizedPhone ? { normalizedPhone } : {}].filter(item => Object.keys(item).length) } });
      if (!customer) {
        const names = dto.contactName.trim().split(/\s+/);
        customer = await tx.customer.create({ data: { firstName: names.shift() || dto.contactName, lastName: names.join(' ') || null, email: dto.contactEmail, phone: dto.contactPhone, normalizedEmail, normalizedPhone, segment: 'Лид', source: dto.source } });
      }
      const created = await tx.lead.create({ data: {
        source: dto.source, title: dto.title || `Сделка с ${dto.contactName}`, contactName: dto.contactName, contactPhone: dto.contactPhone || '', contactEmail: dto.contactEmail,
        message: dto.message, status: this.statusForStage(stage), stageId: stage.id, managerId: dto.managerId || actorId, createdById: actorId,
        customerId: customer.id, organizationId: dto.organizationId, amount: dto.amount || 0, probability: dto.probability ?? stage.probability,
        expectedCloseAt: dto.expectedCloseAt ? new Date(dto.expectedCloseAt) : undefined, nextContactAt: dto.nextContactAt ? new Date(dto.nextContactAt) : undefined, tags: dto.tags || [],
      } });
      await tx.interaction.create({ data: { leadId: created.id, customerId: customer.id, userId: actorId, type: 'CREATED', content: `Сделка создана на этапе «${stage.name}»` } });
      return created;
    });
    return this.lead(lead.id);
  }

  async updateLead(id: string, dto: UpdateLeadDto, actorId: string) {
    const current = await this.prisma.lead.findUnique({ where: { id }, include: { stage: true } });
    if (!current) throw new NotFoundException('Сделка не найдена');
    const stage = dto.stageId ? await this.prisma.crmPipelineStage.findUnique({ where: { id: dto.stageId }, include: { pipeline: true } }) : null;
    if (dto.stageId && !stage) throw new BadRequestException('Этап воронки не найден');
    if (stage) {
      this.assertRequiredLeadFields(stage.pipeline.requiredFields, { ...current, ...dto });
      if (stage.isLost && stage.pipeline.lostReasons.length && !dto.lostReason && !current.lostReason) throw new BadRequestException('Укажите причину проигрыша сделки');
      if (dto.lostReason && stage.pipeline.lostReasons.length && !stage.pipeline.lostReasons.includes(dto.lostReason)) throw new BadRequestException('Выберите причину проигрыша из настроек воронки');
    }
    const nextStatus = stage ? this.statusForStage(stage) : dto.status;
    await this.prisma.$transaction(async tx => {
      await tx.lead.update({ where: { id }, data: {
        source: dto.source, title: dto.title, contactName: dto.contactName, contactPhone: dto.contactPhone, contactEmail: dto.contactEmail, message: dto.message,
        status: nextStatus, stageId: dto.stageId, managerId: dto.managerId, customerId: dto.customerId, organizationId: dto.organizationId,
        amount: dto.amount, probability: dto.probability ?? stage?.probability, expectedCloseAt: dto.expectedCloseAt ? new Date(dto.expectedCloseAt) : undefined,
        nextContactAt: dto.nextContactAt ? new Date(dto.nextContactAt) : undefined, lostReason: dto.lostReason, tags: dto.tags,
        closedAt: nextStatus && ([LeadStatus.WON, LeadStatus.LOST] as LeadStatus[]).includes(nextStatus) ? new Date() : nextStatus ? null : undefined,
      } });
      if (stage && stage.id !== current.stageId) await tx.interaction.create({ data: { leadId: id, customerId: current.customerId, userId: actorId, type: 'STAGE_CHANGED', content: `Этап изменён: «${current.stage?.name || current.status}» → «${stage.name}»` } });
    });
    return this.lead(id);
  }

  async addInteraction(id: string, dto: CreateInteractionDto, actorId: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new NotFoundException('Сделка не найдена');
    return this.prisma.interaction.create({ data: { leadId: id, customerId: dto.customerId || lead.customerId, userId: actorId, type: dto.type, content: dto.content }, include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } } });
  }

  async tasks(status?: TaskStatus, assignedToId?: string) {
    await this.refreshOverdueTasks();
    return this.prisma.task.findMany({ where: { ...(status ? { status } : { status: { not: TaskStatus.CANCELLED } }), ...(assignedToId ? { assignedToId } : {}) }, include: this.taskInclude(), orderBy: [{ position: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }], take: 500 });
  }

  async createTask(dto: CreateTaskDto, actorId: string) {
    const assignedToId = dto.assignedToId || actorId;
    await this.assertTeamMember(assignedToId);
    this.assertDates(dto.startDate, dto.dueDate);
    const task = await this.prisma.task.create({ data: {
      title: dto.title, description: dto.description, assignedToId, createdById: actorId, leadId: dto.leadId, customerId: dto.customerId, organizationId: dto.organizationId,
      orderId: dto.orderId, parentId: dto.parentId, status: dto.status || TaskStatus.TODO, priority: dto.priority || 'MEDIUM', progress: dto.progress || 0,
      position: dto.position || 0, startDate: dto.startDate ? new Date(dto.startDate) : undefined, dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      estimateMinutes: dto.estimateMinutes, labels: dto.labels || [], templateId: dto.templateId, completedAt: dto.status === TaskStatus.DONE ? new Date() : undefined,
    } });
    await this.syncTaskReminder(task.id, assignedToId, task.dueDate, dto.reminderBeforeMinutes ?? 60);
    return this.prisma.task.findUniqueOrThrow({ where: { id: task.id }, include: this.taskInclude() });
  }

  async updateTask(id: string, dto: UpdateTaskDto) {
    const current = await this.prisma.task.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Задача не найдена');
    if (dto.assignedToId) await this.assertTeamMember(dto.assignedToId);
    this.assertDates(dto.startDate || current.startDate?.toISOString(), dto.dueDate || current.dueDate?.toISOString());
    const status = dto.status;
    const task = await this.prisma.task.update({ where: { id }, data: {
      title: dto.title, description: dto.description, assignedToId: dto.assignedToId, leadId: dto.leadId, customerId: dto.customerId, organizationId: dto.organizationId,
      orderId: dto.orderId, parentId: dto.parentId, status, priority: dto.priority, progress: status === TaskStatus.DONE ? 100 : dto.progress,
      position: dto.position, startDate: dto.startDate ? new Date(dto.startDate) : undefined, dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      estimateMinutes: dto.estimateMinutes, labels: dto.labels, completedAt: status === TaskStatus.DONE ? new Date() : status ? null : undefined,
    } });
    if (dto.dueDate !== undefined || dto.assignedToId !== undefined || dto.reminderBeforeMinutes !== undefined) await this.syncTaskReminder(task.id, task.assignedToId, task.dueDate, dto.reminderBeforeMinutes ?? 60);
    return this.prisma.task.findUniqueOrThrow({ where: { id }, include: this.taskInclude() });
  }

  async archiveTask(id: string) {
    if (!await this.prisma.task.findUnique({ where: { id }, select: { id: true } })) throw new NotFoundException('Задача не найдена');
    return this.prisma.task.update({ where: { id }, data: { status: TaskStatus.CANCELLED, completedAt: null } });
  }

  async addTaskComment(id: string, dto: CreateTaskCommentDto, actorId: string) {
    if (!await this.prisma.task.findUnique({ where: { id }, select: { id: true } })) throw new NotFoundException('Задача не найдена');
    return this.prisma.crmTaskComment.create({ data: { taskId: id, authorId: actorId, body: dto.body }, include: { author: { select: { id: true, firstName: true, lastName: true, email: true } } } });
  }

  taskTemplates() {
    return this.prisma.crmTaskTemplate.findMany({ where: { isActive: true }, include: { defaultAssignee: { select: { id: true, firstName: true, lastName: true, email: true } }, _count: { select: { tasks: true } } }, orderBy: { name: 'asc' } });
  }

  async createTaskTemplate(dto: CreateTaskTemplateDto, actorId: string) {
    if (dto.defaultAssigneeId) await this.assertTeamMember(dto.defaultAssigneeId);
    return this.prisma.crmTaskTemplate.create({ data: { name: dto.name.trim(), title: dto.title.trim(), description: dto.description, priority: dto.priority || 'MEDIUM', labels: this.cleanList(dto.labels), estimateMinutes: dto.estimateMinutes, dueInHours: dto.dueInHours, reminderBeforeMin: dto.reminderBeforeMin ?? 60, defaultAssigneeId: dto.defaultAssigneeId, createdById: actorId }, include: { defaultAssignee: { select: { id: true, firstName: true, lastName: true, email: true } } } });
  }

  async updateTaskTemplate(id: string, dto: UpdateTaskTemplateDto) {
    if (!await this.prisma.crmTaskTemplate.findUnique({ where: { id }, select: { id: true } })) throw new NotFoundException('Шаблон задачи не найден');
    if (dto.defaultAssigneeId) await this.assertTeamMember(dto.defaultAssigneeId);
    return this.prisma.crmTaskTemplate.update({ where: { id }, data: { name: dto.name?.trim(), title: dto.title?.trim(), description: dto.description, priority: dto.priority, labels: dto.labels ? this.cleanList(dto.labels) : undefined, estimateMinutes: dto.estimateMinutes, dueInHours: dto.dueInHours, reminderBeforeMin: dto.reminderBeforeMin, defaultAssigneeId: dto.defaultAssigneeId, isActive: dto.isActive }, include: { defaultAssignee: { select: { id: true, firstName: true, lastName: true, email: true } } } });
  }

  async archiveTaskTemplate(id: string) {
    if (!await this.prisma.crmTaskTemplate.findUnique({ where: { id }, select: { id: true } })) throw new NotFoundException('Шаблон задачи не найден');
    await this.prisma.crmTaskTemplate.update({ where: { id }, data: { isActive: false } });
    return { success: true };
  }

  async createTaskFromTemplate(id: string, dto: CreateTaskFromTemplateDto, actorId: string) {
    const template = await this.prisma.crmTaskTemplate.findFirst({ where: { id, isActive: true } });
    if (!template) throw new NotFoundException('Шаблон задачи не найден');
    const dueDate = template.dueInHours ? new Date(Date.now() + template.dueInHours * 3600000).toISOString() : undefined;
    return this.createTask({ title: template.title, description: template.description || undefined, assignedToId: dto.assignedToId || template.defaultAssigneeId || actorId, leadId: dto.leadId, customerId: dto.customerId, organizationId: dto.organizationId, orderId: dto.orderId, priority: template.priority, labels: template.labels, estimateMinutes: template.estimateMinutes || undefined, dueDate, templateId: template.id, reminderBeforeMinutes: template.reminderBeforeMin ?? 60 }, actorId);
  }

  async reminders(userId: string) {
    const now = new Date();
    const where: Prisma.CrmTaskReminderWhereInput = { recipientId: userId, dismissedAt: null, remindAt: { lte: now }, task: { status: { notIn: [TaskStatus.DONE, TaskStatus.CANCELLED] } } };
    await this.prisma.crmTaskReminder.updateMany({ where: { ...where, deliveredAt: null }, data: { deliveredAt: now } });
    return this.prisma.crmTaskReminder.findMany({ where, include: { task: { include: { assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } }, lead: { select: { id: true, title: true, contactName: true } } } } }, orderBy: { remindAt: 'asc' }, take: 50 });
  }

  async dismissReminder(id: string, userId: string) {
    const reminder = await this.prisma.crmTaskReminder.findFirst({ where: { id, recipientId: userId } });
    if (!reminder) throw new NotFoundException('Напоминание не найдено');
    await this.prisma.crmTaskReminder.update({ where: { id }, data: { dismissedAt: new Date() } });
    return { success: true };
  }

  private async ensurePipeline() {
    const pipelineName = 'Основная воронка продаж';
    let pipeline = await this.prisma.crmPipeline.findFirst({ where: { isActive: true }, include: { stages: { orderBy: { sortOrder: 'asc' } } }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }] });
    if (!pipeline) {
      pipeline = await this.prisma.crmPipeline.create({ data: { name: pipelineName, isDefault: true, isActive: true, requiredFields: ['contactName', 'contactPhone'] }, include: { stages: true } });
      await this.prisma.crmPipelineStage.createMany({ data: stages.map(definition => ({ ...definition, pipelineId: pipeline!.id, isWon: definition.isWon || false, isLost: definition.isLost || false })) });
    }
    pipeline = await this.prisma.crmPipeline.findUniqueOrThrow({ where: { id: pipeline.id }, include: { stages: { orderBy: { sortOrder: 'asc' } } } });
    const stageMap = new Map(pipeline.stages.map(stage => [stage.code, stage.id]));
    const legacy = await this.prisma.lead.findMany({ where: { stageId: null }, select: { id: true, status: true } });
    for (const lead of legacy) await this.prisma.lead.update({ where: { id: lead.id }, data: { stageId: stageMap.get(lead.status) || pipeline.stages[0]?.id } });
    return pipeline;
  }

  private async pipelineRecord(id: string) {
    const pipeline = await this.prisma.crmPipeline.findFirst({ where: { id, isActive: true }, include: { stages: { orderBy: { sortOrder: 'asc' } } } });
    if (!pipeline) throw new NotFoundException('Воронка не найдена');
    return pipeline;
  }

  private pipelineFields(fields: string[]) {
    const allowed = new Set(['title', 'contactName', 'contactPhone', 'contactEmail', 'amount', 'managerId', 'organizationId', 'expectedCloseAt', 'nextContactAt']);
    const result = [...new Set(fields.filter(field => allowed.has(field)))];
    if (result.length !== fields.length) throw new BadRequestException('Список обязательных полей содержит неизвестное значение');
    return result;
  }

  private assertRequiredLeadFields(fields: string[], data: Record<string, any>) {
    const labels: Record<string, string> = { title: 'Название', contactName: 'Контакт', contactPhone: 'Телефон', contactEmail: 'Email', amount: 'Сумма', managerId: 'Ответственный', organizationId: 'Организация', expectedCloseAt: 'Плановая дата закрытия', nextContactAt: 'Следующий контакт' };
    const missing = fields.filter(field => data[field] === undefined || data[field] === null || data[field] === '');
    if (missing.length) throw new BadRequestException(`Заполните обязательные поля: ${missing.map(field => labels[field] || field).join(', ')}`);
  }

  private cleanList(values?: string[]) {
    return [...new Set((values || []).map(value => value.trim()).filter(Boolean))];
  }

  private async syncTaskReminder(taskId: string, recipientId: string, dueDate: Date | null, beforeMinutes: number) {
    await this.prisma.crmTaskReminder.deleteMany({ where: { taskId, dismissedAt: null } });
    if (!dueDate) return;
    const remindAt = new Date(dueDate.getTime() - Math.max(0, beforeMinutes) * 60000);
    await this.prisma.crmTaskReminder.create({ data: { taskId, recipientId, remindAt } });
  }

  private async assertTeamMember(userId: string) {
    if (!await this.prisma.user.findFirst({ where: { id: userId, role: { in: crmRoles }, isActive: true }, select: { id: true } })) throw new NotFoundException('Ответственный сотрудник не найден');
  }

  private async refreshOverdueTasks() {
    await this.prisma.task.updateMany({ where: { status: { in: [TaskStatus.BACKLOG, TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.REVIEW] }, dueDate: { lt: new Date() } }, data: { status: TaskStatus.OVERDUE } });
  }

  private assertDates(start?: string, due?: string) {
    if (start && due && new Date(start) > new Date(due)) throw new BadRequestException('Дата окончания задачи должна быть позже даты начала');
  }

  private statusForStage(stage: { code: string; isWon: boolean; isLost: boolean }) {
    if (stage.isWon) return LeadStatus.WON;
    if (stage.isLost) return LeadStatus.LOST;
    return Object.values(LeadStatus).includes(stage.code as LeadStatus) ? stage.code as LeadStatus : LeadStatus.NEW;
  }

  private leadInclude(detail = false) {
    return { stage: true, b2bProfile: true, customer: true, organization: true, manager: { select: { id: true, firstName: true, lastName: true, email: true } }, createdBy: { select: { id: true, firstName: true, lastName: true, email: true } }, interactions: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } }, orderBy: { createdAt: 'desc' as const }, ...(detail ? {} : { take: 5 }) }, tasks: { where: { status: { not: TaskStatus.CANCELLED } }, orderBy: { dueDate: 'asc' as const }, ...(detail ? {} : { take: 5 }) } };
  }

  private taskInclude() {
    return { assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } }, createdBy: { select: { id: true, firstName: true, lastName: true, email: true } }, lead: { select: { id: true, title: true, contactName: true } }, customer: { select: { id: true, firstName: true, lastName: true, email: true } }, organization: { select: { id: true, name: true } }, order: { select: { id: true, orderNumber: true } }, template: { select: { id: true, name: true } }, reminders: { where: { dismissedAt: null }, orderBy: { remindAt: 'asc' as const } }, comments: { include: { author: { select: { id: true, firstName: true, lastName: true, email: true } } }, orderBy: { createdAt: 'desc' as const }, take: 10 }, _count: { select: { children: true, comments: true } } };
  }
}
