import { Controller, Delete, Get, Header, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { internalWorkspaceRoles } from '../auth/workspace-role-catalog';
import { MeetingCalendarService } from './meeting-calendar.service';
@Controller('crm/meetings')
@UseGuards(JwtAuthGuard,RolesGuard)
@Roles(...internalWorkspaceRoles)
@Permissions('meetings.read')
export class MeetingCalendarController{
  constructor(private readonly calendar:MeetingCalendarService){}
  @Get('calendar-subscription') @Header('Cache-Control','private, no-store')
  subscription(@Req() req:any){return this.calendar.subscription(req.user.sub);}
  @Post('calendar-subscription') @Header('Cache-Control','private, no-store')
  enable(@Req() req:any){return this.calendar.enable(req.user.sub);}
  @Delete('calendar-subscription') @Header('Cache-Control','private, no-store')
  revoke(@Req() req:any){return this.calendar.revoke(req.user.sub);}
  @Get(':id/calendar.ics') @Header('Content-Type','text/calendar; charset=utf-8') @Header('Content-Disposition','attachment; filename="sarkisian-event.ics"') @Header('Cache-Control','private, no-store')
  event(@Req() req:any,@Param('id',new ParseUUIDPipe({version:'4'})) id:string){return this.calendar.event(req.user.sub,id);}
}
@Controller('calendar/feeds')
export class MeetingCalendarFeedController{
  constructor(private readonly calendar:MeetingCalendarService){}
  @Get(':token.ics') @Header('Content-Type','text/calendar; charset=utf-8') @Header('Cache-Control','private, no-store') @Header('Referrer-Policy','no-referrer') @Header('X-Robots-Tag','noindex, nofollow')
  feed(@Param('token') token:string){return this.calendar.feed(token);}
}
