import { LeadStatus, TaskStatus } from '@prisma/client';
import { IsArray, IsBoolean, IsDateString, IsEmail, IsEnum, IsInt, IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export class CreatePipelineDto {
  @IsString() @MaxLength(120) name!: string;
  @IsOptional() @IsBoolean() isDefault?: boolean;
  @IsOptional() @IsArray() @IsString({ each: true }) requiredFields?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) lostReasons?: string[];
}

export class UpdatePipelineDto {
  @IsOptional() @IsString() @MaxLength(120) name?: string;
  @IsOptional() @IsBoolean() isDefault?: boolean;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsArray() @IsString({ each: true }) requiredFields?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) lostReasons?: string[];
}

export class CreatePipelineStageDto {
  @IsString() @MaxLength(100) name!: string;
  @IsOptional() @IsString() @MaxLength(30) code?: string;
  @IsOptional() @IsString() color?: string;
  @IsOptional() @IsInt() @Min(0) @Max(100) probability?: number;
  @IsOptional() @IsBoolean() isWon?: boolean;
  @IsOptional() @IsBoolean() isLost?: boolean;
}

export class UpdatePipelineStageDto extends CreatePipelineStageDto {
  @IsOptional() declare name: string;
  @IsOptional() @IsInt() @Min(0) sortOrder?: number;
}

export class ReorderPipelineStagesDto {
  @IsArray() @IsUUID(undefined, { each: true }) stageIds!: string[];
}

export class CreateTaskTemplateDto {
  @IsString() @MaxLength(120) name!: string;
  @IsString() @MaxLength(200) title!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() priority?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) labels?: string[];
  @IsOptional() @IsInt() @Min(1) estimateMinutes?: number;
  @IsOptional() @IsInt() @Min(1) dueInHours?: number;
  @IsOptional() @IsInt() @Min(0) reminderBeforeMin?: number;
  @IsOptional() @IsUUID() defaultAssigneeId?: string;
}

export class UpdateTaskTemplateDto extends CreateTaskTemplateDto {
  @IsOptional() declare name: string;
  @IsOptional() declare title: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class CreateTaskFromTemplateDto {
  @IsOptional() @IsUUID() assignedToId?: string;
  @IsOptional() @IsUUID() leadId?: string;
  @IsOptional() @IsUUID() customerId?: string;
  @IsOptional() @IsUUID() organizationId?: string;
  @IsOptional() @IsUUID() orderId?: string;
}

export class CreateLeadDto {
  @IsString() source!: string;
  @IsString() contactName!: string;
  @IsOptional() @IsString() contactPhone?: string;
  @IsOptional() @IsEmail() contactEmail?: string;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() message?: string;
  @IsOptional() @IsEnum(LeadStatus) status?: LeadStatus;
  @IsOptional() @IsUUID() stageId?: string;
  @IsOptional() @IsUUID() managerId?: string;
  @IsOptional() @IsUUID() customerId?: string;
  @IsOptional() @IsUUID() organizationId?: string;
  @IsOptional() @IsNumber() @Min(0) amount?: number;
  @IsOptional() @IsInt() @Min(0) @Max(100) probability?: number;
  @IsOptional() @IsDateString() expectedCloseAt?: string;
  @IsOptional() @IsDateString() nextContactAt?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
}

export class UpdateLeadDto {
  @IsOptional() @IsString() source?: string;
  @IsOptional() @IsString() contactName?: string;
  @IsOptional() @IsString() contactPhone?: string;
  @IsOptional() @IsEmail() contactEmail?: string;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() message?: string;
  @IsOptional() @IsEnum(LeadStatus) status?: LeadStatus;
  @IsOptional() @IsUUID() stageId?: string;
  @IsOptional() @IsUUID() managerId?: string;
  @IsOptional() @IsUUID() customerId?: string;
  @IsOptional() @IsUUID() organizationId?: string;
  @IsOptional() @IsNumber() @Min(0) amount?: number;
  @IsOptional() @IsInt() @Min(0) @Max(100) probability?: number;
  @IsOptional() @IsDateString() expectedCloseAt?: string;
  @IsOptional() @IsDateString() nextContactAt?: string;
  @IsOptional() @IsString() lostReason?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
}

export class CreateInteractionDto {
  @IsString() type!: string;
  @IsString() content!: string;
  @IsOptional() @IsUUID() customerId?: string;
}

export class CreateTaskDto {
  @IsString() title!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsUUID() assignedToId?: string;
  @IsOptional() @IsUUID() createdById?: string;
  @IsOptional() @IsUUID() leadId?: string;
  @IsOptional() @IsUUID() customerId?: string;
  @IsOptional() @IsUUID() organizationId?: string;
  @IsOptional() @IsUUID() orderId?: string;
  @IsOptional() @IsUUID() parentId?: string;
  @IsOptional() @IsEnum(TaskStatus) status?: TaskStatus;
  @IsOptional() @IsString() priority?: string;
  @IsOptional() @IsInt() @Min(0) @Max(100) progress?: number;
  @IsOptional() @IsInt() @Min(0) position?: number;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() dueDate?: string;
  @IsOptional() @IsInt() @Min(1) estimateMinutes?: number;
  @IsOptional() @IsArray() @IsString({ each: true }) labels?: string[];
  @IsOptional() @IsUUID() templateId?: string;
  @IsOptional() @IsInt() @Min(0) reminderBeforeMinutes?: number;
}

export class UpdateTaskDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsUUID() assignedToId?: string;
  @IsOptional() @IsUUID() leadId?: string;
  @IsOptional() @IsUUID() customerId?: string;
  @IsOptional() @IsUUID() organizationId?: string;
  @IsOptional() @IsUUID() orderId?: string;
  @IsOptional() @IsUUID() parentId?: string;
  @IsOptional() @IsEnum(TaskStatus) status?: TaskStatus;
  @IsOptional() @IsString() priority?: string;
  @IsOptional() @IsInt() @Min(0) @Max(100) progress?: number;
  @IsOptional() @IsInt() @Min(0) position?: number;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() dueDate?: string;
  @IsOptional() @IsInt() @Min(1) estimateMinutes?: number;
  @IsOptional() @IsArray() @IsString({ each: true }) labels?: string[];
  @IsOptional() @IsInt() @Min(0) reminderBeforeMinutes?: number;
}

export class CreateTaskCommentDto { @IsString() body!: string; }
