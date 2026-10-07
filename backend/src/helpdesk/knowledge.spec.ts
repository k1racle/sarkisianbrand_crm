import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { KnowledgeService } from './knowledge.service';
import { KnowledgeCreateDto, KnowledgeQueryDto } from './knowledge.dto';
const dto={title:'Инструкция',category:'Заказы',body:'Проверить заказ перед передачей на сборку.'};
function fixture(){
  const actor={role:'IT_SUPPORT',isActive:true},permissions=['helpdesk.read','knowledge.write'];
  const db={user:{findUnique:jest.fn(async()=>actor)},rolePermission:{findMany:jest.fn(async()=>permissions.map(key=>({permission:{key}})))},userPermission:{findMany:jest.fn(async()=>[] as any[])},crmKnowledgeArticle:{count:jest.fn(async()=>21),findMany:jest.fn(async(args:any)=>[]),findFirst:jest.fn(async(args:any)=>null as any),create:jest.fn(async({data}:any)=>({id:'article',version:1,status:'DRAFT',...data})),updateMany:jest.fn(async(args:any)=>({count:1})),findUniqueOrThrow:jest.fn(async()=>({id:'article',version:2}))},auditLog:{create:jest.fn(async(args:any)=>({}))}};
  return {actor,permissions,db,service:new KnowledgeService({$transaction:async run=>run(db)} as any)};
}
describe('Knowledge base access and editing',()=>{
  it('allows readers only published search results and bounds pages',async()=>{
    const {service,permissions,db}=fixture();permissions.pop();const result=await service.list('actor',{status:'PUBLISHED',search:'сборка',page:100});
    expect(result).toMatchObject({page:2,pages:2,canWrite:false});expect(db.crmKnowledgeArticle.findMany.mock.calls[0][0]).toMatchObject({where:{status:'PUBLISHED'},skip:20,take:20});
    await expect(service.list('actor',{status:'ALL',page:1})).rejects.toThrow('Черновики');
  });
  it('does not expose unpublished article by ID to a reader',async()=>{
    const {service,permissions,db}=fixture();permissions.pop();await expect(service.detail('actor','hidden')).rejects.toThrow('Статья не найдена');expect(db.crmKnowledgeArticle.findFirst.mock.calls[0][0].where).toEqual({id:'hidden',status:'PUBLISHED'});
  });
  it('rejects external and inactive accounts',async()=>{
    const {service,actor}=fixture();actor.role='B2B';await expect(service.list('actor',{status:'PUBLISHED',page:1})).rejects.toThrow('Нет доступа');actor.role='ADMIN';actor.isActive=false;await expect(service.create('actor',dto)).rejects.toThrow('Нет доступа');
  });
  it('honors DENY on editing',async()=>{
    const {service,db}=fixture();db.userPermission.findMany.mockResolvedValue([{effect:'DENY',permission:{key:'knowledge.write'}}]);await expect(service.create('actor',dto)).rejects.toThrow('Нет права');expect(db.crmKnowledgeArticle.create).not.toHaveBeenCalled();
  });
  it('creates only a draft and audits the operation',async()=>{
    const {service,db}=fixture();expect(await service.create('actor',dto)).toMatchObject({status:'DRAFT',version:1});expect(db.auditLog.create.mock.calls[0][0].data.action).toBe('CREATE');
  });
  it('prevents silent overwrites from a stale editor',async()=>{
    const {service,db}=fixture();db.crmKnowledgeArticle.updateMany.mockResolvedValue({count:0});await expect(service.update('actor','article',{...dto,version:1,status:'PUBLISHED'})).rejects.toThrow('уже изменена');expect(db.auditLog.create).not.toHaveBeenCalled();
  });
  it('updates with a version predicate and audits publication',async()=>{
    const {service,db}=fixture();await service.update('actor','article',{...dto,version:1,status:'PUBLISHED'});expect(db.crmKnowledgeArticle.updateMany.mock.calls[0][0]).toMatchObject({where:{id:'article',version:1},data:{status:'PUBLISHED',version:{increment:1}}});expect(db.auditLog.create.mock.calls[0][0].data.payload).toEqual({version:2,status:'PUBLISHED'});
  });
  it('rejects whitespace, oversized bodies and forged status on creation',async()=>{
    for(const patch of [{title:'  '},{body:'x'.repeat(50001)},{status:'PUBLISHED'}])expect((await validate(plainToInstance(KnowledgeCreateDto,{...dto,...patch}),{whitelist:true,forbidNonWhitelisted:true})).length).toBeGreaterThan(0);
    expect((await validate(plainToInstance(KnowledgeQueryDto,{page:0,status:'PRIVATE'}))).length).toBeGreaterThan(0);
  });
});
