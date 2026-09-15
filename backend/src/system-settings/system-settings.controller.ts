import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateEmployeeDto, UpdateEmployeeDto, UpdateEmployeePermissionsDto } from './dto/system-settings.dto';
import { SystemSettingsService } from './system-settings.service';

@ApiTags('system-settings')
@ApiBearerAuth()
@Controller('system-settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Permissions('system.manage')
export class SystemSettingsController {
  constructor(private readonly settings: SystemSettingsService) {}
  @Get('dashboard') dashboard() { return this.settings.dashboard(); }
  @Get('staff') staff() { return this.settings.staff(); }
  @Post('staff') createEmployee(@Body() dto: CreateEmployeeDto) { return this.settings.createEmployee(dto); }
  @Patch('staff/:id') updateEmployee(@Param('id') id: string, @Body() dto: UpdateEmployeeDto, @Req() request: any) { return this.settings.updateEmployee(id, dto, request.user.sub); }
  @Delete('staff/:id/sessions') revokeSessions(@Param('id') id: string) { return this.settings.revokeSessions(id); }
  @Get('access') access() { return this.settings.accessMatrix(); }
  @Put('staff/:id/permissions') permissions(@Param('id') id: string, @Body() dto: UpdateEmployeePermissionsDto) { return this.settings.updatePermissions(id, dto); }
  @Get('logs') logs() { return this.settings.technicalLogs(); }
  @Post('jobs/:id/retry') retryJob(@Param('id') id: string, @Req() request: any) { return this.settings.retryJob(id, request.user.sub); }
}
