import { PlatformChatGateway } from './platform-chat.gateway';

describe('Realtime session revocation and recipient access (no sockets/network)', () => {
  function fixture() {
    const claims = { sub: 'employee', sid: 'session', exp: Math.floor(Date.now() / 1000) + 600 };
    const client: any = { data: { userId: 'employee', sessionClaims: claims }, handshake: { headers: {}, auth: { token: 'mock-only' } }, join: jest.fn(), leave: jest.fn(), emit: jest.fn(), disconnect: jest.fn() };
    const prisma: any = {
      session: { findFirst: jest.fn().mockResolvedValue({ user: { id: 'employee', role: 'ADMIN', isActive: true } }) },
      crmChatChannel: { findMany: jest.fn().mockResolvedValue([{ id: 'channel' }]), findFirst: jest.fn().mockResolvedValue({ id: 'channel' }) },
    };
    const jwt = { verifyAsync: jest.fn().mockResolvedValue(claims) };
    const records: any = { message: jest.fn(async (id, channelId) => ({ id, channelId })), channels: jest.fn(async (_userId, id) => [{ id, type: 'PRIVATE' }]) };
    const gateway = new PlatformChatGateway(jwt as any, prisma, { getOrThrow: () => 'mock-secret' } as any, records);
    const server: any = { fetchSockets: jest.fn().mockResolvedValue([client]), in: jest.fn().mockReturnThis() };
    gateway.server = server;
    return { gateway, client, prisma, server, jwt, claims, records };
  }
  it('requires a current session before joining any room', async () => {
    const f = fixture(); f.prisma.session.findFirst.mockResolvedValue(null);
    await f.gateway.handleConnection(f.client);
    expect(f.client.disconnect).toHaveBeenCalledWith(true);
    expect(f.client.join).not.toHaveBeenCalled();
    expect(f.client.emit).not.toHaveBeenCalledWith('platform-chat:ready', expect.anything());
  });
  it.each([{ sid: undefined }, { exp: 1 }])('rejects missing session or expired access token at connect', async patch => {
    const f = fixture(); f.jwt.verifyAsync.mockResolvedValue({ ...f.claims, ...patch } as any);
    await f.gateway.handleConnection(f.client);
    expect(f.client.join).not.toHaveBeenCalled();
    expect(f.client.disconnect).toHaveBeenCalled();
  });
  it('does not admit a customer even with a forged/stale employee role claim', async () => {
    const f = fixture(); f.prisma.session.findFirst.mockResolvedValue({ user: { id: 'employee', role: 'CUSTOMER_B2B', isActive: true } });
    await f.gateway.handleConnection(f.client);
    expect(f.client.disconnect).toHaveBeenCalled();
    expect(f.client.join).not.toHaveBeenCalled();
  });
  it('rechecks sessions on channel subscription', async () => {
    const f = fixture(); f.prisma.session.findFirst.mockResolvedValue(null);
    expect(await f.gateway.joinChannel(f.client, { channelId: 'channel' })).toEqual({ success: false });
    expect(f.prisma.crmChatChannel.findFirst).not.toHaveBeenCalled();
    expect(f.client.join).not.toHaveBeenCalled();
  });
  it('does not deliver a message after logout or permission-change session revocation', async () => {
    const f = fixture(); f.prisma.session.findFirst.mockResolvedValue(null);
    await f.gateway.publishMessage({ id: 'message', channelId: 'channel', body: 'private' });
    expect(f.client.disconnect).toHaveBeenCalledWith(true);
    expect(f.client.emit).not.toHaveBeenCalledWith('platform-chat:message', expect.anything());
  });
  it('rechecks channel membership even for a socket still in the room', async () => {
    const f = fixture(); f.prisma.crmChatChannel.findFirst.mockResolvedValue(null);
    await f.gateway.publishMessage({ id: 'message', channelId: 'channel' });
    expect(f.client.leave).toHaveBeenCalledWith('channel:channel');
    expect(f.client.emit).not.toHaveBeenCalledWith('platform-chat:message', expect.anything());
  });
  it('only publishes channel metadata to current authorized members', async () => {
    const f = fixture(); f.prisma.crmChatChannel.findFirst.mockResolvedValue(null);
    await f.gateway.publishChannel({ id: 'private-channel', type: 'PRIVATE', members: [{ userId: 'employee' }] });
    expect(f.client.emit).not.toHaveBeenCalledWith('platform-chat:channel', expect.anything());
    f.prisma.crmChatChannel.findFirst.mockResolvedValue({ id: 'private-channel' });
    await f.gateway.publishChannel({ id: 'private-channel', type: 'PRIVATE' });
    expect(f.client.emit).toHaveBeenCalledWith('platform-chat:channel', { id: 'private-channel', type: 'PRIVATE' });
  });
  it('delivers to an authorized recipient without broadcasting to the whole room', async () => {
    const f = fixture(), message = { id: 'message', channelId: 'channel' };
    await f.gateway.publishMessage(message);
    expect(f.client.emit).toHaveBeenCalledWith('platform-chat:message', message);
    expect(f.prisma.crmChatChannel.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ isArchived: false, id: 'channel' }) }));
  });
  it('rejects reminders after token expiry and never sends them to a different user', async () => {
    const f = fixture(); f.client.data.sessionClaims.exp = 1;
    const load = jest.fn().mockResolvedValue({ id: 'reminder', task: { id: 'task', title: 'Scoped task' } });
    await f.gateway.publishReminder('employee', load);
    expect(f.client.emit).not.toHaveBeenCalledWith('crm:reminder', expect.anything());
    f.client.data.sessionClaims.exp = Math.floor(Date.now() / 1000) + 600;
    await f.gateway.publishReminder('another-user', load);
    expect(f.client.emit).not.toHaveBeenCalledWith('crm:reminder', expect.anything());
    expect(load).not.toHaveBeenCalled();
  });
  it('reloads reminder access before sending and does not emit revoked task data', async () => {
    const f = fixture(), load = jest.fn().mockResolvedValue(null);
    await f.gateway.publishReminder('employee', load);
    expect(load).toHaveBeenCalledTimes(1);
    expect(f.client.emit).not.toHaveBeenCalledWith('crm:reminder', expect.anything());
    const reminder = { id: 'reminder', task: { id: 'task', title: 'Scoped task' } };
    load.mockResolvedValue(reminder);
    await f.gateway.publishReminder('employee', load);
    expect(f.client.emit).toHaveBeenCalledWith('crm:reminder', reminder);
  });
  it('rechecks the live socket session after loading an authorized reminder', async () => {
    const f = fixture();
    await f.gateway.publishReminder('employee', async () => {
      f.prisma.session.findFirst.mockResolvedValue(null);
      return { id: 'reminder', task: { id: 'task', title: 'No longer available' } };
    });
    expect(f.client.emit).not.toHaveBeenCalledWith('crm:reminder', expect.anything());
    expect(f.client.disconnect).toHaveBeenCalledWith(true);
  });
  it('fails closed on database errors, without rejecting an already persisted message', async () => {
    const f = fixture(); f.prisma.session.findFirst.mockRejectedValue(new Error('Database unavailable'));
    await expect(f.gateway.publishMessage({ id: 'message', channelId: 'channel' })).resolves.toBeUndefined();
    expect(f.client.disconnect).toHaveBeenCalled();
    expect(f.client.emit).not.toHaveBeenCalledWith('platform-chat:message', expect.anything());
  });
  it('disconnects idle revoked sessions on the periodic check and cleans up the timer', async () => {
    jest.useFakeTimers();
    const f = fixture();
    try {
      f.prisma.session.findFirst.mockResolvedValue(null);
      f.gateway.afterInit(f.server);
      await jest.advanceTimersByTimeAsync(30000);
      expect(f.client.disconnect).toHaveBeenCalledWith(true);
      f.gateway.onModuleDestroy();
      expect(jest.getTimerCount()).toBe(0);
    } finally { f.gateway.onModuleDestroy(); jest.useRealTimers(); }
  });
  it('sends the recipient view, never the sender payload or saved entity snapshot', async () => {
    const f = fixture(), safe = { id: 'message', attachments: [{ name: 'Карточка недоступна', restricted: true }] };
    f.records.message.mockResolvedValue(safe);
    await f.gateway.publishMessage({ id: 'message', channelId: 'channel', attachments: [{ name: 'sender-secret' }] });
    expect(f.records.message).toHaveBeenCalledWith('message', 'channel', 'employee');
    expect(f.client.emit).toHaveBeenCalledWith('platform-chat:message', safe);
    expect(JSON.stringify(f.client.emit.mock.calls)).not.toContain('sender-secret');
  });
  it.each(['session', 'membership', 'deleted', 'database'])('suppresses message after %s changes during recipient projection', async change => {
    const f = fixture();
    f.records.message.mockImplementation(async () => {
      if (change === 'session') f.prisma.session.findFirst.mockResolvedValue(null);
      if (change === 'membership') f.prisma.crmChatChannel.findFirst.mockResolvedValue(null);
      if (change === 'database') throw new Error('offline');
      return change === 'deleted' ? null : { id: 'message' };
    });
    await f.gateway.publishMessage({ id: 'message', channelId: 'channel' });
    expect(f.client.emit).not.toHaveBeenCalledWith('platform-chat:message', expect.anything());
  });
  it('projects the same message independently for two recipients in one room', async () => {
    const f = fixture();
    const second = { ...f.client, data: { userId: 'second', sessionClaims: { ...f.claims, sub: 'second' } }, emit: jest.fn() };
    f.server.fetchSockets.mockResolvedValue([f.client, second]);
    f.prisma.session.findFirst.mockImplementation(async ({ where }: any) => ({ user: { id: where.userId, role: 'ADMIN', isActive: true } }));
    f.records.message.mockImplementation(async (id: string, channelId: string, actor: string) => ({
      id, channelId, attachments: [{ name: actor === 'employee' ? 'Visible to employee' : 'Карточка недоступна', restricted: actor !== 'employee' }],
    }));
    await f.gateway.publishMessage({ id: 'message', channelId: 'channel', body: 'Untrusted sender projection' });
    expect(f.records.message).toHaveBeenCalledTimes(2);
    expect(f.client.emit).toHaveBeenCalledWith('platform-chat:message', expect.objectContaining({ attachments: [{ name: 'Visible to employee', restricted: false }] }));
    expect(second.emit).toHaveBeenCalledWith('platform-chat:message', expect.objectContaining({ attachments: [{ name: 'Карточка недоступна', restricted: true }] }));
    expect(JSON.stringify(second.emit.mock.calls)).not.toContain('Visible to employee');
  });
});
