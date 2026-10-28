import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUUID, Length, Max, Min, ValidateNested } from 'class-validator';
export class StartStudioRunDto { @IsString() @Length(1,50) briefId:string; }
export class StudioCheckpointDto {
  @IsIn(['combined','hardware','classic']) technique:string;
  @IsIn(['clean','remove','push','pocket','cut','polish','shape','buff','base']) step:string;
}
class StudioNailDto { @IsString() @Length(1,30) color:string; @IsString() @Length(1,30) pattern:string; }
export class CompleteStudioRunDto {
  @IsIn(['manicure','pedicure']) kind:string;
  @IsString() @IsOptional() @Length(1,30) shape?:string;
  @IsString() @IsOptional() @Length(1,30) length?:string;
  @IsArray() @ArrayMinSize(5) @ArrayMaxSize(5) @ValidateNested({each:true}) @Type(()=>StudioNailDto) nails:StudioNailDto[];
}
export class BuyStudioRewardDto { @IsString() @Length(1,50) offerId:string; @IsUUID() requestId:string; }
export class SpendStudioCoinsDto { @IsIn(['organizer','lamp','pastel','mousse','speed','polish']) itemId:string; @IsUUID() requestId:string; }
class StudioOfferDto {
  @IsString() @Length(1,50) id:string;
  @IsInt() @Min(1) @Max(50) discountPercent:number;
  @IsInt() @Min(1000) @Max(10000000) coinPrice:number;
  @IsInt() @Min(1) @Max(365) validDays:number;
  @IsInt() @Min(0) @Max(1000000) minimumAmount:number;
  @IsOptional() @IsInt() @Min(1) @Max(1000000) maximumDiscount?:number|null;
  @IsBoolean() isActive:boolean;
}
export class StudioSettingsDto {
  @IsBoolean() enabled:boolean;
  @IsInt() @Min(1) @Max(100) dailyRunLimit:number;
  @IsInt() @Min(30) @Max(600) minimumRunSeconds:number;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(20) @ValidateNested({each:true}) @Type(()=>StudioOfferDto) offers:StudioOfferDto[];
}
