import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RolesGuard } from '../common/guards/roles.guard';
import { LeadershipController } from './leadership.controller';
import { LeadershipService } from './leadership.service';

@Module({ imports: [AuthModule], controllers: [LeadershipController], providers: [LeadershipService, RolesGuard] })
export class LeadershipModule {}
