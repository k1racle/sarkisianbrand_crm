import { IsArray, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class OneCProductDto {
  @IsString() externalId!: string;
  @IsString() sku!: string;
  @IsString() nameRu!: string;
  @IsString() slug!: string;
  @IsNumber() @Min(0) price!: number;
  @IsOptional() @IsNumber() @Min(0) stock?: number;
}

export class OneCProductsSyncDto {
  @IsArray() products!: OneCProductDto[];
}
