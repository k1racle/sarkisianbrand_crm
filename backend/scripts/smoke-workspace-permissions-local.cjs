// Real local PostgreSQL grants, real guards/services. All business fixtures roll back.
require('reflect-metadata');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { PrismaClient, UserRole } = require('@prisma/client');
const { Reflector } = require('@nestjs/core');
const { GUARDS_METADATA, METHOD_METADATA } = require('@nestjs/common/constants');
const { RolesGuard } = require('../dist/src/common/guards/roles.guard');
const { COMPANY_SCOPE } = require('../dist/src/common/guards/company-scope.guard');
const { PERMISSIONS_KEY } = require('../dist/src/common/decorators/permissions.decorator');
const { CrmReadAccess } = require('../dist/src/crm/read-access');
const { CrmReadService } = require('../dist/src/crm/crm-read.service');
const { CrmTaskWriteService } = require('../dist/src/crm/task-write.service');
const { CrmDriveService } = require('../dist/src/crm/drive.service');
const { jobPolicies, JobPolicy } = require('../dist/src/background-jobs/job-policy');
if (process.env.ALLOW_LOCAL_ACCESS_SMOKE !== 'true' || !['postgres','localhost','127.0.0.1'].includes(new URL(process.env.DATABASE_URL).hostname)) throw Error('Explicit local-only test flag required');
const db = new PrismaClient(), rollback = Error('ROLLBACK_ACCESS'), reflector = new Reflector();
const endpoints = [];
function scan(dir) {
 for (const entry of fs.readdirSync(dir, {withFileTypes:true})) {
  const file = path.join(dir, entry.name);
  if(entry.isDirectory()) scan(file);
  else if(entry.name.endsWith('.controller.js')) for(const c of Object.values(require(file))) {
   if(typeof c !== 'function' || !c.prototype) continue;
   for(const name of Object.getOwnPropertyNames(c.prototype)) {
    const handler=c.prototype[name]; if(name==='constructor'||!Reflect.hasMetadata(METHOD_METADATA,handler)) continue;
    const guards=[...(Reflect.getMetadata(GUARDS_METADATA,c)||[]),...(Reflect.getMetadata(GUARDS_METADATA,handler)||[])];
    if(!guards.includes(RolesGuard))continue;
    const meta=key=>reflector.getAllAndOverride(key,[handler,c])||[];
    endpoints.push({controller:c,handler,name,roles:meta('roles'),permissions:meta(PERMISSIONS_KEY),company:meta(COMPANY_SCOPE)});
   }
  }
 }
}
const tmp = fs.mkdtempSync(path.join(os.tmpdir(),'crm-access-'));
(async()=>{
 scan(path.resolve(__dirname,'../dist/src'));
 const catalogue=await db.permission.findMany(), keys=new Set(catalogue.map(p=>p.key));
 for(const [job,policy] of Object.entries(jobPolicies)) for(const key of policy.permissions) assert(keys.has(key),`Unknown permission ${key} in ${job}`);
 for(const e of endpoints) {
  assert(e.permissions.length,`${e.controller.name}.${e.name}: missing permissions`);
  for(const key of [...e.permissions,...e.company]) assert(keys.has(key),`Unknown permission ${key} in ${e.controller.name}.${e.name}`);
 }
 const grants=await db.rolePermission.findMany({select:{role:true,permission:{select:{key:true}}}});
 const granted=role=>grants.filter(g=>g.role===role).map(g=>g.permission.key);
 for(const key of ['crm.read','crm.write','customers.write','oms.write','helpdesk.read','helpdesk.write','content_plan.approve','work_schedule.publish']) assert(granted('EXECUTIVE').includes(key),`Executive needs ${key}`);
 for(const role of Object.values(UserRole).filter(r=>r!=='ADMIN')) for(const key of ['system.manage','security.audit.read','partners.payouts','meetings.manage']) assert(!granted(role).includes(key),`${role} must not inherit ${key}`);
 for(const role of ['CUSTOMER_B2C','CUSTOMER_B2B']) assert.equal(granted(role).length,0);
 const stats={roles:Object.keys(UserRole).length,endpoints:endpoints.length,guardChecks:0};
 try { await db.$transaction(async tx=>{
  let serial=0;
  const bound=new Proxy(tx,{get(target,key){if(key==='$transaction')return async fn=>{const point='access_'+(++serial);await tx.$executeRawUnsafe('SAVEPOINT '+point);try{const result=await fn(tx);await tx.$executeRawUnsafe('RELEASE SAVEPOINT '+point);return result;}catch(e){await tx.$executeRawUnsafe('ROLLBACK TO SAVEPOINT '+point);throw e;}};const v=Reflect.get(target,key);return typeof v==='function'?v.bind(target):v;}});
  const users={};
  for(const role of Object.values(UserRole)) users[role]=await tx.user.create({data:{role,email:`access-${randomUUID()}@example.invalid`,password:'not-a-login',firstName:role}});
  // Use real grants and users, cached only for this immutable test matrix.
  let current;
  const guard=new RolesGuard(reflector,{user:{findUnique:async()=>current},rolePermission:{findMany:async({where})=>grants.filter(g=>g.role===where.role&&where.permission.key.in.includes(g.permission.key))},userPermission:{findMany:async()=>[]}});
  for(const user of Object.values(users)) {
   current=user;
   for(const e of endpoints) {
    const context={getClass:()=>e.controller,getHandler:()=>e.handler,switchToHttp:()=>({getRequest:()=>({user:{sub:user.id,role:user.role}})})};
    let result;try{result=await guard.canActivate(context);}catch(error){assert.equal(error.status,403);result=false;}
    assert.equal(result,e.roles.includes(user.role)&&e.permissions.every(key=>granted(user.role).includes(key)),`${user.role}: ${e.controller.name}.${e.name}`);stats.guardChecks++;
   }
  }
  const access=new CrmReadAccess(), reader=new CrmReadService(bound,access), writer=new CrmTaskWriteService(bound,access), drive=new CrmDriveService(bound,{get:key=>key==='CRM_DRIVE_STORAGE_DIR'?tmp:undefined},access);
  // Authorization only: do not enqueue an exchange or contact any provider.
  new JobPolicy(access).assertPermissions(await access.resolve(tx,users.ADMIN.id,'integrations.write'),'1C_FULL_EXCHANGE');
  const executive=users.EXECUTIVE.id, manager=users.MANAGER_B2B.id;
  assert((await reader.team(executive)).some(p=>p.id===executive),'Executive must be selectable as responsible');
  const task=await writer.create(executive,{title:'QA permissions: printer',assignedToId:executive});
  await writer.comment(executive,task.id,{body:'QA approval'});
  const folder=await drive.createFolder({name:'QA personal',scope:'PERSONAL'},executive);
  const file=await drive.upload({originalname:'check.txt',buffer:Buffer.from('permission check'),size:16},{scope:'PERSONAL',parentId:folder.id},executive);
  assert.equal((await drive.content(file.id,executive)).buffer.toString(),'permission check');
  await drive.update(file.id,{name:'renamed.txt'},executive);
  await drive.trash(file.id,executive);await drive.restore(file.id,executive);
  await assert.rejects(drive.content(file.id,users.ADMIN.id),e=>e.status===404,'Administrator must not read someone else’s PERSONAL file');
  const peerFile=await drive.upload({originalname:'peer.txt',buffer:Buffer.from('private'),size:7},{scope:'PERSONAL'},manager);
  await assert.rejects(drive.content(peerFile.id,executive),e=>e.status===404,'Leadership must not read someone else’s PERSONAL file');
  const attached=await drive.uploadAttachment('task',task.id,{originalname:'invoice.txt',buffer:Buffer.from('qa'),size:2},executive);
  assert.equal((await drive.content(attached.node.id,executive)).buffer.toString(),'qa');
  const writePermission=catalogue.find(p=>p.key==='crm.write');
  await tx.userPermission.create({data:{userId:executive,permissionId:writePermission.id,effect:'DENY'}});
  await assert.rejects(drive.upload({originalname:'blocked.txt',buffer:Buffer.from('qa'),size:2},{scope:'PERSONAL'},executive),e=>e.status===403);
  await assert.rejects(writer.comment(executive,task.id,{body:'Must fail'}),e=>e.status===403);
  assert.equal((await reader.task(executive,task.id)).id,task.id,'Write DENY must preserve reading');
  const profile=await tx.crmAccessProfile.create({data:{name:'QA empty',normalizedName:randomUUID()}});
  await tx.user.update({where:{id:users.ADMIN.id},data:{accessProfileMode:true}});
  await tx.crmAccessAssignment.create({data:{userId:users.ADMIN.id,profileId:profile.id,profileVersion:1,snapshot:{name:'QA empty',grants:[]}}});
  await assert.rejects(reader.tasks(users.ADMIN.id),e=>e.status===403,'Empty assigned profile never falls back to ADMIN grants');
  throw rollback;
 },{timeout:120000}); } catch(e) { if(e!==rollback) throw e; }
 console.log('Workspace permissions PASS',JSON.stringify(stats),'real leadership task/file lifecycle, personal isolation, DENY and empty profiles; all fixtures rolled back');
})().catch(e=>{console.error(e.stack);process.exitCode=1;}).finally(async()=>{await db.$disconnect();fs.rmSync(tmp,{recursive:true,force:true});});
