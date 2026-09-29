import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RolesGuard } from '../common/guards/roles.guard';
import { MeetingsController } from './meetings.controller';
import { MeetingsService } from './meetings.service';
import { MeetingGuestsService } from './meeting-guests.service';
import { MeetingGuestHostController, MeetingGuestPublicController } from './meeting-guests.controller';
import { MeetingMediaService } from './meeting-media.service';
import { MeetingMediaAdapter } from './meeting-media.adapter';
import { MeetingMediaController, MeetingGuestMediaController, MeetingMediaGatewayController } from './meeting-media.controller';

@Module({ imports: [AuthModule], controllers: [MeetingsController, MeetingGuestHostController, MeetingGuestPublicController, MeetingMediaController, MeetingGuestMediaController, MeetingMediaGatewayController], providers: [MeetingsService, MeetingGuestsService, MeetingMediaService, MeetingMediaAdapter, RolesGuard] })
export class MeetingsModule {}
