import { Body, Controller, Get, Headers, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PickupPointsQueryDto, ShippingAddressDto, ShippingCitiesQueryDto, ShippingEstimateDto } from './dto/shipping.dto';
import { ShippingService } from './shipping.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CdekProvider } from './cdek.provider';

@ApiTags('shipping')
@Controller('shipping')
export class ShippingController {
  constructor(private readonly shipping: ShippingService, private readonly cdek: CdekProvider) {}

  @Get('capabilities')
  capabilities() { return this.shipping.capabilities(); }

  @Post('estimate')
  @UseGuards(OptionalJwtAuthGuard)
  estimate(@Headers('x-cart-session') session: string | undefined, @Body() dto: ShippingEstimateDto, @Req() req: any) { return this.shipping.estimate(session, dto, req.user?.sub); }

  @Get('pickup-points')
  pickupPoints(@Query() query: PickupPointsQueryDto) { return this.shipping.pickupPoints(query.provider, query.cityCode); }

  @Get('cities')
  cities(@Query() query: ShippingCitiesQueryDto) {
    if (query.provider === 'OZON_DELIVERY') return { provider: 'OZON_DELIVERY', available: false, cities: [], message: 'Автоматический поиск городов Ozon пока не подключён' };
    return this.cdek.cities(query.search);
  }

  @Post('orders/:orderNumber/calculate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'WAREHOUSE', 'SUPERVISOR')
  @ApiOperation({ summary: 'Рассчитать стоимость доставки' })
  calculate(@Param('orderNumber') orderNumber: string, @Body() dto: ShippingAddressDto) { return this.shipping.calculate(orderNumber, dto); }

  @Post('orders/:orderNumber/ship')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'WAREHOUSE', 'SUPERVISOR')
  @ApiOperation({ summary: 'Создать отправление' })
  createShipment(@Param('orderNumber') orderNumber: string, @Body() dto: ShippingAddressDto) { return this.shipping.createShipment(orderNumber, dto); }
}
