import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RolesGuard } from '../common/guards/roles.guard';
import { OmsController } from './oms.controller';
import { OmsService } from './oms.service';
import { OneCSyncModule } from '../1c-sync/1c-sync.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({ imports: [AuthModule, OneCSyncModule, NotificationsModule], controllers: [OmsController], providers: [OmsService, RolesGuard], exports: [OmsService] })
export class OmsModule {}
