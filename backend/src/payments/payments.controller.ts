import { Body, Controller, Get, Headers, HttpCode, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { CreatePaymentDto, PaymentWebhookDto } from './dto/payment.dto';
import { PaymentsService } from './payments.service';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get('capabilities')
  @ApiOperation({ summary: 'Доступность онлайн-оплаты без секретных данных' })
  capabilities() { return this.payments.capabilities(); }

  @Post('orders/:orderNumber')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Создать платёж для доступного покупателю заказа' })
  create(@Param('orderNumber') orderNumber: string, @Body() dto: CreatePaymentDto, @Req() request: any, @Headers('x-order-access') accessToken?: string) {
    return this.payments.create(orderNumber, dto, request.user, accessToken);
  }

  @Post('webhook')
  @HttpCode(200)
  @ApiOperation({ summary: 'Уведомление ЮKassa с серверной проверкой платежа' })
  webhook(@Body() dto: PaymentWebhookDto) { return this.payments.webhook(dto); }
}
