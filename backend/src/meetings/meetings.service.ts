import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { internalWorkspaceRoles } from '../auth/workspace-role-catalog';
import { effectivePermissions } from '../auth/effective-permissions';
import { CancelMeetingDto, CreateMeetingDto, MeetingFieldsDto, MeetingListDto, UpdateMeetingDto } from './meeting.dto';
import { canManageMeeting, companyMeetings, MeetingActor, meetingVisibility, validateMeetingTimes } from './meeting-policy';

const person = { id: true, firstName: true, lastName: true, isActive: true } as const;
const include = { organizer: { select: person }, members: { select: { user: { select: person } }, orderBy: { userId: 'asc' as const } } };
type MeetingRow = Prisma.CrmMeetingGetPayload<{ include: typeof include }>;

@Injectable()
export class MeetingsService {
  constructor(private readonly prisma: PrismaService) {}

  async actor(db: Prisma.TransactionClient, id: string): Promise<MeetingActor> {
    const user = await db.user.findUnique({ where: { id }, select: { id: true, role: true, isActive: true, departmentId: true } });
    if (!user?.isActive || !internalWorkspaceRoles.includes(user.role)) throw new ForbiddenException('Учётная запись сотрудника недоступна');
    const [roles, overrides] = await Promise.all([
      db.rolePermission.findMany({ where: { role: user.role }, select: { permission: { select: { key: true } } } }),
      db.userPermission.findMany({ where: { userId: id }, select: { effect: true, permission: { select: { key: true } } } }),
    ]);
    const permissions = new Set(effectivePermissions(roles, overrides).permissions);
    if (!permissions.has('meetings.read')) throw new ForbiddenException('Нет доступа к встречам');
    return { ...user, permissions };
  }
  private view(row: MeetingRow, actor: MeetingActor) {
    const { requestHash, requestKey, members, ...safe } = row;
    return { ...safe, members: members.map(member => member.user), canManage: row.status === 'SCHEDULED' && canManageMeeting(actor, row.organizerId), videoAvailable: false };
  }
  private staffWhere(actor: MeetingActor): Prisma.UserWhereInput {
    return { isActive: true, role: { in: internalWorkspaceRoles }, ...(companyMeetings(actor) ? {} : { OR: [{ id: actor.id }, ...(actor.departmentId ? [{ departmentId: actor.departmentId, department: { archivedAt: null } }] : [])] }) };
  }
  private async members(db: Prisma.TransactionClient, actor: MeetingActor, dto: MeetingFieldsDto, organizerId = actor.id) {
    const ids = [...new Set(dto.memberIds)].sort();
    if (ids.length > 9 || ids.includes(organizerId)) throw new BadRequestException('Организатор включён автоматически; добавьте не больше 9 сотрудников');
    const count = await db.user.count({ where: { AND: [this.staffWhere(actor), { id: { in: ids } }] } });
    if (count !== ids.length) throw new BadRequestException('Часть участников недоступна: выберите активных сотрудников из разрешённого отдела');
    return ids;
  }
  private async audit(db: Prisma.TransactionClient, actor: MeetingActor, id: string, action: string, payload: Prisma.InputJsonValue) {
    await db.auditLog.create({ data: { actorId: actor.id, resource: 'crm.meeting', resourceId: id, action, payload } });
  }
  async transaction<T>(run: (db: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    try { return await this.prisma.$transaction(run, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15000 }); }
    catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && ['P2034', 'P2002'].includes(error.code)) throw new ConflictException('Встреча изменилась одновременно. Обновите данные и повторите действие.'); throw error; }
  }
  async list(actorId: string, query: MeetingListDto) {
    const from = new Date(query.from), to = new Date(query.to);
    if (!Number.isFinite(+from) || !Number.isFinite(+to) || to <= from || +to - +from > 93 * 86400000) throw new BadRequestException('Выберите период до 93 дней');
    return this.transaction(async db => {
      const actor = await this.actor(db, actorId), page = query.page || 1, limit = query.limit || 30;
      const where: Prisma.CrmMeetingWhereInput = { AND: [meetingVisibility(actor), { startsAt: { lt: to }, endsAt: { gt: from }, ...(query.status === 'ALL' ? {} : { status: query.status === 'CANCELLED' ? 'CANCELLED' : 'SCHEDULED' }), ...(query.q?.trim() ? { title: { contains: query.q.trim(), mode: 'insensitive' } } : {}) }] };
      const [items, total] = await Promise.all([db.crmMeeting.findMany({ where, include, orderBy: [{ startsAt: 'asc' }, { id: 'asc' }], take: limit, skip: (page - 1) * limit }), db.crmMeeting.count({ where })]);
      return { items: items.map(row => this.view(row, actor)), total, page, pages: Math.max(1, Math.ceil(total / limit)), canCreate: actor.permissions.has('meetings.write'), videoAvailable: false };
    });
  }
  async detail(actorId: string, id: string) {
    return this.transaction(async db => {
      const actor = await this.actor(db, actorId);
      const row = await db.crmMeeting.findFirst({ where: { AND: [{ id }, meetingVisibility(actor)] }, include });
      if (!row) throw new NotFoundException('Встреча не найдена');
      return this.view(row, actor);
    });
  }
  async team(actorId: string, q = '') {
    if (typeof q !== 'string' || q.length > 80) throw new BadRequestException('Укажите поисковую строку до 80 символов');
    return this.transaction(async db => {
      const actor = await this.actor(db, actorId);
      if (!actor.permissions.has('meetings.write')) throw new ForbiddenException('Нет права планировать встречи');
      const items = await db.user.findMany({ where: { AND: [this.staffWhere(actor), { id: { not: actor.id } }, ...(q.trim() ? [{ OR: [{ firstName: { contains: q.trim(), mode: 'insensitive' as const } }, { lastName: { contains: q.trim(), mode: 'insensitive' as const } }] }] : [])] }, select: person, orderBy: [{ firstName: 'asc' }, { id: 'asc' }], take: 101 });
      return { items: items.slice(0, 100), hasMore: items.length > 100 };
    });
  }
  async create(actorId: string, dto: CreateMeetingDto) {
    return this.transaction(async db => {
      const actor = await this.actor(db, actorId);
      if (!actor.permissions.has('meetings.write')) throw new ForbiddenException('Нет права планировать встречи');
      await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`meeting-create:${actor.id}`}))`;
      const hash = createHash('sha256').update(JSON.stringify({ title: dto.title.trim(), agenda: dto.agenda.trim(), kind: dto.kind, startsAt: dto.startsAt, endsAt: dto.endsAt, timezone: dto.timezone, memberIds: [...dto.memberIds].sort() })).digest('hex');
      const existing = await db.crmMeeting.findUnique({ where: { organizerId_requestKey: { organizerId: actor.id, requestKey: dto.requestKey } }, include });
      if (existing) { if (existing.requestHash !== hash) throw new ConflictException('Ключ запроса уже использован для другой встречи'); return this.view(existing, actor); }
      const times = validateMeetingTimes(dto.startsAt, dto.endsAt, dto.timezone), ids = await this.members(db, actor, dto);
      const row = await db.crmMeeting.create({ data: { title: dto.title.trim(), agenda: dto.agenda.trim(), kind: dto.kind, ...times, timezone: dto.timezone, organizerId: actor.id, requestKey: dto.requestKey, requestHash: hash, members: { create: ids.map(userId => ({ userId })) } }, include });
      await this.audit(db, actor, row.id, 'CREATE', { version: row.version, memberIds: ids });
      return this.view(row, actor);
    });
  }
  async update(actorId: string, id: string, dto: UpdateMeetingDto) {
    return this.transaction(async db => {
      const actor = await this.actor(db, actorId), row = await this.editable(db, actor, id, dto.version);
      const times = validateMeetingTimes(dto.startsAt, dto.endsAt, dto.timezone);
      // When an admin edits another organizer's meeting, the organizer is still automatic.
      if (dto.memberIds.includes(row.organizerId)) throw new BadRequestException('Организатор уже включён во встречу');
      const ids = await this.members(db, actor, dto, row.organizerId);
      const moved = +times.startsAt !== +row.startsAt || +times.endsAt !== +row.endsAt;
      if (moved) await this.revokeGuests(db, id);
      else {
        const reserved = await db.crmMeetingInvitation.count({ where: { meetingId: id, revokedAt: null, expiresAt: { gt: new Date() } } });
        if (ids.length + reserved > 9) throw new BadRequestException('Всего до 10 участников, включая организатора и гостевые приглашения. Сначала отзовите лишние приглашения.');
      }
      await db.crmMeetingMember.deleteMany({ where: { meetingId: id } });
      await this.closeMedia(db, id, 'MEETING_CHANGED');
      const updated = await db.crmMeeting.update({ where: { id }, data: { title: dto.title.trim(), agenda: dto.agenda.trim(), kind: dto.kind, ...times, timezone: dto.timezone, version: { increment: 1 }, members: { create: ids.map(userId => ({ userId })) } }, include });
      await this.audit(db, actor, id, 'UPDATE', { fromVersion: row.version, version: updated.version, fields: ['title', 'agenda', 'kind', 'startsAt', 'endsAt', 'timezone', 'members'] });
      return this.view(updated, actor);
    });
  }
  async cancel(actorId: string, id: string, dto: CancelMeetingDto) {
    return this.transaction(async db => {
      const actor = await this.actor(db, actorId), row = await this.editable(db, actor, id, dto.version);
      await this.revokeGuests(db, id);
      await this.closeMedia(db, id, 'MEETING_CANCELLED');
      const updated = await db.crmMeeting.update({ where: { id }, data: { status: 'CANCELLED', cancelledAt: new Date(), cancellationReason: dto.reason.trim(), version: { increment: 1 } }, include });
      await this.audit(db, actor, id, 'CANCEL', { fromVersion: row.version, version: updated.version });
      return this.view(updated, actor);
    });
  }
  private async revokeGuests(db: Prisma.TransactionClient, meetingId: string) {
    await db.crmMeetingInvitation.updateMany({ where: { meetingId, revokedAt: null }, data: { revokedAt: new Date(), version: { increment: 1 } } });
    await db.crmMeetingGuest.updateMany({ where: { invitation: { meetingId }, status: { in: ['WAITING','ADMITTED'] } }, data: { status: 'REVOKED', decidedAt: new Date(), version: { increment: 1 } } });
  }
  private async closeMedia(db: Prisma.TransactionClient, meetingId: string, reason: string) {
    await db.crmMeetingMediaRoom.updateMany({where:{meetingId,closedAt:null},data:{closedAt:new Date(),closeReason:reason,version:{increment:1}}});
    await db.crmMeetingMediaSession.updateMany({where:{room:{meetingId},revokedAt:null},data:{revokedAt:new Date()}});
  }
  private async editable(db: Prisma.TransactionClient, actor: MeetingActor, id: string, version: number) {
    await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`meeting:${id}`}))`;
    const row = await db.crmMeeting.findFirst({ where: { AND: [{ id }, meetingVisibility(actor)] } });
    if (!row) throw new NotFoundException('Встреча не найдена');
    if (!canManageMeeting(actor, row.organizerId)) throw new ForbiddenException('Встречу изменяет организатор или администратор с отдельным правом');
    if (row.version !== version) throw new ConflictException('Встреча уже изменена. Обновите карточку; ваш черновик пока сохранён.');
    if (row.status !== 'SCHEDULED') throw new ConflictException('Отменённую встречу нельзя изменить');
    return row;
  }
}
