import { Module } from '@nestjs/common';
import { MarketplacesController } from './marketplaces.controller';
import { MarketplacesService } from './marketplaces.service';
import { AuthModule } from '../auth/auth.module';
import { RolesGuard } from '../common/guards/roles.guard';
import { OmsModule } from '../oms/oms.module';

@Module({ imports: [AuthModule, OmsModule], controllers: [MarketplacesController], providers: [MarketplacesService, RolesGuard], exports: [MarketplacesService] })
export class MarketplacesModule {}
