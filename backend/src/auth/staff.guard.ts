import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { internalWorkspaceRoles } from './workspace-role-catalog';

// Staff conversations use membership rules, independent of record-access profiles.
// JWT/session verification must run before this guard. Linked CRM records still
// pass through ChatRecordsService's own permission and scope checks.
@Injectable()
export class StaffGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}
  async canActivate(context: ExecutionContext) {
    const id = context.switchToHttp().getRequest().user?.sub;
    const actor = id && await this.prisma.user.findUnique({ where: { id }, select: { isActive: true, role: true } });
    if (!actor?.isActive || !internalWorkspaceRoles.includes(actor.role)) throw new ForbiddenException('Раздел доступен только сотрудникам');
    return true;
  }
}
