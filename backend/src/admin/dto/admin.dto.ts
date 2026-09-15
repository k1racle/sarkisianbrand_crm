import { IsArray, IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { OrderStatus } from '@prisma/client';

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus) status!: OrderStatus;
  @IsOptional() @IsString() comment?: string;
}

export class UpdateProductDto {
  @IsOptional() @IsString() nameRu?: string;
  @IsOptional() @IsNumber() @Min(0) price?: number;
  @IsOptional() @IsInt() @Min(0) stock?: number;
  @IsOptional() @IsString() descriptionRu?: string;
  @IsOptional() isActive?: boolean;
  @IsOptional() @IsArray() images?: Array<{ url: string; alt?: string }>;
  @IsOptional() @IsArray() categoryIds?: string[];
  @IsOptional() @IsString() metaTitle?: string;
  @IsOptional() @IsString() metaDesc?: string;
  @IsOptional() @IsString() canonical?: string;
}

export class CreateAdminProductDto {
  @IsString() sku!: string;
  @IsString() nameRu!: string;
  @IsOptional() @IsString() descriptionRu?: string;
  @IsNumber() @Min(0) price!: number;
  @IsInt() @Min(0) stock!: number;
  @IsOptional() @IsString() slug?: string;
  @IsOptional() @IsArray() images?: Array<{ url: string; alt?: string }>;
  @IsOptional() @IsArray() categoryIds?: string[];
  @IsOptional() @IsString() metaTitle?: string;
  @IsOptional() @IsString() metaDesc?: string;
  @IsOptional() @IsString() canonical?: string;
}

export class UpdateStorefrontSettingsDto {
  @IsString() @MaxLength(280) announcementText!: string;
}

export class CreateStorefrontBannerDto {
  @IsOptional() @IsString() @MaxLength(180) title?: string;
  @IsOptional() @IsString() @MaxLength(360) subtitle?: string;
  @IsOptional() @IsString() @MaxLength(80) buttonLabel?: string;
  @IsOptional() @IsString() @MaxLength(500) linkUrl?: string;
  @IsString() @MaxLength(500) imageUrl!: string;
  @IsOptional() @IsString() @MaxLength(500) mobileImageUrl?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsInt() sortOrder?: number;
  @IsOptional() @IsString() startsAt?: string;
  @IsOptional() @IsString() endsAt?: string;
}

export class UpdateStorefrontBannerDto extends CreateStorefrontBannerDto {}

export class UpdateCategoryPresentationDto {
  @IsOptional() @IsString() @MaxLength(500) imageUrl?: string;
  @IsOptional() @IsInt() sortOrder?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
