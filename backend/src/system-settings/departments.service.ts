import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DepartmentDto, UpdateDepartmentDto } from './dto/department.dto';
import { internalWorkspaceRoles } from '../auth/workspace-role-catalog';

const internal = internalWorkspaceRoles;
const person = { id: true, firstName: true, lastName: true, email: true, isActive: true, departmentId: true } as const;
const include = { leader: { select: person }, members: { select: person, orderBy: { firstName: 'asc' as const } } };

/** Department membership is organisational metadata, never an implicit permission grant. */
@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}
  list(archived = false) { return this.prisma.crmDepartment.findMany({ where: { archivedAt: archived ? { not: null } : null }, include, orderBy: [{ name: 'asc' }, { id: 'asc' }] }); }

  async save(dto: DepartmentDto | UpdateDepartmentDto, actorId: string, id?: string) {
    return this.prisma.$transaction(async tx => {
      // Serialize tree + membership edits, including employee moves across departments.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(73422112)`;
      const previous = id ? await tx.crmDepartment.findUnique({ where: { id }, include: { members: { select: { id: true } } } }) : null;
      if (id && (!previous || previous.archivedAt)) throw new NotFoundException('Отдел не найден');
      if (previous && previous.version !== (dto as UpdateDepartmentDto).version) throw new ConflictException('Отдел уже изменён. Обновите данные перед сохранением.');
      if (!dto.name.trim()) throw new BadRequestException('Укажите название отдела');
      if (dto.leaderId && !dto.memberIds.includes(dto.leaderId)) throw new BadRequestException('Руководитель должен входить в состав отдела');
      if (dto.parentId) {
        const tree = await tx.crmDepartment.findMany({ where: { archivedAt: null }, select: { id: true, parentId: true } });
        const visited = new Set<string>(); let parent: string | null = dto.parentId;
        while (parent) {
          if (parent === id || visited.has(parent)) throw new BadRequestException('Нельзя создать цикл в структуре отделов');
          visited.add(parent); const node = tree.find(item => item.id === parent);
          if (!node) throw new BadRequestException('Родительский отдел не найден');
          parent = node.parentId;
        }
      }
      const members = await tx.user.findMany({ where: { id: { in: dto.memberIds }, role: { in: internal } }, select: person });
      if (members.length !== dto.memberIds.length) throw new BadRequestException('В отдел можно добавить только сотрудников');
      if (members.some(member => member.departmentId && member.departmentId !== id)) throw new ConflictException('Сотрудник уже состоит в другом отделе. Сначала исключите его из прежнего отдела.');
      const former = new Set(previous?.members.map(member => member.id));
      if (members.some(member => !member.isActive && !former.has(member.id))) throw new BadRequestException('Нельзя добавить заблокированного сотрудника');
      if (dto.leaderId && !members.find(member => member.id === dto.leaderId)?.isActive) throw new BadRequestException('Руководитель должен быть активным сотрудником');
      const data = { name: dto.name.trim(), parentId: dto.parentId || null, leaderId: dto.leaderId || null };
      const department = id
        ? await tx.crmDepartment.update({ where: { id }, data: { ...data, version: { increment: 1 } } })
        : await tx.crmDepartment.create({ data });
      await tx.user.updateMany({ where: { departmentId: department.id, id: { notIn: dto.memberIds } }, data: { departmentId: null } });
      await tx.user.updateMany({ where: { id: { in: dto.memberIds } }, data: { departmentId: department.id } });
      const affected = new Set([...former].filter(memberId => !dto.memberIds.includes(memberId)));
      dto.memberIds.filter(memberId => !former.has(memberId)).forEach(memberId => affected.add(memberId));
      if (previous && previous.parentId !== data.parentId) {
        const tree = await tx.crmDepartment.findMany({ where: { archivedAt: null }, select: { id: true, parentId: true } });
        const branch = new Set([department.id]);
        let changed = true;
        while (changed) { changed = false; for (const node of tree) if (node.parentId && branch.has(node.parentId) && !branch.has(node.id)) { branch.add(node.id); changed = true; } }
        const branchMembers = await tx.user.findMany({ where: { departmentId: { in: [...branch] } }, select: { id: true } });
        branchMembers.forEach(member => affected.add(member.id));
      }
      if (affected.size) await tx.session.deleteMany({ where: { userId: { in: [...affected] } } });
      await tx.auditLog.create({ data: { actorId, resource: 'crm.department', resourceId: department.id, action: id ? 'UPDATE' : 'CREATE', payload: { name: data.name, parentId: data.parentId, leaderId: data.leaderId, memberIds: dto.memberIds, previousMemberIds: previous?.members.map(member => member.id) || [], sessionsRevokedFor: [...affected] } } });
      return tx.crmDepartment.findUniqueOrThrow({ where: { id: department.id }, include });
    });
  }

  async archive(id: string, version: number, actorId: string) {
    return this.prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(73422112)`;
      const department = await tx.crmDepartment.findUnique({ where: { id }, include: { _count: { select: { members: true, children: { where: { archivedAt: null } } } } } });
      if (!department || department.archivedAt) throw new NotFoundException('Отдел не найден');
      if (department.version !== version) throw new ConflictException('Отдел уже изменён. Обновите данные.');
      if (department._count.members || department._count.children) throw new ConflictException('Сначала перенесите сотрудников и дочерние отделы');
      await tx.auditLog.create({ data: { actorId, resource: 'crm.department', resourceId: id, action: 'ARCHIVE', payload: { name: department.name } } });
      return tx.crmDepartment.update({ where: { id }, data: { archivedAt: new Date(), version: { increment: 1 }, leaderId: null } });
    });
  }

  async restore(id: string, version: number, actorId: string) {
    return this.prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(73422112)`;
      const department = await tx.crmDepartment.findUnique({ where: { id } });
      if (!department?.archivedAt) throw new NotFoundException('Архивный отдел не найден');
      if (department.version !== version) throw new ConflictException('Отдел уже изменён. Обновите данные.');
      if (department.parentId && !await tx.crmDepartment.findFirst({ where: { id: department.parentId, archivedAt: null }, select: { id: true } })) {
        throw new ConflictException('Сначала восстановите родительский отдел');
      }
      const restored = await tx.crmDepartment.update({ where: { id }, data: { archivedAt: null, version: { increment: 1 } }, include });
      await tx.auditLog.create({ data: { actorId, resource: 'crm.department', resourceId: id, action: 'RESTORE', payload: { name: department.name } } });
      return restored;
    });
  }
}
