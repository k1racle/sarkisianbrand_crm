import { io, type Socket } from 'socket.io-client';

let realtime: Socket | null = null;
let realtimeToken = '';
let unreadVersion = 0;

export function usePlatformChat() {
  const config = useRuntimeConfig();
  const session = useWorkspaceSession();
  const { token } = session;
  const isOpen = useState<boolean>('platform-chat-open', () => false);
  const unread = useState<number>('platform-chat-unread', () => 0);
  const connected = useState<boolean>('platform-chat-connected', () => false);
  const lastMessage = useState<any>('platform-chat-last-message', () => null);
  const lastChannel = useState<any>('platform-chat-last-channel', () => null);
  const lastReminder = useState<any>('platform-chat-last-reminder', () => null);

  function openChat() { isOpen.value = true; }
  function closeChat() { isOpen.value = false; }
  function toggleChat() { isOpen.value = !isOpen.value; }
  async function refreshUnread() {
    const version = ++unreadVersion, identity = token.value;
    if (!token.value) { unread.value = 0; return; }
    try {
      const result = await $fetch<{ total: number }>('/platform-chat/unread', {
        baseURL: config.public.apiBase,
        headers: { Authorization: `Bearer ${token.value}` },
      });
      if (version === unreadVersion && token.value === identity) unread.value = result.total;
    } catch {
      if (version === unreadVersion && token.value === identity) unread.value = 0;
    }
  }

  function connectRealtime() {
    if (!import.meta.client || !token.value) return;
    if (realtime && realtimeToken === token.value) return;
    realtime?.disconnect();
    realtimeToken = token.value;
    const origin = String(config.public.apiBase).replace(/\/api\/v1\/?$/, '');
    realtime = io(`${origin}/platform-chat`, { auth: { token: token.value }, transports: ['websocket', 'polling'], reconnection: true });
    const connection = realtime, connectionToken = realtimeToken;
    const current = () => connection === realtime && token.value === connectionToken;
    realtime.on('connect', () => { if (current()) connected.value = true; });
    realtime.on('disconnect', () => { if (current()) connected.value = false; });
    realtime.on('platform-chat:error', () => {
      if (connection !== realtime) return;
      const reopen = isOpen.value;
      disconnectRealtime();
      // Expired access tokens may refresh; revoked database sessions cannot be revived.
      void session.restoreUser().then(account => {
        if (account && token.value && token.value !== connectionToken) { connectRealtime(); isOpen.value = reopen; }
      }).catch(() => { /* Stay disconnected when authorization cannot be confirmed. */ });
    });
    realtime.on('platform-chat:message', message => { if (!current()) return; lastMessage.value = { ...message, receivedAt: Date.now() }; void refreshUnread(); });
    realtime.on('platform-chat:channel', channel => { if (current()) lastChannel.value = { ...channel, receivedAt: Date.now() }; });
    realtime.on('crm:reminder', reminder => { if (current()) lastReminder.value = { ...reminder, receivedAt: Date.now() }; });
  }

  function joinRealtimeChannel(channelId: string) {
    connectRealtime();
    realtime?.emit('platform-chat:join', { channelId });
  }

  function disconnectRealtime() {
    ++unreadVersion;
    realtime?.disconnect(); realtime = null; realtimeToken = '';
    connected.value = false; isOpen.value = false; unread.value = 0;
    lastMessage.value = null; lastChannel.value = null; lastReminder.value = null;
  }

  return { isOpen, unread, connected, lastMessage, lastChannel, lastReminder, openChat, closeChat, toggleChat, refreshUnread, connectRealtime, joinRealtimeChannel, disconnectRealtime };
}
