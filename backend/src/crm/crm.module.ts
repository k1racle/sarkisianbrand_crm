import { Module } from '@nestjs/common';
import { CrmController } from './crm.controller';
import { CrmService } from './crm.service';
import { AuthModule } from '../auth/auth.module';
import { RolesGuard } from '../common/guards/roles.guard';
import { PlatformChatModule } from '../platform-chat/platform-chat.module';
import { CrmReminderScheduler } from './crm-reminder.scheduler';

@Module({ imports: [AuthModule, PlatformChatModule], controllers: [CrmController], providers: [CrmService, CrmReminderScheduler, RolesGuard] })
export class CrmModule {}
