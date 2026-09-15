import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAdminProductDto, UpdateOrderStatusDto, UpdateProductDto } from './dto/admin.dto';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

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

  products() {
    return this.prisma.product.findMany({ include: { images: true, variants: true, categories: { include: { category: true } }, seo: true }, orderBy: { updatedAt: 'desc' }, take: 100 });
  }

  categories() {
    return this.prisma.category.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: 'asc' }, { nameRu: 'asc' }] });
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
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({ where: { id: order.id }, data: { status: dto.status } });
      await tx.orderStatusHistory.create({ data: { orderId: order.id, fromStatus: order.status, toStatus: dto.status, comment: dto.comment, changedBy } });
      return updated;
    });
  }
}
