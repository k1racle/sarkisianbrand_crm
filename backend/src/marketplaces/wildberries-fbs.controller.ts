import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsString, IsUUID, Matches } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CompanyScope, CompanyScopeGuard } from '../common/guards/company-scope.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { WildberriesFbsService } from './wildberries-fbs.service';

class WildberriesMappingDto {
  @IsString() @Matches(/^[1-9]\d{0,15}$/) externalVariantId!: string;
  @IsUUID('4') variantId!: string;
}

@ApiTags('marketplaces') @ApiBearerAuth()
@Controller('marketplaces/wildberries/fbs')
@UseGuards(JwtAuthGuard, RolesGuard, CompanyScopeGuard)
@Roles('ADMIN', 'MARKETPLACE_MANAGER', 'SUPERVISOR')
export class WildberriesFbsController {
  constructor(private readonly service: WildberriesFbsService) {}

  @Post('sync') @Permissions('marketplace.write') @CompanyScope('marketplace.read', 'marketplace.write', 'customers.read', 'customers.write')
  sync(@Req() request: any) { return this.service.sync(request.user.sub); }

  @Get('status') @Permissions('marketplace.read') @CompanyScope('marketplace.read')
  status() { return this.service.status(); }

  @Get('unresolved') @Permissions('marketplace.read') @CompanyScope('marketplace.read', 'catalog.read')
  unresolved() { return this.service.unresolved(); }

  @Get('variants') @Permissions('marketplace.read') @CompanyScope('marketplace.read', 'catalog.read')
  variants(@Query('search') search?: string) { return this.service.variants(search); }

  @Get('mappings') @Permissions('marketplace.read') @CompanyScope('marketplace.read', 'catalog.read')
  mappings() { return this.service.mappings(); }

  @Post('mappings') @Permissions('marketplace.configure') @CompanyScope('marketplace.read', 'marketplace.configure', 'catalog.read')
  map(@Body() dto: WildberriesMappingDto) { return this.service.mapVariant(dto.externalVariantId, dto.variantId); }
}
