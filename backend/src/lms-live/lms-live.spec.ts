import { TokenVerifier } from 'livekit-server-sdk';
import { LmsLiveService } from './lms-live.service';

describe('LMS live access with isolated SDK and no network', () => {
  const key = 'fixture-key', secret = 'fixture-secret-with-at-least-32-characters';
  const now = Date.now();
  const session = { id: 'ed9a83ac-9c66-4c4d-90e0-b578d611f225', courseId: 'course', lessonId: 'lesson', hostId: 'host', title: 'Эфир', startsAt: new Date(now - 60_000), endsAt: new Date(now + 120_000), status: 'LIVE', createdAt: new Date(now) };
  let db: any, service: LmsLiveService;
  beforeEach(() => {
    db = { lesson: { findFirst: jest.fn().mockResolvedValue({ course: { enrollments: [{ accessExpiresAt: null }] } }) }, user: { findUnique: jest.fn().mockResolvedValue({ isActive: true, role: 'CONTENT_MANAGER' }) }, lmsLiveSession: { findFirst: jest.fn().mockResolvedValue(session), findMany: jest.fn().mockResolvedValue([]), create: jest.fn().mockResolvedValue(session), updateMany: jest.fn().mockResolvedValue({ count: 1 }) }, lmsLiveMessage: { findMany: jest.fn().mockResolvedValue([]), create: jest.fn().mockResolvedValue({ id: 'message', body: 'Привет' }) } };
    service = new LmsLiveService(db, { get: (name: string) => ({ LMS_LIVE_ENABLED: 'true', LMS_LIVEKIT_URL: 'wss://media.example', LMS_LIVEKIT_API_KEY: key, LMS_LIVEKIT_API_SECRET: secret } as any)[name] } as any);
    // Exercise the dormant code path in isolation without opening the actual feature gate.
    jest.spyOn(service as any, 'settings').mockReturnValue({ url: 'wss://media.example', key, secret });
  });
  it('выдаёт ученику только подписку в комнате конкретного сеанса без медиа- и data-публикации', async () => {
    const result = await service.joinStudent('student', 'course', 'lesson', session.id);
    const claims = await new TokenVerifier(key, secret).verify(result.token);
    expect(result).toMatchObject({ room: `lms-${session.id}`, role: 'viewer', expiresIn: 60 });
    expect(claims.sub).toBe('student');
    expect(claims.video).toMatchObject({ room: `lms-${session.id}`, roomJoin: true, canPublish: false, canSubscribe: true, canPublishData: false, canUpdateOwnMetadata: false });
    expect(Number(claims.exp) - Number(claims.nbf)).toBeLessThanOrEqual(65);
    expect(db.lesson.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: 'lesson', courseId: 'course', kind: 'LIVE', course: { enrollments: { some: expect.objectContaining({ userId: 'student', accessStatus: 'ACTIVE' }) } } }) }));
    expect(db.lmsLiveSession.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ courseId: 'course', lessonId: 'lesson', id: session.id }) }));
  });
  it('не даёт доступ незачисленному и не проверяет другую комнату после отказа', async () => {
    db.lesson.findFirst.mockResolvedValue(null);
    await expect(service.joinStudent('outsider', 'course', 'lesson', session.id)).rejects.toThrow();
    await expect(service.chat('outsider', session.id, 'course', 'lesson')).rejects.toThrow();
    expect(db.lmsLiveSession.findFirst).not.toHaveBeenCalled(); expect(db.lmsLiveMessage.findMany).not.toHaveBeenCalled();
  });
  it('ограничивает срок токена сроком доступа и временем эфира', async () => {
    db.lesson.findFirst.mockResolvedValue({ course: { enrollments: [{ accessExpiresAt: new Date(Date.now() + 12_000) }] } });
    const result = await service.joinStudent('student', 'course', 'lesson', session.id);
    expect(result.expiresIn).toBeGreaterThan(0); expect(result.expiresIn).toBeLessThanOrEqual(12);
  });
  it('даёт публикацию только назначенному ведущему', async () => {
    const result = await service.joinHost('host', session.id), claims = await new TokenVerifier(key, secret).verify(result.token);
    expect(claims.video).toMatchObject({ canPublish: true, canSubscribe: true, canPublishData: false });
    expect(db.lmsLiveSession.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: session.id, hostId: 'host' }) }));
    db.lmsLiveSession.findFirst.mockResolvedValue(null);
    await expect(service.joinHost('other-host', session.id)).rejects.toThrow();
  });
  it('не выпускает токены до старта, по завершении и за пределами временного окна', async () => {
    for (const row of [{ ...session, status: 'SCHEDULED' }, { ...session, status: 'ENDED' }, { ...session, startsAt: new Date(Date.now() + 20 * 60_000) }, { ...session, endsAt: new Date(Date.now() - 1) }]) {
      db.lmsLiveSession.findFirst.mockResolvedValue(row);
      await expect(service.joinStudent('student', 'course', 'lesson', session.id)).rejects.toThrow();
    }
  });
  it('изолирует чат конкретным сеансом и отклоняет пустые сообщения', async () => {
    await service.chat('student', session.id, 'course', 'lesson');
    expect(db.lmsLiveMessage.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { sessionId: session.id }, take: 100 }));
    await expect(service.send('student', session.id, '  ', 'course', 'lesson')).rejects.toThrow();
    expect(db.lmsLiveMessage.create).not.toHaveBeenCalled();
    await service.send('student', session.id, ' Привет ', 'course', 'lesson');
    expect(db.lmsLiveMessage.create).toHaveBeenCalledWith(expect.objectContaining({ data: { sessionId: session.id, authorId: 'student', body: 'Привет' } }));
  });
  it('проверяет окно и атомарный переход при старте ведущим', async () => {
    db.lmsLiveSession.findFirst.mockResolvedValue({ ...session, status: 'SCHEDULED' });
    await expect(service.transition('host', session.id, 'start')).resolves.toEqual({ id: session.id, status: 'LIVE' });
    expect(db.lmsLiveSession.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: session.id, status: 'SCHEDULED', hostId: 'host' } }));
    db.lmsLiveSession.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.transition('host', session.id, 'start')).rejects.toThrow();
  });
  it('заблокировано даже при включённом флаге и заполненных ключах до реализации отзыва доступа', async () => {
    service = new LmsLiveService(db, { get: (name: string) => ({ LMS_LIVE_ENABLED: 'true', LMS_LIVEKIT_URL: 'wss://media.example', LMS_LIVEKIT_API_KEY: key, LMS_LIVEKIT_API_SECRET: secret } as any)[name] } as any);
    await expect(service.joinStudent('student', 'course', 'lesson', session.id)).rejects.toThrow();
    expect(db.lesson.findFirst).not.toHaveBeenCalled();
  });
});
