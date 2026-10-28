<script setup lang="ts">
import { CalendarClock, Plus, RefreshCw, X } from '@lucide/vue';
import { calendarDay, meetingMonthDays, meetingKind, meetingResponse, type CrmMeeting as Meeting, type MeetingPerson as Person } from '~/shared/crm-meetings';
useHead({ title: 'Календарь событий — SARKISIAN CRM' });
const session = useWorkspaceSession(), config = useRuntimeConfig();
const request = <T,>(path = '', options: any = {}) => $fetch<T>('/crm/meetings' + path, { baseURL: config.public.apiBase, headers: { Authorization: `Bearer ${session.token.value}` }, timeout: 15000, retry: 0, ...options });
const items = ref<Meeting[]>([]), total = ref(0), page = ref(1), pages = ref(1), canCreate = ref(false);
const month = ref(''), status = ref('SCHEDULED'), search = ref(''), zone = ref('');
const displayMode=ref('calendar'),day=ref(calendarDay(new Date())),mine=ref(false),syncOpened=ref(false),declining=ref(false),declineReason=ref(''),responseNotice=ref('');
const route=useRoute();
const loading = ref(false), saving = ref(false), opening = ref(false), error = ref(''), formError = ref('');
const opened = ref(false), selected = ref<Meeting | null>(null), baseline = ref(''), requestKey = ref('');
const team = ref<Person[]>([]), teamSearch = ref(''), teamError = ref(''), teamLoading = ref(false), teamHasMore = ref(false);
const cancelMode = ref(false), cancelReason = ref('');
const activeTab = ref('general'), guestsVisited = ref(false), guestBusy = ref(false);
const guestPanel = ref<{hasUnsaved:boolean}|null>(null);
const cardTabs = computed<ReadonlyArray<readonly [string,string]>>(() => selected.value?.canManage ? [['general','Общее'],['participants','Участники'],['guests','Гости']] : [['general','Общее'],['participants','Участники']]);
watch(activeTab, value => { if(value === 'guests') guestsVisited.value = true; });
const draft = reactive({ title: '', agenda: '', kind: 'MEETING', location:'',meetingUrl:'',reminderMinutes:30,start: '', end: '', memberIds: [] as string[] });
const dirty = computed(() => opened.value && baseline.value !== JSON.stringify(draft));
const editable = computed(() => selected.value ? selected.value.canManage : canCreate.value);
const candidates = computed(() => Array.from(new Map([...team.value, ...(selected.value?.members || [])].map(person => [person.id, person])).values()).filter(person => person.id !== selected.value?.organizerId));
const label = (person: Person) => [person.firstName, person.lastName].filter(Boolean).join(' ') || 'Сотрудник';
const kindLabel = meetingKind;
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
    const dates=meetingMonthDays(month.value),calendar=displayMode.value==='calendar';
    const query={from:(calendar?dates[0]!:new Date(year,number-1,1)).toISOString(),to:(calendar?new Date(dates[41]!.getFullYear(),dates[41]!.getMonth(),dates[41]!.getDate()+1):new Date(year,number,1)).toISOString(),status:status.value,q:search.value.trim(),mine:String(mine.value),page:calendar?1:page.value,limit:calendar?100:30};
    const result = await request<{ items: Meeting[]; total: number; page: number; pages: number; canCreate: boolean }>('', { query });
    if(calendar)for(let next=2;next<=result.pages;next++){if(version!==listVersion)return;const more=await request<{items:Meeting[]}>('',{query:{...query,page:next}});result.items.push(...more.items);}
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
  declining.value=false;declineReason.value=row?.myDeclineReason||'';responseNotice.value='';
  const start = new Date(Math.ceil((Date.now() + 3600000) / 900000) * 900000);
  Object.assign(draft, { title: row?.title || '', agenda: row?.agenda || '', kind: row?.kind || 'MEETING',location:row?.location||'',meetingUrl:row?.meetingUrl||'',reminderMinutes:row?.reminderMinutes??30,start: localInput(row ? new Date(row.startsAt) : start), end: localInput(row ? new Date(row.endsAt) : new Date(+start + 3600000)), memberIds: row?.members.map(member => member.id) || [] });
  baseline.value = JSON.stringify(draft);
}
function create(date?:string) {
  if (!canCreate.value || opening.value) return;
  activeTab.value = 'general'; guestsVisited.value = false; guestBusy.value = false;
  fill(null); requestKey.value = crypto.randomUUID(); opened.value = true;
  if(typeof date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(date)){draft.start=date+'T10:00';draft.end=date+'T11:00';baseline.value=JSON.stringify(draft);}
  team.value = []; teamSearch.value = ''; loadTeam();
}
async function open(row: Pick<Meeting,'id'>) {
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
  if((dirty.value || cancelMode.value && cancelReason.value.trim() || declining.value&&declineReason.value.trim()) && !window.confirm('Изменения встречи не сохранены. Выйти без сохранения?')) return false;
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
    const body = { title: draft.title.trim(), agenda: draft.agenda.trim(), kind: draft.kind,location:draft.location.trim(),meetingUrl:draft.meetingUrl.trim(),reminderMinutes:draft.reminderMinutes,startsAt: instant(draft.start, selected.value?.startsAt), endsAt: instant(draft.end, selected.value?.endsAt), timezone: zone.value, memberIds: [...draft.memberIds], ...(selected.value ? { version: selected.value.version } : { requestKey: requestKey.value }) };
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
function changeMonth(value:string){month.value=value;if(!day.value.startsWith(value))day.value=value+'-01';void load(true);}
async function respond(response:string){if(!selected.value||saving.value||dirty.value)return;saving.value=true;formError.value='';try{fill(await request<Meeting>('/'+selected.value.id+'/respond',{method:'POST',body:{version:selected.value.version,response,reason:declineReason.value}}));responseNotice.value='Ответ отправлен организатору';await load();}catch(e:any){formError.value=message(e,'Не удалось отправить ответ');}finally{saving.value=false;}}
async function downloadCalendar(){if(!selected.value||saving.value)return;saving.value=true;formError.value='';try{const blob=await request<Blob>('/'+selected.value.id+'/calendar.ics',{responseType:'blob'}),url=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=url;anchor.download='sarkisian-event.ics';anchor.click();setTimeout(()=>URL.revokeObjectURL(url),15000);}catch(e:any){formError.value=message(e,'Не удалось скачать событие');}finally{saving.value=false;}}
function openLinked(){const id=route.query.meeting;if(typeof id==='string'&&/^[a-f0-9-]{36}$/i.test(id))void open({id});}
watch(()=>route.query.meeting,()=>{if(!opened.value||leave())openLinked();});
onMounted(() => { zone.value = Intl.DateTimeFormat().resolvedOptions().timeZone; month.value = localInput(new Date()).slice(0, 7); void load().then(openLinked); window.addEventListener('beforeunload', unload); });
onBeforeUnmount(() => { ++listVersion; ++teamVersion; ++detailVersion; window.removeEventListener('beforeunload', unload); });
onBeforeRouteLeave(leave);
const opsFiltersOpen = ref(false);
</script>

<template>
  <main class="crm-standard crm-meetings-page crm-operational-page crm-ops-meetings">
    <header class="crm-page-header"><div><h1>Календарь событий</h1><p>Мероприятия, совещания и встречи команды. Приглашайте сотрудников и собирайте подтверждения участия.</p></div><div class="crm-action-bar"><button class="crm-button" @click="syncOpened=true">Подключить календарь</button><button class="crm-button crm-button--refresh" :disabled="loading" @click="load()"><RefreshCw :size="18" />Обновить</button><button v-if="canCreate" class="crm-button crm-button--primary" :disabled="loading || opening" @click="create()"><Plus :size="18" />Новое событие</button></div></header>
    <div class="crm-page-content crm-page-content--stack">
    <button class="crm-button crm-ops-filter-toggle" type="button" :aria-expanded="opsFiltersOpen" aria-controls="ops-meetings-filters" @click="opsFiltersOpen=!opsFiltersOpen">Период, статус и поиск</button>
      <form id="ops-meetings-filters" :class="{'is-expanded':opsFiltersOpen}" class="crm-toolbar crm-filter-form crm-ops-filters" aria-label="Фильтры встреч" @submit.prevent="load(true)">
      <label class="crm-field">Месяц<input v-model="month" type="month" class="crm-input" required @change="changeMonth(month)" /></label>
      <label class="crm-field">Статус<select v-model="status" class="crm-input" @change="load(true)"><option value="SCHEDULED">Запланированные</option><option value="CANCELLED">Отменённые</option><option value="ALL">Все встречи</option></select></label>
      <label class="crm-field">Поиск по названию<input v-model="search" class="crm-input" maxlength="120" placeholder="Название встречи" /></label>
      <button class="crm-button" type="submit" :disabled="loading">Найти</button>
    </form>
    <div class="crm-action-bar"><button class="crm-button" :aria-pressed="displayMode==='calendar'" @click="displayMode='calendar';load(true)">Календарь</button><button class="crm-button" :aria-pressed="displayMode==='list'" @click="displayMode='list';load(true)">Список</button><label class="crm-toggle-row"><input v-model="mine" type="checkbox" class="crm-check" @change="load(true)"/>Только мои события</label><small>Время встреч · {{zone}}</small></div>
    <p v-if="error" class="operation-error" role="alert">{{ error }}<button class="crm-button" :disabled="loading" @click="load(true)">Повторить загрузку</button></p><p v-if="loading" role="status">Загружаем встречи…</p><p v-if="opening" role="status">Открываем карточку…</p>
    <CrmMeetingCalendar v-if="displayMode==='calendar' && !error" :items="items" :month="month" :day="day" :can-create="canCreate" :loading="loading||opening" @day="day=$event" @month="changeMonth" @open="open" @create="create"/>
    <section v-else-if="displayMode==='list' && !error" class="crm-surface" aria-label="Расписание встреч" :aria-busy="loading">
      <header class="crm-panel-header"><div><p>КОМАНДА</p><h2>Расписание встреч</h2></div><small>Время устройства: {{ zone || 'определяем…' }}</small></header>
      <div class="crm-register crm-record-list">
      <article v-for="meeting in items" :key="meeting.id" class="crm-item-card crm-record"><span><strong>{{ meeting.title }}</strong><small>{{ kindLabel(meeting.kind) }} · {{ meeting.status === 'CANCELLED' ? 'Отменено' : 'Запланировано' }}</small><small>{{ when(meeting.startsAt) }} — {{ when(meeting.endsAt) }}</small><small>{{meeting.location||'Онлайн'}}<template v-if="meeting.myResponse"> · {{meetingResponse(meeting.myResponse)}}</template></small></span><span><strong>{{ label(meeting.organizer) }}</strong><small>Организатор · участников: {{ meeting.members.length + 1 }}</small><small v-if="meeting.responses">Подтвердили {{meeting.responses.accepted}} · ждём {{meeting.responses.pending}} · не смогут {{meeting.responses.declined}}</small></span><button class="crm-button" :disabled="opening || loading" :aria-label="`Открыть встречу ${meeting.title}`" @click="open(meeting)">{{ meeting.myResponse==='PENDING'?'Ответить на приглашение':'Открыть' }}</button></article>
      <div v-if="!loading && !error && !items.length" class="crm-empty"><CalendarClock :size="28" /><h2>Встреч пока нет</h2><p>За выбранный период нет доступных вам встреч. Измените фильтры или запланируйте новую.</p><button v-if="search || mine || status!=='SCHEDULED'" class="crm-button" @click="search='';mine=false;status='SCHEDULED';load(true)">Сбросить фильтры</button><button v-else-if="canCreate" class="crm-button crm-button--primary" @click="create()">Запланировать событие</button></div>
      <div v-if="!error" class="crm-pagination"><span>Всего: {{ total }} · {{ page }} / {{ pages }}</span><button class="crm-button" :disabled="loading || page <= 1" @click="page--; load()">Назад</button><button class="crm-button" :disabled="loading || page >= pages" @click="page++; load()">Далее</button></div>
      </div>
    </section>
    <p class="crm-inline-note">Приглашения, изменения и ответы приходят в уведомления CRM. После изменения темы, времени или места участникам нужно подтвердить участие заново.</p>
    </div>
    <Teleport to="body"><div v-if="opened" class="admin-dialog-backdrop crm-detail-backdrop" @click.self="close"><form ref="panel" class="admin-dialog admin-dialog--drawer crm-detail-card" role="dialog" aria-modal="true" aria-labelledby="meeting-title" tabindex="-1" @keydown="keyboard" @submit.prevent="save">
      <header><div><p>Карточка события</p><h2 id="meeting-title">{{ selected ? selected.title : 'Новое событие' }}</h2></div><button class="crm-button crm-button--icon" aria-label="Закрыть встречу" type="button" :disabled="saving || guestBusy" @click="close"><X :size="18" /></button></header>
      <CrmCardTabs v-if="selected" v-model="activeTab" prefix="meeting-card" :tabs="cardTabs" label="Разделы встречи" />
      <div class="admin-dialog-body crm-detail-body crm-stack">
        <div v-if="formError" role="alert" class="crm-stack"><p>{{ formError }}</p><button v-if="selected" class="crm-button" type="button" :disabled="saving" @click="reloadCard">Загрузить актуальную карточку</button></div>
        <section v-show="activeTab === 'general'" id="meeting-card-general-panel" class="crm-stack" :role="selected ? 'tabpanel' : undefined" :aria-labelledby="selected ? 'meeting-card-general-tab' : undefined">
        <p v-if="selected">Организатор: {{ label(selected.organizer) }}. {{ selected.canManage ? 'Вы можете изменить или отменить событие.' : 'Сведения о событии.' }}</p>
        <button v-if="selected" type="button" class="crm-button" :disabled="saving" @click="downloadCalendar">Скачать .ics</button>
        <p v-if="selected?.meetingUrl"><a :href="selected.meetingUrl" target="_blank" rel="noopener noreferrer">Открыть онлайн-встречу</a></p>
        <section v-if="selected?.canRespond" class="crm-surface meeting-rsvp crm-stack" aria-label="Ваш ответ на приглашение"><h3>Вы участвуете?</h3><p>{{meetingResponse(selected.myResponse)}}<template v-if="selected.myDeclineReason"> · {{selected.myDeclineReason}}</template></p><p v-if="responseNotice" role="status">{{responseNotice}}</p><div class="crm-action-bar"><button class="crm-button crm-button--primary" type="button" :disabled="saving||dirty" @click="respond('ACCEPTED')">Участвую</button><button class="crm-button" type="button" :disabled="saving||dirty" @click="declining=!declining">Не смогу</button></div><template v-if="declining"><label class="crm-field">Почему не сможете участвовать<textarea v-model="declineReason" class="crm-input" rows="3" maxlength="1000" :disabled="saving"/></label><button class="crm-button" type="button" :disabled="saving||dirty||!declineReason.trim()" @click="respond('DECLINED')">Отправить причину отказа</button></template></section>
        <p v-if="selected?.status === 'CANCELLED'">Встреча отменена: {{ selected.cancellationReason }}</p>
        <fieldset class="ui-fieldset-reset crm-stack" :disabled="saving || guestBusy || !editable || cancelMode">
          <label class="crm-field">Тема события<input v-model="draft.title" class="crm-input" maxlength="160" required /></label>
          <label class="crm-field">Формат<select v-model="draft.kind" class="crm-input"><option value="MEETING">Совещание</option><option value="EVENT">Мероприятие</option><option value="TEAM">Планёрка</option><option value="INTERVIEW">Собеседование</option><option value="OTHER">Другая встреча</option></select></label>
          <p>Время вашего устройства: {{ zone }}. Длительность — от 1 минуты до 12 часов.</p>
          <div class="two"><label class="crm-field">Начало<input v-model="draft.start" class="crm-input" type="datetime-local" required /></label><label class="crm-field">Окончание<input v-model="draft.end" class="crm-input" type="datetime-local" required /></label></div>
          <label class="crm-field">Место проведения<input v-model="draft.location" class="crm-input" maxlength="500" :required="!draft.meetingUrl&&['MEETING','EVENT'].includes(draft.kind)" placeholder="Офис, переговорная, адрес или название площадки"/></label>
          <label class="crm-field">Ссылка на онлайн-встречу<input v-model="draft.meetingUrl" class="crm-input" type="url" maxlength="2000" placeholder="https://…"/></label>
          <label class="crm-field">Напомнить участникам<select v-model.number="draft.reminderMinutes" class="crm-input"><option :value="0">Без напоминания</option><option :value="5">За 5 минут</option><option :value="15">За 15 минут</option><option :value="30">За 30 минут</option><option :value="60">За час</option><option :value="1440">За день</option></select></label>
          <label class="crm-field">Повестка<textarea v-model="draft.agenda" class="crm-input" rows="4" maxlength="5000" placeholder="Что обсудим и что подготовить участникам" /></label>
          <fieldset class="ui-fieldset-reset crm-stack"><legend>Пригласить сотрудников · {{ draft.memberIds.length + 1 }}/200</legend><p>Организатор включён автоматически. После сохранения приглашённые получат уведомление и смогут подтвердить участие или написать причину отказа. Доступны сотрудники вашего отдела; администраторы и высшее руководство могут приглашать всю компанию.</p>
            <template v-if="editable"><label class="crm-field">Найти сотрудника<input v-model="teamSearch" class="crm-input" maxlength="80" @keydown.enter.prevent="loadTeam" /></label><button class="crm-button" type="button" :disabled="teamLoading" @click="loadTeam">Найти сотрудников</button><p v-if="teamLoading" role="status">Загружаем сотрудников…</p><p v-if="teamError" role="alert">{{ teamError }}</p><p v-if="teamHasMore">Показаны первые 100 сотрудников. Уточните поиск.</p></template>
            <label v-for="person in candidates" :key="person.id" class="crm-toggle-row"><span>{{ label(person) }}{{ person.isActive ? '' : ' · Неактивен, исключите из нового состава' }}</span><input v-model="draft.memberIds" class="crm-check" type="checkbox" :value="person.id" :disabled="(!person.isActive || draft.memberIds.length >= 199) && !draft.memberIds.includes(person.id)" /></label>
            <p v-if="!candidates.length && !teamLoading">{{ editable ? 'Нет доступных сотрудников по этому запросу. Можно сохранить встречу только с организатором.' : 'Дополнительные участники не назначены.' }}</p>
          </fieldset>
        </fieldset>
        <section v-if="selected?.canManage" class="crm-stack"><button v-if="!cancelMode" class="crm-button crm-button--danger" type="button" :disabled="saving || dirty" @click="cancelMode = true">Отменить встречу</button><template v-else><label class="crm-field">Причина отмены<textarea v-model="cancelReason" class="crm-input" rows="2" maxlength="500" :disabled="saving" /></label><div class="crm-action-bar"><button class="crm-button" type="button" :disabled="saving" @click="cancelMode = false">Не отменять</button><button class="crm-button crm-button--danger" type="button" :disabled="saving || !cancelReason.trim()" @click="cancel">Подтвердить отмену</button></div></template></section>
        </section>
        <section v-if="selected" v-show="activeTab==='participants'" id="meeting-card-participants-panel" role="tabpanel" aria-labelledby="meeting-card-participants-tab" class="crm-stack"><h3>Ответы участников</h3><p v-if="selected.responses">Участвуют: {{selected.responses.accepted+1}} · ждём ответа: {{selected.responses.pending}} · не смогут: {{selected.responses.declined}}</p><article class="meeting-response-row"><strong>{{label(selected.organizer)}}</strong><span>Организатор · участвует</span></article><article v-for="person in selected.members" :key="person.id" class="meeting-response-row"><strong>{{label(person)}}</strong><span>{{meetingResponse(person.response)}}</span><p v-if="person.declineReason">Причина отказа: {{person.declineReason}}</p><small v-if="person.respondedAt">Ответ {{when(person.respondedAt)}}</small></article></section>
        <section v-if="selected?.canManage && guestsVisited" v-show="activeTab === 'guests'" id="meeting-card-guests-panel" role="tabpanel" aria-labelledby="meeting-card-guests-tab">
          <CrmMeetingGuests ref="guestPanel" :meeting-id="selected.id" :version="selected.version" :active="activeTab === 'guests'" :disabled="saving || dirty || cancelMode" @busy="guestBusy = $event" @refresh="reloadCard" />
        </section>
      </div>
      <footer class="crm-detail-footer"><button type="button" class="crm-button" :disabled="saving || guestBusy" @click="close">Закрыть</button><button v-if="activeTab === 'general' && editable && !cancelMode" type="submit" class="crm-button crm-button--primary" :disabled="saving || guestBusy || !draft.title.trim() || (selected && !dirty)">{{ saving ? 'Сохраняем…' : selected?'Сохранить изменения':'Создать и пригласить' }}</button></footer>
    </form></div></Teleport>
    <CrmMeetingCalendarSync v-model="syncOpened"/>
  </main>
</template>
<style scoped>
.crm-meetings-page .crm-page-content{grid-template-columns:minmax(0,1fr)}.crm-meetings-page .crm-action-bar{min-width:0;max-width:100%;flex-wrap:wrap}.crm-meetings-page .crm-page-header>div{min-width:0}.crm-meetings-page .crm-action-bar>small{white-space:normal}
.meeting-rsvp{padding:20px}.meeting-rsvp h3{margin:0}.meeting-response-row{display:grid;gap:8px;padding:16px 0;border-bottom:1px solid var(--crm-line);overflow-wrap:anywhere}.meeting-response-row p{margin:0;white-space:pre-wrap}.meeting-response-row small{color:var(--crm-muted)}
</style>
