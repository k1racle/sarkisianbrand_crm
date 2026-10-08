<script setup lang="ts">
useHead({ title: 'Организации — SARKISIAN CRM' });
import { Building2, ChevronLeft, ChevronRight, Plus, RefreshCw, Search, ShoppingBag, SlidersHorizontal, UserPlus, UserRound, Users, X } from '@lucide/vue';
const config = useRuntimeConfig();
const { token, user } = useWorkspaceSession();
const { openContextMenu, copyText } = useContextMenu();
const organizations = ref<any[]>([]);
const loading = ref(false);
const error = ref('');
const { actionBusy, runOperation } = useWorkspaceOperation(error);
const { selected, draftDirty, setEntity, closeEditor, markSaved, entityPanel, entityKeys } = useWorkspaceEntityDraft<any>(actionBusy);
const access = useWorkspaceAccess();
const canEdit = computed(() => access.can('customers.write'));
const pageLoaded = ref(false);
const search = ref('');
const status = ref('');
const notice = ref('');
const managers = ref<any[]>([]);
const statusFilters = [{ value: '', label: 'Все организации' }, { value: 'ACTIVE', label: 'Активные' }, { value: 'PROSPECT', label: 'Потенциальные' }, { value: 'ON_HOLD', label: 'Приостановленные' }, { value: 'ARCHIVED', label: 'Архив' }];
const assignment = ref('');
const sort = ref('updated');
const filtersExpanded = ref(false);
const creating = computed(() => Boolean(selected.value && !selected.value.id));
const organizationTab = ref('profile');
const organizationTabs = computed(() => [{ value: 'profile', label: 'Основное' }, { value: 'details', label: 'Реквизиты' }, ...(!creating.value ? [{ value: 'members', label: 'Представители' }, { value: 'orders', label: 'Заказы' }] : [])]);
const hasFilters = computed(() => Boolean(search.value || status.value || assignment.value));
const extraFilterCount = computed(() => Number(Boolean(status.value)) + Number(Boolean(assignment.value)) + Number(sort.value !== 'updated'));
const filteredOrganizations = computed(() => organizations.value.filter(item => !assignment.value || (assignment.value === 'mine' ? Boolean(user.value?.id) && item.accountManagerId === user.value.id : !item.accountManagerId)).sort((a, b) => {
  if (sort.value === 'name') return a.name.localeCompare(b.name, 'ru');
  if (sort.value === 'orders') return (b._count?.orders || 0) - (a._count?.orders || 0) || a.name.localeCompare(b.name, 'ru');
  return new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime();
}));
const page = ref(1);
const pageSize = 25;
const pageCount = computed(() => Math.max(1, Math.ceil(filteredOrganizations.value.length / pageSize)));
const visibleOrganizations = computed(() => filteredOrganizations.value.slice((page.value - 1) * pageSize, page.value * pageSize));
const managerName = (item: any) => [item.accountManager?.firstName, item.accountManager?.lastName].filter(Boolean).join(' ') || item.accountManager?.email || 'Не назначен';
function resetFilters() { search.value = ''; status.value = ''; assignment.value = ''; }
function openRow(event: MouseEvent, item: any) { if (!(event.target as HTMLElement).closest('a,button,input,select')) void openOrganization(item); }
function tabKeys(event: KeyboardEvent) {
  const tabs = organizationTabs.value;
  const index = tabs.findIndex(tab => tab.value === organizationTab.value);
  const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : -1;
  if (next < 0) return;
  event.preventDefault(); organizationTab.value = tabs[next].value;
  nextTick(() => document.getElementById('organization-tab-' + organizationTab.value)?.focus());
}
function revealInvalid(event: Event) {
  event.preventDefault();
  const input = event.target as HTMLInputElement;
  const panel = input.closest<HTMLElement>('[role="tabpanel"]');
  if (panel) organizationTab.value = panel.id.replace('organization-panel-', '');
  const section = input.closest('details');
  if (section) section.open = true;
  error.value = 'Проверьте поле «' + (input.closest('label')?.firstChild?.textContent?.trim() || 'Значение') + '»';
  nextTick(() => input.focus());
}
const canWriteRecord = (record: any) => canEdit.value && record?.canWrite === true;
const canEditSelected = computed(() => creating.value ? canEdit.value : canWriteRecord(selected.value));
async function loadManagers() { managers.value = canEdit.value ? await $fetch<any[]>('/customer-360/team', { baseURL: config.public.apiBase, headers: headers.value }) : []; }
let searchTimer: ReturnType<typeof setTimeout>;
let loadVersion = 0;
const headers = computed(() => ({ Authorization: `Bearer ${token.value}` }));
const statusLabels: Record<string, string> = { PROSPECT: 'Потенциальный клиент', ACTIVE: 'Активна', ON_HOLD: 'Приостановлена', ARCHIVED: 'В архиве' };
const memberLabels: Record<string, string> = { OWNER: 'Владелец', BUYER: 'Закупщик', ACCOUNTANT: 'Бухгалтер', EMPLOYEE: 'Сотрудник' };
const orderLabels: Record<string, string> = { NEW: 'Новый', CONFIRMED: 'Подтверждён', PAYMENT_WAITING: 'Ожидает оплату', PAID: 'Оплачен', ASSEMBLING: 'Собирается', SHIPPED: 'Отправлен', DELIVERED: 'Доставлен', CANCELLED: 'Отменён', REFUNDED: 'Возврат' };

async function load() {
  const version = ++loadVersion;
  const identity = token.value;
  loading.value = true;
  error.value = '';
  try { const rows = await $fetch<any[]>('/customer-360/organizations', { baseURL: config.public.apiBase, headers: headers.value, query: { search: search.value || undefined, status: status.value || undefined } }); if (version !== loadVersion || token.value !== identity) return; organizations.value = rows; pageLoaded.value = true; page.value = Math.min(page.value, pageCount.value); }
  catch (reason:any) { if (version === loadVersion) error.value = typeof reason?.data?.message === 'string' ? reason.data.message : 'Не удалось загрузить организации. Повторите попытку.'; }
  finally { if (version === loadVersion) loading.value = false; }
}
async function openOrganization(item: any, tab = 'profile', focusManager = false) {
  if (!closeEditor()) return;
  await runOperation(async () => { const [row] = await Promise.all([$fetch(`/customer-360/organizations/${item.id}`, { baseURL: config.public.apiBase, headers: headers.value }), loadManagers()]); organizationTab.value = tab; setEntity(row); });
  if (focusManager && selected.value) { await nextTick(); entityPanel.value?.querySelector<HTMLSelectElement>('.crm-field select')?.focus(); }
}
async function openNewOrganization() {
  if (!canEdit.value || !closeEditor()) return;
  await runOperation(async () => {
    await loadManagers(); organizationTab.value = 'profile';
    setEntity({ name: '', legalName: '', inn: '', kpp: '', legalAddress: '', status: 'PROSPECT', discountTier: 0, creditLimit: 0, accountManagerId: user.value?.id });
  });
  await nextTick(); entityPanel.value?.querySelector<HTMLInputElement>('input[name="organizationName"]')?.focus();
}
async function saveOrganization() {
  if (!selected.value || !canEditSelected.value) return;
  if (!selected.value.name?.trim()) { organizationTab.value = 'profile'; error.value = 'Укажите название организации'; await nextTick(); entityPanel.value?.querySelector<HTMLInputElement>('input[name="organizationName"]')?.focus(); return; }
  const isNew = creating.value;
  await runOperation(async () => {
  const saved = await $fetch<any>(isNew ? '/customer-360/organizations' : `/customer-360/organizations/${selected.value.id}`, { baseURL: config.public.apiBase, method: isNew ? 'POST' : 'PATCH', headers: headers.value, body: { name: selected.value.name.trim(), legalName: selected.value.legalName || undefined, inn: selected.value.inn || undefined, kpp: selected.value.kpp || undefined, legalAddress: selected.value.legalAddress || undefined, status: selected.value.status, discountTier: Number(selected.value.discountTier), creditLimit: Number(selected.value.creditLimit), accountManagerId: selected.value.accountManagerId } });
  markSaved(saved);
  if (isNew) { resetFilters(); sort.value = 'updated'; page.value = 1; await nextTick(); clearTimeout(searchTimer); }
  notice.value = isNew ? 'Организация создана' : 'Организация сохранена'; await load(); setTimeout(() => notice.value = '', 2200);
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
watch([assignment, sort], () => { page.value = 1; });
watch(() => [selected.value?.name, selected.value?.inn, selected.value?.kpp, selected.value?.discountTier, selected.value?.creditLimit, selected.value?.accountManagerId], () => { if (!actionBusy.value) error.value = ''; });
onBeforeUnmount(() => { ++loadVersion; clearTimeout(searchTimer); });
onMounted(load);
</script>

<template>
  <main class="org-page crm-standard crm-directory crm-organizations-page">
    <header class="crm-page-header">
      <div><h1>Организации <span v-if="pageLoaded" class="crm-org-count">{{ filteredOrganizations.length }}</span></h1><span>Компании, представители и история работы</span></div>
      <div class="crm-org-header-actions">
        <button class="crm-button crm-button--icon" :disabled="loading" aria-label="Обновить" title="Обновить список" @click="load"><RefreshCw :size="18" :class="{ spin: loading }" /></button>
        <button v-if="canEdit" class="crm-button crm-button--primary crm-org-add" :disabled="actionBusy" @click="openNewOrganization"><Plus :size="18" /> Добавить организацию</button>
      </div>
    </header>
    <p v-if="error && !selected" class="operation-error" role="alert">{{ error }}</p>
    <WorkspaceLoading v-if="loading && !pageLoaded" label="Загружаем организации" />
    <div v-else-if="pageLoaded" class="crm-page-content crm-directory-content">
      <section class="crm-surface crm-org-register" :class="{ 'is-filters-open': filtersExpanded }" aria-label="Список организаций" :aria-busy="loading">
        <nav class="crm-org-statuses" aria-label="Статусы организаций">
          <button v-for="filter in statusFilters" :key="filter.value" :aria-pressed="status === filter.value" @click="status = filter.value">{{ filter.label }}</button>
        </nav>
        <div class="crm-org-tools">
          <div class="crm-input-group crm-org-search"><Search :size="18" aria-hidden="true" /><input v-model="search" class="crm-input" type="search" aria-label="Поиск организаций" placeholder="Название или ИНН…" title="Поиск по названию, юридическому лицу или ИНН" /><button v-if="search" class="crm-directory-clear" aria-label="Очистить поиск" @click="search = ''"><X :size="16" /></button></div>
          <button class="crm-button crm-button--icon crm-org-filter-toggle" :aria-expanded="filtersExpanded" :aria-label="'Фильтры и сортировка' + (extraFilterCount ? ': ' + extraFilterCount : '')" aria-controls="organization-status organization-owner organization-sort" @click="filtersExpanded = !filtersExpanded"><SlidersHorizontal :size="18" /><span v-if="extraFilterCount">{{ extraFilterCount }}</span></button>
          <select id="organization-status" v-model="status" class="crm-input crm-org-status-select crm-org-extra-filter" aria-label="Статус организации"><option v-for="filter in statusFilters" :key="filter.value" :value="filter.value">{{ filter.label }}</option></select>
          <select id="organization-owner" v-model="assignment" class="crm-input crm-org-extra-filter" aria-label="Ответственный менеджер"><option value="">Все ответственные</option><option value="mine">Мои организации</option><option value="unassigned">Без менеджера</option></select>
          <select id="organization-sort" v-model="sort" class="crm-input crm-org-extra-filter" aria-label="Сортировка организаций"><option value="updated">Последние изменения</option><option value="name">По названию: А–Я</option><option value="orders">Больше заказов</option></select>
        </div>
        <div v-if="hasFilters" class="crm-org-filter-summary"><span role="status">Найдено: {{ filteredOrganizations.length }}<template v-if="status"> · {{ statusFilters.find(filter => filter.value === status)?.label }}</template></span><button class="crm-button crm-button--text" @click="resetFilters"><X :size="14" /> Сбросить фильтры</button></div>
        <div v-if="filteredOrganizations.length" class="crm-org-columns" aria-hidden="true"><span>Организация</span><span>Реквизиты</span><span>Ответственный</span><span>История</span></div>
        <div class="crm-org-rows">
          <article v-for="item in visibleOrganizations" :key="item.id" class="org-row crm-org-row" :aria-label="item.name" @click="openRow($event, item)" @contextmenu.prevent="organizationMenu($event, item)">
            <div class="crm-org-person">
              <span class="crm-directory-avatar crm-directory-avatar--organization" aria-hidden="true"><Building2 :size="21" /></span>
              <div class="crm-org-stack"><button class="crm-org-name" :disabled="actionBusy" :aria-label="'Открыть организацию: ' + item.name" @click="openOrganization(item)"><strong>{{ item.name }}</strong></button><small v-if="item.legalName">{{ item.legalName }}</small><span class="crm-directory-status" :data-status="item.status">{{ statusLabels[item.status] || item.status }}</span></div>
            </div>
            <div class="crm-org-stack crm-org-requisites"><span><span class="crm-org-label">ИНН</span> {{ item.inn || 'не указан' }}</span><small v-if="item.kpp">КПП {{ item.kpp }}</small></div>
            <div class="crm-org-owner">
              <button v-if="canWriteRecord(item)" class="crm-org-assign" :disabled="actionBusy" @click="openOrganization(item, 'profile', true)"><UserRound v-if="item.accountManager" :size="16" /><UserPlus v-else :size="16" /><span>{{ item.accountManager ? managerName(item) : 'Назначить менеджера' }}</span></button>
              <span v-else class="crm-directory-icon-line"><UserRound :size="16" /><span>{{ managerName(item) }}</span></span>
            </div>
            <div class="crm-org-history">
              <button class="crm-org-stat" :disabled="actionBusy" @click="openOrganization(item, 'orders')"><ShoppingBag :size="15" /><span>Заказы</span><strong>{{ item._count?.orders || 0 }}</strong></button>
              <button class="crm-org-stat" :disabled="actionBusy" @click="openOrganization(item, 'members')"><Users :size="15" /><span>Представители</span><strong>{{ item._count?.members || 0 }}</strong></button>
            </div>
          </article>
        </div>
        <div v-if="!filteredOrganizations.length && !loading" class="crm-directory-empty">
          <Search v-if="hasFilters" :size="28" /><Building2 v-else :size="28" />
          <strong>{{ hasFilters ? 'Организации не найдены' : 'Добавьте первую организацию' }}</strong>
          <p>{{ hasFilters ? 'Измените поисковый запрос или сбросьте фильтры.' : 'Реквизиты, представители и заказы компании будут собраны в одной карточке.' }}</p>
          <button v-if="hasFilters" class="crm-button" @click="resetFilters">Сбросить фильтры</button>
          <button v-else-if="canEdit" class="crm-button crm-button--primary" :disabled="actionBusy" @click="openNewOrganization"><Plus :size="18" /> Добавить организацию</button>
        </div>
        <footer class="crm-org-footer">
          <span role="status"><template v-if="loading">Обновляем список…</template><template v-else-if="pageCount > 1">Показано {{ (page - 1) * pageSize + 1 }}–{{ Math.min(page * pageSize, filteredOrganizations.length) }} из {{ filteredOrganizations.length }}</template><template v-else>Показано: {{ filteredOrganizations.length }}</template></span>
          <nav v-if="pageCount > 1" class="crm-directory-pagination" aria-label="Страницы организаций"><button class="crm-button crm-button--icon" :disabled="page === 1 || loading" aria-label="Предыдущая страница" @click="page--"><ChevronLeft :size="16" /></button><span>{{ page }} / {{ pageCount }}</span><button class="crm-button crm-button--icon" :disabled="page === pageCount || loading" aria-label="Следующая страница" @click="page++"><ChevronRight :size="16" /></button></nav>
          <span v-else class="crm-org-list-hint">Нажмите на строку, чтобы открыть карточку</span>
        </footer>
      </section>
    </div>
    <Teleport to="body">
      <div v-if="selected" class="crm-detail-backdrop admin-dialog-backdrop" @click.self="closeEditor">
        <section ref="entityPanel" class="admin-dialog admin-dialog--drawer crm-detail-card crm-org-dialog" role="dialog" aria-modal="true" aria-labelledby="organization-card-title" tabindex="-1" @keydown="entityKeys">
          <header><div><p class="eyebrow">{{ creating ? 'Клиентская база' : 'Карточка организации' }}</p><h2 id="organization-card-title">{{ creating ? 'Новая организация' : selected.name }}</h2><span v-if="!creating" class="crm-directory-status" :data-status="selected.status">{{ statusLabels[selected.status] }}</span></div><button class="crm-button crm-button--icon" :disabled="actionBusy" aria-label="Закрыть карточку" @click="closeEditor"><X :size="20" /></button></header>
          <nav class="crm-org-card-tabs" role="tablist" aria-label="Разделы организации" @keydown="tabKeys"><button v-for="tab in organizationTabs" :id="'organization-tab-' + tab.value" :key="tab.value" role="tab" :aria-selected="organizationTab === tab.value" :tabindex="organizationTab === tab.value ? 0 : -1" :aria-controls="'organization-panel-' + tab.value" @click="organizationTab = tab.value">{{ tab.label }}</button></nav>
          <form id="organization-editor-form" class="crm-detail-body" @submit.prevent="saveOrganization" @invalid.capture="revealInvalid">
            <p v-if="error" class="operation-error" role="alert">{{ error }}</p>
            <section id="organization-panel-profile" class="crm-order-tab-panel" role="tabpanel" aria-labelledby="organization-tab-profile" :hidden="organizationTab !== 'profile'">
              <p v-if="creating" class="crm-org-form-note">Для начала достаточно названия. Реквизиты можно заполнить позже.</p>
              <fieldset class="ui-fieldset-reset crm-org-fields" :disabled="actionBusy || !canEditSelected">
                <label class="crm-org-wide">Название компании<input class="crm-input" name="organizationName" v-model="selected.name" placeholder="Например, Студия красоты «Форма»" autocomplete="organization" :required="organizationTab === 'profile'" maxlength="180" /></label>
                <label>Статус<select class="crm-input" v-model="selected.status"><option value="PROSPECT">Потенциальный клиент</option><option value="ACTIVE">Активна</option><option value="ON_HOLD">Приостановлена</option><option value="ARCHIVED">В архиве</option></select></label>
                <CrmAccountManagerField v-model="selected.accountManagerId" :people="managers" :current="selected.accountManager" />
              </fieldset>
              <details class="crm-org-conditions"><summary>Коммерческие условия</summary><fieldset class="ui-fieldset-reset crm-org-fields" :disabled="actionBusy || !canEditSelected"><label>Скидка, %<input class="crm-input" v-model.number="selected.discountTier" type="number" min="0" max="100" /></label><label>Кредитный лимит, ₽<input class="crm-input" v-model.number="selected.creditLimit" type="number" min="0" /></label></fieldset></details>
            </section>
            <section id="organization-panel-details" class="crm-order-tab-panel" role="tabpanel" aria-labelledby="organization-tab-details" :hidden="organizationTab !== 'details'">
              <fieldset class="ui-fieldset-reset crm-org-fields" :disabled="actionBusy || !canEditSelected">
                <label class="crm-org-wide">Юридическое название<input class="crm-input" v-model="selected.legalName" placeholder="ООО «Название компании»" /></label>
                <label>ИНН<input class="crm-input" v-model="selected.inn" inputmode="numeric" placeholder="Не указан" /></label>
                <label>КПП<input class="crm-input" v-model="selected.kpp" inputmode="numeric" placeholder="Не указан" /></label>
                <label class="crm-org-wide">Юридический адрес<textarea class="crm-input" v-model="selected.legalAddress" rows="3" placeholder="Индекс, город, улица, дом" /></label>
              </fieldset>
            </section>
            <section v-if="!creating" id="organization-panel-members" class="crm-order-tab-panel" role="tabpanel" aria-labelledby="organization-tab-members" :hidden="organizationTab !== 'members'">
              <p class="crm-muted">Представители компании и их роли</p>
              <article v-for="member in selected.members" :key="member.id" class="crm-org-detail-row"><div><strong>{{ [member.user.firstName, member.user.lastName].filter(Boolean).join(' ') || member.user.email }}</strong><a v-if="member.user.email" :href="'mailto:' + member.user.email">{{ member.user.email }}</a></div><div><span>{{ memberLabels[member.role] || member.role }}</span><small>{{ member.jobTitle || (member.canSeeFinance ? 'Видит финансы' : 'Рабочий доступ') }}</small></div></article>
              <div v-if="!selected.members?.length" class="crm-directory-empty"><Users :size="28" /><p>Представители ещё не добавлены</p></div>
            </section>
            <section v-if="!creating" id="organization-panel-orders" class="crm-order-tab-panel" role="tabpanel" aria-labelledby="organization-tab-orders" :hidden="organizationTab !== 'orders'">
              <p class="crm-muted">Последние доступные заказы компании</p>
              <article v-for="order in selected.orders" :key="order.id" class="crm-org-detail-row"><div><strong>{{ order.orderNumber }}</strong><small>{{ new Date(order.createdAt).toLocaleDateString('ru-RU') }}</small></div><div><b>{{ Number(order.finalAmount).toLocaleString('ru-RU') }} ₽</b><span>{{ orderLabels[order.status] || order.status }}</span></div></article>
              <div v-if="!selected.orders?.length" class="crm-directory-empty"><ShoppingBag :size="28" /><p>{{ selected.relatedAccess?.orders === false ? 'Нет доступа к истории заказов' : 'Нет доступных заказов' }}</p></div>
            </section>
          </form>
          <footer class="crm-detail-footer"><button v-if="creating" class="crm-button" :disabled="actionBusy" @click="closeEditor">Отмена</button><span v-else>{{ !canEditSelected ? 'Доступен только просмотр' : draftDirty ? 'Есть несохранённые изменения' : 'Изменения сохранены' }}</span><button class="crm-button crm-button--primary" type="submit" form="organization-editor-form" :disabled="actionBusy || !canEditSelected || (!creating && !draftDirty)">{{ actionBusy ? 'Сохраняем…' : creating ? 'Создать организацию' : 'Сохранить изменения' }}</button></footer>
        </section>
      </div>
    </Teleport>
    <div v-if="notice" class="toast" role="status">{{ notice }}</div>
  </main>
</template>
