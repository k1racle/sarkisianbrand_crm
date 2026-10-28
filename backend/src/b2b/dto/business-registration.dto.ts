import { IsEmail, IsOptional, IsString, Length, Matches, MaxLength, MinLength } from 'class-validator';
import { CreateB2BProfileDto } from './b2b.dto';

export class BusinessOwnerRegistrationDto extends CreateB2BProfileDto {
  @IsEmail() @MaxLength(254) email!: string;
  @IsString() @MinLength(10) @MaxLength(128) password!: string;
  @IsString() @Length(1,80) @Matches(/\S/) firstName!: string;
  @IsString() @Length(0,80) lastName!: string;
  @IsOptional() @IsString() @Matches(/^\+?[\d ()-]{8,24}$/) phone?: string;
}
