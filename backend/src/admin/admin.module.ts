import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { OneCSyncModule } from '../1c-sync/1c-sync.module';

@Module({ imports: [AuthModule, OneCSyncModule], controllers: [AdminController], providers: [AdminService, RolesGuard] })
export class AdminModule {}
