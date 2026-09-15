import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RolesGuard } from '../common/guards/roles.guard';
import { HelpdeskController, HelpdeskPublicController } from './helpdesk.controller';
import { HelpdeskService } from './helpdesk.service';

@Module({
  imports: [AuthModule],
  controllers: [HelpdeskController, HelpdeskPublicController],
  providers: [HelpdeskService, RolesGuard],
})
export class HelpdeskModule {}
