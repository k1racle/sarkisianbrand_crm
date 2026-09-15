import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PermissionEffect, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { BackgroundJobsService } from '../background-jobs/background-jobs.service';
import { CreateEmployeeDto, UpdateEmployeeDto, UpdateEmployeePermissionsDto } from './dto/system-settings.dto';

const internalRoles: UserRole[] = [
  UserRole.ADMIN, UserRole.CONTENT_MANAGER, UserRole.MANAGER_B2B, UserRole.MANAGER_SALES,
  UserRole.MARKETPLACE_MANAGER, UserRole.SUPERVISOR, UserRole.EXECUTIVE, UserRole.IT_SUPPORT,
  UserRole.CURATOR, UserRole.WAREHOUSE,
];

@Injectable()
export class SystemSettingsService {
  constructor(private readonly prisma: PrismaService, private readonly jobs: BackgroundJobsService) {}

  async dashboard() {
    const [staff, activeStaff, sessions, permissions, auditToday, integrations, activeJobs, failedJobs] = await this.prisma.$transaction([
      this.prisma.user.count({ where: { role: { in: internalRoles } } }),
      this.prisma.user.count({ where: { role: { in: internalRoles }, isActive: true } }),
      this.prisma.session.count({ where: { expiresAt: { gt: new Date() } } }),
      this.prisma.permission.count(),
      this.prisma.auditLog.count({ where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } }),
      this.prisma.marketplaceIntegration.count({ where: { isActive: true } }),
      this.prisma.jobRun.count({ where: { status: { in: ['WAITING', 'ACTIVE', 'RETRYING'] } } }),
      this.prisma.jobRun.count({ where: { status: 'FAILED' } }),
    ]);
    return { staff, activeStaff, sessions, permissions, auditToday, integrations, activeJobs, failedJobs };
  }

  staff() {
    return this.prisma.user.findMany({
      where: { role: { in: internalRoles } },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true, createdAt: true, updatedAt: true, _count: { select: { sessions: true } }, permissionOverrides: { include: { permission: true } } },
      orderBy: [{ isActive: 'desc' }, { firstName: 'asc' }],
    });
  }

  async createEmployee(dto: CreateEmployeeDto) {
    if (await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } })) throw new ConflictException('Сотрудник с таким email уже существует');
    return this.prisma.user.create({ data: { email: dto.email.toLowerCase(), password: await bcrypt.hash(dto.password, 12), firstName: dto.firstName, lastName: dto.lastName, role: dto.role }, select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true, createdAt: true } });
  }

  async updateEmployee(id: string, dto: UpdateEmployeeDto, actorId: string) {
    if (id === actorId && dto.isActive === false) throw new ConflictException('Нельзя заблокировать собственную учётную запись');
    const employee = await this.prisma.user.findUnique({ where: { id } });
    if (!employee || !internalRoles.includes(employee.role)) throw new NotFoundException('Сотрудник не найден');
    return this.prisma.$transaction(async tx => {
      const updated = await tx.user.update({ where: { id }, data: dto, select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true, updatedAt: true } });
      if (dto.isActive === false || (dto.role && dto.role !== employee.role)) await tx.session.deleteMany({ where: { userId: id } });
      return updated;
    });
  }

  async revokeSessions(id: string) {
    const employee = await this.prisma.user.findUnique({ where: { id } });
    if (!employee) throw new NotFoundException('Сотрудник не найден');
    const result = await this.prisma.session.deleteMany({ where: { userId: id } });
    return { id, revoked: result.count };
  }

  async accessMatrix() {
    const permissions = await this.prisma.permission.findMany({ include: { roles: true }, orderBy: [{ resource: 'asc' }, { action: 'asc' }] });
    return { roles: internalRoles, permissions: permissions.map(permission => ({ ...permission, roles: permission.roles.map(item => item.role) })) };
  }

  async updatePermissions(id: string, dto: UpdateEmployeePermissionsDto) {
    const employee = await this.prisma.user.findUnique({ where: { id } });
    if (!employee) throw new NotFoundException('Сотрудник не найден');
    const uniqueKeys = [...new Set([...dto.allow, ...dto.deny])];
    const permissions = await this.prisma.permission.findMany({ where: { key: { in: uniqueKeys } } });
    if (permissions.length !== uniqueKeys.length) throw new NotFoundException('Одно из разрешений не найдено');
    const keyMap = new Map(permissions.map(item => [item.key, item.id]));
    await this.prisma.$transaction(async tx => {
      await tx.userPermission.deleteMany({ where: { userId: id } });
      const rows = [
        ...dto.allow.map(key => ({ userId: id, permissionId: keyMap.get(key)!, effect: PermissionEffect.ALLOW })),
        ...dto.deny.filter(key => !dto.allow.includes(key)).map(key => ({ userId: id, permissionId: keyMap.get(key)!, effect: PermissionEffect.DENY })),
      ];
      if (rows.length) await tx.userPermission.createMany({ data: rows });
      await tx.session.deleteMany({ where: { userId: id } });
    });
    return { id, overrides: uniqueKeys.length };
  }

  async technicalLogs() {
    const [sync, integrations, recentAudit, jobs, queue] = await Promise.all([
      this.prisma.syncLog.findMany({ orderBy: { createdAt: 'desc' }, take: 100 }),
      this.prisma.marketplaceIntegration.findMany({ select: { id: true, channel: true, shopName: true, isActive: true, lastSyncAt: true, updatedAt: true }, orderBy: { updatedAt: 'desc' } }),
      this.prisma.auditLog.findMany({ select: { id: true, action: true, resource: true, route: true, correlationId: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 50 }),
      this.prisma.jobRun.findMany({ orderBy: { createdAt: 'desc' }, take: 100 }),
      this.jobs.health(),
    ]);
    return { sync, integrations, recentAudit, jobs, queue };
  }

  retryJob(id: string, actorId: string) { return this.jobs.retry(id, actorId); }
}
