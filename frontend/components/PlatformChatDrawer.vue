<script setup lang="ts">
import {
  Archive,
  ArrowDown,
  Boxes,
  ChevronLeft,
  Download,
  FileText,
  Image as ImageIcon,
  Lock,
  MessageCircle,
  Mic,
  Paperclip,
  Pencil,
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
  activeChannelId,
  requestedChannelId,
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
watch(active, value => { activeChannelId.value = value?.id || ''; });
const text = ref("");
const channelSearch = ref("");
const loading = ref(false);
const sending = ref(false);
const messagesLoading = ref(false), creating = ref(false);
const error = ref("");
const emojiOpen = ref(false);
const attachOpen = ref(false);
const entityOpen = ref(false);
const createOpen = ref(false);
const directPicker = ref(false), directBusy = ref(false);
const historyBefore = ref(''), historyBusy = ref(false), hasOlder = ref(false);
const directCandidates = computed(() => team.value.filter(member => member.id !== user.value?.id && (!channelSearch.value || person(member).toLowerCase().includes(channelSearch.value.toLowerCase()))));
const mobileChannels = ref(false);
const { panel: chatPanel, keyboard: chatKeyboard } = useCatalogDialog(computed(() => isOpen.value), closeChat);
function chatKeys(event: KeyboardEvent) {
  if (event.key === 'Escape' && (attachOpen.value || emojiOpen.value || entityOpen.value)) {
    event.preventDefault(); event.stopPropagation(); closePopovers(); nextTick(() => composerInput.value?.focus()); return;
  }
  if (!createOpen.value) chatKeyboard(event);
}
type QueuedFile = { id: string; file: File; previewUrl?: string };
const files = ref<QueuedFile[]>([]);
const entities = ref<any[]>([]);
const drafts = new Map<string, { text: string; files: QueuedFile[]; entities: any[] }>();
const composerInput = ref<HTMLTextAreaElement | null>(null), messageList = ref<HTMLElement | null>(null);
const showLatest = ref(false);
const canSend = computed(() => !!text.value.trim() || !!files.value.length || !!entities.value.length);
const entityType = ref("TASK");
const entitySearch = ref("");
const entityResults = ref<any[]>([]);
const entityLoading = ref(false);
const entityError = ref("");
let viewEpoch = 0, channelRequest = 0, messageRequest = 0, entityRequest = 0;
const currentView = (epoch: number, identity: string) => isOpen.value && viewEpoch === epoch && token.value === identity;
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
const activityTime = (channel: any) => Date.parse(channel.messages?.[0]?.createdAt || channel.createdAt || '') || 0;
const orderedChannels = computed(() => [...channels.value].sort((a, b) =>
  activityTime(b) - activityTime(a) || a.name.localeCompare(b.name, 'ru') || a.id.localeCompare(b.id),
));
const visibleChannels = computed(() =>
  orderedChannels.value.filter(
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
function chatInitials(name: string) { return name.split(/\s+/).map(word => word[0]).slice(0, 2).join('').toUpperCase(); }
function avatarTone(name: string) { return 'chat-avatar--' + [...name].reduce((sum, letter) => sum + letter.charCodeAt(0), 0) % 5; }
function dayKey(value: string) { return new Date(value).toLocaleDateString('ru-RU'); }
function dayLabel(value: string) {
  const today = new Date(), yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
  if (dayKey(value) === dayKey(today.toISOString())) return 'Сегодня';
  if (dayKey(value) === dayKey(yesterday.toISOString())) return 'Вчера';
  return new Date(value).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', ...(new Date(value).getFullYear() !== today.getFullYear() ? { year: 'numeric' as const } : {}) });
}
function bubbleTime(value: string) { return new Date(value).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }); }
function closePopovers() { attachOpen.value = false; emojiOpen.value = false; entityOpen.value = false; }
function startMessage() { directPicker.value = true; channelSearch.value = ''; mobileChannels.value = true; }
function stashDraft() {
  if (!active.value) return;
  if (text.value || files.value.length || entities.value.length) drafts.set(active.value.id, { text: text.value, files: [...files.value], entities: [...entities.value] });
  else drafts.delete(active.value.id);
}
function restoreDraft(id: string) {
  const draft = drafts.get(id); text.value = draft?.text || ''; files.value = [...(draft?.files || [])]; entities.value = [...(draft?.entities || [])];
  nextTick(resizeComposer);
}
function clearDrafts() {
  const urls = new Set([...files.value, ...[...drafts.values()].flatMap(draft => draft.files)].map(file => file.previewUrl).filter(Boolean));
  urls.forEach(url => URL.revokeObjectURL(url!)); drafts.clear(); files.value = []; entities.value = []; text.value = '';
}
function resizeComposer() {
  const input = composerInput.value; if (!input) return;
  input.style.setProperty('--composer-height', '44px'); input.style.setProperty('--composer-height', Math.min(144, input.scrollHeight) + 'px');
}
function composerKeys(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing && !window.matchMedia('(max-width:720px)').matches) { event.preventDefault(); void send(); }
}
function trackScroll() {
  const list = messageList.value; showLatest.value = !!list && list.scrollHeight - list.scrollTop - list.clientHeight > 140;
}
function jumpToLatest() { if (historyBefore.value) void browseHistory(true); else scrollBottom(); }
watch(text, () => nextTick(resizeComposer));
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
function dialogTime(value: string) {
  const date = new Date(value);
  return date.toDateString() === new Date().toDateString()
    ? date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}
function dialogPreview(channel: any) {
  const latest = channel.messages?.[0];
  return latest?.body || (latest?.attachments?.length ? 'Вложение' : channel.description || 'Сообщений пока нет');
}
function recordingTime() {
  return `${String(Math.floor(recordSeconds.value / 60)).padStart(2, "0")}:${String(recordSeconds.value % 60).padStart(2, "0")}`;
}

async function loadChannels(preserve = true) {
  const epoch = viewEpoch, identity = token.value, version = ++channelRequest;
  try {
    const [channelRows, teamRows] = await Promise.all([
      $fetch<any[]>("/platform-chat/channels", { baseURL: config.public.apiBase, headers: headers.value }),
      $fetch<any[]>("/platform-chat/team", { baseURL: config.public.apiBase, headers: headers.value }),
    ]);
    if (!currentView(epoch, identity) || version !== channelRequest) return;
    channels.value = channelRows; team.value = teamRows;
    unread.value = channelRows.reduce((sum, channel) => sum + channel.unread, 0);
    const requested = requestedChannelId.value;
    if (requested && (sending.value || recording.value)) return;
    const selected = requested ? channelRows.find(channel => channel.id === requested) : preserve && active.value ? channelRows.find(channel => channel.id === active.value.id) : orderedChannels.value[0];
    if (selected && selected.id === active.value?.id) { active.value=selected; await refreshMessages(); }
    else if (selected) await selectChannel(selected, !!requested);
    else { ++messageRequest; active.value = null; messages.value = []; releaseMedia(); }
    if (requested) { requestedChannelId.value = ''; if (selected) mobileChannels.value = false; else error.value = 'Чат больше недоступен'; }
  } catch (exception: any) {
    if (!currentView(epoch, identity) || version !== channelRequest) return;
    channels.value = []; team.value = []; active.value = null; messages.value = []; releaseMedia();
    error.value = exception?.data?.message || "Не удалось загрузить каналы";
  }
}
async function selectChannel(channel: any, showConversation = true) {
  if (sending.value || recording.value) return;
  stashDraft(); closePopovers(); restoreDraft(channel.id);
  if (showConversation) mobileChannels.value = false;
  ++messageRequest; historyBefore.value='';hasOlder.value=false;active.value = channel; messages.value = []; releaseMedia();
  joinRealtimeChannel(channel.id);
  await refreshMessages(true);
}
async function refreshMessages(force = false) {
  if (!active.value || (sending.value && !force)) return;
  const id = active.value.id, epoch = viewEpoch, identity = token.value, version = ++messageRequest;
  const valid = () => currentView(epoch, identity) && version === messageRequest && active.value?.id === id;
  if (!messages.value.length) messagesLoading.value = true;
  try {
    const rows = await $fetch<any[]>(`/platform-chat/channels/${id}/messages`, { baseURL: config.public.apiBase, headers: headers.value,query:historyBefore.value?{before:historyBefore.value}:{} });
    if (!valid()) return;
    const changed = JSON.stringify(rows.map(item => item.id)) !== JSON.stringify(messages.value.map(item => item.id));
    const stickToBottom = force || !showLatest.value;
    // Same IDs can now contain restricted references after access was revoked.
    messages.value = rows;
    hasOlder.value=rows.length===100;
    const channel = channels.value.find(item => item.id === id);
    if (channel && !historyBefore.value) {
      channel.unread = 0;
      channel.messages = rows.length ? [rows[rows.length - 1]] : [];
    }
    unread.value = channels.value.reduce((sum, item) => sum + item.unread, 0);
    const attachmentIds = new Set(rows.flatMap(row => row.attachments || []).map(item => item.id));
    for (const [key, url] of Object.entries(mediaUrls)) if (!attachmentIds.has(key)) { URL.revokeObjectURL(url); delete mediaUrls[key]; }
    await hydrateMedia(rows, valid);
    if (valid() && changed && !historyBefore.value && stickToBottom) nextTick(scrollBottom);
  } catch (exception: any) {
    if (!valid()) return;
    messages.value = []; releaseMedia();
    error.value = exception?.data?.message || "Не удалось обновить сообщения";
  } finally { if (valid()) messagesLoading.value = false; }
}
async function browseHistory(latest=false){
  if(historyBusy.value)return;const epoch=viewEpoch,identity=token.value;historyBusy.value=true;
  historyBefore.value=latest?'':messages.value[0]?.id||'';
  try{await refreshMessages(true);if(currentView(epoch,identity)&&!latest)nextTick(()=>{const list=document.querySelector('.platform-chat .message-list');if(list)list.scrollTop=0;});}
  finally{if(currentView(epoch,identity))historyBusy.value=false;}
}
async function openDirect(member:any){
  if(directBusy.value)return;const epoch=viewEpoch,identity=token.value;directBusy.value=true;error.value='';
  try{
    const channel=await $fetch<any>('/platform-chat/direct',{baseURL:config.public.apiBase,headers:headers.value,method:'POST',body:{userId:member.id},timeout:20000,retry:0});
    if(!currentView(epoch,identity))return;
    if(!channels.value.some(row=>row.id===channel.id))channels.value.push(channel);
    directPicker.value=false;channelSearch.value='';await selectChannel(channel);
  }catch(e:any){if(currentView(epoch,identity))error.value=e?.data?.message||'Не удалось открыть личный диалог';}
  finally{if(currentView(epoch,identity))directBusy.value=false;}
}
function releaseMedia() {
  for (const [id, url] of Object.entries(mediaUrls)) { URL.revokeObjectURL(url); delete mediaUrls[id]; }
}
function clearView() {
  stashDraft(); text.value = ''; files.value = []; entities.value = []; closePopovers();
  ++viewEpoch; ++channelRequest; ++messageRequest; ++entityRequest;
  channels.value = []; messages.value = []; team.value = []; active.value = null;
  messagesLoading.value = false;
  entityResults.value = []; entities.value = []; entityError.value = ""; entityLoading.value = false; entityOpen.value = false;
  createOpen.value = false; emojiOpen.value = false;directPicker.value=false;directBusy.value=false;historyBefore.value='';historyBusy.value=false;hasOlder.value=false;
  Object.assign(draftChannel, { name: "", description: "", type: "TEAM", memberIds: [] });
  if (recorder && recorder.state !== 'inactive') { recorder.onstop = null; recorder.stop(); }
  stopRecordingState();
  if (entityDebounce) clearTimeout(entityDebounce);
  releaseMedia();
}
function scrollBottom() {
  const list = messageList.value;
  if (list) list.scrollTop = list.scrollHeight;
  showLatest.value = false;
}
async function hydrateMedia(rows: any[], valid: () => boolean) {
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
        if (response.ok) {
          const blob = await response.blob();
          if (valid()) mediaUrls[item.id] = URL.createObjectURL(blob);
        }
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
  const epoch = viewEpoch, identity = token.value, channelId = active.value.id;
  const sentFiles = [...files.value];
  const valid = () => currentView(epoch, identity) && active.value?.id === channelId;
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
    if (token.value === identity) { drafts.delete(channelId); sentFiles.forEach(file => { if (file.previewUrl) URL.revokeObjectURL(file.previewUrl); }); }
    if (!valid()) return;
    text.value = "";
    clearQueuedFiles();
    entities.value = [];
    emojiOpen.value = false;
    entityOpen.value = false;
    historyBefore.value='';
    await refreshMessages(true);
    await loadChannels(true);
    nextTick(() => composerInput.value?.focus());
  } catch (exception: any) {
    if (valid()) error.value = exception?.data?.message || "Не удалось отправить сообщение";
  } finally {
    sending.value = false;
  }
}
function chooseFiles(event: Event) {
  attachOpen.value = false;
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
  const epoch = viewEpoch, identity = token.value;
  const response = await fetch(
    `${config.public.apiBase}/platform-chat/attachments/${item.id}`,
    { headers: headers.value },
  );
  if (!currentView(epoch, identity)) return;
  if (!response.ok) {
    error.value = "Не удалось скачать файл";
    return;
  }
  const blob = await response.blob();
  if (!currentView(epoch, identity)) return;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = item.name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function addEmoji(emoji: string) {
  text.value += emoji;
  emojiOpen.value = false;
  nextTick(() => composerInput.value?.focus());
}
async function openEntities() {
  attachOpen.value = false;
  entityOpen.value = !entityOpen.value;
  emojiOpen.value = false;
  if (entityOpen.value) await loadEntities();
}
async function loadEntities() {
  if (!entityOpen.value) return;
  const version = ++entityRequest, epoch = viewEpoch, identity = token.value, type = entityType.value;
  entityLoading.value = true; entityResults.value = []; entityError.value = "";
  const valid = () => version === entityRequest && currentView(epoch, identity) && entityOpen.value && type === entityType.value;
  try {
    const rows = await $fetch<any[]>("/platform-chat/entities", { baseURL: config.public.apiBase, headers: headers.value, query: { type, search: entitySearch.value } });
    if (valid()) entityResults.value = rows;
  } catch (exception: any) {
    if (valid()) entityError.value = exception?.data?.message || "Не удалось найти карточки";
  } finally { if (valid()) entityLoading.value = false; }
}
function delayedEntitySearch() {
  ++entityRequest; entityResults.value = []; entityError.value = ""; entityLoading.value = true;
  if (entityDebounce) clearTimeout(entityDebounce);
  entityDebounce = setTimeout(loadEntities, 250);
}
async function switchEntityType(type: string) {
  entityType.value = type; entitySearch.value = ""; await loadEntities();
}
function attachEntity(item: any) {
  if (entityLoading.value || !entityResults.value.some(row => row.id === item.id && row.type === item.type)) return;
  if (entities.value.length >= 8) { entityError.value = "Можно прикрепить до 8 карточек"; return; }
  if (!entities.value.some(entity => entity.type === item.type && entity.id === item.id)) entities.value.push(item);
  entityOpen.value = false; nextTick(() => composerInput.value?.focus());
}
async function createChannel() {
  if (creating.value) return;
  creating.value = true; error.value = '';
  const epoch = viewEpoch, identity = token.value;
  try {
    const channel = await $fetch<any>("/platform-chat/channels", {
      baseURL: config.public.apiBase, method: "POST", headers: headers.value,
      body: { ...draftChannel, memberIds: [...draftChannel.memberIds] },
    });
    if (!currentView(epoch, identity)) return;
    Object.assign(draftChannel, { name: "", description: "", type: "TEAM", memberIds: [] });
    createOpen.value = false;
    directPicker.value = false; channelSearch.value = '';
    if (!channels.value.some(row => row.id === channel.id)) channels.value.push(channel);
    await selectChannel(channel);
    await loadChannels(true);
  } catch (exception: any) {
    if (currentView(epoch, identity)) error.value = exception?.data?.message || "Не удалось создать канал";
  } finally { creating.value = false; }
}
async function toggleRecording() {
  if (recording.value) {
    recorder?.stop();
    return;
  }
  error.value = "";
  const epoch = viewEpoch, identity = token.value, channelId = active.value?.id;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    if (!currentView(epoch, identity) || recording.value || active.value?.id !== channelId) { stream.getTracks().forEach(track => track.stop()); return; }
    recordStream = stream;
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
  if (!item.restricted && typeof target === 'string' && /^\/(?:crm\/(?:tasks|customers|pipeline)(?:[?#]|$)|catalog\/[^/])/.test(target)) {
    closeChat();
    navigateTo(target);
  }
}

watch(isOpen, async (value) => {
  if (poll) clearInterval(poll); poll = undefined;
  if (value) {
    const epoch = viewEpoch, identity = token.value;
    mobileChannels.value = true; connectRealtime(); loading.value = true; error.value = "";
    await loadChannels();
    if (!currentView(epoch, identity)) return;
    loading.value = false;
    poll = setInterval(() => { void refreshMessages(); }, 60000);
  } else { clearView(); void refreshUnread(); }
});
watch(entityOpen, value => {
  if (!value) { ++entityRequest; entityResults.value = []; entityError.value = ""; entityLoading.value = false; if (entityDebounce) clearTimeout(entityDebounce); }
});
watch(requestedChannelId, id => { if (id && isOpen.value && !loading.value) void loadChannels(); });
watch([sending, recording], ([isSending, isRecording]) => { if (!isSending && !isRecording && requestedChannelId.value && isOpen.value) void loadChannels(); });
watch(token, () => {
  clearView(); text.value = ""; clearQueuedFiles();
  clearDrafts();
  if (recorder && recorder.state !== 'inactive') { recorder.onstop = null; recorder.stop(); }
  stopRecordingState();
  if (isOpen.value && token.value) void loadChannels(false);
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
  clearView();
  clearDrafts();
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
        <section data-v-ui-6f58f7dddb37 ref="chatPanel" class="platform-chat crm-messenger admin-dialog admin-dialog--chat" role="dialog" aria-modal="true" aria-label="Сообщения" tabindex="-1" @keydown="chatKeys">
          <div v-if="loading" class="messenger-loading"><button class="crm-button messenger-icon" aria-label="Закрыть чат" @click="closeChat"><X :size="20" /></button><WorkspaceLoading label="Открываем сообщения" /></div>
          <div data-v-ui-6f58f7dddb37 v-else class="chat-body" :class="{ 'chat-body--channels': mobileChannels || !active }">
            <aside data-v-ui-6f58f7dddb37 class="channels">
              <header data-v-ui-6f58f7dddb37 class="messenger-sidebar-head">
                <button v-if="directPicker" class="crm-button messenger-icon" aria-label="Ко всем чатам" @click="directPicker=false;channelSearch=''"><ChevronLeft :size="22" /></button>
                <div><h2>{{directPicker?'Новое сообщение':'Сообщения'}}</h2><small class="messenger-connection" :class="{ connected }" role="status">{{ connected ? 'Подключено' : 'Подключаемся…' }}</small></div>
                <button v-if="!directPicker" class="crm-button messenger-icon" :disabled="sending || recording" aria-label="Новое сообщение" title="Новое сообщение" @click="startMessage"><Pencil :size="21" /></button>
                <button class="crm-button messenger-icon messenger-sidebar-close" aria-label="Закрыть чат" @click="closeChat"><X :size="21" /></button>
              </header>
              <label class="crm-input-group" data-v-ui-6f58f7dddb37
                ><Search data-v-ui-6f58f7dddb37 :size="14" /><input class="crm-input" data-v-ui-6f58f7dddb37
                  v-model="channelSearch"
                  :placeholder="directPicker?'Найти сотрудника':'Найти чат или человека'"
                  :aria-label="directPicker?'Найти сотрудника':'Найти чат или человека'"
              /></label>
              <nav v-if="directPicker" data-v-ui-6f58f7dddb37 aria-label="Сотрудники для личного диалога">
                <button class="messenger-dialog-row messenger-create-group" :disabled="sending" @click="createOpen=true"><i class="chat-avatar"><Users :size="22" /></i><span><b>Новый групповой чат</b><small>Обсуждение с командой</small></span></button>
                <button v-for="member in directCandidates" :key="member.id" class="messenger-dialog-row" :disabled="directBusy || sending" @click="openDirect(member)"><i class="chat-avatar" :class="avatarTone(person(member))">{{initials(member)}}</i><span><b>{{person(member)}}</b><small>Личное сообщение</small></span></button><p v-if="!directCandidates.length" class="crm-inline-note">Сотрудники не найдены.</p>
              </nav>
              <nav v-else data-v-ui-6f58f7dddb37 aria-label="Чаты и личные сообщения">
                <button class="messenger-dialog-row" data-v-ui-6f58f7dddb37
                  v-for="channel in visibleChannels"
                  :key="channel.id"
                  :class="{ active: active?.id === channel.id }"
                  :aria-current="active?.id === channel.id ? 'true' : undefined"
                  :disabled="sending || recording"
                  @click="selectChannel(channel)"
                >
                  <i data-v-ui-6f58f7dddb37 class="chat-avatar" :class="avatarTone(channel.name)">{{chatInitials(channel.name)}}</i>
                  <span data-v-ui-6f58f7dddb37
                    ><b data-v-ui-6f58f7dddb37><Users v-if="!channel.isDirect" :size="13" class="messenger-group-icon" />{{ channel.name }}</b
                    ><small data-v-ui-6f58f7dddb37>{{ dialogPreview(channel) }}</small></span
                  >
                  <div class="chat-dialog-meta"><time v-if="channel.messages?.[0]?.createdAt" :datetime="channel.messages[0].createdAt">{{ dialogTime(channel.messages[0].createdAt) }}</time><em data-v-ui-6f58f7dddb37 v-if="channel.unread">{{channel.unread > 99 ? '99+' : channel.unread}}</em></div>
                </button>
                <p v-if="!visibleChannels.length" class="crm-inline-note">Чаты не найдены. Для нового личного диалога выберите «Новое сообщение».</p>
              </nav>
            </aside>
            <article data-v-ui-6f58f7dddb37 v-if="active" class="conversation">
              <header data-v-ui-6f58f7dddb37 class="messenger-conversation-head">
                <button class="crm-button messenger-icon messenger-back" aria-label="Показать чаты" @click="mobileChannels=true"><ChevronLeft :size="22" /></button>
                <div data-v-ui-6f58f7dddb37>
                  <i data-v-ui-6f58f7dddb37 class="chat-avatar" :class="avatarTone(active.name)">{{chatInitials(active.name)}}</i
                  ><span data-v-ui-6f58f7dddb37
                    ><h3 data-v-ui-6f58f7dddb37>{{ active.name }}</h3>
                    <small data-v-ui-6f58f7dddb37 :title="active.description">{{active.isDirect ? 'Личная переписка' : active.type === 'TEAM' ? 'Групповой чат · Все сотрудники' : 'Групповой чат · Участников: ' + (active.members?.length || 0)}}</small></span
                  >
                </div>
                <button class="crm-button messenger-icon" aria-label="Закрыть чат" @click="closeChat"><X :size="21" /></button>
              </header>
              <div class="messenger-history">
              <div data-v-ui-6f58f7dddb37 ref="messageList" class="message-list" @scroll="trackScroll" @click="closePopovers">
                <div v-if="hasOlder || historyBefore" class="crm-action-bar"><button v-if="hasOlder" class="crm-button" :disabled="historyBusy" @click="browseHistory()">Более ранние сообщения</button><button v-if="historyBefore" class="crm-button" :disabled="historyBusy" @click="browseHistory(true)">К последним сообщениям</button></div>
                <template v-for="(message, index) in messages" :key="message.id">
                <div v-if="index === 0 || dayKey(message.createdAt) !== dayKey(messages[index-1].createdAt)" class="messenger-date"><span>{{dayLabel(message.createdAt)}}</span></div>
                <div data-v-ui-6f58f7dddb37
                  class="message"
                  :class="{ mine: message.authorId === user?.id }"
                >
                  <i v-if="!active.isDirect && message.authorId !== user?.id" data-v-ui-6f58f7dddb37 class="chat-avatar" :class="avatarTone(person(message.author))">{{ initials(message.author) }}</i>
                  <section data-v-ui-6f58f7dddb37>
                    <header v-if="!active.isDirect && message.authorId !== user?.id" data-v-ui-6f58f7dddb37>
                      <b data-v-ui-6f58f7dddb37>{{ person(message.author) }}</b
                      >
                    </header>
                    <p data-v-ui-6f58f7dddb37 v-if="message.body">{{ message.body }}</p>
                    <div data-v-ui-6f58f7dddb37 v-if="message.attachments?.length" class="attachments">
                      <template
                        v-for="item in message.attachments"
                        :key="item.id"
                      >
                        <button data-v-ui-6f58f7dddb37
                          v-if="item.kind === 'ENTITY'"
                          :disabled="item.restricted || !item.metadata?.url"
                          class="entity-card crm-button crm-card-action crm-interactive crm-chat-entity"
                          @click="openEntityCard(item)"
                        >
                          <i data-v-ui-6f58f7dddb37
                            :style="{
                              background: item.metadata?.color || undefined,
                            }"
                            ><component data-v-ui-6f58f7dddb37
                              :is="item.restricted ? Lock : entityIcon(item.entityType)"
                              :size="16"
                          /></i>
                          <span data-v-ui-6f58f7dddb37
                            ><small data-v-ui-6f58f7dddb37>{{ typeLabels[item.entityType] || 'Карточка CRM' }}</small
                            ><b data-v-ui-6f58f7dddb37>{{ item.name }}</b
                            ><em data-v-ui-6f58f7dddb37>{{ item.restricted ? 'Нет доступа или карточка удалена' : item.metadata?.subtitle }}</em></span
                          >
                          <ChevronLeft v-if="!item.restricted" data-v-ui-6f58f7dddb37 class="messenger-entity-arrow" :size="15" />
                        </button>
                        <button data-v-ui-6f58f7dddb37
                          v-else-if="item.kind === 'IMAGE'"
                          class="image-card crm-button crm-card-action crm-interactive"
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
                          class="file-card crm-button crm-card-action crm-interactive"
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
                    <time class="messenger-message-time" :datetime="message.createdAt" :title="messageTime(message.createdAt)">{{bubbleTime(message.createdAt)}}</time>
                  </section>
                </div>
                </template>
                <div v-if="messagesLoading && !messages.length" class="empty" role="status">Загружаем сообщения…</div>
                <p v-if="!messagesLoading&&!messages.length&&historyBefore" class="crm-inline-note">Более ранних сообщений нет.</p>
                <div data-v-ui-6f58f7dddb37 v-if="!messagesLoading&&!messages.length&&!historyBefore" class="empty">
                  <MessageCircle data-v-ui-6f58f7dddb37 :size="34" /><b data-v-ui-6f58f7dddb37>Начните обсуждение</b
                  ><span data-v-ui-6f58f7dddb37
                    >Напишите первое сообщение {{ active.isDirect ? 'в диалоге с' : 'в чате' }} «{{
                      active.name
                    }}»</span
                  >
                </div>
              </div>
              <button v-if="showLatest || historyBefore" class="crm-button messenger-icon messenger-jump" aria-label="К последним сообщениям" @click="jumpToLatest"><ArrowDown :size="21" /></button>
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
                    <button class="crm-button" data-v-ui-6f58f7dddb37 :disabled="sending" :aria-label="'Убрать файл ' + item.file.name" @click="removeQueuedFile(index)">
                      <X data-v-ui-6f58f7dddb37 :size="12" />
                    </button>
                  </span>
                  <span data-v-ui-6f58f7dddb37
                    v-for="entity in entities"
                    :key="entity.type + entity.id"
                    ><component data-v-ui-6f58f7dddb37 :is="entityIcon(entity.type)" :size="12" />{{
                      entity.name || entity.title
                    }}<button class="crm-button" data-v-ui-6f58f7dddb37 :disabled="sending" :aria-label="'Убрать карточку ' + (entity.name || entity.title)"
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
                <input ref="fileInput" type="file" multiple hidden @change="chooseFiles" />
                <div v-if="!recording" class="messenger-compose-row">
                  <button type="button" class="crm-button messenger-icon" aria-label="Вложения" title="Прикрепить файл или карточку" :aria-expanded="attachOpen" :disabled="sending" @click="attachOpen=!attachOpen;emojiOpen=false;entityOpen=false"><Paperclip :size="23" /></button>
                  <textarea ref="composerInput" class="crm-input" data-v-ui-6f58f7dddb37 v-model="text" rows="1" :disabled="sending" aria-label="Сообщение" placeholder="Сообщение…" title="Enter — отправить, Shift+Enter — новая строка" @input="resizeComposer" @keydown="composerKeys" @focus="closePopovers"></textarea>
                  <button type="button" class="crm-button messenger-icon" aria-label="Добавить смайлик" :aria-expanded="emojiOpen" :disabled="sending" @click="emojiOpen=!emojiOpen;attachOpen=false;entityOpen=false"><Smile :size="23" /></button>
                  <button v-if="canSend || sending" type="button" class="send crm-button messenger-icon" aria-label="Отправить сообщение" :disabled="sending" @click="send"><Send :size="21" /></button>
                  <button v-else type="button" class="crm-button messenger-icon" aria-label="Записать голосовое" title="Записать голосовое" @click="closePopovers();toggleRecording()"><Mic :size="23" /></button>
                </div>
                <div v-if="attachOpen" class="messenger-attach-menu" role="group" aria-label="Добавить вложение">
                  <button class="crm-button" @click="fileInput?.click()"><Paperclip :size="21" /><span>Фото или файл<small>До 10 МБ</small></span></button>
                  <button class="crm-button" @click="openEntities"><Archive :size="21" /><span>Карточка CRM<small>Задача, клиент или товар</small></span></button>
                </div>
                <div data-v-ui-6f58f7dddb37 v-if="emojiOpen" class="emoji-picker">
                  <button class="crm-button" data-v-ui-6f58f7dddb37 v-for="emoji in emojis" :key="emoji" :aria-label="emoji" @click="addEmoji(emoji)">
                    {{ emoji }}
                  </button>
                </div>
                <div data-v-ui-6f58f7dddb37 v-if="entityOpen" class="entity-picker">
                  <header data-v-ui-6f58f7dddb37>
                    <b data-v-ui-6f58f7dddb37>Прикрепить карточку</b
                    ><button class="crm-button" data-v-ui-6f58f7dddb37 aria-label="Закрыть выбор карточки" @click="entityOpen = false">
                      <X data-v-ui-6f58f7dddb37 :size="15" />
                    </button>
                  </header>
                  <nav data-v-ui-6f58f7dddb37>
                    <button class="crm-button" data-v-ui-6f58f7dddb37
                      v-for="type in entityTypes" :key="type.id"
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
                    <button class="crm-button crm-chat-entity" data-v-ui-6f58f7dddb37
                      v-for="item in entityResults"
                      :key="`${item.type}:${item.id}`"
                      @click="attachEntity(item)"
                    >
                      <i data-v-ui-6f58f7dddb37><component data-v-ui-6f58f7dddb37 :is="entityIcon(item.type)" :size="15" /></i
                      ><span data-v-ui-6f58f7dddb37
                        ><b data-v-ui-6f58f7dddb37>{{ item.title }}</b
                        ><small data-v-ui-6f58f7dddb37>{{ item.subtitle }}</small></span
                      ><Plus data-v-ui-6f58f7dddb37 :size="14" />
                    </button>
                    <p v-if="entityError" class="crm-muted" role="status">{{entityError}}</p>
                    <p v-if="entityLoading" class="crm-muted">Ищем доступные карточки…</p>
                    <p data-v-ui-6f58f7dddb37 v-if="!entityError && !entityLoading && !entityResults.length">
                      Ничего не найдено
                    </p>
                  </div>
                </div>
              </div>
            </article>
            <article data-v-ui-6f58f7dddb37 v-else class="no-channel"><button class="crm-button messenger-icon messenger-empty-close" aria-label="Закрыть чат" @click="closeChat"><X :size="21" /></button><MessageCircle :size="44" /><h2>Начните общение</h2><p>Выберите чат слева или напишите сотруднику</p><button class="crm-button" @click="startMessage">Новое сообщение</button></article>
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
              <p v-if="error" role="alert" class="crm-inline-note">{{error}}</p>
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
              ><button data-v-ui-6f58f7dddb37 :disabled="creating" class="primary crm-button crm-button--primary">{{creating ? 'Создаём…' : 'Создать канал'}}</button>
            </footer>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
