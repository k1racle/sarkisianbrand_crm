import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsDateString, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';

class AdjustmentLineDto {
  @IsUUID() itemId!: string;
  @IsInt() @Min(1) @Max(1000000) quantity!: number;
  @IsOptional() @IsInt() @Min(0) @Max(1000000) damagedQuantity?: number;
}
export class OrderAdjustmentDto {
  @IsIn(['CANCEL_REMAINDER', 'RETURN']) kind!: 'CANCEL_REMAINDER' | 'RETURN';
  @IsUUID() requestKey!: string;
  @IsInt() @Min(1) expectedVersion!: number;
  @IsDateString() expectedUpdatedAt!: string;
  @IsString() @MinLength(1) @MaxLength(1000) reason!: string;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(200) @ValidateNested({ each: true }) @Type(() => AdjustmentLineDto) lines!: AdjustmentLineDto[];
}
