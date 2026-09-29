import { TicketPriority, TicketSource, TicketStatus } from '@prisma/client';
import { IsBoolean, IsEmail, IsEnum, IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class PublicHelpdeskTicketDto {
  @IsString() @MinLength(3) @MaxLength(180) subject!: string;
  @IsString() @MinLength(5) @MaxLength(5000) description!: string;
  @IsEmail() @MaxLength(254) requesterEmail!: string;
  @IsOptional() @IsString() @MaxLength(120) requesterName?: string;
  @IsOptional() @IsIn(['B2C', 'B2B']) source?: 'B2C' | 'B2B';
}

export class CreateHelpdeskTicketDto {
  @IsString()
  @MinLength(3)
  @MaxLength(180)
  subject!: string;

  @IsString()
  @MinLength(5)
  @MaxLength(5000)
  description!: string;

  @IsEnum(TicketSource)
  source!: TicketSource;

  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  requesterName?: string;

  @IsOptional()
  @IsEmail()
  requesterEmail?: string;

  @IsOptional()
  @IsUUID()
  orderId?: string;

  @IsOptional()
  @IsString()
  organizationRef?: string;

  @IsOptional()
  @IsString()
  affectedService?: string;
}

export class UpdateHelpdeskTicketDto {
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  queue?: string;

  @IsOptional()
  @IsUUID()
  assignedToId?: string | null;
}

export class CreateHelpdeskCommentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  body!: string;

  @IsOptional()
  @IsBoolean()
  isInternal?: boolean;
}
