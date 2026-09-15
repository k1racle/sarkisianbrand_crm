import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TaskStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CrmService } from './crm.service';
import { CreateInteractionDto, CreateLeadDto, CreatePipelineDto, CreatePipelineStageDto, CreateTaskCommentDto, CreateTaskDto, CreateTaskFromTemplateDto, CreateTaskTemplateDto, ReorderPipelineStagesDto, UpdateLeadDto, UpdatePipelineDto, UpdatePipelineStageDto, UpdateTaskDto, UpdateTaskTemplateDto } from './dto/crm.dto';

@ApiTags('crm')
@Controller('crm')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'MANAGER_B2B', 'MANAGER_SALES', 'SUPERVISOR')
export class CrmController {
  constructor(private readonly crm: CrmService) {}

  @Get('dashboard') @Permissions('crm.read') dashboard() { return this.crm.dashboard(); }
  @Get('team') @Permissions('crm.read') team() { return this.crm.team(); }
  @Get('customers') @Permissions('customers.read') customers() { return this.crm.customers(); }
  @Get('pipeline') @Permissions('crm.read') pipeline(@Query('pipelineId') pipelineId?: string) { return this.crm.pipeline(pipelineId); }
  @Get('pipelines') @Permissions('crm.read') pipelines() { return this.crm.pipelines(); }
  @Post('pipelines') @Permissions('crm.write') createPipeline(@Body() dto: CreatePipelineDto) { return this.crm.createPipeline(dto); }
  @Patch('pipelines/:id') @Permissions('crm.write') updatePipeline(@Param('id') id: string, @Body() dto: UpdatePipelineDto) { return this.crm.updatePipeline(id, dto); }
  @Delete('pipelines/:id') @Permissions('crm.write') archivePipeline(@Param('id') id: string) { return this.crm.archivePipeline(id); }
  @Post('pipelines/:id/stages') @Permissions('crm.write') createStage(@Param('id') id: string, @Body() dto: CreatePipelineStageDto) { return this.crm.createPipelineStage(id, dto); }
  @Patch('pipeline-stages/:id') @Permissions('crm.write') updateStage(@Param('id') id: string, @Body() dto: UpdatePipelineStageDto) { return this.crm.updatePipelineStage(id, dto); }
  @Delete('pipeline-stages/:id') @Permissions('crm.write') deleteStage(@Param('id') id: string) { return this.crm.deletePipelineStage(id); }
  @Post('pipelines/:id/stages/reorder') @Permissions('crm.write') reorderStages(@Param('id') id: string, @Body() dto: ReorderPipelineStagesDto) { return this.crm.reorderPipelineStages(id, dto); }
  @Get('leads') @Permissions('crm.read') leads() { return this.crm.leads(); }
  @Get('leads/:id') @Permissions('crm.read') lead(@Param('id') id: string) { return this.crm.lead(id); }
  @Post('leads') @Permissions('crm.write') createLead(@Body() dto: CreateLeadDto, @Req() request: any) { return this.crm.createLead(dto, request.user.sub); }
  @Patch('leads/:id') @Permissions('crm.write') updateLead(@Param('id') id: string, @Body() dto: UpdateLeadDto, @Req() request: any) { return this.crm.updateLead(id, dto, request.user.sub); }
  @Post('leads/:id/interactions') @Permissions('crm.write') interaction(@Param('id') id: string, @Body() dto: CreateInteractionDto, @Req() request: any) { return this.crm.addInteraction(id, dto, request.user.sub); }

  @Get('tasks') @Permissions('crm.read') tasks(@Query('status') status?: TaskStatus, @Query('assignedToId') assignedToId?: string) { return this.crm.tasks(status, assignedToId); }
  @Post('tasks') @Permissions('crm.write') createTask(@Body() dto: CreateTaskDto, @Req() request: any) { return this.crm.createTask(dto, request.user.sub); }
  @Patch('tasks/:id') @Permissions('crm.write') updateTask(@Param('id') id: string, @Body() dto: UpdateTaskDto) { return this.crm.updateTask(id, dto); }
  @Delete('tasks/:id') @Permissions('crm.write') archiveTask(@Param('id') id: string) { return this.crm.archiveTask(id); }
  @Post('tasks/:id/comments') @Permissions('crm.write') taskComment(@Param('id') id: string, @Body() dto: CreateTaskCommentDto, @Req() request: any) { return this.crm.addTaskComment(id, dto, request.user.sub); }
  @Get('task-templates') @Permissions('crm.read') taskTemplates() { return this.crm.taskTemplates(); }
  @Post('task-templates') @Permissions('crm.write') createTaskTemplate(@Body() dto: CreateTaskTemplateDto, @Req() request: any) { return this.crm.createTaskTemplate(dto, request.user.sub); }
  @Patch('task-templates/:id') @Permissions('crm.write') updateTaskTemplate(@Param('id') id: string, @Body() dto: UpdateTaskTemplateDto) { return this.crm.updateTaskTemplate(id, dto); }
  @Delete('task-templates/:id') @Permissions('crm.write') archiveTaskTemplate(@Param('id') id: string) { return this.crm.archiveTaskTemplate(id); }
  @Post('task-templates/:id/create-task') @Permissions('crm.write') taskFromTemplate(@Param('id') id: string, @Body() dto: CreateTaskFromTemplateDto, @Req() request: any) { return this.crm.createTaskFromTemplate(id, dto, request.user.sub); }
  @Get('reminders') @Permissions('crm.read') reminders(@Req() request: any) { return this.crm.reminders(request.user.sub); }
  @Post('reminders/:id/dismiss') @Permissions('crm.write') dismissReminder(@Param('id') id: string, @Req() request: any) { return this.crm.dismissReminder(id, request.user.sub); }

}
