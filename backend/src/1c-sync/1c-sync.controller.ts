import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { OneCProductsSyncDto } from './dto/sync.dto';
import { OneCSyncService } from './1c-sync.service';

@ApiTags('1c-sync')
@Controller('1c-sync')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'WAREHOUSE')
export class OneCSyncController {
  constructor(private readonly sync: OneCSyncService) {}

  @Post('products')
  @Permissions('integrations.write')
  @ApiOperation({ summary: 'Идемпотентный upsert товаров из 1С:КА' })
  syncProducts(@Body() dto: OneCProductsSyncDto, @Req() request: any) { return this.sync.syncProducts(dto, request.user.sub); }

  @Get('logs')
  @Permissions('integrations.read')
  logs() { return this.sync.logs(); }
}
