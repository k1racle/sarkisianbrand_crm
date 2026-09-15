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
  if (selected) await selectChannel(selected);
}
async function selectChannel(channel: any) {
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
      <div v-if="isOpen" class="platform-chat-backdrop" @click.self="closeChat">
        <section class="platform-chat">
          <header class="chat-head">
            <div>
              <i><MessageCircle :size="18" /></i
              ><span
                ><p>ЕДИНАЯ ЭКОСИСТЕМА</p>
                <h2>Чат платформы</h2></span
              >
            </div>
            <em class="realtime-state" :class="{ connected }"
              ><i></i
              >{{ connected ? "В реальном времени" : "Подключаемся…" }}</em
            >
            <button aria-label="Закрыть чат" @click="closeChat">
              <X :size="19" />
            </button>
          </header>
          <WorkspaceLoading v-if="loading" label="Открываем чат платформы" />
          <div v-else class="chat-body">
            <aside class="channels">
              <header>
                <b>Каналы</b
                ><button @click="createOpen = true"><Plus :size="15" /></button>
              </header>
              <label
                ><Search :size="14" /><input
                  v-model="channelSearch"
                  placeholder="Найти канал"
              /></label>
              <nav>
                <button
                  v-for="channel in visibleChannels"
                  :key="channel.id"
                  :class="{ active: active?.id === channel.id }"
                  @click="selectChannel(channel)"
                >
                  <i
                    ><Lock v-if="channel.type === 'PRIVATE'" :size="13" /><Hash
                      v-else
                      :size="14"
                  /></i>
                  <span
                    ><b>{{ channel.name }}</b
                    ><small>{{
                      channel.messages?.[0]?.body ||
                      channel.description ||
                      "Сообщений пока нет"
                    }}</small></span
                  >
                  <em v-if="channel.unread">{{
                    channel.unread > 99 ? "99+" : channel.unread
                  }}</em>
                </button>
              </nav>
            </aside>
            <article v-if="active" class="conversation">
              <header>
                <div>
                  <i><Hash :size="17" /></i
                  ><span
                    ><h3>{{ active.name }}</h3>
                    <small>{{ active.description }}</small></span
                  >
                </div>
                <span
                  ><Users :size="14" />{{
                    active.type === "TEAM"
                      ? "Все сотрудники"
                      : active.members?.length
                  }}</span
                >
              </header>
              <div class="message-list">
                <div
                  v-for="message in messages"
                  :key="message.id"
                  class="message"
                  :class="{ mine: message.authorId === user?.id }"
                >
                  <i>{{ initials(message.author) }}</i>
                  <section>
                    <header>
                      <b>{{ person(message.author) }}</b
                      ><time>{{ messageTime(message.createdAt) }}</time>
                    </header>
                    <p v-if="message.body">{{ message.body }}</p>
                    <div v-if="message.attachments?.length" class="attachments">
                      <template
                        v-for="item in message.attachments"
                        :key="item.id"
                      >
                        <button
                          v-if="item.kind === 'ENTITY'"
                          class="entity-card"
                          @click="openEntityCard(item)"
                        >
                          <i
                            :style="{
                              background: item.metadata?.color || '#f0f1f3',
                            }"
                            ><component
                              :is="entityIcon(item.entityType)"
                              :size="16"
                          /></i>
                          <span
                            ><small>{{ typeLabels[item.entityType] }}</small
                            ><b>{{ item.name }}</b
                            ><em>{{ item.metadata?.subtitle }}</em></span
                          >
                          <ChevronLeft :size="15" />
                        </button>
                        <button
                          v-else-if="item.kind === 'IMAGE'"
                          class="image-card"
                          @click="downloadAttachment(item)"
                        >
                          <img
                            v-if="mediaUrls[item.id]"
                            :src="mediaUrls[item.id]"
                            :alt="item.name"
                          />
                          <span v-else
                            ><ImageIcon :size="20" />Загружаем изображение</span
                          >
                          <small
                            >{{ item.name }} ·
                            {{ formatSize(item.size) }}</small
                          >
                        </button>
                        <audio
                          v-else-if="
                            item.kind === 'AUDIO' && mediaUrls[item.id]
                          "
                          controls
                          preload="metadata"
                          :src="mediaUrls[item.id]"
                        ></audio>
                        <button
                          v-else
                          class="file-card"
                          @click="downloadAttachment(item)"
                        >
                          <i><FileText :size="18" /></i
                          ><span
                            ><b>{{ item.name }}</b
                            ><small>{{ formatSize(item.size) }}</small></span
                          ><Download :size="15" />
                        </button>
                      </template>
                    </div>
                  </section>
                </div>
                <div v-if="!messages.length" class="empty">
                  <MessageCircle :size="34" /><b>Начните обсуждение</b
                  ><span
                    >Напишите первое сообщение в канале «{{
                      active.name
                    }}»</span
                  >
                </div>
              </div>
              <div class="composer">
                <div v-if="files.length || entities.length" class="pending">
                  <span
                    v-for="(item, index) in files"
                    :key="item.id"
                    :class="{ preview: item.previewUrl }"
                  >
                    <img
                      v-if="item.file.type.startsWith('image/')"
                      :src="item.previewUrl"
                      :alt="item.file.name"
                    />
                    <audio
                      v-else-if="item.file.type.startsWith('audio/')"
                      :src="item.previewUrl"
                      controls
                      preload="metadata"
                    />
                    <Paperclip v-else :size="12" />
                    <em
                      >{{ item.file.name }} ·
                      {{ formatSize(item.file.size) }}</em
                    >
                    <button @click="removeQueuedFile(index)">
                      <X :size="12" />
                    </button>
                  </span>
                  <span
                    v-for="entity in entities"
                    :key="entity.type + entity.id"
                    ><component :is="entityIcon(entity.type)" :size="12" />{{
                      entity.name || entity.title
                    }}<button
                      @click="
                        entities = entities.filter((item) => item !== entity)
                      "
                    >
                      <X :size="12" /></button
                  ></span>
                </div>
                <div v-if="error" class="composer-error">{{ error }}</div>
                <div v-if="recording" class="recording">
                  <i></i><b>Запись голосового сообщения</b
                  ><time>{{ recordingTime() }}</time
                  ><button @click="toggleRecording">
                    <Square :size="14" />Завершить
                  </button>
                </div>
                <textarea
                  v-else
                  v-model="text"
                  placeholder="Написать сообщение…"
                  @keydown.enter.exact.prevent="send"
                ></textarea>
                <footer>
                  <input
                    ref="fileInput"
                    type="file"
                    multiple
                    hidden
                    @change="chooseFiles"
                  />
                  <button
                    title="Прикрепить файл до 10 МБ"
                    @click="fileInput?.click()"
                  >
                    <Paperclip :size="17" />
                  </button>
                  <button
                    title="Прикрепить карточку"
                    :class="{ active: entityOpen }"
                    @click="openEntities"
                  >
                    <Archive :size="17" />
                  </button>
                  <button
                    title="Добавить смайлик"
                    :class="{ active: emojiOpen }"
                    @click="
                      emojiOpen = !emojiOpen;
                      entityOpen = false;
                    "
                  >
                    <Smile :size="18" />
                  </button>
                  <button
                    title="Записать голосовое"
                    :class="{ recording }"
                    @click="toggleRecording"
                  >
                    <Mic :size="18" />
                  </button>
                  <span>Enter — отправить · Shift+Enter — новая строка</span>
                  <button class="send" :disabled="sending" @click="send">
                    <Send :size="17" />
                  </button>
                </footer>
                <div v-if="emojiOpen" class="emoji-picker">
                  <button v-for="emoji in emojis" @click="addEmoji(emoji)">
                    {{ emoji }}
                  </button>
                </div>
                <div v-if="entityOpen" class="entity-picker">
                  <header>
                    <b>Прикрепить карточку</b
                    ><button @click="entityOpen = false">
                      <X :size="15" />
                    </button>
                  </header>
                  <nav>
                    <button
                      v-for="type in entityTypes"
                      :class="{ active: entityType === type.id }"
                      @click="switchEntityType(type.id)"
                    >
                      <component :is="type.icon" :size="14" />{{ type.label }}
                    </button>
                  </nav>
                  <label
                    ><Search :size="14" /><input
                      v-model="entitySearch"
                      placeholder="Поиск"
                      @input="delayedEntitySearch"
                  /></label>
                  <div>
                    <button
                      v-for="item in entityResults"
                      @click="attachEntity(item)"
                    >
                      <i><component :is="entityIcon(item.type)" :size="15" /></i
                      ><span
                        ><b>{{ item.title }}</b
                        ><small>{{ item.subtitle }}</small></span
                      ><Plus :size="14" />
                    </button>
                    <p v-if="!entityLoading && !entityResults.length">
                      Ничего не найдено
                    </p>
                  </div>
                </div>
              </div>
            </article>
            <article v-else class="no-channel">Выберите рабочий канал</article>
          </div>
        </section>
        <div v-if="createOpen" class="modal" @click.self="createOpen = false">
          <form @submit.prevent="createChannel">
            <header>
              <div>
                <p>НОВЫЙ КАНАЛ</p>
                <h3>Создать обсуждение</h3>
              </div>
              <button type="button" @click="createOpen = false">
                <X :size="17" />
              </button>
            </header>
            <div>
              <label
                >Название<input v-model="draftChannel.name" required /></label
              ><label
                >Описание<textarea
                  v-model="draftChannel.description"
                  rows="3"
                /></label
              ><label
                >Доступ<select v-model="draftChannel.type">
                  <option value="TEAM">Все сотрудники</option>
                  <option value="PRIVATE">Только участники</option>
                </select></label
              ><label v-if="draftChannel.type === 'PRIVATE'"
                >Участники<select v-model="draftChannel.memberIds" multiple>
                  <option v-for="member in team" :value="member.id">
                    {{ person(member) }}
                  </option>
                </select></label
              >
            </div>
            <footer>
              <button type="button" @click="createOpen = false">Отмена</button
              ><button>Создать канал</button>
            </footer>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.chat-head > .realtime-state {
  margin-left: auto;
  margin-right: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  color: #8b8f98;
  font-size: 8px;
  font-style: normal;
}
.chat-head > .realtime-state > i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #c6c9cf;
}
.chat-head > .realtime-state.connected {
  color: #2d9568;
}
.chat-head > .realtime-state.connected > i {
  background: #2d9568;
  box-shadow: 0 0 0 4px #2d95681a;
}
.platform-chat-backdrop {
  position: fixed;
  z-index: 900;
  inset: 0;
  background: #0005;
  font-family: var(--sb-font);
  color: var(--sb-ink);
}
.platform-chat {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: min(980px, calc(100vw - 72px));
  background: #fff;
  box-shadow: -18px 0 60px #0003;
  display: grid;
  grid-template-rows: 72px 1fr;
}
.chat-head {
  padding: 0 19px;
  border-bottom: 1px solid var(--sb-line);
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.chat-head > div {
  display: flex;
  align-items: center;
  gap: 11px;
}
.chat-head > div > i {
  width: 36px;
  height: 36px;
  background: #1d1e22;
  color: #fff;
  display: grid;
  place-items: center;
}
.chat-head span {
  display: grid;
  gap: 4px;
}
.chat-head p {
  margin: 0;
  color: var(--sb-coral);
  font-size: 7px;
  letter-spacing: 0.15em;
}
.chat-head h2 {
  font-size: 16px;
  margin: 0;
}
.chat-head > button,
.conversation > header button {
  border: 0;
  background: none;
  width: 36px;
  height: 36px;
}
.chat-body {
  min-height: 0;
  display: grid;
  grid-template-columns: 245px 1fr;
}
.channels {
  border-right: 1px solid var(--sb-line);
  padding: 13px 10px;
  min-width: 0;
}
.channels > header {
  height: 36px;
  padding: 0 7px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.channels > header > b {
  font-size: 12px;
}
.channels > header button {
  width: 28px;
  height: 28px;
  border: 0;
  background: #1d1e22;
  color: #fff;
}
.channels > label,
.entity-picker > label {
  height: 34px;
  background: #f1f2f4;
  padding: 0 9px;
  display: flex;
  align-items: center;
  gap: 7px;
  color: #888;
}
.channels input,
.entity-picker input {
  border: 0;
  background: none;
  outline: 0;
  width: 100%;
  font: 9px var(--sb-font);
}
.channels nav {
  display: grid;
  margin-top: 9px;
}
.channels nav > button {
  height: 58px;
  border: 0;
  background: #fff;
  color: #333;
  border-radius: 6px;
  padding: 0 8px;
  display: grid;
  grid-template-columns: 28px 1fr auto;
  gap: 8px;
  align-items: center;
  text-align: left;
}
.channels nav > button:hover,
.channels nav > button.active {
  background: #f0f1f3;
}
.channels nav > button > i {
  width: 27px;
  height: 27px;
  background: #e3e5e8;
  display: grid;
  place-items: center;
  font-style: normal;
}
.channels nav span {
  display: grid;
  gap: 4px;
  min-width: 0;
}
.channels nav b {
  font-size: 9px;
}
.channels nav small {
  font-size: 7px;
  color: #898c92;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.channels nav em {
  min-width: 18px;
  height: 18px;
  border-radius: 10px;
  background: var(--sb-coral);
  color: #fff;
  display: grid;
  place-items: center;
  font-style: normal;
  font-size: 7px;
}
.conversation {
  min-width: 0;
  min-height: 0;
  display: grid;
  grid-template-rows: 60px 1fr auto;
}
.conversation > header {
  padding: 0 16px;
  border-bottom: 1px solid var(--sb-line);
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.conversation > header > div {
  display: flex;
  align-items: center;
  gap: 9px;
}
.conversation > header > div > i {
  width: 32px;
  height: 32px;
  background: #1d1e22;
  color: #fff;
  display: grid;
  place-items: center;
}
.conversation h3 {
  font-size: 12px;
  margin: 0 0 3px;
}
.conversation header small {
  font-size: 7px;
  color: #898c92;
}
.conversation > header > span {
  display: flex;
  align-items: center;
  gap: 5px;
  color: #777;
  font-size: 8px;
}
.message-list {
  min-height: 0;
  overflow: auto;
  background: #f6f7f8;
  padding: 18px 5%;
}
.message {
  display: grid;
  grid-template-columns: 30px minmax(180px, 560px);
  gap: 8px;
  margin-bottom: 13px;
}
.message > i {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: #292b2f;
  color: #fff;
  display: grid;
  place-items: center;
  font-style: normal;
  font-size: 8px;
}
.message > section {
  background: #fff;
  border: 1px solid #e2e4e7;
  padding: 9px 11px;
  min-width: 0;
}
.message.mine {
  justify-content: end;
  grid-template-columns: minmax(180px, 560px) 30px;
}
.message.mine > i {
  grid-column: 2;
}
.message.mine > section {
  grid-column: 1;
  grid-row: 1;
  background: #fff4f1;
  border-color: #efd5cf;
}
.message section > header {
  display: flex;
  align-items: center;
  gap: 9px;
}
.message section > header b {
  font-size: 8px;
}
.message section > header time {
  font-size: 7px;
  color: #999;
}
.message section > p {
  font-size: 10px;
  line-height: 1.55;
  margin: 7px 0;
  white-space: pre-wrap;
}
.attachments {
  display: grid;
  gap: 7px;
  margin-top: 7px;
}
.image-card {
  padding: 0;
  border: 0;
  background: #eef0f2;
  text-align: left;
  max-width: 390px;
  overflow: hidden;
}
.image-card img {
  display: block;
  max-width: 100%;
  max-height: 300px;
  object-fit: contain;
}
.image-card > span {
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #888;
  font-size: 8px;
}
.image-card small {
  display: block;
  padding: 7px 9px;
  color: #777;
  font-size: 7px;
}
.attachments audio {
  width: min(340px, 100%);
  height: 36px;
}
.file-card,
.entity-card {
  border: 1px solid #e1e3e6;
  background: #fff;
  min-height: 54px;
  padding: 8px;
  display: grid;
  grid-template-columns: 35px 1fr 18px;
  align-items: center;
  gap: 8px;
  text-align: left;
}
.file-card > i,
.entity-card > i {
  width: 34px;
  height: 34px;
  background: #eff1f3;
  display: grid;
  place-items: center;
  font-style: normal;
}
.file-card > span,
.entity-card > span {
  display: grid;
  gap: 3px;
  min-width: 0;
}
.file-card b,
.entity-card b {
  font-size: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.file-card small,
.entity-card small,
.entity-card em {
  font-size: 7px;
  color: #858991;
  font-style: normal;
}
.entity-card > svg {
  transform: rotate(180deg);
}
.empty,
.no-channel {
  height: 100%;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 8px;
  color: #92959b;
}
.empty b {
  font-size: 11px;
}
.empty span {
  font-size: 8px;
}
.composer {
  position: relative;
  border-top: 1px solid var(--sb-line);
  padding: 9px 12px;
}
.composer textarea {
  width: 100%;
  height: 52px;
  border: 1px solid var(--sb-line);
  padding: 9px;
  resize: none;
  box-sizing: border-box;
  font: 10px var(--sb-font);
  outline: 0;
}
.composer > footer {
  display: flex;
  align-items: center;
  gap: 2px;
  padding-top: 6px;
}
.composer > footer > button {
  width: 31px;
  height: 31px;
  border: 0;
  background: #fff;
  color: #777;
}
.composer > footer > button:hover,
.composer > footer > button.active {
  background: #f0f1f3;
  color: #222;
}
.composer > footer > button.recording {
  color: #c84c3e;
}
.composer > footer > span {
  font-size: 7px;
  color: #999;
  margin-left: 5px;
}
.composer > footer > .send {
  margin-left: auto !important;
  background: #1d1e22 !important;
  color: #fff !important;
  width: 38px !important;
}
.pending {
  display: flex;
  gap: 7px;
  flex-wrap: wrap;
  margin-bottom: 6px;
}
.pending > span {
  min-height: 25px;
  background: #f0f1f3;
  padding: 4px 5px 4px 8px;
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 7px;
  max-width: 300px;
}
.pending > span.preview {
  display: grid;
  grid-template-columns: auto 1fr 20px;
}
.pending > span > img {
  width: 58px;
  height: 44px;
  object-fit: cover;
  background: #e2e4e7;
}
.pending > span > audio {
  width: 210px;
  height: 32px;
}
.pending > span > em {
  font-style: normal;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.pending > span > button {
  border: 0;
  background: none;
  height: 20px;
  padding: 0;
}
.composer-error {
  font-size: 8px;
  color: #b64e3d;
  background: #fff0ed;
  padding: 7px;
  margin-bottom: 6px;
}
.recording {
  height: 52px;
  border: 1px solid #eccbc6;
  background: #fff7f5;
  display: flex;
  align-items: center;
  padding: 0 11px;
  gap: 8px;
}
.recording > i {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #d24d3f;
  animation: pulse 1s infinite;
}
.recording b {
  font-size: 9px;
}
.recording time {
  margin-left: auto;
  font-size: 10px;
}
.recording button {
  height: 30px;
  border: 0;
  background: #1d1e22;
  color: #fff;
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 8px;
}
.emoji-picker,
.entity-picker {
  position: absolute;
  left: 12px;
  bottom: 48px;
  background: #fff;
  border: 1px solid var(--sb-line);
  box-shadow: 0 12px 35px #0002;
  z-index: 4;
}
.emoji-picker {
  width: 260px;
  padding: 8px;
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 2px;
}
.emoji-picker button {
  height: 34px;
  border: 0;
  background: #fff;
  font-size: 18px;
}
.emoji-picker button:hover {
  background: #f0f1f3;
}
.entity-picker {
  width: 390px;
  max-height: 430px;
  display: grid;
  grid-template-rows: 45px auto 34px 1fr;
}
.entity-picker > header {
  padding: 0 11px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #eee;
}
.entity-picker > header b {
  font-size: 10px;
}
.entity-picker > header button {
  border: 0;
  background: none;
}
.entity-picker > nav {
  display: flex;
  overflow: auto;
  padding: 6px;
}
.entity-picker > nav button {
  height: 30px;
  border: 0;
  background: #fff;
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 0 8px;
  font-size: 7px;
  white-space: nowrap;
}
.entity-picker > nav button.active {
  background: #1d1e22;
  color: #fff;
}
.entity-picker > div {
  overflow: auto;
  padding: 6px;
}
.entity-picker > div > button {
  width: 100%;
  min-height: 47px;
  border: 0;
  background: #fff;
  display: grid;
  grid-template-columns: 30px 1fr 18px;
  gap: 8px;
  align-items: center;
  text-align: left;
  padding: 6px;
}
.entity-picker > div > button:hover {
  background: #f3f4f5;
}
.entity-picker > div > button > i {
  width: 29px;
  height: 29px;
  background: #e8eaed;
  display: grid;
  place-items: center;
}
.entity-picker > div span {
  display: grid;
  gap: 3px;
}
.entity-picker > div b {
  font-size: 8px;
}
.entity-picker > div small {
  font-size: 7px;
  color: #888;
}
.entity-picker > div p {
  font-size: 8px;
  color: #888;
  padding: 12px;
}
.modal {
  position: fixed;
  z-index: 950;
  inset: 0;
  background: #0006;
  display: grid;
  place-items: center;
}
.modal form {
  width: min(440px, 92vw);
  background: #fff;
}
.modal form > header {
  padding: 18px 21px;
  border-bottom: 1px solid var(--sb-line);
  display: flex;
  justify-content: space-between;
}
.modal form > header p {
  font-size: 8px;
  letter-spacing: 0.14em;
  color: var(--sb-coral);
  margin: 0 0 6px;
}
.modal h3 {
  font-size: 18px;
  margin: 0;
}
.modal form > header button {
  border: 0;
  background: none;
}
.modal form > div {
  padding: 18px 21px;
  display: grid;
  gap: 11px;
}
.modal label {
  display: grid;
  gap: 5px;
  font-size: 8px;
  color: #777;
}
.modal input,
.modal textarea,
.modal select {
  border: 1px solid var(--sb-line);
  padding: 9px;
  font: 9px var(--sb-font);
  background: #fff;
}
.modal form > footer {
  padding: 12px 21px;
  border-top: 1px solid var(--sb-line);
  display: flex;
  justify-content: flex-end;
  gap: 7px;
}
.modal form > footer button {
  height: 35px;
  border: 1px solid var(--sb-line);
  background: #fff;
  padding: 0 12px;
  font-size: 8px;
}
.modal form > footer button:last-child {
  background: #1d1e22;
  color: #fff;
}
.chat-enter-active,
.chat-leave-active {
  transition: opacity 0.18s;
}
.chat-enter-active .platform-chat,
.chat-leave-active .platform-chat {
  transition: transform 0.22s;
}
.chat-enter-from,
.chat-leave-to {
  opacity: 0;
}
.chat-enter-from .platform-chat,
.chat-leave-to .platform-chat {
  transform: translateX(100%);
}
@keyframes pulse {
  50% {
    opacity: 0.35;
  }
}
@media (max-width: 720px) {
  .platform-chat {
    width: 100vw;
  }
  .chat-body {
    grid-template-columns: 72px 1fr;
  }
  .channels {
    padding: 8px;
  }
  .channels > header > b,
  .channels > label,
  .channels nav span,
  .channels nav em {
    display: none;
  }
  .channels > header {
    justify-content: center;
  }
  .channels nav > button {
    grid-template-columns: 1fr;
    padding: 0;
  }
  .channels nav > button > i {
    margin: auto;
  }
  .message-list {
    padding: 12px;
  }
  .composer > footer > span {
    display: none;
  }
  .entity-picker {
    width: calc(100vw - 105px);
  }
}
</style>
