import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { LmsCertificateService } from './lms-certificate.service';
import { LmsQuizService } from './lms-quiz.service';

const url = process.env.LMS_TEST_DATABASE_URL;
if (url) { const u = new URL(url); if (!['127.0.0.1','localhost'].includes(u.hostname) || !['56432','55435'].includes(u.port) || u.pathname !== '/lms_fixture') throw new Error('Certificate test requires dedicated isolated LMS database'); }
const pg = url ? describe : describe.skip;
pg('course certificate on isolated PostgreSQL', () => {
  let db: PrismaClient, service: LmsCertificateService, userId: string, otherId: string, sid: string, courseId: string, moduleId: string, lessonId: string, enrollmentId: string;
  const claims = () => ({sub:userId,sid,exp:Math.floor(Date.now()/1000)+3600});
  beforeAll(async () => {
    db = new PrismaClient({datasources:{db:{url}}}); await db.$connect(); service = new LmsCertificateService(db as any);
    const user=await db.user.create({data:{email:`certificate-${randomUUID()}@example.invalid`,password:'fixture',firstName:'Анна',lastName:'Иванова'}}); userId=user.id;
    otherId=(await db.user.create({data:{email:`certificate-${randomUUID()}@example.invalid`,password:'fixture',firstName:'Другой',lastName:'Ученик'}})).id;
    sid=(await db.session.create({data:{userId,refreshToken:`fixture-${randomUUID()}`,expiresAt:new Date(Date.now()+3600000)}})).id;
    courseId=(await db.course.create({data:{titleRu:'Маникюр для мастеров',price:100}})).id;
    moduleId=(await db.courseModule.create({data:{courseId,title:'Модуль'}})).id;
    lessonId=(await db.lesson.create({data:{courseId,moduleId,title:'Урок',kind:'TEXT',content:'Материал',isPublished:true}})).id;
    enrollmentId=(await db.enrollment.create({data:{userId,courseId,accessStatus:'ACTIVE'}})).id;
  });
  afterAll(async () => {
    if (!db) return;
    if (enrollmentId) await db.enrollment.deleteMany({where:{id:enrollmentId}});
    if (lessonId) await db.lesson.deleteMany({where:{id:lessonId}});
    if (moduleId) await db.courseModule.deleteMany({where:{id:moduleId}});
    if (courseId) await db.course.deleteMany({where:{id:courseId}});
    if (userId) { await db.session.deleteMany({where:{userId}}); await db.user.deleteMany({where:{id:userId}}); }
    if (otherId) await db.user.deleteMany({where:{id:otherId}});
    await db.$disconnect();
  });
  it('requires actual completion, issues once and preserves the named snapshot', async () => {
    await expect(service.issue(claims(),courseId)).rejects.toMatchObject({status:400});
    await db.lmsLessonQuiz.create({data:{lessonId,publishedRevision:1,publishedData:{passingPercent:100,questions:[{text:'Вопрос',options:['Да','Нет'],correctIndex:0}]}}});
    const quiz=new LmsQuizService(db as any);
    expect(await quiz.attempt(userId,courseId,lessonId,{revision:1,answers:[1]})).toMatchObject({passed:false});
    await expect(service.issue(claims(),courseId)).rejects.toMatchObject({status:400});
    expect(await quiz.attempt(userId,courseId,lessonId,{revision:1,answers:[0]})).toMatchObject({passed:true,isCompleted:true});
    const [one,two] = await Promise.all([service.issue(claims(),courseId),service.issue(claims(),courseId)]);
    expect(one.id).toBe(two.id); expect(one).toMatchObject({fullName:'Анна Иванова',courseTitle:'Маникюр для мастеров'});
    await db.course.update({where:{id:courseId},data:{titleRu:'Другое название'}});
    await db.user.update({where:{id:userId},data:{firstName:'Изменённое'}});
    await db.enrollment.update({where:{id:enrollmentId},data:{accessStatus:'REVOKED'}});
    expect(await service.get(claims(),courseId)).toMatchObject({id:one.id,fullName:'Анна Иванова',courseTitle:'Маникюр для мастеров'});
    expect(await service.list(claims())).toEqual([expect.objectContaining({id:one.id})]);
    const pdf=await service.pdf(claims(),one.id); expect(pdf.subarray(0,5).toString()).toBe('%PDF-'); expect(pdf.length).toBeGreaterThan(5000);
    const otherSession=await db.session.create({data:{userId:otherId,refreshToken:`fixture-${randomUUID()}`,expiresAt:new Date(Date.now()+3600000)}});
    const other={sub:otherId,sid:otherSession.id,exp:Math.floor(Date.now()/1000)+300};
    await expect(service.pdf(other,one.id)).rejects.toMatchObject({status:404});
    await db.session.delete({where:{id:otherSession.id}});
    await db.session.update({where:{id:sid},data:{expiresAt:new Date(0)}});
    await expect(service.get(claims(),courseId)).rejects.toMatchObject({status:401});
  },30000);
});
