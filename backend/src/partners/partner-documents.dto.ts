import { Transform } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsEmail, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';

export class PartnerLegalProfileDto {
  @IsIn(['SELF_EMPLOYED', 'INDIVIDUAL_ENTREPRENEUR']) taxStatus!: string;
  @IsString() @MinLength(3) @MaxLength(200) fullName!: string;
  @IsString() @Matches(/^(\d{10}|\d{12})$/) inn!: string;
  @IsOptional() @IsString() @Matches(/^\d{15}$/) ogrnip?: string;
  @IsString() @MinLength(5) @MaxLength(500) address!: string;
}

export class PartnerLegalEntityDto {
  @IsIn(['IP', 'LLC']) entityType!: string;
  @IsString() @MinLength(3) @MaxLength(300) legalName!: string;
  @IsString() @Matches(/^\d{10,12}$/) inn!: string;
  @IsOptional() @IsString() @Matches(/^\d{9}$/) kpp?: string;
  @IsOptional() @IsString() @Matches(/^\d{13}$/) ogrn?: string;
  @IsOptional() @IsString() @Matches(/^\d{15}$/) ogrnip?: string;
  @IsString() @MinLength(5) @MaxLength(500) address!: string;
  @IsString() @MinLength(3) @MaxLength(200) signerName!: string;
  @IsOptional() @IsString() @MaxLength(120) signerTitle?: string;
  @IsString() @MinLength(2) @MaxLength(200) signerBasis!: string;
  @IsOptional() @IsEmail() @MaxLength(254) email?: string;
  @Transform(({ obj, key }) => obj[key]) @IsBoolean() isActive!: boolean;
}

export class PartnerGenerateDocumentsDto {
  @IsString() @Matches(/^[0-9a-f-]{36}$/i) entityId!: string;
}

export class PartnerDocumentTemplateDto {
  @IsOptional() @IsString() @MaxLength(80) templateKey?: string;
  @IsString() @MaxLength(80) documentType!: string;
  @IsString() @MinLength(2) @MaxLength(240) title!: string;
  @IsString() @MinLength(1) @MaxLength(50000) bodyHtml!: string;
  @IsOptional() @IsIn(['ALL', 'BLOGGER', 'REFERRAL']) audience?: string;
  @IsOptional() @IsIn(['ALL', 'SELF_EMPLOYED', 'INDIVIDUAL_ENTREPRENEUR']) taxStatus?: string;
  @IsOptional() @IsIn(['ALL', 'IP', 'LLC']) entityType?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class PartnerDocumentSettingsDto {
  @IsOptional() @IsBoolean() pepEnabled?: boolean;
  @IsOptional() @IsIn(['SMS_AERO']) providerKey?: string;
  @IsOptional() @IsInt() @Min(60) @Max(900) codeTtlSeconds?: number;
  @IsOptional() @IsInt() @Min(3) @Max(10) maxAttempts?: number;
  @IsOptional() @IsInt() @Min(30) @Max(600) resendCooldownSeconds?: number;
  @IsOptional() @IsBoolean() consentRequired?: boolean;
  @IsOptional() @IsArray() @ArrayMaxSize(10) @IsString({ each: true }) eligibleDocumentTypes?: string[];
}

export class PartnerAdminGenerateDto extends PartnerGenerateDocumentsDto {
  @IsString() @Matches(/^[0-9a-f-]{36}$/i) participantId!: string;
}
