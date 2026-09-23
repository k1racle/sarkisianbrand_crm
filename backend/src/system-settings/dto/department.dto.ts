import { ArrayMaxSize, ArrayUnique, IsArray, IsIn, IsInt, IsOptional, IsString, IsUUID, MaxLength, Min, MinLength, ValidateIf } from 'class-validator';
import { Transform } from 'class-transformer';

export class DepartmentDto {
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @MinLength(1) @MaxLength(100) name!: string;
  @ValidateIf((_o, v) => v !== undefined && v !== null) @IsUUID() parentId?: string | null;
  @ValidateIf((_o, v) => v !== undefined && v !== null) @IsUUID() leaderId?: string | null;
  @IsArray() @ArrayUnique() @ArrayMaxSize(1000) @IsUUID('all', { each: true }) memberIds!: string[];
}
export class UpdateDepartmentDto extends DepartmentDto {
  @IsInt() @Min(1) version!: number;
}
export class DepartmentVersionDto { @IsInt() @Min(1) version!: number; }
export class DepartmentListDto { @IsOptional() @IsIn(['active', 'archived']) status?: 'active' | 'archived'; }
