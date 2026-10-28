import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { BuyStudioRewardDto, CompleteStudioRunDto, StudioCheckpointDto, StudioSettingsDto } from './studio.dto';
import { stepsFor, STUDIO_BRIEFS, STUDIO_PRICES, studioReward } from './studio.rules';

@Injectable()
export class StudioService {
  constructor(private readonly db:PrismaService) {}
  private async defaults() {
    await this.db.studioSettings.upsert({where:{id:'default'},create:{id:'default'},update:{}});
    for (const [percent,price] of [[5,15000],[10,35000],[15,60000]]) await this.db.studioRewardOffer.upsert({where:{id:`discount-${percent}`},create:{id:`discount-${percent}`,discountPercent:percent,coinPrice:price,validDays:30},update:{}});
  }
  async catalog() {
    await this.defaults();
    const [settings,offers]=await Promise.all([this.db.studioSettings.findUniqueOrThrow({where:{id:'default'}}),this.db.studioRewardOffer.findMany({where:{isActive:true},orderBy:{coinPrice:'asc'}})]);
    return {settings,offers};
  }
  private async account(userId:string) { return this.db.studioAccount.upsert({where:{userId},create:{userId},update:{}}); }
  private async lock(tx:Prisma.TransactionClient,userId:string) { await tx.$queryRaw`SELECT "userId" FROM "StudioAccount" WHERE "userId"=${userId} FOR UPDATE`; return tx.studioAccount.findUniqueOrThrow({where:{userId}}); }
  async me(userId:string) {
    await this.account(userId);
    const [account,purchases,activeRun] = await Promise.all([this.db.studioAccount.findUniqueOrThrow({where:{userId}}),this.db.studioRewardPurchase.findMany({where:{userId},include:{promo:{include:{redemptions:{where:{status:{in:['RESERVED','APPLIED']}},select:{status:true}}}}},orderBy:{createdAt:'desc'},take:100}),this.db.studioRun.findFirst({where:{userId,finishedAt:null,startedAt:{gt:new Date(Date.now()-7200000)}},orderBy:{startedAt:'desc'}})]);
    return {balance:account.balance,earned:account.earned,upgrades:account.upgrades,activeRun,purchases:purchases.map(p=>({id:p.id,code:p.code,discountPercent:p.discountPercent,coinPrice:p.coinPrice,expiresAt:p.expiresAt,minimumAmount:Number(p.promo.minimumAmount),maximumDiscount:p.promo.maximumDiscount===null?null:Number(p.promo.maximumDiscount),status:p.promo.redemptions.some(r=>r.status==='APPLIED')?'used':p.promo.redemptions.length?'reserved':p.expiresAt.getTime()<=Date.now()?'expired':!p.promo.isActive?'disabled':'available'}))};
  }
  async start(userId:string,briefId:string) {
    if (!STUDIO_BRIEFS.some(b=>b.id===briefId)) throw new BadRequestException('Запрос клиента не найден.');
    await this.defaults(); await this.account(userId);
    return this.db.$transaction(async tx=>{
      await this.lock(tx,userId);
      const settings=await tx.studioSettings.findUniqueOrThrow({where:{id:'default'}});
      if(!settings.enabled)throw new BadRequestException('Начисление монет временно приостановлено. Практика доступна без наград.');
      const active=await tx.studioRun.findFirst({where:{userId,finishedAt:null,startedAt:{gt:new Date(Date.now()-7200000)}},orderBy:{startedAt:'desc'}});
      if(active) { if(active.briefId===briefId)return active; throw new ConflictException('Сначала завершите начатый приём.'); }
      const today=new Date();today.setUTCHours(0,0,0,0);
      if(await tx.studioRun.count({where:{userId,startedAt:{gte:today}}})>=settings.dailyRunLimit)throw new BadRequestException('Награды за сегодня собраны. Новые монеты можно заработать завтра; практика остаётся доступной.');
      return tx.studioRun.create({data:{userId,briefId}});
    });
  }
  async checkpoint(userId:string,id:string,dto:StudioCheckpointDto) {
    return this.db.$transaction(async tx=>{
      await this.lock(tx,userId);
      const run=await tx.studioRun.findFirst({where:{id,userId}});
      if(!run)throw new NotFoundException('Приём не найден.');
      if(run.checkpoints.includes(dto.step))return {checkpoints:run.checkpoints};
      if(run.finishedAt||Date.now()-run.startedAt.getTime()>7200000)throw new BadRequestException('Срок приёма истёк. Начните новый.');
      if(run.checkpoints.length&&run.technique!==dto.technique)throw new BadRequestException('Технику нельзя менять в середине приёма.');
      if(stepsFor(dto.technique)[run.checkpoints.length]!==dto.step)throw new BadRequestException('Пройдите этапы подготовки по порядку.');
      if(Date.now()-run.lastCheckpointAt.getTime()<500)throw new BadRequestException('Слишком быстро. Завершите обработку всех пяти ногтей.');
      return tx.studioRun.update({where:{id},data:{technique:dto.technique,checkpoints:{push:dto.step},lastCheckpointAt:new Date()},select:{checkpoints:true}});
    });
  }
  async complete(userId:string,id:string,dto:CompleteStudioRunDto) {
    return this.db.$transaction(async tx=>{
      const account=await this.lock(tx,userId),run=await tx.studioRun.findFirst({where:{id,userId}});
      if(!run)throw new NotFoundException('Приём не найден.');
      if(run.finishedAt)return {reward:run.reward,balance:account.balance};
      const settings=await tx.studioSettings.findUniqueOrThrow({where:{id:'default'}});
      if(!settings.enabled)throw new BadRequestException('Начисление наград временно приостановлено.');
      const seconds=Math.floor((Date.now()-run.startedAt.getTime())/1000);
      if(seconds>7200)throw new BadRequestException('Срок приёма истёк.');
      if(seconds<settings.minimumRunSeconds)throw new BadRequestException(`Проверьте работу и завершите приём через ${settings.minimumRunSeconds-seconds} сек.`);
      if(run.checkpoints.join(',')!==stepsFor(run.technique).join(','))throw new BadRequestException('Подготовьте все пять ногтей и дождитесь сохранения этапов.');
      const reward=studioReward(run.briefId,dto),balance=account.balance+reward;
      await tx.studioRun.update({where:{id},data:{finishedAt:new Date(),reward}});
      await tx.studioAccount.update({where:{userId},data:{balance,earned:{increment:reward}}});
      await tx.studioTransaction.create({data:{userId,requestId:id,kind:'CLIENT',amount:reward,balanceAfter:balance}});
      return {reward,balance};
    });
  }
  async spend(userId:string,itemId:string,requestId:string) {
    await this.account(userId);
    return this.db.$transaction(async tx=>{
      const a=await this.lock(tx,userId),previous=await tx.studioTransaction.findUnique({where:{userId_requestId:{userId,requestId}}});
      if(previous){if(previous.kind!==`SHOP:${itemId}`)throw new ConflictException('Запрос уже использован.');return {balance:a.balance,upgrades:a.upgrades};}
      const price=STUDIO_PRICES[itemId];if(!price)throw new BadRequestException('Товар не найден.');
      const upgrade=['organizer','lamp','pastel'].includes(itemId);
      if(upgrade&&a.upgrades.includes(itemId))throw new BadRequestException('Улучшение уже куплено.');
      if(a.balance<price)throw new BadRequestException('Не хватает монет.');
      const next=await tx.studioAccount.update({where:{userId},data:{balance:{decrement:price},...(upgrade?{upgrades:{push:itemId}}:{})}});
      await tx.studioTransaction.create({data:{userId,requestId,kind:`SHOP:${itemId}`,amount:-price,balanceAfter:next.balance}});
      return {balance:next.balance,upgrades:next.upgrades};
    });
  }
  async buy(userId:string,dto:BuyStudioRewardDto) {
    await this.defaults();await this.account(userId);
    return this.db.$transaction(async tx=>{
      const a=await this.lock(tx,userId),previous=await tx.studioRewardPurchase.findUnique({where:{userId_requestId:{userId,requestId:dto.requestId}}});
      if(previous){if(previous.offerId!==dto.offerId)throw new ConflictException('Запрос уже использован.');return {purchase:previous,balance:a.balance};}
      await tx.$queryRaw`SELECT "id" FROM "StudioRewardOffer" WHERE "id"=${dto.offerId} FOR UPDATE`;
      const settings=await tx.studioSettings.findUniqueOrThrow({where:{id:'default'}}),offer=await tx.studioRewardOffer.findUnique({where:{id:dto.offerId}});
      if(!settings.enabled||!offer?.isActive)throw new BadRequestException('Эта награда сейчас недоступна.');
      if(a.balance<offer.coinPrice)throw new BadRequestException('Пока не хватает монет на эту награду.');
      const code=`STUDIO-${randomBytes(10).toString('hex').toUpperCase()}`,expiresAt=new Date(Date.now()+offer.validDays*86400000);
      await tx.promoCode.create({data:{code,title:`SARKISIAN Studio · ${offer.discountPercent}%`,discountType:'PERCENT',amount:offer.discountPercent,minimumAmount:offer.minimumAmount,maximumDiscount:offer.maximumDiscount,usageLimit:1,perCustomerLimit:1,restrictedUserId:userId,endsAt:expiresAt}});
      const purchase=await tx.studioRewardPurchase.create({data:{userId,offerId:offer.id,requestId:dto.requestId,code,coinPrice:offer.coinPrice,discountPercent:offer.discountPercent,expiresAt}});
      const balance=a.balance-offer.coinPrice;
      await tx.studioAccount.update({where:{userId},data:{balance}});
      await tx.studioTransaction.create({data:{userId,requestId:dto.requestId,kind:'DISCOUNT',amount:-offer.coinPrice,balanceAfter:balance}});
      return {purchase,balance};
    });
  }
  async admin() {
    await this.defaults();
    const [settings,offers,accounts,issued,recent]=await Promise.all([this.db.studioSettings.findUniqueOrThrow({where:{id:'default'}}),this.db.studioRewardOffer.findMany({orderBy:{coinPrice:'asc'}}),this.db.studioAccount.count(),this.db.studioRewardPurchase.count(),this.db.studioRewardPurchase.findMany({orderBy:{createdAt:'desc'},take:30,include:{account:{include:{user:{select:{email:true}}}}}})]);
    return {settings,offers,accounts,issued,recent:recent.map(p=>({code:p.code,discountPercent:p.discountPercent,coinPrice:p.coinPrice,createdAt:p.createdAt,email:p.account.user.email}))};
  }
  async settings(dto:StudioSettingsDto) {
    if(new Set(dto.offers.map(o=>o.id)).size!==dto.offers.length)throw new BadRequestException('Идентификаторы наград должны быть уникальны.');
    await this.defaults();
    await this.db.$transaction(async tx=>{
      await tx.studioSettings.update({where:{id:'default'},data:{enabled:dto.enabled,dailyRunLimit:dto.dailyRunLimit,minimumRunSeconds:dto.minimumRunSeconds}});
      for(const offer of dto.offers)await tx.studioRewardOffer.upsert({where:{id:offer.id},create:offer,update:offer});
    });
    return this.admin();
  }
}
