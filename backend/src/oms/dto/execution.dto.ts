import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsDateString, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, ValidateNested } from 'class-validator';

class ExecutionLineDto {
  @IsUUID() itemId!: string;
  @IsInt() @Min(1) @Max(1000000) quantity!: number;
}
export class OrderExecutionDto {
  @IsIn(['CONFIRM', 'PICK', 'SHIP']) kind!: 'CONFIRM' | 'PICK' | 'SHIP';
  @IsUUID() requestKey!: string;
  @IsInt() @Min(0) expectedVersion!: number;
  @IsDateString() expectedUpdatedAt!: string;
  @IsOptional() @IsBoolean() compositionChecked?: boolean;
  @IsOptional() @IsBoolean() pricesChecked?: boolean;
  @IsOptional() @IsBoolean() localWarehouseConfirmed?: boolean;
  @IsOptional() @IsString() @MaxLength(1000) paymentTerms?: string;
  @IsOptional() @IsString() @MaxLength(1000) deliveryTerms?: string;
  @IsOptional() @IsString() @MaxLength(200) trackingNumber?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(200) @ValidateNested({ each: true }) @Type(() => ExecutionLineDto) lines?: ExecutionLineDto[];
}
