import { CompanyScope, CompanyScopeGuard } from '../common/guards/company-scope.guard';
import { Body, Controller, Get, Header, Param, ParseEnumPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { MarketplaceChannel } from '@prisma/client';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { MarketplacesService } from './marketplaces.service';
import { MarketplaceImportDto, UpdateMarketplaceOrderDto, UpsertMarketplaceOrderDto } from './dto/marketplace.dto';
import { SaveMarketplaceIntegrationDto } from './dto/integration.dto';

@ApiTags('marketplaces')
@ApiBearerAuth()
@Controller('marketplaces')
@UseGuards(JwtAuthGuard, RolesGuard, CompanyScopeGuard)
@Roles('ADMIN', 'MARKETPLACE_MANAGER', 'SUPERVISOR', 'EXECUTIVE', 'WAREHOUSE')
export class MarketplacesController {
  constructor(private readonly marketplaces: MarketplacesService) {}
  @Get('dashboard') @Header('Cache-Control', 'private, no-store') @Permissions('marketplace.read') dashboard(@Req() request: any) { return this.marketplaces.dashboard(request.user.sub); }
  @Get('orders') @Header('Cache-Control', 'private, no-store') @Permissions('marketplace.read') orders(@Req() request: any, @Query('channel', new ParseEnumPipe(MarketplaceChannel, { optional: true })) channel?: MarketplaceChannel) { return this.marketplaces.orders(request.user.sub, channel); }
  @Post('orders') @Permissions('marketplace.write') upsert(@Body() dto: UpsertMarketplaceOrderDto, @Req() request: any) { return this.marketplaces.upsert(dto, request.user.sub); }
  @Post('orders/import') @Permissions('marketplace.write') importMany(@Body() dto: MarketplaceImportDto, @Req() request: any) { return this.marketplaces.importMany(dto, request.user.sub); }
  @Patch('orders/:id') @Permissions('marketplace.write') update(@Param('id') id: string, @Body() dto: UpdateMarketplaceOrderDto, @Req() request: any) { return this.marketplaces.update(id, dto, request.user.sub); }
  @Get('integrations') @Permissions('marketplace.read') @CompanyScope('marketplace.read') integrations() { return this.marketplaces.integrations(); }
  @Post('integrations') @Permissions('marketplace.configure') @CompanyScope('marketplace.read', 'marketplace.configure') saveIntegration(@Body() dto: SaveMarketplaceIntegrationDto) { return this.marketplaces.saveIntegration(dto); }
  @Post('integrations/:channel/test') @Permissions('marketplace.configure') @CompanyScope('marketplace.read', 'marketplace.configure') testIntegration(@Param('channel') channel: string) { return this.marketplaces.testIntegration(channel); }
}
