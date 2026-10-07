/* Explicit local QA only. Tests actual HTTP guards and PostgreSQL; removes its own fixtures. */
const {PrismaClient}=require('@prisma/client'),{randomUUID}=require('node:crypto'),bcrypt=require('bcrypt'),assert=require('node:assert/strict');
if(process.env.ALLOW_LOCAL_ACCESS_SMOKE!=='true')throw Error('Set ALLOW_LOCAL_ACCESS_SMOKE=true');
const db=new PrismaClient(),base='http://backend:3000/api/v1',key='qa-access-'+randomUUID(),users=[],departments=[],profiles=[],records={tasks:[],leads:[],customers:[],organizations:[],orders:[],tickets:[]};let admin;
async function api(path,token,method='GET',body,expected=200){const r=await fetch(base+path,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});const data=await r.json();assert.equal(r.status,expected,path+': '+JSON.stringify(data));return data}
const login=async(email,password)=>(await api('/auth/login',null,'POST',{email,password})).accessToken;
(async()=>{try{
 admin=await login(process.env.LOCAL_ADMIN_EMAIL,process.env.LOCAL_ADMIN_PASSWORD);
 for(let n=0;n<2;n++)departments.push(await db.crmDepartment.create({data:{name:key+n}}));
 const password='QA-'+randomUUID(),hash=await bcrypt.hash(password,12);
 for(let n=0;n<3;n++)users.push(await db.user.create({data:{email:key+n+'@local.test',password:hash,firstName:'QA '+n,role:'SUPERVISOR',departmentId:departments[n===2?1:0].id}}));
 for(const user of users){
  records.tasks.push(await db.task.create({data:{title:key,assignedToId:user.id,createdById:user.id}}));
  records.leads.push(await db.lead.create({data:{title:key,source:'QA',contactName:key,contactPhone:'',managerId:user.id}}));
  records.customers.push(await db.customer.create({data:{firstName:key,accountManagerId:user.id}}));
  records.organizations.push(await db.organization.create({data:{name:key,accountManagerId:user.id}}));
  records.orders.push(await db.order.create({data:{orderNumber:key+user.id,source:'WEB',managerId:user.id,totalAmount:10,finalAmount:10,shippingAddress:{}}}));
  records.tickets.push(await db.helpdeskTicket.create({data:{number:key+user.id,subject:key,description:'QA',source:'EMPLOYEE',assignedToId:user.id}}));
 }
 const keys=['crm.read','crm.write','customers.read','customers.write','oms.read','oms.write','helpdesk.read','helpdesk.write'];
 let profile=await api('/system-settings/access-profiles',admin,'POST',{name:key,description:'QA',grants:keys.map(permissionKey=>({permissionKey,scope:'DEPARTMENT',departmentIds:[]}))},201);profiles.push(profile.id);
 const oldToken=await login(users[0].email,password);
 await api('/system-settings/access-profiles/assign',admin,'POST',{employeeId:users[0].id,expectedAccessVersion:1,profiles:[{id:profile.id,version:1}]},201);
 await api('/crm/tasks',oldToken,'GET',undefined,401);
 let token=await login(users[0].email,password);
 for(const [path,rows] of [['/crm/tasks',records.tasks],['/crm/leads',records.leads],['/customer-360/customers',records.customers],['/customer-360/organizations',records.organizations],['/oms/orders/list',records.orders],['/helpdesk/tickets',records.tickets]]){
  const response=await api(path,token),list=Array.isArray(response)?response:response.items;
  assert(list.some(item=>item.id===rows[0].id),path+' own missing');assert(list.some(item=>item.id===rows[1].id),path+' department missing');assert(!list.some(item=>item.id===rows[2].id),path+' other department leaked');
  const detail=path.replace('/list','')+'/'+rows[2].id;
  await api(detail,token,'GET',undefined,404);
 }
 await api('/crm/tasks/'+records.tasks[2].id,token,'PATCH',{title:'Forbidden'},404);
 await api('/crm/tasks/'+records.tasks[2].id+'/files',token,'GET',undefined,404);
 await api('/crm/tasks/'+records.tasks[0].id,token,'PATCH',{title:'Allowed'});
 await api('/system-settings/access-profiles/assign',admin,'POST',{employeeId:users[0].id,expectedAccessVersion:1,profiles:[{id:profile.id,version:1}]},409);
 await api('/system-settings/access-profiles/'+profile.id+'/archive',admin,'POST',{version:1},409);
 profile=await api('/system-settings/access-profiles/'+profile.id,admin,'PATCH',{name:key,description:'QA version two',version:1,grants:keys.map(permissionKey=>({permissionKey,scope:'OWN',departmentIds:[]}))});
 assert((await api('/crm/tasks',token)).some(item=>item.id===records.tasks[1].id),'draft edit changed active permissions');
 await api('/system-settings/access-profiles/assign',admin,'POST',{employeeId:users[0].id,expectedAccessVersion:2,profiles:[{id:profile.id,version:2}]},201);
 await api('/crm/tasks',token,'GET',undefined,401);token=await login(users[0].email,password);
 assert(!(await api('/crm/tasks',token)).some(item=>item.id===records.tasks[1].id),'OWN broadened to department');
 const read=await db.permission.findUniqueOrThrow({where:{key:'crm.read'}}),write=await db.permission.findUniqueOrThrow({where:{key:'system.manage'}});
 await db.userPermission.createMany({data:[{userId:users[0].id,permissionId:read.id,effect:'DENY'},{userId:users[0].id,permissionId:write.id,effect:'ALLOW'}]});
 await api('/crm/tasks',token,'GET',undefined,403);const access=await api('/auth/access',token);assert(!access.permissions.includes('crm.read'));assert(!access.permissions.includes('system.manage'));
 await db.userPermission.deleteMany({where:{userId:users[0].id}});
 await api('/system-settings/access-profiles/employees/'+users[0].id+'/restore-role',admin,'POST',{expectedAccessVersion:3},201);await api('/crm/tasks',token,'GET',undefined,401);
 assert.equal((await db.user.findUnique({where:{id:users[0].id}})).accessProfileMode,false);
 console.log('PASS real HTTP: assigned department scope across tasks/leads/clients/companies/orders/support, foreign ID and file denial, writes, version snapshots, stale assignment, personal DENY, no legacy ALLOW, session revocation and role restoration');
 }finally{
 const ids=users.map(x=>x.id),entityIds=Object.values(records).flat().map(x=>x.id);
 await db.$transaction(async tx=>{
  await tx.auditLog.deleteMany({where:{OR:[{resourceId:{in:[...entityIds,...profiles,...ids]}},{actorId:{in:ids}}]}});
  await tx.task.deleteMany({where:{id:{in:records.tasks.map(x=>x.id)}}});await tx.lead.deleteMany({where:{id:{in:records.leads.map(x=>x.id)}}});await tx.helpdeskTicket.deleteMany({where:{id:{in:records.tickets.map(x=>x.id)}}});await tx.order.deleteMany({where:{id:{in:records.orders.map(x=>x.id)}}});await tx.customer.deleteMany({where:{id:{in:records.customers.map(x=>x.id)}}});await tx.organization.deleteMany({where:{id:{in:records.organizations.map(x=>x.id)}}});
  await tx.crmAccessAssignment.deleteMany({where:{userId:{in:ids}}});await tx.crmAccessProfile.deleteMany({where:{id:{in:profiles}}});await tx.user.deleteMany({where:{id:{in:ids}}});await tx.crmDepartment.deleteMany({where:{id:{in:departments.map(x=>x.id)}}});
 });await db.$disconnect();
 }})().catch(e=>{console.error(e);process.exitCode=1});
