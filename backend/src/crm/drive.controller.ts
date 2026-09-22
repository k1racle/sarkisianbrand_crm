import { Body, Controller, Delete, Get, Header, Param, ParseUUIDPipe, Patch, Post, Query, Req, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CrmDriveService } from './drive.service';
import { DriveFolderDto, DriveListDto, DriveLocationDto, DriveTaskLinkDto, DriveUpdateDto, DRIVE_MAX_BYTES } from './drive.dto';

@Controller('crm') @UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'MANAGER_B2B', 'MANAGER_SALES', 'SUPERVISOR')
export class CrmDriveController {
  constructor(private readonly drive: CrmDriveService) {}
  @Get('drive') @Header('Cache-Control', 'private, no-store') @Permissions('crm.read') list(@Query() dto: DriveListDto, @Req() req: any) { return this.drive.list(dto, req.user.sub); }
  @Post('drive/folders') @Permissions('crm.write') folder(@Body() dto: DriveFolderDto, @Req() req: any) { return this.drive.createFolder(dto, req.user.sub); }
  @Post('drive/upload') @Permissions('crm.write')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: DRIVE_MAX_BYTES, files: 1, fields: 0 } }))
  upload(@UploadedFile() file: any, @Query() dto: DriveLocationDto, @Req() req: any) { return this.drive.upload(file, dto, req.user.sub); }
  @Patch('drive/:id') @Permissions('crm.write') update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: DriveUpdateDto, @Req() req: any) { return this.drive.update(id, dto, req.user.sub); }
  @Delete('drive/:id') @Permissions('crm.write') trash(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) { return this.drive.trash(id, req.user.sub); }
  @Post('drive/:id/restore') @Permissions('crm.write') restore(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) { return this.drive.restore(id, req.user.sub); }
  @Get('drive/:id/content') @Permissions('crm.read')
  async content(@Param('id', ParseUUIDPipe) id: string, @Req() req: any, @Res() res: Response) {
    const file = await this.drive.content(id, req.user.sub);
    res.setHeader('Content-Type', file.mime || 'application/octet-stream');
    res.setHeader('Content-Length', file.buffer.length);
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "sandbox; default-src 'none'");
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`);
    res.send(file.buffer);
  }
  @Get('tasks/:id/files') @Header('Cache-Control', 'private, no-store') @Permissions('crm.read') files(@Param('id', ParseUUIDPipe) id: string) { return this.drive.taskFiles(id); }
  @Post('tasks/:id/files') @Permissions('crm.write') link(@Param('id', ParseUUIDPipe) id: string, @Body() dto: DriveTaskLinkDto, @Req() req: any) { return this.drive.link(id, dto.nodeId, req.user.sub); }
  @Delete('tasks/:id/files/:nodeId') @Permissions('crm.write') unlink(@Param('id', ParseUUIDPipe) id: string, @Param('nodeId', ParseUUIDPipe) nodeId: string, @Req() req:any) { return this.drive.unlinkTask(id, nodeId, req.user.sub); }
  @Get('leads/:id/files') @Header('Cache-Control','private, no-store') @Permissions('crm.read') leadFiles(@Param('id',ParseUUIDPipe) id:string){return this.drive.leadFiles(id);}
  @Post('leads/:id/files') @Permissions('crm.write') leadLink(@Param('id',ParseUUIDPipe) id:string,@Body() dto:DriveTaskLinkDto,@Req() req:any){return this.drive.linkLead(id,dto.nodeId,req.user.sub);}
  @Delete('leads/:id/files/:nodeId') @Permissions('crm.write') leadUnlink(@Param('id',ParseUUIDPipe) id:string,@Param('nodeId',ParseUUIDPipe) nodeId:string,@Req() req:any){return this.drive.unlinkLead(id,nodeId,req.user.sub);}
}
