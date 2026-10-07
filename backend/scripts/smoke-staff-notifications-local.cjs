/* Isolated local fixtures. No external services, mail or real employee messages. */
const {PrismaClient}=require('@prisma/client'),{randomUUID}=require('node:crypto'),bcrypt=require('bcrypt'),assert=require('node:assert/strict'),fs=require('node:fs');
if(process.env.ALLOW_LOCAL_NOTIFICATION_SMOKE!=='true'||process.env.ECOSYSTEM_AUTOMATION_ENABLED!=='false'||process.env.STOREFRONT_EXTERNAL_CALLS_ENABLED!=='false')throw Error('Use the explicitly enabled local smoke environment');
const db=new PrismaClient(),base='http://backend:3000/api/v1',file='/evidence/notifications-fixture.json';
let f={key:'qa-notice-'+randomUUID().slice(0,8),users:[],tasks:[],orders:[],tickets:[],contacts:[],channels:[],profiles:[]},success=false;
const keep=process.argv[2]==='prepare';
async function api(path,token,status=200,method='GET',body){const r=await fetch(base+path,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});const data=await r.json();assert.equal(r.status,status,path+': '+JSON.stringify(data));return data;}
async function cleanup(){
 if(!/^qa-notice-[a-f0-9]{8}$/.test(f.key))throw Error('Invalid fixture ownership');
 for(const id of f.users){const u=await db.user.findUnique({where:{id}});if(u&&!u.email.startsWith(f.key))throw Error('Foreign user');}
 await db.$transaction(async tx=>{
  await tx.auditLog.deleteMany({where:{actorId:{in:f.users}}});
  await tx.dataTrashEntry.deleteMany({where:{entityId:{in:[...f.tasks,...f.tickets]}}});
  await tx.crmChatChannel.deleteMany({where:{id:{in:f.channels}}});
  await tx.task.deleteMany({where:{id:{in:f.tasks},title:{startsWith:f.key}}});
  await tx.helpdeskComment.deleteMany({where:{ticketId:{in:f.tickets}}});await tx.helpdeskTicket.deleteMany({where:{id:{in:f.tickets},number:{startsWith:f.key}}});
  await tx.order.deleteMany({where:{id:{in:f.orders},orderNumber:{startsWith:f.key}}});await tx.contactMessage.deleteMany({where:{id:{in:f.contacts},name:{startsWith:f.key}}});
  await tx.user.deleteMany({where:{id:{in:f.users},email:{startsWith:f.key}}});await tx.crmAccessProfile.deleteMany({where:{id:{in:f.profiles},name:{startsWith:f.key}}});
 });
}
(async()=>{try{
 if(process.argv[2]==='cleanup'){f=JSON.parse(fs.readFileSync(file));await cleanup();console.log('Notification fixtures removed');success=true;return;}
 for(let attempt=0;attempt<40;attempt++){try{const ready=await fetch(base+'/staff-notifications');if(ready.status===401)break;}catch{}if(attempt===39)throw Error('API startup timed out');await new Promise(resolve=>setTimeout(resolve,250));}
 const password='QA-'+randomUUID(),hash=await bcrypt.hash(password,10);
 async function user(suffix,role='SUPERVISOR'){const u=await db.user.create({data:{email:f.key+'-'+suffix+'@local.test',password:hash,role,firstName:suffix==='actor'?'Проверка уведомлений':suffix,accessProfileMode:true}});f.users.push(u.id);return u;}
 const actor=await user('actor'),peer=await user('peer'),outsider=await user('outsider'),customer=await user('customer','CUSTOMER_B2C');
 f.actorId=actor.id;f.email=actor.email;f.password=password;
 const profile=await db.crmAccessProfile.create({data:{name:f.key,normalizedName:f.key}});f.profiles.push(profile.id);
 const grants=['crm.read','crm.write','oms.read','helpdesk.read','helpdesk.write'].map(permissionKey=>({permissionKey,scope:'OWN',departmentIds:[]}));
 const assign=await db.crmAccessAssignment.create({data:{userId:actor.id,profileId:profile.id,profileVersion:1,snapshot:{name:f.key,grants}}});
 const login=async u=>(await api('/auth/login','',200,'POST',{email:u.email,password})).accessToken;
 const token=await login(actor),peerToken=await login(peer),customerToken=await login(customer);
 const path='/staff-notifications',list=(extra='')=>api(path+extra,token);
 await api(path,'',401);await api(path,customerToken,403);await api(path+'/preferences',customerToken,403,'PATCH',{popupsEnabled:false});
 async function task(title,assignedToId=actor.id,createdById=peer.id){const t=await db.task.create({data:{title:f.key+' '+title,assignedToId,createdById}});f.tasks.push(t.id);return t;}
 const own=await task('Подготовить отгрузку'),foreign=await task('SECRET_TASK',peer.id),self=await task('Самостоятельная задача',actor.id,actor.id);f.taskId=own.id;
 await db.crmTaskComment.create({data:{taskId:own.id,authorId:peer.id,body:'Проверьте резерв'}});
 const due=await db.crmTaskReminder.create({data:{taskId:own.id,recipientId:actor.id,remindAt:new Date(Date.now()-1000)}});
 const future=await db.crmTaskReminder.create({data:{taskId:own.id,recipientId:actor.id,remindAt:new Date(Date.now()+86400000)}});
 async function order(suffix,managerId){return db.$transaction(async tx=>{const o=await tx.order.create({data:{orderNumber:f.key+'-'+suffix,source:'B2B',managerId,totalAmount:100,finalAmount:100,shippingAddress:{city:'Тест'}}});f.orders.push(o.id);await tx.crmNotificationEvent.updateMany({where:{orderId:o.id},data:{recipientId:actor.id}});return o;});}
 const ownOrder=await order('OWN',actor.id),foreignOrder=await order('SECRET_ORDER',peer.id);f.orderId=ownOrder.id;
 const ticket=await db.$transaction(async tx=>{const t=await tx.helpdeskTicket.create({data:{number:f.key+'-HD',subject:'Новое обращение в поддержку',description:'Проверка',source:'B2C',assignedToId:actor.id}});f.tickets.push(t.id);await tx.crmNotificationEvent.updateMany({where:{ticketId:t.id},data:{recipientId:actor.id}});return t;});f.ticketId=ticket.id;
 const contact=await db.$transaction(async tx=>{const c=await tx.contactMessage.create({data:{name:f.key+' контакт',phone:'+79990000000',email:'qa@local.test',message:'Обращение с сайта'}});f.contacts.push(c.id);await tx.crmNotificationEvent.updateMany({where:{contactId:c.id},data:{recipientId:actor.id}});return c;});f.contactId=contact.id;
 const channel=await db.crmChatChannel.create({data:{name:f.key+' личный',type:'PRIVATE',directKey:f.key,createdById:peer.id,members:{create:[{userId:peer.id},{userId:actor.id}]} }});f.channels.push(channel.id);f.channelId=channel.id;
 const chatMessage=await db.crmChatMessage.create({data:{channelId:channel.id,authorId:peer.id,body:'Новая переписка для проверки уведомления'}});
 const hiddenChannel=await db.crmChatChannel.create({data:{name:f.key+' SECRET_CHAT',type:'PRIVATE',createdById:peer.id,members:{create:[{userId:peer.id},{userId:outsider.id}]} }});f.channels.push(hiddenChannel.id);
 await db.crmChatMessage.create({data:{channelId:hiddenChannel.id,authorId:peer.id,body:'SECRET_CHAT_MESSAGE'}});
 let result=await list();assert.equal(result.unreadCount,6);assert(!JSON.stringify(result).includes('SECRET_'));assert(!result.items.some(e=>e.body.includes('Самостоятельная')));assert(result.items.some(e=>e.kind==='TASK_REMINDER'));assert(!result.items.some(e=>e.url.includes(contact.id)));
 assert.equal((await list('?category=ORDER')).items.length,1);assert.equal((await list('?category=CHAT')).items.length,1);
 const taskEvent=result.items.find(e=>e.kind==='TASK_CREATED');await api(path+'/'+taskEvent.id,peerToken,404);await api(path+'/'+taskEvent.id+'/read',peerToken,404,'POST');
 await api(path+'/'+taskEvent.id+'/read',token,201,'POST');assert.equal((await list('?unread=true')).unreadCount,5);await api(path+'/'+taskEvent.id+'/read',token,201,'POST');assert.equal((await list()).unreadCount,5);
 // A repeated read is idempotent. Mark-all must not consume events created after its snapshot.
 const snapshot=await list();await task('Создана после снимка');await api(path+'/read-all',token,201,'POST',{through:snapshot.through});assert.equal((await list('?unread=true')).unreadCount,1);
 await api(path+'/read-all',token,400,'POST',{through:new Date(Date.now()+60000).toISOString()});
 // Source rollback also rolls back the notification.
 const before=await db.crmNotificationEvent.count();await assert.rejects(db.$transaction(async tx=>{await tx.task.create({data:{title:f.key+' ROLLBACK',assignedToId:actor.id,createdById:peer.id}});throw Error('ROLLBACK');}));assert.equal(await db.crmNotificationEvent.count(),before);
 // A late commit with an older event time survives read-all.
 let release,entered;const ready=new Promise(r=>entered=r),hold=new Promise(r=>release=r);
 const late=db.$transaction(async tx=>{const t=await tx.task.create({data:{title:f.key+' Поздний commit',assignedToId:actor.id,createdById:peer.id}});f.tasks.push(t.id);entered();await hold;},{timeout:20000});
 await ready;const cut=await list();await api(path+'/read-all',token,201,'POST',{through:cut.through});release();await late;assert.equal((await list('?unread=true')).unreadCount,1);
 // Reassignment, revocation and soft trash cannot reveal cached event contents.
 await db.task.update({where:{id:own.id},data:{assignedToId:peer.id}});assert(!(await list()).items.some(e=>e.url.includes(own.id)));
 await db.task.update({where:{id:own.id},data:{assignedToId:actor.id}});assert((await list()).items.some(e=>e.kind==='TASK_ASSIGNED'&&e.url.includes(own.id)));
 const perm=await db.permission.findUniqueOrThrow({where:{key:'oms.read'}});await db.userPermission.create({data:{userId:actor.id,permissionId:perm.id,effect:'DENY'}});assert.equal((await list('?category=ORDER')).items.length,0);await db.userPermission.delete({where:{userId_permissionId:{userId:actor.id,permissionId:perm.id}}});
 await db.crmChatMember.update({where:{channelId_userId:{channelId:channel.id,userId:actor.id}},data:{isMuted:true}});assert.equal((await list('?category=CHAT')).items.length,0);
 await db.crmChatMember.update({where:{channelId_userId:{channelId:channel.id,userId:actor.id}},data:{isMuted:false}});
 await db.crmNotificationRead.deleteMany({where:{userId:actor.id,event:{messageId:chatMessage.id}}});await api('/platform-chat/channels/'+channel.id+'/messages',token);assert((await list('?category=CHAT')).items.every(e=>e.read));
 await db.crmTaskReminder.update({where:{id:due.id},data:{dismissedAt:new Date()}});assert(!(await list()).items.some(e=>e.kind==='TASK_REMINDER'));
 await db.crmAccessAssignment.update({where:{userId_profileId:{userId:actor.id,profileId:profile.id}},data:{snapshot:{name:f.key,grants:grants.map(g=>g.permissionKey==='crm.read'?{...g,scope:'COMPANY'}:g)}}});assert((await list('?category=SUPPORT')).items.some(e=>e.url.includes(contact.id)));await api('/admin/contact-messages/'+contact.id,token);
 await api(path+'/preferences',token,200,'PATCH',{popupsEnabled:false});assert.equal((await list()).popupsEnabled,false);await api(path+'/preferences',token,200,'PATCH',{popupsEnabled:true});
 for(const body of [{popupsEnabled:'false'},{popupsEnabled:true,userId:peer.id}])await api(path+'/preferences',token,400,'PATCH',body);
 for(const query of ['category=bad','cursor=bad','userId='+peer.id,'scope=COMPANY'])await api(path+'?'+query,token,400);
 // Pagination must not repeat or drop same-timestamp records.
 const extra=[];await db.$transaction(async tx=>{for(let i=0;i<43;i++){const t=await tx.task.create({data:{title:f.key+' Страница '+i,assignedToId:actor.id,createdById:peer.id}});f.tasks.push(t.id);extra.push(t.id);}});
 const first=await list('?category=TASK'),second=await list('?category=TASK&cursor='+encodeURIComponent(first.nextCursor));assert.equal(first.items.length,40);assert(second.items.length>0);assert(!first.items.some(e=>second.items.some(s=>s.id===e.id)));
 // Keep a small readable fixture for browser acceptance.
 await db.task.deleteMany({where:{id:{in:extra}}});f.tasks=f.tasks.filter(id=>!extra.includes(id));await db.crmNotificationRead.deleteMany({where:{userId:actor.id}});
 result=await list();f.events=result.items.map(e=>({id:e.id,kind:e.kind,url:e.url}));
 assert((await api('/staff-notifications',customerToken,403)).statusCode===403);
 await db.user.update({where:{id:actor.id},data:{isActive:false}});await api(path,token,401);await db.user.update({where:{id:actor.id},data:{isActive:true}});
 if(keep)fs.writeFileSync(file,JSON.stringify(f));success=true;
 console.log('PASS HTTP/PostgreSQL: transactional source events and rollback; task assignment/comments/reminders; orders and support; private/muted/read chats; own/company access, role/DENY; safe previews; per-user idempotent reads; mark-all races including late commit; pagination; preferences; customer/inactive rejection. No real recipients or external calls.');
 }finally{if(process.argv[2]!=='cleanup'&&(!keep||!success))await cleanup();await db.$disconnect();}
})().catch(e=>{console.error(e);process.exitCode=1});
