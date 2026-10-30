import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsInt, IsString, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';

export class QuizQuestionDto {
  @IsString() @MinLength(1) @MaxLength(1000) text!: string;
  @IsArray() @ArrayMinSize(2) @ArrayMaxSize(8) @IsString({ each: true }) @MinLength(1, { each: true }) @MaxLength(500, { each: true }) options!: string[];
  @IsInt() @Min(0) @Max(7) correctIndex!: number;
}

export class SaveQuizDto {
  @IsInt() @Min(0) revision!: number;
  @IsBoolean() enabled!: boolean;
  @IsInt() @Min(1) @Max(100) passingPercent!: number;
  @IsArray() @ArrayMaxSize(50) @ValidateNested({ each: true }) @Type(() => QuizQuestionDto) questions!: QuizQuestionDto[];
}

export class QuizAttemptDto {
  @IsInt() @Min(1) revision!: number;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(50) @IsInt({ each: true }) @Min(0, { each: true }) @Max(7, { each: true }) answers!: number[];
}
