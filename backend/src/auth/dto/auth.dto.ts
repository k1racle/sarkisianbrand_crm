import { IsEmail, IsIn, IsObject, IsOptional, IsString, Length, Matches, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(10) password!: string;
  @IsString() @Length(1,80) @Matches(/\S/) firstName!: string;
  @IsString() @Length(0,80) lastName!: string;
  @IsOptional() @IsString() phone?: string;
}

export class LoginDto {
  @IsEmail() email!: string;
  @IsString() password!: string;
}

export class RefreshTokenDto {
  @IsString() refreshToken!: string;
}

export class UpdateOwnProfileDto {
  @IsOptional() @IsString() @Length(2, 2) country?: string;
  @IsOptional() @IsString() @Length(1, 100) city?: string;
  @IsOptional() @IsString() @Length(1, 80) timezone?: string;
  @IsOptional() @IsIn(['ru', 'en', 'kz']) locale?: 'ru' | 'en' | 'kz';
  @IsOptional() @IsObject() notificationPreferences?: Record<string, boolean>;
}

export class RequestProfileChangeDto {
  @IsOptional() @IsString() @Length(1, 80) firstName?: string;
  @IsOptional() @IsString() @Length(1, 80) lastName?: string;
  @IsOptional() @IsString() @Matches(/^\+?[0-9 ()-]{7,24}$/) phone?: string;
  @IsOptional() @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) birthday?: string;
}

export class ChangePasswordDto {
  @IsString() currentPassword!: string;
  @IsString() @MinLength(10) newPassword!: string;
}

export class CompletePasswordResetDto {
  @IsString() @MinLength(32) token!: string;
  @IsString() @MinLength(10) newPassword!: string;
}
