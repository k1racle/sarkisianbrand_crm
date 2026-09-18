import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PartnersService } from './partners.service';
import { PartnerInviteDto, PartnerJoinDto, PartnerParticipantDto, PartnerPayoutDecisionDto, PartnerPayoutRequestDto, PartnerSettingsDto, PartnerTrackDto, PartnerVerificationDto } from './partners.dto';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';

@Controller('partners/link')
@UseGuards(ThrottlerGuard)
export class PartnerLinkController {
 constructor(private readonly service:PartnersService){}
 @Get(':code') link(@Param('code') code:string){return this.service.link(code);}
 @Post(':code/visit') @Throttle({default:{limit:10,ttl:60000}}) track(@Param('code') code:string,@Body() dto:PartnerTrackDto){return this.service.track(code,dto);}
}
@Controller('partners')
@UseGuards(JwtAuthGuard)
export class PartnersController {
 constructor(private readonly service:PartnersService){}
 @Get('me/:kind') me(@Req() req:any,@Param('kind') kind:string){return this.service.me(req.user.sub,kind);}
 @Post('join') join(@Req() req:any,@Body() dto:PartnerJoinDto){return this.service.join(req.user.sub,dto);}
 @Post('payouts') payout(@Req() req:any,@Body() dto:PartnerPayoutRequestDto){return this.service.requestPayout(req.user.sub,dto);}
 @Post('payouts/:id/cancel') cancel(@Req() req:any,@Param('id') id:string){return this.service.cancelPayout(req.user.sub,id);}
}
@Controller('partners/admin')
@UseGuards(JwtAuthGuard,RolesGuard)
@Roles('ADMIN','SUPERVISOR','MANAGER_SALES')
export class PartnerAdminController {
 constructor(private readonly service:PartnersService){}
 @Post('bloggers/invite') @Roles('ADMIN','SUPERVISOR') @Permissions('partners.write') invite(@Req() req:any,@Body() dto:PartnerInviteDto){return this.service.invite(dto,req.user.sub);}
 @Get(':kind/:section') @Permissions('partners.read') overview(@Param('kind') kind:string,@Param('section') section:string,@Query('search') search?:string,@Query('page') page?:string){return this.service.overview(kind,section,search,page);}
 @Patch(':kind/settings') @Roles('ADMIN','SUPERVISOR') @Permissions('partners.write') settings(@Param('kind') kind:string,@Body() dto:PartnerSettingsDto){return this.service.updateSettings(kind,dto);}
 @Patch('participants/:id') @Roles('ADMIN','SUPERVISOR') @Permissions('partners.write') participant(@Req() req:any,@Param('id') id:string,@Body() dto:PartnerParticipantDto){return this.service.participant(id,dto,req.user.sub);}
 @Patch('participants/:id/verification') @Roles('ADMIN') @Permissions('partners.payouts') verification(@Req() req:any,@Param('id') id:string,@Body() dto:PartnerVerificationDto){return this.service.verify(id,dto,req.user.sub);}
 @Post('registrations/:id/verify') @Roles('ADMIN','SUPERVISOR') @Permissions('partners.write') registration(@Req() req:any,@Param('id') id:string,@Body() dto:PartnerVerificationDto){return this.service.verifyRegistration(id,dto.note,req.user.sub);}
 @Post('settle') @Roles('ADMIN','SUPERVISOR') @Permissions('partners.write') settle(@Req() req:any){return this.service.settle(req.user.sub);}
 @Patch('payouts/:id') @Roles('ADMIN') @Permissions('partners.payouts') decide(@Req() req:any,@Param('id') id:string,@Body() dto:PartnerPayoutDecisionDto){return this.service.decidePayout(id,dto,req.user.sub);}
}
