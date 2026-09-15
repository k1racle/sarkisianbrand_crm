import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { AdminService } from './admin.service';
import { CreateAdminProductDto, CreateStorefrontBannerDto, UpdateCategoryPresentationDto, UpdateOrderStatusDto, UpdateProductDto, UpdateStorefrontBannerDto, UpdateStorefrontSettingsDto } from './dto/admin.dto';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'CONTENT_MANAGER', 'MANAGER_SALES', 'SUPERVISOR', 'WAREHOUSE')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('dashboard')
  @Permissions('admin.read')
  @ApiOperation({ summary: 'Dashboard админки' })
  dashboard() { return this.admin.dashboard(); }

  @Get('products')
  @Permissions('catalog.read')
  products() { return this.admin.products(); }

  @Get('categories')
  @Permissions('catalog.read')
  categories() { return this.admin.categories(); }

  @Get('storefront')
  @Permissions('catalog.read')
  storefrontContent() { return this.admin.storefrontContent(); }

  @Patch('storefront/settings')
  @Permissions('catalog.write')
  updateStorefrontSettings(@Body() dto: UpdateStorefrontSettingsDto) { return this.admin.updateStorefrontSettings(dto); }

  @Post('storefront/banners')
  @Permissions('catalog.write')
  createStorefrontBanner(@Body() dto: CreateStorefrontBannerDto) { return this.admin.createStorefrontBanner(dto); }

  @Patch('storefront/banners/:id')
  @Permissions('catalog.write')
  updateStorefrontBanner(@Param('id') id: string, @Body() dto: UpdateStorefrontBannerDto) { return this.admin.updateStorefrontBanner(id, dto); }

  @Delete('storefront/banners/:id')
  @Permissions('catalog.write')
  deleteStorefrontBanner(@Param('id') id: string) { return this.admin.deleteStorefrontBanner(id); }

  @Patch('categories/:id/presentation')
  @Permissions('catalog.write')
  updateCategoryPresentation(@Param('id') id: string, @Body() dto: UpdateCategoryPresentationDto) { return this.admin.updateCategoryPresentation(id, dto); }

  @Post('storefront/media')
  @Permissions('catalog.write')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 8 * 1024 * 1024, files: 1 } }))
  uploadStorefrontMedia(@UploadedFile() file: any) { return this.admin.saveStorefrontMedia(file); }

  @Post('products')
  @Permissions('catalog.write')
  createProduct(@Body() dto: CreateAdminProductDto) { return this.admin.createProduct(dto); }

  @Patch('products/:id')
  @Permissions('catalog.write')
  updateProduct(@Param('id') id: string, @Body() dto: UpdateProductDto) { return this.admin.updateProduct(id, dto); }

  @Delete('products/:id')
  @Permissions('catalog.write')
  archiveProduct(@Param('id') id: string) { return this.admin.archiveProduct(id); }

  @Get('orders')
  @Permissions('web_orders.read')
  orders() { return this.admin.orders(); }

  @Patch('orders/:orderNumber/status')
  @Permissions('web_orders.write')
  updateOrderStatus(@Param('orderNumber') orderNumber: string, @Body() dto: UpdateOrderStatusDto, @Req() request: any) { return this.admin.updateOrderStatus(orderNumber, dto, request.user.sub); }
}
