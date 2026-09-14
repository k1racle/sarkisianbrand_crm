import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateB2BProfileDto } from './dto/b2b.dto';

@Injectable()
export class B2BService {
  constructor(private readonly prisma: PrismaService) {}

  async createProfile(userId: string, dto: CreateB2BProfileDto) {
    const existing = await this.prisma.b2BProfile.findUnique({ where: { userId } });
    if (existing) throw new ConflictException('B2B-профиль уже существует');
    const profile = await this.prisma.b2BProfile.create({ data: { userId, companyName: dto.companyName, inn: dto.inn, kpp: dto.kpp, legalAddress: dto.legalAddress } });
    await this.prisma.user.update({ where: { id: userId }, data: { role: UserRole.CUSTOMER_B2B } });
    return profile;
  }

  async profile(userId: string) {
    const profile = await this.prisma.b2BProfile.findUnique({ where: { userId }, include: { user: { select: { id: true, email: true, phone: true, firstName: true, lastName: true } }, orders: { orderBy: { createdAt: 'desc' }, take: 20 } } });
    if (!profile) throw new NotFoundException('B2B-профиль не найден');
    return profile;
  }

  async catalog(userId: string) {
    const profile = await this.prisma.b2BProfile.findUnique({ where: { userId }, select: { discountTier: true } });
    const discount = profile?.discountTier || 0;
    const products = await this.prisma.product.findMany({ where: { isActive: true }, include: { variants: { where: { isActive: true } }, images: true }, orderBy: { createdAt: 'desc' } });
    return products.map((product) => ({ ...product, variants: product.variants.map((variant) => ({ ...variant, retailPrice: variant.price, b2bPrice: Number(variant.price) * (1 - discount / 100) })) }));
  }
}
