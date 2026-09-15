import { IsArray, IsEnum, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
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
