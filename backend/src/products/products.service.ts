import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFile } from 'fs/promises';
import { basename, extname, resolve } from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto, CreateProductDto } from './dto/product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService) {}

  async list(query?: { search?: string; category?: string; page?: number; limit?: number }) {
    const page = Math.max(query?.page ?? 1, 1);
    const limit = Math.min(Math.max(query?.limit ?? 24, 1), 100);
    const where = {
      isActive: true,
      ...(query?.search ? { OR: [
        { nameRu: { contains: query.search, mode: 'insensitive' as const } },
        { sku: { contains: query.search, mode: 'insensitive' as const } },
      ] } : {}),
      ...(query?.category ? { categories: { some: { category: { slug: query.category } } } } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({ where, include: { images: true, variants: true, categories: { include: { category: true } } }, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.product.count({ where }),
    ]);
    return { items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  async findBySlug(slug: string) {
    const product = await this.prisma.product.findFirst({ where: { slug, isActive: true }, include: { images: true, variants: true, categories: { include: { category: true } }, seo: true } });
    if (!product) throw new NotFoundException('Товар не найден');
    return product;
  }

  async create(dto: CreateProductDto) {
    try {
      return await this.prisma.product.create({ data: { sku: dto.sku, nameRu: dto.nameRu, nameEn: dto.nameEn, descriptionRu: dto.descriptionRu, descriptionEn: dto.descriptionEn, slug: dto.slug, basePrice: dto.basePrice, isActive: dto.isActive ?? true, ...(dto.categoryId ? { categories: { create: { categoryId: dto.categoryId } } } : {}) }, include: { categories: true } });
    } catch (error: any) {
      if (error?.code === 'P2002') throw new ConflictException('SKU или slug уже используется');
      throw error;
    }
  }

  async categories() {
    return this.prisma.category.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: 'asc' }, { nameRu: 'asc' }] });
  }

  async storefrontContent() {
    const now = new Date();
    const [settings, banners, categories] = await Promise.all([
      this.prisma.storefrontSetting.findUnique({ where: { key: 'main' } }),
      this.prisma.storefrontBanner.findMany({
        where: {
          isActive: true,
          AND: [
            { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
            { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
          ],
        },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      }),
      this.prisma.category.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: 'asc' }, { nameRu: 'asc' }] }),
    ]);
    return {
      settings: settings || { announcementText: 'SARKISIAN BRAND – это официальный интернет-магазин скоростного мастера-блогера Светланы Саркисян' },
      banners,
      categories,
    };
  }

  async storefrontMedia(fileName: string) {
    if (!fileName || basename(fileName) !== fileName) throw new NotFoundException('Изображение не найдено');
    const path = resolve(process.cwd(), this.config.get('STOREFRONT_MEDIA_PATH', 'uploads/storefront'), fileName);
    try {
      const buffer = await readFile(path);
      const contentTypes: Record<string, string> = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.avif': 'image/avif' };
      return { buffer, contentType: contentTypes[extname(fileName).toLowerCase()] || 'application/octet-stream' };
    } catch {
      throw new NotFoundException('Изображение не найдено');
    }
  }

  async createCategory(dto: CreateCategoryDto) {
    return this.prisma.category.create({ data: dto });
  }
}
