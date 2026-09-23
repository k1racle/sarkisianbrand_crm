import { Body, Controller, Get, Param, Patch, Query, Req, UseGuards } from '@nestjs/common';
import { OrderSource, OrderStatus } from '@prisma/client';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { UpdateOmsOrderDto } from './dto/oms.dto';
import { OmsService } from './oms.service';
import { OmsOrderListDto } from './dto/order-list.dto';

@ApiTags('oms')
@ApiBearerAuth()
@Controller('oms')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'MANAGER_B2B', 'MANAGER_SALES', 'MARKETPLACE_MANAGER', 'SUPERVISOR', 'EXECUTIVE', 'WAREHOUSE')
export class OmsController {
  constructor(private readonly oms: OmsService) {}
  @Get('dashboard') @Permissions('oms.read') dashboard() { return this.oms.dashboard(); }
  @Get('orders') @Permissions('oms.read') orders(@Query('source') source?: OrderSource, @Query('status') status?: OrderStatus, @Query('search') search?: string) { return this.oms.orders(source, status, search); }
  @Get('orders/list') @Permissions('oms.read') list(@Query() query: OmsOrderListDto) { return this.oms.listOrders(query); }
  @Get('orders/:id') @Permissions('oms.read') order(@Param('id') id: string) { return this.oms.order(id); }
  @Patch('orders/:id') @Permissions('oms.write') update(@Param('id') id: string, @Body() dto: UpdateOmsOrderDto, @Req() request: any) { return this.oms.update(id, dto, request.user.sub); }
}
