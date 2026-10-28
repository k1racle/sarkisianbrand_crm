import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BusinessTeamService } from './business-team.service';
import { BusinessInvitationTokenDto, BusinessTeamVersionDto, InviteBusinessMemberDto, RegisterInvitedBusinessDto, TransferBusinessOwnerDto, UpdateBusinessMemberDto } from './dto/business-team.dto';

@Controller('b2b/team')
@UseGuards(JwtAuthGuard)
export class BusinessTeamController {
  constructor(private readonly team: BusinessTeamService) {}
  @Get() list(@Req() req: any) { return this.team.list(req.user.sub); }
  @Post('invitations') invite(@Req() req: any, @Body() dto: InviteBusinessMemberDto) { return this.team.invite(req.user.sub, dto); }
  @Post('invitations/:id/revoke') revoke(@Req() req: any, @Param('id') id: string, @Body() dto: BusinessTeamVersionDto) { return this.team.revoke(req.user.sub, id, dto.version); }
  @Patch('members/:id') update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateBusinessMemberDto) { return this.team.update(req.user.sub, id, dto); }
  @Post('transfer-ownership') @UseGuards(ThrottlerGuard) @Throttle({ default: { limit: 5, ttl: 60000 } })
  transfer(@Req() req: any, @Body() dto: TransferBusinessOwnerDto) { return this.team.transfer(req.user.sub, dto); }
}

@Controller('business-team-invitations')
@UseGuards(ThrottlerGuard)
@Throttle({ default: { limit: 10, ttl: 60000 } })
export class BusinessInvitationController {
  constructor(private readonly team: BusinessTeamService) {}
  @Post('preview') preview(@Body() dto: BusinessInvitationTokenDto) { return this.team.preview(dto.token); }
  @Post('accept') @UseGuards(JwtAuthGuard)
  accept(@Req() req: any, @Body() dto: BusinessInvitationTokenDto) { return this.team.accept(req.user.sub, dto.token); }
  @Post('register') @Throttle({ default: { limit: 3, ttl: 60000 } })
  register(@Req() req: any, @Body() dto: RegisterInvitedBusinessDto) { return this.team.register(dto, { ipAddress: req.ip, userAgent: req.headers['user-agent'] }); }
}
