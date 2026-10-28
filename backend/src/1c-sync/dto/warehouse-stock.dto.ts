import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsIn, IsInt, IsISO8601, IsString, IsUUID, Matches, Max, MaxLength, Min, ValidateNested } from 'class-validator';

const raw = () => Transform(({obj,key}) => obj[key]);

export class OneCWarehouseStockPositionDto {
 @raw() @IsUUID('4') variantId!: string;
 @raw() @IsString() @Matches(/\S/) @MaxLength(200) externalProductId!: string;
 @raw() @IsString() @Matches(/\S/) @MaxLength(200) sku!: string;
 @raw() @IsInt() @Min(1) @Max(2147483647) revision!: number;
 // Good physical stock already includes reserved1C. Damaged stock is separate.
 @raw() @IsInt() @Min(0) @Max(2147483647) stock!: number;
 @raw() @IsInt() @Min(0) @Max(2147483647) damagedStock!: number;
 @raw() @IsInt() @Min(0) @Max(2147483647) reserved1C!: number;
 @raw() @IsISO8601() asOf!: string;
 @raw() @IsISO8601() validUntil!: string;
 @IsArray() @ArrayMaxSize(5000) @ArrayUnique() @IsString({each:true}) @Matches(/\S/,{each:true}) @MaxLength(200,{each:true}) coveredEventIds!: string[];
}

export class OneCWarehouseStocksDto {
 @raw() @IsIn([2]) protocolVersion!: number;
 @raw() @IsIn(['PHYSICAL_INCLUDING_RESERVED']) stockBasis!: string;
 @raw() @IsString() @Matches(/\S/) @MaxLength(200) warehouseId!: string;
 @IsArray() @ArrayMinSize(1) @ArrayMaxSize(100) @ArrayUnique((item:OneCWarehouseStockPositionDto)=>item?.variantId)
 @ValidateNested({each:true}) @Type(()=>OneCWarehouseStockPositionDto) positions!: OneCWarehouseStockPositionDto[];
}
