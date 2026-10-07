<script setup lang="ts">
useHead({ title: 'Организации — SARKISIAN CRM' });
import { Building2, ChevronLeft, ChevronRight, CircleCheck, Plus, RefreshCw, Search, ShoppingBag, UserRound, Users, X } from '@lucide/vue';
const config = useRuntimeConfig();
const { token, user } = useWorkspaceSession();
const { openContextMenu, copyText } = useContextMenu();
const organizations = ref<any[]>([]);
const createOpen = ref(false);
const loading = ref(false);
const error = ref('');
const { actionBusy, runOperation } = useWorkspaceOperation(error);
const { selected, setEntity, closeEditor, markSaved, entityPanel, entityKeys } = useWorkspaceEntityDraft<any>(actionBusy);
const access = useWorkspaceAccess();
const canEdit = computed(() => access.can('customers.write'));
const pageLoaded = ref(false);
const search = ref('');
const status = ref('');
const notice = ref('');
const managers = ref<any[]>([]);
const statusFilters = [{ value: '', label: 'Все организации' }, { value: 'ACTIVE', label: 'Активные' }, { value: 'PROSPECT', label: 'Потенциальные' }, { value: 'ON_HOLD', label: 'Приостановленные' }, { value: 'ARCHIVED', label: 'Архив' }];
const hasFilters = computed(() => Boolean(search.value || status.value));
const page = ref(1);
const pageSize = 25;
const pageCount = computed(() => Math.max(1, Math.ceil(organizations.value.length / pageSize)));
const visibleOrganizations = computed(() => organizations.value.slice((page.value - 1) * pageSize, page.value * pageSize));
const managerName = (item: any) => [item.accountManager?.firstName, item.accountManager?.lastName].filter(Boolean).join(' ') || item.accountManager?.email || 'Не назначен';
function resetFilters() { search.value = ''; status.value = ''; }
const canWriteRecord = (record: any) => canEdit.value && record?.canWrite === true;
const canEditSelected = computed(() => canWriteRecord(selected.value));
async function loadManagers() { managers.value = canEdit.value ? await $fetch<any[]>('/customer-360/team', { baseURL: config.public.apiBase, headers: headers.value }) : []; }
const form = reactive({ name: '', legalName: '', inn: '', kpp: '', legalAddress: '', status: 'PROSPECT', discountTier: 0, creditLimit: 0 });
let searchTimer: ReturnType<typeof setTimeout>;
let loadVersion = 0;
const emptyForm = JSON.stringify(form);
const createDirty = computed(() => createOpen.value && JSON.stringify(form) !== emptyForm);
function closeCreate() { if (actionBusy.value || (createDirty.value && !window.confirm('Закрыть форму без сохранения организации?'))) return false; createOpen.value = false; Object.assign(form, JSON.parse(emptyForm)); return true; }
onBeforeRouteLeave(() => !actionBusy.value && (!createDirty.value || window.confirm('Есть несохранённая организация. Покинуть страницу?')));
const { panel: createPanel, keyboard: createKeys } = useCatalogDialog(computed(() => createOpen.value), closeCreate);
const headers = computed(() => ({ Authorization: `Bearer ${token.value}` }));
const statusLabels: Record<string, string> = { PROSPECT: 'Потенциальный клиент', ACTIVE: 'Активна', ON_HOLD: 'Приостановлена', ARCHIVED: 'В архиве' };
const memberLabels: Record<string, string> = { OWNER: 'Владелец', BUYER: 'Закупщик', ACCOUNTANT: 'Бухгалтер', EMPLOYEE: 'Сотрудник' };
const orderLabels: Record<string, string> = { NEW: 'Новый', CONFIRMED: 'Подтверждён', PAYMENT_WAITING: 'Ожидает оплату', PAID: 'Оплачен', ASSEMBLING: 'Собирается', SHIPPED: 'Отправлен', DELIVERED: 'Доставлен', CANCELLED: 'Отменён', REFUNDED: 'Возврат' };
const totals = computed(() => ({ active: organizations.value.filter(item => item.status === 'ACTIVE').length, people: organizations.value.reduce((sum, item) => sum + Number(item._count?.members || 0), 0), orders: organizations.value.reduce((sum, item) => sum + Number(item._count?.orders || 0), 0) }));
const summary = computed(() => [
  { label: 'Организации', value: organizations.value.length, icon: Building2 },
  { label: 'Активные', value: totals.value.active, icon: CircleCheck },
  { label: 'Представители', value: totals.value.people, icon: Users },
  { label: 'Заказы B2B', value: totals.value.orders, icon: ShoppingBag },
]);

async function load() {
  const version = ++loadVersion;
  const identity = token.value;
  loading.value = true;
  error.value = '';
  try { const rows = await $fetch<any[]>('/customer-360/organizations', { baseURL: config.public.apiBase, headers: headers.value, query: { search: search.value || undefined, status: status.value || undefined } }); if (version !== loadVersion || token.value !== identity) return; organizations.value = rows; pageLoaded.value = true; page.value = Math.min(page.value, pageCount.value); }
  catch (reason:any) { if (version === loadVersion) error.value = typeof reason?.data?.message === 'string' ? reason.data.message : 'Не удалось загрузить организации. Повторите попытку.'; }
  finally { if (version === loadVersion) loading.value = false; }
}
async function openOrganization(item: any) { if (!closeEditor()) return; await runOperation(async () => { const [row] = await Promise.all([$fetch(`/customer-360/organizations/${item.id}`, { baseURL: config.public.apiBase, headers: headers.value }), loadManagers()]); setEntity(row); }); }
async function createOrganization() {
  if (!canEdit.value) return;
  await runOperation(async () => {
  await $fetch('/customer-360/organizations', { baseURL: config.public.apiBase, method: 'POST', headers: headers.value, body: { ...form, legalName: form.legalName || undefined, inn: form.inn || undefined, kpp: form.kpp || undefined, legalAddress: form.legalAddress || undefined, discountTier: Number(form.discountTier), creditLimit: Number(form.creditLimit) } });
  Object.assign(form, { name: '', legalName: '', inn: '', kpp: '', legalAddress: '', status: 'PROSPECT', discountTier: 0, creditLimit: 0 });
  createOpen.value = false; notice.value = 'Организация создана'; await load(); setTimeout(() => notice.value = '', 2200);
  });
}
async function saveOrganization() {
  if (!selected.value || !canEditSelected.value) return;
  await runOperation(async () => {
  const saved = await $fetch<any>(`/customer-360/organizations/${selected.value.id}`, { baseURL: config.public.apiBase, method: 'PATCH', headers: headers.value, body: { name: selected.value.name, legalName: selected.value.legalName || undefined, inn: selected.value.inn || undefined, kpp: selected.value.kpp || undefined, legalAddress: selected.value.legalAddress || undefined, status: selected.value.status, discountTier: Number(selected.value.discountTier), creditLimit: Number(selected.value.creditLimit), accountManagerId: selected.value.accountManagerId } });
  markSaved(saved);
  notice.value = 'Организация сохранена'; await load(); setTimeout(() => notice.value = '', 2200);
  });
}
async function archiveOrganization(item:any){if (!canWriteRecord(item)) return; await runOperation(async () => {await $fetch(`/customer-360/organizations/${item.id}`,{baseURL:config.public.apiBase,method:'PATCH',headers:headers.value,body:{status:'ARCHIVED'}});notice.value='Организация перемещена в архив';await load();setTimeout(()=>notice.value='',2200)});}
async function moveOrganizationToTrash(item:any){if (!canWriteRecord(item) || !closeEditor()) return; await runOperation(async () => {await $fetch(`/data-lifecycle/ORGANIZATION/${item.id}/trash`,{baseURL:config.public.apiBase,method:'POST',headers:headers.value,body:{reason:'Удалено из реестра B2B-организаций'}});notice.value='Организация перемещена в корзину на 30 дней';await load();setTimeout(()=>notice.value='',2600)});}
function organizationMenu(event:MouseEvent,item:any){openContextMenu(event,item.name,[{label:'Открыть карточку',icon:'open',action:()=>openOrganization(item)},...(item.inn?[{label:'Копировать ИНН',icon:'copy' as const,action:()=>copyText(item.inn,'ИНН скопирован')}]:[]),...(canWriteRecord(item) && item.status!=='ARCHIVED'?[{label:'Переместить в архив',icon:'archive' as const,danger:true,separator:true,confirm:`Переместить «${item.name}» в архив?`,action:()=>archiveOrganization(item)}]:[]),...(user.value?.role==='ADMIN' && canWriteRecord(item)?[{label:'Переместить в корзину',icon:'trash' as const,danger:true,separator:item.status==='ARCHIVED',confirm:`Переместить «${item.name}» в корзину? Восстановить организацию можно в настройках экосистемы в течение 30 дней.`,action:()=>moveOrganizationToTrash(item)}]:[])],statusLabels[item.status])}
watch([search, status], (next, previous) => {
  clearTimeout(searchTimer); ++loadVersion; page.value = 1;
  if (next[0] !== previous[0]) searchTimer = setTimeout(load, 300);
  else void load();
});
onBeforeUnmount(() => { ++loadVersion; clearTimeout(searchTimer); });
onMounted(load);
</script>

<template>
<main data-v-ui-62f6efe9efa8 class="org-page crm-standard crm-directory">
  <header class="crm-page-header">
    <div><h1>Организации</h1><span>Компании, представители и ответственные менеджеры</span></div>
    <div class="crm-directory-header-actions"><button class="crm-button crm-button--refresh" :disabled="loading" @click="load"><RefreshCw :size="16" :class="{ spin: loading }" /> Обновить</button><button class="crm-button crm-button--primary" :disabled="actionBusy || !canEdit" @click="createOpen = true"><Plus :size="16" /> Новая организация</button></div>
  </header>
  <p v-if="error" class="operation-error" role="alert">{{ error }}</p>
  <WorkspaceLoading v-if="loading && !pageLoaded" label="Загружаем организации" />
  <div v-else-if="pageLoaded" class="crm-page-content crm-directory-content">
    <section class="crm-directory-summary" aria-label="Сводка по организациям в текущей выборке">
      <article v-for="metric in summary" :key="metric.label" class="crm-surface crm-directory-metric">
        <span class="crm-directory-metric-icon"><component :is="metric.icon" :size="20" /></span>
        <span class="crm-directory-metric-label">{{ metric.label }}</span><strong>{{ metric.value }}</strong>
      </article>
    </section>
    <section class="crm-surface crm-directory-register" aria-label="Список организаций" :aria-busy="loading">
      <div class="crm-directory-register-heading"><h2>Реестр организаций <span>{{ organizations.length }}</span></h2><small>Показатели по текущей выборке</small></div>
      <nav class="crm-directory-tabs" aria-label="Статусы организаций">
        <button v-for="filter in statusFilters" :key="filter.value" class="crm-button" :aria-pressed="status === filter.value" @click="status = filter.value">{{ filter.label }}</button>
      </nav>
      <div class="crm-directory-toolbar">
        <div class="crm-input-group crm-directory-search"><Search :size="18" aria-hidden="true" /><input v-model="search" class="crm-input" type="search" aria-label="Поиск организаций" placeholder="Название, юридическое лицо или ИНН" /><button v-if="search" class="crm-directory-clear" aria-label="Очистить поиск" @click="search = ''"><X :size="16" /></button></div>
        <button v-if="hasFilters" class="crm-button crm-button--text" @click="resetFilters"><X :size="16" /> Сбросить</button>
      </div>
      <div v-if="organizations.length" class="crm-directory-columns crm-directory-columns--organizations" aria-hidden="true"><span>Организация</span><span>Реквизиты</span><span>Ответственный менеджер</span><span>Работа с компанией</span><span /></div>
      <div class="crm-directory-rows">
        <button v-for="item in visibleOrganizations" :key="item.id" class="org-row crm-button crm-card-action crm-directory-row crm-directory-row--organization" :disabled="actionBusy" @click="openOrganization(item)" @contextmenu.prevent="organizationMenu($event, item)">
          <span class="crm-directory-identity">
            <span class="crm-directory-avatar crm-directory-avatar--organization"><Building2 :size="22" /></span>
            <span class="crm-directory-stack"><strong>{{ item.name }}</strong><small v-if="item.legalName">{{ item.legalName }}</small><span class="crm-directory-status" :data-status="item.status">{{ statusLabels[item.status] || item.status }}</span></span>
          </span>
          <span class="crm-directory-stack"><span>ИНН <b>{{ item.inn || 'не указан' }}</b></span><small>КПП {{ item.kpp || 'не указан' }}</small></span>
          <span class="crm-directory-stack">
            <span class="crm-directory-icon-line" :class="{ 'crm-directory-unassigned': !item.accountManager }"><UserRound :size="16" aria-hidden="true" /><span>{{ managerName(item) }}</span></span>
            <small>{{ item.accountManager?.email || 'Назначьте в карточке организации' }}</small>
          </span>
          <span class="crm-directory-stack crm-directory-activity"><b>Заказы: {{ item._count?.orders || 0 }}</b><small>Представители: {{ item._count?.members || 0 }} · Скидка: {{ item.discountTier || 0 }}%</small></span>
          <ChevronRight class="crm-directory-open" :size="18" aria-hidden="true" />
        </button>
      </div>
      <div v-if="!organizations.length && !loading" class="crm-directory-empty">
        <Search v-if="hasFilters" :size="28" /><Building2 v-else :size="28" />
        <strong>{{ hasFilters ? 'Организации не найдены' : 'Добавьте первую организацию' }}</strong>
        <p>{{ hasFilters ? 'Проверьте название, ИНН или выбранный статус.' : 'Соберите реквизиты, представителей и историю заказов в одной карточке.' }}</p>
        <button v-if="hasFilters" class="crm-button" @click="resetFilters">Сбросить фильтры</button>
        <button v-else-if="canEdit" class="crm-button crm-button--primary" :disabled="actionBusy" @click="createOpen = true"><Plus :size="16" /> Добавить организацию</button>
      </div>
      <footer class="crm-directory-footer">
        <small role="status"><template v-if="loading">Обновляем список…</template><template v-else-if="organizations.length">Показано {{ (page - 1) * pageSize + 1 }}–{{ Math.min(page * pageSize, organizations.length) }} из {{ organizations.length }}</template><template v-else>Нет записей</template></small>
        <nav v-if="pageCount > 1" class="crm-directory-pagination" aria-label="Страницы организаций"><button class="crm-button crm-button--icon" :disabled="page === 1 || loading" aria-label="Предыдущая страница" @click="page--"><ChevronLeft :size="16" /></button><span>{{ page }} / {{ pageCount }}</span><button class="crm-button crm-button--icon" :disabled="page === pageCount || loading" aria-label="Следующая страница" @click="page++"><ChevronRight :size="16" /></button></nav>
        <small v-else class="crm-directory-hint">Нажмите на организацию, чтобы открыть карточку</small>
      </footer>
    </section>
  </div>
  <aside data-v-ui-62f6efe9efa8 v-if="selected" class="backdrop admin-dialog-backdrop" @click.self="closeEditor"><div data-v-ui-62f6efe9efa8 ref="entityPanel" class="drawer admin-dialog admin-dialog--drawer" role="dialog" aria-modal="true" tabindex="-1" @keydown="entityKeys"><header data-v-ui-62f6efe9efa8><div data-v-ui-62f6efe9efa8><p data-v-ui-62f6efe9efa8>КАРТОЧКА B2B</p><h2 data-v-ui-62f6efe9efa8>{{ selected.name }}</h2><span data-v-ui-62f6efe9efa8>{{ selected.inn ? `ИНН ${selected.inn}` : 'Реквизиты заполняются' }}</span></div><button class="crm-button crm-button--icon" data-v-ui-62f6efe9efa8 @click="closeEditor" :disabled="actionBusy" aria-label="Закрыть карточку"><X data-v-ui-62f6efe9efa8 :size="19" /></button></header><div data-v-ui-62f6efe9efa8 class="drawer-body admin-dialog-body"><p data-v-ui-62f6efe9efa8 v-if="error" class="operation-error" role="alert">{{ error }}</p><fieldset data-v-ui-62f6efe9efa8 class="edit-grid ui-fieldset-reset" :disabled="actionBusy || !canEditSelected"><CrmAccountManagerField v-model="selected.accountManagerId" :people="managers" :current="selected.accountManager" /><label data-v-ui-62f6efe9efa8>Название<input class="crm-input" data-v-ui-62f6efe9efa8 v-model="selected.name" /></label><label data-v-ui-62f6efe9efa8>Юридическое название<input class="crm-input" data-v-ui-62f6efe9efa8 v-model="selected.legalName" /></label><label data-v-ui-62f6efe9efa8>ИНН<input class="crm-input" data-v-ui-62f6efe9efa8 v-model="selected.inn" /></label><label data-v-ui-62f6efe9efa8>КПП<input class="crm-input" data-v-ui-62f6efe9efa8 v-model="selected.kpp" /></label><label data-v-ui-62f6efe9efa8>Статус<select class="crm-input" data-v-ui-62f6efe9efa8 v-model="selected.status"><option data-v-ui-62f6efe9efa8 value="PROSPECT">Потенциальный клиент</option><option data-v-ui-62f6efe9efa8 value="ACTIVE">Активна</option><option data-v-ui-62f6efe9efa8 value="ON_HOLD">Приостановлена</option><option data-v-ui-62f6efe9efa8 value="ARCHIVED">В архиве</option></select></label><label data-v-ui-62f6efe9efa8>Скидка, %<input class="crm-input" data-v-ui-62f6efe9efa8 v-model.number="selected.discountTier" type="number" min="0" max="100" /></label><label data-v-ui-62f6efe9efa8>Кредитный лимит, ₽<input class="crm-input" data-v-ui-62f6efe9efa8 v-model.number="selected.creditLimit" type="number" min="0" /></label><label data-v-ui-62f6efe9efa8 class="wide">Юридический адрес<input class="crm-input" data-v-ui-62f6efe9efa8 v-model="selected.legalAddress" /></label><button class="crm-button crm-button--primary" data-v-ui-62f6efe9efa8 @click="saveOrganization" :disabled="actionBusy || !canEditSelected">Сохранить изменения</button></fieldset><section data-v-ui-62f6efe9efa8 class="details"><h3 data-v-ui-62f6efe9efa8><Users data-v-ui-62f6efe9efa8 :size="16" /> Представители</h3><div data-v-ui-62f6efe9efa8 v-for="member in selected.members" :key="member.id" class="detail-row"><span data-v-ui-62f6efe9efa8><strong data-v-ui-62f6efe9efa8>{{ [member.user.firstName,member.user.lastName].filter(Boolean).join(' ') || member.user.email }}</strong><small data-v-ui-62f6efe9efa8>{{ member.user.email }}</small></span><span data-v-ui-62f6efe9efa8><b data-v-ui-62f6efe9efa8>{{ memberLabels[member.role] }}</b><small data-v-ui-62f6efe9efa8>{{ member.jobTitle || (member.canSeeFinance ? 'Видит финансы' : 'Рабочий доступ') }}</small></span></div><p data-v-ui-62f6efe9efa8 v-if="!selected.members?.length" class="empty-small">Представители ещё не добавлены</p></section><section data-v-ui-62f6efe9efa8 class="details"><h3 data-v-ui-62f6efe9efa8><ShoppingBag data-v-ui-62f6efe9efa8 :size="16" /> Последние заказы</h3><div data-v-ui-62f6efe9efa8 v-for="order in selected.orders" :key="order.id" class="detail-row"><span data-v-ui-62f6efe9efa8><strong data-v-ui-62f6efe9efa8>{{ order.orderNumber }}</strong><small data-v-ui-62f6efe9efa8>{{ new Date(order.createdAt).toLocaleDateString('ru-RU') }}</small></span><span data-v-ui-62f6efe9efa8><b data-v-ui-62f6efe9efa8>{{ Number(order.finalAmount).toLocaleString('ru-RU') }} ₽</b><small data-v-ui-62f6efe9efa8>{{ orderLabels[order.status] || order.status }}</small></span></div><p data-v-ui-62f6efe9efa8 v-if="!selected.orders?.length" class="empty-small">{{ selected.relatedAccess?.orders === false ? 'Нет доступа к истории заказов' : 'Нет доступных заказов' }}</p></section></div></div></aside>
  <aside data-v-ui-62f6efe9efa8 v-if="createOpen" class="backdrop admin-dialog-backdrop" @click.self="closeCreate"><form data-v-ui-62f6efe9efa8 ref="createPanel" role="dialog" aria-modal="true" tabindex="-1" @keydown="createKeys" class="drawer create admin-dialog admin-dialog--drawer" @submit.prevent="createOrganization"><header data-v-ui-62f6efe9efa8><div data-v-ui-62f6efe9efa8><p data-v-ui-62f6efe9efa8>НОВЫЙ B2B-КЛИЕНТ</p><h2 data-v-ui-62f6efe9efa8>Организация</h2><span data-v-ui-62f6efe9efa8>Реквизиты и коммерческие условия</span></div><button class="crm-button crm-button--icon" data-v-ui-62f6efe9efa8 type="button" @click="closeCreate" :disabled="actionBusy" aria-label="Закрыть форму организации"><X data-v-ui-62f6efe9efa8 :size="19" /></button></header><div data-v-ui-62f6efe9efa8 class="drawer-body edit-grid admin-dialog-body"><p data-v-ui-62f6efe9efa8 v-if="error" class="operation-error" role="alert">{{ error }}</p><fieldset data-v-ui-62f6efe9efa8 class="ui-fieldset-reset ui-create-fields" :disabled="actionBusy || !canEdit"><label data-v-ui-62f6efe9efa8>Название<input class="crm-input" data-v-ui-62f6efe9efa8 v-model="form.name" required /></label><label data-v-ui-62f6efe9efa8>Юридическое название<input class="crm-input" data-v-ui-62f6efe9efa8 v-model="form.legalName" /></label><label data-v-ui-62f6efe9efa8>ИНН<input class="crm-input" data-v-ui-62f6efe9efa8 v-model="form.inn" /></label><label data-v-ui-62f6efe9efa8>КПП<input class="crm-input" data-v-ui-62f6efe9efa8 v-model="form.kpp" /></label><label data-v-ui-62f6efe9efa8>Начальный статус<select class="crm-input" data-v-ui-62f6efe9efa8 v-model="form.status"><option data-v-ui-62f6efe9efa8 value="PROSPECT">Потенциальный клиент</option><option data-v-ui-62f6efe9efa8 value="ACTIVE">Активна</option></select></label><label data-v-ui-62f6efe9efa8>Скидка, %<input class="crm-input" data-v-ui-62f6efe9efa8 v-model.number="form.discountTier" type="number" min="0" max="100" /></label><label data-v-ui-62f6efe9efa8>Кредитный лимит, ₽<input class="crm-input" data-v-ui-62f6efe9efa8 v-model.number="form.creditLimit" type="number" min="0" /></label><label data-v-ui-62f6efe9efa8 class="wide">Юридический адрес<input class="crm-input" data-v-ui-62f6efe9efa8 v-model="form.legalAddress" /></label><button class="crm-button" data-v-ui-62f6efe9efa8 type="submit">Создать организацию</button></fieldset></div></form></aside>
  <div data-v-ui-62f6efe9efa8 v-if="notice" class="toast">{{ notice }}</div>
</main></template>
