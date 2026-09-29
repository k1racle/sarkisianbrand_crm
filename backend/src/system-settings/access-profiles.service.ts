import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { accessScopes, resolveProfileScopes } from '../auth/access-scope-policy';
import { internalWorkspaceRoles, workspaceRoleCatalog } from '../auth/workspace-role-catalog';
import { AccessProfileQueryDto, CreateAccessProfileDto, PreviewAccessProfilesDto, UpdateAccessProfileDto } from './dto/access-profile.dto';

const profileInclude = { grants: { include: { permission: true, departments: { include: { department: { select: { id: true, name: true, archivedAt: true } } } } }, orderBy: { permission: { key: 'asc' as const } } } } as const;
const rollout = { assignmentReady: false, mode: 'DRAFT_ONLY', message: 'Это проекты ролей. Они не меняют текущие права сотрудников. Назначение станет доступно после подключения и проверки серверных ограничений во всех рабочих разделах.' } as const;
const normalizeName = (name: string) => name.normalize('NFKC').trim().replace(/\s+/g, ' ');

@Injectable()
export class AccessProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  private async write<T>(fn: (db: Prisma.TransactionClient) => Promise<T>) {
    try {
      return await this.prisma.$transaction(async db => {
        // Match department lock order; an archived department cannot slip into a saved grant.
        await db.$executeRaw`SELECT pg_advisory_xact_lock(73422112)`;
        await db.$executeRaw`SELECT pg_advisory_xact_lock(73422113)`;
        return fn(db);
      });
    } catch (error: any) {
      if (error?.code === 'P2002') throw new ConflictException('Профиль с таким названием уже существует, возможно, в архиве.');
      throw error;
    }
  }

  async catalog() {
    const [permissions, departments, legacyRoles] = await this.prisma.$transaction([
      this.prisma.permission.findMany({ select: { key: true, resource: true, action: true, description: true }, orderBy: [{ resource: 'asc' }, { action: 'asc' }] }),
      this.prisma.crmDepartment.findMany({ where: { archivedAt: null }, select: { id: true, name: true, parentId: true }, orderBy: { name: 'asc' } }),
      this.prisma.rolePermission.findMany({ select: { role: true, permission: { select: { key: true } } } }),
    ]);
    const templates: Array<{ id: string; name: string; description: string; permissionKeys: string[] }> = workspaceRoleCatalog.map(role => ({ id: role.id, name: role.label, description: role.description,
      permissionKeys: legacyRoles.filter(grant => grant.role === role.id).map(grant => grant.permission.key) }));
    // Narrow SMM and editorial templates do not copy the legacy mixed CONTENT_MANAGER bundle.
    templates.push({ id: 'SMM_SPECIALIST', name: 'SMM-специалист', description: 'Подготовка публикаций, сценариев и материалов без самостоятельного согласования.', permissionKeys: ['content_plan.read', 'content_plan.write'].filter(key => permissions.some(permission => permission.key === key)) });
    templates.push({ id: 'SITE_EDITOR', name: 'Редактор сайта — только витрина', description: 'Страницы и каталог сайта без контент-плана, продаж и финансов.', permissionKeys: ['admin.read', 'catalog.read', 'catalog.write', 'media.read', 'media.write'].filter(key => permissions.some(permission => permission.key === key)) });
    return { ...rollout, scopes: accessScopes, permissions, departments, templates };
  }

  async list(query: AccessProfileQueryDto) {
    const page = query.page || 1, limit = 30;
    const where: Prisma.CrmAccessProfileWhereInput = { archivedAt: query.status === 'archived' ? { not: null } : null,
      ...(query.search?.trim() ? { name: { contains: query.search.trim(), mode: 'insensitive' } } : {}) };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.crmAccessProfile.findMany({ where, include: { _count: { select: { grants: true } } }, orderBy: [{ name: 'asc' }, { id: 'asc' }], skip: (page - 1) * limit, take: limit }),
      this.prisma.crmAccessProfile.count({ where }),
    ]);
    return { ...rollout, items, total, page, limit };
  }

  async get(id: string) {
    const item = await this.prisma.crmAccessProfile.findUnique({ where: { id }, include: profileInclude });
    if (!item) throw new NotFoundException('Профиль не найден');
    return { ...rollout, ...item };
  }

  async save(dto: CreateAccessProfileDto | UpdateAccessProfileDto, actorId: string, id?: string) {
    return this.write(async db => {
      const previous = id ? await db.crmAccessProfile.findUnique({ where: { id }, include: profileInclude }) : null;
      if (id && (!previous || previous.archivedAt)) throw new NotFoundException('Действующий проект роли не найден');
      if (previous && previous.version !== (dto as UpdateAccessProfileDto).version) throw new ConflictException('Профиль уже изменён. Обновите данные; ваш черновик не сохранён.');
      const name = normalizeName(dto.name);
      if (!name || name.length > 80) throw new BadRequestException('Укажите название профиля до 80 символов');
      const keys = dto.grants.map(grant => grant.permissionKey);
      if (new Set(keys).size !== keys.length) throw new BadRequestException('Одно разрешение не должно повторяться в профиле');
      const permissions = await db.permission.findMany({ where: { key: { in: keys } }, select: { id: true, key: true } });
      if (permissions.length !== keys.length) throw new BadRequestException('Неизвестное разрешение');
      const departmentIds = [...new Set(dto.grants.flatMap(grant => grant.departmentIds))];
      const departments = await db.crmDepartment.findMany({ where: { id: { in: departmentIds }, archivedAt: null }, select: { id: true } });
      if (departments.length !== departmentIds.length) throw new BadRequestException('Один из выбранных отделов отсутствует или находится в архиве');
      for (const grant of dto.grants) {
        if (!accessScopes.some(scope => scope.id === grant.scope)) throw new BadRequestException('Неизвестная область доступа');
        if ((grant.scope === 'SELECTED_DEPARTMENTS') !== Boolean(grant.departmentIds.length)) throw new BadRequestException('Выберите отделы только для области «Выбранные отделы»');
        if (new Set(grant.departmentIds).size !== grant.departmentIds.length) throw new BadRequestException('Отдел не должен повторяться');
      }
      const data = { name, normalizedName: name.toLocaleLowerCase('ru-RU'), description: dto.description.trim() };
      const profile = previous
        ? await db.crmAccessProfile.update({ where: { id }, data: { ...data, version: { increment: 1 } } })
        : await db.crmAccessProfile.create({ data });
      await db.crmAccessProfileGrant.deleteMany({ where: { profileId: profile.id } });
      const permissionIds = new Map(permissions.map(permission => [permission.key, permission.id]));
      for (const grant of dto.grants) await db.crmAccessProfileGrant.create({ data: {
        profileId: profile.id, permissionId: permissionIds.get(grant.permissionKey)!, scope: grant.scope,
        departments: { create: grant.departmentIds.map(departmentId => ({ departmentId })) },
      } });
      const snapshot = (row: any) => row ? { name: row.name, description: row.description, version: row.version,
        grants: row.grants?.map((grant: any) => ({ permissionKey: grant.permission.key, scope: grant.scope, departmentIds: grant.departments.map((item: any) => item.departmentId) })) } : null;
      await db.auditLog.create({ data: { actorId, resource: 'crm.access-profile', resourceId: profile.id, action: id ? 'UPDATE' : 'CREATE',
        payload: { mode: rollout.mode, before: snapshot(previous), after: { ...data, version: profile.version, grants: dto.grants as any } } } });
      return { ...rollout, ...await db.crmAccessProfile.findUniqueOrThrow({ where: { id: profile.id }, include: profileInclude }) };
    });
  }

  async archive(id: string, version: number, actorId: string, restore = false) {
    return this.write(async db => {
      const profile = await db.crmAccessProfile.findUnique({ where: { id } });
      if (!profile || Boolean(profile.archivedAt) !== restore) throw new NotFoundException(restore ? 'Архивный профиль не найден' : 'Действующий проект роли не найден');
      if (profile.version !== version) throw new ConflictException('Профиль уже изменён. Обновите данные.');
      const updated = await db.crmAccessProfile.update({ where: { id }, data: { archivedAt: restore ? null : new Date(), version: { increment: 1 } } });
      await db.auditLog.create({ data: { actorId, resource: 'crm.access-profile', resourceId: id, action: restore ? 'RESTORE' : 'ARCHIVE', payload: { name: profile.name, version: updated.version, mode: rollout.mode } } });
      return { ...rollout, ...updated };
    });
  }

  async preview(dto: PreviewAccessProfilesDto) {
    return this.prisma.$transaction(async db => {
      const employee = await db.user.findUnique({ where: { id: dto.employeeId }, select: { id: true, firstName: true, lastName: true, role: true, departmentId: true, isActive: true } });
      if (!employee || !internalWorkspaceRoles.includes(employee.role)) throw new NotFoundException('Сотрудник не найден');
      const profiles = await db.crmAccessProfile.findMany({ where: { id: { in: dto.profiles.map(profile => profile.id) }, archivedAt: null }, include: profileInclude });
      if (profiles.length !== dto.profiles.length) throw new NotFoundException('Один из профилей отсутствует или находится в архиве');
      if (profiles.some(profile => dto.profiles.find(ref => ref.id === profile.id)?.version !== profile.version)) throw new ConflictException('Профиль изменился. Обновите его перед проверкой.');
      const departments = await db.crmDepartment.findMany({ select: { id: true, name: true, parentId: true, archivedAt: true } });
      const overrides = await db.userPermission.findMany({ where: { userId: employee.id, effect: 'DENY' }, select: { permission: { select: { key: true } } } });
      const grants = profiles.flatMap(profile => profile.grants.map(grant => ({ profileId: profile.id, profileName: profile.name,
        permissionKey: grant.permission.key, scope: grant.scope, departmentIds: grant.departments.map(item => item.departmentId) })));
      const descriptions = new Map(profiles.flatMap(profile => profile.grants.map(grant => [grant.permission.key, grant.permission.description] as const)));
      return { ...rollout, employee, simulation: true,
        message: 'Предварительный расчёт замены роли выбранными профилями. Личные запреты учтены; старые личные разрешения не расширяют профиль. Текущий доступ не изменён.',
        departments: departments.map(({ id, name }) => ({ id, name })),
        decisions: resolveProfileScopes(employee, grants, departments, overrides.map(item => item.permission.key)).map(item => ({ ...item, description: descriptions.get(item.permissionKey) || item.permissionKey })),
      };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }
}
