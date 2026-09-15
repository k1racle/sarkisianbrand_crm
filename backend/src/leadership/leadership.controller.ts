import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { LeadershipService } from './leadership.service';

@ApiTags('leadership')
@ApiBearerAuth()
@Controller('leadership')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'EXECUTIVE', 'SUPERVISOR')
export class LeadershipController {
  constructor(private readonly leadership: LeadershipService) {}
  @Get('overview') @Permissions('leadership.read') overview() { return this.leadership.overview(); }
}
