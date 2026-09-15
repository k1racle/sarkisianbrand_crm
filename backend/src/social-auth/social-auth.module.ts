import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SystemSettingsModule } from '../system-settings/system-settings.module';
import { SocialAuthController } from './social-auth.controller';
import { SocialAuthService } from './social-auth.service';

@Module({ imports: [AuthModule, SystemSettingsModule], controllers: [SocialAuthController], providers: [SocialAuthService] })
export class SocialAuthModule {}
