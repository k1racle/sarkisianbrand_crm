import { OrderStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateOmsOrderDto {
  @IsEnum(OrderStatus) status!: OrderStatus;
  @IsOptional() @IsString() comment?: string;
  @IsOptional() @IsString() trackingNumber?: string;
  @IsOptional() @IsString() internalNotes?: string;
}
