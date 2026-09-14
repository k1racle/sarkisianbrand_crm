import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PaymentGateway, PaymentRequest, PaymentSession } from './payment-gateway';

@Injectable()
export class YooKassaGateway extends PaymentGateway {
  async createPayment(request: PaymentRequest): Promise<PaymentSession> {
    const paymentId = `test_${randomUUID()}`;
    return { provider: 'YOOKASSA_TEST', paymentId, confirmationUrl: `${request.returnUrl || 'http://localhost:3000/payment/return'}?paymentId=${paymentId}` };
  }
}
