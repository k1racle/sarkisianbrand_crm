import { Body, Controller, Get, Header, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { KnowledgeService } from './knowledge.service';
import { KnowledgeCreateDto, KnowledgeQueryDto, KnowledgeUpdateDto } from './knowledge.dto';
@Controller('helpdesk/knowledge') @UseGuards(JwtAuthGuard,RolesGuard) @Roles('ADMIN','IT_SUPPORT','SUPERVISOR','EXECUTIVE') @Permissions('helpdesk.read')
export class KnowledgeController {
  constructor(private readonly knowledge:KnowledgeService){}
  @Get() @Header('Cache-Control','private, no-store') list(@Req() req:any,@Query() query:KnowledgeQueryDto){return this.knowledge.list(req.user.sub,query);}
  @Get(':id') @Header('Cache-Control','private, no-store') detail(@Req() req:any,@Param('id',new ParseUUIDPipe({version:'4'})) id:string){return this.knowledge.detail(req.user.sub,id);}
  @Post() @Permissions('helpdesk.read','knowledge.write') create(@Req() req:any,@Body() dto:KnowledgeCreateDto){return this.knowledge.create(req.user.sub,dto);}
  @Patch(':id') @Permissions('helpdesk.read','knowledge.write') update(@Req() req:any,@Param('id',new ParseUUIDPipe({version:'4'})) id:string,@Body() dto:KnowledgeUpdateDto){return this.knowledge.update(req.user.sub,id,dto);}
}
