import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CrmWorkPattern, CrmWorkSchedule, Prisma } from '@prisma/client';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { employeeAccess } from '../auth/employee-access';
import { internalWorkspaceRoles } from '../auth/workspace-role-catalog';
import { CreateScheduleDto, CreateWorkPatternDto, ScheduleQueryDto, ScheduleTransitionDto, UpdateScheduleDto, WorkPatternActionDto } from './work-schedule.dto';
import { localStamp, scheduleFields, scheduleMonth } from './work-schedule.policy';
import { addDays, manualOverrides, patternDate, patternDays, patternLabels, PatternFields, workPatternFields } from './work-pattern.policy';
import { lockTimeEmployee, patternChangeRange, requireOpenTime } from '../work-time/timesheet-closing.policy';

const personSelect = { id: true, firstName: true, lastName: true, departmentId: true, isActive: true } as const;
const rowInclude = { employee: { select: personSelect } } as const;
type ScheduleRow = Prisma.CrmWorkScheduleGetPayload<{ include: typeof rowInclude }>;
type PatternRow = Prisma.CrmWorkPatternGetPayload<{ include: typeof rowInclude }>;

@Injectable()
export class WorkScheduleService {
  constructor(private readonly prisma: PrismaService) {}

  private async transaction<T>(run: (db: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    try { return await this.prisma.$transaction(run, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15000 }); }
    catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && ['P2034', 'P2002'].includes(error.code)) throw new ConflictException('График изменён другим сотрудником. Обновите данные и повторите действие');
      throw error;
    }
  }

  private async actor(db: Prisma.TransactionClient, id: string) {
    const user = await db.user.findUnique({ where: { id }, select: { ...personSelect, role: true, accessProfileMode: true } });
    if (!user?.isActive || !internalWorkspaceRoles.includes(user.role)) throw new ForbiddenException('Нет доступа к графикам CRM');
    const [roles, overrides, departments] = await Promise.all([
      db.rolePermission.findMany({ where: { role: user.role }, select: { permission: { select: { key: true } } } }),
      db.userPermission.findMany({ where: { userId: id }, select: { effect: true, permission: { select: { key: true } } } }),
      db.crmDepartment.findMany({ where: { leaderId: id, archivedAt: null }, select: { id: true } }),
    ]);
    const permissions = new Set((await employeeAccess(db, user, roles, overrides)).permissions);
    if (!permissions.has('work_schedule.read')) throw new ForbiddenException('Нет разрешения на просмотр графиков');
    return { ...user, permissions, company: ['ADMIN', 'EXECUTIVE'].includes(user.role), departments: departments.map(d => d.id) };
  }

  private where(actor: Awaited<ReturnType<WorkScheduleService['actor']>>): Prisma.CrmWorkScheduleWhereInput {
    if (actor.company) return {};
    return { OR: [
      { employeeId: actor.id, status: { in: ['PUBLISHED', 'CANCELLED'] } },
      ...actor.departments.map(departmentId => ({ departmentId, employee: { departmentId, isActive: true, role: { in: internalWorkspaceRoles } } })),
    ] };
  }

  private manages(actor: Awaited<ReturnType<WorkScheduleService['actor']>>, row: { departmentId: string | null; employee: { departmentId: string | null; isActive: boolean } }) {
    return actor.company || Boolean(row.employee.isActive && row.departmentId && row.employee.departmentId === row.departmentId && actor.departments.includes(row.departmentId));
  }

  private view(actor: Awaited<ReturnType<WorkScheduleService['actor']>>, row: ScheduleRow) {
    const { requestKey, requestHash, creatorId, ...safe } = row;
    const manages = this.manages(actor, row);
    return { ...safe, canEdit: manages && row.status === 'DRAFT' && actor.permissions.has('work_schedule.write'),
      canPublish: manages && row.status === 'DRAFT' && actor.permissions.has('work_schedule.publish'),
      canCancel: manages && row.status !== 'CANCELLED' && actor.permissions.has(row.status === 'DRAFT' ? 'work_schedule.write' : 'work_schedule.publish') };
  }

  private async row(db: Prisma.TransactionClient, actor: Awaited<ReturnType<WorkScheduleService['actor']>>, id: string) {
    const row = await db.crmWorkSchedule.findFirst({ where: { AND: [{ id }, this.where(actor)] }, include: rowInclude });
    if (!row) throw new NotFoundException('Запись графика не найдена');
    return row;
  }

  private require(actor: Awaited<ReturnType<WorkScheduleService['actor']>>, operation: string) {
    if (!actor.permissions.has('work_schedule.' + operation)) throw new ForbiddenException('Нет разрешения на эту операцию графика');
  }

  private async target(db: Prisma.TransactionClient, actor: Awaited<ReturnType<WorkScheduleService['actor']>>, employeeId: string) {
    const employee = await db.user.findFirst({ where: { id: employeeId, isActive: true, role: { in: internalWorkspaceRoles },
      ...(actor.company ? {} : { departmentId: { in: actor.departments } }) },
      select: { ...personSelect, department: { select: { name: true, archivedAt: true } } } });
    if (!employee || employee.department?.archivedAt) throw new NotFoundException('Сотрудник недоступен для назначения графика');
    return employee;
  }

  private async overlap(db: Prisma.TransactionClient, employeeId: string, fields: { startsAt: Date; endsAt: Date }, except?: string) {
    if (await db.crmWorkSchedule.count({ where: { employeeId, status: { not: 'CANCELLED' }, ...(except ? { id: { not: except } } : {}), startsAt: { lt: fields.endsAt }, endsAt: { gt: fields.startsAt } } })) {
      throw new ConflictException('У сотрудника уже есть смена, выходной или отсутствие в этом интервале. Измените время либо отмените пересекающуюся запись');
    }
  }

  private async record(db: Prisma.TransactionClient, actor: Awaited<ReturnType<WorkScheduleService['actor']>>, row: CrmWorkSchedule, action: string, reason: string) {
    const { requestKey, requestHash, ...snapshot } = row;
    await db.crmWorkScheduleEvent.create({ data: { scheduleId: row.id, version: row.version, action, actorId: actor.id,
      actorName: [actor.firstName, actor.lastName].filter(Boolean).join(' ') || 'Сотрудник CRM', reason, snapshot: JSON.parse(JSON.stringify(snapshot)) } });
    await db.auditLog.create({ data: { actorId: actor.id, resource: 'crm.work_schedule', resourceId: row.id, action, payload: { version: row.version, employeeId: row.employeeId, reason } } });
  }

  async list(id: string, query: ScheduleQueryDto) {
    const period = scheduleMonth(query.month);
    return this.transaction(async db => {
      const actor = await this.actor(db, id);
      const rows = await db.crmWorkSchedule.findMany({ where: { AND: [this.where(actor), {
        startLocal: { lt: period.end }, endLocal: { gt: period.start },
        ...(query.employeeId ? { employeeId: query.employeeId } : {}), ...(query.departmentId ? { departmentId: query.departmentId } : {}),
        ...(query.status ? { status: query.status } : { status: { not: 'CANCELLED' } }),
      }] }, orderBy: [{ startLocal: 'asc' }, { id: 'asc' }], take: 1001, include: rowInclude });
      if (rows.length > 1000) throw new BadRequestException('В выборке больше 1000 записей. Выберите отдел или сотрудника');
      // All templates remain addressable, including those beginning in a later month.
      const patterns = await db.crmWorkPattern.findMany({ where: { AND: [this.patternWhere(actor), {
        ...(query.employeeId ? { employeeId: query.employeeId } : {}), ...(query.departmentId ? { departmentId: query.departmentId } : {}),
      }] }, orderBy: [{ startDate: 'desc' }, { id: 'asc' }], take: 501, include: rowInclude });
      if (patterns.length > 500) throw new BadRequestException('Больше 500 шаблонов. Выберите отдел или сотрудника');
      // Published manual overrides apply even when the current filter only shows drafts.
      const manual = patterns.length ? await db.crmWorkSchedule.findMany({ where: { employeeId: { in: [...new Set(patterns.map(row => row.employeeId))] },
        status: { in: ['DRAFT', 'PUBLISHED'] }, startsAt: { lt: new Date(Date.parse(period.end + ':00Z') + 3 * 86400000) }, endsAt: { gt: new Date(Date.parse(period.start + ':00Z') - 3 * 86400000) } }, take: 5001,
        select: { employeeId: true, startsAt: true, endsAt: true, status: true } }) : [];
      if (manual.length > 5000) throw new BadRequestException('Слишком много исключений. Сузьте выборку');
      const virtual: any[] = [], warnings: { patternId: string; date: string; message: string }[] = [];
      for (const pattern of patterns.filter(row => row.status !== 'CANCELLED' && (!query.status || row.status === query.status))) {
        const generated = patternDays(pattern, addDays(period.start.slice(0, 10), -1), addDays(period.end.slice(0, 10), -1));
        warnings.push(...generated.issues.map(issue => ({ ...issue, patternId: pattern.id })));
        for (const occurrence of generated.items) {
          if (occurrence.startLocal >= period.end || occurrence.endLocal <= period.start || manualOverrides(occurrence, manual.filter(row => row.employeeId === pattern.employeeId), pattern.status)) continue;
          virtual.push({ ...occurrence, id: `pattern:${pattern.id}:${occurrence.occurrenceDate}`, patternId: pattern.id, patternLabel: patternLabels[pattern.pattern],
            employeeId: pattern.employeeId, employee: pattern.employee, departmentId: pattern.departmentId, departmentName: pattern.departmentName,
            status: pattern.status, version: pattern.version, canEdit: false, canPublish: false, canCancel: false });
        }
        if (virtual.length + rows.length > 1000) throw new BadRequestException('В календаре больше 1000 записей. Выберите отдел или сотрудника');
      }
      const items = [...rows.map(row => this.view(actor, row)), ...virtual].sort((a, b) => a.startLocal.localeCompare(b.startLocal) || a.id.localeCompare(b.id));
      return { items, patterns: patterns.map(row => this.patternView(actor, row)), warnings, totals: { entries: items.length,
        draftMinutes: items.filter(row => row.status === 'DRAFT').reduce((sum, row) => sum + row.plannedMinutes, 0),
        publishedMinutes: items.filter(row => row.status === 'PUBLISHED').reduce((sum, row) => sum + row.plannedMinutes, 0) },
        canCreate: actor.permissions.has('work_schedule.write') && (actor.company || actor.departments.length > 0),
        canPublishPatterns: actor.permissions.has('work_schedule.publish') && (actor.company || actor.departments.length > 0) };
    });
  }

  async options(id: string) {
    return this.transaction(async db => {
      const actor = await this.actor(db, id);
      const departments = await db.crmDepartment.findMany({ where: { archivedAt: null, ...(actor.company ? {} : { id: { in: actor.departments } }) }, select: { id: true, name: true }, orderBy: { name: 'asc' } });
      const people = await db.user.findMany({ where: { isActive: true, role: { in: internalWorkspaceRoles },
        ...(actor.company ? {} : { OR: [{ id: actor.id }, { departmentId: { in: actor.departments } }] }) }, select: { ...personSelect, department: { select: { archivedAt: true } } }, orderBy: [{ lastName: 'asc' }, { id: 'asc' }], take: 501 });
      if (people.length > 500) throw new BadRequestException('Для более 500 сотрудников требуется постраничный справочник графиков');
      return { departments, people: people.map(({ department, ...person }) => ({ ...person, canAssign: actor.permissions.has('work_schedule.write') && !department?.archivedAt && (actor.company || Boolean(person.departmentId && actor.departments.includes(person.departmentId))) })) };
    });
  }

  async detail(id: string, scheduleId: string) {
    return this.transaction(async db => {
      const actor = await this.actor(db, id), row = await this.row(db, actor, scheduleId);
      const events = await db.crmWorkScheduleEvent.findMany({ where: { scheduleId, ...(this.manages(actor, row) ? {} : { action: { in: ['PUBLISHED', 'CANCELLED'] } }) },
        orderBy: { version: 'desc' }, take: 50, select: { version: true, action: true, actorName: true, reason: true, createdAt: true } });
      return { ...this.view(actor, row), events };
    });
  }

  async create(id: string, dto: CreateScheduleDto) {
    const fields = scheduleFields(dto), hash = createHash('sha256').update(JSON.stringify({ ...fields, employeeId: dto.employeeId })).digest('hex');
    return this.transaction(async db => {
      const actor = await this.actor(db, id); this.require(actor, 'write');
      await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`work-schedule:${dto.employeeId}`}))`;
      const employee = await this.target(db, actor, dto.employeeId);
      const existing = await db.crmWorkSchedule.findUnique({ where: { creatorId_requestKey: { creatorId: id, requestKey: dto.requestKey } }, include: rowInclude });
      if (existing) {
        await this.row(db, actor, existing.id);
        if (existing.requestHash !== hash) throw new ConflictException('Этот ключ сохранения уже использован для другого графика');
        return this.view(actor, existing);
      }
      await this.overlap(db, employee.id, fields);
      const row = await db.crmWorkSchedule.create({ data: { ...fields, employeeId: employee.id, creatorId: id, departmentId: employee.departmentId,
        departmentName: employee.department?.name || '', requestKey: dto.requestKey, requestHash: hash }, include: rowInclude });
      await this.record(db, actor, row, 'CREATE', 'Создан черновик');
      return this.view(actor, row);
    });
  }

  async update(id: string, scheduleId: string, dto: UpdateScheduleDto) {
    const fields = scheduleFields(dto);
    return this.transaction(async db => {
      const actor = await this.actor(db, id); this.require(actor, 'write');
      const row = await this.row(db, actor, scheduleId);
      if (!this.view(actor, row).canEdit) throw new ForbiddenException('Редактируется только доступный черновик. Опубликованную запись сначала отмените с причиной');
      await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`work-schedule:${row.employeeId}`}))`;
      if (row.version !== dto.version) throw new ConflictException('Запись уже изменена. Обновите карточку; черновик оставлен в форме');
      const employee = await this.target(db, actor, row.employeeId);
      if (employee.departmentId !== row.departmentId) throw new ConflictException('Сотрудник переведён. Отмените прежнюю запись и создайте график в новом отделе');
      await this.overlap(db, row.employeeId, fields, row.id);
      const updated = await db.crmWorkSchedule.update({ where: { id: row.id }, data: { ...fields, version: { increment: 1 } }, include: rowInclude });
      await this.record(db, actor, updated, 'UPDATE', dto.reason);
      return this.view(actor, updated);
    });
  }

  async transition(id: string, scheduleId: string, dto: ScheduleTransitionDto) {
    return this.transaction(async db => {
      const actor = await this.actor(db, id), row = await this.row(db, actor, scheduleId);
      const controls = this.view(actor, row);
      if (!(dto.status === 'PUBLISHED' ? controls.canPublish : controls.canCancel)) throw new ForbiddenException('Нет доступа к этому изменению состояния графика');
      await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`work-schedule:${row.employeeId}`}))`;
      if (row.version !== dto.version) throw new ConflictException('Состояние графика изменено. Обновите карточку');
      if(row.status==='PUBLISHED'||dto.status==='PUBLISHED'){
        await lockTimeEmployee(db,row.employeeId);
        await requireOpenTime(db,row.employeeId,row.startsAt,row.endsAt);
      }
      if (dto.status === 'PUBLISHED') {
        const employee = await this.target(db, actor, row.employeeId);
        if (employee.departmentId !== row.departmentId) throw new ConflictException('Сотрудник переведён в другой отдел. Создайте новый график');
        await this.overlap(db, row.employeeId, row, row.id);
      }
      const updated = await db.crmWorkSchedule.update({ where: { id: row.id }, data: { status: dto.status, version: { increment: 1 } }, include: rowInclude });
      await this.record(db, actor, updated, dto.status, dto.reason);
      return this.view(actor, updated);
    });
  }

  private patternWhere(actor: Awaited<ReturnType<WorkScheduleService['actor']>>): Prisma.CrmWorkPatternWhereInput {
    if (actor.company) return {};
    return { OR: [{ employeeId: actor.id, status: { in: ['PUBLISHED', 'CANCELLED'] } },
      ...actor.departments.map(departmentId => ({ departmentId, employee: { departmentId, isActive: true, role: { in: internalWorkspaceRoles } } }))] };
  }
  private patternView(actor: Awaited<ReturnType<WorkScheduleService['actor']>>, row: PatternRow) {
    const { requestKey, requestHash, creatorId, ...safe } = row;
    const manage = this.manages(actor, row), today = localStamp(new Date(), row.timezone).slice(0, 10);
    return { ...safe, label: patternLabels[row.pattern], today,
      canPublish: manage && row.status === 'DRAFT' && actor.permissions.has('work_schedule.publish'),
      canEnd: manage && row.status === 'PUBLISHED' && (!row.endDate || row.endDate >= today) && actor.permissions.has('work_schedule.publish'),
      canCancel: manage && (row.status === 'DRAFT' && actor.permissions.has('work_schedule.write') || row.status === 'PUBLISHED' && row.startDate > today && actor.permissions.has('work_schedule.publish')) };
  }
  private async patternRow(db: Prisma.TransactionClient, actor: Awaited<ReturnType<WorkScheduleService['actor']>>, id: string) {
    const row = await db.crmWorkPattern.findFirst({ where: { AND: [{ id }, this.patternWhere(actor)] }, include: rowInclude });
    if (!row) throw new NotFoundException('Шаблон графика не найден'); return row;
  }
  private async patternOverlap(db: Prisma.TransactionClient, employeeId: string, rule: PatternFields, except?: string) {
    const others = await db.crmWorkPattern.findMany({ where: { employeeId, status: { not: 'CANCELLED' }, ...(except ? { id: { not: except } } : {}) }, take: 501 });
    if (others.length > 500) throw new BadRequestException('Превышен предел шаблонов сотрудника');
    for (const other of others) {
      if (rule.startDate <= (other.endDate || '9999-12-31') && other.startDate <= (rule.endDate || '9999-12-31')) throw new ConflictException('У сотрудника уже есть шаблон на этот период. Сначала завершите прежний график или отмените его черновик');
      // Different wall-clock dates can still overlap at an overnight/timezone boundary.
      const boundary = rule.startDate > other.startDate ? rule.startDate : other.startDate;
      const a = patternDays(rule, addDays(boundary, -2), addDays(boundary, 2)).items, b = patternDays(other, addDays(boundary, -2), addDays(boundary, 2)).items;
      if (a.some(one => b.some(two => one.startsAt < two.endsAt && one.endsAt > two.startsAt))) throw new ConflictException('Граница нового шаблона пересекает ночную смену или отдых прежнего графика. Уточните дату и время начала');
    }
  }
  private async patternRecord(db: Prisma.TransactionClient, actor: Awaited<ReturnType<WorkScheduleService['actor']>>, row: CrmWorkPattern, action: string, reason: string) {
    const { requestKey, requestHash, ...snapshot } = row;
    await db.crmWorkPatternEvent.create({ data: { patternId: row.id, version: row.version, action, actorId: actor.id,
      actorName: [actor.firstName, actor.lastName].filter(Boolean).join(' ') || 'Сотрудник CRM', reason, snapshot: JSON.parse(JSON.stringify(snapshot)) } });
    await db.auditLog.create({ data: { actorId: actor.id, resource: 'crm.work_pattern', resourceId: row.id, action, payload: { version: row.version, reason } } });
  }
  async previewPattern(id: string, dto: CreateWorkPatternDto) {
    const fields = workPatternFields(dto);
    return this.transaction(async db => {
      const actor = await this.actor(db, id); this.require(actor, 'write');
      await this.target(db, actor, dto.employeeId); if (dto.status === 'PUBLISHED') this.require(actor, 'publish');
      await this.patternOverlap(db, dto.employeeId, fields);
      const to = addDays(fields.startDate, 34), generated = patternDays(fields, fields.startDate, to);
      const manual = await db.crmWorkSchedule.findMany({ where: { employeeId: dto.employeeId, status: { not: 'CANCELLED' },
        startsAt: { lt: new Date(addDays(to, 3) + 'T00:00Z') }, endsAt: { gt: new Date(addDays(fields.startDate, -2) + 'T00:00Z') } }, take: 5001 });
      if (manual.length > 5000) throw new BadRequestException('Слишком много ручных записей для предпросмотра');
      return { from: fields.startDate, to: fields.endDate && fields.endDate < to ? fields.endDate : to, issues: generated.issues,
        items: generated.items.map(row => ({ ...row, overridden: manualOverrides(row, manual, dto.status) })),
        permanent: !fields.endDate, label: patternLabels[fields.pattern] };
    });
  }
  async createPattern(id: string, dto: CreateWorkPatternDto) {
    const fields = workPatternFields(dto), hash = createHash('sha256').update(JSON.stringify({ ...fields, employeeId: dto.employeeId, status: dto.status })).digest('hex');
    return this.transaction(async db => {
      const actor = await this.actor(db, id); this.require(actor, 'write'); if (dto.status === 'PUBLISHED') this.require(actor, 'publish');
      await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`work-schedule:${dto.employeeId}`}))`;
      const employee = await this.target(db, actor, dto.employeeId);
      const existing = await db.crmWorkPattern.findUnique({ where: { creatorId_requestKey: { creatorId: id, requestKey: dto.requestKey } }, include: rowInclude });
      if (existing) { await this.patternRow(db, actor, existing.id); if (existing.requestHash !== hash) throw new ConflictException('Ключ сохранения уже использован для другого шаблона'); return this.patternView(actor, existing); }
      await this.patternOverlap(db, employee.id, fields);
      if(dto.status==='PUBLISHED'){
        await lockTimeEmployee(db,employee.id);const range=patternChangeRange(fields);
        await requireOpenTime(db,employee.id,range.start,range.end);
      }
      const row = await db.crmWorkPattern.create({ data: { ...fields, employeeId: employee.id, creatorId: id, departmentId: employee.departmentId, departmentName: employee.department?.name || '', status: dto.status, requestKey: dto.requestKey, requestHash: hash }, include: rowInclude });
      await this.patternRecord(db, actor, row, dto.status === 'PUBLISHED' ? 'PUBLISH' : 'CREATE', 'Назначен повторяющийся график');
      return this.patternView(actor, row);
    });
  }
  async patternDetail(id: string, patternId: string) {
    return this.transaction(async db => {
      const actor = await this.actor(db, id), row = await this.patternRow(db, actor, patternId);
      const events = await db.crmWorkPatternEvent.findMany({ where: { patternId, ...(this.manages(actor, row) ? {} : { action: { not: 'CREATE' } }) }, orderBy: { version: 'desc' }, take: 50,
        select: { version: true, action: true, actorName: true, reason: true, createdAt: true } });
      return { ...this.patternView(actor, row), events };
    });
  }
  async patternAction(id: string, patternId: string, dto: WorkPatternActionDto) {
    return this.transaction(async db => {
      const actor = await this.actor(db, id), row = await this.patternRow(db, actor, patternId), controls = this.patternView(actor, row);
      if (!(dto.action === 'PUBLISH' ? controls.canPublish : dto.action === 'END' ? controls.canEnd : controls.canCancel)) throw new ForbiddenException('Нет разрешения на это изменение шаблона');
      await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`work-schedule:${row.employeeId}`}))`;
      if (row.version !== dto.version) throw new ConflictException('Шаблон изменён. Обновите карточку');
      if (dto.action === 'PUBLISH') {
        const employee = await this.target(db, actor, row.employeeId);
        if (employee.departmentId !== row.departmentId) throw new ConflictException('Сотрудник переведён. Назначьте новый график в текущем отделе');
        await this.patternOverlap(db, row.employeeId, row, row.id);
      }
      let endDate = row.endDate;
      if (dto.action === 'END') {
        patternDate(dto.endDate || '');
        if (dto.endDate! < controls.today || dto.endDate! < row.startDate || row.endDate && dto.endDate! > row.endDate) throw new BadRequestException('График можно завершить не раньше сегодняшнего дня и его начала; прошлые даты не меняются');
        endDate = dto.endDate!;
      } else if (dto.endDate) throw new BadRequestException('Дата окончания задаётся только при завершении графика');
      if(row.status==='PUBLISHED'||dto.action==='PUBLISH'){
        await lockTimeEmployee(db,row.employeeId);const range=patternChangeRange(row,dto.action==='END'?endDate!:undefined);
        await requireOpenTime(db,row.employeeId,range.start,range.end);
      }
      const updated = await db.crmWorkPattern.update({ where: { id: row.id }, data: { endDate, status: dto.action === 'PUBLISH' ? 'PUBLISHED' : dto.action === 'CANCEL' ? 'CANCELLED' : row.status, version: { increment: 1 } }, include: rowInclude });
      await this.patternRecord(db, actor, updated, dto.action, dto.reason);
      return this.patternView(actor, updated);
    });
  }
}
