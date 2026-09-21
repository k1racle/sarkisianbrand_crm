import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ProductsModule } from './products/products.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CartModule } from './cart/cart.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { ShippingModule } from './shipping/shipping.module';
import { CrmModule } from './crm/crm.module';
import { OneCSyncModule } from './1c-sync/1c-sync.module';
import { SeoModule } from './seo/seo.module';
import { AdminModule } from './admin/admin.module';
import { B2BModule } from './b2b/b2b.module';
import { MarketplacesModule } from './marketplaces/marketplaces.module';
import { LoyaltyModule } from './loyalty/loyalty.module';
import { HelpdeskModule } from './helpdesk/helpdesk.module';
import { LeadershipModule } from './leadership/leadership.module';
import { Customer360Module } from './customer360/customer360.module';
import { OmsModule } from './oms/oms.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditModule } from './audit/audit.module';
import { AuditInterceptor } from './audit/audit.interceptor';
import { SystemSettingsModule } from './system-settings/system-settings.module';
import { BackgroundJobsModule } from './background-jobs/background-jobs.module';
import { BotsModule } from './bots/bots.module';
import { PlatformChatModule } from './platform-chat/platform-chat.module';
import { DataLifecycleModule } from './data-lifecycle/data-lifecycle.module';
import { StorefrontModule } from './storefront/storefront.module';
import { SocialAuthModule } from './social-auth/social-auth.module';
import { PromotionsModule } from './promotions/promotions.module';
import { GiftCardsModule } from './gift-cards/gift-cards.module';
import { MediaModule } from './media/media.module';
import { PartnersModule } from './partners/partners.module';
import { ContactMessagesModule } from './contact-messages/contact-messages.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    
    // Rate Limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 10,
      },
    ]),
    
    PrismaModule,
    MediaModule,
    BackgroundJobsModule,
    AuthModule,
    CartModule,
    OrdersModule,
    PaymentsModule,
    ShippingModule,
    CrmModule,
    OneCSyncModule,
    SeoModule,
    AdminModule,
    B2BModule,
    ProductsModule,
    MarketplacesModule,
    LoyaltyModule,
    HelpdeskModule,
    LeadershipModule,
    Customer360Module,
    OmsModule,
    AuditModule,
    SystemSettingsModule,
    BotsModule,
    PlatformChatModule,
    DataLifecycleModule,
    StorefrontModule,
    SocialAuthModule,
    PromotionsModule,
    GiftCardsModule,
    PartnersModule,
    ContactMessagesModule,
  ],
  providers: [{ provide: APP_INTERCEPTOR, useExisting: AuditInterceptor }],
})
export class AppModule {}
