import { DataEntityType } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export class TrashListQueryDto {
  @IsOptional() @IsEnum(DataEntityType) type?: DataEntityType;
  @IsOptional() @IsString() @MaxLength(120) search?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 50;
}

export class LifecycleActionDto {
  @IsOptional() @IsString() @MaxLength(500) reason?: string;
}

export class PurgeDataDto {
  @IsString() @MinLength(1) confirmation!: string;
  @IsString() currentAdminPassword!: string;
}
