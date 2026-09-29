import { Body, Controller, Delete, Get, Header, Param, ParseEnumPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { DataEntityType } from '@prisma/client';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { DataLifecycleService } from './data-lifecycle.service';
import { LifecycleActionDto, PurgeDataDto, TrashListQueryDto } from './dto/data-lifecycle.dto';

@ApiTags('data-lifecycle')
@ApiBearerAuth()
@Controller('data-lifecycle')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Permissions('system.manage')
export class DataLifecycleController {
  constructor(private readonly lifecycle: DataLifecycleService) {}

  @Get('trash')
  @Header('Cache-Control', 'private, no-store')
  trash(@Query() query: TrashListQueryDto, @Req() req: any) { return this.lifecycle.trash(req.user.sub, query); }

  @Get(':type/:id/preview')
  @Header('Cache-Control', 'private, no-store')
  preview(@Param('type', new ParseEnumPipe(DataEntityType)) type: DataEntityType, @Param('id') id: string, @Req() req: any) { return this.lifecycle.preview(req.user.sub, type, id); }

  @Post(':type/:id/archive')
  archive(@Param('type', new ParseEnumPipe(DataEntityType)) type: DataEntityType, @Param('id') id: string, @Body() dto: LifecycleActionDto, @Req() req: any) { return this.lifecycle.archive(req.user.sub, type, id, dto.reason); }

  @Post(':type/:id/trash')
  moveToTrash(@Param('type', new ParseEnumPipe(DataEntityType)) type: DataEntityType, @Param('id') id: string, @Body() dto: LifecycleActionDto, @Req() request: any) { return this.lifecycle.moveToTrash(type, id, request.user.sub, dto.reason); }

  @Post('trash/:entryId/restore')
  restore(@Param('entryId') entryId: string, @Req() req: any) { return this.lifecycle.restore(req.user.sub, entryId); }

  @Delete('trash/:entryId')
  purge(@Param('entryId') entryId: string, @Body() dto: PurgeDataDto, @Req() request: any) { return this.lifecycle.purge(entryId, request.user.sub, dto); }
}
