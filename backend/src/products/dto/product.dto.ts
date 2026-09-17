import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CatalogQueryDto {
  @IsOptional() @IsString() @MaxLength(647) @Matches(/^[A-Za-z0-9-]{1,80}(?:,[A-Za-z0-9-]{1,80}){0,7}$/) ids?: string;
  @IsOptional() @IsString() @MaxLength(200) search?: string;
  @IsOptional() @IsString() @MaxLength(500) category?: string;
  @IsOptional() @IsString() @MaxLength(500) purpose?: string;
  @IsOptional() @IsString() @MaxLength(500) feature?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(100000000) minPrice?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(100000000) maxPrice?: number;
  @IsOptional() @IsIn(['true', 'false']) inStock?: string;
  @IsOptional() @IsIn(['new', 'popular', 'price-asc', 'price-desc', 'name']) sort?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100000) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
}

export class CreateProductDto {
  @IsString() sku!: string;
  @IsString() nameRu!: string;
  @IsOptional() @IsString() nameEn?: string;
  @IsOptional() @IsString() descriptionRu?: string;
  @IsOptional() @IsString() descriptionEn?: string;
  @IsString() slug!: string;
  @IsNumber() @Min(0) basePrice!: number;
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) @MaxLength(80, { each: true }) purposes?: string[];
  @IsOptional() @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) @MaxLength(80, { each: true }) features?: string[];
}

export class CreateCategoryDto {
  @IsString() nameRu!: string;
  @IsOptional() @IsString() nameEn?: string;
  @IsString() slug!: string;
  @IsOptional() @IsString() parentId?: string;
  @IsOptional() @IsInt() sortOrder?: number;
}
