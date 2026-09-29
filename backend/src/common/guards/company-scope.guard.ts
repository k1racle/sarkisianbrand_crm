import { CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CrmReadAccess } from '../../crm/read-access';

export const COMPANY_SCOPE = 'company-scope-permissions';
export const CompanyScope = (...permissions: string[]) => SetMetadata(COMPANY_SCOPE, permissions);

/** Supplementary boundary for configuration without record/department ownership.
 * JwtAuthGuard + RolesGuard still run first. Narrow grants never become global configuration access. */
@Injectable()
export class CompanyScopeGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly prisma: PrismaService, private readonly access: CrmReadAccess) {}
  async canActivate(context: ExecutionContext) {
    const permissions = this.reflector.getAllAndOverride<string[]>(COMPANY_SCOPE, [context.getHandler(), context.getClass()]);
    if (!permissions?.length) return true;
    const actor = context.switchToHttp().getRequest().user?.sub;
    await this.prisma.$transaction(async db => {
      const policy = await this.access.resolve(db, actor, permissions[0]);
      if (!permissions.every(key => policy.company(key))) throw new ForbiddenException('Общая конфигурация требует доступа ко всей компании');
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
    return true;
  }
}
