import { ArrayMaxSize, ArrayUnique, IsArray, IsBoolean, IsDateString, IsEnum, IsIn, IsInt, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { OrderStatus } from '@prisma/client';

export class AdminListQueryDto {
  @IsOptional() @IsString() @MaxLength(80) categoryId?:string;
  @IsOptional() @IsIn(['active','hidden']) visibility?:string;
  @IsOptional() @IsIn(['stocked','empty']) availability?:string;
  @IsOptional() @IsIn(['updated','name','sku']) sort?:string;
  @IsOptional() @IsString() @MaxLength(200) q?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100000) page: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit: number = 24;
  @IsOptional() @IsEnum(OrderStatus) status?: OrderStatus;
}
export class BulkProductsDto {
  @IsIn(['publish','hide']) action!:'publish'|'hide';
  @IsArray() @ArrayMaxSize(100) @ArrayUnique() @IsString({each:true}) @MaxLength(80,{each:true}) ids!:string[];
}

export class ReorderStorefrontDto {
  @IsIn(['banners', 'menu', 'social']) collection!: 'banners' | 'menu' | 'social';
  @IsArray() @ArrayMaxSize(200) @ArrayUnique() @IsString({ each: true }) @MaxLength(80, { each: true }) ids!: string[];
}

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus) status!: OrderStatus;
  @IsOptional() @IsString() comment?: string;
}

export class AdminProductImageDto {
  @IsString() @MaxLength(500) @Matches(/^(?:\/(?!\/)[^\s\\]*|https?:\/\/[^\s\\]+)$/i) url!:string;
  @IsOptional() @IsString() @MaxLength(200) alt?:string;
}
export class UpdateProductDto {
  @IsOptional() @IsNumber({maxDecimalPlaces:2}) @Min(0) @Max(100000000) salePrice?: number | null;
  @IsOptional() @IsDateString() saleStartsAt?: string | null;
  @IsOptional() @IsDateString() saleEndsAt?: string | null;
  @IsOptional() @IsArray() @ArrayMaxSize(30) @ArrayUnique() @IsString({each:true}) @Matches(/^[a-z][a-z0-9-]{0,39}$/, {each:true}) badgeIds?: string[];
  @IsOptional() @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) @MaxLength(80, { each: true }) purposes?: string[];
  @IsOptional() @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) @MaxLength(80, { each: true }) features?: string[];
  @IsOptional() @IsString() @MaxLength(180) @Matches(/\S/) nameRu?: string;
  @IsOptional() @IsNumber({maxDecimalPlaces:2}) @Min(0) @Max(100000000) price?: number;
  @IsOptional() @IsInt() @Min(0) @Max(100000000) stock?: number;
  @IsOptional() @IsString() @MaxLength(20000) descriptionRu?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsArray() @ArrayMaxSize(100) @ValidateNested({each:true}) @Type(()=>AdminProductImageDto) images?: AdminProductImageDto[];
  @IsOptional() @IsArray() @ArrayMaxSize(100) @ArrayUnique() @IsString({each:true}) @MaxLength(80,{each:true}) categoryIds?: string[];
  @IsOptional() @IsString() metaTitle?: string;
  @IsOptional() @IsString() metaDesc?: string;
  @IsOptional() @IsString() canonical?: string;
}

export class CreateAdminProductDto {
  @IsOptional() @IsNumber({maxDecimalPlaces:2}) @Min(0) @Max(100000000) salePrice?: number | null;
  @IsOptional() @IsDateString() saleStartsAt?: string | null;
  @IsOptional() @IsDateString() saleEndsAt?: string | null;
  @IsOptional() @IsArray() @ArrayMaxSize(30) @ArrayUnique() @IsString({each:true}) @Matches(/^[a-z][a-z0-9-]{0,39}$/, {each:true}) badgeIds?: string[];
  @IsOptional() @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) @MaxLength(80, { each: true }) purposes?: string[];
  @IsOptional() @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) @MaxLength(80, { each: true }) features?: string[];
  @IsString() @MaxLength(80) @Matches(/\S/) sku!: string;
  @IsString() @MaxLength(180) @Matches(/\S/) nameRu!: string;
  @IsOptional() @IsString() @MaxLength(20000) descriptionRu?: string;
  @IsNumber({maxDecimalPlaces:2}) @Min(0) @Max(100000000) price!: number;
  @IsInt() @Min(0) @Max(100000000) stock!: number;
  @IsOptional() @IsString() slug?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(100) @ValidateNested({each:true}) @Type(()=>AdminProductImageDto) images?: AdminProductImageDto[];
  @IsOptional() @IsArray() @ArrayMaxSize(100) @ArrayUnique() @IsString({each:true}) @MaxLength(80,{each:true}) categoryIds?: string[];
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
  @IsOptional() @IsDateString() startsAt?: string;
  @IsOptional() @IsDateString() endsAt?: string;
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
