import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(8) password!: string;
  @IsString() firstName!: string;
  @IsString() lastName!: string;
  @IsOptional() @IsString() phone?: string;
}

export class LoginDto {
  @IsEmail() email!: string;
  @IsString() password!: string;
}

export class RefreshTokenDto {
  @IsString() refreshToken!: string;
}
