<script setup lang="ts">
import { ChevronLeft, ChevronRight, Copy, Plus, RefreshCw, Search, ShieldCheck, X } from '@lucide/vue';
type Grant = { permissionKey: string; scope: string; departmentIds: string[] };
type Draft = { id?: string; version?: number; name: string; description: string; grants: Grant[] };
const session = useWorkspaceSession(), config = useRuntimeConfig();
const catalog = ref<any>(null), result = ref<any>({ items: [], total: 0, page: 1, limit: 30 }), staff = ref<any[]>([]);
const loading = ref(false), busy = ref(false), error = ref(''), notice = ref(''), formError = ref('');
const search = ref(''), archived = ref(false), page = ref(1), permissionSearch = ref(''), template = ref('');
const mode = ref<'edit' | 'preview' | null>(null), draft = ref<Draft | null>(null), baseline = ref('');
const preview = ref<any>(null), previewProfile = ref<any>(null), employeeId = ref('');
const dirty = computed(() => mode.value === 'edit' && JSON.stringify(draft.value) !== baseline.value);
const label = (person: any) => [person.firstName, person.lastName].filter(Boolean).join(' ') || person.email;
const filteredPermissions = computed(() => (catalog.value?.permissions || []).filter((permission: any) => `${permission.description || ''} ${permission.key}`.toLocaleLowerCase('ru-RU').includes(permissionSearch.value.toLocaleLowerCase('ru-RU'))));
const reasons: Record<string, string> = { PROFILE: 'По проекту роли', COMPANY_LEADERSHIP: 'Руководство: вся компания', EXPLICIT_DENY: 'Сохранённый личный запрет', ACCOUNT_UNAVAILABLE: 'Учётная запись недоступна', UNKNOWN_SCOPE: 'Неизвестная область', INVALID_DEPARTMENT_SELECTION: 'Некорректный выбор отделов', SELECTED_DEPARTMENT_UNAVAILABLE: 'Выбранный отдел отсутствует или в архиве', DEPARTMENT_NOT_ASSIGNED: 'Действующий отдел не назначен', INVALID_DEPARTMENT_TREE: 'Нарушена структура отделов' };
let generation = 0, controller: AbortController | undefined, filterTimer: ReturnType<typeof setTimeout> | undefined;
const request = (path: string, options: any = {}) => $fetch<any>(`/system-settings${path}`, { baseURL: config.public.apiBase, headers: { Authorization: `Bearer ${session.token.value}` }, timeout: 15000, retry: 0, ...options });
const message = (e: any, fallback: string) => Array.isArray(e?.data?.message) ? e.data.message.join('. ') : e?.data?.message || fallback;
async function load() {
  const identity = session.token.value, current = ++generation;
  controller?.abort(); controller = new AbortController();
  loading.value = true; error.value = '';
  try {
    const options = { signal: controller.signal };
    const [nextCatalog, nextResult, nextStaff] = await Promise.all([
      request('/access-profiles/catalog', options),
      request('/access-profiles', { ...options, query: { page: page.value, search: search.value, status: archived.value ? 'archived' : 'active' } }),
      request('/staff', options),
    ]);
    if (current !== generation || identity !== session.token.value) return;
    catalog.value = nextCatalog; result.value = nextResult; staff.value = nextStaff;
  } catch (e: any) { if (current === generation && identity === session.token.value) error.value = message(e, 'Не удалось загрузить проекты ролей'); }
  finally { if (current === generation) loading.value = false; }
}
function canLeave() { return !busy.value && (!dirty.value || window.confirm('Закрыть проект роли без сохранения изменений?')); }
function close() { if (canLeave()) { mode.value = null; draft.value = null; preview.value = null; formError.value = ''; } }
const { panel, keyboard } = useCatalogDialog(computed(() => mode.value !== null), close);
function prepare(value: Draft) {
  draft.value = value; baseline.value = JSON.stringify(value); permissionSearch.value = ''; template.value = ''; formError.value = ''; mode.value = 'edit';
}
async function open(item?: any, duplicate = false, simulate = false) {
  if (busy.value || loading.value) return;
  if (!item) { prepare({ name: '', description: '', grants: [] }); return; }
  const identity = session.token.value; busy.value = true; error.value = '';
  try {
    const row = await request(`/access-profiles/${item.id}`);
    if (identity !== session.token.value) return;
    if (simulate) { previewProfile.value = row; employeeId.value = ''; preview.value = null; formError.value = ''; mode.value = 'preview'; }
    else prepare({ ...(duplicate ? {} : { id: row.id, version: row.version }), name: duplicate ? `${row.name.slice(0, 65)} — копия` : row.name, description: row.description,
      grants: row.grants.map((grant: any) => ({ permissionKey: grant.permission.key, scope: grant.scope, departmentIds: grant.departments.map((item: any) => item.departmentId) })) });
  } catch (e: any) { if (identity === session.token.value) error.value = message(e, 'Не удалось открыть проект'); }
  finally { busy.value = false; }
}
function grantFor(key: string) { return draft.value?.grants.find(grant => grant.permissionKey === key); }
function unavailableDepartments(key: string) { return grantFor(key)?.departmentIds.filter(id => !catalog.value?.departments.some((department: any) => department.id === id)) || []; }
function clearUnavailableDepartments(key: string) { const grant = grantFor(key); if (grant) grant.departmentIds = grant.departmentIds.filter(id => !unavailableDepartments(key).includes(id)); }
function toggle(key: string, checked: boolean) {
  if (!draft.value) return;
  if (checked && !grantFor(key)) draft.value.grants.push({ permissionKey: key, scope: 'OWN', departmentIds: [] });
  else if (!checked) draft.value.grants = draft.value.grants.filter(grant => grant.permissionKey !== key);
}
function scopeChanged(key: string, value: string) { const grant = grantFor(key); if (grant) { grant.scope = value; grant.departmentIds = []; } }
function applyTemplate() {
  const source = catalog.value?.templates.find((item: any) => item.id === template.value);
  if (!draft.value || !source || (draft.value.grants.length && !window.confirm('Заменить выбранные операции шаблоном? Название и описание сохранятся.'))) return;
  if (!draft.value.name) draft.value.name = source.name;
  if (!draft.value.description) draft.value.description = source.description;
  draft.value.grants = source.permissionKeys.map((permissionKey: string) => ({ permissionKey, scope: 'OWN', departmentIds: [] }));
}
async function save() {
  if (busy.value || !draft.value) return;
  const identity = session.token.value, value = JSON.parse(JSON.stringify(draft.value));
  busy.value = true; formError.value = '';
  try {
    await request('/access-profiles' + (value.id ? `/${value.id}` : ''), { method: value.id ? 'PATCH' : 'POST', body: { name: value.name.trim(), description: value.description, grants: value.grants, ...(value.id ? { version: value.version } : {}) } });
    if (identity !== session.token.value) return;
    mode.value = null; draft.value = null; notice.value = 'Проект роли сохранён. Действующие права сотрудников не изменены.';
    page.value = 1; await load();
  } catch (e: any) { if (identity === session.token.value) formError.value = message(e, 'Не удалось сохранить проект'); }
  finally { busy.value = false; }
}
async function archive(item: any, restore = false) {
  if (busy.value || !window.confirm(`${restore ? 'Восстановить' : 'Перенести в архив'} проект «${item.name}»? Права сотрудников не изменятся.`)) return;
  const identity = session.token.value; busy.value = true; error.value = '';
  try {
    await request(`/access-profiles/${item.id}/${restore ? 'restore' : 'archive'}`, { method: 'POST', body: { version: item.version } });
    if (identity !== session.token.value) return;
    notice.value = restore ? 'Проект восстановлен' : 'Проект перенесён в архив'; page.value = 1; await load();
  } catch (e: any) { if (identity === session.token.value) error.value = message(e, 'Не удалось изменить состояние проекта'); }
  finally { busy.value = false; }
}
async function simulate() {
  if (busy.value || !employeeId.value || !previewProfile.value) return;
  const identity = session.token.value; busy.value = true; formError.value = ''; preview.value = null;
  try {
    const data = await request('/access-profiles/preview', { method: 'POST', body: { employeeId: employeeId.value, profiles: [{ id: previewProfile.value.id, version: previewProfile.value.version }] } });
    if (identity === session.token.value) preview.value = data;
  } catch (e: any) { if (identity === session.token.value) formError.value = message(e, 'Не удалось рассчитать область доступа'); }
  finally { busy.value = false; }
}
function unload(event: BeforeUnloadEvent) { if (dirty.value || busy.value) { event.preventDefault(); event.returnValue = ''; } }
function filters() { page.value = 1; clearTimeout(filterTimer); filterTimer = setTimeout(load, 250); }
watch([search, archived], filters);
watch(employeeId, () => { preview.value = null; formError.value = ''; });
watch(() => session.token.value, () => { ++generation; controller?.abort(); mode.value = null; draft.value = null; preview.value = null; catalog.value = null; result.value = { items: [], total: 0 }; staff.value = []; if (session.token.value) void load(); });
onMounted(() => { void load(); window.addEventListener('beforeunload', unload); });
onBeforeUnmount(() => { ++generation; controller?.abort(); clearTimeout(filterTimer); window.removeEventListener('beforeunload', unload); });
onBeforeRouteLeave(canLeave);
</script>

<template>
  <section class="crm-stack" aria-label="Проекты ролей">
    <div class="crm-surface crm-register crm-stack">
      <h2>Настраиваемые профили доступа</h2>
      <p role="note">Проекты ролей пока не назначаются сотрудникам и не меняют действующие права. Здесь можно подготовить операции, области видимости и проверить их на структуре отделов.</p>
      <div class="crm-action-bar"><button class="crm-button crm-button--refresh" :disabled="loading || busy" @click="load"><RefreshCw :size="18" />Обновить проекты</button><button class="crm-button crm-button--primary" :disabled="loading || busy || !catalog" @click="open()"><Plus :size="18" />Новый профиль</button></div>
      <label class="crm-input-group"><Search :size="18" /><input v-model="search" class="crm-input" aria-label="Поиск проектов ролей" placeholder="Название профиля" /></label>
      <label class="crm-toggle-row"><span>Архив проектов</span><input v-model="archived" class="crm-check" type="checkbox" :disabled="busy" /></label>
    </div>
    <p v-if="error" role="alert">{{ error }}</p><p v-if="notice" role="status">{{ notice }}</p><p v-if="loading" role="status">Загружаем проекты ролей…</p>
    <div v-if="!loading && !error" class="crm-record-list">
      <article v-for="item in result.items" :key="item.id" class="crm-item-card crm-record">
        <span><strong>{{ item.name }}</strong><small>{{ item.description || 'Без описания' }}</small><small>{{ item._count.grants }} разрешений · {{ item.archivedAt ? 'В архиве' : 'Черновик' }} · версия {{ item.version }}</small></span>
        <template v-if="!item.archivedAt"><button class="crm-button" :disabled="busy" @click="open(item)">Изменить</button><button class="crm-button" :disabled="busy" @click="open(item, false, true)"><ShieldCheck :size="18" />Проверить проект</button><button class="crm-button crm-button--icon" :disabled="busy" :aria-label="`Создать копию: ${item.name}`" @click="open(item, true)"><Copy :size="18" /></button><button class="crm-button crm-button--danger" :disabled="busy" @click="archive(item)">В архив</button></template>
        <button v-else class="crm-button" :disabled="busy" @click="archive(item, true)">Восстановить</button>
      </article>
      <p v-if="!result.items.length" class="crm-empty">{{ search ? 'По этому названию ничего не найдено.' : archived ? 'Архив проектов пуст.' : 'Создайте первый профиль с нужными операциями и областью доступа.' }}</p>
      <nav v-if="result.total > result.limit" class="crm-pagination" aria-label="Страницы проектов"><button class="crm-button crm-button--icon" aria-label="Предыдущая страница проектов" :disabled="busy || page <= 1" @click="page--; load()"><ChevronLeft :size="18" /></button><span>{{ page }} / {{ Math.ceil(result.total / result.limit) }}</span><button class="crm-button crm-button--icon" aria-label="Следующая страница проектов" :disabled="busy || page * result.limit >= result.total" @click="page++; load()"><ChevronRight :size="18" /></button></nav>
    </div>
    <Teleport to="body"><div v-if="mode" class="admin-dialog-backdrop crm-detail-backdrop" @click.self="close"><form ref="panel" class="admin-dialog admin-dialog--drawer crm-detail-card" role="dialog" aria-modal="true" aria-labelledby="access-profile-title" tabindex="-1" @keydown="keyboard" @submit.prevent="mode === 'edit' ? save() : simulate()">
      <header><div><p class="crm-eyebrow">ПРОЕКТ РОЛИ · НЕ НАЗНАЧЕН</p><h2 id="access-profile-title">{{ mode === 'preview' ? 'Предварительная проверка' : draft?.id ? 'Редактировать профиль' : 'Новый профиль' }}</h2></div><button type="button" class="crm-button crm-button--icon" :disabled="busy" aria-label="Закрыть профиль" @click="close"><X :size="18" /></button></header>
      <div class="admin-dialog-body crm-detail-body crm-stack">
        <p v-if="formError" role="alert">{{ formError }}</p>
        <fieldset v-if="mode === 'edit' && draft" class="ui-fieldset-reset crm-stack" :disabled="busy">
          <label class="crm-field">Полное название роли<input v-model="draft.name" class="crm-input" required maxlength="80" placeholder="Например, SMM-специалист" /></label>
          <label class="crm-field">Назначение профиля<textarea v-model="draft.description" class="crm-input" rows="2" maxlength="1000" placeholder="Какие задачи выполняет эта роль" /></label>
          <section class="crm-detail-section"><label class="crm-field">Шаблон операций<select v-model="template" class="crm-input"><option value="">Без шаблона</option><option v-for="item in catalog.templates" :key="item.id" :value="item.id">{{ item.name }}</option></select></label><button type="button" class="crm-button" :disabled="!template" @click="applyTemplate">Применить шаблон</button><p>Шаблон выбирает операции. Проверьте область каждой операции; по умолчанию — только свои записи.</p></section>
          <h3>Разрешения · {{ draft.grants.length }}</h3>
          <label class="crm-input-group"><Search :size="18" /><input v-model="permissionSearch" class="crm-input" aria-label="Поиск операций" placeholder="Найти операцию" /></label>
          <article v-for="permission in filteredPermissions" :key="permission.key" class="crm-item-card crm-register crm-stack">
            <label class="crm-toggle-row"><span class="crm-stack"><strong>{{ permission.description || permission.key }}</strong><small>{{ permission.key }}</small></span><input type="checkbox" class="crm-check" :aria-label="`Разрешить: ${permission.description || permission.key}`" :checked="!!grantFor(permission.key)" @change="toggle(permission.key, ($event.target as HTMLInputElement).checked)" /></label>
            <template v-if="grantFor(permission.key)"><label class="crm-field">Область действия<select class="crm-input" :aria-label="`Область: ${permission.description || permission.key}`" :value="grantFor(permission.key)!.scope" @change="scopeChanged(permission.key, ($event.target as HTMLSelectElement).value)"><option v-for="scope in catalog.scopes" :key="scope.id" :value="scope.id">{{ scope.label }}</option></select></label>
              <fieldset v-if="grantFor(permission.key)!.scope === 'SELECTED_DEPARTMENTS'" class="ui-fieldset-reset crm-stack"><legend>Выбранные отделы</legend><template v-if="unavailableDepartments(permission.key).length"><p role="alert">Некоторые выбранные отделы больше недоступны. Удалите их из проекта и выберите действующие.</p><button type="button" class="crm-button" @click="clearUnavailableDepartments(permission.key)">Убрать недоступные отделы</button></template><label v-for="department in catalog.departments" :key="department.id" class="crm-toggle-row"><span>{{ department.name }}</span><input v-model="grantFor(permission.key)!.departmentIds" class="crm-check" type="checkbox" :value="department.id" /></label><p v-if="!catalog.departments.length">Сначала создайте действующие отделы в настройках CRM.</p></fieldset>
            </template>
          </article><p v-if="!filteredPermissions.length">Операции не найдены. Выбранные разрешения сохранены в форме.</p>
        </fieldset>
        <template v-if="mode === 'preview'"><section class="crm-detail-section"><h3>{{ previewProfile.name }}</h3><p>Расчёт по сохранённой версии профиля. Ничего не назначает сотруднику и не меняет его текущий доступ.</p></section>
          <label class="crm-field">Сотрудник для проверки<select v-model="employeeId" class="crm-input" :disabled="busy"><option value="">Выберите сотрудника</option><option v-for="person in staff" :key="person.id" :value="person.id">{{ label(person) }}</option></select></label>
          <section v-if="preview" class="crm-detail-section" aria-label="Результат предварительной проверки"><p role="note">{{ preview.message }}</p><article v-for="decision in preview.decisions" :key="decision.permissionKey" class="crm-item-card crm-register crm-stack"><strong>{{ decision.description }}</strong><small>{{ decision.permissionKey }}</small><span>{{ decision.allowed ? 'Разрешено в расчёте' : 'Не разрешено в расчёте' }}</span><div v-for="grant in decision.grants" :key="grant.profileId" class="crm-stack"><span>{{ reasons[grant.reason] || 'Правило не определено' }}{{ grant.effectiveScope ? ' · ' + catalog.scopes.find((scope: any) => scope.id === grant.effectiveScope)?.label : '' }}</span><small v-if="grant.resolvedDepartmentIds.length">{{ grant.resolvedDepartmentIds.map((id: string) => preview.departments.find((department: any) => department.id === id)?.name || id).join(', ') }}</small></div></article><p v-if="!preview.decisions.length">В профиле не выбрано ни одной операции. Он не выдаёт разрешений.</p></section>
        </template>
      </div>
      <footer class="crm-detail-footer"><button type="button" class="crm-button" :disabled="busy" @click="close">Отмена</button><button type="submit" class="crm-button crm-button--primary" :disabled="busy || (mode === 'edit' ? !draft?.name.trim() || (!!draft?.id && !dirty) : !employeeId)">{{ busy ? 'Подождите…' : mode === 'edit' ? 'Сохранить проект' : 'Рассчитать доступ' }}</button></footer>
    </form></div></Teleport>
  </section>
</template>
