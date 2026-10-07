import { Body, Controller, Get, Header, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StaffNotificationsService } from './staff-notifications.service';
import { NotificationPreferencesDto, NotificationQueryDto, NotificationReadAllDto } from './staff-notifications.dto';

// Every operation checks active staff + current per-record scopes in the service.
@Controller('staff-notifications')
@UseGuards(JwtAuthGuard)
export class StaffNotificationsController {
  constructor(private readonly service: StaffNotificationsService) {}
  @Get() @Header('Cache-Control', 'private, no-store') list(@Req() req: any, @Query() query: NotificationQueryDto) { return this.service.list(req.user.sub, query); }
  @Post('read-all') readAll(@Req() req: any, @Body() dto: NotificationReadAllDto) { return this.service.readAll(req.user.sub, dto.through); }
  @Patch('preferences') preferences(@Req() req: any, @Body() dto: NotificationPreferencesDto) { return this.service.preferences(req.user.sub, dto); }
  @Get(':id') @Header('Cache-Control', 'private, no-store') detail(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) { return this.service.detail(req.user.sub, id); }
  @Post(':id/read') read(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) { return this.service.read(req.user.sub, id); }
}
