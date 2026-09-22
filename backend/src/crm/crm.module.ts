import { Module } from '@nestjs/common';
import { CrmController } from './crm.controller';
import { CrmService } from './crm.service';
import { AuthModule } from '../auth/auth.module';
import { RolesGuard } from '../common/guards/roles.guard';
import { PlatformChatModule } from '../platform-chat/platform-chat.module';
import { CrmReminderScheduler } from './crm-reminder.scheduler';
import { CrmDriveController } from './drive.controller';
import { CrmDriveService } from './drive.service';
import { CrmContentController } from './content.controller';
import { CrmContentService } from './content.service';

@Module({ imports: [AuthModule, PlatformChatModule], controllers: [CrmController, CrmDriveController, CrmContentController], providers: [CrmService, CrmDriveService, CrmContentService, CrmReminderScheduler, RolesGuard] })
export class CrmModule {}
