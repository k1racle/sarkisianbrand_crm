import { Equals, IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength, ValidateIf } from 'class-validator';
import { Transform, Type } from 'class-transformer';

// PATCH fields that cannot be null must reject null instead of silently
// accepting it through IsOptional and failing later inside Prisma.
const WhenPresent = () => ValidateIf((_object, value) => value !== undefined);

export class CourseListDto {
  @Type(() => Number) @IsInt() @Min(1) @Max(100000) page = 1;
  @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional() @IsString() @MaxLength(200) search?: string;
}
export class CreateCoursePurchaseDto {
  @IsUUID('4') courseId!: string;
  @IsUUID('4') tariffId!: string;
  @Transform(({ obj, key }) => obj[key]) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) @Max(100000000) expectedPrice!: number;
  @Transform(({ obj, key }) => obj[key]) @Equals(true) acceptedTerms!: boolean;
}

export class CreateCourseDto {
  @IsString() @MinLength(1) @MaxLength(200) titleRu!: string;
  @IsOptional() @IsString() @MaxLength(200) titleEn?: string | null;
  @IsOptional() @IsString() @MaxLength(10000) description?: string | null;
}
export class UpdateCourseDto {
  @WhenPresent() @IsString() @MinLength(1) @MaxLength(200) titleRu?: string;
  @IsOptional() @IsString() @MaxLength(200) titleEn?: string | null;
  @IsOptional() @IsString() @MaxLength(10000) description?: string | null;
  @WhenPresent() @IsIn(['DRAFT','PUBLISHED','ARCHIVED']) status?: string;
}
export class CreateTariffDto {
  @IsString() @MinLength(1) @MaxLength(200) title!: string;
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(100000000) price!: number;
  @IsOptional() @IsInt() @Min(1) @Max(3650) accessDays?: number | null;
  @WhenPresent() @IsBoolean() isActive?: boolean;
}
export class UpdateTariffDto {
  @WhenPresent() @IsString() @MinLength(1) @MaxLength(200) title?: string;
  @WhenPresent() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(100000000) price?: number;
  @IsOptional() @IsInt() @Min(1) @Max(3650) accessDays?: number | null;
  @WhenPresent() @IsBoolean() isActive?: boolean;
}
export class CreateModuleDto {
  @IsString() @MinLength(1) @MaxLength(200) title!: string;
  @WhenPresent() @IsInt() @Min(0) @Max(10000) sortOrder?: number;
}
export class UpdateModuleDto {
  @WhenPresent() @IsString() @MinLength(1) @MaxLength(200) title?: string;
  @WhenPresent() @IsInt() @Min(0) @Max(10000) sortOrder?: number;
}
export class CreateLessonDto {
  @IsString() @MinLength(1) @MaxLength(200) title!: string;
  @IsIn(['TEXT','VIDEO','PRESENTATION','LIVE']) kind!: string;
  @IsOptional() @IsString() @MaxLength(50000) content?: string | null;
  @IsOptional() @IsString() @MaxLength(2048) videoUrl?: string | null;
  @IsOptional() @IsString() @MaxLength(2048) presentationUrl?: string | null;
  @WhenPresent() @IsBoolean() isPreview?: boolean;
  @WhenPresent() @IsInt() @Min(0) @Max(10000) sortOrder?: number;
}
export class UpdateLessonDto {
  @IsInt() @Min(0) revision!: number;
  @WhenPresent() @IsString() @MinLength(1) @MaxLength(200) title?: string;
  @WhenPresent() @IsIn(['TEXT','VIDEO','PRESENTATION','LIVE']) kind?: string;
  @IsOptional() @IsString() @MaxLength(50000) content?: string | null;
  @IsOptional() @IsString() @MaxLength(2048) videoUrl?: string | null;
  @IsOptional() @IsString() @MaxLength(2048) presentationUrl?: string | null;
  @WhenPresent() @IsBoolean() isPreview?: boolean;
  @WhenPresent() @IsInt() @Min(0) @Max(10000) sortOrder?: number;
}
