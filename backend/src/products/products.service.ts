import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { readFile } from 'fs/promises';
import { basename, extname, resolve } from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { CatalogQueryDto, CreateCategoryDto, CreateProductDto } from './dto/product.dto';
import { activeCategoryTree, categoryDescendantSlugs, resolveProductBadges } from '../common/product-merchandising';

// Shared by catalogue ordering and cart recommendations: actual purchased units,
// including the legacy channel marker and verified WEB payments, never badges.
const purchasedUnits90Days = Prisma.sql`
  SELECT v."productId", SUM(i.quantity) AS units
  FROM "OrderItem" i JOIN "ProductVariant" v ON v.id = i."variantId"
  JOIN "Order" o ON o.id = i."orderId"
  WHERE o."paymentStatus" IN ('PAID', 'SUCCEEDED')
    AND o.status NOT IN ('CANCELLED', 'REFUNDED')
    AND o."createdAt" >= NOW() - INTERVAL '90 days'
  GROUP BY v."productId"
`;

const catalogPrice=Prisma.sql`COALESCE((SELECT MIN(CASE WHEN p."productType" <> 'GIFT_CARD'
  AND pv."salePrice" IS NOT NULL AND pv."salePrice" < pv.price
  AND (pv."saleStartsAt" IS NULL OR pv."saleStartsAt" <= NOW())
  AND (pv."saleEndsAt" IS NULL OR pv."saleEndsAt" > NOW())
  THEN pv."salePrice" ELSE pv.price END) FROM "ProductVariant" pv
  WHERE pv."productId"=p.id AND pv."isActive"=true),p."basePrice")`;
@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService) {}

  async list(query?: CatalogQueryDto) {
    const page = Math.max(query?.page ?? 1, 1);
    const limit = Math.min(Math.max(query?.limit ?? 24, 1), 100);
    if (query?.minPrice !== undefined && query?.maxPrice !== undefined && query.minPrice > query.maxPrice) throw new BadRequestException('Минимальная цена не должна превышать максимальную');
    const tags = (value?: string) => [...new Set((value || '').split(',').map(item => item.trim()).filter(Boolean))].slice(0, 20);
    const selectedCategories=tags(query?.category);
    const expanded=selectedCategories.length?categoryDescendantSlugs(await this.categories(),selectedCategories):selectedCategories;
    const categories=selectedCategories.length&&!expanded.length?['__unavailable_category__']:expanded;
    const purposes = tags(query?.purpose);
    const features = tags(query?.feature);
    const ids = [...new Set((query?.ids || '').split(',').filter(Boolean))];
    const now=new Date(),range={gte:query?.minPrice,lte:query?.maxPrice};
    const hasPrice=query?.minPrice!==undefined||query?.maxPrice!==undefined;
    const saleActive:Prisma.ProductVariantWhereInput={salePrice:{not:null,lt:this.prisma.productVariant.fields.price},AND:[{OR:[{saleStartsAt:null},{saleStartsAt:{lte:now}}]},{OR:[{saleEndsAt:null},{saleEndsAt:{gt:now}}]}]};
    const saleInactive:Prisma.ProductVariantWhereInput={OR:[{salePrice:null},{salePrice:{gte:this.prisma.productVariant.fields.price}},{saleStartsAt:{gt:now}},{saleEndsAt:{lte:now}}]};
    const priceWhere:Prisma.ProductWhereInput={OR:[
      {productType:{not:'GIFT_CARD'},variants:{some:{isActive:true,OR:[{AND:[saleActive,{salePrice:range}]},{AND:[saleInactive,{price:range}]}]}}},
      {productType:'GIFT_CARD',variants:{some:{isActive:true,price:range}}},
      {variants:{none:{isActive:true}},basePrice:range},
    ]};
    const where: Prisma.ProductWhereInput = {
      isActive: true,
      ...(ids.length ? { id: { in: ids } } : {}),
      ...(query?.search ? { OR: [
        { nameRu: { contains: query.search, mode: 'insensitive' as const } },
        { sku: { contains: query.search, mode: 'insensitive' as const } },
      ] } : {}),
      ...(categories.length ? { categories: { some: { category: { slug: { in: categories }, isActive: true } } } } : {}),
      ...(purposes.length ? { purposes: { hasSome: purposes } } : {}),
      ...(features.length ? { features: { hasSome: features } } : {}),
      ...((hasPrice||query?.inStock==='true')?{AND:[...(hasPrice?[priceWhere]:[]),...(query?.inStock === 'true' ? [{ OR: [
        { productType: 'GIFT_CARD', variants: { some: { isActive: true } } },
        { variants: { some: { isActive: true, stock: { gt: this.prisma.productVariant.fields.reserved } } } },
      ] }] : [])]}:{}),
    };
    const orderBy: Prisma.ProductOrderByWithRelationInput[] = query?.sort === 'price-asc' ? [{ basePrice: 'asc' }, { id: 'asc' }]
      : query?.sort === 'price-desc' ? [{ basePrice: 'desc' }, { id: 'asc' }]
      : query?.sort === 'name' ? [{ nameRu: 'asc' }, { id: 'asc' }] : [{ createdAt: 'desc' }, { id: 'asc' }];
    if (query?.sort === 'popular'||query?.sort==='price-asc'||query?.sort==='price-desc') {
      // This SQL mirrors the normalized Prisma filters above. Rank only the requested
      // filtered page in PostgreSQL; never fetch every catalogue ID into application memory.
      const predicates: Prisma.Sql[] = [Prisma.sql`p."isActive" = true`];
      if (ids.length) predicates.push(Prisma.sql`p.id IN (${Prisma.join(ids)})`);
      if (query.search) {
        // Match Prisma contains semantics (including LIKE wildcards), used by count.
        const pattern = `%${query.search}%`;
        predicates.push(Prisma.sql`(p."nameRu" ILIKE ${pattern} OR p.sku ILIKE ${pattern})`);
      }
      if (categories.length) predicates.push(Prisma.sql`EXISTS (
        SELECT 1 FROM "ProductCategory" pc JOIN "Category" c ON c.id = pc."categoryId"
        WHERE pc."productId" = p.id AND c."isActive" = true AND c.slug IN (${Prisma.join(categories)})
      )`);
      if (purposes.length) predicates.push(Prisma.sql`p.purposes && ARRAY[${Prisma.join(purposes)}]::text[]`);
      if (features.length) predicates.push(Prisma.sql`p.features && ARRAY[${Prisma.join(features)}]::text[]`);
      if(hasPrice){
        const conditions:Prisma.Sql[]=[],fallback:Prisma.Sql[]=[];
        const value=Prisma.sql`CASE WHEN p."productType" <> 'GIFT_CARD' AND pv."salePrice" IS NOT NULL AND pv."salePrice" < pv.price
          AND (pv."saleStartsAt" IS NULL OR pv."saleStartsAt" <= ${now}) AND (pv."saleEndsAt" IS NULL OR pv."saleEndsAt" > ${now}) THEN pv."salePrice" ELSE pv.price END`;
        if(query.minPrice!==undefined){conditions.push(Prisma.sql`${value} >= ${query.minPrice}`);fallback.push(Prisma.sql`p."basePrice" >= ${query.minPrice}`);}
        if(query.maxPrice!==undefined){conditions.push(Prisma.sql`${value} <= ${query.maxPrice}`);fallback.push(Prisma.sql`p."basePrice" <= ${query.maxPrice}`);}
        predicates.push(Prisma.sql`(EXISTS (SELECT 1 FROM "ProductVariant" pv WHERE pv."productId"=p.id AND pv."isActive"=true AND ${Prisma.join(conditions,' AND ')}) OR
          (NOT EXISTS (SELECT 1 FROM "ProductVariant" pv WHERE pv."productId"=p.id AND pv."isActive"=true) AND ${Prisma.join(fallback,' AND ')}))`);
      }
      if (query.inStock === 'true') predicates.push(Prisma.sql`EXISTS (
        SELECT 1 FROM "ProductVariant" available WHERE available."productId" = p.id
          AND available."isActive" = true
          AND (p."productType" = 'GIFT_CARD' OR available.stock > available.reserved)
      )`);

      return this.prisma.$transaction(async tx => {
        const total = await tx.product.count({ where });
        const ordering=query.sort==='price-asc'?Prisma.sql`${catalogPrice} ASC,p.id ASC`:query.sort==='price-desc'?Prisma.sql`${catalogPrice} DESC,p.id ASC`:Prisma.sql`COALESCE(sales.units, 0) DESC, p."createdAt" DESC, p.id ASC`;
        const ranked = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`
          SELECT p.id FROM "Product" p
          LEFT JOIN (${purchasedUnits90Days}) sales ON sales."productId" = p.id
          WHERE ${Prisma.join(predicates, ' AND ')}
          ORDER BY ${ordering}
          LIMIT ${limit} OFFSET ${(page - 1) * limit}
        `);
        const products = ranked.length ? await tx.product.findMany({
          where: { AND: [where, { id: { in: ranked.map(item => item.id) } }] },
          include: { images: true, variants: true, categories: { include: { category: true } } },
        }) : [];
        const byId = new Map(products.map(item => [item.id, item]));
        const items = ranked.flatMap(({ id }) => {
          const item = byId.get(id);
          return item ? [item] : [];
        });
        return { items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
    }
    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({ where, include: { images: true, variants: true, categories: { include: { category: true } } }, skip: (page - 1) * limit, take: limit, orderBy }),
      this.prisma.product.count({ where }),
    ]);
    return { items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  async catalogFilters() {
    const [categories, purposes, features, prices] = await Promise.all([
      this.categories(),
      this.prisma.$queryRaw<{ value: string }[]>`SELECT DISTINCT unnest("purposes") AS value FROM "Product" WHERE "isActive" = true ORDER BY value`,
      this.prisma.$queryRaw<{ value: string }[]>`SELECT DISTINCT unnest("features") AS value FROM "Product" WHERE "isActive" = true ORDER BY value`,
      this.prisma.$queryRaw<{min:any;max:any}[]>(Prisma.sql`SELECT MIN(${catalogPrice}) AS min,MAX(${catalogPrice}) AS max FROM "Product" p WHERE p."isActive"=true`),
    ]);
    return { categories, purposes: purposes.map(item => item.value).filter(Boolean), features: features.map(item => item.value).filter(Boolean), price: { min: Number(prices[0]?.min || 0), max: Number(prices[0]?.max || 0) } };
  }

  async findBySlug(slug: string) {
    const product = await this.prisma.product.findFirst({ where: { slug, isActive: true }, include: { images: true, variants: true, categories: { include: { category: true } }, seo: true } });
    if (!product) throw new NotFoundException('Товар не найден');
    return product;
  }

  async cartRecommendations(excludedIds: string[] = []) {
    // Popularity is purchased units across all channels over 90 days, not a manual badge.
    const excluded = excludedIds.slice(0, 100);
    const ranked = await this.prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
      SELECT p.id FROM "Product" p
      LEFT JOIN (${purchasedUnits90Days}) sales ON sales."productId" = p.id
      WHERE p."isActive" = true
        AND EXISTS (SELECT 1 FROM "ProductVariant" available WHERE available."productId" = p.id
          AND available."isActive" = true AND available.stock > available.reserved)
        ${excluded.length ? Prisma.sql`AND p.id NOT IN (${Prisma.join(excluded)})` : Prisma.empty}
      ORDER BY COALESCE(sales.units, 0) DESC, p."createdAt" DESC, p.id ASC LIMIT 8
    `);
    if (!ranked.length) return { items: [] };
    const items = await this.prisma.product.findMany({
      where: { id: { in: ranked.map(item => item.id) }, isActive: true },
      include: { images: true, variants: true, categories: { include: { category: true } } },
    });
    const byId = new Map(items.map(item => [item.id, item]));
    return { items: ranked.flatMap(({ id }) => {
      const item = byId.get(id);
      if (!item) return [];
      const variants = item.variants.filter(variant => variant.isActive && variant.stock > variant.reserved);
      return variants.length ? [{ ...item, variants }] : [];
    }) };
  }

  async create(dto: CreateProductDto) {
    try {
      return await this.prisma.product.create({ data: { sku: dto.sku, nameRu: dto.nameRu, nameEn: dto.nameEn, descriptionRu: dto.descriptionRu, descriptionEn: dto.descriptionEn, purposes: dto.purposes, features: dto.features, slug: dto.slug, basePrice: dto.basePrice, isActive: dto.isActive ?? true, ...(dto.categoryId ? { categories: { create: { categoryId: dto.categoryId } } } : {}) }, include: { categories: true } });
    } catch (error: any) {
      if (error?.code === 'P2002') throw new ConflictException('SKU или slug уже используется');
      throw error;
    }
  }

  async categories() {
    return activeCategoryTree(await this.prisma.category.findMany({ orderBy: [{ sortOrder: 'asc' }, { nameRu: 'asc' }] }));
  }

  async storefrontContent() {
    const now = new Date();
    const [settings, banners, categories, socialLinks, menuItems] = await Promise.all([
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
      this.categories(),
      this.prisma.storefrontSocialLink.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] }),
      this.prisma.storefrontMenuItem.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] }),
    ]);
    return {
      settings: {...(settings || { announcementText: 'SARKISIAN BRAND – это официальный интернет-магазин скоростного мастера-блогера Светланы Саркисян' }),productBadges:resolveProductBadges(settings?.productBadges)},
      banners,
      categories,
      socialLinks,
      menuItems,
    };
  }

  async storefrontPage(slug: string) {
    const page = await this.prisma.storefrontPage.findFirst({ where: { slug, isActive: true } });
    if (!page) throw new NotFoundException('Страница не найдена');
    return page;
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
