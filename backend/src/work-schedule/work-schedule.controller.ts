import { Body, Controller, Get, Header, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { internalWorkspaceRoles } from '../auth/workspace-role-catalog';
import { CreateScheduleDto, CreateWorkPatternDto, ScheduleQueryDto, ScheduleTransitionDto, UpdateScheduleDto, WorkPatternActionDto } from './work-schedule.dto';
import { WorkScheduleService } from './work-schedule.service';
const uuid = new ParseUUIDPipe({ version: '4' });
@Controller('crm/work-schedule') @UseGuards(JwtAuthGuard, RolesGuard) @Roles(...internalWorkspaceRoles) @Permissions('work_schedule.read')
export class WorkScheduleController {
  constructor(private readonly schedule: WorkScheduleService) {}
  @Get() @Header('Cache-Control', 'private, no-store') list(@Req() req: any, @Query() query: ScheduleQueryDto) { return this.schedule.list(req.user.sub, query); }
  @Get('options') @Header('Cache-Control', 'private, no-store') options(@Req() req: any) { return this.schedule.options(req.user.sub); }
  @Post('patterns/preview') @Permissions('work_schedule.read', 'work_schedule.write') @Header('Cache-Control', 'private, no-store') previewPattern(@Req() req: any, @Body() dto: CreateWorkPatternDto) { return this.schedule.previewPattern(req.user.sub, dto); }
  @Post('patterns') @Permissions('work_schedule.read', 'work_schedule.write') @Header('Cache-Control', 'private, no-store') createPattern(@Req() req: any, @Body() dto: CreateWorkPatternDto) { return this.schedule.createPattern(req.user.sub, dto); }
  @Get('patterns/:id') @Header('Cache-Control', 'private, no-store') patternDetail(@Req() req: any, @Param('id', uuid) id: string) { return this.schedule.patternDetail(req.user.sub, id); }
  @Post('patterns/:id/action') @Header('Cache-Control', 'private, no-store') patternAction(@Req() req: any, @Param('id', uuid) id: string, @Body() dto: WorkPatternActionDto) { return this.schedule.patternAction(req.user.sub, id, dto); }
  @Get(':id') @Header('Cache-Control', 'private, no-store') detail(@Req() req: any, @Param('id', uuid) id: string) { return this.schedule.detail(req.user.sub, id); }
  @Post() @Permissions('work_schedule.read', 'work_schedule.write') @Header('Cache-Control', 'private, no-store') create(@Req() req: any, @Body() dto: CreateScheduleDto) { return this.schedule.create(req.user.sub, dto); }
  @Patch(':id') @Permissions('work_schedule.read', 'work_schedule.write') @Header('Cache-Control', 'private, no-store') update(@Req() req: any, @Param('id', uuid) id: string, @Body() dto: UpdateScheduleDto) { return this.schedule.update(req.user.sub, id, dto); }
  @Post(':id/status') @Header('Cache-Control', 'private, no-store') status(@Req() req: any, @Param('id', uuid) id: string, @Body() dto: ScheduleTransitionDto) { return this.schedule.transition(req.user.sub, id, dto); }
}
