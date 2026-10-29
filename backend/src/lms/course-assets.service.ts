import { BadRequestException, ConflictException, Injectable, NotFoundException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import { createHmac, randomUUID } from 'crypto';
import { constants, createWriteStream } from 'fs';
import { mkdir, open, readdir, rename, stat, unlink } from 'fs/promises';
import { resolve, join } from 'path';
import { Transform } from 'stream';
import { pipeline } from 'stream/promises';
import { Request, Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { activeSession, SessionClaims } from '../auth/active-session';

export const COURSE_ASSET_MAX_BYTES = 500 * 1024 * 1024;
const COURSE_ASSET_QUOTA_BYTES = 5 * 1024 * 1024 * 1024;
const MAX_UPLOADS_PER_PROCESS = 2;
const meta = { id: true, lessonId: true, filename: true, mimeType: true, size: true, isPublished: true, everPublished: true, createdAt: true } as const;
const validStudentAsset: Prisma.CourseAssetWhereInput = { OR: [
  { mimeType: { in: ['video/mp4', 'video/webm'] }, lesson: { kind: 'VIDEO' } },
  { mimeType: 'application/pdf', lesson: { kind: 'PRESENTATION' } },
] };
type AccessClaims = SessionClaims & { purpose: string; assetId: string; courseId: string; lessonId: string; authExp: number };

export function assetName(raw: string | undefined): string {
  try {
    const decoded = decodeURIComponent(raw || '').normalize('NFC').replace(/[\\/]/g, ' ').replace(/[\u0000-\u001f\u007f]/g, '').trim();
    if (!decoded || decoded.length > 180) throw new Error();
    return decoded;
  } catch { throw new BadRequestException('Укажите корректное имя файла'); }
}
export function assetMime(bytes: Buffer): string {
  if (bytes.subarray(0, 5).equals(Buffer.from('%PDF-'))) return 'application/pdf';
  if (bytes.length >= 12 && bytes.subarray(4, 8).toString('ascii') === 'ftyp') return 'video/mp4';
  if (bytes.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))) return 'video/webm';
  throw new BadRequestException('Поддерживаются PDF, MP4 и WebM');
}
function assertUploadable(lesson: { kind: string; moduleId: string | null; course: { status: string } } | null, mimeType?: string) {
  if (!lesson || !lesson.moduleId) throw new NotFoundException('Урок не найден');
  if (lesson.course.status !== 'DRAFT') throw new ConflictException('Загружать файлы можно только в черновике курса');
  if (!['VIDEO', 'PRESENTATION'].includes(lesson.kind)) throw new BadRequestException('Файлы можно добавлять в видеоуроки и презентации');
  if (mimeType && !(lesson.kind === 'VIDEO' ? ['video/mp4', 'video/webm'].includes(mimeType) : mimeType === 'application/pdf')) throw new BadRequestException('Формат файла не соответствует типу урока');
}
export function parseRange(value: string | undefined, size: number): { start: number; end: number } | null {
  if (!value) return null;
  const m = /^bytes=(\d*)-(\d*)$/.exec(value);
  if (!m || (!m[1] && !m[2]) || !size) throw new RangeError();
  let start: number, end: number;
  if (!m[1]) { const suffix = Number(m[2]); if (!Number.isSafeInteger(suffix) || suffix <= 0) throw new RangeError(); start = Math.max(0, size - suffix); end = size - 1; }
  else { start = Number(m[1]); end = m[2] ? Number(m[2]) : size - 1; if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start >= size || end < start) throw new RangeError(); end = Math.min(end, size - 1); }
  return { start, end };
}

@Injectable()
export class CourseAssetService implements OnModuleInit, OnModuleDestroy {
  private uploads = 0;
  private reserved = 0;
  private cleanupTimer?: NodeJS.Timeout;
  private cleanupRunning = false;
  private cleanupCursor = '';
  constructor(private readonly db: PrismaService, private readonly config: ConfigService, private readonly jwt: JwtService) {}
  onModuleInit() {
    // Persisted tombstones allow interrupted cleanups to be resumed after restart.
    void this.cleanupPending().catch(() => {});
    this.cleanupTimer = setInterval(() => { void this.cleanupPending().catch(() => {}); }, 15 * 60_000);
    this.cleanupTimer.unref();
  }
  onModuleDestroy() { if (this.cleanupTimer) clearInterval(this.cleanupTimer); }
  private directory() { return resolve(this.config.get<string>('CRM_DRIVE_STORAGE_DIR') || 'private-crm-files', 'course-assets'); }
  private cookieName(assetId: string) { return `lms_asset_${assetId.replace(/-/g, '')}`; }
  private cookiePath(assetId: string) { return `/api/v1/lms/media/${assetId}`; }
  private secret() { return createHmac('sha256', this.config.getOrThrow<string>('JWT_SECRET')).update('sarkisian:lms:media-cookie:v1').digest('hex'); }
  private secureCookie() {
    try {
      const u = new URL(String(this.config.get('PUBLIC_APP_URL') || this.config.get('SITE_URL') || ''));
      if (u.protocol === 'https:') return true;
      if (u.protocol === 'http:' && ['localhost','127.0.0.1','[::1]'].includes(u.hostname) && this.config.get('LMS_ALLOW_INSECURE_LOCAL_MEDIA') === 'true') return false;
    } catch {}
    throw new ServiceUnavailableException('Для просмотра материалов настройте защищённый адрес сайта HTTPS');
  }
  private async studentAsset(userId: string, courseId: string, lessonId: string, assetId: string) {
    const asset = await this.db.courseAsset.findFirst({ where: { ...validStudentAsset, id: assetId, lessonId, pendingDelete: false, isPublished: true, lesson: { courseId, isPublished: true, moduleId: { not: null }, course: { enrollments: { some: { userId, accessStatus: 'ACTIVE', OR: [{ accessExpiresAt: null }, { accessExpiresAt: { gt: new Date() } }] } } } } } });
    if (!asset) throw new NotFoundException('Материал недоступен');
    return asset;
  }
  async listAdmin(lessonId: string) {
    if (!await this.db.lesson.findUnique({ where: { id: lessonId }, select: { id: true } })) throw new NotFoundException('Урок не найден');
    return this.db.courseAsset.findMany({ where: { lessonId, pendingDelete: false }, select: meta, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], take: 100 });
  }
  async listStudent(userId: string, courseId: string, lessonId: string) {
    const lesson = await this.db.lesson.findFirst({ where: { id: lessonId, courseId, isPublished: true, moduleId: { not: null }, course: { enrollments: { some: { userId, accessStatus: 'ACTIVE', OR: [{ accessExpiresAt: null }, { accessExpiresAt: { gt: new Date() } }] } } } }, select: { id: true } });
    if (!lesson) throw new NotFoundException('Урок недоступен');
    return this.db.courseAsset.findMany({ where: { ...validStudentAsset, lessonId, pendingDelete: false, isPublished: true }, select: meta, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], take: 100 });
  }
  private async cleanupOne(id: string): Promise<boolean> {
    const asset = await this.db.courseAsset.findFirst({ where: { id, pendingDelete: true, isPublished: false, everPublished: false }, select: { storageKey: true, storageRemovedAt: true } });
    if (!asset) return false;
    if (asset.storageRemovedAt) return true;
    // Keys are generated by the server. Never turn malformed database values
    // into filesystem paths, even when a cleanup job is retried.
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(asset.storageKey)) return false;
    try {
      const directory = this.directory();
      if (!(await stat(directory)).isDirectory()) return false;
      try { await unlink(join(directory, asset.storageKey)); } catch (error: any) { if (error?.code !== 'ENOENT') throw error; }
      // If the process fails here, the tombstone remains counted against quota;
      // retry treats an already absent file as removed only with an existing directory.
      const updated = await this.db.courseAsset.updateMany({ where: { id, pendingDelete: true, isPublished: false, everPublished: false, storageRemovedAt: null }, data: { storageRemovedAt: new Date() } });
      if (updated.count) return true;
      return !!(await this.db.courseAsset.findFirst({ where: { id, pendingDelete: true, isPublished: false, everPublished: false, storageRemovedAt: { not: null } }, select: { id: true } }));
    } catch { return false; }
  }
  private async cleanupPending() {
    if (this.cleanupRunning) return;
    this.cleanupRunning = true;
    try {
      const where = { pendingDelete: true, isPublished: false, everPublished: false, storageRemovedAt: null };
      let rows = await this.db.courseAsset.findMany({ where: { ...where, ...(this.cleanupCursor ? { id: { gt: this.cleanupCursor } } : {}) }, select: { id: true }, orderBy: { id: 'asc' }, take: 100 });
      if (!rows.length && this.cleanupCursor) { this.cleanupCursor = ''; rows = await this.db.courseAsset.findMany({ where, select: { id: true }, orderBy: { id: 'asc' }, take: 100 }); }
      for (const row of rows) await this.cleanupOne(row.id);
      if (rows.length) this.cleanupCursor = rows[rows.length - 1].id;
    } finally { this.cleanupRunning = false; }
  }
  async remove(lessonId: string, assetId: string, user: SessionClaims, revalidate: () => Promise<void>) {
    if (!user?.sub || typeof revalidate !== 'function') throw new UnauthorizedException('Сессия завершена');
    const initial = await this.db.courseAsset.findFirst({ where: { id: assetId, lessonId }, select: { lesson: { select: { courseId: true } } } });
    if (!initial) throw new NotFoundException('Материал не найден');
    await this.db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "Course" WHERE id = ${initial.lesson.courseId} FOR UPDATE`;
      const asset = await tx.courseAsset.findFirst({ where: { id: assetId, lessonId }, select: { id: true, isPublished: true, everPublished: true, pendingDelete: true, lesson: { select: { courseId: true, course: { select: { status: true } } } } } });
      if (!asset || asset.lesson.courseId !== initial.lesson.courseId) throw new NotFoundException('Материал не найден');
      await activeSession(this.db, user); await revalidate();
      if (asset.everPublished || asset.isPublished) throw new ConflictException('Опубликованный ранее файл удалить нельзя');
      if (!asset.pendingDelete) {
        if (asset.lesson.course.status !== 'DRAFT') throw new ConflictException('Удалять файлы можно только в черновике курса');
        const updated = await tx.courseAsset.updateMany({ where: { id: assetId, lessonId, pendingDelete: false, isPublished: false, everPublished: false }, data: { pendingDelete: true, filename: '' } });
        if (updated.count !== 1) throw new ConflictException('Материал изменился. Обновите страницу');
        await tx.auditLog.create({ data: { actorId: user.sub, action: 'lms.asset.delete', resource: 'course_asset', resourceId: assetId, payload: { lessonId } } });
      }
    });
    return { status: await this.cleanupOne(assetId) ? 'deleted' : 'cleanup_pending' } as const;
  }
  async upload(lessonId: string, user: SessionClaims, req: Request, revalidate: () => Promise<void>) {
    if (!user?.sub || typeof revalidate !== 'function') throw new UnauthorizedException('Сессия завершена');
    if (req.headers['content-type']?.split(';')[0].trim().toLowerCase() !== 'application/octet-stream') throw new BadRequestException('Передайте файл в теле запроса');
    const rawLength = req.headers['content-length'];
    if (typeof rawLength !== 'string' || !/^\d+$/.test(rawLength)) throw new BadRequestException('Не указан размер файла');
    const length = Number(rawLength);
    if (!Number.isSafeInteger(length) || length < 5 || length > COURSE_ASSET_MAX_BYTES) throw new BadRequestException('Размер файла должен быть не более 500 МиБ');
    const filename = assetName(req.headers['x-file-name'] as string | undefined);
    const lesson = await this.db.lesson.findUnique({ where: { id: lessonId }, select: { id: true, courseId: true, moduleId: true, kind: true, course: { select: { status: true } } } });
    assertUploadable(lesson);
    if (this.uploads >= MAX_UPLOADS_PER_PROCESS) throw new ServiceUnavailableException('Другие файлы ещё загружаются. Попробуйте позже');
    this.uploads++; this.reserved += length;
    const key = randomUUID(), dir = this.directory(), temporary = join(dir, `.upload-${key}`), destination = join(dir, key);
    let moved = false, saved = false;
    try {
      const total = await this.db.courseAsset.aggregate({ where: { storageRemovedAt: null }, _sum: { size: true } });
      if (Number(total._sum.size || 0) + this.reserved > COURSE_ASSET_QUOTA_BYTES) throw new ConflictException('Недостаточно места для материалов курсов');
      await mkdir(dir, { recursive: true, mode: 0o700 });
      // Only stale temporary files from interrupted uploads; never published assets.
      for (const entry of await readdir(dir)) if (/^\.upload-[0-9a-f-]{36}$/.test(entry) && entry !== `.upload-${key}`) { const p = join(dir, entry); try { const s = await stat(p); if (Date.now() - s.mtimeMs > 24 * 3600000) await unlink(p); } catch {} }
      let count = 0, prefix = Buffer.alloc(0);
      const limiter = new Transform({ transform(chunk: Buffer, _encoding, callback) { count += chunk.length; if (prefix.length < 16) prefix = Buffer.concat([prefix, chunk.subarray(0, 16 - prefix.length)]); if (count > length || count > COURSE_ASSET_MAX_BYTES) callback(new BadRequestException('Превышен размер файла')); else callback(null, chunk); } });
      await pipeline(req, limiter, createWriteStream(temporary, { flags: 'wx', mode: 0o600 }));
      if (count !== length) throw new BadRequestException('Файл загружен не полностью');
      const mimeType = assetMime(prefix);
      assertUploadable(lesson, mimeType);
      await rename(temporary, destination); moved = true;
      const item = await this.db.$transaction(async tx => {
        // Publication takes this same row lock. Never attach a file after a
        // concurrent status/type change or to a different lesson/course.
        await tx.$queryRaw`SELECT id FROM "Course" WHERE id = ${lesson!.courseId} FOR UPDATE`;
        const currentLesson = await tx.lesson.findUnique({ where: { id: lessonId }, select: { courseId: true, moduleId: true, kind: true, course: { select: { status: true } } } });
        if (!currentLesson || currentLesson.courseId !== lesson!.courseId) throw new NotFoundException('Урок не найден');
        assertUploadable(currentLesson, mimeType);
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended('lms-course-assets-quota', 0))`;
        await activeSession(this.db, user);
        await revalidate();
        const current = await tx.courseAsset.aggregate({ where: { storageRemovedAt: null }, _sum: { size: true } });
        if (Number(current._sum.size || 0) + count > COURSE_ASSET_QUOTA_BYTES) throw new ConflictException('Недостаточно места для материалов курсов');
        if (await tx.courseAsset.count({ where: { lessonId, pendingDelete: false } }) >= 100) throw new ConflictException('В уроке может быть не более 100 файлов');
        const result = await tx.courseAsset.create({ data: { id: key, lessonId, filename, mimeType, size: count, storageKey: key, createdBy: user.sub }, select: meta });
        await tx.auditLog.create({ data: { actorId: user.sub, action: 'lms.asset.upload', resource: 'course_asset', resourceId: key, payload: { lessonId, mimeType, size: count } } });
        return result;
      });
      saved = true; return item;
    } finally {
      this.uploads--; this.reserved -= length;
      if (!saved) { try { await unlink(moved ? destination : temporary); } catch {} }
    }
  }
  async ticket(user: SessionClaims, courseId: string, lessonId: string, assetId: string, res: Response) {
    await this.studentAsset(user.sub, courseId, lessonId, assetId);
    const ttl = Math.min(300, user.exp - Math.floor(Date.now() / 1000));
    if (ttl <= 0) throw new UnauthorizedException('Сессия завершена');
    const token = await this.jwt.signAsync({ sub: user.sub, sid: user.sid, authExp: user.exp, purpose: 'lms-media', assetId, courseId, lessonId }, { secret: this.secret(), expiresIn: ttl });
    res.cookie(this.cookieName(assetId), token, { httpOnly: true, secure: this.secureCookie(), sameSite: 'strict', path: this.cookiePath(assetId), maxAge: ttl * 1000 });
    res.setHeader('Cache-Control', 'private, no-store');
    return { url: this.cookiePath(assetId), expiresIn: ttl };
  }
  async media(assetId: string, req: Request, res: Response) {
    res.setHeader('Cache-Control', 'private, no-store');
    const pairs = (req.headers.cookie || '').split(';').map(value => value.trim().split('='));
    const matching = pairs.filter(([name]) => name === this.cookieName(assetId));
    if (matching.length !== 1 || !matching[0][1]) throw new UnauthorizedException('Откройте материал из курса');
    let claims: AccessClaims;
    try { claims = await this.jwt.verifyAsync(matching[0][1], { secret: this.secret() }); if (claims.purpose !== 'lms-media' || claims.assetId !== assetId || !Number.isFinite(claims.authExp) || claims.authExp < claims.exp) throw new Error(); await activeSession(this.db, claims); }
    catch { throw new UnauthorizedException('Сессия просмотра истекла'); }
    const asset = await this.studentAsset(claims.sub, claims.courseId, claims.lessonId, assetId);
    if (!/^[0-9a-f-]{36}$/.test(asset.storageKey)) throw new NotFoundException('Материал недоступен');
    let handle: Awaited<ReturnType<typeof open>>;
    try { handle = await open(join(this.directory(), asset.storageKey), constants.O_RDONLY | (constants.O_NOFOLLOW || 0)); const info = await handle.stat(); if (!info.isFile() || info.size !== asset.size) { await handle.close(); throw new Error(); } }
    catch { throw new NotFoundException('Файл недоступен'); }
    res.setHeader('Cache-Control', 'private, no-store'); res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Content-Security-Policy', "sandbox; default-src 'none'");
    res.setHeader('Content-Type', asset.mimeType); res.setHeader('Accept-Ranges', 'bytes');
    const encodedFilename = encodeURIComponent(asset.filename).replace(/['()*]/g, char => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
    res.setHeader('Content-Disposition', `${asset.mimeType === 'application/pdf' ? 'attachment' : 'inline'}; filename*=UTF-8''${encodedFilename}`);
    let range: { start: number; end: number } | null;
    try { range = parseRange(req.headers.range, asset.size); }
    catch { await handle.close(); res.status(416).setHeader('Content-Range', `bytes */${asset.size}`); res.end(); return; }
    const start = range?.start ?? 0, end = range?.end ?? asset.size - 1;
    if (range) { res.status(206); res.setHeader('Content-Range', `bytes ${start}-${end}/${asset.size}`); }
    res.setHeader('Content-Length', end - start + 1);
    if (req.method === 'HEAD') { await handle.close(); res.end(); return; }
    const stream = handle.createReadStream({ start, end, autoClose: true });
    // Re-check long downloads too: access may be revoked after a range starts.
    let checking = false;
    const recheck = setInterval(() => {
      if (checking) return;
      checking = true;
      void (async () => { try { await activeSession(this.db, { ...claims, exp: claims.authExp }); await this.studentAsset(claims.sub, claims.courseId, claims.lessonId, assetId); } catch { stream.destroy(); res.destroy(); } finally { checking = false; } })();
    }, 15000);
    recheck.unref(); stream.on('close', () => clearInterval(recheck));
    stream.on('error', () => { if (!res.headersSent) res.status(500).end(); else res.destroy(); });
    res.on('close', () => stream.destroy()); stream.pipe(res);
  }
}
