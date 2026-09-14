export interface ShippingAddress {
  country?: string;
  city: string;
  postalCode?: string;
  address: string;
}

export interface ShippingQuote {
  provider: string;
  amount: number;
  currency: string;
  estimatedDays: number;
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
