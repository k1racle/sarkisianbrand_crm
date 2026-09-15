import { Injectable, NotFoundException } from '@nestjs/common';
import { TicketPriority, TicketSource, TicketStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHelpdeskCommentDto, CreateHelpdeskTicketDto, UpdateHelpdeskTicketDto } from './dto/helpdesk.dto';

@Injectable()
export class HelpdeskService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard() {
    const now = new Date();
    const [total, newTickets, inWork, waiting, overdue, resolved] = await this.prisma.$transaction([
      this.prisma.helpdeskTicket.count(),
      this.prisma.helpdeskTicket.count({ where: { status: TicketStatus.NEW } }),
      this.prisma.helpdeskTicket.count({ where: { status: TicketStatus.OPEN } }),
      this.prisma.helpdeskTicket.count({ where: { status: { in: [TicketStatus.WAITING_INTERNAL, TicketStatus.WAITING_REQUESTER] } } }),
      this.prisma.helpdeskTicket.count({ where: { resolutionDueAt: { lt: now }, status: { notIn: [TicketStatus.RESOLVED, TicketStatus.CLOSED] } } }),
      this.prisma.helpdeskTicket.count({ where: { status: { in: [TicketStatus.RESOLVED, TicketStatus.CLOSED] } } }),
    ]);
    return { total, new: newTickets, inWork, waiting, overdue, resolved };
  }

  tickets(status?: TicketStatus, source?: TicketSource) {
    return this.prisma.helpdeskTicket.findMany({
      where: { ...(status ? { status } : {}), ...(source ? { source } : {}) },
      include: {
        requesterUser: { select: { id: true, firstName: true, lastName: true, email: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
        order: { select: { id: true, orderNumber: true } },
        customer: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, segment: true } },
        organization: { select: { id: true, name: true, inn: true } },
        comments: { include: { author: { select: { id: true, firstName: true, lastName: true, email: true } } }, orderBy: { createdAt: 'asc' } },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async create(dto: CreateHelpdeskTicketDto, requesterUserId?: string) {
    const createdAt = new Date();
    const hours = this.slaHours(dto.priority || TicketPriority.MEDIUM);
    const suffix = `${createdAt.getTime()}`.slice(-7);
    return this.prisma.$transaction(async (tx) => {
      const normalizedEmail = dto.requesterEmail?.trim().toLowerCase();
      let customer = requesterUserId ? await tx.customer.findUnique({ where: { userId: requesterUserId } }) : null;
      if (!customer && normalizedEmail && dto.source !== TicketSource.EMPLOYEE) customer = await tx.customer.findFirst({ where: { normalizedEmail } });
      if (!customer && normalizedEmail && dto.source !== TicketSource.EMPLOYEE) {
        const names = dto.requesterName?.trim().split(/\s+/) || [];
        customer = await tx.customer.create({ data: { firstName: names.shift() || dto.requesterName, lastName: names.join(' ') || null, email: dto.requesterEmail, normalizedEmail, segment: dto.source === TicketSource.B2B ? 'B2B' : 'B2C', source: 'HELPDESK' } });
      }
      let organization = dto.organizationRef ? await tx.organization.findFirst({ where: { OR: [{ id: dto.organizationRef }, { inn: dto.organizationRef }] } }) : null;
      if (!organization && requesterUserId) organization = await tx.organization.findFirst({ where: { members: { some: { userId: requesterUserId, isActive: true } } } });
      return tx.helpdeskTicket.create({
        data: {
        number: `HD-${createdAt.getFullYear()}-${suffix}`,
        subject: dto.subject,
        description: dto.description,
        source: dto.source,
        priority: dto.priority,
        requesterUserId,
        requesterName: dto.requesterName,
        requesterEmail: dto.requesterEmail,
        orderId: dto.orderId,
        organizationRef: dto.organizationRef,
        customerId: customer?.id,
        organizationId: organization?.id,
        affectedService: dto.affectedService,
        firstResponseDueAt: new Date(createdAt.getTime() + hours.first * 60 * 60 * 1000),
        resolutionDueAt: new Date(createdAt.getTime() + hours.resolve * 60 * 60 * 1000),
        },
      });
    });
  }

  async update(id: string, dto: UpdateHelpdeskTicketDto) {
    const ticket = await this.prisma.helpdeskTicket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('Заявка не найдена');
    const now = new Date();
    return this.prisma.helpdeskTicket.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.status === TicketStatus.RESOLVED ? { resolvedAt: now } : {}),
        ...(dto.status === TicketStatus.CLOSED ? { closedAt: now } : {}),
      },
    });
  }

  async addComment(id: string, dto: CreateHelpdeskCommentDto, authorId: string) {
    const ticket = await this.prisma.helpdeskTicket.findUnique({ where: { id }, select: { id: true } });
    if (!ticket) throw new NotFoundException('Заявка не найдена');
    return this.prisma.helpdeskComment.create({ data: { ticketId: id, authorId, body: dto.body, isInternal: dto.isInternal || false } });
  }

  agents() {
    return this.prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'IT_SUPPORT'] } },
      select: { id: true, email: true, firstName: true, lastName: true, role: true },
      orderBy: { firstName: 'asc' },
    });
  }

  private slaHours(priority: TicketPriority) {
    if (priority === TicketPriority.CRITICAL) return { first: 1, resolve: 4 };
    if (priority === TicketPriority.HIGH) return { first: 2, resolve: 8 };
    if (priority === TicketPriority.LOW) return { first: 8, resolve: 72 };
    return { first: 4, resolve: 24 };
  }
}
