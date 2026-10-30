import { randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';
import { LmsService } from './lms.service';
import { LmsQuizService } from './lms-quiz.service';
import { LmsQuizAdminController, LmsQuizStudentController } from './lms-quiz.controller';
import { PERMISSIONS_KEY } from '../common/decorators/permissions.decorator';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { SaveQuizDto, QuizAttemptDto } from './lms-quiz.dto';

describe('quiz API permissions',()=>{
  it('protects admin editing with existing LMS permissions',()=>{
    expect(Reflect.getMetadata(PERMISSIONS_KEY,LmsQuizAdminController)).toEqual(['lms.read']);
    expect(Reflect.getMetadata(PERMISSIONS_KEY,LmsQuizAdminController.prototype.save)).toEqual(['lms.read','lms.write']);
    expect(Reflect.getMetadata('__guards__',LmsQuizStudentController)).toHaveLength(1);
  });
  it('rejects malformed and oversized request bodies',async()=>{
    expect(await validate(plainToInstance(SaveQuizDto,{revision:-1,enabled:'yes',passingPercent:101,questions:[]}))).not.toHaveLength(0);
    expect(await validate(plainToInstance(SaveQuizDto,{revision:0,enabled:true,passingPercent:70,questions:[{text:'Q',options:['one'],correctIndex:0}]}))).not.toHaveLength(0);
    expect(await validate(plainToInstance(QuizAttemptDto,{revision:1,answers:Array(51).fill(0)}))).not.toHaveLength(0);
  });
});
const url=process.env.LMS_TEST_DATABASE_URL;
if (url) { const u=new URL(url); if (!['localhost','127.0.0.1'].includes(u.hostname) || !['56432','55435'].includes(u.port) || u.pathname !== '/lms_fixture') throw new Error('Quiz test requires dedicated LMS fixture'); }
(url ? describe : describe.skip)('LMS quizzes against isolated PostgreSQL',()=>{
  const db=url ? new PrismaClient({datasources:{db:{url}}}) : undefined as unknown as PrismaClient;
  const lms=new LmsService(db as any), quizzes=new LmsQuizService(db as any);
  let courseId:string,moduleId:string,lessonId:string,userId:string,enrollmentId:string;
  const questions=[{text:'Вопрос 1',options:['Да','Нет'],correctIndex:0},{text:'Вопрос 2',options:['А','Б'],correctIndex:1}];
  beforeAll(async()=>{
    await db.$connect();
    userId=(await db.user.create({data:{email:`quiz-${randomUUID()}@example.invalid`,password:'fixture'}})).id;
    courseId=(await db.course.create({data:{titleRu:'Тест курса',price:1}})).id;
    await db.courseTariff.create({data:{courseId,title:'Базовый',price:1}});
    moduleId=(await db.courseModule.create({data:{courseId,title:'Модуль'}})).id;
    lessonId=(await db.lesson.create({data:{courseId,moduleId,title:'Урок',kind:'TEXT',content:'Материал',isPublished:false}})).id;
    enrollmentId=(await db.enrollment.create({data:{userId,courseId,accessStatus:'ACTIVE'}})).id;
  });
  afterAll(async()=>{
    if (enrollmentId) await db.enrollment.deleteMany({where:{id:enrollmentId}});
    if (lessonId) await db.lesson.deleteMany({where:{id:lessonId}});
    if (moduleId) await db.courseModule.deleteMany({where:{id:moduleId}});
    if (courseId) { await db.courseTariff.deleteMany({where:{courseId}}); await db.course.deleteMany({where:{id:courseId}}); }
    if (userId) await db.user.deleteMany({where:{id:userId}});
    await db.$disconnect();
  });
  it('publishes a draft, hides keys, blocks bypass, grades and completes the course',async()=>{
    expect(await quizzes.admin(lessonId)).toMatchObject({revision:0,enabled:false,questions:[]});
    const draft=await quizzes.save(lessonId,{revision:0,enabled:true,passingPercent:75,questions});
    expect(draft).toMatchObject({revision:1,hasDraftChanges:true,isPublished:false});
    await lms.updateCourse(courseId,{status:'PUBLISHED'});
    const student=await quizzes.student(userId,courseId,lessonId);
    expect(student).toMatchObject({revision:1,passingPercent:75,hasPassed:false});
    expect(JSON.stringify(student)).not.toContain('correctIndex');
    await expect(lms.complete(userId,courseId,lessonId)).rejects.toMatchObject({status:409});
    await expect(quizzes.attempt(userId,courseId,lessonId,{revision:1,answers:[9,1]})).rejects.toMatchObject({status:400});
    expect(await quizzes.attempt(userId,courseId,lessonId,{revision:1,answers:[0,0]})).toMatchObject({passed:false,score:50,progress:0,isCompleted:false});
    expect(await quizzes.attempt(userId,courseId,lessonId,{revision:1,answers:[0,1]})).toMatchObject({passed:true,score:100,progress:100,isCompleted:true});
    expect((await quizzes.student(userId,courseId,lessonId))?.hasPassed).toBe(true);
  });
  it('keeps the old version until publication, rejects stale attempts and resets completion',async()=>{
    const current=await quizzes.admin(lessonId);
    const changed=await quizzes.save(lessonId,{revision:current.revision,enabled:true,passingPercent:100,questions:[{text:'Новый',options:['A','B'],correctIndex:1}]});
    expect(changed.hasDraftChanges).toBe(true);
    expect((await lms.adminDetail(courseId)).modules[0].lessons[0].hasDraftChanges).toBe(true);
    expect((await quizzes.student(userId,courseId,lessonId))?.questions).toHaveLength(2);
    await lms.updateCourse(courseId,{status:'PUBLISHED'});
    expect(await db.lessonProgress.count({where:{enrollmentId,lessonId}})).toBe(0);
    expect(await db.enrollment.findUnique({where:{id:enrollmentId}})).toMatchObject({progress:0,isCompleted:false});
    await expect(quizzes.attempt(userId,courseId,lessonId,{revision:1,answers:[0,1]})).rejects.toMatchObject({status:409});
    const active=await quizzes.student(userId,courseId,lessonId);
    expect(active).toMatchObject({revision:2,hasPassed:false});
    expect(await quizzes.attempt(userId,courseId,lessonId,{revision:2,answers:[1]})).toMatchObject({passed:true,progress:100});
  });
  it('enforces active enrollment and supports removal on publication',async()=>{
    await db.enrollment.update({where:{id:enrollmentId},data:{accessStatus:'REVOKED'}});
    await expect(quizzes.student(userId,courseId,lessonId)).rejects.toMatchObject({status:404});
    await expect(quizzes.attempt(userId,courseId,lessonId,{revision:2,answers:[1]})).rejects.toMatchObject({status:404});
    await db.enrollment.update({where:{id:enrollmentId},data:{accessStatus:'ACTIVE'}});
    const current=await quizzes.admin(lessonId);
    await quizzes.save(lessonId,{revision:current.revision,enabled:false,passingPercent:70,questions:[]});
    expect((await quizzes.student(userId,courseId,lessonId))?.revision).toBe(2);
    await lms.updateCourse(courseId,{status:'PUBLISHED'});
    expect(await quizzes.student(userId,courseId,lessonId)).toBeNull();
  });
  it('rejects invalid questions and stale concurrent edits',async()=>{
    const current=await quizzes.admin(lessonId);
    await expect(quizzes.save(lessonId,{revision:current.revision,enabled:true,passingPercent:70,questions:[{text:' ',options:['a','b'],correctIndex:0}]})).rejects.toMatchObject({status:400});
    const result=await Promise.allSettled([quizzes.save(lessonId,{revision:current.revision,enabled:true,passingPercent:70,questions}),quizzes.save(lessonId,{revision:current.revision,enabled:true,passingPercent:70,questions})]);
    expect(result.filter(x=>x.status==='fulfilled')).toHaveLength(1);
    expect(result.filter(x=>x.status==='rejected')).toHaveLength(1);
  });
});
