import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';
export class PaymentPlanFieldsDto {
  @Transform(({value})=>typeof value==='string'?value.trim():value) @IsString() @MinLength(1) @MaxLength(160) title!:string;
  @IsString() @MaxLength(160) vendor!:string;
  @IsIn(['COMMUNICATION','INTERNET','SERVERS','SUBSCRIPTIONS','RENT','OTHER']) category!:string;
  @IsString() @MaxLength(3000) notes!:string;
  @IsInt() @Min(1) @Max(1000000000) amountCents!:number;
  @Matches(/^\d{4}-\d{2}-\d{2}$/) startDate!:string;
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) endDate?:string|null;
  @IsIn(['ONCE','WEEK','MONTH','YEAR']) frequency!:string;
  @IsInt() @Min(1) @Max(36) interval!:number;
  @IsIn(['PERSONAL','DEPARTMENT','COMPANY']) visibility!:string;
}
export class CreatePaymentPlanDto extends PaymentPlanFieldsDto { @IsUUID('4') requestKey!:string; }
export class UpdatePaymentPlanDto extends PaymentPlanFieldsDto { @IsInt() @Min(1) version!:number; }
export class PaymentCalendarQueryDto {
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/) month!:string;
}
export class SetPlannedPaymentDto {
  @IsInt() @Min(1) planVersion!:number;
  @IsInt() @Min(0) version!:number;
  @Matches(/^\d{4}-\d{2}-\d{2}$/) dueDate!:string;
  @Transform(({obj,key})=>obj[key]) @IsBoolean() paid!:boolean;
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) paidOn?:string|null;
  @IsString() @MaxLength(500) reason!:string;
  @IsUUID('4') requestKey!:string;
}
