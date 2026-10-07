import { PlatformChatService } from './platform-chat.service';
import { chatFixture } from './chat-records.fixture';
jest.mock('./platform-chat.gateway',()=>({PlatformChatGateway:class {}}));
describe('Direct employee dialogs and history',()=>{
  function fixture(){
    const f=chatFixture(),stored=new Map<string,any>();
    f.db.user.count=jest.fn(async({where}:any)=>f.users.filter(user=>where.id.in.includes(user.id)&&user.isActive&&where.role.in.includes(user.role)).length);
    f.db.crmChatChannel.upsert=jest.fn(async({where,create}:any)=>{if(!stored.has(where.directKey))stored.set(where.directKey,{id:'direct',...create});return stored.get(where.directKey);});
    const records:any={assertStaff:jest.fn(async()=>{}),channels:jest.fn(async()=>[{id:'direct'}]),messages:jest.fn(async()=>[])};
    const realtime:any={publishChannel:jest.fn()};
    return {...f,stored,records,realtime,http:new PlatformChatService(f.db,realtime,records)};
  }
  it('reuses the same private pair in either direction with exactly two members',async()=>{
    const f=fixture();await f.http.openDirect('actor','peer');await f.http.openDirect('peer','actor');expect(f.stored.size).toBe(1);
    const row=f.stored.get('actor:peer');expect(row.type).toBe('PRIVATE');expect(row.members.create.map((r:any)=>r.userId)).toEqual(['actor','peer']);
  });
  it('rejects self, inactive and external recipients',async()=>{
    const f=fixture();await expect(f.http.openDirect('actor','actor')).rejects.toMatchObject({status:400});f.users[1].isActive=false;await expect(f.http.openDirect('actor','peer')).rejects.toMatchObject({status:400});f.users[1].isActive=true;f.users[1].role='B2B';await expect(f.http.openDirect('actor','peer')).rejects.toMatchObject({status:400});expect(f.stored.size).toBe(0);
  });
  it('does not mark latest messages read while browsing older history',async()=>{
    const f=fixture();await f.http.messages('direct','actor','anchor');expect(f.records.messages).toHaveBeenCalledWith('direct','actor','anchor');
  });
  it('rejects a cursor from another channel before reading message content',async()=>{
    const f=chatFixture();await expect(f.service.messages('channel','actor','foreign')).rejects.toMatchObject({status:404});expect(f.db.crmChatMessage.findMany).not.toHaveBeenCalled();
  });
  it('applies timestamp and ID keyset boundaries before the limit',async()=>{
    const f=chatFixture();await f.service.messages('channel','actor','message');expect(f.db.crmChatMessage.findMany.mock.calls[0][0]).toMatchObject({where:{channelId:'channel',OR:[{createdAt:{lt:f.messages[0].createdAt}},{createdAt:f.messages[0].createdAt,id:{lt:'message'}}]},take:100});
  });
  it('does not give an outsider admin access to personal history',async()=>{
    const f=chatFixture();f.channel.type='PRIVATE';f.channel.createdById='actor';f.channel.members=[{userId:'actor'}];f.users[1].role='ADMIN';await expect(f.service.messages('channel','peer')).rejects.toMatchObject({status:404});expect(await f.service.channels('peer')).toEqual([]);
  });
  it('projects the peer name for each participant',async()=>{
    const f=chatFixture();f.channel.type='PRIVATE';f.channel.directKey='actor:peer';f.channel.members=[{userId:'actor',user:{firstName:'Анна',lastName:'А'}},{userId:'peer',user:{firstName:'Иван',lastName:'Б'}}];expect((await f.service.channels('actor'))[0]).toMatchObject({name:'Иван Б',isDirect:true});expect((await f.service.channels('peer'))[0]).toMatchObject({name:'Анна А',isDirect:true});
  });
});
