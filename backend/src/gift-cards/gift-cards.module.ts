import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { RolesGuard } from '../common/guards/roles.guard';
import { IntegrationSecretsService } from '../system-settings/integration-secrets.service';
import { GiftCardsService } from './gift-cards.service';
import { GiftCardsController, GiftCardProductController } from './gift-cards.controller';
import { GiftCardsHistoryController } from './gift-cards-history.controller';

@Module({ imports: [AuthModule, PrismaModule, ConfigModule], controllers: [GiftCardProductController, GiftCardsHistoryController, GiftCardsController],
  providers: [GiftCardsService, IntegrationSecretsService, RolesGuard], exports: [GiftCardsService] })
export class GiftCardsModule {}
