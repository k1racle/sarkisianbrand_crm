import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TaskStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CrmReadAccess, CrmReadPolicy } from './read-access';

// Notification payloads deliberately contain no linked customer/deal, comments
// or other task fields. Those records must be opened through their own boundary.
const reminderSelect = { id: true, remindAt: true, task: { select: { id: true, title: true, dueDate: true, priority: true } } } as const;

@Injectable()
export class CrmRemindersService {
  constructor(private readonly prisma: PrismaService, private readonly access: CrmReadAccess) {}

  private where(actor: string, policy: CrmReadPolicy, now = new Date()): Prisma.CrmTaskReminderWhereInput {
    return { recipientId: actor, dismissedAt: null, remindAt: { lte: now }, task: { AND: [policy.tasks(), { status: { notIn: [TaskStatus.DONE, TaskStatus.CANCELLED] } }] } };
  }

  list(actor: string) {
    return this.prisma.$transaction(async db => {
      const policy = await this.access.resolve(db, actor);
      return db.crmTaskReminder.findMany({ where: this.where(actor, policy), select: reminderSelect, orderBy: [{ remindAt: 'asc' }, { id: 'asc' }], take: 50 });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }

  // Called immediately before each WebSocket send, after checking that socket's
  // live session. Never reuse the payload captured when the queue was polled.
  async visible(actor: string, id: string) {
    try {
      return await this.prisma.$transaction(async db => {
        const policy = await this.access.resolve(db, actor);
        return db.crmTaskReminder.findFirst({ where: { ...this.where(actor, policy), id }, select: reminderSelect });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
    } catch (error) {
      if (error instanceof ForbiddenException) return null;
      throw error; // A database outage is not a confirmed revocation.
    }
  }

  claim(actor: string, id: string) {
    return this.prisma.$transaction(async db => {
      await db.$executeRaw`SELECT pg_advisory_xact_lock(73422112)`;
      const now = new Date();
      let visible = false;
      try {
        const policy = await this.access.resolve(db, actor);
        visible = Boolean(await db.crmTaskReminder.findFirst({ where: { ...this.where(actor, policy, now), id, deliveredAt: null }, select: { id: true } }));
      } catch (error) { if (!(error instanceof ForbiddenException)) throw error; }
      const updated = await db.crmTaskReminder.updateMany({
        where: { id, recipientId: actor, deliveredAt: null, dismissedAt: null, remindAt: { lte: now } },
        // Suppressed obsolete reminders must not starve the next queue batch.
        data: visible ? { deliveredAt: now } : { dismissedAt: now },
      });
      return visible && updated.count > 0;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  dismiss(actor: string, id: string) {
    return this.prisma.$transaction(async db => {
      await db.$executeRaw`SELECT pg_advisory_xact_lock(73422112)`;
      const read = await this.access.resolve(db, actor);
      const write = await this.access.resolve(db, actor, 'crm.write');
      const reminder = await db.crmTaskReminder.findFirst({ where: { id, recipientId: actor, task: { AND: [read.tasks(), write.tasks()] } }, select: { id: true } });
      if (!reminder) throw new NotFoundException('Напоминание не найдено или недоступно');
      await db.crmTaskReminder.updateMany({ where: { id, recipientId: actor, dismissedAt: null }, data: { dismissedAt: new Date() } });
      return { success: true };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
}
