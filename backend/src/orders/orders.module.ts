import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OneCSyncModule } from '../1c-sync/1c-sync.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { StorefrontPricingService } from './storefront-pricing.service';
import { GiftCardsModule } from '../gift-cards/gift-cards.module';

@Module({ imports: [OneCSyncModule, AuthModule, NotificationsModule, GiftCardsModule], controllers: [OrdersController], providers: [OrdersService, StorefrontPricingService], exports: [OrdersService] })
export class OrdersModule {}
