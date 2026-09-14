import { Body, Controller, Get, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { AdminService } from './admin.service';
import { UpdateOrderStatusDto } from './dto/admin.dto';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'MANAGER_SALES', 'SUPERVISOR', 'WAREHOUSE')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Dashboard админки' })
  dashboard() { return this.admin.dashboard(); }

  @Get('products')
  products() { return this.admin.products(); }

  @Get('orders')
  orders() { return this.admin.orders(); }

  @Patch('orders/:orderNumber/status')
  updateOrderStatus(@Param('orderNumber') orderNumber: string, @Body() dto: UpdateOrderStatusDto, @Req() request: any) { return this.admin.updateOrderStatus(orderNumber, dto, request.user.sub); }
}
