import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { TaskStatus } from '@prisma/client';
import { PlatformChatGateway } from '../platform-chat/platform-chat.gateway';
import { PrismaService } from '../prisma/prisma.service';
import { ecosystemAutomationEnabled } from '../common/ecosystem-automation';
import { CrmRemindersService } from './reminders.service';

@Injectable()
export class CrmReminderScheduler implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(CrmReminderScheduler.name);
  private timer?: ReturnType<typeof setInterval>;
  private delivering = false;

  constructor(private readonly prisma: PrismaService, private readonly realtime: PlatformChatGateway, private readonly reminders: CrmRemindersService) {}

  onApplicationBootstrap() {
    if(!ecosystemAutomationEnabled())return;
    void this.deliver();
    this.timer = setInterval(() => void this.deliver(), 15000);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private async deliver() {
    if (this.delivering) return;
    this.delivering = true;
    try {
      const reminders = await this.prisma.crmTaskReminder.findMany({
        where: { deliveredAt: null, dismissedAt: null, remindAt: { lte: new Date() }, task: { status: { notIn: [TaskStatus.DONE, TaskStatus.CANCELLED] } } },
        select: { id: true, recipientId: true },
        orderBy: [{ remindAt: 'asc' }, { id: 'asc' }],
        take: 100,
      });
      for (const reminder of reminders) {
        const claimed = await this.reminders.claim(reminder.recipientId, reminder.id);
        if (claimed) await this.realtime.publishReminder(reminder.recipientId, () => this.reminders.visible(reminder.recipientId, reminder.id));
      }
    } catch (error) {
      this.logger.error(`Не удалось доставить напоминания: ${error instanceof Error ? error.message : String(error)}`);
    } finally { this.delivering = false; }
  }
}
