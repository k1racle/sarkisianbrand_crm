import { CustomerStatus, OrganizationMemberRole, OrganizationStatus } from '@prisma/client';
import { IsBoolean, IsEmail, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class UpdateCustomerDto {
  @IsOptional() @IsString() firstName?: string;
  @IsOptional() @IsString() lastName?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() segment?: string;
  @IsOptional() @IsEnum(CustomerStatus) status?: CustomerStatus;
}

export class CreateOrganizationDto {
  @IsString() name!: string;
  @IsOptional() @IsString() legalName?: string;
  @IsOptional() @IsString() inn?: string;
  @IsOptional() @IsString() kpp?: string;
  @IsOptional() @IsString() legalAddress?: string;
  @IsOptional() @IsEnum(OrganizationStatus) status?: OrganizationStatus;
  @IsOptional() @IsNumber() @Min(0) @Max(100) discountTier?: number;
  @IsOptional() @IsNumber() @Min(0) creditLimit?: number;
  @IsOptional() @IsUUID() accountManagerId?: string;
  @IsOptional() @IsUUID() ownerUserId?: string;
}

export class UpdateOrganizationDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() legalName?: string;
  @IsOptional() @IsString() inn?: string;
  @IsOptional() @IsString() kpp?: string;
  @IsOptional() @IsString() legalAddress?: string;
  @IsOptional() @IsEnum(OrganizationStatus) status?: OrganizationStatus;
  @IsOptional() @IsNumber() @Min(0) @Max(100) discountTier?: number;
  @IsOptional() @IsNumber() @Min(0) creditLimit?: number;
  @IsOptional() @IsUUID() accountManagerId?: string;
}

export class AddOrganizationMemberDto {
  @IsUUID() userId!: string;
  @IsOptional() @IsEnum(OrganizationMemberRole) role?: OrganizationMemberRole;
  @IsOptional() @IsString() jobTitle?: string;
  @IsOptional() @IsBoolean() canOrder?: boolean;
  @IsOptional() @IsBoolean() canSeeFinance?: boolean;
}
