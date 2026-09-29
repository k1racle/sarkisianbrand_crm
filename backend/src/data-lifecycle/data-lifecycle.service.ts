import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { CustomerStatus, DataEntityType, OrganizationStatus, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CrmReadAccess, CrmReadPolicy } from '../crm/read-access';
import { PurgeDataDto, TrashListQueryDto } from './dto/data-lifecycle.dto';

type Context = { db: Prisma.TransactionClient; policy: CrmReadPolicy; actor: string };
type Dependency = { key: string; label: string; count: number; blocking: boolean; permission: string };
const models = { USER: 'User', CUSTOMER: 'Customer', ORGANIZATION: 'Organization', PRODUCT: 'Product', CATEGORY: 'Category' } as const;
const recordPermissions = { USER: ['system.manage', 'system.manage'], CUSTOMER: ['customers.read', 'customers.write'], ORGANIZATION: ['customers.read', 'customers.write'], PRODUCT: ['catalog.read', 'catalog.write'], CATEGORY: ['catalog.read', 'catalog.write'] } as const;
const entrySelect = { id: true, entityType: true, entityId: true, displayName: true, status: true, reason: true, trashedAt: true, purgeAfter: true, actor: { select: { id: true, firstName: true, lastName: true } } } satisfies Prisma.DataTrashEntrySelect;

@Injectable()
export class DataLifecycleService {
  constructor(private readonly prisma: PrismaService, private readonly access: CrmReadAccess) {}
  private async run<T>(actor: string, write: boolean, action: (ctx: Context) => Promise<T>) {
    try {
      return await this.prisma.$transaction(async db => {
        if (write) await db.$executeRaw`SELECT pg_advisory_xact_lock(73422112)`;
        const policy = await this.access.resolve(db, actor, 'system.manage');
        const user = await db.user.findUnique({ where: { id: actor }, select: { role: true, isActive: true } });
        if (!user?.isActive || user.role !== 'ADMIN' || !policy.company('system.manage')) throw new ForbiddenException('Корзина доступна администратору с правами на всю компанию');
        return action({ db, policy, actor });
      }, { isolationLevel: write ? Prisma.TransactionIsolationLevel.Serializable : Prisma.TransactionIsolationLevel.RepeatableRead, timeout: 30000 });
    } catch (error: any) {
      if (['P2002', 'P2003', 'P2014', 'P2034'].includes(error.code)) throw new ConflictException('Связи или состояние записи изменились. Обновите данные и повторите действие.');
      throw error;
    }
  }
  private requireType(ctx: Context, type: DataEntityType, write = false) {
    const permissions = recordPermissions[type];
    if (!permissions) throw new BadRequestException('Для этого типа данных жизненный цикл ещё не подключён');
    if (!ctx.policy.company(permissions[0])) throw new NotFoundException('Объект не найден или недоступен');
    if (write && !ctx.policy.company(permissions[1])) throw new ForbiddenException('Для изменения требуются права на весь раздел');
  }
  private async lock(ctx: Context, type: DataEntityType, id: string) {
    this.requireType(ctx, type, true);
    await ctx.db.$queryRaw(Prisma.sql`SELECT id FROM ${Prisma.raw('"' + models[type] + '"')} WHERE id = ${id} FOR UPDATE`);
  }
  private protectSelf(ctx: Context, type: DataEntityType, id: string) {
    if (type === 'USER' && id === ctx.actor) throw new ConflictException('Нельзя архивировать, удалять или восстанавливать собственную учётную запись');
  }
  trash(actor: string, query: TrashListQueryDto) { return this.run(actor, false, async ctx => {
    if (query.type) this.requireType(ctx, query.type);
    const allowed = Object.keys(models).filter(type => ctx.policy.company(recordPermissions[type][0])) as DataEntityType[];
    const where: Prisma.DataTrashEntryWhereInput = { status: 'TRASHED', entityType: query.type || { in: allowed }, ...(query.search?.trim() ? { displayName: { contains: query.search.trim(), mode: 'insensitive' } } : {}) };
    const page = query.page || 1, limit = query.limit || 50;
    const [rows, total] = await Promise.all([
      ctx.db.dataTrashEntry.findMany({ where, select: entrySelect, orderBy: [{ trashedAt: 'desc' }, { id: 'asc' }], skip: (page - 1) * limit, take: limit }),
      ctx.db.dataTrashEntry.count({ where }),
    ]);
    return { items: rows.map(row => ({ ...row, canRestore: ctx.policy.company(recordPermissions[row.entityType][1]) && !(row.entityType === 'USER' && row.entityId === actor) })), total, page, pages: Math.max(1, Math.ceil(total / limit)), retentionDays: 30, automaticPurge: false };
  }); }
  private async previewIn(ctx: Context, type: DataEntityType, id: string) {
    this.requireType(ctx, type);
    const entity = await this.entity(ctx.db, type, id);
    const entry = await ctx.db.dataTrashEntry.findFirst({ where: { entityType: type, entityId: id, status: 'TRASHED' }, select: { id: true, purgeAfter: true } });
    const dependencies = await this.dependencies(ctx.db, type, id);
    const canWrite = ctx.policy.company(recordPermissions[type][1]) && !(type === 'USER' && id === ctx.actor);
    const exposed: Array<Omit<Dependency, 'permission' | 'count'> & { count: number | null }> = dependencies.filter(item => ctx.policy.company(item.permission)).map(({ permission, ...item }) => item);
    if (dependencies.some(item => item.count && !ctx.policy.company(item.permission))) exposed.push({ key: 'restricted', label: 'Связи в закрытых разделах', count: null, blocking: true });
    return { entityType: type, entityId: id, displayName: this.displayName(type, entity), currentState: this.currentState(type, entity),
      dependencies: exposed, blockingDependencies: exposed.filter(item => item.blocking && item.count !== 0),
      canRestore: Boolean(entry && canWrite), canPurge: Boolean(entry && canWrite && entry.purgeAfter <= new Date() && dependencies.every(item => !item.blocking || item.count === 0)),
      canWrite, purgeAfter: entry?.purgeAfter || null, purgeAfterDays: 30, automaticPurge: false };
  }
  preview(actor: string, type: DataEntityType, id: string) { return this.run(actor, false, ctx => this.previewIn(ctx, type, id)); }
  archive(actor: string, type: DataEntityType, id: string, reason?: string) { return this.run(actor, true, async ctx => {
    await this.lock(ctx, type, id); this.protectSelf(ctx, type, id);
    await this.entity(ctx.db, type, id);
    await this.setArchived(ctx.db, type, id);
    if (type === 'USER') await ctx.db.session.deleteMany({ where: { userId: id } });
    await this.audit(ctx, type, id, 'ARCHIVE');
    return { entityType: type, entityId: id, archived: true };
  }); }
  moveToTrash(type: DataEntityType, id: string, actor: string, reason?: string) { return this.run(actor, true, async ctx => {
    await this.lock(ctx, type, id); this.protectSelf(ctx, type, id);
    const entity = await this.entity(ctx.db, type, id);
    const existing = await ctx.db.dataTrashEntry.findFirst({ where: { entityType: type, entityId: id, status: 'TRASHED' }, select: entrySelect });
    if (existing) return { ...existing, canRestore: true };
    await this.setArchived(ctx.db, type, id);
    if (type === 'USER') await ctx.db.session.deleteMany({ where: { userId: id } });
    const entry = await ctx.db.dataTrashEntry.create({ data: { entityType: type, entityId: id, displayName: this.displayName(type, entity),
      snapshot: { entityType: type, entityId: id }, previousState: this.json(this.previousState(type, entity)), dependencySummary: {},
      reason: reason?.trim() || null, actorId: actor, purgeAfter: new Date(Date.now() + 30 * 86400000) }, select: entrySelect });
    await this.audit(ctx, type, id, 'TRASH'); return { ...entry, canRestore: true };
  }); }
  private async entry(ctx: Context, id: string) {
    const row = await ctx.db.dataTrashEntry.findUnique({ where: { id } });
    if (!row || row.status !== 'TRASHED') throw new NotFoundException('Объект не найден или недоступен');
    this.requireType(ctx, row.entityType, true); this.protectSelf(ctx, row.entityType, row.entityId);
    await this.lock(ctx, row.entityType, row.entityId);
    await ctx.db.$queryRaw`SELECT id FROM "DataTrashEntry" WHERE id = ${id} FOR UPDATE`;
    const current = await ctx.db.dataTrashEntry.findUnique({ where: { id } });
    if (!current || current.status !== 'TRASHED') throw new ConflictException('Запись корзины уже изменена. Обновите список.');
    return current;
  }
  restore(actor: string, entryId: string) { return this.run(actor, true, async ctx => {
    const entry = await this.entry(ctx, entryId);
    await this.entity(ctx.db, entry.entityType, entry.entityId);
    const state = entry.previousState as Record<string, any>;
    if (!state || typeof state !== 'object') throw new ConflictException('Сохранённое состояние недоступно');
    const valid = ['USER', 'PRODUCT', 'CATEGORY'].includes(entry.entityType) ? typeof state.isActive === 'boolean'
      : Object.values(entry.entityType === 'CUSTOMER' ? CustomerStatus : OrganizationStatus).includes(state.status);
    if (!valid) throw new ConflictException('Сохранённое состояние не поддерживается');
    await this.restoreState(ctx.db, entry.entityType, entry.entityId, state);
    await ctx.db.dataTrashEntry.updateMany({ where: { entityType: entry.entityType, entityId: entry.entityId, status: 'TRASHED' }, data: { status: 'RESTORED', restoredAt: new Date() } });
    await this.audit(ctx, entry.entityType, entry.entityId, 'RESTORE');
    return { restored: true, entityType: entry.entityType, entityId: entry.entityId };
  }); }
  purge(entryId: string, actor: string, dto: PurgeDataDto) { return this.run(actor, true, async ctx => {
    const entry = await this.entry(ctx, entryId);
    const user = await ctx.db.user.findUnique({ where: { id: actor }, select: { password: true } });
    if (!user?.password || !(await bcrypt.compare(dto.currentAdminPassword, user.password))) throw new UnauthorizedException('Пароль администратора указан неверно');
    if (dto.confirmation !== entry.displayName) throw new BadRequestException('Название для подтверждения не совпадает');
    if (entry.purgeAfter > new Date()) throw new ConflictException('Срок хранения в корзине ещё не истёк');
    await this.entity(ctx.db, entry.entityType, entry.entityId);
    const dependencies = await this.dependencies(ctx.db, entry.entityType, entry.entityId);
    if (dependencies.some(item => item.blocking && item.count > 0)) throw new ConflictException('Окончательное удаление запрещено: у записи есть связанные данные');
    await this.deleteEntity(ctx.db, entry.entityType, entry.entityId);
    // Clear all historical copies, not only the most recent trash cycle.
    await ctx.db.dataTrashEntry.updateMany({ where: { entityType: entry.entityType, entityId: entry.entityId }, data: {
      status: 'PURGED', purgedAt: new Date(), displayName: 'Удалённая запись', reason: null, snapshot: { purged: true }, previousState: {}, dependencySummary: {} } });
    await this.audit(ctx, entry.entityType, entry.entityId, 'PURGE');
    return { purged: true, entityType: entry.entityType };
  }); }
  private audit(ctx: Context, type: DataEntityType, id: string, action: string) {
    return ctx.db.auditLog.create({ data: { actorId: ctx.actor, resource: 'data-lifecycle', resourceId: id, action, payload: { entityType: type } } });
  }
  private async dependencies(db: Prisma.TransactionClient, type: DataEntityType, id: string): Promise<Dependency[]> {
    // Enumerate every incoming schema relation; new cascade/SetNull links block by default.
    const target = models[type], result: Dependency[] = [];
    for (const model of Prisma.dmmf.datamodel.models) for (const field of model.fields) {
      if (field.kind !== 'object' || !field.relationFromFields?.length || field.type !== target) continue;
      if (field.relationFromFields.length !== 1 || field.relationToFields?.[0] !== 'id') throw new ConflictException('Для нового типа связи требуется проверка удаления');
      const delegate = model.name[0].toLowerCase() + model.name.slice(1);
      const count = await (db as any)[delegate].count({ where: { [field.relationFromFields[0]]: id } });
      const catalogChild = type === 'PRODUCT' && ['ProductVariant', 'ProductCategory', 'ProductImage'].includes(model.name);
      result.push({ key: model.name + '.' + field.name, label: this.relationLabel(model.name), count, blocking: !catalogChild, permission: this.relationPermission(model.name) });
    }
    if (type === 'PRODUCT') {
      // Product variants will cascade; all references to those variants are checked too.
      for (const model of Prisma.dmmf.datamodel.models) for (const field of model.fields) {
        if (field.kind !== 'object' || !field.relationFromFields?.length || field.type !== 'ProductVariant') continue;
        const delegate = model.name[0].toLowerCase() + model.name.slice(1);
        const count = await (db as any)[delegate].count({ where: { [field.name]: { productId: id } } });
        result.push({ key: model.name + '.' + field.name, label: this.relationLabel(model.name), count, blocking: model.name !== 'CartItem', permission: this.relationPermission(model.name) });
      }
    }
    return result;
  }
  private relationPermission(model: string) {
    if (/^(Order|Payment)/.test(model)) return 'oms.read';
    if (/^(Task|Lead|Interaction|Crm)/.test(model)) return 'crm.read';
    if (/^(Helpdesk)/.test(model)) return 'helpdesk.read';
    if (/^(Product|Category)/.test(model)) return 'catalog.read';
    if (/^(Customer|Organization|B2B)/.test(model)) return 'customers.read';
    return 'system.manage';
  }
  private relationLabel(model: string) {
    return ({ Order: 'Заказы', OrderItem: 'Позиции заказов', Task: 'Задачи', Lead: 'Сделки', Interaction: 'Взаимодействия', HelpdeskTicket: 'Обращения', OrganizationMember: 'Представители организаций', ProductVariant: 'Варианты товара', ProductCategory: 'Связи с категориями', ProductImage: 'Изображения товара', Category: 'Дочерние категории', CartItem: 'Позиции корзин', Session: 'Сессии', AuditLog: 'История действий', DataTrashEntry: 'История корзины' } as Record<string, string>)[model] || 'Служебные связи: ' + model;
  }
  private async entity(db: Prisma.TransactionClient, type: DataEntityType, id: string) {
    let entity: any;
    if (type === DataEntityType.USER) entity = await db.user.findUnique({ where: { id }, select: { id: true, email: true, phone: true, firstName: true, lastName: true, role: true, isActive: true, createdAt: true } });
    else if (type === DataEntityType.CUSTOMER) entity = await db.customer.findUnique({ where: { id }, select: { id: true, firstName: true, lastName: true, email: true, phone: true, status: true, segment: true, source: true, createdAt: true } });
    else if (type === DataEntityType.ORGANIZATION) entity = await db.organization.findUnique({ where: { id }, select: { id: true, name: true, legalName: true, inn: true, status: true, createdAt: true } });
    else if (type === DataEntityType.PRODUCT) entity = await db.product.findUnique({ where: { id }, select: { id: true, nameRu: true, sku: true, slug: true, basePrice: true, currency: true, externalId: true, isSynced: true, isActive: true, createdAt: true } });
    else if (type === DataEntityType.CATEGORY) entity = await db.category.findUnique({ where: { id }, select: { id: true, nameRu: true, slug: true, parentId: true, isActive: true, sortOrder: true } });
    else throw new BadRequestException('Для этого типа данных жизненный цикл ещё не подключён');
    if (!entity) throw new NotFoundException('Объект не найден');
    return entity;
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
