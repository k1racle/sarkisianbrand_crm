import { Module } from '@nestjs/common';
import { ShippingController } from './shipping.controller';
import { ShippingProvider } from './shipping-provider';
import { ShippingService } from './shipping.service';
import { CdekProvider } from './cdek.provider';
import { OneCSyncModule } from '../1c-sync/1c-sync.module';
import { AuthModule } from '../auth/auth.module';
import { SystemSettingsModule } from '../system-settings/system-settings.module';
import { RolesGuard } from '../common/guards/roles.guard';

@Module({ imports: [OneCSyncModule, AuthModule, SystemSettingsModule], controllers: [ShippingController], providers: [ShippingService, CdekProvider, RolesGuard, { provide: ShippingProvider, useExisting: CdekProvider }], exports: [ShippingService] })
export class ShippingModule {}
