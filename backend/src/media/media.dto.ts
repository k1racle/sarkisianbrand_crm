import { Transform, Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

export const MEDIA_MAX_BYTES = 8 * 1024 * 1024;
export const MEDIA_FILENAME_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:jpg|png|webp|avif)$/;
export const MEDIA_INTERNAL_ROLES = ['ADMIN', 'CONTENT_MANAGER', 'MANAGER_SALES', 'MANAGER_B2B', 'MARKETPLACE_MANAGER',
  'SUPERVISOR', 'EXECUTIVE', 'IT_SUPPORT', 'WAREHOUSE', 'CURATOR'];

export class ListMediaDto {
  @IsOptional() @Transform(({ obj, key }) => typeof obj[key] === 'string' ? obj[key].trim() : obj[key]) @IsString() @MaxLength(160) q?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100_000) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
}
export class MediaFilenameDto { @IsString() @Matches(MEDIA_FILENAME_PATTERN) filename: string; }
