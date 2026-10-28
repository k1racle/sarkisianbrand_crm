import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, ArrayUnique, IsArray, IsDateString, IsIn, IsInt, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';

export class MeetingFieldsDto {
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @MinLength(1) @MaxLength(160) title!: string;
  @IsString() @MaxLength(5000) agenda!: string;
  @IsIn(['TEAM', 'MEETING', 'EVENT', 'INTERVIEW', 'OTHER']) kind!: string;
  @IsOptional() @Transform(({value}) => typeof value === 'string' ? value.trim() : value)
  @IsString() @MaxLength(500) location: string = '';
  @IsOptional() @IsString() @MaxLength(2000) meetingUrl: string = '';
  @IsOptional() @Type(() => Number) @IsInt() @IsIn([0,5,15,30,60,1440]) reminderMinutes: number = 30;
  @IsDateString({ strict: true }) @Matches(/(?:Z|[+-]\d{2}:\d{2})$/) startsAt!: string;
  @IsDateString({ strict: true }) @Matches(/(?:Z|[+-]\d{2}:\d{2})$/) endsAt!: string;
  @IsString() @MaxLength(80) timezone!: string;
  @IsArray() @ArrayMaxSize(199) @ArrayUnique() @IsUUID('4', { each: true }) memberIds!: string[];
}
export class CreateMeetingDto extends MeetingFieldsDto { @IsUUID('4') requestKey!: string; }
export class UpdateMeetingDto extends MeetingFieldsDto { @IsInt() @Min(1) version!: number; }
export class CancelMeetingDto {
  @IsInt() @Min(1) version!: number;
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @MinLength(1) @MaxLength(500) reason!: string;
}
export class MeetingListDto {
  @IsDateString({ strict: true }) @Matches(/(?:Z|[+-]\d{2}:\d{2})$/) from!: string;
  @IsDateString({ strict: true }) @Matches(/(?:Z|[+-]\d{2}:\d{2})$/) to!: string;
  @IsOptional() @IsIn(['SCHEDULED', 'CANCELLED', 'ALL']) status?: string;
  @IsOptional() @IsString() @MaxLength(120) q?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(1000000) page: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit: number = 30;
  @IsOptional() @IsIn(['true','false']) mine?: string;
}
export class RespondMeetingDto {
  @IsInt() @Min(1) version!: number;
  @IsIn(['ACCEPTED','DECLINED']) response!: string;
  @IsOptional() @Transform(({value}) => typeof value === 'string' ? value.trim() : value)
  @IsString() @MaxLength(1000) reason: string = '';
}
