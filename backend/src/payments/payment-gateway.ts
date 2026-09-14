export interface PaymentRequest {
  orderNumber: string;
  amount: number;
  currency: string;
  returnUrl?: string;
}

export interface PaymentSession {
  provider: string;
  paymentId: string;
  confirmationUrl: string;
}

export abstract class PaymentGateway {
  abstract createPayment(request: PaymentRequest): Promise<PaymentSession>;
}
