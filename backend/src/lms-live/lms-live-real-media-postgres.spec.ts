import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { RoomServiceClient } from 'livekit-server-sdk';
import { LmsLiveMediaAdapter } from './lms-live-media.adapter';
import { LmsLiveMediaGatewayController } from './lms-live.controller';
import { LmsLiveMediaService } from './lms-live-media.service';

// This fixture intentionally overrides only the hard-off settings at the test
// boundary. No runtime flag can enable media in the application. Both servers
// must be disposable, exclusively bound to loopback, and started by the test.
const dbUrl=process.env.LMS_REAL_MEDIA_TEST_DATABASE_URL;
const liveUrl=process.env.LMS_REAL_MEDIA_TEST_API_URL;
if (dbUrl || liveUrl) {
  if (!dbUrl || !liveUrl) throw new Error('Both isolated LMS real-media fixture URLs are required');
  const db=new URL(dbUrl), live=new URL(liveUrl);
  if (db.hostname !== '127.0.0.1' || db.port !== '56438' || db.pathname !== '/lms_media_fixture' || live.origin !== 'http://127.0.0.1:56788' || live.pathname !== '/' || live.username || live.password || live.search || live.hash) throw new Error('LMS real-media test requires the dedicated loopback fixtures');
}
const enabled=dbUrl && liveUrl ? describe : describe.skip;
enabled('real LMS control, PostgreSQL and LiveKit integration',()=>{
  const config={url:'wss://fixture.invalid',apiUrl:'http://127.0.0.1:56788',key:'fixture-key',secret:'fixture-only-livekit-secret-0123456789abcdef',gatewayKey:'d'.repeat(64)};
  let db:PrismaClient, adapter:LmsLiveMediaAdapter, media:LmsLiveMediaService, app:INestApplication, base:string, socket:WebSocket | undefined;
  let hostId:string, userId:string, authId:string, courseId:string, moduleId:string, lessonId:string, sessionId:string;
  const wait=async (test:()=>Promise<boolean>, timeout=10000)=>{
    const end=Date.now()+timeout;
    while(Date.now()<end) { if (await test()) return; await new Promise(resolve=>setTimeout(resolve,100)); }
    throw new Error('LiveKit fixture did not reach the expected state');
  };
  beforeAll(async()=>{
    db=new PrismaClient({datasources:{db:{url:dbUrl!}}}); await db.$connect();
    const host=await db.user.create({data:{email:`host-${randomUUID()}@example.invalid`,password:'fixture',role:'CONTENT_MANAGER'}}); hostId=host.id;
    const user=await db.user.create({data:{email:`student-${randomUUID()}@example.invalid`,password:'fixture',role:'CUSTOMER_B2C'}}); userId=user.id;
    authId=(await db.session.create({data:{userId,refreshToken:`fixture-${randomUUID()}`,expiresAt:new Date(Date.now()+3600000)}})).id;
    courseId=(await db.course.create({data:{titleRu:'Fixture',price:100}})).id;
    moduleId=(await db.courseModule.create({data:{courseId,title:'Fixture'}})).id;
    lessonId=(await db.lesson.create({data:{courseId,moduleId,title:'Эфир',kind:'LIVE',isPublished:true}})).id;
    await db.enrollment.create({data:{userId,courseId,accessStatus:'ACTIVE'}});
    sessionId=(await db.lmsLiveSession.create({data:{courseId,lessonId,hostId,title:'Эфир',status:'LIVE',startsAt:new Date(Date.now()-60000),endsAt:new Date(Date.now()+3600000)}})).id;
    adapter=new LmsLiveMediaAdapter({get:()=>undefined} as any);
    jest.spyOn(adapter,'settings').mockReturnValue(config);
    media=new LmsLiveMediaService(db as any,adapter);
    await wait(async()=>{try{await media.reconcile();return true;}catch{return false;}});
    const fixture=await Test.createTestingModule({controllers:[LmsLiveMediaGatewayController],providers:[{provide:LmsLiveMediaService,useValue:media}]}).compile();
    app=fixture.createNestApplication(); app.setGlobalPrefix('api/v1'); await app.listen(0,'127.0.0.1');
    const address=app.getHttpServer().address(); base=`http://127.0.0.1:${address.port}/api/v1/lms-live-gateway`;
  },30000);
  afterAll(async()=>{
    socket?.close(); await app?.close();
    if (!db) return;
    if (sessionId) { try { await adapter.close(sessionId); } catch {} await db.auditLog.deleteMany({where:{resource:'lms.live',resourceId:sessionId}}); await db.lmsLiveSession.deleteMany({where:{id:sessionId}}); }
    if (courseId) await db.enrollment.deleteMany({where:{courseId}});
    if (lessonId) await db.lesson.deleteMany({where:{id:lessonId}});
    if (moduleId) await db.courseModule.deleteMany({where:{id:moduleId}});
    if (courseId) await db.course.deleteMany({where:{id:courseId}});
    if (userId) { await db.session.deleteMany({where:{userId}}); await db.user.deleteMany({where:{id:userId}}); }
    if (hostId) await db.user.deleteMany({where:{id:hostId}});
    await db.$disconnect();
  });
  it('issues and authorizes a real token, then removes the actual participant after entitlement revocation',async()=>{
    const issued=await media.issue({sub:userId,sid:authId,exp:Math.floor(Date.now()/1000)+600},sessionId,'viewer',courseId,lessonId);
    const headers={'x-lms-gateway-key':config.gatewayKey,'x-lms-media-token':issued.token};
    expect((await fetch(`${base}/authorize`,{headers})).status).toBe(204);
    expect((await fetch(`${base}/health`,{headers})).status).toBe(204);
    const url=`ws://127.0.0.1:56788/rtc/v1?access_token=${encodeURIComponent(issued.token)}&join_request=EhYKDggFEgYyLjIzLjAYEGABEgQIARAB`;
    socket=new WebSocket(url);
    await new Promise<void>((resolve,reject)=>{socket!.addEventListener('message',()=>resolve(),{once:true});socket!.addEventListener('error',()=>reject(new Error('LiveKit signalling failed')),{once:true});setTimeout(()=>reject(new Error('LiveKit signalling timeout')),8000).unref();});
    const grants=await db.lmsLiveMediaGrant.findMany({where:{liveSessionId:sessionId,userId}}); expect(grants).toHaveLength(1);
    await wait(async()=>(await adapter.participants(sessionId)).some(item=>item.identity===grants[0].id));
    await db.enrollment.update({where:{userId_courseId:{userId,courseId}},data:{accessStatus:'REVOKED'}});
    expect((await fetch(`${base}/authorize`,{headers})).status).toBe(403);
    await media.reconcile();
    await wait(async()=>!(await adapter.participants(sessionId)).some(item=>item.identity===grants[0].id));
    expect((await db.lmsLiveMediaGrant.findUniqueOrThrow({where:{id:grants[0].id}})).revokedAt).not.toBeNull();
    expect((await fetch(`${base}/authorize`,{headers})).status).toBe(403);
  },30000);
  it('ends the actual room and denies admission when the live session finishes',async()=>{
    socket?.close();
    await db.enrollment.update({where:{userId_courseId:{userId,courseId}},data:{accessStatus:'ACTIVE'}});
    const issued=await media.issue({sub:userId,sid:authId,exp:Math.floor(Date.now()/1000)+600},sessionId,'viewer',courseId,lessonId);
    const headers={'x-lms-gateway-key':config.gatewayKey,'x-lms-media-token':issued.token};
    socket=new WebSocket(`ws://127.0.0.1:56788/rtc/v1?access_token=${encodeURIComponent(issued.token)}&join_request=EhYKDggFEgYyLjIzLjAYEGABEgQIARAB`);
    await new Promise<void>((resolve,reject)=>{socket!.addEventListener('message',()=>resolve(),{once:true});socket!.addEventListener('error',()=>reject(new Error('LiveKit signalling failed')),{once:true});setTimeout(()=>reject(new Error('LiveKit signalling timeout')),8000).unref();});
    await wait(async()=>(await adapter.participants(sessionId)).length > 0);
    await db.lmsLiveSession.update({where:{id:sessionId},data:{status:'ENDED'}});
    expect((await fetch(`${base}/authorize`,{headers})).status).toBe(403);
    await media.reconcile();
    const client=new RoomServiceClient(config.apiUrl,config.key,config.secret);
    await wait(async()=>(await client.listRooms([issued.room])).length===0);
    expect((await fetch(`${base}/authorize`,{headers})).status).toBe(403);
  },30000);
});
