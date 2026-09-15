import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLeadDto, CreateTaskDto } from './dto/crm.dto';

@Injectable()
export class CrmService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard() {
    const [customers, openLeads, activeTasks, orders] = await this.prisma.$transaction([
      this.prisma.customer.count(),
      this.prisma.lead.count({ where: { status: { notIn: ['WON', 'LOST'] } } }),
      this.prisma.task.count({ where: { status: { not: 'DONE' } } }),
      this.prisma.order.count(),
    ]);
    return { customers, openLeads, activeTasks, orders };
  }

  async customers() {
    const customers = await this.prisma.customer.findMany({ include: { user: { select: { role: true } }, organizationMemberships: { where: { isActive: true }, include: { organization: true } }, _count: { select: { orders: true, interactions: true } } }, orderBy: { createdAt: 'desc' } });
    return customers.map(({ user, organizationMemberships, ...customer }) => ({ ...customer, role: user?.role || 'CUSTOMER_B2C', b2bProfile: organizationMemberships[0]?.organization || null }));
  }

  leads() {
    return this.prisma.lead.findMany({ include: { b2bProfile: true, customer: true, organization: true, manager: { select: { id: true, firstName: true, lastName: true, email: true } }, interactions: true, tasks: true }, orderBy: { createdAt: 'desc' } });
  }

  async createLead(dto: CreateLeadDto) {
    const normalizedEmail = dto.contactEmail?.trim().toLowerCase() || null;
    const normalizedPhone = dto.contactPhone.replace(/\D/g, '') || null;
    return this.prisma.$transaction(async (tx) => {
      let customer = await tx.customer.findFirst({ where: { OR: [normalizedEmail ? { normalizedEmail } : {}, normalizedPhone ? { normalizedPhone } : {}].filter((item) => Object.keys(item).length) } });
      if (!customer) {
        const names = dto.contactName.trim().split(/\s+/);
        customer = await tx.customer.create({ data: { firstName: names.shift() || dto.contactName, lastName: names.join(' ') || null, email: dto.contactEmail, phone: dto.contactPhone, normalizedEmail, normalizedPhone, segment: 'Лид', source: dto.source } });
      }
      return tx.lead.create({ data: { source: dto.source, contactName: dto.contactName, contactPhone: dto.contactPhone, contactEmail: dto.contactEmail, message: dto.message, status: dto.status, managerId: dto.managerId, customerId: customer.id } });
    });
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
