import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { IntegrationStatus, Prisma } from '@prisma/client';

type IntegrationRecord = { isEnabled: boolean; status: IntegrationStatus; config: Prisma.JsonValue; encryptedSecrets: string | null };
export type VerifyLockedIntegration = (integration: IntegrationRecord | null) => boolean;

// Call after all Order and Variant locks. Settings changes lock only this row.
export async function lockIntegration(tx: Prisma.TransactionClient, verify?: VerifyLockedIntegration) {
  await tx.$queryRaw`SELECT id FROM "EcosystemIntegration" WHERE key = 'ONE_C' FOR SHARE`;
  const integration = await tx.ecosystemIntegration.findUnique({ where: { key: 'ONE_C' }, select: { isEnabled: true, status: true, config: true, encryptedSecrets: true } });
  if (verify && !verify(integration)) throw new UnauthorizedException('Неверный ключ интеграции 1С');
  return integration;
}
export async function lockWarehouseIntegration(tx: Prisma.TransactionClient, warehouseId: string, verify?: VerifyLockedIntegration) {
  const integration = await lockIntegration(tx, verify);
  if (!integration?.isEnabled || (integration.config as any)?.warehouseId !== warehouseId) throw new ConflictException('Настройки склада 1С изменились. Повторите обмен после сверки');
}
