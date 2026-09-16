import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEmail, IsIn, IsNumber, IsObject, IsOptional, IsString, Length, Matches, Max, Min, MaxLength, ValidateNested } from 'class-validator';
import { GIFT_CODE_PATTERN } from '../../gift-cards/gift-cards.dto';

export class CheckoutContactDto {
  @IsString() @Length(1, 100) @Matches(/\S/, { message: 'Укажите имя' }) firstName!: string;
  @IsOptional() @IsString() @Length(0, 100) lastName?: string;
  @IsEmail() @Length(3, 254) email!: string;
  @IsString() @Matches(/^(?=(?:\D*\d){7,})\+?[\d\s()-]{7,24}$/, { message: 'Введите корректный телефон' }) phone!: string;
}

export class CheckoutDto {
  @IsOptional() @IsObject() shippingAddress?: Record<string, unknown>;
  @IsOptional() @ValidateNested() @Type(() => CheckoutContactDto) contact?: CheckoutContactDto;
  @IsOptional() @IsIn(['COURIER', 'PICKUP_POINT', 'DIGITAL']) deliveryMethod?: 'COURIER' | 'PICKUP_POINT' | 'DIGITAL';
  @IsOptional() @IsString() paymentMethod?: string;
  @IsOptional() @IsString() comments?: string;
  @IsOptional() @IsIn(['CDEK', 'OZON_DELIVERY']) shippingProvider?: 'CDEK' | 'OZON_DELIVERY';
  @IsOptional() @IsString() @MaxLength(80) shippingQuoteId?: string;
  @IsOptional() @IsString() @MaxLength(40) promoCode?: string;
  @IsOptional() @IsString() @MaxLength(100) @Matches(GIFT_CODE_PATTERN, { message: 'Неверный формат сертификата' }) giftCardCode?: string;
  // Preserve JSON boolean values: implicit conversion would treat "false" as true.
  @IsOptional() @Transform(({ obj, key }) => obj[key]) @IsBoolean() useBonuses?: boolean;
  @IsOptional() @Transform(({ obj, key }) => obj[key]) @IsBoolean() acceptedTerms?: boolean;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(100000000) expectedTotal?: number;
}
