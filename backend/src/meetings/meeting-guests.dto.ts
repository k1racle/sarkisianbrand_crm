import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsString, IsUUID, Matches, MaxLength, Min, MinLength } from 'class-validator';
export class MeetingGuestVersionDto { @IsInt() @Min(1) version!: number; }
export class CreateMeetingInvitationDto extends MeetingGuestVersionDto {
  @Transform(({value})=>typeof value==='string'?value.trim():value)
  @IsString() @MinLength(1) @MaxLength(80) label!: string;
  @IsUUID('4') requestKey!: string;
}
export class DecideMeetingGuestDto extends MeetingGuestVersionDto { @IsIn(['ADMIT','REJECT']) action!: 'ADMIT' | 'REJECT'; }
export class JoinMeetingGuestDto {
  @IsString() @Matches(/^[A-Za-z0-9_-]{43}$/) invitationToken!: string;
  @IsString() @Matches(/^\d{8}$/) pin!: string;
  @Transform(({value})=>typeof value==='string'?value.trim():value)
  @IsString() @MinLength(1) @MaxLength(80) displayName!: string;
  @IsString() @Matches(/^[A-Za-z0-9_-]{43}$/) clientKey!: string;
}
export class MeetingGuestTicketDto { @IsString() @Matches(/^[A-Za-z0-9_-]{43}$/) ticket!: string; }
