import { IsEmail, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { LeadStatus, TaskStatus } from '@prisma/client';

export class CreateLeadDto {
  @IsString() source!: string;
  @IsString() contactName!: string;
  @IsString() contactPhone!: string;
  @IsOptional() @IsEmail() contactEmail?: string;
  @IsOptional() @IsString() message?: string;
  @IsOptional() @IsEnum(LeadStatus) status?: LeadStatus;
  @IsOptional() @IsUUID() managerId?: string;
}

export class CreateTaskDto {
  @IsString() title!: string;
  @IsOptional() @IsString() description?: string;
  @IsUUID() assignedToId!: string;
  @IsUUID() createdById!: string;
  @IsOptional() @IsUUID() leadId?: string;
  @IsOptional() @IsEnum(TaskStatus) status?: TaskStatus;
}
