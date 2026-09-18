import { Type, Transform } from 'class-transformer';
import { ArrayMaxSize, ArrayUnique, IsArray, IsBoolean, IsEmail, IsNumber, IsString, IsUrl, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';
export class SalonSocialLinkDto {
 @IsString() @MinLength(1) @MaxLength(40) label!: string;
 @IsUrl({ protocols: ['https'], require_protocol: true }) @MaxLength(500) url!: string;
}
export class SalonPresentationDto {
 @IsString() @MaxLength(120) displayName!: string;
 @IsString() @MaxLength(500) address!: string;
 @IsArray() @ArrayMaxSize(5) @ArrayUnique() @IsString({ each: true }) @MaxLength(40, { each: true }) phones!: string[];
 @IsArray() @ArrayMaxSize(5) @ArrayUnique() @IsEmail({}, { each: true }) @MaxLength(254, { each: true }) emails!: string[];
 @IsArray() @ArrayMaxSize(8) @ValidateNested({ each: true }) @Type(() => SalonSocialLinkDto) socialLinks!: SalonSocialLinkDto[];
}
export class SalonSubscriptionDto {
 @IsString() @MinLength(1) @MaxLength(100) name!: string;
 @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(1000000) monthlyPrice!: number;
 @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(10000000) annualPrice!: number;
 // Billing and entitlement checks are deliberately not activated in this stage.
 @Transform(({ obj }) => obj.freeAccess) @IsBoolean() freeAccess!: boolean;
}
export class BusinessCompanySettingDto {
 @IsString() @MinLength(1) @MaxLength(120) name!: string;
 @IsString() @MaxLength(250) legalName!: string;
 @IsString() @MaxLength(500) legalAddress!: string;
}
