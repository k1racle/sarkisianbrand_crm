export interface PaymentRequest {
  orderNumber: string;
  orderId: string;
  localPaymentId: string;
  idempotenceKey: string;
  amount: string;
  currency: string;
  returnUrl?: string;
}

export interface VerifiedPayment {
  id: string;
  status: 'pending' | 'waiting_for_capture' | 'succeeded' | 'canceled';
  paid: boolean;
  test: boolean;
  amount: { value: string; currency: string };
  metadata: Record<string, string>;
  confirmation?: { type: string; confirmation_url?: string };
}

export interface PaymentSession {
  provider: 'YOOKASSA';
  paymentId: string;
  confirmationUrl: string | null;
  status: 'PENDING' | 'SUCCEEDED' | 'CANCELED';
}

export interface PaymentCapabilities {
  provider: 'YOOKASSA';
  available: boolean;
  externalCallsEnabled: boolean;
  configured: boolean;
  environment: 'TEST' | 'PRODUCTION' | null;
  reason: string | null;
}

export abstract class PaymentGateway {
  abstract capabilities(): Promise<PaymentCapabilities>;
  abstract assertAvailable(): Promise<void>;
  abstract validateReturnUrl(returnUrl?: string): string;
  abstract createPayment(request: PaymentRequest): Promise<VerifiedPayment>;
  abstract getPayment(paymentId: string): Promise<VerifiedPayment>;
}
