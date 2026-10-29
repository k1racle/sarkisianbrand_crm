import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RolesGuard } from '../common/guards/roles.guard';
import { LmsAdminController, LmsPublicController, LmsStudentController } from './lms.controller';
import { LmsService } from './lms.service';
import { LmsPurchaseService } from './lms-purchase.service';
import { LmsLiveModule } from '../lms-live/lms-live.module';

@Module({ imports: [AuthModule, LmsLiveModule], controllers: [LmsAdminController,LmsPublicController,LmsStudentController], providers: [LmsService,LmsPurchaseService,RolesGuard] })
export class LmsModule {}
