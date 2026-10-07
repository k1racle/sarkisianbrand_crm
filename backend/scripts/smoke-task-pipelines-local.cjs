/* Runs only against explicitly enabled local QA; all records roll back. */
const {PrismaClient}=require('@prisma/client'),assert=require('node:assert/strict');
const {CrmTaskPipelinesService,taskColumnLabels}=require('../dist/src/crm/task-pipelines.service');
const {CrmTaskWriteService}=require('../dist/src/crm/task-write.service'),{CrmReadAccess}=require('../dist/src/crm/read-access'),{CrmReadService}=require('../dist/src/crm/crm-read.service');
if(process.env.ALLOW_LOCAL_TASK_SMOKE!=='true')throw Error('Set ALLOW_LOCAL_TASK_SMOKE=true');
const db=new PrismaClient(),rollback=Error('QA rollback');
(async()=>{try{await db.$transaction(async tx=>{
 const bound=new Proxy(tx,{get(target,key){if(key==='$transaction')return fn=>typeof fn==='function'?fn(tx):Promise.all(fn);const v=Reflect.get(target,key);return typeof v==='function'?v.bind(target):v}});
 const actor=await tx.user.findUniqueOrThrow({where:{email:'admin@local.sarkisian.test'}}),access=new CrmReadAccess(),pipelines=new CrmTaskPipelinesService(bound,access),tasks=new CrmTaskWriteService(bound,access),reader=new CrmReadService(bound,access);
 const department=await tx.crmDepartment.create({data:{name:'QA отдел задач'}});
 const first=await pipelines.save(actor.id,{name:'QA производство',departmentId:department.id,labels:{...taskColumnLabels,TODO:'В очереди',DONE:'Изготовлено'}});
 const second=await pipelines.save(actor.id,{name:'QA продажи',labels:taskColumnLabels});
 const task=await tasks.create(actor.id,{title:'QA родитель',pipelineId:first.id});
 const child=await tasks.create(actor.id,{title:'QA подзадача',parentId:task.id});assert.equal(child.pipelineId,first.id);
 await assert.rejects(tasks.update(actor.id,task.id,{pipelineId:second.id}),/подзадачами/);
 await assert.rejects(tasks.create(actor.id,{title:'QA неверная',parentId:task.id,pipelineId:second.id}),/воронке родительской/);
 const independent=await tasks.create(actor.id,{title:'QA другая',pipelineId:second.id});
 await assert.rejects(tasks.move(actor.id,independent.id,'TODO',task.id),/Карточка назначения/);
 assert((await reader.tasks(actor.id,undefined,undefined,first.id)).every(item=>item.pipelineId===first.id));
 await tasks.update(actor.id,independent.id,{pipelineId:first.id});assert.equal((await reader.tasks(actor.id,undefined,undefined,second.id)).length,0);
 const revision=await pipelines.save(actor.id,{name:first.name,departmentId:department.id,labels:{...first.labels,TODO:'План производства'},expectedVersion:1},first.id);assert.equal(revision.version,2);
 await assert.rejects(pipelines.save(actor.id,{name:'QA stale',labels:taskColumnLabels,expectedVersion:1},first.id),/уже изменены/);
 const done=await tasks.update(actor.id,child.id,{status:'DONE'});assert.equal(done.progress,100);assert(done.completedAt);
 const overdue=await tasks.create(actor.id,{title:'QA срок',pipelineId:first.id,dueDate:'2020-01-01T00:00:00.000Z'});assert.equal(overdue.status,'OVERDUE');assert.equal(overdue.workflowStatus,'TODO');
 assert((await tx.auditLog.count({where:{resource:'crm.task-pipeline',resourceId:first.id}}))===2);
 throw rollback;
},{timeout:60000});}catch(e){if(e!==rollback)throw e}console.log('PASS department pipelines, isolated lists/order, inherited subtasks, transfer, labels, stale settings, deadlines, completion and audit; rolled back');})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>db.$disconnect());
