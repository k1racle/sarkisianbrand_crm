import { Body, Controller, Delete, Get, Header, Param, ParseUUIDPipe, Patch, Post, Query, Req, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CrmContentService, contentRoles } from './content.service';
import { ContentCreateDto, ContentListDto, ContentUpdateDto, ContentVersionDto } from './content.dto';
import { CrmDriveService } from './drive.service';
import { CrmTaskWriteService } from './task-write.service';
import { CrmReadService } from './crm-read.service';
import { DriveListDto, DriveLocationDto, DriveTaskLinkDto, DRIVE_MAX_BYTES } from './drive.dto';
import { CreateTaskCommentDto } from './dto/crm.dto';
@Controller('crm/content-plan') @UseGuards(JwtAuthGuard,RolesGuard) @Roles(...contentRoles)
export class CrmContentController {
 constructor(private readonly content:CrmContentService,private readonly drive:CrmDriveService,private readonly tasksWrite:CrmTaskWriteService,private readonly reads:CrmReadService){}
 @Get() @Header('Cache-Control','private, no-store') @Permissions('content_plan.read') list(@Query() dto:ContentListDto,@Req() req:any){return this.content.list(dto,req.user.sub);}
 @Get('team') @Header('Cache-Control','private, no-store') @Permissions('content_plan.read') team(@Req() req:any){return this.content.team(req.user.sub);}
 // Content staff can only browse TEAM materials, never somebody's personal drive.
 @Get('drive') @Header('Cache-Control','private, no-store') @Permissions('content_plan.read') disk(@Query() dto:DriveListDto,@Req() req:any){return this.drive.list({...dto,scope:'TEAM',view:'files'},req.user.sub,'content_plan.read');}
 @Post('drive/upload') @Permissions('content_plan.write') @UseInterceptors(FileInterceptor('file',{limits:{fileSize:DRIVE_MAX_BYTES,files:1,fields:0}}))
 upload(@UploadedFile() file:any,@Query() dto:DriveLocationDto,@Req() req:any){return this.drive.upload(file,{...dto,scope:'TEAM'},req.user.sub,'content_plan.write');}
 @Get('drive/:nodeId/content') @Permissions('content_plan.read')
 async bytes(@Param('nodeId',ParseUUIDPipe) id:string,@Req() req:any,@Res() res:Response){const file=await this.drive.content(id,req.user.sub,'content_plan.read');res.set({'Content-Type':file.mime||'application/octet-stream','Content-Length':String(file.buffer.length),'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"sandbox; default-src 'none'",'Content-Disposition':`attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`});res.send(file.buffer);}
 @Post() @Permissions('content_plan.write') create(@Body() dto:ContentCreateDto,@Req() req:any){return this.content.create(dto,req.user.sub);}
 @Get(':id') @Header('Cache-Control','private, no-store') @Permissions('content_plan.read') get(@Param('id',ParseUUIDPipe) id:string,@Req() req:any){return this.content.get(id,req.user.sub);}
 @Patch(':id') @Permissions('content_plan.write') update(@Param('id',ParseUUIDPipe) id:string,@Body() dto:ContentUpdateDto,@Req() req:any){return this.content.update(id,dto,req.user.sub);}
 @Post(':id/approve') @Permissions('content_plan.approve') approve(@Param('id',ParseUUIDPipe) id:string,@Body() dto:ContentVersionDto,@Req() req:any){return this.content.approve(id,dto.version,req.user.sub);}
 @Post(':id/archive') @Permissions('content_plan.write') archive(@Param('id',ParseUUIDPipe) id:string,@Body() dto:ContentVersionDto,@Req() req:any){return this.content.archive(id,dto.version,false,req.user.sub);}
 @Post(':id/restore') @Permissions('content_plan.write') restore(@Param('id',ParseUUIDPipe) id:string,@Body() dto:ContentVersionDto,@Req() req:any){return this.content.archive(id,dto.version,true,req.user.sub);}
 @Get(':id/comments') @Header('Cache-Control','private, no-store') @Permissions('content_plan.read') async comments(@Param('id',ParseUUIDPipe) id:string,@Req() req:any,@Query('before') before?:string){return this.reads.comments(req.user.sub,await this.reads.publicationTask(req.user.sub,id),before,'content_plan.read');}
 @Post(':id/comments') @Header('Cache-Control','private, no-store') @Permissions('content_plan.write') async comment(@Param('id',ParseUUIDPipe) id:string,@Body() dto:CreateTaskCommentDto,@Req() req:any){return this.tasksWrite.comment(req.user.sub,await this.reads.publicationTask(req.user.sub,id),dto,'content_plan.write');}
 @Get(':id/files') @Header('Cache-Control','private, no-store') @Permissions('content_plan.read') async files(@Param('id',ParseUUIDPipe) id:string,@Req() req:any){return this.drive.taskFiles(await this.reads.publicationTask(req.user.sub,id),req.user.sub,'content_plan.read');}
 @Post(':id/files') @Permissions('content_plan.write') async link(@Param('id',ParseUUIDPipe) id:string,@Body() dto:DriveTaskLinkDto,@Req() req:any){return this.drive.link(await this.reads.publicationTask(req.user.sub,id),dto.nodeId,req.user.sub,'content_plan.write');}
 @Post(':id/files/upload') @Permissions('content_plan.write')
 @UseInterceptors(FileInterceptor('file',{limits:{fileSize:DRIVE_MAX_BYTES,files:1,fields:0}}))
 async uploadFile(@Param('id',ParseUUIDPipe) id:string,@UploadedFile() file:any,@Req() req:any){return this.drive.uploadAttachment('task',await this.reads.publicationTask(req.user.sub,id),file,req.user.sub,'content_plan.write');}
 @Delete(':id/files/:nodeId') @Permissions('content_plan.write') async unlink(@Param('id',ParseUUIDPipe) id:string,@Param('nodeId',ParseUUIDPipe) nodeId:string,@Req() req:any){return this.drive.unlinkTask(await this.reads.publicationTask(req.user.sub,id),nodeId,req.user.sub,'content_plan.write');}
}
