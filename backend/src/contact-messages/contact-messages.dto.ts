import { Equals, IsEmail, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';

export class SubmitContactMessageDto {
  @IsString() @Length(2, 100) name: string;
  @IsString() @Matches(/^\+?[\d()\-\s]{7,25}$/) phone: string;
  @IsEmail() @MaxLength(254) email: string;
  @IsString() @Length(10, 5000) message: string;
  @Equals(true) consent: true;
  @IsOptional() @IsString() @MaxLength(200) website?: string;
}

export class UpdateContactFormSettingDto {
  @IsOptional() @IsEmail() @MaxLength(254) recipientEmail?: string | null;
}
