import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StorefrontController } from './storefront.controller';
import { StorefrontService } from './storefront.service';

@Module({ imports: [AuthModule], controllers: [StorefrontController], providers: [StorefrontService] })
export class StorefrontModule {}
