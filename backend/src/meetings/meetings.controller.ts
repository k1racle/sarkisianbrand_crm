import { Body, Controller, Get, Header, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { internalWorkspaceRoles } from '../auth/workspace-role-catalog';
import { CancelMeetingDto, CreateMeetingDto, MeetingListDto, UpdateMeetingDto } from './meeting.dto';
import { MeetingsService } from './meetings.service';

@Controller('crm/meetings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...internalWorkspaceRoles)
@Permissions('meetings.read')
export class MeetingsController {
  constructor(private readonly meetings: MeetingsService) {}
  @Get() @Header('Cache-Control', 'private, no-store') list(@Req() req: any, @Query() query: MeetingListDto) { return this.meetings.list(req.user.sub, query); }
  @Get('team') @Header('Cache-Control', 'private, no-store') team(@Req() req: any, @Query('q') q = '') { return this.meetings.team(req.user.sub, q); }
  @Get(':id') @Header('Cache-Control', 'private, no-store') detail(@Req() req: any, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string) { return this.meetings.detail(req.user.sub, id); }
  @Post() @Permissions('meetings.read', 'meetings.write') create(@Req() req: any, @Body() dto: CreateMeetingDto) { return this.meetings.create(req.user.sub, dto); }
  @Patch(':id') @Permissions('meetings.read', 'meetings.write') update(@Req() req: any, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Body() dto: UpdateMeetingDto) { return this.meetings.update(req.user.sub, id, dto); }
  @Post(':id/cancel') @Permissions('meetings.read', 'meetings.write') cancel(@Req() req: any, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Body() dto: CancelMeetingDto) { return this.meetings.cancel(req.user.sub, id, dto); }
}
