import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsBoolean, IsIn, IsInt, IsISO8601, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, MinLength, ValidateIf } from 'class-validator';

const numeric = ({ value, obj, key }: any) => typeof obj[key] === 'number' ? value : obj[key] === undefined ? undefined : Number.NaN;
const bool = ({ obj, key }: any) => obj[key];
const trim = ({ value }: any) => typeof value === 'string' ? value.trim() : value;
export const GIFT_CODE_PATTERN = /^(?:[A-Fa-f0-9]-?){31}[A-Fa-f0-9]$/;

export class GiftCardIdDto { @IsUUID() id: string; }

export class SaveGiftCardProductDto {
  @Transform(trim) @IsString() @MinLength(1) @MaxLength(160) nameRu: string;
  @IsString() @MaxLength(20_000) descriptionRu: string;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(30) @ArrayUnique()
  @IsInt({ each: true }) @Min(1, { each: true }) @Max(1_000_000, { each: true }) denominations: number[];
  @ValidateIf((_, v) => v !== undefined) @Transform(numeric) @IsInt() @Min(1) @Max(3650) validityDays?: number;
  @Transform(bool) @IsBoolean() isActive: boolean;
  @IsOptional() @IsString() @MaxLength(2048) imageUrl?: string | null;
}

export class IssueGiftCardDto {
  @Transform(numeric) @IsInt() @Min(1) @Max(1_000_000) nominal: number;
  @ValidateIf((_, v) => v !== undefined) @Transform(numeric) @IsInt() @Min(1) @Max(3650) validityDays?: number;
  @ValidateIf((_, v) => v !== undefined) @Transform(trim) @IsString() @Matches(GIFT_CODE_PATTERN) code?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(160) label?: string | null;
  @Transform(trim) @IsString() @MinLength(1) @MaxLength(500) reason: string;
}

export class UpdateGiftCardDto {
  @Transform(numeric) @IsInt() @Min(1) @Max(2_147_483_646) revision: number;
  @ValidateIf((_, v) => v !== undefined) @Transform(bool) @IsBoolean() isActive?: boolean;
  @ValidateIf((_, v) => v !== undefined) @IsISO8601({ strict: true }) @Matches(/T.*(?:Z|[+-]\d{2}:\d{2})$/) expiresAt?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(160) label?: string | null;
}

export class ListGiftCardsDto {
  @IsOptional() @Transform(trim) @IsString() @MaxLength(160) search?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100_000) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
  @IsOptional() @IsIn(['all', 'active', 'inactive', 'expired']) status?: string;
}
