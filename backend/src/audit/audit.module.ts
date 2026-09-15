import { Global, Module } from '@nestjs/common';
import { AuditController } from './audit.controller';
import { AuditInterceptor } from './audit.interceptor';
import { AuditService } from './audit.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthModule } from '../auth/auth.module';

@Global()
@Module({ imports: [AuthModule], controllers: [AuditController], providers: [AuditService, AuditInterceptor, RolesGuard], exports: [AuditService, AuditInterceptor] })
export class AuditModule {}
