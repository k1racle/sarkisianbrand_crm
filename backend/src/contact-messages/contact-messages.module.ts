import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuthModule } from '../auth/auth.module';
import { AdminContactMessagesController, PublicContactMessagesController } from './contact-messages.controller';
import { ContactMessagesService } from './contact-messages.service';

@Module({
  imports: [PrismaModule, NotificationsModule, AuthModule],
  controllers: [PublicContactMessagesController, AdminContactMessagesController],
  providers: [ContactMessagesService],
})
export class ContactMessagesModule {}
