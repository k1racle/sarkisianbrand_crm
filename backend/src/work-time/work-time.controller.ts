import { Body, Controller, Get, Header, Param, ParseIntPipe, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { internalWorkspaceRoles } from '../auth/workspace-role-catalog';
import { WorkTimeService } from './work-time.service';
import { WorkTimeCommandDto, WorkTimeQueryDto } from './work-time.dto';
import { TimeCorrectionService } from './time-correction.service';
import { CreateTimeCorrectionDto, DecideTimeCorrectionDto, TimeCorrectionQueryDto } from './time-correction.dto';
import { TimesheetService } from './timesheet.service';
import { TimesheetActionDto, TimesheetQueryDto } from './timesheet.dto';
@Controller('crm/work-time') @UseGuards(JwtAuthGuard, RolesGuard) @Roles(...internalWorkspaceRoles) @Permissions('work_time.read')
export class WorkTimeController {
  constructor(private readonly time: WorkTimeService, private readonly corrections: TimeCorrectionService, private readonly timesheet: TimesheetService) {}
  @Get('timesheet/options') @Permissions('work_time.read','work_time.review') @Header('Cache-Control', 'private, no-store') sheetOptions(@Req() req:any){return this.timesheet.options(req.user.sub);}
  @Get('timesheet') @Permissions('work_time.read','work_time.review') @Header('Cache-Control', 'private, no-store') sheet(@Req() req:any,@Query() query:TimesheetQueryDto){return this.timesheet.list(req.user.sub,query);}
  @Post('timesheet/:employeeId/actions') @Permissions('work_time.read','work_time.review') @Header('Cache-Control','private, no-store') sheetAction(@Req() req:any,@Param('employeeId',new ParseUUIDPipe({version:'4'})) employeeId:string,@Body() dto:TimesheetActionDto){return this.timesheet.act(req.user.sub,employeeId,dto);}
  @Get('timesheet/:employeeId/versions/:revision') @Permissions('work_time.read','work_time.review') @Header('Cache-Control','private, no-store') sheetVersion(@Req() req:any,@Param('employeeId',new ParseUUIDPipe({version:'4'})) employeeId:string,@Param('revision',ParseIntPipe) revision:number,@Query() query:WorkTimeQueryDto){return this.timesheet.archive(req.user.sub,employeeId,query.month,revision);}
  @Get('timesheet/:employeeId') @Permissions('work_time.read','work_time.review') @Header('Cache-Control', 'private, no-store') sheetEmployee(@Req() req:any,@Param('employeeId',new ParseUUIDPipe({version:'4'})) employeeId:string,@Query() query:WorkTimeQueryDto){return this.timesheet.detail(req.user.sub,employeeId,query.month);}
  @Get('current') @Header('Cache-Control', 'private, no-store') current(@Req() req: any) { return this.time.current(req.user.sub); }
  @Get() @Header('Cache-Control', 'private, no-store') history(@Req() req: any, @Query() query: WorkTimeQueryDto) { return this.time.history(req.user.sub, query); }
  @Post('actions') @Permissions('work_time.read', 'work_time.track') @Header('Cache-Control', 'private, no-store') command(@Req() req: any, @Body() dto: WorkTimeCommandDto) { return this.time.command(req.user.sub, dto); }
  @Get('corrections/options') @Header('Cache-Control', 'private, no-store') options(@Req() req: any) { return this.corrections.options(req.user.sub); }
  @Get('corrections') @Header('Cache-Control', 'private, no-store') listCorrections(@Req() req: any, @Query() query: TimeCorrectionQueryDto) { return this.corrections.list(req.user.sub,query); }
  @Get('unclosed') @Permissions('work_time.read','work_time.review') @Header('Cache-Control', 'private, no-store') unclosed(@Req() req: any, @Query() query: TimeCorrectionQueryDto) { return this.corrections.unclosed(req.user.sub,query.page); }
  @Get('corrections/:id') @Header('Cache-Control', 'private, no-store') correction(@Req() req: any, @Param('id', new ParseUUIDPipe({version:'4'})) id: string) { return this.corrections.detail(req.user.sub,id); }
  @Post('corrections') @Permissions('work_time.read','work_time.track') @Header('Cache-Control', 'private, no-store') createCorrection(@Req() req: any, @Body() dto: CreateTimeCorrectionDto) { return this.corrections.create(req.user.sub,dto); }
  @Post('corrections/:id/decision') @Header('Cache-Control', 'private, no-store') decide(@Req() req: any, @Param('id', new ParseUUIDPipe({version:'4'})) id: string, @Body() dto: DecideTimeCorrectionDto) { return this.corrections.decide(req.user.sub,id,dto); }
}
