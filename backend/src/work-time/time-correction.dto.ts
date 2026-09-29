import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsIn, IsInt, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';
const trim = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value;
export class CorrectionIntervalDto {
  @Matches(/^20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}$/) startLocal!: string;
  @Matches(/^20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}$/) endLocal!: string;
}
export class CreateTimeCorrectionDto extends CorrectionIntervalDto {
  @IsUUID('4') requestKey!: string;
  @IsOptional() @IsUUID('4') sessionId?: string;
  @IsOptional() @IsInt() @Min(1) baseVersion?: number;
  @IsString() @MinLength(1) @MaxLength(80) timezone!: string;
  @Transform(trim) @IsString() @MinLength(5) @MaxLength(1000) reason!: string;
  @IsArray() @ArrayMaxSize(24) @ValidateNested({ each: true }) @Type(() => CorrectionIntervalDto) breaks!: CorrectionIntervalDto[];
}
export class TimeCorrectionQueryDto {
  @IsOptional() @IsIn(['MINE','REVIEW']) scope: 'MINE' | 'REVIEW' = 'MINE';
  @IsOptional() @IsIn(['PENDING','APPROVED','REJECTED','CANCELLED']) status?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(10000) page = 1;
}
export class DecideTimeCorrectionDto {
  @IsIn(['APPROVE','REJECT','CANCEL']) action!: 'APPROVE' | 'REJECT' | 'CANCEL';
  @IsInt() @Min(1) version!: number;
  @IsUUID('4') requestKey!: string;
  @Transform(trim) @IsString() @MinLength(3) @MaxLength(1000) note!: string;
}
