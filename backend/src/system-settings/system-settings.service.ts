import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BotAudience, IntegrationStatus, PermissionEffect, Prisma, ProfileChangeStatus, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { BackgroundJobsService } from '../background-jobs/background-jobs.service';
import { AccountListQueryDto, CreateBotCommandDto, CreateEmployeeDto, ReviewProfileChangeDto, SetTemporaryPasswordDto, UpdateAccountDto, UpdateBotCommandDto, UpdateEmployeeDto, UpdateEmployeePermissionsDto, UpdateIntegrationDto, UpsertBotIdentityDto } from './dto/system-settings.dto';
import { defaultBotCommands, integrationDefinitionMap, integrationDefinitions } from './integration-catalog';
import { IntegrationSecretsService } from './integration-secrets.service';
import { effectivePermissions } from '../auth/effective-permissions';
import { internalWorkspaceRoles, workspaceRoleCatalog, workspaceRoleDetails } from '../auth/workspace-role-catalog';

const internalRoles = internalWorkspaceRoles;

@Injectable()
export class SystemSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jobs: BackgroundJobsService,
    private readonly secrets: IntegrationSecretsService,
    private readonly config: ConfigService,
  ) {}

  async dashboard() {
    await this.ensureIntegrationCatalog();
    const [staff, activeStaff, sessions, permissions, auditToday, integrations, activeJobs, failedJobs] = await this.prisma.$transaction([
      this.prisma.user.count({ where: { role: { in: internalRoles } } }),
      this.prisma.user.count({ where: { role: { in: internalRoles }, isActive: true } }),
      this.prisma.session.count({ where: { expiresAt: { gt: new Date() } } }),
      this.prisma.permission.count(),
      this.prisma.auditLog.count({ where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } }),
      this.prisma.ecosystemIntegration.count({ where: { isEnabled: true, status: { in: [IntegrationStatus.CONFIGURED, IntegrationStatus.CONNECTED] } } }),
      this.prisma.jobRun.count({ where: { status: { in: ['WAITING', 'ACTIVE', 'RETRYING'] } } }),
      this.prisma.jobRun.count({ where: { status: 'FAILED' } }),
    ]);
    return { staff, activeStaff, sessions, permissions, auditToday, integrations, activeJobs, failedJobs };
  }

  async staff() {
    const trashed = await this.prisma.dataTrashEntry.findMany({ where: { entityType: 'USER', status: 'TRASHED' }, select: { entityId: true } });
    return this.prisma.user.findMany({
      where: { role: { in: internalRoles }, id: { notIn: trashed.map((item) => item.entityId) } },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true, departmentId: true, department: { select: { id: true, name: true } }, createdAt: true, updatedAt: true, _count: { select: { sessions: true } }, permissionOverrides: { include: { permission: true } } },
      orderBy: [{ isActive: 'desc' }, { firstName: 'asc' }],
    });
  }

  async createEmployee(dto: CreateEmployeeDto) {
    if (await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } })) throw new ConflictException('Сотрудник с таким email уже существует');
    return this.prisma.user.create({ data: { email: dto.email.toLowerCase(), password: await bcrypt.hash(dto.password, 12), firstName: dto.firstName, lastName: dto.lastName, role: dto.role }, select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true, createdAt: true } });
  }

  async updateEmployee(id: string, dto: UpdateEmployeeDto, actorId: string) {
    if (id === actorId && dto.isActive === false) throw new ConflictException('Нельзя заблокировать собственную учётную запись');
    if (id === actorId && dto.role && dto.role !== UserRole.ADMIN) throw new ConflictException('Нельзя понизить собственную роль администратора');
    const employee = await this.prisma.user.findUnique({ where: { id } });
    if (!employee || !internalRoles.includes(employee.role)) throw new NotFoundException('Сотрудник не найден');
    return this.prisma.$transaction(async tx => {
      const updated = await tx.user.update({ where: { id }, data: dto, select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true, updatedAt: true } });
      if (dto.isActive === false || (dto.role && dto.role !== employee.role)) await tx.session.deleteMany({ where: { userId: id } });
      return updated;
    });
  }

  async revokeSessions(id: string) {
    const employee = await this.prisma.user.findUnique({ where: { id } });
    if (!employee) throw new NotFoundException('Сотрудник не найден');
    const result = await this.prisma.session.deleteMany({ where: { userId: id } });
    return { id, revoked: result.count };
  }

  async accounts(query: AccountListQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 30;
    const type = query.type || 'ALL';
    const roleFilter = type === 'STAFF'
      ? { in: internalRoles }
      : type === 'B2C'
        ? { equals: UserRole.CUSTOMER_B2C }
        : type === 'B2B'
          ? { equals: UserRole.CUSTOMER_B2B }
          : undefined;
    const search = query.search?.trim();
    const trashed = await this.prisma.dataTrashEntry.findMany({ where: { entityType: 'USER', status: 'TRASHED' }, select: { entityId: true } });
    const where: Prisma.UserWhereInput = {
      id: { notIn: trashed.map((item) => item.entityId) },
      ...(roleFilter ? { role: roleFilter } : {}),
      ...(search ? {
        OR: [
          { email: { contains: search, mode: 'insensitive' } },
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search } },
          { b2bProfile: { companyName: { contains: search, mode: 'insensitive' } } },
        ],
      } : {}),
    };
    const [items, total, staff, b2c, b2b, pendingChanges] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: {
          id: true, email: true, phone: true, firstName: true, lastName: true, role: true, isActive: true,
          forcePasswordChange: true, passwordChangedAt: true, avatarStorageKey: true, createdAt: true, updatedAt: true,
          _count: { select: { sessions: true } },
          customer: { select: { id: true, status: true, source: true } },
          b2bProfile: { select: { id: true, companyName: true, inn: true, isVerified: true } },
          organizationMemberships: { where: { isActive: true }, select: { role: true, organization: { select: { id: true, name: true, status: true } } }, take: 3 },
        },
        orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count({ where }),
      this.prisma.user.count({ where: { role: { in: internalRoles }, id: { notIn: trashed.map((item) => item.entityId) } } }),
      this.prisma.user.count({ where: { role: UserRole.CUSTOMER_B2C, id: { notIn: trashed.map((item) => item.entityId) } } }),
      this.prisma.user.count({ where: { role: UserRole.CUSTOMER_B2B, id: { notIn: trashed.map((item) => item.entityId) } } }),
      this.prisma.profileChangeRequest.count({ where: { status: ProfileChangeStatus.PENDING } }),
    ]);
    return {
      items: items.map((item) => ({
        ...item,
        accountType: internalRoles.includes(item.role) ? 'STAFF' : item.role === UserRole.CUSTOMER_B2B ? 'B2B' : 'B2C',
        avatarUrl: item.avatarStorageKey ? `/api/v1/auth/avatar/${item.id}?v=${encodeURIComponent(item.avatarStorageKey)}` : null,
        avatarStorageKey: undefined,
      })),
      total, page, limit, pages: Math.max(1, Math.ceil(total / limit)), totals: { all: staff + b2c + b2b, staff, b2c, b2b, pendingChanges },
    };
  }

  async updateAccount(id: string, dto: UpdateAccountDto, actorId: string) {
    if (id === actorId && dto.isActive === false) throw new ConflictException('Нельзя заблокировать собственную учётную запись');
    const current = await this.prisma.user.findUnique({ where: { id }, include: { customer: true } });
    if (!current) throw new NotFoundException('Учётная запись не найдена');
    try {
      return await this.prisma.$transaction(async (tx) => {
        const updated = await tx.user.update({
          where: { id },
          data: {
            email: dto.email?.trim().toLowerCase(), phone: dto.phone?.trim(), firstName: dto.firstName?.trim(),
            lastName: dto.lastName?.trim(), isActive: dto.isActive,
          },
          select: { id: true, email: true, phone: true, firstName: true, lastName: true, role: true, isActive: true, updatedAt: true },
        });
        if (current.customer) {
          await tx.customer.update({ where: { id: current.customer.id }, data: {
            email: updated.email, normalizedEmail: updated.email.toLowerCase(), phone: updated.phone,
            normalizedPhone: updated.phone?.replace(/\D/g, '') || null, firstName: updated.firstName, lastName: updated.lastName,
          } });
        }
        if (dto.isActive === false) await tx.session.deleteMany({ where: { userId: id } });
        return updated;
      });
    } catch (error: any) {
      if (error?.code === 'P2002') throw new ConflictException('Email или телефон уже используется другой учётной записью');
      throw error;
    }
  }

  async createPasswordReset(id: string, actorId: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: { id: true, email: true, isActive: true } });
    if (!user) throw new NotFoundException('Учётная запись не найдена');
    if (!user.isActive) throw new ConflictException('Сначала разблокируйте учётную запись');
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await this.prisma.$transaction([
      this.prisma.passwordResetToken.updateMany({ where: { userId: id, usedAt: null }, data: { usedAt: new Date() } }),
      this.prisma.passwordResetToken.create({ data: { userId: id, tokenHash, expiresAt, createdById: actorId } }),
    ]);
    const publicUrl = this.config.get('PUBLIC_APP_URL', 'http://localhost:3001').replace(/\/$/, '');
    return { email: user.email, resetUrl: `${publicUrl}/password-reset?token=${rawToken}`, expiresAt, delivery: 'COPY_LINK' };
  }

  async setTemporaryPassword(id: string, actorId: string, dto: SetTemporaryPasswordDto) {
    const [actor, target] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: actorId } }),
      this.prisma.user.findUnique({ where: { id } }),
    ]);
    if (!actor || !(await bcrypt.compare(dto.currentAdminPassword, actor.password))) throw new UnauthorizedException('Пароль администратора указан неверно');
    if (!target) throw new NotFoundException('Учётная запись не найдена');
    if (!/[a-zа-я]/i.test(dto.temporaryPassword) || !/\d/.test(dto.temporaryPassword)) throw new BadRequestException('Временный пароль должен содержать буквы и цифры');
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id }, data: { password: await bcrypt.hash(dto.temporaryPassword, 12), forcePasswordChange: true, passwordChangedAt: new Date() } }),
      this.prisma.session.deleteMany({ where: { userId: id } }),
      this.prisma.passwordResetToken.updateMany({ where: { userId: id, usedAt: null }, data: { usedAt: new Date() } }),
    ]);
    return { changed: true, forcePasswordChange: true };
  }

  profileChangeRequests() {
    return this.prisma.profileChangeRequest.findMany({
      where: { status: ProfileChangeStatus.PENDING },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true, role: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async reviewProfileChange(id: string, actorId: string, dto: ReviewProfileChangeDto) {
    const request = await this.prisma.profileChangeRequest.findUnique({ where: { id }, include: { user: { include: { customer: true } } } });
    if (!request || request.status !== ProfileChangeStatus.PENDING) throw new NotFoundException('Активный запрос не найден');
    const requested = request.requestedData as Record<string, string>;
    try {
      return await this.prisma.$transaction(async (tx) => {
        const claimed = await tx.profileChangeRequest.updateMany({ where: { id, status: ProfileChangeStatus.PENDING }, data: { status: dto.status, reviewedById: actorId, reviewedAt: new Date(), reviewComment: dto.comment } });
        if (claimed.count !== 1) throw new ConflictException('Этот запрос уже рассмотрен другим сотрудником');
        if (dto.status === ProfileChangeStatus.APPROVED) {
          const updated = await tx.user.update({ where: { id: request.userId }, data: {
            firstName: requested.firstName, lastName: requested.lastName, phone: requested.phone,
          } });
          if (request.user.customer) await tx.customer.update({ where: { id: request.user.customer.id }, data: {
            firstName: updated.firstName, lastName: updated.lastName, phone: updated.phone,
            normalizedPhone: updated.phone?.replace(/\D/g, '') || null,
            birthday: requested.birthday ? new Date(`${requested.birthday}T00:00:00.000Z`) : undefined,
          } });
        }
        return tx.profileChangeRequest.update({ where: { id }, data: { status: dto.status, reviewedById: actorId, reviewedAt: new Date(), reviewComment: dto.comment } });
      });
    } catch (error: any) {
      if (error?.code === 'P2002') throw new ConflictException('Указанный телефон уже используется');
      throw error;
    }
  }

  async accessMatrix() {
    const permissions = await this.prisma.permission.findMany({ include: { roles: true }, orderBy: [{ resource: 'asc' }, { action: 'asc' }] });
    return { roles: internalRoles, roleDetails: workspaceRoleCatalog, permissions: permissions.map(permission => ({ ...permission, roles: permission.roles.map(item => item.role) })) };
  }

  async accessReview(id: string) {
    return this.prisma.$transaction(async tx => {
      const employee = await tx.user.findUnique({ where: { id }, select: {
        id: true, firstName: true, lastName: true, email: true, role: true, isActive: true,
        department: { select: { id: true, name: true, archivedAt: true } },
      } });
      if (!employee || !internalRoles.includes(employee.role)) throw new NotFoundException('Сотрудник не найден');
      const catalog = await tx.permission.findMany({
        include: { roles: { where: { role: employee.role } }, users: { where: { userId: id }, select: { effect: true, scope: true } } },
        orderBy: [{ resource: 'asc' }, { action: 'asc' }],
      });
      const roleGrants = catalog.filter(item => item.roles.length).map(item => ({ permission: { key: item.key } }));
      const overrides = catalog.flatMap(item => item.users.map(override => ({ ...override, permission: { key: item.key } })));
      const effective = effectivePermissions(roleGrants, overrides);
      return {
        employee, role: workspaceRoleDetails(employee.role),
        permissions: catalog.map(item => ({
          key: item.key, description: item.description || item.key, resource: item.resource, action: item.action,
          allowed: employee.isActive && effective.permissions.includes(item.key),
          source: !employee.isActive ? 'BLOCKED_ACCOUNT' : effective.denied.includes(item.key) ? 'DENY'
            : item.users.some(override => override.effect === 'ALLOW') ? 'ALLOW' : item.roles.length ? 'ROLE' : 'NOT_GRANTED',
        })),
        dataVisibility: { departmentEnforced: false, message: 'Отдел пока не ограничивает видимость записей. Эта проверка показывает разрешения на операции; серверные списки ролей и правила конкретной записи также могут ограничивать действие.' },
      };
    }, { isolationLevel: 'RepeatableRead' });
  }

  async updatePermissions(id: string, dto: UpdateEmployeePermissionsDto, actorId?: string) {
    const allow = [...new Set(dto.allow)];
    const deny = [...new Set(dto.deny)];
    if (allow.some(key => deny.includes(key))) {
      throw new BadRequestException('Одно разрешение нельзя одновременно разрешить и запретить');
    }
    if (id === actorId && deny.includes('system.manage')) throw new ConflictException('Нельзя запретить себе управление доступом');
    const employee = await this.prisma.user.findUnique({ where: { id } });
    if (!employee || !internalRoles.includes(employee.role)) throw new NotFoundException('Сотрудник не найден');
    const uniqueKeys = [...allow, ...deny];
    const permissions = await this.prisma.permission.findMany({ where: { key: { in: uniqueKeys } } });
    if (permissions.length !== uniqueKeys.length) throw new NotFoundException('Одно из разрешений не найдено');
    const keyMap = new Map(permissions.map(item => [item.key, item.id]));
    await this.prisma.$transaction(async tx => {
      await tx.userPermission.deleteMany({ where: { userId: id } });
      const rows = [
        ...allow.map(key => ({ userId: id, permissionId: keyMap.get(key)!, effect: PermissionEffect.ALLOW })),
        ...deny.map(key => ({ userId: id, permissionId: keyMap.get(key)!, effect: PermissionEffect.DENY })),
      ];
      if (rows.length) await tx.userPermission.createMany({ data: rows });
      await tx.session.deleteMany({ where: { userId: id } });
    });
    return { id, overrides: uniqueKeys.length };
  }

  async technicalLogs() {
    const [sync, integrations, recentAudit, jobs, queue] = await Promise.all([
      this.prisma.syncLog.findMany({ orderBy: { createdAt: 'desc' }, take: 100 }),
      this.prisma.marketplaceIntegration.findMany({ select: { id: true, channel: true, shopName: true, isActive: true, lastSyncAt: true, updatedAt: true }, orderBy: { updatedAt: 'desc' } }),
      this.prisma.auditLog.findMany({ select: { id: true, action: true, resource: true, route: true, correlationId: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 50 }),
      this.prisma.jobRun.findMany({ orderBy: { createdAt: 'desc' }, take: 100 }),
      this.jobs.health(),
    ]);
    return { sync, integrations, recentAudit, jobs, queue };
  }

  retryJob(id: string, actorId: string) { return this.jobs.retry(id, actorId); }

  private async ensureIntegrationCatalog() {
    await this.prisma.$transaction(
      integrationDefinitions.map((definition) => this.prisma.ecosystemIntegration.upsert({
        where: { key: definition.key },
        update: {
          provider: definition.provider,
          name: definition.name,
          category: definition.category,
          audience: definition.audience,
          description: definition.description,
          documentationUrl: definition.documentationUrl,
        },
        create: {
          key: definition.key,
          provider: definition.provider,
          name: definition.name,
          category: definition.category,
          audience: definition.audience,
          description: definition.description,
          documentationUrl: definition.documentationUrl,
        },
      })),
    );
  }

  private integrationView(item: any) {
    const definition = integrationDefinitionMap.get(item.key);
    const config = (item.config || {}) as Record<string, unknown>;
    const configuredSecrets = new Set<string>(item.configuredSecretKeys || []);
    return {
      id: item.id,
      key: item.key,
      provider: item.provider,
      name: item.name,
      category: item.category,
      audience: item.audience,
      description: item.description,
      documentationUrl: item.documentationUrl,
      isEnabled: item.isEnabled,
      environment: item.environment,
      status: item.status,
      lastTestAt: item.lastTestAt,
      lastTestMessage: item.lastTestMessage,
      updatedAt: item.updatedAt,
      fields: (definition?.fields || []).map((field) => ({
        ...field,
        value: field.type === 'secret' ? undefined : config[field.key] ?? '',
        configured: field.type === 'secret' ? configuredSecrets.has(field.key) : Boolean(config[field.key]),
      })),
    };
  }

  async integrations() {
    await this.ensureIntegrationCatalog();
    const rows = await this.prisma.ecosystemIntegration.findMany({
      orderBy: [{ category: 'asc' }, { provider: 'asc' }, { audience: 'asc' }],
    });
    return rows.map((item) => this.integrationView(item));
  }

  async updateIntegration(key: string, dto: UpdateIntegrationDto) {
    const definition = integrationDefinitionMap.get(key);
    if (!definition) throw new NotFoundException('Интеграция не найдена');
    await this.ensureIntegrationCatalog();
    const current = await this.prisma.ecosystemIntegration.findUnique({ where: { key } });
    if (!current) throw new NotFoundException('Интеграция не найдена');

    const publicFields = new Set(definition.fields.filter((field) => field.type !== 'secret').map((field) => field.key));
    const secretFields = new Set(definition.fields.filter((field) => field.type === 'secret').map((field) => field.key));
    const config = { ...((current.config || {}) as Record<string, unknown>) };
    const secretValues = this.secrets.decrypt(current.encryptedSecrets);

    for (const [field, value] of Object.entries(dto.config || {})) {
      if (!publicFields.has(field)) throw new BadRequestException(`Неизвестное поле настройки: ${field}`);
      config[field] = typeof value === 'string' ? value.trim() : value;
    }
    for (const [field, value] of Object.entries(dto.secrets || {})) {
      if (!secretFields.has(field)) throw new BadRequestException(`Неизвестное секретное поле: ${field}`);
      if (typeof value === 'string' && value.trim()) secretValues[field] = value.trim();
    }
    for (const field of dto.clearSecrets || []) {
      if (!secretFields.has(field)) throw new BadRequestException(`Неизвестное секретное поле: ${field}`);
      delete secretValues[field];
    }

    const enabled = dto.isEnabled ?? current.isEnabled;
    const missing = definition.fields
      .filter((field) => field.required)
      .filter((field) => field.type === 'secret' ? !secretValues[field.key] : !config[field.key])
      .map((field) => field.label);
    const status = !enabled
      ? IntegrationStatus.DISABLED
      : missing.length
        ? IntegrationStatus.NOT_CONFIGURED
        : IntegrationStatus.CONFIGURED;
    const updated = await this.prisma.ecosystemIntegration.update({
      where: { key },
      data: {
        isEnabled: enabled,
        environment: dto.environment,
        status,
        config: config as Prisma.InputJsonValue,
        encryptedSecrets: this.secrets.encrypt(secretValues),
        configuredSecretKeys: Object.keys(secretValues).sort(),
        lastTestAt: null,
        lastTestMessage: missing.length ? `Не заполнено: ${missing.join(', ')}` : null,
      },
    });
    return this.integrationView(updated);
  }

  async testIntegration(key: string) {
    const definition = integrationDefinitionMap.get(key);
    if (!definition) throw new NotFoundException('Интеграция не найдена');
    await this.ensureIntegrationCatalog();
    const current = await this.prisma.ecosystemIntegration.findUnique({ where: { key } });
    if (!current) throw new NotFoundException('Интеграция не найдена');
    const config = (current.config || {}) as Record<string, unknown>;
    const configuredSecrets = new Set(current.configuredSecretKeys);
    const missing = definition.fields
      .filter((field) => field.required)
      .filter((field) => field.type === 'secret' ? !configuredSecrets.has(field.key) : !config[field.key])
      .map((field) => field.label);
    if (missing.length) throw new BadRequestException(`Заполните обязательные поля: ${missing.join(', ')}`);
    const message = 'Обязательные параметры заполнены. Подключение готово к реализации рабочего адаптера.';
    const updated = await this.prisma.ecosystemIntegration.update({
      where: { key },
      data: { status: current.isEnabled ? IntegrationStatus.CONFIGURED : IntegrationStatus.DISABLED, lastTestAt: new Date(), lastTestMessage: message },
    });
    return this.integrationView(updated);
  }

  private async ensureDefaultBotCommands() {
    await this.prisma.$transaction(defaultBotCommands.map((command) => this.prisma.botCommand.upsert({
      where: { slug: command.slug },
      update: {},
      create: {
        ...command,
        audiences: [...command.audiences] as BotAudience[],
        channels: [...command.channels],
      },
    })));
  }

  async botCommands() {
    await this.ensureDefaultBotCommands();
    return this.prisma.botCommand.findMany({ orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }] });
  }

  async createBotCommand(dto: CreateBotCommandDto) {
    const command = dto.command.startsWith('/') ? dto.command : `/${dto.command}`;
    const slug = command.slice(1);
    try {
      return await this.prisma.botCommand.create({ data: { ...dto, command, slug } });
    } catch (error: any) {
      if (error?.code === 'P2002') throw new ConflictException('Команда с таким именем уже существует');
      throw error;
    }
  }

  async updateBotCommand(id: string, dto: UpdateBotCommandDto) {
    if (!await this.prisma.botCommand.findUnique({ where: { id } })) throw new NotFoundException('Команда не найдена');
    const command = dto.command ? (dto.command.startsWith('/') ? dto.command : `/${dto.command}`) : undefined;
    try {
      return await this.prisma.botCommand.update({
        where: { id },
        data: { ...dto, command, slug: command?.slice(1) },
      });
    } catch (error: any) {
      if (error?.code === 'P2002') throw new ConflictException('Команда с таким именем уже существует');
      throw error;
    }
  }

  async deleteBotCommand(id: string) {
    if (!await this.prisma.botCommand.findUnique({ where: { id } })) throw new NotFoundException('Команда не найдена');
    await this.prisma.botCommand.delete({ where: { id } });
    return { id, deleted: true };
  }

  async botEvents() {
    const [items, statusGroups, identities, unlinked] = await Promise.all([
      this.prisma.botWebhookEvent.findMany({
        include: {
          integration: { select: { name: true, key: true } },
          command: { select: { command: true, title: true } },
        },
        orderBy: { receivedAt: 'desc' },
        take: 100,
      }),
      this.prisma.botWebhookEvent.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.botIdentity.count(),
      this.prisma.botIdentity.count({ where: { isVerified: false } }),
    ]);
    return {
      items,
      identities,
      unlinked,
      statuses: Object.fromEntries(statusGroups.map((item) => [item.status, item._count._all])),
    };
  }

  botIdentities() {
    return this.prisma.botIdentity.findMany({
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true, role: true } },
        customer: { select: { id: true, email: true, phone: true, firstName: true, lastName: true } },
        organization: { select: { id: true, name: true, inn: true } },
      },
      orderBy: [{ isVerified: 'asc' }, { lastSeenAt: 'desc' }],
    });
  }

  async upsertBotIdentity(dto: UpsertBotIdentityDto) {
    if (!dto.userId && !dto.customerId && !dto.organizationId) throw new BadRequestException('Выберите профиль сотрудника, клиента или B2B-организацию');
    if (dto.audience === BotAudience.EMPLOYEE && !dto.userId) throw new BadRequestException('Для бота сотрудников требуется учётная запись сотрудника');
    if (dto.audience === BotAudience.B2C && !dto.customerId) throw new BadRequestException('Для B2C-бота требуется карточка клиента');
    if (dto.audience === BotAudience.B2B && !dto.organizationId) throw new BadRequestException('Для B2B-бота требуется организация');
    const [user, customer, organization] = await Promise.all([
      dto.userId ? this.prisma.user.findUnique({ where: { id: dto.userId }, select: { id: true } }) : null,
      dto.customerId ? this.prisma.customer.findUnique({ where: { id: dto.customerId }, select: { id: true } }) : null,
      dto.organizationId ? this.prisma.organization.findUnique({ where: { id: dto.organizationId }, select: { id: true } }) : null,
    ]);
    if (dto.userId && !user) throw new NotFoundException('Учётная запись не найдена');
    if (dto.customerId && !customer) throw new NotFoundException('Карточка клиента не найдена');
    if (dto.organizationId && !organization) throw new NotFoundException('B2B-организация не найдена');
    const verified = dto.isVerified ?? true;
    return this.prisma.botIdentity.upsert({
      where: { provider_audience_externalUserId: { provider: dto.provider, audience: dto.audience, externalUserId: dto.externalUserId } },
      update: { ...dto, isVerified: verified, verifiedAt: verified ? new Date() : null, lastSeenAt: new Date() },
      create: { ...dto, isVerified: verified, verifiedAt: verified ? new Date() : null },
    });
  }

  async deleteBotIdentity(id: string) {
    if (!await this.prisma.botIdentity.findUnique({ where: { id }, select: { id: true } })) throw new NotFoundException('Привязка мессенджера не найдена');
    await this.prisma.botIdentity.delete({ where: { id } });
    return { id, deleted: true };
  }
}
