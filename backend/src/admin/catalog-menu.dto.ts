import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsIn, IsInt, IsString, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';

export const CATALOG_QUICK_KEYS = ['new', 'popular', 'gift-card'] as const;
export type CatalogQuickKey = typeof CATALOG_QUICK_KEYS[number];
// Use ORIGINAL raw properties; global implicit conversion must not accept 1 as label or 'false' as true.
const strictText = ({ obj, key }: any) => typeof obj[key] === 'string' ? obj[key].trim() : obj[key];
const strictBoolean = ({ obj, key }: any) => obj[key];
const strictNumber = ({ value, obj, key }: any) => typeof obj[key] === 'number' ? value : Number.NaN;

export class CatalogMenuEntryDto {
  @Transform(strictText) @IsString() @MinLength(1) @MaxLength(128) categoryId: string;
  @Transform(strictText) @IsString() @MinLength(1) @MaxLength(80) label: string;
  @Transform(strictBoolean) @IsBoolean() isVisible: boolean;
}

export class CatalogMenuQuickLinkDto {
  @Transform(strictText) @IsIn(CATALOG_QUICK_KEYS) key: CatalogQuickKey;
  @Transform(strictText) @IsString() @MinLength(1) @MaxLength(80) label: string;
  @Transform(strictBoolean) @IsBoolean() isVisible: boolean;
}

export class UpdateCatalogMenuDto {
  @Transform(strictNumber) @IsInt() @Min(0) @Max(2_147_483_646) revision: number;
  @IsArray() @ArrayMaxSize(200) @ValidateNested({ each: true }) @Type(() => CatalogMenuEntryDto)
  entries: CatalogMenuEntryDto[];
  @IsArray() @ArrayMinSize(3) @ArrayMaxSize(3) @ValidateNested({ each: true }) @Type(() => CatalogMenuQuickLinkDto)
  quickLinks: CatalogMenuQuickLinkDto[];
}
