import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RolesGuard } from '../common/guards/roles.guard';
import { WorkScheduleController } from './work-schedule.controller';
import { WorkScheduleService } from './work-schedule.service';
@Module({ imports: [AuthModule], controllers: [WorkScheduleController], providers: [WorkScheduleService, RolesGuard] })
export class WorkScheduleModule {}
