import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { mkdir, readFile, unlink, writeFile } from 'fs/promises';
import { resolve } from 'path';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CrmReadAccess } from './read-access';
import { driveReadPermission, driveWhere, DriveReadPermission, DriveWritePermission } from './drive-access';
import { recordCrmChange } from './history';
import { DriveFolderDto, DriveListDto, DriveLocationDto, DriveUpdateDto, DRIVE_MAX_BYTES } from './drive.dto';

export const driveSelect = { id: true, name: true, kind: true, scope: true, ownerId: true, parentId: true, mime: true, size: true, restricted: true, deletedAt: true, createdAt: true, updatedAt: true } as const;
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
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService, private readonly policies: CrmReadAccess) {}
  private storageScope(actor: string, scope: string) { return scope === 'TEAM' ? { scope: 'TEAM' } : { scope: 'PERSONAL', ownerId: actor }; }
  private read<T>(operation: (db: Prisma.TransactionClient) => Promise<T>) {
    return this.prisma.$transaction(operation, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead, timeout: 15000 });
  }
  private async access(db: Prisma.TransactionClient, actor: string, permission: DriveReadPermission | DriveWritePermission, scope?: string) {
    const read = await this.policies.resolve(db, actor, driveReadPermission(permission));
    const write = permission.endsWith('.write') ? await this.policies.resolve(db, actor, permission) : undefined;
    return driveWhere(read, permission.startsWith('content_plan.') ? 'TEAM' : scope, write);
  }
  private async node(db: any, id: string, access: Prisma.CrmDriveNodeWhereInput, includeTrash = false) {
    const node = await db.crmDriveNode.findFirst({ where: { AND: [access, { id, ...(includeTrash ? {} : { deletedAt: null }) }] } });
    if (!node) throw new NotFoundException('Файл или папка не найдены либо недоступны');
    return node;
  }
  private async folder(db: any, id: string | null | undefined, access: Prisma.CrmDriveNodeWhereInput, scope: string) {
    if (!id) return null;
    const folder = await this.node(db, id, access);
    if (folder.kind !== 'FOLDER' || folder.scope !== scope) throw new BadRequestException('Выберите папку в том же диске');
    return folder;
  }
  // Serialize tree/uniqueness/quota decisions, including concurrent moves/restores.
  private async write<T>(operation: (db: any) => Promise<T>): Promise<T> {
    try {
      return await this.prisma.$transaction(async db => {
        // Department/task editors take the department lock first as well.
        await db.$executeRaw`SELECT pg_advisory_xact_lock(73422112)`;
        await db.$executeRaw`SELECT pg_advisory_xact_lock(73422109)`;
        return operation(db);
      }, { timeout: 15000 });
    } catch (error: any) {
      if (error.code === 'P2002') throw new ConflictException('В этой папке уже есть файл или папка с таким именем');
      throw error;
    }
  }
  private root() { return resolve(this.config.get<string>('CRM_DRIVE_STORAGE_DIR') || 'private-crm-files'); }
  private quota() { return 1024 * 1024 * 1024; }

  list(dto: DriveListDto, actor: string, permission: DriveReadPermission = 'crm.read') {
    return this.read(async db => {
    const scope = permission === 'content_plan.read' ? 'TEAM' : dto.scope || 'PERSONAL', access = await this.access(db, actor, permission, scope);
    const crumbs: any[] = [];
    if (dto.parentId && !dto.search && dto.view !== 'trash' && dto.view !== 'recent') {
      let folder = await this.folder(db, dto.parentId, access, scope);
      while (folder && crumbs.length < 100) {
        crumbs.unshift({ id: folder.id, name: folder.name });
        folder = folder.parentId ? await this.folder(db, folder.parentId, access, scope) : null;
      }
    }
    const where: any = { AND: [access], deletedAt: dto.view === 'trash' ? { not: null } : null };
    if (dto.view === 'trash') where.OR = [{ parentId: null }, { parent: { deletedAt: null } }];
    else if (!dto.search && dto.view !== 'recent') where.parentId = dto.parentId || null;
    if (dto.view === 'recent') where.kind = 'FILE';
    if (dto.search?.trim()) where.name = { contains: dto.search.trim(), mode: 'insensitive' };
    const [items, total, used] = await Promise.all([
      db.crmDriveNode.findMany({ where, select: driveSelect, orderBy: [{ kind: 'desc' }, { [dto.sort || 'name']: dto.direction || 'asc' }, { id: 'asc' }], skip: dto.offset || 0, take: 100 }),
      db.crmDriveNode.count({ where }),
      db.crmDriveNode.aggregate({ where: access, _sum: { size: true } }),
    ]);
    return { items, total, crumbs, used: used._sum.size || 0, usageScope: 'visible', quota: this.quota(), maxFileSize: DRIVE_MAX_BYTES };
    });
  }
  createFolder(dto: DriveFolderDto, actor: string) {
    return this.write(async db => {
      const access = await this.access(db, actor, 'crm.write', dto.scope);
      await this.folder(db, dto.parentId, access, dto.scope);
      return db.crmDriveNode.create({ data: { name: driveName(dto.name), kind: 'FOLDER', scope: dto.scope, ownerId: actor, parentId: dto.parentId || null }, select: driveSelect });
    });
  }
  private async storeUpload<T>(file: any, save: (data: { name: string; mime: string; storageKey: string; size: number }) => Promise<T>) {
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
      return await save({ name, mime, storageKey, size: file.buffer.length });
    } catch (error) { await unlink(path).catch(() => undefined); throw error; }
  }
  private async assertQuota(db: Prisma.TransactionClient, actor: string, scope: string, size: number) {
    // Enforce the real quota, but never return usage of invisible records.
    const used = await db.crmDriveNode.aggregate({ where: this.storageScope(actor, scope), _sum: { size: true } });
    if ((used._sum.size || 0) + size > this.quota()) throw new BadRequestException('Лимит диска — 1 ГиБ, включая корзину. Обратитесь к администратору.');
  }
  async upload(file: any, dto: DriveLocationDto, actor: string, permission: DriveWritePermission = 'crm.write') {
    const scope = permission === 'content_plan.write' ? 'TEAM' : dto.scope || 'PERSONAL';
    await this.read(async db => this.folder(db, dto.parentId, await this.access(db, actor, permission, scope), scope));
    return this.storeUpload(file, data => this.write(async db => {
      await this.folder(db, dto.parentId, await this.access(db, actor, permission, scope), scope);
      await this.assertQuota(db, actor, scope, data.size);
      return db.crmDriveNode.create({ data: { ...data, kind: 'FILE', scope, ownerId: actor, parentId: dto.parentId || null }, select: driveSelect });
    }));
  }
  // Card uploads have no intermediate public TEAM record, even if linking fails.
  async uploadAttachment(kind: 'task' | 'lead', id: string, file: any, actor: string, permission: DriveWritePermission = 'crm.write') {
    await this.read(db => this.attachmentParent(db, kind, id, actor, permission));
    return this.storeUpload(file, data => this.write(async db => {
      await this.attachmentParent(db, kind, id, actor, permission);
      await this.assertQuota(db, actor, 'TEAM', data.size);
      const node = await db.crmDriveNode.create({ data: { ...data, kind: 'FILE', scope: 'TEAM', restricted: true, ownerId: actor }, select: driveSelect });
      const result = kind === 'task'
        ? await db.crmTaskFile.create({ data: { taskId: id, nodeId: node.id }, include: { node: { select: driveSelect } } })
        : await db.crmLeadFile.create({ data: { leadId: id, nodeId: node.id }, include: { node: { select: driveSelect } } });
      await recordCrmChange(db, actor, kind === 'task' ? 'crm.task' : 'crm.lead', id, null, { file: node.name }, ['file'], 'Прикреплён файл');
      if (kind === 'task') await this.invalidatePublication(db, id);
      return result;
    }));
  }
  private async tree(db: Prisma.TransactionClient, root: { id: string; scope: string }) {
    const ids = new Set([root.id]);
    let frontier = [root.id];
    while (frontier.length) {
      const children = await db.crmDriveNode.findMany({ where: { scope: root.scope, parentId: { in: frontier }, deletedAt: null }, select: { id: true }, take: 10001 });
      frontier = children.map(row => row.id);
      if (frontier.some(id => ids.has(id)) || ids.size + frontier.length > 10000) throw new BadRequestException('Папка слишком большая или повреждена. Обратитесь к администратору.');
      frontier.forEach(id => ids.add(id));
    }
    return [...ids];
  }
  private async assertAll(db: Prisma.TransactionClient, selection: Prisma.CrmDriveNodeWhereInput, access: Prisma.CrmDriveNodeWhereInput) {
    if (await db.crmDriveNode.count({ where: { AND: [selection, { NOT: access }] } })) throw new NotFoundException('Операция недоступна: недостаточно прав на содержимое папки');
  }
  update(id: string, dto: DriveUpdateDto, actor: string) {
    return this.write(async db => {
      const access = await this.access(db, actor, 'crm.write');
      const node = await this.node(db, id, access);
      if (node.kind === 'FOLDER') await this.assertAll(db, { id: { in: await this.tree(db, node) } }, access);
      if (dto.parentId !== undefined) {
        let target = await this.folder(db, dto.parentId, access, node.scope);
        let depth = 0;
        while (target) {
          if (target.id === id) throw new BadRequestException('Нельзя переместить папку в саму себя или в её подпапку');
          if (++depth > 90) throw new BadRequestException('Слишком большая вложенность папок');
          target = target.parentId ? await this.folder(db, target.parentId, access, node.scope) : null;
        }
      }
      return db.crmDriveNode.update({ where: { id }, data: { name: dto.name === undefined ? undefined : driveName(dto.name), parentId: dto.parentId }, select: driveSelect });
    });
  }
  trash(id: string, actor: string) {
    return this.write(async db => {
      const access = await this.access(db, actor, 'crm.write');
      const node = await this.node(db, id, access), ids = await this.tree(db, node);
      await this.assertAll(db, { id: { in: ids } }, access);
      await db.crmDriveNode.updateMany({ where: { id: { in: ids } }, data: { deletedAt: new Date(), trashBatch: id } });
      return { ok: true };
    });
  }
  restore(id: string, actor: string) {
    return this.write(async db => {
      const access = await this.access(db, actor, 'crm.write');
      const node = await this.node(db, id, access, true);
      if (!node.deletedAt || node.trashBatch !== id) throw new BadRequestException('Восстановите родительскую папку из корзины');
      await this.folder(db, node.parentId, access, node.scope);
      const batch = { ...this.storageScope(actor, node.scope), trashBatch: id };
      await this.assertAll(db, batch, access);
      await db.crmDriveNode.updateMany({ where: batch, data: { deletedAt: null, trashBatch: null } });
      return { ok: true };
    });
  }
  async content(id: string, actor: string, permission: DriveReadPermission = 'crm.read') {
    const visible = () => this.read(async db => this.node(db, id, await this.access(db, actor, permission)));
    const node = await visible();
    if (node.kind !== 'FILE' || !/^[a-f0-9-]{36}$/.test(node.storageKey || '')) throw new NotFoundException('Файл не найден');
    let buffer: Buffer;
    try { buffer = await readFile(resolve(this.root(), node.storageKey)); }
    catch { throw new NotFoundException('Содержимое файла недоступно. Обратитесь к администратору.'); }
    const fresh = await visible(); // Access may have changed during disk I/O.
    if (fresh.storageKey !== node.storageKey) throw new NotFoundException('Содержимое файла изменилось. Повторите запрос.');
    return { name: fresh.name, mime: fresh.mime, buffer };
  }
  // A file ID or a generic crm.write grant never authorizes access to its parent.
  // Attachment access and the durable file policy must both authorize the actor.
  private async attachmentParent(db: Prisma.TransactionClient, kind: 'task' | 'lead', id: string, actor: string, permission: 'crm.read' | 'crm.write' | 'content_plan.read' | 'content_plan.write') {
    const reading = permission.endsWith('.read');
    const readPermission = permission.startsWith('content_plan.') ? 'content_plan.read' : 'crm.read';
    const read = await this.policies.resolve(db, actor, readPermission);
    const write = reading ? null : await this.policies.resolve(db, actor, permission);
    const parent = kind === 'task'
      ? await db.task.findFirst({ where: { AND: [{ id, status: { not: 'CANCELLED' } }, read.tasks(), ...(write ? [write.tasks()] : [])] }, select: { id: true } })
      : await db.lead.findFirst({ where: { AND: [{ id }, read.leads(), ...(write ? [write.leads('crm.write')] : [])] }, select: { id: true } });
    if (!parent) throw new NotFoundException(kind === 'task' ? 'Задача не найдена или недоступна' : 'Сделка не найдена или недоступна');
  }
  taskFiles(taskId: string, actor: string, permission: 'crm.read' | 'content_plan.read' = 'crm.read') {
    return this.prisma.$transaction(async db => {
      await this.attachmentParent(db, 'task', taskId, actor, permission);
      const access = await this.access(db, actor, permission, 'TEAM');
      return db.crmTaskFile.findMany({ where: { taskId, node: { AND: [access, { deletedAt: null, scope: 'TEAM' }] } }, include: { node: { select: driveSelect } }, orderBy: [{ createdAt: 'desc' }, { nodeId: 'asc' }] });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }
  link(taskId: string, nodeId: string, actor: string, permission: 'crm.write' | 'content_plan.write' = 'crm.write') {
    return this.write(async db => {
      await this.attachmentParent(db, 'task', taskId, actor, permission);
      const node = await this.node(db, nodeId, await this.access(db, actor, permission));
      if (node.kind !== 'FILE' || node.scope !== 'TEAM') throw new BadRequestException('К задачам можно прикреплять только файлы командного диска');
      const existing=await db.crmTaskFile.findUnique({where:{taskId_nodeId:{taskId,nodeId}}});
      const result=await db.crmTaskFile.upsert({ where: { taskId_nodeId: { taskId, nodeId } }, create: { taskId, nodeId }, update: {}, include: { node: { select: driveSelect } } });
      if(!existing){await recordCrmChange(db,actor,'crm.task',taskId,null,{file:node.name},['file'],'Прикреплён файл');await this.invalidatePublication(db,taskId);}
      return result;
    });
  }
  unlinkTask(taskId: string, nodeId: string, actor: string, permission: 'crm.write' | 'content_plan.write' = 'crm.write') {
    return this.write(async db => {
      await this.attachmentParent(db, 'task', taskId, actor, permission);
      const link = await db.crmTaskFile.findUnique({ where: { taskId_nodeId: { taskId, nodeId } }, include: { node: true } });
      if (link) {
        await this.node(db, nodeId, await this.access(db, actor, driveReadPermission(permission)), true);
        await db.crmTaskFile.deleteMany({ where: { taskId, nodeId } });
        await recordCrmChange(db, actor, 'crm.task', taskId, { file: link.node.name }, null, ['file'], 'Убрано вложение');
        await this.invalidatePublication(db, taskId);
      }
      return { ok: true };
    });
  }
  private async invalidatePublication(db:any,taskId:string){await db.$executeRaw`SELECT pg_advisory_xact_lock(73422111)`;await db.crmPublication.updateMany({where:{taskId,approvedAt:{not:null}},data:{approvedAt:null,approvedById:null,status:'REVIEW',version:{increment:1}}});}
  leadFiles(leadId: string, actor: string) {
    return this.prisma.$transaction(async db => {
      await this.attachmentParent(db, 'lead', leadId, actor, 'crm.read');
      const access = await this.access(db, actor, 'crm.read', 'TEAM');
      return db.crmLeadFile.findMany({ where: { leadId, node: { AND: [access, { scope: 'TEAM', deletedAt: null }] } }, include: { node: { select: driveSelect } }, orderBy: [{ createdAt: 'desc' }, { nodeId: 'asc' }] });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }
  linkLead(leadId: string, nodeId: string, actor: string) {
    return this.write(async db => {
      await this.attachmentParent(db, 'lead', leadId, actor, 'crm.write');
      const node = await this.node(db, nodeId, await this.access(db, actor, 'crm.write'));
      if (node.kind !== 'FILE' || node.scope !== 'TEAM') throw new BadRequestException('Прикрепите файл командного диска');
      const existing = await db.crmLeadFile.findUnique({ where: { leadId_nodeId: { leadId, nodeId } } });
      const result = await db.crmLeadFile.upsert({ where: { leadId_nodeId: { leadId, nodeId } }, create: { leadId, nodeId }, update: {}, include: { node: { select: driveSelect } } });
      if (!existing) await recordCrmChange(db, actor, 'crm.lead', leadId, null, { file: node.name }, ['file'], 'Прикреплён файл');
      return result;
    });
  }
  unlinkLead(leadId: string, nodeId: string, actor: string) {
    return this.write(async db => {
      await this.attachmentParent(db, 'lead', leadId, actor, 'crm.write');
      const link = await db.crmLeadFile.findUnique({ where: { leadId_nodeId: { leadId, nodeId } }, include: { node: true } });
      if (link) {
        await this.node(db, nodeId, await this.access(db, actor, 'crm.read'), true);
        await db.crmLeadFile.deleteMany({ where: { leadId, nodeId } });
        await recordCrmChange(db, actor, 'crm.lead', leadId, { file: link.node.name }, null, ['file'], 'Убрано вложение');
      }
      return { ok: true };
    });
  }
}
