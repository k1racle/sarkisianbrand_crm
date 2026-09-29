import { PlatformChatService } from './platform-chat.service';
import { cardId, chatFixture } from './chat-records.fixture';
jest.mock('./platform-chat.gateway', () => ({ PlatformChatGateway: class {} }));

describe('Chat HTTP service delegates every record reference to recipient policy', () => {
  function fixture(scope = 'COMPANY', denied: string[] = []) {
    const f = chatFixture(scope, denied);
    f.db.crmChatChannel.findUnique = jest.fn(async () => ({ ...f.channel, members: [] }));
    f.db.crmChatMessage.create = jest.fn(async () => ({ id: 'message', channelId: 'channel' }));
    f.db.crmChatMember = { upsert: jest.fn() };
    const realtime: any = { publishMessage: jest.fn(), publishChannel: jest.fn() };
    return { ...f, realtime, http: new PlatformChatService(f.db, realtime, f.service) };
  }
  it('denies client search without customers.read and direct attachment without crm.read', async () => {
    const f = fixture('COMPANY', ['customers.read', 'crm.read']);
    await expect(f.http.searchEntities('CUSTOMER', '', 'actor')).rejects.toMatchObject({ status: 403 });
    await expect(f.http.postMessage('channel', { entities: [{ type: 'TASK', id: cardId(0) }] }, 'actor')).rejects.toMatchObject({ status: 403 });
    expect(f.db.customer.findMany).not.toHaveBeenCalled(); expect(f.db.crmChatMessage.create).not.toHaveBeenCalled();
  });
  it('direct references cannot bypass scope just because the sender belongs to a channel', async () => {
    const f = fixture('OWN');
    await expect(f.http.postMessage('channel', { entities: [{ type: 'TASK', id: cardId(3) }] }, 'actor')).rejects.toMatchObject({ status: 404 });
    expect(f.db.crmChatMessage.create).not.toHaveBeenCalled();
  });
  it('returns a recipient-safe message after creating an ID-only attachment', async () => {
    const f = fixture(); const result = await f.http.postMessage('channel', { entities: [{ type: 'TASK', id: cardId(0) }] }, 'actor');
    expect(f.db.crmChatMessage.create.mock.calls[0][0].data.attachments.create).toEqual([{ kind: 'ENTITY', name: 'Карточка CRM', entityType: 'TASK', entityId: cardId(0) }]);
    expect(JSON.stringify(result)).not.toMatch(/stale-secret|malicious/); expect(f.realtime.publishMessage).toHaveBeenCalledWith({ id: 'message', channelId: 'channel' });
  });
  it('history uses current recipient projection before marking read', async () => {
    const f = fixture('OWN'); expect((await f.http.messages('channel', 'actor'))[0].attachments[0].restricted).toBe(true);
    expect(f.db.crmChatMember.upsert).toHaveBeenCalled();
  });
  it('multipart JSON has the same reference validation as normal messages', async () => {
    const f = fixture('OWN');
    await expect(f.http.postUpload('channel', [], '', JSON.stringify([{ type: 'TASK', id: cardId(3) }]), undefined, 'actor')).rejects.toMatchObject({ status: 404 });
    await expect(f.http.postUpload('channel', [], '', JSON.stringify(Array(9).fill({ type: 'TASK', id: cardId(0) })), undefined, 'actor')).rejects.toMatchObject({ status: 400 });
    expect(f.db.crmChatMessage.create).not.toHaveBeenCalled();
  });
  it('cannot download a disguised entity attachment or file from a deleted message', async () => {
    const f = fixture(); f.db.platformChatAttachment = { findUnique: jest.fn(async () => ({ kind: 'ENTITY', storageKey: 'never-open', message: { channelId: 'channel', deletedAt: null } })) };
    await expect(f.http.attachment('attachment', 'actor')).rejects.toMatchObject({ status: 404 });
    f.db.platformChatAttachment.findUnique.mockResolvedValue({ kind: 'FILE', storageKey: 'never-open', message: { channelId: 'channel', deletedAt: new Date() } });
    await expect(f.http.attachment('attachment', 'actor')).rejects.toMatchObject({ status: 404 });
  });
  it('unknown entity type is rejected before reading data', async () => {
    const f = fixture(); await expect(f.http.searchEntities('SECRET', '', 'actor')).rejects.toMatchObject({ status: 400 });
    expect(f.access.resolve).not.toHaveBeenCalled();
  });
});
