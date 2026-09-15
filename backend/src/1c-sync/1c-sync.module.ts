import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RolesGuard } from '../common/guards/roles.guard';
import { OneCSyncController, OneCWebhookController } from './1c-sync.controller';
import { OneCSyncService } from './1c-sync.service';
import { OneCClientService } from './one-c-client.service';
import { SystemSettingsModule } from '../system-settings/system-settings.module';

@Module({ imports: [AuthModule, SystemSettingsModule], controllers: [OneCSyncController, OneCWebhookController], providers: [OneCSyncService, OneCClientService, RolesGuard], exports: [OneCSyncService] })
export class OneCSyncModule {}
