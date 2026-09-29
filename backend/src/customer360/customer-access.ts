import { DataEntityType, Prisma, TrashEntryStatus } from '@prisma/client';
import { CrmReadPolicy } from '../crm/read-access';

/** Shared by Customer 360 and CRM references; trash never becomes an alternate entry point. */
export async function customerVisibility(db: Prisma.TransactionClient, read: CrmReadPolicy, write?: CrmReadPolicy) {
  const trash = await db.dataTrashEntry.findMany({ where: { entityType: { in: [DataEntityType.CUSTOMER, DataEntityType.ORGANIZATION, DataEntityType.LEAD, DataEntityType.TASK, DataEntityType.HELPDESK_TICKET] }, status: TrashEntryStatus.TRASHED }, select: { entityType: true, entityId: true } });
  const live = (type: DataEntityType) => ({ id: { notIn: trash.filter(row => row.entityType === type).map(row => row.entityId) } });
  return {
    customers: { AND: [read.customers(), ...(write ? [write.customers('customers.write')] : []), { id: { notIn: trash.filter(row => row.entityType === 'CUSTOMER').map(row => row.entityId) } }] } satisfies Prisma.CustomerWhereInput,
    organizations: { AND: [read.organizations(), ...(write ? [write.organizations('customers.write')] : []), { id: { notIn: trash.filter(row => row.entityType === 'ORGANIZATION').map(row => row.entityId) } }] } satisfies Prisma.OrganizationWhereInput,
    leads: { AND: [read.leads(), live('LEAD')] } satisfies Prisma.LeadWhereInput,
    tasks: { AND: [read.tasks('crm.read'), live('TASK'), { status: { not: 'CANCELLED' } }] } satisfies Prisma.TaskWhereInput,
    orders: read.orders(),
    tickets: { AND: [read.tickets(), live('HELPDESK_TICKET')] } satisfies Prisma.HelpdeskTicketWhereInput,
  };
}
