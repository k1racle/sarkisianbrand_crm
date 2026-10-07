import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { IsInt, IsObject, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { CrmReadAccess, CrmReadPolicy } from './read-access';

export const DEFAULT_TASK_PIPELINE = '00000000-0000-4000-8000-000000000001';
export const taskColumnLabels = { BACKLOG: 'Бэклог', TODO: 'К выполнению', IN_PROGRESS: 'В работе', REVIEW: 'Проверка', OVERDUE: 'Просрочено', DONE: 'Готово' };
export class CreateTaskPipelineDto {
 @IsString() @MaxLength(100) name!: string;
 @IsOptional() @IsUUID() departmentId?: string | null;
 @IsObject() labels!: Record<string, string>;
}
export class UpdateTaskPipelineDto extends CreateTaskPipelineDto {
 @IsInt() @Min(1) expectedVersion!: number;
}
export function normalizeTaskPipeline(dto: CreateTaskPipelineDto) {
 const name = dto.name.trim();
 if (!name) throw new BadRequestException('Введите название воронки');
 const labels: Record<string, string> = {};
 if (!dto.labels || Object.keys(dto.labels).length !== Object.keys(taskColumnLabels).length) throw new BadRequestException('Укажите названия всех шести статусов');
 for (const key of Object.keys(taskColumnLabels)) {
  const value = dto.labels[key];
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 60) throw new BadRequestException('Название статуса должно содержать от 1 до 60 символов');
  labels[key] = value.trim();
 }
 if (new Set(Object.values(labels).map(value => value.toLocaleLowerCase('ru'))).size !== 6) throw new BadRequestException('Названия статусов должны различаться');
 return { name, labels, departmentId: dto.departmentId || null };
}
// A department organizes boards; it never grants access to the tasks in them.
export function taskPipelineScope(policy: CrmReadPolicy): Prisma.CrmTaskPipelineWhereInput {
 return policy.company(policy.permission) ? {} : { OR: [
  { departmentId: null }, { department: { members: { some: { id: policy.actorId } } } },
  { tasks: { some: policy.tasks() } },
 ] };
}
@Injectable()
export class CrmTaskPipelinesService {
 constructor(private readonly prisma: PrismaService, private readonly access: CrmReadAccess) {}
 list(actorId: string) {
  return this.prisma.$transaction(async db => {
   const policy = await this.access.resolve(db, actorId);
   const pipelines = await db.crmTaskPipeline.findMany({ where: taskPipelineScope(policy), include: { department: { select: { id: true, name: true, archivedAt: true } } }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] });
   const canManage = policy.company('crm.read') && policy.company('crm.write');
   const departments = canManage ? await db.crmDepartment.findMany({ where: { archivedAt: null }, select: { id: true, name: true }, orderBy: [{ name: 'asc' }, { id: 'asc' }] }) : [];
   return { pipelines, departments, canManage };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
 }
 save(actorId: string, dto: CreateTaskPipelineDto | UpdateTaskPipelineDto, id?: string) {
  const data = normalizeTaskPipeline(dto);
  return this.prisma.$transaction(async db => {
   await db.$executeRaw`SELECT pg_advisory_xact_lock(73422112)`;
   await db.$executeRaw`SELECT pg_advisory_xact_lock(73422110)`;
   const read = await this.access.resolve(db, actorId), write = await this.access.resolve(db, actorId, 'crm.write');
   if (!read.company('crm.read') || !write.company('crm.write')) throw new ForbiddenException('Настройка воронок требует доступа к CRM всей компании');
   if (data.departmentId && !await db.crmDepartment.findFirst({ where: { id: data.departmentId, archivedAt: null } })) throw new BadRequestException('Выберите действующий отдел');
   if (id === DEFAULT_TASK_PIPELINE && data.departmentId) throw new BadRequestException('Общая воронка должна оставаться доступной для всех отделов');
   const before = id ? await db.crmTaskPipeline.findUnique({ where: { id } }) : null;
   if (id && !before) throw new NotFoundException('Воронка не найдена');
   if (before && before.version !== (dto as UpdateTaskPipelineDto).expectedVersion) throw new ConflictException('Настройки уже изменены. Закройте окно, обновите страницу и повторите изменение.');
   const saved = id ? await db.crmTaskPipeline.update({ where: { id }, data: { ...data, version: { increment: 1 } } }) : await db.crmTaskPipeline.create({ data });
   await db.auditLog.create({ data: { actorId, resource: 'crm.task-pipeline', resourceId: saved.id, action: id ? 'Изменена воронка задач' : 'Создана воронка задач', payload: { before: before ? { name: before.name, departmentId: before.departmentId, labels: before.labels, version: before.version } : null, after: { ...data, version: saved.version } } } });
   return saved;
  });
 }
}
