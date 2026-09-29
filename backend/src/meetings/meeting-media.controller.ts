import { Body, Controller, Get, Header, Headers, HttpCode, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { internalWorkspaceRoles } from '../auth/workspace-role-catalog';
import { MeetingGuestTicketDto, MeetingGuestVersionDto } from './meeting-guests.dto';
import { MeetingMediaService } from './meeting-media.service';
const uuid=new ParseUUIDPipe({version:'4'});
@Controller('crm/meetings/:id/media')
@UseGuards(JwtAuthGuard,RolesGuard) @Roles(...internalWorkspaceRoles) @Permissions('meetings.read')
export class MeetingMediaController {
  constructor(private readonly media:MeetingMediaService){}
  @Get() @Header('Cache-Control','private, no-store') status(@Req() req:any,@Param('id',uuid) id:string){return this.media.status(req.user.sub,id);}
  @Post('open') @Permissions('meetings.read','meetings.write') @Header('Cache-Control','private, no-store') open(@Req() req:any,@Param('id',uuid) id:string,@Body() dto:MeetingGuestVersionDto){return this.media.open(req.user.sub,id,dto.version);}
  @Post('close') @Permissions('meetings.read','meetings.write') @Header('Cache-Control','private, no-store') close(@Req() req:any,@Param('id',uuid) id:string,@Body() dto:MeetingGuestVersionDto){return this.media.close(req.user.sub,id,dto.version);}
  @Post('token') @Header('Cache-Control','private, no-store') token(@Req() req:any,@Param('id',uuid) id:string){return this.media.employeeToken(req.user.sub,id);}
}
@Controller('meeting-guests/media')
export class MeetingGuestMediaController {
  constructor(private readonly media:MeetingMediaService){}
  @Post('token') @Header('Cache-Control','private, no-store') @Header('Referrer-Policy','no-referrer')
  token(@Req() req:any,@Body() dto:MeetingGuestTicketDto){return this.media.guestToken(dto.ticket,req.socket.remoteAddress||'unknown');}
}
// Called by an internal Nginx auth_request, never exposed by the public reverse proxy.
@Controller('meeting-media-gateway')
export class MeetingMediaGatewayController {
  constructor(private readonly media:MeetingMediaService){}
  @Get('authorize') @HttpCode(204) @Header('Cache-Control','private, no-store')
  async authorize(@Headers('x-meeting-media-token') token:string,@Headers('x-meeting-gateway-key') key:string){await this.media.authorize(token,key);}
}
