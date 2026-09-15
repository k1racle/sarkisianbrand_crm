import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { AdminService } from './admin.service';
import { CreateAdminProductDto, UpdateOrderStatusDto, UpdateProductDto } from './dto/admin.dto';

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
