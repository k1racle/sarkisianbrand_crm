import { Module } from '@nestjs/common';
import { ShippingController } from './shipping.controller';
import { ShippingProvider } from './shipping-provider';
import { ShippingService } from './shipping.service';
import { CdekProvider } from './cdek.provider';
import { OneCSyncModule } from '../1c-sync/1c-sync.module';

@Module({ imports: [OneCSyncModule], controllers: [ShippingController], providers: [ShippingService, CdekProvider, { provide: ShippingProvider, useExisting: CdekProvider }] })
export class ShippingModule {}
