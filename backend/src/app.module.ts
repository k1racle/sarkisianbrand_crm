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
  ],
})
export class AppModule {}
