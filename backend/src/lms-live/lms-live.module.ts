import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RolesGuard } from '../common/guards/roles.guard';
import { LmsLiveAdminController, LmsLiveStudentController } from './lms-live.controller';
import { LmsLiveService } from './lms-live.service';

@Module({ imports: [AuthModule], controllers: [LmsLiveAdminController, LmsLiveStudentController], providers: [LmsLiveService, RolesGuard] })
export class LmsLiveModule {}
