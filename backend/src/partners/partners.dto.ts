import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsEmail, IsIn, IsInt, IsNumber, IsOptional, IsString, IsUUID, IsUrl, Max, MaxLength, Min, MinLength, Matches, ValidateNested, Equals } from 'class-validator';
export type PartnerKind='REFERRAL'|'BLOGGER';
export class PartnerSettingsDto {
 @IsString() @MinLength(1) @MaxLength(100) name!:string;
 @Transform(({obj,key})=>obj[key]) @IsBoolean() isEnabled!:boolean;
 @IsNumber({maxDecimalPlaces:2}) @Min(0) @Max(100) rewardPercent!:number;
 @IsInt() @Min(1) @Max(365) attributionDays!:number;
 @IsInt() @Min(0) @Max(365) holdDays!:number;
 @IsNumber({maxDecimalPlaces:2}) @Min(0) @Max(100000000) minimumOrderAmount!:number;
 @Transform(({obj,key})=>obj[key]) @IsBoolean() firstOrderOnly!:boolean;
 @IsNumber({maxDecimalPlaces:2}) @Min(1) @Max(100000000) minimumPayout!:number;
 @IsNumber({maxDecimalPlaces:2}) @Min(0) @Max(100000000) signupRewardAmount!:number;
 @IsIn(['BONUS','RUB']) signupRewardUnit!:string;
 @IsInt() @Min(0) @Max(365) signupHoldDays!:number;
 @IsString() @MaxLength(6000) termsText!:string;
 @Transform(({obj,key})=>obj[key]) @IsBoolean() autoSettlement!:boolean;
}
export class PartnerChannelDto {
 @IsString() @MinLength(1) @MaxLength(40) label!:string;
 @IsUrl({protocols:['https'],require_protocol:true}) @MaxLength(500) url!:string;
}
export class PartnerJoinDto {
 @IsIn(['REFERRAL','BLOGGER']) kind!:PartnerKind;
 @Transform(({obj,key})=>obj[key]) @Equals(true) acceptedTerms!:boolean;
 @IsString() @MaxLength(80) termsVersion!:string;
 @IsOptional() @IsString() @MaxLength(120) displayName?:string;
 @IsOptional() @IsArray() @ArrayMaxSize(6) @ValidateNested({each:true}) @Type(()=>PartnerChannelDto) channels?:PartnerChannelDto[];
 @IsOptional() @IsString() @MaxLength(2000) description?:string;
}
export class PartnerTrackDto {
 @IsUUID() visitorId!:string;
 @Transform(({obj,key})=>obj[key]) @Equals(true) consent!:boolean;
}
export class PartnerInviteDto {
 @IsEmail() @MaxLength(254) email!:string;
 @IsOptional() @IsString() @MaxLength(120) displayName?:string;
}
export class PartnerParticipantDto {
 @IsIn(['ACTIVE','SUSPENDED','REJECTED']) status!:string;
 @IsOptional() @IsNumber({maxDecimalPlaces:2}) @Min(0) @Max(100) rewardPercent?:number|null;
 @IsString() @MaxLength(500) decisionNote!:string;
}
export class PartnerVerificationDto {
 @Transform(({obj,key})=>obj[key]) @IsBoolean() payoutVerified!:boolean;
 @IsString() @MinLength(3) @MaxLength(500) note!:string;
}
export class PartnerPayoutRequestDto {
 @IsUUID() requestKey!:string;
 @IsNumber({maxDecimalPlaces:2}) @Min(1) @Max(100000000) amount!:number;
 @IsOptional() @IsString() @MaxLength(500) note?:string;
}
export class PartnerPayoutDecisionDto {
 @IsIn(['APPROVED','PAID','REJECTED']) status!:string;
 @IsString() @MinLength(3) @MaxLength(500) note!:string;
 @IsOptional() @IsString() @MinLength(3) @MaxLength(120) @Matches(/\S/) paymentReference?:string;
}
