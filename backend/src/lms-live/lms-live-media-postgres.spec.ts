import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { LmsLiveMediaAdapter } from './lms-live-media.adapter';
import { LmsLiveMediaService } from './lms-live-media.service';
import { LmsLiveService } from './lms-live.service';

const url=process.env.LMS_MEDIA_TEST_DATABASE_URL || process.env.LMS_TEST_DATABASE_URL;
if (url) { const value=new URL(url); if (!['127.0.0.1','localhost'].includes(value.hostname) || ![['56438','/lms_media_fixture'],['56432','/lms_fixture'],['55435','/lms_fixture']].some(([port,path])=>value.port===port&&value.pathname===path)) throw new Error('Live media tests require an isolated loopback fixture database'); }
const run=url ? describe : describe.skip;
run('LMS media control on isolated PostgreSQL',()=>{
  let db:PrismaClient,adapter:LmsLiveMediaAdapter,media:LmsLiveMediaService,live:LmsLiveService;
  let hostId:string,hostAuthId:string,userId:string,authId:string,courseId:string,moduleId:string,lessonId:string,sessionId:string;
  const config={url:'wss://media.example',apiUrl:'http://127.0.0.1:7880',key:'fixture-key',secret:'fixture-secret-at-least-32-bytes-long',gatewayKey:'fixture-gateway-secret-at-least-32-bytes'};
  beforeAll(async()=>{
    db=new PrismaClient({datasources:{db:{url:url!}}}); await db.$connect();
    const host=await db.user.create({data:{email:`host-${randomUUID()}@example.invalid`,password:'fixture',role:'CONTENT_MANAGER'}}); hostId=host.id;
    hostAuthId=(await db.session.create({data:{userId:hostId,refreshToken:`fixture-${randomUUID()}`,expiresAt:new Date(Date.now()+3600000)}})).id;
    const user=await db.user.create({data:{email:`user-${randomUUID()}@example.invalid`,password:'fixture',role:'CUSTOMER_B2C'}}); userId=user.id;
    const auth=await db.session.create({data:{userId,refreshToken:`fixture-${randomUUID()}`,expiresAt:new Date(Date.now()+3600000)}}); authId=auth.id;
    const course=await db.course.create({data:{titleRu:'Fixture',price:100}}); courseId=course.id;
    const module=await db.courseModule.create({data:{courseId,title:'Fixture'}}); moduleId=module.id;
    const lesson=await db.lesson.create({data:{courseId,moduleId,title:'Эфир',kind:'LIVE',isPublished:true}}); lessonId=lesson.id;
    await db.enrollment.create({data:{userId,courseId,accessStatus:'ACTIVE'}});
    const session=await db.lmsLiveSession.create({data:{courseId,lessonId,hostId,title:'Эфир',status:'LIVE',startsAt:new Date(Date.now()-60000),endsAt:new Date(Date.now()+3600000)}}); sessionId=session.id;
    adapter=new LmsLiveMediaAdapter({get:()=>undefined} as any); jest.spyOn(adapter,'settings').mockReturnValue(config);
    jest.spyOn(adapter,'probe').mockResolvedValue(); jest.spyOn(adapter,'ensure').mockResolvedValue(); jest.spyOn(adapter,'participants').mockResolvedValue([]); jest.spyOn(adapter,'remove').mockResolvedValue(); jest.spyOn(adapter,'close').mockResolvedValue();
    media=new LmsLiveMediaService(db as any,adapter); await media.reconcile();
    live=new LmsLiveService(db as any,{} as any,media); jest.spyOn(live as any,'settings').mockReturnValue({});
  });
  afterAll(async()=>{
    if (!db) return;
    if(sessionId)await db.auditLog.deleteMany({where:{resource:'lms.live',resourceId:sessionId}});
    if(sessionId)await db.lmsLiveSession.deleteMany({where:{id:sessionId}});
    if(courseId)await db.enrollment.deleteMany({where:{courseId}});
    if(lessonId)await db.lesson.deleteMany({where:{id:lessonId}});
    if(moduleId)await db.courseModule.deleteMany({where:{id:moduleId}});
    if(courseId)await db.course.deleteMany({where:{id:courseId}});
    if(userId)await db.session.deleteMany({where:{userId}});
    if(userId)await db.user.deleteMany({where:{id:userId}});
    if(hostId)await db.session.deleteMany({where:{userId:hostId}});
    if(hostId)await db.user.deleteMany({where:{id:hostId}});
    await db.$disconnect();
  });
  const claims=()=>({sub:userId,sid:authId,exp:Math.floor(Date.now()/1000)+600});
  it('issues an opaque identity and immediately denies it after course entitlement is revoked',async()=>{
    const result=await media.issue(claims(),sessionId,'viewer',courseId,lessonId);
    expect(result.room).toBe(`lms-${sessionId}`); await expect(media.authorize(result.token,config.gatewayKey)).resolves.toBeUndefined();
    await media.issue(claims(),sessionId,'viewer',courseId,lessonId);
    expect(await db.lmsLiveMediaGrant.count({where:{liveSessionId:sessionId,userId}})).toBe(1);
    const [grant]=await db.lmsLiveMediaGrant.findMany({where:{liveSessionId:sessionId}});
    expect(grant.id).not.toBe(userId);
    await db.enrollment.update({where:{userId_courseId:{userId,courseId}},data:{accessStatus:'REVOKED'}});
    await expect(media.authorize(result.token,config.gatewayKey)).rejects.toThrow();
    (adapter.participants as jest.Mock).mockResolvedValue([{identity:grant.id}]);
    await media.reconcile(); expect(adapter.remove).toHaveBeenCalledWith(sessionId,grant.id);
    await db.enrollment.update({where:{userId_courseId:{userId,courseId}},data:{accessStatus:'ACTIVE'}});
    (adapter.participants as jest.Mock).mockResolvedValue([]);
  });
  it('checks current host permissions and blocks a removed employee session',async()=>{
    const result=await media.issue({sub:hostId,sid:hostAuthId,exp:Math.floor(Date.now()/1000)+600},sessionId,'host');
    await expect(media.authorize(result.token,config.gatewayKey)).resolves.toBeUndefined();
    const permission=await db.permission.findUniqueOrThrow({where:{key:'lms.write'}});
    await db.userPermission.create({data:{userId:hostId,permissionId:permission.id,effect:'DENY'}});
    await expect(media.authorize(result.token,config.gatewayKey)).rejects.toThrow();
    await db.userPermission.delete({where:{userId_permissionId:{userId:hostId,permissionId:permission.id}}});
    await db.session.delete({where:{id:hostAuthId}});
    await expect(media.authorize(result.token,config.gatewayKey)).rejects.toThrow();
  });
  it('does not issue or mark a room open when the remote server is unavailable',async()=>{
    await db.lmsLiveSession.update({where:{id:sessionId},data:{mediaOpen:false}});
    const count=await db.lmsLiveMediaGrant.count({where:{liveSessionId:sessionId}});
    (adapter.ensure as jest.Mock).mockRejectedValueOnce(new Error('offline'));
    await expect(media.issue(claims(),sessionId,'viewer',courseId,lessonId)).rejects.toThrow();
    expect((await db.lmsLiveSession.findUniqueOrThrow({where:{id:sessionId}})).mediaOpen).toBe(false);
    expect(await db.lmsLiveMediaGrant.count({where:{liveSessionId:sessionId}})).toBe(count);
  });
  it('serializes delayed room creation with end, then denies the already returned token',async()=>{
    let started!:()=>void,release!:()=>void;
    const waitStarted=new Promise<void>(resolve=>started=resolve),waitRelease=new Promise<void>(resolve=>release=resolve);
    (adapter.ensure as jest.Mock).mockImplementationOnce(async()=>{started();await waitRelease;});
    const joined=media.issue(claims(),sessionId,'viewer',courseId,lessonId);
    await waitStarted;
    const ended=live.transition(hostId,sessionId,'end');
    release(); const token=await joined; const state=await ended;
    expect(state).toEqual({id:sessionId,status:'ENDED',disconnectPending:false});
    await expect(media.authorize(token.token,config.gatewayKey)).rejects.toThrow();
    expect(adapter.close).toHaveBeenCalledWith(sessionId);
  });
});
