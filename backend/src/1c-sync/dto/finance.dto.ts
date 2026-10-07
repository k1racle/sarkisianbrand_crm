import { Type } from 'class-transformer';
import { Currency } from '@prisma/client';
import { ArrayMaxSize, ArrayUnique, IsArray, IsBoolean, IsEnum, IsIn, IsInt, IsISO8601, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, ValidateNested } from 'class-validator';
export class OneCDocumentDto {
 @IsString() @Matches(/\S/) @MaxLength(150) id!: string;
 @IsIn(['INVOICE','PAYMENT','REFUND','CORRECTION','SHIPMENT']) kind!: string;
 @IsString() @Matches(/\S/) @MaxLength(150) number!: string;
 @IsISO8601() date!: string;
 @IsIn(['POSTED','CANCELLED']) status!: string;
 @IsString() @Matches(/^(0|[1-9]\d{0,12})\.\d{2}$/) amount!: string;
}
export class OneCRequestResultDto {
 @IsUUID('4') id!: string;
 @IsIn(['RECEIVED','COMPLETED','REJECTED']) status!: string;
 @IsString() @MaxLength(1000) message!: string;
 @IsOptional() @IsString() @MaxLength(150) externalDocumentId?: string;
}
export class OneCFinanceDto {
 @IsUUID('4') platformOrderId!: string;
 @IsString() @Matches(/\S/) @MaxLength(150) external1CId!: string;
 @IsInt() @Min(1) @Max(2147483647) revision!: number;
 @IsString() @Matches(/^[a-f0-9]{64}$/) basisHash!: string;
 @IsISO8601() asOf!: string;
 @IsISO8601() validUntil!: string;
 @IsEnum(Currency) currency!: Currency;
 @IsString() @Matches(/^(0|[1-9]\d{0,12})\.\d{2}$/) total!: string;
 @IsString() @Matches(/^(0|[1-9]\d{0,12})\.\d{2}$/) paid!: string;
 @IsString() @Matches(/^(0|[1-9]\d{0,12})\.\d{2}$/) refunded!: string;
 @IsString() @Matches(/^(0|[1-9]\d{0,12})\.\d{2}$/) debt!: string;
 @IsString() @Matches(/^(0|[1-9]\d{0,12})\.\d{2}$/) refundDue!: string;
 @IsOptional() @IsISO8601() paymentDueAt?: string | null;
 @IsBoolean() releaseAllowed!: boolean;
 @IsString() @MaxLength(1000) releaseReason!: string;
 @IsArray() @ArrayMaxSize(200) @ArrayUnique((v: OneCDocumentDto) => v?.id) @ValidateNested({ each: true }) @Type(() => OneCDocumentDto) documents!: OneCDocumentDto[];
 @IsArray() @ArrayMaxSize(100) @ArrayUnique((v: OneCRequestResultDto) => v?.id) @ValidateNested({ each: true }) @Type(() => OneCRequestResultDto) requests!: OneCRequestResultDto[];
}
export class CreateOneCRequestDto {
 @IsUUID('4') requestKey!: string;
 @IsIn(['INVOICE','RECONCILE','RETURN_REVIEW','TERMS_REVIEW']) kind!: string;
 @IsString() @Matches(/\S/) @MaxLength(1000) comment!: string;
 @IsOptional() @IsUUID('4') operationId?: string;
 @IsISO8601() expectedUpdatedAt!: string;
}
