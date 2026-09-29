import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CrmReadAccess, CrmReadPolicy } from '../crm/read-access';

// Explicit contracts only. Registering a handler alone never grants replay authority.
export const jobPolicies: Record<string, { permissions: string[]; system?: 'ORDER_EXPORT' | 'VERIFIED_BOT' }> = {
  '1C_PRODUCTS_IMPORT': { permissions: ['integrations.write', 'catalog.read', 'catalog.write'] },
  '1C_FULL_EXCHANGE': { permissions: ['integrations.write', 'catalog.read', 'catalog.write', 'customers.read', 'customers.write', 'oms.read', 'oms.write', 'web_orders.read', 'web_orders.manage', 'marketplace.read', 'marketplace.write'] },
  'MARKETPLACE_ORDERS_IMPORT': { permissions: ['marketplace.read', 'marketplace.write', 'customers.read', 'customers.write'] },
  '1C_ORDER_EXPORT': { permissions: ['integrations.write', 'oms.read', 'web_orders.read', 'marketplace.read', 'customers.read'], system: 'ORDER_EXPORT' },
  'BOT_WEBHOOK_PROCESS': { permissions: ['integrations.write'], system: 'VERIFIED_BOT' },
};
export const jobSummarySelect = {
  id: true, jobName: true, queueName: true, status: true, progress: true, attempts: true, maxAttempts: true,
  correlationId: true, createdAt: true, startedAt: true, finishedAt: true, nextRetryAt: true,
} satisfies Prisma.JobRunSelect;
export function jobSummary(run: any) { return Object.fromEntries(Object.keys(jobSummarySelect).map(key => [key, run[key]])); }
export function retryBlock(run: any): string | null {
  if (!Object.prototype.hasOwnProperty.call(jobPolicies, run.jobName)) return 'Для этой операции нет безопасного сценария повтора';
  if (run.attempts !== 0 || run.startedAt) return 'Операция уже начиналась. Сначала сверьте результат; повтор может изменить данные второй раз';
  if (run.status !== 'FAILED') return run.status === 'CANCELLED' ? 'Запуск отменён или заменён повтором' : 'Повтор доступен после ошибки постановки в очередь';
  return null;
}

@Injectable()
export class JobPolicy {
  constructor(private readonly access: CrmReadAccess) {}
  definition(name: string) {
    if (!Object.prototype.hasOwnProperty.call(jobPolicies, name)) throw new ForbiddenException('Операция не имеет разрешённого контракта выполнения');
    return jobPolicies[name];
  }
  async operator(db: Prisma.TransactionClient, actor: string) {
    const policy = await this.access.resolve(db, actor, 'system.manage');
    if (!policy.company('system.manage')) throw new ForbiddenException('Управление очередью требует доступа компании');
    return policy;
  }
  assertPermissions(policy: CrmReadPolicy, name: string) {
    if (!this.definition(name).permissions.every(key => policy.company(key))) throw new ForbiddenException('Недостаточно прав на исходную операцию');
  }
  async execution(db: Prisma.TransactionClient, run: { jobName: string; initiatedById: string | null; input: any }) {
    const definition = this.definition(run.jobName);
    if (!definition.system) {
      if (!run.initiatedById) throw new ForbiddenException('Не указан действующий инициатор операции');
      this.assertPermissions(await this.access.resolve(db, run.initiatedById, definition.permissions[0]), run.jobName);
      return;
    }
    // These are server workflows, not a fallback ADMIN role. Validate the persisted source.
    if (definition.system === 'ORDER_EXPORT') {
      const id = run.input?.orderId;
      if (typeof id !== 'string' || !id) throw new NotFoundException('Исходный заказ недоступен');
      const order = await db.order.findFirst({ where: { id, source: { not: 'ONE_C' } }, select: { id: true } });
      if (!order) throw new NotFoundException('Исходный заказ недоступен');
      return;
    }
    const id = run.input?.eventId;
    if (typeof id !== 'string' || !id) throw new NotFoundException('Исходное событие недоступно');
    const event = await db.botWebhookEvent.findUnique({ where: { id }, select: { provider: true, audience: true, integration: { select: { key: true, isEnabled: true, status: true } } } });
    if (!event?.integration.isEnabled || !['CONFIGURED', 'CONNECTED'].includes(event.integration.status)
      || event.integration.key !== 'BOT_' + event.provider + '_' + event.audience) throw new ForbiddenException('Подключение исходного события отключено или недоступно');
  }
}
