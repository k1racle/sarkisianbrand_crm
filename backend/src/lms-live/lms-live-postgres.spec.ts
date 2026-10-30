import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { LmsLiveService } from './lms-live.service';

const url = process.env.LMS_TEST_DATABASE_URL;
const safe = url && (() => { try { const parsed = new URL(url); return ['127.0.0.1','localhost'].includes(parsed.hostname) && ['56432','55435'].includes(parsed.port) && parsed.pathname === '/lms_fixture'; } catch { return false; } })();
if (url && !safe) throw new Error('LMS live integration tests require the isolated local lms_fixture database');
const pg = safe ? describe : describe.skip;
pg('LMS live state transition on isolated PostgreSQL', () => {
  let db: PrismaClient, hostId: string, courseId: string, moduleId: string, lessonId: string, sessionId: string;
  beforeAll(async () => {
    db = new PrismaClient({ datasources: { db: { url: url! } } }); await db.$connect();
    const host = await db.user.create({ data: { email: `live-${randomUUID()}@example.invalid`, password: 'fixture', role: 'CONTENT_MANAGER' } }); hostId = host.id;
    const course = await db.course.create({ data: { titleRu: 'Тест', price: 100 } }); courseId = course.id;
    const module = await db.courseModule.create({ data: { courseId, title: 'Тест' } }); moduleId = module.id;
    const lesson = await db.lesson.create({ data: { courseId, moduleId, title: 'Эфир', kind: 'LIVE' } }); lessonId = lesson.id;
    const session = await db.lmsLiveSession.create({ data: { courseId, lessonId, hostId, title: 'Эфир', startsAt: new Date(Date.now() - 1000), endsAt: new Date(Date.now() + 3600000) } }); sessionId = session.id;
  });
  afterAll(async () => {
    if (!db) return;
    if (sessionId) await db.lmsLiveSession.deleteMany({ where: { id: sessionId } });
    if (lessonId) await db.lesson.deleteMany({ where: { id: lessonId } });
    if (moduleId) await db.courseModule.deleteMany({ where: { id: moduleId } });
    if (courseId) await db.course.deleteMany({ where: { id: courseId } });
    if (hostId) await db.user.deleteMany({ where: { id: hostId } });
    await db.$disconnect();
  });
  it('разрешает единственный переход при параллельном старте', async () => {
    const service = new LmsLiveService(db as any, {} as any, {} as any);
    jest.spyOn(service as any, 'settings').mockReturnValue({ url: 'wss://example.invalid', key: 'fixture', secret: 'fixture-secret-at-least-32-bytes' });
    const results = await Promise.allSettled(Array.from({ length: 8 }, () => service.transition(hostId, sessionId, 'start')));
    expect(results.filter(row => row.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter(row => row.status === 'rejected')).toHaveLength(7);
    expect((await db.lmsLiveSession.findUniqueOrThrow({ where: { id: sessionId } })).status).toBe('LIVE');
  });
});
