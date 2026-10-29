import { mkdtemp, readdir, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { Readable } from 'stream';
import { request as httpRequest } from 'http';
import express = require('express');
import { JwtService } from '@nestjs/jwt';
import { CourseAssetService, assetMime, assetName, parseRange } from './course-assets.service';
import { CourseAssetAdminController, CourseAssetStudentController } from './course-assets.controller';
import { PERMISSIONS_KEY } from '../common/decorators/permissions.decorator';

it('requires LMS read and write permissions for uploading, and a student session for asset listing', () => {
  expect(Reflect.getMetadata('roles', CourseAssetAdminController)).toEqual(['ADMIN', 'SUPERVISOR', 'CONTENT_MANAGER']);
  expect(Reflect.getMetadata(PERMISSIONS_KEY, CourseAssetAdminController)).toEqual(['lms.read']);
  expect(Reflect.getMetadata(PERMISSIONS_KEY, CourseAssetAdminController.prototype.upload)).toEqual(['lms.read', 'lms.write']);
  expect(Reflect.getMetadata(PERMISSIONS_KEY, CourseAssetAdminController.prototype.remove)).toEqual(['lms.read', 'lms.write']);
  expect(Reflect.getMetadata('__guards__', CourseAssetStudentController)).toHaveLength(2);
});

const userId = 'user-1', sessionId = 'session-1';
const courseId = '10000000-0000-4000-8000-000000000001', lessonId = '20000000-0000-4000-8000-000000000001';
const author = { sub:userId, sid:sessionId, exp:Math.floor(Date.now()/1000)+3600 };
const pdf = Buffer.from('%PDF-1.7\nSynthetic fixture data\n%%EOF');
function postWithHost(url:string, headers:Record<string,string>) {
  return new Promise<{status:number;cookie:string[] | undefined}>((resolve,reject) => {
    const req = httpRequest(url, { method:'POST', headers }, res => { res.resume(); res.on('end', () => resolve({ status:res.statusCode || 0, cookie:res.headers['set-cookie'] })); });
    req.on('error', reject); req.end();
  });
}

describe('private LMS assets without real users, services or payments', () => {
  let directory: string, server: any, base: string, service: CourseAssetService, db: any, created: any[], enabled: boolean, sessionEnabled: boolean, settings: Record<string,string>;
  beforeAll(async () => {
    directory = await mkdtemp(join(tmpdir(), 'lms-asset-test-'));
    created = []; enabled = true; sessionEnabled = true;
    db = {
      lesson: { findUnique: jest.fn(async ({ where }: any) => where.id === lessonId ? { id: lessonId, courseId, moduleId:'module', kind:'PRESENTATION', course:{status:'DRAFT'} } : null), findFirst: jest.fn(async ({ where }: any) => enabled && where.id === lessonId && where.courseId === courseId && where.course.enrollments.some.userId === userId ? { id: lessonId } : null) },
      session: { findFirst: jest.fn(async ({ where }: any) => sessionEnabled && where.id === sessionId && where.userId === userId ? { user: { id: userId, role: 'CUSTOMER_B2C', isActive: true } } : null) },
      courseAsset: {
        aggregate: jest.fn(async () => ({ _sum: { size: created.reduce((n,a) => n + a.size, 0) } })),
        count: jest.fn(async ({ where }: any) => created.filter(a => a.lessonId === where.lessonId).length),
        create: jest.fn(async ({ data }: any) => { const row = { ...data, isPublished:false, createdAt: new Date() }; created.push(row); const { storageKey, createdBy, isPublished, ...safe } = row; return safe; }),
        findMany: jest.fn(async ({ where }: any) => created.filter(a => a.lessonId === where.lessonId).map(({ storageKey, createdBy, ...safe }) => safe)),
        findFirst: jest.fn(async ({ where }: any) => enabled && where.lesson.courseId === courseId && where.lesson.course.enrollments.some.userId === userId ? created.find(a => a.id === where.id && a.lessonId === where.lessonId && a.isPublished) || null : null),
      },
      $executeRaw: jest.fn(async () => 1),
      $queryRaw: jest.fn(async () => [{ id:courseId }]),
      auditLog: { create: jest.fn(async () => ({})) },
      $transaction: jest.fn(async (fn: any) => fn(db)),
    };
    settings = { CRM_DRIVE_STORAGE_DIR: directory, PUBLIC_APP_URL: 'http://localhost:3001', NODE_ENV: 'production', LMS_ALLOW_INSECURE_LOCAL_MEDIA: 'true' };
    const config: any = { get: (name: string) => settings[name], getOrThrow: () => 'a-separate-fixture-secret-long-enough-for-tests' };
    service = new CourseAssetService(db, config, new JwtService());
    const app = express();
    app.post('/upload/:lesson', (req, res, next) => { void service.upload(req.params.lesson, author, req, async () => {}).then(v => res.json(v)).catch(next); });
    app.post('/ticket/:course/:lesson/:id', (req, res, next) => { const claims = { sub:userId, sid:sessionId, exp:Math.floor(Date.now()/1000)+3600 }; void service.ticket(claims,req.params.course,req.params.lesson,req.params.id,res).then(v => res.json(v)).catch(next); });
    app.get('/api/v1/lms/media/:id', (req, res, next) => { void service.media(req.params.id,req,res).catch(next); });
    app.use((err: any, _req: any, res: any, _next: any) => res.status(err.status || 500).json({ error: err.message }));
    server = await new Promise<any>(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
    base = `http://127.0.0.1:${server.address().port}`;
  });
  afterAll(async () => { if (server) await new Promise<void>((resolve,reject) => server.close((e: any) => e ? reject(e) : resolve())); await rm(directory, { recursive:true, force:true }); });
  it('accepts only supported signatures, bounded ranges and safe names', () => {
    expect(assetMime(pdf)).toBe('application/pdf'); expect(assetMime(Buffer.from('0000ftypisom'))).toBe('video/mp4'); expect(assetMime(Buffer.from([0x1a,0x45,0xdf,0xa3]))).toBe('video/webm'); expect(() => assetMime(Buffer.from('<html>'))).toThrow();
    expect(assetName(encodeURIComponent('../имя.pdf'))).toBe('.. имя.pdf'); expect(() => assetName('%')).toThrow();
    expect(parseRange('bytes=1-5',10)).toEqual({start:1,end:5}); expect(parseRange('bytes=-3',10)).toEqual({start:7,end:9}); expect(parseRange('bytes=6-',10)).toEqual({start:6,end:9});
    for (const range of ['bytes=10-','bytes=3-2','bytes=-0','bytes=0-1,3-5','bytes=99999999999999999-']) expect(() => parseRange(range,10)).toThrow();
  });
  it('streams upload to private storage and returns no storage identifier', async () => {
    const r = await fetch(`${base}/upload/${lessonId}`, { method:'POST', headers: { 'Content-Type':'application/octet-stream', 'X-File-Name':encodeURIComponent('Презентация.pdf') }, body:pdf });
    expect(r.status).toBe(200); const result = await r.json() as any; expect(result).toMatchObject({ lessonId, filename:'Презентация.pdf', mimeType:'application/pdf', size:pdf.length }); expect(result).not.toHaveProperty('storageKey'); expect(result).not.toHaveProperty('createdBy');
    expect(await readdir(join(directory,'course-assets'))).toEqual([result.id]);
    const bad = await fetch(`${base}/upload/${lessonId}`, { method:'POST', headers: { 'Content-Type':'application/octet-stream', 'X-File-Name':'bad.pdf' }, body:'<html>pretend PDF</html>' });
    expect(bad.status).toBe(400); expect(await readdir(join(directory,'course-assets'))).toEqual([result.id]);
  });
  it('cleans interrupted uploads and blocks a filename that cannot be decoded', async () => {
    const before = await readdir(join(directory, 'course-assets'));
    const partial: any = Readable.from([Buffer.from('%PDF-short')]);
    partial.headers = { 'content-type':'application/octet-stream', 'content-length':'200', 'x-file-name':'fixture.pdf' };
    await expect(service.upload(lessonId, author, partial, async () => {})).rejects.toThrow();
    expect(await readdir(join(directory, 'course-assets'))).toEqual(before);
  });
  it('issues a scoped HttpOnly cookie and validates every Range request', async () => {
    const asset = created[0]; asset.isPublished = true;
    const wrong = await fetch(`${base}/ticket/other/${lessonId}/${asset.id}`, { method:'POST' }); expect(wrong.status).toBe(404);
    const issued = await fetch(`${base}/ticket/${courseId}/${lessonId}/${asset.id}`, { method:'POST' }); const body = await issued.json() as any, cookie = issued.headers.get('set-cookie')!;
    expect(body).toEqual({ url:`/api/v1/lms/media/${asset.id}`, expiresIn:expect.any(Number) }); expect(cookie).toContain('HttpOnly'); expect(cookie).toContain('SameSite=Strict'); expect(cookie).toContain(`Path=${body.url}`); expect(body.url).not.toContain('token');
    const mediaToken = cookie.split(';')[0].split('=')[1];
    await expect(new JwtService().verifyAsync(mediaToken, { secret:'a-separate-fixture-secret-long-enough-for-tests' })).rejects.toThrow();
    const url = `${base}${body.url}`, headers = { Cookie:cookie.split(';')[0], Range:'bytes=0-4' };
    const part = await fetch(url, { headers }); expect(part.status).toBe(206); expect(part.headers.get('content-range')).toBe(`bytes 0-4/${pdf.length}`); expect(Buffer.from(await part.arrayBuffer())).toEqual(pdf.subarray(0,5)); expect(part.headers.get('cache-control')).toBe('private, no-store');
    const invalid = await fetch(url, { headers: { ...headers, Range:'bytes=1000-' } }); expect(invalid.status).toBe(416); expect(invalid.headers.get('content-range')).toBe(`bytes */${pdf.length}`);
    const head = await fetch(url, { method:'HEAD', headers }); expect(head.status).toBe(206); expect(head.headers.get('content-length')).toBe('5');
    enabled = false; expect((await fetch(url, { headers })).status).toBe(404); enabled = true;
    sessionEnabled = false; expect((await fetch(url, { headers })).status).toBe(401); sessionEnabled = true;
    expect((await fetch(`${base}/api/v1/lms/media/30000000-0000-4000-8000-000000000001`, { headers })).status).toBe(401);
  });
  it('allows HTTP only with explicit flag and loopback public URL; forwarded headers cannot override it', async () => {
    const asset = created[0], url = `${base}/ticket/${courseId}/${lessonId}/${asset.id}`;
    const local = await postWithHost(url, { Host:'localhost:3001' });
    expect(local.status).toBe(200); expect(local.cookie?.[0]).not.toMatch(/;\s*Secure/i);
    for (const publicUrl of ['http://192.168.1.110:3001','http://localhost.evil:3001','http://127.0.0.2:3001']) {
      settings.PUBLIC_APP_URL = publicUrl;
      const denied = await postWithHost(url, { Host:'localhost:3001', 'X-Forwarded-Host':'localhost:3001', 'X-Forwarded-Proto':'https' });
      expect(denied.status).toBe(503); expect(denied.cookie).toBeUndefined();
    }
    settings.PUBLIC_APP_URL = 'http://localhost:3001';
    settings.LMS_ALLOW_INSECURE_LOCAL_MEDIA = 'false';
    expect((await postWithHost(url, { Host:'localhost:3001' })).status).toBe(503);
    settings.PUBLIC_APP_URL = 'https://site.example'; settings.LMS_ALLOW_INSECURE_LOCAL_MEDIA = 'true';
    const https = await postWithHost(url, { Host:'localhost:3001' });
    expect(https.status).toBe(200); expect(https.cookie?.[0]).toMatch(/;\s*Secure/i);
  });
});
