import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { StaffNotificationsController } from './staff-notifications.controller';
import { StaffNotificationsService } from './staff-notifications.service';
@Module({ imports: [AuthModule, PrismaModule], controllers: [StaffNotificationsController], providers: [StaffNotificationsService] })
export class StaffNotificationsModule {}
