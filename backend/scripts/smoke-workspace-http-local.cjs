// Local API acceptance: temporary identities, no orders/payments/provider writes.
const assert=require('node:assert/strict'), {randomUUID}=require('node:crypto'), fs=require('node:fs/promises'), path=require('node:path');
const {PrismaClient,UserRole}=require('@prisma/client'), {JwtService}=require('@nestjs/jwt');
if(process.env.ALLOW_LOCAL_ACCESS_SMOKE!=='true'||!['postgres','localhost','127.0.0.1'].includes(new URL(process.env.DATABASE_URL).hostname)) throw Error('Local-only test flag required');
const db=new PrismaClient(), jwt=new JwtService(), ids=[], tokens={}, rows=[];
const base='http://backend:3000/api/v1';
const cases=[
 ['/crm/tasks','crm.read',['ADMIN','MANAGER_B2B','MANAGER_SALES','SUPERVISOR','EXECUTIVE']],
 ['/crm/drive','crm.read',['ADMIN','MANAGER_B2B','MANAGER_SALES','SUPERVISOR','EXECUTIVE']],
 ['/customer-360/customers','customers.read',['ADMIN','MANAGER_B2B','MANAGER_SALES','SUPERVISOR','EXECUTIVE']],
 ['/oms/orders','oms.read',['ADMIN','MANAGER_B2B','MANAGER_SALES','SUPERVISOR','EXECUTIVE','WAREHOUSE','MARKETPLACE_MANAGER']],
 ['/helpdesk/tickets','helpdesk.read',['ADMIN','SUPERVISOR','EXECUTIVE','IT_SUPPORT']],
 ['/crm/content-plan','content_plan.read',['ADMIN','SUPERVISOR','EXECUTIVE','CONTENT_MANAGER','MANAGER_SALES','MANAGER_B2B']],
 ['/marketplaces/orders','marketplace.read',['ADMIN','MARKETPLACE_MANAGER','SUPERVISOR','EXECUTIVE','WAREHOUSE']],
 ['/admin/orders/list','web_orders.read',['ADMIN','MANAGER_SALES','SUPERVISOR','EXECUTIVE','WAREHOUSE','CONTENT_MANAGER']],
 ['/promotions','promotions.read',['ADMIN','MANAGER_SALES','SUPERVISOR','CONTENT_MANAGER']],
 ['/gift-cards/product','gift_card_product.read',['ADMIN','MANAGER_SALES','SUPERVISOR','CONTENT_MANAGER']],
 ['/gift-cards','gift_cards.read',['ADMIN','MANAGER_SALES','SUPERVISOR']],
 ['/1c-sync/status','integrations.read',['ADMIN','WAREHOUSE','SUPERVISOR','IT_SUPPORT']],
];
async function request(role,endpoint,options={}) { return fetch(base+endpoint,{...options,headers:{Authorization:`Bearer ${tokens[role]}`,...options.headers}}); }
(async()=>{
 const grants=await db.rolePermission.findMany({include:{permission:true}});
 for(const role of Object.values(UserRole)) {
  const user=await db.user.create({data:{email:`access-http-${randomUUID()}@example.invalid`,password:'unusable',firstName:'QA permissions',role}});ids.push(user.id);
  const session=await db.session.create({data:{userId:user.id,refreshToken:randomUUID(),expiresAt:new Date(Date.now()+600000)}});
  tokens[role]=await jwt.signAsync({sub:user.id,role,sid:session.id},{secret:process.env.JWT_SECRET,expiresIn:'10m'});
  const access=await request(role,'/auth/access');assert.equal(access.status,200);const actual=await access.json();
  const expected=grants.filter(g=>g.role===role).map(g=>g.permission.key).sort();assert.deepEqual(actual.permissions.sort(),expected,role);
  for(const [endpoint,permission,eligible]of cases) {
   const response=await request(role,endpoint), allowed=eligible.includes(role)&&expected.includes(permission);
   assert.equal(response.status,allowed?200:403,`${role} ${endpoint}`);await response.arrayBuffer();rows.push({role,endpoint,status:response.status});
  }
 }
 const executive=ids[Object.keys(UserRole).indexOf('EXECUTIVE')], admin=ids[Object.keys(UserRole).indexOf('ADMIN')];
 const form=new FormData();form.append('file',new Blob(['Permission smoke file'],{type:'text/plain'}),'permissions.txt');
 let response=await request('EXECUTIVE','/crm/drive/upload?scope=PERSONAL',{method:'POST',body:form});assert.equal(response.status,201,'Executive upload');const file=await response.json();
 response=await request('EXECUTIVE',`/crm/drive/${file.id}/content`);assert.equal(response.status,200);assert.equal(await response.text(),'Permission smoke file');
 response=await request('ADMIN',`/crm/drive/${file.id}/content`);assert.equal(response.status,404,'Private file stays private even for admin');
 const write=await db.permission.findUniqueOrThrow({where:{key:'crm.write'}});
 await db.userPermission.create({data:{userId:executive,permissionId:write.id,effect:'DENY'}});
 response=await request('EXECUTIVE','/crm/drive/upload?scope=PERSONAL',{method:'POST',body:form});assert.equal(response.status,403,'DENY enforced with existing session');
 const promo=await db.permission.findUniqueOrThrow({where:{key:'promotions.write'}});
 await db.userPermission.create({data:{userId:admin,permissionId:promo.id,effect:'DENY'}});
 response=await request('ADMIN','/promotions/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});assert.equal(response.status,403,'Promotions respect DENY for admin');
 await db.user.update({where:{id:executive},data:{isActive:false}});
 response=await request('EXECUTIVE','/crm/tasks');assert.equal(response.status,401,'Blocked identity loses an existing session');
 console.log('Workspace HTTP PASS',rows.length,'role/route combinations, effective grants for all 12 roles, executive upload/download, personal file isolation, live DENY and blocked sessions');
})().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(async()=>{
 try {
  const nodes=await db.crmDriveNode.findMany({where:{ownerId:{in:ids}},select:{id:true,storageKey:true}});
  await db.crmDriveNode.deleteMany({where:{ownerId:{in:ids}}});
  for(const node of nodes) if(node.storageKey&&/^[0-9a-f-]{36}$/.test(node.storageKey)) await fs.unlink(path.resolve('private-crm-files',node.storageKey)).catch(e=>{if(e.code!=='ENOENT')throw e;});
  await db.auditLog.deleteMany({where:{actorId:{in:ids}}});
  await db.user.deleteMany({where:{id:{in:ids}}});
 } finally {await db.$disconnect();}
});
