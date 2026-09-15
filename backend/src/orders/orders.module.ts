import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OneCSyncModule } from '../1c-sync/1c-sync.module';

@Module({ imports: [OneCSyncModule], controllers: [OrdersController], providers: [OrdersService] })
export class OrdersModule {}
