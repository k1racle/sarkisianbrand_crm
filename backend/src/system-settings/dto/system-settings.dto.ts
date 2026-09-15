import { BotAudience, IntegrationEnvironment, ProfileChangeStatus, UserRole } from '@prisma/client';
import { IsArray, IsBoolean, IsEmail, IsEnum, IsIn, IsInt, IsObject, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';

const employeeRoles = [
  UserRole.ADMIN, UserRole.CONTENT_MANAGER, UserRole.MANAGER_B2B, UserRole.MANAGER_SALES,
  UserRole.MARKETPLACE_MANAGER, UserRole.SUPERVISOR, UserRole.EXECUTIVE, UserRole.IT_SUPPORT,
  UserRole.CURATOR, UserRole.WAREHOUSE,
] as const;

export class CreateEmployeeDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(10) password!: string;
  @IsString() @MinLength(1) firstName!: string;
  @IsOptional() @IsString() lastName?: string;
  @IsIn(employeeRoles) role!: UserRole;
}

export class UpdateEmployeeDto {
  @IsOptional() @IsString() @MinLength(1) firstName?: string;
  @IsOptional() @IsString() lastName?: string;
  @IsOptional() @IsIn(employeeRoles) role?: UserRole;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpdateEmployeePermissionsDto {
  @IsArray() @IsString({ each: true }) allow!: string[];
  @IsArray() @IsString({ each: true }) deny!: string[];
}

export class AccountListQueryDto {
  @IsOptional() @IsIn(['ALL', 'STAFF', 'B2C', 'B2B']) type?: 'ALL' | 'STAFF' | 'B2C' | 'B2B';
  @IsOptional() @IsString() @MaxLength(120) search?: string;
  @IsOptional() @IsInt() @Min(1) page?: number;
  @IsOptional() @IsInt() @Min(10) @Max(100) limit?: number;
}

export class UpdateAccountDto {
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(80) firstName?: string;
  @IsOptional() @IsString() @MaxLength(80) lastName?: string;
  @IsOptional() @IsString() @Matches(/^\+?[0-9 ()-]{7,24}$/) phone?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class SetTemporaryPasswordDto {
  @IsString() currentAdminPassword!: string;
  @IsString() @MinLength(10) temporaryPassword!: string;
}

export class ReviewProfileChangeDto {
  @IsIn([ProfileChangeStatus.APPROVED, ProfileChangeStatus.REJECTED]) status!: ProfileChangeStatus;
  @IsOptional() @IsString() @MaxLength(500) comment?: string;
}

export class UpdateIntegrationDto {
  @IsOptional() @IsBoolean() isEnabled?: boolean;
  @IsOptional() @IsEnum(IntegrationEnvironment) environment?: IntegrationEnvironment;
  @IsOptional() @IsObject() config?: Record<string, unknown>;
  @IsOptional() @IsObject() secrets?: Record<string, unknown>;
  @IsOptional() @IsArray() @IsString({ each: true }) clearSecrets?: string[];
}

export class CreateBotCommandDto {
  @IsString() @Matches(/^\/?[a-z0-9_]{2,32}$/) command!: string;
  @IsString() @MinLength(2) @MaxLength(80) title!: string;
  @IsOptional() @IsString() @MaxLength(300) description?: string;
  @IsArray() @IsEnum(BotAudience, { each: true }) audiences!: BotAudience[];
  @IsArray() @IsIn(['TELEGRAM', 'MAX', 'VK'], { each: true }) channels!: string[];
  @IsString() @Matches(/^[A-Z0-9_]{2,64}$/) handlerKey!: string;
  @IsOptional() @IsString() @MaxLength(2000) responseTemplate?: string;
  @IsOptional() @IsBoolean() requiresAuth?: boolean;
  @IsOptional() @IsBoolean() isEnabled?: boolean;
  @IsOptional() @IsInt() @Min(0) @Max(10000) sortOrder?: number;
}

export class UpdateBotCommandDto {
  @IsOptional() @IsString() @Matches(/^\/?[a-z0-9_]{2,32}$/) command?: string;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(80) title?: string;
  @IsOptional() @IsString() @MaxLength(300) description?: string;
  @IsOptional() @IsArray() @IsEnum(BotAudience, { each: true }) audiences?: BotAudience[];
  @IsOptional() @IsArray() @IsIn(['TELEGRAM', 'MAX', 'VK'], { each: true }) channels?: string[];
  @IsOptional() @IsString() @Matches(/^[A-Z0-9_]{2,64}$/) handlerKey?: string;
  @IsOptional() @IsString() @MaxLength(2000) responseTemplate?: string;
  @IsOptional() @IsBoolean() requiresAuth?: boolean;
  @IsOptional() @IsBoolean() isEnabled?: boolean;
  @IsOptional() @IsInt() @Min(0) @Max(10000) sortOrder?: number;
}

export class UpsertBotIdentityDto {
  @IsIn(['TELEGRAM', 'MAX', 'VK']) provider!: string;
  @IsEnum(BotAudience) audience!: BotAudience;
  @IsString() @MinLength(1) @MaxLength(160) externalUserId!: string;
  @IsOptional() @IsString() @MaxLength(160) externalChatId?: string;
  @IsOptional() @IsString() @MaxLength(160) displayName?: string;
  @IsOptional() @IsUUID() userId?: string;
  @IsOptional() @IsUUID() customerId?: string;
  @IsOptional() @IsUUID() organizationId?: string;
  @IsOptional() @IsBoolean() isVerified?: boolean;
}
