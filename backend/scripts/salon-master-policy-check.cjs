// Real PostgreSQL master eligibility and organization-row serialization; local
// temporary fixtures only. No sessions, provider calls or business records.
require('reflect-metadata');
const assert=require('node:assert/strict'),{randomUUID}=require('node:crypto'),{PrismaClient}=require('@prisma/client');
const {SalonBookingService}=require('../dist/src/b2b/salon-booking.service');
async function main(){
 const host=new URL(process.env.DATABASE_URL).hostname;assert.ok(['localhost','127.0.0.1'].includes(host)||(host==='postgres'&&process.env.SALON_MASTER_TEST_ALLOW_DOCKER==='1'),'Local database only');
 const db=new PrismaClient(),users=[],organizations=[];let release;
 try{
  const fixture=await db.$transaction(async tx=>{
   const organization=await tx.organization.create({data:{name:'Master policy '+randomUUID(),status:'ACTIVE'}});
   const owner=await tx.user.create({data:{email:'master-owner-'+randomUUID()+'@example.invalid',password:'not-a-login',role:'CUSTOMER_B2B'}}),master=await tx.user.create({data:{email:'master-staff-'+randomUUID()+'@example.invalid',password:'not-a-login',role:'CUSTOMER_B2B'}});
   await tx.organizationMember.create({data:{organizationId:organization.id,userId:owner.id,role:'OWNER'}});const member=await tx.organizationMember.create({data:{organizationId:organization.id,userId:master.id,role:'EMPLOYEE'}});
   const client=await tx.b2BClient.create({data:{organizationId:organization.id,firstName:'Проверка'}}),service=await tx.b2BService.create({data:{organizationId:organization.id,name:'Услуга',price:100,duration:30}});
   const settings={organizationId:organization.id,enabled:true,timeZone:'UTC',startMinute:540,endMinute:1200,slotStep:15,horizonDays:30,workingDays:[0,1,2,3,4,5,6],masterIds:[member.id]};await tx.salonBookingSetting.create({data:settings});return{organization,owner,master,member,client,service,settings};
  });users.push(fixture.owner.id,fixture.master.id);organizations.push(fixture.organization.id);
  const salon=new SalonBookingService(db),org=fixture.organization.id,day=new Date(Date.now()+86400000).toISOString().slice(0,10),actor={id:fixture.owner.id,label:'Владелец'};
  const create=hour=>salon.create(org,{clientId:fixture.client.id,serviceId:fixture.service.id,masterMemberId:fixture.member.id,startTime:`${day}T${String(hour).padStart(2,'0')}:00:00.000Z`},actor);
  const slots={serviceId:fixture.service.id,masterMemberId:fixture.member.id,date:day};assert.equal((await salon.publicProfile(org)).masters.length,1);
  const cases=[{member:{role:'BUYER'}},{member:{role:'ACCOUNTANT'}},{member:{isActive:false}},{user:{isActive:false}},{user:{role:'CUSTOMER_B2C'}}];
  for(const[index,change]of cases.entries()){
   const booking=await create(9+index);
   if(change.member)await db.organizationMember.update({where:{id:fixture.member.id},data:change.member});if(change.user)await db.user.update({where:{id:fixture.master.id},data:change.user});
   assert.equal((await salon.publicProfile(org)).masters.length,0);await assert.rejects(()=>salon.slots(org,slots),e=>e.getStatus()===404);await assert.rejects(()=>create(17),e=>e.getStatus()===404);
   const{organizationId,...settings}=fixture.settings;await assert.rejects(()=>salon.saveSettings(fixture.owner.id,settings),e=>e.getStatus()===400);
   const completed=await salon.update(org,booking.id,{version:booking.version,status:'COMPLETED'},actor);assert.equal(completed.masterMemberId,fixture.member.id,'Historical assignment must be retained');
   await db.organizationMember.update({where:{id:fixture.member.id},data:{role:'EMPLOYEE',isActive:true}});await db.user.update({where:{id:fixture.master.id},data:{role:'CUSTOMER_B2B',isActive:true}});
  }
  const older=await create(18),newer=await create(19);await Promise.all([salon.update(org,newer.id,{version:newer.version,status:'COMPLETED'},actor),salon.update(org,older.id,{version:older.version,status:'COMPLETED'},actor)]);
  const totals=await db.b2BClient.findUniqueOrThrow({where:{id:fixture.client.id}});assert.equal(totals.totalVisits,7);assert.equal(totals.totalSpent.toFixed(2),'700.00');assert.equal(totals.lastVisitAt.toISOString(),`${day}T19:00:00.000Z`);
  let locked;const lockAcquired=new Promise(resolve=>{locked=resolve;}),allowCommit=new Promise(resolve=>{release=resolve;});
  const teamWrite=db.$transaction(async tx=>{await tx.$queryRaw`SELECT id FROM "Organization" WHERE id=${org} FOR UPDATE`;await tx.organizationMember.update({where:{id:fixture.member.id},data:{role:'BUYER'}});locked();await allowCommit;},{timeout:10000});await lockAcquired;
  let settled=false;const pending=create(16).then(()=>{settled=true;throw new Error('Invalid master booking unexpectedly created');},error=>{settled=true;return error;});await new Promise(resolve=>setTimeout(resolve,100));assert.equal(settled,false,'Booking must wait for the team organization-row lock');release();release=null;await teamWrite;assert.equal((await pending).getStatus(),404);
  assert.equal(await db.b2BBooking.count({where:{organizationId:org}}),7);
  console.log('PASS salon master policy: buyer/accountant/inactive member/disabled or non-B2B user excluded from publication, slots, new bookings and settings; historical completion retained; latest visit stable under concurrent completion; booking waits for team organization-row lock. All fixtures removed.');
 }finally{
  release?.();await db.$transaction(async tx=>{await tx.b2BBooking.deleteMany({where:{organizationId:{in:organizations}}});await tx.b2BClient.deleteMany({where:{organizationId:{in:organizations}}});await tx.b2BService.deleteMany({where:{organizationId:{in:organizations}}});await tx.salonBookingSetting.deleteMany({where:{organizationId:{in:organizations}}});await tx.organizationMember.deleteMany({where:{organizationId:{in:organizations}}});await tx.organization.deleteMany({where:{id:{in:organizations}}});await tx.user.deleteMany({where:{id:{in:users}}});});await db.$disconnect();
 }
}
main().catch(error=>{console.error(error);process.exitCode=1});
