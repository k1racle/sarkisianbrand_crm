import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLeadDto, CreateTaskDto } from './dto/crm.dto';

@Injectable()
export class CrmService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard() {
    const [customers, openLeads, activeTasks, orders] = await this.prisma.$transaction([
      this.prisma.user.count(),
      this.prisma.lead.count({ where: { status: { notIn: ['WON', 'LOST'] } } }),
      this.prisma.task.count({ where: { status: { not: 'DONE' } } }),
      this.prisma.order.count(),
    ]);
    return { customers, openLeads, activeTasks, orders };
  }

  customers() {
    return this.prisma.user.findMany({ select: { id: true, email: true, phone: true, firstName: true, lastName: true, role: true, createdAt: true, b2bProfile: true, _count: { select: { orders: true, interactions: true } } }, orderBy: { createdAt: 'desc' } });
  }

  leads() {
    return this.prisma.lead.findMany({ include: { b2bProfile: true, manager: { select: { id: true, firstName: true, lastName: true, email: true } }, interactions: true, tasks: true }, orderBy: { createdAt: 'desc' } });
  }

  createLead(dto: CreateLeadDto) {
    return this.prisma.lead.create({ data: { source: dto.source, contactName: dto.contactName, contactPhone: dto.contactPhone, contactEmail: dto.contactEmail, message: dto.message, status: dto.status, managerId: dto.managerId } });
  }

  tasks() {
    return this.prisma.task.findMany({ include: { assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } }, createdBy: { select: { id: true, firstName: true, lastName: true, email: true } }, lead: true }, orderBy: { dueDate: 'asc' } });
  }

  async createTask(dto: CreateTaskDto) {
    const users = await this.prisma.user.findMany({ where: { id: { in: [dto.assignedToId, dto.createdById] } }, select: { id: true } });
    if (users.length !== new Set([dto.assignedToId, dto.createdById]).size) throw new NotFoundException('Сотрудник не найден');
    return this.prisma.task.create({ data: { title: dto.title, description: dto.description, assignedToId: dto.assignedToId, createdById: dto.createdById, leadId: dto.leadId, status: dto.status } });
  }
}
