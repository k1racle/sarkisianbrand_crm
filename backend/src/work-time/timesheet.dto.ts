import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';
import { WorkTimeQueryDto } from './work-time.dto';
export class TimesheetQueryDto extends WorkTimeQueryDto {
  @IsOptional() @IsUUID('4') departmentId?: string;
  @IsOptional() @Transform(({value}) => typeof value === 'string' ? value.trim() : value) @IsString() @MaxLength(80) search?: string;
  @IsOptional() @IsIn(['ALL','ATTENTION']) view: 'ALL'|'ATTENTION' = 'ALL';
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(10000) page = 1;
}
export class TimesheetActionDto extends WorkTimeQueryDto {
  @IsIn(['REVIEW','APPROVE','CLOSE','REOPEN']) action!: 'REVIEW'|'APPROVE'|'CLOSE'|'REOPEN';
  @IsInt() @Min(0) revision!: number;
  @IsUUID('4') requestKey!: string;
  @Transform(({value}) => typeof value === 'string' ? value.trim() : value) @IsString() @MinLength(5) @MaxLength(1000) reason!: string;
}
