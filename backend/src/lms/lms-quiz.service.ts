import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { QuizAttemptDto, SaveQuizDto } from './lms-quiz.dto';

type Question = { text: string; options: string[]; correctIndex: number };
type Definition = { passingPercent: number; questions: Question[] };

function definition(value: unknown): Definition {
  const input = value as Definition;
  if (!input || !Number.isInteger(input.passingPercent) || input.passingPercent < 1 || input.passingPercent > 100 || !Array.isArray(input.questions) || input.questions.length < 1 || input.questions.length > 50) throw new BadRequestException('Добавьте от 1 до 50 вопросов и укажите проходной балл от 1 до 100%.');
  return { passingPercent: input.passingPercent, questions: input.questions.map(q => {
    if (!q || typeof q.text !== 'string' || !q.text.trim() || q.text.length > 1000 || !Array.isArray(q.options) || q.options.length < 2 || q.options.length > 8 || q.options.some(o => typeof o !== 'string' || !o.trim() || o.length > 500) || !Number.isInteger(q.correctIndex) || q.correctIndex < 0 || q.correctIndex >= q.options.length) throw new BadRequestException('Проверьте вопрос, варианты и правильный ответ.');
    return { text: q.text.trim(), options: q.options.map(o => o.trim()), correctIndex: q.correctIndex };
  }) };
}
const accessWhere = (userId: string, courseId: string) => ({ userId, courseId, accessStatus:'ACTIVE', OR:[{accessExpiresAt:null},{accessExpiresAt:{gt:new Date()}}] });
const pending = (q: {draftData: Prisma.JsonValue | null; draftRemoved: boolean}) => q.draftData !== null || q.draftRemoved;

function adminView(q: { revision: number; draftData: Prisma.JsonValue | null; publishedData: Prisma.JsonValue | null; draftRemoved: boolean } | null) {
  const value = q && !q.draftRemoved ? (q.draftData || q.publishedData) : null;
  const data = value ? definition(value) : { passingPercent:70, questions:[] };
  return { revision:q?.revision ?? 0, enabled:!!value, ...data, isPublished:!!q?.publishedData, hasDraftChanges:q ? pending(q) : false };
}

// Called within the same course-locked transaction that publishes lesson text and files.
// Published definitions are never modified by a draft save.
export async function publishQuizDrafts(tx: Prisma.TransactionClient, courseId: string) {
  const quizzes = await tx.lmsLessonQuiz.findMany({where:{ lesson:{courseId,moduleId:{not:null}}, OR:[{draftRemoved:true},{draftData:{not:Prisma.DbNull}}] }});
  let reset = false;
  for (const quiz of quizzes) {
    if (quiz.draftRemoved) {
      await tx.lmsLessonQuiz.update({where:{lessonId:quiz.lessonId},data:{draftData:Prisma.DbNull,publishedData:Prisma.DbNull,draftRemoved:false,hasDraftChanges:false,revision:{increment:1},publishedRevision:{increment:1}}});
      continue;
    }
    const next = definition(quiz.draftData);
    await tx.lmsLessonQuiz.update({where:{lessonId:quiz.lessonId},data:{publishedData:next,draftData:Prisma.DbNull,hasDraftChanges:false,revision:{increment:1},publishedRevision:{increment:1}}});
    // Previously completed material cannot satisfy a newly introduced or changed test.
    await tx.lessonProgress.deleteMany({where:{lessonId:quiz.lessonId}}); reset = true;
  }
  if (reset) {
    // Published lesson rows have already been promoted under the same lock.
    await tx.$executeRaw`WITH totals AS (SELECT COUNT(*)::int AS total FROM "Lesson" WHERE "courseId" = ${courseId} AND "moduleId" IS NOT NULL AND "isPublished" = true), counts AS (SELECT e.id, COUNT(l.id)::int AS done FROM "Enrollment" e LEFT JOIN "LessonProgress" lp ON lp."enrollmentId" = e.id LEFT JOIN "Lesson" l ON l.id = lp."lessonId" AND l."courseId" = ${courseId} AND l."moduleId" IS NOT NULL AND l."isPublished" = true WHERE e."courseId" = ${courseId} GROUP BY e.id) UPDATE "Enrollment" e SET "progress" = CASE WHEN t.total = 0 THEN 0 ELSE FLOOR(100.0 * c.done / t.total)::int END, "isCompleted" = (t.total > 0 AND c.done = t.total) FROM counts c, totals t WHERE e.id = c.id`;
  }
}

@Injectable()
export class LmsQuizService {
  constructor(private readonly db: PrismaService) {}
  async admin(lessonId:string) {
    const lesson=await this.db.lesson.findFirst({where:{id:lessonId,moduleId:{not:null}},select:{id:true}});
    if (!lesson) throw new NotFoundException('Урок не найден');
    return adminView(await this.db.lmsLessonQuiz.findUnique({where:{lessonId}}));
  }
  async save(lessonId:string, dto:SaveQuizDto) {
    const initial=await this.db.lesson.findUnique({where:{id:lessonId},select:{courseId:true}});
    if (!initial) throw new NotFoundException('Урок не найден');
    const next=dto.enabled ? definition(dto) : null;
    return this.db.$transaction(async tx=>{
      await tx.$queryRaw`SELECT id FROM "Course" WHERE id = ${initial.courseId} FOR UPDATE`;
      const lesson=await tx.lesson.findFirst({where:{id:lessonId,courseId:initial.courseId,moduleId:{not:null}},select:{id:true}});
      if (!lesson) throw new NotFoundException('Урок не найден');
      const previous=await tx.lmsLessonQuiz.findUnique({where:{lessonId}});
      if ((previous?.revision ?? 0) !== dto.revision) throw new ConflictException('Тест изменён другим сотрудником. Откройте урок заново.');
      const same = next && previous?.publishedData && JSON.stringify(next) === JSON.stringify(definition(previous.publishedData));
      const hasDraftChanges = !!(next && !same || !next && previous?.publishedData);
      const saved=await tx.lmsLessonQuiz.upsert({where:{lessonId},create:{lessonId,draftData:next || Prisma.DbNull,draftRemoved:false,hasDraftChanges:!!next,revision:1},update:{draftData:next && !same ? next : Prisma.DbNull,draftRemoved:!next && !!previous?.publishedData,hasDraftChanges,revision:{increment:1}}});
      return adminView(saved);
    });
  }
  private async studentAccess(userId:string,courseId:string,lessonId:string) {
    const enrollment=await this.db.enrollment.findFirst({where:{...accessWhere(userId,courseId),user:{isActive:true}},select:{id:true}});
    if (!enrollment || !await this.db.lesson.findFirst({where:{id:lessonId,courseId,isPublished:true,moduleId:{not:null}},select:{id:true}})) throw new NotFoundException('Курс или урок недоступен');
    return enrollment;
  }
  async student(userId:string,courseId:string,lessonId:string) {
    const enrollment=await this.studentAccess(userId,courseId,lessonId);
    const quiz=await this.db.lmsLessonQuiz.findUnique({where:{lessonId}});
    if (!quiz?.publishedData) return null;
    const data=definition(quiz.publishedData);
    const passed=await this.db.lessonProgress.findUnique({where:{enrollmentId_lessonId:{enrollmentId:enrollment.id,lessonId}},select:{id:true}});
    return {revision:quiz.publishedRevision,passingPercent:data.passingPercent,questions:data.questions.map(({text,options})=>({text,options})),hasPassed:!!passed};
  }
  async attempt(userId:string,courseId:string,lessonId:string,dto:QuizAttemptDto) {
    return this.db.$transaction(async tx=>{
      await tx.$queryRaw`SELECT id FROM "Course" WHERE id = ${courseId} FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM "Enrollment" WHERE "userId" = ${userId} AND "courseId" = ${courseId} FOR UPDATE`;
      const enrollment=await tx.enrollment.findFirst({where:{...accessWhere(userId,courseId),user:{isActive:true}},select:{id:true}});
      if (!enrollment || !await tx.lesson.findFirst({where:{id:lessonId,courseId,isPublished:true,moduleId:{not:null}},select:{id:true}})) throw new NotFoundException('Курс или урок недоступен');
      const quiz=await tx.lmsLessonQuiz.findUnique({where:{lessonId}});
      if (!quiz?.publishedData) throw new NotFoundException('Тест недоступен');
      if (dto.revision !== quiz.publishedRevision) throw new ConflictException('Тест изменён. Обновите страницу и начните заново.');
      const data=definition(quiz.publishedData);
      if (!Array.isArray(dto.answers) || dto.answers.length !== data.questions.length || dto.answers.some((a,i)=>!Number.isInteger(a) || a < 0 || a >= data.questions[i].options.length)) throw new BadRequestException('Ответьте на все вопросы.');
      const correctCount=data.questions.filter((q,i)=>q.correctIndex===dto.answers[i]).length, total=data.questions.length;
      const score=Math.floor(correctCount * 100 / total), passed=score >= data.passingPercent;
      await tx.lmsQuizAttempt.create({data:{lessonId,enrollmentId:enrollment.id,publishedRevision:quiz.publishedRevision,score,passed}});
      if (passed) await tx.lessonProgress.upsert({where:{enrollmentId_lessonId:{enrollmentId:enrollment.id,lessonId}},create:{enrollmentId:enrollment.id,lessonId},update:{}});
      const [count,done]=await Promise.all([tx.lesson.count({where:{courseId,isPublished:true,moduleId:{not:null}}}),tx.lessonProgress.count({where:{enrollmentId:enrollment.id,lesson:{courseId,isPublished:true,moduleId:{not:null}}}})]);
      const progress=count ? Math.floor(done*100/count) : 0, isCompleted=count > 0 && done === count;
      await tx.enrollment.update({where:{id:enrollment.id},data:{progress,isCompleted}});
      return {passed,score,correctCount,total,progress,isCompleted};
    });
  }
}
