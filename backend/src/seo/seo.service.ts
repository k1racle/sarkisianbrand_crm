import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { buildRobots, buildSitemap, SeoSnapshot, siteOrigin } from './seo-document';

@Injectable()
export class SeoService {
  readonly origin: string;
  readonly indexing: boolean;
  private cache?: { expires: number; snapshot: SeoSnapshot };
  private pending?: Promise<SeoSnapshot>;

  constructor(private readonly prisma: PrismaService, config: ConfigService) {
    const configured = config.get<string>('SITE_URL');
    if (!configured && config.get('NODE_ENV') === 'production') throw new Error('Для production необходимо задать SITE_URL');
    this.origin = siteOrigin(configured || 'http://localhost:3001');
    this.indexing = String(config.get('SEO_INDEXING_ENABLED') || 'false') === 'true';
    if (this.indexing && config.get('NODE_ENV') === 'production' && !this.origin.startsWith('https://')) {
      throw new Error('Индексируемый production-сайт должен использовать HTTPS');
    }
  }

  private snapshot(): Promise<SeoSnapshot> {
    if (this.cache && this.cache.expires > Date.now()) return Promise.resolve(this.cache.snapshot);
    if (this.pending) return this.pending;
    this.pending = this.prisma.$transaction([
      this.prisma.product.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true }, orderBy: { slug: 'asc' } }),
      this.prisma.category.findMany({ where: { isActive: true }, select: { slug: true }, orderBy: { slug: 'asc' } }),
      this.prisma.storefrontPage.findMany({ select: { slug: true, updatedAt: true, isActive: true, reviewRequired: true }, orderBy: { slug: 'asc' } }),
    ]).then(([products, categories, pages]) => {
      const snapshot = { products, categories, pages };
      this.cache = { expires: Date.now() + 60_000, snapshot };
      return snapshot;
    }).catch(() => {
      throw new ServiceUnavailableException('SEO-данные временно недоступны');
    }).finally(() => { this.pending = undefined; });
    return this.pending;
  }

  async sitemap() {
    const snapshot = this.indexing ? await this.snapshot() : { products: [], categories: [], pages: [] };
    try { return buildSitemap(this.origin, snapshot, this.indexing); }
    catch { throw new ServiceUnavailableException('Не удалось сформировать карту сайта'); }
  }

  async robots() {
    return buildRobots(this.origin, this.indexing ? (await this.snapshot()).pages : [], this.indexing);
  }
}
