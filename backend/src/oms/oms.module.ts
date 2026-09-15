import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RolesGuard } from '../common/guards/roles.guard';
import { OmsController } from './oms.controller';
import { OmsService } from './oms.service';

@Module({ imports: [AuthModule], controllers: [OmsController], providers: [OmsService, RolesGuard], exports: [OmsService] })
export class OmsModule {}
