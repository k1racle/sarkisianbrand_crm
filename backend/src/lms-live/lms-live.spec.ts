import { LmsLiveService } from './lms-live.service';

describe('LMS live session API stays fail-closed', () => {
  const now=Date.now(), user={sub:'student',sid:'session',exp:Math.floor(now/1000)+3600};
  const live={id:'ed9a83ac-9c66-4c4d-90e0-b578d611f225',courseId:'course',lessonId:'lesson',hostId:'host',title:'Эфир',startsAt:new Date(now-60000),endsAt:new Date(now+120000),status:'LIVE',createdAt:new Date(now)};
  let db:any,media:any,service:LmsLiveService;
  beforeEach(()=>{
    db={lesson:{findFirst:jest.fn().mockResolvedValue({course:{enrollments:[{accessExpiresAt:null}]}})},user:{findUnique:jest.fn().mockResolvedValue({isActive:true,role:'CONTENT_MANAGER'})},lmsLiveSession:{findFirst:jest.fn().mockResolvedValue(live),findMany:jest.fn().mockResolvedValue([]),create:jest.fn().mockResolvedValue(live),updateMany:jest.fn().mockResolvedValue({count:1})},lmsLiveMessage:{findMany:jest.fn().mockResolvedValue([]),create:jest.fn().mockResolvedValue({id:'message',body:'Привет'})}};
    media={issue:jest.fn().mockResolvedValue({role:'viewer'}),closeRemote:jest.fn().mockResolvedValue(true)};
    service=new LmsLiveService(db,{get:()=>''} as any,media);
  });
  it('rejects joins before touching DB or media even if configured',async()=>{
    await expect(service.joinStudent(user,'course','lesson',live.id)).rejects.toThrow();
    expect(media.issue).not.toHaveBeenCalled(); expect(db.lesson.findFirst).not.toHaveBeenCalled();
  });
  it('passes the full login session to the media ACL, without issuing a raw user-identity token',async()=>{
    jest.spyOn(service as any,'settings').mockReturnValue({});
    await service.joinStudent(user,'course','lesson',live.id);
    expect(media.issue).toHaveBeenCalledWith(user,live.id,'viewer','course','lesson');
    await service.joinHost({...user,sub:'host'},live.id);
    expect(media.issue).toHaveBeenCalledWith({...user,sub:'host'},live.id,'host');
  });
  it('rejects unentitled users before chat access',async()=>{
    jest.spyOn(service as any,'settings').mockReturnValue({}); db.lesson.findFirst.mockResolvedValue(null);
    await expect(service.chat('outsider',live.id,'course','lesson')).rejects.toThrow();
    expect(db.lmsLiveMessage.findMany).not.toHaveBeenCalled();
  });
  it('isolates chat by session and rejects blank messages',async()=>{
    jest.spyOn(service as any,'settings').mockReturnValue({});
    await service.chat('student',live.id,'course','lesson');
    expect(db.lmsLiveMessage.findMany).toHaveBeenCalledWith(expect.objectContaining({where:{sessionId:live.id},take:100}));
    await expect(service.send('student',live.id,'  ','course','lesson')).rejects.toThrow();
    await service.send('student',live.id,' Привет ','course','lesson');
    expect(db.lmsLiveMessage.create).toHaveBeenCalledWith(expect.objectContaining({data:{sessionId:live.id,authorId:'student',body:'Привет'}}));
  });
  it('uses atomic start and attempts remote disconnection on end',async()=>{
    jest.spyOn(service as any,'settings').mockReturnValue({});
    db.lmsLiveSession.findFirst.mockResolvedValue({...live,status:'SCHEDULED'});
    expect(await service.transition('host',live.id,'start')).toEqual({id:live.id,status:'LIVE'});
    db.lmsLiveSession.findFirst.mockResolvedValue(live); media.closeRemote.mockResolvedValue(false);
    expect(await service.transition('host',live.id,'end')).toEqual({id:live.id,status:'ENDED',disconnectPending:true});
    expect(media.closeRemote).toHaveBeenCalledWith(live.id);
  });
});
