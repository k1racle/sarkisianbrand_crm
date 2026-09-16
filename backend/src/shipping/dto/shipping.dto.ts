import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min, MinLength, ValidateIf } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class ShippingAddressDto {
  @IsString() city!: string;
  @IsString() address!: string;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsString() postalCode?: string;
  @IsOptional() @IsInt() @Min(1) weightGrams?: number;
}

export class ShippingEstimateDto {
  @IsIn(['CDEK', 'OZON_DELIVERY']) provider!: 'CDEK' | 'OZON_DELIVERY';
  @IsIn(['COURIER', 'PICKUP_POINT']) deliveryMethod!: 'COURIER' | 'PICKUP_POINT';
  @IsString() @IsNotEmpty() @MaxLength(200) city!: string;
  @ValidateIf(dto => dto.deliveryMethod === 'COURIER') @IsString() @IsNotEmpty() @MaxLength(300) street?: string;
  @ValidateIf(dto => dto.deliveryMethod === 'COURIER') @IsString() @IsNotEmpty() @MaxLength(40) house?: string;
  @IsOptional() @IsString() @MaxLength(100) pickupPointCode?: string;
  @IsOptional() @IsInt() @Min(1) @Max(100000000) cityCode?: number;
}

export class PickupPointsQueryDto {
  @IsOptional() @IsIn(['CDEK', 'OZON_DELIVERY']) provider?: 'CDEK' | 'OZON_DELIVERY';
  @Type(() => Number) @IsInt() @Min(1) @Max(100000000) cityCode!: number;
}

export class ShippingCitiesQueryDto {
  @IsOptional() @IsIn(['CDEK', 'OZON_DELIVERY']) provider?: 'CDEK' | 'OZON_DELIVERY';
  @Transform(({ obj, key }) => typeof obj[key] === 'string' ? obj[key].trim() : obj[key])
  @IsString() @MinLength(2) @MaxLength(100) search!: string;
}
