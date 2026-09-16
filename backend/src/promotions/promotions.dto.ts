import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsISO8601, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength, ValidateIf } from 'class-validator';

export const PROMO_CODE_PATTERN = /^[A-Z0-9][A-Z0-9_-]{2,39}$/;
const normalize = ({ value }: { value: any }) => typeof value === 'string' ? value.trim().toUpperCase() : value;
// The global implicit-conversion setting must not turn booleans into monetary amounts.
const numeric = ({ value, obj, key }: { value: any; obj: any; key: string }) =>
  obj[key] === null || obj[key] === undefined ? obj[key] : typeof obj[key] === 'number' ? value : Number.NaN;
const boolean = ({ value, obj, key }: { value: any; obj: any; key: string }) =>
  typeof obj[key] === 'boolean' ? value : obj[key];

export class PromoCodeParamDto {
  @Transform(normalize) @IsString() @Matches(PROMO_CODE_PATTERN) code: string;
}

export class CreatePromotionDto {
  @IsOptional() @Transform(normalize) @IsString() @Matches(PROMO_CODE_PATTERN) code?: string;
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @MinLength(1) @MaxLength(160) title: string;
  @IsIn(['PERCENT', 'FIXED']) type: 'PERCENT' | 'FIXED';
  @Transform(numeric) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) @Max(100_000_000) amount: number;
  @ValidateIf((_, value) => value !== undefined)
  @Transform(numeric) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(100_000_000) minimumAmount?: number;
  @IsOptional() @Transform(numeric) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) @Max(100_000_000) maximumDiscount?: number | null;
  @IsOptional() @Transform(numeric) @IsInt() @Min(1) @Max(2_147_483_647) usageLimit?: number | null;
  @ValidateIf((_, value) => value !== undefined)
  @Transform(numeric) @IsInt() @Min(1) @Max(2_147_483_647) perCustomerLimit?: number;
  @ValidateIf((_, value) => value !== undefined)
  @Transform(boolean) @IsBoolean() isActive?: boolean;
  @IsOptional() @IsISO8601({ strict: true }) @Matches(/T.*(?:Z|[+-]\d{2}:\d{2})$/) startsAt?: string | null;
  @IsOptional() @IsISO8601({ strict: true }) @Matches(/T.*(?:Z|[+-]\d{2}:\d{2})$/) endsAt?: string | null;
}

export class UpdatePromotionDto {
  @Transform(numeric) @IsInt() @Min(1) @Max(2_147_483_646) revision: number;
  @ValidateIf((_, value) => value !== undefined)
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @MinLength(1) @MaxLength(160) title?: string;
  @ValidateIf((_, value) => value !== undefined) @IsIn(['PERCENT', 'FIXED']) type?: 'PERCENT' | 'FIXED';
  @ValidateIf((_, value) => value !== undefined)
  @Transform(numeric) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) @Max(100_000_000) amount?: number;
  @ValidateIf((_, value) => value !== undefined)
  @Transform(numeric) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(100_000_000) minimumAmount?: number;
  @IsOptional() @Transform(numeric) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) @Max(100_000_000) maximumDiscount?: number | null;
  @IsOptional() @Transform(numeric) @IsInt() @Min(1) @Max(2_147_483_647) usageLimit?: number | null;
  @ValidateIf((_, value) => value !== undefined)
  @Transform(numeric) @IsInt() @Min(1) @Max(2_147_483_647) perCustomerLimit?: number;
  @ValidateIf((_, value) => value !== undefined) @Transform(boolean) @IsBoolean() isActive?: boolean;
  @IsOptional() @IsISO8601({ strict: true }) @Matches(/T.*(?:Z|[+-]\d{2}:\d{2})$/) startsAt?: string | null;
  @IsOptional() @IsISO8601({ strict: true }) @Matches(/T.*(?:Z|[+-]\d{2}:\d{2})$/) endsAt?: string | null;
}

export class DeletePromotionDto {
  @IsString() @Matches(PROMO_CODE_PATTERN) confirmation: string;
}

export class GeneratePromoCodeDto {
  @ValidateIf((_, value) => value !== undefined)
  @Transform(normalize) @IsString() @Matches(/^[A-Z0-9]{1,12}$/) prefix?: string;
  @ValidateIf((_, value) => value !== undefined)
  @Transform(numeric) @IsInt() @Min(6) @Max(20) length?: number;
}

export class ListPromotionsDto {
  @IsOptional() @IsString() @MaxLength(160) search?: string;
  @IsOptional() @IsIn(['all', 'active', 'inactive', 'scheduled', 'expired']) status?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100_000) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
}
