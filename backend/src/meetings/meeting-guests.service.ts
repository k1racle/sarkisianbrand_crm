import { BadRequestException, ConflictException, ForbiddenException, HttpException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomInt } from 'crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { MeetingsService } from './meetings.service';
import { canManageMeeting, meetingVisibility } from './meeting-policy';
import { CreateMeetingInvitationDto, DecideMeetingGuestDto, JoinMeetingGuestDto } from './meeting-guests.dto';
import { guestDigest, guestSecret, guestState, guestWindow } from './meeting-guest-policy';

const publicError = () => new UnauthorizedException('Приглашение или PIN недействительны. Проверьте данные у организатора.');
const includeGuest = { invitation: { include: { meeting: true } } } as const;
type GuestRow = Prisma.CrmMeetingGuestGetPayload<{include: typeof includeGuest}>;

@Injectable()
export class MeetingGuestsService {
  constructor(private readonly prisma: PrismaService, private readonly meetings: MeetingsService) {}

  // Atomic DB counters, shared between processes. Failure to reach DB fails closed.
  // Count attempts BEFORE PIN verification and outside the business transaction.
  async rate(key: string, limit: number, ttlMs: number) {
    // Prisma DateTime columns are UTC timestamp WITHOUT time zone. Explicit casts
    // prevent PostgreSQL's session timezone from shifting raw-query parameters.
    const now = new Date(), utcNow = now.toISOString(), reset = new Date(+now + ttlMs).toISOString();
    const [row] = await this.prisma.$queryRaw<{hits:number; resetAt:Date}[]>`
      INSERT INTO "CrmMeetingGuestRate" ("key","hits","resetAt") VALUES (${key},1,${reset}::timestamp)
      ON CONFLICT ("key") DO UPDATE SET
      "hits" = CASE WHEN "CrmMeetingGuestRate"."resetAt" <= ${utcNow}::timestamp THEN 1 ELSE "CrmMeetingGuestRate"."hits" + 1 END,
      "resetAt" = CASE WHEN "CrmMeetingGuestRate"."resetAt" <= ${utcNow}::timestamp THEN ${reset}::timestamp ELSE "CrmMeetingGuestRate"."resetAt" END
      RETURNING "hits","resetAt"`;
    if (row.hits > limit) throw new HttpException({ message: 'Слишком много попыток. Попробуйте позже.', retryAfter: Math.max(1, Math.ceil((+row.resetAt - +now)/1000)) },429);
    // Bounded retention cleanup; no full-table scan/delete of business records.
    if (randomInt(64) === 0) await this.prisma.$executeRaw`DELETE FROM "CrmMeetingGuestRate" WHERE "key" IN (SELECT "key" FROM "CrmMeetingGuestRate" WHERE "resetAt" < ${new Date(+now-86400000).toISOString()}::timestamp LIMIT 100)`;
  }
  private async lock(db: Prisma.TransactionClient, id: string) {
    await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`meeting:${id}`}))`;
  }
  private async managed(db: Prisma.TransactionClient, actorId: string, meetingId: string, lock=false) {
    const actor = await this.meetings.actor(db,actorId);
    if (lock) await this.lock(db,meetingId);
    const meeting = await db.crmMeeting.findFirst({ where: {AND:[{id:meetingId},meetingVisibility(actor)]}, include:{_count:{select:{members:true}}} });
    if (!meeting) throw new NotFoundException('Встреча не найдена');
    if (!canManageMeeting(actor,meeting.organizerId)) throw new ForbiddenException('Гостями управляет организатор или уполномоченный администратор');
    return meeting;
  }
  private async audit(db: Prisma.TransactionClient, meetingId: string, action: string, id: string, actorId?: string) {
    await db.auditLog.create({data:{actorId,resource:'crm.meeting',resourceId:meetingId,action,payload:{guestRecordId:id}}});
  }
  async list(actorId: string, meetingId: string) {
    return this.meetings.transaction(async db=>{
      const meeting = await this.managed(db,actorId,meetingId);
      const rows = await db.crmMeetingInvitation.findMany({where:{meetingId},include:{guest:true},orderBy:[{createdAt:'desc'},{id:'asc'}],take:100});
      const now = new Date();
      return {items:rows.map(row=>({id:row.id,label:row.label,version:row.version,createdAt:row.createdAt,expiresAt:row.expiresAt,revokedAt:row.revokedAt,
        guest:row.guest?{id:row.guest.id,displayName:row.guest.displayName,version:row.guest.version,state:guestState(row.guest,row,meeting,now),joinedAt:row.guest.joinedAt}:null})),
        reserved:rows.filter(row=>!row.revokedAt && row.expiresAt>now).length, employeeCount:meeting._count.members+1,
        canInvite:meeting.status==='SCHEDULED' && +meeting.endsAt+30*60000>+now && +meeting.startsAt<=+now+29*86400000, videoAvailable:false};
    });
  }
  async create(actorId: string, meetingId: string, dto: CreateMeetingInvitationDto) {
    const invitationToken=guestSecret(),pin=String(randomInt(100000000)).padStart(8,'0'),pinHash=await bcrypt.hash(pin,12);
    return this.meetings.transaction(async db=>{
      const meeting=await this.managed(db,actorId,meetingId,true), now=new Date();
      if(meeting.status!=='SCHEDULED'||+meeting.endsAt+30*60000<=+now)throw new ConflictException('Встреча уже завершилась по расписанию или отменена');
      if(+meeting.startsAt>+now+29*86400000)throw new ConflictException('Гостевые приглашения можно выдавать не раньше чем за 29 дней до встречи');
      if(meeting.version!==dto.version)throw new ConflictException('Обновите карточку встречи перед приглашением');
      const existing=await db.crmMeetingInvitation.findUnique({where:{meetingId_requestKey:{meetingId,requestKey:dto.requestKey}}});
      if(existing)throw new ConflictException('Приглашение уже создано. Секреты не показываются повторно: обновите список, отзовите его и создайте новое.');
      const reserved=await db.crmMeetingInvitation.count({where:{meetingId,revokedAt:null,expiresAt:{gt:now}}});
      if(reserved+meeting._count.members>=9)throw new ConflictException('Все 10 мест заняты сотрудниками или гостевыми приглашениями');
      if(await db.crmMeetingInvitation.count({where:{meetingId}})>=100)throw new ConflictException('Достигнут лимит перевыпуска приглашений для этой встречи');
      const expiresAt=new Date(Math.min(+meeting.endsAt+30*60000,+now+30*86400000));
      const row=await db.crmMeetingInvitation.create({data:{meetingId,label:dto.label,requestKey:dto.requestKey,tokenHash:guestDigest(invitationToken),pinHash,expiresAt,createdAt:now}});
      await this.audit(db,meetingId,'GUEST_INVITATION_CREATED',row.id,actorId);
      return {id:row.id,version:row.version,expiresAt,invitationToken,pin};
    });
  }
  async revoke(actorId: string, meetingId: string, invitationId: string, version: number) {
    return this.meetings.transaction(async db=>{
      await this.managed(db,actorId,meetingId,true);
      const invitation=await db.crmMeetingInvitation.findFirst({where:{id:invitationId,meetingId}});
      if(!invitation)throw new NotFoundException('Приглашение не найдено');
      if(invitation.version!==version)throw new ConflictException('Приглашение изменилось. Обновите список.');
      if(!invitation.revokedAt){
        await db.crmMeetingInvitation.update({where:{id:invitationId},data:{revokedAt:new Date(),version:{increment:1}}});
        await db.crmMeetingGuest.updateMany({where:{invitationId,status:{in:['WAITING','ADMITTED']}},data:{status:'REVOKED',decidedAt:new Date(),version:{increment:1}}});
        await this.audit(db,meetingId,'GUEST_INVITATION_REVOKED',invitationId,actorId);
      }
      return {revoked:true};
    });
  }
  async decide(actorId: string, meetingId: string, guestId: string, dto: DecideMeetingGuestDto) {
    return this.meetings.transaction(async db=>{
      const meeting=await this.managed(db,actorId,meetingId,true), now=new Date();
      const guest=await db.crmMeetingGuest.findFirst({where:{id:guestId,invitation:{meetingId}},include:{invitation:true}});
      if(!guest)throw new NotFoundException('Гость не найден');
      if(guest.version!==dto.version)throw new ConflictException('Состояние гостя изменилось. Обновите список.');
      if(guestState(guest,guest.invitation,meeting,now)!=='WAITING'||!guestWindow(meeting,now))throw new ConflictException('Гость уже обработан или время допуска истекло');
      const state=dto.action==='ADMIT'?'ADMITTED':'REJECTED';
      await db.crmMeetingGuest.update({where:{id:guestId},data:{status:state,decidedAt:now,version:{increment:1}}});
      if(state==='REJECTED')await db.crmMeetingInvitation.update({where:{id:guest.invitationId},data:{revokedAt:now,version:{increment:1}}});
      await this.audit(db,meetingId,`GUEST_${state}`,guestId,actorId);
      return {state,videoAvailable:false};
    });
  }
  private guestView(row: GuestRow) {
    const state=guestState(row,row.invitation,row.invitation.meeting);
    if(!['WAITING','ADMITTED'].includes(state))return {state,videoAvailable:false};
    const meeting=row.invitation.meeting;
    return {state,displayName:row.displayName,expiresAt:row.expiresAt,meeting:{title:meeting.title,startsAt:meeting.startsAt,endsAt:meeting.endsAt,timezone:meeting.timezone},videoAvailable:false};
  }
  async join(dto: JoinMeetingGuestDto, peer: string) {
    await this.rate('join-peer:'+guestDigest(peer),60,10*60000);
    const invitation=await this.prisma.crmMeetingInvitation.findUnique({where:{tokenHash:guestDigest(dto.invitationToken)}});
    if(!invitation)throw publicError();
    await this.rate('join-invite:'+invitation.id,10,10*60000);
    if(!await bcrypt.compare(dto.pin,invitation.pinHash))throw publicError();
    return this.meetings.transaction(async db=>{
      await this.lock(db,invitation.meetingId);
      const current=await db.crmMeetingInvitation.findUniqueOrThrow({where:{id:invitation.id},include:{meeting:true,guest:true}}), now=new Date();
      if(current.revokedAt||current.expiresAt<=now||current.meeting.status!=='SCHEDULED')throw publicError();
      if(!guestWindow(current.meeting,now))throw new BadRequestException('Вход открывается за 30 минут до встречи и закрывается через 30 минут после её окончания.');
      if(current.guest && (current.guest.joinKeyHash!==guestDigest(dto.clientKey)||!['WAITING','ADMITTED'].includes(guestState(current.guest,current,current.meeting,now))))throw publicError();
      const ticket=guestSecret(), expiresAt=new Date(Math.min(+current.expiresAt,+current.meeting.endsAt+30*60000));
      const row=current.guest
        ?await db.crmMeetingGuest.update({where:{id:current.guest.id},data:{ticketHash:guestDigest(ticket)},include:includeGuest})
        :await db.crmMeetingGuest.create({data:{invitationId:current.id,displayName:dto.displayName,joinKeyHash:guestDigest(dto.clientKey),ticketHash:guestDigest(ticket),expiresAt,joinedAt:now},include:includeGuest});
      await this.audit(db,current.meetingId,current.guest?'GUEST_SESSION_RENEWED':'GUEST_WAITING',row.id);
      return {...this.guestView(row),ticket};
    });
  }
  async status(ticket: string, peer: string) {
    await this.rate('read-peer:'+guestDigest(peer),300,60000);
    const row=await this.prisma.crmMeetingGuest.findUnique({where:{ticketHash:guestDigest(ticket)},include:includeGuest});
    if(!row)throw new UnauthorizedException('Гостевой доступ недействителен. Откройте приглашение заново.');
    await this.rate('read-ticket:'+guestDigest(ticket),30,60000);
    return this.guestView(row);
  }
  async leave(ticket: string, peer: string) {
    await this.rate('read-peer:'+guestDigest(peer),300,60000);
    return this.meetings.transaction(async db=>{
      const initial=await db.crmMeetingGuest.findUnique({where:{ticketHash:guestDigest(ticket)},include:includeGuest});
      if(!initial)throw publicError();
      await this.lock(db,initial.invitation.meetingId);
      const row=await db.crmMeetingGuest.findUnique({where:{ticketHash:guestDigest(ticket)},include:includeGuest});
      if(!row)throw publicError();
      if(['WAITING','ADMITTED'].includes(guestState(row,row.invitation,row.invitation.meeting))){
        await db.crmMeetingGuest.update({where:{id:row.id},data:{status:'LEFT',version:{increment:1},decidedAt:new Date()}});
        await db.crmMeetingInvitation.update({where:{id:row.invitationId},data:{revokedAt:new Date(),version:{increment:1}}});
        await this.audit(db,row.invitation.meetingId,'GUEST_LEFT',row.id);
      }
      return {state:'LEFT',videoAvailable:false};
    });
  }
}
