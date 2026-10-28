import { Injectable, NotFoundException } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MeetingsService } from './meetings.service';
import { meetingCalendar } from './meeting-calendar';
import { meetingVisibility } from './meeting-policy';
const digest=(value:string)=>createHash('sha256').update(value).digest('hex');
const include={members:{select:{userId:true,response:true,declineReason:true}}};
@Injectable()
export class MeetingCalendarService{
  constructor(private readonly prisma:PrismaService,private readonly meetings:MeetingsService){}
  private site(){return (process.env.PUBLIC_APP_URL||process.env.SITE_URL||'http://localhost:3001').replace(/\/+$/,'');}
  async subscription(actorId:string){return this.meetings.transaction(async db=>{
    await this.meetings.actor(db,actorId);
    const row=await db.crmCalendarSubscription.findUnique({where:{userId:actorId},select:{createdAt:true,updatedAt:true}});
    return {enabled:!!row,...row};
  });}
  async enable(actorId:string){return this.meetings.transaction(async db=>{
    await this.meetings.actor(db,actorId);
    const token=randomBytes(32).toString('base64url');
    await db.crmCalendarSubscription.upsert({where:{userId:actorId},create:{userId:actorId,tokenHash:digest(token)},update:{tokenHash:digest(token)}});
    return {enabled:true,path:`/calendar/feeds/${token}.ics`};
  });}
  async revoke(actorId:string){return this.meetings.transaction(async db=>{
    await this.meetings.actor(db,actorId);
    await db.crmCalendarSubscription.deleteMany({where:{userId:actorId}});
    return {enabled:false};
  });}
  async event(actorId:string,id:string){return this.meetings.transaction(async db=>{
    const actor=await this.meetings.actor(db,actorId);
    const row=await db.crmMeeting.findFirst({where:{AND:[{id},meetingVisibility(actor)]},include});
    if(!row)throw new NotFoundException('Событие не найдено');
    return meetingCalendar([row],actorId,this.site());
  });}
  async feed(token:string){
    if(!/^[A-Za-z0-9_-]{43}$/.test(token))throw new NotFoundException('Подписка недоступна');
    return this.meetings.transaction(async db=>{
      const subscription=await db.crmCalendarSubscription.findUnique({where:{tokenHash:digest(token)}});
      if(!subscription)throw new NotFoundException('Подписка недоступна');
      try{await this.meetings.actor(db,subscription.userId);}catch{throw new NotFoundException('Подписка недоступна');}
      const now=Date.now();
      // Even administrators subscribe only to events they organize or attend.
      const rows=await db.crmMeeting.findMany({where:{OR:[{organizerId:subscription.userId},{members:{some:{userId:subscription.userId}}}],startsAt:{lt:new Date(now+730*86400000)},endsAt:{gt:new Date(now-365*86400000)}},include,orderBy:[{startsAt:'asc'},{id:'asc'}]});
      return meetingCalendar(rows,subscription.userId,this.site());
    });
  }
}
