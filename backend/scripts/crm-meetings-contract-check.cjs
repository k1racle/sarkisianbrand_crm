// Local PostgreSQL only. Synthetic meetings, people and audit events roll back.
require('dotenv').config();
const assert = require('node:assert/strict');
const {randomUUID} = require('node:crypto');
const {PrismaClient} = require('@prisma/client');
const {MeetingsService} = require('../dist/src/meetings/meetings.service');
async function main() {
  assert.ok(['localhost','127.0.0.1'].includes(new URL(process.env.DATABASE_URL).hostname), 'Local database only');
  const db = new PrismaClient(), rollback = new Error('ROLLBACK_MEETINGS'); let meetingId;
  const denied = (fn, status) => assert.rejects(fn, e => e.getStatus?.() === status);
  try {
    await db.$transaction(async tx => {
      const service = new MeetingsService(new Proxy(tx,{get:(target,key)=>key==='$transaction'?fn=>fn(tx):Reflect.get(target,key)}));
      const dept = await tx.crmDepartment.create({data:{name:'Проверка встреч '+randomUUID()}});
      const staff = (role, departmentId=null, isActive=true) => tx.user.create({data:{email:`meeting-${randomUUID()}@example.invalid`,password:'not-a-login',firstName:'Проверка',role,departmentId,isActive}});
      const admin = await staff('ADMIN'), executive = await staff('EXECUTIVE'), owner = await staff('MANAGER_SALES',dept.id), member = await staff('MANAGER_SALES',dept.id), outsider = await staff('MANAGER_SALES'), customer = await staff('CUSTOMER_B2C'), inactive = await staff('MANAGER_SALES',dept.id,false);
      const from = new Date(Date.now()+86400000), to = new Date(+from+86400000);
      const fields = {title:'Планёрка '+randomUUID(),agenda:'Проверить план запуска',kind:'TEAM',startsAt:new Date(+from+3600000).toISOString(),endsAt:new Date(+from+7200000).toISOString(),timezone:'Europe/Moscow',memberIds:[member.id]};
      const query = {from:from.toISOString(),to:to.toISOString(),q:fields.title,page:1,limit:30};
      const create = {...fields,requestKey:randomUUID()};
      const row = await service.create(owner.id,create); meetingId=row.id;
      assert.equal(row.members.length,1); assert.equal(row.canManage,true); assert.equal(row.videoAvailable,false);
      assert.equal('requestHash' in row,false); assert.equal('requestKey' in row,false); assert.equal('email' in row.organizer,false);
      assert.equal((await service.create(owner.id,create)).id,row.id);
      assert.equal(await tx.crmMeeting.count({where:{organizerId:owner.id}}),1);
      await denied(()=>service.create(owner.id,{...create,title:'Изменённый повтор'}),409);
      assert.equal((await service.list(member.id,query)).total,1); assert.equal((await service.detail(member.id,row.id)).canManage,false);
      assert.equal((await service.list(outsider.id,query)).total,0); await denied(()=>service.detail(outsider.id,row.id),404);
      assert.equal((await service.list(admin.id,query)).total,1); assert.equal((await service.list(executive.id,query)).total,1);
      await denied(()=>service.update(member.id,row.id,{...fields,version:1}),403);
      await denied(()=>service.update(executive.id,row.id,{...fields,version:1}),403);
      await denied(()=>service.list(customer.id,query),403); await denied(()=>service.list(inactive.id,query),403);
      const candidates = (await service.team(owner.id)).items.map(p=>p.id);
      assert.ok(candidates.includes(member.id)); assert.ok(!candidates.includes(outsider.id)); assert.ok(!candidates.includes(inactive.id));
      assert.equal((await service.team(outsider.id)).items.length,0);
      await denied(()=>service.team(owner.id,['invalid']),400);
      for(const memberIds of [[outsider.id],[inactive.id],[owner.id],[customer.id]]) await denied(()=>service.create(owner.id,{...create,requestKey:randomUUID(),memberIds}),400);
      await denied(()=>service.list(owner.id,{...query,to:new Date(+from+94*86400000).toISOString()}),400);
      // The admin can participate when editing somebody else's meeting (organizer stays unchanged).
      const updated = await service.update(admin.id,row.id,{...fields,title:fields.title+' перенесена',memberIds:[member.id,admin.id],version:1});
      assert.equal(updated.version,2); assert.equal(updated.organizerId,owner.id); assert.ok(updated.members.some(p=>p.id===admin.id));
      await denied(()=>service.update(owner.id,row.id,{...fields,version:1}),409);
      assert.equal((await service.detail(owner.id,row.id)).version,2);
      const denyPermission = async (user,key) => {
        const permission = await tx.permission.findUniqueOrThrow({where:{key}});
        await tx.userPermission.create({data:{userId:user.id,permissionId:permission.id,effect:'DENY'}});
      };
      await denyPermission(owner,'meetings.write');
      assert.equal((await service.detail(owner.id,row.id)).canManage,false);
      await denied(()=>service.update(owner.id,row.id,{...fields,version:2}),403);
      await denied(()=>service.create(owner.id,{...create,requestKey:randomUUID()}),403);
      await denyPermission(member,'meetings.read'); await denied(()=>service.detail(member.id,row.id),403);
      await denyPermission(admin,'meetings.manage'); await denied(()=>service.cancel(admin.id,row.id,{version:2,reason:'Отмена'}),403);
      await tx.userPermission.deleteMany({where:{userId:admin.id}});
      const cancelled = await service.cancel(admin.id,row.id,{version:2,reason:'План изменился'});
      assert.equal(cancelled.status,'CANCELLED'); assert.equal(cancelled.version,3); assert.equal(cancelled.canManage,false);
      assert.equal((await service.list(admin.id,query)).total,0); assert.equal((await service.list(admin.id,{...query,status:'CANCELLED'})).total,1);
      await denied(()=>service.update(admin.id,row.id,{...fields,version:3}),409);
      assert.equal(await tx.auditLog.count({where:{resource:'crm.meeting',resourceId:row.id}}),3);
      // Reject new memberships in archived departments, even before another login.
      await tx.userPermission.deleteMany({where:{userId:owner.id}});
      await tx.crmDepartment.update({where:{id:dept.id},data:{archivedAt:new Date()}});
      assert.equal((await service.team(owner.id)).items.length,0);
      throw rollback;
    },{timeout:30000});
  } catch(e) { if(e!==rollback) throw e; }
  finally { if(meetingId) assert.equal(await db.crmMeeting.count({where:{id:meetingId}}),0); await db.$disconnect(); }
  // A failed audit must roll back the meeting too, using the real transaction boundary.
  const db2 = new PrismaClient(); let rolledBackOrganizer;
  try {
    await assert.rejects(()=>db2.$transaction(async tx=>{
      const user = await tx.user.create({data:{email:`meeting-audit-${randomUUID()}@example.invalid`,password:'not-a-login',role:'ADMIN'}}); rolledBackOrganizer=user.id;
      const service = new MeetingsService(new Proxy(tx,{get:(target,key)=>key==='$transaction'?fn=>fn(new Proxy(tx,{get:(inner,prop)=>prop==='auditLog'?{create:async()=>{throw new Error('AUDIT_UNAVAILABLE');}}:Reflect.get(inner,prop)})):Reflect.get(target,key)}));
      await service.create(user.id,{title:'Не сохранять без истории',agenda:'',kind:'TEAM',startsAt:new Date(Date.now()+3600000).toISOString(),endsAt:new Date(Date.now()+7200000).toISOString(),timezone:'UTC',memberIds:[],requestKey:randomUUID()});
    }),/AUDIT_UNAVAILABLE/);
    assert.equal(await db2.crmMeeting.count({where:{organizerId:rolledBackOrganizer}}),0);
    assert.equal(await db2.user.count({where:{id:rolledBackOrganizer}}),0);
  } finally {await db2.$disconnect();}
  console.log('CRM meetings SQL PASS: scopes, participants, explicit DENY, idempotency, versions, cancel, safe DTO, audit rollback; synthetic data rolled back.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
