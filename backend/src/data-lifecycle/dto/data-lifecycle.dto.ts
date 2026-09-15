import { DataEntityType } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class TrashListQueryDto {
  @IsOptional() @IsEnum(DataEntityType) type?: DataEntityType;
  @IsOptional() @IsString() @MaxLength(120) search?: string;
}

export class LifecycleActionDto {
  @IsOptional() @IsString() @MaxLength(500) reason?: string;
}

export class PurgeDataDto {
  @IsString() @MinLength(1) confirmation!: string;
  @IsString() currentAdminPassword!: string;
}
