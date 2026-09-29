import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RolesGuard } from '../common/guards/roles.guard';
import { PaymentCalendarController } from './payment-calendar.controller';
import { PaymentCalendarService } from './payment-calendar.service';
@Module({imports:[AuthModule],controllers:[PaymentCalendarController],providers:[PaymentCalendarService,RolesGuard]})
export class PaymentCalendarModule {}
