// Local contract test: all DB records are rolled back, no mail/jobs/external API.
const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const {PrismaClient}=require('@prisma/client');
const {CrmService}=require('../dist/src/crm/crm.service');
const {CrmDriveService}=require('../dist/src/crm/drive.service');
const {CrmContentService}=require('../dist/src/crm/content.service');
require('dotenv').config();
async function main(){
 const target=new URL(process.env.DATABASE_URL);
 assert.ok(['localhost','127.0.0.1'].includes(target.hostname),'This rollback test runs only on a local DB');
 const prisma=new PrismaClient(),rollback=new Error('ROLLBACK_CRM_CONTRACT');
 let folderId;
 try {
  await prisma.$transaction(async tx=>{
   const db=new Proxy(tx,{get(target,key){return key==='$transaction'?async fn=>fn(tx):Reflect.get(target,key);}});
   const actor=await tx.user.create({data:{email:`crm-contract-${randomUUID()}@example.invalid`,password:'not-a-login-credential',role:'ADMIN'}});
   const crm=new CrmService(db),drive=new CrmDriveService(db,{get:()=>undefined});
   const root=await drive.createFolder({scope:'PERSONAL',name:`Контракт ${randomUUID()}`},actor.id);folderId=root.id;
   const child=await drive.createFolder({scope:'PERSONAL',parentId:root.id,name:'Документы'},actor.id);
   await assert.rejects(()=>drive.update(root.id,{parentId:child.id},actor.id),/подпапку/);
   await assert.rejects(()=>drive.update(root.id,{name:'чужое'},randomUUID()),/недоступны/);
   await drive.trash(root.id,actor.id); assert.equal((await tx.crmDriveNode.findUnique({where:{id:child.id}})).trashBatch,root.id);
   await drive.restore(root.id,actor.id); assert.equal((await tx.crmDriveNode.findUnique({where:{id:child.id}})).deletedAt,null);
   const parent=await crm.createTask({title:'Проверка родителя',assignedToId:actor.id},actor.id);
   const a=await crm.createTask({title:'Подзадача 1',parentId:parent.id,assignedToId:actor.id},actor.id);
   const b=await crm.createTask({title:'Подзадача 2',parentId:parent.id,assignedToId:actor.id},actor.id);
   await crm.updateTask(a.id,{status:'DONE'}); assert.equal((await tx.task.findUnique({where:{id:parent.id}})).progress,50);
   await assert.rejects(()=>crm.moveTask(parent.id,'DONE'),/подзадачи/);
   await crm.moveTask(b.id,'IN_PROGRESS');
   const c=await crm.addTaskComment(parent.id,{body:'Контракт комментариев'},actor.id);
   assert.equal((await crm.taskComments(parent.id))[0].id,c.id);
   const node=await tx.crmDriveNode.create({data:{kind:'FILE',scope:'TEAM',ownerId:actor.id,name:`Contract-${randomUUID()}.txt`,mime:'text/plain',size:1}});
   await drive.link(parent.id,node.id,actor.id); await drive.link(parent.id,node.id,actor.id);
   assert.equal((await drive.taskFiles(parent.id)).length,1);
   await drive.unlinkTask(parent.id,node.id); assert.equal((await drive.taskFiles(parent.id)).length,0);
   const lead=await crm.createLead({title:'Контракт сделки',contactName:'Тестовый контакт',source:'CONTRACT_TEST'},actor.id);
   await drive.linkLead(lead.id,node.id,actor.id);
   assert.equal((await drive.leadFiles(lead.id)).length,1);
   await drive.unlinkLead(lead.id,node.id,actor.id);
   assert.equal((await drive.leadFiles(lead.id)).length,0);
   assert.ok((await crm.history('lead',lead.id)).items.length>=3,'lead creation and attachment history');
   await crm.updateTask(parent.id,{title:'Обновлённый заголовок'},undefined,actor.id);
   const history=await crm.history('task',parent.id);
   assert.ok(history.items.some(row=>row.payload.changes.some(c=>c.field==='title'&&c.to==='Обновлённый заголовок')));
   const content=new CrmContentService(db);
   let publication=await content.create({title:'Контракт контент-плана',platform:'YOUTUBE',format:'SHORTS',script:'Показать продукт',scheduledAt:'2099-09-23T09:00:00Z'},actor.id);
   publication=await content.update(publication.id,{version:publication.version,status:'REVIEW'},actor.id);
   publication=await content.approve(publication.id,publication.version,actor.id);
   await drive.link(publication.taskId,node.id,actor.id);
   publication=await content.get(publication.id);
   assert.equal(publication.approvedAt,null,'a changed attachment invalidates approval');
   publication=await content.approve(publication.id,publication.version,actor.id);
   publication=await content.update(publication.id,{version:publication.version,status:'PUBLISHED',publishedUrl:'https://example.invalid/post/1'},actor.id);
   assert.equal(publication.task.status,'DONE');
   await assert.rejects(()=>content.update(publication.id,{version:1,title:'устаревшая версия'},actor.id),/другим сотрудником/);
   const variant=await content.create({title:'Версия для VK',sourceId:publication.id,platform:'VK',format:'VIDEO'},actor.id);
   assert.equal(variant.ideaId,publication.ideaId);assert.equal((await drive.taskFiles(variant.taskId)).length,1);
   await content.archive(variant.id,variant.version,false);
   assert.ok((await content.get(variant.id)).archivedAt);
   throw rollback;
  },{timeout:20000});
 }catch(error){if(error!==rollback)throw error;}
 finally{const remains=folderId?await prisma.crmDriveNode.count({where:{id:folderId}}):0;await prisma.$disconnect();assert.equal(remains,0,'No fixture data may persist');}
 console.log('PostgreSQL contract PASS: private scope, folders/cycles/trash/restore, task hierarchy/progress/move/comments/attachments. All fixture records rolled back.');
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
