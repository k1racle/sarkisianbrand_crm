import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { CustomerStatus, DataEntityType, OrganizationStatus, Prisma, TrashEntryStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { PurgeDataDto, TrashListQueryDto } from './dto/data-lifecycle.dto';

type Dependency = { key: string; label: string; count: number; blocking: boolean };

@Injectable()
export class DataLifecycleService {
  constructor(private readonly prisma: PrismaService) {}

  async trash(query: TrashListQueryDto) {
    const rows = await this.prisma.dataTrashEntry.findMany({
      where: {
        status: TrashEntryStatus.TRASHED,
        ...(query.type ? { entityType: query.type } : {}),
        ...(query.search ? { displayName: { contains: query.search.trim(), mode: 'insensitive' } } : {}),
      },
      include: { actor: { select: { id: true, firstName: true, lastName: true, email: true } } },
      orderBy: { trashedAt: 'desc' },
      take: 200,
    });
    return { items: rows, total: rows.length, retentionDays: 30 };
  }

  async preview(type: DataEntityType, id: string) {
    const entity = await this.entity(type, id);
    const dependencies = await this.dependencies(type, id);
    return {
      entityType: type,
      entityId: id,
      displayName: this.displayName(type, entity),
      currentState: this.currentState(type, entity),
      dependencies,
      blockingDependencies: dependencies.filter((item) => item.blocking && item.count > 0),
      canPurge: dependencies.every((item) => !item.blocking || item.count === 0),
      purgeAfterDays: 30,
    };
  }

  async archive(type: DataEntityType, id: string, reason?: string) {
    await this.entity(type, id);
    await this.prisma.$transaction(async (tx) => this.setArchived(tx, type, id));
    return { entityType: type, entityId: id, archived: true, reason: reason?.trim() || null };
  }

  async moveToTrash(type: DataEntityType, id: string, actorId: string, reason?: string) {
    if (type === DataEntityType.USER && id === actorId) throw new ConflictException('Нельзя переместить собственную учётную запись в корзину');
    const existing = await this.prisma.dataTrashEntry.findFirst({ where: { entityType: type, entityId: id, status: TrashEntryStatus.TRASHED } });
    if (existing) throw new ConflictException('Объект уже находится в корзине');
    const entity = await this.entity(type, id);
    const preview = await this.preview(type, id);
    const snapshot = this.json(this.safeSnapshot(type, entity));
    const previousState = this.json(this.previousState(type, entity));
    return this.prisma.$transaction(async (tx) => {
      await this.setArchived(tx, type, id);
      if (type === DataEntityType.USER) await tx.session.deleteMany({ where: { userId: id } });
      return tx.dataTrashEntry.create({
        data: {
          entityType: type,
          entityId: id,
          displayName: preview.displayName,
          snapshot,
          previousState,
          dependencySummary: this.json(preview.dependencies),
          reason: reason?.trim() || null,
          actorId,
          purgeAfter: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
    });
  }

  async restore(entryId: string) {
    const entry = await this.prisma.dataTrashEntry.findUnique({ where: { id: entryId } });
    if (!entry || entry.status !== TrashEntryStatus.TRASHED) throw new NotFoundException('Объект не найден в корзине');
    await this.entity(entry.entityType, entry.entityId);
    await this.prisma.$transaction(async (tx) => {
      await this.restoreState(tx, entry.entityType, entry.entityId, entry.previousState as Record<string, unknown>);
      await tx.dataTrashEntry.update({ where: { id: entry.id }, data: { status: TrashEntryStatus.RESTORED, restoredAt: new Date() } });
    });
    return { restored: true, entityType: entry.entityType, entityId: entry.entityId };
  }

  async purge(entryId: string, actorId: string, dto: PurgeDataDto) {
    const [entry, actor] = await Promise.all([
      this.prisma.dataTrashEntry.findUnique({ where: { id: entryId } }),
      this.prisma.user.findUnique({ where: { id: actorId } }),
    ]);
    if (!entry || entry.status !== TrashEntryStatus.TRASHED) throw new NotFoundException('Объект не найден в корзине');
    if (!actor || !(await bcrypt.compare(dto.currentAdminPassword, actor.password))) throw new UnauthorizedException('Пароль администратора указан неверно');
    if (dto.confirmation !== entry.displayName) throw new BadRequestException(`Для подтверждения введите точно: ${entry.displayName}`);
    if (entry.entityType === DataEntityType.USER && entry.entityId === actorId) throw new ConflictException('Нельзя удалить собственную учётную запись');
    const preview = await this.preview(entry.entityType, entry.entityId);
    if (!preview.canPurge) {
      const blockers = preview.blockingDependencies.map((item) => `${item.label}: ${item.count}`).join('; ');
      throw new ConflictException(`Окончательное удаление запрещено. Сначала обработайте связи: ${blockers}`);
    }
    await this.prisma.$transaction(async (tx) => {
      await this.deleteEntity(tx, entry.entityType, entry.entityId);
      await tx.dataTrashEntry.update({ where: { id: entry.id }, data: {
        status: TrashEntryStatus.PURGED,
        purgedAt: new Date(),
        snapshot: { purged: true },
        previousState: {},
        dependencySummary: this.json(preview.dependencies),
      } });
    });
    return { purged: true, entityType: entry.entityType };
  }

  private async entity(type: DataEntityType, id: string) {
    let entity: any;
    if (type === DataEntityType.USER) entity = await this.prisma.user.findUnique({ where: { id }, select: { id: true, email: true, phone: true, firstName: true, lastName: true, role: true, isActive: true, createdAt: true } });
    else if (type === DataEntityType.CUSTOMER) entity = await this.prisma.customer.findUnique({ where: { id }, select: { id: true, firstName: true, lastName: true, email: true, phone: true, status: true, segment: true, source: true, createdAt: true } });
    else if (type === DataEntityType.ORGANIZATION) entity = await this.prisma.organization.findUnique({ where: { id }, select: { id: true, name: true, legalName: true, inn: true, status: true, createdAt: true } });
    else if (type === DataEntityType.PRODUCT) entity = await this.prisma.product.findUnique({ where: { id }, select: { id: true, nameRu: true, sku: true, slug: true, basePrice: true, currency: true, externalId: true, isSynced: true, isActive: true, createdAt: true } });
    else if (type === DataEntityType.CATEGORY) entity = await this.prisma.category.findUnique({ where: { id }, select: { id: true, nameRu: true, slug: true, parentId: true, isActive: true, sortOrder: true } });
    else throw new BadRequestException('Для этого типа данных жизненный цикл ещё не подключён');
    if (!entity) throw new NotFoundException('Объект не найден');
    return entity;
  }

  private async dependencies(type: DataEntityType, id: string): Promise<Dependency[]> {
    if (type === DataEntityType.USER) {
      const [orders, managedOrders, assignedTasks, createdTasks, interactions, memberships, b2bProfiles, carts, tickets, partners] = await this.prisma.$transaction([
        this.prisma.order.count({ where: { userId: id } }), this.prisma.order.count({ where: { managerId: id } }),
        this.prisma.task.count({ where: { assignedToId: id } }), this.prisma.task.count({ where: { createdById: id } }),
        this.prisma.interaction.count({ where: { userId: id } }), this.prisma.organizationMember.count({ where: { userId: id } }),
        this.prisma.b2BProfile.count({ where: { userId: id } }), this.prisma.cart.count({ where: { userId: id } }),
        this.prisma.helpdeskTicket.count({ where: { OR: [{ requesterUserId: id }, { assignedToId: id }] } }),
        this.prisma.partnerParticipant.count({where:{userId:id}}),
      ]);
      return this.dependencyRows([['orders','Заказы покупателя',orders],['managedOrders','Заказы в работе',managedOrders],['assignedTasks','Назначенные задачи',assignedTasks],['createdTasks','Созданные задачи',createdTasks],['interactions','Взаимодействия',interactions],['memberships','Участие в организациях',memberships],['b2bProfiles','B2B-профиль',b2bProfiles],['carts','Корзина покупателя',carts],['tickets','Обращения Helpdesk',tickets],['partners','Партнёрский финансовый журнал',partners]]);
    }
    if (type === DataEntityType.CUSTOMER) {
      const [orders, leads, interactions, memberships, tickets, tasks] = await this.prisma.$transaction([
        this.prisma.order.count({ where: { customerId: id } }), this.prisma.lead.count({ where: { customerId: id } }),
        this.prisma.interaction.count({ where: { customerId: id } }), this.prisma.organizationMember.count({ where: { customerId: id } }),
        this.prisma.helpdeskTicket.count({ where: { customerId: id } }), this.prisma.task.count({ where: { customerId: id } }),
      ]);
      return this.dependencyRows([['orders','Заказы',orders],['leads','Сделки',leads],['interactions','Взаимодействия',interactions],['memberships','Организации',memberships],['tickets','Обращения Helpdesk',tickets],['tasks','Задачи',tasks]]);
    }
    if (type === DataEntityType.ORGANIZATION) {
      const [orders, leads, members, tickets, clients, services, bookings, tasks, referrals] = await this.prisma.$transaction([
        this.prisma.order.count({ where: { organizationId: id } }), this.prisma.lead.count({ where: { organizationId: id } }),
        this.prisma.organizationMember.count({ where: { organizationId: id } }), this.prisma.helpdeskTicket.count({ where: { organizationId: id } }),
        this.prisma.b2BClient.count({ where: { organizationId: id } }), this.prisma.b2BService.count({ where: { organizationId: id } }),
        this.prisma.b2BBooking.count({ where: { organizationId: id } }), this.prisma.task.count({ where: { organizationId: id } }),
        this.prisma.partnerBusinessRegistration.count({where:{organizationId:id}}),
      ]);
      return this.dependencyRows([['orders','Заказы',orders],['leads','Сделки',leads],['members','Сотрудники организации',members],['tickets','Обращения Helpdesk',tickets],['clients','Клиенты салона',clients],['services','Услуги',services],['bookings','Записи',bookings],['tasks','Задачи',tasks],['referrals','Партнёрское привлечение организации',referrals]]);
    }
    if (type === DataEntityType.PRODUCT) {
      const [variants, orderItems, cartItems, categories, images] = await this.prisma.$transaction([
        this.prisma.productVariant.count({ where: { productId: id } }), this.prisma.orderItem.count({ where: { variant: { productId: id } } }),
        this.prisma.cartItem.count({ where: { variant: { productId: id } } }), this.prisma.productCategory.count({ where: { productId: id } }),
        this.prisma.productImage.count({ where: { productId: id } }),
      ]);
      return [
        { key:'orderItems', label:'Позиции в заказах', count:orderItems, blocking:true },
        { key:'cartItems', label:'Товары в корзинах', count:cartItems, blocking:false },
        { key:'variants', label:'Варианты товара', count:variants, blocking:false },
        { key:'categories', label:'Категории', count:categories, blocking:false },
        { key:'images', label:'Изображения', count:images, blocking:false },
      ];
    }
    const [products, children] = await this.prisma.$transaction([
      this.prisma.productCategory.count({ where: { categoryId: id } }), this.prisma.category.count({ where: { parentId: id } }),
    ]);
    return this.dependencyRows([['products','Товары категории',products],['children','Дочерние категории',children]]);
  }

  private dependencyRows(rows: Array<[string, string, number]>): Dependency[] {
    return rows.map(([key, label, count]) => ({ key, label, count, blocking: true }));
  }

  private displayName(type: DataEntityType, entity: any) {
    if (type === DataEntityType.USER) return [entity.firstName, entity.lastName].filter(Boolean).join(' ') || entity.email;
    if (type === DataEntityType.CUSTOMER) return [entity.firstName, entity.lastName].filter(Boolean).join(' ') || entity.email || entity.phone || entity.id;
    if (type === DataEntityType.ORGANIZATION) return entity.name;
    if (type === DataEntityType.PRODUCT) return entity.nameRu;
    return entity.nameRu;
  }

  private currentState(type: DataEntityType, entity: any) {
    if (type === DataEntityType.USER || type === DataEntityType.PRODUCT || type === DataEntityType.CATEGORY) return entity.isActive ? 'ACTIVE' : 'ARCHIVED';
    return entity.status;
  }

  private previousState(type: DataEntityType, entity: any) {
    if (type === DataEntityType.USER || type === DataEntityType.PRODUCT || type === DataEntityType.CATEGORY) return { isActive: entity.isActive };
    return { status: entity.status };
  }

  private safeSnapshot(type: DataEntityType, entity: any) {
    return { ...entity, entityType: type };
  }

  private async setArchived(tx: Prisma.TransactionClient, type: DataEntityType, id: string) {
    if (type === DataEntityType.USER) return tx.user.update({ where: { id }, data: { isActive: false } });
    if (type === DataEntityType.CUSTOMER) return tx.customer.update({ where: { id }, data: { status: CustomerStatus.ARCHIVED } });
    if (type === DataEntityType.ORGANIZATION) return tx.organization.update({ where: { id }, data: { status: OrganizationStatus.ARCHIVED } });
    if (type === DataEntityType.PRODUCT) return tx.product.update({ where: { id }, data: { isActive: false } });
    if (type === DataEntityType.CATEGORY) return tx.category.update({ where: { id }, data: { isActive: false } });
    throw new BadRequestException('Для этого типа данных архивация ещё не подключена');
  }

  private async restoreState(tx: Prisma.TransactionClient, type: DataEntityType, id: string, state: Record<string, any>) {
    if (type === DataEntityType.USER) return tx.user.update({ where: { id }, data: { isActive: state.isActive !== false } });
    if (type === DataEntityType.CUSTOMER) return tx.customer.update({ where: { id }, data: { status: (state.status as CustomerStatus) || CustomerStatus.ACTIVE } });
    if (type === DataEntityType.ORGANIZATION) return tx.organization.update({ where: { id }, data: { status: (state.status as OrganizationStatus) || OrganizationStatus.ACTIVE } });
    if (type === DataEntityType.PRODUCT) return tx.product.update({ where: { id }, data: { isActive: state.isActive !== false } });
    if (type === DataEntityType.CATEGORY) return tx.category.update({ where: { id }, data: { isActive: state.isActive !== false } });
    throw new BadRequestException('Для этого типа данных восстановление ещё не подключено');
  }

  private async deleteEntity(tx: Prisma.TransactionClient, type: DataEntityType, id: string) {
    if (type === DataEntityType.USER) return tx.user.delete({ where: { id } });
    if (type === DataEntityType.CUSTOMER) return tx.customer.delete({ where: { id } });
    if (type === DataEntityType.ORGANIZATION) return tx.organization.delete({ where: { id } });
    if (type === DataEntityType.PRODUCT) {
      await tx.cartItem.deleteMany({ where: { variant: { productId: id } } });
      return tx.product.delete({ where: { id } });
    }
    if (type === DataEntityType.CATEGORY) return tx.category.delete({ where: { id } });
    throw new BadRequestException('Для этого типа данных удаление ещё не подключено');
  }

  private json(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }
}
