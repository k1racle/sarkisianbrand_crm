import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RolesGuard } from '../common/guards/roles.guard';
import { SystemSettingsController } from './system-settings.controller';
import { SystemSettingsService } from './system-settings.service';

@Module({ imports: [AuthModule], controllers: [SystemSettingsController], providers: [SystemSettingsService, RolesGuard] })
export class SystemSettingsModule {}
