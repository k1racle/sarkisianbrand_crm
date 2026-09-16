import { IsDefined, IsIn, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreatePaymentDto {
  @IsOptional() @IsString() @MaxLength(2048) returnUrl?: string;
}

export class PaymentWebhookDto {
  @IsString() @IsIn(['notification']) type!: 'notification';
  @IsString() @IsIn(['payment.succeeded', 'payment.canceled', 'payment.waiting_for_capture']) event!: string;
  // No nested whitelist: official payment objects contain additional evolving fields.
  // The service validates/extracts only id and ignores all supplied financial fields.
  @IsDefined() @IsObject() object!: Record<string, unknown>;
}
