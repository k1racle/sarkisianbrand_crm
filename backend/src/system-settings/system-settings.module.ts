import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RolesGuard } from '../common/guards/roles.guard';
import { SystemSettingsController } from './system-settings.controller';
import { SystemSettingsService } from './system-settings.service';
import { IntegrationSecretsService } from './integration-secrets.service';
import { DepartmentsService } from './departments.service';
import { AccessProfilesController } from './access-profiles.controller';
import { AccessProfilesService } from './access-profiles.service';

@Module({ imports: [AuthModule], controllers: [SystemSettingsController, AccessProfilesController], providers: [SystemSettingsService, DepartmentsService, AccessProfilesService, IntegrationSecretsService, RolesGuard], exports: [IntegrationSecretsService] })
export class SystemSettingsModule {}
