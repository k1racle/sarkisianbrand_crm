import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { B2BController } from './b2b.controller';
import { B2BService } from './b2b.service';
import { OneCSyncModule } from '../1c-sync/1c-sync.module';
import { SalonBookingService } from './salon-booking.service';
import { SalonBookingController } from './salon-booking.controller';

@Module({ imports: [AuthModule, OneCSyncModule], controllers: [B2BController, SalonBookingController], providers: [B2BService, SalonBookingService] })
export class B2BModule {}
