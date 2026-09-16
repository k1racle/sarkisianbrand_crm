import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StorefrontController } from './storefront.controller';
import { StorefrontService } from './storefront.service';
import { OrdersModule } from '../orders/orders.module';
import { LoyaltyModule } from '../loyalty/loyalty.module';

@Module({ imports: [AuthModule, OrdersModule, LoyaltyModule], controllers: [StorefrontController], providers: [StorefrontService] })
export class StorefrontModule {}
