import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CrmChatType, UserRole } from '@prisma/client';
import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';

const internalRoles: UserRole[] = [
  UserRole.ADMIN, UserRole.CONTENT_MANAGER, UserRole.MANAGER_B2B, UserRole.MANAGER_SALES,
  UserRole.MARKETPLACE_MANAGER, UserRole.SUPERVISOR, UserRole.EXECUTIVE, UserRole.IT_SUPPORT,
  UserRole.CURATOR, UserRole.WAREHOUSE,
];

@WebSocketGateway({ namespace: '/platform-chat', cors: { origin: true, credentials: true }, transports: ['websocket', 'polling'] })
export class PlatformChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(PlatformChatGateway.name);

  constructor(private readonly jwt: JwtService, private readonly prisma: PrismaService) {}

  async handleConnection(client: Socket) {
    try {
      const header = client.handshake.headers.authorization;
      const token = String(client.handshake.auth?.token || (header?.startsWith('Bearer ') ? header.slice(7) : ''));
      const payload = await this.jwt.verifyAsync<{ sub: string; role: UserRole }>(token, { secret: process.env.JWT_SECRET });
      const user = await this.prisma.user.findFirst({ where: { id: payload.sub, isActive: true, role: { in: internalRoles } }, select: { id: true } });
      if (!user) throw new Error('Пользователь не имеет доступа');
      client.data.userId = user.id;
      await client.join('staff');
      await client.join(`user:${user.id}`);
      const channels = await this.prisma.crmChatChannel.findMany({ where: { isArchived: false, OR: [{ type: CrmChatType.TEAM }, { createdById: user.id }, { members: { some: { userId: user.id } } }] }, select: { id: true } });
      await Promise.all(channels.map(channel => client.join(`channel:${channel.id}`)));
      client.emit('platform-chat:ready', { connected: true, channels: channels.map(channel => channel.id) });
    } catch {
      client.emit('platform-chat:error', { message: 'Сессия чата недействительна' });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    if (client.data.userId) this.logger.debug(`Чат: сотрудник ${client.data.userId} отключён`);
  }

  @SubscribeMessage('platform-chat:join')
  async joinChannel(@ConnectedSocket() client: Socket, @MessageBody() body: { channelId?: string }) {
    const userId = client.data.userId as string | undefined;
    if (!userId || !body?.channelId) return { success: false };
    const channel = await this.prisma.crmChatChannel.findFirst({ where: { id: body.channelId, isArchived: false, OR: [{ type: CrmChatType.TEAM }, { createdById: userId }, { members: { some: { userId } } }] }, select: { id: true } });
    if (!channel) return { success: false };
    await client.join(`channel:${channel.id}`);
    return { success: true };
  }

  publishMessage(message: any) {
    this.server?.to(`channel:${message.channelId}`).emit('platform-chat:message', message);
  }

  publishChannel(channel: any) {
    if (!this.server) return;
    if (channel.type === CrmChatType.TEAM) {
      this.server.in('staff').socketsJoin(`channel:${channel.id}`);
      this.server.to('staff').emit('platform-chat:channel', channel);
      return;
    }
    const userIds = new Set<string>([
      channel.createdById,
      ...(channel.members || []).map((member: any) => member.userId),
    ]);
    for (const userId of userIds) {
      this.server.in(`user:${userId}`).socketsJoin(`channel:${channel.id}`);
      this.server.to(`user:${userId}`).emit('platform-chat:channel', channel);
    }
  }

  publishReminder(recipientId: string, reminder: any) {
    this.server?.to(`user:${recipientId}`).emit('crm:reminder', reminder);
  }
}
