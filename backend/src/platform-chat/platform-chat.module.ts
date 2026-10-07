import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StaffGuard } from '../auth/staff.guard';
import { PlatformChatController } from './platform-chat.controller';
import { PlatformChatGateway } from './platform-chat.gateway';
import { PlatformChatService } from './platform-chat.service';
import { ChatRecordsService } from './chat-records.service';

@Module({ imports: [AuthModule], controllers: [PlatformChatController], providers: [PlatformChatService, PlatformChatGateway, ChatRecordsService, StaffGuard], exports: [PlatformChatGateway] })
export class PlatformChatModule {}
