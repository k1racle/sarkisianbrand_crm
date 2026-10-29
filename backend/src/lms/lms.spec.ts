import { randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { LmsService } from './lms.service';
import { CreateCoursePurchaseDto, CreateLessonDto, UpdateCourseDto, UpdateTariffDto } from './lms.dto';
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

describe('LMS validation and permission contract', () => {
  it('rejects nulls for non-nullable patch fields and unsupported lesson types', async () => {
    expect(await validate(plainToInstance(UpdateCourseDto, { status: null }))).not.toHaveLength(0);
    expect(await validate(plainToInstance(UpdateTariffDto, { price: null }))).not.toHaveLength(0);
    expect(await validate(plainToInstance(CreateLessonDto, { title: 'Урок', kind: 'OTHER' }))).not.toHaveLength(0);
    expect(await validate(plainToInstance(CreateLessonDto, { title: 'Урок', kind: 'LIVE' }))).toHaveLength(0);
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
  if (!['127.0.0.1','localhost'].includes(parsed.hostname) || parsed.pathname !== '/lms_fixture' || !['56432','55435'].includes(parsed.port)) throw new Error('LMS tests require the dedicated local lms_fixture database');
}
const pg = url ? describe : describe.skip;
pg('LMS against isolated PostgreSQL', () => {
  const db = url ? new PrismaClient({ datasources: { db: { url } } }) : undefined as unknown as PrismaClient;
  const service = new LmsService(db as any);
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
    await expect(service.updateLesson(lesson.id, { videoUrl: 'javascript:alert(1)' })).rejects.toMatchObject({ status: 400 });
    await service.updateLesson(lesson.id, { videoUrl: 'https://video.example.invalid/lesson' });
    await service.updateCourse(course.id, { status: 'PUBLISHED' });
    await expect(service.updateTariff(tariff.id, { isActive: false })).rejects.toMatchObject({ status: 400 });
    expect((await db.courseTariff.findUniqueOrThrow({ where: { id: tariff.id } })).isActive).toBe(true);
    await expect(service.updateLesson(lesson.id, { videoUrl: null })).rejects.toMatchObject({ status: 400 });
    expect((await db.lesson.findUniqueOrThrow({ where: { id: lesson.id } })).videoUrl).toBe('https://video.example.invalid/lesson');
  });
  it('never exposes non-preview lesson content in the public catalog', async () => {
    const f = await filled();
    const preview = await service.createLesson(f.module.id, { title: 'Открытый', kind: 'TEXT', content: 'Открытый текст', isPreview: true });
    await service.updateLesson(preview.id, { videoUrl: 'https://video.example.invalid/private-old-link' });
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
    await service.updateLesson(live.id, { content: 'Обсуждение урока', videoUrl: 'https://video.example.invalid/private' });
    await service.updateCourse(f.course.id, { status: 'PUBLISHED' });
    await expect(service.updateLesson(live.id, { isPreview: true })).rejects.toMatchObject({ status: 400 });
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
    const payment = await db.payment.create({ data: { orderId: saved.orderId, provider: 'ROBOKASSA', transactionId: `fixture-${randomUUID()}`, amount: saved.amount, currency: 'RUB', status: 'PENDING' } });
    const oneC: any = { stageOrderExport: jest.fn() };
    const orders = new OrdersService(db as any,oneC,{} as any,{} as any,config);
    const meta = { provider: 'ROBOKASSA', orderId: saved.orderId, localPaymentId: payment.id, amount: '4500.00', currency: 'RUB', paid: true, test: false };
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
