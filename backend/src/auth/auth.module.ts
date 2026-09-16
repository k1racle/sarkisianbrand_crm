import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { OptionalJwtAuthGuard } from './optional-jwt-auth.guard';
import { NotificationsModule } from '../notifications/notifications.module';
import { PasswordResetRequestController } from './password-reset-request.controller';

@Module({ imports: [JwtModule.register({}), NotificationsModule], controllers: [AuthController, PasswordResetRequestController], providers: [AuthService, JwtAuthGuard, OptionalJwtAuthGuard], exports: [AuthService, JwtModule, JwtAuthGuard, OptionalJwtAuthGuard] })
export class AuthModule {}
