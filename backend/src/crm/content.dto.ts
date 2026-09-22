import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, ValidateIf } from 'class-validator';
export const CONTENT_STATES = ['IDEA','SCRIPT','SHOOTING','EDITING','REVIEW','SCHEDULED','PUBLISHED'];
export const CONTENT_PLATFORMS = ['INSTAGRAM','YOUTUBE','VK','TELEGRAM','MAX','TIKTOK','OTHER'];
export const CONTENT_FORMATS = ['REELS','SHORTS','STORY','POST','VIDEO','LIVE'];
export class ContentListDto {
 @IsOptional() @IsDateString() from?: string;
 @IsOptional() @IsDateString() to?: string;
 @IsOptional() @IsString() @MaxLength(150) search?: string;
 @IsOptional() @IsIn(CONTENT_STATES) status?: string;
 @IsOptional() @IsIn(CONTENT_PLATFORMS) platform?: string;
 @IsOptional() @IsUUID() assignedToId?: string;
 @IsOptional() @IsIn(['true','false']) archived?: string;
 @IsOptional() @Type(()=>Number) @IsInt() @Min(0) @Max(100000) offset?: number;
}
export class ContentCreateDto {
 @IsString() @MaxLength(200) title!: string;
 @IsIn(CONTENT_PLATFORMS) platform!: string;
 @IsIn(CONTENT_FORMATS) format!: string;
 @IsOptional() @IsUUID() assignedToId?: string;
 @IsOptional() @IsString() @MaxLength(150) campaign?: string;
 @IsOptional() @IsString() @MaxLength(10000) brief?: string;
 @IsOptional() @IsString() @MaxLength(30000) script?: string;
 @IsOptional() @IsString() @MaxLength(10000) caption?: string;
 @IsOptional() @IsString() @MaxLength(1000) cta?: string;
 @IsOptional() @IsDateString() scheduledAt?: string | null;
 @IsOptional() @IsString() @MaxLength(80) timezone?: string;
 @IsOptional() @IsUUID() sourceId?: string;
}
export class ContentUpdateDto extends ContentCreateDto {
 @ValidateIf((_o,v)=>v!==undefined) @IsString() @MaxLength(200) declare title: string;
 @ValidateIf((_o,v)=>v!==undefined) @IsIn(CONTENT_PLATFORMS) declare platform: string;
 @ValidateIf((_o,v)=>v!==undefined) @IsIn(CONTENT_FORMATS) declare format: string;
 @IsInt() @Min(1) version!: number;
 @IsOptional() @IsIn(CONTENT_STATES) status?: string;
 @IsOptional() @IsString() @MaxLength(2048) publishedUrl?: string;
}
export class ContentVersionDto { @IsInt() @Min(1) version!: number; }
