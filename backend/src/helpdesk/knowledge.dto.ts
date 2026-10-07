import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
const trim=({value}:any)=>typeof value==='string'?value.trim():value;
export class KnowledgeQueryDto {
  @IsOptional() @Transform(trim) @IsString() @MaxLength(100) search?:string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(80) category?:string;
  @IsOptional() @IsIn(['PUBLISHED','DRAFT','ARCHIVED','ALL']) status='PUBLISHED';
  @IsOptional() @Type(()=>Number) @IsInt() @Min(1) @Max(10000) page=1;
}
export class KnowledgeCreateDto {
  @Transform(trim) @IsString() @MinLength(3) @MaxLength(200) title!:string;
  @Transform(trim) @IsString() @MinLength(1) @MaxLength(80) category!:string;
  @Transform(trim) @IsString() @MinLength(10) @MaxLength(50000) body!:string;
}
export class KnowledgeUpdateDto extends KnowledgeCreateDto {
  @IsInt() @Min(1) version!:number;
  @IsIn(['DRAFT','PUBLISHED','ARCHIVED']) status!:string;
}
