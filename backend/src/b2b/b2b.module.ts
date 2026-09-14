import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { B2BController } from './b2b.controller';
import { B2BService } from './b2b.service';

@Module({ imports: [AuthModule], controllers: [B2BController], providers: [B2BService] })
export class B2BModule {}
