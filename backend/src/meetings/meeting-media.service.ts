import { ConflictException, ForbiddenException, Injectable, Logger, NotFoundException, OnModuleDestroy, OnModuleInit, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { Prisma, CrmMeetingMediaRoom, CrmMeeting } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MeetingsService } from './meetings.service';
import { MeetingGuestsService } from './meeting-guests.service';
import { MeetingMediaAdapter } from './meeting-media.adapter';
import { canManageMeeting, meetingVisibility } from './meeting-policy';
import { guestDigest, guestState, guestWindow } from './meeting-guest-policy';

const sessionInclude={room:{include:{meeting:{include:{members:true}}}},guest:{include:{invitation:true}}} as const;
type Session=Prisma.CrmMeetingMediaSessionGetPayload<{include:typeof sessionInclude}>;

@Injectable()
export class MeetingMediaService implements OnModuleInit,OnModuleDestroy {
  private readonly logger=new Logger(MeetingMediaService.name);
  private timer?:ReturnType<typeof setTimeout>;
  private stopping=false;
  private lastSuccessfulSweep=0;
  private sweeping=false;
  constructor(private readonly prisma:PrismaService,private readonly meetings:MeetingsService,private readonly guests:MeetingGuestsService,private readonly adapter:MeetingMediaAdapter){}
  onModuleInit(){if(this.adapter.config.enabled)void this.loop();}
  onModuleDestroy(){this.stopping=true;clearTimeout(this.timer);}
  private async loop(){
    try{await this.reconcile();}catch{this.lastSuccessfulSweep=0;this.logger.error('MEDIA_RECONCILIATION_FAILED: new joins are denied; inspect private media connectivity');}
    finally{if(!this.stopping){this.timer=setTimeout(()=>void this.loop(),3000);this.timer.unref();}}
  }
  private ready(){this.adapter.requireEnabled();if(Date.now()-this.lastSuccessfulSweep>15000)throw new ServiceUnavailableException('Проверка видеосервера не завершена. Новые подключения временно закрыты');}
  private async lock(db:Prisma.TransactionClient,id:string){await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`meeting:${id}`}))`;}
  private activeRoom(room:CrmMeetingMediaRoom,meeting:CrmMeeting){return !room.closedAt&&meeting.status==='SCHEDULED'&&room.meetingVersion===meeting.version&&guestWindow(meeting);}
  private async visible(db:Prisma.TransactionClient,userId:string,id:string,manage=false){
    const actor=await this.meetings.actor(db,userId);
    const meeting=await db.crmMeeting.findFirst({where:{AND:[{id},meetingVisibility(actor)]},include:{members:true}});
    if(!meeting)throw new NotFoundException('Встреча не найдена');
    if(manage&&!canManageMeeting(actor,meeting.organizerId))throw new ForbiddenException('Видеовстречей управляет организатор или уполномоченный администратор');
    return meeting;
  }
  async status(userId:string,id:string){
    return this.meetings.transaction(async db=>{
      const meeting=await this.visible(db,userId,id);
      const room=await db.crmMeetingMediaRoom.findUnique({where:{meetingId_meetingVersion:{meetingId:id,meetingVersion:meeting.version}}});
      return {configured:this.adapter.config.enabled,ready:this.adapter.config.enabled&&Date.now()-this.lastSuccessfulSweep<=15000,
        state:room?(this.activeRoom(room,meeting)?'OPEN':'CLOSED'):'NOT_STARTED',version:room?.version||null,
        disconnectPending:Boolean(room&&!this.activeRoom(room,meeting)&&!room.remoteClosedAt),recordingAvailable:false,clientAvailable:false};
    });
  }
  async open(userId:string,id:string,version:number){
    this.ready();await this.guests.rate('media-open:'+userId,6,60000);
    const room=await this.meetings.transaction(async db=>{
      await this.lock(db,id);const meeting=await this.visible(db,userId,id,true);
      if(meeting.version!==version)throw new ConflictException('Обновите карточку встречи');
      if(meeting.status!=='SCHEDULED'||!guestWindow(meeting))throw new ConflictException('Видеовстреча доступна в пределах окна расписания');
      const previous=await db.crmMeetingMediaRoom.findUnique({where:{meetingId_meetingVersion:{meetingId:id,meetingVersion:version}}});
      if(previous?.closedAt)throw new ConflictException('Завершённую видеовстречу нельзя открыть повторно. Запланируйте новую.');
      if(previous)return previous;
      await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('meeting-media-capacity'))`;
      if(await db.crmMeetingMediaRoom.count({where:{remoteClosedAt:null}})>=50)throw new ServiceUnavailableException('Достигнут предел одновременно контролируемых комнат');
      const row=await db.crmMeetingMediaRoom.create({data:{meetingId:id,meetingVersion:version,openedAt:new Date()}});
      await db.auditLog.create({data:{actorId:userId,resource:'crm.meeting',resourceId:id,action:'MEDIA_OPENED',payload:{roomId:row.id}}});return row;
    });
    try{await this.prepareRoom(room.id);}
    catch{await this.prisma.crmMeetingMediaRoom.update({where:{id:room.id},data:{lastError:'MEDIA_UNAVAILABLE'}});throw new ServiceUnavailableException('Не удалось подготовить видеокомнату. Повторите открытие.');}
    return {state:'OPEN',version:room.version};
  }
  private async prepareRoom(id:string){
    // Serialize remote creation with local closure. A delayed token request must not
    // recreate an already deleted room after closeRemote has marked it reconciled.
    return this.meetings.transaction(async db=>{
      const initial=await db.crmMeetingMediaRoom.findUniqueOrThrow({where:{id}});
      await this.lock(db,initial.meetingId);
      const room=await db.crmMeetingMediaRoom.findUniqueOrThrow({where:{id},include:{meeting:true}});
      if(!this.activeRoom(room,room.meeting))throw new ConflictException('Видеовстреча уже завершена');
      await this.adapter.ensureRoom(id);
      await db.crmMeetingMediaRoom.update({where:{id},data:{lastError:null,remoteClosedAt:null}});
    });
  }
  async close(userId:string,id:string,version:number){
    // Closing local admission remains possible even while media/config is unavailable.
    const room=await this.meetings.transaction(async db=>{
      await this.lock(db,id);const meeting=await this.visible(db,userId,id,true);
      const row=await db.crmMeetingMediaRoom.findUnique({where:{meetingId_meetingVersion:{meetingId:id,meetingVersion:meeting.version}}});
      if(!row)throw new NotFoundException('Видеокомната не открыта');
      if(row.version!==version)throw new ConflictException('Обновите состояние видеовстречи');
      if(row.closedAt)return row;
      const closed=await db.crmMeetingMediaRoom.update({where:{id:row.id},data:{closedAt:new Date(),closeReason:'HOST_ENDED',version:{increment:1}}});
      await db.crmMeetingMediaSession.updateMany({where:{roomId:row.id,revokedAt:null},data:{revokedAt:new Date()}});
      await db.auditLog.create({data:{actorId:userId,resource:'crm.meeting',resourceId:id,action:'MEDIA_CLOSED',payload:{roomId:row.id}}});return closed;
    });
    const disconnected=await this.closeRemote(room.id);
    return {state:'CLOSED',version:room.version,disconnectPending:!disconnected};
  }
  private async closeRemote(id:string){
    try{await this.adapter.close(id);await this.prisma.crmMeetingMediaRoom.update({where:{id},data:{remoteClosedAt:new Date(),lastCheckedAt:new Date(),lastError:null}});return true;}
    catch{await this.prisma.crmMeetingMediaRoom.update({where:{id},data:{lastError:'DISCONNECT_PENDING'}});return false;}
  }
  private async allowed(db:Prisma.TransactionClient,row:Session){
    const meeting=row.room.meeting;
    if(row.revokedAt||row.expiresAt<=new Date()||!this.activeRoom(row.room,meeting))return false;
    if(row.userId){
      try{await this.meetings.actor(db,row.userId);}catch(e){if(e instanceof ForbiddenException)return false;throw e;}
      return meeting.organizerId===row.userId||meeting.members.some(member=>member.userId===row.userId);
    }
    return Boolean(row.guest&&row.guest.invitation.meetingId===meeting.id&&row.guest.ticketHash===row.guestTicketHash&&guestState(row.guest,row.guest.invitation,meeting)==='ADMITTED');
  }
  async employeeToken(userId:string,id:string){
    this.ready();await this.guests.rate('media-user:'+userId,12,60000);
    return this.issue(id,userId,null);
  }
  async guestToken(ticket:string,peer:string){
    this.ready();await this.guests.rate('media-peer:'+guestDigest(peer),60,60000);
    const guest=await this.prisma.crmMeetingGuest.findUnique({where:{ticketHash:guestDigest(ticket)},include:{invitation:true}});
    if(!guest)throw new UnauthorizedException('Гостевой доступ недействителен');
    await this.guests.rate('media-guest:'+guest.id,12,60000);
    return this.issue(guest.invitation.meetingId,null,{id:guest.id,ticketHash:guestDigest(ticket)});
  }
  private async issue(id:string,userId:string|null,guest:{id:string;ticketHash:string}|null){
    const result=await this.meetings.transaction(async db=>{
      await this.lock(db,id);
      const meeting=userId?await this.visible(db,userId,id):await db.crmMeeting.findUniqueOrThrow({where:{id},include:{members:true}});
      const room=await db.crmMeetingMediaRoom.findUnique({where:{meetingId_meetingVersion:{meetingId:id,meetingVersion:meeting.version}}});
      if(!room||!this.activeRoom(room,meeting))throw new ConflictException('Организатор ещё не открыл видеовстречу или она уже завершена');
      let name='Участник',expiresAt=new Date(+meeting.endsAt+30*60000);
      if(userId){
        if(meeting.organizerId!==userId&&!meeting.members.some(member=>member.userId===userId))throw new ForbiddenException('Для подключения нужно приглашение во встречу');
        const user=await db.user.findUniqueOrThrow({where:{id:userId}});name=[user.firstName,user.lastName].filter(Boolean).join(' ')||name;
      }else{
        const current=await db.crmMeetingGuest.findUnique({where:{id:guest!.id},include:{invitation:true}});
        if(!current||current.ticketHash!==guest!.ticketHash||guestState(current,current.invitation,meeting)!=='ADMITTED')throw new ForbiddenException('Необходим действующий допуск организатора');
        name=current.displayName;expiresAt=new Date(Math.min(+expiresAt,+current.expiresAt));
      }
      const principal={roomId:room.id,...(userId?{userId}:{guestId:guest!.id})};
      const previous=await db.crmMeetingMediaSession.findMany({where:{...principal,revokedAt:null},include:sessionInclude,take:20});
      let session:Session|undefined;
      for(const row of previous){if(await this.allowed(db,row))session=row;else await db.crmMeetingMediaSession.update({where:{id:row.id},data:{revokedAt:new Date()}});}
      if(!session){
        session=await db.crmMeetingMediaSession.create({data:{...principal,guestTicketHash:guest?.ticketHash,createdAt:new Date(),expiresAt},include:sessionInclude});
        await db.auditLog.create({data:{actorId:userId||undefined,resource:'crm.meeting',resourceId:id,action:'MEDIA_SESSION_ISSUED',payload:{sessionId:session.id,roomId:room.id}}});
      }
      return {session,name};
    });
    // A token alone is insufficient: the signalling gateway rechecks this row on every connection.
    try{await this.prepareRoom(result.session.roomId);return {...await this.adapter.token(result.session.roomId,result.session.id,result.name),expiresAt:result.session.expiresAt};}
    catch{throw new ServiceUnavailableException('Видеосервер временно недоступен');}
  }
  async authorize(token:string,gatewayKey:string){
    this.ready();const claims=await this.adapter.verify(token,gatewayKey);
    const row=await this.prisma.crmMeetingMediaSession.findUnique({where:{id:claims.identity},include:sessionInclude});
    if(!row||claims.roomName!==this.adapter.roomName(row.roomId)||!await this.allowed(this.prisma,row))throw new ForbiddenException('Медиадоступ закрыт');
    return true;
  }
  async reconcile(){
    if(!this.adapter.config.enabled||this.sweeping)return;
    this.sweeping=true;
    try{
      await this.adapter.probe();
      const rooms=await this.prisma.crmMeetingMediaRoom.findMany({where:{remoteClosedAt:null},include:{meeting:true},orderBy:{openedAt:'asc'},take:51});
      if(rooms.length>50)throw new Error('MEDIA_ROOM_CAPACITY');
      for(const room of rooms){
        if(!this.activeRoom(room,room.meeting)){
          await this.meetings.transaction(async db=>{
            await this.lock(db,room.meetingId);
            const current=await db.crmMeetingMediaRoom.findUniqueOrThrow({where:{id:room.id}});
            if(!current.closedAt)await db.crmMeetingMediaRoom.update({where:{id:room.id},data:{closedAt:new Date(),closeReason:'SCHEDULE_OR_ACCESS_CHANGED',version:{increment:1}}});
            await db.crmMeetingMediaSession.updateMany({where:{roomId:room.id,revokedAt:null},data:{revokedAt:new Date()}});
          });
          if(!await this.closeRemote(room.id))throw new Error('MEDIA_CLOSE_FAILED');
          continue;
        }
        const participants=await this.adapter.participants(room.id);
        for(const participant of participants){
          const session=await this.prisma.crmMeetingMediaSession.findUnique({where:{id:participant.identity},include:sessionInclude});
          if(!session||session.roomId!==room.id||!await this.allowed(this.prisma,session)){
            if(session&&session.roomId===room.id&&!session.revokedAt)await this.prisma.crmMeetingMediaSession.update({where:{id:session.id},data:{revokedAt:new Date()}});
            await this.adapter.remove(room.id,participant.identity);
          }
        }
        await this.prisma.crmMeetingMediaRoom.update({where:{id:room.id},data:{lastCheckedAt:new Date(),lastError:null}});
      }
      this.lastSuccessfulSweep=Date.now();
    }catch(e){this.lastSuccessfulSweep=0;throw e;}finally{this.sweeping=false;}
  }
}
