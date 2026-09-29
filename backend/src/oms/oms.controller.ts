import { Body, Controller, Get, Header, Param, Patch, Query, Req, UseGuards } from '@nestjs/common';
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
  @Get('dashboard') @Header('Cache-Control', 'private, no-store') @Permissions('oms.read') dashboard(@Req() request: any) { return this.oms.dashboard(request.user.sub); }
  @Get('orders') @Header('Cache-Control', 'private, no-store') @Permissions('oms.read') orders(@Query() query: OmsOrderListDto, @Req() request: any) { return this.oms.orders(request.user.sub, query.source, query.status, query.search); }
  @Get('orders/list') @Header('Cache-Control', 'private, no-store') @Permissions('oms.read') list(@Query() query: OmsOrderListDto, @Req() request: any) { return this.oms.listOrders(request.user.sub, query); }
  @Get('orders/:id') @Header('Cache-Control', 'private, no-store') @Permissions('oms.read') order(@Param('id') id: string, @Req() request: any) { return this.oms.order(request.user.sub, id); }
  @Patch('orders/:id') @Permissions('oms.write') update(@Param('id') id: string, @Body() dto: UpdateOmsOrderDto, @Req() request: any) { return this.oms.update(id, dto, request.user.sub); }
}
