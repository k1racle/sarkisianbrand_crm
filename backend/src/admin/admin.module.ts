import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { OneCSyncModule } from '../1c-sync/1c-sync.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CatalogMenuController } from './catalog-menu.controller';
import { CatalogMenuService } from './catalog-menu.service';
import { MediaModule } from '../media/media.module';
import { SiteContentController } from './site-content.controller';
import { SiteContentService } from './site-content.service';
import { MerchandisingController } from './merchandising.controller';
import { MerchandisingService } from './merchandising.service';

@Module({ imports: [AuthModule, OneCSyncModule, NotificationsModule, MediaModule], controllers: [AdminController, CatalogMenuController, SiteContentController, MerchandisingController], providers: [AdminService, CatalogMenuService, SiteContentService, MerchandisingService, RolesGuard] })
export class AdminModule {}
