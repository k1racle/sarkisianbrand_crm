import { BadRequestException, ConflictException, Injectable, NestMiddleware, NotFoundException } from '@nestjs/common';
import { OrganizationMemberRole, Prisma, UserRole } from '@prisma/client';
import { AsyncLocalStorage } from 'node:async_hooks';
import { isUUID } from 'class-validator';

const scope = new AsyncLocalStorage<{ organizationId: string | null }>();
export const BUSINESS_ORGANIZATION_HEADER = 'x-b2b-organization-id';

/** A request's organization can never leak into another concurrent request. */
@Injectable()
export class BusinessContextMiddleware implements NestMiddleware {
  use(request: any, _response: any, next: () => void) {
    const value = request.headers[BUSINESS_ORGANIZATION_HEADER];
    if (value !== undefined && (typeof value !== 'string' || !isUUID(value))) throw new BadRequestException('Выберите корректную организацию');
    scope.run({ organizationId: value || null }, next);
  }
}

const memberInclude = { organization: true, user: { select: { id: true, email: true, phone: true, firstName: true, lastName: true } } } as const;
export async function businessMembership(db: Pick<Prisma.TransactionClient, 'organizationMember'>, userId: string) {
  const organizationId = scope.getStore()?.organizationId;
  const rows = await db.organizationMember.findMany({
    where: { userId, isActive: true, user: { isActive: true, role: UserRole.CUSTOMER_B2B }, ...(organizationId ? { organizationId } : {}) },
    include: memberInclude, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], take: 2,
  });
  if (!rows.length) throw new NotFoundException('B2B-организация не найдена или доступ отключён');
  if (rows.length > 1) throw new ConflictException('Выберите организацию для работы в кабинете');
  return rows[0];
}

export const businessSalonRole = (role: OrganizationMemberRole) => [OrganizationMemberRole.OWNER, OrganizationMemberRole.EMPLOYEE].includes(role as any);
