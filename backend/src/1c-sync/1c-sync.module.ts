import { Module } from '@nestjs/common';
import { OneCSyncController } from './1c-sync.controller';
import { OneCSyncService } from './1c-sync.service';

@Module({ controllers: [OneCSyncController], providers: [OneCSyncService] })
export class OneCSyncModule {}
