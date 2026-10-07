import { BadRequestException, ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { employeeAccess } from '../auth/employee-access';
import { internalWorkspaceRoles } from '../auth/workspace-role-catalog';
import { WorkTimeCommandDto, WorkTimeQueryDto } from './work-time.dto';
import { timePeriod, timeTotals, timeZone, todayPeriod, transitionAllowed } from './work-time.policy';
import { workTimePlan } from './work-time-plan';
import { lockTimeEmployee, requireOpenTime } from './timesheet-closing.policy';

const include = { breaks: { orderBy: { startedAt: 'asc' as const } } };
type Row = Prisma.CrmWorkSessionGetPayload<{ include: typeof include }>;
@Injectable()
export class WorkTimeService {
  constructor(private readonly prisma: PrismaService) {}
  private async transaction<T>(run: (db: Prisma.TransactionClient) => Promise<T>, snapshot = false) {
    try { return await this.prisma.$transaction(run, { isolationLevel: snapshot ? Prisma.TransactionIsolationLevel.RepeatableRead : Prisma.TransactionIsolationLevel.ReadCommitted, timeout: 15000 }); }
    catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && ['P2002', 'P2034'].includes(e.code)) throw new ConflictException('Рабочий день изменился на другом устройстве. Обновите данные');
      throw e;
    }
  }
  private async actor(db: Prisma.TransactionClient, id: string) {
    const user = await db.user.findUnique({ where: { id }, select: { id: true, isActive: true, role: true, accessProfileMode: true, timezone: true, departmentId: true } });
    if (!user?.isActive || !internalWorkspaceRoles.includes(user.role)) throw new ForbiddenException('Рабочее время доступно сотрудникам CRM');
    const [roles, overrides] = await Promise.all([
      db.rolePermission.findMany({ where: { role: user.role }, select: { permission: { select: { key: true } } } }),
      db.userPermission.findMany({ where: { userId: id }, select: { effect: true, permission: { select: { key: true } } } }),
    ]);
    const { permissions } = (await employeeAccess(db, user, roles, overrides));
    if (!permissions.includes('work_time.read')) throw new ForbiddenException('Нет доступа к своему рабочему времени');
    return { ...user, canTrack: permissions.includes('work_time.track'), canPlan: permissions.includes('work_schedule.read') };
  }
  private async now(db: Prisma.TransactionClient) { const [row] = await db.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`; return row.now; }
  private view(row: Row, now: Date) {
    return { id: row.id, startedAt: row.startedAt, endedAt: row.endedAt, timezone: row.timezone, version: row.version,
      status: row.endedAt ? 'FINISHED' : row.breaks.some(item => !item.endedAt) ? 'BREAK' : 'WORKING',
      longRunning: !row.endedAt && +now - +row.startedAt >= 86400000,
      totals: timeTotals(row, now), breaks: row.breaks.map(({ startedAt, endedAt }) => ({ startedAt, endedAt })) };
  }
  async current(id: string) {
    return this.transaction(async db => {
      const actor = await this.actor(db, id), now = await this.now(db);
      const active = await db.crmWorkSession.findFirst({ where: { employeeId: id, endedAt: null }, include });
      const timezone = timeZone(active?.timezone || actor.timezone), day = todayPeriod(now, timezone);
      const rows = await db.crmWorkSession.findMany({ where: { employeeId: id, startedAt: { lt: day.end }, OR: [{ endedAt: null }, { endedAt: { gt: day.start } }] }, include, take: 501 });
      if (rows.length > 500) throw new BadRequestException('Слишком много интервалов за день. Обратитесь к администратору');
      const totals = rows.reduce((sum, row) => { const t = timeTotals(row, now, day.start, day.end); return { workedMs: sum.workedMs + t.workedMs, breakMs: sum.breakMs + t.breakMs }; }, { workedMs: 0, breakMs: 0 });
      return { serverTime: now, timezone, date: day.date, todayEndsAt: day.end, today: totals, active: active ? this.view(active, now) : null, canTrack: actor.canTrack };
    }, true);
  }
  async history(id: string, query: WorkTimeQueryDto) {
    return this.transaction(async db => {
      const actor = await this.actor(db, id), timezone = timeZone(actor.timezone), period = timePeriod(query.month, timezone), now = await this.now(db);
      const rows = await db.crmWorkSession.findMany({ where: { employeeId: id, startedAt: { lt: period.end }, OR: [...(+now > +period.start ? [{ endedAt: null }] : []), { endedAt: { gt: period.start } }] }, orderBy: [{ startedAt: 'desc' }, { id: 'desc' }], include, take: 501 });
      if (rows.length > 500) throw new BadRequestException('Больше 500 интервалов за месяц. Обратитесь к администратору');
      const plan = actor.canPlan ? await workTimePlan(db,id,period) : { available: false, plannedMs: null, shifts: null, warning: 'Нет доступа к опубликованному графику' };
      return { month: query.month, timezone, serverTime: now, canRequestCorrection: actor.canTrack, plan, items: rows.map(row => ({ ...this.view(row, now), periodTotals: timeTotals(row, now, period.start, period.end) })),
        totals: rows.reduce((sum, row) => { const t = timeTotals(row, now, period.start, period.end); return { workedMs: sum.workedMs + t.workedMs, breakMs: sum.breakMs + t.breakMs }; }, { workedMs: 0, breakMs: 0 }) };
    }, true);
  }
  async command(id: string, dto: WorkTimeCommandDto) {
    const hash = createHash('sha256').update(JSON.stringify({ action: dto.action, sessionId: dto.sessionId || null, version: dto.version })).digest('hex');
    return this.transaction(async db => {
      // Serialize all devices for the employee; clock is read AFTER acquiring the lock.
      await lockTimeEmployee(db,id);
      const actor = await this.actor(db, id);
      if (!actor.canTrack) throw new ForbiddenException('Нет разрешения отмечать рабочее время');
      const existing = await db.crmWorkTimeEvent.findUnique({ where: { actorId_requestKey: { actorId: id, requestKey: dto.requestKey } } });
      if (existing) {
        if (existing.requestHash !== hash) throw new ConflictException('Этот запрос уже использован для другого действия');
        return { sessionId: existing.sessionId, reused: true };
      }
      const current = await db.crmWorkSession.findFirst({ where: { employeeId: id, endedAt: null }, include }), now = await this.now(db);
      transitionAllowed(current, dto.action, dto.sessionId, dto.version, now);
      await requireOpenTime(db,id,current?.startedAt||now,new Date(+now+1));
      let row: { id: string; version: number };
      if (dto.action === 'START') {
        const last = await db.crmWorkSession.findFirst({ where: { employeeId: id, endedAt: { not: null } }, orderBy: { endedAt: 'desc' } });
        if (last?.endedAt && +last.endedAt > +now) throw new ConflictException('Время сервера раньше окончания предыдущего дня. Дождитесь синхронизации');
        row = await db.crmWorkSession.create({ data: { employeeId: id, departmentId: actor.departmentId, timezone: timeZone(actor.timezone), startedAt: now } });
      } else {
        const pause = current!.breaks.find(item => !item.endedAt);
        if (dto.action === 'PAUSE') await db.crmWorkBreak.create({ data: { sessionId: current!.id, startedAt: now } });
        if (pause && ['RESUME', 'FINISH'].includes(dto.action)) await db.crmWorkBreak.update({ where: { id: pause.id }, data: { endedAt: now } });
        row = await db.crmWorkSession.update({ where: { id: current!.id }, data: { version: { increment: 1 }, ...(dto.action === 'FINISH' ? { endedAt: now } : {}) } });
      }
      await db.crmWorkTimeEvent.create({ data: { sessionId: row.id, actorId: id, action: dto.action, version: row.version, requestKey: dto.requestKey, requestHash: hash, createdAt: now } });
      await db.auditLog.create({ data: { actorId: id, resource: 'crm.work_time', resourceId: row.id, action: dto.action, payload: { version: row.version, occurredAt: now.toISOString() } } });
      return { sessionId: row.id, reused: false };
    });
  }
}
