import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentGateway } from './payment-gateway';
import { PaymentsService } from './payments.service';
import { YooKassaGateway } from './yookassa.gateway';
import { OrdersModule } from '../orders/orders.module';
import { AuthModule } from '../auth/auth.module';
import { SystemSettingsModule } from '../system-settings/system-settings.module';
import { TBankGateway } from './tbank.gateway';
import { RobokassaGateway } from './robokassa.gateway';
import { AlternativePaymentsService } from './alternative-payments.service';

@Module({ imports: [OrdersModule, AuthModule, SystemSettingsModule], controllers: [PaymentsController], providers: [PaymentsService, AlternativePaymentsService, TBankGateway, RobokassaGateway, YooKassaGateway, { provide: PaymentGateway, useExisting: YooKassaGateway }] })
export class PaymentsModule {}
