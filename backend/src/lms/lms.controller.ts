import { Body, Controller, Get, Header, Headers, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CourseListDto, CreateCourseDto, CreateCoursePurchaseDto, CreateLessonDto, CreateModuleDto, CreateTariffDto, UpdateCourseDto, UpdateLessonDto, UpdateModuleDto, UpdateTariffDto } from './lms.dto';
import { LmsService } from './lms.service';
import { LmsPurchaseService } from './lms-purchase.service';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';

const uuid = () => new ParseUUIDPipe({ version: '4' });

@Controller('lms/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPERVISOR', 'CONTENT_MANAGER')
@Permissions('lms.read')
export class LmsAdminController {
  constructor(private readonly lms: LmsService) {}
  @Get('courses') @Header('Cache-Control', 'private, no-store') list(@Query() query: CourseListDto) { return this.lms.adminList(query); }
  @Get('students') @Header('Cache-Control', 'private, no-store') students(@Query() query: CourseListDto) { return this.lms.adminStudents(query); }
  @Get('courses/:id') @Header('Cache-Control', 'private, no-store') detail(@Param('id', uuid()) id: string) { return this.lms.adminDetail(id); }
  @Post('courses') @Permissions('lms.read','lms.write') create(@Body() dto: CreateCourseDto) { return this.lms.createCourse(dto); }
  @Patch('courses/:id') @Permissions('lms.read','lms.write') update(@Param('id', uuid()) id: string, @Body() dto: UpdateCourseDto) { return this.lms.updateCourse(id,dto); }
  @Post('courses/:id/tariffs') @Permissions('lms.read','lms.write') createTariff(@Param('id', uuid()) id: string, @Body() dto: CreateTariffDto) { return this.lms.createTariff(id,dto); }
  @Patch('tariffs/:id') @Permissions('lms.read','lms.write') updateTariff(@Param('id', uuid()) id: string, @Body() dto: UpdateTariffDto) { return this.lms.updateTariff(id,dto); }
  @Post('courses/:id/modules') @Permissions('lms.read','lms.write') createModule(@Param('id', uuid()) id: string, @Body() dto: CreateModuleDto) { return this.lms.createModule(id,dto); }
  @Patch('modules/:id') @Permissions('lms.read','lms.write') updateModule(@Param('id', uuid()) id: string, @Body() dto: UpdateModuleDto) { return this.lms.updateModule(id,dto); }
  @Post('modules/:id/lessons') @Permissions('lms.read','lms.write') createLesson(@Param('id', uuid()) id: string, @Body() dto: CreateLessonDto) { return this.lms.createLesson(id,dto); }
  @Patch('lessons/:id') @Permissions('lms.read','lms.write') updateLesson(@Param('id', uuid()) id: string, @Body() dto: UpdateLessonDto) { return this.lms.updateLesson(id,dto); }
}

@Controller('lms')
export class LmsPublicController {
  constructor(private readonly lms: LmsService) {}
  @Get('catalog') @Header('Cache-Control', 'no-store') catalog(@Query() query: CourseListDto) { return this.lms.catalog(query); }
  @Get('catalog/:courseId') @Header('Cache-Control', 'no-store') detail(@Param('courseId', uuid()) id: string) { return this.lms.catalogDetail(id); }
  @Get('catalog/:courseId/preview/:lessonId') @Header('Cache-Control', 'no-store') preview(@Param('courseId', uuid()) courseId: string, @Param('lessonId', uuid()) lessonId: string) { return this.lms.preview(courseId,lessonId); }
}

@Controller('lms/my')
@UseGuards(JwtAuthGuard)
export class LmsStudentController {
  constructor(private readonly lms: LmsService, private readonly purchases: LmsPurchaseService) {}
  @Get() @Header('Cache-Control', 'private, no-store') list(@Req() req: any) { return this.lms.myCourses(req.user.sub); }
  @Post('purchases') @UseGuards(ThrottlerGuard) @Throttle({ default: { limit: 12, ttl: 60000 } }) @Header('Cache-Control', 'private, no-store') purchase(@Req() req: any, @Body() dto: CreateCoursePurchaseDto, @Headers('idempotency-key') key?: string) { return this.purchases.create(req.user.sub,dto,key); }
  @Get(':courseId') @Header('Cache-Control', 'private, no-store') course(@Req() req: any, @Param('courseId', uuid()) courseId: string) { return this.lms.myCourse(req.user.sub,courseId); }
  @Get(':courseId/lessons/:lessonId') @Header('Cache-Control', 'private, no-store') lesson(@Req() req: any, @Param('courseId', uuid()) courseId: string, @Param('lessonId', uuid()) lessonId: string) { return this.lms.myLesson(req.user.sub,courseId,lessonId); }
  @Post(':courseId/lessons/:lessonId/complete') complete(@Req() req: any, @Param('courseId', uuid()) courseId: string, @Param('lessonId', uuid()) lessonId: string) { return this.lms.complete(req.user.sub,courseId,lessonId); }
}
