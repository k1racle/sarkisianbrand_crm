import { Body, Controller, Get, Header, Headers, Param, Post, Req, UseGuards } from '@nestjs/common';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CheckoutDto } from './dto/order.dto';
import { OrdersService } from './orders.service';

@ApiTags('orders')
@Controller('orders')
@UseGuards(OptionalJwtAuthGuard)
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post('checkout')
  @ApiOperation({ summary: 'Создать заказ из гостевой корзины' })
  checkout(@Headers('x-cart-session') session: string, @Body() dto: CheckoutDto, @Req() req: any, @Headers('x-idempotency-key') key?: string) { return this.orders.checkout(session, dto, req.user, key); }

  @Post('quote')
  quote(@Headers('x-cart-session') session: string, @Body() dto: CheckoutDto, @Req() req: any) { return this.orders.quote(session, dto, req.user); }

  @Get(':orderNumber')
  @Header('Cache-Control', 'private, no-store')
  findOne(@Param('orderNumber') orderNumber: string, @Req() req: any, @Headers('x-order-access') access?: string) { return this.orders.findOne(orderNumber, req.user, access); }
}
