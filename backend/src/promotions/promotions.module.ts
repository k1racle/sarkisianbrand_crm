import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { RolesGuard } from '../common/guards/roles.guard';
import { PromotionsController } from './promotions.controller';
import { PromotionsService } from './promotions.service';

@Module({ imports: [AuthModule, PrismaModule], controllers: [PromotionsController],
  providers: [PromotionsService, RolesGuard], exports: [PromotionsService] })
export class PromotionsModule {}
