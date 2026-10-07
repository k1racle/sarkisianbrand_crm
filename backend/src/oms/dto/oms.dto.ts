import { OrderStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString, IsUUID, MaxLength, ValidateIf } from 'class-validator';

export class AssignOrderManagerDto {
  @ValidateIf((_object, value) => value !== null) @IsUUID() managerId!: string | null;
  @ValidateIf((_object, value) => value !== null) @IsUUID() expectedManagerId!: string | null;
}

export class OrderManagerSearchDto {
  @IsOptional() @IsString() @MaxLength(100) search?: string;
}
export class MapMarketplaceItemDto {
  @IsUUID() itemId!: string;
  @IsString() @MaxLength(200) sku!: string;
  @IsDateString() expectedUpdatedAt!: string;
}
export class ResolveMarketplaceImportDto {
  @IsDateString() expectedUpdatedAt!: string;
  @IsDateString() expectedIncomingAt!: string;
  @IsString() @MaxLength(1000) reason!: string;
}

export class UpdateOmsOrderDto {
  @IsOptional() @IsDateString() expectedUpdatedAt?: string;
  @IsEnum(OrderStatus) status!: OrderStatus;
  @IsOptional() @IsString() @MaxLength(1000) comment?: string;
  @IsOptional() @IsString() @MaxLength(200) trackingNumber?: string;
  @IsOptional() @IsString() @MaxLength(5000) internalNotes?: string;
}
