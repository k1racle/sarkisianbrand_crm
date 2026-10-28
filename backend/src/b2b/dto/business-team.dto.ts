import { Equals, IsBoolean, IsEmail, IsIn, IsInt, IsString, IsUUID, Matches, MaxLength, Min, MinLength } from 'class-validator';
import { RegisterDto } from '../../auth/dto/auth.dto';
import { Transform } from 'class-transformer';

export class InviteBusinessMemberDto {
  @IsUUID() requestKey!: string;
  @IsEmail() @MaxLength(254) email!: string;
  @IsIn(['EMPLOYEE', 'BUYER', 'ACCOUNTANT']) role!: 'EMPLOYEE' | 'BUYER' | 'ACCOUNTANT';
  @Transform(({obj})=>obj.canOrder) @IsBoolean() canOrder!: boolean;
  @Transform(({obj})=>obj.canSeeFinance) @IsBoolean() canSeeFinance!: boolean;
}
export class UpdateBusinessMemberDto {
  @IsInt() @Min(1) version!: number;
  @IsIn(['EMPLOYEE', 'BUYER', 'ACCOUNTANT']) role!: 'EMPLOYEE' | 'BUYER' | 'ACCOUNTANT';
  @Transform(({obj})=>obj.canOrder) @IsBoolean() canOrder!: boolean;
  @Transform(({obj})=>obj.canSeeFinance) @IsBoolean() canSeeFinance!: boolean;
  @Transform(({obj})=>obj.isActive) @IsBoolean() isActive!: boolean;
}
export class BusinessTeamVersionDto {
  @IsInt() @Min(1) version!: number;
}
export class TransferBusinessOwnerDto {
  @IsUUID() targetMemberId!: string;
  @IsInt() @Min(1) ownerVersion!: number;
  @IsInt() @Min(1) targetVersion!: number;
  @IsString() @MinLength(1) @MaxLength(128) currentPassword!: string;
}
export class BusinessInvitationTokenDto {
  @IsString() @Matches(/^[A-Za-z0-9_-]{43}$/) token!: string;
}
export class RegisterInvitedBusinessDto extends RegisterDto {
  @IsString() @Matches(/^[A-Za-z0-9_-]{43}$/) token!: string;
  @Transform(({obj})=>obj.acceptedTerms) @IsBoolean() @Equals(true) acceptedTerms!: boolean;
  @IsString() @Matches(/^[a-f0-9]{64}$/) termsVersion!: string;
}
