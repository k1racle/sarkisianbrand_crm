import { BadRequestException, ConflictException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AccessToken, TrackSource } from 'livekit-server-sdk';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLmsLiveDto } from './lms-live.dto';

const sessionSelect = { id: true, courseId: true, lessonId: true, hostId: true, title: true, startsAt: true, endsAt: true, status: true, createdAt: true } as const;
// A short-lived LiveKit token does not revoke an existing connection. This is
// deliberately not configurable: implement and test active-session revocation
// before enabling the feature, even on a server with credentials configured.
const LIVE_ACCESS_ENFORCEMENT_READY: boolean = false;

@Injectable()
export class LmsLiveService {
  constructor(private readonly db: PrismaService, private readonly config: ConfigService) {}

  private settings() {
    if (!LIVE_ACCESS_ENFORCEMENT_READY) throw new ServiceUnavailableException('Прямые эфиры готовятся: защита доступа подключённых участников ещё не завершена.');
    if (String(this.config.get('LMS_LIVE_ENABLED', 'false')) !== 'true') throw new ServiceUnavailableException('Прямые эфиры пока не подключены.');
    const url = String(this.config.get('LMS_LIVEKIT_URL') || ''), key = String(this.config.get('LMS_LIVEKIT_API_KEY') || ''), secret = String(this.config.get('LMS_LIVEKIT_API_SECRET') || '');
    try { const parsed = new URL(url); if (parsed.protocol !== 'wss:' || parsed.username || parsed.password || parsed.hash || parsed.search || parsed.pathname !== '/') throw new Error(); }
    catch { throw new ServiceUnavailableException('Видеосервер эфиров не настроен.'); }
    if (!key || secret.length < 32) throw new ServiceUnavailableException('Видеосервер эфиров не настроен.');
    return { url, key, secret };
  }
  private async student(userId: string, courseId: string, lessonId: string) {
    const access = { userId, accessStatus: 'ACTIVE', OR: [{ accessExpiresAt: null }, { accessExpiresAt: { gt: new Date() } }] };
    const lesson = await this.db.lesson.findFirst({ where: { id: lessonId, courseId, kind: 'LIVE', moduleId: { not: null }, course: { enrollments: { some: access } } }, select: { course: { select: { enrollments: { where: access, select: { accessExpiresAt: true }, take: 1 } } } } });
    const enrollment = lesson?.course.enrollments[0];
    if (!enrollment) throw new NotFoundException('Курс или эфир недоступен.');
    return enrollment;
  }
  private async session(courseId: string, lessonId: string, sessionId: string) {
    const session = await this.db.lmsLiveSession.findFirst({ where: { id: sessionId, courseId, lessonId, lesson: { kind: 'LIVE', moduleId: { not: null } } }, select: sessionSelect });
    if (!session) throw new NotFoundException('Эфир не найден.');
    return session;
  }
  private async host(userId: string, sessionId: string) {
    const session = await this.db.lmsLiveSession.findFirst({ where: { id: sessionId, hostId: userId, lesson: { kind: 'LIVE', moduleId: { not: null } } }, select: sessionSelect });
    if (!session) throw new NotFoundException('Эфир не найден или вы не назначены ведущим.');
    return session;
  }
  private live(session: { status: string; startsAt: Date; endsAt: Date }) {
    const now = Date.now();
    if (session.status !== 'LIVE' || now < session.startsAt.getTime() - 15 * 60_000 || now >= session.endsAt.getTime()) throw new ConflictException('Эфир сейчас не идёт.');
  }
  async create(dto: CreateLmsLiveDto) {
    this.settings();
    const title = dto.title.trim(), startsAt = new Date(dto.startsAt), endsAt = new Date(dto.endsAt);
    if (!title || !Number.isFinite(startsAt.getTime()) || !Number.isFinite(endsAt.getTime()) || endsAt <= startsAt || endsAt.getTime() <= Date.now() || endsAt.getTime() - startsAt.getTime() > 24 * 60 * 60_000) throw new BadRequestException('Проверьте название и время эфира. Максимальная продолжительность — 24 часа.');
    const [lesson, host] = await Promise.all([
      this.db.lesson.findFirst({ where: { id: dto.lessonId, courseId: dto.courseId, kind: 'LIVE', moduleId: { not: null } }, select: { id: true } }),
      this.db.user.findUnique({ where: { id: dto.hostId }, select: { isActive: true, role: true } }),
    ]);
    if (!lesson) throw new BadRequestException('Выберите урок с прямым эфиром в этом курсе.');
    if (!host?.isActive || !['ADMIN','SUPERVISOR','CONTENT_MANAGER'].includes(host.role)) throw new BadRequestException('Выберите действующего сотрудника для проведения эфира.');
    return this.db.lmsLiveSession.create({ data: { courseId: dto.courseId, lessonId: dto.lessonId, hostId: dto.hostId, title, startsAt, endsAt }, select: sessionSelect });
  }
  async listAdmin(courseId: string) { this.settings(); return this.db.lmsLiveSession.findMany({ where: { courseId }, select: sessionSelect, orderBy: [{ startsAt: 'asc' }, { id: 'asc' }], take: 100 }); }
  async hosts() {
    this.settings();
    const rows = await this.db.user.findMany({ where: { isActive: true, role: { in: ['ADMIN', 'SUPERVISOR', 'CONTENT_MANAGER'] } }, select: { id: true, firstName: true, lastName: true }, orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }, { id: 'asc' }], take: 100 });
    return rows.map(row => ({ id: row.id, name: [row.firstName, row.lastName].filter(Boolean).join(' ') || 'Сотрудник' }));
  }
  async listStudent(userId: string, courseId: string, lessonId: string) { this.settings(); await this.student(userId, courseId, lessonId); return this.db.lmsLiveSession.findMany({ where: { courseId, lessonId, status: { not: 'CANCELLED' } }, select: { ...sessionSelect, hostId: false }, orderBy: [{ startsAt: 'asc' }, { id: 'asc' }], take: 100 }); }
  async transition(userId: string, sessionId: string, action: 'start' | 'end' | 'cancel') {
    this.settings(); const s = await this.host(userId, sessionId), now = Date.now();
    const expected = action === 'end' ? 'LIVE' : 'SCHEDULED';
    if (s.status !== expected || (action === 'start' && (now < s.startsAt.getTime() - 15 * 60_000 || now >= s.endsAt.getTime()))) throw new ConflictException('Нельзя изменить состояние эфира.');
    const status = action === 'start' ? 'LIVE' : action === 'end' ? 'ENDED' : 'CANCELLED';
    const updated = await this.db.lmsLiveSession.updateMany({ where: { id: s.id, status: expected, hostId: userId }, data: { status } });
    if (updated.count !== 1) throw new ConflictException('Состояние эфира уже изменилось.');
    return { id: s.id, status };
  }
  private async token(userId: string, session: { id: string; status: string; startsAt: Date; endsAt: Date }, role: 'host' | 'viewer', accessExpiresAt?: Date | null) {
    const { url, key, secret } = this.settings(); this.live(session);
    const expiresAt = Math.min(session.endsAt.getTime(), accessExpiresAt?.getTime() ?? Infinity);
    const ttl = Math.min(60, Math.floor((expiresAt - Date.now()) / 1000));
    if (ttl < 1) throw new ConflictException('Срок доступа к эфиру истёк.');
    const at = new AccessToken(key, secret, { identity: userId, ttl });
    at.addGrant({ room: `lms-${session.id}`, roomJoin: true, canPublish: role === 'host', canSubscribe: true, canPublishData: false, canUpdateOwnMetadata: false, ...(role === 'host' ? { canPublishSources: [TrackSource.CAMERA, TrackSource.MICROPHONE, TrackSource.SCREEN_SHARE, TrackSource.SCREEN_SHARE_AUDIO] } : {}) });
    return { url, token: await at.toJwt(), room: `lms-${session.id}`, role, expiresIn: ttl };
  }
  async joinStudent(userId: string, courseId: string, lessonId: string, sessionId: string) { this.settings(); const enrollment = await this.student(userId, courseId, lessonId); return this.token(userId, await this.session(courseId, lessonId, sessionId), 'viewer', enrollment.accessExpiresAt); }
  async joinHost(userId: string, sessionId: string) { this.settings(); return this.token(userId, await this.host(userId, sessionId), 'host'); }
  private async authorizeChat(userId: string, sessionId: string, courseId?: string, lessonId?: string) {
    this.settings();
    let session;
    if (courseId && lessonId) { await this.student(userId, courseId, lessonId); session = await this.session(courseId, lessonId, sessionId); }
    else session = await this.host(userId, sessionId);
    this.live(session); return session;
  }
  async chat(userId: string, sessionId: string, courseId?: string, lessonId?: string) {
    await this.authorizeChat(userId, sessionId, courseId, lessonId);
    const rows = await this.db.lmsLiveMessage.findMany({ where: { sessionId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 100, select: { id: true, authorId: true, body: true, createdAt: true, author: { select: { firstName: true } } } });
    return rows.reverse().map(row => ({ id: row.id, authorId: row.authorId, authorName: row.author.firstName || 'Участник', body: row.body, createdAt: row.createdAt }));
  }
  async send(userId: string, sessionId: string, body: string, courseId?: string, lessonId?: string) {
    await this.authorizeChat(userId, sessionId, courseId, lessonId);
    const text = body.trim(); if (!text || text.length > 1000) throw new BadRequestException('Введите сообщение длиной до 1000 символов.');
    return this.db.lmsLiveMessage.create({ data: { sessionId, authorId: userId, body: text }, select: { id: true, body: true, createdAt: true } });
  }
}
