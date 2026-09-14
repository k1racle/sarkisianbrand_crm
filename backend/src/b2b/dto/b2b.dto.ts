import { IsOptional, IsString } from 'class-validator';

export class CreateB2BProfileDto {
  @IsString() companyName!: string;
  @IsOptional() @IsString() inn?: string;
  @IsOptional() @IsString() kpp?: string;
  @IsOptional() @IsString() legalAddress?: string;
}
