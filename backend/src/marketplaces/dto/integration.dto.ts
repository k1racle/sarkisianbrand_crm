import { IsBoolean, IsEnum, IsObject, IsOptional, IsString } from 'class-validator';
import { MarketplaceChannel } from '@prisma/client';

export class SaveMarketplaceIntegrationDto {
  @IsEnum(MarketplaceChannel) channel!: MarketplaceChannel;
  @IsOptional() @IsString() shopName?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsObject() credentials?: Record<string, unknown>;
}
