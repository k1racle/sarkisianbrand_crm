<script setup lang="ts">
useHead({ title: 'Клиенты — SARKISIAN CRM' });
import { Building2, Headphones, RefreshCw, Search, ShoppingBag, UserRound, Users, X } from '@lucide/vue';
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
  } catch (reason:any) { if (version === loadVersion) error.value = typeof reason?.data?.message === 'string' ? reason.data.message : 'Не удалось загрузить клиентов. Повторите попытку.'; }
  finally { if (version === loadVersion) loading.value = false; }
}
async function openCustomer(customer: any) {
  if (!closeEditor()) return;
  await runOperation(async () => setEntity(await $fetch(`/customer-360/customers/${customer.id}`, { baseURL: config.public.apiBase, headers: headers.value })));
}
async function saveCustomer() {
  if (!selected.value || !canEdit.value) return;
  await runOperation(async () => {
  const saved = await $fetch<any>(`/customer-360/customers/${selected.value.id}`, { baseURL: config.public.apiBase, method: 'PATCH', headers: headers.value, body: { firstName: selected.value.firstName || undefined, lastName: selected.value.lastName || undefined, phone: selected.value.phone || undefined, segment: selected.value.segment || undefined, status: selected.value.status } });
  markSaved(saved);
  notice.value = 'Карточка клиента сохранена';
  await load(); setTimeout(() => notice.value = '', 2200);
  });
}
async function changeCustomerStatus(customer:any, nextStatus:string) { if (!canEdit.value) return; await runOperation(async () => { await $fetch(`/customer-360/customers/${customer.id}`, { baseURL: config.public.apiBase, method: 'PATCH', headers: headers.value, body: { status: nextStatus } }); await load(); notice.value = nextStatus === 'ARCHIVED' ? 'Клиент перемещён в архив' : 'Статус клиента обновлён'; setTimeout(()=>notice.value='',2200); }); }
async function moveCustomerToTrash(customer:any) { if (!closeEditor()) return; await runOperation(async () => { await $fetch(`/data-lifecycle/CUSTOMER/${customer.id}/trash`, { baseURL: config.public.apiBase, method: 'POST', headers: headers.value, body: { reason: 'Удалено из Customer 360' } }); await load(); notice.value = 'Клиент перемещён в корзину на 30 дней'; setTimeout(()=>notice.value='',2600); }); }
function customerMenu(event:MouseEvent, customer:any) { const name=[customer.firstName,customer.lastName].filter(Boolean).join(' ')||customer.email||customer.phone||'Карточка клиента';openContextMenu(event,name,[{label:'Открыть карточку',icon:'open',action:()=>openCustomer(customer)},...(customer.email?[{label:'Копировать email',icon:'copy' as const,action:()=>copyText(customer.email,'Email скопирован')}]:[]),...(customer.phone?[{label:'Копировать телефон',icon:'copy' as const,action:()=>copyText(customer.phone,'Телефон скопирован')}]:[]),...(customer.status!=='ARCHIVED'?[{label:'Переместить в архив',icon:'archive' as const,danger:true,separator:true,confirm:`Переместить «${name}» в архив?`,action:()=>changeCustomerStatus(customer,'ARCHIVED')}]:[]),...(user.value?.role==='ADMIN'?[{label:'Переместить в корзину',icon:'trash' as const,danger:true,separator:customer.status==='ARCHIVED',confirm:`Переместить «${name}» в корзину? Восстановить клиента можно в настройках экосистемы в течение 30 дней.`,action:()=>moveCustomerToTrash(customer)}]:[])],customer.email||customer.phone); }
watch(search, () => { clearTimeout(searchTimer); searchTimer = setTimeout(load, 300); });
watch([status, segment], load);
onBeforeUnmount(() => { ++loadVersion; clearTimeout(searchTimer); });
onMounted(async()=>{await load();const id=typeof route.query.customer==='string'?route.query.customer:'';const customer=customers.value.find(item=>item.id===id);if(customer)await openCustomer(customer);});
</script>

<template>
  <main data-v-ui-765289f0fbc4 class="customer-page crm-standard">
    <header data-v-ui-765289f0fbc4 class="page-header crm-page-header"><div data-v-ui-765289f0fbc4><p data-v-ui-765289f0fbc4>CRM / CUSTOMER 360</p><h1 data-v-ui-765289f0fbc4>Клиенты</h1><span data-v-ui-765289f0fbc4>Единая история B2C и B2B: покупки, лиды, обращения и компании</span></div><button class="crm-button crm-button--refresh" data-v-ui-765289f0fbc4 @click="load"><RefreshCw data-v-ui-765289f0fbc4 :size="16" :class="{ spin: loading }" /> Обновить</button></header>
    <p data-v-ui-765289f0fbc4 v-if="error" class="operation-error" role="alert">{{ error }}</p>
    <WorkspaceLoading v-if="!dashboard && loading" label="Собираем клиентские данные" />
    <div data-v-ui-765289f0fbc4 v-else-if="dashboard" class="page-body">
      <section data-v-ui-765289f0fbc4 class="kpis">
        <article class="crm-surface" data-v-ui-765289f0fbc4><UserRound data-v-ui-765289f0fbc4 :size="18" /><span data-v-ui-765289f0fbc4>Всего клиентов</span><strong data-v-ui-765289f0fbc4>{{ dashboard?.customers || 0 }}</strong><small data-v-ui-765289f0fbc4>{{ dashboard?.newCustomers || 0 }} новых за 30 дней</small></article>
        <article class="crm-surface" data-v-ui-765289f0fbc4><Users data-v-ui-765289f0fbc4 :size="18" /><span data-v-ui-765289f0fbc4>Активные</span><strong data-v-ui-765289f0fbc4>{{ dashboard?.active || 0 }}</strong><small data-v-ui-765289f0fbc4>доступны для работы</small></article>
        <article class="crm-surface" data-v-ui-765289f0fbc4><ShoppingBag data-v-ui-765289f0fbc4 :size="18" /><span data-v-ui-765289f0fbc4>Розничные B2C</span><strong data-v-ui-765289f0fbc4>{{ dashboard?.b2cCustomers || 0 }}</strong><small data-v-ui-765289f0fbc4>покупатели магазина</small></article>
        <article class="crm-surface" data-v-ui-765289f0fbc4><Building2 data-v-ui-765289f0fbc4 :size="18" /><span data-v-ui-765289f0fbc4>Клиенты B2B</span><strong data-v-ui-765289f0fbc4>{{ dashboard?.b2bCustomers || 0 }}</strong><small data-v-ui-765289f0fbc4>{{ dashboard?.organizations || 0 }} организаций</small></article>
      </section>
      <section data-v-ui-765289f0fbc4 class="panel crm-surface">
        <div data-v-ui-765289f0fbc4 class="filters crm-toolbar"><label class="crm-input-group" data-v-ui-765289f0fbc4><Search data-v-ui-765289f0fbc4 :size="16" /><input class="crm-input" data-v-ui-765289f0fbc4 v-model="search" placeholder="Имя, email, телефон или организация" /></label><select class="crm-input" data-v-ui-765289f0fbc4 v-model="segment"><option data-v-ui-765289f0fbc4 value="">Все сегменты</option><option data-v-ui-765289f0fbc4 value="B2C">B2C</option><option data-v-ui-765289f0fbc4 value="B2B">B2B</option><option data-v-ui-765289f0fbc4 value="Лид">Лиды</option></select><select class="crm-input" data-v-ui-765289f0fbc4 v-model="status"><option data-v-ui-765289f0fbc4 value="">Все статусы</option><option data-v-ui-765289f0fbc4 value="ACTIVE">Активные</option><option data-v-ui-765289f0fbc4 value="BLOCKED">Заблокированные</option><option data-v-ui-765289f0fbc4 value="ARCHIVED">Архив</option></select></div>
        <div data-v-ui-765289f0fbc4 class="customer-row head crm-table-head"><span data-v-ui-765289f0fbc4>Клиент</span><span data-v-ui-765289f0fbc4>Контакты</span><span data-v-ui-765289f0fbc4>Сегмент</span><span data-v-ui-765289f0fbc4>Связи</span><span data-v-ui-765289f0fbc4>Активность</span></div>
        <button data-v-ui-765289f0fbc4 v-for="customer in customers" :key="customer.id" class="customer-row crm-button crm-table-row crm-card-action" @click="openCustomer(customer)" @contextmenu.prevent="customerMenu($event,customer)"><span data-v-ui-765289f0fbc4 class="identity"><i data-v-ui-765289f0fbc4>{{ (customer.firstName || customer.email || 'К').slice(0, 1).toUpperCase() }}</i><span data-v-ui-765289f0fbc4><strong data-v-ui-765289f0fbc4>{{ [customer.firstName, customer.lastName].filter(Boolean).join(' ') || 'Без имени' }}</strong><small data-v-ui-765289f0fbc4>{{ statusLabels[customer.status] }}</small></span></span><span data-v-ui-765289f0fbc4 class="contacts"><b data-v-ui-765289f0fbc4>{{ customer.email || 'Email не указан' }}</b><small data-v-ui-765289f0fbc4>{{ customer.phone || 'Телефон не указан' }}</small></span><span data-v-ui-765289f0fbc4><em data-v-ui-765289f0fbc4>{{ customer.segment || 'Не определён' }}</em></span><span data-v-ui-765289f0fbc4 class="counts"><b data-v-ui-765289f0fbc4>{{ customer._count.orders }} заказов</b><small data-v-ui-765289f0fbc4>{{ customer.organizationMemberships[0]?.organization?.name || `${customer._count.leads} лидов` }}</small></span><span data-v-ui-765289f0fbc4 class="counts"><b data-v-ui-765289f0fbc4>{{ customer._count.helpdeskTickets }} заявок</b><small data-v-ui-765289f0fbc4>{{ customer._count.interactions }} контактов</small></span></button>
        <p data-v-ui-765289f0fbc4 v-if="!customers.length" class="empty">По заданным условиям клиентов нет</p>
      </section>
    </div>

    <aside data-v-ui-765289f0fbc4 v-if="selected" class="backdrop admin-dialog-backdrop" @click.self="closeEditor"><div data-v-ui-765289f0fbc4 ref="entityPanel" class="drawer admin-dialog admin-dialog--drawer" role="dialog" aria-modal="true" tabindex="-1" @keydown="entityKeys"><header data-v-ui-765289f0fbc4><div data-v-ui-765289f0fbc4><p data-v-ui-765289f0fbc4>CUSTOMER 360</p><h2 data-v-ui-765289f0fbc4>{{ [selected.firstName, selected.lastName].filter(Boolean).join(' ') || 'Карточка клиента' }}</h2><span data-v-ui-765289f0fbc4>{{ selected.email || selected.phone || 'Контакты не указаны' }}</span></div><button class="crm-button crm-button--icon" data-v-ui-765289f0fbc4 @click="closeEditor" :disabled="actionBusy" aria-label="Закрыть карточку"><X data-v-ui-765289f0fbc4 :size="19" /></button></header><div data-v-ui-765289f0fbc4 class="drawer-body admin-dialog-body"><p data-v-ui-765289f0fbc4 v-if="error" class="operation-error" role="alert">{{ error }}</p>
      <fieldset data-v-ui-765289f0fbc4 class="edit-grid ui-fieldset-reset" :disabled="actionBusy || !canEdit"><label data-v-ui-765289f0fbc4>Имя<input class="crm-input" data-v-ui-765289f0fbc4 v-model="selected.firstName" /></label><label data-v-ui-765289f0fbc4>Фамилия<input class="crm-input" data-v-ui-765289f0fbc4 v-model="selected.lastName" /></label><label data-v-ui-765289f0fbc4>Телефон<input class="crm-input" data-v-ui-765289f0fbc4 v-model="selected.phone" /></label><label data-v-ui-765289f0fbc4>Сегмент<input class="crm-input" data-v-ui-765289f0fbc4 v-model="selected.segment" /></label><label data-v-ui-765289f0fbc4>Статус<select class="crm-input" data-v-ui-765289f0fbc4 v-model="selected.status"><option data-v-ui-765289f0fbc4 value="ACTIVE">Активен</option><option data-v-ui-765289f0fbc4 value="BLOCKED">Заблокирован</option><option data-v-ui-765289f0fbc4 value="ARCHIVED">В архиве</option></select></label><button class="crm-button crm-button--primary" data-v-ui-765289f0fbc4 @click="saveCustomer" :disabled="actionBusy || !canEdit">Сохранить карточку</button></fieldset>
      <section data-v-ui-765289f0fbc4 v-if="selected.organizationMemberships?.length" class="details"><h3 data-v-ui-765289f0fbc4><Building2 data-v-ui-765289f0fbc4 :size="16" /> Организации</h3><div data-v-ui-765289f0fbc4 v-for="member in selected.organizationMemberships" :key="member.id" class="detail-row"><span data-v-ui-765289f0fbc4><strong data-v-ui-765289f0fbc4>{{ member.organization.name }}</strong><small data-v-ui-765289f0fbc4>{{ roleLabels[member.role] }}</small></span><em data-v-ui-765289f0fbc4>{{ member.organization.inn ? `ИНН ${member.organization.inn}` : 'ИНН не указан' }}</em></div></section>
      <section data-v-ui-765289f0fbc4 class="details"><h3 data-v-ui-765289f0fbc4><ShoppingBag data-v-ui-765289f0fbc4 :size="16" /> Последние заказы</h3><div data-v-ui-765289f0fbc4 v-for="order in selected.orders" :key="order.id" class="detail-row"><span data-v-ui-765289f0fbc4><strong data-v-ui-765289f0fbc4>{{ order.externalOrderId || order.orderNumber }}</strong><small data-v-ui-765289f0fbc4>{{ sourceLabels[order.source] || order.source }} · {{ new Date(order.createdAt).toLocaleDateString('ru-RU') }}</small></span><span data-v-ui-765289f0fbc4><b data-v-ui-765289f0fbc4>{{ Number(order.finalAmount).toLocaleString('ru-RU') }} ₽</b><em data-v-ui-765289f0fbc4>{{ orderLabels[order.status] || order.status }}</em></span></div><p data-v-ui-765289f0fbc4 v-if="!selected.orders?.length" class="empty-small">Заказов пока нет</p></section>
      <section data-v-ui-765289f0fbc4 class="details"><h3 data-v-ui-765289f0fbc4><Headphones data-v-ui-765289f0fbc4 :size="16" /> Обращения</h3><div data-v-ui-765289f0fbc4 v-for="ticket in selected.helpdeskTickets" :key="ticket.id" class="detail-row"><span data-v-ui-765289f0fbc4><strong data-v-ui-765289f0fbc4>{{ ticket.number }}</strong><small data-v-ui-765289f0fbc4>{{ ticket.subject }}</small></span><em data-v-ui-765289f0fbc4>{{ ticketLabels[ticket.status] || ticket.status }}</em></div><p data-v-ui-765289f0fbc4 v-if="!selected.helpdeskTickets?.length" class="empty-small">Обращений пока нет</p></section>
    </div></div></aside>
    <div data-v-ui-765289f0fbc4 v-if="notice" class="toast">{{ notice }}</div>
  </main>
</template>
