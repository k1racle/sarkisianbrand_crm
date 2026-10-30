import { AccessToken, TrackSource } from 'livekit-server-sdk';
import { LmsLiveMediaAdapter } from './lms-live-media.adapter';
import { LmsLiveMediaService } from './lms-live-media.service';

describe('LMS media admission and reconciliation, isolated fixtures', () => {
  const sessionId='10000000-0000-4000-8000-000000000001', grantId='20000000-0000-4000-8000-000000000001';
  const settings={url:'wss://media.example',apiUrl:'http://127.0.0.1:7880',key:'fixture-key',secret:'fixture-secret-that-is-longer-than-32-bytes',gatewayKey:'separate-gateway-secret-32-bytes'};
  const now=Date.now(), user={sub:'student',sid:'auth-session',exp:Math.floor(now/1000)+3600};
  const liveSession={id:sessionId,courseId:'course',lessonId:'lesson',hostId:'host',status:'LIVE',startsAt:new Date(now-60000),endsAt:new Date(now+600000),updatedAt:new Date(now-1000),mediaOpen:true};
  let adapter:LmsLiveMediaAdapter, service:LmsLiveMediaService, db:any, grant:any;
  beforeEach(()=>{
    grant={id:grantId,liveSessionId:sessionId,userId:'student',userSessionId:'auth-session',role:'viewer',expiresAt:new Date(now+300000),revokedAt:null,liveSession};
    db={session:{findFirst:jest.fn().mockResolvedValue({user:{id:'student',role:'CUSTOMER_B2C',isActive:true}})},enrollment:{findUnique:jest.fn().mockResolvedValue({accessStatus:'ACTIVE',accessExpiresAt:null})},lesson:{findFirst:jest.fn().mockResolvedValue({id:'lesson'})},user:{findUnique:jest.fn().mockResolvedValue({id:'host',role:'CONTENT_MANAGER',isActive:true,departmentId:null,accessProfileMode:false})},rolePermission:{findMany:jest.fn().mockResolvedValue([{permission:{key:'lms.read'}},{permission:{key:'lms.write'}}])},userPermission:{findMany:jest.fn().mockResolvedValue([])},lmsLiveSession:{findMany:jest.fn().mockResolvedValue([liveSession]),updateMany:jest.fn().mockResolvedValue({count:1})},lmsLiveMediaGrant:{findUnique:jest.fn().mockResolvedValue(grant),updateMany:jest.fn().mockResolvedValue({count:1})}};
    adapter=new LmsLiveMediaAdapter({get:()=>undefined} as any);
    jest.spyOn(adapter,'settings').mockReturnValue(settings);
    jest.spyOn(adapter,'probe').mockResolvedValue(); jest.spyOn(adapter,'participants').mockResolvedValue([]); jest.spyOn(adapter,'remove').mockResolvedValue(); jest.spyOn(adapter,'close').mockResolvedValue();
    service=new LmsLiveMediaService(db,adapter);
  });
  it('cannot be enabled solely by flags or credentials while strict revocation is incomplete',()=>{
    const disabled=new LmsLiveMediaAdapter({get:()=> 'true'} as any);
    expect(()=>disabled.settings()).toThrow();
  });
  it('signs an opaque viewer identity, limits TTL, and rejects wrong gateway secrets and privileged tokens',async()=>{
    const result=await adapter.issue(sessionId,grantId,'viewer',new Date(now+12000));
    expect(result.room).toBe(`lms-${sessionId}`); expect(result.expiresIn).toBeGreaterThan(0); expect(result.expiresIn).toBeLessThanOrEqual(12);
    const claims=await adapter.verify(result.token,settings.gatewayKey);
    expect(claims).toEqual({identity:grantId,room:`lms-${sessionId}`,canPublish:false});
    await expect(adapter.verify(result.token,'wrong-key')).rejects.toThrow();
    const admin=new AccessToken(settings.key,settings.secret,{identity:grantId,ttl:60});
    admin.addGrant({room:`lms-${sessionId}`,roomJoin:true,roomAdmin:true,canSubscribe:true,canPublishData:false});
    await expect(adapter.verify(await admin.toJwt(),settings.gatewayKey)).rejects.toThrow();
    const data=new AccessToken(settings.key,settings.secret,{identity:grantId,ttl:60});
    data.addGrant({room:`lms-${sessionId}`,roomJoin:true,canSubscribe:true,canPublishData:true});
    await expect(adapter.verify(await data.toJwt(),settings.gatewayKey)).rejects.toThrow();
  });
  it('gateway rechecks entitlement, actual login session, room and role on every reconnect',async()=>{
    await service.reconcile();
    const result=await adapter.issue(sessionId,grantId,'viewer',new Date(now+60000));
    await expect(service.authorize(result.token,settings.gatewayKey)).resolves.toBeUndefined();
    db.enrollment.findUnique.mockResolvedValue({accessStatus:'REVOKED',accessExpiresAt:null});
    await expect(service.authorize(result.token,settings.gatewayKey)).rejects.toThrow();
    db.enrollment.findUnique.mockResolvedValue({accessStatus:'ACTIVE',accessExpiresAt:new Date(now-1)});
    await expect(service.authorize(result.token,settings.gatewayKey)).rejects.toThrow();
    db.enrollment.findUnique.mockResolvedValue({accessStatus:'ACTIVE',accessExpiresAt:null}); db.session.findFirst.mockResolvedValue(null);
    await expect(service.authorize(result.token,settings.gatewayKey)).rejects.toThrow();
  });
  it('reconciliation removes revoked/unknown participants and closes expired sessions',async()=>{
    (adapter.participants as jest.Mock).mockResolvedValue([{identity:grantId},{identity:'unknown'}]);
    db.enrollment.findUnique.mockResolvedValue({accessStatus:'REVOKED',accessExpiresAt:null});
    await service.reconcile();
    expect(adapter.remove).toHaveBeenCalledWith(sessionId,grantId); expect(adapter.remove).toHaveBeenCalledWith(sessionId,'unknown');
    db.lmsLiveSession.findMany.mockResolvedValue([{...liveSession,status:'ENDED',updatedAt:new Date(now-180000)}]);
    await service.reconcile(); expect(adapter.close).toHaveBeenCalledWith(sessionId);
    expect(db.lmsLiveSession.updateMany).toHaveBeenCalledWith(expect.objectContaining({where:expect.objectContaining({id:sessionId,mediaOpen:true}),data:{mediaOpen:false}}));
  });
  it('refuses admission after probe or disconnect failure instead of accepting stale health',async()=>{
    await service.reconcile();
    const result=await adapter.issue(sessionId,grantId,'viewer',new Date(now+60000));
    (adapter.probe as jest.Mock).mockRejectedValue(new Error('down'));
    await expect(service.reconcile()).rejects.toThrow();
    await expect(service.authorize(result.token,settings.gatewayKey)).rejects.toThrow();
  });
  it('rejects forged host publication when the grant is for a viewer',async()=>{
    await service.reconcile();
    const token=new AccessToken(settings.key,settings.secret,{identity:grantId,ttl:60});
    token.addGrant({room:`lms-${sessionId}`,roomJoin:true,canPublish:true,canSubscribe:true,canPublishData:false,canPublishSources:[TrackSource.CAMERA]});
    await expect(service.authorize(await token.toJwt(),settings.gatewayKey)).rejects.toThrow();
  });
  it('rejects a validly signed token bound to a different room or a revoked grant',async()=>{
    await service.reconcile();
    const token=new AccessToken(settings.key,settings.secret,{identity:grantId,ttl:60});
    token.addGrant({room:'lms-30000000-0000-4000-8000-000000000001',roomJoin:true,canPublish:false,canSubscribe:true,canPublishData:false});
    await expect(service.authorize(await token.toJwt(),settings.gatewayKey)).rejects.toThrow();
    const normal=await adapter.issue(sessionId,grantId,'viewer',new Date(now+60000));
    db.lmsLiveMediaGrant.findUnique.mockResolvedValue({...grant,revokedAt:new Date()});
    await expect(service.authorize(normal.token,settings.gatewayKey)).rejects.toThrow();
  });
  it('closes on host permission removal',async()=>{
    grant={...grant,userId:'host',role:'host'};
    db.lmsLiveMediaGrant.findUnique.mockResolvedValue(grant);
    db.session.findFirst.mockResolvedValue({user:{id:'host',role:'CONTENT_MANAGER',isActive:true}});
    await service.reconcile();
    const token=await adapter.issue(sessionId,grantId,'host',new Date(now+60000));
    await expect(service.authorize(token.token,settings.gatewayKey)).resolves.toBeUndefined();
    db.rolePermission.findMany.mockResolvedValue([{permission:{key:'lms.read'}}]);
    await expect(service.authorize(token.token,settings.gatewayKey)).rejects.toThrow();
  });
});
