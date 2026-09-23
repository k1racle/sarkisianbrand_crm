<script setup lang="ts">
import { Plus, RefreshCw, Users, X } from '@lucide/vue';
useHead({ title: 'Отделы — SARKISIAN CRM' });
const session = useWorkspaceSession(), config = useRuntimeConfig();
const departments = ref<any[]>([]), staff = ref<any[]>([]), loading = ref(false), saving = ref(false), error = ref(''), formError = ref('');
const opened = ref(false), selected = ref<any>(null), baseline = ref('');
const showArchived = ref(false);
const draft = reactive({ name: '', parentId: '', leaderId: '', memberIds: [] as string[] });
const dirty = computed(() => opened.value && baseline.value !== JSON.stringify(draft));
const request = (path: string, options: any = {}) => $fetch<any>('/system-settings' + path, { baseURL: config.public.apiBase, headers: { Authorization: `Bearer ${session.token.value}` }, ...options });
const label = (person: any) => [person.firstName, person.lastName].filter(Boolean).join(' ') || person.email;
const assigned = computed(() => new Map(departments.value.flatMap(department => department.members.map((member: any) => [member.id, department.id]))));
const candidates = computed(() => staff.value.filter(member => (!assigned.value.has(member.id) || assigned.value.get(member.id) === selected.value?.id) && (member.isActive || draft.memberIds.includes(member.id))));
function descendants(id: string): string[] { return departments.value.filter(department => department.parentId === id).flatMap(department => [department.id, ...descendants(department.id)]); }
const parents = computed(() => departments.value.filter(department => department.id !== selected.value?.id && !descendants(selected.value?.id || '').includes(department.id)));
async function load() {
  loading.value = true; error.value = '';
  try { const [list, team] = await Promise.all([request('/departments', { query: { status: showArchived.value ? 'archived' : 'active' } }), request('/staff')]); departments.value = list; staff.value = team; }
  catch (e: any) { error.value = e?.data?.message || 'Не удалось загрузить отделы'; }
  finally { loading.value = false; }
}
function open(department?: any) {
  selected.value = department || null; formError.value = '';
  Object.assign(draft, { name: department?.name || '', parentId: department?.parentId || '', leaderId: department?.leaderId || '', memberIds: department?.members.map((member: any) => member.id) || [] });
  baseline.value = JSON.stringify(draft); opened.value = true;
}
function leave() { return !saving.value && (!dirty.value || window.confirm('Изменения отдела не сохранены. Выйти без сохранения?')); }
function close() { if (leave()) opened.value = false; }
const { panel, keyboard } = useCatalogDialog(computed(() => opened.value), close);
watch(() => [...draft.memberIds], ids => { if (draft.leaderId && !ids.includes(draft.leaderId)) draft.leaderId = ''; });
async function save() {
  if (saving.value) return;
  saving.value = true; formError.value = '';
  try {
    await request('/departments' + (selected.value ? '/' + selected.value.id : ''), { method: selected.value ? 'PATCH' : 'POST', body: { ...draft, name: draft.name.trim(), parentId: draft.parentId || null, leaderId: draft.leaderId || null, ...(selected.value ? { version: selected.value.version } : {}) } });
    opened.value = false; await load();
  } catch (e: any) { formError.value = e?.data?.message || 'Не удалось сохранить отдел'; }
  finally { saving.value = false; }
}
async function archive(department: any) {
  if (saving.value || !window.confirm(`Архивировать отдел «${department.name}»? Его история сохранится.`)) return;
  saving.value = true; error.value = '';
  try { await request(`/departments/${department.id}/archive`, { method: 'POST', body: { version: department.version } }); await load(); }
  catch (e: any) { error.value = e?.data?.message || 'Не удалось архивировать отдел'; }
  finally { saving.value = false; }
}
async function restore(department: any) {
  if (saving.value || !window.confirm(`Восстановить отдел «${department.name}»? Состав сотрудников автоматически не восстанавливается.`)) return;
  saving.value = true; error.value = '';
  try { await request(`/departments/${department.id}/restore`, { method: 'POST', body: { version: department.version } }); await load(); }
  catch (e: any) { error.value = e?.data?.message || 'Не удалось восстановить отдел'; }
  finally { saving.value = false; }
}
watch(showArchived, load);
function unload(event: BeforeUnloadEvent) { if (dirty.value || saving.value) { event.preventDefault(); event.returnValue = ''; } }
onMounted(() => { load(); window.addEventListener('beforeunload', unload); });
onBeforeUnmount(() => window.removeEventListener('beforeunload', unload));
onBeforeRouteLeave(leave);
</script>

<template>
  <main class="crm-standard">
    <header class="crm-page-header"><div><h1>Отделы</h1><p>Структура команды, руководители и состав подразделений.</p></div><div class="crm-action-bar"><button class="crm-button crm-button--refresh" :disabled="loading || saving" @click="load"><RefreshCw :size="18" />Обновить</button><button class="crm-button crm-button--primary" :disabled="loading || saving || showArchived" @click="open()"><Plus :size="18" />Новый отдел</button></div></header>
    <p v-if="error" role="alert">{{ error }}</p><p v-if="loading" role="status">Загружаем структуру…</p>
    <section class="crm-surface crm-register crm-stack"><p>Сотрудник входит в один отдел. Для перевода сначала исключите его из прежнего отдела. Отдел пока не ограничивает видимость данных. При смене состава или подчинённости сессии затронутых сотрудников завершаются — им потребуется войти снова.</p>
      <label class="crm-toggle-row"><span>Архив отделов</span><input v-model="showArchived" type="checkbox" class="crm-check" :disabled="loading || saving" /></label>
      <article v-for="department in departments" :key="department.id" class="crm-item-card crm-record"><span><strong>{{ department.name }}</strong><small>{{ department.parentId ? departments.find(item => item.id === department.parentId)?.name || 'Дочерний отдел' : 'Самостоятельный отдел' }}</small></span><span><strong>{{ department.leader ? label(department.leader) : 'Руководитель не назначен' }}</strong><small>Сотрудников: {{ department.members.length }}</small></span><template v-if="!showArchived"><button class="crm-button" :disabled="saving" @click="open(department)">Изменить</button><button class="crm-button crm-button--danger" :disabled="saving" @click="archive(department)">В архив</button></template><button v-else class="crm-button" :disabled="saving" @click="restore(department)">Восстановить</button></article>
      <div v-if="!loading && !departments.length" class="crm-empty"><Users :size="28" /><h2>{{ showArchived ? 'В архиве нет отделов' : 'Создайте первый отдел' }}</h2><p>{{ showArchived ? 'Архивные отделы можно восстановить с сохранением истории.' : 'Например, «Продажи», «Маркетинг» или «Поддержка».' }}</p></div>
    </section>
    <Teleport to="body"><div v-if="opened" class="admin-dialog-backdrop crm-detail-backdrop" @click.self="close"><form ref="panel" class="admin-dialog admin-dialog--drawer crm-detail-card" role="dialog" aria-modal="true" aria-labelledby="department-title" tabindex="-1" @keydown="keyboard" @submit.prevent="save">
      <header><h2 id="department-title">{{ selected ? 'Редактировать отдел' : 'Новый отдел' }}</h2><button class="crm-button crm-button--icon" aria-label="Закрыть отдел" type="button" :disabled="saving" @click="close"><X :size="18" /></button></header>
      <div class="admin-dialog-body crm-detail-body crm-stack"><p v-if="formError" role="alert">{{ formError }}</p><fieldset class="ui-fieldset-reset crm-stack" :disabled="saving"><label class="crm-field">Название<input v-model="draft.name" class="crm-input" required maxlength="100" /></label><label class="crm-field">Родительский отдел<select v-model="draft.parentId" class="crm-input"><option value="">Самостоятельный отдел</option><option v-for="department in parents" :key="department.id" :value="department.id">{{ department.name }}</option></select></label>
        <fieldset class="ui-fieldset-reset crm-stack"><legend>Сотрудники отдела</legend><p>Доступны сотрудники без отдела и текущий состав.</p><label v-for="member in candidates" :key="member.id" class="crm-record crm-item-card crm-toggle-row"><input v-model="draft.memberIds" type="checkbox" class="crm-check" :value="member.id" /><span><strong>{{ label(member) }}</strong><small>{{ member.email }}{{ member.isActive ? '' : ' · Заблокирован' }}</small></span></label><p v-if="!candidates.length">Нет доступных сотрудников. Добавьте сотрудника или освободите его от прежнего отдела.</p></fieldset>
        <label class="crm-field">Руководитель<select v-model="draft.leaderId" class="crm-input"><option value="">Не назначен</option><option v-for="member in candidates.filter(item => item.isActive && draft.memberIds.includes(item.id))" :key="member.id" :value="member.id">{{ label(member) }}</option></select></label>
      </fieldset></div><footer class="crm-detail-footer"><button type="button" class="crm-button" :disabled="saving" @click="close">Отмена</button><button type="submit" class="crm-button crm-button--primary" :disabled="saving || !draft.name.trim() || (selected && !dirty)">{{ saving ? 'Сохраняем…' : 'Сохранить отдел' }}</button></footer>
    </form></div></Teleport>
  </main>
</template>
