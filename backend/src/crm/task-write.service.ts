import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TaskStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CrmReadAccess, CrmReadPolicy } from './read-access';
import { CrmReadService } from './crm-read.service';
import { customerVisibility } from '../customer360/customer-access';
import { CrmService } from './crm.service';
import { CreateTaskCommentDto, CreateTaskDto, CreateTaskFromTemplateDto, UpdateTaskDto } from './dto/crm.dto';
import { DEFAULT_TASK_PIPELINE, taskPipelineScope } from './task-pipelines.service';
import { addTaskParticipants, taskParticipants, taskPeople, taskPerson, taskPersonName } from './task-collaboration';
import { recordCrmChange } from './history';

type Context = { db: Prisma.TransactionClient; read: CrmReadPolicy; write: CrmReadPolicy; core: CrmService; reader: CrmReadService };

/** HTTP task mutation boundary. Authorization, effects, reminders, audit and response share one transaction.
 * Never call the legacy core directly from a task endpoint. */
@Injectable()
export class CrmTaskWriteService {
  constructor(private readonly prisma: PrismaService, private readonly access: CrmReadAccess) {}
  private async run<T>(actorId: string, operation: (ctx: Context) => Promise<T>, permission = 'crm.write') {
    try {
      return await this.prisma.$transaction(async db => {
        // Same ordering for every task mutation and department editor. No multi-connection nested transactions.
        await db.$executeRaw`SELECT pg_advisory_xact_lock(73422112)`;
        await db.$executeRaw`SELECT pg_advisory_xact_lock(73422110)`;
        const read = await this.access.resolve(db, actorId, permission === 'content_plan.write' ? 'content_plan.read' : 'crm.read');
        const write = await this.access.resolve(db, actorId, permission);
        const bound = new Proxy(db, { get(target, key) {
          if (key === '$transaction') return (action: any) => typeof action === 'function' ? action(db) : Promise.all(action);
          const value = Reflect.get(target, key); return typeof value === 'function' ? value.bind(target) : value;
        } }) as unknown as PrismaService;
        return operation({ db, read, write, core: new CrmService(bound), reader: new CrmReadService(bound, this.access) });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 20000 });
    } catch (error) {
      if ((error as any)?.code === 'P2034') throw new ConflictException('Данные изменились во время сохранения. Обновите карточку и повторите действие.');
      throw error;
    }
  }
  private scope(ctx: Context): Prisma.TaskWhereInput { return { AND: [ctx.read.tasks(), ctx.write.tasks()] }; }
  private async task(ctx: Context, id: string) {
    const row = await ctx.db.task.findFirst({ where: { AND: [{ id }, this.scope(ctx)] } });
    if (!row) throw new NotFoundException('Задача не найдена или недоступна для изменения');
    return row;
  }
  private async assignee(ctx: Context, id: string) {
    if (!await ctx.db.user.findFirst({ where: { AND: [{ id }, ctx.write.assignees()] }, select: { id: true } })) throw new ForbiddenException('Нельзя назначить задачу этому сотруднику в вашей области доступа');
  }
  private async children(ctx: Context, id: string) {
    if (ctx.read.company(ctx.read.permission) && ctx.write.company(ctx.write.permission)) return;
    if (await ctx.db.task.count({ where: { parentId: id, status: { not: 'CANCELLED' }, NOT: this.scope(ctx) } })) throw new ForbiddenException('Изменение затрагивает подзадачи вне вашей области доступа');
  }
  private async parents(ctx: Context, parentId?: string | null) {
    const visited = new Set<string>(); let id = parentId;
    while (id) {
      if (visited.has(id) || visited.size >= 30) throw new BadRequestException('Циклическая или слишком глубокая вложенность подзадач');
      visited.add(id); const parent = await this.task(ctx, id); await this.children(ctx, id); id = parent.parentId;
    }
  }
  private async references(ctx: Context, dto: CreateTaskDto | UpdateTaskDto) {
    if (dto.leadId && !await ctx.db.lead.findFirst({ where: { AND: [{ id: dto.leadId }, ctx.read.leads(), ctx.write.leads('crm.write')] }, select: { id: true } })) throw new ForbiddenException('Связанная сделка недоступна для изменения');
    if (dto.customerId !== undefined || dto.organizationId !== undefined) {
      if (!ctx.read.allowed('customers.read')) throw new ForbiddenException('Связанная запись недоступна');
      const visible = await customerVisibility(ctx.db, ctx.read);
      for (const [field, model, where] of [['customerId', 'customer', visible.customers], ['organizationId', 'organization', visible.organizations]] as const) {
        const id = dto[field];
        if (id && !await (ctx.db[model] as any).findFirst({ where: { AND: [{ id }, where] }, select: { id: true } })) throw new ForbiddenException('Связанная запись недоступна');
      }
    }
    for (const [field, model, permission] of [['orderId', 'order', 'oms.read']] as const) {
      const id = dto[field];
      if (id && (!ctx.read.company(permission) || !await (ctx.db[model] as any).findUnique({ where: { id }, select: { id: true } }))) throw new ForbiddenException('Связанная запись недоступна');
    }
    if ('templateId' in dto && dto.templateId) {
      if (!ctx.read.company('crm.read') || !await ctx.db.crmTaskTemplate.findFirst({ where: { id: dto.templateId, isActive: true }, select: { id: true } })) throw new ForbiddenException('Шаблон недоступен');
    }
  }
  private async createIn(ctx: Context, dto: CreateTaskDto, actorId: string) {
    await this.assignee(ctx, dto.assignedToId || actorId); await this.references(ctx, dto); await this.parents(ctx, dto.parentId);
    if (dto.parentId) {
      const parent = await this.task(ctx, dto.parentId);
      if (dto.pipelineId && dto.pipelineId !== parent.pipelineId) throw new BadRequestException('Подзадача должна находиться в воронке родительской задачи');
      dto = { ...dto, pipelineId: parent.pipelineId };
    }
    if (dto.pipelineId) await this.pipeline(ctx, dto.pipelineId);
    const task = await ctx.core.createTask(dto, actorId, true);
    if (dto.participantIds?.length) await addTaskParticipants(ctx.db, this.access, task.id, actorId, dto.participantIds);
    await this.task(ctx, task.id); // Verify effective ownership after defaults, not a client-provided owner.
    return ctx.reader.task(actorId, task.id);
  }
  create(actorId: string, dto: CreateTaskDto) { return this.run(actorId, ctx => this.createIn(ctx, dto, actorId)); }
  private async pipeline(ctx: Context, id: string) {
    if (!await ctx.db.crmTaskPipeline.findFirst({ where: { AND: [{ id }, taskPipelineScope(ctx.read), taskPipelineScope(ctx.write)] } })) throw new NotFoundException('Воронка не найдена или недоступна');
  }
  update(actorId: string, id: string, dto: UpdateTaskDto, beforeId?: string | null) {
    return this.run(actorId, async ctx => {
      const current = await this.task(ctx, id);
      const pipelineId = dto.pipelineId || current.pipelineId || DEFAULT_TASK_PIPELINE;
      if (dto.pipelineId && dto.pipelineId !== current.pipelineId) {
        await this.pipeline(ctx, dto.pipelineId);
        if (await ctx.db.task.count({ where: { parentId: id } })) throw new BadRequestException('Задачу с подзадачами нельзя перенести в другую воронку');
      }
      const parentId = dto.parentId === undefined ? current.parentId : dto.parentId;
      if (parentId) {
        const parent = await this.task(ctx, parentId);
        if ((parent.pipelineId || DEFAULT_TASK_PIPELINE) !== pipelineId) throw new BadRequestException('Подзадача должна находиться в воронке родительской задачи');
      }
      if (dto.assignedToId) await this.assignee(ctx, dto.assignedToId);
      await this.references(ctx, dto); await this.children(ctx, id);
      await this.parents(ctx, current.parentId); if (dto.parentId !== current.parentId) await this.parents(ctx, dto.parentId);
      if (beforeId === id) throw new BadRequestException('Нельзя переместить карточку перед самой собой');
      if (beforeId) await this.task(ctx, beforeId);
      await ctx.core.updateTask(id, dto, beforeId, actorId, { AND: [this.scope(ctx), { pipelineId }] }, true);
      await this.task(ctx, id); // A mutation cannot transfer a record outside the allowed resulting scope.
      return ctx.reader.task(actorId, id);
    });
  }
  move(actorId: string, id: string, status: TaskStatus, beforeId?: string) {
    if (status === 'CANCELLED') throw new BadRequestException('Для архива используйте действие «Перенести в архив»');
    return this.update(actorId, id, { status }, beforeId || null);
  }
  archive(actorId: string, id: string) {
    return this.run(actorId, async ctx => {
      const task = await this.task(ctx, id); await this.children(ctx, id); await this.parents(ctx, task.parentId);
      await ctx.core.archiveTask(id, actorId); return ctx.reader.task(actorId, id);
    });
  }
  comment(actorId: string, id: string, dto: CreateTaskCommentDto, permission = 'crm.write') {
    return this.run(actorId, async ctx => {
      await this.task(ctx, id);
      const mentionIds = [...new Set(dto.mentionIds || [])];
      if (mentionIds.length > 20) throw new BadRequestException('Можно упомянуть не более 20 сотрудников');
      const mentions: { id: string; name: string }[] = [];
      if (mentionIds.length) {
        if (permission !== 'crm.write') throw new BadRequestException('Упоминания доступны в карточке задачи');
        for (const userId of mentionIds) {
          const user = await ctx.db.user.findUnique({ where: { id: userId }, select: taskPerson });
          if (!user || !dto.body.includes('@' + taskPersonName(user))) throw new BadRequestException('Выберите сотрудника для упоминания заново');
          mentions.push({ id: userId, name: taskPersonName(user) });
        }
        // Sharing and the comment commit atomically. A mention sends one alert, not an extra invitation.
        await addTaskParticipants(ctx.db, this.access, id, actorId, mentionIds, false);
      }
      const comment = await ctx.core.addTaskComment(id, dto, actorId, mentions);
      return { ...comment, participants: await ctx.db.crmTaskParticipant.findMany({ where: { taskId: id }, ...taskParticipants }) };
    }, permission);
  }
  people(actorId: string, query = '', taskId?: string) {
    return this.run(actorId, async ctx => {
      if (taskId) await this.task(ctx, taskId);
      return taskPeople(ctx.db, this.access, query, taskId);
    });
  }
  addParticipant(actorId: string, id: string, userId: string) {
    return this.run(actorId, async ctx => {
      await this.task(ctx, id);
      return addTaskParticipants(ctx.db, this.access, id, actorId, [userId]);
    });
  }
  removeParticipant(actorId: string, id: string, userId: string) {
    return this.run(actorId, async ctx => {
      await this.task(ctx, id);
      const before = await ctx.db.crmTaskParticipant.findMany({ where: { taskId: id }, ...taskParticipants });
      await ctx.db.crmTaskParticipant.deleteMany({ where: { taskId: id, userId } });
      // Do not let this mutation remove the caller's own remaining write scope.
      await this.task(ctx, id);
      const after = before.filter(row => row.userId !== userId);
      await recordCrmChange(ctx.db, actorId, 'crm.task', id, { participants: before.map(row => taskPersonName(row.user)) }, { participants: after.map(row => taskPersonName(row.user)) }, ['participants'], 'Удалён участник');
      return after;
    });
  }
  fromTemplate(actorId: string, id: string, dto: CreateTaskFromTemplateDto) {
    return this.run(actorId, async ctx => {
      // Template ownership is not modelled yet. Do not turn an unknown narrow scope into company access.
      if (!ctx.read.company('crm.read')) throw new ForbiddenException('Шаблон недоступен в этой области доступа');
      const template = await ctx.db.crmTaskTemplate.findFirst({ where: { id, isActive: true } });
      if (!template) throw new NotFoundException('Шаблон задачи не найден');
      return this.createIn(ctx, { ...dto, title: template.title, description: template.description || undefined,
        assignedToId: dto.assignedToId || template.defaultAssigneeId || actorId, priority: template.priority, labels: template.labels,
        estimateMinutes: template.estimateMinutes || undefined, dueDate: template.dueInHours ? new Date(Date.now() + template.dueInHours * 3600000).toISOString() : undefined,
        templateId: id, reminderBeforeMinutes: template.reminderBeforeMin ?? 60,
      }, actorId);
    });
  }
}
