import { Body, Controller, Get, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { RestoreSiteContentDto, UpdateSiteContentDto } from './site-content.dto';
import { SiteContentService } from './site-content.service';

@ApiTags('admin') @ApiBearerAuth()
@Controller('admin/storefront/site-content') @UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'CONTENT_MANAGER', 'MANAGER_SALES', 'SUPERVISOR')
export class SiteContentController {
  constructor(private readonly content: SiteContentService) {}
  @Get() @Permissions('catalog.read') get() { return this.content.get(); }
  @Patch() @Permissions('catalog.write') update(@Body() dto: UpdateSiteContentDto, @Req() req: any) {
    return this.content.update(dto, req.user.sub);
  }
  @Get('revisions') @Permissions('catalog.read') revisions() { return this.content.revisions(); }
  @Post('restore') @Permissions('catalog.write') restore(@Body() dto: RestoreSiteContentDto, @Req() req: any) {
    return this.content.restore(dto, req.user.sub);
  }
}
