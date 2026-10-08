import { CustomerStatus, OrganizationMemberRole, OrganizationStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEmail, IsEnum, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

const trimContact = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() || undefined : value;
export class CreateCustomerDto {
  @Transform(trimContact) @IsString() @IsNotEmpty({ message: 'Укажите имя клиента' }) @MaxLength(100) firstName!: string;
  @Transform(trimContact) @IsOptional() @IsString() @MaxLength(100) lastName?: string;
  @Transform(trimContact) @IsOptional() @IsEmail({}, { message: 'Проверьте email клиента' }) @MaxLength(254) email?: string;
  @Transform(trimContact) @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @IsOptional() @IsIn(['B2C', 'B2B', 'Лид']) segment?: string;
  @IsOptional() @IsUUID() accountManagerId?: string | null;
}

export class UpdateCustomerDto {
  @IsOptional() @IsUUID() accountManagerId?: string | null;
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
  @IsOptional() @IsUUID() accountManagerId?: string | null;
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
  @IsOptional() @IsUUID() accountManagerId?: string | null;
}

export class AddOrganizationMemberDto {
  @IsUUID() userId!: string;
  @IsOptional() @IsEnum(OrganizationMemberRole) role?: OrganizationMemberRole;
  @IsOptional() @IsString() jobTitle?: string;
  @IsOptional() @IsBoolean() canOrder?: boolean;
  @IsOptional() @IsBoolean() canSeeFinance?: boolean;
}
