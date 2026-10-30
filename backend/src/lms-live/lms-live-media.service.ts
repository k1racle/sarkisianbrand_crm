import { ConflictException, ForbiddenException, Injectable, Logger, OnModuleDestroy, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { activeSession, SessionClaims } from '../auth/active-session';
import { employeeAccess } from '../auth/employee-access';
import { effectivePermissions } from '../auth/effective-permissions';
import { PrismaService } from '../prisma/prisma.service';
import { LmsLiveMediaAdapter } from './lms-live-media.adapter';

const hostRoles = ['ADMIN','SUPERVISOR','CONTENT_MANAGER'];
const maxRooms = 50, maxGrants = 200;
type Grant = { id:string; liveSessionId:string; userId:string; userSessionId:string; role:string; expiresAt:Date; revokedAt:Date|null; liveSession:{id:string;courseId:string;lessonId:string;hostId:string;status:string;startsAt:Date;endsAt:Date} };

@Injectable()
export class LmsLiveMediaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LmsLiveMediaService.name);
  private timer?: ReturnType<typeof setTimeout>;
  private stopping = false;
  private sweeping = false;
  private lastSuccessfulSweep = 0;
  constructor(private readonly db:PrismaService, private readonly adapter:LmsLiveMediaAdapter) {}

  onModuleInit() { try { this.adapter.settings(); void this.loop(); } catch { /* Explicitly disabled or unavailable. */ } }
  onModuleDestroy() { this.stopping = true; clearTimeout(this.timer); }
  private async loop() {
    try { await this.reconcile(); }
    catch { this.lastSuccessfulSweep = 0; this.logger.error('LMS_MEDIA_RECONCILIATION_FAILED: admission is closed'); }
    finally { if (!this.stopping) { this.timer = setTimeout(() => void this.loop(), 3000); this.timer.unref(); } }
  }
  private ready() {
    this.adapter.settings();
    if (Date.now() - this.lastSuccessfulSweep > 15000) throw new ServiceUnavailableException('Проверка видеосервера не завершена. Подключение временно недоступно.');
  }
  private sessionLive(session:{status:string;startsAt:Date;endsAt:Date}) {
    const now=Date.now(); return session.status === 'LIVE' && now >= session.startsAt.getTime() - 15*60_000 && now < session.endsAt.getTime();
  }
  private async hostPermitted(db:Prisma.TransactionClient,userId:string) {
    const actor = await db.user.findUnique({ where:{id:userId}, select:{id:true,role:true,isActive:true,departmentId:true,accessProfileMode:true} });
    if (!actor?.isActive || !hostRoles.includes(actor.role)) return false;
    const keys=['lms.read','lms.write'];
    const [roles,overrides] = await Promise.all([
      db.rolePermission.findMany({where:{role:actor.role,permission:{key:{in:keys}}},select:{permission:{select:{key:true}}}}),
      db.userPermission.findMany({where:{userId,permission:{key:{in:keys}}},select:{effect:true,permission:{select:{key:true}}}}),
    ]);
    if (!actor.accessProfileMode) { const granted=new Set(effectivePermissions(roles,overrides).permissions); return keys.every(key=>granted.has(key)); }
    const resolved=await employeeAccess(db,actor,roles,overrides);
    return keys.every(key=>resolved.permissions.includes(key) && resolved.decisions.find(item=>item.permissionKey===key)?.grants.some(grant=>grant.allowed && grant.effectiveScope==='COMPANY'));
  }
  private async allowed(db:Prisma.TransactionClient,grant:Grant) {
    if (grant.revokedAt || grant.expiresAt <= new Date() || !this.sessionLive(grant.liveSession) || !['host','viewer'].includes(grant.role)) return false;
    try { await activeSession(db as PrismaService, {sub:grant.userId,sid:grant.userSessionId,exp:Math.floor(grant.expiresAt.getTime()/1000)}); } catch { return false; }
    if (!await db.lesson.findFirst({where:{id:grant.liveSession.lessonId,courseId:grant.liveSession.courseId,kind:'LIVE',isPublished:true,moduleId:{not:null}},select:{id:true}})) return false;
    if (grant.role === 'host') return grant.liveSession.hostId === grant.userId && await this.hostPermitted(db,grant.userId);
    const enrollment = await db.enrollment.findUnique({where:{userId_courseId:{userId:grant.userId,courseId:grant.liveSession.courseId}},select:{accessStatus:true,accessExpiresAt:true}});
    if (!enrollment || enrollment.accessStatus !== 'ACTIVE' || (enrollment.accessExpiresAt && enrollment.accessExpiresAt <= new Date())) return false;
    return true;
  }
  async issue(user:SessionClaims, liveSessionId:string, role:'host'|'viewer', courseId?:string, lessonId?:string) {
    this.ready();
    if (!user || !user.sub || !user.sid || !Number.isFinite(user.exp)) throw new ForbiddenException('Сессия недействительна');
    const result=await this.db.$transaction(async tx=>{
      // Same row lock as session transition. A room cannot be recreated by a
      // delayed join after the host has ended the session.
      await tx.$queryRaw`SELECT id FROM "LmsLiveSession" WHERE id = ${liveSessionId} FOR UPDATE`;
      const liveSession=await tx.lmsLiveSession.findUnique({where:{id:liveSessionId}});
      if (!liveSession || !this.sessionLive(liveSession) || (role === 'viewer' && (liveSession.courseId !== courseId || liveSession.lessonId !== lessonId))) throw new ConflictException('Эфир сейчас недоступен.');
      const enrollment=role === 'viewer' ? await tx.enrollment.findUnique({where:{userId_courseId:{userId:user.sub,courseId:liveSession.courseId}},select:{accessExpiresAt:true}}) : null;
      const expiresAt=new Date(Math.min(user.exp*1000,liveSession.endsAt.getTime(),enrollment?.accessExpiresAt?.getTime() ?? Infinity));
      const candidate:Grant={id:randomUUID(),liveSessionId,userId:user.sub,userSessionId:user.sid,role,expiresAt,revokedAt:null,liveSession};
      if (!await this.allowed(tx,candidate)) throw new ForbiddenException('Доступ к эфиру недоступен.');
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended('lms-live-media-capacity', 0))`;
      if (!liveSession.mediaOpen && await tx.lmsLiveSession.count({where:{mediaOpen:true}}) >= maxRooms) throw new ServiceUnavailableException('Достигнут предел активных эфиров.');
      // Repeated joins from the same login reuse a valid grant instead of
      // exhausting the room's capacity or creating unbounded records.
      const previous=await tx.lmsLiveMediaGrant.findFirst({where:{liveSessionId,userId:user.sub,userSessionId:user.sid,role,revokedAt:null,expiresAt:{gt:new Date(),lte:expiresAt}},orderBy:{expiresAt:'desc'}});
      if (!previous && await tx.lmsLiveMediaGrant.count({where:{liveSessionId,revokedAt:null,expiresAt:{gt:new Date()}}}) >= maxGrants) throw new ServiceUnavailableException('В эфире нет свободных мест.');
      await this.adapter.ensure(liveSessionId);
      await tx.lmsLiveSession.update({where:{id:liveSessionId},data:{mediaOpen:true}});
      const grant=previous || await tx.lmsLiveMediaGrant.create({data:{id:candidate.id,liveSessionId,userId:user.sub,userSessionId:user.sid,role,expiresAt}});
      if (!previous) await tx.auditLog.create({data:{actorId:user.sub,resource:'lms.live',resourceId:liveSessionId,action:'MEDIA_GRANT_ISSUED',payload:{grantId:grant.id,role}}});
      return grant;
    },{timeout:15000});
    return this.adapter.issue(liveSessionId,result.id,role,result.expiresAt);
  }
  async authorize(token:string,gatewayKey:string) {
    this.ready(); const claims=await this.adapter.verify(token,gatewayKey);
    const grant=await this.db.lmsLiveMediaGrant.findUnique({where:{id:claims.identity},include:{liveSession:true}});
    if (!grant || claims.room !== this.adapter.room(grant.liveSessionId) || claims.canPublish !== (grant.role === 'host') || !await this.allowed(this.db,grant)) throw new ForbiddenException('Медиадоступ закрыт');
  }
  health(gatewayKey:string) {
    this.adapter.verifyGatewayKey(gatewayKey);
    this.ready();
  }
  async closeRemote(liveSessionId:string) {
    try { await this.adapter.close(liveSessionId); return true; }
    catch { this.lastSuccessfulSweep=0; this.logger.error('LMS_MEDIA_DISCONNECT_PENDING'); return false; }
  }
  async reconcile() {
    if (this.sweeping) return;
    this.sweeping=true;
    try {
      await this.adapter.probe();
      const sessions=await this.db.lmsLiveSession.findMany({where:{mediaOpen:true},orderBy:{id:'asc'},take:maxRooms+1});
      if (sessions.length > maxRooms) throw new Error('LMS_MEDIA_ROOM_CAPACITY');
      for (const session of sessions) {
        if (!this.sessionLive(session)) {
          await this.adapter.close(session.id);
          // An earlier admitted signalling request can race with close. Repeat
          // deletion during the bounded gateway handshake/grant window.
          const closedAt=session.status === 'LIVE' ? session.endsAt : session.updatedAt;
          if (Date.now()-closedAt.getTime() > 120_000) await this.db.lmsLiveSession.updateMany({where:{id:session.id,mediaOpen:true,status:session.status,updatedAt:session.updatedAt},data:{mediaOpen:false}});
          continue;
        }
        for (const participant of await this.adapter.participants(session.id)) {
          const grant=await this.db.lmsLiveMediaGrant.findUnique({where:{id:participant.identity},include:{liveSession:true}});
          if (!grant || grant.liveSessionId !== session.id || !await this.allowed(this.db,grant)) {
            if (grant && grant.liveSessionId === session.id && !grant.revokedAt) await this.db.lmsLiveMediaGrant.updateMany({where:{id:grant.id,revokedAt:null},data:{revokedAt:new Date()}});
            await this.adapter.remove(session.id,participant.identity);
          }
        }
      }
      this.lastSuccessfulSweep=Date.now();
    } catch (e) { this.lastSuccessfulSweep=0; throw e; }
    finally { this.sweeping=false; }
  }
}
