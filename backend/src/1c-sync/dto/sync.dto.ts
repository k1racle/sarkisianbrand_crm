import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsNumber, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';

export class OneCProductDto {
  @IsString() externalId!: string;
  @IsString() sku!: string;
  @IsString() nameRu!: string;
  @IsString() slug!: string;
  @IsNumber() @Min(0) price!: number;
  @IsOptional() @IsNumber() @Min(0) stock?: number;
}

export class OneCProductsSyncDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OneCProductDto)
  products!: OneCProductDto[];
}

export class OneCOrderStatusDto {
  @IsOptional() @IsUUID() platformOrderId?: string;
  @IsOptional() @IsString() external1CId?: string;
  @IsString() status!: string;
  @IsOptional() @IsString() warehouseDocumentId?: string;
  @IsOptional() @IsString() trackingNumber?: string;
  @IsOptional() @IsString() comment?: string;
  @IsOptional() @IsDateString() occurredAt?: string;
}

export class OneCOrderStatusesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OneCOrderStatusDto)
  statuses!: OneCOrderStatusDto[];
}
