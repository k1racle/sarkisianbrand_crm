<script setup lang="ts">
import { requestKey as createRequestKey } from '~/shared/request-key';
import { Clock3, Pause, Play, RefreshCw, Square } from '@lucide/vue';
import { workTimeCounter, workTimeDuration, type WorkTimeAction, type WorkTimeCurrent } from '~/shared/crm-work-time';
defineProps<{ compact?: boolean }>();
const emit = defineEmits<{ changed: [] }>();
const { token } = useWorkspaceSession(), config = useRuntimeConfig();
const data = ref<WorkTimeCurrent | null>(null), loading = ref(false), saving = ref(false), error = ref(''), notice = ref('');
const tick = ref(0), sampled = ref(0);
const pending = ref<{ action: WorkTimeAction; sessionId?: string; version: number; requestKey: string } | null>(null);
let alive = true, loadVersion = 0, timer: ReturnType<typeof setInterval> | undefined, poll: ReturnType<typeof setInterval> | undefined;
const request = <T,>(path: string, options: any = {}) => $fetch<T>('/crm/work-time' + path, { baseURL: config.public.apiBase, headers: { Authorization: `Bearer ${token.value}` }, timeout: 15000, retry: 0, ...options });
const message = (e: any) => Array.isArray(e?.data?.message) ? e.data.message.join('. ') : e?.data?.message || 'Нет подтверждения от сервера. Проверьте соединение и обновите данные.';
const delta = computed(() => data.value && !error.value ? Math.min(60000, Math.max(0, tick.value - sampled.value)) : 0);
const todayDelta = computed(() => data.value ? Math.min(delta.value, Math.max(0, Date.parse(data.value.todayEndsAt) - Date.parse(data.value.serverTime))) : 0);
const worked = computed(() => (data.value?.today.workedMs || 0) + (data.value?.active?.status === 'WORKING' ? todayDelta.value : 0));
const breaks = computed(() => (data.value?.today.breakMs || 0) + (data.value?.active?.status === 'BREAK' ? todayDelta.value : 0));
const activeWorked = computed(() => (data.value?.active?.totals.workedMs || 0) + (data.value?.active?.status === 'WORKING' ? delta.value : 0));
const disabled = computed(() => loading.value || saving.value || !data.value?.canTrack || Boolean(error.value) || Boolean(pending.value));
const stateLabel = computed(() => data.value?.active?.status === 'BREAK' ? 'На перерыве' : data.value?.active ? 'Рабочий день идёт' : 'Нет открытого рабочего дня');
const time = (value: string) => new Date(value).toLocaleString('ru-RU', { timeZone: data.value?.timezone || 'Europe/Moscow', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
async function load() {
  if (!alive || saving.value) return;
  const version = ++loadVersion, identity = token.value; loading.value = true;
  try {
    const result = await request<WorkTimeCurrent>('/current');
    if (!alive || version !== loadVersion || token.value !== identity) return;
    data.value = result; error.value = ''; sampled.value = tick.value = performance.now();
  } catch (e) { if (alive && version === loadVersion && token.value === identity) { error.value = message(e); data.value = null; } }
  finally { if (alive && version === loadVersion && token.value === identity) loading.value = false; }
}
async function send() {
  if (!pending.value || saving.value) return;
  const identity = token.value; saving.value = true; ++loadVersion; loading.value = false; notice.value = ''; error.value = '';
  try {
    await request('/actions', { method: 'POST', body: pending.value });
    if (!alive || token.value !== identity) return;
    pending.value = null; notice.value = 'Отметка сохранена'; emit('changed');
  } catch (e: any) {
    if (!alive || token.value !== identity) return;
    error.value = message(e);
    if ([400, 401, 403, 404, 409, 422].includes(e?.statusCode || e?.status)) pending.value = null;
    data.value = null;
  } finally {
    if (alive && token.value === identity) { saving.value = false; if (!error.value) await load(); }
  }
}
function act(action: WorkTimeAction) {
  if (disabled.value) return;
  if (action === 'FINISH' && !window.confirm('Завершить рабочий день? Открытый перерыв тоже будет завершён.')) return;
  pending.value = { action, version: data.value?.active?.version || 0, ...(data.value?.active ? { sessionId: data.value.active.id } : {}), requestKey: createRequestKey() };
  send();
}
function wake() { if (!document.hidden) load(); }
watch(token, () => { ++loadVersion; data.value = null; pending.value = null; error.value = ''; notice.value = ''; saving.value = false; load(); });
onMounted(() => { load(); timer = setInterval(() => tick.value = performance.now(), 1000); poll = setInterval(wake, 30000); window.addEventListener('focus', wake); window.addEventListener('online', wake); document.addEventListener('visibilitychange', wake); });
onUnmounted(() => { alive = false; ++loadVersion; clearInterval(timer); clearInterval(poll); window.removeEventListener('focus', wake); window.removeEventListener('online', wake); document.removeEventListener('visibilitychange', wake); });
defineExpose({ refresh: load });
</script>
<template>
  <section class="crm-surface" aria-label="Мой рабочий день">
    <header class="crm-panel-header"><div><p>УЧЁТ ВРЕМЕНИ</p><h2 class="crm-icon-heading"><Clock3 :size="18" /><span>Мой рабочий день</span></h2></div><NuxtLink v-if="compact" to="/crm/work-time" class="crm-button crm-button--text">История времени</NuxtLink><button v-else class="crm-button crm-button--refresh" :disabled="loading || saving" @click="load"><RefreshCw :size="18" />Обновить отметки</button></header>
    <div class="crm-register crm-page-content--stack">
      <p v-if="error" role="alert">{{ error }}</p><p v-if="notice" role="status">{{ notice }}</p><p v-if="loading && !data" role="status">Загружаем рабочий день…</p>
      <div v-if="pending && !saving" class="crm-action-bar crm-action-bar--spread"><p class="crm-inline-note">Результат запроса не подтверждён. Проверка использует тот же запрос и не создаст вторую отметку.</p><button class="crm-button" @click="send">Проверить сохранение</button></div>
      <button v-if="error && !pending" class="crm-button" :disabled="loading || saving" @click="load">Повторить загрузку</button>
      <template v-if="data">
        <div class="crm-action-bar crm-action-bar--spread"><span class="crm-badge">{{ stateLabel }}</span><span class="crm-inline-note">{{ data.timezone }}</span></div>
        <p v-if="data.active?.longRunning" role="alert">День не закрыт больше 24 часов. Учёт не остановлен автоматически: проверьте отметки и завершите день. Не используйте этот интервал для расчёта зарплаты без проверки.</p>
        <div class="crm-summary-grid">
          <div><small>Работа сегодня</small><strong>{{ workTimeCounter(worked) }}</strong></div>
          <div><small>Перерывы сегодня</small><strong>{{ workTimeDuration(breaks) }}</strong></div>
          <div><small>В текущем рабочем дне</small><strong>{{ data.active ? workTimeDuration(activeWorked) : '—' }}</strong></div>
          <div><small>Начало рабочего дня</small><strong v-if="data.active">{{ time(data.active.startedAt) }}</strong><span v-else>Ещё не отмечено</span></div>
        </div>
        <div v-if="data.canTrack" class="crm-action-bar crm-action-bar--spread">
          <button v-if="!data.active" class="crm-button crm-button--primary" :disabled="disabled" @click="act('START')"><Play :size="18" />Начать рабочий день</button>
          <template v-else><button v-if="data.active.status === 'WORKING'" class="crm-button" :disabled="disabled" @click="act('PAUSE')"><Pause :size="18" />Начать перерыв</button><button v-else class="crm-button crm-button--primary" :disabled="disabled" @click="act('RESUME')"><Play :size="18" />Вернуться к работе</button><button class="crm-button" :disabled="disabled" @click="act('FINISH')"><Square :size="18" />Завершить день</button></template>
        </div>
        <p v-else class="crm-inline-note">Отметки доступны только для просмотра.</p>
        <p class="crm-inline-note">{{ compact ? 'Перерывы не входят в рабочее время. Не забудьте завершить день.' : 'Перерывы не входят в рабочее время. График не завершает рабочий день автоматически. Отметки сохраняются на сервере; без связи новые отметки недоступны.' }}</p>
      </template>
    </div>
  </section>
</template>
