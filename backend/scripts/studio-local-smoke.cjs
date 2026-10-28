// Run against the LOCAL compose database. Only temporary users and their rewards are removed.
const assert=require('node:assert/strict'),{PrismaClient}=require('@prisma/client'),{randomUUID}=require('crypto'),{StudioService}=require('../dist/src/studio/studio.service');
const db=new PrismaClient(),service=new StudioService(db),users=[],codes=[];
const denied=async(fn,pattern)=>{await assert.rejects(fn,new RegExp(pattern.source,'i'))};
async function user(){const u=await db.user.create({data:{email:`studio-smoke-${randomUUID()}@example.test`,password:'not-a-login-password',firstName:'Smoke',role:'CUSTOMER_B2C'}});users.push(u.id);await service.me(u.id);return u.id}
(async()=>{try{
 const catalog=await service.catalog();assert.deepEqual(catalog.offers.map(o=>[o.discountPercent,o.coinPrice,o.validDays]),[[5,15000,30],[10,35000,30],[15,60000,30]]);
 const a=await user(),b=await user();assert.equal((await service.me(a)).balance,1250);
 const run=await service.start(a,'anna-french');await denied(()=>service.complete(a,run.id,{kind:'manicure',nails:[]}),/через/);
 await denied(()=>service.checkpoint(b,run.id,{technique:'combined',step:'clean'}),/не найден/);
 await db.studioRun.update({where:{id:run.id},data:{startedAt:new Date(Date.now()-65000),lastCheckpointAt:new Date(Date.now()-1000)}});
 await denied(()=>service.checkpoint(a,run.id,{technique:'combined',step:'cut'}),/по порядку/);
 for(const step of ['clean','remove','push','pocket','cut','polish','shape','buff','base']){await db.studioRun.update({where:{id:run.id},data:{lastCheckpointAt:new Date(Date.now()-1000)}});await service.checkpoint(a,run.id,{technique:'combined',step});}
 const design={kind:'manicure',shape:'almond',length:'natural',nails:Array.from({length:5},()=>({color:'rose',pattern:'french'}))};
 const rewards=await Promise.all([service.complete(a,run.id,design),service.complete(a,run.id,design)]);assert.equal(rewards[0].reward,180);assert.equal((await service.me(a)).balance,1430);assert.equal(await db.studioTransaction.count({where:{userId:a,kind:'CLIENT'}}),1);
 await denied(()=>service.buy(a,{offerId:'discount-5',requestId:randomUUID()}),/не хватает/);
 await db.studioAccount.update({where:{userId:a},data:{balance:15000}});
 const key=randomUUID();const bought=await Promise.all([service.buy(a,{offerId:'discount-5',requestId:key}),service.buy(a,{offerId:'discount-5',requestId:key})]);codes.push(bought[0].purchase.code);assert.equal(bought[0].purchase.code,bought[1].purchase.code);assert.equal((await service.me(a)).balance,0);assert.equal(await db.studioRewardPurchase.count({where:{userId:a}}),1);
 const promo=await db.promoCode.findUniqueOrThrow({where:{code:codes[0]}});assert.equal(promo.restrictedUserId,a);assert.equal(promo.usageLimit,1);assert.ok(Math.abs(promo.endsAt.getTime()-Date.now()-30*86400000)<10000);
 await denied(()=>service.buy(a,{offerId:'discount-10',requestId:key}),/уже использован/);
 await db.studioAccount.update({where:{userId:b},data:{balance:15000}});
 const race=await Promise.allSettled([service.buy(b,{offerId:'discount-5',requestId:randomUUID()}),service.buy(b,{offerId:'discount-5',requestId:randomUUID()})]);assert.equal(race.filter(r=>r.status==='fulfilled').length,1);for(const r of race)if(r.status==='fulfilled')codes.push(r.value.purchase.code);assert.equal((await service.me(b)).balance,0);
 await denied(()=>service.spend(a,'lamp',randomUUID()),/не хватает/);
 assert.equal(await db.studioTransaction.count({where:{userId:a,kind:'DISCOUNT'}}),1);
 console.log('PASS: actual PostgreSQL transactions, owned runs, ordered checkpoints, 60s minimum, idempotent completion, insufficient funds, concurrent purchases, single-use owned codes, 30-day expiry');
}finally{const issued=await db.studioRewardPurchase.findMany({where:{userId:{in:users}},select:{code:true}});codes.push(...issued.map(p=>p.code));await db.user.deleteMany({where:{id:{in:users}}});await db.promoCode.deleteMany({where:{code:{in:codes}}});await db.$disconnect()}})().catch(e=>{console.error(e.message);process.exitCode=1});
