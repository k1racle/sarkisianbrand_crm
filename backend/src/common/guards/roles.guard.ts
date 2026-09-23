import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { effectivePermissions } from '../../auth/effective-permissions';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext) {
    const required = this.reflector.getAllAndOverride<string[]>('roles', [context.getHandler(), context.getClass()]);
    const user = context.switchToHttp().getRequest().user;
    if (required?.length && (!user || !required.includes(user.role))) throw new ForbiddenException('Недостаточно прав');

    const permissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);
    if (!permissions?.length) return true;
    if (!user?.sub || !user?.role) throw new ForbiddenException('Недостаточно прав');

    const [rolePermissions, userPermissions] = await Promise.all([
      this.prisma.rolePermission.findMany({ where: { role: user.role, permission: { key: { in: permissions } } }, select: { permission: { select: { key: true } } } }),
      this.prisma.userPermission.findMany({ where: { userId: user.sub, permission: { key: { in: permissions } } }, select: { effect: true, permission: { select: { key: true } } } }),
    ]);
    const allowed = new Set(effectivePermissions(rolePermissions, userPermissions).permissions);
    if (!permissions.every(permission => allowed.has(permission))) throw new ForbiddenException('Для этой операции нет разрешения');
    return true;
  }
}
