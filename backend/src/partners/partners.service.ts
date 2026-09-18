import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { moneyMinor } from '../common/storefront-utils';
import { DEFAULT_LOYALTY_SETTINGS, loyaltyCreditMetadata, loyaltyLevel, maintainAccount } from '../loyalty/loyalty-core.helpers';
import { partnerBusinessActivated, partnerHash } from './partner-lifecycle';
import { PartnerInviteDto, PartnerJoinDto, PartnerParticipantDto, PartnerPayoutDecisionDto, PartnerPayoutRequestDto, PartnerSettingsDto, PartnerTrackDto, PartnerVerificationDto } from './partners.dto';

export function partnerKind(value:string){if(!['REFERRAL','BLOGGER'].includes(value))throw new BadRequestException('Неизвестная программа');return value;}
export function cashAvailable(earned:unknown,reserved:unknown){return (moneyMinor(earned||0)-moneyMinor(reserved||0))/100;}
const safeUser={id:true,email:true,firstName:true,lastName:true,role:true,isActive:true} as const;
const DAY=86400000;
const defaults=(kind:string)=>({kind,name:kind==='REFERRAL'?'Пригласите друзей':'Партнёры SARKISIAN',isEnabled:false,rewardPercent:5,attributionDays:30,holdDays:14,minimumOrderAmount:0,firstOrderOnly:false,minimumPayout:1000,signupRewardAmount:0,signupRewardUnit:'RUB',signupHoldDays:14,termsText:'',autoSettlement:true,updatedAt:new Date(0)});

@Injectable()
export class PartnersService implements OnModuleInit,OnModuleDestroy {
 private timer?:NodeJS.Timeout;
 private processing=false;
 private readonly logger=new Logger(PartnersService.name);
 constructor(private readonly prisma:PrismaService,private readonly config:ConfigService){}
 onModuleInit(){if(String(this.config.get('ECOSYSTEM_AUTOMATION_ENABLED','false'))==='true')this.timer=setInterval(()=>{void this.settle(undefined,true).catch(()=>this.logger.error('Ошибка обработки партнёрских начислений'));},60000);}
 onModuleDestroy(){if(this.timer)clearInterval(this.timer);}
 async settings(kind:string,db:Prisma.TransactionClient|PrismaService=this.prisma){partnerKind(kind);return await db.partnerProgramSetting.findUnique({where:{kind}})||defaults(kind);}
 private publicSettings(s:any){return {...s,termsVersion:partnerHash(JSON.stringify([s.termsText,s.rewardPercent,s.holdDays,s.attributionDays,s.firstOrderOnly,s.minimumOrderAmount,s.minimumPayout,s.signupRewardAmount,s.signupRewardUnit,s.signupHoldDays]))};}
 async updateSettings(kind:string,dto:PartnerSettingsDto){
  partnerKind(kind);if(dto.isEnabled&&!dto.termsText.trim())throw new BadRequestException('Перед запуском укажите условия участия');
  if(kind==='REFERRAL'&&dto.signupRewardAmount!==0)throw new BadRequestException('Вознаграждение за организации доступно только блогерам');
  if(dto.signupRewardUnit==='BONUS'&&!Number.isInteger(dto.signupRewardAmount))throw new BadRequestException('Укажите целое количество бонусов');
  return this.prisma.partnerProgramSetting.upsert({where:{kind},update:dto,create:{kind,...dto}});
 }
 private async customer(userId:string,db:Prisma.TransactionClient|PrismaService=this.prisma){const u=await db.user.findUnique({where:{id:userId},select:safeUser});if(!u?.isActive||u.role!=='CUSTOMER_B2C')throw new ForbiddenException('Программа доступна частным клиентам сайта');return u;}
 private async lock(db:Prisma.TransactionClient,id:string){await db.$queryRaw`SELECT id FROM "PartnerParticipant" WHERE id=${id} FOR UPDATE`;return db.partnerParticipant.findUniqueOrThrow({where:{id},include:{user:{select:safeUser}}});}
 private async balance(db:Prisma.TransactionClient|PrismaService,id:string){const [earned,reserved]=await Promise.all([db.partnerReward.aggregate({where:{participantId:id,status:'APPROVED',unit:'RUB'},_sum:{amount:true}}),db.partnerPayout.aggregate({where:{participantId:id,status:{in:['REQUESTED','APPROVED','PAID']}},_sum:{amount:true}})]);return cashAvailable(earned._sum.amount,reserved._sum.amount);}
 async me(userId:string,kind:string){
  await this.customer(userId);partnerKind(kind);
  const [s,p]=await Promise.all([this.settings(kind),this.prisma.partnerParticipant.findUnique({where:{userId_kind:{userId,kind}}})]);
  if(!p)return {settings:this.publicSettings(s),participant:null};
  const [clicks,orders,registrations,rewards,payouts,totals,available]=await Promise.all([
   this.prisma.partnerClick.aggregate({where:{participantId:p.id},_count:{_all:true},_sum:{visitsCount:true}}),
   this.prisma.partnerAttribution.count({where:{participantId:p.id}}),this.prisma.partnerBusinessRegistration.count({where:{participantId:p.id}}),
   this.prisma.partnerReward.findMany({where:{participantId:p.id},select:{id:true,amount:true,unit:true,status:true,readyAt:true,createdAt:true,registrationId:true},orderBy:{createdAt:'desc'},take:30}),
   this.prisma.partnerPayout.findMany({where:{participantId:p.id},select:{id:true,amount:true,status:true,decisionNote:true,createdAt:true,paidAt:true},orderBy:{createdAt:'desc'},take:30}),
   this.prisma.partnerReward.groupBy({by:['unit','status'],where:{participantId:p.id},_sum:{amount:true},_count:{_all:true}}),this.balance(this.prisma,p.id)
  ]);
  return {settings:this.publicSettings(s),participant:{id:p.id,code:p.code,kind:p.kind,status:p.status,displayName:p.displayName,channels:p.channels,description:p.description,rewardPercent:p.rewardPercent??s.rewardPercent,payoutVerified:p.payoutVerified,decisionNote:p.decisionNote},summary:{visits:clicks._sum.visitsCount||0,uniqueVisitors:clicks._count._all,orders,registrations,availableCash:available,totals},rewards,payouts};
 }
 async invite(dto:PartnerInviteDto,actorId:string){return this.prisma.$transaction(async tx=>{
  const email=dto.email.trim().toLowerCase();
  const user=await tx.user.findUnique({where:{email},select:safeUser});
  if(!user)throw new BadRequestException('Клиент с таким email ещё не зарегистрирован. Скопируйте ссылку на заявку и передайте её блогеру.');
  if(!user.isActive||user.role!=='CUSTOMER_B2C')throw new BadRequestException('Пригласить можно только активного частного клиента сайта');
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`partner-join:${user.id}:BLOGGER`}))`;
  const existing=await tx.partnerParticipant.findUnique({where:{userId_kind:{userId:user.id,kind:'BLOGGER'}}});
  if(existing?.status==='INVITED')return {id:existing.id,status:existing.status};
  if(existing)throw new ConflictException('Этот клиент уже есть в списке блогеров. Найдите его по email и откройте карточку.');
  const p=await tx.partnerParticipant.create({data:{userId:user.id,kind:'BLOGGER',code:'B'+randomBytes(10).toString('hex'),status:'INVITED',displayName:dto.displayName?.trim()||[user.firstName,user.lastName].filter(Boolean).join(' ')||'Блогер',acceptedTermsAt:null,termsSnapshot:''}});
  await tx.partnerEvent.create({data:{participantId:p.id,actorId,type:'INVITED',payload:{email}}});
  return {id:p.id,status:p.status};
 });}
 async join(userId:string,dto:PartnerJoinDto){return this.prisma.$transaction(async tx=>{
  const user=await this.customer(userId,tx),s=await this.settings(dto.kind,tx);
  if(!s.isEnabled)throw new BadRequestException('Программа пока не открыта');
  if(!dto.acceptedTerms||this.publicSettings(s).termsVersion!==dto.termsVersion)throw new ConflictException('Условия изменились. Обновите страницу и подтвердите их заново');
  if(dto.kind==='BLOGGER'&&(!dto.channels?.length||!dto.displayName?.trim()))throw new BadRequestException('Укажите имя и хотя бы один канал');
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`partner-join:${userId}:${dto.kind}`}))`;
  const existing=await tx.partnerParticipant.findUnique({where:{userId_kind:{userId,kind:dto.kind}}});
  if(existing&&!['REJECTED','INVITED'].includes(existing.status))return {id:existing.id,status:existing.status};
  const data={status:dto.kind==='REFERRAL'?'ACTIVE':'PENDING',displayName:dto.kind==='REFERRAL'?'Участник SARKISIAN':dto.displayName!.trim(),channels:(dto.channels||[]) as unknown as Prisma.InputJsonValue,description:dto.description||'',acceptedTermsAt:new Date(),termsSnapshot:JSON.stringify(this.publicSettings(s)),decisionNote:''};
  const p=existing?await tx.partnerParticipant.update({where:{id:existing.id},data}):await tx.partnerParticipant.create({data:{userId:user.id,kind:dto.kind,code:(dto.kind==='BLOGGER'?'B':'R')+randomBytes(10).toString('hex'),...data}});
  await tx.partnerEvent.create({data:{participantId:p.id,actorId:userId,type:'JOIN',payload:{kind:dto.kind,termsVersion:dto.termsVersion}}});
  return {id:p.id,status:p.status};
 });}
 private async liveLink(code:string){if(!/^[RB][a-f0-9]{20}$/.test(code))throw new NotFoundException('Ссылка недоступна');const p=await this.prisma.partnerParticipant.findUnique({where:{code},include:{user:{select:safeUser}}});if(!p||p.status!=='ACTIVE'||!p.acceptedTermsAt||!p.user.isActive||p.user.role!=='CUSTOMER_B2C')throw new NotFoundException('Ссылка недоступна');const s=await this.settings(p.kind);if(!s.isEnabled)throw new NotFoundException('Программа приостановлена');return {p,s};}
 async link(code:string){const {p,s}=await this.liveLink(code);return {name:s.name,displayName:p.displayName,kind:p.kind,attributionDays:s.attributionDays,businessRegistration:p.kind==='BLOGGER'&&Number(s.signupRewardAmount)>0};}
 async track(code:string,dto:PartnerTrackDto){const {p,s}=await this.liveLink(code);if(!dto.consent)throw new BadRequestException('Подтвердите согласие');const token=randomBytes(32).toString('hex'),expiresAt=new Date(Date.now()+s.attributionDays*DAY);await this.prisma.partnerClick.upsert({where:{participantId_visitorHash:{participantId:p.id,visitorHash:partnerHash(dto.visitorId)}},create:{participantId:p.id,visitorHash:partnerHash(dto.visitorId),tokenHash:partnerHash(token),expiresAt},update:{tokenHash:partnerHash(token),expiresAt,visitsCount:{increment:1},lastVisitAt:new Date()}});return {token,expiresAt};}
 async overview(kind:string,section:string,search='',pageValue='1'){
  partnerKind(kind);if(!['settings','participants','rewards','payouts','overview','registrations'].includes(section))throw new BadRequestException('Неизвестный раздел');
  const page=Number(pageValue);if(!Number.isInteger(page)||page<1||page>100000)throw new BadRequestException('Некорректная страница');
  const participant:Prisma.PartnerParticipantWhereInput={kind,...(search.trim()?{OR:[{displayName:{contains:search.trim(),mode:'insensitive'}},{code:{contains:search.trim(),mode:'insensitive'}},{user:{email:{contains:search.trim(),mode:'insensitive'}}}]}:{})};
  const [settings,participants,pending,clicks,registrations,totals]=await Promise.all([this.settings(kind),this.prisma.partnerParticipant.count({where:{kind}}),this.prisma.partnerParticipant.count({where:{kind,status:'PENDING'}}),this.prisma.partnerClick.count({where:{participant:{kind}}}),this.prisma.partnerBusinessRegistration.count({where:{participant:{kind}}}),this.prisma.partnerReward.groupBy({by:['unit','status'],where:{participant:{kind}},_sum:{amount:true},_count:{_all:true}})]);
  const args={skip:(page-1)*30,take:30,orderBy:{createdAt:'desc' as const}};
  let rows:any[]=[],total=0;
  if(section==='participants'){[rows,total]=await Promise.all([this.prisma.partnerParticipant.findMany({where:participant,include:{user:{select:safeUser},_count:{select:{clicks:true,attributions:true,registrations:true}}},...args}),this.prisma.partnerParticipant.count({where:participant})]);}
  if(section==='rewards'){const where={participant};[rows,total]=await Promise.all([this.prisma.partnerReward.findMany({where,include:{participant:{select:{displayName:true,code:true}},order:{select:{orderNumber:true}},registration:{select:{organization:{select:{name:true}}}}},...args}),this.prisma.partnerReward.count({where})]);}
  if(section==='payouts'){const where={participant};[rows,total]=await Promise.all([this.prisma.partnerPayout.findMany({where,include:{participant:{select:{id:true,displayName:true,payoutVerified:true}}},...args}),this.prisma.partnerPayout.count({where})]);}
  if(section==='registrations'){const where={participant};[rows,total]=await Promise.all([this.prisma.partnerBusinessRegistration.findMany({where,include:{participant:{select:{displayName:true}},organization:{select:{name:true,inn:true,status:true}},reward:{select:{status:true}}},...args}),this.prisma.partnerBusinessRegistration.count({where})]);}
  return {settings,summary:{participants,pending,uniqueVisitors:clicks,registrations,totals},rows,total,page,pages:Math.max(1,Math.ceil(total/30))};
 }
 async participant(id:string,dto:PartnerParticipantDto,actorId:string){return this.prisma.$transaction(async tx=>{const p=await this.lock(tx,id);if(dto.status==='ACTIVE'&&(!p.acceptedTermsAt||!p.user.isActive||p.user.role!=='CUSTOMER_B2C'))throw new BadRequestException('Участник должен принять условия в личном кабинете и быть активным частным клиентом');if(!dto.decisionNote.trim())throw new BadRequestException('Укажите причину решения');const result=await tx.partnerParticipant.update({where:{id},data:{status:dto.status,rewardPercent:dto.rewardPercent,decisionNote:dto.decisionNote.trim()}});await tx.partnerEvent.create({data:{participantId:id,actorId,type:'PARTICIPANT_DECISION',payload:{from:p.status,...dto}}});return {id:result.id,status:result.status};});}
 async verify(id:string,dto:PartnerVerificationDto,actorId:string){return this.prisma.$transaction(async tx=>{const p=await this.lock(tx,id);if(p.kind!=='BLOGGER')throw new BadRequestException('Денежные выплаты доступны только блогерам');await tx.partnerParticipant.update({where:{id},data:{payoutVerified:dto.payoutVerified}});await tx.partnerEvent.create({data:{participantId:id,actorId,type:'PAYEE_VERIFIED',payload:{verified:dto.payoutVerified,note:dto.note}}});return {id};});}
 async verifyRegistration(id:string,note:string,actorId:string){return this.prisma.$transaction(async tx=>{
  await tx.$queryRaw`SELECT id FROM "Organization" WHERE id=${id} FOR UPDATE`;
  const r=await tx.partnerBusinessRegistration.findUnique({where:{organizationId:id},include:{organization:true}});if(!r)throw new NotFoundException('Привлечение не найдено');
  if(!note.trim()||note.trim().length<3||note.length>500)throw new BadRequestException('Укажите основание проверки');
  if(r.ownerId===actorId)throw new ForbiddenException('Нельзя проверять собственную организацию');
  if(r.verifiedAt)return {id,verified:true};
  const owner=await tx.organizationMember.findFirst({where:{organizationId:id,userId:r.ownerId,role:'OWNER',isActive:true},include:{user:{select:{isActive:true}}}});if(!owner?.user.isActive)throw new ConflictException('Нет активного владельца');
  await tx.partnerBusinessRegistration.update({where:{organizationId:id},data:{verifiedAt:new Date(),verifiedBy:actorId,verificationNote:note.trim()}});
  await partnerBusinessActivated(tx,r.organization);
  await tx.partnerEvent.create({data:{participantId:r.participantId,actorId,type:'BUSINESS_VERIFIED',payload:{organizationId:id,note:note.trim()}}});return {id,verified:true};
 });}
 async settle(actorId?:string,automatic=false){
  if(this.processing)return {processed:0};this.processing=true;let processed=0;
  try{const candidates=await this.prisma.partnerReward.findMany({where:{status:'PENDING',readyAt:{lte:new Date()},participant:{status:'ACTIVE',acceptedTermsAt:{not:null},user:{role:'CUSTOMER_B2C',isActive:true}},OR:[{order:{source:'WEB',organizationId:null,currency:'RUB',status:'DELIVERED',paymentStatus:'SUCCEEDED',payments:{some:{status:'SUCCEEDED'}}}},{registration:{verifiedAt:{not:null},verifiedBy:{not:null},organization:{status:'ACTIVE'}}}]},orderBy:{readyAt:'asc'},take:100});
   for(const candidate of candidates){processed+=await this.prisma.$transaction(async tx=>{
    if(candidate.orderId)await tx.$queryRaw`SELECT id FROM "Order" WHERE id=${candidate.orderId} FOR UPDATE`;
    else await tx.$queryRaw`SELECT id FROM "Organization" WHERE id=${candidate.registrationId} FOR UPDATE`;
    const p=await this.lock(tx,candidate.participantId);
    const r=await tx.partnerReward.findUniqueOrThrow({where:{id:candidate.id},include:{order:{include:{payments:true}},registration:{include:{organization:true}}}});
    if(r.status!=='PENDING'||!r.readyAt||r.readyAt>new Date())return 0;
    const s=await this.settings(p.kind,tx);
    if(!s.isEnabled||(automatic&&!s.autoSettlement)||p.status!=='ACTIVE'||!p.acceptedTermsAt||!p.user.isActive||p.user.role!=='CUSTOMER_B2C')return 0;
    if(r.order&&(r.order.source!=='WEB'||r.order.organizationId||r.order.currency!=='RUB'||r.order.status!=='DELIVERED'||r.order.paymentStatus!=='SUCCEEDED'||!r.order.payments.some(payment=>payment.status==='SUCCEEDED')))return 0;
    if(r.registration){const reg=r.registration;if(p.kind!=='BLOGGER'||reg.organization.status!=='ACTIVE'||!reg.verifiedAt||!reg.verifiedBy||reg.ownerId===p.userId)return 0;const owner=await tx.organizationMember.findFirst({where:{organizationId:reg.organizationId,userId:reg.ownerId,role:'OWNER',isActive:true},include:{user:{select:{isActive:true}}}});if(!owner?.user.isActive)return 0;}
    let loyaltyEntryId:string|undefined,creditedBonus=0,withheldBonus=0;
    if(r.unit==='BONUS'){
     const settings=await tx.loyaltyProgramSetting.findUnique({where:{id:'default'}})||{...DEFAULT_LOYALTY_SETTINGS};if(!settings.isEnabled)return 0;
     const {account}=await maintainAccount(tx,p.userId,settings);
     const amount=Number(r.amount);if(!Number.isSafeInteger(amount)||amount<=0)throw new ConflictException('Некорректное количество бонусов');
     withheldBonus=Math.min(p.bonusDebt,amount);creditedBonus=amount-withheldBonus;
     if(account.balance>2147483647-creditedBonus)throw new ConflictException('Превышен допустимый бонусный баланс');
     if(withheldBonus)await tx.partnerParticipant.update({where:{id:p.id},data:{bonusDebt:{decrement:withheldBonus}}});
     if(creditedBonus){const entry=await tx.loyaltyTransaction.create({data:{accountId:account.id,amount:creditedBonus,type:'ACCRUAL',reason:r.registrationId?'Бонусы за привлечение организации':'Бонусы за приглашённого покупателя',metadata:loyaltyCreditMetadata(settings,new Date(),{source:'PARTNER',rewardId:r.id})}});loyaltyEntryId=entry.id;await tx.loyaltyAccount.update({where:{id:account.id},data:{balance:{increment:creditedBonus},level:loyaltyLevel(account.balance+creditedBonus,settings)}});}
    }
    await tx.partnerReward.update({where:{id:r.id},data:{status:'APPROVED',approvedAt:new Date(),loyaltyEntryId,creditedBonus,withheldBonus}});
    await tx.partnerEvent.create({data:{participantId:p.id,actorId,type:'REWARD_APPROVED',payload:{rewardId:r.id,unit:r.unit,amount:Number(r.amount),source:r.registrationId?'BUSINESS_REGISTRATION':'B2C_ORDER'}}});return 1;
   },{timeout:30000});}
   return {processed};
  }finally{this.processing=false;}
 }
 async requestPayout(userId:string,dto:PartnerPayoutRequestDto){return this.prisma.$transaction(async tx=>{
  await this.customer(userId,tx);const profile=await tx.partnerParticipant.findUnique({where:{userId_kind:{userId,kind:'BLOGGER'}}});if(!profile)throw new NotFoundException('Партнёрский профиль не найден');const p=await this.lock(tx,profile.id);
  const old=await tx.partnerPayout.findUnique({where:{participantId_requestKey:{participantId:p.id,requestKey:dto.requestKey}}});if(old){if(moneyMinor(old.amount)!==moneyMinor(dto.amount)||old.requestNote!==(dto.note||''))throw new ConflictException('Ключ запроса уже использован');return {id:old.id,status:old.status};}
  const s=await this.settings('BLOGGER',tx);if(!s.isEnabled||p.status!=='ACTIVE'||!p.acceptedTermsAt||!p.payoutVerified)throw new ForbiddenException('Выплаты станут доступны после проверки получателя');
  if(dto.amount<Number(s.minimumPayout)||dto.amount>await this.balance(tx,p.id))throw new BadRequestException('Сумма меньше минимальной или превышает доступный баланс');
  const payout=await tx.partnerPayout.create({data:{participantId:p.id,requestKey:dto.requestKey,amount:dto.amount,requestNote:dto.note||''}});await tx.partnerEvent.create({data:{participantId:p.id,actorId:userId,type:'PAYOUT_REQUESTED',payload:{payoutId:payout.id,amount:dto.amount}}});return {id:payout.id,status:payout.status};
 });}
 async cancelPayout(userId:string,id:string){return this.prisma.$transaction(async tx=>{await this.customer(userId,tx);const x=await tx.partnerPayout.findUnique({where:{id},include:{participant:true}});if(!x||x.participant.userId!==userId)throw new NotFoundException('Заявка не найдена');await this.lock(tx,x.participantId);const payout=await tx.partnerPayout.findUniqueOrThrow({where:{id}});if(payout.status==='CANCELLED')return {id};if(payout.status!=='REQUESTED')throw new ConflictException('Заявка уже обрабатывается');await tx.partnerPayout.update({where:{id},data:{status:'CANCELLED'}});await tx.partnerEvent.create({data:{participantId:x.participantId,actorId:userId,type:'PAYOUT_CANCELLED',payload:{payoutId:id}}});return {id};});}
 async decidePayout(id:string,dto:PartnerPayoutDecisionDto,actorId:string){return this.prisma.$transaction(async tx=>{
  const initial=await tx.partnerPayout.findUnique({where:{id}});if(!initial)throw new NotFoundException('Заявка не найдена');const p=await this.lock(tx,initial.participantId),x=await tx.partnerPayout.findUniqueOrThrow({where:{id}});
  const reference=dto.paymentReference?.trim();if(x.status==='PAID'){if(dto.status==='PAID'&&x.paymentReference===reference)return {id,status:x.status};throw new ConflictException('Выплата уже подтверждена');}
  if(!['REQUESTED','APPROVED'].includes(x.status)||(dto.status==='PAID'&&x.status!=='APPROVED'))throw new ConflictException('Недопустимый переход выплаты');
  if(!dto.note.trim())throw new BadRequestException('Укажите основание');
  if(dto.status!=='REJECTED'&&(!p.payoutVerified||!p.acceptedTermsAt||p.status!=='ACTIVE'||!p.acceptedTermsAt||!p.user.isActive||p.user.role!=='CUSTOMER_B2C'||await this.balance(tx,p.id)<0))throw new ConflictException('Выплата требует проверки получателя и баланса');
  if(dto.status==='PAID'&&!reference)throw new BadRequestException('Укажите номер фактически выполненного перевода');
  if(dto.status==='PAID'){await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`partner-payment:${reference}`}))`;if(await tx.partnerPayout.findUnique({where:{paymentReference:reference}}))throw new ConflictException('Номер перевода уже использован');}
  await tx.partnerPayout.update({where:{id},data:{status:dto.status,decisionNote:dto.note.trim(),decidedBy:actorId,...(dto.status==='PAID'?{paymentReference:reference,paidAt:new Date()}:{})}});
  await tx.partnerEvent.create({data:{participantId:p.id,actorId,type:'PAYOUT_DECISION',payload:{payoutId:id,from:x.status,to:dto.status,note:dto.note.trim(),paymentReference:reference||null}}});return {id,status:dto.status};
 });}
}
