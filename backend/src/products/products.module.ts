import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { AuthModule } from '../auth/auth.module';
import { RolesGuard } from '../common/guards/roles.guard';

@Module({ imports: [AuthModule], controllers: [ProductsController], providers: [ProductsService, RolesGuard] })
export class ProductsModule {}
