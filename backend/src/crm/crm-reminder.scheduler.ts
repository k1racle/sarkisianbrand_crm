import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { TaskStatus } from '@prisma/client';
import { PlatformChatGateway } from '../platform-chat/platform-chat.gateway';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CrmReminderScheduler implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(CrmReminderScheduler.name);
  private timer?: ReturnType<typeof setInterval>;

  constructor(private readonly prisma: PrismaService, private readonly realtime: PlatformChatGateway) {}

  onApplicationBootstrap() {
    void this.deliver();
    this.timer = setInterval(() => void this.deliver(), 15000);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private async deliver() {
    try {
      const reminders = await this.prisma.crmTaskReminder.findMany({
        where: { deliveredAt: null, dismissedAt: null, remindAt: { lte: new Date() }, task: { status: { notIn: [TaskStatus.DONE, TaskStatus.CANCELLED] } } },
        include: { task: { select: { id: true, title: true, dueDate: true, priority: true } } },
        orderBy: { remindAt: 'asc' },
        take: 100,
      });
      for (const reminder of reminders) {
        const claimed = await this.prisma.crmTaskReminder.updateMany({ where: { id: reminder.id, deliveredAt: null }, data: { deliveredAt: new Date() } });
        if (claimed.count) this.realtime.publishReminder(reminder.recipientId, reminder);
      }
    } catch (error) {
      this.logger.error(`Не удалось доставить напоминания: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
