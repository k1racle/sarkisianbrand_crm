import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface WriteAuditEntry {
  actorId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  route?: string;
  correlationId?: string;
  ipAddress?: string;
  userAgent?: string;
  payload?: Prisma.InputJsonValue;
  result?: Prisma.InputJsonValue;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  write(entry: WriteAuditEntry) {
    return this.prisma.auditLog.create({ data: entry });
  }

  list(resource?: string, action?: string, actorId?: string) {
    return this.prisma.auditLog.findMany({
      where: { ...(resource ? { resource } : {}), ...(action ? { action } : {}), ...(actorId ? { actorId } : {}) },
      include: { actor: { select: { id: true, firstName: true, lastName: true, email: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      take: 250,
    });
  }
}
