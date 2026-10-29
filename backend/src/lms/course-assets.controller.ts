import { Controller, Get, Header, Param, ParseUUIDPipe, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { Delete } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CourseAssetService } from './course-assets.service';
import { ExecutionContext } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { activeSession } from '../auth/active-session';

const uuid = () => new ParseUUIDPipe({ version: '4' });

@Controller('lms/admin/lessons/:lessonId/assets')
@UseGuards(JwtAuthGuard, RolesGuard, ThrottlerGuard)
@Roles('ADMIN', 'SUPERVISOR', 'CONTENT_MANAGER')
@Permissions('lms.read')
export class CourseAssetAdminController {
  constructor(private readonly assets: CourseAssetService, private readonly db: PrismaService, private readonly roles: RolesGuard) {}
  @Get() @Header('Cache-Control', 'private, no-store') list(@Param('lessonId', uuid()) lessonId: string) { return this.assets.listAdmin(lessonId); }
  private authorizeAgain(req: Request & { user: any }, handler: Function) {
    return async () => {
      const actor = await activeSession(this.db, req.user); req.user.role = actor.role;
      const context = { getClass: () => CourseAssetAdminController, getHandler: () => handler, switchToHttp: () => ({ getRequest: () => req }) } as unknown as ExecutionContext;
      await this.roles.canActivate(context);
    };
  }
  @Post() @Permissions('lms.read', 'lms.write') @Throttle({ default: { limit: 15, ttl: 60000 } }) @Header('Cache-Control', 'private, no-store')
  upload(@Param('lessonId', uuid()) lessonId: string, @Req() req: Request & { user: any }) { return this.assets.upload(lessonId, req.user, req, this.authorizeAgain(req, CourseAssetAdminController.prototype.upload)); }
  @Delete(':assetId') @Permissions('lms.read', 'lms.write') @Throttle({ default: { limit: 30, ttl: 60000 } }) @Header('Cache-Control', 'private, no-store')
  remove(@Param('lessonId', uuid()) lessonId: string, @Param('assetId', uuid()) assetId: string, @Req() req: Request & { user: any }) { return this.assets.remove(lessonId, assetId, req.user, this.authorizeAgain(req, CourseAssetAdminController.prototype.remove)); }
}

@Controller('lms/my/:courseId/lessons/:lessonId/assets')
@UseGuards(JwtAuthGuard, ThrottlerGuard)
export class CourseAssetStudentController {
  constructor(private readonly assets: CourseAssetService) {}
  @Get() @Header('Cache-Control', 'private, no-store') list(@Req() req: any, @Param('courseId', uuid()) courseId: string, @Param('lessonId', uuid()) lessonId: string) { return this.assets.listStudent(req.user.sub, courseId, lessonId); }
  @Post(':assetId/session') @Throttle({ default: { limit: 60, ttl: 60000 } })
  session(@Req() req: any, @Res({ passthrough: true }) res: Response, @Param('courseId', uuid()) courseId: string, @Param('lessonId', uuid()) lessonId: string, @Param('assetId', uuid()) assetId: string) { return this.assets.ticket(req.user, courseId, lessonId, assetId, res); }
}

@Controller('lms/media')
export class CourseAssetMediaController {
  constructor(private readonly assets: CourseAssetService) {}
  @Get(':assetId') content(@Param('assetId', uuid()) assetId: string, @Req() req: Request, @Res() res: Response) { return this.assets.media(assetId, req, res); }
}
