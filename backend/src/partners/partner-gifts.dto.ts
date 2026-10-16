import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsEmail, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';

class PartnerGiftLineDto {
  @IsUUID() variantId!: string;
  @IsInt() @Min(1) @Max(100) quantity!: number;
}

export class CreatePartnerGiftDto {
  @IsUUID() requestKey!: string;
  @IsUUID() participantId!: string;
  @IsString() @MaxLength(180) recipientName!: string;
  @IsString() @MaxLength(40) recipientPhone!: string;
  @IsOptional() @IsEmail() @MaxLength(180) recipientEmail?: string;
  @IsString() @MinLength(10) @MaxLength(500) deliveryAddress!: string;
  @IsOptional() @IsString() @MaxLength(100) deliveryService?: string;
  @IsOptional() @IsString() @MaxLength(1000) note?: string;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(30) @ValidateNested({ each: true }) @Type(() => PartnerGiftLineDto) items!: PartnerGiftLineDto[];
}
