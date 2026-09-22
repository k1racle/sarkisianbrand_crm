<script setup lang="ts">
import {
  Archive,
  Boxes,
  Building2,
  ChevronLeft,
  Download,
  FileText,
  Hash,
  Image as ImageIcon,
  Lock,
  MessageCircle,
  Mic,
  Paperclip,
  Plus,
  Search,
  Send,
  Smile,
  Square,
  Target,
  UserRound,
  Users,
  X,
} from "@lucide/vue";

const config = useRuntimeConfig();
const { token, user } = useWorkspaceSession();
const {
  isOpen,
  closeChat,
  unread,
  connected,
  refreshUnread,
  lastMessage,
  lastChannel,
  connectRealtime,
  joinRealtimeChannel,
} = usePlatformChat();
const channels = ref<any[]>([]);
const messages = ref<any[]>([]);
const team = ref<any[]>([]);
const active = ref<any>(null);
const text = ref("");
const channelSearch = ref("");
const loading = ref(false);
const sending = ref(false);
const error = ref("");
const emojiOpen = ref(false);
const entityOpen = ref(false);
const createOpen = ref(false);
const mobileChannels = ref(false);
const { panel: chatPanel, keyboard: chatKeyboard } = useCatalogDialog(computed(() => isOpen.value), closeChat);
function chatKeys(event: KeyboardEvent) {
  if (!createOpen.value) chatKeyboard(event);
}
type QueuedFile = { id: string; file: File; previewUrl?: string };
const files = ref<QueuedFile[]>([]);
const entities = ref<any[]>([]);
const entityType = ref("TASK");
const entitySearch = ref("");
const entityResults = ref<any[]>([]);
const entityLoading = ref(false);
const mediaUrls = reactive<Record<string, string>>({});
const fileInput = ref<HTMLInputElement | null>(null);
const draftChannel = reactive<any>({
  name: "",
  description: "",
  type: "TEAM",
  memberIds: [],
});
const recording = ref(false);
const recordSeconds = ref(0);
let recorder: MediaRecorder | null = null;
let recordStream: MediaStream | null = null;
let recordChunks: Blob[] = [];
let recordTimer: ReturnType<typeof setInterval> | undefined;
let poll: ReturnType<typeof setInterval> | undefined;
let entityDebounce: ReturnType<typeof setTimeout> | undefined;

const headers = computed(() => ({ Authorization: `Bearer ${token.value}` }));
const visibleChannels = computed(() =>
  channels.value.filter(
    (channel) =>
      !channelSearch.value ||
      `${channel.name} ${channel.description || ""}`
        .toLowerCase()
        .includes(channelSearch.value.toLowerCase()),
  ),
);
const emojis = [
  "😀",
  "😂",
  "😊",
  "😍",
  "🥰",
  "😎",
  "🤔",
  "👍",
  "👏",
  "🙌",
  "🔥",
  "❤️",
  "✅",
  "🎉",
  "💪",
  "🙏",
  "👀",
  "📌",
  "💼",
  "🚀",
  "✨",
  "😅",
  "😢",
  "😡",
];
const entityTypes = [
  { id: "TASK", label: "Задачи", icon: Archive },
  { id: "CUSTOMER", label: "Клиенты", icon: UserRound },
  { id: "STAGE", label: "Этапы продаж", icon: Target },
  { id: "PRODUCT", label: "Товары", icon: Boxes },
];
const typeLabels: Record<string, string> = {
  TASK: "Задача",
  CUSTOMER: "Клиент",
  STAGE: "Этап продаж",
  PRODUCT: "Товар",
};

function person(value: any) {
  return (
    [value?.firstName, value?.lastName].filter(Boolean).join(" ") ||
    value?.email ||
    "Сотрудник"
  );
}
function initials(value: any) {
  return person(value)
    .split(/\s+/)
    .map((part: string) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
function messageTime(value: string) {
  const date = new Date(value);
  return date.toDateString() === new Date().toDateString()
    ? date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString("ru-RU", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
}
function formatSize(value = 0) {
  return value < 1024 * 1024
    ? `${Math.max(1, Math.round(value / 1024))} КБ`
    : `${(value / 1024 / 1024).toFixed(1)} МБ`;
}
function recordingTime() {
  return `${String(Math.floor(recordSeconds.value / 60)).padStart(2, "0")}:${String(recordSeconds.value % 60).padStart(2, "0")}`;
}

async function loadChannels(preserve = true) {
  const [channelRows, teamRows] = await Promise.all([
    $fetch<any[]>("/platform-chat/channels", {
      baseURL: config.public.apiBase,
      headers: headers.value,
    }),
    $fetch<any[]>("/platform-chat/team", {
      baseURL: config.public.apiBase,
      headers: headers.value,
    }),
  ]);
  channels.value = channelRows;
  team.value = teamRows;
  unread.value = channelRows.reduce((sum, channel) => sum + channel.unread, 0);
  const selected =
    preserve && active.value
      ? channelRows.find((channel) => channel.id === active.value.id)
      : channelRows[0];
  if (selected) await selectChannel(selected, false);
}
async function selectChannel(channel: any, showConversation = true) {
  if (showConversation) mobileChannels.value = false;
  active.value = channel;
  joinRealtimeChannel(channel.id);
  messages.value = await $fetch<any[]>(
    `/platform-chat/channels/${channel.id}/messages`,
    { baseURL: config.public.apiBase, headers: headers.value },
  );
  const local = channels.value.find((item) => item.id === channel.id);
  if (local) local.unread = 0;
  unread.value = channels.value.reduce((sum, item) => sum + item.unread, 0);
  await hydrateMedia(messages.value);
  nextTick(scrollBottom);
}
async function refreshMessages() {
  if (!active.value || sending.value) return;
  const rows = await $fetch<any[]>(
    `/platform-chat/channels/${active.value.id}/messages`,
    { baseURL: config.public.apiBase, headers: headers.value },
  );
  if (
    JSON.stringify(rows.map((item) => item.id)) !==
    JSON.stringify(messages.value.map((item) => item.id))
  ) {
    messages.value = rows;
    await hydrateMedia(rows);
    nextTick(scrollBottom);
  }
}
function scrollBottom() {
  const list = document.querySelector(".platform-chat .message-list");
  if (list) list.scrollTop = list.scrollHeight;
}
async function hydrateMedia(rows: any[]) {
  const attachments = rows
    .flatMap((message) => message.attachments || [])
    .filter(
      (item: any) =>
        ["IMAGE", "AUDIO"].includes(item.kind) && !mediaUrls[item.id],
    );
  await Promise.all(
    attachments.map(async (item: any) => {
      try {
        const response = await fetch(
          `${config.public.apiBase}/platform-chat/attachments/${item.id}`,
          { headers: headers.value },
        );
        if (response.ok)
          mediaUrls[item.id] = URL.createObjectURL(await response.blob());
      } catch {
        /* карточка сообщения остаётся доступной без предпросмотра */
      }
    }),
  );
}
async function send() {
  if (
    !active.value ||
    sending.value ||
    (!text.value.trim() && !files.value.length && !entities.value.length)
  )
    return;
  sending.value = true;
  error.value = "";
  try {
    if (files.value.length) {
      const form = new FormData();
      files.value.forEach((item) =>
        form.append("files", item.file, item.file.name),
      );
      if (text.value.trim()) form.append("body", text.value.trim());
      if (entities.value.length)
        form.append(
          "entities",
          JSON.stringify(
            entities.value.map((item) => ({ type: item.type, id: item.id })),
          ),
        );
      await $fetch(
        `/platform-chat/channels/${active.value.id}/messages/upload`,
        {
          baseURL: config.public.apiBase,
          method: "POST",
          headers: headers.value,
          body: form,
        },
      );
    } else {
      await $fetch(`/platform-chat/channels/${active.value.id}/messages`, {
        baseURL: config.public.apiBase,
        method: "POST",
        headers: { ...headers.value, "Content-Type": "application/json" },
        body: {
          body: text.value,
          entities: entities.value.map((item) => ({
            type: item.type,
            id: item.id,
          })),
        },
      });
    }
    text.value = "";
    clearQueuedFiles();
    entities.value = [];
    emojiOpen.value = false;
    entityOpen.value = false;
    await refreshMessages();
    await loadChannels(true);
  } catch (exception: any) {
    error.value = exception?.data?.message || "Не удалось отправить сообщение";
  } finally {
    sending.value = false;
  }
}
function chooseFiles(event: Event) {
  const selected = Array.from((event.target as HTMLInputElement).files || []);
  error.value = "";
  selected.forEach(queueFile);
  if (fileInput.value) fileInput.value.value = "";
}
function queueFile(file: File) {
  if (file.size > 10 * 1024 * 1024) {
    error.value = `Файл «${file.name}» больше 10 МБ`;
    return;
  }
  if (files.value.length >= 8) {
    error.value = "К одному сообщению можно прикрепить не более 8 файлов";
    return;
  }
  const previewUrl =
    file.type.startsWith("image/") || file.type.startsWith("audio/")
      ? URL.createObjectURL(file)
      : undefined;
  files.value.push({ id: `${Date.now()}-${Math.random()}`, file, previewUrl });
}
function removeQueuedFile(index: number) {
  const [removed] = files.value.splice(index, 1);
  if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
}
function clearQueuedFiles() {
  files.value.forEach((item) => {
    if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
  });
  files.value = [];
}
async function downloadAttachment(item: any) {
  const response = await fetch(
    `${config.public.apiBase}/platform-chat/attachments/${item.id}`,
    { headers: headers.value },
  );
  if (!response.ok) {
    error.value = "Не удалось скачать файл";
    return;
  }
  const url = URL.createObjectURL(await response.blob());
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = item.name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function addEmoji(emoji: string) {
  text.value += emoji;
  emojiOpen.value = false;
}
async function openEntities() {
  entityOpen.value = !entityOpen.value;
  emojiOpen.value = false;
  if (entityOpen.value) await loadEntities();
}
async function loadEntities() {
  entityLoading.value = true;
  try {
    entityResults.value = await $fetch<any[]>("/platform-chat/entities", {
      baseURL: config.public.apiBase,
      headers: headers.value,
      query: { type: entityType.value, search: entitySearch.value },
    });
  } finally {
    entityLoading.value = false;
  }
}
function delayedEntitySearch() {
  if (entityDebounce) clearTimeout(entityDebounce);
  entityDebounce = setTimeout(loadEntities, 250);
}
async function switchEntityType(type: string) {
  entityType.value = type;
  entitySearch.value = "";
  await loadEntities();
}
function attachEntity(item: any) {
  if (
    !entities.value.some(
      (entity) => entity.type === item.type && entity.id === item.id,
    )
  )
    entities.value.push(item);
}
async function createChannel() {
  await $fetch("/platform-chat/channels", {
    baseURL: config.public.apiBase,
    method: "POST",
    headers: headers.value,
    body: draftChannel,
  });
  Object.assign(draftChannel, {
    name: "",
    description: "",
    type: "TEAM",
    memberIds: [],
  });
  createOpen.value = false;
  await loadChannels(false);
}
async function toggleRecording() {
  if (recording.value) {
    recorder?.stop();
    return;
  }
  error.value = "";
  try {
    recordStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    recordChunks = [];
    recorder = new MediaRecorder(recordStream);
    recorder.ondataavailable = (event) => {
      if (event.data.size) recordChunks.push(event.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(recordChunks, {
        type: recorder?.mimeType || "audio/webm",
      });
      queueFile(
        new File(
          [blob],
          `Голосовое ${new Date().toLocaleTimeString("ru-RU").replace(/:/g, "-")}.webm`,
          { type: blob.type },
        ),
      );
      stopRecordingState();
    };
    recorder.start();
    recording.value = true;
    recordSeconds.value = 0;
    recordTimer = setInterval(() => (recordSeconds.value += 1), 1000);
  } catch {
    error.value =
      "Разрешите браузеру доступ к микрофону для записи голосового сообщения";
  }
}
function stopRecordingState() {
  recording.value = false;
  if (recordTimer) clearInterval(recordTimer);
  recordTimer = undefined;
  recordStream?.getTracks().forEach((track) => track.stop());
  recordStream = null;
}
function entityIcon(type: string) {
  return type === "TASK"
    ? Archive
    : type === "CUSTOMER"
      ? UserRound
      : type === "STAGE"
        ? Target
        : Boxes;
}
function openEntityCard(item: any) {
  const target = item.metadata?.url;
  if (target) {
    closeChat();
    navigateTo(target);
  }
}

watch(isOpen, async (value) => {
  if (value) {
    mobileChannels.value = false;
    connectRealtime();
    loading.value = true;
    error.value = "";
    try {
      await loadChannels();
    } catch (exception: any) {
      error.value = exception?.data?.message || "Не удалось открыть чат";
    } finally {
      loading.value = false;
    }
    if (poll) clearInterval(poll);
    poll = setInterval(refreshMessages, 60000);
  } else if (poll) {
    clearInterval(poll);
    poll = undefined;
    refreshUnread();
  }
});
watch(lastMessage, async (message) => {
  if (!message || !isOpen.value) return;
  if (message.channelId === active.value?.id) await refreshMessages();
  else await loadChannels(true);
});
watch(lastChannel, async (channel) => {
  if (channel && isOpen.value) await loadChannels(true);
});
onBeforeUnmount(() => {
  if (poll) clearInterval(poll);
  if (entityDebounce) clearTimeout(entityDebounce);
  if (recording.value) recorder?.stop();
  stopRecordingState();
  clearQueuedFiles();
  Object.values(mediaUrls).forEach((url) => URL.revokeObjectURL(url));
});
</script>

<template>
  <Teleport to="body">
    <Transition name="chat">
      <div data-v-ui-6f58f7dddb37 v-if="isOpen" class="platform-chat-backdrop admin-dialog-backdrop" @click.self="closeChat">
        <section data-v-ui-6f58f7dddb37 ref="chatPanel" class="platform-chat admin-dialog admin-dialog--chat" role="dialog" aria-modal="true" aria-label="Чат платформы" tabindex="-1" @keydown="chatKeys">
          <header data-v-ui-6f58f7dddb37 class="chat-head admin-dialog-head">
            <div data-v-ui-6f58f7dddb37>
              <button data-v-ui-6f58f7dddb37 type="button" class="chat-channel-toggle crm-button" :aria-label="mobileChannels ? 'Вернуться к переписке' : 'Показать каналы'" :aria-expanded="mobileChannels" :disabled="mobileChannels && !active" @click="mobileChannels = !mobileChannels"><ChevronLeft data-v-ui-6f58f7dddb37 v-if="mobileChannels" :size="20"/><Hash data-v-ui-6f58f7dddb37 v-else :size="20"/></button>
              <i data-v-ui-6f58f7dddb37><MessageCircle data-v-ui-6f58f7dddb37 :size="18" /></i
              ><span data-v-ui-6f58f7dddb37
                ><p data-v-ui-6f58f7dddb37>ЕДИНАЯ ЭКОСИСТЕМА</p>
                <h2 data-v-ui-6f58f7dddb37>Чат платформы</h2></span
              >
            </div>
            <em data-v-ui-6f58f7dddb37 class="realtime-state" :class="{ connected }"
              ><i data-v-ui-6f58f7dddb37></i
              >{{ connected ? "В реальном времени" : "Подключаемся…" }}</em
            >
            <button class="crm-button crm-button--icon" data-v-ui-6f58f7dddb37 aria-label="Закрыть чат" @click="closeChat">
              <X data-v-ui-6f58f7dddb37 :size="19" />
            </button>
          </header>
          <WorkspaceLoading v-if="loading" label="Открываем чат платформы" />
          <div data-v-ui-6f58f7dddb37 v-else class="chat-body" :class="{ 'chat-body--channels': mobileChannels || !active }">
            <aside data-v-ui-6f58f7dddb37 class="channels">
              <header data-v-ui-6f58f7dddb37>
                <b data-v-ui-6f58f7dddb37>Каналы</b
                ><button class="crm-button crm-button--primary crm-button--icon" data-v-ui-6f58f7dddb37 type="button" aria-label="Создать канал" @click="createOpen = true"><Plus data-v-ui-6f58f7dddb37 :size="15" /></button>
              </header>
              <label class="crm-input-group" data-v-ui-6f58f7dddb37
                ><Search data-v-ui-6f58f7dddb37 :size="14" /><input class="crm-input" data-v-ui-6f58f7dddb37
                  v-model="channelSearch"
                  placeholder="Найти канал"
              /></label>
              <nav data-v-ui-6f58f7dddb37>
                <button class="crm-button" data-v-ui-6f58f7dddb37
                  v-for="channel in visibleChannels"
                  :key="channel.id"
                  :class="{ active: active?.id === channel.id }"
                  @click="selectChannel(channel)"
                >
                  <i data-v-ui-6f58f7dddb37
                    ><Lock data-v-ui-6f58f7dddb37 v-if="channel.type === 'PRIVATE'" :size="13" /><Hash data-v-ui-6f58f7dddb37
                      v-else
                      :size="14"
                  /></i>
                  <span data-v-ui-6f58f7dddb37
                    ><b data-v-ui-6f58f7dddb37>{{ channel.name }}</b
                    ><small data-v-ui-6f58f7dddb37>{{
                      channel.messages?.[0]?.body ||
                      channel.description ||
                      "Сообщений пока нет"
                    }}</small></span
                  >
                  <em data-v-ui-6f58f7dddb37 v-if="channel.unread">{{
                    channel.unread > 99 ? "99+" : channel.unread
                  }}</em>
                </button>
              </nav>
            </aside>
            <article data-v-ui-6f58f7dddb37 v-if="active" class="conversation">
              <header data-v-ui-6f58f7dddb37>
                <div data-v-ui-6f58f7dddb37>
                  <i data-v-ui-6f58f7dddb37><Hash data-v-ui-6f58f7dddb37 :size="17" /></i
                  ><span data-v-ui-6f58f7dddb37
                    ><h3 data-v-ui-6f58f7dddb37>{{ active.name }}</h3>
                    <small data-v-ui-6f58f7dddb37>{{ active.description }}</small></span
                  >
                </div>
                <span data-v-ui-6f58f7dddb37
                  ><Users data-v-ui-6f58f7dddb37 :size="14" />{{
                    active.type === "TEAM"
                      ? "Все сотрудники"
                      : active.members?.length
                  }}</span
                >
              </header>
              <div data-v-ui-6f58f7dddb37 class="message-list">
                <div data-v-ui-6f58f7dddb37
                  v-for="message in messages"
                  :key="message.id"
                  class="message"
                  :class="{ mine: message.authorId === user?.id }"
                >
                  <i data-v-ui-6f58f7dddb37>{{ initials(message.author) }}</i>
                  <section data-v-ui-6f58f7dddb37>
                    <header data-v-ui-6f58f7dddb37>
                      <b data-v-ui-6f58f7dddb37>{{ person(message.author) }}</b
                      ><time data-v-ui-6f58f7dddb37>{{ messageTime(message.createdAt) }}</time>
                    </header>
                    <p data-v-ui-6f58f7dddb37 v-if="message.body">{{ message.body }}</p>
                    <div data-v-ui-6f58f7dddb37 v-if="message.attachments?.length" class="attachments">
                      <template
                        v-for="item in message.attachments"
                        :key="item.id"
                      >
                        <button data-v-ui-6f58f7dddb37
                          v-if="item.kind === 'ENTITY'"
                          class="entity-card crm-button"
                          @click="openEntityCard(item)"
                        >
                          <i data-v-ui-6f58f7dddb37
                            :style="{
                              background: item.metadata?.color || undefined,
                            }"
                            ><component data-v-ui-6f58f7dddb37
                              :is="entityIcon(item.entityType)"
                              :size="16"
                          /></i>
                          <span data-v-ui-6f58f7dddb37
                            ><small data-v-ui-6f58f7dddb37>{{ typeLabels[item.entityType] }}</small
                            ><b data-v-ui-6f58f7dddb37>{{ item.name }}</b
                            ><em data-v-ui-6f58f7dddb37>{{ item.metadata?.subtitle }}</em></span
                          >
                          <ChevronLeft data-v-ui-6f58f7dddb37 :size="15" />
                        </button>
                        <button data-v-ui-6f58f7dddb37
                          v-else-if="item.kind === 'IMAGE'"
                          class="image-card crm-button"
                          @click="downloadAttachment(item)"
                        >
                          <img data-v-ui-6f58f7dddb37
                            v-if="mediaUrls[item.id]"
                            :src="mediaUrls[item.id]"
                            :alt="item.name"
                          />
                          <span data-v-ui-6f58f7dddb37 v-else
                            ><ImageIcon data-v-ui-6f58f7dddb37 :size="20" />Загружаем изображение</span
                          >
                          <small data-v-ui-6f58f7dddb37
                            >{{ item.name }} ·
                            {{ formatSize(item.size) }}</small
                          >
                        </button>
                        <audio data-v-ui-6f58f7dddb37
                          v-else-if="
                            item.kind === 'AUDIO' && mediaUrls[item.id]
                          "
                          controls
                          preload="metadata"
                          :src="mediaUrls[item.id]"
                        ></audio>
                        <button data-v-ui-6f58f7dddb37
                          v-else
                          class="file-card crm-button"
                          @click="downloadAttachment(item)"
                        >
                          <i data-v-ui-6f58f7dddb37><FileText data-v-ui-6f58f7dddb37 :size="18" /></i
                          ><span data-v-ui-6f58f7dddb37
                            ><b data-v-ui-6f58f7dddb37>{{ item.name }}</b
                            ><small data-v-ui-6f58f7dddb37>{{ formatSize(item.size) }}</small></span
                          ><Download data-v-ui-6f58f7dddb37 :size="15" />
                        </button>
                      </template>
                    </div>
                  </section>
                </div>
                <div data-v-ui-6f58f7dddb37 v-if="!messages.length" class="empty">
                  <MessageCircle data-v-ui-6f58f7dddb37 :size="34" /><b data-v-ui-6f58f7dddb37>Начните обсуждение</b
                  ><span data-v-ui-6f58f7dddb37
                    >Напишите первое сообщение в канале «{{
                      active.name
                    }}»</span
                  >
                </div>
              </div>
              <div data-v-ui-6f58f7dddb37 class="composer">
                <div data-v-ui-6f58f7dddb37 v-if="files.length || entities.length" class="pending">
                  <span data-v-ui-6f58f7dddb37
                    v-for="(item, index) in files"
                    :key="item.id"
                    :class="{ preview: item.previewUrl }"
                  >
                    <img data-v-ui-6f58f7dddb37
                      v-if="item.file.type.startsWith('image/')"
                      :src="item.previewUrl"
                      :alt="item.file.name"
                    />
                    <audio data-v-ui-6f58f7dddb37
                      v-else-if="item.file.type.startsWith('audio/')"
                      :src="item.previewUrl"
                      controls
                      preload="metadata"
                    />
                    <Paperclip data-v-ui-6f58f7dddb37 v-else :size="12" />
                    <em data-v-ui-6f58f7dddb37
                      >{{ item.file.name }} ·
                      {{ formatSize(item.file.size) }}</em
                    >
                    <button class="crm-button" data-v-ui-6f58f7dddb37 @click="removeQueuedFile(index)">
                      <X data-v-ui-6f58f7dddb37 :size="12" />
                    </button>
                  </span>
                  <span data-v-ui-6f58f7dddb37
                    v-for="entity in entities"
                    :key="entity.type + entity.id"
                    ><component data-v-ui-6f58f7dddb37 :is="entityIcon(entity.type)" :size="12" />{{
                      entity.name || entity.title
                    }}<button class="crm-button" data-v-ui-6f58f7dddb37
                      @click="
                        entities = entities.filter((item) => item !== entity)
                      "
                    >
                      <X data-v-ui-6f58f7dddb37 :size="12" /></button
                  ></span>
                </div>
                <div data-v-ui-6f58f7dddb37 v-if="error" class="composer-error">{{ error }}</div>
                <div data-v-ui-6f58f7dddb37 v-if="recording" class="recording">
                  <i data-v-ui-6f58f7dddb37></i><b data-v-ui-6f58f7dddb37>Запись голосового сообщения</b
                  ><time data-v-ui-6f58f7dddb37>{{ recordingTime() }}</time
                  ><button class="crm-button" data-v-ui-6f58f7dddb37 @click="toggleRecording">
                    <Square data-v-ui-6f58f7dddb37 :size="14" />Завершить
                  </button>
                </div>
                <textarea class="crm-input" data-v-ui-6f58f7dddb37
                  v-else
                  v-model="text"
                  aria-label="Сообщение"
                  placeholder="Написать сообщение…"
                  @keydown.enter.exact.prevent="send"
                ></textarea>
                <footer data-v-ui-6f58f7dddb37>
                  <input data-v-ui-6f58f7dddb37
                    ref="fileInput"
                    type="file"
                    multiple
                    hidden
                    @change="chooseFiles"
                  />
                  <button class="crm-button" data-v-ui-6f58f7dddb37
                    title="Прикрепить файл до 10 МБ"
                    @click="fileInput?.click()"
                  >
                    <Paperclip data-v-ui-6f58f7dddb37 :size="17" />
                  </button>
                  <button class="crm-button" data-v-ui-6f58f7dddb37
                    title="Прикрепить карточку"
                    :class="{ active: entityOpen }"
                    @click="openEntities"
                  >
                    <Archive data-v-ui-6f58f7dddb37 :size="17" />
                  </button>
                  <button class="crm-button" data-v-ui-6f58f7dddb37
                    title="Добавить смайлик"
                    :class="{ active: emojiOpen }"
                    @click="
                      emojiOpen = !emojiOpen;
                      entityOpen = false;
                    "
                  >
                    <Smile data-v-ui-6f58f7dddb37 :size="18" />
                  </button>
                  <button class="crm-button" data-v-ui-6f58f7dddb37
                    title="Записать голосовое"
                    :class="{ recording }"
                    @click="toggleRecording"
                  >
                    <Mic data-v-ui-6f58f7dddb37 :size="18" />
                  </button>
                  <span data-v-ui-6f58f7dddb37>Enter — отправить · Shift+Enter — новая строка</span>
                  <button data-v-ui-6f58f7dddb37 type="button" class="send crm-button crm-button--primary crm-button--icon" aria-label="Отправить сообщение" :disabled="sending || (!text.trim() && !files.length && !entities.length)" @click="send">
                    <Send data-v-ui-6f58f7dddb37 :size="17" />
                  </button>
                </footer>
                <div data-v-ui-6f58f7dddb37 v-if="emojiOpen" class="emoji-picker">
                  <button class="crm-button" data-v-ui-6f58f7dddb37 v-for="emoji in emojis" @click="addEmoji(emoji)">
                    {{ emoji }}
                  </button>
                </div>
                <div data-v-ui-6f58f7dddb37 v-if="entityOpen" class="entity-picker">
                  <header data-v-ui-6f58f7dddb37>
                    <b data-v-ui-6f58f7dddb37>Прикрепить карточку</b
                    ><button class="crm-button" data-v-ui-6f58f7dddb37 @click="entityOpen = false">
                      <X data-v-ui-6f58f7dddb37 :size="15" />
                    </button>
                  </header>
                  <nav data-v-ui-6f58f7dddb37>
                    <button class="crm-button" data-v-ui-6f58f7dddb37
                      v-for="type in entityTypes"
                      :class="{ active: entityType === type.id }"
                      @click="switchEntityType(type.id)"
                    >
                      <component data-v-ui-6f58f7dddb37 :is="type.icon" :size="14" />{{ type.label }}
                    </button>
                  </nav>
                  <label class="crm-input-group" data-v-ui-6f58f7dddb37
                    ><Search data-v-ui-6f58f7dddb37 :size="14" /><input class="crm-input" data-v-ui-6f58f7dddb37
                      v-model="entitySearch"
                      placeholder="Поиск"
                      @input="delayedEntitySearch"
                  /></label>
                  <div data-v-ui-6f58f7dddb37>
                    <button class="crm-button" data-v-ui-6f58f7dddb37
                      v-for="item in entityResults"
                      @click="attachEntity(item)"
                    >
                      <i data-v-ui-6f58f7dddb37><component data-v-ui-6f58f7dddb37 :is="entityIcon(item.type)" :size="15" /></i
                      ><span data-v-ui-6f58f7dddb37
                        ><b data-v-ui-6f58f7dddb37>{{ item.title }}</b
                        ><small data-v-ui-6f58f7dddb37>{{ item.subtitle }}</small></span
                      ><Plus data-v-ui-6f58f7dddb37 :size="14" />
                    </button>
                    <p data-v-ui-6f58f7dddb37 v-if="!entityLoading && !entityResults.length">
                      Ничего не найдено
                    </p>
                  </div>
                </div>
              </div>
            </article>
            <article data-v-ui-6f58f7dddb37 v-else class="no-channel">Выберите рабочий канал</article>
          </div>
        </section>
        <div data-v-ui-6f58f7dddb37 v-if="createOpen" class="modal admin-dialog-backdrop admin-chat-create-layer" @click.self="createOpen = false">
          <form data-v-ui-6f58f7dddb37 class="admin-dialog admin-dialog--modal" role="dialog" aria-modal="true" aria-label="Создать обсуждение" @keydown.esc.stop.prevent="createOpen = false" @submit.prevent="createChannel">
            <header data-v-ui-6f58f7dddb37>
              <div data-v-ui-6f58f7dddb37>
                <p data-v-ui-6f58f7dddb37>НОВЫЙ КАНАЛ</p>
                <h3 data-v-ui-6f58f7dddb37>Создать обсуждение</h3>
              </div>
              <button class="crm-button crm-button--icon" data-v-ui-6f58f7dddb37 type="button" aria-label="Закрыть создание канала" @click="createOpen = false">
                <X data-v-ui-6f58f7dddb37 :size="17" />
              </button>
            </header>
            <div data-v-ui-6f58f7dddb37>
              <label data-v-ui-6f58f7dddb37
                >Название<input class="crm-input" data-v-ui-6f58f7dddb37 v-model="draftChannel.name" required /></label
              ><label data-v-ui-6f58f7dddb37
                >Описание<textarea class="crm-input" data-v-ui-6f58f7dddb37
                  v-model="draftChannel.description"
                  rows="3"
                /></label
              ><label data-v-ui-6f58f7dddb37
                >Доступ<select class="crm-input" data-v-ui-6f58f7dddb37 v-model="draftChannel.type">
                  <option data-v-ui-6f58f7dddb37 value="TEAM">Все сотрудники</option>
                  <option data-v-ui-6f58f7dddb37 value="PRIVATE">Только участники</option>
                </select></label
              ><label data-v-ui-6f58f7dddb37 v-if="draftChannel.type === 'PRIVATE'"
                >Участники<select class="crm-input" data-v-ui-6f58f7dddb37 v-model="draftChannel.memberIds" multiple>
                  <option data-v-ui-6f58f7dddb37 v-for="member in team" :value="member.id">
                    {{ person(member) }}
                  </option>
                </select></label
              >
            </div>
            <footer data-v-ui-6f58f7dddb37>
              <button class="crm-button" data-v-ui-6f58f7dddb37 type="button" @click="createOpen = false">Отмена</button
              ><button data-v-ui-6f58f7dddb37 class="primary crm-button crm-button--primary">Создать канал</button>
            </footer>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
