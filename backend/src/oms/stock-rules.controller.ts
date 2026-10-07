import { Body, Controller, Delete, Get, Header, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { StockRulesService } from './stock-rules.service';
import { StockGroupDto, StockRuleDto, StockRuleVersionDto, StockTargetQueryDto, StockFeedQueryDto } from './dto/stock-rules.dto';
@Controller('inventory-settings') @UseGuards(JwtAuthGuard,RolesGuard)
@Roles('ADMIN','EXECUTIVE','SUPERVISOR','WAREHOUSE','MANAGER_B2B','MANAGER_SALES','MARKETPLACE_MANAGER')
export class StockRulesController {
 constructor(private readonly stock:StockRulesService){}
 @Get() @Header('Cache-Control','private, no-store') @Permissions('inventory.read') list(@Req() r:any){return this.stock.list(r.user.sub);}
 @Get('targets') @Permissions('inventory.read') targets(@Req() r:any,@Query() q:StockTargetQueryDto){return this.stock.targets(r.user.sub,q);}
 @Get('channel-feed') @Permissions('inventory.read') feed(@Req() r:any,@Query() q:StockFeedQueryDto){return this.stock.feed(r.user.sub,q);}
 @Post('rules') @Permissions('inventory.manage') create(@Req() r:any,@Body() d:StockRuleDto){return this.stock.saveRule(r.user.sub,undefined,d);}
 @Patch('rules/:id') @Permissions('inventory.manage') update(@Req() r:any,@Param('id') id:string,@Body() d:StockRuleDto){return this.stock.saveRule(r.user.sub,id,d);}
 @Delete('rules/:id') @Permissions('inventory.manage') remove(@Req() r:any,@Param('id') id:string,@Body() d:StockRuleVersionDto){return this.stock.deleteRule(r.user.sub,id,d.expectedVersion);}
 @Post('rules/:id/release') @Permissions('inventory.manage') release(@Req() r:any,@Param('id') id:string,@Body() d:StockRuleVersionDto){return this.stock.release(r.user.sub,id,d.expectedVersion);}
 @Post('groups') @Permissions('inventory.manage') createGroup(@Req() r:any,@Body() d:StockGroupDto){return this.stock.saveGroup(r.user.sub,undefined,d);}
 @Patch('groups/:id') @Permissions('inventory.manage') updateGroup(@Req() r:any,@Param('id') id:string,@Body() d:StockGroupDto){return this.stock.saveGroup(r.user.sub,id,d);}
}
