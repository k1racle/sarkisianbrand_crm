import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { LmsLiveMediaAdapter } from './lms-live-media.adapter';
import { LmsLiveMediaGatewayController } from './lms-live.controller';
import { LmsLiveMediaService } from './lms-live-media.service';

describe('private signalling authorization HTTP endpoint',()=>{
  const sessionId='10000000-0000-4000-8000-000000000001',grantId='20000000-0000-4000-8000-000000000001';
  const settings={url:'wss://media.example',apiUrl:'http://127.0.0.1:7880',key:'fixture-key',secret:'fixture-secret-that-is-longer-than-32-bytes',gatewayKey:'separate-gateway-secret-32-bytes'};
  const now=Date.now(), liveSession={id:sessionId,courseId:'course',lessonId:'lesson',hostId:'host',status:'LIVE',startsAt:new Date(now-60000),endsAt:new Date(now+600000)};
  const grant={id:grantId,liveSessionId:sessionId,userId:'student',userSessionId:'auth-session',role:'viewer',expiresAt:new Date(now+300000),revokedAt:null,liveSession};
  let app:INestApplication,base:string,adapter:LmsLiveMediaAdapter,media:LmsLiveMediaService,db:any;
  beforeAll(async()=>{
    db={session:{findFirst:jest.fn().mockResolvedValue({user:{id:'student',role:'CUSTOMER_B2C',isActive:true}})},enrollment:{findUnique:jest.fn().mockResolvedValue({accessStatus:'ACTIVE',accessExpiresAt:null})},lesson:{findFirst:jest.fn().mockResolvedValue({id:'lesson'})},lmsLiveSession:{findMany:jest.fn().mockResolvedValue([])},lmsLiveMediaGrant:{findUnique:jest.fn().mockResolvedValue(grant)}};
    adapter=new LmsLiveMediaAdapter({get:()=>undefined} as any); jest.spyOn(adapter,'settings').mockReturnValue(settings); jest.spyOn(adapter,'probe').mockResolvedValue();
    media=new LmsLiveMediaService(db,adapter); await media.reconcile();
    const module=await Test.createTestingModule({controllers:[LmsLiveMediaGatewayController],providers:[{provide:LmsLiveMediaService,useValue:media}]}).compile();
    app=module.createNestApplication(); app.setGlobalPrefix('api/v1'); await app.listen(0,'127.0.0.1');
    const address=app.getHttpServer().address(); base=`http://127.0.0.1:${address.port}/api/v1/lms-live-gateway/authorize`;
  });
  afterAll(async()=>{ await app?.close(); });
  it('returns 204 only for a valid token, secret and current entitlement; failures deny admission',async()=>{
    const issued=await adapter.issue(sessionId,grantId,'viewer',new Date(now+60000));
    const headers={'x-lms-media-token':issued.token,'x-lms-gateway-key':settings.gatewayKey};
    const ok=await fetch(base,{headers}); expect(ok.status).toBe(204); expect(ok.headers.get('cache-control')).toContain('no-store');
    const heartbeat=base.replace('/authorize','/health');
    expect((await fetch(heartbeat,{headers:{'x-lms-gateway-key':settings.gatewayKey}})).status).toBe(204);
    expect((await fetch(heartbeat,{headers:{'x-lms-gateway-key':'wrong'}})).status).toBe(401);
    expect((await fetch(base,{headers:{...headers,'x-lms-gateway-key':'wrong'}})).status).toBe(401);
    expect((await fetch(base,{headers:{...headers,'x-lms-media-token':'invalid'}})).status).toBe(401);
    db.enrollment.findUnique.mockResolvedValue({accessStatus:'REVOKED',accessExpiresAt:null});
    expect((await fetch(base,{headers})).status).toBe(403);
    db.enrollment.findUnique.mockResolvedValue({accessStatus:'ACTIVE',accessExpiresAt:null});
    (adapter.probe as jest.Mock).mockRejectedValue(new Error('down'));
    await expect(media.reconcile()).rejects.toThrow();
    expect((await fetch(base,{headers})).status).toBe(503);
    expect((await fetch(heartbeat,{headers:{'x-lms-gateway-key':settings.gatewayKey}})).status).toBe(503);
  });
});
