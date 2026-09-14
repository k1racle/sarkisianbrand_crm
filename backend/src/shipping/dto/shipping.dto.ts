import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class ShippingAddressDto {
  @IsString() city!: string;
  @IsString() address!: string;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsString() postalCode?: string;
  @IsOptional() @IsInt() @Min(1) weightGrams?: number;
}
