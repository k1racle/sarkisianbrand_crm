<script setup lang="ts">
useHead({ title: 'Клиенты — SARKISIAN CRM' });
import { Building2, ChevronLeft, ChevronRight, Headphones, Mail, Phone, RefreshCw, Search, ShoppingBag, UserRound, Users, X } from '@lucide/vue';
const config = useRuntimeConfig();
const route = useRoute();
const { token, user } = useWorkspaceSession();
const { openContextMenu, copyText } = useContextMenu();
const dashboard = ref<any>(null);
const customers = ref<any[]>([]);
const loading = ref(false);
const error = ref('');
const { actionBusy, runOperation } = useWorkspaceOperation(error);
const { selected, setEntity, closeEditor, markSaved, entityPanel, entityKeys } = useWorkspaceEntityDraft<any>(actionBusy);
const access = useWorkspaceAccess();
const canEdit = computed(() => access.can('customers.write'));
const search = ref('');
const status = ref('');
const segment = ref('');
const notice = ref('');
const managers = ref<any[]>([]);
const segmentFilters = [{ value: '', label: 'Все клиенты' }, { value: 'B2C', label: 'Розница · B2C' }, { value: 'B2B', label: 'Партнёры · B2B' }, { value: 'Лид', label: 'Лиды' }];
const hasFilters = computed(() => Boolean(search.value || status.value || segment.value));
const page = ref(1);
const pageSize = 25;
const pageCount = computed(() => Math.max(1, Math.ceil(customers.value.length / pageSize)));
const visibleCustomers = computed(() => customers.value.slice((page.value - 1) * pageSize, page.value * pageSize));
const summary = computed(() => [
  { label: 'Всего клиентов', value: dashboard.value?.customers || 0, icon: UserRound },
  { label: 'Активные', value: dashboard.value?.active || 0, icon: Users },
  { label: 'Розничные B2C', value: dashboard.value?.b2cCustomers || 0, icon: ShoppingBag },
  { label: 'Клиенты B2B', value: dashboard.value?.b2bCustomers || 0, icon: Building2 },
]);
const customerName = (item: any) => [item.firstName, item.lastName].filter(Boolean).join(' ') || item.email || item.phone || 'Без имени';
const managerName = (item: any) => [item.accountManager?.firstName, item.accountManager?.lastName].filter(Boolean).join(' ') || item.accountManager?.email || 'Не назначен';
function resetFilters() { search.value = ''; status.value = ''; segment.value = ''; }
const canWriteRecord = (record: any) => canEdit.value && record?.canWrite === true;
const canEditSelected = computed(() => canWriteRecord(selected.value));
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
async function openCustomer(customer: any) {
  if (!closeEditor()) return;
  await runOperation(async () => { const [row] = await Promise.all([$fetch(`/customer-360/customers/${customer.id}`, { baseURL: config.public.apiBase, headers: headers.value }), loadManagers()]); setEntity(row); });
}
async function saveCustomer() {
  if (!selected.value || !canEditSelected.value) return;
  await runOperation(async () => {
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
onBeforeUnmount(() => { ++loadVersion; clearTimeout(searchTimer); });
onMounted(async()=>{await load();const id=typeof route.query.customer==='string'?route.query.customer:'';const customer=customers.value.find(item=>item.id===id);if(customer)await openCustomer(customer);});
</script>

<template>
  <main data-v-ui-765289f0fbc4 class="customer-page crm-standard crm-directory">
    <header class="crm-page-header">
      <div><h1>Клиенты</h1><span>Контакты, организации и история работы с клиентами</span></div>
      <button class="crm-button crm-button--refresh" :disabled="loading" @click="load"><RefreshCw :size="16" :class="{ spin: loading }" /> Обновить</button>
    </header>
    <p v-if="error" class="operation-error" role="alert">{{ error }}</p>
    <WorkspaceLoading v-if="!dashboard && loading" label="Собираем клиентские данные" />
    <div v-else-if="dashboard" class="crm-page-content crm-directory-content">
      <section class="crm-directory-summary" aria-label="Сводка по клиентам">
        <article v-for="metric in summary" :key="metric.label" class="crm-surface crm-directory-metric">
          <span class="crm-directory-metric-icon"><component :is="metric.icon" :size="20" /></span>
          <span class="crm-directory-metric-label">{{ metric.label }}</span><strong>{{ metric.value }}</strong>
        </article>
      </section>
      <section class="crm-surface crm-directory-register" aria-label="Список клиентов" :aria-busy="loading">
        <div class="crm-directory-register-heading"><h2>Клиентская база <span>{{ customers.length }}</span></h2><small>Новых за 30 дней: {{ dashboard.newCustomers || 0 }}</small></div>
        <nav class="crm-directory-tabs" aria-label="Сегменты клиентов">
          <button v-for="filter in segmentFilters" :key="filter.value" class="crm-button" :aria-pressed="segment === filter.value" @click="segment = filter.value">{{ filter.label }}</button>
        </nav>
        <div class="crm-directory-toolbar">
          <div class="crm-input-group crm-directory-search"><Search :size="18" aria-hidden="true" /><input v-model="search" class="crm-input" type="search" aria-label="Поиск клиентов" placeholder="Имя, email, телефон или организация" /><button v-if="search" class="crm-directory-clear" aria-label="Очистить поиск" @click="search = ''"><X :size="16" /></button></div>
          <select v-model="status" class="crm-input" aria-label="Статус клиента"><option value="">Все статусы</option><option value="ACTIVE">Активные</option><option value="BLOCKED">Заблокированные</option><option value="ARCHIVED">Архив</option></select>
          <button v-if="hasFilters" class="crm-button crm-button--text" @click="resetFilters"><X :size="16" /> Сбросить</button>
        </div>
        <div v-if="customers.length" class="crm-directory-columns" aria-hidden="true"><span>Клиент</span><span>Контакты</span><span>Организация и менеджер</span><span>Активность</span><span /></div>
        <div class="crm-directory-rows">
          <button v-for="customer in visibleCustomers" :key="customer.id" class="customer-row crm-button crm-card-action crm-directory-row" :disabled="actionBusy" @click="openCustomer(customer)" @contextmenu.prevent="customerMenu($event, customer)">
            <span class="crm-directory-identity">
              <span class="crm-directory-avatar">{{ customerName(customer).slice(0, 1).toUpperCase() }}</span>
              <span class="crm-directory-stack"><strong>{{ customerName(customer) }}</strong><span class="crm-directory-badges"><span class="crm-directory-status" :data-status="customer.status">{{ statusLabels[customer.status] || customer.status }}</span><span v-if="customer.segment" class="crm-directory-segment">{{ customer.segment }}</span></span></span>
            </span>
            <span class="crm-directory-stack crm-directory-contacts">
              <span class="crm-directory-icon-line"><Mail :size="15" aria-hidden="true" /><span>{{ customer.email || 'Email не указан' }}</span></span>
              <span class="crm-directory-icon-line"><Phone :size="15" aria-hidden="true" /><span>{{ customer.phone || 'Телефон не указан' }}</span></span>
            </span>
            <span class="crm-directory-stack">
              <span class="crm-directory-icon-line"><Building2 :size="15" aria-hidden="true" /><span>{{ customer.organizationMemberships?.[0]?.organization?.name || 'Без организации' }}<small v-if="customer.organizationMemberships?.length > 1"> +{{ customer.organizationMemberships.length - 1 }}</small></span></span>
              <span class="crm-directory-icon-line" :class="{ 'crm-directory-unassigned': !customer.accountManager }"><UserRound :size="15" aria-hidden="true" /><span>Менеджер: {{ managerName(customer) }}</span></span>
            </span>
            <span class="crm-directory-stack crm-directory-activity">
              <b>Заказы: {{ customer._count?.orders || 0 }}</b>
              <small>Обращения: {{ customer._count?.helpdeskTickets || 0 }} · Контакты: {{ customer._count?.interactions || 0 }}</small>
              <small v-if="customer._count?.leads">Лиды: {{ customer._count.leads }}</small>
            </span>
            <ChevronRight class="crm-directory-open" :size="18" aria-hidden="true" />
          </button>
        </div>
        <div v-if="!customers.length && !loading" class="crm-directory-empty">
          <Search v-if="hasFilters" :size="28" /><Users v-else :size="28" />
          <strong>{{ hasFilters ? 'Клиенты не найдены' : 'Клиентская база пока пуста' }}</strong>
          <p>{{ hasFilters ? 'Попробуйте другое имя или измените фильтры.' : 'Здесь появятся клиенты сайта и B2B-кабинета.' }}</p>
          <button v-if="hasFilters" class="crm-button" @click="resetFilters">Сбросить фильтры</button>
        </div>
        <footer class="crm-directory-footer">
          <small role="status"><template v-if="loading">Обновляем список…</template><template v-else-if="customers.length">Показано {{ (page - 1) * pageSize + 1 }}–{{ Math.min(page * pageSize, customers.length) }} из {{ customers.length }}</template><template v-else>Нет записей</template></small>
          <nav v-if="pageCount > 1" class="crm-directory-pagination" aria-label="Страницы клиентов"><button class="crm-button crm-button--icon" :disabled="page === 1 || loading" aria-label="Предыдущая страница" @click="page--"><ChevronLeft :size="16" /></button><span>{{ page }} / {{ pageCount }}</span><button class="crm-button crm-button--icon" :disabled="page === pageCount || loading" aria-label="Следующая страница" @click="page++"><ChevronRight :size="16" /></button></nav>
          <small v-else class="crm-directory-hint">Нажмите на клиента, чтобы открыть карточку</small>
        </footer>
      </section>
    </div>
    <aside data-v-ui-765289f0fbc4 v-if="selected" class="backdrop admin-dialog-backdrop" @click.self="closeEditor"><div data-v-ui-765289f0fbc4 ref="entityPanel" class="drawer admin-dialog admin-dialog--drawer" role="dialog" aria-modal="true" tabindex="-1" @keydown="entityKeys"><header data-v-ui-765289f0fbc4><div data-v-ui-765289f0fbc4><p data-v-ui-765289f0fbc4>CUSTOMER 360</p><h2 data-v-ui-765289f0fbc4>{{ [selected.firstName, selected.lastName].filter(Boolean).join(' ') || 'Карточка клиента' }}</h2><span data-v-ui-765289f0fbc4>{{ selected.email || selected.phone || 'Контакты не указаны' }}</span></div><button class="crm-button crm-button--icon" data-v-ui-765289f0fbc4 @click="closeEditor" :disabled="actionBusy" aria-label="Закрыть карточку"><X data-v-ui-765289f0fbc4 :size="19" /></button></header><div data-v-ui-765289f0fbc4 class="drawer-body admin-dialog-body"><p data-v-ui-765289f0fbc4 v-if="error" class="operation-error" role="alert">{{ error }}</p>
      <fieldset data-v-ui-765289f0fbc4 class="edit-grid ui-fieldset-reset" :disabled="actionBusy || !canEditSelected"><CrmAccountManagerField v-model="selected.accountManagerId" :people="managers" :current="selected.accountManager" /><label data-v-ui-765289f0fbc4>Имя<input class="crm-input" data-v-ui-765289f0fbc4 v-model="selected.firstName" /></label><label data-v-ui-765289f0fbc4>Фамилия<input class="crm-input" data-v-ui-765289f0fbc4 v-model="selected.lastName" /></label><label data-v-ui-765289f0fbc4>Телефон<input class="crm-input" data-v-ui-765289f0fbc4 v-model="selected.phone" /></label><label data-v-ui-765289f0fbc4>Сегмент<input class="crm-input" data-v-ui-765289f0fbc4 v-model="selected.segment" /></label><label data-v-ui-765289f0fbc4>Статус<select class="crm-input" data-v-ui-765289f0fbc4 v-model="selected.status"><option data-v-ui-765289f0fbc4 value="ACTIVE">Активен</option><option data-v-ui-765289f0fbc4 value="BLOCKED">Заблокирован</option><option data-v-ui-765289f0fbc4 value="ARCHIVED">В архиве</option></select></label><button class="crm-button crm-button--primary" data-v-ui-765289f0fbc4 @click="saveCustomer" :disabled="actionBusy || !canEditSelected">Сохранить карточку</button></fieldset>
      <section data-v-ui-765289f0fbc4 v-if="selected.organizationMemberships?.length" class="details"><h3 data-v-ui-765289f0fbc4><Building2 data-v-ui-765289f0fbc4 :size="16" /> Организации</h3><div data-v-ui-765289f0fbc4 v-for="member in selected.organizationMemberships" :key="member.id" class="detail-row"><span data-v-ui-765289f0fbc4><strong data-v-ui-765289f0fbc4>{{ member.organization.name }}</strong><small data-v-ui-765289f0fbc4>{{ roleLabels[member.role] }}</small></span><em data-v-ui-765289f0fbc4>{{ member.organization.inn ? `ИНН ${member.organization.inn}` : 'ИНН не указан' }}</em></div></section>
      <section data-v-ui-765289f0fbc4 class="details"><h3 data-v-ui-765289f0fbc4><ShoppingBag data-v-ui-765289f0fbc4 :size="16" /> Последние заказы</h3><div data-v-ui-765289f0fbc4 v-for="order in selected.orders" :key="order.id" class="detail-row"><span data-v-ui-765289f0fbc4><strong data-v-ui-765289f0fbc4>{{ order.externalOrderId || order.orderNumber }}</strong><small data-v-ui-765289f0fbc4>{{ sourceLabels[order.source] || order.source }} · {{ new Date(order.createdAt).toLocaleDateString('ru-RU') }}</small></span><span data-v-ui-765289f0fbc4><b data-v-ui-765289f0fbc4>{{ Number(order.finalAmount).toLocaleString('ru-RU') }} ₽</b><em data-v-ui-765289f0fbc4>{{ orderLabels[order.status] || order.status }}</em></span></div><p data-v-ui-765289f0fbc4 v-if="!selected.orders?.length" class="empty-small">{{ selected.relatedAccess?.orders === false ? 'Нет доступа к истории заказов' : 'Нет доступных заказов' }}</p></section>
      <section data-v-ui-765289f0fbc4 class="details"><h3 data-v-ui-765289f0fbc4><Headphones data-v-ui-765289f0fbc4 :size="16" /> Обращения</h3><div data-v-ui-765289f0fbc4 v-for="ticket in selected.helpdeskTickets" :key="ticket.id" class="detail-row"><span data-v-ui-765289f0fbc4><strong data-v-ui-765289f0fbc4>{{ ticket.number }}</strong><small data-v-ui-765289f0fbc4>{{ ticket.subject }}</small></span><em data-v-ui-765289f0fbc4>{{ ticketLabels[ticket.status] || ticket.status }}</em></div><p data-v-ui-765289f0fbc4 v-if="!selected.helpdeskTickets?.length" class="empty-small">{{ selected.relatedAccess?.helpdesk === false ? 'Нет доступа к истории обращений' : 'Нет доступных обращений' }}</p></section>
    </div></div></aside>
    <div data-v-ui-765289f0fbc4 v-if="notice" class="toast">{{ notice }}</div>
  </main>
</template>
