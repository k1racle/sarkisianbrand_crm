import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuditService } from './audit.service';

@ApiTags('audit')
@ApiBearerAuth()
@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Permissions('security.audit.read')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  list(@Query('resource') resource?: string, @Query('action') action?: string, @Query('actorId') actorId?: string) {
    return this.audit.list(resource, action, actorId);
  }
}
