import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CrmService } from './crm.service';
import { CreateLeadDto, CreateTaskDto } from './dto/crm.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('crm')
@Controller('crm')
@UseGuards(JwtAuthGuard)
export class CrmController {
  constructor(private readonly crm: CrmService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Сводка CRM' })
  dashboard() { return this.crm.dashboard(); }

  @Get('customers')
  customers() { return this.crm.customers(); }

  @Get('leads')
  leads() { return this.crm.leads(); }

  @Post('leads')
  createLead(@Body() dto: CreateLeadDto) { return this.crm.createLead(dto); }

  @Get('tasks')
  tasks() { return this.crm.tasks(); }

  @Post('tasks')
  createTask(@Body() dto: CreateTaskDto) { return this.crm.createTask(dto); }
}
