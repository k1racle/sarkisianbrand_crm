import { randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';
import { LmsService } from './lms.service';
import { LmsAdminController } from './lms.controller';
import { PERMISSIONS_KEY } from '../common/decorators/permissions.decorator';

describe('LMS students permission', () => {
  it('requires the same restricted LMS read permission and roles as course administration', () => {
    expect(Reflect.getMetadata(PERMISSIONS_KEY, LmsAdminController)).toEqual(['lms.read']);
    expect(Reflect.getMetadata('roles', LmsAdminController)).toEqual(['ADMIN', 'SUPERVISOR', 'CONTENT_MANAGER']);
    expect(Reflect.getMetadata('__guards__', LmsAdminController)).toHaveLength(2);
  });
});

const url = process.env.LMS_TEST_DATABASE_URL;
if (url) {
  const parsed = new URL(url);
  if (!['127.0.0.1', 'localhost'].includes(parsed.hostname) || ![['56432','/lms_fixture'],['55435','/lms_fixture']].some(([port,path]) => parsed.port === port && parsed.pathname === path)) throw new Error('LMS students test requires its isolated local fixture database');
}
(url ? describe : describe.skip)('LMS students against isolated PostgreSQL', () => {
  const db = url ? new PrismaClient({ datasources: { db: { url } } }) : undefined as unknown as PrismaClient;
  const service = new LmsService(db as any);
  const marker = randomUUID();
  const users: string[] = [], courses: string[] = [];
  beforeAll(async () => { await db.$connect(); });
  afterAll(async () => {
    await db.lessonProgress.deleteMany({ where: { enrollment: { courseId: { in: courses } } } });
    await db.enrollment.deleteMany({ where: { courseId: { in: courses } } });
    await db.lesson.deleteMany({ where: { courseId: { in: courses } } });
    await db.courseModule.deleteMany({ where: { courseId: { in: courses } } });
    await db.course.deleteMany({ where: { id: { in: courses } } });
    await db.user.deleteMany({ where: { id: { in: users } } });
    await db.$disconnect();
  });
  it('paginates course enrolments, searches a full name and reports effective access and current progress', async () => {
    const person = await db.user.create({ data: { email: `${marker}@example.invalid`, firstName: `Анна${marker}`, lastName: 'Иванова', password: 'secret-fixture' } }); users.push(person.id);
    const course = await db.course.create({ data: { titleRu: `Курс ${marker}`, price: 1 } }); courses.push(course.id);
    const other = await db.course.create({ data: { titleRu: `Второй ${marker}`, price: 1 } }); courses.push(other.id);
    const module = await db.courseModule.create({ data: { courseId: course.id, title: 'Модуль' } });
    const lesson = await db.lesson.create({ data: { courseId: course.id, moduleId: module.id, title: 'Первый', isPublished: true } });
    await db.lesson.create({ data: { courseId: course.id, moduleId: module.id, title: 'Второй', isPublished: true } });
    await db.lesson.create({ data: { courseId: course.id, moduleId: module.id, title: 'Секрет', isPublished: false } });
    const otherModule = await db.courseModule.create({ data: { courseId: other.id, title: 'Модуль другого курса' } });
    const otherLesson = await db.lesson.create({ data: { courseId: other.id, moduleId: otherModule.id, title: 'Другое', isPublished: true } });
    const enrollment = await db.enrollment.create({ data: { userId: person.id, courseId: course.id, accessStatus: 'ACTIVE' } });
    await db.lessonProgress.create({ data: { enrollmentId: enrollment.id, lessonId: lesson.id } });
    // A mismatched legacy progress row must not inflate another course's progress.
    await db.lessonProgress.create({ data: { enrollmentId: enrollment.id, lessonId: otherLesson.id } });
    await db.enrollment.create({ data: { userId: person.id, courseId: other.id, accessStatus: 'ACTIVE', accessExpiresAt: new Date(Date.now() - 60000) } });
    const result = await service.adminStudents({ search: `АННА${marker} ИВАНОВА`, page: 1, limit: 20 });
    expect(result.total).toBe(2);
    expect(result.items.find(item => item.id === enrollment.id)).toMatchObject({ effectiveStatus:'ACTIVE', totalLessons:2, completedLessons:1, progress:50, course:{id:course.id} });
    expect(result.items.find(item => item.course.id === other.id)?.effectiveStatus).toBe('EXPIRED');
    expect(JSON.stringify(result)).not.toContain('secret-fixture');
    expect((await service.adminStudents({ search: marker, page: 1, limit: 1 })).pages).toBe(2);
    const first = await service.adminStudents({ search: marker, page: 1, limit: 1 });
    const second = await service.adminStudents({ search: marker, page: 2, limit: 1 });
    expect(first.items[0].id).not.toBe(second.items[0].id);
    await db.user.update({ where: { id: person.id }, data: { isActive: false } });
    expect((await service.adminStudents({ search: marker, page:1, limit:20 })).items.find(item => item.id === enrollment.id)?.effectiveStatus).toBe('ACCOUNT_DISABLED');
  });
});
