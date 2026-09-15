import { Type } from 'class-transformer';
import { B2BBookingStatus, B2BClientStatus, TicketPriority } from '@prisma/client';
import { IsArray, IsBoolean, IsDateString, IsEmail, IsEnum, IsHexColor, IsInt, IsNumber, IsObject, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';

export class CreateB2BProfileDto {
  @IsString() @MinLength(2) @MaxLength(160) companyName!: string;
  @IsOptional() @IsString() @MaxLength(12) inn?: string;
  @IsOptional() @IsString() @MaxLength(9) kpp?: string;
  @IsOptional() @IsString() @MaxLength(500) legalAddress?: string;
}

export class CreateB2BClientDto {
  @IsString() @MinLength(1) @MaxLength(80) firstName!: string;
  @IsOptional() @IsString() @MaxLength(80) lastName?: string;
  @IsOptional() @IsString() @MaxLength(30) phone?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsDateString() birthday?: string;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
  @IsOptional() @IsBoolean() personalDataConsent?: boolean;
}

export class UpdateB2BClientDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(80) firstName?: string;
  @IsOptional() @IsString() @MaxLength(80) lastName?: string;
  @IsOptional() @IsString() @MaxLength(30) phone?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsDateString() birthday?: string;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
  @IsOptional() @IsEnum(B2BClientStatus) status?: B2BClientStatus;
  @IsOptional() @IsBoolean() personalDataConsent?: boolean;
}

export class CreateB2BServiceDto {
  @IsString() @MinLength(2) @MaxLength(120) name!: string;
  @IsOptional() @IsString() @MaxLength(1000) description?: string;
  @IsInt() @Min(10) @Max(1440) duration!: number;
  @IsNumber() @Min(0) price!: number;
  @IsOptional() @IsHexColor() color?: string;
}

export class UpdateB2BServiceDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(120) name?: string;
  @IsOptional() @IsString() @MaxLength(1000) description?: string;
  @IsOptional() @IsInt() @Min(10) @Max(1440) duration?: number;
  @IsOptional() @IsNumber() @Min(0) price?: number;
  @IsOptional() @IsHexColor() color?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class CreateB2BBookingDto {
  @IsUUID() clientId!: string;
  @IsUUID() serviceId!: string;
  @IsOptional() @IsUUID() masterMemberId?: string;
  @IsDateString() startTime!: string;
  @IsOptional() @IsString() @MaxLength(1000) notes?: string;
}

export class UpdateB2BBookingDto {
  @IsOptional() @IsEnum(B2BBookingStatus) status?: B2BBookingStatus;
  @IsOptional() @IsUUID() masterMemberId?: string;
  @IsOptional() @IsDateString() startTime?: string;
  @IsOptional() @IsString() @MaxLength(1000) notes?: string;
}

export class B2BOrderItemDto {
  @IsUUID() variantId!: string;
  @IsInt() @Min(1) @Max(10000) quantity!: number;
}

export class CreateB2BOrderDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => B2BOrderItemDto) items!: B2BOrderItemDto[];
  @IsOptional() @IsObject() shippingAddress?: Record<string, unknown>;
  @IsOptional() @IsString() @MaxLength(1000) comments?: string;
}

export class CreateB2BSupportDto {
  @IsString() @MinLength(4) @MaxLength(180) subject!: string;
  @IsString() @MinLength(10) @MaxLength(5000) description!: string;
  @IsOptional() @IsEnum(TicketPriority) priority?: TicketPriority;
}
