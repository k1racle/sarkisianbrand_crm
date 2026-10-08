import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CreatePromotionDto, DeletePromotionDto, GeneratePromoCodeDto, ListPromotionsDto, PromoCodeParamDto, UpdatePromotionDto } from './promotions.dto';
import { PromotionsService } from './promotions.service';

@ApiTags('promotions')
@ApiBearerAuth()
@Controller('promotions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'CONTENT_MANAGER', 'MANAGER_SALES', 'SUPERVISOR')
export class PromotionsController {
  constructor(private readonly promotions: PromotionsService) {}

  @Get() @Permissions('promotions.read') list(@Query() query: ListPromotionsDto) { return this.promotions.list(query); }
  @Post('generate') @Permissions('promotions.read', 'promotions.write') generate(@Body() dto: GeneratePromoCodeDto) { return this.promotions.generate(dto); }
  @Post() @Permissions('promotions.read', 'promotions.write') create(@Body() dto: CreatePromotionDto) { return this.promotions.create(dto); }
  @Patch(':code') @Permissions('promotions.read', 'promotions.write') update(@Param() params: PromoCodeParamDto, @Body() dto: UpdatePromotionDto) { return this.promotions.update(params.code, dto); }
  @Delete(':code') @Permissions('promotions.read', 'promotions.write') remove(@Param() params: PromoCodeParamDto, @Body() dto: DeletePromotionDto) { return this.promotions.remove(params.code, dto); }
}
