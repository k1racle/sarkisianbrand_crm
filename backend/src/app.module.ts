import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { ProductsModule } from './products/products.module';
import { CartModule } from './cart/cart.module';
import { OrdersModule } from './orders/orders.module';
import { ShippingModule } from './shipping/shipping.module';
import { OneCSyncModule } from './1c-sync/1c-sync.module';
import { AdminModule } from './admin/admin.module';
import { SeoModule } from './seo/seo.module';
import { ChannelsModule } from './channels/channels.module';
import { B2BModule } from './b2b/b2b.module';
import { BotsModule } from './bots/bots.module';
import { LoyaltyModule } from './loyalty/loyalty.module';
import { BookingModule } from './booking/booking.module';
import { LmsModule } from './lms/lms.module';
import { CrmModule } from './crm/crm.module';

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
    
    // Core Modules (P0)
    AuthModule,
    ProductsModule,
    CartModule,
    OrdersModule,
    ShippingModule,
    OneCSyncModule,
    AdminModule,
    SeoModule,
    
    // Phase 2 Modules (P1/P2)
    ChannelsModule,
    B2BModule,
    BotsModule,
    LoyaltyModule,
    BookingModule,
    LmsModule,
    CrmModule,
  ],
})
export class AppModule {}
