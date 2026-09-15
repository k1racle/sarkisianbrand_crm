import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CreateCategoryDto, CreateProductDto } from './dto/product.dto';
import { ProductsService } from './products.service';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'Каталог товаров с поиском и пагинацией' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'category', required: false })
  async list(@Query('search') search?: string, @Query('category') category?: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.products.list({ search, category, page: Number(page) || 1, limit: Number(limit) || 24 });
  }

  @Get('categories')
  categories() { return this.products.categories(); }

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
