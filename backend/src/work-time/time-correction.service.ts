import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { employeeAccess } from '../auth/employee-access';
import { internalWorkspaceRoles } from '../auth/workspace-role-catalog';
import { CreateTimeCorrectionDto, DecideTimeCorrectionDto, TimeCorrectionQueryDto } from './time-correction.dto';
import { correctionFields, proposalView, timeSnapshot } from './time-correction.policy';
import { timeTotals } from './work-time.policy';
import { lockTimeEmployee, requireOpenTime } from './timesheet-closing.policy';
const employeeSelect = { id: true, firstName: true, lastName: true, departmentId: true, isActive: true, role: true, accessProfileMode: true } as const;
const include = { employee: { select: employeeSelect }, session: { select: { version: true } } } as const;
type Correction = Prisma.CrmWorkTimeCorrectionGetPayload<{ include: typeof include }>;
@Injectable()
export class TimeCorrectionService {
  constructor(private readonly prisma: PrismaService) {}
  private async transaction<T>(callback: (db: Prisma.TransactionClient) => Promise<T>, read = false) {
    try { return await this.prisma.$transaction(callback, { isolationLevel: read ? Prisma.TransactionIsolationLevel.RepeatableRead : Prisma.TransactionIsolationLevel.ReadCommitted, timeout: 15000 }); }
    catch (e) { if (e instanceof Prisma.PrismaClientKnownRequestError && ['P2002','P2034'].includes(e.code)) throw new ConflictException('Заявка или рабочий день уже изменены. Обновите данные; повторную заявку не создавайте'); throw e; }
  }
  private async actor(db: Prisma.TransactionClient, id: string) {
    const user = await db.user.findUnique({ where: { id }, select: { ...employeeSelect, accessProfileMode: true, timezone: true } });
    if (!user?.isActive || !internalWorkspaceRoles.includes(user.role)) throw new ForbiddenException('Нет доступа к рабочему времени');
    const [roles, overrides] = await Promise.all([
      db.rolePermission.findMany({ where: { role: user.role }, select: { permission: { select: { key: true } } } }),
      db.userPermission.findMany({ where: { userId: id }, select: { effect: true, permission: { select: { key: true } } } }),
    ]);
    const permissions = (await employeeAccess(db, user, roles, overrides)).permissions;
    if (!permissions.includes('work_time.read')) throw new ForbiddenException('Нет доступа к рабочему времени');
    const company = ['ADMIN','EXECUTIVE'].includes(user.role);
    const departments = permissions.includes('work_time.review') && !company ? (await db.crmDepartment.findMany({ where: { leaderId: id, archivedAt: null }, select: { id: true } })).map(row => row.id) : [];
    return { ...user, company, departments, canTrack: permissions.includes('work_time.track'), canReview: permissions.includes('work_time.review') && (company || departments.length > 0) };
  }
  private team(actor: Awaited<ReturnType<TimeCorrectionService['actor']>>): Prisma.CrmWorkTimeCorrectionWhereInput {
    if (!actor.canReview) throw new ForbiddenException('Нет доступа к проверке времени команды');
    return actor.company ? { employee: { role: { in: internalWorkspaceRoles } } } : { OR: actor.departments.map(departmentId => ({ departmentId, employee: { departmentId, isActive: true, role: { in: internalWorkspaceRoles } } })) };
  }
  private canManage(actor: Awaited<ReturnType<TimeCorrectionService['actor']>>, row: Correction) {
    return actor.canReview && internalWorkspaceRoles.includes(row.employee.role) && (actor.company || Boolean(row.departmentId && row.employee.isActive && row.employee.departmentId === row.departmentId && actor.departments.includes(row.departmentId)));
  }
  private view(actor: Awaited<ReturnType<TimeCorrectionService['actor']>>, row: Correction, now: Date) {
    const stale = row.status === 'PENDING' && Boolean(row.sessionId && row.session?.version !== row.baseVersion);
    const canDecide = row.status === 'PENDING' && row.employeeId !== actor.id && this.canManage(actor, row);
    return { id: row.id, sessionId: row.sessionId, employee: { id: row.employee.id, firstName: row.employee.firstName, lastName: row.employee.lastName },
      baseVersion: row.baseVersion, version: row.version, reason: row.reason, status: row.status, createdAt: row.createdAt,
      proposal: proposalView(row, now), original: row.original, reviewerName: row.reviewerName, reviewedAt: row.reviewedAt, reviewNote: row.reviewNote,
      stale, canApprove: canDecide && !stale, canReject: canDecide, canCancel: row.status === 'PENDING' && row.employeeId === actor.id && actor.canTrack };
  }
  private async now(db: Prisma.TransactionClient) { const [r] = await db.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`; return r.now; }
  private async accessible(db: Prisma.TransactionClient, actor: Awaited<ReturnType<TimeCorrectionService['actor']>>, id: string) {
    const row = await db.crmWorkTimeCorrection.findUnique({ where: { id }, include });
    if (!row || row.employeeId !== actor.id && !this.canManage(actor, row)) throw new NotFoundException('Заявка не найдена');
    return row;
  }
  private async overlap(db: Prisma.TransactionClient, employeeId: string, startedAt: Date, endedAt: Date, except?: string | null) {
    if (await db.crmWorkSession.count({ where: { employeeId, ...(except ? { id: { not: except } } : {}), startedAt: { lt: endedAt }, OR: [{ endedAt: null }, { endedAt: { gt: startedAt } }] } })) throw new ConflictException('Предложенное время пересекается с другой отметкой сотрудника');
  }
  async options(id: string) { return this.transaction(async db => { const actor = await this.actor(db, id); return { canCreate: actor.canTrack, canReview: actor.canReview, timezone: actor.timezone }; }, true); }
  async list(id: string, query: TimeCorrectionQueryDto) {
    return this.transaction(async db => {
      const actor = await this.actor(db, id), now = await this.now(db);
      const where: Prisma.CrmWorkTimeCorrectionWhereInput = { AND: [query.scope === 'REVIEW' ? { ...this.team(actor), employeeId: { not: id } } : { employeeId: id }, ...(query.status ? [{ status: query.status }] : [])] };
      const total = await db.crmWorkTimeCorrection.count({ where });
      const items = await db.crmWorkTimeCorrection.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 25, skip: (query.page - 1)*25, include });
      // Own requests stay out of the review queue: they require a different reviewer.
      // Explain their absence without mixing them into the team's total or pagination.
      const ownPendingTotal = query.scope === 'REVIEW' ? await db.crmWorkTimeCorrection.count({ where: { employeeId: id, status: 'PENDING' } }) : undefined;
      return { items: items.map(row => this.view(actor,row,now)), total, page: query.page, pages: Math.max(1, Math.ceil(total/25)),
        ...(query.scope === 'REVIEW' ? { ownPendingTotal, reviewScope: actor.company ? 'COMPANY' : 'DEPARTMENTS' } : {}) };
    }, true);
  }
  async detail(id: string, correctionId: string) { return this.transaction(async db => { const actor = await this.actor(db,id); return this.view(actor,await this.accessible(db,actor,correctionId),await this.now(db)); }, true); }
  async unclosed(id: string, page: number) {
    return this.transaction(async db => {
      const actor = await this.actor(db,id), now = await this.now(db);
      const where: Prisma.CrmWorkSessionWhereInput = { AND: [this.team(actor) as Prisma.CrmWorkSessionWhereInput, { employeeId: { not: id }, endedAt: null, startedAt: { lte: new Date(+now - 86400000) } }] };
      const total = await db.crmWorkSession.count({ where });
      const rows = await db.crmWorkSession.findMany({ where, include: { employee: { select: { id: true, firstName: true, lastName: true } }, breaks: true }, orderBy: [{ startedAt: 'asc' }, { id: 'asc' }], take: 25, skip: (page-1)*25 });
      return { items: rows.map(row => ({ id: row.id, employee: row.employee, startedAt: row.startedAt, timezone: row.timezone, totals: timeTotals(row,now) })), total, page, pages: Math.max(1,Math.ceil(total/25)), serverTime: now };
    }, true);
  }
  async create(id: string, dto: CreateTimeCorrectionDto) {
    const hash = createHash('sha256').update(JSON.stringify({ sessionId: dto.sessionId || null, baseVersion: dto.baseVersion || null, timezone: dto.timezone, startLocal: dto.startLocal, endLocal: dto.endLocal, breaks: dto.breaks.map(row => ({ startLocal: row.startLocal, endLocal: row.endLocal })), reason: dto.reason.trim() })).digest('hex');
    return this.transaction(async db => {
      await lockTimeEmployee(db,id);
      const actor = await this.actor(db,id), now = await this.now(db);
      if (!actor.canTrack) throw new ForbiddenException('Нет разрешения отправлять исправления своего времени');
      const exists = await db.crmWorkTimeCorrection.findUnique({ where: { employeeId_requestKey: { employeeId: id, requestKey: dto.requestKey } }, include });
      if (exists) { if (exists.requestHash !== hash) throw new ConflictException('Этот запрос уже отправлен с другими значениями'); return this.view(actor,exists,now); }
      const source = dto.sessionId ? await db.crmWorkSession.findFirst({ where: { id: dto.sessionId, employeeId: id }, include: { breaks: true } }) : null;
      if (dto.sessionId && !source) throw new NotFoundException('Отметка не найдена');
      if (source ? source.version !== dto.baseVersion : Boolean(dto.baseVersion)) throw new ConflictException('Отметка изменена. Обновите историю перед отправкой исправления');
      if ((source?.timezone || actor.timezone) !== dto.timezone) throw new ConflictException('Часовой пояс изменён. Обновите форму');
      const proposal = correctionFields(dto,now);
      await requireOpenTime(db,id,proposal.startedAt,proposal.endedAt);
      if(source)await requireOpenTime(db,id,source.startedAt,source.endedAt||now);
      await this.overlap(db,id,proposal.startedAt,proposal.endedAt,source?.id);
      if (source && await db.crmWorkTimeCorrection.count({ where: { sessionId: source.id, status: 'PENDING' } })) throw new ConflictException('Эту отметку уже проверяют. Дождитесь решения или отзовите заявку');
      const row = await db.crmWorkTimeCorrection.create({ data: { employeeId: id, departmentId: source ? source.departmentId : actor.departmentId, sessionId: source?.id, baseVersion: source?.version,
        timezone: dto.timezone, startedAt: proposal.startedAt, endedAt: proposal.endedAt, breaks: JSON.parse(JSON.stringify(proposal.breaks)), original: source ? timeSnapshot(source) : Prisma.DbNull,
        reason: dto.reason.trim(), requestKey: dto.requestKey, requestHash: hash }, include });
      await db.auditLog.create({ data: { actorId: id, resource: 'crm.work_time_correction', resourceId: row.id, action: 'SUBMIT', payload: { sessionId: source?.id || null } } });
      return this.view(actor,row,now);
    });
  }
  async decide(id: string, correctionId: string, dto: DecideTimeCorrectionDto) {
    return this.transaction(async db => {
      // The same lock as clock commands; never replace an interval changed by another device.
      const preliminary = await db.crmWorkTimeCorrection.findUnique({ where: { id: correctionId }, select: { employeeId: true } });
      if (!preliminary) throw new NotFoundException('Заявка не найдена');
      await lockTimeEmployee(db,preliminary.employeeId);
      await db.$queryRaw`SELECT id FROM "CrmWorkTimeCorrection" WHERE id = ${correctionId} FOR UPDATE`;
      const actor = await this.actor(db,id), row = await this.accessible(db,actor,correctionId), now = await this.now(db);
      if (dto.action === 'CANCEL' ? row.employeeId !== id || !actor.canTrack : row.employeeId === id || !this.canManage(actor,row)) throw new ForbiddenException('Своё исправление можно отозвать, но подтвердить его должен другой руководитель');
      const status = { APPROVE: 'APPROVED', REJECT: 'REJECTED', CANCEL: 'CANCELLED' }[dto.action];
      if (row.status !== 'PENDING') {
        if (row.reviewerId === id && row.reviewRequestKey === dto.requestKey && row.status === status && row.reviewNote === dto.note.trim() && row.version === dto.version+1) return this.view(actor,row,now);
        throw new ConflictException('Решение уже принято. Обновите заявку');
      }
      if (row.version !== dto.version) throw new ConflictException('Заявка уже изменена. Обновите данные');
      let approvedSessionId = row.sessionId;
      if (dto.action === 'APPROVE') {
        const source = row.sessionId ? await db.crmWorkSession.findUnique({ where: { id: row.sessionId }, include: { breaks: true } }) : null;
        if (row.sessionId && (!source || source.employeeId !== row.employeeId || source.version !== row.baseVersion)) throw new ConflictException('После заявки отметка изменилась. Нужна новая заявка; прежние данные не перезаписаны');
        if (+row.endedAt > +now) throw new ConflictException('Предложенное окончание ещё не наступило по серверным часам');
        await requireOpenTime(db,row.employeeId,row.startedAt,row.endedAt);
        if(source)await requireOpenTime(db,row.employeeId,source.startedAt,source.endedAt||now);
        await this.overlap(db,row.employeeId,row.startedAt,row.endedAt,row.sessionId);
        const proposal = proposalView(row,now);
        const fields = { startedAt: row.startedAt, endedAt: row.endedAt, timezone: row.timezone };
        const session = source ? await db.crmWorkSession.update({ where: { id: source.id }, data: { ...fields, version: { increment: 1 } } }) : await db.crmWorkSession.create({ data: { ...fields, employeeId: row.employeeId, departmentId: row.departmentId } });
        // Exact old intervals remain in immutable request.original and event.beforeSnapshot.
        if (source) await db.crmWorkBreak.deleteMany({ where: { sessionId: source.id } });
        if (proposal.breaks.length) await db.crmWorkBreak.createMany({ data: proposal.breaks.map(pause => ({ sessionId: session.id, ...pause })) });
        await db.crmWorkTimeEvent.create({ data: { sessionId: session.id, actorId: id, action: source ? 'CORRECTED' : 'MANUAL', version: session.version,
          requestKey: 'correction:' + row.id + ':' + dto.requestKey, requestHash: row.requestHash, createdAt: now,
          beforeSnapshot: source ? timeSnapshot(source) : Prisma.DbNull, afterSnapshot: timeSnapshot({ ...session, breaks: proposal.breaks }) } });
        approvedSessionId = session.id;
      }
      const updated = await db.crmWorkTimeCorrection.update({ where: { id: row.id }, data: { status, version: { increment: 1 }, sessionId: approvedSessionId,
        reviewerId: id, reviewerName: [actor.firstName,actor.lastName].filter(Boolean).join(' ') || 'Сотрудник CRM', reviewNote: dto.note.trim(), reviewRequestKey: dto.requestKey, reviewedAt: now }, include });
      await db.auditLog.create({ data: { actorId: id, resource: 'crm.work_time_correction', resourceId: row.id, action: dto.action, payload: { employeeId: row.employeeId, sessionId: approvedSessionId, version: updated.version } } });
      return this.view(actor,updated,now);
    });
  }
}
