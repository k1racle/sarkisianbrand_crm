import { Body, Controller, Get, Headers, Post, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CompanyScope, CompanyScopeGuard } from '../common/guards/company-scope.guard';
import { OneCOrderStatusesDto, OneCProductsSyncDto } from './dto/sync.dto';
import { OneCSyncService } from './1c-sync.service';
import { OneCFinanceDto } from './dto/finance.dto';

@ApiTags('1c-sync')
@Controller('1c-sync')
@UseGuards(JwtAuthGuard, RolesGuard, CompanyScopeGuard)
@CompanyScope('integrations.read')
@Roles('ADMIN', 'WAREHOUSE')
export class OneCSyncController {
  constructor(private readonly sync: OneCSyncService) {}

  @Post('products')
  @CompanyScope('integrations.write', 'catalog.read', 'catalog.write')
  @Permissions('integrations.write')
  @ApiOperation({ summary: 'Идемпотентный upsert товаров из 1С:КА' })
  syncProducts(@Body() dto: OneCProductsSyncDto, @Req() request: any) { return this.sync.syncProducts(dto, request.user.sub); }

  @Get('logs')
  @Permissions('integrations.read')
  logs() { return this.sync.logs(); }

  @Get('status')
  @Permissions('integrations.read')
  status() { return this.sync.status(); }

  @Post('test-connection')
  @CompanyScope('integrations.write')
  @Permissions('integrations.write')
  testConnection() { return this.sync.testConnection(); }

  @Post('exchange')
  @CompanyScope('integrations.write', 'catalog.read', 'catalog.write', 'customers.read', 'customers.write', 'oms.read', 'oms.write', 'web_orders.read', 'web_orders.manage', 'marketplace.read', 'marketplace.write')
  @Permissions('integrations.write')
  exchange(@Req() request: any) { return this.sync.runFullExchange(request.user.sub); }
}

@ApiTags('1c-sync')
@Controller('1c-webhook')
export class OneCWebhookController {
  constructor(private readonly sync: OneCSyncService) {}
  @Post('order-finance')
  async orderFinance(@Headers('x-integration-key') key: string | undefined, @Body() dto: OneCFinanceDto) {
    if (!(await this.sync.verifyInboundSecret(key))) throw new UnauthorizedException('Неверный ключ интеграции 1С');
    return this.sync.importFinance(dto);
  }

  @Post('order-statuses')
  @ApiOperation({ summary: 'Статусы складской сборки из 1С/ТСД' })
  async orderStatuses(@Headers('x-integration-key') key: string | undefined, @Body() dto: OneCOrderStatusesDto) {
    if (!(await this.sync.verifyInboundSecret(key))) throw new UnauthorizedException('Неверный ключ интеграции 1С');
    return this.sync.importOrderStatuses(dto);
  }
}
