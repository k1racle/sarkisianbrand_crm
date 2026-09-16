import { BadRequestException, Injectable, Logger, OnModuleDestroy, OnModuleInit, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { LoyaltyOperationDto, UpdateLoyaltyProgramDto } from './dto/loyalty.dto';
import { DEFAULT_LOYALTY_SETTINGS, loyaltyCreditMetadata, loyaltyLevel, loyaltyWriteOffMetadata, maintainAccount, replayLoyaltyLedger } from './loyalty-core.helpers';

@Injectable()
export class LoyaltyService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LoyaltyService.name);
  private timer?: NodeJS.Timeout;
  private maintaining = false;
  private stopping = false;
  private cursor?: string;

  constructor(private readonly prisma: PrismaService, @Optional() private readonly config?: ConfigService) {}

  async settings() {
    // Dashboard / quote reads must not initialize or rewrite global settings.
    return await this.prisma.loyaltyProgramSetting.findUnique({ where: { id: 'default' } }) || { ...DEFAULT_LOYALTY_SETTINGS };
  }

  async updateSettings(dto: UpdateLoyaltyProgramDto) {
    if (dto.premiumThreshold <= dto.proThreshold) throw new BadRequestException('Порог уровня «Премиум» должен быть выше порога уровня «Профессионал»');
    return this.prisma.loyaltyProgramSetting.upsert({ where: { id: 'default' }, update: dto, create: { id: 'default', ...dto } });
  }

  async account(userId: string) {
    return this.prisma.$transaction(async tx => {
      const settings = await tx.loyaltyProgramSetting.findUnique({ where: { id: 'default' } }) || { ...DEFAULT_LOYALTY_SETTINGS };
      const result = await maintainAccount(tx, userId, settings);
      return { ...result.account, entries: this.recent(result.entries, 30) };
    });
  }

  private recent<T extends { createdAt: Date; id: string }>(entries: T[], take: number) {
    return entries.slice().sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.id.localeCompare(a.id)).slice(0, take);
  }

  async overview(search = '') {
    const query = search.trim();
    const participant = { role: 'CUSTOMER_B2C' as const, isActive: true };
    const [settings, users, earned, spent, operations] = await Promise.all([
      this.settings(),
      this.prisma.user.findMany({
        where: { ...participant, ...(query ? { OR: [
          { email: { contains: query, mode: 'insensitive' as const } },
          { firstName: { contains: query, mode: 'insensitive' as const } },
          { lastName: { contains: query, mode: 'insensitive' as const } }, { phone: { contains: query } },
        ] } : {}) },
        // Complete ledger is needed to know which credits were already spent before expiry.
        include: { loyaltyAccount: { include: { entries: { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] } } } },
        orderBy: { createdAt: 'desc' }, take: 250,
      }),
      this.prisma.loyaltyTransaction.aggregate({ where: { account: { user: participant }, amount: { gt: 0 } }, _sum: { amount: true } }),
      this.prisma.loyaltyTransaction.aggregate({ where: { account: { user: participant }, amount: { lt: 0 }, type: { not: 'EXPIRY' } }, _sum: { amount: true } }),
      this.prisma.loyaltyTransaction.count({ where: { account: { user: participant } } }),
    ]);
    const now = new Date();
    const accounts = users.map(user => {
      const entries = user.loyaltyAccount?.entries || [];
      const balance = replayLoyaltyLedger(user.loyaltyAccount?.balance || 0, entries, now).availableBalance;
      return { userId: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email,
        phone: user.phone, createdAt: user.createdAt, balance, level: loyaltyLevel(balance, settings), entries: this.recent(entries, 5) };
    });
    return { settings, summary: { participants: users.length, activeBalances: accounts.reduce((sum, account) => sum + account.balance, 0),
      earned: earned._sum.amount || 0, spent: Math.abs(spent._sum.amount || 0), operations }, accounts };
  }

  async operation(userId: string, dto: LoyaltyOperationDto, type: 'ACCRUAL' | 'WRITE_OFF') {
    if (!['ACCRUAL', 'WRITE_OFF'].includes(type) || !Number.isSafeInteger(dto.amount) || dto.amount < 1 || dto.amount > 1_000_000) {
      throw new BadRequestException('Укажите положительное целое количество бонусов до 1 000 000.');
    }
    const reason = typeof dto.reason === 'string' ? dto.reason.trim() : '';
    if (!reason || reason.length > 240) throw new BadRequestException('Укажите причину операции до 240 символов.');
    return this.prisma.$transaction(async tx => {
      const settings = await tx.loyaltyProgramSetting.findUnique({ where: { id: 'default' } }) || { ...DEFAULT_LOYALTY_SETTINGS };
      if (!settings.isEnabled) throw new BadRequestException('Бонусная программа приостановлена');
      const { account, entries } = await maintainAccount(tx, userId, settings);
      if (type === 'ACCRUAL' && account.balance > 2_147_483_647 - dto.amount) throw new BadRequestException('Превышен допустимый бонусный баланс.');
      const now = new Date();
      const metadata = type === 'ACCRUAL' ? loyaltyCreditMetadata(settings, now, { source: 'MANUAL' }) :
        loyaltyWriteOffMetadata(account.balance, entries, dto.amount, now);
      await tx.loyaltyTransaction.create({ data: { accountId: account.id, amount: type === 'WRITE_OFF' ? -dto.amount : dto.amount,
        type, reason, orderId: dto.orderId, metadata } });
      return tx.loyaltyAccount.update({ where: { id: account.id }, data: {
        balance: type === 'WRITE_OFF' ? { decrement: dto.amount } : { increment: dto.amount },
        level: loyaltyLevel(account.balance + (type === 'WRITE_OFF' ? -dto.amount : dto.amount), settings),
      }, include: { entries: { orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 30 } } });
    });
  }

  async calculateAccrual(userId: string, orderAmount: number) {
    if (!userId || !Number.isFinite(orderAmount) || orderAmount <= 0) return 0;
    const [user, settings] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId }, include: { loyaltyAccount: { include: { entries: true } } } }), this.settings(),
    ]);
    if (!user?.isActive || user.role !== 'CUSTOMER_B2C' || !settings.isEnabled || settings.earnPercent <= 0) return 0;
    const balance = replayLoyaltyLedger(user.loyaltyAccount?.balance || 0, user.loyaltyAccount?.entries || []).availableBalance;
    const level = loyaltyLevel(balance, settings);
    const multiplier = level === 'PREMIUM' ? settings.premiumMultiplierPercent : level === 'PRO' ? settings.proMultiplierPercent : 100;
    return Math.floor(orderAmount * settings.earnPercent * multiplier / 10000);
  }

  async byUser(userId: string) { return this.account(userId); }

  private maintenanceEnabled() {
    const value = this.config?.get<string | boolean>('LOYALTY_MAINTENANCE_ENABLED', false);
    return value === true || value === 'true';
  }

  onModuleInit() {
    this.stopping = false;
    if (!this.maintenanceEnabled()) return;
    this.timer = setInterval(() => { void this.runMaintenance().catch(() => this.logger.warn('Обработка бонусной программы временно недоступна.')); }, 60_000);
    this.timer.unref();
  }

  onModuleDestroy() { this.stopping = true; if (this.timer) clearInterval(this.timer); }

  async runMaintenance(limit = 100) {
    if (!this.maintenanceEnabled()) return { processed: 0, disabled: true };
    if (this.maintaining || this.stopping) return { processed: 0, disabled: false };
    this.maintaining = true;
    let processed = 0;
    try {
      const take = Number.isFinite(limit) ? Math.max(1, Math.min(100, Math.floor(limit))) : 100;
      const users = await this.prisma.user.findMany({ where: { role: 'CUSTOMER_B2C', isActive: true }, select: { id: true },
        orderBy: { id: 'asc' }, take, ...(this.cursor ? { cursor: { id: this.cursor }, skip: 1 } : {}) });
      for (const user of users) {
        if (this.stopping || !this.maintenanceEnabled()) break;
        try {
          await this.prisma.$transaction(async tx => {
            const settings = await tx.loyaltyProgramSetting.findUnique({ where: { id: 'default' } }) || { ...DEFAULT_LOYALTY_SETTINGS };
            await maintainAccount(tx, user.id, settings);
          });
          processed++;
        } catch { this.logger.warn('Не удалось обработать бонусный счёт. Повторная проверка выполнится позже.'); }
        this.cursor = user.id;
      }
      if (users.length < take) this.cursor = undefined;
      return { processed, disabled: false };
    } finally { this.maintaining = false; }
  }
}
