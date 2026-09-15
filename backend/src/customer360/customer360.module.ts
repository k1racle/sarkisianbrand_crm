import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RolesGuard } from '../common/guards/roles.guard';
import { Customer360Controller } from './customer360.controller';
import { Customer360Service } from './customer360.service';

@Module({ imports: [AuthModule], controllers: [Customer360Controller], providers: [Customer360Service, RolesGuard], exports: [Customer360Service] })
export class Customer360Module {}
