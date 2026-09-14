import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CheckoutDto } from './dto/order.dto';
import { OrdersService } from './orders.service';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post('checkout')
  @ApiOperation({ summary: 'Создать заказ из гостевой корзины' })
  checkout(@Headers('x-cart-session') session: string | undefined, @Body() dto: CheckoutDto) { return this.orders.checkout(session || 'anonymous-session', dto); }

  @Get(':orderNumber')
  findOne(@Param('orderNumber') orderNumber: string) { return this.orders.findOne(orderNumber); }
}
