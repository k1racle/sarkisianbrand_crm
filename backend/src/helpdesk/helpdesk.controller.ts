import { Body, Controller, Get, Header, Param, ParseEnumPipe, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { TicketSource, TicketStatus } from '@prisma/client';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CreateHelpdeskCommentDto, CreateHelpdeskTicketDto, PublicHelpdeskTicketDto, UpdateHelpdeskTicketDto } from './dto/helpdesk.dto';
import { HelpdeskService } from './helpdesk.service';

@ApiTags('helpdesk')
@ApiBearerAuth()
@Controller('helpdesk')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'IT_SUPPORT', 'SUPERVISOR', 'EXECUTIVE')
export class HelpdeskController {
  constructor(private readonly helpdesk: HelpdeskService) {}

  @Get('dashboard') @Header('Cache-Control', 'private, no-store') @Permissions('helpdesk.read') dashboard(@Req() req: any) { return this.helpdesk.dashboard(req.user.sub); }
  @Get('tickets') @Header('Cache-Control', 'private, no-store') @Permissions('helpdesk.read') tickets(@Req() req: any, @Query('status', new ParseEnumPipe(TicketStatus, { optional: true })) status?: TicketStatus, @Query('source', new ParseEnumPipe(TicketSource, { optional: true })) source?: TicketSource) { return this.helpdesk.tickets(req.user.sub, status, source); }
  @Get('tickets/:id') @Header('Cache-Control', 'private, no-store') @Permissions('helpdesk.read') ticket(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) { return this.helpdesk.ticket(req.user.sub, id); }
  @Post('tickets') @Permissions('helpdesk.write') create(@Body() dto: CreateHelpdeskTicketDto, @Req() request: any) { return this.helpdesk.create(request.user.sub, dto); }
  @Patch('tickets/:id') @Permissions('helpdesk.write') update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateHelpdeskTicketDto, @Req() req: any) { return this.helpdesk.update(req.user.sub, id, dto); }
  @Post('tickets/:id/comments') @Permissions('helpdesk.write') comment(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateHelpdeskCommentDto, @Req() request: any) { return this.helpdesk.addComment(request.user.sub, id, dto); }
  @Get('agents') @Header('Cache-Control', 'private, no-store') @Permissions('helpdesk.read') agents(@Req() req: any) { return this.helpdesk.agents(req.user.sub); }
}

@ApiTags('helpdesk')
@Controller('helpdesk/public')
export class HelpdeskPublicController {
  constructor(private readonly helpdesk: HelpdeskService) {}

  @Post('requests')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  create(@Body() dto: PublicHelpdeskTicketDto) { return this.helpdesk.createPublic(dto); }
}
