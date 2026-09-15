import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { OrganizationMemberRole, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateB2BProfileDto } from './dto/b2b.dto';

@Injectable()
export class B2BService {
  constructor(private readonly prisma: PrismaService) {}

  async createProfile(userId: string, dto: CreateB2BProfileDto) {
    const existing = await this.prisma.b2BProfile.findUnique({ where: { userId } });
    if (existing) throw new ConflictException('B2B-профиль уже существует');
    if (dto.inn && await this.prisma.organization.findUnique({ where: { inn: dto.inn } })) throw new ConflictException('Организация с таким ИНН уже существует');
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId }, include: { customer: true } });
      if (!user) throw new NotFoundException('Пользователь не найден');
      const profile = await tx.b2BProfile.create({ data: { userId, companyName: dto.companyName, inn: dto.inn, kpp: dto.kpp, legalAddress: dto.legalAddress } });
      const customer = user.customer || await tx.customer.create({ data: { userId, firstName: user.firstName, lastName: user.lastName, email: user.email, phone: user.phone, normalizedEmail: user.email.trim().toLowerCase(), normalizedPhone: user.phone?.replace(/\D/g, '') || null, segment: 'B2B', source: 'WEB' } });
      const organization = await tx.organization.create({ data: { name: dto.companyName, legalName: dto.companyName, inn: dto.inn, kpp: dto.kpp, legalAddress: dto.legalAddress } });
      await tx.organizationMember.create({ data: { organizationId: organization.id, userId, customerId: customer.id, role: OrganizationMemberRole.OWNER, canOrder: true, canSeeFinance: true } });
      await tx.user.update({ where: { id: userId }, data: { role: UserRole.CUSTOMER_B2B } });
      await tx.customer.update({ where: { id: customer.id }, data: { segment: 'B2B' } });
      return { ...organization, legacyProfileId: profile.id };
    });
  }

  async profile(userId: string) {
    const membership = await this.prisma.organizationMember.findFirst({ where: { userId, isActive: true }, include: { organization: { include: { orders: { orderBy: { createdAt: 'desc' }, take: 20 }, accountManager: { select: { id: true, firstName: true, lastName: true, email: true } } } }, user: { select: { id: true, email: true, phone: true, firstName: true, lastName: true } } } });
    if (!membership) throw new NotFoundException('B2B-профиль не найден');
    return { ...membership.organization, membership: { role: membership.role, jobTitle: membership.jobTitle, canOrder: membership.canOrder, canSeeFinance: membership.canSeeFinance }, user: membership.user };
  }

  async catalog(userId: string) {
    const membership = await this.prisma.organizationMember.findFirst({ where: { userId, isActive: true }, select: { organization: { select: { discountTier: true } } } });
    const discount = membership?.organization.discountTier || 0;
    const products = await this.prisma.product.findMany({ where: { isActive: true }, include: { variants: { where: { isActive: true } }, images: true }, orderBy: { createdAt: 'desc' } });
    return products.map((product) => ({ ...product, variants: product.variants.map((variant) => ({ ...variant, retailPrice: variant.price, b2bPrice: Number(variant.price) * (1 - discount / 100) })) }));
  }
}
