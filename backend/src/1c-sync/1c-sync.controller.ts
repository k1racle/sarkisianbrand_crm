import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { OneCProductsSyncDto } from './dto/sync.dto';
import { OneCSyncService } from './1c-sync.service';

@ApiTags('1c-sync')
@Controller('1c-sync')
export class OneCSyncController {
  constructor(private readonly sync: OneCSyncService) {}

  @Post('products')
  @ApiOperation({ summary: 'Идемпотентный upsert товаров из 1С:КА' })
  syncProducts(@Body() dto: OneCProductsSyncDto) { return this.sync.syncProducts(dto); }

  @Get('logs')
  logs() { return this.sync.logs(); }
}
