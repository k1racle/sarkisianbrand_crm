import 'reflect-metadata';
import { ConfigService } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { resolve } from 'path';
import { MediaController, MediaFilesController } from './media.controller';
import { ListMediaDto, MEDIA_FILENAME_PATTERN, MEDIA_INTERNAL_ROLES, MEDIA_MAX_BYTES } from './media.dto';
import { inspectMediaRaster, mediaOriginalName, MediaService } from './media.service';

// No filesystem writes, real upload, DB, provider or server in these tests.
jest.mock('fs/promises', () => ({ mkdir: jest.fn(), open: jest.fn(), readdir: jest.fn(), realpath: jest.fn(), unlink: jest.fn(), writeFile: jest.fn() }));
const fs = jest.requireMock('fs/promises');
const FILENAME = 'c464fd25-652a-4a68-83be-5f46ae16ac08.png';
function png(width = 1, height = 1) {
  const buffer = Buffer.alloc(45); Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(buffer);
  buffer.writeUInt32BE(13, 8); buffer.write('IHDR', 12); buffer.writeUInt32BE(width, 16); buffer.writeUInt32BE(height, 20);
  buffer.write('IEND', buffer.length - 8); return buffer;
}
function jpeg() {
  return Buffer.from([0xff, 0xd8, 0xff, 0xc0, 0, 8, 8, 0, 1, 0, 2, 0, 0xff, 0xd9]);
}
function webp() {
  const buffer = Buffer.alloc(30); buffer.write('RIFF'); buffer.writeUInt32LE(22, 4); buffer.write('WEBP', 8);
  buffer.write('VP8X', 12); buffer.writeUInt32LE(10, 16); buffer.writeUIntLE(9, 24, 3); buffer.writeUIntLE(19, 27, 3); return buffer;
}
function avif() {
  const buffer = Buffer.alloc(32); buffer.writeUInt32BE(24); buffer.write('ftyp', 4); buffer.write('avif', 8);
  buffer.write('mif1', 16); buffer.write('avif', 20); buffer.writeUInt32BE(8, 24); buffer.write('mdat', 28); return buffer;
}
function fixture() {
  const assets: any[] = [];
  const tx: any = {
    mediaAsset: {
      findMany: jest.fn(async () => assets.map(asset => ({ ...asset }))), count: jest.fn(async () => assets.length),
      findUnique: jest.fn(async ({ where }: any) => assets.find(asset => asset.filename === where.filename) || null),
      create: jest.fn(async ({ data }: any) => { const asset = { id: `asset-${assets.length + 1}`, createdAt: new Date(), ...data }; assets.push(asset); return asset; }),
      upsert: jest.fn(async ({ create, where }: any) => { const previous = assets.find(asset => asset.filename === where.filename); if (previous) return previous;
        const asset = { id: `asset-${assets.length + 1}`, createdAt: new Date(), ...create }; assets.push(asset); return asset; }),
    },
    auditLog: { create: jest.fn(async () => ({ id: 'audit' })) },
  };
  const prisma: any = { ...tx, $transaction: jest.fn(async (fn: any) => fn(tx)) };
  const config = { get: jest.fn((key: string) => key === 'MEDIA_STORAGE_PATH' ? 'uploads/mock-media' : key === 'STOREFRONT_MEDIA_PATH' ? 'uploads/mock-storefront' : undefined) } as unknown as ConfigService;
  fs.mkdir.mockResolvedValue(undefined); fs.writeFile.mockResolvedValue(undefined); fs.unlink.mockResolvedValue(undefined);
  fs.realpath.mockImplementation(async (value: string) => resolve(value));
  fs.readdir.mockResolvedValue([]);
  const handle = { stat: jest.fn(async () => ({ isFile: () => true, size: 45 })), close: jest.fn(async () => undefined),
    read: jest.fn(async (target: Buffer, offset: number, length: number, position: number) => {
      const bytesRead = png().copy(target, offset, position, Math.min(position + length, png().length)); return { bytesRead };
    }) };
  fs.open.mockResolvedValue(handle);
  return { service: new MediaService(prisma, config), tx, prisma, config, assets, handle };
}
beforeEach(() => jest.resetAllMocks());

describe('media raster signatures and dimensions', () => {
  it.each([[png, 'image/png', 'png'], [jpeg, 'image/jpeg', 'jpg'], [webp, 'image/webp', 'webp'], [avif, 'image/avif', 'avif']])('recognizes allowed raster %s', (factory: any, mime, extension) => {
    expect(inspectMediaRaster(factory())).toMatchObject({ mime, extension });
  });
  it('extracts dimensions from PNG/JPEG/WebP without decoding pixels', () => {
    expect(inspectMediaRaster(png(20, 30))).toMatchObject({ width: 20, height: 30 });
    expect(inspectMediaRaster(jpeg())).toMatchObject({ width: 2, height: 1 });
    expect(inspectMediaRaster(webp())).toMatchObject({ width: 10, height: 20 });
    expect(inspectMediaRaster(avif())).toMatchObject({ width: null, height: null });
  });
  it.each([Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'), Buffer.from('GIF89a'), Buffer.from('%PDF-1.5'), Buffer.from('<html>'), Buffer.alloc(0), Buffer.from([0x89, 0x50, 0x4e, 0x47])])('rejects forbidden or truncated content %s', buffer => {
    expect(() => inspectMediaRaster(buffer)).toThrow();
  });
  it('rejects damaged PNG footer, WebP RIFF length, AVIF brands and dimension bombs', () => {
    const p = png(); p.write('FAKE', p.length - 8); expect(() => inspectMediaRaster(p)).toThrow();
    const w = webp(); w.writeUInt32LE(999, 4); expect(() => inspectMediaRaster(w)).toThrow();
    const a = avif(); a.write('heic', 8); a.write('heic', 20); expect(() => inspectMediaRaster(a)).toThrow();
    expect(() => inspectMediaRaster(png(100_001, 1))).toThrow(); expect(() => inspectMediaRaster(png(20_000, 20_000))).toThrow();
  });
  it('rejects spoofed high-bit ASCII signatures', () => {
    const buffer = avif(); buffer[4] |= 0x80; expect(() => inspectMediaRaster(buffer)).toThrow();
  });
  it('enforces exact 8 MiB bound', () => {
    const buffer = Buffer.alloc(MEDIA_MAX_BYTES); jpeg().subarray(0, 12).copy(buffer); buffer[buffer.length - 2] = 0xff; buffer[buffer.length - 1] = 0xd9;
    expect(inspectMediaRaster(buffer).mime).toBe('image/jpeg');
    expect(() => inspectMediaRaster(Buffer.alloc(MEDIA_MAX_BYTES + 1))).toThrow();
  });
  it('normalizes original display name, never uses it as storage filename', () => {
    expect(mediaOriginalName('C:\\fakepath\\folder\\pic.png')).toBe('pic.png');
    expect(mediaOriginalName('../../pic\u0000.png')).toBe('pic.png');
    expect(mediaOriginalName('a'.repeat(300))).toHaveLength(255);
  });
});

describe('shared media upload/list', () => {
  it('uploads with random generated filename, safe MIME and stable URL; actor audit contains no original name', async () => {
    const f = fixture(); const asset = await f.service.upload({ buffer: png(), mimetype: 'image/png', originalname: '../../my-pic.exe', size: 45 }, 'actor');
    expect(asset.filename).toMatch(MEDIA_FILENAME_PATTERN); expect(asset.filename).toMatch(/\.png$/); expect(asset.originalName).toBe('my-pic.exe');
    expect(asset.url).toBe(`/api/v1/media/files/${asset.filename}`);
    expect(fs.writeFile.mock.calls[0][2]).toEqual({ flag: 'wx', mode: 0o640 });
    expect(f.tx.mediaAsset.create.mock.calls[0][0].data.createdById).toBe('actor');
    expect(f.tx.auditLog.create.mock.calls[0][0].data).toMatchObject({ actorId: 'actor', payload: { mime: 'image/png', size: 45 } });
    expect(JSON.stringify(f.tx.auditLog.create.mock.calls)).not.toContain('my-pic.exe');
  });
  it.each(['image/jpeg', 'image/svg+xml', 'application/octet-stream'])('rejects declared MIME mismatch %s before writes', async mimetype => {
    const f = fixture(); await expect(f.service.upload({ buffer: png(), mimetype }, 'actor')).rejects.toThrow();
    expect(fs.writeFile).not.toHaveBeenCalled(); expect(f.tx.mediaAsset.create).not.toHaveBeenCalled();
  });
  it('rejects missing buffer/actor, dishonest size and oversized payloads before any writes', async () => {
    const f = fixture();
    await expect(f.service.upload(undefined as any, 'actor')).rejects.toThrow(); await expect(f.service.upload({ buffer: png(), mimetype: 'image/png' }, '')).rejects.toThrow();
    await expect(f.service.upload({ buffer: png(), mimetype: 'image/png', size: 44 }, 'actor')).rejects.toThrow();
    await expect(f.service.upload({ buffer: Buffer.alloc(MEDIA_MAX_BYTES + 1), mimetype: 'image/png' }, 'actor')).rejects.toThrow();
    expect(fs.mkdir).not.toHaveBeenCalled();
  });
  it('DB/audit failure cleans only newly written random file, never a directory or original', async () => {
    const f = fixture(); f.tx.auditLog.create.mockRejectedValue(new Error('sensitive error'));
    await expect(f.service.upload({ buffer: png(), mimetype: 'image/png' }, 'actor')).rejects.toThrow('Не удалось сохранить изображение');
    expect(fs.unlink).toHaveBeenCalledTimes(1);
    expect(fs.unlink.mock.calls[0][0]).toMatch(/mock-media[\\/][a-f0-9-]+\.png$/);
  });
  it('exclusive write failure does not delete a preexisting file', async () => {
    const f = fixture(); fs.writeFile.mockRejectedValue(Object.assign(new Error('exists'), { code: 'EEXIST' }));
    await expect(f.service.upload({ buffer: png(), mimetype: 'image/png' }, 'actor')).rejects.toThrow(); expect(fs.unlink).not.toHaveBeenCalled();
  });
  it('list/search is shared, paginated and read-only; returns no creator identity/path', async () => {
    const f = fixture(); f.assets.push({ id: 'a', filename: FILENAME, originalName: 'photo.png', mime: 'image/png', size: 45, width: 1, height: 1, createdById: 'someone-else', createdAt: new Date() });
    const response = await f.service.list({ q: ' photo ', page: 2, limit: 10 });
    expect(response.items[0]).not.toHaveProperty('createdById'); expect(response.total).toBe(1);
    expect(f.tx.mediaAsset.findMany.mock.calls[0][0]).toMatchObject({ where: { originalName: { contains: 'photo', mode: 'insensitive' } }, skip: 10, take: 10 });
    expect(fs.readdir).not.toHaveBeenCalled(); expect(fs.writeFile).not.toHaveBeenCalled(); expect(f.tx.mediaAsset.upsert).not.toHaveBeenCalled();
  });
});

describe('media public file safety', () => {
  const add = (f: ReturnType<typeof fixture>) => f.assets.push({ id: 'a', filename: FILENAME, mime: 'image/png', size: 45 });
  it('serves only DB-known raster of expected size and MIME, closes file handle', async () => {
    const f = fixture(); add(f); expect(await f.service.file(FILENAME)).toEqual({ buffer: png(), mime: 'image/png' });
    expect(f.handle.close).toHaveBeenCalled();
  });
  it.each(['../photo.png', 'https://evil/image.png', 'C:\\photo.png', 'photo.svg', 'photo.png', `${FILENAME}?x=1`])('rejects path/remote/non-generated filename %s before DB', async filename => {
    const f = fixture(); await expect(f.service.file(filename)).rejects.toThrow(); expect(f.tx.mediaAsset.findUnique).not.toHaveBeenCalled();
  });
  it('unknown UUID cannot read files; mismatch or missing disk file gives fixed 404', async () => {
    const f = fixture(); await expect(f.service.file(FILENAME)).rejects.toThrow('Изображение не найдено'); expect(fs.open).not.toHaveBeenCalled();
    add(f); f.assets[0].size = 44; await expect(f.service.file(FILENAME)).rejects.toThrow('Изображение не найдено');
    fs.open.mockRejectedValue(new Error('private disk path')); await expect(f.service.file(FILENAME)).rejects.toThrow('Изображение не найдено');
  });
  it('rejects symlink escape from resolved storage root before opening', async () => {
    const f = fixture(); add(f); fs.realpath.mockImplementation(async (value: string) => value.endsWith(FILENAME) ? resolve('uploads/outside/secret.png') : resolve(value));
    await expect(f.service.file(FILENAME)).rejects.toThrow(); expect(fs.open).not.toHaveBeenCalled();
  });
  it('rejects oversized file stat before allocating/reading content', async () => {
    const f = fixture(); add(f); f.handle.stat.mockResolvedValue({ isFile: () => true, size: MEDIA_MAX_BYTES + 1 });
    await expect(f.service.file(FILENAME)).rejects.toThrow(); expect(f.handle.read).not.toHaveBeenCalled(); expect(f.handle.close).toHaveBeenCalled();
  });
});

describe('explicit existing-upload import', () => {
  it('imports only top-level regular raster files and retries idempotently; originals untouched', async () => {
    const f = fixture(); fs.readdir.mockResolvedValue([{ name: 'prior.png', isFile: () => true }, { name: 'folder', isFile: () => false }, { name: 'link.png', isFile: () => false }, { name: 'evil.svg', isFile: () => true }]);
    expect(await f.service.importExisting('actor')).toEqual({ imported: 1, existing: 0, skipped: 3, failed: 0, limitReached: false });
    expect(await f.service.importExisting('actor')).toEqual({ imported: 0, existing: 1, skipped: 3, failed: 0, limitReached: false });
    expect(fs.writeFile).toHaveBeenCalledTimes(1); expect(fs.writeFile.mock.calls[0][0]).toContain('mock-media');
    expect(f.assets[0].filename).toMatch(MEDIA_FILENAME_PATTERN); expect(fs.unlink).not.toHaveBeenCalled();
  });
  it('supports null actor only as trusted local helper backfill', async () => {
    const f = fixture(); fs.readdir.mockResolvedValue([{ name: 'prior.png', isFile: () => true }]);
    expect((await f.service.importExisting(null)).imported).toBe(1); expect(f.tx.mediaAsset.upsert.mock.calls[0][0].create.createdById).toBeNull();
    await expect(f.service.importExisting(undefined as any)).rejects.toThrow();
  });
  it('missing existing-upload directory is harmless; no implicit scan on list', async () => {
    const f = fixture(); fs.readdir.mockRejectedValue(Object.assign(new Error('missing'), { code: 'ENOENT' }));
    expect((await f.service.importExisting('actor')).imported).toBe(0); expect(fs.writeFile).not.toHaveBeenCalled();
  });
  it('failed import metadata never deletes shared deterministic image or original and reports failure', async () => {
    const f = fixture(); fs.readdir.mockResolvedValue([{ name: 'prior.png', isFile: () => true }]); f.tx.mediaAsset.upsert.mockRejectedValue(new Error('DB down'));
    expect((await f.service.importExisting('actor')).failed).toBe(1); expect(fs.unlink).not.toHaveBeenCalled();
  });
});

describe('media controller roles, DENY-compatible permissions and headers', () => {
  it('protects browse/upload/import for internal roles, never customer accounts', () => {
    expect(Reflect.getMetadata('roles', MediaController)).toEqual(MEDIA_INTERNAL_ROLES);
    expect(MEDIA_INTERNAL_ROLES).not.toContain('CUSTOMER_B2C'); expect(MEDIA_INTERNAL_ROLES).not.toContain('CUSTOMER_B2B');
    expect(Reflect.getMetadata('permissions', MediaController.prototype.list)).toEqual(['media.read']);
    expect(Reflect.getMetadata('permissions', MediaController.prototype.upload)).toEqual(['media.write']);
    expect(Reflect.getMetadata('permissions', MediaController.prototype.importExisting)).toEqual(['media.write']);
    expect(Reflect.getMetadata('__guards__', MediaFilesController)).toBeUndefined();
  });
  it('forwards verified actor and serves public image with fixed MIME/nosniff/cache, no original name', async () => {
    const service = { upload: jest.fn(), importExisting: jest.fn(), file: jest.fn(async () => ({ buffer: png(), mime: 'image/png' })) };
    const controller = new MediaController(service as any), files = new MediaFilesController(service as any);
    const input: any = {}, req = { user: { sub: 'trusted-actor' } }, response: any = { setHeader: jest.fn(), send: jest.fn() };
    await controller.upload(input, req); await controller.importExisting(req); await files.file({ filename: FILENAME }, response);
    expect(service.upload).toHaveBeenCalledWith(input, 'trusted-actor'); expect(service.importExisting).toHaveBeenCalledWith('trusted-actor');
    expect(response.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff'); expect(response.setHeader).toHaveBeenCalledWith('Content-Type', 'image/png');
    expect(response.send).toHaveBeenCalledWith(png());
  });
  it('validates search/pagination and rejects numeric q despite implicit conversion', async () => {
    const good = plainToInstance(ListMediaDto, { q: ' image ', page: '2', limit: '20' }, { enableImplicitConversion: true }); expect(await validate(good)).toHaveLength(0);
    const bad = plainToInstance(ListMediaDto, { q: 123, page: '0', limit: '101' }, { enableImplicitConversion: true }); expect((await validate(bad)).length).toBeGreaterThan(0);
  });
});
