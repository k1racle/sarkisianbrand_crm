import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { effectivePermissions } from '../../auth/effective-permissions';
import { employeeAccess, scopedControllers } from '../../auth/employee-access';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext) {
    const required = this.reflector.getAllAndOverride<string[]>('roles', [context.getHandler(), context.getClass()]);
    const user = context.switchToHttp().getRequest().user;
    if (required?.length && (!user || !required.includes(user.role))) throw new ForbiddenException('Недостаточно прав');

    const permissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);
    const actor = user?.sub ? await this.prisma.user.findUnique({ where: { id: user.sub }, select: { id: true, role: true, isActive: true, departmentId: true, accessProfileMode: true } }) : null;
    if (user?.sub && !actor?.isActive) throw new ForbiddenException('Учётная запись недоступна');
    if (required?.length && actor && !required.includes(actor.role)) throw new ForbiddenException('Недостаточно прав');
    if (!permissions?.length) {
      if (actor?.accessProfileMode) throw new ForbiddenException('Для этого раздела не настроены операции профиля');
      return true;
    }
    if (!user?.sub || !user?.role) throw new ForbiddenException('Недостаточно прав');

    const [rolePermissions, userPermissions] = await Promise.all([
      this.prisma.rolePermission.findMany({ where: { role: user.role, permission: { key: { in: permissions } } }, select: { permission: { select: { key: true } } } }),
      this.prisma.userPermission.findMany({ where: { userId: user.sub, permission: { key: { in: permissions } } }, select: { effect: true, permission: { select: { key: true } } } }),
    ]);
    const resolved = actor?.accessProfileMode ? await employeeAccess(this.prisma, actor, rolePermissions, userPermissions) : null;
    if (resolved && !scopedControllers.includes(context.getClass().name) && permissions.some(key => !resolved.decisions.find(item => item.permissionKey === key)?.grants.some(grant => grant.allowed && grant.effectiveScope === 'COMPANY'))) throw new ForbiddenException('Для этого раздела требуется область «Вся компания»');
    const allowed = new Set(resolved?.permissions || effectivePermissions(rolePermissions, userPermissions).permissions);
    if (!permissions.every(permission => allowed.has(permission))) throw new ForbiddenException('Для этой операции нет разрешения');
    return true;
  }
}
