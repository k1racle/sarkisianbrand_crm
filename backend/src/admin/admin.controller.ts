import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { AdminService } from './admin.service';
import { CreateStorefrontMenuItemDto, UpdateStorefrontMenuItemDto, CreateStorefrontPageDto, UpdateStorefrontPageDto } from './dto/admin.dto';
import { CreateAdminProductDto, CreateStorefrontBannerDto, CreateStorefrontSocialLinkDto, UpdateCategoryPresentationDto, UpdateOrderStatusDto, UpdateProductDto, UpdateStorefrontBannerDto, UpdateStorefrontSettingsDto, UpdateStorefrontSocialLinkDto } from './dto/admin.dto';

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

  @Get('storefront/pages')
  @Permissions('catalog.read')
  storefrontPages() { return this.admin.storefrontPages(); }

  @Post('storefront/pages')
  @Permissions('catalog.write')
  createStorefrontPage(@Body() dto: CreateStorefrontPageDto) { return this.admin.createStorefrontPage(dto); }

  @Patch('storefront/pages/:slug')
  @Permissions('catalog.write')
  updateStorefrontPage(@Param('slug') slug: string, @Body() dto: UpdateStorefrontPageDto) { return this.admin.updateStorefrontPage(slug, dto); }

  @Delete('storefront/pages/:slug')
  @Permissions('catalog.write')
  deleteStorefrontPage(@Param('slug') slug: string) { return this.admin.deleteStorefrontPage(slug); }

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

  @Post('storefront/social-links')
  @Permissions('catalog.write')
  createStorefrontSocialLink(@Body() dto: CreateStorefrontSocialLinkDto) { return this.admin.createStorefrontSocialLink(dto); }

  @Patch('storefront/social-links/:id')
  @Permissions('catalog.write')
  updateStorefrontSocialLink(@Param('id') id: string, @Body() dto: UpdateStorefrontSocialLinkDto) { return this.admin.updateStorefrontSocialLink(id, dto); }

  @Delete('storefront/social-links/:id')
  @Permissions('catalog.write')
  deleteStorefrontSocialLink(@Param('id') id: string) { return this.admin.deleteStorefrontSocialLink(id); }

  @Patch('categories/:id/presentation')
  @Permissions('catalog.write')
  updateCategoryPresentation(@Param('id') id: string, @Body() dto: UpdateCategoryPresentationDto) { return this.admin.updateCategoryPresentation(id, dto); }

  @Post('storefront/menu-items')
  @Permissions('catalog.write')
  createStorefrontMenuItem(@Body() dto: CreateStorefrontMenuItemDto) { return this.admin.createStorefrontMenuItem(dto); }

  @Patch('storefront/menu-items/:id')
  @Permissions('catalog.write')
  updateStorefrontMenuItem(@Param('id') id: string, @Body() dto: UpdateStorefrontMenuItemDto) { return this.admin.updateStorefrontMenuItem(id, dto); }

  @Delete('storefront/menu-items/:id')
  @Permissions('catalog.write')
  deleteStorefrontMenuItem(@Param('id') id: string) { return this.admin.deleteStorefrontMenuItem(id); }

  @Post('storefront/media')
  @Permissions('catalog.write', 'media.write')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 8 * 1024 * 1024, files: 1, fields: 0 } }))
  uploadStorefrontMedia(@UploadedFile() file: any, @Req() req: any) { return this.admin.saveStorefrontMedia(file, req.user.sub); }

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
