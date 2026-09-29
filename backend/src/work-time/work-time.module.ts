import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RolesGuard } from '../common/guards/roles.guard';
import { WorkTimeController } from './work-time.controller';
import { WorkTimeService } from './work-time.service';
import { TimeCorrectionService } from './time-correction.service';
import { TimesheetService } from './timesheet.service';
@Module({ imports: [AuthModule], controllers: [WorkTimeController], providers: [WorkTimeService, TimeCorrectionService, TimesheetService, RolesGuard] })
export class WorkTimeModule {}
