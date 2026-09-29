import { IsIn, IsInt, IsOptional, IsUUID, Matches, Min } from 'class-validator';
export class WorkTimeCommandDto {
  @IsIn(['START', 'PAUSE', 'RESUME', 'FINISH']) action!: 'START' | 'PAUSE' | 'RESUME' | 'FINISH';
  @IsUUID('4') requestKey!: string;
  @IsOptional() @IsUUID('4') sessionId?: string;
  @IsInt() @Min(0) version!: number;
}
export class WorkTimeQueryDto {
  @Matches(/^20\d{2}-(0[1-9]|1[0-2])$/) month!: string;
}
