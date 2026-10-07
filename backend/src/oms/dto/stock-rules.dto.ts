import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';
export const stockChannels = ['WEB','B2B','OZON','WILDBERRIES','YANDEX_MARKET','MEGAMARKET'] as const;
export class StockRuleDto {
 @IsString() @MinLength(1) @MaxLength(120) name!: string;
 @IsIn(['VARIANT','PRODUCT','CATEGORY','GROUP']) targetKind!: string;
 @IsUUID('4') targetId!: string;
 @Transform(({obj,key})=>obj[key]) @IsBoolean() includeChildren = true;
 @Transform(({obj,key})=>obj[key]) @IsInt() @Min(0) @Max(2147483647) threshold!: number;
 @IsIn(['AVAILABLE','PHYSICAL']) basis = 'AVAILABLE';
 @IsArray() @ArrayMinSize(1) @ArrayMaxSize(6) @ArrayUnique() @IsIn(stockChannels, {each:true}) channels!: string[];
 @Transform(({obj,key})=>obj[key]) @IsBoolean() autoResume = true;
 @Transform(({obj,key})=>obj[key]) @IsBoolean() isEnabled = true;
 @IsOptional() @Transform(({obj,key})=>obj[key]) @IsInt() @Min(1) expectedVersion?: number;
}
export class StockGroupDto {
 @IsString() @MinLength(1) @MaxLength(120) name!: string;
 @Transform(({obj,key})=>obj[key]) @IsBoolean() isActive = true;
 @IsArray() @ArrayMinSize(1) @ArrayMaxSize(500) @ArrayUnique() @IsUUID('4',{each:true}) productIds!: string[];
 @IsOptional() @Transform(({obj,key})=>obj[key]) @IsInt() @Min(1) expectedVersion?: number;
}
export class StockRuleVersionDto { @Transform(({obj,key})=>obj[key]) @IsInt() @Min(1) expectedVersion!: number; }
export class StockTargetQueryDto {
 @IsIn(['VARIANT','PRODUCT','CATEGORY','GROUP']) kind!: string;
 @IsOptional() @IsString() @MaxLength(120) search?: string;
}
export class StockFeedQueryDto {
 @IsIn(stockChannels) channel!: string;
 @IsOptional() @IsUUID('4') after?: string;
 @IsOptional() @Type(()=>Number) @IsInt() @Min(1) @Max(100) limit = 100;
}
