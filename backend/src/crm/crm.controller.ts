import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CrmService } from './crm.service';
import { CreateLeadDto, CreateTaskDto } from './dto/crm.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Permissions } from '../common/decorators/permissions.decorator';

@ApiTags('crm')
@Controller('crm')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'MANAGER_B2B', 'MANAGER_SALES', 'SUPERVISOR')
export class CrmController {
  constructor(private readonly crm: CrmService) {}

  @Get('dashboard')
  @Permissions('crm.read')
  @ApiOperation({ summary: 'Сводка CRM' })
  dashboard() { return this.crm.dashboard(); }

  @Get('customers')
  @Permissions('customers.read')
  customers() { return this.crm.customers(); }

  @Get('leads')
  @Permissions('crm.read')
  leads() { return this.crm.leads(); }

  @Post('leads')
  @Permissions('crm.write')
  createLead(@Body() dto: CreateLeadDto) { return this.crm.createLead(dto); }

  @Get('tasks')
  @Permissions('crm.read')
  tasks() { return this.crm.tasks(); }

  @Post('tasks')
  @Permissions('crm.write')
  createTask(@Body() dto: CreateTaskDto) { return this.crm.createTask(dto); }
}
