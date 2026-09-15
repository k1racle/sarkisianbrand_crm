import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RolesGuard } from '../common/guards/roles.guard';
import { OneCSyncController } from './1c-sync.controller';
import { OneCSyncService } from './1c-sync.service';

@Module({ imports: [AuthModule], controllers: [OneCSyncController], providers: [OneCSyncService, RolesGuard] })
export class OneCSyncModule {}
