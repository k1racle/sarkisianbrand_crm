import { ArrayMaxSize, ArrayUnique, Equals, IsArray, IsBoolean, IsInt, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';
import { Transform, Type } from 'class-transformer';
export class SalonBreakDto {
 @IsInt() @Min(0) @Max(1439) startMinute!:number;
 @IsInt() @Min(1) @Max(1440) endMinute!:number;
}
export class SalonDayScheduleDto extends SalonBreakDto {
 @IsInt() @Min(0) @Max(6) day!:number;
 @IsArray() @ArrayMaxSize(4) @ValidateNested({each:true}) @Type(()=>SalonBreakDto) breaks!:SalonBreakDto[];
}

export class SalonBookingSettingDto {
  @Transform(({ obj }) => obj.enabled) @IsBoolean() enabled!: boolean;
  @IsString() @MaxLength(80) timeZone!: string;
  @IsInt() @Min(0) @Max(1439) startMinute!: number;
  @IsInt() @Min(1) @Max(1440) endMinute!: number;
  @IsInt() @Min(5) @Max(60) slotStep!: number;
  @IsInt() @Min(1) @Max(90) horizonDays!: number;
  @IsArray() @ArrayUnique() @ArrayMaxSize(7) @IsInt({ each: true }) @Min(0, { each: true }) @Max(6, { each: true }) workingDays!: number[];
  @IsArray() @ArrayUnique() @ArrayMaxSize(100) @IsUUID('all', { each: true }) masterIds!: string[];
  @IsOptional() @IsArray() @ArrayMaxSize(7) @ArrayUnique((item:any)=>item.day) @ValidateNested({each:true}) @Type(()=>SalonDayScheduleDto) weeklySchedule?:SalonDayScheduleDto[];
}

export class SalonSlotsDto {
  @IsUUID() serviceId!: string;
  @IsUUID() masterMemberId!: string;
  @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) date!: string;
}

export class PublicSalonBookingDto extends SalonSlotsDto {
  @IsString() @Matches(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00\.000Z$/) startTime!: string;
  @IsString() @MinLength(1) @MaxLength(80) firstName!: string;
  @IsString() @Matches(/^\+?[\d ()-]{8,30}$/) phone!: string;
  @Transform(({ obj }) => obj.personalDataConsent) @Equals(true) personalDataConsent!: boolean;
}
