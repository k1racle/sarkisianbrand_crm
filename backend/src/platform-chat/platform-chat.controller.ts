import { Body, Controller, Get, Param, Post, Query, Req, Res, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreatePlatformChannelDto, CreatePlatformMessageDto } from './dto/platform-chat.dto';
import { PlatformChatService } from './platform-chat.service';

const roles = ['ADMIN', 'CONTENT_MANAGER', 'MANAGER_B2B', 'MANAGER_SALES', 'MARKETPLACE_MANAGER', 'SUPERVISOR', 'EXECUTIVE', 'IT_SUPPORT', 'CURATOR', 'WAREHOUSE'];

@ApiTags('platform-chat')
@Controller('platform-chat')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...roles)
export class PlatformChatController {
  constructor(private readonly chat: PlatformChatService) {}

  @Get('team') team() { return this.chat.team(); }
  @Get('channels') channels(@Req() request: any) { return this.chat.channels(request.user.sub); }
  @Get('unread') unread(@Req() request: any) { return this.chat.unread(request.user.sub); }
  @Post('channels') createChannel(@Body() dto: CreatePlatformChannelDto, @Req() request: any) { return this.chat.createChannel(dto, request.user.sub); }
  @Get('channels/:id/messages') messages(@Param('id') id: string, @Req() request: any) { return this.chat.messages(id, request.user.sub); }
  @Post('channels/:id/messages') postMessage(@Param('id') id: string, @Body() dto: CreatePlatformMessageDto, @Req() request: any) { return this.chat.postMessage(id, dto, request.user.sub); }
  @Post('channels/:id/messages/upload')
  @UseInterceptors(FilesInterceptor('files', 8, { limits: { fileSize: 10 * 1024 * 1024 } }))
  upload(@Param('id') id: string, @UploadedFiles() files: any[], @Body() body: any, @Req() request: any) {
    return this.chat.postUpload(id, files, body.body, body.entities, body.replyToId, request.user.sub);
  }
  @Post('channels/:id/read') read(@Param('id') id: string, @Req() request: any) { return this.chat.markRead(id, request.user.sub); }
  @Get('entities') entities(@Query('type') type: string, @Query('search') search = '', @Req() request: any) { return this.chat.searchEntities(type, search, request.user.sub); }
  @Get('attachments/:id')
  async attachment(@Param('id') id: string, @Req() request: any, @Res() response: Response) {
    const file = await this.chat.attachment(id, request.user.sub);
    response.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
    response.setHeader('Content-Length', String(file.buffer.length));
    response.setHeader('Content-Disposition', `${file.kind === 'FILE' ? 'attachment' : 'inline'}; filename*=UTF-8''${encodeURIComponent(file.name)}`);
    response.send(file.buffer);
  }
}
