import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
export class InventoryPageDto {
 @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100000) page = 1;
 @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 30;
}
export class InventoryQueryDto extends InventoryPageDto {
 @IsOptional() @IsString() @MaxLength(200) search?: string;
 @IsOptional() @IsUUID('4') categoryId?: string;
 @IsOptional() @IsIn(['ALL','RESERVED','AVAILABLE','SHORTAGE','EMPTY','DAMAGED']) stock = 'ALL';
 @IsOptional() @IsIn(['ALL','ACTIVE','INACTIVE']) activity = 'ALL';
}
