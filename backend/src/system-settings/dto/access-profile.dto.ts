import { Type } from 'class-transformer';
import { CrmAccessScope } from '@prisma/client';
import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsEnum, IsIn, IsInt, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, ValidateNested } from 'class-validator';

export class AccessProfileGrantDto {
  @IsString() @Matches(/^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/) @MaxLength(100) permissionKey!: string;
  @IsEnum(CrmAccessScope) scope!: CrmAccessScope;
  @IsArray() @ArrayMaxSize(100) @ArrayUnique() @IsUUID('4', { each: true }) departmentIds!: string[];
}
export class CreateAccessProfileDto {
  @IsString() @Matches(/\S/) @MaxLength(80) name!: string;
  @IsString() @MaxLength(1000) description!: string;
  @IsArray() @ArrayMaxSize(300) @ArrayUnique((item: AccessProfileGrantDto) => item?.permissionKey)
  @ValidateNested({ each: true }) @Type(() => AccessProfileGrantDto) grants!: AccessProfileGrantDto[];
}
export class AccessProfileVersionDto {
  @IsInt() @Min(1) version!: number;
}
export class UpdateAccessProfileDto extends CreateAccessProfileDto {
  @IsInt() @Min(1) version!: number;
}
export class AccessProfileQueryDto {
  @IsOptional() @IsIn(['active', 'archived']) status?: 'active' | 'archived';
  @IsOptional() @IsString() @MaxLength(100) search?: string;
  @IsOptional() @IsInt() @Min(1) @Max(100000) page?: number;
}
export class PreviewProfileRefDto extends AccessProfileVersionDto {
  @IsUUID('4') id!: string;
}
export class PreviewAccessProfilesDto {
  @IsUUID('4') employeeId!: string;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(20) @ArrayUnique((item: PreviewProfileRefDto) => item?.id)
  @ValidateNested({ each: true }) @Type(() => PreviewProfileRefDto) profiles!: PreviewProfileRefDto[];
}
export class AssignAccessProfilesDto extends PreviewAccessProfilesDto {
  @IsInt() @Min(1) expectedAccessVersion!: number;
}
export class ResetAccessProfilesDto {
  @IsInt() @Min(1) expectedAccessVersion!: number;
}
