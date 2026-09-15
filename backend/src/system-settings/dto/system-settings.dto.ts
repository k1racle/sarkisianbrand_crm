import { UserRole } from '@prisma/client';
import { IsArray, IsBoolean, IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

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
