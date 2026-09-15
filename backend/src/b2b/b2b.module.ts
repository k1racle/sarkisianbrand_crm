import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { B2BController } from './b2b.controller';
import { B2BService } from './b2b.service';
import { OneCSyncModule } from '../1c-sync/1c-sync.module';

@Module({ imports: [AuthModule, OneCSyncModule], controllers: [B2BController], providers: [B2BService] })
export class B2BModule {}
