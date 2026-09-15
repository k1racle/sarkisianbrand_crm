import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class StorefrontAddressDto {
  @IsOptional() @IsString() @MaxLength(40) label?: string;
  @IsString() @MinLength(2) @MaxLength(160) recipientName!: string;
  @IsString() @MinLength(7) @MaxLength(30) phone!: string;
  @IsString() @MinLength(2) @MaxLength(120) city!: string;
  @IsString() @MinLength(2) @MaxLength(180) street!: string;
  @IsString() @MinLength(1) @MaxLength(40) house!: string;
  @IsOptional() @IsString() @MaxLength(40) apartment?: string;
  @IsOptional() @IsString() @MaxLength(20) postalCode?: string;
  @IsOptional() @IsBoolean() isDefault?: boolean;
}
