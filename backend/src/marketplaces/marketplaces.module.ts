import { Module } from '@nestjs/common';
import { MarketplacesController } from './marketplaces.controller';
import { MarketplacesService } from './marketplaces.service';
import { AuthModule } from '../auth/auth.module';
import { RolesGuard } from '../common/guards/roles.guard';
import { OmsModule } from '../oms/oms.module';
import { SystemSettingsModule } from '../system-settings/system-settings.module';
import { WildberriesFbsController } from './wildberries-fbs.controller';
import { WildberriesFbsService } from './wildberries-fbs.service';
import { OzonSyncController } from './ozon-sync.controller';
import { OzonSyncService } from './ozon-sync.service';

@Module({ imports: [AuthModule, OmsModule, SystemSettingsModule], controllers: [MarketplacesController, WildberriesFbsController, OzonSyncController], providers: [MarketplacesService, WildberriesFbsService, OzonSyncService, RolesGuard], exports: [MarketplacesService] })
export class MarketplacesModule {}
