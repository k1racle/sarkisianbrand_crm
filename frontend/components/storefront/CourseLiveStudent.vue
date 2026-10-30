<script setup lang="ts">
import { MessageCircle, Radio, RefreshCw, Volume2 } from '@lucide/vue';
import type { RemoteTrack, Room } from 'livekit-client';
import { validateLiveJoin } from '~/shared/lms-live';

type Live = { id:string; title:string; startsAt:string; endsAt:string; status:'SCHEDULED'|'LIVE'|'ENDED'|'CANCELLED' };
type Message = { id:string; authorName:string; body:string; createdAt:string };
const props = defineProps<{ courseId:string; lessonId:string; token:string }>();
const config = useRuntimeConfig();
const sessions = ref<Live[]>([]), loading = ref(true), connecting = ref(false), connected = ref(false);
const active = ref<Live|null>(null), error = ref(''), chatError = ref(''), draft = ref(''), sending = ref(false), messages = ref<Message[]>([]);
const soundBlocked = ref(false), videoPresent = ref(false), stage = ref<HTMLElement|null>(null);
const base = computed(() => `/lms/my/${encodeURIComponent(props.courseId)}/lessons/${encodeURIComponent(props.lessonId)}/live`);
let room:Room|null = null, revision = 0, listRevision = 0, chatRevision = 0;
let chatTimer: ReturnType<typeof setTimeout>|undefined;
const label:Record<Live['status'],string> = { SCHEDULED:'Запланирован', LIVE:'Идёт эфир', ENDED:'Завершён', CANCELLED:'Отменён' };
const date = (value:string) => { const parsed = new Date(value); return Number.isFinite(parsed.getTime()) ? parsed.toLocaleString('ru-RU', { dateStyle:'medium', timeStyle:'short' }) : 'Время уточняется'; };
function headers() { return { Authorization:`Bearer ${props.token}` }; }
function status(e:any) { return Number(e?.statusCode || e?.response?.status || e?.data?.statusCode); }
function stop(message = '') {
  revision++; chatRevision++; clearTimeout(chatTimer);
  const previous = room; room = null;
  if (previous) { previous.removeAllListeners(); void previous.disconnect().catch(() => {}); }
  stage.value?.replaceChildren();
  active.value = null; connected.value = false; connecting.value = false; soundBlocked.value = false; videoPresent.value = false;
  messages.value = []; draft.value = ''; sending.value = false; chatError.value = '';
  if (message) error.value = message;
}
async function load() {
  const current = ++listRevision, token = props.token;
  loading.value = true; error.value = '';
  try {
    const rows = await $fetch<Live[]>(base.value, { baseURL:config.public.apiBase, headers:headers(), timeout:15000, retry:0 });
    if (current !== listRevision || token !== props.token) return;
    if (!Array.isArray(rows)) throw new Error('Invalid response');
    sessions.value = rows.filter(item => item && /^[0-9a-f-]{36}$/i.test(item.id) && typeof item.title === 'string' && ['SCHEDULED','LIVE','ENDED','CANCELLED'].includes(item.status)).slice(0,100);
  } catch (e:any) {
    if (current !== listRevision) return;
    if (room) stop();
    sessions.value = [];
    error.value = status(e) === 503 ? 'Прямые эфиры пока готовятся. Информация о запуске появится здесь.' : 'Не удалось загрузить эфиры. Проверьте доступ к курсу и попробуйте ещё раз.';
  } finally { if (current === listRevision) loading.value = false; }
}
async function chat(current:number) {
  if (!active.value || !connected.value || current !== revision) return;
  const id = active.value.id, token = props.token, request = ++chatRevision;
  try {
    const rows = await $fetch<Message[]>(`${base.value}/${encodeURIComponent(id)}/chat`, { baseURL:config.public.apiBase, headers:headers(), timeout:12000, retry:0 });
    if (current !== revision || token !== props.token || request !== chatRevision) return;
    if (!Array.isArray(rows)) throw new Error('Invalid response');
    messages.value = rows.filter(item => item && typeof item.id === 'string' && typeof item.authorName === 'string' && typeof item.body === 'string' && typeof item.createdAt === 'string').slice(-100);
    chatError.value = '';
    chatTimer = setTimeout(() => { void chat(current); }, 8000);
  } catch {
    if (current === revision && request === chatRevision) stop('Соединение с эфиром потеряно или доступ закончился. Обновите страницу и подключитесь снова.');
  }
}
async function join(item:Live) {
  if (connecting.value || item.status !== 'LIVE') return;
  stop(); error.value = ''; connecting.value = true;
  const current = ++revision, token = props.token;
  let candidate:Room|null = null;
  try {
    const response = await $fetch(`${base.value}/${encodeURIComponent(item.id)}/join`, { baseURL:config.public.apiBase, method:'POST', headers:headers(), timeout:15000, retry:0 });
    if (current !== revision || token !== props.token) return;
    const join = validateLiveJoin(response, 'viewer', item.id, config.public.lmsMediaOrigin);
    const sdk = await import('livekit-client');
    if (current !== revision || token !== props.token) return;
    active.value = item; await nextTick();
    if (current !== revision || !stage.value) return;
    candidate = new sdk.Room({ adaptiveStream:true, dynacast:true }); room = candidate;
    candidate.on(sdk.RoomEvent.TrackSubscribed, (track:RemoteTrack) => {
      if (current !== revision || !stage.value || !['audio','video'].includes(track.kind)) return;
      const element = track.attach(); element.setAttribute('aria-label', track.kind === 'video' ? 'Видео прямого эфира' : 'Звук прямого эфира');
      if (element instanceof HTMLVideoElement) { element.playsInline = true; videoPresent.value = true; }
      stage.value.appendChild(element);
    });
    candidate.on(sdk.RoomEvent.TrackUnsubscribed, (track:RemoteTrack) => { track.detach().forEach(element => element.remove()); if (track.kind === 'video') videoPresent.value = Boolean(stage.value?.querySelector('video')); });
    candidate.on(sdk.RoomEvent.AudioPlaybackStatusChanged, (playing:boolean) => { if (current === revision) soundBlocked.value = !playing; });
    candidate.on(sdk.RoomEvent.Disconnected, () => { if (current === revision) stop('Эфир завершён или соединение прервано.'); });
    await candidate.connect(join.url, join.token, { autoSubscribe:true });
    if (current !== revision || token !== props.token) { void candidate.disconnect().catch(() => {}); return; }
    connected.value = true; connecting.value = false; soundBlocked.value = !candidate.canPlaybackAudio; void chat(current);
  } catch (e:any) {
    if (candidate && candidate !== room) void candidate.disconnect().catch(() => {});
    if (current === revision) stop(status(e) === 503 ? 'Прямые эфиры пока готовятся. Информация о запуске появится здесь.' : 'Не удалось подключиться к эфиру. Проверьте доступ и попробуйте снова.');
  } finally { if (current === revision) connecting.value = false; }
}
async function startAudio() { try { await room?.startAudio(); soundBlocked.value = false; } catch { chatError.value = 'Не удалось включить звук. Проверьте настройки браузера.'; } }
async function send() {
  const body = draft.value.trim(), id = active.value?.id, current = revision, token = props.token;
  if (!body || body.length > 1000 || !id || !connected.value || sending.value) return;
  sending.value = true; chatError.value = '';
  try {
    await $fetch(`${base.value}/${encodeURIComponent(id)}/chat`, { baseURL:config.public.apiBase, method:'POST', headers:headers(), body:{ body }, timeout:12000, retry:0 });
    if (current !== revision || token !== props.token) return;
    draft.value = ''; clearTimeout(chatTimer); chatRevision++; await chat(current);
  } catch (e:any) {
    if (current !== revision) return;
    if ([401,403,404,409,503].includes(status(e))) stop('Эфир завершён или доступ закончился.');
    else chatError.value = status(e) === 429 ? 'Слишком много сообщений. Подождите немного.' : 'Не удалось подтвердить отправку. Проверьте чат перед повтором.';
  } finally { if (current === revision) sending.value = false; }
}
onMounted(() => { void load(); });
watch(() => [props.courseId, props.lessonId, props.token], () => { stop(); void load(); });
onBeforeUnmount(() => { listRevision++; stop(); });
</script>

<template>
  <section class="site-live" aria-label="Прямые эфиры урока">
    <div class="site-live-heading"><h3>Прямые эфиры</h3><button type="button" class="site-courses-button" :disabled="loading || connecting" @click="load"><RefreshCw :size="16"/> Обновить</button></div>
    <p v-if="loading" role="status">Загружаем расписание…</p>
    <p v-if="error" role="alert">{{error}}</p>
    <template v-if="!loading && !error">
      <p v-if="!sessions.length">Эфиров пока нет. Когда появится расписание, оно будет здесь.</p>
      <ul v-else class="site-live-list"><li v-for="item in sessions" :key="item.id"><div><strong>{{item.title}}</strong><span>{{date(item.startsAt)}} — {{date(item.endsAt)}}</span><span>{{label[item.status]}}</span></div><button v-if="item.status==='LIVE' && active?.id!==item.id" type="button" class="site-courses-button" :disabled="connecting || connected" @click="join(item)"><Radio :size="16"/> Подключиться</button></li></ul>
    </template>
    <div v-if="active" class="site-live-player">
      <div class="site-live-stage"><div class="site-live-tracks" ref="stage"/><p v-if="!videoPresent" role="status">{{connecting ? 'Подключаемся к эфиру…' : 'Ожидаем видео ведущего'}}</p></div>
      <div class="site-live-controls"><span role="status">{{connected ? 'Вы подключены' : 'Подключаемся…'}}</span><button v-if="soundBlocked" type="button" class="site-courses-button" @click="startAudio"><Volume2 :size="16"/> Включить звук</button><button type="button" class="site-courses-button" @click="stop()">Выйти из эфира</button></div>
      <section v-if="connected" class="site-live-chat" aria-label="Чат эфира"><h3><MessageCircle :size="19"/> Чат эфира</h3><div class="site-live-messages" role="log" aria-label="Сообщения эфира"><article v-for="entry in messages" :key="entry.id"><strong>{{entry.authorName}}</strong><time>{{date(entry.createdAt)}}</time><p>{{entry.body}}</p></article><p v-if="!messages.length">Пока нет сообщений.</p></div><p v-if="chatError" role="alert">{{chatError}}</p><form @submit.prevent="send"><label for="course-live-message">Ваше сообщение</label><div><input id="course-live-message" v-model="draft" maxlength="1000" autocomplete="off" placeholder="Напишите сообщение"/><button type="submit" class="site-courses-button" :disabled="sending || !draft.trim()">{{sending ? 'Отправляем…' : 'Отправить'}}</button></div></form></section>
    </div>
  </section>
</template>
