import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentGateway } from './payment-gateway';
import { PaymentsService } from './payments.service';
import { YooKassaGateway } from './yookassa.gateway';
import { LoyaltyModule } from '../loyalty/loyalty.module';
import { OneCSyncModule } from '../1c-sync/1c-sync.module';

@Module({ imports: [LoyaltyModule, OneCSyncModule], controllers: [PaymentsController], providers: [PaymentsService, YooKassaGateway, { provide: PaymentGateway, useExisting: YooKassaGateway }] })
export class PaymentsModule {}
