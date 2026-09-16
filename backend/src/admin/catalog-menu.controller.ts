import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CatalogMenuService } from './catalog-menu.service';
import { UpdateCatalogMenuDto } from './catalog-menu.dto';

@ApiTags('admin') @ApiBearerAuth()
@Controller('admin/storefront/catalog-menu') @UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'CONTENT_MANAGER', 'MANAGER_SALES', 'SUPERVISOR')
export class CatalogMenuController {
  constructor(private readonly menu: CatalogMenuService) {}
  @Get() @Permissions('catalog.read') get() { return this.menu.get(); }
  @Patch() @Permissions('catalog.write') update(@Body() dto: UpdateCatalogMenuDto, @Req() req: any) {
    return this.menu.update(dto, req.user.sub);
  }
}
