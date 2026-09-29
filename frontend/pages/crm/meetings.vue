<script setup lang="ts">
import { CalendarClock, Plus, RefreshCw, X } from '@lucide/vue';
useHead({ title: 'Встречи — SARKISIAN CRM' });
type Person = { id: string; firstName?: string; lastName?: string; isActive: boolean };
type Meeting = { id: string; title: string; agenda: string; kind: string; startsAt: string; endsAt: string; timezone: string; status: string; organizerId: string; organizer: Person; members: Person[]; version: number; canManage: boolean; cancellationReason?: string };
const session = useWorkspaceSession(), config = useRuntimeConfig();
const request = <T,>(path = '', options: any = {}) => $fetch<T>('/crm/meetings' + path, { baseURL: config.public.apiBase, headers: { Authorization: `Bearer ${session.token.value}` }, timeout: 15000, retry: 0, ...options });
const items = ref<Meeting[]>([]), total = ref(0), page = ref(1), pages = ref(1), canCreate = ref(false);
const month = ref(''), status = ref('SCHEDULED'), search = ref(''), zone = ref('');
const loading = ref(false), saving = ref(false), opening = ref(false), error = ref(''), formError = ref('');
const opened = ref(false), selected = ref<Meeting | null>(null), baseline = ref(''), requestKey = ref('');
const team = ref<Person[]>([]), teamSearch = ref(''), teamError = ref(''), teamLoading = ref(false), teamHasMore = ref(false);
const cancelMode = ref(false), cancelReason = ref('');
const activeTab = ref('general'), guestsVisited = ref(false), guestBusy = ref(false);
const guestPanel = ref<{hasUnsaved:boolean}|null>(null);
const cardTabs = computed<ReadonlyArray<readonly [string,string]>>(() => selected.value?.canManage ? [['general','Общее'],['guests','Гости']] : [['general','Общее']]);
watch(activeTab, value => { if(value === 'guests') guestsVisited.value = true; });
const draft = reactive({ title: '', agenda: '', kind: 'TEAM', start: '', end: '', memberIds: [] as string[] });
const dirty = computed(() => opened.value && baseline.value !== JSON.stringify(draft));
const editable = computed(() => selected.value ? selected.value.canManage : canCreate.value);
const candidates = computed(() => Array.from(new Map([...team.value, ...(selected.value?.members || [])].map(person => [person.id, person])).values()).filter(person => person.id !== selected.value?.organizerId));
const label = (person: Person) => [person.firstName, person.lastName].filter(Boolean).join(' ') || 'Сотрудник';
const kindLabel = (kind: string) => ({ TEAM: 'Планёрка', INTERVIEW: 'Собеседование', OTHER: 'Другая встреча' }[kind] || kind);
const message = (e: any, fallback: string) => Array.isArray(e?.data?.message) ? e.data.message.join('. ') : e?.data?.message || fallback;
const localInput = (date: Date) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
const when = (value: string) => new Date(value).toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
let listVersion = 0, teamVersion = 0, detailVersion = 0;
async function load(reset = false) {
  if (reset) page.value = 1;
  const version = ++listVersion;
  loading.value = true; error.value = '';
  try {
    if (!/^\d{4}-\d{2}$/.test(month.value)) throw new Error('Выберите месяц');
    const [year, number] = month.value.split('-').map(Number);
    const result = await request<{ items: Meeting[]; total: number; page: number; pages: number; canCreate: boolean }>('', { query: { from: new Date(year, number - 1, 1).toISOString(), to: new Date(year, number, 1).toISOString(), status: status.value, q: search.value.trim(), page: page.value, limit: 30 } });
    if (version !== listVersion) return;
    items.value = result.items; total.value = result.total; pages.value = result.pages; canCreate.value = result.canCreate;
    if (page.value > result.pages) { page.value = result.pages; await load(); }
  } catch (e: any) { if (version === listVersion) { items.value = []; total.value = 0; canCreate.value = false; error.value = message(e, 'Не удалось загрузить встречи. Выберите месяц и повторите попытку.'); } }
  finally { if (version === listVersion) loading.value = false; }
}
async function loadTeam() {
  const version = ++teamVersion; teamLoading.value = true; teamError.value = '';
  try { const result = await request<{ items: Person[]; hasMore: boolean }>('/team', { query: { q: teamSearch.value.trim() } }); if (version === teamVersion && opened.value) { team.value = [...result.items, ...team.value.filter(person => draft.memberIds.includes(person.id))]; teamHasMore.value = result.hasMore; } }
  catch (e: any) { if (version === teamVersion) teamError.value = message(e, 'Не удалось загрузить сотрудников'); }
  finally { if (version === teamVersion) teamLoading.value = false; }
}
function fill(row: Meeting | null) {
  selected.value = row; formError.value = ''; cancelMode.value = false; cancelReason.value = '';
  const start = new Date(Math.ceil((Date.now() + 3600000) / 900000) * 900000);
  Object.assign(draft, { title: row?.title || '', agenda: row?.agenda || '', kind: row?.kind || 'TEAM', start: localInput(row ? new Date(row.startsAt) : start), end: localInput(row ? new Date(row.endsAt) : new Date(+start + 3600000)), memberIds: row?.members.map(member => member.id) || [] });
  baseline.value = JSON.stringify(draft);
}
function create() {
  if (!canCreate.value || opening.value) return;
  activeTab.value = 'general'; guestsVisited.value = false; guestBusy.value = false;
  fill(null); requestKey.value = crypto.randomUUID(); opened.value = true;
  team.value = []; teamSearch.value = ''; loadTeam();
}
async function open(row: Meeting) {
  if (opening.value) return;
  const version = ++detailVersion; opening.value = true; error.value = '';
  try {
    const detail = await request<Meeting>('/' + row.id);
    if (version !== detailVersion) return;
    activeTab.value = 'general'; guestsVisited.value = false; guestBusy.value = false;
    fill(detail); opened.value = true; team.value = []; teamSearch.value = '';
    if (detail.canManage) loadTeam();
  } catch (e: any) { if (version === detailVersion) error.value = message(e, 'Встреча недоступна'); }
  finally { if (version === detailVersion) opening.value = false; }
}
function leave() {
  if(saving.value || guestBusy.value) return false;
  if((dirty.value || cancelMode.value && cancelReason.value.trim()) && !window.confirm('Изменения встречи не сохранены. Выйти без сохранения?')) return false;
  return !guestPanel.value?.hasUnsaved || window.confirm('Приглашение не скопировано или не создано. Закрыть карточку? Ссылку и PIN нельзя посмотреть повторно.');
}
function close() { if (leave()) { opened.value = false; ++teamVersion; teamLoading.value = false; } }
const { panel, keyboard } = useCatalogDialog(computed(() => opened.value), close);
function instant(value: string, previous?: string) {
  if (previous && localInput(new Date(previous)) === value) return previous;
  const date = new Date(value);
  if (!Number.isFinite(+date) || localInput(date) !== value) throw new Error('Проверьте дату и время, включая перевод часов в вашем часовом поясе.');
  return date.toISOString();
}
async function save() {
  if (saving.value || guestBusy.value || activeTab.value !== 'general' || !editable.value) return;
  if (guestPanel.value?.hasUnsaved && !leave()) return;
  saving.value = true; formError.value = '';
  try {
    const body = { title: draft.title.trim(), agenda: draft.agenda.trim(), kind: draft.kind, startsAt: instant(draft.start, selected.value?.startsAt), endsAt: instant(draft.end, selected.value?.endsAt), timezone: zone.value, memberIds: [...draft.memberIds], ...(selected.value ? { version: selected.value.version } : { requestKey: requestKey.value }) };
    await request(selected.value ? '/' + selected.value.id : '', { method: selected.value ? 'PATCH' : 'POST', body });
    opened.value = false; ++teamVersion; await load();
  } catch (e: any) { formError.value = message(e, e?.message?.startsWith('Проверьте дату') ? e.message : 'Не удалось сохранить встречу. Черновик сохранён в открытой карточке.'); }
  finally { saving.value = false; }
}
async function reloadCard() {
  if (!selected.value || saving.value || !leave()) return;
  saving.value = true; formError.value = '';
  try { fill(await request<Meeting>('/' + selected.value.id)); if(!selected.value?.canManage) activeTab.value = 'general'; if (editable.value) await loadTeam(); }
  catch (e: any) { formError.value = message(e, 'Не удалось обновить карточку'); }
  finally { saving.value = false; }
}
async function cancel() {
  if (!selected.value || !editable.value || saving.value || guestBusy.value || dirty.value || !cancelReason.value.trim()) return;
  saving.value = true; formError.value = '';
  try { await request('/' + selected.value.id + '/cancel', { method: 'POST', body: { version: selected.value.version, reason: cancelReason.value.trim() } }); opened.value = false; ++teamVersion; await load(); }
  catch (e: any) { formError.value = message(e, 'Не удалось отменить встречу'); }
  finally { saving.value = false; }
}
function unload(event: BeforeUnloadEvent) { if (dirty.value || saving.value || guestBusy.value || guestPanel.value?.hasUnsaved) { event.preventDefault(); event.returnValue = ''; } }
onMounted(() => { zone.value = Intl.DateTimeFormat().resolvedOptions().timeZone; month.value = localInput(new Date()).slice(0, 7); load(); window.addEventListener('beforeunload', unload); });
onBeforeUnmount(() => { ++listVersion; ++teamVersion; ++detailVersion; window.removeEventListener('beforeunload', unload); });
onBeforeRouteLeave(leave);
</script>

<template>
  <main class="crm-standard">
    <header class="crm-page-header"><div><h1>Встречи</h1><p>Планёрки, собеседования и встречи команды.</p></div><div class="crm-action-bar"><button class="crm-button crm-button--refresh" :disabled="loading" @click="load()"><RefreshCw :size="18" />Обновить</button><button v-if="canCreate" class="crm-button crm-button--primary" :disabled="loading || opening" @click="create"><Plus :size="18" />Новая встреча</button></div></header>
    <div class="crm-page-content crm-page-content--stack">
    <form class="crm-toolbar crm-filter-form" aria-label="Фильтры встреч" @submit.prevent="load(true)">
      <label>Месяц<input v-model="month" type="month" class="crm-input" required @change="load(true)" /></label>
      <label>Статус<select v-model="status" class="crm-input" @change="load(true)"><option value="SCHEDULED">Запланированные</option><option value="CANCELLED">Отменённые</option><option value="ALL">Все встречи</option></select></label>
      <label>Поиск по названию<input v-model="search" class="crm-input" maxlength="120" placeholder="Название встречи" /></label>
      <button class="crm-button" type="submit" :disabled="loading">Найти</button>
    </form>
    <p v-if="error" role="alert">{{ error }}</p><p v-if="loading" role="status">Загружаем встречи…</p><p v-if="opening" role="status">Открываем карточку…</p>
    <section class="crm-surface" aria-label="Расписание встреч" :aria-busy="loading">
      <header class="crm-panel-header"><div><p>КОМАНДА</p><h2>Расписание встреч</h2></div><small>Время устройства: {{ zone || 'определяем…' }}</small></header>
      <div class="crm-register crm-record-list">
      <article v-for="meeting in items" :key="meeting.id" class="crm-item-card crm-record"><span><strong>{{ meeting.title }}</strong><small>{{ kindLabel(meeting.kind) }} · {{ meeting.status === 'CANCELLED' ? 'Отменена' : 'Запланирована' }}</small><small>{{ when(meeting.startsAt) }} — {{ when(meeting.endsAt) }}</small></span><span><strong>{{ label(meeting.organizer) }}</strong><small>Организатор · участников: {{ meeting.members.length + 1 }}</small></span><button class="crm-button" :disabled="opening || loading" :aria-label="`Открыть встречу ${meeting.title}`" @click="open(meeting)">Открыть</button></article>
      <div v-if="!loading && !error && !items.length" class="crm-empty"><CalendarClock :size="28" /><h2>Встреч пока нет</h2><p>За выбранный период нет доступных вам встреч. Измените фильтры или запланируйте новую.</p></div>
      <div v-if="!error" class="crm-pagination"><span>Всего: {{ total }} · {{ page }} / {{ pages }}</span><button class="crm-button" :disabled="loading || page <= 1" @click="page--; load()">Назад</button><button class="crm-button" :disabled="loading || page >= pages" @click="page++; load()">Далее</button></div>
      </div>
    </section>
    <p class="crm-inline-note">Доступны планирование, гостевые приглашения по PIN и зал ожидания. Видеосвязь ещё не подключена. Ссылку и PIN организатор передаёт гостю самостоятельно; автоматической рассылки нет.</p>
    </div>
    <Teleport to="body"><div v-if="opened" class="admin-dialog-backdrop crm-detail-backdrop" @click.self="close"><form ref="panel" class="admin-dialog admin-dialog--drawer crm-detail-card" role="dialog" aria-modal="true" aria-labelledby="meeting-title" tabindex="-1" @keydown="keyboard" @submit.prevent="save">
      <header><div><p>Карточка встречи</p><h2 id="meeting-title">{{ selected ? selected.title : 'Новая встреча' }}</h2></div><button class="crm-button crm-button--icon" aria-label="Закрыть встречу" type="button" :disabled="saving || guestBusy" @click="close"><X :size="18" /></button></header>
      <CrmCardTabs v-if="selected" v-model="activeTab" prefix="meeting-card" :tabs="cardTabs" label="Разделы встречи" />
      <div class="admin-dialog-body crm-detail-body crm-stack">
        <div v-if="formError" role="alert" class="crm-stack"><p>{{ formError }}</p><button v-if="selected" class="crm-button" type="button" :disabled="saving" @click="reloadCard">Загрузить актуальную карточку</button></div>
        <section v-show="activeTab === 'general'" id="meeting-card-general-panel" class="crm-stack" :role="selected ? 'tabpanel' : undefined" :aria-labelledby="selected ? 'meeting-card-general-tab' : undefined">
        <p v-if="selected">Организатор: {{ label(selected.organizer) }}. {{ selected.canManage ? 'Вы можете изменить или отменить встречу.' : 'Карточка доступна только для просмотра.' }}</p>
        <p v-if="selected?.status === 'CANCELLED'">Встреча отменена: {{ selected.cancellationReason }}</p>
        <fieldset class="ui-fieldset-reset crm-stack" :disabled="saving || guestBusy || !editable || cancelMode">
          <label class="crm-field">Название<input v-model="draft.title" class="crm-input" maxlength="160" required /></label>
          <label class="crm-field">Тип встречи<select v-model="draft.kind" class="crm-input"><option value="TEAM">Планёрка</option><option value="INTERVIEW">Собеседование</option><option value="OTHER">Другая встреча</option></select></label>
          <p>Время вашего устройства: {{ zone }}. Длительность — от 1 минуты до 12 часов.</p>
          <div class="two"><label class="crm-field">Начало<input v-model="draft.start" class="crm-input" type="datetime-local" required /></label><label class="crm-field">Окончание<input v-model="draft.end" class="crm-input" type="datetime-local" required /></label></div>
          <label class="crm-field">Повестка<textarea v-model="draft.agenda" class="crm-input" rows="4" maxlength="5000" placeholder="Что обсудим и что подготовить участникам" /></label>
          <fieldset class="ui-fieldset-reset crm-stack"><legend>Сотрудники · {{ draft.memberIds.length + 1 }}/10</legend><p>Организатор включён автоматически. Доступны активные сотрудники вашего отдела; администраторы и высшие руководители могут приглашать сотрудников всей компании. После сохранения встречи приглашайте внешних участников во вкладке «Гости». Всего — до 10 человек, включая зарезервированные гостевые места. При переносе или отмене старые приглашения отзываются.</p>
            <template v-if="editable"><label class="crm-field">Найти сотрудника<input v-model="teamSearch" class="crm-input" maxlength="80" @keydown.enter.prevent="loadTeam" /></label><button class="crm-button" type="button" :disabled="teamLoading" @click="loadTeam">Найти сотрудников</button><p v-if="teamLoading" role="status">Загружаем сотрудников…</p><p v-if="teamError" role="alert">{{ teamError }}</p><p v-if="teamHasMore">Показаны первые 100 сотрудников. Уточните поиск.</p></template>
            <label v-for="person in candidates" :key="person.id" class="crm-toggle-row"><span>{{ label(person) }}{{ person.isActive ? '' : ' · Неактивен, исключите из нового состава' }}</span><input v-model="draft.memberIds" class="crm-check" type="checkbox" :value="person.id" :disabled="(!person.isActive || draft.memberIds.length >= 9) && !draft.memberIds.includes(person.id)" /></label>
            <p v-if="!candidates.length && !teamLoading">{{ editable ? 'Нет доступных сотрудников по этому запросу. Можно сохранить встречу только с организатором.' : 'Дополнительные участники не назначены.' }}</p>
          </fieldset>
        </fieldset>
        <section v-if="selected?.canManage" class="crm-stack"><button v-if="!cancelMode" class="crm-button crm-button--danger" type="button" :disabled="saving || dirty" @click="cancelMode = true">Отменить встречу</button><template v-else><label class="crm-field">Причина отмены<textarea v-model="cancelReason" class="crm-input" rows="2" maxlength="500" :disabled="saving" /></label><div class="crm-action-bar"><button class="crm-button" type="button" :disabled="saving" @click="cancelMode = false">Не отменять</button><button class="crm-button crm-button--danger" type="button" :disabled="saving || !cancelReason.trim()" @click="cancel">Подтвердить отмену</button></div></template></section>
        </section>
        <section v-if="selected?.canManage && guestsVisited" v-show="activeTab === 'guests'" id="meeting-card-guests-panel" role="tabpanel" aria-labelledby="meeting-card-guests-tab">
          <CrmMeetingGuests ref="guestPanel" :meeting-id="selected.id" :version="selected.version" :active="activeTab === 'guests'" :disabled="saving || dirty || cancelMode" @busy="guestBusy = $event" @refresh="reloadCard" />
        </section>
      </div>
      <footer class="crm-detail-footer"><button type="button" class="crm-button" :disabled="saving || guestBusy" @click="close">Закрыть</button><button v-if="activeTab === 'general' && editable && !cancelMode" type="submit" class="crm-button crm-button--primary" :disabled="saving || guestBusy || !draft.title.trim() || (selected && !dirty)">{{ saving ? 'Сохраняем…' : 'Сохранить встречу' }}</button></footer>
    </form></div></Teleport>
  </main>
</template>
