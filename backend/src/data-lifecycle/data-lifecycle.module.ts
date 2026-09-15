import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RolesGuard } from '../common/guards/roles.guard';
import { DataLifecycleController } from './data-lifecycle.controller';
import { DataLifecycleService } from './data-lifecycle.service';

@Module({ imports: [AuthModule], controllers: [DataLifecycleController], providers: [DataLifecycleService, RolesGuard], exports: [DataLifecycleService] })
export class DataLifecycleModule {}
