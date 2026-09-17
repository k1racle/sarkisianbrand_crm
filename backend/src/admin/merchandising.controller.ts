import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CategoryEditDto, CategoryLayoutDto, ProductBadgesDto } from './merchandising.dto';
import { MerchandisingService } from './merchandising.service';
@ApiTags('admin') @ApiBearerAuth() @Controller('admin/catalog')
@UseGuards(JwtAuthGuard,RolesGuard) @Roles('ADMIN','CONTENT_MANAGER','MANAGER_SALES','SUPERVISOR','WAREHOUSE')
export class MerchandisingController {
  constructor(private readonly catalog:MerchandisingService){}
  @Get('categories') @Permissions('catalog.read') categories(){return this.catalog.categories();}
  @Post('categories') @Roles('ADMIN','CONTENT_MANAGER','MANAGER_SALES','SUPERVISOR') @Permissions('catalog.write') create(@Body() dto:CategoryEditDto,@Req() req:any){return this.catalog.editCategory(null,dto,req.user.sub);}
  @Patch('categories/layout') @Roles('ADMIN','CONTENT_MANAGER','MANAGER_SALES','SUPERVISOR') @Permissions('catalog.write') layout(@Body() dto:CategoryLayoutDto,@Req() req:any){return this.catalog.layout(dto,req.user.sub);}
  @Patch('categories/:id') @Roles('ADMIN','CONTENT_MANAGER','MANAGER_SALES','SUPERVISOR') @Permissions('catalog.write') update(@Param('id') id:string,@Body() dto:CategoryEditDto,@Req() req:any){return this.catalog.editCategory(id,dto,req.user.sub);}
  @Get('badges') @Permissions('catalog.read') badges(){return this.catalog.badges();}
  @Patch('badges') @Roles('ADMIN','CONTENT_MANAGER','MANAGER_SALES','SUPERVISOR') @Permissions('catalog.write') updateBadges(@Body() dto:ProductBadgesDto,@Req() req:any){return this.catalog.updateBadges(dto,req.user.sub);}
}
