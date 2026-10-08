<script setup lang="ts">
import { RefreshCw } from '@lucide/vue';
import { workTimeDuration, type WorkTimeHistory } from '~/shared/crm-work-time';
useHead({ title: 'Рабочее время — SARKISIAN CRM' });
const { token, user } = useWorkspaceSession(), { can } = useWorkspaceAccess(), config = useRuntimeConfig();
const month = ref(new Intl.DateTimeFormat('sv-SE', { timeZone: user.value?.timezone || 'Europe/Moscow' }).format(new Date()).slice(0, 7));
const data = ref<WorkTimeHistory | null>(null), loading = ref(false), error = ref('');
const section = ref('history'), clock = ref<any>(null), corrections = ref<any>(null);
const options = ref<{ canCreate: boolean; canReview: boolean; timezone: string } | null>(null), optionsError = ref('');
const tabs = computed<ReadonlyArray<readonly [string,string]>>(() => [['history','Мои отметки'],['mine','Мои исправления'],...(options.value?.canReview ? [['review','Проверка команды'] as const,['sheet','Табель команды'] as const] : [])]);
let version = 0, optionsVersion = 0, alive = true;
async function loadOptions() {
  const current = ++optionsVersion, identity = token.value; options.value = null; optionsError.value = '';
  try {
    const result = await $fetch<any>('/crm/work-time/corrections/options', { baseURL: config.public.apiBase, headers: { Authorization: `Bearer ${identity}` }, timeout: 15000, retry: 0 });
    if (alive && current === optionsVersion && token.value === identity) { options.value = result; if (['review','sheet'].includes(section.value) && !result.canReview) section.value = 'history'; }
  } catch (e: any) { if (alive && current === optionsVersion && token.value === identity) optionsError.value = e?.data?.message || 'Не удалось проверить доступ к исправлениям'; }
}
function refreshTime() { load(); clock.value?.refresh(); }
async function openSheetCorrection(id: string, employeeId: string) { section.value = employeeId === user.value?.id ? 'mine' : 'review'; await nextTick(); corrections.value?.open(id); }
const date = (value: string | null) => value ? new Date(value).toLocaleString('ru-RU', { timeZone: data.value?.timezone || 'Europe/Moscow', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Не завершено';
async function load() {
  const requestVersion = ++version, identity = token.value; loading.value = true; error.value = ''; data.value = null;
  try {
    const result = await $fetch<WorkTimeHistory>('/crm/work-time', { baseURL: config.public.apiBase, headers: { Authorization: `Bearer ${token.value}` }, query: { month: month.value }, timeout: 15000, retry: 0 });
    if (alive && requestVersion === version && token.value === identity) data.value = result;
  } catch (e: any) { if (alive && requestVersion === version && token.value === identity) error.value = e?.data?.message || 'Не удалось загрузить историю рабочего времени'; }
  finally { if (alive && requestVersion === version) loading.value = false; }
}
onMounted(() => { load(); loadOptions(); }); watch(token, () => { section.value = 'history'; load(); loadOptions(); }); onUnmounted(() => { alive = false; ++version; ++optionsVersion; });
</script>
<template>
  <main class="crm-standard">
    <header class="crm-page-header"><div><h1>Рабочее время</h1><p>Ваш рабочий день, перерывы и фактически отработанное время.</p></div><NuxtLink v-if="can('work_schedule.read')" to="/crm/work-schedule" class="crm-button">Открыть график</NuxtLink></header>
    <div class="crm-page-content crm-page-content--stack">
      <CrmCardTabs v-model="section" prefix="work-time" :tabs="tabs" label="Разделы рабочего времени" />
      <div v-if="optionsError" class="crm-notice crm-action-bar"><p role="alert">{{ optionsError }}</p><button class="crm-button" @click="loadOptions">Проверить доступ к исправлениям</button></div>
      <div v-show="section === 'history'" id="work-time-history-panel" role="tabpanel" aria-labelledby="work-time-history-tab" class="crm-page-content--stack">
      <CrmWorkClock ref="clock" @changed="load" />
      <section class="crm-surface" aria-label="История рабочего времени">
        <header class="crm-panel-header"><div><p>ЛИЧНЫЕ ОТМЕТКИ</p><h2>История рабочего времени</h2></div><form class="crm-filter-form crm-filter-form--compact" aria-label="Фильтры истории времени" @submit.prevent="load"><label>Месяц<input v-model="month" class="crm-input" type="month" min="2000-01" max="2099-12" required @change="load" /></label><button class="crm-button crm-button--refresh" :disabled="loading"><RefreshCw :size="18" />Обновить историю</button></form></header>
        <div class="crm-register crm-page-content--stack">
          <p v-if="error" role="alert">{{ error }}</p><p v-if="loading" role="status">Загружаем историю…</p>
          <template v-if="data">
            <p class="crm-inline-note">Итоги за выбранный месяц · {{ data.timezone }}. Ночные интервалы разделяются по границам месяца. Это фактические отметки, не утверждённый табель.</p>
            <div class="crm-summary-grid"><div><small>План месяца</small><strong>{{ data.plan?.available ? workTimeDuration(data.plan.plannedMs || 0) : '—' }}</strong></div><div><small>Рабочее время</small><strong>{{ workTimeDuration(data.totals.workedMs) }}</strong></div><div><small>Перерывы</small><strong>{{ workTimeDuration(data.totals.breakMs) }}</strong></div><div><small>{{ data.plan?.available && data.totals.workedMs > (data.plan.plannedMs || 0) ? 'Сверх плана месяца' : 'Осталось до плана месяца' }}</small><strong>{{ data.plan?.available ? workTimeDuration(Math.abs((data.plan.plannedMs || 0) - data.totals.workedMs)) : '—' }}</strong></div></div>
            <p class="crm-inline-note">План — все опубликованные смены выбранного месяца, включая шаблоны и ручные исключения. При переходе через границу месяца плановый перерыв распределяется пропорционально. Разница с фактом не является расчётом переработки или зарплаты.</p>
            <p v-if="data.plan?.warning" role="status">{{ data.plan.warning }}</p>
            <button v-if="options?.canCreate && data.canRequestCorrection" class="crm-button" @click="corrections?.create()">Добавить пропущенный день</button>
            <p v-if="!data.items.length">В этом месяце отметок пока нет. Начните рабочий день в блоке выше.</p>
            <details v-for="row in data.items" :key="row.id" class="crm-item-card crm-register">
              <summary>{{ date(row.startedAt) }} — {{ date(row.endedAt) }} · {{ workTimeDuration(row.periodTotals?.workedMs || 0) }} работы</summary>
              <div class="crm-page-content--stack">
                <p class="crm-inline-note">{{ row.status === 'FINISHED' ? 'Рабочий день завершён' : row.status === 'BREAK' ? 'На перерыве' : 'Рабочий день идёт' }} · Перерывы в выбранном месяце: {{ workTimeDuration(row.periodTotals?.breakMs || 0) }}. Для открытого дня итоги — на момент обновления.</p>
                <p v-if="!row.breaks.length" class="crm-inline-note">Перерывов не было.</p>
                <p v-for="(pause, index) in row.breaks" :key="index" class="crm-inline-note">Перерыв {{ index + 1 }}: {{ date(pause.startedAt) }} — {{ date(pause.endedAt) }}</p>
                <button v-if="options?.canCreate && data.canRequestCorrection" class="crm-button" @click="corrections?.create(row)">Исправить отметку</button>
              </div>
            </details>
          </template>
        </div>
      </section>
      </div>
      <div v-show="['mine','review'].includes(section)" :id="'work-time-' + (section === 'review' ? 'review' : 'mine') + '-panel'" role="tabpanel" :aria-labelledby="'work-time-' + (section === 'review' ? 'review' : 'mine') + '-tab'">
        <CrmTimeCorrections ref="corrections" :visible="['mine','review'].includes(section)" :scope="section === 'review' ? 'REVIEW' : 'MINE'" :can-create="Boolean(options?.canCreate)" :can-review="Boolean(options?.canReview)" :timezone="options?.timezone || data?.timezone || 'Europe/Moscow'" :month="month" @changed="refreshTime" @show-mine="section = 'mine'" />
      </div>
      <div v-show="section === 'sheet'" id="work-time-sheet-panel" role="tabpanel" aria-labelledby="work-time-sheet-tab"><CrmTimesheet :visible="section === 'sheet'" @correction="openSheetCorrection" /></div>
    </div>
  </main>
</template>
