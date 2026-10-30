import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RolesGuard } from '../common/guards/roles.guard';
import { LmsLiveAdminController, LmsLiveStudentController, LmsLiveMediaGatewayController } from './lms-live.controller';
import { LmsLiveService } from './lms-live.service';
import { LmsLiveMediaService } from './lms-live-media.service';
import { LmsLiveMediaAdapter } from './lms-live-media.adapter';

@Module({ imports: [AuthModule], controllers: [LmsLiveAdminController, LmsLiveStudentController, LmsLiveMediaGatewayController], providers: [LmsLiveService, LmsLiveMediaService, LmsLiveMediaAdapter, RolesGuard] })
export class LmsLiveModule {}
