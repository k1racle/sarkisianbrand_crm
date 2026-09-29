// Unit-only in-memory data; never connects to a database or chat server.
import { CrmReadPolicy } from '../crm/read-access';
import { resolveProfileScopes } from '../auth/access-scope-policy';
import { matchesOperation, operationDepartments, projectOperation } from '../common/operational-access.fixture';
import { ChatRecordsService } from './chat-records.service';
export const cardId = (index: number) => `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`;
export function chatFixture(scope = 'COMPANY', denied: string[] = []) {
  const users = [{ id: 'actor', role: 'SUPERVISOR', isActive: true, departmentId: 'sales' }, { id: 'peer', role: 'IT_SUPPORT', isActive: true, departmentId: 'other' }];
  const rows = ['actor', 'colleague', 'branch', 'other'].map((owner, index) => ({ id: cardId(index), assignedToId: owner, assignedTo: { departmentId: index < 2 ? 'sales' : owner }, accountManagerId: owner, accountManager: { departmentId: index < 2 ? 'sales' : owner }, managerId: owner, manager: { departmentId: index < 2 ? 'sales' : owner }, title: 'Задача ' + owner, firstName: 'Клиент ' + owner, lastName: '', email: 'do-not-project@example.test', phone: 'private-phone', description: 'private-description', status: 'TODO' }));
  const entities: Record<string, any[]> = { task: rows.map(row => ({ ...row })), customer: rows.map(row => ({ ...row, status: 'ACTIVE' })), lead: rows.map(row => ({ ...row })), product: [{ id: cardId(7), isActive: true, nameRu: 'Гель', sku: 'GEL', slug: 'gel', basePrice: 'private-price' }] };
  entities.crmPipelineStage = [{ id: cardId(8), name: 'Новые', color: '#6855df', pipeline: { name: 'Продажи', isActive: true }, leads: entities.lead, private: 'raw-stage' }];
  const legacy = { id: 'attachment', kind: 'ENTITY', name: 'stale-secret-title', entityType: 'TASK', entityId: cardId(3), metadata: { url: 'https://malicious.invalid', subtitle: 'stale-secret-contact', image: 'https://tracker.invalid/pixel' }, storageKey: 'stale-secret-storage' };
  const channel: any = { id: 'channel', name: 'Общий', type: 'TEAM', isArchived: false, createdById: 'actor', members: [], messages: [], _count: { messages: 1 } };
  const messages: any[] = [{ id: 'message', channelId: 'channel', channel, body: 'Обсудим карточку', authorId: 'actor', author: { id: 'actor', firstName: 'Анна', email: 'private-email' }, attachments: [legacy], deletedAt: null, createdAt: new Date() }];
  const trash: any[] = [];
  const db: any = { user: { findUnique: jest.fn(async q => projectOperation(users.find(row => row.id === q.where.id) || null, q.select)) }, dataTrashEntry: { findMany: jest.fn(async q => trash.filter(row => matchesOperation(row, q.where)).map(row => projectOperation(row, q.select))) } };
  for (const name of Object.keys(entities)) db[name] = { findMany: jest.fn(async q => entities[name].filter(row => matchesOperation(row, q.where)).slice(0, q.take).map(row => name === 'crmPipelineStage' ? { ...projectOperation(row, { ...q.select, _count: false }), _count: { leads: row.leads.filter(lead => matchesOperation(lead, q.select._count.select.leads.where)).length } } : projectOperation(row, q.select))) };
  db.crmChatMessage = {
    findMany: jest.fn(async q => messages.filter(row => matchesOperation(row, q.where)).slice(0, q.take)),
    findFirst: jest.fn(async q => messages.find(row => matchesOperation(row, q.where)) || null),
    count: jest.fn(async q => messages.filter(row => matchesOperation(row, q.where)).length),
  };
  db.crmChatChannel = {
    findFirst: jest.fn(async q => matchesOperation(channel, q.where) ? { id: channel.id } : null),
    findMany: jest.fn(async q => matchesOperation(channel, q.where) ? [{ ...channel, messages: messages.filter(row => !row.deletedAt).slice(0, 1) }] : []),
  };
  db.$transaction = jest.fn(fn => fn(db));
  const scopes: Record<string, string> = {};
  const access: any = { resolve: jest.fn(async (_db, actor, key) => {
    const viewer = users.find(row => row.id === actor)!;
    const keys = ['crm.read', 'customers.read', 'catalog.read'];
    return new CrmReadPolicy(actor, resolveProfileScopes(viewer, keys.map(permissionKey => {
      const selected = scopes[`${actor}:${permissionKey}`] || scopes[permissionKey] || scope;
      return { permissionKey, profileId: 'unit', profileName: 'Unit', scope: selected, departmentIds: selected === 'SELECTED_DEPARTMENTS' ? ['other'] : [] };
    }), operationDepartments, denied), key);
  }) };
  return { db, service: new ChatRecordsService(db, access), users, scopes, denied, entities, channel, messages, legacy, trash, access };
}
