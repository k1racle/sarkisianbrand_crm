import { Body, Controller, Get, Header, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { internalWorkspaceRoles } from '../auth/workspace-role-catalog';
import { CreateMeetingInvitationDto, DecideMeetingGuestDto, JoinMeetingGuestDto, MeetingGuestTicketDto, MeetingGuestVersionDto } from './meeting-guests.dto';
import { MeetingGuestsService } from './meeting-guests.service';
const uuid = new ParseUUIDPipe({version:'4'});
@Controller('crm/meetings/:id')
@UseGuards(JwtAuthGuard,RolesGuard)
@Roles(...internalWorkspaceRoles)
@Permissions('meetings.read','meetings.write')
export class MeetingGuestHostController {
  constructor(private readonly guests:MeetingGuestsService){}
  @Get('invitations') @Header('Cache-Control','private, no-store')
  list(@Req() req:any,@Param('id',uuid) id:string){return this.guests.list(req.user.sub,id);}
  @Post('invitations') @Header('Cache-Control','private, no-store')
  create(@Req() req:any,@Param('id',uuid) id:string,@Body() dto:CreateMeetingInvitationDto){return this.guests.create(req.user.sub,id,dto);}
  @Post('invitations/:invitationId/revoke') @Header('Cache-Control','private, no-store')
  revoke(@Req() req:any,@Param('id',uuid) id:string,@Param('invitationId',uuid) invitationId:string,@Body() dto:MeetingGuestVersionDto){return this.guests.revoke(req.user.sub,id,invitationId,dto.version);}
  @Post('guests/:guestId/decision') @Header('Cache-Control','private, no-store')
  decide(@Req() req:any,@Param('id',uuid) id:string,@Param('guestId',uuid) guestId:string,@Body() dto:DecideMeetingGuestDto){return this.guests.decide(req.user.sub,id,guestId,dto);}
}

// Capability-only guest API. No JWT/CRM session, no credentials in URLs or cookies.
@Controller('meeting-guests')
export class MeetingGuestPublicController {
  constructor(private readonly guests:MeetingGuestsService){}
  @Post('join') @Header('Cache-Control','private, no-store') @Header('Referrer-Policy','no-referrer')
  join(@Req() req:any,@Body() dto:JoinMeetingGuestDto){return this.guests.join(dto,req.socket.remoteAddress||'unknown');}
  @Post('status') @Header('Cache-Control','private, no-store') @Header('Referrer-Policy','no-referrer')
  status(@Req() req:any,@Body() dto:MeetingGuestTicketDto){return this.guests.status(dto.ticket,req.socket.remoteAddress||'unknown');}
  @Post('leave') @Header('Cache-Control','private, no-store') @Header('Referrer-Policy','no-referrer')
  leave(@Req() req:any,@Body() dto:MeetingGuestTicketDto){return this.guests.leave(dto.ticket,req.socket.remoteAddress||'unknown');}
}
