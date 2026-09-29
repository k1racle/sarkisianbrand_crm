import { IsIn, IsInt, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class ScheduleFieldsDto {
  @IsIn(['SHIFT', 'DAY_OFF', 'ABSENCE']) kind: string;
  @IsString() @Matches(/^20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}$/) startLocal: string;
  @IsString() @Matches(/^20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}$/) endLocal: string;
  @IsString() @MinLength(1) @MaxLength(80) timezone: string;
  @IsInt() @Min(0) @Max(1439) breakMinutes: number;
  @IsString() @MaxLength(1000) note: string;
}
export class CreateScheduleDto extends ScheduleFieldsDto {
  @IsUUID('4') employeeId: string;
  @IsUUID('4') requestKey: string;
}
export class UpdateScheduleDto extends ScheduleFieldsDto {
  @IsInt() @Min(1) version: number;
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value) @IsString() @MinLength(1) @MaxLength(500) reason: string;
}
export class ScheduleTransitionDto {
  @IsInt() @Min(1) version: number;
  @IsIn(['PUBLISHED', 'CANCELLED']) status: string;
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value) @IsString() @MinLength(1) @MaxLength(500) reason: string;
}
export class ScheduleQueryDto {
  @IsString() @Matches(/^20\d{2}-(0[1-9]|1[0-2])$/) month: string;
  @IsOptional() @IsUUID('4') employeeId?: string;
  @IsOptional() @IsUUID('4') departmentId?: string;
  @IsOptional() @IsIn(['DRAFT', 'PUBLISHED', 'CANCELLED']) status?: string;
}

export class CreateWorkPatternDto {
  @IsUUID('4') employeeId: string;
  @IsUUID('4') requestKey: string;
  @IsIn(['WEEKDAYS', 'CYCLE_5_2', 'CYCLE_2_2', 'CYCLE_3_3']) pattern: string;
  @IsString() @Matches(/^20\d{2}-\d{2}-\d{2}$/) startDate: string;
  @IsOptional() @IsString() @Matches(/^20\d{2}-\d{2}-\d{2}$/) endDate?: string | null;
  @IsString() @Matches(/^([01]\d|2[0-3]):[0-5]\d$/) startTime: string;
  @IsString() @Matches(/^([01]\d|2[0-3]):[0-5]\d$/) endTime: string;
  @IsString() @MinLength(1) @MaxLength(80) timezone: string;
  @IsInt() @Min(0) @Max(1439) breakMinutes: number;
  @IsString() @MaxLength(1000) note: string;
  @IsIn(['DRAFT', 'PUBLISHED']) status: string;
}
export class WorkPatternActionDto {
  @IsInt() @Min(1) version: number;
  @IsIn(['PUBLISH', 'END', 'CANCEL']) action: string;
  @IsOptional() @IsString() @Matches(/^20\d{2}-\d{2}-\d{2}$/) endDate?: string;
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value) @IsString() @MinLength(1) @MaxLength(500) reason: string;
}
