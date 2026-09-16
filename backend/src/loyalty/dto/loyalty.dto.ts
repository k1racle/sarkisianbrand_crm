import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class LoyaltyOperationDto {
  @IsInt() @Min(1) @Max(1000000) amount!: number;
  @IsString() @MaxLength(240) reason!: string;
  @IsOptional() @IsString() orderId?: string;
}

export class UpdateLoyaltyProgramDto {
  @IsString() @MaxLength(80) programName!: string;
  @IsBoolean() isEnabled!: boolean;
  @IsInt() @Min(0) @Max(100) earnPercent!: number;
  @IsInt() @Min(0) @Max(100) maxWriteOffPercent!: number;
  @IsInt() @Min(0) @Max(1000000) signupBonus!: number;
  @IsInt() @Min(0) @Max(1000000) birthdayBonus!: number;
  @IsInt() @Min(1) @Max(3650) bonusValidityDays!: number;
  @IsInt() @Min(0) @Max(100000000) proThreshold!: number;
  @IsInt() @Min(0) @Max(100000000) premiumThreshold!: number;
  @IsInt() @Min(100) @Max(1000) proMultiplierPercent!: number;
  @IsInt() @Min(100) @Max(1000) premiumMultiplierPercent!: number;
}
