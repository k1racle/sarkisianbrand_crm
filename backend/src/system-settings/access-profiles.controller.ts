import { CompanyScope, CompanyScopeGuard } from '../common/guards/company-scope.guard';
import { Body, Controller, Get, Header, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { AccessProfilesService } from './access-profiles.service';
import { AccessProfileQueryDto, AccessProfileVersionDto, AssignAccessProfilesDto, ResetAccessProfilesDto, CreateAccessProfileDto, PreviewAccessProfilesDto, UpdateAccessProfileDto } from './dto/access-profile.dto';

@ApiTags('system-settings') @ApiBearerAuth()
@Controller('system-settings/access-profiles')
@UseGuards(JwtAuthGuard, RolesGuard, CompanyScopeGuard)
@CompanyScope('system.manage') @Roles('ADMIN') @Permissions('system.manage')
export class AccessProfilesController {
  constructor(private readonly profiles: AccessProfilesService) {}
  @Get('catalog') @Header('Cache-Control', 'private, no-store') catalog() { return this.profiles.catalog(); }
  @Get() @Header('Cache-Control', 'private, no-store') list(@Query() query: AccessProfileQueryDto) { return this.profiles.list(query); }
  @Post('preview') @Header('Cache-Control', 'private, no-store') preview(@Body() dto: PreviewAccessProfilesDto) { return this.profiles.preview(dto); }
  @Get('employees/:id') @Header('Cache-Control', 'private, no-store') assignment(@Param('id', ParseUUIDPipe) id: string) { return this.profiles.assignment(id); }
  @Post('assign') assign(@Body() dto: AssignAccessProfilesDto, @Req() req: any) { return this.profiles.assign(dto, req.user.sub); }
  @Post('employees/:id/restore-role') reset(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ResetAccessProfilesDto, @Req() req: any) { return this.profiles.reset(id, dto.expectedAccessVersion, req.user.sub); }
  @Get(':id') @Header('Cache-Control', 'private, no-store') get(@Param('id', ParseUUIDPipe) id: string) { return this.profiles.get(id); }
  @Post() create(@Body() dto: CreateAccessProfileDto, @Req() req: any) { return this.profiles.save(dto, req.user.sub); }
  @Patch(':id') update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAccessProfileDto, @Req() req: any) { return this.profiles.save(dto, req.user.sub, id); }
  @Post(':id/archive') archive(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AccessProfileVersionDto, @Req() req: any) { return this.profiles.archive(id, dto.version, req.user.sub); }
  @Post(':id/restore') restore(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AccessProfileVersionDto, @Req() req: any) { return this.profiles.archive(id, dto.version, req.user.sub, true); }
}
