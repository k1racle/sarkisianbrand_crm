import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { ContactMessagesService } from './contact-messages.service';
import { SubmitContactMessageDto, UpdateContactFormSettingDto } from './contact-messages.dto';

@Controller('contact-messages')
export class PublicContactMessagesController {
  constructor(private readonly messages: ContactMessagesService) {}

  @Post() @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @UseGuards(ThrottlerGuard)
  submit(@Body() dto: SubmitContactMessageDto) { return this.messages.submit(dto); }
}

@Controller('admin/contact-messages')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'MANAGER_SALES', 'SUPERVISOR')
export class AdminContactMessagesController {
  constructor(private readonly messages: ContactMessagesService) {}

  @Get() @Permissions('crm.read') list(@Query('page') page?: string, @Query('unread') unread?: string) { return this.messages.list(page, unread); }
  @Get('settings') @Permissions('crm.read') settings() { return this.messages.settings(); }
  @Patch('settings') @Roles('ADMIN', 'SUPERVISOR') @Permissions('crm.write') updateSettings(@Body() dto: UpdateContactFormSettingDto) { return this.messages.updateSettings(dto); }
  @Patch(':id/read') @Permissions('crm.write') markRead(@Param('id') id: string) { return this.messages.markRead(id); }
}
