import { BadRequestException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { createHash, randomUUID } from 'crypto';
import { mkdir, open, readdir, realpath, unlink, writeFile } from 'fs/promises';
import { basename, isAbsolute, relative, resolve, sep } from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { ListMediaDto, MEDIA_FILENAME_PATTERN, MEDIA_MAX_BYTES } from './media.dto';

export interface MediaRaster { mime: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/avif'; extension: 'jpg' | 'png' | 'webp' | 'avif'; width: number | null; height: number | null; }
export interface MediaUpload { buffer: Buffer; mimetype: string; originalname?: string; size?: number; }
export interface MediaAssetResponse { id: string; filename: string; originalName: string; mime: string; size: number; width: number | null; height: number | null; createdAt: Date; url: string; }

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
function dimensions(width: number, height: number) {
  if (!width || !height || width > 100_000 || height > 100_000 || width * height > 100_000_000) throw new BadRequestException('Некорректные или слишком большие размеры изображения');
  return { width, height };
}

/** Signature/metadata inspection only. Never decodes pixels, fetches URLs or trusts an extension. */
export function inspectMediaRaster(buffer: Buffer): MediaRaster {
  if (!Buffer.isBuffer(buffer) || !buffer.length || buffer.length > MEDIA_MAX_BYTES) throw new BadRequestException('Изображение должно быть не больше 8 МиБ');
  if (buffer.length >= 45 && buffer.subarray(0, 8).equals(PNG) && buffer.readUInt32BE(8) === 13 && buffer.toString('latin1', 12, 16) === 'IHDR' &&
    buffer.readUInt32BE(buffer.length - 12) === 0 && buffer.toString('latin1', buffer.length - 8, buffer.length - 4) === 'IEND') {
    return { mime: 'image/png', extension: 'png', ...dimensions(buffer.readUInt32BE(16), buffer.readUInt32BE(20)) };
  }
  if (buffer.length >= 8 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff && buffer[buffer.length - 2] === 0xff && buffer[buffer.length - 1] === 0xd9) {
    let offset = 2;
    while (offset + 4 <= buffer.length) {
      if (buffer[offset] !== 0xff) break;
      while (offset < buffer.length && buffer[offset] === 0xff) offset++;
      const marker = buffer[offset++];
      if (marker === 0xda || marker === 0xd9) break;
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      if (offset + 2 > buffer.length) break;
      const length = buffer.readUInt16BE(offset);
      if (length < 2 || offset + length > buffer.length) break;
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker) && length >= 8) {
        return { mime: 'image/jpeg', extension: 'jpg', ...dimensions(buffer.readUInt16BE(offset + 5), buffer.readUInt16BE(offset + 3)) };
      }
      offset += length;
    }
    return { mime: 'image/jpeg', extension: 'jpg', width: null, height: null };
  }
  if (buffer.length >= 20 && buffer.toString('latin1', 0, 4) === 'RIFF' && buffer.readUInt32LE(4) === buffer.length - 8 && buffer.toString('latin1', 8, 12) === 'WEBP') {
    const chunk = buffer.toString('latin1', 12, 16), length = buffer.readUInt32LE(16);
    if (length > buffer.length - 20) throw new BadRequestException('Повреждённое изображение WebP');
    if (chunk === 'VP8X' && length >= 10 && buffer.length >= 30) return { mime: 'image/webp', extension: 'webp', ...dimensions(buffer.readUIntLE(24, 3) + 1, buffer.readUIntLE(27, 3) + 1) };
    if (chunk === 'VP8L' && length >= 5 && buffer.length >= 25 && buffer[20] === 0x2f) {
      const bits = buffer.readUInt32LE(21);
      return { mime: 'image/webp', extension: 'webp', ...dimensions((bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1) };
    }
    if (chunk === 'VP8 ' && length >= 10 && buffer.length >= 30 && buffer.subarray(23, 26).equals(Buffer.from([0x9d, 0x01, 0x2a]))) {
      return { mime: 'image/webp', extension: 'webp', ...dimensions(buffer.readUInt16LE(26) & 0x3fff, buffer.readUInt16LE(28) & 0x3fff) };
    }
  }
  if (buffer.length >= 24 && buffer.toString('latin1', 4, 8) === 'ftyp') {
    const size = buffer.readUInt32BE(0);
    if (size >= 20 && size <= buffer.length && size % 4 === 0) {
      const brands = [buffer.toString('latin1', 8, 12)];
      for (let offset = 16; offset + 4 <= size; offset += 4) brands.push(buffer.toString('latin1', offset, offset + 4));
      if (brands.includes('avif') || brands.includes('avis')) return { mime: 'image/avif', extension: 'avif', width: null, height: null };
    }
  }
  throw new BadRequestException('Разрешены только изображения JPEG, PNG, WebP и AVIF');
}

export function mediaOriginalName(value?: string): string {
  return basename(String(value || 'Изображение').replace(/\\/g, '/')).replace(/[\x00-\x1f\x7f]/g, '').trim().slice(0, 255) || 'Изображение';
}

export function mediaAssetView(asset: any): MediaAssetResponse {
  return { id: asset.id, filename: asset.filename, originalName: asset.originalName, mime: asset.mime, size: asset.size,
    width: asset.width ?? null, height: asset.height ?? null, createdAt: asset.createdAt, url: `/api/v1/media/files/${asset.filename}` };
}

// Deterministic import filename makes explicit retries idempotent without extra schema/source-path data.
function importedFilename(name: string, buffer: Buffer, extension: string) {
  const hash = createHash('sha256').update('sarkisian-local-media-import-v1\0').update(name).update('\0').update(buffer).digest();
  hash[6] = (hash[6] & 0x0f) | 0x50; hash[8] = (hash[8] & 0x3f) | 0x80;
  const hex = hash.subarray(0, 16).toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}.${extension}`;
}

@Injectable()
export class MediaService {
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService) {}
  private directory() { return resolve(process.cwd(), this.config.get<string>('MEDIA_STORAGE_PATH') || 'uploads/media'); }
  private sourceDirectory() { return resolve(process.cwd(), this.config.get<string>('STOREFRONT_MEDIA_PATH') || 'uploads/storefront'); }

  private async readLocal(directory: string, filename: string): Promise<Buffer> {
    if (!filename || basename(filename) !== filename || /[\\\x00]/.test(filename)) throw new NotFoundException('Изображение не найдено');
    const actualDirectory = await realpath(directory), target = await realpath(resolve(directory, filename));
    const inside = relative(actualDirectory, target);
    if (!inside || isAbsolute(inside) || inside === '..' || inside.startsWith(`..${sep}`) || inside.includes(sep)) throw new NotFoundException('Изображение не найдено');
    const handle = await open(target, 'r');
    try {
      const stat = await handle.stat();
      if (!stat.isFile() || stat.size < 1 || stat.size > MEDIA_MAX_BYTES) throw new NotFoundException('Изображение не найдено');
      const buffer = Buffer.alloc(stat.size + 1); let offset = 0;
      while (offset < buffer.length) {
        const { bytesRead } = await handle.read(buffer, offset, buffer.length - offset, offset);
        if (!bytesRead) break; offset += bytesRead;
      }
      if (offset !== stat.size) throw new NotFoundException('Изображение изменилось во время чтения');
      return buffer.subarray(0, offset);
    } finally { await handle.close(); }
  }

  async list(query: ListMediaDto = {}) {
    const page = query.page ?? 1, limit = query.limit ?? 30;
    const where: Prisma.MediaAssetWhereInput = query.q?.trim() ? { originalName: { contains: query.q.trim(), mode: 'insensitive' } } : {};
    return this.prisma.$transaction(async tx => ({ items: (await tx.mediaAsset.findMany({ where, skip: (page - 1) * limit, take: limit,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }] })).map(mediaAssetView), total: await tx.mediaAsset.count({ where }), page, limit }),
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }

  async upload(file: MediaUpload, actorId: string): Promise<MediaAssetResponse> {
    if (!actorId) throw new BadRequestException('Не определён автор загрузки');
    if (!file || !Buffer.isBuffer(file.buffer)) throw new BadRequestException('Выберите изображение');
    const raster = inspectMediaRaster(file.buffer);
    if (!allowed.includes(file.mimetype) || file.mimetype !== raster.mime || (file.size !== undefined && file.size !== file.buffer.length)) throw new BadRequestException('Тип файла не соответствует изображению');
    return this.persist(file.buffer, raster, mediaOriginalName(file.originalname), actorId, `${randomUUID()}.${raster.extension}`, false);
  }

  private async persist(buffer: Buffer, raster: MediaRaster, originalName: string, actorId: string | null, filename: string, importing: boolean): Promise<MediaAssetResponse> {
    const directory = this.directory(), path = resolve(directory, filename); let created = false;
    try {
      await mkdir(directory, { recursive: true });
      try { await writeFile(path, buffer, { flag: 'wx', mode: 0o640 }); created = true; }
      catch (error) {
        if (!importing || (error as any)?.code !== 'EEXIST') throw error;
        const previous = await this.readLocal(directory, filename);
        if (!previous.equals(buffer)) throw new Error('file mismatch');
      }
      return await this.prisma.$transaction(async tx => {
        const data = { filename, originalName, mime: raster.mime, size: buffer.length, width: raster.width, height: raster.height, createdById: actorId };
        const asset = importing ? await tx.mediaAsset.upsert({ where: { filename }, create: data, update: {} }) : await tx.mediaAsset.create({ data });
        await tx.auditLog.create({ data: { actorId, action: importing ? 'media.import' : 'media.upload', resource: 'media', resourceId: asset.id,
          payload: { mime: raster.mime, size: buffer.length } } });
        return mediaAssetView(asset);
      });
    } catch {
      // Import retries share deterministic paths: preserve them on DB failure to avoid deleting a
      // concurrently registered image; next explicit import safely retries metadata. Originals untouched.
      if (created && !importing) try { await unlink(path); } catch { /* no path/PII/error logging */ }
      throw new ServiceUnavailableException('Не удалось сохранить изображение');
    }
  }

  async file(filename: string): Promise<{ buffer: Buffer; mime: string }> {
    if (!MEDIA_FILENAME_PATTERN.test(filename)) throw new NotFoundException('Изображение не найдено');
    const asset = await this.prisma.mediaAsset.findUnique({ where: { filename } });
    if (!asset || !allowed.includes(asset.mime)) throw new NotFoundException('Изображение не найдено');
    try {
      const buffer = await this.readLocal(this.directory(), filename), raster = inspectMediaRaster(buffer);
      if (raster.mime !== asset.mime || buffer.length !== asset.size) throw new NotFoundException('Изображение не найдено');
      return { buffer, mime: raster.mime };
    } catch { throw new NotFoundException('Изображение не найдено'); }
  }

  async importExisting(actorId: string | null) {
    // null is for trusted LOCAL parent backfill only; HTTP always passes verified JWT actor.
    if (actorId !== null && !actorId) throw new BadRequestException('Не определён автор импорта');
    const result = { imported: 0, existing: 0, skipped: 0, failed: 0, limitReached: false };
    let entries;
    try { entries = await readdir(this.sourceDirectory(), { withFileTypes: true }); }
    catch (error) { if ((error as any)?.code === 'ENOENT') return result; throw new ServiceUnavailableException('Каталог существующих изображений недоступен'); }
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (!entry.isFile() || !/\.(?:jpe?g|png|webp|avif)$/i.test(entry.name)) { result.skipped++; continue; }
      if (result.imported >= 200) { result.limitReached = true; break; }
      let buffer: Buffer, raster: MediaRaster;
      try { buffer = await this.readLocal(this.sourceDirectory(), entry.name); raster = inspectMediaRaster(buffer); }
      catch { result.skipped++; continue; }
      const filename = importedFilename(entry.name, buffer, raster.extension);
      if (await this.prisma.mediaAsset.findUnique({ where: { filename } })) { result.existing++; continue; }
      try { await this.persist(buffer, raster, mediaOriginalName(entry.name), actorId, filename, true); result.imported++; }
      catch { result.failed++; }
    }
    return result;
  }
}
