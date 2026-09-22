import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { mkdir, readFile, unlink, writeFile } from 'fs/promises';
import { resolve } from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { recordCrmChange } from './history';
import { DriveFolderDto, DriveListDto, DriveLocationDto, DriveUpdateDto, DRIVE_MAX_BYTES } from './drive.dto';

export const driveSelect = { id: true, name: true, kind: true, scope: true, ownerId: true, parentId: true, mime: true, size: true, deletedAt: true, createdAt: true, updatedAt: true } as const;
export function driveName(value: string) {
  const name = String(value || '').normalize('NFC').trim();
  if (!name || name.length > 180 || /[\x00-\x1f\x7f/\\<>:"|?*]/.test(name) || /^\.+$/.test(name)) throw new BadRequestException('Название: от 1 до 180 символов, без слешей и специальных символов');
  return name;
}
export function driveMime(name: string, buffer: Buffer) {
  const ext = name.split('.').pop()?.toLowerCase();
  if (!ext || !['png','jpg','jpeg','webp','pdf','txt','csv','md','doc','docx','xls','xlsx','ppt','pptx','zip','mp4','mp3','mov'].includes(ext)) throw new BadRequestException('Поддерживаются изображения, PDF, текст, документы Office, ZIP, MP3, MP4 и MOV. Исполняемые файлы, HTML и SVG запрещены.');
  if (['png','jpg','jpeg','webp'].includes(ext)) {
    if (ext === 'png' && buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return 'image/png';
    if (['jpg','jpeg'].includes(ext) && buffer.subarray(0, 3).equals(Buffer.from([255,216,255]))) return 'image/jpeg';
    if (ext === 'webp' && buffer.toString('ascii',0,4) === 'RIFF' && buffer.toString('ascii',8,12) === 'WEBP') return 'image/webp';
    throw new BadRequestException('Содержимое изображения не соответствует расширению');
  }
  if (ext === 'pdf') {
    if (buffer.toString('ascii', 0, 5) !== '%PDF-') throw new BadRequestException('Некорректный PDF');
    return 'application/pdf';
  }
  if (['txt','csv','md'].includes(ext)) return 'text/plain';
  // No active office/archive/media content is embedded in the origin of the CRM.
  return 'application/octet-stream';
}

@Injectable()
export class CrmDriveService {
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService) {}
  private access(actor: string, scope: string) { return scope === 'TEAM' ? { scope: 'TEAM' } : { scope: 'PERSONAL', ownerId: actor }; }
  private async node(db: any, id: string, actor: string, includeTrash = false) {
    const node = await db.crmDriveNode.findFirst({ where: { id, ...(includeTrash ? {} : { deletedAt: null }), OR: [{ scope: 'TEAM' }, { scope: 'PERSONAL', ownerId: actor }] } });
    if (!node) throw new NotFoundException('Файл или папка не найдены либо недоступны');
    return node;
  }
  private async folder(db: any, id: string | null | undefined, actor: string, scope: string) {
    if (!id) return null;
    const folder = await this.node(db, id, actor);
    if (folder.kind !== 'FOLDER' || folder.scope !== scope) throw new BadRequestException('Выберите папку в том же диске');
    return folder;
  }
  // Serialize tree/uniqueness/quota decisions, including concurrent moves/restores.
  private async write<T>(operation: (db: any) => Promise<T>): Promise<T> {
    try {
      return await this.prisma.$transaction(async db => {
        await db.$executeRaw`SELECT pg_advisory_xact_lock(73422109)`;
        return operation(db);
      });
    } catch (error: any) {
      if (error.code === 'P2002') throw new ConflictException('В этой папке уже есть файл или папка с таким именем');
      throw error;
    }
  }
  private root() { return resolve(this.config.get<string>('CRM_DRIVE_STORAGE_DIR') || 'private-crm-files'); }
  private quota() { return 1024 * 1024 * 1024; }

  async list(dto: DriveListDto, actor: string) {
    const scope = dto.scope || 'PERSONAL', access = this.access(actor, scope);
    const crumbs: any[] = [];
    if (dto.parentId && !dto.search && dto.view !== 'trash' && dto.view !== 'recent') {
      let folder = await this.folder(this.prisma, dto.parentId, actor, scope);
      while (folder && crumbs.length < 100) {
        crumbs.unshift({ id: folder.id, name: folder.name });
        folder = folder.parentId ? await this.folder(this.prisma, folder.parentId, actor, scope) : null;
      }
    }
    const where: any = { ...access, deletedAt: dto.view === 'trash' ? { not: null } : null };
    if (dto.view === 'trash') where.OR = [{ parentId: null }, { parent: { deletedAt: null } }];
    else if (!dto.search && dto.view !== 'recent') where.parentId = dto.parentId || null;
    if (dto.view === 'recent') where.kind = 'FILE';
    if (dto.search?.trim()) where.name = { contains: dto.search.trim(), mode: 'insensitive' };
    const [items, total, used] = await Promise.all([
      this.prisma.crmDriveNode.findMany({ where, select: driveSelect, orderBy: [{ kind: 'desc' }, { [dto.sort || 'name']: dto.direction || 'asc' }, { id: 'asc' }], skip: dto.offset || 0, take: 100 }),
      this.prisma.crmDriveNode.count({ where }),
      this.prisma.crmDriveNode.aggregate({ where: access, _sum: { size: true } }),
    ]);
    return { items, total, crumbs, used: used._sum.size || 0, quota: this.quota(), maxFileSize: DRIVE_MAX_BYTES };
  }
  createFolder(dto: DriveFolderDto, actor: string) {
    return this.write(async db => {
      await this.folder(db, dto.parentId, actor, dto.scope);
      return db.crmDriveNode.create({ data: { name: driveName(dto.name), kind: 'FOLDER', scope: dto.scope, ownerId: actor, parentId: dto.parentId || null }, select: driveSelect });
    });
  }
  async upload(file: any, dto: DriveLocationDto, actor: string) {
    if (!Buffer.isBuffer(file?.buffer) || !file.buffer.length || file.buffer.length > DRIVE_MAX_BYTES) throw new BadRequestException('Выберите непустой файл до 30 МиБ');
    // Browsers send UTF-8 multipart filenames; Multer exposes them as latin1.
    const raw = String(file.originalname || 'Файл');
    const decoded = Buffer.from(raw, 'latin1').toString('utf8');
    const name = driveName(decoded.includes('\ufffd') || /[^\u0000-\u00ff]/.test(raw) ? raw : decoded);
    const mime = driveMime(name, file.buffer), storageKey = randomUUID();
    await mkdir(this.root(), { recursive: true });
    const path = resolve(this.root(), storageKey);
    await writeFile(path, file.buffer, { flag: 'wx', mode: 0o600 });
    try {
      return await this.write(async db => {
        await this.folder(db, dto.parentId, actor, dto.scope);
        const used = await db.crmDriveNode.aggregate({ where: this.access(actor, dto.scope), _sum: { size: true } });
        if ((used._sum.size || 0) + file.buffer.length > this.quota()) throw new BadRequestException('Лимит диска — 1 ГиБ, включая корзину. Обратитесь к администратору.');
        return db.crmDriveNode.create({ data: { name, kind: 'FILE', scope: dto.scope, ownerId: actor, parentId: dto.parentId || null, storageKey, mime, size: file.buffer.length }, select: driveSelect });
      });
    } catch (error) { await unlink(path).catch(() => undefined); throw error; }
  }
  update(id: string, dto: DriveUpdateDto, actor: string) {
    return this.write(async db => {
      const node = await this.node(db, id, actor);
      if (dto.parentId !== undefined) {
        let target = await this.folder(db, dto.parentId, actor, node.scope);
        let depth = 0;
        while (target) {
          if (target.id === id) throw new BadRequestException('Нельзя переместить папку в саму себя или в её подпапку');
          if (++depth > 90) throw new BadRequestException('Слишком большая вложенность папок');
          target = target.parentId ? await this.folder(db, target.parentId, actor, node.scope) : null;
        }
      }
      return db.crmDriveNode.update({ where: { id }, data: { name: dto.name === undefined ? undefined : driveName(dto.name), parentId: dto.parentId }, select: driveSelect });
    });
  }
  trash(id: string, actor: string) {
    return this.write(async db => {
      const node = await this.node(db, id, actor), ids = [id];
      let frontier = [id];
      while (frontier.length) {
        const children = await db.crmDriveNode.findMany({ where: { ...this.access(actor, node.scope), parentId: { in: frontier }, deletedAt: null }, select: { id: true } });
        frontier = children.map((x: any) => x.id); ids.push(...frontier);
      }
      await db.crmDriveNode.updateMany({ where: { id: { in: ids } }, data: { deletedAt: new Date(), trashBatch: id } });
      return { ok: true };
    });
  }
  restore(id: string, actor: string) {
    return this.write(async db => {
      const node = await this.node(db, id, actor, true);
      if (!node.deletedAt || node.trashBatch !== id) throw new BadRequestException('Восстановите родительскую папку из корзины');
      await this.folder(db, node.parentId, actor, node.scope);
      await db.crmDriveNode.updateMany({ where: { ...this.access(actor, node.scope), trashBatch: id }, data: { deletedAt: null, trashBatch: null } });
      return { ok: true };
    });
  }
  async content(id: string, actor: string) {
    const node = await this.node(this.prisma, id, actor);
    if (node.kind !== 'FILE' || !/^[a-f0-9-]{36}$/.test(node.storageKey || '')) throw new NotFoundException('Файл не найден');
    try { return { name: node.name, mime: node.mime, buffer: await readFile(resolve(this.root(), node.storageKey)) }; }
    catch { throw new NotFoundException('Содержимое файла недоступно. Обратитесь к администратору.'); }
  }
  async taskFiles(taskId: string) {
    await this.assertTask(this.prisma, taskId);
    return this.prisma.crmTaskFile.findMany({ where: { taskId, node: { deletedAt: null, scope: 'TEAM' } }, include: { node: { select: driveSelect } }, orderBy: { createdAt: 'desc' } });
  }
  async assertTask(db: any, id: string) {
    if (!await db.task.findFirst({ where: { id, status: { not: 'CANCELLED' } }, select: { id: true } })) throw new NotFoundException('Задача не найдена');
  }
  link(taskId: string, nodeId: string, actor: string) {
    return this.write(async db => {
      await this.assertTask(db, taskId);
      const node = await this.node(db, nodeId, actor);
      if (node.kind !== 'FILE' || node.scope !== 'TEAM') throw new BadRequestException('К задачам можно прикреплять только файлы командного диска');
      const existing=await db.crmTaskFile.findUnique({where:{taskId_nodeId:{taskId,nodeId}}});
      const result=await db.crmTaskFile.upsert({ where: { taskId_nodeId: { taskId, nodeId } }, create: { taskId, nodeId }, update: {}, include: { node: { select: driveSelect } } });
      if(!existing){await recordCrmChange(db,actor,'crm.task',taskId,null,{file:node.name},['file'],'Прикреплён файл');await this.invalidatePublication(db,taskId);}
      return result;
    });
  }
  async unlinkTask(taskId: string, nodeId: string, actor?:string) {
    return this.write(async db=>{await this.assertTask(db,taskId);const link=await db.crmTaskFile.findUnique({where:{taskId_nodeId:{taskId,nodeId}},include:{node:true}});await db.crmTaskFile.deleteMany({where:{taskId,nodeId}});if(link){await recordCrmChange(db,actor,'crm.task',taskId,{file:link.node.name},null,['file'],'Убрано вложение');await this.invalidatePublication(db,taskId);}return {ok:true};});
  }
  private async invalidatePublication(db:any,taskId:string){await db.$executeRaw`SELECT pg_advisory_xact_lock(73422111)`;await db.crmPublication.updateMany({where:{taskId,approvedAt:{not:null}},data:{approvedAt:null,approvedById:null,status:'REVIEW',version:{increment:1}}});}
  private async assertLead(db:any,id:string){if(!await db.lead.findUnique({where:{id},select:{id:true}}))throw new NotFoundException('Сделка не найдена');}
  async leadFiles(leadId:string){await this.assertLead(this.prisma,leadId);return this.prisma.crmLeadFile.findMany({where:{leadId,node:{scope:'TEAM',deletedAt:null}},include:{node:{select:driveSelect}},orderBy:{createdAt:'desc'}});}
  linkLead(leadId:string,nodeId:string,actor:string){return this.write(async db=>{await this.assertLead(db,leadId);const node=await this.node(db,nodeId,actor);if(node.kind!=='FILE'||node.scope!=='TEAM')throw new BadRequestException('Прикрепите файл командного диска');const existing=await db.crmLeadFile.findUnique({where:{leadId_nodeId:{leadId,nodeId}}});const result=await db.crmLeadFile.upsert({where:{leadId_nodeId:{leadId,nodeId}},create:{leadId,nodeId},update:{},include:{node:{select:driveSelect}}});if(!existing)await recordCrmChange(db,actor,'crm.lead',leadId,null,{file:node.name},['file'],'Прикреплён файл');return result;});}
  unlinkLead(leadId:string,nodeId:string,actor:string){return this.write(async db=>{await this.assertLead(db,leadId);const link=await db.crmLeadFile.findUnique({where:{leadId_nodeId:{leadId,nodeId}},include:{node:true}});await db.crmLeadFile.deleteMany({where:{leadId,nodeId}});if(link)await recordCrmChange(db,actor,'crm.lead',leadId,{file:link.node.name},null,['file'],'Убрано вложение');return {ok:true};});}
}
