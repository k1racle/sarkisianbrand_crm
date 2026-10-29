import { Body, Controller, Get, Header, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateLmsLiveDto, LmsLiveMessageDto } from './lms-live.dto';
import { LmsLiveService } from './lms-live.service';

const uuid = () => new ParseUUIDPipe({ version: '4' });

@Controller('lms/admin/live')
@UseGuards(JwtAuthGuard, RolesGuard, ThrottlerGuard)
@Roles('ADMIN', 'SUPERVISOR', 'CONTENT_MANAGER')
@Permissions('lms.read', 'lms.write')
export class LmsLiveAdminController {
  constructor(private readonly live: LmsLiveService) {}
  @Post() @Throttle({ default: { limit: 30, ttl: 60000 } }) create(@Body() dto: CreateLmsLiveDto) { return this.live.create(dto); }
  @Get('hosts') @Header('Cache-Control', 'private, no-store') hosts() { return this.live.hosts(); }
  @Get('course/:courseId') @Header('Cache-Control', 'private, no-store') list(@Param('courseId', uuid()) courseId: string) { return this.live.listAdmin(courseId); }
  @Post(':id/start') start(@Req() req: any, @Param('id', uuid()) id: string) { return this.live.transition(req.user.sub, id, 'start'); }
  @Post(':id/end') end(@Req() req: any, @Param('id', uuid()) id: string) { return this.live.transition(req.user.sub, id, 'end'); }
  @Post(':id/cancel') cancel(@Req() req: any, @Param('id', uuid()) id: string) { return this.live.transition(req.user.sub, id, 'cancel'); }
  @Post(':id/join') @Header('Cache-Control', 'private, no-store') @Throttle({ default: { limit: 20, ttl: 60000 } }) join(@Req() req: any, @Param('id', uuid()) id: string) { return this.live.joinHost(req.user.sub, id); }
  @Get(':id/chat') @Header('Cache-Control', 'private, no-store') chat(@Req() req: any, @Param('id', uuid()) id: string) { return this.live.chat(req.user.sub, id); }
  @Post(':id/chat') @Throttle({ default: { limit: 20, ttl: 60000 } }) send(@Req() req: any, @Param('id', uuid()) id: string, @Body() dto: LmsLiveMessageDto) { return this.live.send(req.user.sub, id, dto.body); }
}

@Controller('lms/my/:courseId/lessons/:lessonId/live')
@UseGuards(JwtAuthGuard, ThrottlerGuard)
export class LmsLiveStudentController {
  constructor(private readonly live: LmsLiveService) {}
  @Get() @Header('Cache-Control', 'private, no-store') list(@Req() req: any, @Param('courseId', uuid()) courseId: string, @Param('lessonId', uuid()) lessonId: string) { return this.live.listStudent(req.user.sub, courseId, lessonId); }
  @Post(':id/join') @Header('Cache-Control', 'private, no-store') @Throttle({ default: { limit: 20, ttl: 60000 } }) join(@Req() req: any, @Param('courseId', uuid()) courseId: string, @Param('lessonId', uuid()) lessonId: string, @Param('id', uuid()) id: string) { return this.live.joinStudent(req.user.sub, courseId, lessonId, id); }
  @Get(':id/chat') @Header('Cache-Control', 'private, no-store') chat(@Req() req: any, @Param('courseId', uuid()) courseId: string, @Param('lessonId', uuid()) lessonId: string, @Param('id', uuid()) id: string) { return this.live.chat(req.user.sub, id, courseId, lessonId); }
  @Post(':id/chat') @Throttle({ default: { limit: 20, ttl: 60000 } }) send(@Req() req: any, @Param('courseId', uuid()) courseId: string, @Param('lessonId', uuid()) lessonId: string, @Param('id', uuid()) id: string, @Body() dto: LmsLiveMessageDto) { return this.live.send(req.user.sub, id, dto.body, courseId, lessonId); }
}
