import { BadRequestException, ConflictException, Injectable, NotFoundException, Optional, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateAdminProductDto, CreateStorefrontBannerDto, CreateStorefrontSocialLinkDto, UpdateCategoryPresentationDto, UpdateOrderStatusDto, UpdateProductDto, UpdateStorefrontBannerDto, UpdateStorefrontSettingsDto, UpdateStorefrontSocialLinkDto } from './dto/admin.dto';
import { resolveProductBadges } from '../common/product-merchandising';
import { BulkProductsDto } from './dto/admin.dto';
import { OneCSyncService } from '../1c-sync/1c-sync.service';
import { CreateStorefrontMenuItemDto, UpdateStorefrontMenuItemDto, CreateStorefrontPageDto, UpdateStorefrontPageDto } from './dto/admin.dto';
import { applyStorefrontTransition } from '../common/storefront-order-transition';
import { NotificationsService } from '../notifications/notifications.service';
import { MediaService } from '../media/media.service';
import { AdminListQueryDto, ReorderStorefrontDto } from './dto/admin.dto';
import { SaveStorefrontAppearanceDto } from './dto/admin.dto';
import { appearanceRevision, saveAppearance } from './storefront-appearance';
import { storeDashboard } from './store-dashboard';
import { SalonSubscriptionDto } from '../b2b/dto/salon-presentation.dto';
import { siteContentUrlValid } from './site-content.dto';

@Injectable()
export class AdminService {
  async salonSubscription() {
    return await this.prisma.salonSubscriptionSetting.findUnique({where:{key:'main'}})||{key:'main',name:'Кабинет салона',monthlyPrice:0,annualPrice:0,freeAccess:true};
  }
  saveSalonSubscription(dto:SalonSubscriptionDto) {
    return this.prisma.salonSubscriptionSetting.upsert({where:{key:'main'},create:{key:'main',...dto},update:dto});
  }
  constructor(private readonly prisma: PrismaService, private readonly oneC: OneCSyncService, private readonly config: ConfigService,
    @Optional() private readonly notifications?: NotificationsService,
    @Optional() private readonly media?: MediaService) {}

  dashboard(days: string | number = 30) { return storeDashboard(this.prisma, days); }

  storefrontPages() { return this.prisma.storefrontPage.findMany({ orderBy: { createdAt: 'asc' } }); }

  private pageData(dto: CreateStorefrontPageDto | UpdateStorefrontPageDto) {
    if (new Set(dto.blocks.map(block => block.id)).size !== dto.blocks.length) throw new BadRequestException('Идентификаторы блоков должны быть уникальными');
    if (dto.blocks.filter(block => block.kind === 'hero').length > 1) throw new BadRequestException('На странице может быть только одна обложка');
    const blocks = dto.blocks.map(block => {
      const result: Record<string, any> = { id: block.id, title: block.title.trim(), body: block.body };
      for (const key of ['kind', 'icon', 'buttonLabel', 'buttonUrl', 'secondaryLabel', 'secondaryUrl'] as const) {
        if (block[key] != null) result[key] = block[key]!.trim();
      }
      for (const [label, url] of [['buttonLabel', 'buttonUrl'], ['secondaryLabel', 'secondaryUrl']]) {
        if (result[url] && !siteContentUrlValid(result[url])) throw new BadRequestException('Некорректная ссылка кнопки страницы');
        if (Boolean(result[label]) !== Boolean(result[url])) throw new BadRequestException('Укажите подпись и адрес кнопки вместе');
      }
      if (block.images != null) {
        if (block.images.some(url => !siteContentUrlValid(url, true))) throw new BadRequestException('Некорректный адрес фотографии страницы');
        result.images = block.images.map(url => url.trim());
      }
      if (block.socials != null) {
        result.socials = {};
        for (const key of ['vk', 'telegram', 'instagram', 'youtube', 'tiktok'] as const) {
          const url = block.socials[key]?.trim();
          if (!url) continue;
          if (!/^https:\/\//i.test(url) || !siteContentUrlValid(url)) throw new BadRequestException('Укажите безопасную HTTPS-ссылку личной соцсети');
          result.socials[key] = url;
        }
      }
      return result;
    });
    return { title: dto.title.trim(), eyebrow: dto.eyebrow.trim(), lead: dto.lead.trim(), seoDescription: dto.seoDescription || null, blocks, isActive: dto.isActive, reviewRequired: dto.reviewRequired };
  }

  async createStorefrontPage(dto: CreateStorefrontPageDto) {
    const reserved = ['admin', 'admin-workspace', 'account', 'auth', 'api', 'b2b', 'b2b-login', 'cart', 'catalog', 'crm', 'crm-chat', 'crm-customers', 'crm-marketplaces', 'crm-organizations', 'crm-pipeline', 'crm-tasks', 'favorites', 'helpdesk', 'leadership', 'login', 'marketplaces', 'password-reset', 'products', 'system-settings', 'workspace', 'workspace-login', 'fonts', 'storefront', '_nuxt'];
    if (reserved.includes(dto.slug)) throw new BadRequestException('Этот адрес занят системным разделом');
    if (await this.prisma.storefrontPage.findUnique({ where: { slug: dto.slug } })) throw new ConflictException('Страница с таким адресом уже существует');
    return this.prisma.storefrontPage.create({ data: { slug: dto.slug, ...this.pageData(dto) } });
  }

  async updateStorefrontPage(slug: string, dto: UpdateStorefrontPageDto) {
    if (!await this.prisma.storefrontPage.findUnique({ where: { slug } })) throw new NotFoundException('Страница не найдена');
    const result = await this.prisma.storefrontPage.updateMany({ where: { slug, revision: dto.revision }, data: { ...this.pageData(dto), revision: { increment: 1 } } });
    if (!result.count) throw new ConflictException('Страница изменена другим сотрудником. Обновите её перед сохранением');
    return this.prisma.storefrontPage.findUnique({ where: { slug } });
  }

  async deleteStorefrontPage(slug: string) {
    if (!await this.prisma.storefrontPage.findUnique({ where: { slug } })) throw new NotFoundException('Страница не найдена');
    await this.prisma.$transaction([
      this.prisma.storefrontMenuItem.deleteMany({ where: { url: `/${slug}` } }),
      this.prisma.storefrontPage.delete({ where: { slug } }),
    ]);
    return { deleted: true };
  }

  async products() {
    const trashed = await this.prisma.dataTrashEntry.findMany({ where: { entityType: 'PRODUCT', status: 'TRASHED' }, select: { entityId: true } });
    return this.prisma.product.findMany({ where: { id: { notIn: trashed.map((item) => item.entityId) } }, include: { images: true, variants: true, categories: { include: { category: true } }, seo: true }, orderBy: { updatedAt: 'desc' }, take: 100 });
  }

  async productList(query: AdminListQueryDto) {
    const trashed = await this.prisma.dataTrashEntry.findMany({ where: { entityType: 'PRODUCT', status: 'TRASHED' }, select: { entityId: true } });
    const q = query.q?.trim();
    const where: Prisma.ProductWhereInput = { id: { notIn: trashed.map(item => item.entityId) }, ...(q ? { OR: [{ nameRu: { contains: q, mode: 'insensitive' } }, { sku: { contains: q, mode: 'insensitive' } }] } : {}) };
    if(query.categoryId)where.categories={some:{categoryId:query.categoryId}};
    if(query.visibility)where.isActive=query.visibility==='active';
    if(query.availability){
      const available:Prisma.ProductWhereInput={OR:[{productType:'GIFT_CARD',variants:{some:{isActive:true}}},{productType:{not:'GIFT_CARD'},variants:{some:{isActive:true,stock:{gt:this.prisma.productVariant.fields.reserved}}}}]};
      where.AND=[query.availability==='stocked'?available:{NOT:available}];
    }
    const ordering:Prisma.ProductOrderByWithRelationInput[]=query.sort==='name'?[{nameRu:'asc'},{id:'asc'}]:query.sort==='sku'?[{sku:'asc'},{id:'asc'}]:[{updatedAt:'desc'},{id:'asc'}];
    const [total, items] = await this.prisma.$transaction([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({ where, include: { images: true, variants: true, categories: { include: { category: true } }, seo: true }, orderBy: ordering, skip: (query.page - 1) * query.limit, take: query.limit }),
    ]);
    return { items, total, page: query.page, limit: query.limit };
  }

  async orderList(query: AdminListQueryDto) {
    const q = query.q?.trim();
    const where: Prisma.OrderWhereInput = { source: 'WEB', ...(query.status ? { status: query.status } : {}), ...(q ? { OR: [{ orderNumber: { contains: q, mode: 'insensitive' } }, { user: { email: { contains: q, mode: 'insensitive' } } }, { customer: { email: { contains: q, mode: 'insensitive' } } }] } : {}) };
    const [total, items] = await this.prisma.$transaction([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({ where, include: { user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } }, customer: true, organization: true, items: true, marketplaceStaging: true, history: { orderBy: { createdAt: 'desc' } } }, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], skip: (query.page - 1) * query.limit, take: query.limit }),
    ]);
    return { items, total, page: query.page, limit: query.limit };
  }

  categories() {
    return this.prisma.category.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: 'asc' }, { nameRu: 'asc' }] });
  }

  async storefrontContent() {
    const [settings, banners, categories, socialLinks, menuItems] = await Promise.all([
      this.prisma.storefrontSetting.findUnique({ where: { key: 'main' } }),
      this.prisma.storefrontBanner.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] }),
      this.prisma.category.findMany({ orderBy: [{ sortOrder: 'asc' }, { nameRu: 'asc' }] }),
      this.prisma.storefrontSocialLink.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] }),
      this.prisma.storefrontMenuItem.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] }),
    ]);
    return {
      settings: settings || { key: 'main', announcementText: 'SARKISIAN BRAND – это официальный интернет-магазин скоростного мастера-блогера Светланы Саркисян' },
      revision: appearanceRevision({ settings, banners, menuItems, socialLinks }),
      banners,
      categories,
      socialLinks,
      menuItems,
    };
  }

  updateStorefrontSettings(dto: UpdateStorefrontSettingsDto) {
    return this.prisma.storefrontSetting.upsert({
      where: { key: 'main' },
      create: { key: 'main', announcementText: dto.announcementText },
      update: { announcementText: dto.announcementText },
    });
  }

  saveStorefrontAppearance(dto: SaveStorefrontAppearanceDto) {
    return saveAppearance(this.prisma, dto, row => this.bannerData(row));
  }

  createStorefrontBanner(dto: CreateStorefrontBannerDto) {
    return this.prisma.storefrontBanner.create({ data: this.bannerData(dto) });
  }

  async reorderStorefront(dto: ReorderStorefrontDto) {
    return this.prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('storefront-reorder'))`;
      const existing = dto.collection === 'banners' ? await tx.storefrontBanner.findMany({ select: { id: true } }) : dto.collection === 'menu' ? await tx.storefrontMenuItem.findMany({ select: { id: true } }) : await tx.storefrontSocialLink.findMany({ select: { id: true } });
      const ids = new Set(existing.map(item => item.id));
      if (dto.ids.length !== ids.size || new Set(dto.ids).size !== dto.ids.length || dto.ids.some(id => !ids.has(id))) throw new ConflictException('Список изменён другим сотрудником. Обновите его перед изменением порядка');
      for (const [sortOrder, id] of dto.ids.entries()) {
        if (dto.collection === 'banners') await tx.storefrontBanner.update({ where: { id }, data: { sortOrder } });
        else if (dto.collection === 'menu') await tx.storefrontMenuItem.update({ where: { id }, data: { sortOrder } });
        else await tx.storefrontSocialLink.update({ where: { id }, data: { sortOrder } });
      }
      return { collection: dto.collection, ids: dto.ids };
    });
  }

  async updateStorefrontBanner(id: string, dto: UpdateStorefrontBannerDto) {
    if (!await this.prisma.storefrontBanner.findUnique({ where: { id }, select: { id: true } })) throw new NotFoundException('Баннер не найден');
    return this.prisma.storefrontBanner.update({ where: { id }, data: this.bannerData(dto) });
  }

  async deleteStorefrontBanner(id: string) {
    if (!await this.prisma.storefrontBanner.findUnique({ where: { id }, select: { id: true } })) throw new NotFoundException('Баннер не найден');
    await this.prisma.storefrontBanner.delete({ where: { id } });
    return { id, deleted: true };
  }

  createStorefrontSocialLink(dto: CreateStorefrontSocialLinkDto) {
    return this.prisma.storefrontSocialLink.create({ data: dto });
  }

  async updateStorefrontSocialLink(id: string, dto: UpdateStorefrontSocialLinkDto) {
    if (!await this.prisma.storefrontSocialLink.findUnique({ where: { id }, select: { id: true } })) throw new NotFoundException('Социальная сеть не найдена');
    return this.prisma.storefrontSocialLink.update({ where: { id }, data: dto });
  }

  async deleteStorefrontSocialLink(id: string) {
    if (!await this.prisma.storefrontSocialLink.findUnique({ where: { id }, select: { id: true } })) throw new NotFoundException('Социальная сеть не найдена');
    await this.prisma.storefrontSocialLink.delete({ where: { id } });
    return { id, deleted: true };
  }

  async updateCategoryPresentation(id: string, dto: UpdateCategoryPresentationDto) {
    if (!await this.prisma.category.findUnique({ where: { id }, select: { id: true } })) throw new NotFoundException('Категория не найдена');
    return this.prisma.category.update({ where: { id }, data: dto });
  }

  createStorefrontMenuItem(dto: CreateStorefrontMenuItemDto) {
    return this.prisma.storefrontMenuItem.create({ data: { ...dto, label: dto.label.trim() } });
  }

  async updateStorefrontMenuItem(id: string, dto: UpdateStorefrontMenuItemDto) {
    if (!await this.prisma.storefrontMenuItem.findUnique({ where: { id }, select: { id: true } })) throw new NotFoundException('Пункт меню не найден');
    return this.prisma.storefrontMenuItem.update({ where: { id }, data: { ...dto, label: dto.label.trim() } });
  }

  async deleteStorefrontMenuItem(id: string) {
    if (!await this.prisma.storefrontMenuItem.findUnique({ where: { id }, select: { id: true } })) throw new NotFoundException('Пункт меню не найден');
    await this.prisma.storefrontMenuItem.delete({ where: { id } });
    return { id, deleted: true };
  }

  async saveStorefrontMedia(file: any, actorId: string) {
    if (!this.media) throw new ServiceUnavailableException('Медиатека временно недоступна');
    const asset = await this.media.upload(file, actorId);
    return { ...asset, fileName: asset.filename };
  }

  private bannerData(dto: CreateStorefrontBannerDto | UpdateStorefrontBannerDto) {
    if (dto.startsAt && dto.endsAt && new Date(dto.startsAt) > new Date(dto.endsAt)) throw new BadRequestException('Дата окончания баннера должна быть позже даты начала');
    return {
      title: dto.title || null,
      subtitle: dto.subtitle || null,
      buttonLabel: dto.buttonLabel || 'Перейти в каталог',
      linkUrl: dto.linkUrl || '/catalog',
      imageUrl: dto.imageUrl,
      mobileImageUrl: dto.mobileImageUrl || null,
      isActive: dto.isActive ?? true,
      sortOrder: dto.sortOrder ?? 0,
      startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
      endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
    };
  }

  async createProduct(dto: CreateAdminProductDto) {
    const sale=this.saleData(dto,{price:dto.price});
    const slug = dto.slug || dto.nameRu.toLowerCase().trim().replace(/[^a-zа-яё0-9]+/gi, '-').replace(/^-|-$/g, '') || dto.sku.toLowerCase();
    return this.prisma.$transaction(async (tx) => {
      await this.validateBadgeIds(dto.badgeIds,tx);
      const product = await tx.product.create({ data: { sku: dto.sku, nameRu: dto.nameRu, descriptionRu: dto.descriptionRu, purposes: dto.purposes, features: dto.features, badgeIds:dto.badgeIds, slug, basePrice: dto.price, isActive: true } });
      await tx.productVariant.create({ data: { productId: product.id, name: 'Основной вариант', options: {}, price: dto.price, stock: dto.stock, sku: dto.sku, ...sale } });
      if (dto.images?.length) await tx.productImage.createMany({ data: dto.images.map((image, index) => ({ productId: product.id, url: image.url, alt: image.alt, sortOrder: index })) });
      if (dto.categoryIds?.length) await tx.productCategory.createMany({ data: dto.categoryIds.map((categoryId, index) => ({ productId: product.id, categoryId, isPrimary: index === 0 })) });
      if (dto.metaTitle || dto.metaDesc || dto.canonical) await tx.seoData.create({ data: { entityType: 'PRODUCT', entityId: product.id, productId: product.id, metaTitle: dto.metaTitle, metaDesc: dto.metaDesc, canonical: dto.canonical } });
      return tx.product.findUnique({ where: { id: product.id }, include: { images: true, variants: true, categories: { include: { category: true } }, seo: true } });
    });
  }

  async updateProduct(id: string, dto: UpdateProductDto) {
    const product = await this.prisma.product.findUnique({ where: { id }, include: { variants: { ...(dto.variantId ? { where: { id: dto.variantId } } : {}), take: 1 } } });
    if (!product) throw new NotFoundException('Товар не найден');
    if (dto.variantId && !product.variants.length) throw new NotFoundException('Вариант товара не найден. Обновите список товаров');
    if (product.productType === 'GIFT_CARD' && (dto.price !== undefined || dto.stock !== undefined || dto.salePrice !== undefined || dto.saleStartsAt !== undefined || dto.saleEndsAt !== undefined)) throw new BadRequestException('Номиналы подарочной карты изменяются в разделе «Подарочные карты»; скидка на номинал недоступна');
    const sale=product.productType==='GIFT_CARD'?{}:this.saleData(dto,product.variants[0]||{price:product.basePrice});
    return this.prisma.$transaction(async (tx) => {
      await this.validateBadgeIds(dto.badgeIds,tx);
      const updated = await tx.product.update({ where: { id }, data: { ...(dto.badgeIds !== undefined ? {badgeIds:dto.badgeIds} : {}), ...(dto.price !== undefined ? { basePrice: dto.price } : {}), ...(dto.purposes !== undefined ? { purposes: dto.purposes } : {}), ...(dto.features !== undefined ? { features: dto.features } : {}), ...(dto.nameRu !== undefined ? { nameRu: dto.nameRu } : {}), ...(dto.descriptionRu !== undefined ? { descriptionRu: dto.descriptionRu } : {}), ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}) } });
      if (product.variants[0] && (dto.price !== undefined || dto.stock !== undefined || Object.keys(sale).length)) {
        await tx.productVariant.update({ where: { id: product.variants[0].id }, data: { ...(dto.price !== undefined ? { price: dto.price } : {}), ...(dto.stock !== undefined ? { stock: dto.stock } : {}), ...sale } });
      }
      if (dto.images) {
        await tx.productImage.deleteMany({ where: { productId: id } });
        if (dto.images.length) await tx.productImage.createMany({ data: dto.images.map((image, index) => ({ productId: id, url: image.url, alt: image.alt, sortOrder: index })) });
      }
      if (dto.categoryIds) {
        await tx.productCategory.deleteMany({ where: { productId: id } });
        if (dto.categoryIds.length) await tx.productCategory.createMany({ data: dto.categoryIds.map((categoryId, index) => ({ productId: id, categoryId, isPrimary: index === 0 })) });
      }
      if (dto.metaTitle !== undefined || dto.metaDesc !== undefined || dto.canonical !== undefined) {
        await tx.seoData.upsert({ where: { productId: id }, create: { entityType: 'PRODUCT', entityId: id, productId: id, metaTitle: dto.metaTitle, metaDesc: dto.metaDesc, canonical: dto.canonical }, update: { metaTitle: dto.metaTitle, metaDesc: dto.metaDesc, canonical: dto.canonical } });
      }
      return tx.product.findUnique({ where: { id: updated.id }, include: { images: true, variants: true, categories: { include: { category: true } }, seo:true } });
    });
  }

  private saleData(dto:UpdateProductDto|CreateAdminProductDto,variant:any) {
    if(dto.salePrice===undefined && dto.saleStartsAt===undefined && dto.saleEndsAt===undefined && dto.price===undefined)return {};
    const sale=dto.salePrice!==undefined?dto.salePrice:variant.salePrice;
    const starts=dto.saleStartsAt!==undefined?dto.saleStartsAt:variant.saleStartsAt;
    const ends=dto.saleEndsAt!==undefined?dto.saleEndsAt:variant.saleEndsAt;
    if(sale!=null && (!Number.isFinite(Number(sale)) || Number(sale)<0 || Number(sale)>=Number(dto.price??variant.price)))throw new BadRequestException('Акционная цена должна быть меньше обычной цены');
    if(starts&&ends&&new Date(starts)>=new Date(ends))throw new BadRequestException('Окончание акции должно быть позже начала');
    return sale==null?{salePrice:null,saleStartsAt:null,saleEndsAt:null}:{salePrice:sale,saleStartsAt:starts?new Date(starts):null,saleEndsAt:ends?new Date(ends):null};
  }
  private async validateBadgeIds(ids:string[]|undefined,tx:Prisma.TransactionClient){
    if(ids===undefined)return;
    await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtext('storefront-merchandising-main'))`;
    const settings=await tx.storefrontSetting.findUnique({where:{key:'main'}});
    const known=new Set(resolveProductBadges(settings?.productBadges).map(b=>b.id));
    if(ids.some(id=>!known.has(id)))throw new BadRequestException('Неизвестный бейдж товара. Обновите редактор');
  }
  async bulkProducts(dto:BulkProductsDto,actorId:string){
    if(!dto.ids.length||new Set(dto.ids).size!==dto.ids.length)throw new BadRequestException('Выберите товары без повторений');
    return this.prisma.$transaction(async tx=>{
      await tx.$queryRaw(Prisma.sql`SELECT id FROM "Product" WHERE id IN (${Prisma.join(dto.ids)}) ORDER BY id FOR UPDATE`);
      const trashed=await tx.dataTrashEntry.findMany({where:{entityType:'PRODUCT',status:'TRASHED',entityId:{in:dto.ids}},select:{entityId:true}});
      if(trashed.length||await tx.product.count({where:{id:{in:dto.ids}}})!==dto.ids.length)throw new ConflictException('Некоторые товары уже удалены. Обновите список');
      const result=await tx.product.updateMany({where:{id:{in:dto.ids}},data:{isActive:dto.action==='publish'}});
      await tx.auditLog.create({data:{actorId,action:`catalog.products.${dto.action}`,resource:'product',payload:{ids:dto.ids,count:result.count}}});
      return {updated:result.count};
    });
  }
  async archiveProduct(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Товар не найден');
    return this.prisma.product.update({ where: { id }, data: { isActive: false }, select: { id: true, sku: true, isActive: true } });
  }

  orders() {
    return this.prisma.order.findMany({ where: { source: 'WEB' }, include: { user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } }, customer: true, organization: true, items: true, marketplaceStaging: true, history: { orderBy: { createdAt: 'desc' } } }, orderBy: { createdAt: 'desc' }, take: 100 });
  }

  async updateOrderStatus(orderNumber: string, dto: UpdateOrderStatusDto, changedBy: string) {
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Order" WHERE "orderNumber" = ${orderNumber} FOR UPDATE`;
      const order = await tx.order.findUnique({ where: { orderNumber }, include: { items: true, payments: true } });
      if (!order || order.source !== 'WEB') throw new NotFoundException('Заказ магазина не найден');
      const lifecycle = await applyStorefrontTransition(tx, order, dto.status, this.notifications);
      const result = await tx.order.update({ where: { id: order.id }, data: { status: dto.status, isSynced1C: false, ...lifecycle } });
      if (order.status !== dto.status) await tx.orderStatusHistory.create({ data: { orderId: order.id, fromStatus: order.status, toStatus: dto.status, comment: dto.comment, changedBy } });
      return result;
    }, { timeout: 30_000 });
    await this.oneC.enqueueOrder(updated.id, changedBy);
    return updated;
  }
}
