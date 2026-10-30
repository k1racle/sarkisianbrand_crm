import { Body, Controller, Get, Header, Param, ParseUUIDPipe, Post, Put, Req, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { QuizAttemptDto, SaveQuizDto } from './lms-quiz.dto';
import { LmsQuizService } from './lms-quiz.service';

const uuid=()=>new ParseUUIDPipe({version:'4'});
@Controller('lms/admin/lessons/:lessonId/quiz')
@UseGuards(JwtAuthGuard,RolesGuard)
@Roles('ADMIN','SUPERVISOR','CONTENT_MANAGER')
@Permissions('lms.read')
export class LmsQuizAdminController {
  constructor(private readonly quiz:LmsQuizService) {}
  @Get() @Header('Cache-Control','private, no-store') get(@Param('lessonId',uuid()) lessonId:string) { return this.quiz.admin(lessonId); }
  @Put() @Permissions('lms.read','lms.write') @Header('Cache-Control','private, no-store') save(@Param('lessonId',uuid()) lessonId:string,@Body() dto:SaveQuizDto) { return this.quiz.save(lessonId,dto); }
}

@Controller('lms/my/:courseId/lessons/:lessonId/quiz')
@UseGuards(JwtAuthGuard)
export class LmsQuizStudentController {
  constructor(private readonly quiz:LmsQuizService) {}
  @Get() @Header('Cache-Control','private, no-store') get(@Req() req:any,@Param('courseId',uuid()) courseId:string,@Param('lessonId',uuid()) lessonId:string) { return this.quiz.student(req.user.sub,courseId,lessonId); }
  @Post('attempts') @UseGuards(ThrottlerGuard) @Throttle({ default:{ limit:20, ttl:60000 } }) @Header('Cache-Control','private, no-store') attempt(@Req() req:any,@Param('courseId',uuid()) courseId:string,@Param('lessonId',uuid()) lessonId:string,@Body() dto:QuizAttemptDto) { return this.quiz.attempt(req.user.sub,courseId,lessonId,dto); }
}
