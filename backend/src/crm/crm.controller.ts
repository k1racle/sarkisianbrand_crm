import { CompanyScope, CompanyScopeGuard } from '../common/guards/company-scope.guard';
import { Body, Controller, Delete, Get, Header, Param, ParseEnumPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TaskStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CrmService } from './crm.service';
import { CrmReadService } from './crm-read.service';
import { CrmTaskWriteService } from './task-write.service';
import { CrmLeadWriteService } from './lead-write.service';
import { CrmRemindersService } from './reminders.service';
import { CrmTaskPipelinesService, CreateTaskPipelineDto, UpdateTaskPipelineDto } from './task-pipelines.service';
import { MoveTaskDto } from './dto/crm.dto';
import { CreateInteractionDto, CreateLeadDto, CreatePipelineDto, CreatePipelineStageDto, CreateTaskCommentDto, CreateTaskDto, CreateTaskFromTemplateDto, CreateTaskTemplateDto, ReorderPipelineStagesDto, UpdateLeadDto, UpdatePipelineDto, UpdatePipelineStageDto, UpdateTaskDto, UpdateTaskTemplateDto } from './dto/crm.dto';

@ApiTags('crm')
@Controller('crm')
@UseGuards(JwtAuthGuard, RolesGuard, CompanyScopeGuard)
@Roles('ADMIN', 'MANAGER_B2B', 'MANAGER_SALES', 'SUPERVISOR', 'EXECUTIVE')
export class CrmController {
  @Get('task-pipelines') @Header('Cache-Control', 'private, no-store') @Permissions('crm.read') listTaskPipelines(@Req() req: any) { return this.taskPipelines.list(req.user.sub); }
  @Post('task-pipelines') @Permissions('crm.write') @CompanyScope('crm.read', 'crm.write') createTaskPipeline(@Req() req: any, @Body() dto: CreateTaskPipelineDto) { return this.taskPipelines.save(req.user.sub, dto); }
  @Patch('task-pipelines/:id') @Permissions('crm.write') @CompanyScope('crm.read', 'crm.write') updateTaskPipeline(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateTaskPipelineDto) { return this.taskPipelines.save(req.user.sub, dto, id); }
  constructor(private readonly crm: CrmService, private readonly reads: CrmReadService, private readonly tasksWrite: CrmTaskWriteService, private readonly leadsWrite: CrmLeadWriteService, private readonly reminderService: CrmRemindersService, private readonly taskPipelines: CrmTaskPipelinesService) {}

  @Get('dashboard') @Header('Cache-Control', 'private, no-store') @Permissions('crm.read') dashboard(@Req() req: any) { return this.reads.dashboard(req.user.sub); }
  @Get('team') @Header('Cache-Control', 'private, no-store') @Permissions('crm.read') team(@Req() req: any) { return this.reads.team(req.user.sub); }
  @Get('customers') @Header('Cache-Control', 'private, no-store') @Permissions('customers.read') customers(@Req() req: any) { return this.reads.customers(req.user.sub); }
  @Get('pipeline') @Header('Cache-Control', 'private, no-store') @Permissions('crm.read') pipeline(@Req() req: any, @Query('pipelineId') pipelineId?: string) { return this.reads.pipeline(req.user.sub, pipelineId); }
  @Get('pipelines') @Header('Cache-Control', 'private, no-store') @Permissions('crm.read') pipelines(@Req() req: any) { return this.reads.pipelines(req.user.sub); }
  @Post('pipelines') @Permissions('crm.write') @CompanyScope('crm.read', 'crm.write') createPipeline(@Body() dto: CreatePipelineDto) { return this.crm.createPipeline(dto); }
  @Patch('pipelines/:id') @Permissions('crm.write') @CompanyScope('crm.read', 'crm.write') updatePipeline(@Param('id') id: string, @Body() dto: UpdatePipelineDto) { return this.crm.updatePipeline(id, dto); }
  @Delete('pipelines/:id') @Permissions('crm.write') @CompanyScope('crm.read', 'crm.write') archivePipeline(@Param('id') id: string) { return this.crm.archivePipeline(id); }
  @Post('pipelines/:id/stages') @Permissions('crm.write') @CompanyScope('crm.read', 'crm.write') createStage(@Param('id') id: string, @Body() dto: CreatePipelineStageDto) { return this.crm.createPipelineStage(id, dto); }
  @Patch('pipeline-stages/:id') @Permissions('crm.write') @CompanyScope('crm.read', 'crm.write') updateStage(@Param('id') id: string, @Body() dto: UpdatePipelineStageDto) { return this.crm.updatePipelineStage(id, dto); }
  @Delete('pipeline-stages/:id') @Permissions('crm.write') @CompanyScope('crm.read', 'crm.write') deleteStage(@Param('id') id: string) { return this.crm.deletePipelineStage(id); }
  @Post('pipelines/:id/stages/reorder') @Permissions('crm.write') @CompanyScope('crm.read', 'crm.write') reorderStages(@Param('id') id: string, @Body() dto: ReorderPipelineStagesDto) { return this.crm.reorderPipelineStages(id, dto); }
  @Get('leads') @Header('Cache-Control', 'private, no-store') @Permissions('crm.read') leads(@Req() req: any) { return this.reads.leads(req.user.sub); }
  @Get('leads/:id') @Header('Cache-Control', 'private, no-store') @Permissions('crm.read') lead(@Param('id') id: string, @Req() req: any) { return this.reads.lead(req.user.sub, id); }
  @Post('leads') @Header('Cache-Control', 'private, no-store') @Permissions('crm.write') createLead(@Body() dto: CreateLeadDto, @Req() request: any) { return this.leadsWrite.create(request.user.sub, dto); }
  @Patch('leads/:id') @Header('Cache-Control', 'private, no-store') @Permissions('crm.write') updateLead(@Param('id') id: string, @Body() dto: UpdateLeadDto, @Req() request: any) { return this.leadsWrite.update(request.user.sub, id, dto); }
  @Post('leads/:id/interactions') @Header('Cache-Control', 'private, no-store') @Permissions('crm.write') interaction(@Param('id') id: string, @Body() dto: CreateInteractionDto, @Req() request: any) { return this.leadsWrite.interaction(request.user.sub, id, dto); }

  @Get('tasks') @Header('Cache-Control', 'private, no-store') @Permissions('crm.read') tasks(@Req() req: any, @Query('status', new ParseEnumPipe(TaskStatus, { optional: true })) status?: TaskStatus, @Query('assignedToId') assignedToId?: string, @Query('pipelineId') pipelineId?: string) { return this.reads.tasks(req.user.sub, status, assignedToId, pipelineId); }
  @Get('tasks/:id') @Header('Cache-Control', 'private, no-store') @Permissions('crm.read') task(@Param('id') id: string, @Req() req: any) { return this.reads.task(req.user.sub, id); }
  @Post('tasks') @Header('Cache-Control', 'private, no-store') @Permissions('crm.write') createTask(@Body() dto: CreateTaskDto, @Req() request: any) { return this.tasksWrite.create(request.user.sub, dto); }
  @Patch('tasks/:id') @Header('Cache-Control', 'private, no-store') @Permissions('crm.write') updateTask(@Param('id') id: string, @Body() dto: UpdateTaskDto, @Req() request:any) { return this.tasksWrite.update(request.user.sub, id, dto); }
  @Delete('tasks/:id') @Header('Cache-Control', 'private, no-store') @Permissions('crm.write') archiveTask(@Param('id') id: string, @Req() request:any) { return this.tasksWrite.archive(request.user.sub, id); }
  @Post('tasks/:id/move') @Header('Cache-Control', 'private, no-store') @Permissions('crm.write') moveTask(@Param('id') id: string, @Body() dto: MoveTaskDto, @Req() request:any) { return this.tasksWrite.move(request.user.sub, id, dto.status, dto.beforeId); }
  @Get('tasks/:id/history') @Header('Cache-Control', 'private, no-store') @Permissions('crm.read') taskHistory(@Param('id') id:string,@Req() req:any,@Query('before') before?:string){return this.reads.history(req.user.sub,'task',id,before);}
  @Get('leads/:id/history') @Header('Cache-Control', 'private, no-store') @Permissions('crm.read') leadHistory(@Param('id') id:string,@Req() req:any,@Query('before') before?:string){return this.reads.history(req.user.sub,'lead',id,before);}
  @Get('tasks/:id/comments') @Header('Cache-Control', 'private, no-store') @Permissions('crm.read') taskComments(@Param('id') id: string, @Req() req:any, @Query('before') before?: string) { return this.reads.comments(req.user.sub, id, before); }
  @Post('tasks/:id/comments') @Header('Cache-Control', 'private, no-store') @Permissions('crm.write') taskComment(@Param('id') id: string, @Body() dto: CreateTaskCommentDto, @Req() request: any) { return this.tasksWrite.comment(request.user.sub, id, dto); }
  @Get('task-templates') @Permissions('crm.read') @CompanyScope('crm.read') taskTemplates() { return this.crm.taskTemplates(); }
  @Post('task-templates') @Permissions('crm.write') @CompanyScope('crm.read', 'crm.write') createTaskTemplate(@Body() dto: CreateTaskTemplateDto, @Req() request: any) { return this.crm.createTaskTemplate(dto, request.user.sub); }
  @Patch('task-templates/:id') @Permissions('crm.write') @CompanyScope('crm.read', 'crm.write') updateTaskTemplate(@Param('id') id: string, @Body() dto: UpdateTaskTemplateDto) { return this.crm.updateTaskTemplate(id, dto); }
  @Delete('task-templates/:id') @Permissions('crm.write') @CompanyScope('crm.read', 'crm.write') archiveTaskTemplate(@Param('id') id: string) { return this.crm.archiveTaskTemplate(id); }
  @Post('task-templates/:id/create-task') @Header('Cache-Control', 'private, no-store') @Permissions('crm.write') taskFromTemplate(@Param('id') id: string, @Body() dto: CreateTaskFromTemplateDto, @Req() request: any) { return this.tasksWrite.fromTemplate(request.user.sub, id, dto); }
  @Get('reminders') @Header('Cache-Control', 'private, no-store') @Permissions('crm.read') reminders(@Req() request: any) { return this.reminderService.list(request.user.sub); }
  @Post('reminders/:id/dismiss') @Header('Cache-Control', 'private, no-store') @Permissions('crm.write') dismissReminder(@Param('id') id: string, @Req() request: any) { return this.reminderService.dismiss(request.user.sub, id); }

}
