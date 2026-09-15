import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LoyaltyOperationDto } from './dto/loyalty.dto';
@Injectable()
export class LoyaltyService {
  constructor(private readonly prisma: PrismaService) {}
  account(userId: string) { return this.prisma.loyaltyAccount.upsert({ where: { userId }, update: {}, create: { userId }, include: { entries: { orderBy: { createdAt: 'desc' }, take: 30 } } }); }
  async operation(userId: string, dto: LoyaltyOperationDto, type: 'ACCRUAL'|'WRITE_OFF') { const account=await this.prisma.loyaltyAccount.upsert({where:{userId},update:{},create:{userId}}); const amount=type==='WRITE_OFF'?-Math.abs(dto.amount):Math.abs(dto.amount); if(type==='WRITE_OFF'&&account.balance<Math.abs(dto.amount)) throw new BadRequestException('Недостаточно бонусов'); const balance=account.balance+amount; const level=balance>=10000?'PREMIUM':balance>=3000?'PRO':'START'; return this.prisma.$transaction(async(tx)=>{await tx.loyaltyTransaction.create({data:{accountId:account.id,amount,type,reason:dto.reason,orderId:dto.orderId}});return tx.loyaltyAccount.update({where:{id:account.id},data:{balance,level},include:{entries:{orderBy:{createdAt:'desc'},take:30}}});}); }
  async byUser(userId: string) { if(!(await this.prisma.user.findUnique({where:{id:userId},select:{id:true}}))) throw new NotFoundException('Клиент не найден'); return this.account(userId); }
}
