import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

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
}

export class CreateCategoryDto {
  @IsString() nameRu!: string;
  @IsOptional() @IsString() nameEn?: string;
  @IsString() slug!: string;
  @IsOptional() @IsString() parentId?: string;
  @IsOptional() @IsInt() sortOrder?: number;
}
