import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RolesGuard } from '../common/guards/roles.guard';
import { PartnerAdminController, PartnerDocumentAdminController, PartnerGiftsAdminController, PartnerLegalAdminController, PartnerLinkController, PartnersController } from './partners.controller';
import { PartnersService } from './partners.service';
import { PartnerDocumentsService } from './partner-documents.service';
import { PartnerGiftsService } from './partner-gifts.service';
import { OneCSyncModule } from '../1c-sync/1c-sync.module';
@Module({imports:[AuthModule,OneCSyncModule],controllers:[PartnerLinkController,PartnersController,PartnerDocumentAdminController,PartnerLegalAdminController,PartnerGiftsAdminController,PartnerAdminController],providers:[PartnersService,PartnerDocumentsService,PartnerGiftsService,RolesGuard]})
export class PartnersModule{}
