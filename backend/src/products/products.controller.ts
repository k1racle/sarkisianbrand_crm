import { Body, Controller, Get, Param, Post, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CatalogQueryDto, CreateCategoryDto, CreateProductDto } from './dto/product.dto';
import { ProductsService } from './products.service';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'Каталог товаров с поиском и пагинацией' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'category', required: false })
  async list(@Query() query: CatalogQueryDto) {
    return this.products.list(query);
  }

  @Get('filters')
  @ApiOperation({ summary: 'Категории, назначения, особенности и диапазон цен опубликованного каталога' })
  catalogFilters() { return this.products.catalogFilters(); }

  @Get('categories')
  categories() { return this.products.categories(); }

  @Get('recommendations/cart')
  @ApiOperation({ summary: 'До 8 доступных товаров по оплаченным продажам за 90 дней, без товаров корзины' })
  cartRecommendations(@Query('exclude') exclude?: string) {
    return this.products.cartRecommendations(typeof exclude === 'string' ? exclude.split(',').filter(Boolean) : []);
  }

  @Get('storefront-content')
  storefrontContent() { return this.products.storefrontContent(); }

  @Get('storefront-pages/:slug')
  storefrontPage(@Param('slug') slug: string) { return this.products.storefrontPage(slug); }

  @Get('storefront-media/:fileName')
  async storefrontMedia(@Param('fileName') fileName: string, @Res() response: Response) {
    const media = await this.products.storefrontMedia(fileName);
    response.type(media.contentType).send(media.buffer);
  }

  @Get(':slug')
  findBySlug(@Param('slug') slug: string) { return this.products.findBySlug(slug); }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'CONTENT_MANAGER')
  @Permissions('catalog.write')
  create(@Body() dto: CreateProductDto) { return this.products.create(dto); }

  @Post('categories')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'CONTENT_MANAGER')
  @Permissions('catalog.write')
  createCategory(@Body() dto: CreateCategoryDto) { return this.products.createCategory(dto); }
}
