import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
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
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'MARKETPLACE_MANAGER', 'SUPERVISOR', 'WAREHOUSE')
export class MarketplacesController {
  constructor(private readonly marketplaces: MarketplacesService) {}
  @Get('dashboard') @Permissions('marketplace.read') dashboard() { return this.marketplaces.dashboard(); }
  @Get('orders') @Permissions('marketplace.read') orders(@Query('channel') channel?: string) { return this.marketplaces.orders(channel); }
  @Post('orders') @Permissions('marketplace.write') upsert(@Body() dto: UpsertMarketplaceOrderDto) { return this.marketplaces.upsert(dto); }
  @Post('orders/import') @Permissions('marketplace.write') importMany(@Body() dto: MarketplaceImportDto, @Req() request: any) { return this.marketplaces.importMany(dto, request.user.sub); }
  @Patch('orders/:id') @Permissions('marketplace.write') update(@Param('id') id: string, @Body() dto: UpdateMarketplaceOrderDto) { return this.marketplaces.update(id, dto); }
  @Get('integrations') @Permissions('marketplace.read') integrations() { return this.marketplaces.integrations(); }
  @Post('integrations') @Permissions('marketplace.configure') saveIntegration(@Body() dto: SaveMarketplaceIntegrationDto) { return this.marketplaces.saveIntegration(dto); }
  @Post('integrations/:channel/test') @Permissions('marketplace.configure') testIntegration(@Param('channel') channel: string) { return this.marketplaces.testIntegration(channel); }
}
