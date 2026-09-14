import { IsObject, IsOptional, IsString } from 'class-validator';

export class CheckoutDto {
  @IsObject() shippingAddress!: Record<string, unknown>;
  @IsOptional() @IsString() paymentMethod?: string;
  @IsOptional() @IsString() comments?: string;
}
