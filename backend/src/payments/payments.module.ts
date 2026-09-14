import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentGateway } from './payment-gateway';
import { PaymentsService } from './payments.service';
import { YooKassaGateway } from './yookassa.gateway';

@Module({ controllers: [PaymentsController], providers: [PaymentsService, YooKassaGateway, { provide: PaymentGateway, useExisting: YooKassaGateway }] })
export class PaymentsModule {}
