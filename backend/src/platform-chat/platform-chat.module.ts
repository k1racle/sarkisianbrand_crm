import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RolesGuard } from '../common/guards/roles.guard';
import { PlatformChatController } from './platform-chat.controller';
import { PlatformChatGateway } from './platform-chat.gateway';
import { PlatformChatService } from './platform-chat.service';

@Module({ imports: [AuthModule], controllers: [PlatformChatController], providers: [PlatformChatService, PlatformChatGateway, RolesGuard], exports: [PlatformChatGateway] })
export class PlatformChatModule {}
