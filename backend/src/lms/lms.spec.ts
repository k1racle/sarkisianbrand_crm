import { randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { LmsService } from './lms.service';
import { CreateCoursePurchaseDto, CreateLessonDto, UpdateCourseDto, UpdateLessonDto, UpdateTariffDto } from './lms.dto';
import { LmsAdminController, LmsStudentController } from './lms.controller';
import { PERMISSIONS_KEY } from '../common/decorators/permissions.decorator';
import { Test } from '@nestjs/testing';
import { UnauthorizedException, ValidationPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { PrismaService } from '../prisma/prisma.service';
import { LmsPublicController } from './lms.controller';
import { assertCoursePurchasable, LmsPurchaseService } from './lms-purchase.service';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import { OrdersService } from '../orders/orders.service';
import { courseReceiptForRobokassa, makeCourseFiscalSnapshot } from '../payments/course-fiscal-receipt';
import { makeRobokassaPost } from '../payments/robokassa.protocol';
import { AlternativePaymentsService } from '../payments/alternative-payments.service';

describe('LMS validation and permission contract', () => {
  it('rejects nulls for non-nullable patch fields and unsupported lesson types', async () => {
    expect(await validate(plainToInstance(UpdateCourseDto, { status: null }))).not.toHaveLength(0);
    expect(await validate(plainToInstance(UpdateTariffDto, { price: null }))).not.toHaveLength(0);
    expect(await validate(plainToInstance(CreateLessonDto, { title: 'Урок', kind: 'OTHER' }))).not.toHaveLength(0);
    expect(await validate(plainToInstance(CreateLessonDto, { title: 'Урок', kind: 'LIVE' }))).toHaveLength(0);
    expect(await validate(plainToInstance(UpdateLessonDto, { title: 'Урок' }))).not.toHaveLength(0);
    expect(await validate(plainToInstance(UpdateLessonDto, { title: 'Урок', revision: 0 }))).toHaveLength(0);
    expect(await validate(plainToInstance(CreateCoursePurchaseDto, { courseId: randomUUID(), tariffId: randomUUID(), expectedPrice: 1, acceptedTerms: 'false' }, { enableImplicitConversion: true }))).not.toHaveLength(0);
  });
  it('requires explicit read/write permission for every administrative mutation', () => {
    expect(Reflect.getMetadata(PERMISSIONS_KEY, LmsAdminController)).toEqual(['lms.read']);
    for (const name of ['create','update','createTariff','updateTariff','createModule','updateModule','createLesson','updateLesson'] as const)
      expect(Reflect.getMetadata(PERMISSIONS_KEY, LmsAdminController.prototype[name])).toEqual(['lms.read','lms.write']);
    expect(Reflect.getMetadata('__guards__', LmsStudentController)).toHaveLength(1);
  });
});

const url = process.env.LMS_TEST_DATABASE_URL;
if (url) {
  const parsed = new URL(url);
  if (!['127.0.0.1','localhost'].includes(parsed.hostname) || ![['56432','/lms_fixture'],['55435','/lms_fixture'],['56437','/lms_revision_fixture']].some(([port,path]) => parsed.port === port && parsed.pathname === path)) throw new Error('LMS tests require the dedicated local fixture database');
}
const pg = url ? describe : describe.skip;
pg('LMS against isolated PostgreSQL', () => {
  const db = url ? new PrismaClient({ datasources: { db: { url } } }) : undefined as unknown as PrismaClient;
  const service = new LmsService(db as any);
  async function editLesson(id: string, dto: Omit<Parameters<LmsService['updateLesson']>[1], 'revision'>) { const { revision } = await db.lesson.findUniqueOrThrow({ where: { id }, select: { revision: true } }); return service.updateLesson(id, { ...dto, revision }); }
  const userIds: string[] = [], courses: string[] = [];
  async function user() { const row = await db.user.create({ data: { email: `lms-${randomUUID()}@example.invalid`, password: 'fixture', role: 'CUSTOMER_B2C' } }); userIds.push(row.id); return row; }
  async function draft() { const course = await service.createCourse({ titleRu: 'Курс', description: 'Описание' }); courses.push(course.id); return course; }
  async function filled() {
    const course = await draft();
    const tariff = await service.createTariff(course.id, { title: 'Базовый', price: 4500, accessDays: 30 });
    const module = await service.createModule(course.id, { title: 'Введение' });
    const lesson = await service.createLesson(module.id, { title: 'Текст', kind: 'TEXT', content: 'Только для ученика' });
    return { course, tariff, module, lesson };
  }
  beforeAll(async () => db.$connect());
  afterAll(async () => {
    // Fixture database is explicitly isolated. Delete only records created by this suite.
    const purchases = await db.coursePurchase.findMany({ where: { courseId: { in: courses } }, select: { orderId: true } });
    await db.lessonProgress.deleteMany({ where: { enrollment: { courseId: { in: courses } } } });
    await db.enrollment.deleteMany({ where: { courseId: { in: courses } } });
    await db.coursePurchase.deleteMany({ where: { courseId: { in: courses } } });
    await db.payment.deleteMany({ where: { orderId: { in: purchases.map(item => item.orderId) } } });
    await db.order.deleteMany({ where: { id: { in: purchases.map(item => item.orderId) } } });
    await db.lesson.deleteMany({ where: { courseId: { in: courses } } });
    await db.courseModule.deleteMany({ where: { courseId: { in: courses } } });
    await db.courseTariff.deleteMany({ where: { courseId: { in: courses } } });
    await db.course.deleteMany({ where: { id: { in: courses } } });
    await db.user.deleteMany({ where: { id: { in: userIds } } });
    await db.$disconnect();
  });
  it('keeps old course and enrollment inaccessible by default', async () => {
    const person = await user(), course = await db.course.create({ data: { titleRu: 'Старый', price: 1 } }); courses.push(course.id);
    const enrollment = await db.enrollment.create({ data: { userId: person.id, courseId: course.id } });
    expect(course.status).toBe('DRAFT'); expect(enrollment.accessStatus).toBe('UNVERIFIED');
    await expect(service.myCourse(person.id,course.id)).rejects.toMatchObject({ status: 404 });
    expect((await service.catalog()).items.some(row => row.id === course.id)).toBe(false);
  });
  it('paginates and searches across all courses without publishing drafts', async () => {
    const marker = `filter-${randomUUID()}`;
    const one = await service.createCourse({ titleRu: `${marker} первый` }), two = await service.createCourse({ titleRu: `${marker} второй` });
    courses.push(one.id,two.id);
    const page1 = await service.adminList({ page: 1, limit: 1, search: marker.toUpperCase() });
    const page2 = await service.adminList({ page: 2, limit: 1, search: marker.toUpperCase() });
    expect(page1.total).toBe(2); expect(page1.pages).toBe(2); expect(page1.items).toHaveLength(1); expect(page2.items).toHaveLength(1); expect(page1.items[0].id).not.toBe(page2.items[0].id);
    expect((await service.catalog({ page: 1, limit: 20, search: marker })).total).toBe(0);
  });
  it('publishes only complete courses and rolls back invalid changes', async () => {
    const course = await draft();
    await expect(service.updateCourse(course.id, { status: 'PUBLISHED' })).rejects.toMatchObject({ status: 400 });
    expect((await db.course.findUniqueOrThrow({ where: { id: course.id } })).status).toBe('DRAFT');
    const tariff = await service.createTariff(course.id, { title: 'Тариф', price: 500 });
    const module = await service.createModule(course.id, { title: 'Модуль' });
    const lesson = await service.createLesson(module.id, { title: 'Видео', kind: 'VIDEO' });
    await expect(service.updateCourse(course.id, { status: 'PUBLISHED' })).rejects.toMatchObject({ status: 400 });
    await expect(editLesson(lesson.id, { videoUrl: 'javascript:alert(1)' })).rejects.toMatchObject({ status: 400 });
    await editLesson(lesson.id, { videoUrl: 'https://video.example.invalid/lesson' });
    await service.updateCourse(course.id, { status: 'PUBLISHED' });
    await expect(service.updateTariff(tariff.id, { isActive: false })).rejects.toMatchObject({ status: 400 });
    expect((await db.courseTariff.findUniqueOrThrow({ where: { id: tariff.id } })).isActive).toBe(true);
    await editLesson(lesson.id, { videoUrl: null });
    await expect(service.updateCourse(course.id, { status: 'PUBLISHED' })).rejects.toMatchObject({ status: 400 });
    expect((await db.lesson.findUniqueOrThrow({ where: { id: lesson.id } })).videoUrl).toBe('https://video.example.invalid/lesson');
  });
  it('keeps changed lesson fields and new lessons private until explicit atomic publication', async () => {
    const f = await filled(), student = await user();
    await editLesson(f.lesson.id, { isPreview: true });
    await service.updateCourse(f.course.id, { status: 'PUBLISHED' });
    await db.enrollment.create({ data: { userId: student.id, courseId: f.course.id, accessStatus: 'ACTIVE' } });
    await service.complete(student.id, f.course.id, f.lesson.id);
    await editLesson(f.lesson.id, { title:'Новое название', content:'Новый текст', isPreview:false, sortOrder:5 });
    const next = await service.createLesson(f.module.id, { title:'Новый урок', kind:'TEXT', content:'Секрет нового урока' });
    expect(next.isPublished).toBe(false);
    expect(await service.myLesson(student.id,f.course.id,f.lesson.id)).toMatchObject({ title:'Текст', content:'Только для ученика', isPreview:true, sortOrder:0 });
    expect(await service.preview(f.course.id,f.lesson.id)).toMatchObject({ content:'Только для ученика' });
    await expect(service.myLesson(student.id,f.course.id,next.id)).rejects.toMatchObject({ status:404 });
    expect((await service.myCourse(student.id,f.course.id)).progress).toBe(100);
    const admin = await service.adminDetail(f.course.id);
    expect(admin.modules[0].lessons.find(item => item.id === f.lesson.id)).toMatchObject({ title:'Новое название', content:'Новый текст', isPreview:false, hasDraftChanges:true });
    expect(JSON.stringify(await service.catalogDetail(f.course.id))).not.toContain('Новое название');
    await service.updateCourse(f.course.id,{status:'PUBLISHED'});
    expect(await service.myLesson(student.id,f.course.id,f.lesson.id)).toMatchObject({ title:'Новое название', content:'Новый текст', isPreview:false, sortOrder:5 });
    await expect(service.preview(f.course.id,f.lesson.id)).rejects.toMatchObject({status:404});
    expect(await service.myLesson(student.id,f.course.id,next.id)).toMatchObject({ content:'Секрет нового урока' });
    expect((await service.myCourse(student.id,f.course.id)).progress).toBe(50);
    expect((await service.adminDetail(f.course.id)).modules[0].lessons.find(item => item.id === f.lesson.id)).toMatchObject({hasDraftChanges:false});
  });
  it('does not expose a private preview flag early and preserves the paid version through draft, archive and failed publication', async () => {
    const f=await filled(), student=await user();
    await service.updateCourse(f.course.id,{status:'PUBLISHED'});
    await db.enrollment.create({data:{userId:student.id,courseId:f.course.id,accessStatus:'ACTIVE'}});
    await editLesson(f.lesson.id,{isPreview:true,content:''});
    await expect(service.preview(f.course.id,f.lesson.id)).rejects.toMatchObject({status:404});
    await service.updateTariff(f.tariff.id,{price:4600});
    await expect(service.updateCourse(f.course.id,{status:'PUBLISHED'})).rejects.toMatchObject({status:400});
    await service.updateCourse(f.course.id,{status:'DRAFT'});
    expect((await service.myLesson(student.id,f.course.id,f.lesson.id)).content).toBe('Только для ученика');
    await service.updateCourse(f.course.id,{status:'ARCHIVED'});
    expect((await service.myLesson(student.id,f.course.id,f.lesson.id)).content).toBe('Только для ученика');
    await editLesson(f.lesson.id,{content:'Новый общедоступный текст'});
    await service.updateCourse(f.course.id,{status:'PUBLISHED'});
    expect((await service.preview(f.course.id,f.lesson.id)).content).toBe('Новый общедоступный текст');
  });
  it('clears a no-op or reverted draft without changing published content', async () => {
    const f=await filled(); await service.updateCourse(f.course.id,{status:'PUBLISHED'});
    await editLesson(f.lesson.id,{title:'Текст',kind:'TEXT',content:'Только для ученика',isPreview:false,sortOrder:0});
    expect((await service.adminDetail(f.course.id)).modules[0].lessons[0].hasDraftChanges).toBe(false);
    await editLesson(f.lesson.id,{content:'Изменение'});
    await editLesson(f.lesson.id,{content:'Только для ученика'});
    expect((await service.adminDetail(f.course.id)).modules[0].lessons[0].hasDraftChanges).toBe(false);
  });
  it('serializes concurrent edit and publication without a partial version', async () => {
    const f=await filled(), student=await user(); await service.updateCourse(f.course.id,{status:'PUBLISHED'});
    await db.enrollment.create({data:{userId:student.id,courseId:f.course.id,accessStatus:'ACTIVE'}});
    const results = await Promise.allSettled([editLesson(f.lesson.id,{title:'Новая версия',content:'Новое содержимое'}),service.updateCourse(f.course.id,{status:'PUBLISHED'})]);
    expect(results[1].status).toBe('fulfilled');
    const visible=await service.myLesson(student.id,f.course.id,f.lesson.id);
    const edited=(await service.adminDetail(f.course.id)).modules[0].lessons[0];
    if (results[0].status === 'rejected') {
      expect(results[0].reason).toMatchObject({status:409});
      expect(edited).toMatchObject({title:'Текст',content:'Только для ученика'});
      expect(visible).toMatchObject({title:'Текст',content:'Только для ученика'});
      return;
    }
    expect(edited).toMatchObject({title:'Новая версия',content:'Новое содержимое'});
    if (edited.hasDraftChanges) expect(visible).toMatchObject({title:'Текст',content:'Только для ученика'});
    else expect(visible).toMatchObject({title:'Новая версия',content:'Новое содержимое'});
  });
  it('rejects stale lesson forms after another edit or publication', async () => {
    const f = await filled(); await service.updateCourse(f.course.id,{status:'PUBLISHED'});
    const { revision } = await db.lesson.findUniqueOrThrow({ where:{id:f.lesson.id}, select:{revision:true} });
    const outcomes = await Promise.allSettled([
      service.updateLesson(f.lesson.id,{revision,title:'Первая правка'}),
      service.updateLesson(f.lesson.id,{revision,title:'Вторая правка'}),
    ]);
    expect(outcomes.filter(item=>item.status==='fulfilled')).toHaveLength(1);
    const rejected=outcomes.find(item=>item.status==='rejected') as PromiseRejectedResult;
    expect(rejected.reason).toMatchObject({status:409});
    const after=(await service.adminDetail(f.course.id)).modules[0].lessons[0];
    expect(['Первая правка','Вторая правка']).toContain(after.title);
    await expect(service.updateLesson(f.lesson.id,{revision,title:'Устаревшая форма'})).rejects.toMatchObject({status:409});
    await expect(service.updateLesson(f.lesson.id,{title:'Без версии'} as any)).rejects.toMatchObject({status:409});
    await service.updateCourse(f.course.id,{status:'PUBLISHED'});
    await expect(service.updateLesson(f.lesson.id,{revision:after.revision,title:'Форма до публикации'})).rejects.toMatchObject({status:409});
    expect((await service.adminDetail(f.course.id)).modules[0].lessons[0].title).toBe(after.title);
  });
  it('never exposes non-preview lesson content in the public catalog', async () => {
    const f = await filled();
    const preview = await service.createLesson(f.module.id, { title: 'Открытый', kind: 'TEXT', content: 'Открытый текст', isPreview: true });
    await editLesson(preview.id, { videoUrl: 'https://video.example.invalid/private-old-link' });
    await service.updateCourse(f.course.id, { status: 'PUBLISHED' });
    const publicData = await service.catalogDetail(f.course.id);
    expect(JSON.stringify(publicData)).not.toContain('Только для ученика');
    await expect(service.preview(f.course.id,f.lesson.id)).rejects.toMatchObject({ status: 404 });
    const previewContent = await service.preview(f.course.id,preview.id);
    expect(previewContent.content).toBe('Открытый текст'); expect(previewContent.videoUrl).toBeNull();
  });
  it('keeps live lessons private and requires their description before publication', async () => {
    const f = await filled();
    await expect(service.createLesson(f.module.id, { title: 'Эфир', kind: 'LIVE', isPreview: true })).rejects.toMatchObject({ status: 400 });
    const live = await service.createLesson(f.module.id, { title: 'Эфир', kind: 'LIVE' });
    await expect(service.updateCourse(f.course.id, { status: 'PUBLISHED' })).rejects.toMatchObject({ status: 400 });
    await editLesson(live.id, { content: 'Обсуждение урока', videoUrl: 'https://video.example.invalid/private' });
    await service.updateCourse(f.course.id, { status: 'PUBLISHED' });
    await expect(editLesson(live.id, { isPreview: true })).rejects.toMatchObject({ status: 400 });
    await expect(service.preview(f.course.id, live.id)).rejects.toMatchObject({ status: 404 });
    const student = await user();
    await db.enrollment.create({ data: { userId: student.id, courseId: f.course.id, accessStatus: 'ACTIVE' } });
    expect(await service.myLesson(student.id, f.course.id, live.id)).toMatchObject({ content: 'Обсуждение урока', videoUrl: null });
  });
  it('enforces account, expiry, status and course boundaries for content and progress', async () => {
    const f = await filled(), other = await filled(), a = await user(), b = await user();
    await service.updateCourse(f.course.id, { status: 'PUBLISHED' }); await service.updateCourse(other.course.id, { status: 'PUBLISHED' });
    const access = await db.enrollment.create({ data: { userId: a.id, courseId: f.course.id, accessStatus: 'ACTIVE', accessExpiresAt: new Date(Date.now() + 86400000) } });
    await db.enrollment.create({ data: { userId: b.id, courseId: f.course.id, accessStatus: 'UNVERIFIED' } });
    await expect(service.myLesson(b.id,f.course.id,f.lesson.id)).rejects.toMatchObject({ status: 404 });
    await expect(service.myLesson(a.id,f.course.id,other.lesson.id)).rejects.toMatchObject({ status: 404 });
    expect((await service.myLesson(a.id,f.course.id,f.lesson.id)).content).toBe('Только для ученика');
    const [one,two] = await Promise.all([service.complete(a.id,f.course.id,f.lesson.id),service.complete(a.id,f.course.id,f.lesson.id)]);
    expect(one).toMatchObject({ progress: 100, isCompleted: true }); expect(two).toEqual(one);
    expect(await db.lessonProgress.count({ where: { enrollmentId: access.id } })).toBe(1);
    await service.createLesson(f.module.id, { title: 'Следующий', kind: 'TEXT', content: 'Новое содержание' });
    expect(await service.myCourse(a.id,f.course.id)).toMatchObject({ progress: 100, isCompleted: true });
    await service.updateCourse(f.course.id, { status: 'PUBLISHED' });
    expect(await service.myCourse(a.id,f.course.id)).toMatchObject({ progress: 50, isCompleted: false });
    expect((await service.myCourses(a.id)).find(item => item.courseId === f.course.id)).toMatchObject({ progress: 50, isCompleted: false });
    await db.enrollment.update({ where: { id: access.id }, data: { accessExpiresAt: new Date(Date.now() - 1000) } });
    await expect(service.myLesson(a.id,f.course.id,f.lesson.id)).rejects.toMatchObject({ status: 404 });
    await expect(service.complete(a.id,f.course.id,f.lesson.id)).rejects.toMatchObject({ status: 404 });
  });
  it('routes public, student and CRM operations through distinct access checks', async () => {
    const student = await user(), admin = await db.user.create({ data: { email: `lms-admin-${randomUUID()}@example.invalid`, password: 'fixture', role: 'ADMIN' } }); userIds.push(admin.id);
    const f = await filled(); await service.updateCourse(f.course.id, { status: 'PUBLISHED' });
    const guard = { canActivate(context: any) { const request = context.switchToHttp().getRequest(); const token = request.headers.authorization;
      if (token === 'Bearer fixture-admin') request.user = { sub: admin.id, role: 'ADMIN' };
      else if (token === 'Bearer fixture-student') request.user = { sub: student.id, role: 'CUSTOMER_B2C' };
      else throw new UnauthorizedException(); return true; } };
    const module = await Test.createTestingModule({ controllers: [LmsPublicController,LmsAdminController,LmsStudentController], providers: [LmsService,LmsPurchaseService,RolesGuard,{ provide: PrismaService, useValue: db },{ provide: ConfigService, useValue: { get: () => 'false' } }] }).overrideGuard(JwtAuthGuard).useValue(guard).overrideGuard(ThrottlerGuard).useValue({ canActivate: () => true }).compile();
    const app = module.createNestApplication(); app.setGlobalPrefix('api/v1'); app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.listen(0,'127.0.0.1');
    try {
      const address = app.getHttpServer().address(), base = `http://127.0.0.1:${address.port}/api/v1/lms`;
      const get = (path: string, token?: string) => fetch(base + path, { headers: token ? { authorization: `Bearer ${token}` } : {} });
      const catalog = await get(`/catalog/${f.course.id}`); expect(catalog.status).toBe(200); expect(await catalog.text()).not.toContain('Только для ученика');
      expect((await get('/admin/courses')).status).toBe(401);
      expect((await get('/admin/courses','fixture-student')).status).toBe(403);
      expect((await get('/admin/courses','fixture-admin')).status).toBe(200);
      expect((await get(`/my/${f.course.id}/lessons/${f.lesson.id}`,'fixture-student')).status).toBe(404);
      await db.enrollment.create({ data: { userId: student.id, courseId: f.course.id, accessStatus: 'ACTIVE' } });
      const lesson = await get(`/my/${f.course.id}/lessons/${f.lesson.id}`,'fixture-student'); expect(lesson.status).toBe(200); expect(await lesson.json()).toMatchObject({ content: 'Только для ученика' });
      const invalid = await fetch(`${base}/admin/courses/${f.course.id}`, { method: 'PATCH', headers: { authorization: 'Bearer fixture-admin', 'content-type': 'application/json' }, body: JSON.stringify({ status: null }) }); expect(invalid.status).toBe(400);
      await db.user.update({ where: { id: admin.id }, data: { isActive: false } });
      expect((await get('/admin/courses','fixture-admin')).status).toBe(403);
    } finally { await app.close(); }
  });
  it('creates one isolated digital order for parallel retries and rejects altered prices or a second pending order', async () => {
    const f = await filled(), person = await user(); await service.updateCourse(f.course.id,{ status: 'PUBLISHED' });
    const enabled: any = { get: (key: string) => ['LMS_COURSE_SALES_ENABLED','STOREFRONT_EXTERNAL_CALLS_ENABLED'].includes(key) ? 'true' : 'false' };
    const purchases = new LmsPurchaseService(db as any,enabled);
    const dto = { courseId: f.course.id, tariffId: f.tariff.id, expectedPrice: 4500, acceptedTerms: true }, key = 'fixture-course-key-12345';
    const [a,b] = await Promise.all([purchases.create(person.id,dto,key),purchases.create(person.id,dto,key)]);
    expect(b.id).toBe(a.id); expect(b.orderNumber).toBe(a.orderNumber);
    const saved = await db.coursePurchase.findUniqueOrThrow({ where: { id: a.id }, include: { order: { include: { items: true } } } });
    expect(saved).toMatchObject({ userId: person.id, courseId: f.course.id, tariffId: f.tariff.id, accessDays: 30, status: 'PENDING', accountingStatus: 'NEEDS_REVIEW' });
    expect(saved.order).toMatchObject({ sourceChannel: 'COURSE', isSynced1C: false, reservationState: 'ACTIVE' });
    expect(saved.order.items).toHaveLength(1); expect(saved.order.items[0]).toMatchObject({ productType: 'COURSE', variantId: null, quantity: 1 });
    expect(await db.enrollment.count({ where: { userId: person.id, courseId: f.course.id } })).toBe(0);
    await expect(purchases.create(person.id,{ ...dto, expectedPrice: 4501 },key)).rejects.toMatchObject({ status: 409 });
    await expect(purchases.create(person.id,dto,'fixture-other-key-12345')).rejects.toMatchObject({ status: 409 });
    await expect(new LmsPurchaseService(db as any,{ get: () => 'false' } as any).create(person.id,dto,'fixture-disabled-12345')).rejects.toMatchObject({ status: 503 });
  });
  it('checks sale terms and existing access before starting a new payment', async () => {
    const f = await filled(), person = await user(); await service.updateCourse(f.course.id,{ status: 'PUBLISHED' });
    const enabled: any = { get: () => 'true' };
    const p = await new LmsPurchaseService(db as any,enabled).create(person.id,{ courseId: f.course.id, tariffId: f.tariff.id, expectedPrice: 4500, acceptedTerms: true },'fixture-validation-12345');
    const saved = await db.coursePurchase.findUniqueOrThrow({ where: { id: p.id }, include: { order: true } });
    const check = () => db.$transaction(tx => assertCoursePurchasable(tx, saved.order, true));
    await expect(check()).resolves.toBeUndefined();
    await service.updateTariff(f.tariff.id, { price: 4600 });
    await expect(check()).rejects.toMatchObject({ status: 409 });
    await service.updateTariff(f.tariff.id, { price: 4500 });
    const access = await db.enrollment.create({ data: { userId: person.id, courseId: f.course.id, accessStatus: 'SUSPENDED' } });
    await expect(check()).rejects.toMatchObject({ status: 409 });
    await db.enrollment.update({ where: { id: access.id }, data: { accessStatus: 'UNVERIFIED' } });
    await service.updateCourse(f.course.id, { status: 'ARCHIVED' });
    await expect(check()).rejects.toMatchObject({ status: 409 });
  });
  it('only verified matching payments grant time-limited access once, and archive does not revoke it', async () => {
    const f = await filled(), person = await user(); await db.user.update({ where: { id: person.id }, data: { notificationPreferences: { email: false } } });
    await service.updateCourse(f.course.id,{ status: 'PUBLISHED' });
    const config: any = { get: (key: string) => ['LMS_COURSE_SALES_ENABLED','STOREFRONT_EXTERNAL_CALLS_ENABLED'].includes(key) ? 'true' : 'false' };
    const purchases = new LmsPurchaseService(db as any,config), dto = { courseId: f.course.id, tariffId: f.tariff.id, expectedPrice: 4500, acceptedTerms: true };
    const p = await purchases.create(person.id,dto,'fixture-settlement-12345');
    const saved = await db.coursePurchase.findUniqueOrThrow({ where: { id: p.id } });
    const receipt = makeCourseFiscalSnapshot({ name: saved.courseTitle, amount: '4500.00', email: person.email, policy: { taxation: 'usn_income', tax: 'none', paymentMethod: 'full_payment', paymentObject: 'service' } });
    const payment = await db.payment.create({ data: { orderId: saved.orderId, provider: 'TBANK', transactionId: `TBANK:${Date.now()}${Math.floor(Math.random() * 1000)}`, amount: saved.amount, currency: 'RUB', status: 'PENDING', metadata: { courseOrder: true, environment: 'PRODUCTION', initStarted: true, courseFiscal: { integrationId: randomUUID(), integrationVersion: new Date().toISOString(), issuerName: 'Иванова Анна Ивановна', issuerInn: '500100732259', receipt } } } });
    const oneC: any = { stageOrderExport: jest.fn() };
    const orders = new OrdersService(db as any,oneC,{} as any,{} as any,config);
    const meta = { provider: 'TBANK', orderId: saved.orderId, localPaymentId: payment.id, amount: '4500.00', currency: 'RUB', paid: true, test: false };
    await expect(orders.settleVerifiedPayment(payment.transactionId!,'SUCCEEDED',{ ...meta, amount: '1.00' })).rejects.toMatchObject({ status: 400 });
    expect(await db.enrollment.count({ where: { userId: person.id, courseId: f.course.id } })).toBe(0);
    await expect(orders.settleVerifiedPayment(payment.transactionId!,'SUCCEEDED',{ ...meta, test: true })).rejects.toMatchObject({ status: 409 });
    const before = Date.now();
    const results = await Promise.all([orders.settleVerifiedPayment(payment.transactionId!,'SUCCEEDED',meta),orders.settleVerifiedPayment(payment.transactionId!,'SUCCEEDED',meta)]);
    expect(results.filter(item => !item.duplicate)).toHaveLength(1); expect(results.filter(item => item.duplicate)).toHaveLength(1);
    const enrollment = await db.enrollment.findUniqueOrThrow({ where: { userId_courseId: { userId: person.id, courseId: f.course.id } } });
    expect(enrollment.accessStatus).toBe('ACTIVE'); expect(enrollment.accessExpiresAt!.getTime()).toBeGreaterThanOrEqual(before + 30 * 86400000);
    expect(enrollment.accessExpiresAt!.getTime()).toBeLessThanOrEqual(Date.now() + 30 * 86400000);
    expect(await db.coursePurchase.findUniqueOrThrow({ where: { id: p.id } })).toMatchObject({ status: 'PAID', accountingStatus: 'NEEDS_REVIEW' });
    expect(await db.loyaltyTransaction.count({ where: { orderId: saved.orderId } })).toBe(0);
    expect(oneC.stageOrderExport).not.toHaveBeenCalled();
    await service.updateCourse(f.course.id,{ status: 'ARCHIVED' });
    expect((await service.myLesson(person.id,f.course.id,f.lesson.id)).content).toBe('Только для ученика');
    expect((await service.catalog()).items.some(item => item.id === f.course.id)).toBe(false);
  });
  it('records paid legacy attempts for manual review without issuing access or allowing a second order', async () => {
    const f = await filled(); const otherTariff = await service.createTariff(f.course.id, { title: 'Другой тариф', price: 4600 }); await service.updateCourse(f.course.id, { status: 'PUBLISHED' });
    const config: any = { get: (key: string) => ['LMS_COURSE_SALES_ENABLED','STOREFRONT_EXTERNAL_CALLS_ENABLED'].includes(key) ? 'true' : 'false' };
    const purchases = new LmsPurchaseService(db as any, config), oneC: any = { stageOrderExport: jest.fn() }, orders = new OrdersService(db as any, oneC, {} as any, {} as any, config);
    for (const [provider, late] of [['YOOKASSA',false],['TBANK',false],['ROBOKASSA',false],['YOOKASSA',true]] as const) {
      const person = await user(), dto = { courseId: f.course.id, tariffId: f.tariff.id, expectedPrice: 4500, acceptedTerms: true };
      const originalKey = `fixture-legacy-${randomUUID()}`;
      const created = await purchases.create(person.id, dto, originalKey), saved = await db.coursePurchase.findUniqueOrThrow({ where: { id: created.id } });
      let payment = await db.payment.create({ data: { orderId: saved.orderId, provider, amount: saved.amount, currency: 'RUB', status: 'PENDING', metadata: { environment: 'PRODUCTION' } } });
      const transactionId = provider === 'YOOKASSA' ? `old-${randomUUID()}` : provider === 'TBANK' ? `TBANK:${Date.now()}${Math.floor(Math.random() * 1000)}` : `ROBOKASSA:${payment.invoiceId}`;
      payment = await db.payment.update({ where: { id: payment.id }, data: { transactionId } });
      if (late) {
        payment = await db.payment.update({ where: { id: payment.id }, data: { status: 'CANCELED' } });
        await db.coursePurchase.update({ where: { id: created.id }, data: { status: 'CANCELLED' } });
        await db.order.update({ where: { id: saved.orderId }, data: { status: 'CANCELLED', paymentStatus: 'CANCELED', reservationState: 'RELEASED' } });
      }
      const actor = { sub: person.id, role: 'CUSTOMER_B2C' };
      if (!late) expect((await orders.findOne(created.orderNumber, actor)).payments[0]).toMatchObject({ needsReview: true, retryAllowed: false });
      const meta = { provider, orderId: saved.orderId, localPaymentId: payment.id, amount: '4500.00', currency: 'RUB', paid: true, test: false };
      const results = await Promise.all([orders.settleVerifiedPayment(transactionId, 'SUCCEEDED', meta), orders.settleVerifiedPayment(transactionId, 'SUCCEEDED', meta)]);
      expect(results.filter(item => !item.duplicate)).toHaveLength(1); expect(results.filter(item => item.duplicate)).toHaveLength(1);
      expect(await db.payment.findUniqueOrThrow({ where: { id: payment.id } })).toMatchObject({ status: 'SUCCEEDED', metadata: expect.objectContaining({ courseFiscalReview: true }) });
      expect(await db.coursePurchase.findUniqueOrThrow({ where: { id: created.id } })).toMatchObject({ status: 'PAYMENT_REVIEW', accountingStatus: 'NEEDS_REVIEW' });
      const visible = await orders.findOne(created.orderNumber, actor);
      expect(visible).toMatchObject({ paymentStatus: 'SUCCEEDED', priceSnapshot: expect.objectContaining({ coursePaymentReview: true }) });
      expect(visible.payments[0]).toMatchObject({ needsReview: true, retryAllowed: false }); expect(visible.payments[0]).not.toHaveProperty('metadata');
      expect(await db.enrollment.count({ where: { userId: person.id, courseId: f.course.id } })).toBe(0);
      await expect(purchases.create(person.id, dto, `fixture-next-${randomUUID()}`)).rejects.toThrow(/оплата курса подтверждена.*повторная оплата не нужна/i);
      await expect(purchases.create(person.id, { ...dto, tariffId: otherTariff.id, expectedPrice: 4600 }, `fixture-next-${randomUUID()}`)).rejects.toMatchObject({ status: 409 });
      expect((await purchases.create(person.id, dto, originalKey)).orderNumber).toBe(created.orderNumber);
      expect(await db.order.count({ where: { userId: person.id, sourceChannel: 'COURSE' } })).toBe(1);
      expect(await db.orderStatusHistory.count({ where: { orderId: saved.orderId, comment: { contains: 'фискальных данных' } } })).toBe(1);
    }
    expect(oneC.stageOrderExport).not.toHaveBeenCalled();
  });
  it('opens Robokassa-paid access only when the stored signed receipt matches the course purchase', async () => {
    const f = await filled(); await service.updateCourse(f.course.id, { status: 'PUBLISHED' });
    const config: any = { get: (key: string) => ['LMS_COURSE_SALES_ENABLED','STOREFRONT_EXTERNAL_CALLS_ENABLED'].includes(key) ? 'true' : 'false' }, purchases = new LmsPurchaseService(db as any, config);
    const orders = new OrdersService(db as any, { stageOrderExport: jest.fn() } as any, {} as any, {} as any, config);
    for (const tampered of [false,true]) {
      const person = await user(), dto = { courseId: f.course.id, tariffId: f.tariff.id, expectedPrice: 4500, acceptedTerms: true }, p = await purchases.create(person.id, dto, `fixture-robo-${randomUUID()}`);
      await db.user.update({ where: { id: person.id }, data: { notificationPreferences: { email: false } } });
      const saved = await db.coursePurchase.findUniqueOrThrow({ where: { id: p.id } });
      let payment = await db.payment.create({ data: { orderId: saved.orderId, provider: 'ROBOKASSA', amount: saved.amount, currency: 'RUB', status: 'PENDING' } });
      const receipt = makeCourseFiscalSnapshot({ name: saved.courseTitle, amount: '4500.00', email: person.email, policy: { taxation: 'usn_income', tax: 'none', paymentMethod: 'full_payment', paymentObject: 'service' } });
      const form = makeRobokassaPost({ merchantLogin: 'shop', amount: '4500.00', invoiceId: payment.invoiceId!, password1: 'fixture', algorithm: 'SHA256', isTest: false, localPaymentId: payment.id, description: p.orderNumber, receipt: courseReceiptForRobokassa(receipt), email: person.email });
      if (tampered) form.fields.Receipt = encodeURIComponent('{}');
      const courseFiscal = { integrationId: randomUUID(), integrationVersion: new Date().toISOString(), issuerName: 'Иванова Анна Ивановна', issuerInn: '500100732259', receipt };
      payment = await db.payment.update({ where: { id: payment.id }, data: { transactionId: `ROBOKASSA:${payment.invoiceId}`, metadata: { courseOrder: true, environment: 'PRODUCTION', courseFiscal, confirmationForm: form } } });
      const result = await orders.settleVerifiedPayment(payment.transactionId!, 'SUCCEEDED', { provider: 'ROBOKASSA', orderId: saved.orderId, localPaymentId: payment.id, amount: '4500.00', currency: 'RUB', paid: true, test: false });
      const enrollment = await db.enrollment.findUnique({ where: { userId_courseId: { userId: person.id, courseId: f.course.id } } });
      if (tampered) { expect(result).toMatchObject({ needsReview: true }); expect(enrollment).toBeNull(); }
      else { expect((result as any).needsReview).toBeUndefined(); expect(enrollment?.accessStatus).toBe('ACTIVE'); }
    }
  });
  it('permits a new purchase after a completed refund and closed access', async () => {
    const f = await filled(), person = await user(); await service.updateCourse(f.course.id, { status: 'PUBLISHED' });
    const config: any = { get: () => 'true' }, purchases = new LmsPurchaseService(db as any, config), dto = { courseId: f.course.id, tariffId: f.tariff.id, expectedPrice: 4500, acceptedTerms: true };
    const old = await purchases.create(person.id, dto, `fixture-refunded-${randomUUID()}`), oldPurchase = await db.coursePurchase.findUniqueOrThrow({ where: { id: old.id } });
    await db.coursePurchase.update({ where: { id: old.id }, data: { status: 'REFUNDED' } });
    await db.order.update({ where: { id: oldPurchase.orderId }, data: { status: 'REFUNDED', paymentStatus: 'REFUNDED', reservationState: 'CONSUMED' } });
    await db.enrollment.create({ data: { userId: person.id, courseId: f.course.id, accessStatus: 'REFUNDED' } });
    const renewed = await purchases.create(person.id, dto, `fixture-renewed-${randomUUID()}`);
    expect(renewed.orderNumber).not.toBe(old.orderNumber); expect(renewed.status).toBe('PENDING');
  });
  it('blocks new course orders if a confirmed orphaned course payment needs review', async () => {
    const f = await filled(), person = await user(); await service.updateCourse(f.course.id, { status: 'PUBLISHED' });
    const order = await db.order.create({ data: { orderNumber: `SB-ORPHAN-${randomUUID()}`, userId: person.id, source: 'WEB', sourceChannel: 'COURSE', status: 'PAYMENT_WAITING', paymentStatus: 'PENDING', totalAmount: 4500, finalAmount: 4500, shippingAddress: {}, reservationState: 'ACTIVE', reservationExpiresAt: new Date(Date.now()+600000), priceSnapshot: { kind: 'COURSE', digitalDelivery: true } } });
    const payment = await db.payment.create({ data: { orderId: order.id, provider: 'YOOKASSA', status: 'PENDING', transactionId: `orphan-${randomUUID()}`, amount: 4500, currency: 'RUB' } });
    try {
      const config: any = { get: () => 'true' }, orders = new OrdersService(db as any, {} as any, {} as any, {} as any, config);
      await orders.settleVerifiedPayment(payment.transactionId!, 'SUCCEEDED', { provider: 'YOOKASSA', orderId: order.id, localPaymentId: payment.id, amount: '4500.00', currency: 'RUB', paid: true, test: false });
      expect(await db.order.findUniqueOrThrow({ where: { id: order.id } })).toMatchObject({ paymentStatus: 'SUCCEEDED', priceSnapshot: expect.objectContaining({ coursePaymentReview: true }) });
      await expect(new LmsPurchaseService(db as any, config).create(person.id, { courseId: f.course.id, tariffId: f.tariff.id, expectedPrice: 4500, acceptedTerms: true }, `fixture-orphan-${randomUUID()}`)).rejects.toThrow(/оплаченный заказ курса требует проверки/i);
    } finally { await db.payment.deleteMany({ where: { orderId: order.id } }); await db.order.deleteMany({ where: { id: order.id } }); }
  });
  it('late confirmation blocks an already-issued second attempt and records any second payment without granting access', async () => {
    const f = await filled(), person = await user(); await service.updateCourse(f.course.id, { status: 'PUBLISHED' });
    const config: any = { get: (key: string) => ['LMS_COURSE_SALES_ENABLED','STOREFRONT_EXTERNAL_CALLS_ENABLED'].includes(key) ? 'true' : 'false' };
    const purchases = new LmsPurchaseService(db as any, config), dto = { courseId: f.course.id, tariffId: f.tariff.id, expectedPrice: 4500, acceptedTerms: true };
    const orders = new OrdersService(db as any, { stageOrderExport: jest.fn() } as any, {} as any, {} as any, config);
    const old = await purchases.create(person.id, dto, `fixture-late-old-${randomUUID()}`), oldPurchase = await db.coursePurchase.findUniqueOrThrow({ where: { id: old.id } });
    const oldPayment = await db.payment.create({ data: { orderId: oldPurchase.orderId, provider: 'YOOKASSA', status: 'CANCELED', transactionId: `old-${randomUUID()}`, amount: 4500, currency: 'RUB' } });
    await db.coursePurchase.update({ where: { id: old.id }, data: { status: 'CANCELLED' } });
    await db.order.update({ where: { id: oldPurchase.orderId }, data: { status: 'CANCELLED', paymentStatus: 'CANCELED', reservationState: 'RELEASED' } });
    const second = await purchases.create(person.id, dto, `fixture-late-next-${randomUUID()}`), secondPurchase = await db.coursePurchase.findUniqueOrThrow({ where: { id: second.id }, include: { order: true } });
    const receipt = makeCourseFiscalSnapshot({ name: secondPurchase.courseTitle, amount: '4500.00', email: person.email, policy: { taxation: 'usn_income', tax: 'none', paymentMethod: 'full_payment', paymentObject: 'service' } });
    const newPayment = await db.payment.create({ data: { orderId: secondPurchase.orderId, provider: 'TBANK', status: 'PENDING', transactionId: `TBANK:${BigInt('0x' + randomUUID().replace(/-/g, '').slice(0, 12)).toString()}`, amount: 4500, currency: 'RUB', metadata: { courseOrder: true, environment: 'PRODUCTION', initStarted: true, courseFiscal: { integrationId: randomUUID(), integrationVersion: new Date().toISOString(), issuerName: 'Иванова Анна Ивановна', issuerInn: '500100732259', receipt } } } });
    const verified = (provider: string, row: any) => ({ provider, orderId: row.orderId, localPaymentId: row.id, amount: '4500.00', currency: 'RUB', paid: true, test: false });
    await orders.settleVerifiedPayment(oldPayment.transactionId!, 'SUCCEEDED', verified('YOOKASSA', oldPayment));
    const visible = await orders.findOne(second.orderNumber, { sub: person.id, role: 'CUSTOMER_B2C' });
    expect(visible).toMatchObject({ coursePaymentBlocked: true, payments: [expect.objectContaining({ needsReview: true, retryAllowed: false })] });
    expect(visible.payments[0]).not.toHaveProperty('metadata');
    await expect(orders.findOne(second.orderNumber, { sub: randomUUID(), role: 'CUSTOMER_B2C' })).rejects.toMatchObject({ status: 404 });
    await expect(db.$transaction(tx => assertCoursePurchasable(tx, secondPurchase.order, true))).rejects.toThrow(/повторная оплата не нужна/i);
    const bank: any = { assertAvailable: jest.fn(async () => {}), capabilities: jest.fn(async () => ({ provider: 'TBANK', available: false, courseAvailable: true, environment: 'PRODUCTION' })), validateReturnUrl: () => 'https://shop.example/orders/test', createPayment: jest.fn(), getPayment: jest.fn() };
    const alternative = new AlternativePaymentsService(db as any, { getAccessible: () => db.order.findUniqueOrThrow({ where: { id: secondPurchase.orderId } }) } as any, config, {} as any, bank, {} as any);
    await expect(alternative.create('TBANK', second.orderNumber, {})).rejects.toThrow(/повторная оплата не нужна/i);
    expect(bank.getPayment).not.toHaveBeenCalled(); expect(bank.createPayment).not.toHaveBeenCalled();
    const results = await Promise.all([orders.settleVerifiedPayment(newPayment.transactionId!, 'SUCCEEDED', verified('TBANK', newPayment)), orders.settleVerifiedPayment(newPayment.transactionId!, 'SUCCEEDED', verified('TBANK', newPayment))]);
    expect(results.filter(item => !item.duplicate)).toHaveLength(1); expect(results.filter(item => item.duplicate)).toHaveLength(1);
    expect(await db.coursePurchase.findMany({ where: { id: { in: [old.id, second.id] } }, select: { status: true } })).toEqual([{ status: 'PAYMENT_REVIEW' }, { status: 'PAYMENT_REVIEW' }]);
    expect(await db.payment.count({ where: { id: { in: [oldPayment.id, newPayment.id] }, status: 'SUCCEEDED' } })).toBe(2);
    expect(await db.enrollment.count({ where: { userId: person.id, courseId: f.course.id } })).toBe(0);
  }, 30000);
  it('serializes a late callback with concurrent creation and blocks payment on any order that won the race', async () => {
    const f = await filled(), person = await user(); await service.updateCourse(f.course.id, { status: 'PUBLISHED' });
    const config: any = { get: (key: string) => ['LMS_COURSE_SALES_ENABLED','STOREFRONT_EXTERNAL_CALLS_ENABLED'].includes(key) ? 'true' : 'false' };
    const purchases = new LmsPurchaseService(db as any, config), dto = { courseId: f.course.id, tariffId: f.tariff.id, expectedPrice: 4500, acceptedTerms: true };
    const old = await purchases.create(person.id, dto, `fixture-race-old-${randomUUID()}`), purchase = await db.coursePurchase.findUniqueOrThrow({ where: { id: old.id } });
    const payment = await db.payment.create({ data: { orderId: purchase.orderId, provider: 'YOOKASSA', status: 'CANCELED', transactionId: `old-${randomUUID()}`, amount: 4500, currency: 'RUB' } });
    await db.coursePurchase.update({ where: { id: old.id }, data: { status: 'CANCELLED' } });
    await db.order.update({ where: { id: purchase.orderId }, data: { status: 'CANCELLED', paymentStatus: 'CANCELED', reservationState: 'RELEASED' } });
    const orders = new OrdersService(db as any, { stageOrderExport: jest.fn() } as any, {} as any, {} as any, config);
    const [callback, attempt] = await Promise.allSettled([
      orders.settleVerifiedPayment(payment.transactionId!, 'SUCCEEDED', { provider: 'YOOKASSA', orderId: purchase.orderId, localPaymentId: payment.id, amount: '4500.00', currency: 'RUB', paid: true, test: false }),
      purchases.create(person.id, dto, `fixture-race-new-${randomUUID()}`),
    ]);
    expect(callback.status).toBe('fulfilled');
    expect(await db.coursePurchase.findUniqueOrThrow({ where: { id: old.id } })).toMatchObject({ status: 'PAYMENT_REVIEW' });
    expect(await db.payment.findUniqueOrThrow({ where: { id: payment.id } })).toMatchObject({ status: 'SUCCEEDED' });
    if (attempt.status === 'fulfilled') {
      const newer = await db.coursePurchase.findUniqueOrThrow({ where: { id: attempt.value.id }, include: { order: true } });
      await expect(db.$transaction(tx => assertCoursePurchasable(tx, newer.order, true))).rejects.toThrow(/повторная оплата не нужна/i);
    } else expect(attempt.reason).toMatchObject({ status: 409 });
    expect(await db.enrollment.count({ where: { userId: person.id, courseId: f.course.id } })).toBe(0);
  }, 30000);
  it('cancels a course order without issuing access or exporting warehouse facts', async () => {
    const f = await filled(), person = await user(); await db.user.update({ where: { id: person.id }, data: { notificationPreferences: { email: false } } });
    await service.updateCourse(f.course.id,{ status: 'PUBLISHED' });
    const config: any = { get: (key: string) => ['LMS_COURSE_SALES_ENABLED','STOREFRONT_EXTERNAL_CALLS_ENABLED'].includes(key) ? 'true' : 'false' };
    const p = await new LmsPurchaseService(db as any,config).create(person.id,{ courseId: f.course.id, tariffId: f.tariff.id, expectedPrice: 4500, acceptedTerms: true },'fixture-cancellation-12345');
    const saved = await db.coursePurchase.findUniqueOrThrow({ where: { id: p.id } });
    const payment = await db.payment.create({ data: { orderId: saved.orderId, provider: 'TBANK', transactionId: `fixture-${randomUUID()}`, amount: saved.amount, currency: 'RUB', status: 'PENDING' } });
    const oneC: any = { stageOrderExport: jest.fn() }, orders = new OrdersService(db as any,oneC,{} as any,{} as any,config);
    await orders.settleVerifiedPayment(payment.transactionId!,'CANCELED',{ provider: 'TBANK', orderId: saved.orderId, localPaymentId: payment.id, amount: '4500.00', currency: 'RUB', paid: false, test: false });
    expect((await db.coursePurchase.findUniqueOrThrow({ where: { id: p.id } })).status).toBe('CANCELLED');
    expect(await db.enrollment.count({ where: { userId: person.id, courseId: f.course.id } })).toBe(0); expect(oneC.stageOrderExport).not.toHaveBeenCalled();
  });
});
