import { ArrayMaxSize, IsArray, IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { OrderStatus } from '@prisma/client';

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus) status!: OrderStatus;
  @IsOptional() @IsString() comment?: string;
}

export class UpdateProductDto {
  @IsOptional() @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) @MaxLength(80, { each: true }) purposes?: string[];
  @IsOptional() @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) @MaxLength(80, { each: true }) features?: string[];
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
  @IsOptional() @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) @MaxLength(80, { each: true }) purposes?: string[];
  @IsOptional() @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) @MaxLength(80, { each: true }) features?: string[];
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

export class CreateStorefrontSocialLinkDto {
  @IsString() @MaxLength(80) name!: string;
  @IsString() @MaxLength(40) iconKey!: string;
  @IsString() @MaxLength(500) url!: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsInt() sortOrder?: number;
}

export class UpdateStorefrontSocialLinkDto extends CreateStorefrontSocialLinkDto {}

export class CreateStorefrontMenuItemDto {
  @IsString() @MaxLength(60) @Matches(/\S/, { message: 'Введите название пункта меню' }) label!: string;
  @IsString() @MaxLength(500)
  @Matches(/^(\/(?!\/)[^\s\\]*|#[^\s\\]+|https?:\/\/[^\s\\]+)$/i, { message: 'Используйте ссылку /страница, /#раздел или https://...' })
  url!: string;
  @IsOptional() @IsBoolean() newTab?: boolean;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsInt() @Min(0) @Max(10000) sortOrder?: number;
}

export class UpdateStorefrontMenuItemDto extends CreateStorefrontMenuItemDto {}

export class StorefrontPageBlockDto {
  @IsString() @MaxLength(80) @Matches(/^[a-zA-Z0-9_-]+$/) id!: string;
  @IsString() @MaxLength(180) title!: string;
  @IsString() @MaxLength(20000) body!: string;
}

export class StorefrontPageContentDto {
  @IsString() @MaxLength(180) @Matches(/\S/) title!: string;
  @IsString() @MaxLength(80) eyebrow!: string;
  @IsString() @MaxLength(1500) lead!: string;
  @IsOptional() @IsString() @MaxLength(320) seoDescription?: string;
  @IsArray() @ArrayMaxSize(40) @ValidateNested({ each: true }) @Type(() => StorefrontPageBlockDto) blocks!: StorefrontPageBlockDto[];
  @IsBoolean() isActive!: boolean;
  @IsBoolean() reviewRequired!: boolean;
}

export class CreateStorefrontPageDto extends StorefrontPageContentDto {
  @IsString() @MaxLength(80) @Matches(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/) slug!: string;
}
export class UpdateStorefrontPageDto extends StorefrontPageContentDto {
  @IsInt() @Min(1) revision!: number;
}

export class UpdateCategoryPresentationDto {
  @IsOptional() @IsString() @MaxLength(500) imageUrl?: string;
  @IsOptional() @IsInt() sortOrder?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
