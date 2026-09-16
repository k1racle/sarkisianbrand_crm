export interface ShippingAddress {
  country?: string;
  city: string;
  postalCode?: string;
  address: string;
  cityCode?: number;
  deliveryMethod?: 'COURIER' | 'PICKUP_POINT';
  pickupPointCode?: string;
}

export interface ShippingQuote {
  provider: string;
  amount: number | null;
  currency: string;
  estimatedDays?: number;
  available: boolean;
  requiresConfirmation: boolean;
  message: string;
}

export interface Shipment {
  provider: string;
  trackingNumber: string;
  status: string;
}

export abstract class ShippingProvider {
  abstract calculate(address: ShippingAddress, weightGrams: number): Promise<ShippingQuote>;
  abstract createShipment(orderNumber: string, address: ShippingAddress, weightGrams: number): Promise<Shipment>;
}
