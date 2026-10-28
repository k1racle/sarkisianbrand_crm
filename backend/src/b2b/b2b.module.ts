import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { B2BController } from './b2b.controller';
import { B2BService } from './b2b.service';
import { OneCSyncModule } from '../1c-sync/1c-sync.module';
import { SalonBookingService } from './salon-booking.service';
import { SalonBookingController } from './salon-booking.controller';
import { BusinessContextMiddleware } from './business-context';
import { BusinessInvitationController, BusinessTeamController } from './business-team.controller';
import { BusinessTeamService } from './business-team.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { BusinessRegistrationController } from './business-registration.controller';
import { BusinessRegistrationService } from './business-registration.service';

@Module({ imports: [AuthModule, OneCSyncModule, NotificationsModule], controllers: [B2BController, SalonBookingController, BusinessTeamController, BusinessInvitationController, BusinessRegistrationController], providers: [B2BService, SalonBookingService, BusinessTeamService, BusinessRegistrationService] })
export class B2BModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(BusinessContextMiddleware).forRoutes(B2BController, BusinessTeamController);
  }
}
