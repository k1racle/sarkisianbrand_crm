<script setup lang="ts">
useHead({ title: 'Клиенты — SARKISIAN CRM' });
import { ArrowLeft, ArrowUpRight, CalendarDays, CheckCircle2, Clock3, ListFilter, MessageSquare, MoreHorizontal, Pencil, Building2, ChevronLeft, ChevronRight, Headphones, Mail, Phone, Plus, RefreshCw, Search, ShoppingBag, SlidersHorizontal, UserPlus, UserRound, Users, X } from '@lucide/vue';
const config = useRuntimeConfig();
const route = useRoute();
const router = useRouter();
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
function openRow(event: MouseEvent, customer: any) { if (!(event.target as HTMLElement).closest('a,button,input,select')) void selectCustomer(customer); }
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
    if (preview.value && !recordOpen.value && !nextCustomers.some(row => row.id === preview.value.id)) preview.value = null;
    page.value = Math.min(page.value, pageCount.value);
  } catch (reason:any) { if (version === loadVersion) error.value = typeof reason?.data?.message === 'string' ? reason.data.message : 'Не удалось загрузить клиентов. Повторите попытку.'; }
  finally { if (version === loadVersion) loading.value = false; }
}
async function editCustomer(customer: any, tab = 'profile', focusManager = false) {
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
  if (preview.value?.id === saved.id) preview.value = saved;
  notice.value = 'Карточка клиента сохранена';
  await load(); setTimeout(() => notice.value = '', 2200);
  });
}
async function changeCustomerStatus(customer:any, nextStatus:string) { if (!canWriteRecord(customer)) return; await runOperation(async () => { const saved = await $fetch(`/customer-360/customers/${customer.id}`, { baseURL: config.public.apiBase, method: 'PATCH', headers: headers.value, body: { status: nextStatus } }); if (preview.value?.id === customer.id) preview.value = saved; await load(); notice.value = nextStatus === 'ARCHIVED' ? 'Клиент перемещён в архив' : 'Статус клиента обновлён'; setTimeout(()=>notice.value='',2200); }); }
async function moveCustomerToTrash(customer:any) { if (!canWriteRecord(customer) || !closeEditor()) return; await runOperation(async () => { await $fetch(`/data-lifecycle/CUSTOMER/${customer.id}/trash`, { baseURL: config.public.apiBase, method: 'POST', headers: headers.value, body: { reason: 'Удалено из Customer 360' } }); if (preview.value?.id === customer.id) { closeRecord(); closePreview(); } await load(); notice.value = 'Клиент перемещён в корзину на 30 дней'; setTimeout(()=>notice.value='',2600); }); }
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
onMounted(async () => {
  await load();
  const id = typeof route.query.customer === 'string' ? route.query.customer : '';
  if (id) await openCustomer({ id });
  else if (customers.value.length) {
    await nextTick();
    const pane = document.querySelector('.crm-customer-preview');
    if (pane && window.getComputedStyle(pane).display !== 'none') await selectCustomer(customers.value[0]);
  }
});

// The register, read-only workhub and isolated editor share the existing access-aware APIs.
const preview = ref<any>(null), previewLoading = ref(false), previewError = ref(''), recordOpen = ref(false);
const recordTab = ref('overview');
const compactScreen = ref(false);
function updateCompactScreen() { compactScreen.value = window.innerWidth <= 800; }
onMounted(() => { updateCompactScreen(); window.addEventListener('resize', updateCompactScreen, { passive: true }); });
onBeforeUnmount(() => window.removeEventListener('resize', updateCompactScreen));
const allTasks = ref<any[]>([]), tasksLoading = ref(false), tasksError = ref('');
let previewVersion = 0, tasksIdentity = '';
const canReadTasks = computed(() => access.can('crm.read'));
const canCreateTask = computed(() => access.can('crm.write'));
const recordTabs = computed(() => [{ value:'overview',label:'Обзор' },{value:'history',label:'История'},{value:'orders',label:'Заказы',count:preview.value?._count?.orders || 0},{value:'tasks',label:'Задачи',count:preview.value?._count?.tasks || 0},{value:'support',label:'Обращения',count:preview.value?._count?.helpdeskTickets || 0}]);
const initials = (item:any) => [item?.firstName,item?.lastName].filter(Boolean).map((v:string)=>v[0]).join('').slice(0,2).toUpperCase() || customerName(item || {}).slice(0,1).toUpperCase();
const segmentName = (value:string) => ({B2C:'Розница',B2B:'Бизнес','Лид':'Лид'} as Record<string,string>)[value] || value || 'Не указан';
const personName = (person:any) => [person?.firstName,person?.lastName].filter(Boolean).join(' ') || person?.email || 'Не назначен';
const money = (value:any) => Number(value || 0).toLocaleString('ru-RU',{maximumFractionDigits:2}) + ' ₽';
const dateLabel = (value:any, withTime=false) => value && Number.isFinite(new Date(value).getTime()) ? new Date(value).toLocaleString('ru-RU',withTime?{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}:{day:'numeric',month:'short',year:'numeric'}) : 'Не указано';
const relatedTasks = computed(() => allTasks.value.filter(task => task.customerId === preview.value?.id || task.customer?.id === preview.value?.id));
const nextTask = computed(() => relatedTasks.value.filter(task => !['DONE','CANCELLED'].includes(task.status)).sort((a,b)=>(new Date(a.dueDate || '9999-01-01').getTime()-new Date(b.dueDate || '9999-01-01').getTime()))[0]);
const latestOrder = computed(() => preview.value?.orders?.[0]);
const canAddNote = computed(() => canCreateTask.value && Boolean(preview.value?.leads?.length));
const timeline = computed(() => {
  if (!preview.value) return [];
  const row = preview.value;
  return [
    ...(row.interactions || []).map((entry:any)=>({id:'interaction-'+entry.id,kind:'interaction',icon:MessageSquare,title:entry.type === 'NOTE'?'Заметка':entry.type === 'CALL'?'Звонок':'Взаимодействие',body:entry.content,createdAt:entry.createdAt})),
    ...(row.orders || []).map((order:any)=>({id:'order-'+order.id,kind:'order',icon:ShoppingBag,title:'Заказ '+(order.externalOrderId || order.orderNumber),body:sourceLabels[order.source] || order.source,amount:order.finalAmount,status:orderLabels[order.status] || order.status,createdAt:order.createdAt,to:access.can('oms.read')?{path:'/crm/b2b-orders',query:{order:order.id}}:null})),
    ...(row.helpdeskTickets || []).map((ticket:any)=>({id:'ticket-'+ticket.id,kind:'ticket',icon:Headphones,title:ticket.subject,body:ticket.number,status:ticketLabels[ticket.status] || ticket.status,createdAt:ticket.createdAt,to:access.can('helpdesk.read')?{path:'/crm/support/tickets',query:{ticket:ticket.id}}:null})),
    ...relatedTasks.value.map((task:any)=>({id:'task-'+task.id,kind:'task',icon:task.status === 'DONE'?CheckCircle2:Clock3,title:task.title,body:task.description,actor:personName(task.assignedTo),status:task.status === 'DONE'?'Выполнено':task.status === 'CANCELLED'?'Отменено':'В работе',createdAt:task.createdAt,to:{path:'/crm/tasks',query:{task:task.id}}})),
    ...(row.createdAt?[{id:'created',kind:'created',icon:UserPlus,title:'Клиент добавлен',body:sourceLabels[row.source] || row.source || 'Клиентская база',createdAt:row.createdAt}]:[])
  ].sort((a:any,b:any)=>new Date(b.createdAt || 0).getTime()-new Date(a.createdAt || 0).getTime());
});
const historyFilter = ref('all');
const visibleTimeline = computed(() => timeline.value.filter(entry => historyFilter.value === 'all' || entry.kind === historyFilter.value));
async function loadTasks(force=false) {
  if (!canReadTasks.value || (!force && tasksIdentity === token.value)) return;
  const identity = token.value; tasksLoading.value = true; tasksError.value = '';
  try { const rows = await $fetch<any[]>('/crm/tasks',{baseURL:config.public.apiBase,headers:headers.value}); if (token.value === identity) {allTasks.value=rows;tasksIdentity=identity;} }
  catch { if (token.value === identity) tasksError.value='Не удалось загрузить задачи клиента.'; }
  finally { if(token.value===identity)tasksLoading.value=false; }
}
async function selectCustomer(customer:any, full=false, tab='overview') {
  if (actionBusy.value) return;
  const version=++previewVersion,identity=token.value;
  previewLoading.value=true; previewError.value='';
  if(preview.value?.id !== customer.id) preview.value=customer;
  if(full){recordOpen.value=true;recordTab.value=tab;}
  try {
    const row=await $fetch<any>('/customer-360/customers/'+encodeURIComponent(customer.id),{baseURL:config.public.apiBase,headers:headers.value});
    if(version!==previewVersion || token.value!==identity)return;
    preview.value=row;
    void loadTasks();
  } catch(reason:any) {if(version===previewVersion)previewError.value=reason?.data?.message || 'Не удалось открыть карточку клиента. Повторите попытку.';}
  finally {if(version===previewVersion)previewLoading.value=false;}
  const pane = document.querySelector('.crm-customer-preview');
  if(!full && (!pane || window.getComputedStyle(pane).display === 'none')){recordOpen.value=true;recordTab.value=tab;}
}
async function openCustomer(customer:any,tab='overview') {
  if(selected.value && !closeEditor())return;
  await selectCustomer(customer,true,tab==='profile'?'overview':tab);
  if(recordOpen.value && preview.value?.id === customer.id && !previewError.value)void router.replace({query:{...route.query,customer:customer.id}});
}
function closePreview(){++previewVersion;preview.value=null;previewLoading.value=false;previewError.value='';}
function closeRecord(){recordOpen.value=false;recordTab.value='overview';void router.replace({query:{...route.query,customer:undefined}});}
function recordTabKeys(event:KeyboardEvent){
  const tabs=recordTabs.value,index=tabs.findIndex(tab=>tab.value===recordTab.value);
  const next=event.key==='ArrowRight'?(index+1)%tabs.length:event.key==='ArrowLeft'?(index+tabs.length-1)%tabs.length:event.key==='Home'?0:event.key==='End'?tabs.length-1:-1;
  if(next<0)return;event.preventDefault();recordTab.value=tabs[next].value;nextTick(()=>document.getElementById('customer-record-tab-'+recordTab.value)?.focus());
}
const composer = ref<'task'|'note'|null>(null), composerText = ref(''), composerDate = ref(''), composerLead = ref(''), composerError = ref('');
function closeComposer(){if(actionBusy.value)return false;if(composerText.value.trim()&&!window.confirm('Отменить несохранённый текст?'))return false;composer.value=null;return true;}
const {panel:composerPanel,keyboard:composerKeys}=useCatalogDialog(computed(()=>Boolean(composer.value)),closeComposer);
function openComposer(kind:'task'|'note') {if(kind==='task'?!canCreateTask.value:!canAddNote.value)return;composerText.value='';composerDate.value='';composerError.value='';composerLead.value=preview.value?.leads?.[0]?.id || '';composer.value=kind;}
async function saveComposer(){
  const row=preview.value,kind=composer.value,text=composerText.value.trim();
  if(!row?.id || !kind || !text || actionBusy.value)return;
  if(kind==='task'?!canCreateTask.value:!canAddNote.value)return;
  composerError.value='';
  await runOperation(async()=>{
    try {
      if(kind==='task') {await $fetch('/crm/tasks',{baseURL:config.public.apiBase,headers:headers.value,method:'POST',body:{title:text,customerId:row.id,...(composerDate.value?{dueDate:new Date(composerDate.value).toISOString()}:{})}});await loadTasks(true);}
      else {await $fetch('/crm/leads/'+encodeURIComponent(composerLead.value)+'/interactions',{baseURL:config.public.apiBase,headers:headers.value,method:'POST',body:{type:'NOTE',content:text,customerId:row.id}});}
      const refreshed=await $fetch<any>('/customer-360/customers/'+encodeURIComponent(row.id),{baseURL:config.public.apiBase,headers:headers.value});
      if(preview.value?.id===row.id)preview.value=refreshed;
      composer.value=null;composerText.value='';notice.value=kind==='task'?'Задача создана':'Заметка добавлена';setTimeout(()=>notice.value='',2600);
    }catch(reason:any){composerError.value=typeof reason?.data?.message==='string'?reason.data.message:'Не удалось сохранить. Текст оставлен — повторите попытку.';}
  });
}
watch(()=>user.value?.id,()=>{++previewVersion;preview.value=null;recordOpen.value=false;allTasks.value=[];tasksIdentity='';selected.value=null;composer.value=null;composerText.value='';});
onBeforeUnmount(()=>{++previewVersion;});
function protectCustomerUnload(event: BeforeUnloadEvent) {
  if (!draftDirty.value && !actionBusy.value && (!composer.value || !composerText.value.trim())) return;
  event.preventDefault(); event.returnValue = '';
}
onMounted(() => window.addEventListener('beforeunload', protectCustomerUnload));
onBeforeUnmount(() => window.removeEventListener('beforeunload', protectCustomerUnload));
onBeforeRouteLeave(()=>!composer.value || (!actionBusy.value && (!composerText.value.trim() || window.confirm('Покинуть страницу без сохранения текста?'))));
</script>

<template>
  <main class="customer-page crm-standard crm-directory crm-customers-page">
    <template v-if="!recordOpen">
      <header class="crm-page-header"><div><h1>Клиенты</h1><p>Контакты, история и следующий шаг в одном месте</p></div><div class="crm-customer-header-actions"><button class="crm-button crm-button--icon" :disabled="loading" aria-label="Обновить" @click="load"><RefreshCw :size="18" :class="{spin:loading}" /></button><button v-if="canEdit" class="crm-button crm-button--primary crm-customer-add" :disabled="actionBusy" @click="openNewCustomer"><Plus :size="18" />Добавить клиента</button></div></header>
      <nav class="crm-customer-views crm-tabs crm-tabs--segmented" aria-label="Представления клиентов"><button class="crm-tab" :aria-pressed="!assignment" @click="assignment=''">Все клиенты <span>{{ customers.length }}</span></button><button class="crm-tab" :aria-pressed="assignment==='mine'" @click="assignment='mine'">Мои клиенты</button><button class="crm-tab" :aria-pressed="assignment==='unassigned'" @click="assignment='unassigned'">Без ответственного</button></nav>
      <p v-if="error && !selected" class="operation-error" role="alert">{{ error }} <button class="crm-button" @click="load">Повторить</button></p>
      <WorkspaceLoading v-if="!dashboard && loading" label="Загружаем клиентов" />
      <div v-else-if="dashboard" class="crm-customer-workspace">
        <section class="crm-customer-register" aria-label="Список клиентов" :aria-busy="loading">
          <div class="crm-customer-tools"><label class="crm-customer-search crm-input-group"><Search :size="18" /><input v-model="search" class="crm-input" type="search" aria-label="Поиск клиентов" placeholder="Имя, телефон, email или компания" /><button v-if="search" class="crm-customer-plain crm-button crm-button--text" aria-label="Очистить поиск" @click="search=''"><X :size="16" /></button></label><button class="crm-button crm-customer-filter-button" aria-label="Фильтры и сортировка" :aria-expanded="filtersExpanded" aria-controls="customer-filters" @click="filtersExpanded=!filtersExpanded"><SlidersHorizontal :size="18" /><span>Фильтры</span><span v-if="extraFilterCount" class="crm-customer-chip">{{ extraFilterCount }}</span></button></div>
          <div v-if="filtersExpanded" id="customer-filters" class="crm-customer-filter-bar"><label>Сегмент<select v-model="segment" class="crm-input"><option v-for="filter in segmentFilters" :key="filter.value" :value="filter.value">{{ filter.label }}</option></select></label><label>Статус<select v-model="status" class="crm-input" aria-label="Статус клиента"><option value="">Все статусы</option><option value="ACTIVE">Активные</option><option value="BLOCKED">Заблокированные</option><option value="ARCHIVED">В архиве</option></select></label><label>Ответственный<select v-model="assignment" class="crm-input" aria-label="Ответственный менеджер"><option v-for="filter in assignmentFilters" :key="filter.value" :value="filter.value">{{ filter.label }}</option></select></label><label>Сортировка<select v-model="sort" class="crm-input" aria-label="Сортировка клиентов"><option value="updated">Последние изменения</option><option value="name">По имени: А–Я</option><option value="orders">Больше заказов</option></select></label></div>
          <div v-if="hasFilters" class="crm-customer-filter-summary"><span>Найдено: {{ filteredCustomers.length }}</span><button class="crm-customer-plain crm-button crm-button--text" @click="resetFilters">Сбросить фильтры <X :size="14" /></button></div>
          <div v-if="filteredCustomers.length" class="crm-customer-table"><div class="crm-customer-columns" aria-hidden="true"><span>Клиент</span><span>Сегмент</span><span>Ответственный</span><span>Активность</span><span>Заказы</span></div><article v-for="customer in visibleCustomers" :key="customer.id" class="customer-row crm-customer-row" :class="{'is-selected':preview?.id===customer.id}" :aria-label="customerName(customer)" tabindex="0" @click="openRow($event,customer)" @keydown.enter.self.prevent="openCustomer(customer)" @keydown.space.self.prevent="selectCustomer(customer)" @contextmenu.prevent="customerMenu($event,customer)"><div class="crm-customer-person"><span class="crm-customer-avatar" aria-hidden="true">{{ initials(customer) }}</span><div><button class="crm-customer-name crm-card-action" :disabled="actionBusy" :aria-label="`Открыть клиента: ${customerName(customer)}`" @click="openCustomer(customer)">{{ customerName(customer) }}</button><a v-if="customer.email" class="crm-customer-subline" :href="`mailto:${customer.email}`">{{ customer.email }}</a><a v-else-if="customer.phone" class="crm-customer-subline" :href="phoneHref(customer.phone)">{{ customer.phone }}</a><span v-else class="crm-customer-subline">Контакты не указаны</span></div></div><span class="crm-customer-segment"><span class="crm-customer-badge">{{ segmentName(customer.segment) }}</span><span v-if="customer.status!=='ACTIVE'" class="crm-customer-subline">{{ statusLabels[customer.status] }}</span></span><span class="crm-customer-owner">{{ managerName(customer) }}</span><span class="crm-customer-date">{{ dateLabel(customer.updatedAt || customer.createdAt) }}</span><button class="crm-customer-order-count crm-card-action" :disabled="actionBusy" :aria-label="`Заказы клиента ${customerName(customer)}: ${customer._count?.orders || 0}`" @click="openCustomer(customer,'orders')"><ShoppingBag :size="15" />{{ customer._count?.orders || 0 }}</button></article></div>
          <div v-else-if="!loading" class="crm-directory-empty"><Search v-if="hasFilters" :size="28" /><Users v-else :size="28" /><strong>{{ hasFilters?'Клиенты не найдены':'Добавьте первого клиента' }}</strong><p>{{ hasFilters?'Измените запрос или сбросьте фильтры.':'Сохраните контакт и назначьте ответственного, чтобы начать работу.' }}</p><button v-if="hasFilters" class="crm-button" @click="resetFilters">Сбросить фильтры</button><button v-else-if="canEdit" class="crm-button crm-button--primary" @click="openNewCustomer">Добавить клиента</button></div>
          <footer v-if="filteredCustomers.length" class="crm-customer-footer"><span>Показано {{ (page-1)*pageSize+1 }}–{{ Math.min(page*pageSize,filteredCustomers.length) }} из {{ filteredCustomers.length }}</span><nav v-if="pageCount>1" class="crm-customer-pagination" aria-label="Страницы клиентов"><button class="crm-button crm-button--icon" :disabled="page===1 || loading" aria-label="Предыдущая страница" @click="page--"><ChevronLeft :size="16" /></button><span>{{ page }} / {{ pageCount }}</span><button class="crm-button crm-button--icon" :disabled="page===pageCount || loading" aria-label="Следующая страница" @click="page++"><ChevronRight :size="16" /></button></nav><span v-else>{{ dashboard.newCustomers || 0 }} новых за 30 дней</span></footer>
        </section>
        <aside class="crm-customer-preview" aria-label="Предпросмотр клиента"><div class="crm-customer-preview-top"><span>Предпросмотр клиента</span><button v-if="preview" class="crm-button crm-button--icon" aria-label="Закрыть предпросмотр" @click="closePreview"><X :size="18" /></button></div><template v-if="preview"><div class="crm-customer-preview-identity"><span class="crm-customer-avatar crm-customer-avatar--large">{{ initials(preview) }}</span><div><h2>{{ customerName(preview) }}</h2><div class="crm-customer-badges"><span class="crm-customer-badge">{{ segmentName(preview.segment) }}</span><span class="crm-customer-badge" :data-status="preview.status">{{ statusLabels[preview.status] }}</span></div></div></div><WorkspaceLoading v-if="previewLoading" label="Загружаем карточку" /><p v-else-if="previewError" class="operation-error" role="alert">{{ previewError }}<button class="crm-button" @click="selectCustomer(preview)">Повторить</button></p><template v-else><div class="crm-customer-preview-contacts"><a v-if="preview.phone" :href="phoneHref(preview.phone)"><Phone :size="18" />{{ preview.phone }}</a><a v-if="preview.email" :href="`mailto:${preview.email}`"><Mail :size="18" />{{ preview.email }}</a><span v-if="!preview.phone && !preview.email" class="crm-muted">Контакты не указаны</span></div><div class="crm-customer-preview-owner"><span class="crm-customer-avatar crm-customer-avatar--small"><UserRound :size="15" /></span><div><small>Ответственный</small><strong>{{ managerName(preview) }}</strong></div></div><section v-if="nextTask" class="crm-customer-next"><span class="crm-customer-next-label"><Clock3 :size="16" />{{ nextTask.dueDate?dateLabel(nextTask.dueDate,true):'Следующий шаг' }}</span><h3>{{ nextTask.title }}</h3><p>{{ personName(nextTask.assignedTo) }}</p><NuxtLink class="crm-button" :to="{path:'/crm/tasks',query:{task:nextTask.id}}">Открыть задачу</NuxtLink></section><section v-else-if="canReadTasks" class="crm-customer-next"><h3>Следующий шаг</h3><p>{{ tasksLoading?'Загружаем задачи…':tasksError || 'Открытых задач пока нет' }}</p><button v-if="tasksError" class="crm-button" @click="loadTasks(true)">Повторить</button><button v-else-if="canCreateTask && !tasksLoading" class="crm-button" @click="openComposer('task')"><Plus :size="16" />Создать задачу</button></section><section class="crm-customer-preview-order"><h3>Последний заказ</h3><template v-if="latestOrder"><div class="crm-customer-between"><strong>{{ latestOrder.externalOrderId || latestOrder.orderNumber }}</strong><strong class="crm-customer-money">{{ money(latestOrder.finalAmount) }}</strong></div><span class="crm-customer-badge">{{ orderLabels[latestOrder.status] || latestOrder.status }}</span><p class="crm-muted">{{ dateLabel(latestOrder.createdAt) }} · {{ sourceLabels[latestOrder.source] || latestOrder.source }}</p></template><p v-else class="crm-muted">{{ preview.relatedAccess?.orders===false?'Нет доступа к истории заказов':'Нет доступных заказов' }}</p></section><button class="crm-button crm-button--primary crm-customer-open" @click="openCustomer(preview)">Открыть карточку клиента<ArrowUpRight :size="17" /></button></template></template><div v-else class="crm-customer-preview-empty"><Users :size="28" /><p>Выберите клиента, чтобы увидеть контакты и следующий шаг.</p></div></aside>
      </div>
    </template>
    <template v-else-if="preview">
      <header class="crm-page-header crm-customer-profile-header"><div class="crm-customer-profile-identity"><button class="crm-button crm-button--icon" aria-label="Вернуться к клиентам" @click="closeRecord"><ArrowLeft :size="20" /></button><span class="crm-customer-avatar crm-customer-avatar--large">{{ initials(preview) }}</span><div><h1>{{ customerName(preview) }}</h1><div class="crm-customer-badges"><span class="crm-customer-badge">{{ segmentName(preview.segment) }}</span><span class="crm-customer-badge" :data-status="preview.status">{{ statusLabels[preview.status] }}</span><span class="crm-muted">Клиент с {{ dateLabel(preview.createdAt) }}</span></div></div></div><div class="crm-customer-header-actions"><a v-if="compactScreen && preview.phone" class="crm-button crm-button--icon" :href="phoneHref(preview.phone)" aria-label="Позвонить клиенту"><Phone :size="19" /></a><button v-if="canAddNote" class="crm-button" @click="openComposer('note')"><Plus :size="17" />Заметка</button><button v-if="canCreateTask && !compactScreen" class="crm-button crm-button--primary" @click="openComposer('task')">Создать задачу</button><button class="crm-button crm-button--icon" :aria-label="canWriteRecord(preview)?'Редактировать клиента':'Посмотреть реквизиты клиента'" @click="editCustomer(preview)"><Pencil :size="18" /></button><button class="crm-button crm-button--icon" aria-label="Действия с клиентом" @click="customerMenu($event,preview)"><MoreHorizontal :size="18" /></button></div></header>
      <nav class="crm-customer-record-tabs crm-tabs crm-tabs--segmented" role="tablist" aria-label="Разделы карточки клиента" @keydown="recordTabKeys"><button class="crm-tab" v-for="tab in recordTabs" :id="`customer-record-tab-${tab.value}`" :key="tab.value" role="tab" :aria-selected="recordTab===tab.value" :aria-controls="`customer-record-${tab.value}`" :tabindex="recordTab===tab.value?0:-1" @click="recordTab=tab.value">{{ tab.label }}<span v-if="tab.count!==undefined">{{ tab.count }}</span></button></nav>
      <WorkspaceLoading v-if="previewLoading" label="Загружаем карточку клиента" /><p v-else-if="previewError" class="operation-error" role="alert">{{ previewError }}<button class="crm-button" @click="selectCustomer(preview,true,recordTab)">Повторить</button></p>
      <div v-else class="crm-customer-record-layout"><aside class="crm-customer-facts"><details :open="!compactScreen"><summary><h2>О клиенте</h2><ChevronRight :size="16" /></summary><dl><div><dt>Телефон</dt><dd><a v-if="preview.phone" :href="phoneHref(preview.phone)">{{ preview.phone }}</a><span v-else>Не указан</span></dd></div><div><dt>Email</dt><dd><a v-if="preview.email" :href="`mailto:${preview.email}`">{{ preview.email }}</a><span v-else>Не указан</span></dd></div><div><dt>Ответственный</dt><dd>{{ managerName(preview) }}</dd></div><div><dt>Источник</dt><dd>{{ sourceLabels[preview.source] || preview.source || 'Не указан' }}</dd></div><div v-if="preview.organizationMemberships?.length"><dt>Организации</dt><dd v-for="member in preview.organizationMemberships" :key="member.id"><NuxtLink :to="{path:'/crm/organizations',query:{organization:member.organization.id}}">{{ member.organization.name }}</NuxtLink><small>{{ roleLabels[member.role] || member.role }}</small></dd></div></dl></details><div class="crm-customer-record-stats"><div><strong>{{ preview._count?.orders || 0 }}</strong><span>Заказов</span></div><div><strong>{{ preview._count?.helpdeskTickets || 0 }}</strong><span>Обращений</span></div></div></aside>
        <div class="crm-customer-record-main"><section v-if="recordTab==='overview' || recordTab==='history'" :id="`customer-record-${recordTab}`" role="tabpanel" :aria-labelledby="`customer-record-tab-${recordTab}`"><section v-if="recordTab==='overview' && canReadTasks" class="crm-customer-next"><div class="crm-customer-between"><span class="crm-customer-next-label"><Clock3 :size="17" />Следующий шаг</span><span v-if="nextTask?.dueDate" class="crm-customer-badge">{{ dateLabel(nextTask.dueDate,true) }}</span></div><template v-if="nextTask"><h2>{{ nextTask.title }}</h2><div class="crm-customer-between"><span>{{ personName(nextTask.assignedTo) }}</span><NuxtLink class="crm-button" :to="{path:'/crm/tasks',query:{task:nextTask.id}}">Открыть задачу</NuxtLink></div></template><template v-else><h2>{{ tasksLoading?'Загружаем задачи…':tasksError || 'Запланируйте следующий шаг' }}</h2><p v-if="!tasksLoading && !tasksError">Создайте задачу, чтобы вовремя вернуться к клиенту.</p><button v-if="tasksError" class="crm-button" @click="loadTasks(true)">Повторить</button><button v-else-if="canCreateTask && !tasksLoading" class="crm-button" @click="openComposer('task')"><Plus :size="16" />Создать задачу</button></template></section><header class="crm-customer-history-heading"><h2>История работы</h2><select v-model="historyFilter" class="crm-input" aria-label="Тип событий"><option value="all">Все события</option><option value="interaction">Взаимодействия</option><option value="order">Заказы</option><option value="task">Задачи</option><option value="ticket">Обращения</option></select></header><div v-if="!visibleTimeline.length" class="crm-directory-empty"><MessageSquare :size="28" /><p>Событий этого типа пока нет</p></div><article v-for="entry in visibleTimeline" :key="entry.id" class="crm-customer-event"><span class="crm-customer-event-icon"><component :is="entry.icon" :size="18" /></span><div><div class="crm-customer-event-meta"><span>{{ entry.actor || dateLabel(entry.createdAt) }}</span><time>{{ dateLabel(entry.createdAt,true) }}</time></div><h3><NuxtLink v-if="entry.to" :to="entry.to">{{ entry.title }}<ArrowUpRight :size="14" /></NuxtLink><span v-else>{{ entry.title }}</span></h3><p v-if="entry.body">{{ entry.body }}</p><strong v-if="entry.amount!==undefined" class="crm-customer-money">{{ money(entry.amount) }}</strong><span v-if="entry.status" class="crm-customer-badge">{{ entry.status }}</span></div></article></section>
          <section v-else-if="recordTab==='orders'" id="customer-record-orders" role="tabpanel" aria-labelledby="customer-record-tab-orders"><h2>Заказы клиента</h2><article v-for="order in preview.orders" :key="order.id" class="crm-customer-history-row"><div><NuxtLink :to="{path:'/crm/b2b-orders',query:{order:order.id}}"><strong>{{ order.externalOrderId || order.orderNumber }}</strong><ArrowUpRight :size="15" /></NuxtLink><small>{{ sourceLabels[order.source] || order.source }} · {{ dateLabel(order.createdAt) }}</small></div><div><strong class="crm-customer-money">{{ money(order.finalAmount) }}</strong><span class="crm-customer-badge">{{ orderLabels[order.status] || order.status }}</span></div></article><div v-if="!preview.orders?.length" class="crm-directory-empty"><ShoppingBag :size="28" /><p>{{ preview.relatedAccess?.orders===false?'Нет доступа к истории заказов':'Нет доступных заказов' }}</p></div></section>
          <section v-else-if="recordTab==='tasks'" id="customer-record-tasks" role="tabpanel" aria-labelledby="customer-record-tab-tasks"><header class="crm-customer-history-heading"><h2>Задачи по клиенту</h2><button v-if="canCreateTask" class="crm-button" @click="openComposer('task')"><Plus :size="16" />Добавить</button></header><WorkspaceLoading v-if="tasksLoading" label="Загружаем задачи" /><p v-else-if="tasksError" class="operation-error">{{ tasksError }}<button class="crm-button" @click="loadTasks(true)">Повторить</button></p><article v-for="task in relatedTasks" :key="task.id" class="crm-customer-history-row"><div><NuxtLink :to="{path:'/crm/tasks',query:{task:task.id}}"><strong>{{ task.title }}</strong><ArrowUpRight :size="15" /></NuxtLink><small>{{ personName(task.assignedTo) }} · {{ task.dueDate?dateLabel(task.dueDate,true):'Срок не указан' }}</small></div><span class="crm-customer-badge">{{ task.status==='DONE'?'Выполнено':task.status==='CANCELLED'?'Отменено':'В работе' }}</span></article><div v-if="!tasksLoading && !relatedTasks.length && !tasksError" class="crm-directory-empty"><Clock3 :size="28" /><p>{{ canReadTasks?'Связанных задач пока нет':'Нет доступа к задачам' }}</p></div></section>
          <section v-else id="customer-record-support" role="tabpanel" aria-labelledby="customer-record-tab-support"><h2>Обращения клиента</h2><article v-for="ticket in preview.helpdeskTickets" :key="ticket.id" class="crm-customer-history-row"><div><NuxtLink :to="{path:'/crm/support/tickets',query:{ticket:ticket.id}}"><strong>{{ ticket.subject }}</strong><ArrowUpRight :size="15" /></NuxtLink><small>{{ ticket.number }} · {{ dateLabel(ticket.createdAt) }}</small></div><span class="crm-customer-badge">{{ ticketLabels[ticket.status] || ticket.status }}</span></article><div v-if="!preview.helpdeskTickets?.length" class="crm-directory-empty"><Headphones :size="28" /><p>{{ preview.relatedAccess?.helpdesk===false?'Нет доступа к истории обращений':'Нет доступных обращений' }}</p></div></section>
        </div>
        <aside class="crm-customer-related"><section><header><h2>Заказы</h2><button class="crm-customer-plain crm-button crm-button--text" @click="recordTab='orders'">Все<ChevronRight :size="15" /></button></header><template v-if="latestOrder"><strong>{{ latestOrder.externalOrderId || latestOrder.orderNumber }}</strong><b class="crm-customer-related-amount">{{ money(latestOrder.finalAmount) }}</b><span class="crm-customer-badge">{{ orderLabels[latestOrder.status] || latestOrder.status }}</span><p>{{ dateLabel(latestOrder.createdAt) }}</p></template><p v-else>{{ preview.relatedAccess?.orders===false?'История заказов недоступна':'Заказов пока нет' }}</p></section><section v-if="canReadTasks"><header><h2>Задачи</h2><button class="crm-customer-plain crm-button crm-button--text" @click="recordTab='tasks'">Все<ChevronRight :size="15" /></button></header><NuxtLink v-for="task in relatedTasks.slice(0,3)" :key="task.id" :to="{path:'/crm/tasks',query:{task:task.id}}" class="crm-customer-related-task"><CheckCircle2 v-if="task.status==='DONE'" :size="16" /><Clock3 v-else :size="16" /><span>{{ task.title }}<small>{{ dateLabel(task.dueDate,true) }}</small></span></NuxtLink><p v-if="!relatedTasks.length">{{ tasksLoading?'Загрузка…':tasksError || 'Нет открытых задач' }}</p></section><section><h2>Ответственный</h2><p>{{ managerName(preview) }}</p><button v-if="canWriteRecord(preview)" class="crm-button" @click="editCustomer(preview,'profile',true)">Изменить</button></section></aside>
      </div>
      <div class="crm-customer-mobile-actions"><a v-if="preview.phone" class="crm-button crm-button--icon" :href="phoneHref(preview.phone)" aria-label="Позвонить клиенту"><Phone :size="19" /></a><button v-if="canCreateTask" class="crm-button crm-button--primary" @click="openComposer('task')">Создать задачу</button></div>
    </template>

    <Teleport to="body">
      <div v-if="selected" class="crm-detail-backdrop admin-dialog-backdrop" @click.self="closeEditor">
        <section ref="entityPanel" class="admin-dialog admin-dialog--drawer crm-detail-card crm-customer-dialog" role="dialog" aria-modal="true" aria-labelledby="customer-card-title" tabindex="-1" @keydown="entityKeys">
          <header>
            <div><p class="eyebrow">{{ creating ? 'Клиентская база' : 'Карточка клиента' }}</p><h2 id="customer-card-title">{{ creating ? 'Новый клиент' : customerName(selected) }}</h2><div v-if="!creating" class="crm-directory-badges"><span class="crm-directory-status" :data-status="selected.status">{{ statusLabels[selected.status] }}</span><span v-if="selected.segment" class="crm-directory-segment">{{ selected.segment }}</span></div></div>
            <button class="crm-button crm-button--icon" @click="closeEditor" :disabled="actionBusy" aria-label="Закрыть карточку"><X :size="20" /></button>
          </header>
          <nav v-if="!creating" class="crm-customer-card-tabs crm-tabs crm-tabs--segmented" role="tablist" aria-label="Разделы карточки клиента" @keydown="tabKeys"><button class="crm-tab" v-for="tab in customerTabs" :id="`customer-tab-${tab.value}`" :key="tab.value" role="tab" :aria-selected="customerTab === tab.value" :tabindex="customerTab === tab.value ? 0 : -1" :aria-controls="`customer-panel-${tab.value}`" @click="customerTab = tab.value">{{ tab.label }}<span v-if="tab.value === 'orders'">{{ selected._count?.orders || 0 }}</span><span v-if="tab.value === 'support'">{{ selected._count?.helpdeskTickets || 0 }}</span></button></nav>
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

    <Teleport to="body"><div v-if="composer" class="crm-detail-backdrop admin-dialog-backdrop" @click.self="closeComposer"><section ref="composerPanel" class="admin-dialog crm-customer-composer" role="dialog" aria-modal="true" aria-labelledby="customer-compose-title" tabindex="-1" @keydown="composerKeys"><header><div><h2 id="customer-compose-title">{{ composer==='task'?'Создать задачу':'Добавить заметку' }}</h2><p>{{ customerName(preview) }}</p></div><button class="crm-button crm-button--icon" :disabled="actionBusy" aria-label="Закрыть" @click="closeComposer"><X :size="20" /></button></header><form @submit.prevent="saveComposer"><p v-if="composerError" class="operation-error" role="alert">{{ composerError }}</p><label v-if="composer==='note'">Сделка<select v-model="composerLead" class="crm-input" required :disabled="actionBusy"><option v-for="lead in preview?.leads" :key="lead.id" :value="lead.id">{{ lead.title || lead.contactName || 'Сделка' }}</option></select><small>Заметка сохранится в сделке и в истории клиента.</small></label><label>{{ composer==='task'?'Название задачи':'Текст заметки' }}<textarea v-if="composer==='note'" v-model="composerText" class="crm-input" required :disabled="actionBusy" maxlength="10000" rows="5" placeholder="Что важно знать о клиенте?" /><input v-else v-model="composerText" class="crm-input" required :disabled="actionBusy" maxlength="200" placeholder="Что нужно сделать?" /></label><label v-if="composer==='task'">Срок<input v-model="composerDate" class="crm-input" type="datetime-local" :disabled="actionBusy" /><small>Задача будет назначена вам. Ответственного можно изменить в её карточке.</small></label><footer><button type="button" class="crm-button" :disabled="actionBusy" @click="closeComposer">Отмена</button><button class="crm-button crm-button--primary" :disabled="actionBusy || !composerText.trim()">{{ actionBusy?'Сохраняем…':composer==='task'?'Создать задачу':'Добавить заметку' }}</button></footer></form></section></div></Teleport>

    <div v-if="notice" class="toast" role="status">{{ notice }}</div>
  </main>
</template>
