import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { LoyaltyOperationDto, UpdateLoyaltyProgramDto } from './dto/loyalty.dto';
import { LoyaltyService } from './loyalty.service';

@ApiTags('loyalty')
@ApiBearerAuth()
@Controller('loyalty')
@UseGuards(JwtAuthGuard)
export class LoyaltyController {
  constructor(private readonly loyalty: LoyaltyService) {}

  @Get('me')
  me(@Req() request: any) { return this.loyalty.account(request.user.sub); }

  @Get('admin/overview')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGER_SALES', 'SUPERVISOR')
  @Permissions('loyalty.read')
  overview(@Query('search') search?: string) { return this.loyalty.overview(search); }

  @Get('admin/users/:userId')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGER_SALES', 'SUPERVISOR')
  @Permissions('loyalty.read')
  user(@Param('userId') userId: string) { return this.loyalty.byUser(userId); }

  @Patch('admin/settings')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPERVISOR')
  @Permissions('loyalty.write')
  updateSettings(@Body() dto: UpdateLoyaltyProgramDto) { return this.loyalty.updateSettings(dto); }

  @Post('admin/users/:userId/accrual')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGER_SALES', 'SUPERVISOR')
  @Permissions('loyalty.write')
  accrual(@Param('userId') userId: string, @Body() dto: LoyaltyOperationDto) { return this.loyalty.operation(userId, dto, 'ACCRUAL'); }

  @Post('admin/users/:userId/write-off')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGER_SALES', 'SUPERVISOR')
  @Permissions('loyalty.write')
  writeOff(@Param('userId') userId: string, @Body() dto: LoyaltyOperationDto) { return this.loyalty.operation(userId, dto, 'WRITE_OFF'); }
}
