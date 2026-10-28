import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsIn, IsInt, IsISO8601, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, ValidateNested } from 'class-validator';

export const ONE_C_WAREHOUSE_STATUSES = ['RECEIVED', 'RESERVING', 'RESERVED', 'PARTIAL_RESERVE', 'READY_FOR_PICKING', 'PICKING', 'PICKED', 'CHECKING', 'CHECKED', 'PACKED', 'READY_TO_SHIP', 'PARTIALLY_SHIPPED', 'SHIPPED', 'PARTIALLY_RETURNED', 'RETURNED', 'CANCELLED', 'REJECTED', 'NEEDS_ATTENTION'] as const;
const raw = () => Transform(({obj,key}) => obj[key]);

// Quantities are complete cumulative facts for one order line, not deltas.
export class OneCWarehouseLineDto {
 @raw() @IsUUID('4') orderItemId!: string;
 @Transform(({obj,key}) => obj[key]) @IsInt() @Min(0) @Max(2147483647) reserved!: number;
 @Transform(({obj,key}) => obj[key]) @IsInt() @Min(0) @Max(2147483647) picked!: number;
 @Transform(({obj,key}) => obj[key]) @IsInt() @Min(0) @Max(2147483647) checked!: number;
 @Transform(({obj,key}) => obj[key]) @IsInt() @Min(0) @Max(2147483647) shipped!: number;
 @Transform(({obj,key}) => obj[key]) @IsInt() @Min(0) @Max(2147483647) cancelled!: number;
 @Transform(({obj,key}) => obj[key]) @IsInt() @Min(0) @Max(2147483647) returned!: number;
 @Transform(({obj,key}) => obj[key]) @IsInt() @Min(0) @Max(2147483647) damaged!: number;
}

export class OneCWarehouseDocumentDto {
 @raw() @IsString() @Matches(/\S/) @MaxLength(200) id!: string;
 @raw() @IsString() @Matches(/\S/) @MaxLength(100) kind!: string;
 @raw() @IsOptional() @IsString() @MaxLength(200) number?: string;
 @raw() @IsOptional() @IsString() @MaxLength(100) status?: string;
}

export class OneCWarehouseSnapshotDto {
 @Transform(({obj,key}) => obj[key]) @IsIn([1]) protocolVersion!: number;
 @raw() @IsUUID('4') platformOrderId!: string;
 @raw() @IsString() @Matches(/\S/) @MaxLength(200) external1CId!: string;
 @raw() @IsString() @Matches(/\S/) @MaxLength(200) eventId!: string;
 @Transform(({obj,key}) => obj[key]) @IsInt() @Min(1) @Max(2147483647) revision!: number;
 @Transform(({obj,key}) => obj[key]) @IsOptional() @IsInt() @Min(1) @Max(2147483647) executionVersion?: number;
 @raw() @IsString() @Matches(/^[a-f0-9]{64}$/) basisHash!: string;
 @raw() @IsString() @Matches(/\S/) @MaxLength(200) warehouseId!: string;
 @raw() @IsIn(ONE_C_WAREHOUSE_STATUSES) status!: typeof ONE_C_WAREHOUSE_STATUSES[number];
 @raw() @IsISO8601() asOf!: string;
 @raw() @IsISO8601() validUntil!: string;
 @raw() @IsOptional() @IsString() @Matches(/\S/) @MaxLength(200) documentId?: string;
 @raw() @IsOptional() @IsString() @MaxLength(200) documentNumber?: string;
 @raw() @IsOptional() @IsString() @MaxLength(200) executorName?: string;
 @raw() @IsOptional() @IsString() @MaxLength(1000) error?: string;
 @raw() @IsOptional() @IsString() @Matches(/\S/) @MaxLength(1000) correctionReason?: string;
 @IsArray() @ArrayMinSize(1) @ArrayMaxSize(1000) @ArrayUnique((v: OneCWarehouseLineDto) => v?.orderItemId)
 @ValidateNested({ each: true }) @Type(() => OneCWarehouseLineDto) lines!: OneCWarehouseLineDto[];
 @IsArray() @ArrayMaxSize(200) @ArrayUnique((v: OneCWarehouseDocumentDto) => v?.id)
 @ValidateNested({ each: true }) @Type(() => OneCWarehouseDocumentDto) documents!: OneCWarehouseDocumentDto[];
}
