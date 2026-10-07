import { Body, Controller, Get, Header, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { OrderExecutionDto } from './dto/execution.dto';
import { OrderAdjustmentDto } from './dto/order-adjustment.dto';
import { OrderFinanceDto, ReceivablesQueryDto } from './dto/order-finance.dto';
import { CreateOneCRequestDto } from '../1c-sync/dto/finance.dto';
import { OrderSource, OrderStatus } from '@prisma/client';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { AssignOrderManagerDto, MapMarketplaceItemDto, OrderManagerSearchDto, ResolveMarketplaceImportDto, UpdateOmsOrderDto } from './dto/oms.dto';
import { OmsService } from './oms.service';
import { OmsOrderListDto } from './dto/order-list.dto';
import { InventoryPageDto, InventoryQueryDto } from './dto/inventory.dto';

@ApiTags('oms')
@ApiBearerAuth()
@Controller('oms')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'MANAGER_B2B', 'MANAGER_SALES', 'MARKETPLACE_MANAGER', 'SUPERVISOR', 'EXECUTIVE', 'WAREHOUSE')
export class OmsController {
  constructor(private readonly oms: OmsService) {}
  @Get('inventory') @Header('Cache-Control', 'private, no-store') @Permissions('inventory.read', 'oms.read') inventory(@Req() req: any, @Query() query: InventoryQueryDto) { return this.oms.inventory(req.user.sub, query); }
  @Get('inventory/:id') @Header('Cache-Control', 'private, no-store') @Permissions('inventory.read', 'oms.read') inventoryPosition(@Req() req: any, @Param('id') id: string, @Query() query: InventoryPageDto) { return this.oms.inventoryPosition(req.user.sub, id, query); }
  @Post('orders/:id/1c-requests') @Permissions('oms.read', 'oms.write', 'order_finance.read', 'order_finance.write') requestOneC(@Req() req: any, @Param('id') id: string, @Body() dto: CreateOneCRequestDto) { return this.oms.requestOneC(req.user.sub, id, dto); }
  @Get('receivables') @Header('Cache-Control', 'private, no-store') @Permissions('oms.read', 'order_finance.read') receivables(@Req() req: any, @Query() dto: ReceivablesQueryDto) { return this.oms.receivables(req.user.sub, dto); }
  @Get('orders/:id/finance') @Header('Cache-Control', 'private, no-store') @Permissions('oms.read', 'order_finance.read') finance(@Req() req: any, @Param('id') id: string) { return this.oms.finance(req.user.sub, id); }
  @Post('orders/:id/finance') @Permissions('oms.read', 'oms.write', 'order_finance.read', 'order_finance.write') postFinance(@Req() req: any, @Param('id') id: string, @Body() dto: OrderFinanceDto) { return this.oms.postFinance(req.user.sub, id, dto); }
  @Post('orders/:id/import-resolution') @Permissions('oms.read', 'oms.write') resolveImport(@Param('id') id: string, @Body() dto: ResolveMarketplaceImportDto, @Req() request: any) { return this.oms.resolveMarketplaceImport(request.user.sub, id, dto); }
  @Patch('orders/:id/item-mapping') @Permissions('oms.read', 'oms.write') mapItem(@Param('id') id: string, @Body() dto: MapMarketplaceItemDto, @Req() request: any) { return this.oms.mapMarketplaceItem(request.user.sub, id, dto); }
  @Post('orders/:id/adjustments') @Permissions('oms.read', 'oms.write') adjust(@Param('id') id: string, @Body() dto: OrderAdjustmentDto, @Req() request: any) { return this.oms.adjustOrder(request.user.sub, id, dto); }
  @Post('orders/:id/execution') @Permissions('oms.read', 'oms.write') execute(@Param('id') id: string, @Body() dto: OrderExecutionDto, @Req() request: any) { return this.oms.executeOrder(request.user.sub, id, dto); }
  @Get('dashboard') @Header('Cache-Control', 'private, no-store') @Permissions('oms.read') dashboard(@Req() request: any) { return this.oms.dashboard(request.user.sub); }
  @Get('orders') @Header('Cache-Control', 'private, no-store') @Permissions('oms.read') orders(@Query() query: OmsOrderListDto, @Req() request: any) { return this.oms.orders(request.user.sub, query.source, query.status, query.search); }
  @Get('orders/list') @Header('Cache-Control', 'private, no-store') @Permissions('oms.read') list(@Query() query: OmsOrderListDto, @Req() request: any) { return this.oms.listOrders(request.user.sub, query); }
  @Get('orders/:id') @Header('Cache-Control', 'private, no-store') @Permissions('oms.read') order(@Param('id') id: string, @Req() request: any) { return this.oms.order(request.user.sub, id); }
  @Get('orders/:id/managers') @Header('Cache-Control', 'private, no-store') @Permissions('oms.read', 'oms.write') managers(@Param('id') id: string, @Query() query: OrderManagerSearchDto, @Req() request: any) { return this.oms.managers(request.user.sub, id, query.search); }
  @Patch('orders/:id/manager') @Permissions('oms.read', 'oms.write') manager(@Param('id') id: string, @Body() dto: AssignOrderManagerDto, @Req() request: any) { return this.oms.assignManager(request.user.sub, id, dto); }
  @Patch('orders/:id') @Permissions('oms.write') update(@Param('id') id: string, @Body() dto: UpdateOmsOrderDto, @Req() request: any) { return this.oms.update(id, dto, request.user.sub); }
}
