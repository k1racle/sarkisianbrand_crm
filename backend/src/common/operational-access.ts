import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CrmReadAccess, CrmReadPolicy } from '../crm/read-access';
import { customerVisibility } from '../customer360/customer-access';
import { PrismaService } from '../prisma/prisma.service';

export type OperationalContext = { db: Prisma.TransactionClient; read: CrmReadPolicy; write?: CrmReadPolicy; visible: Awaited<ReturnType<typeof customerVisibility>> };
export async function withOperationalAccess<T>(prisma: PrismaService, access: CrmReadAccess, actor: string, domain: 'oms' | 'marketplace' | 'helpdesk', mutation: boolean, action: (ctx: OperationalContext) => Promise<T>) {
  try {
    return await prisma.$transaction(async db => {
      // Same lock as department changes; no permission/assignment snapshot supplied by the client.
      if (mutation) await db.$executeRaw`SELECT pg_advisory_xact_lock(73422112)`;
      const read = await access.resolve(db, actor, domain + '.read');
      const write = mutation ? await access.resolve(db, actor, domain + '.write') : undefined;
      return action({ db, read, write, visible: await customerVisibility(db, read) });
    }, { isolationLevel: mutation ? Prisma.TransactionIsolationLevel.Serializable : Prisma.TransactionIsolationLevel.RepeatableRead, timeout: 30000 });
  } catch (error: any) {
    if (error.code === 'P2034' || (error.code === 'P2010' && ['40001', '40P01'].includes(error.meta?.code))) throw new ConflictException('Данные изменились во время сохранения. Обновите карточку и повторите действие.');
    if (error.code === 'P2002') throw new ConflictException('Запись уже существует. Обновите данные и повторите действие.');
    throw error;
  }
}
