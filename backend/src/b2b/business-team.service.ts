import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrganizationMemberRole, Prisma, UserRole } from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { NotificationsService } from '../notifications/notifications.service';
import { businessMembership } from './business-context';
import { recordBusinessConsent } from './business-consent';
import { InviteBusinessMemberDto, RegisterInvitedBusinessDto, TransferBusinessOwnerDto, UpdateBusinessMemberDto } from './dto/business-team.dto';

const safeUser = { id: true, firstName: true, lastName: true, email: true, phone: true } as const;
const invitationSelect = { id: true, email: true, role: true, canOrder: true, canSeeFinance: true, status: true, version: true, expiresAt: true, createdAt: true, acceptedAt: true } as const;
const digest = (value: string) => createHash('sha256').update(value).digest('hex');

@Injectable()
export class BusinessTeamService {
  constructor(private readonly db: PrismaService, private readonly config: ConfigService,
    private readonly mail: NotificationsService, private readonly auth: AuthService) {}

  private async owner(tx: Prisma.TransactionClient, userId: string) {
    const context = await businessMembership(tx, userId);
    await tx.$queryRaw`SELECT id FROM "Organization" WHERE id=${context.organizationId} FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM "OrganizationMember" WHERE id=${context.id} FOR SHARE`;
    await tx.$queryRaw`SELECT id FROM "User" WHERE id=${userId} FOR SHARE`;
    const member = await businessMembership(tx, userId);
    if (member.id !== context.id || member.organizationId !== context.organizationId) throw new ConflictException('Доступ к организации изменился. Обновите кабинет');
    if (member.role !== OrganizationMemberRole.OWNER) throw new ForbiddenException('Управление командой доступно владельцу');
    return member;
  }
  private async audit(tx: Prisma.TransactionClient, actorId: string, id: string, action: string, payload: Record<string, any>) {
    await tx.auditLog.create({ data: { actorId, resource: 'business-team', resourceId: id, action, payload } });
  }
  private publicInvitation(value: any) { return { ...value, status: value.status === 'PENDING' && value.expiresAt <= new Date() ? 'EXPIRED' : value.status }; }

  async list(userId: string) {
    const member = await businessMembership(this.db, userId), canManage = member.role === OrganizationMemberRole.OWNER;
    const [members, invitations] = await Promise.all([
      this.db.organizationMember.findMany({ where: { organizationId: member.organizationId, ...(!canManage ? { isActive: true } : {}) }, include: { user: { select: safeUser } }, orderBy: [{ isActive: 'desc' }, { createdAt: 'asc' }, { id: 'asc' }] }),
      canManage ? this.db.businessTeamInvitation.findMany({ where: { organizationId: member.organizationId }, select: invitationSelect, orderBy: { createdAt: 'desc' }, take: 100 }) : [],
    ]);
    return { members, invitations: invitations.map(row => this.publicInvitation(row)), canManage, currentMemberId: member.id };
  }

  async invite(userId: string, dto: InviteBusinessMemberDto) {
    if (!['EMPLOYEE', 'BUYER', 'ACCOUNTANT'].includes(dto.role)) throw new ForbiddenException('Владельца можно назначить только через передачу управления');
    const email = dto.email.trim().toLowerCase();
    const requestHash = digest(JSON.stringify({ email, role: dto.role, canOrder: dto.canOrder, canSeeFinance: dto.canSeeFinance }));
    return this.db.$transaction(async tx => {
      const owner = await this.owner(tx, userId);
      if (owner.organization.status === 'ARCHIVED') throw new ConflictException('Нельзя приглашать сотрудников в архивную организацию');
      const previous = await tx.businessTeamInvitation.findUnique({ where: { organizationId_requestKey: { organizationId: owner.organizationId, requestKey: dto.requestKey } }, select: { ...invitationSelect, requestHash: true } });
      if (previous) {
        if (previous.requestHash !== requestHash) throw new ConflictException('Данные приглашения изменились. Создайте новое приглашение');
        const { requestHash: _hash, ...safe } = previous;
        return { invitation: this.publicInvitation(safe), reused: true, localLink: null };
      }
      const duplicate = await tx.organizationMember.findFirst({ where: { organizationId: owner.organizationId, isActive: true, user: { email } } });
      if (duplicate) throw new ConflictException('Этот сотрудник уже состоит в команде');
      if (await tx.businessTeamInvitation.findFirst({ where: { organizationId: owner.organizationId, email, status: 'PENDING', expiresAt: { gt: new Date() } } })) throw new ConflictException('Для этого email уже есть активное приглашение');
      const token = randomBytes(32).toString('base64url'), expiresAt = new Date(Date.now() + 7 * 86400000);
      const invitation = await tx.businessTeamInvitation.create({ data: { organizationId: owner.organizationId, email, role: dto.role,
        canOrder: dto.canOrder, canSeeFinance: dto.canSeeFinance, tokenHash: digest(token), requestKey: dto.requestKey, requestHash, expiresAt, createdById: userId }, select: invitationSelect });
      const base = new URL(this.config.get<string>('PUBLIC_APP_URL') || this.config.get<string>('SITE_URL') || 'http://localhost:3001');
      if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password) throw new BadRequestException('Не настроен публичный адрес кабинета');
      const link = new URL('/b2b-invite', base); link.hash = 'token=' + token;
      await tx.mailOutbox.create({ data: this.mail.prepare({ kind: 'BUSINESS_TEAM_INVITE', recipient: email,
        subject: `Приглашение в ${owner.organization.name.replace(/[\r\n]+/g, ' ')}`,
        text: `Вас пригласили в команду компании «${owner.organization.name}» в SARKISIAN.\nОткройте ссылку и войдите в бизнес-аккаунт с email ${email} или создайте отдельный бизнес-аккаунт:\n${link}\nСсылка действует 7 дней. Если вы не ожидали приглашение, не принимайте его.`,
        dedupeKey: 'business-team-invite:' + invitation.id }) });
      await this.audit(tx, userId, invitation.id, 'INVITE', { organizationId: owner.organizationId, role: dto.role, canOrder: dto.canOrder, canSeeFinance: dto.canSeeFinance });
      const localLinks = this.config.get<string>('B2B_TEAM_LOCAL_INVITE_LINKS') === 'true'
        && this.config.get<string>('STOREFRONT_EXTERNAL_CALLS_ENABLED') !== 'true' && this.config.get<string>('MAIL_DELIVERY_ENABLED') !== 'true';
      return { invitation: this.publicInvitation(invitation), reused: false, localLink: localLinks ? link.toString() : null };
    }, { timeout: 30000 });
  }

  async revoke(userId: string, id: string, version: number) {
    return this.db.$transaction(async tx => {
      const owner = await this.owner(tx, userId);
      const row = await tx.businessTeamInvitation.findFirst({ where: { id, organizationId: owner.organizationId } });
      if (!row) throw new NotFoundException('Приглашение не найдено');
      if (row.version !== version) throw new ConflictException('Приглашение изменилось. Обновите список');
      if (row.status === 'ACCEPTED') throw new ConflictException('Приглашение уже принято. Измените доступ сотрудника в команде');
      if (row.status !== 'REVOKED') {
        await tx.businessTeamInvitation.update({ where: { id }, data: { status: 'REVOKED', revokedAt: new Date(), version: { increment: 1 } } });
        await this.audit(tx, userId, id, 'REVOKE_INVITE', { organizationId: owner.organizationId });
      }
      return { revoked: true };
    });
  }

  async update(userId: string, id: string, dto: UpdateBusinessMemberDto) {
    if (!['EMPLOYEE', 'BUYER', 'ACCOUNTANT'].includes(dto.role)) throw new ForbiddenException('Владельца можно назначить только через передачу управления');
    return this.db.$transaction(async tx => {
      const owner = await this.owner(tx, userId);
      const row = await tx.organizationMember.findFirst({ where: { id, organizationId: owner.organizationId } });
      if (!row) throw new NotFoundException('Сотрудник не найден');
      if (row.version !== dto.version) throw new ConflictException('Доступ сотрудника изменился. Обновите команду');
      if (row.id === owner.id) throw new ConflictException('Для изменения своего доступа сначала передайте управление другому сотруднику');
      if (row.role === 'OWNER' && row.isActive && await tx.organizationMember.count({ where: { organizationId: owner.organizationId, isActive: true, role: 'OWNER' } }) <= 1) throw new ConflictException('Нельзя отключить последнего владельца');
      const result = await tx.organizationMember.update({ where: { id }, data: { role: dto.role, canOrder: dto.canOrder, canSeeFinance: dto.canSeeFinance, isActive: dto.isActive, version: { increment: 1 } }, include: { user: { select: safeUser } } });
      await this.audit(tx, userId, id, 'UPDATE_ACCESS', { organizationId: owner.organizationId, before: { role: row.role, canOrder: row.canOrder, canSeeFinance: row.canSeeFinance, isActive: row.isActive }, after: dto });
      return result; // The membership is retained: existing bookings keep their master and history.
    });
  }

  async transfer(userId: string, dto: TransferBusinessOwnerDto) {
    return this.db.$transaction(async tx => {
      const owner = await this.owner(tx, userId);
      const actor = await tx.user.findUnique({ where: { id: userId } });
      if (!actor?.isActive || !(await bcrypt.compare(dto.currentPassword, actor.password))) throw new UnauthorizedException('Текущий пароль указан неверно');
      const candidate = await tx.organizationMember.findFirst({ where: { id: dto.targetMemberId, organizationId: owner.organizationId, isActive: true } });
      if (!candidate || candidate.id === owner.id) throw new BadRequestException('Выберите другого действующего сотрудника своей организации');
      await tx.$queryRaw`SELECT id FROM "OrganizationMember" WHERE id=${candidate.id} FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM "User" WHERE id=${candidate.userId} FOR SHARE`;
      const target = await tx.organizationMember.findFirst({ where: { id: candidate.id, organizationId: owner.organizationId, isActive: true, user: { isActive: true, role: UserRole.CUSTOMER_B2B } } });
      if (!target || target.userId !== candidate.userId) throw new ConflictException('Выбранный сотрудник больше не может принять управление');
      if (owner.version !== dto.ownerVersion || target.version !== dto.targetVersion) throw new ConflictException('Состав команды изменился. Обновите список перед передачей');
      await tx.organizationMember.update({ where: { id: target.id }, data: { role: 'OWNER', canOrder: true, canSeeFinance: true, version: { increment: 1 } } });
      await tx.organizationMember.update({ where: { id: owner.id }, data: { role: 'EMPLOYEE', canOrder: false, canSeeFinance: false, version: { increment: 1 } } });
      await this.audit(tx, userId, owner.organizationId, 'TRANSFER_OWNERSHIP', { organizationId: owner.organizationId, formerOwnerId: owner.id, newOwnerId: target.id, formerOwnerAccess: { role: 'EMPLOYEE', canOrder: false, canSeeFinance: false } });
      return { transferred: true };
    });
  }

  private async activeInvitation(tx: Prisma.TransactionClient, token: string) {
    const row = await tx.businessTeamInvitation.findUnique({ where: { tokenHash: digest(token) }, include: { organization: { select: { name: true, status: true } } } });
    if (!row || row.status === 'REVOKED' || row.expiresAt <= new Date() || row.organization.status === 'ARCHIVED') throw new NotFoundException('Приглашение недействительно, отозвано или срок действия истёк');
    if (row.status === 'PENDING' && !await tx.organizationMember.findFirst({ where: { organizationId: row.organizationId, userId: row.createdById, isActive: true, role: 'OWNER', user: { isActive: true, role: UserRole.CUSTOMER_B2B } }, select: { id: true } })) throw new NotFoundException('Приглашение больше не действует. Попросите владельца отправить новое');
    return row;
  }
  async preview(token: string) {
    const row = await this.activeInvitation(this.db, token);
    if (row.status !== 'PENDING') throw new ConflictException('Приглашение уже принято');
    const [local, domain] = row.email.split('@');
    return { organizationName: row.organization.name, emailHint: `${local.slice(0, 2)}***@${domain}`, role: row.role, canOrder: row.canOrder, canSeeFinance: row.canSeeFinance, expiresAt: row.expiresAt };
  }
  private async enroll(tx: Prisma.TransactionClient, user: { id: string; email: string; role: UserRole; isActive: boolean }, token: string) {
    const initial = await this.activeInvitation(tx, token);
    await tx.$queryRaw`SELECT id FROM "Organization" WHERE id=${initial.organizationId} FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM "User" WHERE id=${user.id} FOR SHARE`;
    await tx.$queryRaw`SELECT id FROM "User" WHERE id=${initial.createdById} FOR SHARE`;
    const row = await this.activeInvitation(tx, token);
    const currentUser = await tx.user.findUnique({ where: { id: user.id }, select: { id: true, email: true, role: true, isActive: true } });
    if (!currentUser?.isActive || currentUser.role !== UserRole.CUSTOMER_B2B) throw new ForbiddenException('Приглашение предназначено для отдельного бизнес-аккаунта. Обычный аккаунт покупателя не меняется.');
    if (currentUser.email.toLowerCase() !== row.email) throw new ForbiddenException('Войдите в бизнес-аккаунт с email, на который отправлено приглашение');
    if (row.status === 'ACCEPTED') {
      if (row.acceptedById === user.id) return { organizationId: row.organizationId, accepted: true, reused: true };
      throw new ConflictException('Приглашение уже использовано');
    }
    const customer = await tx.customer.findUnique({ where: { userId: user.id }, select: { id: true } });
    const previous = await tx.organizationMember.findUnique({ where: { organizationId_userId: { organizationId: row.organizationId, userId: user.id } } });
    if (!previous?.isActive) await tx.organizationMember.upsert({ where: { organizationId_userId: { organizationId: row.organizationId, userId: user.id } },
      create: { organizationId: row.organizationId, userId: user.id, customerId: customer?.id, role: row.role, canOrder: row.canOrder, canSeeFinance: row.canSeeFinance },
      update: { isActive: true, role: row.role, canOrder: row.canOrder, canSeeFinance: row.canSeeFinance, version: { increment: 1 } } });
    await tx.businessTeamInvitation.update({ where: { id: row.id }, data: { status: 'ACCEPTED', acceptedAt: new Date(), acceptedById: user.id, version: { increment: 1 } } });
    await this.audit(tx, user.id, row.id, 'ACCEPT_INVITE', { organizationId: row.organizationId });
    return { organizationId: row.organizationId, accepted: true, reused: false };
  }
  async accept(userId: string, token: string) {
    const user = await this.db.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Войдите в бизнес-аккаунт');
    return this.db.$transaction(tx => this.enroll(tx, user, token), { timeout: 30000 });
  }
  async register(dto: RegisterInvitedBusinessDto, context: { ipAddress?: string; userAgent?: string }) {
    if (dto.acceptedTerms !== true) throw new BadRequestException('Примите условия регистрации бизнес-аккаунта');
    const invitation = await this.activeInvitation(this.db, dto.token);
    if (invitation.email !== dto.email.trim().toLowerCase()) throw new ForbiddenException('Укажите email, на который отправлено приглашение');
    if (invitation.status !== 'PENDING') throw new ConflictException('Приглашение уже принято');
    let organizationId = '';
    const session = await this.auth.registerBusinessAccount(dto, context, async (tx, user) => {
      organizationId = (await this.enroll(tx, user, dto.token)).organizationId;
      await recordBusinessConsent(tx, user.id, organizationId, context, 'BUSINESS_TEAM_INVITATION', dto.termsVersion);
    });
    return { ...session, organizationId };
  }
}
