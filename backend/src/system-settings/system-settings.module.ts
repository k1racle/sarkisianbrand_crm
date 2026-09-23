import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RolesGuard } from '../common/guards/roles.guard';
import { SystemSettingsController } from './system-settings.controller';
import { SystemSettingsService } from './system-settings.service';
import { IntegrationSecretsService } from './integration-secrets.service';
import { DepartmentsService } from './departments.service';

@Module({ imports: [AuthModule], controllers: [SystemSettingsController], providers: [SystemSettingsService, DepartmentsService, IntegrationSecretsService, RolesGuard], exports: [IntegrationSecretsService] })
export class SystemSettingsModule {}
