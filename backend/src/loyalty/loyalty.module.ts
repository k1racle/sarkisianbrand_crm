import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { LoyaltyController } from './loyalty.controller';
import { LoyaltyService } from './loyalty.service';
import { RolesGuard } from '../common/guards/roles.guard';
@Module({imports:[AuthModule],controllers:[LoyaltyController],providers:[LoyaltyService, RolesGuard],exports:[LoyaltyService]}) export class LoyaltyModule {}
