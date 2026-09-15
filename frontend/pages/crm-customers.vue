<script setup lang="ts">
import { Building2, Headphones, RefreshCw, Search, ShoppingBag, UserRound, Users, X } from '@lucide/vue';
const config = useRuntimeConfig();
const route = useRoute();
const { token } = useWorkspaceSession();
const { openContextMenu, copyText } = useContextMenu();
const dashboard = ref<any>(null);
const customers = ref<any[]>([]);
const selected = ref<any>(null);
const loading = ref(false);
const search = ref('');
const status = ref('');
const segment = ref('');
const notice = ref('');
let searchTimer: ReturnType<typeof setTimeout>;

const statusLabels: Record<string, string> = { ACTIVE: 'Активен', BLOCKED: 'Заблокирован', ARCHIVED: 'В архиве' };
const roleLabels: Record<string, string> = { OWNER: 'Владелец', BUYER: 'Закупщик', ACCOUNTANT: 'Бухгалтер', EMPLOYEE: 'Сотрудник' };
const orderLabels: Record<string, string> = { NEW: 'Новый', CONFIRMED: 'Подтверждён', PAYMENT_WAITING: 'Ожидает оплату', PAID: 'Оплачен', ASSEMBLING: 'Собирается', SHIPPED: 'Отправлен', DELIVERED: 'Доставлен', CANCELLED: 'Отменён', REFUNDED: 'Возврат' };
const ticketLabels: Record<string, string> = { NEW: 'Новая', OPEN: 'В работе', WAITING_REQUESTER: 'Ждём клиента', WAITING_INTERNAL: 'Ждём коллег', RESOLVED: 'Решена', CLOSED: 'Закрыта' };
const sourceLabels: Record<string, string> = { WEB: 'Интернет-магазин', B2B: 'B2B', WILDBERRIES: 'Wildberries', OZON: 'Ozon', YANDEX_MARKET: 'Яндекс Маркет', MEGAMARKET: 'Мегамаркет', MANUAL: 'Ручной заказ', ONE_C: '1С' };
const headers = computed(() => ({ Authorization: `Bearer ${token.value}` }));

async function load() {
  loading.value = true;
  try {
    [dashboard.value, customers.value] = await Promise.all([
      $fetch('/customer-360/dashboard', { baseURL: config.public.apiBase, headers: headers.value }),
      $fetch<any[]>('/customer-360/customers', { baseURL: config.public.apiBase, headers: headers.value, query: { search: search.value || undefined, status: status.value || undefined, segment: segment.value || undefined } }),
    ]);
  } finally { loading.value = false; }
}
async function openCustomer(customer: any) {
  selected.value = await $fetch(`/customer-360/customers/${customer.id}`, { baseURL: config.public.apiBase, headers: headers.value });
}
async function saveCustomer() {
  await $fetch(`/customer-360/customers/${selected.value.id}`, { baseURL: config.public.apiBase, method: 'PATCH', headers: headers.value, body: { firstName: selected.value.firstName || undefined, lastName: selected.value.lastName || undefined, phone: selected.value.phone || undefined, segment: selected.value.segment || undefined, status: selected.value.status } });
  notice.value = 'Карточка клиента сохранена';
  await load(); setTimeout(() => notice.value = '', 2200);
}
async function changeCustomerStatus(customer:any, nextStatus:string) { await $fetch(`/customer-360/customers/${customer.id}`, { baseURL: config.public.apiBase, method: 'PATCH', headers: headers.value, body: { status: nextStatus } }); await load(); notice.value = nextStatus === 'ARCHIVED' ? 'Клиент перемещён в архив' : 'Статус клиента обновлён'; setTimeout(()=>notice.value='',2200); }
function customerMenu(event:MouseEvent, customer:any) { const name=[customer.firstName,customer.lastName].filter(Boolean).join(' ')||'Карточка клиента';openContextMenu(event,name,[{label:'Открыть карточку',icon:'open',action:()=>openCustomer(customer)},...(customer.email?[{label:'Копировать email',icon:'copy' as const,action:()=>copyText(customer.email,'Email скопирован')}]:[]),...(customer.phone?[{label:'Копировать телефон',icon:'copy' as const,action:()=>copyText(customer.phone,'Телефон скопирован')}]:[]),...(customer.status!=='ARCHIVED'?[{label:'Переместить в архив',icon:'archive' as const,danger:true,separator:true,confirm:`Переместить «${name}» в архив?`,action:()=>changeCustomerStatus(customer,'ARCHIVED')}]:[])],customer.email||customer.phone); }
watch(search, () => { clearTimeout(searchTimer); searchTimer = setTimeout(load, 300); });
watch([status, segment], load);
onMounted(async()=>{await load();const id=typeof route.query.customer==='string'?route.query.customer:'';const customer=customers.value.find(item=>item.id===id);if(customer)await openCustomer(customer);});
</script>

<template>
  <main class="customer-page">
    <header class="page-header"><div><p>CRM / CUSTOMER 360</p><h1>Клиенты</h1><span>Единая история B2C и B2B: покупки, лиды, обращения и компании</span></div><button @click="load"><RefreshCw :size="16" :class="{ spin: loading }" /> Обновить</button></header>
    <WorkspaceLoading v-if="!dashboard && loading" label="Собираем клиентские данные" />
    <div v-else class="page-body">
      <section class="kpis">
        <article><UserRound :size="18" /><span>Всего клиентов</span><strong>{{ dashboard?.customers || 0 }}</strong><small>{{ dashboard?.newCustomers || 0 }} новых за 30 дней</small></article>
        <article><Users :size="18" /><span>Активные</span><strong>{{ dashboard?.active || 0 }}</strong><small>доступны для работы</small></article>
        <article><ShoppingBag :size="18" /><span>Розничные B2C</span><strong>{{ dashboard?.b2cCustomers || 0 }}</strong><small>покупатели магазина</small></article>
        <article><Building2 :size="18" /><span>Клиенты B2B</span><strong>{{ dashboard?.b2bCustomers || 0 }}</strong><small>{{ dashboard?.organizations || 0 }} организаций</small></article>
      </section>
      <section class="panel">
        <div class="filters"><label><Search :size="16" /><input v-model="search" placeholder="Имя, email, телефон или организация" /></label><select v-model="segment"><option value="">Все сегменты</option><option value="B2C">B2C</option><option value="B2B">B2B</option><option value="Лид">Лиды</option></select><select v-model="status"><option value="">Все статусы</option><option value="ACTIVE">Активные</option><option value="BLOCKED">Заблокированные</option><option value="ARCHIVED">Архив</option></select></div>
        <div class="customer-row head"><span>Клиент</span><span>Контакты</span><span>Сегмент</span><span>Связи</span><span>Активность</span></div>
        <button v-for="customer in customers" :key="customer.id" class="customer-row" @click="openCustomer(customer)" @contextmenu.prevent="customerMenu($event,customer)"><span class="identity"><i>{{ (customer.firstName || customer.email || 'К').slice(0, 1).toUpperCase() }}</i><span><strong>{{ [customer.firstName, customer.lastName].filter(Boolean).join(' ') || 'Без имени' }}</strong><small>{{ statusLabels[customer.status] }}</small></span></span><span class="contacts"><b>{{ customer.email || 'Email не указан' }}</b><small>{{ customer.phone || 'Телефон не указан' }}</small></span><span><em>{{ customer.segment || 'Не определён' }}</em></span><span class="counts"><b>{{ customer._count.orders }} заказов</b><small>{{ customer.organizationMemberships[0]?.organization?.name || `${customer._count.leads} лидов` }}</small></span><span class="counts"><b>{{ customer._count.helpdeskTickets }} заявок</b><small>{{ customer._count.interactions }} контактов</small></span></button>
        <p v-if="!customers.length" class="empty">По заданным условиям клиентов нет</p>
      </section>
    </div>

    <aside v-if="selected" class="backdrop" @click.self="selected=null"><div class="drawer"><header><div><p>CUSTOMER 360</p><h2>{{ [selected.firstName, selected.lastName].filter(Boolean).join(' ') || 'Карточка клиента' }}</h2><span>{{ selected.email || selected.phone || 'Контакты не указаны' }}</span></div><button @click="selected=null"><X :size="19" /></button></header><div class="drawer-body">
      <section class="edit-grid"><label>Имя<input v-model="selected.firstName" /></label><label>Фамилия<input v-model="selected.lastName" /></label><label>Телефон<input v-model="selected.phone" /></label><label>Сегмент<input v-model="selected.segment" /></label><label>Статус<select v-model="selected.status"><option value="ACTIVE">Активен</option><option value="BLOCKED">Заблокирован</option><option value="ARCHIVED">В архиве</option></select></label><button @click="saveCustomer">Сохранить карточку</button></section>
      <section v-if="selected.organizationMemberships?.length" class="details"><h3><Building2 :size="16" /> Организации</h3><div v-for="member in selected.organizationMemberships" :key="member.id" class="detail-row"><span><strong>{{ member.organization.name }}</strong><small>{{ roleLabels[member.role] }}</small></span><em>{{ member.organization.inn ? `ИНН ${member.organization.inn}` : 'ИНН не указан' }}</em></div></section>
      <section class="details"><h3><ShoppingBag :size="16" /> Последние заказы</h3><div v-for="order in selected.orders" :key="order.id" class="detail-row"><span><strong>{{ order.externalOrderId || order.orderNumber }}</strong><small>{{ sourceLabels[order.source] || order.source }} · {{ new Date(order.createdAt).toLocaleDateString('ru-RU') }}</small></span><span><b>{{ Number(order.finalAmount).toLocaleString('ru-RU') }} ₽</b><em>{{ orderLabels[order.status] || order.status }}</em></span></div><p v-if="!selected.orders?.length" class="empty-small">Заказов пока нет</p></section>
      <section class="details"><h3><Headphones :size="16" /> Обращения</h3><div v-for="ticket in selected.helpdeskTickets" :key="ticket.id" class="detail-row"><span><strong>{{ ticket.number }}</strong><small>{{ ticket.subject }}</small></span><em>{{ ticketLabels[ticket.status] || ticket.status }}</em></div><p v-if="!selected.helpdeskTickets?.length" class="empty-small">Обращений пока нет</p></section>
    </div></div></aside>
    <div v-if="notice" class="toast">{{ notice }}</div>
  </main>
</template>

<style scoped>
.customer-page{min-height:100vh;background:var(--sb-bg);color:#202124;font-family:var(--sb-font)}.page-header{min-height:112px;padding:23px 5%;background:#fff;border-bottom:1px solid var(--sb-line);display:flex;align-items:center;justify-content:space-between}.page-header p,.drawer header p{margin:0 0 8px;color:var(--sb-coral);font-size:9px;font-weight:600;letter-spacing:.16em}.page-header h1{font-size:29px;margin:0 0 7px}.page-header span{font-size:10px;color:var(--sb-muted)}.page-header button{height:40px;padding:0 14px;border:1px solid var(--sb-line);background:#fff;display:flex;align-items:center;gap:7px;font-size:11px}.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}.page-body{max-width:1220px;margin:auto;padding:28px 5% 70px}.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:13px;margin-bottom:13px}.kpis article{background:#fff;border:1px solid var(--sb-line);padding:20px;display:grid;gap:8px}.kpis svg{color:var(--sb-coral)}.kpis span,.kpis small{font-size:10px;color:var(--sb-muted)}.kpis strong{font-size:27px;font-weight:500}.panel{background:#fff;border:1px solid var(--sb-line)}.filters{padding:18px 22px;display:flex;gap:8px;border-bottom:1px solid #eff0f2}.filters label{height:38px;flex:1;display:flex;align-items:center;gap:8px;border:1px solid var(--sb-line);padding:0 10px;color:var(--sb-muted)}.filters input{border:0;outline:0;width:100%;font-size:11px}.filters select{height:38px;border:1px solid var(--sb-line);background:#fff;padding:0 10px;font-size:10px}.customer-row{width:100%;min-height:62px;padding:0 22px;display:grid;grid-template-columns:1.55fr 1.45fr .7fr 1.1fr .8fr;gap:14px;align-items:center;border:0;border-bottom:1px solid #eff0f2;background:#fff;text-align:left;font:10px var(--sb-font)}button.customer-row:hover{background:#fafafa}.customer-row.head{min-height:42px;color:var(--sb-muted);font-size:8px;text-transform:uppercase}.identity{display:flex;align-items:center;gap:10px}.identity>i{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:#fff0ed;color:var(--sb-coral);font-style:normal}.identity>span,.contacts,.counts{display:grid;gap:4px}.customer-row strong,.customer-row b{font-size:10px;font-weight:600}.customer-row small{font-size:8px;color:var(--sb-muted)}.customer-row em{display:inline-block;width:max-content;padding:5px 7px;background:#f1f2f4;font-size:8px;font-style:normal}.empty{text-align:center;padding:35px;color:var(--sb-muted);font-size:10px}.backdrop{position:fixed;inset:0;z-index:600;background:#10111455}.drawer{position:absolute;right:0;top:0;bottom:0;width:min(620px,95vw);background:#fff;display:flex;flex-direction:column}.drawer>header{padding:25px 29px 20px;border-bottom:1px solid var(--sb-line);display:flex;justify-content:space-between}.drawer header h2{font-size:24px;margin:0 0 5px}.drawer header span{font-size:9px;color:var(--sb-muted)}.drawer header button{border:0;background:none}.drawer-body{padding:22px 29px;overflow:auto}.edit-grid{display:grid;grid-template-columns:1fr 1fr;gap:11px;padding-bottom:22px}.edit-grid label{display:grid;gap:6px;color:var(--sb-muted);font-size:9px}.edit-grid input,.edit-grid select{height:38px;border:1px solid var(--sb-line);padding:0 10px;background:#fff;font:10px var(--sb-font)}.edit-grid button{align-self:end;height:38px;border:0;background:#1d1e22;color:#fff;font-size:10px}.details{border-top:1px solid #ececef;padding:19px 0}.details h3{display:flex;align-items:center;gap:8px;margin:0 0 10px;font-size:12px}.details h3 svg{color:var(--sb-coral)}.detail-row{min-height:49px;display:flex;align-items:center;justify-content:space-between;gap:15px;border-bottom:1px solid #eff0f2}.detail-row>span{display:grid;gap:4px;text-align:right}.detail-row>span:first-child{text-align:left}.detail-row strong,.detail-row b{font-size:9px}.detail-row small,.detail-row em{font-size:8px;color:var(--sb-muted);font-style:normal}.empty-small{font-size:9px;color:var(--sb-muted)}.toast{position:fixed;right:22px;bottom:22px;background:#1d1e22;color:#fff;padding:12px 16px;font-size:10px;z-index:800}@media(max-width:900px){.kpis{grid-template-columns:repeat(2,1fr)}.customer-row{grid-template-columns:1.4fr 1.2fr .7fr 1fr}.customer-row>*:last-child{display:none}}@media(max-width:600px){.page-header{align-items:flex-start;flex-direction:column;gap:14px}.page-body{padding:20px}.filters{flex-wrap:wrap}.filters label{flex-basis:100%}.customer-row{grid-template-columns:1.2fr 1fr}.customer-row>*:nth-child(n+3){display:none}.edit-grid{grid-template-columns:1fr}}
</style>
