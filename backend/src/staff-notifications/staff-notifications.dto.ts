import { IsBoolean, IsDateString, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class NotificationQueryDto {
  @IsOptional() @IsIn(['ALL', 'CHAT', 'TASK', 'ORDER', 'SUPPORT']) category = 'ALL';
  @IsOptional() @IsIn(['true', 'false']) unread = 'false';
  @IsOptional() @IsString() @MaxLength(100) cursor?: string;
}
export class NotificationReadAllDto {
  @IsDateString() through!: string;
}
export class NotificationPreferencesDto {
  @Transform(({ obj }) => obj.popupsEnabled) @IsBoolean() popupsEnabled!: boolean;
}
