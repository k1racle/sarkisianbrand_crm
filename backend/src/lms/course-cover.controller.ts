import { BadRequestException, Controller, Delete, ExecutionContext, Header, Param, ParseUUIDPipe, Post, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { MEDIA_MAX_BYTES } from '../media/media.dto';
import { MediaService } from '../media/media.service';
import { PrismaService } from '../prisma/prisma.service';
import { activeSession } from '../auth/active-session';

// Course covers are public storefront images. Paid lesson assets use a
// completely separate private storage and entitlement checks.
@Controller('lms/admin/courses/:courseId/cover')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN','SUPERVISOR','CONTENT_MANAGER')
@Permissions('lms.read','lms.write')
export class CourseCoverController {
  constructor(private readonly db: PrismaService, private readonly media: MediaService, private readonly roles: RolesGuard) {}
  @Post() @Header('Cache-Control','private, no-store')
  @UseInterceptors(FileInterceptor('file',{limits:{fileSize:MEDIA_MAX_BYTES,files:1,fields:0}}))
  async upload(@Param('courseId',new ParseUUIDPipe({version:'4'})) courseId:string, @UploadedFile() file:any, @Req() req:any) {
    if (!await this.db.course.findUnique({where:{id:courseId},select:{id:true}})) throw new BadRequestException('Курс не найден');
    const actor=await activeSession(this.db,req.user); req.user.role=actor.role;
    const context={getClass:()=>CourseCoverController,getHandler:()=>CourseCoverController.prototype.upload,switchToHttp:()=>({getRequest:()=>req})} as unknown as ExecutionContext;
    await this.roles.canActivate(context);
    const image=await this.media.upload(file,req.user.sub);
    await this.db.course.update({where:{id:courseId},data:{coverImageUrl:image.url}});
    return {url:image.url};
  }
  @Delete() @Header('Cache-Control','private, no-store')
  async remove(@Param('courseId',new ParseUUIDPipe({version:'4'})) courseId:string) {
    await this.db.course.update({where:{id:courseId},data:{coverImageUrl:null}});
    return {removed:true};
  }
}
