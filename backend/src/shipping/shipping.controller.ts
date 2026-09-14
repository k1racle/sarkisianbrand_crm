import { Body, Controller, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ShippingAddressDto } from './dto/shipping.dto';
import { ShippingService } from './shipping.service';

@ApiTags('shipping')
@Controller('shipping')
export class ShippingController {
  constructor(private readonly shipping: ShippingService) {}

  @Post('orders/:orderNumber/calculate')
  @ApiOperation({ summary: 'Рассчитать стоимость доставки' })
  calculate(@Param('orderNumber') orderNumber: string, @Body() dto: ShippingAddressDto) { return this.shipping.calculate(orderNumber, dto); }

  @Post('orders/:orderNumber/ship')
  @ApiOperation({ summary: 'Создать отправление' })
  createShipment(@Param('orderNumber') orderNumber: string, @Body() dto: ShippingAddressDto) { return this.shipping.createShipment(orderNumber, dto); }
}
