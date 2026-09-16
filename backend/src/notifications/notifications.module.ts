import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { IntegrationSecretsService } from '../system-settings/integration-secrets.service';
import { NotificationsService } from './notifications.service';
import { SmtpMailService } from './smtp-mail.service';

// SystemSettingsModule imports AuthModule; use a local stateless secrets provider to avoid a cycle.
@Module({
  imports: [ConfigModule, PrismaModule],
  providers: [IntegrationSecretsService, SmtpMailService, NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
