import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { AccountListQueryDto, CreateBotCommandDto, CreateEmployeeDto, ReviewProfileChangeDto, SetTemporaryPasswordDto, UpdateAccountDto, UpdateBotCommandDto, UpdateEmployeeDto, UpdateEmployeePermissionsDto, UpdateIntegrationDto, UpsertBotIdentityDto } from './dto/system-settings.dto';
import { SystemSettingsService } from './system-settings.service';
import { DepartmentsService } from './departments.service';
import { DepartmentDto, UpdateDepartmentDto, DepartmentVersionDto, DepartmentListDto } from './dto/department.dto';

@ApiTags('system-settings')
@ApiBearerAuth()
@Controller('system-settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Permissions('system.manage')
export class SystemSettingsController {
  constructor(private readonly settings: SystemSettingsService, private readonly departments: DepartmentsService) {}
  @Get('departments') listDepartments(@Query() query: DepartmentListDto) { return this.departments.list(query.status === 'archived'); }
  @Post('departments') createDepartment(@Body() dto: DepartmentDto, @Req() request: any) { return this.departments.save(dto, request.user.sub); }
  @Patch('departments/:id') updateDepartment(@Param('id') id: string, @Body() dto: UpdateDepartmentDto, @Req() request: any) { return this.departments.save(dto, request.user.sub, id); }
  @Post('departments/:id/archive') archiveDepartment(@Param('id') id: string, @Body() dto: DepartmentVersionDto, @Req() request: any) { return this.departments.archive(id, dto.version, request.user.sub); }
  @Post('departments/:id/restore') restoreDepartment(@Param('id') id: string, @Body() dto: DepartmentVersionDto, @Req() request: any) { return this.departments.restore(id, dto.version, request.user.sub); }
  @Get('dashboard') dashboard() { return this.settings.dashboard(); }
  @Get('staff') staff() { return this.settings.staff(); }
  @Post('staff') createEmployee(@Body() dto: CreateEmployeeDto) { return this.settings.createEmployee(dto); }
  @Patch('staff/:id') updateEmployee(@Param('id') id: string, @Body() dto: UpdateEmployeeDto, @Req() request: any) { return this.settings.updateEmployee(id, dto, request.user.sub); }
  @Delete('staff/:id/sessions') revokeSessions(@Param('id') id: string) { return this.settings.revokeSessions(id); }
  @Get('accounts') accounts(@Query() query: AccountListQueryDto) { return this.settings.accounts(query); }
  @Patch('accounts/:id') updateAccount(@Param('id') id: string, @Body() dto: UpdateAccountDto, @Req() request: any) { return this.settings.updateAccount(id, dto, request.user.sub); }
  @Post('accounts/:id/password-reset') createPasswordReset(@Param('id') id: string, @Req() request: any) { return this.settings.createPasswordReset(id, request.user.sub); }
  @Post('accounts/:id/temporary-password') setTemporaryPassword(@Param('id') id: string, @Body() dto: SetTemporaryPasswordDto, @Req() request: any) { return this.settings.setTemporaryPassword(id, request.user.sub, dto); }
  @Get('profile-change-requests') profileChangeRequests() { return this.settings.profileChangeRequests(); }
  @Post('profile-change-requests/:id/review') reviewProfileChange(@Param('id') id: string, @Body() dto: ReviewProfileChangeDto, @Req() request: any) { return this.settings.reviewProfileChange(id, request.user.sub, dto); }
  @Get('access') access() { return this.settings.accessMatrix(); }
  @Get('staff/:id/access-review') accessReview(@Param('id') id: string) { return this.settings.accessReview(id); }
  @Put('staff/:id/permissions') permissions(@Param('id') id: string, @Body() dto: UpdateEmployeePermissionsDto, @Req() request: any) { return this.settings.updatePermissions(id, dto, request.user.sub); }
  @Get('logs') logs() { return this.settings.technicalLogs(); }
  @Post('jobs/:id/retry') retryJob(@Param('id') id: string, @Req() request: any) { return this.settings.retryJob(id, request.user.sub); }
  @Get('integrations') integrations() { return this.settings.integrations(); }
  @Put('integrations/:key') updateIntegration(@Param('key') key: string, @Body() dto: UpdateIntegrationDto) { return this.settings.updateIntegration(key, dto); }
  @Post('integrations/:key/test') testIntegration(@Param('key') key: string) { return this.settings.testIntegration(key); }
  @Get('bot-commands') botCommands() { return this.settings.botCommands(); }
  @Post('bot-commands') createBotCommand(@Body() dto: CreateBotCommandDto) { return this.settings.createBotCommand(dto); }
  @Patch('bot-commands/:id') updateBotCommand(@Param('id') id: string, @Body() dto: UpdateBotCommandDto) { return this.settings.updateBotCommand(id, dto); }
  @Delete('bot-commands/:id') deleteBotCommand(@Param('id') id: string) { return this.settings.deleteBotCommand(id); }
  @Get('bot-events') botEvents() { return this.settings.botEvents(); }
  @Get('bot-identities') botIdentities() { return this.settings.botIdentities(); }
  @Put('bot-identities') upsertBotIdentity(@Body() dto: UpsertBotIdentityDto) { return this.settings.upsertBotIdentity(dto); }
  @Delete('bot-identities/:id') deleteBotIdentity(@Param('id') id: string) { return this.settings.deleteBotIdentity(id); }
}
