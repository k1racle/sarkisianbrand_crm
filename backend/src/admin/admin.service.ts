import { BadRequestException, ConflictException, Injectable, NotFoundException, Optional, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAdminProductDto, CreateStorefrontBannerDto, CreateStorefrontSocialLinkDto, UpdateCategoryPresentationDto, UpdateOrderStatusDto, UpdateProductDto, UpdateStorefrontBannerDto, UpdateStorefrontSettingsDto, UpdateStorefrontSocialLinkDto } from './dto/admin.dto';
import { OneCSyncService } from '../1c-sync/1c-sync.service';
import { CreateStorefrontMenuItemDto, UpdateStorefrontMenuItemDto, CreateStorefrontPageDto, UpdateStorefrontPageDto } from './dto/admin.dto';
import { applyStorefrontTransition } from '../common/storefront-order-transition';
import { NotificationsService } from '../notifications/notifications.service';
import { MediaService } from '../media/media.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService, private readonly oneC: OneCSyncService, private readonly config: ConfigService,
    @Optional() private readonly notifications?: NotificationsService,
    @Optional() private readonly media?: MediaService) {}

  async dashboard() {
    const [orders, paidOrders, customers, products, lowStock] = await this.prisma.$transaction([
      this.prisma.order.count({ where: { source: 'WEB' } }),
      this.prisma.order.count({ where: { source: 'WEB', paymentStatus: { in: ['PAID', 'SUCCEEDED'] } } }),
      this.prisma.customer.count(),
      this.prisma.product.count({ where: { isActive: true } }),
      this.prisma.productVariant.count({ where: { isActive: true, stock: { lte: 5 } } }),
    ]);
    return { orders, paidOrders, customers, products, lowStock };
  }

  storefrontPages() { return this.prisma.storefrontPage.findMany({ orderBy: { createdAt: 'asc' } }); }

  private pageData(dto: CreateStorefrontPageDto | UpdateStorefrontPageDto) {
    if (new Set(dto.blocks.map(block => block.id)).size !== dto.blocks.length) throw new BadRequestException('Идентификаторы блоков должны быть уникальными');
    return { title: dto.title.trim(), eyebrow: dto.eyebrow.trim(), lead: dto.lead.trim(), seoDescription: dto.seoDescription || null, blocks: dto.blocks.map(block => ({ id: block.id, title: block.title.trim(), body: block.body })), isActive: dto.isActive, reviewRequired: dto.reviewRequired };
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

  createStorefrontBanner(dto: CreateStorefrontBannerDto) {
    return this.prisma.storefrontBanner.create({ data: this.bannerData(dto) });
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
    const slug = dto.slug || dto.nameRu.toLowerCase().trim().replace(/[^a-zа-яё0-9]+/gi, '-').replace(/^-|-$/g, '') || dto.sku.toLowerCase();
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({ data: { sku: dto.sku, nameRu: dto.nameRu, descriptionRu: dto.descriptionRu, purposes: dto.purposes, features: dto.features, slug, basePrice: dto.price, isActive: true } });
      await tx.productVariant.create({ data: { productId: product.id, name: 'Основной вариант', options: {}, price: dto.price, stock: dto.stock, sku: dto.sku } });
      if (dto.images?.length) await tx.productImage.createMany({ data: dto.images.map((image, index) => ({ productId: product.id, url: image.url, alt: image.alt, sortOrder: index })) });
      if (dto.categoryIds?.length) await tx.productCategory.createMany({ data: dto.categoryIds.map((categoryId, index) => ({ productId: product.id, categoryId, isPrimary: index === 0 })) });
      if (dto.metaTitle || dto.metaDesc || dto.canonical) await tx.seoData.create({ data: { entityType: 'PRODUCT', entityId: product.id, productId: product.id, metaTitle: dto.metaTitle, metaDesc: dto.metaDesc, canonical: dto.canonical } });
      return tx.product.findUnique({ where: { id: product.id }, include: { images: true, variants: true, categories: { include: { category: true } }, seo: true } });
    });
  }

  async updateProduct(id: string, dto: UpdateProductDto) {
    const product = await this.prisma.product.findUnique({ where: { id }, include: { variants: { take: 1 } } });
    if (!product) throw new NotFoundException('Товар не найден');
    if (product.productType === 'GIFT_CARD' && (dto.price !== undefined || dto.stock !== undefined)) throw new BadRequestException('Номиналы подарочной карты изменяются в разделе «Подарочные карты»');
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.product.update({ where: { id }, data: { ...(dto.price !== undefined ? { basePrice: dto.price } : {}), ...(dto.purposes !== undefined ? { purposes: dto.purposes } : {}), ...(dto.features !== undefined ? { features: dto.features } : {}), ...(dto.nameRu !== undefined ? { nameRu: dto.nameRu } : {}), ...(dto.descriptionRu !== undefined ? { descriptionRu: dto.descriptionRu } : {}), ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}) } });
      if (product.variants[0] && (dto.price !== undefined || dto.stock !== undefined)) {
        await tx.productVariant.update({ where: { id: product.variants[0].id }, data: { ...(dto.price !== undefined ? { price: dto.price } : {}), ...(dto.stock !== undefined ? { stock: dto.stock } : {}) } });
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
      return tx.product.findUnique({ where: { id: updated.id }, include: { images: true, variants: true, categories: { include: { category: true } } } });
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
      if (!order) throw new NotFoundException('Заказ не найден');
      const lifecycle = await applyStorefrontTransition(tx, order, dto.status, this.notifications);
      const result = await tx.order.update({ where: { id: order.id }, data: { status: dto.status, isSynced1C: false, ...lifecycle } });
      if (order.status !== dto.status) await tx.orderStatusHistory.create({ data: { orderId: order.id, fromStatus: order.status, toStatus: dto.status, comment: dto.comment, changedBy } });
      return result;
    }, { timeout: 30_000 });
    await this.oneC.enqueueOrder(updated.id, changedBy);
    return updated;
  }
}
