import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { extname, resolve } from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAdminProductDto, CreateStorefrontBannerDto, UpdateCategoryPresentationDto, UpdateOrderStatusDto, UpdateProductDto, UpdateStorefrontBannerDto, UpdateStorefrontSettingsDto } from './dto/admin.dto';
import { OneCSyncService } from '../1c-sync/1c-sync.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService, private readonly oneC: OneCSyncService, private readonly config: ConfigService) {}

  async dashboard() {
    const [orders, paidOrders, customers, products, lowStock] = await this.prisma.$transaction([
      this.prisma.order.count({ where: { source: 'WEB' } }),
      this.prisma.order.count({ where: { source: 'WEB', paymentStatus: 'PAID' } }),
      this.prisma.customer.count(),
      this.prisma.product.count({ where: { isActive: true } }),
      this.prisma.productVariant.count({ where: { isActive: true, stock: { lte: 5 } } }),
    ]);
    return { orders, paidOrders, customers, products, lowStock };
  }

  async products() {
    const trashed = await this.prisma.dataTrashEntry.findMany({ where: { entityType: 'PRODUCT', status: 'TRASHED' }, select: { entityId: true } });
    return this.prisma.product.findMany({ where: { id: { notIn: trashed.map((item) => item.entityId) } }, include: { images: true, variants: true, categories: { include: { category: true } }, seo: true }, orderBy: { updatedAt: 'desc' }, take: 100 });
  }

  categories() {
    return this.prisma.category.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: 'asc' }, { nameRu: 'asc' }] });
  }

  async storefrontContent() {
    const [settings, banners, categories] = await Promise.all([
      this.prisma.storefrontSetting.findUnique({ where: { key: 'main' } }),
      this.prisma.storefrontBanner.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] }),
      this.prisma.category.findMany({ orderBy: [{ sortOrder: 'asc' }, { nameRu: 'asc' }] }),
    ]);
    return {
      settings: settings || { key: 'main', announcementText: 'SARKISIAN BRAND – это официальный интернет-магазин скоростного мастера-блогера Светланы Саркисян' },
      banners,
      categories,
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

  async updateCategoryPresentation(id: string, dto: UpdateCategoryPresentationDto) {
    if (!await this.prisma.category.findUnique({ where: { id }, select: { id: true } })) throw new NotFoundException('Категория не найдена');
    return this.prisma.category.update({ where: { id }, data: dto });
  }

  async saveStorefrontMedia(file: any) {
    if (!file?.buffer) throw new BadRequestException('Выберите изображение');
    if (!String(file.mimetype || '').startsWith('image/')) throw new BadRequestException('Можно загружать только изображения');
    const extensions: Record<string, string> = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/avif': '.avif' };
    const extension = extensions[file.mimetype] || extname(file.originalname || '').toLowerCase();
    if (!['.jpg', '.jpeg', '.png', '.webp', '.avif'].includes(extension)) throw new BadRequestException('Формат изображения не поддерживается');
    const directory = resolve(process.cwd(), this.config.get('STOREFRONT_MEDIA_PATH', 'uploads/storefront'));
    await mkdir(directory, { recursive: true });
    const fileName = `${randomUUID()}${extension}`;
    await writeFile(resolve(directory, fileName), file.buffer);
    return { url: `/api/v1/products/storefront-media/${fileName}`, fileName };
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
      const product = await tx.product.create({ data: { sku: dto.sku, nameRu: dto.nameRu, descriptionRu: dto.descriptionRu, slug, basePrice: dto.price, isActive: true } });
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
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.product.update({ where: { id }, data: { ...(dto.nameRu !== undefined ? { nameRu: dto.nameRu } : {}), ...(dto.descriptionRu !== undefined ? { descriptionRu: dto.descriptionRu } : {}), ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}) } });
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
    const order = await this.prisma.order.findUnique({ where: { orderNumber } });
    if (!order) throw new NotFoundException('Заказ не найден');
    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.order.update({ where: { id: order.id }, data: { status: dto.status, isSynced1C: false } });
      await tx.orderStatusHistory.create({ data: { orderId: order.id, fromStatus: order.status, toStatus: dto.status, comment: dto.comment, changedBy } });
      return result;
    });
    await this.oneC.enqueueOrder(updated.id, changedBy);
    return updated;
  }
}
