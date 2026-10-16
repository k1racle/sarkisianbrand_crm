import { Body, Controller, Get, Param, Patch, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PartnersService } from './partners.service';
import { PartnerInviteDto, PartnerJoinDto, PartnerParticipantDto, PartnerPayoutDecisionDto, PartnerPayoutRequestDto, PartnerSettingsDto, PartnerTrackDto, PartnerVerificationDto } from './partners.dto';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { PartnerDocumentsService } from './partner-documents.service';
import { PartnerAdminGenerateDto, PartnerDocumentSettingsDto, PartnerDocumentTemplateDto, PartnerGenerateDocumentsDto, PartnerLegalEntityDto, PartnerLegalProfileDto } from './partner-documents.dto';
import { PartnerGiftsService } from './partner-gifts.service';
import { CreatePartnerGiftDto } from './partner-gifts.dto';

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
 constructor(private readonly service:PartnersService,private readonly docs:PartnerDocumentsService){}
 @Get('me/:kind') me(@Req() req:any,@Param('kind') kind:string){return this.service.me(req.user.sub,kind);}
 @Get('documents/:kind') documents(@Req() req:any,@Param('kind') kind:string){return this.docs.workspace(req.user.sub,kind);}
 @Patch('legal-profile') legalProfile(@Req() req:any,@Body() dto:PartnerLegalProfileDto){return this.docs.saveProfile(req.user.sub,dto);}
 @Post('documents/:kind/generate') generate(@Req() req:any,@Param('kind') kind:string,@Body() dto:PartnerGenerateDocumentsDto){return this.docs.generate(req.user.sub,kind,dto);}
 @Get('documents/download/:id') async download(@Req() req:any,@Param('id') id:string,@Res() res:Response){const doc=await this.docs.download(req.user.sub,id);res.setHeader('Content-Type','application/msword; charset=utf-8');res.setHeader('Content-Disposition',`attachment; filename="${doc.fileName}"`);res.send('\uFEFF'+doc.contentHtml);}
 @Post('join') join(@Req() req:any,@Body() dto:PartnerJoinDto){return this.service.join(req.user.sub,dto);}
 @Post('payouts') payout(@Req() req:any,@Body() dto:PartnerPayoutRequestDto){return this.service.requestPayout(req.user.sub,dto);}
 @Post('payouts/:id/cancel') cancel(@Req() req:any,@Param('id') id:string){return this.service.cancelPayout(req.user.sub,id);}
}

@Controller('partners/admin/legal-entities')
@UseGuards(JwtAuthGuard,RolesGuard)
@Roles('ADMIN','SUPERVISOR')
export class PartnerLegalAdminController {
 constructor(private readonly docs:PartnerDocumentsService){}
 @Get() @Permissions('partners.read') list(){return this.docs.adminEntities();}
 @Post() @Permissions('partners.write') create(@Body() dto:PartnerLegalEntityDto){return this.docs.saveEntity(dto);}
 @Patch(':id') @Permissions('partners.write') update(@Param('id') id:string,@Body() dto:PartnerLegalEntityDto){return this.docs.saveEntity(dto,id);}
}

@Controller('partners/admin/documents')
@UseGuards(JwtAuthGuard,RolesGuard)
@Roles('ADMIN','SUPERVISOR')
export class PartnerDocumentAdminController {
 constructor(private readonly docs:PartnerDocumentsService){}
 @Get('workspace') @Permissions('partners.read') workspace(){return this.docs.adminWorkspace();}
 @Get('participants') @Permissions('partners.read') participants(@Query('search') search?:string){return this.docs.adminParticipants(search);}
 @Post('templates') @Permissions('partners.write') template(@Body() dto:PartnerDocumentTemplateDto){return this.docs.saveTemplate(dto);}
 @Post('templates/:id/activate') @Permissions('partners.write') activate(@Param('id') id:string){return this.docs.activateTemplate(id);}
 @Patch('settings') @Permissions('partners.write') settings(@Body() dto:PartnerDocumentSettingsDto){return this.docs.saveDocumentSettings(dto);}
 @Post('generate') @Permissions('partners.write') generate(@Body() dto:PartnerAdminGenerateDto){return this.docs.adminGenerate(dto);}
 @Get('download/:id') @Permissions('partners.write') async download(@Param('id') id:string,@Res() res:Response){const doc=await this.docs.adminDownload(id);res.setHeader('Content-Type','application/msword; charset=utf-8');res.setHeader('Content-Disposition',`attachment; filename="${doc.fileName}"`);res.send('\uFEFF'+doc.contentHtml);}
}

@Controller('partners/admin/gifts')
@UseGuards(JwtAuthGuard,RolesGuard)
@Roles('ADMIN','SUPERVISOR')
export class PartnerGiftsAdminController {
 constructor(private readonly gifts:PartnerGiftsService){}
 @Get() @Permissions('partners.read') workspace(){return this.gifts.workspace();}
 @Post() @Permissions('partners.write') create(@Req() req:any,@Body() dto:CreatePartnerGiftDto){return this.gifts.create(req.user.sub,dto);}
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
