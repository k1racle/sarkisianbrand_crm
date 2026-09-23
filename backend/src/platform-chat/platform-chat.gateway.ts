import { Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { CrmChatType } from '@prisma/client';
import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';
import { activeSession, SessionClaims } from '../auth/active-session';
import { internalWorkspaceRoles } from '../auth/workspace-role-catalog';

type Recipient = {
  data: Record<string, any>;
  emit: (event: string, ...args: any[]) => unknown;
  disconnect: (close?: boolean) => unknown;
  join: (room: string) => unknown;
  leave: (room: string) => unknown;
};

@WebSocketGateway({ namespace: '/platform-chat', cors: { origin: true, credentials: true }, transports: ['websocket', 'polling'] })
export class PlatformChatGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, OnModuleDestroy {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(PlatformChatGateway.name);
  private sessionPoll?: ReturnType<typeof setInterval>;
  private checking = false;

  constructor(private readonly jwt: JwtService, private readonly prisma: PrismaService, private readonly config: ConfigService) {}

  afterInit(server: Server) {
    this.server = server;
    if (this.sessionPoll) clearInterval(this.sessionPoll);
    // Idle sockets disconnect within 30 seconds; every outgoing event is checked immediately.
    this.sessionPoll = setInterval(() => { void this.checkConnections(); }, 30000);
    this.sessionPoll.unref();
  }

  onModuleDestroy() { if (this.sessionPoll) clearInterval(this.sessionPoll); }

  private reject(client: Recipient) {
    client.emit('platform-chat:error', { message: 'Сессия чата завершена. Войдите снова.' });
    client.disconnect(true);
  }

  private async authorize(client: Recipient) {
    try {
      const account = await activeSession(this.prisma, client.data.sessionClaims as SessionClaims);
      if (!internalWorkspaceRoles.includes(account.role)) throw new Error('Not an employee');
      client.data.userId = account.id;
      return account;
    } catch { this.reject(client); return null; }
  }

  private channelAccess(channelId: string, userId: string) {
    return this.prisma.crmChatChannel.findFirst({ where: {
      id: channelId, isArchived: false,
      OR: [{ type: CrmChatType.TEAM }, { createdById: userId }, { members: { some: { userId } } }],
    }, select: { id: true } });
  }

  private async checkConnections() {
    if (!this.server || this.checking) return;
    this.checking = true;
    try { await Promise.all((await this.server.fetchSockets()).map(client => this.authorize(client))); }
    catch { this.logger.warn('Не удалось проверить соединения чата'); }
    finally { this.checking = false; }
  }

  async handleConnection(client: Socket) {
    try {
      const header = client.handshake.headers.authorization;
      const token = String(client.handshake.auth?.token || (header?.startsWith('Bearer ') ? header.slice(7) : ''));
      const payload = await this.jwt.verifyAsync<SessionClaims>(token, { secret: this.config.getOrThrow('JWT_SECRET') });
      client.data.sessionClaims = { sub: payload.sub, sid: payload.sid, exp: payload.exp };
      const user = await this.authorize(client);
      if (!user) return;
      await client.join('staff');
      await client.join(`user:${user.id}`);
      const channels = await this.prisma.crmChatChannel.findMany({ where: { isArchived: false, OR: [{ type: CrmChatType.TEAM }, { createdById: user.id }, { members: { some: { userId: user.id } } }] }, select: { id: true } });
      await Promise.all(channels.map(channel => client.join(`channel:${channel.id}`)));
      if (await this.authorize(client)) client.emit('platform-chat:ready', { connected: true, channels: channels.map(channel => channel.id) });
    } catch { this.reject(client); }
  }

  handleDisconnect(client: Socket) {
    if (client.data.userId) this.logger.debug(`Чат: сотрудник ${client.data.userId} отключён`);
  }

  @SubscribeMessage('platform-chat:join')
  async joinChannel(@ConnectedSocket() client: Socket, @MessageBody() body: { channelId?: string }) {
    const user = await this.authorize(client);
    if (!user || typeof body?.channelId !== 'string' || !body.channelId || body.channelId.length > 100) return { success: false };
    try {
      if (!await this.channelAccess(body.channelId, user.id)) return { success: false };
      await client.join(`channel:${body.channelId}`);
      return { success: true };
    } catch { this.reject(client); return { success: false }; }
  }

  private async deliver(room: string, send: (client: Recipient, userId: string) => Promise<void>) {
    if (!this.server) return;
    try {
      const clients = await this.server.in(room).fetchSockets();
      await Promise.all(clients.map(async client => {
        const user = await this.authorize(client);
        if (!user) return;
        try { await send(client, user.id); }
        catch { this.reject(client); }
      }));
    } catch { this.logger.warn('Доставка события чата недоступна; событие не рассылается без проверки доступа'); }
  }

  async publishMessage(message: any) {
    await this.deliver(`channel:${message.channelId}`, async (client, userId) => {
      if (!await this.channelAccess(message.channelId, userId)) { await client.leave(`channel:${message.channelId}`); return; }
      client.emit('platform-chat:message', message);
    });
  }

  async publishChannel(channel: any) {
    await this.deliver('staff', async (client, userId) => {
      if (!await this.channelAccess(channel.id, userId)) { await client.leave(`channel:${channel.id}`); return; }
      await client.join(`channel:${channel.id}`);
      client.emit('platform-chat:channel', channel);
    });
  }

  async publishReminder(recipientId: string, reminder: any) {
    await this.deliver(`user:${recipientId}`, async (client, userId) => {
      if (userId === recipientId) client.emit('crm:reminder', reminder);
    });
  }
}
