import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { IsIn, IsString, IsUUID, Matches } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CompanyScope, CompanyScopeGuard } from '../common/guards/company-scope.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { OzonSyncService } from './ozon-sync.service';
import type { OzonMode } from './ozon-orders';

class OzonSyncDto { @IsIn(['FBS', 'FBO']) mode!: OzonMode; }
class OzonMappingDto { @IsString() @Matches(/^(sku|product):[a-zA-Z0-9_-]{1,100}$/) externalVariantId!: string; @IsUUID('4') variantId!: string; }

@Controller('marketplaces/ozon')
@UseGuards(JwtAuthGuard, RolesGuard, CompanyScopeGuard)
@Roles('ADMIN', 'MARKETPLACE_MANAGER', 'SUPERVISOR', 'EXECUTIVE', 'WAREHOUSE')
export class OzonSyncController {
  constructor(private readonly syncService: OzonSyncService) {}
  @Post('sync') @Permissions('marketplace.write') @CompanyScope('marketplace.read', 'marketplace.write', 'customers.read', 'customers.write')
  sync(@Body() dto: OzonSyncDto, @Req() request: any) { return this.syncService.sync(request.user.sub, dto.mode); }
  @Get('status') @Permissions('marketplace.read') @CompanyScope('marketplace.read') status() { return this.syncService.status(); }
  @Get('unresolved') @Permissions('marketplace.read') @CompanyScope('marketplace.read', 'catalog.read') unresolved() { return this.syncService.unresolved(); }
  @Get('variants') @Permissions('marketplace.read') @CompanyScope('marketplace.read', 'catalog.read') variants(@Query('search') search?: string) { return this.syncService.variants(search); }
  @Get('mappings') @Permissions('marketplace.read') @CompanyScope('marketplace.read', 'catalog.read') mappings() { return this.syncService.mappings(); }
  @Post('mappings') @Permissions('marketplace.configure') @CompanyScope('marketplace.read', 'marketplace.configure', 'catalog.read') map(@Body() dto: OzonMappingDto) { return this.syncService.mapVariant(dto.externalVariantId, dto.variantId); }
}
