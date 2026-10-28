import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { StudioService } from './studio.service';
import { BuyStudioRewardDto, CompleteStudioRunDto, SpendStudioCoinsDto, StartStudioRunDto, StudioCheckpointDto, StudioSettingsDto } from './studio.dto';
@Controller('studio')
export class StudioController {
  constructor(private readonly studio:StudioService){}
  @Get('rewards') catalog(){return this.studio.catalog();}
  @Get('me') @UseGuards(JwtAuthGuard) me(@Req() r:any){return this.studio.me(r.user.sub);}
  @Post('runs') @UseGuards(JwtAuthGuard) start(@Req() r:any,@Body() d:StartStudioRunDto){return this.studio.start(r.user.sub,d.briefId);}
  @Post('runs/:id/checkpoint') @UseGuards(JwtAuthGuard) checkpoint(@Req() r:any,@Param('id') id:string,@Body() d:StudioCheckpointDto){return this.studio.checkpoint(r.user.sub,id,d);}
  @Post('runs/:id/complete') @UseGuards(JwtAuthGuard) complete(@Req() r:any,@Param('id') id:string,@Body() d:CompleteStudioRunDto){return this.studio.complete(r.user.sub,id,d);}
  @Post('rewards/buy') @UseGuards(JwtAuthGuard) buy(@Req() r:any,@Body() d:BuyStudioRewardDto){return this.studio.buy(r.user.sub,d);}
  @Post('shop') @UseGuards(JwtAuthGuard) spend(@Req() r:any,@Body() d:SpendStudioCoinsDto){return this.studio.spend(r.user.sub,d.itemId,d.requestId);}
  @Get('admin') @UseGuards(JwtAuthGuard,RolesGuard) @Roles('ADMIN','CONTENT_MANAGER','MANAGER_SALES','SUPERVISOR') @Permissions('promotions.read') admin(){return this.studio.admin();}
  @Patch('admin/settings') @UseGuards(JwtAuthGuard,RolesGuard) @Roles('ADMIN','SUPERVISOR') @Permissions('promotions.read','promotions.write') settings(@Body() d:StudioSettingsDto){return this.studio.settings(d);}
}
