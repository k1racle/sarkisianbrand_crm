import { IsIn, IsOptional, IsString } from 'class-validator';

export class CreatePaymentDto {
  @IsOptional() @IsString() returnUrl?: string;
}

export class PaymentWebhookDto {
  @IsString() paymentId!: string;
  @IsString() orderNumber!: string;
  @IsString() @IsIn(['SUCCEEDED', 'CANCELED', 'PENDING']) status!: string;
  @IsString() idempotencyKey!: string;
}
