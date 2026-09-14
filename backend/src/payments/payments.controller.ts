import { Body, Controller, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreatePaymentDto, PaymentWebhookDto } from './dto/payment.dto';
import { PaymentsService } from './payments.service';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('orders/:orderNumber')
  @ApiOperation({ summary: 'Создать платёж для заказа' })
  create(@Param('orderNumber') orderNumber: string, @Body() dto: CreatePaymentDto) { return this.payments.create(orderNumber, dto); }

  @Post('webhook')
  @ApiOperation({ summary: 'Webhook платёжного провайдера' })
  webhook(@Body() dto: PaymentWebhookDto) { return this.payments.webhook(dto); }
}
