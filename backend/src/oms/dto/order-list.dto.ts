import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { OrderSource, OrderStatus } from '@prisma/client';

export class OmsOrderListDto {
  @IsOptional() @IsIn(['true']) needsReview?: 'true';
  @IsOptional() @IsEnum(OrderSource) source?: OrderSource;
  @IsOptional() @IsEnum(OrderStatus) status?: OrderStatus;
  @IsOptional() @IsString() @MaxLength(200) search?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 30;
}
