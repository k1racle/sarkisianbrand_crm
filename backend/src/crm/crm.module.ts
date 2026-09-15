import { Module } from '@nestjs/common';
import { CrmController } from './crm.controller';
import { CrmService } from './crm.service';
import { AuthModule } from '../auth/auth.module';
import { RolesGuard } from '../common/guards/roles.guard';

@Module({ imports: [AuthModule], controllers: [CrmController], providers: [CrmService, RolesGuard] })
export class CrmModule {}
