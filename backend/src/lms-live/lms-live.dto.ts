import { IsDateString, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateLmsLiveDto {
  @IsUUID() courseId!: string;
  @IsUUID() lessonId!: string;
  @IsUUID() hostId!: string;
  @IsString() @MinLength(1) @MaxLength(140) title!: string;
  @IsDateString() startsAt!: string;
  @IsDateString() endsAt!: string;
}

export class LmsLiveMessageDto {
  @IsString() @MinLength(1) @MaxLength(1000) body!: string;
}
