import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { BusinessOwnerRegistrationDto } from './dto/business-registration.dto';
import { businessCompanyDetails } from './business-registration.validation';
import { BusinessRequestContext, loadBusinessTerms, recordBusinessConsent } from './business-consent';
import { attachPartnerRegistration } from '../partners/partner-lifecycle';

@Injectable()
export class BusinessRegistrationService {
  constructor(private readonly db: PrismaService, private readonly auth: AuthService) {}
  async terms() { const { snapshots, ...publicTerms } = await loadBusinessTerms(this.db); return publicTerms; }
  async register(dto: BusinessOwnerRegistrationDto, context: BusinessRequestContext) {
    if (dto.acceptedTerms !== true) throw new BadRequestException('Подтвердите согласие с условиями регистрации');
    const details = businessCompanyDetails(dto);
    const phone = dto.phone ? `+${dto.phone.replace(/\D/g, '')}` : undefined;
    if (phone && (phone.length < 9 || phone.length > 16)) throw new BadRequestException('Проверьте номер телефона');
    if (details.inn && await this.db.organization.findUnique({ where: { inn: details.inn }, select: { id: true } })) throw new ConflictException('Организация с таким ИНН уже зарегистрирована. Войдите в бизнес-кабинет или обратитесь к владельцу.');
    let organization: { id: string; name: string; status: string } | undefined;
    const session = await this.auth.registerBusinessAccount({ email: dto.email, password: dto.password, firstName: dto.firstName.trim(), lastName: dto.lastName.trim(), phone }, context, async (tx, user) => {
      const customer = await tx.customer.findUniqueOrThrow({ where: { userId: user.id }, select: { id: true } });
      const profile = await tx.b2BProfile.create({ data: { userId: user.id, ...details } });
      const created = await tx.organization.create({ data: { name: details.companyName, legalName: details.companyName, inn: details.inn, kpp: details.kpp, legalAddress: details.legalAddress, status: 'PROSPECT', createdById: user.id } });
      await tx.organizationMember.create({ data: { organizationId: created.id, userId: user.id, customerId: customer.id, role: 'OWNER', canOrder: true, canSeeFinance: true } });
      await recordBusinessConsent(tx, user.id, created.id, context, 'OWNER_REGISTRATION', dto.termsVersion);
      if (dto.partnerToken) await attachPartnerRegistration(tx, created, { ...user, phone }, dto.partnerToken);
      await tx.auditLog.create({ data: { actorId: user.id, action: 'REGISTER', resource: 'business-registration', resourceId: created.id, ipAddress: context.ipAddress?.slice(0, 80), userAgent: context.userAgent?.slice(0, 1000), payload: { organizationId: created.id, profileId: profile.id, status: created.status, role: 'OWNER' } } });
      organization = { id: created.id, name: created.name, status: created.status };
    });
    return { ...session, organization };
  }
}
