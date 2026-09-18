import { Prisma } from '@prisma/client';
import { createHash } from 'crypto';
import { moneyMinor } from '../common/storefront-utils';
export const partnerHash=(value:string)=>createHash('sha256').update(value).digest('hex');
export function rewardValue(baseAmount:unknown,percent:unknown,kind:string){
 const base=moneyMinor(baseAmount),basis=moneyMinor(percent);
 const minor=Number(BigInt(base)*BigInt(basis)/10000n);
 return kind==='REFERRAL'?Math.floor(minor/100):minor/100;
}
const phone=(value:unknown)=>String(value||'').replace(/\D/g,'').replace(/^8(?=\d{10}$)/,'7');
export async function attachPartner(tx:Prisma.TransactionClient,order:any,token:string,actor?:{sub:string;role?:string}){
 if(!/^[a-f0-9]{64}$/.test(token)||order.source!=='WEB'||order.organizationId||(actor&&actor.role!=='CUSTOMER_B2C')||order.items?.some((i:any)=>i.productType==='GIFT_CARD')||order.currency!=='RUB')return null;
 const click=await tx.partnerClick.findUnique({where:{tokenHash:partnerHash(token)},include:{participant:{include:{user:{select:{id:true,email:true,phone:true,role:true,isActive:true}}}}}});
 if(!click||click.expiresAt<=new Date())return null;
 const p=click.participant,user=p.user;
 if(p.status!=='ACTIVE'||!p.acceptedTermsAt||!user.isActive||user.role!=='CUSTOMER_B2C'||user.id===actor?.sub||user.email.toLowerCase()===String(order.buyerEmail||'').toLowerCase()||(phone(user.phone)&&phone(user.phone)===phone(order.buyerPhone)))return null;
 const buyer=await tx.user.findUnique({where:{email:String(order.buyerEmail).trim().toLowerCase()},select:{id:true,role:true}});
 if(buyer&&(buyer.id===user.id||buyer.role!=='CUSTOMER_B2C'))return null;
 const program=await tx.partnerProgramSetting.findUnique({where:{kind:p.kind}});
 const base=Math.max(0,moneyMinor(order.finalAmount)-moneyMinor(order.shippingCost));
 if(!program?.isEnabled||base<moneyMinor(program.minimumOrderAmount)||base===0)return null;
 if(p.kind==='REFERRAL'&&(await tx.loyaltyProgramSetting.findUnique({where:{id:'default'}}))?.isEnabled===false)return null;
 await tx.partnerAttribution.create({data:{orderId:order.id,participantId:p.id,clickId:click.id,rewardPercent:p.rewardPercent??program.rewardPercent,baseAmount:base/100,holdDays:program.holdDays,firstOrderOnly:program.firstOrderOnly}});
 return p.code;
}
/** Owning Order lock is already held. No crediting another user's account here. */
export async function partnerOrderPaid(tx:Prisma.TransactionClient,order:any){
 if(!order.partnerCode||order.source!=='WEB'||order.paymentStatus!=='SUCCEEDED')return;
 if(await tx.partnerReward.findUnique({where:{orderId:order.id}}))return;
 const a=await tx.partnerAttribution.findUnique({where:{orderId:order.id},include:{participant:true}});if(!a||a.rejectionReason)return;
 if(a.firstOrderOnly){
  const email=String(order.buyerEmail||'').trim().toLowerCase();
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`partner-first:${email}`}))`;
  const prior=await tx.order.count({where:{id:{not:order.id},source:'WEB',buyerEmail:{equals:email,mode:'insensitive'},paymentStatus:'SUCCEEDED',status:{notIn:['CANCELLED','REFUNDED']}}});
  if(prior){await tx.partnerAttribution.update({where:{orderId:order.id},data:{rejectionReason:'FIRST_ORDER_ONLY'}});return;}
 }
 const amount=rewardValue(a.baseAmount,a.rewardPercent,a.participant.kind);if(!amount)return;
 await tx.partnerReward.upsert({where:{orderId:order.id},update:{},create:{orderId:order.id,participantId:a.participantId,amount,unit:a.participant.kind==='REFERRAL'?'BONUS':'RUB'}});
}

/** Only the public self-registration path may attach a new business. Never B2B orders. */
export async function attachPartnerRegistration(tx:Prisma.TransactionClient,organization:any,owner:any,token:string){
 if(!/^[a-f0-9]{64}$/.test(token)||!owner.isActive||!['CUSTOMER_B2C','CUSTOMER_B2B'].includes(owner.role))return;
 const click=await tx.partnerClick.findUnique({where:{tokenHash:partnerHash(token)},include:{participant:{include:{user:true}}}});
 if(!click||click.expiresAt<=new Date())return;
 const p=click.participant;
 if(p.kind!=='BLOGGER'||p.status!=='ACTIVE'||!p.acceptedTermsAt||!p.user.isActive||p.user.role!=='CUSTOMER_B2C'||p.userId===owner.id||p.user.email.toLowerCase()===owner.email.toLowerCase()||(phone(p.user.phone)&&phone(p.user.phone)===phone(owner.phone)))return;
 const s=await tx.partnerProgramSetting.findUnique({where:{kind:'BLOGGER'}});
 if(!s?.isEnabled||Number(s.signupRewardAmount)<=0)return;
 if(await tx.organizationMember.count({where:{userId:owner.id,organizationId:{not:organization.id},role:'OWNER'}}))return;
 const amount=s.signupRewardUnit==='BONUS'?Math.floor(Number(s.signupRewardAmount)):s.signupRewardAmount;
 if(Number(amount)<=0)return;
 await tx.partnerBusinessRegistration.create({data:{organizationId:organization.id,participantId:p.id,ownerId:owner.id,amount,unit:s.signupRewardUnit,holdDays:s.signupHoldDays}});
}

/** Organization row must be held. Independent admin verification is also required. */
export async function partnerBusinessActivated(tx:Prisma.TransactionClient,organization:any){
 if(organization.status!=='ACTIVE')return;
 const r=await tx.partnerBusinessRegistration.findUnique({where:{organizationId:organization.id}});
 if(!r||!r.verifiedAt||!r.verifiedBy)return;
 const activatedAt=r.activatedAt||new Date();
 await tx.partnerBusinessRegistration.update({where:{organizationId:organization.id},data:{activatedAt}});
 await tx.partnerReward.upsert({where:{registrationId:organization.id},update:{},create:{registrationId:organization.id,participantId:r.participantId,amount:r.amount,unit:r.unit,readyAt:new Date(activatedAt.getTime()+r.holdDays*86400000)}});
}
export async function partnerOrderDelivered(tx:Prisma.TransactionClient,order:any){
 if(!order.partnerCode||order.source!=='WEB'||order.paymentStatus!=='SUCCEEDED')return;
 const a=await tx.partnerAttribution.findUnique({where:{orderId:order.id}});if(!a)return;
 await tx.partnerReward.updateMany({where:{orderId:order.id,status:'PENDING',readyAt:null},data:{readyAt:new Date(Date.now()+a.holdDays*86400000)}});
}
