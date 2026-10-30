<script setup lang="ts">
import { Camera, CameraOff, LogOut, Mic, MicOff, MonitorUp, RefreshCw, Send, Square } from '@lucide/vue';
import { validateLiveJoin } from '~/shared/lms-live';
import type { Room } from 'livekit-client';

type ChatMessage = { id:string; authorName:string; body:string; createdAt:string };
const props = defineProps<{ liveId:string; title:string }>();
const emit = defineEmits<{ close:[] }>();
const config = useRuntimeConfig(), session = useWorkspaceSession();
const cameraPreview = ref<HTMLVideoElement | null>(null), screenPreview = ref<HTMLVideoElement | null>(null);
const connected = ref(false), connecting = ref(false), deviceBusy = ref(false), sending = ref(false);
const cameraOn = ref(false), micOn = ref(false), screenOn = ref(false);
const error = ref(''), chatError = ref(''), chatText = ref(''), messages = ref<ChatMessage[]>([]);
let room:Room | null = null, timer:ReturnType<typeof setTimeout> | undefined, generation = 0, pollingVersion = -1;
let sdk:typeof import('livekit-client') | null = null;
const base = computed(() => `/lms/admin/live/${encodeURIComponent(props.liveId)}`);
const time = (value:string) => { const date = new Date(value); return Number.isFinite(date.getTime()) ? date.toLocaleTimeString('ru-RU', { hour:'2-digit', minute:'2-digit' }) : ''; };

function stopMedia() {
  generation++; clearTimeout(timer); connected.value = false; connecting.value = false;
  cameraOn.value = false; micOn.value = false; screenOn.value = false;
  for (const el of [cameraPreview.value, screenPreview.value]) if (el) el.srcObject = null;
  const current = room; room = null; sdk = null;
  if (current) {
    for (const publication of current.localParticipant.trackPublications.values()) {
      try { publication.track?.stop(); } catch { /* Continue stopping the remaining devices. */ }
    }
    void current.disconnect(true).catch(() => {});
  }
}
function close() { stopMedia(); emit('close'); }
function attachPreview(source:'camera'|'screen') {
  if (!room || !sdk) return;
  const target = source === 'camera' ? cameraPreview.value : screenPreview.value;
  const trackSource = source === 'camera' ? sdk.Track.Source.Camera : sdk.Track.Source.ScreenShare;
  const track = room.localParticipant.getTrackPublication(trackSource)?.videoTrack;
  if (!target) return;
  if (track && !track.isMuted) track.attach(target); else target.srcObject = null;
}
async function pollChat(version:number) {
  if (!connected.value || version !== generation || pollingVersion === version) return;
  pollingVersion = version;
  try {
    const data = await session.request<ChatMessage[]>(`${base.value}/chat`, { retry:0 });
    if (version !== generation || !connected.value) return;
    if (!Array.isArray(data)) throw new Error('Invalid response');
    messages.value = data; chatError.value = '';
  } catch {
    if (version === generation) { stopMedia(); error.value = 'Связь с эфиром или доступ к нему потеряны. Подключитесь снова после проверки состояния.'; }
  } finally {
    if (pollingVersion === version) pollingVersion = -1;
    if (version === generation && connected.value) timer = setTimeout(() => void pollChat(version), 10000);
  }
}
async function connect() {
  if (connected.value || connecting.value) return;
  const version = ++generation; connecting.value = true; error.value = ''; chatError.value = '';
  let candidate:Room | null = null;
  try {
    const reply = await session.request(`${base.value}/join`, { method:'POST', retry:0 });
    if (version !== generation) return;
    const join = validateLiveJoin(reply, 'host', props.liveId, config.public.lmsMediaOrigin);
    const livekit = await import('livekit-client');
    if (version !== generation) return;
    candidate = new livekit.Room({ adaptiveStream:true, dynacast:true });
    const current = candidate;
    current.on(livekit.RoomEvent.Disconnected, () => {
      if (room !== current) return;
      stopMedia(); error.value = 'Соединение с эфиром прервано. Подключитесь снова.';
    });
    current.on(livekit.RoomEvent.LocalTrackUnpublished, () => {
      if (room !== current) return;
      cameraOn.value = current.localParticipant.isCameraEnabled;
      micOn.value = current.localParticipant.isMicrophoneEnabled;
      screenOn.value = current.localParticipant.isScreenShareEnabled;
      void nextTick(() => { attachPreview('camera'); attachPreview('screen'); });
    });
    await current.connect(join.url, join.token);
    if (version !== generation) { await current.disconnect(true); return; }
    room = current; sdk = livekit; connected.value = true;
    await pollChat(version);
  } catch {
    if (candidate && candidate !== room) await candidate.disconnect(true).catch(() => {});
    if (version === generation) { stopMedia(); error.value = 'Не удалось подключиться к эфиру. Проверьте состояние трансляции и настройки сервиса.'; }
  } finally { if (version === generation) connecting.value = false; }
}
async function device(kind:'camera'|'mic'|'screen') {
  const current = room; if (!current || !connected.value || deviceBusy.value) return;
  const version = generation; deviceBusy.value = true; error.value = '';
  try {
    if (kind === 'camera') await current.localParticipant.setCameraEnabled(!cameraOn.value);
    else if (kind === 'mic') await current.localParticipant.setMicrophoneEnabled(!micOn.value);
    else await current.localParticipant.setScreenShareEnabled(!screenOn.value);
    if (version !== generation || room !== current) { await current.disconnect(true); return; }
    cameraOn.value = current.localParticipant.isCameraEnabled;
    micOn.value = current.localParticipant.isMicrophoneEnabled;
    screenOn.value = current.localParticipant.isScreenShareEnabled;
    await nextTick(); attachPreview('camera'); attachPreview('screen');
  } catch { if (version === generation) error.value = kind === 'screen' ? 'Не удалось включить демонстрацию экрана. Проверьте разрешения браузера.' : 'Не удалось включить устройство. Проверьте разрешения браузера и попробуйте снова.'; }
  finally { deviceBusy.value = false; }
}
async function send() {
  const body = chatText.value.trim(), version = generation;
  if (!connected.value || sending.value || !body || body.length > 1000) return;
  sending.value = true; chatError.value = '';
  try { await session.request(`${base.value}/chat`, { method:'POST', body:{body}, retry:0 }); if (version === generation) { chatText.value = ''; clearTimeout(timer); await pollChat(version); } }
  catch { if (version === generation) chatError.value = 'Не удалось отправить сообщение. Проверьте соединение и повторите.'; }
  finally { sending.value = false; }
}
watch(() => [props.liveId, session.user.value?.id, session.token.value], () => { stopMedia(); messages.value = []; error.value = ''; });
onBeforeUnmount(stopMedia);
</script>

<template>
  <section class="course-live-studio crm-surface" :aria-label="`Студия ведущего: ${title}`">
    <header><div><h3>Студия ведущего</h3><p>{{title}}</p></div><button type="button" class="crm-button" @click="close"><LogOut :size="16"/> Закрыть</button></header>
    <p v-if="error" class="course-error" role="alert">{{error}}</p>
    <template v-if="!connected"><p class="course-hint">Подключитесь к эфиру. Камера и микрофон включаются отдельно, после вашего разрешения.</p><button type="button" class="crm-button crm-button--primary" :disabled="connecting" @click="connect">{{connecting ? 'Подключаем…' : 'Подключиться к эфиру'}}</button></template>
    <div v-else class="course-live-studio-grid">
      <div class="course-live-video-area">
        <p class="course-hint" role="status">Вы подключены. Зрители увидят камеру и услышат звук, когда вы их включите.</p>
        <div class="course-live-preview"><video v-show="cameraOn" ref="cameraPreview" muted autoplay playsinline aria-label="Изображение с вашей камеры"/><p v-if="!cameraOn">Камера выключена</p></div>
        <div v-if="screenOn" class="course-live-screen"><video ref="screenPreview" muted autoplay playsinline aria-label="Предпросмотр демонстрации экрана"/><span>Ваш экран</span></div>
        <div class="course-actions course-live-controls"><button type="button" class="crm-button" :disabled="deviceBusy" :aria-pressed="cameraOn" @click="device('camera')"><Camera v-if="!cameraOn" :size="16"/><CameraOff v-else :size="16"/> {{cameraOn?'Выключить камеру':'Включить камеру'}}</button><button type="button" class="crm-button" :disabled="deviceBusy" :aria-pressed="micOn" @click="device('mic')"><Mic v-if="!micOn" :size="16"/><MicOff v-else :size="16"/> {{micOn?'Выключить микрофон':'Включить микрофон'}}</button><button type="button" class="crm-button" :disabled="deviceBusy" :aria-pressed="screenOn" @click="device('screen')"><Square v-if="screenOn" :size="16"/><MonitorUp v-else :size="16"/> {{screenOn?'Остановить показ':'Показать экран'}}</button></div>
      </div>
      <section class="course-live-host-chat" aria-label="Чат эфира"><header><h4>Чат участников</h4><button type="button" class="crm-button crm-button--icon" aria-label="Обновить чат" @click="pollChat(generation)"><RefreshCw :size="16"/></button></header><div class="course-live-host-messages" aria-live="polite"><p v-if="!messages.length" class="course-hint">Сообщений пока нет.</p><article v-for="message in messages" :key="message.id"><strong>{{message.authorName}}</strong><time>{{time(message.createdAt)}}</time><p>{{message.body}}</p></article></div><p v-if="chatError" class="course-error" role="alert">{{chatError}}</p><form @submit.prevent="send"><label for="course-live-message">Сообщение</label><textarea id="course-live-message" v-model="chatText" class="crm-input" maxlength="1000" rows="2" placeholder="Напишите участникам"/><button type="submit" class="crm-button crm-button--primary" :disabled="sending || !chatText.trim()"><Send :size="16"/> {{sending ? 'Отправляем…' : 'Отправить'}}</button></form></section>
    </div>
  </section>
</template>
