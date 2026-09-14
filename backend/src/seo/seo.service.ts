import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SeoService {
  constructor(private readonly prisma: PrismaService) {}

  async sitemap() {
    const [products, categories] = await this.prisma.$transaction([
      this.prisma.product.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true } }),
      this.prisma.category.findMany({ where: { isActive: true }, select: { slug: true } }),
    ]);
    const urls = [
      'https://sarkisianbrand.ru/',
      ...categories.map((category) => `https://sarkisianbrand.ru/catalog/${category.slug}`),
      ...products.map((product) => `https://sarkisianbrand.ru/products/${product.slug}`),
    ];
    return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((url) => `<url><loc>${url}</loc></url>`).join('')}</urlset>`;
  }

  robots() {
    return 'User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: https://sarkisianbrand.ru/api/v1/seo/sitemap';
  }
}
