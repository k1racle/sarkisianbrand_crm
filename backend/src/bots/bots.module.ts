import { Module } from '@nestjs/common';
import { SystemSettingsModule } from '../system-settings/system-settings.module';
import { BotsController } from './bots.controller';
import { BotsService } from './bots.service';

@Module({ imports: [SystemSettingsModule], controllers: [BotsController], providers: [BotsService] })
export class BotsModule {}
