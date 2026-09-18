import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RolesGuard } from '../common/guards/roles.guard';
import { PartnerAdminController, PartnerLinkController, PartnersController } from './partners.controller';
import { PartnersService } from './partners.service';
@Module({imports:[AuthModule],controllers:[PartnerLinkController,PartnersController,PartnerAdminController],providers:[PartnersService,RolesGuard]})
export class PartnersModule{}
