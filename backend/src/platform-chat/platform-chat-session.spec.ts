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
    const gateway = new PlatformChatGateway(jwt as any, prisma, { getOrThrow: () => 'mock-secret' } as any);
    const server: any = { fetchSockets: jest.fn().mockResolvedValue([client]), in: jest.fn().mockReturnThis() };
    gateway.server = server;
    return { gateway, client, prisma, server, jwt, claims };
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
    await f.gateway.publishReminder('employee', { id: 'reminder' });
    expect(f.client.emit).not.toHaveBeenCalledWith('crm:reminder', expect.anything());
    f.client.data.sessionClaims.exp = Math.floor(Date.now() / 1000) + 600;
    await f.gateway.publishReminder('another-user', { id: 'reminder' });
    expect(f.client.emit).not.toHaveBeenCalledWith('crm:reminder', expect.anything());
  });
  it('fails closed on database errors, without rejecting an already persisted message', async () => {
    const f = fixture(); f.prisma.session.findFirst.mockRejectedValue(new Error('Database unavailable'));
    await expect(f.gateway.publishMessage({ channelId: 'channel' })).resolves.toBeUndefined();
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
});
