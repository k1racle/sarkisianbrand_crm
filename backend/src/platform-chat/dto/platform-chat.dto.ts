import { CrmChatType } from '@prisma/client';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsEnum, IsIn, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';

export class PlatformEntityAttachmentDto {
  @IsIn(['TASK', 'STAGE', 'CUSTOMER', 'PRODUCT']) type!: string;
  @IsUUID() id!: string;
}

export class CreatePlatformMessageDto {
  @IsOptional() @IsString() body?: string;
  @IsOptional() @IsUUID() replyToId?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(8) @ValidateNested({ each: true }) @Type(() => PlatformEntityAttachmentDto)
  entities?: PlatformEntityAttachmentDto[];
}

export class CreatePlatformChannelDto {
  @IsString() name!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsEnum(CrmChatType) type?: CrmChatType;
  @IsOptional() @IsArray() @IsUUID('4', { each: true }) memberIds?: string[];
}
