import { IsIn, IsInt, IsISO8601, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min } from 'class-validator';
export class OrderFinanceDto {
 @IsIn(['RECEIPT','REFUND','CREDIT','REVERSAL','TERMS']) kind!: string;
 @IsUUID('4') requestKey!: string;
 @IsInt() @Min(1) expectedVersion!: number;
 @IsISO8601() expectedUpdatedAt!: string;
 @IsString() @Matches(/^(0|[1-9]\d{0,12})\.\d{2}$/) amount!: string;
 @IsString() @Matches(/\S/) @MaxLength(200) document!: string;
 @IsString() @Matches(/\S/) @MaxLength(1000) reason!: string;
 @IsISO8601() occurredAt!: string;
 @IsOptional() @IsUUID('4') operationId?: string;
 @IsOptional() @IsUUID('4') reversesId?: string;
 @IsOptional() @IsISO8601() paymentDueAt?: string | null;
}
export class ReceivablesQueryDto {
 @IsOptional() @IsInt() @Min(1) @Max(100000) page?: number;
 @IsOptional() @IsString() @MaxLength(150) search?: string;
}
