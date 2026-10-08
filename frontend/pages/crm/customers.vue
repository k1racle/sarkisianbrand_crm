<script setup lang="ts">
useHead({ title: 'Клиенты — SARKISIAN CRM' });
import { Building2, ChevronLeft, ChevronRight, Headphones, Mail, Phone, Plus, RefreshCw, Search, ShoppingBag, SlidersHorizontal, UserPlus, UserRound, Users, X } from '@lucide/vue';
const config = useRuntimeConfig();
const route = useRoute();
const { token, user } = useWorkspaceSession();
const { openContextMenu, copyText } = useContextMenu();
const dashboard = ref<any>(null);
const customers = ref<any[]>([]);
const loading = ref(false);
const error = ref('');
const { actionBusy, runOperation } = useWorkspaceOperation(error);
const { selected, draftDirty, setEntity, closeEditor, markSaved, entityPanel, entityKeys } = useWorkspaceEntityDraft<any>(actionBusy);
const access = useWorkspaceAccess();
const canEdit = computed(() => access.can('customers.write'));
const search = ref('');
const status = ref('');
const segment = ref('');
const notice = ref('');
const managers = ref<any[]>([]);
const assignment = ref('');
const sort = ref('updated');
const filtersExpanded = ref(false);
const duplicateId = ref('');
const creating = computed(() => Boolean(selected.value && !selected.value.id));
const extraFilterCount = computed(() => Number(Boolean(status.value)) + Number(Boolean(assignment.value)) + Number(sort.value !== 'updated'));
const customerTab = ref('profile');
const customerTabs = [{ value: 'profile', label: 'Профиль' }, { value: 'orders', label: 'Заказы' }, { value: 'support', label: 'Обращения' }];
const segmentFilters = [{ value: '', label: 'Все клиенты', short: 'Все' }, { value: 'B2C', label: 'Розница · B2C', short: 'B2C' }, { value: 'B2B', label: 'Партнёры · B2B', short: 'B2B' }, { value: 'Лид', label: 'Лиды', short: 'Лиды' }];
const assignmentFilters = [{ value: '', label: 'Все ответственные' }, { value: 'mine', label: 'Мои клиенты' }, { value: 'unassigned', label: 'Без менеджера' }];
const hasFilters = computed(() => Boolean(search.value || status.value || segment.value || assignment.value));
const filteredCustomers = computed(() => customers.value.filter(item => !assignment.value || (assignment.value === 'mine' ? Boolean(user.value?.id) && item.accountManagerId === user.value?.id : !item.accountManagerId)).sort((a, b) => {
  if (sort.value === 'name') return customerName(a).localeCompare(customerName(b), 'ru');
  if (sort.value === 'orders') return (b._count?.orders || 0) - (a._count?.orders || 0) || customerName(a).localeCompare(customerName(b), 'ru');
  return new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime();
}));
const page = ref(1);
const pageSize = 25;
const pageCount = computed(() => Math.max(1, Math.ceil(filteredCustomers.value.length / pageSize)));
const visibleCustomers = computed(() => filteredCustomers.value.slice((page.value - 1) * pageSize, page.value * pageSize));
const customerName = (item: any) => [item.firstName, item.lastName].filter(Boolean).join(' ') || item.email || item.phone || 'Без имени';
const managerName = (item: any) => [item.accountManager?.firstName, item.accountManager?.lastName].filter(Boolean).join(' ') || item.accountManager?.email || 'Не назначен';
function resetFilters() { search.value = ''; status.value = ''; segment.value = ''; assignment.value = ''; }
function openRow(event: MouseEvent, customer: any) { if (!(event.target as HTMLElement).closest('a,button,input,select')) void openCustomer(customer); }
const phoneHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`;
function tabKeys(event: KeyboardEvent) {
  const index = customerTabs.findIndex(tab => tab.value === customerTab.value);
  const next = event.key === 'ArrowRight' ? (index + 1) % customerTabs.length : event.key === 'ArrowLeft' ? (index + customerTabs.length - 1) % customerTabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? customerTabs.length - 1 : -1;
  if (next < 0) return;
  event.preventDefault(); customerTab.value = customerTabs[next].value;
  nextTick(() => document.getElementById(`customer-tab-${customerTab.value}`)?.focus());
}
const canWriteRecord = (record: any) => canEdit.value && record?.canWrite === true;
const canEditSelected = computed(() => creating.value ? canEdit.value : canWriteRecord(selected.value));
async function loadManagers() { managers.value = canEdit.value ? await $fetch<any[]>('/customer-360/team', { baseURL: config.public.apiBase, headers: headers.value }) : []; }
let searchTimer: ReturnType<typeof setTimeout>;
let loadVersion = 0;

const statusLabels: Record<string, string> = { ACTIVE: 'Активен', BLOCKED: 'Заблокирован', ARCHIVED: 'В архиве' };
const roleLabels: Record<string, string> = { OWNER: 'Владелец', BUYER: 'Закупщик', ACCOUNTANT: 'Бухгалтер', EMPLOYEE: 'Сотрудник' };
const orderLabels: Record<string, string> = { NEW: 'Новый', CONFIRMED: 'Подтверждён', PAYMENT_WAITING: 'Ожидает оплату', PAID: 'Оплачен', ASSEMBLING: 'Собирается', SHIPPED: 'Отправлен', DELIVERED: 'Доставлен', CANCELLED: 'Отменён', REFUNDED: 'Возврат' };
const ticketLabels: Record<string, string> = { NEW: 'Новая', OPEN: 'В работе', WAITING_REQUESTER: 'Ждём клиента', WAITING_INTERNAL: 'Ждём коллег', RESOLVED: 'Решена', CLOSED: 'Закрыта' };
const sourceLabels: Record<string, string> = { WEB: 'Интернет-магазин', B2B: 'B2B', WILDBERRIES: 'Wildberries', OZON: 'Ozon', YANDEX_MARKET: 'Яндекс Маркет', MEGAMARKET: 'Мегамаркет', MANUAL: 'Ручной заказ', ONE_C: '1С' };
const headers = computed(() => ({ Authorization: `Bearer ${token.value}` }));

async function load() {
  const version = ++loadVersion;
  const identity = token.value;
  loading.value = true;
  error.value = '';
  try {
    const [nextDashboard, nextCustomers] = await Promise.all([
      $fetch('/customer-360/dashboard', { baseURL: config.public.apiBase, headers: headers.value }),
      $fetch<any[]>('/customer-360/customers', { baseURL: config.public.apiBase, headers: headers.value, query: { search: search.value || undefined, status: status.value || undefined, segment: segment.value || undefined } }),
    ]);
    if (version !== loadVersion || token.value !== identity) return;
    dashboard.value = nextDashboard; customers.value = nextCustomers;
    page.value = Math.min(page.value, pageCount.value);
  } catch (reason:any) { if (version === loadVersion) error.value = typeof reason?.data?.message === 'string' ? reason.data.message : 'Не удалось загрузить клиентов. Повторите попытку.'; }
  finally { if (version === loadVersion) loading.value = false; }
}
async function openCustomer(customer: any, tab = 'profile', focusManager = false) {
  if (!closeEditor()) return;
  duplicateId.value = '';
  await runOperation(async () => { const [row] = await Promise.all([$fetch(`/customer-360/customers/${customer.id}`, { baseURL: config.public.apiBase, headers: headers.value }), loadManagers()]); customerTab.value = tab; setEntity(row); });
  if (focusManager && selected.value) { await nextTick(); entityPanel.value?.querySelector<HTMLSelectElement>('.crm-field select')?.focus(); }
}
async function openNewCustomer() {
  if (!canEdit.value || !closeEditor()) return;
  duplicateId.value = '';
  await runOperation(async () => {
    await loadManagers();
    customerTab.value = 'profile';
    setEntity({ firstName: '', lastName: '', email: '', phone: '', segment: segment.value || 'B2C', status: 'ACTIVE', accountManagerId: user.value?.id });
  });
  await nextTick(); entityPanel.value?.querySelector<HTMLInputElement>('input[name="firstName"]')?.focus();
}
async function saveCustomer() {
  if (!selected.value || !canEditSelected.value) return;
  await runOperation(async () => {
  if (creating.value) {
    duplicateId.value = '';
    if (!selected.value.firstName?.trim()) { error.value = 'Укажите имя клиента'; return; }
    if (!selected.value.phone?.trim() && !selected.value.email?.trim()) { error.value = 'Укажите телефон или email, чтобы связаться с клиентом'; return; }
    let saved: any;
    try {
      saved = await $fetch('/customer-360/customers', { baseURL: config.public.apiBase, method: 'POST', headers: headers.value, body: { firstName: selected.value.firstName.trim(), lastName: selected.value.lastName?.trim() || undefined, email: selected.value.email?.trim() || undefined, phone: selected.value.phone?.trim() || undefined, segment: selected.value.segment, accountManagerId: selected.value.accountManagerId } });
    } catch (reason: any) { duplicateId.value = reason?.data?.existingCustomerId || ''; throw reason; }
    markSaved(saved); resetFilters(); sort.value = 'updated'; page.value = 1;
    await nextTick(); clearTimeout(searchTimer); await load();
    notice.value = 'Клиент добавлен'; setTimeout(() => notice.value = '', 2200);
    return;
  }
  const saved = await $fetch<any>(`/customer-360/customers/${selected.value.id}`, { baseURL: config.public.apiBase, method: 'PATCH', headers: headers.value, body: { firstName: selected.value.firstName || undefined, lastName: selected.value.lastName || undefined, phone: selected.value.phone || undefined, segment: selected.value.segment || undefined, status: selected.value.status, accountManagerId: selected.value.accountManagerId } });
  markSaved(saved);
  notice.value = 'Карточка клиента сохранена';
  await load(); setTimeout(() => notice.value = '', 2200);
  });
}
async function changeCustomerStatus(customer:any, nextStatus:string) { if (!canWriteRecord(customer)) return; await runOperation(async () => { await $fetch(`/customer-360/customers/${customer.id}`, { baseURL: config.public.apiBase, method: 'PATCH', headers: headers.value, body: { status: nextStatus } }); await load(); notice.value = nextStatus === 'ARCHIVED' ? 'Клиент перемещён в архив' : 'Статус клиента обновлён'; setTimeout(()=>notice.value='',2200); }); }
async function moveCustomerToTrash(customer:any) { if (!canWriteRecord(customer) || !closeEditor()) return; await runOperation(async () => { await $fetch(`/data-lifecycle/CUSTOMER/${customer.id}/trash`, { baseURL: config.public.apiBase, method: 'POST', headers: headers.value, body: { reason: 'Удалено из Customer 360' } }); await load(); notice.value = 'Клиент перемещён в корзину на 30 дней'; setTimeout(()=>notice.value='',2600); }); }
function customerMenu(event:MouseEvent, customer:any) { const name=[customer.firstName,customer.lastName].filter(Boolean).join(' ')||customer.email||customer.phone||'Карточка клиента';openContextMenu(event,name,[{label:'Открыть карточку',icon:'open',action:()=>openCustomer(customer)},...(customer.email?[{label:'Копировать email',icon:'copy' as const,action:()=>copyText(customer.email,'Email скопирован')}]:[]),...(customer.phone?[{label:'Копировать телефон',icon:'copy' as const,action:()=>copyText(customer.phone,'Телефон скопирован')}]:[]),...(canWriteRecord(customer) && customer.status!=='ARCHIVED'?[{label:'Переместить в архив',icon:'archive' as const,danger:true,separator:true,confirm:`Переместить «${name}» в архив?`,action:()=>changeCustomerStatus(customer,'ARCHIVED')}]:[]),...(user.value?.role==='ADMIN' && canWriteRecord(customer)?[{label:'Переместить в корзину',icon:'trash' as const,danger:true,separator:customer.status==='ARCHIVED',confirm:`Переместить «${name}» в корзину? Восстановить клиента можно в настройках экосистемы в течение 30 дней.`,action:()=>moveCustomerToTrash(customer)}]:[])],customer.email||customer.phone); }
watch([search, status, segment], (next, previous) => {
  clearTimeout(searchTimer); ++loadVersion; page.value = 1;
  if (next[0] !== previous[0]) searchTimer = setTimeout(load, 300);
  else void load();
});
watch([assignment, sort], () => { page.value = 1; });
watch(() => [selected.value?.firstName, selected.value?.phone, selected.value?.email], () => {
  if (creating.value && !actionBusy.value) { duplicateId.value = ''; error.value = ''; }
});
onBeforeUnmount(() => { ++loadVersion; clearTimeout(searchTimer); });
onMounted(async()=>{await load();const id=typeof route.query.customer==='string'?route.query.customer:'';const customer=customers.value.find(item=>item.id===id);if(customer)await openCustomer(customer);});
</script>

<template>
  <main data-v-ui-765289f0fbc4 class="customer-page crm-standard crm-directory crm-customers-page">
    <header class="crm-page-header">
      <div>
        <h1>Клиенты <span v-if="dashboard" class="crm-customer-title-count">{{ dashboard.customers }}</span></h1>
        <span>Контакты, компании и история работы</span>
      </div>
      <div class="crm-customer-header-actions">
        <button class="crm-button crm-button--icon" :disabled="loading" aria-label="Обновить" title="Обновить список" @click="load"><RefreshCw :size="18" :class="{ spin: loading }" /></button>
        <button v-if="canEdit" class="crm-button crm-button--primary crm-customer-add" :disabled="actionBusy" @click="openNewCustomer"><Plus :size="18" /><span>Добавить клиента</span></button>
      </div>
    </header>
    <p v-if="error && !selected" class="operation-error" role="alert">{{ error }}</p>
    <WorkspaceLoading v-if="!dashboard && loading" label="Загружаем клиентов" />
    <div v-else-if="dashboard" class="crm-page-content crm-directory-content">
      <section class="crm-surface crm-customer-register" :class="{ 'is-filters-open': filtersExpanded }" aria-label="Список клиентов" :aria-busy="loading">
        <div class="crm-customer-register-head">
          <nav class="crm-customer-segments" aria-label="Сегменты клиентов">
            <button v-for="filter in segmentFilters" :key="filter.value" :aria-label="filter.label" :aria-pressed="segment === filter.value" @click="segment = filter.value"><span class="crm-customer-segment-full">{{ filter.label }}</span><span class="crm-customer-segment-short" aria-hidden="true">{{ filter.short }}</span></button>
          </nav>
          <span class="crm-customer-new-count"><span class="crm-customer-dot" /> Новых за 30 дней: <strong>{{ dashboard.newCustomers || 0 }}</strong></span>
        </div>
        <div class="crm-customer-tools">
          <div class="crm-input-group crm-customer-search"><Search :size="18" aria-hidden="true" /><input v-model="search" class="crm-input" type="search" aria-label="Поиск клиентов" placeholder="Найти клиента…" title="Поиск по имени, телефону, email или компании" /><button v-if="search" class="crm-directory-clear" aria-label="Очистить поиск" @click="search = ''"><X :size="16" /></button></div>
          <button class="crm-button crm-button--icon crm-customer-filter-toggle" :aria-label="`Фильтры и сортировка${extraFilterCount ? `: ${extraFilterCount}` : ''}`" :aria-expanded="filtersExpanded" aria-controls="customer-status-filter customer-owner-filter customer-sort" @click="filtersExpanded = !filtersExpanded"><SlidersHorizontal :size="18" /><span v-if="extraFilterCount">{{ extraFilterCount }}</span></button>
          <select id="customer-status-filter" v-model="status" class="crm-input crm-customer-extra-filter" aria-label="Статус клиента"><option value="">Все статусы</option><option value="ACTIVE">Активные</option><option value="BLOCKED">Заблокированные</option><option value="ARCHIVED">В архиве</option></select>
          <select id="customer-owner-filter" v-model="assignment" class="crm-input crm-customer-extra-filter" aria-label="Ответственный менеджер"><option v-for="filter in assignmentFilters" :key="filter.value" :value="filter.value">{{ filter.label }}</option></select>
          <select id="customer-sort" v-model="sort" class="crm-input crm-customer-extra-filter" aria-label="Сортировка клиентов"><option value="updated">Последние изменения</option><option value="name">По имени: А–Я</option><option value="orders">Больше заказов</option></select>
        </div>
        <div v-if="hasFilters" class="crm-customer-filter-summary"><span role="status">Найдено: {{ filteredCustomers.length }}</span><button class="crm-button crm-button--text" @click="resetFilters"><X :size="14" /> Сбросить фильтры</button></div>
        <div v-if="filteredCustomers.length" class="crm-customer-columns" aria-hidden="true"><span>Клиент</span><span>Контакты</span><span>Компания и ответственный</span><span>История</span></div>
        <div class="crm-customer-rows">
          <article v-for="customer in visibleCustomers" :key="customer.id" class="customer-row crm-customer-row" :aria-label="customerName(customer)" @click="openRow($event, customer)" @contextmenu.prevent="customerMenu($event, customer)">
            <div class="crm-customer-person">
              <span class="crm-directory-avatar" aria-hidden="true">{{ customerName(customer).slice(0, 1).toUpperCase() }}</span>
              <div class="crm-customer-person-details">
                <button class="crm-customer-name" :disabled="actionBusy" :aria-label="`Открыть клиента: ${customerName(customer)}`" @click="openCustomer(customer)"><strong>{{ customerName(customer) }}</strong></button>
                <div class="crm-directory-badges"><span class="crm-directory-status" :data-status="customer.status">{{ statusLabels[customer.status] || customer.status }}</span><span v-if="customer.segment" class="crm-directory-segment">{{ customer.segment }}</span></div>
              </div>
            </div>
            <div class="crm-customer-contacts">
              <a v-if="customer.phone" class="crm-customer-contact" :href="phoneHref(customer.phone)" :aria-label="`Позвонить: ${customer.phone}`"><Phone :size="15" aria-hidden="true" /><span>{{ customer.phone }}</span></a>
              <a v-if="customer.email" class="crm-customer-contact" :href="`mailto:${customer.email}`" :aria-label="`Написать: ${customer.email}`"><Mail :size="15" aria-hidden="true" /><span>{{ customer.email }}</span></a>
              <span v-if="!customer.phone && !customer.email" class="crm-muted">Контакты не указаны</span>
            </div>
            <div class="crm-customer-relations">
              <span v-if="customer.organizationMemberships?.length" class="crm-directory-icon-line"><Building2 :size="15" aria-hidden="true" /><span>{{ customer.organizationMemberships[0].organization.name }}<small v-if="customer.organizationMemberships.length > 1"> +{{ customer.organizationMemberships.length - 1 }}</small></span></span>
              <span v-else class="crm-muted crm-customer-private">Частный клиент</span>
              <span v-if="customer.accountManager" class="crm-directory-icon-line crm-customer-owner"><UserRound :size="15" aria-hidden="true" /><span>{{ managerName(customer) }}</span></span>
              <button v-else-if="canWriteRecord(customer)" class="crm-customer-assign" :disabled="actionBusy" aria-label="Назначить менеджера" @click="openCustomer(customer, 'profile', true)"><UserPlus :size="15" aria-hidden="true" /> Назначить менеджера</button>
              <span v-else class="crm-muted">Менеджер не назначен</span>
            </div>
            <div class="crm-customer-activity">
              <button class="crm-customer-stat" :disabled="actionBusy" @click="openCustomer(customer, 'orders')"><ShoppingBag :size="15" aria-hidden="true" /><span>Заказы</span><strong>{{ customer._count?.orders || 0 }}</strong></button>
              <button class="crm-customer-stat" :disabled="actionBusy" @click="openCustomer(customer, 'support')"><Headphones :size="15" aria-hidden="true" /><span>Обращения</span><strong>{{ customer._count?.helpdeskTickets || 0 }}</strong></button>
            </div>
          </article>
        </div>
        <div v-if="!filteredCustomers.length && !loading" class="crm-directory-empty">
          <Search v-if="hasFilters" :size="28" /><Users v-else :size="28" />
          <strong>{{ hasFilters ? 'Клиенты не найдены' : 'Добавьте первого клиента' }}</strong>
          <p>{{ hasFilters ? 'Попробуйте другой запрос или сбросьте фильтры.' : 'Сохраните контакт, назначьте ответственного и ведите историю работы в одной карточке.' }}</p>
          <button v-if="hasFilters" class="crm-button" @click="resetFilters">Сбросить фильтры</button>
          <button v-else-if="canEdit" class="crm-button crm-button--primary" @click="openNewCustomer"><Plus :size="18" /> Добавить клиента</button>
        </div>
        <footer v-if="filteredCustomers.length" class="crm-customer-footer">
          <span>Показано: {{ pageCount > 1 ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, filteredCustomers.length)} из ${filteredCustomers.length}` : filteredCustomers.length }}</span>
          <nav v-if="pageCount > 1" class="crm-directory-pagination" aria-label="Страницы клиентов"><button class="crm-button crm-button--icon" :disabled="page === 1 || loading" aria-label="Предыдущая страница" @click="page--"><ChevronLeft :size="16" /></button><span>{{ page }} / {{ pageCount }}</span><button class="crm-button crm-button--icon" :disabled="page === pageCount || loading" aria-label="Следующая страница" @click="page++"><ChevronRight :size="16" /></button></nav>
          <span class="crm-customer-list-hint">Нажмите на строку, чтобы открыть карточку</span>
        </footer>
      </section>
    </div>
    <Teleport to="body">
      <div v-if="selected" class="crm-detail-backdrop admin-dialog-backdrop" @click.self="closeEditor">
        <section ref="entityPanel" class="admin-dialog admin-dialog--drawer crm-detail-card crm-customer-dialog" role="dialog" aria-modal="true" aria-labelledby="customer-card-title" tabindex="-1" @keydown="entityKeys">
          <header>
            <div><p class="eyebrow">{{ creating ? 'Клиентская база' : 'Карточка клиента' }}</p><h2 id="customer-card-title">{{ creating ? 'Новый клиент' : customerName(selected) }}</h2><div v-if="!creating" class="crm-directory-badges"><span class="crm-directory-status" :data-status="selected.status">{{ statusLabels[selected.status] }}</span><span v-if="selected.segment" class="crm-directory-segment">{{ selected.segment }}</span></div></div>
            <button class="crm-button crm-button--icon" @click="closeEditor" :disabled="actionBusy" aria-label="Закрыть карточку"><X :size="20" /></button>
          </header>
          <nav v-if="!creating" class="crm-customer-card-tabs" role="tablist" aria-label="Разделы карточки клиента" @keydown="tabKeys"><button v-for="tab in customerTabs" :id="`customer-tab-${tab.value}`" :key="tab.value" role="tab" :aria-selected="customerTab === tab.value" :tabindex="customerTab === tab.value ? 0 : -1" :aria-controls="`customer-panel-${tab.value}`" @click="customerTab = tab.value">{{ tab.label }}<span v-if="tab.value === 'orders'">{{ selected._count?.orders || 0 }}</span><span v-if="tab.value === 'support'">{{ selected._count?.helpdeskTickets || 0 }}</span></button></nav>
          <form id="customer-editor-form" class="crm-detail-body" @submit.prevent="saveCustomer">
            <div v-if="error" class="crm-customer-form-error" role="alert"><p>{{ error }}</p><button v-if="duplicateId" type="button" class="crm-button" @click="openCustomer({ id: duplicateId })">Открыть существующего клиента</button></div>
            <section id="customer-panel-profile" class="crm-order-tab-panel" :role="creating ? undefined : 'tabpanel'" :aria-labelledby="creating ? undefined : 'customer-tab-profile'" :hidden="customerTab !== 'profile'">
              <div v-if="!creating && (selected.email || selected.phone)" class="crm-customer-card-contacts"><a v-if="selected.phone" :href="phoneHref(selected.phone)"><Phone :size="17" />{{ selected.phone }}</a><a v-if="selected.email" :href="`mailto:${selected.email}`"><Mail :size="17" />{{ selected.email }}</a></div>
              <div v-if="creating" class="crm-customer-form-intro"><h3>Контактные данные</h3><p>Укажите имя и хотя бы один способ связи: телефон или email.</p></div>
              <fieldset class="ui-fieldset-reset crm-customer-fields" :disabled="actionBusy || !canEditSelected">
                <label>Имя<input class="crm-input" name="firstName" v-model="selected.firstName" :required="creating" maxlength="100" autocomplete="given-name" placeholder="Например, Анна" /></label>
                <label>Фамилия<input class="crm-input" v-model="selected.lastName" maxlength="100" autocomplete="family-name" placeholder="Необязательно" /></label>
                <label>Телефон<input class="crm-input" v-model="selected.phone" type="tel" maxlength="40" autocomplete="tel" placeholder="+7 (___) ___-__-__" /></label>
                <label v-if="creating">Email<input class="crm-input" v-model="selected.email" type="email" maxlength="254" autocomplete="email" placeholder="name@company.ru" /></label>
                <label>Тип клиента<select class="crm-input" v-model="selected.segment"><option value="B2C">Розничный · B2C</option><option value="B2B">Партнёр · B2B</option><option value="Лид">Лид</option><option v-if="selected.segment && !['B2C', 'B2B', 'Лид'].includes(selected.segment)" :value="selected.segment">{{ selected.segment }}</option><option v-if="!selected.segment" value="">Не указан</option></select></label>
                <label v-if="!creating">Статус<select class="crm-input" v-model="selected.status"><option value="ACTIVE">Активен</option><option value="BLOCKED">Заблокирован</option><option value="ARCHIVED">В архиве</option></select></label>
                <CrmAccountManagerField v-model="selected.accountManagerId" :people="managers" :current="selected.accountManager" />
              </fieldset>
              <p v-if="creating" class="crm-customer-form-note">Клиент появится в общей базе. Доступ в личный кабинет оформляется отдельно.</p>
              <section v-if="selected.organizationMemberships?.length" class="crm-customer-card-section"><h3><Building2 :size="18" /> Организации</h3><article v-for="member in selected.organizationMemberships" :key="member.id"><strong>{{ member.organization.name }}</strong><span>{{ roleLabels[member.role] || member.role }}</span><small>{{ member.organization.inn ? `ИНН ${member.organization.inn}` : 'ИНН не указан' }}</small></article></section>
            </section>
            <section v-if="!creating" id="customer-panel-orders" class="crm-order-tab-panel" role="tabpanel" aria-labelledby="customer-tab-orders" :hidden="customerTab !== 'orders'">
              <p class="crm-muted">Последние доступные заказы клиента</p>
              <article v-for="order in selected.orders" :key="order.id" class="crm-customer-history-row"><div><strong>{{ order.externalOrderId || order.orderNumber }}</strong><small>{{ sourceLabels[order.source] || order.source }} · {{ new Date(order.createdAt).toLocaleDateString('ru-RU') }}</small></div><div><b>{{ Number(order.finalAmount).toLocaleString('ru-RU') }} ₽</b><span>{{ orderLabels[order.status] || order.status }}</span></div></article>
              <div v-if="!selected.orders?.length" class="crm-directory-empty"><ShoppingBag :size="28" /><p>{{ selected.relatedAccess?.orders === false ? 'Нет доступа к истории заказов' : 'Нет доступных заказов' }}</p></div>
            </section>
            <section v-if="!creating" id="customer-panel-support" class="crm-order-tab-panel" role="tabpanel" aria-labelledby="customer-tab-support" :hidden="customerTab !== 'support'">
              <p class="crm-muted">Последние обращения клиента в поддержку</p>
              <article v-for="ticket in selected.helpdeskTickets" :key="ticket.id" class="crm-customer-history-row"><div><strong>{{ ticket.number }}</strong><span>{{ ticket.subject }}</span></div><span>{{ ticketLabels[ticket.status] || ticket.status }}</span></article>
              <div v-if="!selected.helpdeskTickets?.length" class="crm-directory-empty"><Headphones :size="28" /><p>{{ selected.relatedAccess?.helpdesk === false ? 'Нет доступа к истории обращений' : 'Нет доступных обращений' }}</p></div>
            </section>
          </form>
          <footer class="crm-detail-footer">
            <button v-if="creating" class="crm-button" :disabled="actionBusy" @click="closeEditor">Отмена</button>
            <span v-else>{{ !canEditSelected ? 'Доступен только просмотр' : draftDirty ? 'Есть несохранённые изменения' : 'Изменения сохранены' }}</span>
            <button class="crm-button crm-button--primary" type="submit" form="customer-editor-form" :disabled="actionBusy || !canEditSelected || (!creating && !draftDirty)">{{ actionBusy ? 'Сохраняем…' : creating ? 'Создать клиента' : 'Сохранить карточку' }}</button>
          </footer>
        </section>
      </div>
    </Teleport>
    <div data-v-ui-765289f0fbc4 v-if="notice" class="toast" role="status">{{ notice }}</div>
  </main>
</template>
