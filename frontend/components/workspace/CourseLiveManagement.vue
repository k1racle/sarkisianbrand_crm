<script setup lang="ts">
import { MessageCircle, Plus, Radio, RefreshCw } from '@lucide/vue';

type Lesson = { id: string; title: string; kind: string };
type Module = { lessons: Lesson[] };
type Live = { id: string; lessonId: string; hostId: string; title: string; startsAt: string; endsAt: string; status: 'SCHEDULED' | 'LIVE' | 'ENDED' | 'CANCELLED' };
type Host = { id: string; name: string };
type ChatMessage = { id: string; authorName: string; body: string; createdAt: string };
const props = defineProps<{ courseId: string; modules: Module[] }>();
const session = useWorkspaceSession();
const lives = ref<Live[]>([]), hosts = ref<Host[]>([]), messages = ref<ChatMessage[]>([]);
const loading = ref(false), saving = ref(false), error = ref(''), chatError = ref(''), notice = ref(''), selected = ref<Live | null>(null), formOpen = ref(false);
const studio = ref<Live | null>(null);
const form = reactive({ lessonId:'', hostId:'', title:'', startsAt:'', endsAt:'' });
const liveLessons = computed(() => props.modules.flatMap(module => module.lessons || []).filter(lesson => lesson.kind === 'LIVE'));
const currentId = computed(() => session.user.value?.id || '');
const isHost = computed(() => selected.value?.hostId === currentId.value);
const states: Record<Live['status'], string> = { SCHEDULED:'Запланирован', LIVE:'Идёт эфир', ENDED:'Завершён', CANCELLED:'Отменён' };
const formatDate = (value:string) => { const date = new Date(value); return Number.isFinite(date.getTime()) ? date.toLocaleString('ru-RU', { dateStyle:'medium', timeStyle:'short' }) : 'Дата уточняется'; };
const hostName = (id:string) => hosts.value.find(host => host.id === id)?.name || 'Ведущий';
function errorText(e:any, fallback:string) { const status = Number(e?.statusCode || e?.response?.status || e?.data?.statusCode); if (status === 503) return 'Прямые эфиры готовятся. Управление станет доступно после настройки сервиса трансляций.'; const text=e?.data?.message; return Array.isArray(text) ? text.join('; ') : typeof text === 'string' ? text : fallback; }
let requestVersion = 0, chatVersion = 0;
async function load() {
  const version=++requestVersion; loading.value=true; error.value='';
  try { const [list, staff] = await Promise.all([session.request<Live[]>(`/lms/admin/live/course/${encodeURIComponent(props.courseId)}`), session.request<Host[]>('/lms/admin/live/hosts')]); if(version!==requestVersion)return; if(!Array.isArray(list)||!Array.isArray(staff))throw new Error('Invalid response'); lives.value=list; hosts.value=staff; selected.value=selected.value ? list.find(item=>item.id===selected.value?.id) || null : null; studio.value=studio.value ? list.find(item=>item.id===studio.value?.id && item.status==='LIVE' && item.hostId===currentId.value) || null : null; }
  catch(e) { if(version===requestVersion) { lives.value=[]; hosts.value=[]; selected.value=null; studio.value=null; error.value=errorText(e,'Не удалось загрузить эфиры. Повторите попытку.'); } }
  finally { if(version===requestVersion) loading.value=false; }
}
function openForm() { Object.assign(form,{ lessonId:liveLessons.value[0]?.id || '',hostId:currentId.value,title:'',startsAt:'',endsAt:'' }); formOpen.value=true; notice.value=''; error.value=''; }
async function create() {
  if(saving.value)return;
  const starts=new Date(form.startsAt), ends=new Date(form.endsAt);
  if(!liveLessons.value.some(item=>item.id===form.lessonId)||!hosts.value.some(host=>host.id===form.hostId)||!form.title.trim()||!Number.isFinite(starts.getTime())||!Number.isFinite(ends.getTime())||ends<=starts) { error.value='Проверьте урок, ведущего, название и время эфира.'; return; }
  saving.value=true; error.value='';
  try { await session.request('/lms/admin/live',{method:'POST',body:{courseId:props.courseId,lessonId:form.lessonId,hostId:form.hostId,title:form.title.trim(),startsAt:starts.toISOString(),endsAt:ends.toISOString()}}); formOpen.value=false; notice.value='Эфир запланирован.'; await load(); }
  catch(e){error.value=errorText(e,'Не удалось запланировать эфир.');} finally{saving.value=false;}
}
async function action(item:Live, action:'start'|'end'|'cancel') {
  if(saving.value || item.hostId!==currentId.value)return;
  if(action!=='start'&&!window.confirm(action==='end'?'Завершить эфир?':'Отменить запланированный эфир?'))return;
  if(action==='end' && studio.value?.id===item.id)studio.value=null;
  saving.value=true; error.value=''; notice.value='';
  try { const result=await session.request<{status:string;disconnectPending?:boolean}>(`/lms/admin/live/${encodeURIComponent(item.id)}/${action}`,{method:'POST'}); if(action==='end' && selected.value?.id===item.id) { selected.value=null; messages.value=[]; chatVersion++; } notice.value=action==='start'?'Эфир запущен.':action==='end'?(result.disconnectPending?'Эфир завершён, но отключение участников видеосервером ещё не подтверждено. Проверьте связь с видеосервером.':'Эфир завершён.'):'Эфир отменён.'; await load(); }
  catch(e){error.value=errorText(e,'Не удалось изменить состояние эфира.');} finally{saving.value=false;}
}
async function readChat(item:Live) {
  selected.value=item; messages.value=[]; chatError.value=''; const version=++chatVersion;
  try { const data=await session.request<ChatMessage[]>(`/lms/admin/live/${encodeURIComponent(item.id)}/chat`); if(version===chatVersion && Array.isArray(data))messages.value=data; }
  catch(e){if(version===chatVersion)chatError.value=errorText(e,'Не удалось загрузить чат.');}
}
onMounted(load);
onBeforeUnmount(()=>{requestVersion++;chatVersion++;});
</script>

<template>
  <section class="course-panel course-live">
    <header><div><h3>Прямые эфиры</h3><p>Назначьте ведущего и время эфира для урока. Запуск и чат доступны назначенному ведущему.</p></div><div class="course-actions"><button type="button" class="crm-button" :disabled="loading" @click="load"><RefreshCw :size="16"/> Обновить</button><button v-if="!error && !loading" type="button" class="crm-button crm-button--primary" :disabled="!liveLessons.length" @click="openForm"><Plus :size="16"/> Запланировать</button></div></header>
    <p v-if="loading" role="status" class="course-hint">Загружаем эфиры…</p>
    <p v-if="error" role="alert" class="course-error">{{error}}</p><p v-if="notice" role="status" class="course-success">{{notice}}</p>
    <template v-if="!loading && !error">
      <p v-if="!liveLessons.length" class="course-hint">Сначала добавьте в программу урок типа «Прямой эфир».</p>
      <form v-if="formOpen" class="course-editor crm-surface" @submit.prevent="create"><h3>Запланировать эфир</h3><label>Урок<select v-model="form.lessonId" class="crm-input" required><option v-for="lesson in liveLessons" :key="lesson.id" :value="lesson.id">{{lesson.title}}</option></select></label><label>Название эфира<input v-model="form.title" class="crm-input" required maxlength="200"/></label><label>Ведущий<select v-model="form.hostId" class="crm-input" required><option value="" disabled>Выберите сотрудника</option><option v-for="host in hosts" :key="host.id" :value="host.id">{{host.name}}</option></select></label><div class="course-form-grid"><label>Начало<input v-model="form.startsAt" class="crm-input" type="datetime-local" required/></label><label>Окончание<input v-model="form.endsAt" class="crm-input" type="datetime-local" required/></label></div><p class="course-hint">Время указано в часовом поясе этого устройства.</p><footer><button type="button" class="crm-button" :disabled="saving" @click="formOpen=false">Отмена</button><button type="submit" class="crm-button crm-button--primary" :disabled="saving">{{saving?'Сохраняем…':'Запланировать'}}</button></footer></form>
      <div v-if="lives.length" class="course-modules"><article v-for="item in lives" :key="item.id" class="course-module crm-surface"><header><div><h4>{{item.title}}</h4><small>{{formatDate(item.startsAt)}} — {{formatDate(item.endsAt)}} · {{hostName(item.hostId)}}</small><small>{{states[item.status]}}</small></div><div v-if="item.hostId===currentId" class="course-actions"><button v-if="item.status==='SCHEDULED'" type="button" class="crm-button" :disabled="saving" @click="action(item,'start')">Начать</button><button v-if="item.status==='LIVE'" type="button" class="crm-button crm-button--primary" :disabled="saving" @click="studio=item; selected=null"><Radio :size="16"/> Открыть студию</button><button v-if="item.status==='LIVE'" type="button" class="crm-button" :disabled="saving" @click="action(item,'end')">Завершить</button><button v-if="item.status==='SCHEDULED'" type="button" class="crm-button" :disabled="saving" @click="action(item,'cancel')">Отменить</button><button v-if="item.status==='LIVE'" type="button" class="crm-button" @click="studio=null; readChat(item)"><MessageCircle :size="16"/> Чат</button></div></header></article></div><div v-else-if="!formOpen" class="course-empty crm-surface"><h3>Эфиров пока нет</h3><p>Добавьте урок прямого эфира и запланируйте встречу.</p></div>
      <CourseLiveHost v-if="studio && studio.hostId===currentId && studio.status==='LIVE'" :key="studio.id" :live-id="studio.id" :title="studio.title" @close="studio=null" />
      <section v-if="selected && isHost" class="course-module crm-surface course-live-chat"><header><div><h3>Чат: {{selected.title}}</h3><p>Сообщения участников</p></div><button type="button" class="crm-button" @click="readChat(selected)"><RefreshCw :size="16"/> Обновить чат</button></header><p v-if="chatError" class="course-error" role="alert">{{chatError}}</p><div v-else-if="messages.length" class="course-live-messages"><article v-for="entry in messages" :key="entry.id"><strong>{{entry.authorName}}</strong><small>{{formatDate(entry.createdAt)}}</small><p>{{entry.body}}</p></article></div><p v-else class="course-hint">Сообщений пока нет.</p></section>
    </template>
  </section>
</template>
