import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { ShippingAddress, Shipment, ShippingProvider, ShippingQuote } from './shipping-provider';

@Injectable()
export class CdekProvider extends ShippingProvider {
  async calculate(address: ShippingAddress, weightGrams: number): Promise<ShippingQuote> {
    const cityFactor = address.city.trim().toLowerCase() === 'москва' ? 1 : 1.35;
    return { provider: 'CDEK_TEST', amount: Math.round((390 + Math.max(weightGrams - 500, 0) * 0.35) * cityFactor), currency: 'RUB', estimatedDays: cityFactor === 1 ? 2 : 5 };
  }

  async createShipment(orderNumber: string, address: ShippingAddress, weightGrams: number): Promise<Shipment> {
    await this.calculate(address, weightGrams);
    const trackingNumber = `CDEK${createHash('sha1').update(`${orderNumber}:${address.city}`).digest('hex').slice(0, 12).toUpperCase()}`;
    return { provider: 'CDEK_TEST', trackingNumber, status: 'CREATED' };
  }
}
