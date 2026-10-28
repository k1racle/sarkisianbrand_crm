import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RolesGuard } from '../common/guards/roles.guard';
import { HelpdeskController, HelpdeskPublicController } from './helpdesk.controller';
import { HelpdeskService } from './helpdesk.service';
import { CrmReadAccess } from '../crm/read-access';
import { KnowledgeController } from './knowledge.controller';
import { KnowledgeService } from './knowledge.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [AuthModule, NotificationsModule],
  controllers: [HelpdeskController, HelpdeskPublicController, KnowledgeController],
  providers: [HelpdeskService, RolesGuard, CrmReadAccess, KnowledgeService],
})
export class HelpdeskModule {}
