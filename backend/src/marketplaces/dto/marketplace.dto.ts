import { Type } from 'class-transformer';
import { IsArray, IsDefined, IsEmail, IsEnum, IsNumber, IsObject, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { MarketplaceChannel, MarketplaceOrderStatus } from '@prisma/client';

export class UpsertMarketplaceOrderDto {
  @IsEnum(MarketplaceChannel) channel!: MarketplaceChannel;
  @IsString() externalId!: string;
  @IsOptional() @IsEnum(MarketplaceOrderStatus) status?: MarketplaceOrderStatus;
  @IsOptional() @IsString() buyerName?: string;
  @IsOptional() @IsEmail() buyerEmail?: string;
  @IsOptional() @IsString() buyerPhone?: string;
  @IsOptional() @IsString() buyerExternalId?: string;
  @IsNumber() @Min(0) totalAmount!: number;
  @IsOptional() @IsString() deliveryDate?: string;
  @IsOptional() @IsString() trackingNumber?: string;
  @IsDefined() items!: Record<string, unknown> | unknown[];
  @IsOptional() @IsObject() payload?: Record<string, unknown>;
}

export class UpdateMarketplaceOrderDto {
  @IsEnum(MarketplaceOrderStatus) status!: MarketplaceOrderStatus;
  @IsOptional() @IsString() trackingNumber?: string;
  @IsOptional() @IsString() internalNote?: string;
}

export class MarketplaceImportDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpsertMarketplaceOrderDto)
  orders!: UpsertMarketplaceOrderDto[];
}
