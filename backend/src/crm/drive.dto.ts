import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
export const DRIVE_MAX_BYTES = 30 * 1024 * 1024;
export class DriveLocationDto {
  @IsOptional() @IsIn(['PERSONAL', 'TEAM']) scope: string = 'PERSONAL';
  @IsOptional() @IsUUID() parentId?: string | null;
}
export class DriveListDto extends DriveLocationDto {
  @IsOptional() @IsString() @MaxLength(160) search?: string;
  @IsOptional() @IsIn(['files', 'recent', 'trash']) view?: string;
  @IsOptional() @IsIn(['name', 'updatedAt', 'size']) sort?: string;
  @IsOptional() @IsIn(['asc', 'desc']) direction?: 'asc' | 'desc';
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(100000) offset?: number;
}
export class DriveFolderDto extends DriveLocationDto { @IsString() @MaxLength(180) name!: string; }
export class DriveUpdateDto {
  @IsOptional() @IsString() @MaxLength(180) name?: string;
  @IsOptional() @IsUUID() parentId?: string | null;
}
export class DriveTaskLinkDto { @IsUUID() nodeId!: string; }
