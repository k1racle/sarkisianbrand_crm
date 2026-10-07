import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsDateString, IsIn, IsInt, IsNotEmpty, IsString, IsUUID, Max, MaxLength, Min, ValidateNested } from 'class-validator';

export class OneCStockPositionDto {
 @IsUUID('4') variantId!: string;
 @IsString() @IsNotEmpty() @MaxLength(200) externalProductId!: string;
 @IsString() @IsNotEmpty() @MaxLength(200) sku!: string;
 @Transform(({obj,key}) => obj[key]) @IsInt() @Min(1) @Max(2147483647) revision!: number;
 // Physical stock includes CRM reservations; free/available stock is not accepted.
 @Transform(({obj,key}) => obj[key]) @IsInt() @Min(0) @Max(2147483647) stock!: number;
 @Transform(({obj,key}) => obj[key]) @IsInt() @Min(0) @Max(2147483647) damagedStock!: number;
 @IsDateString() asOf!: string;
 @IsDateString() validUntil!: string;
 @IsArray() @ArrayMaxSize(5000) @ArrayUnique() @IsUUID('4', { each: true }) includedOperationIds!: string[];
}
export class OneCStockSnapshotsDto {
 @Transform(({obj,key}) => obj[key]) @IsIn([1]) protocolVersion!: number;
 @IsIn(['PHYSICAL_INCLUDING_RESERVED']) stockBasis!: string;
 @IsString() @IsNotEmpty() @MaxLength(200) warehouseId!: string;
 @IsArray() @ArrayMinSize(1) @ArrayMaxSize(100) @ArrayUnique((item: OneCStockPositionDto) => item?.variantId)
 @ValidateNested({ each: true }) @Type(() => OneCStockPositionDto) positions!: OneCStockPositionDto[];
}
