import { IsInt, IsOptional, IsString } from 'class-validator';
export class LoyaltyOperationDto { @IsInt() amount!: number; @IsString() reason!: string; @IsOptional() @IsString() orderId?: string; }
