import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { LeadStatus, Prisma, TaskStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { recordCrmChange, taskHistoryFields, leadHistoryFields } from './history';
import { taskStatusWhere } from './task-deadline';
import { CreateInteractionDto, CreateLeadDto, CreatePipelineDto, CreatePipelineStageDto, CreateTaskCommentDto, CreateTaskDto, CreateTaskFromTemplateDto, CreateTaskTemplateDto, ReorderPipelineStagesDto, UpdateLeadDto, UpdatePipelineDto, UpdatePipelineStageDto, UpdateTaskDto, UpdateTaskTemplateDto } from './dto/crm.dto';

const crmRoles: UserRole[] = [UserRole.ADMIN, UserRole.MANAGER_B2B, UserRole.MANAGER_SALES, UserRole.SUPERVISOR, UserRole.EXECUTIVE];
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

  // Mutation response helpers only. HTTP reads live in CrmReadService and always require an actor.
  private async pipeline(pipelineId?: string) {
    const pipeline = pipelineId
      ? await this.prisma.crmPipeline.findFirst({ where: { id: pipelineId, isActive: true }, include: { stages: { orderBy: { sortOrder: 'asc' } } } })
      : await this.ensurePipeline();
    if (!pipeline) throw new NotFoundException('Воронка не найдена');
    const leads = await this.leads();
    return { ...pipeline, stages: pipeline.stages.map(stage => ({ ...stage, leads: leads.filter(lead => lead.stageId === stage.id) })) };
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

  private async leads() {
    return this.prisma.lead.findMany({ include: this.leadInclude(), orderBy: [{ expectedCloseAt: 'asc' }, { updatedAt: 'desc' }] });
  }

  private async lead(id: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id }, include: this.leadInclude(true) });
    if (!lead) throw new NotFoundException('Сделка не найдена');
    return lead;
  }

  // Customer matching/creation belongs to the authorized facade, never to this low-level method.
  async createLead(dto: CreateLeadDto, actorId: string, options: { customerId: string | null; compact?: boolean; initializePipeline?: boolean } = { customerId: null }) {
    let stage: Prisma.CrmPipelineStageGetPayload<{}> | undefined;
    let requiredFields: string[];
    let lostReasons: string[];
    if (dto.stageId) {
      const selectedStage = await this.prisma.crmPipelineStage.findUnique({ where: { id: dto.stageId }, include: { pipeline: true } });
      if (!selectedStage?.pipeline.isActive) throw new BadRequestException('Этап воронки не найден');
      stage = selectedStage;
      requiredFields = selectedStage.pipeline.requiredFields;
      lostReasons = selectedStage.pipeline.lostReasons;
    } else {
      const pipeline = await this.ensurePipeline(options.initializePipeline ?? false);
      stage = pipeline.stages.find(item => dto.status === LeadStatus.WON ? item.isWon : dto.status === LeadStatus.LOST ? item.isLost : item.code === (dto.status || LeadStatus.NEW) && !item.isWon && !item.isLost);
      if (!stage && !dto.status) stage = pipeline.stages[0];
      requiredFields = pipeline.requiredFields;
      lostReasons = pipeline.lostReasons;
    }
    if (!stage) throw new BadRequestException('Этап воронки не найден');
    this.assertRequiredLeadFields(requiredFields, dto);
    if (stage.isLost && lostReasons.length && !dto.lostReason?.trim()) throw new BadRequestException('Укажите причину проигрыша сделки');
    if (dto.lostReason && lostReasons.length && !lostReasons.includes(dto.lostReason)) throw new BadRequestException('Выберите причину проигрыша из настроек воронки');
    const lead = await this.prisma.$transaction(async tx => {
      const created = await tx.lead.create({ data: {
        source: dto.source, title: dto.title || `Сделка с ${dto.contactName}`, contactName: dto.contactName, contactPhone: dto.contactPhone || '', contactEmail: dto.contactEmail,
        message: dto.message, status: this.statusForStage(stage), stageId: stage.id, managerId: dto.managerId || actorId, createdById: actorId,
        customerId: options.customerId, organizationId: dto.organizationId, amount: dto.amount || 0, probability: dto.probability ?? stage.probability,
        expectedCloseAt: dto.expectedCloseAt ? new Date(dto.expectedCloseAt) : undefined, nextContactAt: dto.nextContactAt ? new Date(dto.nextContactAt) : undefined, tags: dto.tags || [],
        lostReason: dto.lostReason, closedAt: stage.isWon || stage.isLost ? new Date() : undefined,
      } });
      await tx.interaction.create({ data: { leadId: created.id, customerId: options.customerId, userId: actorId, type: 'CREATED', content: `Сделка создана на этапе «${stage.name}»` } });
      await recordCrmChange(tx,actorId,'crm.lead',created.id,null,created,leadHistoryFields,'Создана сделка');
      return created;
    });
    return options.compact ? lead : this.lead(lead.id);
  }

  async updateLead(id: string, dto: UpdateLeadDto, actorId: string, compact = false) {
    const current = await this.prisma.lead.findUnique({ where: { id }, include: { stage: true } });
    if (!current) throw new NotFoundException('Сделка не найдена');
    let stage = (dto.stageId || current.stageId) ? await this.prisma.crmPipelineStage.findUnique({ where: { id: dto.stageId || current.stageId! }, include: { pipeline: true } }) : null;
    if (dto.status && !dto.stageId && dto.status !== current.status) {
      // A raw status update must pass the same stage rules as drag-and-drop.
      const pipelineId = stage?.pipelineId || (await this.prisma.crmPipeline.findFirst({ where: { isActive: true }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }, { id: 'asc' }] }))?.id;
      stage = pipelineId ? await this.prisma.crmPipelineStage.findFirst({ where: { pipelineId, ...(dto.status === LeadStatus.WON ? { isWon: true } : dto.status === LeadStatus.LOST ? { isLost: true } : { code: dto.status, isWon: false, isLost: false }) }, include: { pipeline: true }, orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] }) : null;
      if (!stage) throw new BadRequestException('Для этого статуса не найден этап активной воронки');
    }
    if ((dto.stageId || current.stageId || dto.status) && !stage?.pipeline.isActive) throw new BadRequestException('Этап активной воронки не найден');
    if (stage) {
      this.assertRequiredLeadFields(stage.pipeline.requiredFields, { ...current, ...dto });
      const lostReason = dto.lostReason === undefined ? current.lostReason : dto.lostReason;
      if (stage.isLost && stage.pipeline.lostReasons.length && !lostReason?.trim()) throw new BadRequestException('Укажите причину проигрыша сделки');
      if (lostReason && stage.pipeline.lostReasons.length && !stage.pipeline.lostReasons.includes(lostReason)) throw new BadRequestException('Выберите причину проигрыша из настроек воронки');
    }
    const nextStatus = (dto.stageId || dto.status) && stage ? this.statusForStage(stage) : dto.status;
    const result = await this.prisma.$transaction(async tx => {
      const updated = await tx.lead.update({ where: { id }, data: {
        source: dto.source, title: dto.title, contactName: dto.contactName, contactPhone: dto.contactPhone, contactEmail: dto.contactEmail, message: dto.message,
        status: nextStatus, stageId: dto.stageId || (dto.status ? stage?.id : undefined), managerId: dto.managerId, customerId: dto.customerId, organizationId: dto.organizationId,
        amount: dto.amount, probability: dto.probability ?? ((dto.stageId || dto.status) ? stage?.probability : undefined), expectedCloseAt: dto.expectedCloseAt === null ? null : dto.expectedCloseAt ? new Date(dto.expectedCloseAt) : undefined,
        nextContactAt: dto.nextContactAt === null ? null : dto.nextContactAt ? new Date(dto.nextContactAt) : undefined, lostReason: dto.lostReason, tags: dto.tags,
        closedAt: nextStatus && nextStatus !== current.status ? ([LeadStatus.WON, LeadStatus.LOST] as LeadStatus[]).includes(nextStatus) ? new Date() : null : undefined,
      } });
      if (stage && stage.id !== current.stageId) await tx.interaction.create({ data: { leadId: id, customerId: updated.customerId, userId: actorId, type: 'STAGE_CHANGED', content: `Этап изменён: «${current.stage?.name || current.status}» → «${stage.name}»` } });
      await recordCrmChange(tx,actorId,'crm.lead',id,current,updated,leadHistoryFields);
      return updated;
    });
    return compact ? result : this.lead(id);
  }

  async addInteraction(id: string, dto: CreateInteractionDto, actorId: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new NotFoundException('Сделка не найдена');
    return this.prisma.interaction.create({ data: { leadId: id, customerId: dto.customerId || lead.customerId, userId: actorId, type: dto.type, content: dto.content }, include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } } });
  }

  async createTask(dto: CreateTaskDto, actorId: string, compact = false) {
    const assignedToId = dto.assignedToId || actorId;
    await this.assertTeamMember(assignedToId);
    this.assertDates(dto.startDate, dto.dueDate);
    if (!dto.title.trim()) throw new BadRequestException('Введите название задачи');
    const task = await this.taskTransaction(async db => {
      await this.assertTaskParent(db, dto.parentId);
      const created = await db.task.create({ data: {
      title: dto.title, description: dto.description, assignedToId, createdById: actorId, leadId: dto.leadId, customerId: dto.customerId, organizationId: dto.organizationId,
      orderId: dto.orderId, parentId: dto.parentId, pipelineId: dto.pipelineId, status: dto.status || TaskStatus.TODO, priority: dto.priority || 'MEDIUM', progress: dto.status === TaskStatus.DONE ? 100 : dto.progress || 0,
      position: dto.position || 0, startDate: dto.startDate ? new Date(dto.startDate) : undefined, dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      estimateMinutes: dto.estimateMinutes, labels: dto.labels || [], templateId: dto.templateId, completedAt: dto.status === TaskStatus.DONE ? new Date() : undefined,
      } });
      await this.syncParentProgress(db, created.parentId);
      await recordCrmChange(db,actorId,'crm.task',created.id,null,created,taskHistoryFields,'Создана задача');
      if(created.leadId)await recordCrmChange(db,actorId,'crm.lead',created.leadId,null,{task:created.title},['task'],'Добавлена подзадача');
      return created;
    });
    await this.syncTaskReminder(task.id, assignedToId, task.dueDate, dto.reminderBeforeMinutes ?? 60);
    return compact ? task : this.prisma.task.findUniqueOrThrow({ where: { id: task.id }, include: this.taskInclude() });
  }

  async updateTask(id: string, dto: UpdateTaskDto, beforeId?: string | null, actorId?: string, orderScope?: Prisma.TaskWhereInput, compact = false) {
    if (dto.title !== undefined && !dto.title.trim()) throw new BadRequestException('Введите название задачи');
    if (dto.assignedToId) await this.assertTeamMember(dto.assignedToId);
    const task = await this.taskTransaction(async db => {
    const current = await db.task.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Задача не найдена');
    await this.assertTaskParent(db, dto.parentId, id);
    this.assertDates(dto.startDate || current.startDate?.toISOString(), dto.dueDate || current.dueDate?.toISOString());
    const status = dto.status;
    const children = await db.task.findMany({ where: { parentId: id, status: { not: TaskStatus.CANCELLED } } });
    if (status === TaskStatus.CANCELLED && children.length) throw new BadRequestException('Сначала перенесите в архив подзадачи');
    if (status === TaskStatus.DONE && children.some((child: any) => child.status !== TaskStatus.DONE)) throw new BadRequestException('Сначала завершите все подзадачи');
    const progress = children.length ? Math.round(children.reduce((sum: number, c: any) => sum + c.progress, 0) / children.length) : (status || current.status) === TaskStatus.DONE ? 100 : dto.progress ?? (current.status === TaskStatus.DONE && status ? 0 : undefined);
    const updated = await db.task.update({ where: { id }, data: {
      title: dto.title, description: dto.description, assignedToId: dto.assignedToId, leadId: dto.leadId, customerId: dto.customerId, organizationId: dto.organizationId,
      orderId: dto.orderId, parentId: dto.parentId, pipelineId: dto.pipelineId, status, priority: dto.priority, progress,
      position: dto.position, startDate: dto.startDate ? new Date(dto.startDate) : undefined, dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      estimateMinutes: dto.estimateMinutes, labels: dto.labels, completedAt: status === TaskStatus.DONE ? new Date() : status ? null : undefined,
    } });
    await this.syncParentProgress(db, current.parentId);
    if (updated.parentId !== current.parentId) await this.syncParentProgress(db, updated.parentId);
    await recordCrmChange(db,actorId,'crm.task',id,current,updated,taskHistoryFields);
    if (beforeId !== undefined) {
      const cards = await db.task.findMany({ where: orderScope ? { AND: [orderScope, taskStatusWhere(updated.status, new Date()), { id: { not: id } }] } : { status: updated.status, id: { not: id } }, orderBy: [{ position: 'asc' }, { createdAt: 'desc' }, { id: 'asc' }] });
      const index = beforeId ? cards.findIndex((item: any) => item.id === beforeId) : cards.length;
      if (orderScope && beforeId && index < 0) throw new BadRequestException('Карточка назначения недоступна или уже перемещена. Обновите доску.');
      cards.splice(index < 0 ? cards.length : index, 0, { id });
      for (let i = 0; i < cards.length; i++) if (cards[i].position !== i) await db.task.update({ where: { id: cards[i].id }, data: { position: i } });
    }
    return updated;
    });
    if (dto.dueDate !== undefined || dto.assignedToId !== undefined || dto.reminderBeforeMinutes !== undefined) await this.syncTaskReminder(task.id, task.assignedToId, task.dueDate, dto.reminderBeforeMinutes ?? 60);
    return compact ? task : this.prisma.task.findUniqueOrThrow({ where: { id }, include: this.taskInclude() });
  }

  async archiveTask(id: string, actorId?: string) {
    return this.taskTransaction(async db => {
      const task = await db.task.findUnique({ where: { id } });
      if (!task) throw new NotFoundException('Задача не найдена');
      if (await db.task.count({ where: { parentId: id, status: { not: TaskStatus.CANCELLED } } })) throw new BadRequestException('Сначала перенесите в архив подзадачи');
      const archived = await db.task.update({ where: { id }, data: { status: TaskStatus.CANCELLED, completedAt: null } });
      await this.syncParentProgress(db, task.parentId);
      await recordCrmChange(db,actorId,'crm.task',id,task,archived,taskHistoryFields,'Перенесена в архив');
      return archived;
    });
  }

  async addTaskComment(id: string, dto: CreateTaskCommentDto, actorId: string, mentions: { id: string; name: string }[] = []) {
    if (!dto.body.trim()) throw new BadRequestException('Введите текст комментария');
    if (!await this.prisma.task.findUnique({ where: { id }, select: { id: true } })) throw new NotFoundException('Задача не найдена');
    return this.prisma.crmTaskComment.create({ data: { taskId: id, authorId: actorId, body: dto.body.trim(), mentions }, include: { author: { select: { id: true, firstName: true, lastName: true, email: true } } } });
  }

  async moveTask(id: string, status: TaskStatus, beforeId?: string, actorId?: string) {
    if (status === TaskStatus.CANCELLED) throw new BadRequestException('Для архива используйте действие «Перенести в архив»');
    return this.updateTask(id, { status }, beforeId || null, actorId);
  }

  private taskTransaction<T>(operation: (db: any) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async db => { await db.$executeRaw`SELECT pg_advisory_xact_lock(73422110)`; return operation(db); });
  }
  private async assertTaskParent(db: any, parentId?: string | null, id?: string) {
    let current = parentId, depth = 0;
    while (current) {
      if (current === id || ++depth > 30) throw new BadRequestException('Циклическая или слишком глубокая вложенность подзадач');
      const parent = await db.task.findFirst({ where: { id: current, status: { not: TaskStatus.CANCELLED } } });
      if (!parent) throw new BadRequestException('Родительская задача не найдена');
      current = parent.parentId;
    }
  }
  private async syncParentProgress(db: any, parentId?: string | null) {
    let current = parentId;
    for (let depth = 0; current && depth < 30; depth++) {
      const parent = await db.task.findUnique({ where: { id: current } });
      if (!parent) break;
      const children = await db.task.findMany({ where: { parentId: current, status: { not: TaskStatus.CANCELLED } } });
      const progress = children.length ? Math.round(children.reduce((sum: number, c: any) => sum + c.progress, 0) / children.length) : parent.progress;
      const reopen = parent.status === TaskStatus.DONE && children.some((c: any) => c.status !== TaskStatus.DONE);
      await db.task.update({ where: { id: current }, data: { progress, ...(reopen ? { status: TaskStatus.IN_PROGRESS, completedAt: null } : {}) } });
      current = parent.parentId;
    }
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

  private async ensurePipeline(allowCreate = true) {
    // Called only by explicit writes. Legacy lead stages are projected on reads, never mass-migrated here.
    return this.prisma.$transaction(async db => {
      await db.$executeRaw`SELECT pg_advisory_xact_lock(73422111)`;
      const include = { stages: { orderBy: { sortOrder: 'asc' as const } } };
      const current = await db.crmPipeline.findFirst({ where: { isActive: true }, include, orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }, { id: 'asc' }] });
      if (current) return current;
      if (!allowCreate) throw new ForbiddenException('Сначала попросите администратора настроить воронку продаж');
      return db.crmPipeline.create({ data: { name: 'Основная воронка продаж', isDefault: true, isActive: true, requiredFields: ['contactName', 'contactPhone'],
        stages: { create: stages.map(stage => ({ ...stage, isWon: stage.isWon || false, isLost: stage.isLost || false })) } }, include });
    });
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
    const missing = fields.filter(field => data[field] === undefined || data[field] === null || (typeof data[field] === 'string' && !data[field].trim()));
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
    return { children: { where: { status: { not: TaskStatus.CANCELLED } }, orderBy: { createdAt: 'asc' as const }, include: { assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } } } }, parent: { select: { id: true, title: true } }, assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } }, createdBy: { select: { id: true, firstName: true, lastName: true, email: true } }, lead: { select: { id: true, title: true, contactName: true } }, customer: { select: { id: true, firstName: true, lastName: true, email: true } }, organization: { select: { id: true, name: true } }, order: { select: { id: true, orderNumber: true } }, template: { select: { id: true, name: true } }, reminders: { where: { dismissedAt: null }, orderBy: { remindAt: 'asc' as const } }, comments: { include: { author: { select: { id: true, firstName: true, lastName: true, email: true } } }, orderBy: { createdAt: 'desc' as const }, take: 10 }, _count: { select: { children: true, comments: true } } };
  }
}
