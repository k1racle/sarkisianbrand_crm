import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TaskStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CrmReadAccess, CrmReadPolicy } from './read-access';
import { activeTaskStatuses, overdueTasksWhere, taskStatusWhere, withDeadline } from './task-deadline';
import { leadHistoryFields, taskHistoryFields } from './history';
import { Customer360Service } from '../customer360/customer360.service';
import { customerVisibility } from '../customer360/customer-access';
import { taskParticipants } from './task-collaboration';

const person = { id: true, firstName: true, lastName: true, email: true } as const;
const pipelineInclude = { stages: { orderBy: [{ sortOrder: 'asc' as const }, { id: 'asc' as const }] } };
const ids = (rows: any[], key: string) => [...new Set(rows.map(row => row[key]).filter(Boolean))] as string[];
const byId = (rows: any[]) => new Map(rows.map(row => [row.id, row]));

/** Read boundary: the same policy covers roots, nested records, counts, cursors and related references. */
@Injectable()
export class CrmReadService {
  constructor(private readonly prisma: PrismaService, private readonly access: CrmReadAccess) {}
  async customers(actor: string) {
    const rows = await new Customer360Service(this.prisma, this.access).customers(actor);
    return rows.map(({ user, organizationMemberships, ...customer }) => ({ ...customer, role: user?.role || 'CUSTOMER_B2C', b2bProfile: organizationMemberships[0]?.organization || null }));
  }
  private read<T>(actorId: string, operation: (db: Prisma.TransactionClient, policy: CrmReadPolicy, now: Date) => Promise<T>, permission = 'crm.read') {
    return this.prisma.$transaction(async db => operation(db, await this.access.resolve(db, actorId, permission), new Date()), { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead, timeout: 15000 });
  }
  private async defaultPipeline(db: Prisma.TransactionClient) {
    return db.crmPipeline.findFirst({ where: { isActive: true }, include: pipelineInclude, orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }, { id: 'asc' }] });
  }
  team(actorId: string) {
    return this.read(actorId, async (db, policy) => {
      // Readers can see the team relevant to their records. Assignment choices
      // are intersected with write scope when a separate write grant exists.
      const writable = policy.allowed('crm.write') ? await this.access.resolve(db, actorId, 'crm.write') : null;
      return db.user.findMany({ where: { AND: [{ role: { in: ['ADMIN', 'MANAGER_B2B', 'MANAGER_SALES', 'SUPERVISOR', 'EXECUTIVE'] } }, policy.assignees(), ...(writable ? [writable.assignees()] : [])] }, select: { ...person, role: true }, orderBy: [{ firstName: 'asc' }, { email: 'asc' }, { id: 'asc' }] });
    });
  }
  publicationTask(actorId: string, id: string) {
    return this.read(actorId, async (db, policy) => {
      const row = await db.crmPublication.findFirst({ where: { id, task: policy.tasks() }, select: { taskId: true } });
      if (!row) throw new NotFoundException('Публикация не найдена или недоступна');
      return row.taskId;
    }, 'content_plan.read');
  }
  private taskInclude(policy: CrmReadPolicy) {
    return { assignedTo: { select: person }, createdBy: { select: person }, participants: taskParticipants,
      children: { where: { AND: [policy.tasks(), { status: { not: TaskStatus.CANCELLED } }] }, orderBy: [{ createdAt: 'asc' as const }, { id: 'asc' as const }], select: { id: true, title: true, status: true, priority: true, progress: true, dueDate: true, assignedToId: true, assignedTo: { select: person } } },
      reminders: { where: { recipientId: policy.actorId, dismissedAt: null }, orderBy: { remindAt: 'asc' as const } },
      comments: { include: { author: { select: person } }, orderBy: [{ createdAt: 'desc' as const }, { id: 'desc' as const }], take: 10 },
      _count: { select: { children: { where: { AND: [policy.tasks(), { status: { not: TaskStatus.CANCELLED } }] } }, comments: true } },
    } satisfies Prisma.TaskInclude;
  }
  private async taskReferences(db: Prisma.TransactionClient, policy: CrmReadPolicy, rows: any[], now: Date) {
    const visible = policy.allowed('customers.read') ? await customerVisibility(db, policy) : null;
    // To-one relations are independently fetched with scope, never fetched globally then hidden in CSS.
    const [parents, leads, customers, organizations, orders, templates] = await Promise.all([
      db.task.findMany({ where: { AND: [{ id: { in: ids(rows, 'parentId') } }, policy.tasks()] }, select: { id: true, title: true } }),
      db.lead.findMany({ where: { AND: [{ id: { in: ids(rows, 'leadId') } }, policy.leads()] }, select: { id: true, title: true, contactName: true } }),
      visible ? db.customer.findMany({ where: { AND: [{ id: { in: ids(rows, 'customerId') } }, visible.customers] }, select: { id: true, firstName: true, lastName: true, email: true } }) : [],
      visible ? db.organization.findMany({ where: { AND: [{ id: { in: ids(rows, 'organizationId') } }, visible.organizations] }, select: { id: true, name: true } }) : [],
      policy.company('oms.read') ? db.order.findMany({ where: { id: { in: ids(rows, 'orderId') } }, select: { id: true, orderNumber: true } }) : [],
      policy.company('crm.read') ? db.crmTaskTemplate.findMany({ where: { id: { in: ids(rows, 'templateId') } }, select: { id: true, name: true } }) : [],
    ]);
    const maps = { parent: byId(parents), lead: byId(leads), customer: byId(customers), organization: byId(organizations), order: byId(orders), template: byId(templates) };
    return rows.map(row => {
      const output = { ...withDeadline(row, now), children: row.children?.map((child: any) => withDeadline(child, now)) } as any;
      for (const [relation, map] of Object.entries(maps)) {
        output[relation] = map.get(row[`${relation}Id`]) || null;
        if (!output[relation]) output[`${relation}Id`] = null;
      }
      return output;
    });
  }
  tasks(actorId: string, status?: TaskStatus, assignedToId?: string, pipelineId?: string) {
    return this.read(actorId, async (db, policy, now) => {
      const rows = await db.task.findMany({ where: { AND: [policy.tasks(), taskStatusWhere(status, now), ...(assignedToId ? [{ assignedToId }] : []), ...(pipelineId ? [{ pipelineId }] : [])] }, include: this.taskInclude(policy), orderBy: [{ position: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }, { id: 'asc' }], take: 500 });
      return this.taskReferences(db, policy, rows, now);
    });
  }
  task(actorId: string, id: string) {
    return this.read(actorId, async (db, policy, now) => {
      const row = await db.task.findFirst({ where: { AND: [{ id }, policy.tasks()] }, include: this.taskInclude(policy) });
      if (!row) throw new NotFoundException('Задача не найдена');
      return (await this.taskReferences(db, policy, [row], now))[0];
    });
  }
  private leadInclude(policy: CrmReadPolicy, detail = false) {
    return { stage: true, manager: { select: person }, createdBy: { select: person },
      interactions: { select: { id: true, type: true, content: true, createdAt: true, user: { select: person } }, orderBy: [{ createdAt: 'desc' as const }, { id: 'desc' as const }], take: detail ? 100 : 5 },
      tasks: { where: { AND: [policy.tasks(), { status: { not: TaskStatus.CANCELLED } }] }, select: { id: true, title: true, status: true, progress: true, dueDate: true, assignedToId: true, assignedTo: { select: person } }, orderBy: [{ dueDate: 'asc' as const }, { id: 'asc' as const }], take: detail ? 500 : 5 },
    } satisfies Prisma.LeadInclude;
  }
  private async leadReferences(db: Prisma.TransactionClient, policy: CrmReadPolicy, rows: any[], now: Date) {
    const visible = policy.allowed('customers.read') ? await customerVisibility(db, policy) : null;
    const [customers, organizations] = await Promise.all([
      visible ? db.customer.findMany({ where: { AND: [{ id: { in: ids(rows, 'customerId') } }, visible.customers] }, select: { id: true, firstName: true, lastName: true, email: true } }) : [],
      visible ? db.organization.findMany({ where: { AND: [{ id: { in: ids(rows, 'organizationId') } }, visible.organizations] }, select: { id: true, name: true } }) : [],
    ]);
    const customerMap = byId(customers), organizationMap = byId(organizations);
    return rows.map(row => ({ ...row, b2bProfileId: null, b2bProfile: null,
      customerId: customerMap.has(row.customerId) ? row.customerId : null, customer: customerMap.get(row.customerId) || null,
      organizationId: organizationMap.has(row.organizationId) ? row.organizationId : null, organization: organizationMap.get(row.organizationId) || null,
      tasks: row.tasks.map((task: any) => withDeadline(task, now)),
    }));
  }
  leads(actorId: string) {
    return this.read(actorId, async (db, policy, now) => this.leadReferences(db, policy, await db.lead.findMany({ where: policy.leads(), include: this.leadInclude(policy), orderBy: [{ expectedCloseAt: 'asc' }, { updatedAt: 'desc' }, { id: 'asc' }] }), now));
  }
  lead(actorId: string, id: string) {
    return this.read(actorId, async (db, policy, now) => {
      const row = await db.lead.findFirst({ where: { AND: [{ id }, policy.leads()] }, include: this.leadInclude(policy, true) });
      if (!row) throw new NotFoundException('Сделка не найдена');
      return (await this.leadReferences(db, policy, [row], now))[0];
    });
  }
  pipelines(actorId: string) {
    return this.read(actorId, db => db.crmPipeline.findMany({ where: { isActive: true }, include: { ...pipelineInclude, _count: { select: { stages: true } } }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }, { id: 'asc' }] }));
  }
  pipeline(actorId: string, pipelineId?: string) {
    return this.read(actorId, async (db, policy, now) => {
      const pipeline = pipelineId ? await db.crmPipeline.findFirst({ where: { id: pipelineId, isActive: true }, include: pipelineInclude }) : await this.defaultPipeline(db);
      if (!pipeline && pipelineId) throw new NotFoundException('Воронка не найдена');
      if (!pipeline) return { id: null, name: 'Воронка продаж', stages: [], requiredFields: [], lostReasons: [], requiresSetup: true };
      const fallback = await this.defaultPipeline(db);
      const isDefault = fallback?.id === pipeline.id;
      const rows = await db.lead.findMany({ where: { AND: [policy.leads(), { OR: [{ stage: { pipelineId: pipeline.id } }, ...(isDefault ? [{ stageId: null }] : [])] }] }, include: this.leadInclude(policy), orderBy: [{ expectedCloseAt: 'asc' }, { updatedAt: 'desc' }, { id: 'asc' }] });
      const leads = await this.leadReferences(db, policy, rows, now);
      const effectiveStage = (lead: any) => lead.stageId || pipeline.stages.find(stage => stage.code === lead.status)?.id || pipeline.stages[0]?.id;
      return { ...pipeline, stages: pipeline.stages.map(stage => ({ ...stage, leads: leads.filter(lead => effectiveStage(lead) === stage.id).map(lead => ({ ...lead, stageId: stage.id })) })) };
    });
  }
  dashboard(actorId: string) {
    return this.read(actorId, async (db, policy, now) => {
      const pipeline = await this.defaultPipeline(db);
      const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const open: Prisma.LeadWhereInput = { AND: [policy.leads(), { status: { notIn: ['WON', 'LOST'] } }] };
      const [customers, openLeads, activeTasks, overdueTasks, dueToday, wonMonth, forecast, recentInteractions, stageRows] = await Promise.all([
        policy.company('customers.read') ? db.customer.count() : null,
        db.lead.count({ where: open }), db.task.count({ where: { AND: [policy.tasks(), { status: { in: activeTaskStatuses } }] } }),
        db.task.count({ where: { AND: [policy.tasks(), overdueTasksWhere(now)] } }),
        db.task.count({ where: { AND: [policy.tasks(), { status: { in: activeTaskStatuses }, dueDate: { gte: now, lte: todayEnd } }] } }),
        db.lead.aggregate({ where: { AND: [policy.leads(), { status: 'WON', closedAt: { gte: monthStart } }] }, _count: { _all: true }, _sum: { amount: true } }),
        db.lead.findMany({ where: open, select: { amount: true, probability: true } }),
        db.interaction.findMany({ where: { lead: { is: policy.leads() } }, select: { id: true, type: true, content: true, createdAt: true, user: { select: person }, lead: { select: { id: true, title: true, contactName: true } } }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 8 }),
        db.lead.groupBy({ by: ['stageId', 'status'], where: policy.leads(), _count: { _all: true }, _sum: { amount: true } }),
      ]);
      return { customers, customersAvailable: customers !== null, openLeads, activeTasks, overdueTasks, dueToday,
        wonMonth: { count: wonMonth._count._all, amount: Number(wonMonth._sum.amount || 0) }, forecast: forecast.reduce((sum, lead) => sum + Number(lead.amount) * lead.probability / 100, 0),
        funnel: (pipeline?.stages || []).map(stage => {
          const rows = stageRows.filter(row => row.stageId === stage.id || (!row.stageId && (pipeline?.stages.find(item => item.code === row.status)?.id || pipeline?.stages[0]?.id) === stage.id));
          return { id: stage.id, name: stage.name, color: stage.color, count: rows.reduce((sum, row) => sum + row._count._all, 0), amount: rows.reduce((sum, row) => sum + Number(row._sum.amount || 0), 0) };
        }), recentInteractions };
    });
  }
  comments(actorId: string, id: string, before?: string, permission = 'crm.read') {
    return this.read(actorId, async (db, policy) => {
      if (!await db.task.findFirst({ where: { AND: [{ id }, policy.tasks()] }, select: { id: true } })) throw new NotFoundException('Задача не найдена');
      if (before && !await db.crmTaskComment.findFirst({ where: { id: before, taskId: id }, select: { id: true } })) throw new BadRequestException('Некорректный курсор комментариев');
      return db.crmTaskComment.findMany({ where: { taskId: id, task: { is: policy.tasks() } }, ...(before ? { cursor: { id: before }, skip: 1 } : {}), take: 30, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], include: { author: { select: person } } });
    }, permission);
  }
  history(actorId: string, kind: 'task' | 'lead', id: string, before?: string) {
    return this.read(actorId, async (db, policy) => {
      const entity = kind === 'task' ? await db.task.findFirst({ where: { AND: [{ id }, policy.tasks()] }, select: { id: true } }) : await db.lead.findFirst({ where: { AND: [{ id }, policy.leads()] }, select: { id: true } });
      if (!entity) throw new NotFoundException('Карточка не найдена');
      const where = { resource: `crm.${kind}`, resourceId: id };
      if (before && !await db.auditLog.findFirst({ where: { ...where, id: before }, select: { id: true } })) throw new BadRequestException('Некорректный курсор истории');
      const rows = await db.auditLog.findMany({ where, ...(before ? { cursor: { id: before }, skip: 1 } : {}), take: 31, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], select: { id: true, action: true, payload: true, createdAt: true, actor: { select: person } } });
      // Linked record IDs in legacy audit payloads must not bypass their own scope. Free-form business text belongs to the permitted record.
      const allowed = new Set((kind === 'task' ? taskHistoryFields : leadHistoryFields).filter(field => !['leadId', 'parentId'].includes(field)));
      const items = rows.slice(0, 30).map(row => ({ ...row, payload: { changes: Array.isArray((row.payload as any)?.changes) ? (row.payload as any).changes.filter((change: any) => allowed.has(change?.field)).map((change: any) => ({ field: change.field, from: change.from, to: change.to })) : [] } }));
      return { items, more: rows.length > 30 };
    });
  }
}
