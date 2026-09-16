import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { RolesGuard } from '../common/guards/roles.guard';
import { MediaController, MediaFilesController } from './media.controller';
import { MediaService } from './media.service';

@Module({ imports: [AuthModule, PrismaModule, ConfigModule], controllers: [MediaController, MediaFilesController],
  providers: [MediaService, RolesGuard], exports: [MediaService] })
export class MediaModule {}
