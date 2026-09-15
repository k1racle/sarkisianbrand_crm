import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { TicketSource, TicketStatus } from '@prisma/client';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CreateHelpdeskCommentDto, CreateHelpdeskTicketDto, UpdateHelpdeskTicketDto } from './dto/helpdesk.dto';
import { HelpdeskService } from './helpdesk.service';

@ApiTags('helpdesk')
@ApiBearerAuth()
@Controller('helpdesk')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'IT_SUPPORT', 'SUPERVISOR')
export class HelpdeskController {
  constructor(private readonly helpdesk: HelpdeskService) {}

  @Get('dashboard') @Permissions('helpdesk.read') dashboard() { return this.helpdesk.dashboard(); }
  @Get('tickets') @Permissions('helpdesk.read') tickets(@Query('status') status?: TicketStatus, @Query('source') source?: TicketSource) { return this.helpdesk.tickets(status, source); }
  @Post('tickets') @Permissions('helpdesk.write') create(@Body() dto: CreateHelpdeskTicketDto, @Req() request: any) { return this.helpdesk.create(dto, request.user.sub); }
  @Patch('tickets/:id') @Permissions('helpdesk.write') update(@Param('id') id: string, @Body() dto: UpdateHelpdeskTicketDto) { return this.helpdesk.update(id, dto); }
  @Post('tickets/:id/comments') @Permissions('helpdesk.write') comment(@Param('id') id: string, @Body() dto: CreateHelpdeskCommentDto, @Req() request: any) { return this.helpdesk.addComment(id, dto, request.user.sub); }
  @Get('agents') @Permissions('helpdesk.read') agents() { return this.helpdesk.agents(); }
}

@ApiTags('helpdesk')
@Controller('helpdesk/public')
export class HelpdeskPublicController {
  constructor(private readonly helpdesk: HelpdeskService) {}

  @Post('requests')
  create(@Body() dto: CreateHelpdeskTicketDto) { return this.helpdesk.create(dto); }
}
