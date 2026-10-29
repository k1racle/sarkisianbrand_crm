import { randomUUID } from 'crypto';
import { mkdir, mkdtemp, readdir, rm, unlink, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { Readable } from 'stream';
import { PrismaClient } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { CourseAssetService } from './course-assets.service';
import { LmsService } from './lms.service';

const url = process.env.LMS_ASSET_TEST_DATABASE_URL || process.env.LMS_TEST_DATABASE_URL;
if (url) { const value = new URL(url); if (!['localhost','127.0.0.1'].includes(value.hostname) || ![['56436','/assets_fixture'],['55436','/assets_fixture'],['56432','/lms_fixture'],['55435','/lms_fixture']].some(([port,path]) => value.port === port && value.pathname === path)) throw new Error('LMS asset test requires an isolated local fixture database'); }
const run = url ? describe : describe.skip;

run('LMS private asset access with isolated PostgreSQL', () => {
  let db: PrismaClient, service: CourseAssetService, lms: LmsService, dir: string, userId: string, courseId: string, moduleId: string, lessonId: string, assetId: string, author: {sub:string;sid:string;exp:number};
  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'lms-asset-pg-')); db = new PrismaClient({ datasources: { db: { url } } }); await db.$connect();
    const user = await db.user.create({ data: { email: `${randomUUID()}@example.invalid`, password:'fixture' } }); userId = user.id;
    const session = await db.session.create({ data: { userId, refreshToken:randomUUID(), expiresAt:new Date(Date.now()+3600000) } });
    author = { sub:userId, sid:session.id, exp:Math.floor(Date.now()/1000)+3600 };
    const course = await db.course.create({ data: { titleRu:'Fixture', price:0, status:'DRAFT' } }); courseId = course.id;
    const module = await db.courseModule.create({ data: { courseId, title:'Fixture module' } }); moduleId = module.id;
    const lesson = await db.lesson.create({ data: { courseId, moduleId, title:'Fixture video', kind:'VIDEO', isPublished:false } }); lessonId = lesson.id;
    await db.courseTariff.create({ data: { courseId, title:'Fixture', price:200 } });
    await db.enrollment.create({ data: { userId, courseId, accessStatus:'ACTIVE' } });
    const config: any = { get: (name: string) => ({ CRM_DRIVE_STORAGE_DIR: dir, PUBLIC_APP_URL:'https://site.example', NODE_ENV:'production' } as any)[name], getOrThrow: () => 'fixture-signing-secret-not-for-production' };
    service = new CourseAssetService(db as any, config, new JwtService()); lms = new LmsService(db as any);
  });
  afterAll(async () => { if (db) { await db.courseAsset.deleteMany({ where: { lesson: { courseId } } }); await db.auditLog.deleteMany({where:{actorId:userId}}); await db.enrollment.deleteMany({ where: { userId } }); await db.lesson.deleteMany({ where: { courseId } }); await db.courseModule.deleteMany({ where: { courseId } }); await db.courseTariff.deleteMany({ where: { courseId } }); await db.course.deleteMany({ where: { id:courseId } }); await db.user.deleteMany({ where: { id:userId } }); await db.$disconnect(); } if (dir) await rm(dir, { recursive:true, force:true }); });
  it('requires a material before publishing, then accepts a private video without a public URL', async () => {
    await expect(lms.updateCourse(courseId, { status:'PUBLISHED' })).rejects.toThrow();
    const bytes = Buffer.from('0000ftypisom-fixture-video');
    const req: any = Readable.from([bytes]); req.headers = { 'content-type':'application/octet-stream', 'content-length':String(bytes.length), 'x-file-name':'video.mp4' };
    const uploaded = await service.upload(lessonId, author, req, async () => {}); assetId = uploaded.id;
    await expect(lms.myLesson(userId,courseId,lessonId)).rejects.toThrow();
    await expect(service.listStudent(userId,courseId,lessonId)).rejects.toThrow();
    await expect(lms.updateCourse(courseId, { status:'PUBLISHED' })).resolves.toMatchObject({ status:'PUBLISHED' });
    await expect(lms.updateLesson(lessonId, { isPreview:true })).rejects.toThrow();
    expect(await service.listStudent(userId, courseId, lessonId)).toEqual([expect.objectContaining({ id:assetId, mimeType:'video/mp4' })]);
  });
  it('permits uploads only in draft for matching video/PDF types and hides additions until republished', async () => {
    const bytes = Buffer.from('0000ftypisom-fixture-video');
    const request = () => { const r: any = Readable.from([bytes]); r.headers = { 'content-type':'application/octet-stream', 'content-length':String(bytes.length), 'x-file-name':'video.mp4' }; return r; };
    await expect(service.upload(lessonId,author,request(),async () => {})).rejects.toThrow(/черновике/);
    await lms.updateCourse(courseId,{status:'DRAFT'});
    const textLesson = await lms.createLesson(moduleId,{title:'Draft text',kind:'TEXT',content:'Fixture'});
    const liveLesson = await lms.createLesson(moduleId,{title:'Draft live',kind:'LIVE',content:'Fixture'});
    await expect(service.upload(textLesson.id,author,request(),async () => {})).rejects.toThrow(/видеоуроки/);
    await expect(service.upload(liveLesson.id,author,request(),async () => {})).rejects.toThrow(/видеоуроки/);
    await expect(lms.myLesson(userId,courseId,textLesson.id)).rejects.toThrow();
    const next = await service.upload(lessonId,author,request(),async () => {});
    expect(await service.listStudent(userId,courseId,lessonId)).toEqual([expect.objectContaining({ id:assetId })]);
    await lms.updateCourse(courseId,{status:'PUBLISHED'});
    expect(await service.listStudent(userId,courseId,lessonId)).toEqual(expect.arrayContaining([expect.objectContaining({id:next.id})]));
    await expect(lms.myLesson(userId,courseId,textLesson.id)).resolves.toMatchObject({id:textLesson.id});
  });
  it('rejects an upload if the course is published while its stream is in progress', async () => {
    await lms.updateCourse(courseId,{status:'DRAFT'});
    const bytes = Buffer.from('0000ftypisom-race-video'), req: any = new Readable({read(){}});
    req.headers = { 'content-type':'application/octet-stream', 'content-length':String(bytes.length), 'x-file-name':'race.mp4' };
    const pending = service.upload(lessonId,author,req,async () => {}); req.push(bytes);
    const folder = join(dir,'course-assets');
    for (let i=0;i<100 && !(await readdir(folder)).some(v => v.startsWith('.upload-'));i++) await new Promise(resolve => setTimeout(resolve,10));
    expect((await readdir(folder)).some(v => v.startsWith('.upload-'))).toBe(true);
    await lms.updateCourse(courseId,{status:'PUBLISHED'});
    req.push(null); await expect(pending).rejects.toThrow(/черновике/);
    expect((await readdir(folder)).some(v => v.startsWith('.upload-'))).toBe(false);
  });
  it('removes only unpublished draft assets, with permission checks, audit and idempotent retry', async () => {
    await lms.updateCourse(courseId,{status:'DRAFT'});
    await expect(service.remove(lessonId,assetId,author,async()=>{})).rejects.toThrow(/Опубликованный/);
    const bytes = Buffer.from('0000ftypisom-delete-video'), request:any = Readable.from([bytes]);
    request.headers = { 'content-type':'application/octet-stream', 'content-length':String(bytes.length), 'x-file-name':'sensitive-name.mp4' };
    const draft = await service.upload(lessonId,author,request,async()=>{});
    expect(draft).toMatchObject({isPublished:false,everPublished:false});
    await expect(service.remove(randomUUID(),draft.id,author,async()=>{})).rejects.toThrow(/не найден/);
    await expect(service.remove(lessonId,draft.id,author,async()=>{throw new Error('Доступ отозван')})).rejects.toThrow(/отозван/);
    expect(await db.courseAsset.findUnique({where:{id:draft.id}})).toMatchObject({pendingDelete:false,storageRemovedAt:null});
    expect(await service.remove(lessonId,draft.id,author,async()=>{})).toEqual({status:'deleted'});
    expect(await service.remove(lessonId,draft.id,author,async()=>{})).toEqual({status:'deleted'});
    expect(await service.listAdmin(lessonId)).not.toEqual(expect.arrayContaining([expect.objectContaining({id:draft.id})]));
    const tombstone = await db.courseAsset.findUniqueOrThrow({where:{id:draft.id}}); expect(tombstone.pendingDelete).toBe(true); expect(tombstone.filename).toBe(''); expect(tombstone.storageRemovedAt).toBeInstanceOf(Date);
    expect((await readdir(join(dir,'course-assets')))).not.toContain(draft.id);
    const audit = await db.auditLog.findMany({where:{action:'lms.asset.delete',resourceId:draft.id}}); expect(audit).toHaveLength(1); expect(JSON.stringify(audit[0].payload)).not.toContain('sensitive-name');
  });
  it('retains quota after filesystem cleanup failure and safely retries a pending tombstone', async () => {
    const bytes=Buffer.from('0000ftypisom-cleanup-video'), request:any=Readable.from([bytes]); request.headers={'content-type':'application/octet-stream','content-length':String(bytes.length),'x-file-name':'video.mp4'};
    const asset=await service.upload(lessonId,author,request,async()=>{}), path=join(dir,'course-assets',asset.id);
    await unlink(path); await mkdir(path); // Simulate a non-removable entry without touching any real data.
    expect(await service.remove(lessonId,asset.id,author,async()=>{})).toEqual({status:'cleanup_pending'});
    expect(await db.courseAsset.findUniqueOrThrow({where:{id:asset.id}})).toMatchObject({pendingDelete:true,storageRemovedAt:null});
    const totalBefore=await db.courseAsset.aggregate({where:{storageRemovedAt:null},_sum:{size:true}});
    await rm(path,{recursive:true}); await writeFile(path,bytes);
    expect(await service.remove(lessonId,asset.id,author,async()=>{})).toEqual({status:'deleted'});
    const totalAfter=await db.courseAsset.aggregate({where:{storageRemovedAt:null},_sum:{size:true}});
    expect(Number(totalBefore._sum.size)-Number(totalAfter._sum.size)).toBe(bytes.length);
  });
  it('serializes delete versus publication without deleting an ever-published file', async () => {
    const bytes=Buffer.from('0000ftypisom-race-delete'), request:any=Readable.from([bytes]); request.headers={'content-type':'application/octet-stream','content-length':String(bytes.length),'x-file-name':'video.mp4'};
    const asset=await service.upload(lessonId,author,request,async()=>{});
    const [deletion,publication]=await Promise.allSettled([service.remove(lessonId,asset.id,author,async()=>{}),lms.updateCourse(courseId,{status:'PUBLISHED'})]);
    expect(publication.status).toBe('fulfilled');
    const saved=await db.courseAsset.findUniqueOrThrow({where:{id:asset.id}});
    if (deletion.status==='fulfilled') expect(saved).toMatchObject({pendingDelete:true,isPublished:false,everPublished:false});
    else expect(saved).toMatchObject({pendingDelete:false,isPublished:true,everPublished:true});
    await lms.updateCourse(courseId,{status:'DRAFT'});
  });
  it('does not permit deletion of previously published files hidden by a lesson type change', async () => {
    await lms.updateLesson(lessonId,{kind:'TEXT',content:'Fixture'});
    await lms.updateCourse(courseId,{status:'PUBLISHED'});
    expect(await db.courseAsset.findUniqueOrThrow({where:{id:assetId}})).toMatchObject({isPublished:false,everPublished:true});
    await lms.updateCourse(courseId,{status:'DRAFT'});
    await expect(service.remove(lessonId,assetId,author,async()=>{})).rejects.toThrow(/Опубликованный/);
    await lms.updateLesson(lessonId,{kind:'VIDEO'});
  });
  it('never publishes a deleted asset or treats it as a complete lesson', async () => {
    const lesson=await lms.createLesson(moduleId,{title:'Draft presentation',kind:'PRESENTATION'});
    const bytes=Buffer.from('%PDF-fixture'), request:any=Readable.from([bytes]); request.headers={'content-type':'application/octet-stream','content-length':String(bytes.length),'x-file-name':'lesson.pdf'};
    const asset=await service.upload(lesson.id,author,request,async()=>{});
    expect(await service.remove(lesson.id,asset.id,author,async()=>{})).toEqual({status:'deleted'});
    await expect(lms.updateCourse(courseId,{status:'PUBLISHED'})).rejects.toThrow(/заполните/);
    expect(await db.courseAsset.findUniqueOrThrow({where:{id:asset.id}})).toMatchObject({pendingDelete:true,isPublished:false,everPublished:false});
  });
  it('does not save a file after the author loses rights or the session is revoked', async () => {
    await lms.updateCourse(courseId,{status:'DRAFT'});
    const bytes = Buffer.from('0000ftypisom-fixture'), request = () => { const r:any = Readable.from([bytes]); r.headers = { 'content-type':'application/octet-stream', 'content-length':String(bytes.length), 'x-file-name':'video.mp4' }; return r; };
    const before = await db.courseAsset.count({ where:{lessonId} });
    await expect(service.upload(lessonId,author,request(),async () => { throw new Error('Доступ отозван'); })).rejects.toThrow(/отозван/);
    await db.session.delete({where:{id:author.sid}});
    await expect(service.upload(lessonId,author,request(),async () => {})).rejects.toThrow();
    expect(await db.courseAsset.count({where:{lessonId}})).toBe(before);
    expect((await readdir(join(dir,'course-assets'))).some(v => v.startsWith('.upload-'))).toBe(false);
  });
  it('blocks other courses, users, revoked and expired enrollments, even for an existing asset', async () => {
    await expect(service.listStudent(userId, randomUUID(), lessonId)).rejects.toThrow();
    await expect(service.listStudent(randomUUID(), courseId, lessonId)).rejects.toThrow();
    await db.enrollment.update({ where:{ userId_courseId:{ userId,courseId } }, data:{ accessStatus:'REVOKED' } });
    await expect(service.listStudent(userId,courseId,lessonId)).rejects.toThrow();
    await db.enrollment.update({ where:{ userId_courseId:{ userId,courseId } }, data:{ accessStatus:'ACTIVE', accessExpiresAt:new Date(Date.now()-1000) } });
    await expect(service.listStudent(userId,courseId,lessonId)).rejects.toThrow();
  });
  it('sums quota correctly above signed 32-bit integer', async () => {
    const rows = Array.from({length:5},() => ({ lessonId, filename:'fixture', mimeType:'video/mp4', size:500000000, storageKey:randomUUID(), createdBy:userId }));
    await db.courseAsset.createMany({ data:rows });
    const result = await db.courseAsset.aggregate({ _sum:{ size:true } });
    expect(Number(result._sum.size)).toBeGreaterThan(2147483647);
  });
});
