import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CrmReadAccess } from '../crm/read-access';
import { withOperationalAccess } from '../common/operational-access';
import { orderAccessWhere } from './oms-read.service';
import { AssignOrderManagerDto } from './dto/oms.dto';

const roles: UserRole[] = ['ADMIN', 'EXECUTIVE', 'SUPERVISOR', 'MANAGER_SALES', 'MANAGER_B2B', 'MARKETPLACE_MANAGER', 'WAREHOUSE'];
const person = { id: true, firstName: true, lastName: true } as const;
const name = (user: { firstName: string | null; lastName: string | null } | null) => user ? [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Сотрудник' : 'Не назначен';

export class OmsManagerService {
  constructor(private readonly prisma: PrismaService, private readonly access: CrmReadAccess) {}

  choices(actor: string, id: string, search?: string) {
    return withOperationalAccess(this.prisma, this.access, actor, 'oms', true, async ctx => {
      const order = await ctx.db.order.findFirst({ where: { AND: [orderAccessWhere(ctx), { id }] }, select: { id: true } });
      if (!order) throw new NotFoundException('Заказ не найден или недоступен');
      const query = search?.trim();
      const users = await ctx.db.user.findMany({ where: { AND: [ctx.read.assignees(), ctx.write!.assignees(), { role: { in: roles } }, ...(query ? [{ OR: [{ firstName: { contains: query, mode: 'insensitive' as const } }, { lastName: { contains: query, mode: 'insensitive' as const } }] }] : [])] }, select: person, orderBy: [{ firstName: 'asc' }, { id: 'asc' }], take: 100 });
      const items: typeof users = [];
      for (const user of users) {
        try {
          await this.access.resolve(ctx.db, user.id, 'oms.read');
          await this.access.resolve(ctx.db, user.id, 'oms.write');
          items.push(user);
        } catch (error) { if (!(error instanceof ForbiddenException)) throw error; }
      }
      return { items, canUnassign: ctx.read.company('oms.read') && ctx.write!.company('oms.write'), hasMore: users.length === 100 };
    });
  }

  assign(actor: string, id: string, dto: AssignOrderManagerDto) {
    return withOperationalAccess(this.prisma, this.access, actor, 'oms', true, async ctx => {
      const tx = ctx.db;
      await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${id} FOR UPDATE`;
      const order = await tx.order.findFirst({ where: { AND: [orderAccessWhere(ctx), { id }] }, select: { id: true, managerId: true, status: true, manager: { select: person } } });
      if (!order) throw new NotFoundException('Заказ не найден или недоступен');
      if (order.managerId === dto.managerId) return { id, managerId: order.managerId };
      if (order.managerId !== dto.expectedManagerId) throw new ConflictException('Ответственный уже изменён другим сотрудником. Обновите карточку заказа.');
      let target: { id: string; firstName: string | null; lastName: string | null } | null = null;
      let targetRead, targetWrite;
      if (dto.managerId === null) {
        if (!ctx.read.company('oms.read') || !ctx.write!.company('oms.write')) throw new ForbiddenException('Снять ответственного можно только с доступом ко всем заказам');
      } else {
        target = await tx.user.findFirst({ where: { AND: [ctx.read.assignees(), ctx.write!.assignees(), { id: dto.managerId, role: { in: roles } }] }, select: person });
        if (!target) throw new ForbiddenException('Ответственный недоступен');
        targetRead = await this.access.resolve(tx, target.id, 'oms.read');
        targetWrite = await this.access.resolve(tx, target.id, 'oms.write');
      }
      await tx.order.update({ where: { id }, data: { managerId: dto.managerId } });
      if (targetRead && targetWrite && !await tx.order.findFirst({ where: { AND: [{ id }, targetRead.orders('oms.read'), targetWrite.orders('oms.write')] }, select: { id: true } })) throw new ForbiddenException('Сотрудник не имеет доступа к этому заказу');
      const operator = await tx.user.findUnique({ where: { id: actor }, select: person });
      await tx.orderStatusHistory.create({ data: { orderId: id, fromStatus: order.status, toStatus: order.status, changedBy: actor, comment: `Ответственный: ${name(order.manager)} → ${name(target)}. Изменил: ${name(operator)}` } });
      await tx.auditLog.create({ data: { actorId: actor, resource: 'oms', resourceId: id, action: 'ORDER_MANAGER_CHANGED', payload: { fromManagerId: order.managerId, toManagerId: dto.managerId } } });
      // A transfer may remove the operator's access; return only the confirmed assignment.
      return { id, managerId: dto.managerId };
    });
  }
}
