import { Body, Controller, Get, Header, Headers, HttpCode, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { CreatePaymentDto, PaymentWebhookDto } from './dto/payment.dto';
import { PaymentsService } from './payments.service';
import { AlternativePaymentsService } from './alternative-payments.service';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService, private readonly alternatives: AlternativePaymentsService) {}

  @Get('capabilities')
  @ApiOperation({ summary: 'Доступность онлайн-оплаты без секретных данных' })
  capabilities() { return this.payments.capabilities(); }

  @Get('providers')
  providers() { return this.alternatives.providers(); }

  @Post('orders/:orderNumber')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Создать платёж для доступного покупателю заказа' })
  create(@Param('orderNumber') orderNumber: string, @Body() dto: CreatePaymentDto, @Req() request: any, @Headers('x-order-access') accessToken?: string) {
    if (dto.provider && dto.provider !== 'YOOKASSA') return this.alternatives.create(dto.provider, orderNumber, dto, request.user, accessToken);
    return this.payments.create(orderNumber, dto, request.user, accessToken);
  }

  @Post('orders/:orderNumber/:provider')
  @UseGuards(OptionalJwtAuthGuard)
  createAlternative(@Param('provider') provider: string, @Param('orderNumber') orderNumber: string, @Body() dto: CreatePaymentDto, @Req() request: any, @Headers('x-order-access') accessToken?: string) {
    return this.alternatives.create(provider, orderNumber, dto, request.user, accessToken);
  }

  @Post('webhook')
  @HttpCode(200)
  @ApiOperation({ summary: 'Уведомление ЮKassa с серверной проверкой платежа' })
  webhook(@Body() dto: PaymentWebhookDto) { return this.payments.webhook(dto); }

  @Post('webhook/robokassa')
  @HttpCode(200)
  @Header('Content-Type', 'text/plain; charset=utf-8')
  robokassaWebhook(@Body() body: Record<string, unknown>) { return this.alternatives.roboResult(body); }

  @Post('webhook/tbank')
  @HttpCode(200)
  @Header('Content-Type', 'text/plain; charset=utf-8')
  tbankWebhook(@Body() body: Record<string, unknown>) { return this.alternatives.tbankResult(body); }
}
