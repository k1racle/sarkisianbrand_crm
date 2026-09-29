<script setup lang="ts">
import { CalendarCheck2, ChevronLeft, ChevronRight, Plus, RefreshCw, X } from '@lucide/vue';
useHead({title:'Календарь платежей — SARKISIAN CRM'});
type Plan={id:string;title:string;vendor:string;category:string;notes:string;amountCents:number;startDate:string;endDate:string|null;frequency:string;interval:number;visibility:string;version:number;scheduleLocked:boolean};
type Payment={planId:string;dueDate:string;title:string;vendor:string;category:string;amountCents:number;paidOn:string|null;status:string;version:number;planVersion:number};
type Calendar={items:Payment[];plans:Plan[];totals:{plannedCents:number;paidCents:number;outstandingCents:number;overdueCents:number};today:string;canWrite:boolean;canSettle:boolean;visibilities:string[]};
const session=useWorkspaceSession(),config=useRuntimeConfig();
const request=<T,>(path='',options:any={})=>$fetch<T>('/crm/payment-calendar'+path,{baseURL:config.public.apiBase,headers:{Authorization:`Bearer ${session.token.value}`},timeout:15000,retry:0,...options});
const data=ref<Calendar|null>(null),month=ref(''),search=ref(''),status=ref('ALL'),mode=ref('calendar'),day=ref('');
const loading=ref(false),opening=ref(false),saving=ref(false),error=ref(''),formError=ref(''),notice=ref('');
const opened=ref(false),selected=ref<Plan|null>(null),occurrence=ref<Payment|null>(null),baseline=ref(''),requestKey=ref(''),paymentKey=ref('');
const paidOn=ref(''),reason=ref('');
const draft=reactive({title:'',vendor:'',category:'SUBSCRIPTIONS',notes:'',amount:'',startDate:'',endDate:'',frequency:'MONTH',interval:1,visibility:'PERSONAL'});
const categories:Record<string,string>={COMMUNICATION:'Связь',INTERNET:'Интернет',SERVERS:'Серверы',SUBSCRIPTIONS:'Подписки',RENT:'Аренда',OTHER:'Прочее'};
const scopes:Record<string,string>={PERSONAL:'Личный план',DEPARTMENT:'Мой отдел',COMPANY:'Компания'};
const dirty=computed(()=>opened.value&&baseline.value!==JSON.stringify(draft));
const money=(cents:number)=>new Intl.NumberFormat('ru-RU',{style:'currency',currency:'RUB',maximumFractionDigits:2}).format(cents/100);
const dateLabel=(value:string)=>new Date(value+'T12:00:00Z').toLocaleDateString('ru-RU',{day:'numeric',month:'long',timeZone:'UTC'});
const statusLabel=(value:string)=>({PAID:'Оплачено',OVERDUE:'Просрочено',PLANNED:'К оплате'}[value]||value);
const period=(plan:Plan)=>plan.frequency==='ONCE'?'Разово':`Каждые ${plan.interval} ${({WEEK:'нед.',MONTH:'мес.',YEAR:'г.'} as Record<string,string>)[plan.frequency]}`;
const message=(e:any,fallback:string)=>Array.isArray(e?.data?.message)?e.data.message.join('. '):e?.data?.message||fallback;
const filtered=computed(()=>(data.value?.items||[]).filter(item=>(status.value==='ALL'||(status.value==='UNPAID'?!item.paidOn:item.status===status.value))&&`${item.title} ${item.vendor} ${categories[item.category]}`.toLocaleLowerCase('ru').includes(search.value.trim().toLocaleLowerCase('ru'))));
const visible=computed(()=>filtered.value.filter(item=>!day.value||item.dueDate===day.value));
const plans=computed(()=>(data.value?.plans||[]).filter(plan=>`${plan.title} ${plan.vendor}`.toLocaleLowerCase('ru').includes(search.value.trim().toLocaleLowerCase('ru'))));
const cells=computed(()=>{
  if(!/^\d{4}-\d{2}$/.test(month.value))return [];
  const [year,m]=month.value.split('-').map(Number),offset=(new Date(Date.UTC(year,m-1,1)).getUTCDay()+6)%7,days=new Date(Date.UTC(year,m,0)).getUTCDate();
  return Array.from({length:Math.ceil((offset+days)/7)*7},(_,i)=>{const number=i-offset+1,key=number>0&&number<=days?`${month.value}-${String(number).padStart(2,'0')}`:'';return {key,number,items:key?filtered.value.filter(item=>item.dueDate===key):[]};});
});
let loadVersion=0,detailVersion=0;
async function load(){const version=++loadVersion;loading.value=true;error.value='';day.value='';try{const result=await request<Calendar>('',{query:{month:month.value}});if(version===loadVersion)data.value=result;}catch(e){if(version===loadVersion){data.value=null;error.value=message(e,'Не удалось загрузить календарь. Повторите попытку.');}}finally{if(version===loadVersion)loading.value=false;}}
function moveMonth(delta:number){const [year,m]=month.value.split('-').map(Number),next=new Date(Date.UTC(year,m-1+delta,1));month.value=next.toISOString().slice(0,7);load();}
function fill(plan:Plan|null,item:Payment|null){
  selected.value=plan;occurrence.value=item;formError.value='';reason.value='';paidOn.value=data.value?.today||'';paymentKey.value=crypto.randomUUID();
  Object.assign(draft,plan?{...plan,amount:(plan.amountCents/100).toFixed(2),endDate:plan.endDate||''}:{title:'',vendor:'',category:'SUBSCRIPTIONS',notes:'',amount:'',startDate:data.value?.today||month.value+'-01',endDate:'',frequency:'MONTH',interval:1,visibility:data.value?.visibilities.includes('COMPANY')?'COMPANY':'PERSONAL'});
  baseline.value=JSON.stringify(draft);
}
function create(){fill(null,null);requestKey.value=crypto.randomUUID();opened.value=true;}
async function open(id:string,item:Payment|null=null){const version=++detailVersion;opening.value=true;error.value='';try{const plan=await request<Plan>('/'+id);if(version===detailVersion){fill(plan,item);opened.value=true;}}catch(e){error.value=message(e,'Не удалось открыть план');}finally{if(version===detailVersion)opening.value=false;}}
function leave(){return !saving.value&&(!(opened.value&&(dirty.value||reason.value.trim()))||window.confirm('Изменения не сохранены. Закрыть карточку?'));}
function close(){if(leave())opened.value=false;}
const {panel,keyboard}=useCatalogDialog(computed(()=>opened.value),close);
async function save(){
  if(saving.value||!data.value?.canWrite)return;
  formError.value='';const amount=draft.amount.replace(',','.');
  if(!/^\d{1,8}(\.\d{1,2})?$/.test(amount)||Number(amount)<=0||Number(amount)>10000000){formError.value='Введите сумму от 0,01 до 10 000 000 ₽, не больше двух знаков после запятой';return;}
  saving.value=true;
  try{
    const body={title:draft.title.trim(),vendor:draft.vendor.trim(),category:draft.category,notes:draft.notes.trim(),amountCents:Math.round(Number(amount)*100),startDate:draft.startDate,endDate:draft.frequency==='ONCE'?null:draft.endDate||null,frequency:draft.frequency,interval:draft.frequency==='ONCE'?1:Number(draft.interval),visibility:draft.visibility,...(selected.value?{version:selected.value.version}:{requestKey:requestKey.value})};
    await request(selected.value?'/'+selected.value.id:'',{method:selected.value?'PATCH':'POST',body});opened.value=false;notice.value='План платежа сохранён';await load();
  }catch(e){formError.value=message(e,'Не удалось сохранить. Черновик остаётся в карточке.');}finally{saving.value=false;}
}
async function settle(){
  const item=occurrence.value;if(!item||!data.value?.canSettle||saving.value||dirty.value)return;
  if(item.paidOn&&!reason.value.trim()){formError.value='Укажите причину исправления отметки';return;}
  if(!window.confirm(item.paidOn?'Снять отметку оплаты? Причина сохранится в журнале.':`Отметить ${money(item.amountCents)} как оплаченные? Это ручная отметка, не перевод денег.`))return;
  saving.value=true;formError.value='';
  try{await request('/'+item.planId+'/settle',{method:'POST',body:{planVersion:item.planVersion,version:item.version,dueDate:item.dueDate,paid:!item.paidOn,paidOn:item.paidOn?null:paidOn.value,reason:reason.value.trim(),requestKey:paymentKey.value}});opened.value=false;notice.value=item.paidOn?'Отметка оплаты исправлена':'Оплата отмечена';await load();}
  catch(e){formError.value=message(e,'Не удалось изменить отметку. Обновите карточку.');}finally{saving.value=false;}
}
async function reloadCard(){if(!selected.value||!leave())return;const id=selected.value.id,date=occurrence.value?.dueDate;await load();if(!data.value)return;await open(id,data.value.items.find(item=>item.planId===id&&item.dueDate===date)||null);}
function unload(event:BeforeUnloadEvent){if(saving.value||opened.value&&(dirty.value||reason.value.trim())){event.preventDefault();event.returnValue='';}}
onMounted(()=>{month.value=new Date().toLocaleDateString('en-CA',{timeZone:'Europe/Moscow',year:'numeric',month:'2-digit'});if(!/^\d{4}-\d{2}$/.test(month.value))month.value=new Date().toISOString().slice(0,7);load();window.addEventListener('beforeunload',unload);});
onBeforeUnmount(()=>{++loadVersion;++detailVersion;window.removeEventListener('beforeunload',unload);});onBeforeRouteLeave(leave);
</script>

<template>
  <main class="crm-standard">
    <header class="crm-page-header"><div><h1>Календарь платежей</h1><p>Когда и сколько платить за связь, серверы, подписки и другие расходы.</p></div><div class="crm-action-bar"><button class="crm-button crm-button--refresh" :disabled="loading" @click="load"><RefreshCw :size="18" />Обновить</button><button v-if="data?.canWrite" class="crm-button crm-button--primary" :disabled="loading || opening" @click="create"><Plus :size="18" />Новый платёж</button></div></header>
    <div class="crm-page-content crm-page-content--stack">
      <form class="crm-toolbar crm-filter-form" aria-label="Фильтры платежей" @submit.prevent="day = ''">
        <label>Месяц<input v-model="month" class="crm-input" type="month" min="2000-01" max="2100-12" required @change="load" /></label>
        <label>Статус<select v-model="status" class="crm-input" :disabled="mode === 'plans'" @change="day = ''"><option value="ALL">Все платежи</option><option value="UNPAID">К оплате</option><option value="OVERDUE">Просроченные</option><option value="PAID">Оплаченные</option></select></label>
        <label>Название или поставщик<input v-model="search" class="crm-input" maxlength="160" placeholder="Например, интернет" @input="day = ''" /></label><button class="crm-button" type="submit">Найти</button>
      </form>
      <p v-if="error" role="alert">{{ error }}</p><p v-if="notice" role="status">{{ notice }}</p><p v-if="loading" role="status">Загружаем платежи…</p><p v-if="opening" role="status">Открываем карточку…</p>
      <template v-if="data && !loading">
        <section class="crm-surface" aria-label="Итоги месяца"><header class="crm-panel-header"><div><p>ВЫБРАННЫЙ МЕСЯЦ · RUB</p><h2>План расходов</h2></div></header><div class="crm-register crm-summary-grid"><div><small>Всего запланировано</small><strong>{{ money(data.totals.plannedCents) }}</strong></div><div><small>Оплачено</small><strong>{{ money(data.totals.paidCents) }}</strong></div><div><small>Осталось оплатить</small><strong>{{ money(data.totals.outstandingCents) }}</strong></div><div><small>Из них просрочено</small><strong>{{ money(data.totals.overdueCents) }}</strong></div></div></section>
        <section class="crm-surface" aria-label="Календарь расходов"><header class="crm-panel-header"><div class="crm-action-bar"><button class="crm-button crm-button--icon" aria-label="Предыдущий месяц" :disabled="month <= '2000-01'" @click="moveMonth(-1)"><ChevronLeft :size="18" /></button><h2>{{ new Date(month + '-01T12:00:00Z').toLocaleDateString('ru-RU', { month:'long', year:'numeric', timeZone:'UTC' }) }}</h2><button class="crm-button crm-button--icon" aria-label="Следующий месяц" :disabled="month >= '2100-12'" @click="moveMonth(1)"><ChevronRight :size="18" /></button></div><div class="crm-action-bar crm-view-switch" role="group" aria-label="Вид календаря"><button v-for="[key,label] in [['calendar','Месяц'],['list','Список'],['plans','Планы']]" :key="key" class="crm-button" :aria-pressed="mode === key" @click="mode = key; day = ''">{{ label }}</button></div></header>
          <div class="crm-register crm-stack">
            <div v-if="mode === 'calendar'" class="crm-month-grid" aria-label="Даты платежей"><span v-for="weekday in ['Пн','Вт','Ср','Чт','Пт','Сб','Вс']" :key="weekday" class="crm-month-weekday">{{ weekday }}</span><template v-for="(cell,index) in cells" :key="index"><button v-if="cell.key" class="crm-button crm-month-day" :aria-pressed="day === cell.key" :aria-current="cell.key === data.today ? 'date' : undefined" :aria-label="`${dateLabel(cell.key)}: платежей ${cell.items.length}`" @click="day = day === cell.key ? '' : cell.key"><strong>{{ cell.number }}</strong><small v-if="cell.items.length">{{ cell.items.length }} шт.</small><small v-if="cell.items.length" class="crm-month-detail">{{ money(cell.items.reduce((sum, item) => sum + item.amountCents, 0)) }}</small></button><span v-else aria-hidden="true" /></template></div>
            <template v-if="mode !== 'plans'"><div class="crm-action-bar crm-action-bar--spread"><h3>{{ day ? dateLabel(day) : 'Платежи месяца' }} · {{ visible.length }}</h3><button v-if="day" class="crm-button crm-button--text" @click="day = ''">Все даты</button></div>
              <article v-for="item in visible" :key="item.planId + item.dueDate" class="crm-item-card crm-record"><span><strong>{{ item.title }}</strong><small>{{ categories[item.category] }}{{ item.vendor ? ' · ' + item.vendor : '' }}</small><small>{{ dateLabel(item.dueDate) }}{{ item.paidOn ? ' · Оплачено ' + dateLabel(item.paidOn) : '' }}</small></span><span><strong>{{ money(item.amountCents) }}</strong><small><span class="crm-badge" :class="{'crm-badge--danger': item.status === 'OVERDUE'}" :data-status="item.status">{{ statusLabel(item.status) }}</span></small></span><button class="crm-button" :disabled="opening" :aria-label="`Открыть платёж ${item.title}, ${item.dueDate}`" @click="open(item.planId, item)">Открыть</button></article>
              <div v-if="!visible.length" class="crm-empty"><CalendarCheck2 :size="28" /><h3>Платежей по этим условиям нет</h3><p>Выберите другой месяц, сбросьте фильтры или добавьте план.</p></div>
            </template>
            <template v-else><p class="crm-inline-note">Все доступные планы, включая завершённые. Месяц и статус не ограничивают этот список.</p><article v-for="plan in plans" :key="plan.id" class="crm-item-card crm-record"><span><strong>{{ plan.title }}</strong><small>{{ period(plan) }} · с {{ dateLabel(plan.startDate) }}{{ plan.endDate ? ' по ' + dateLabel(plan.endDate) : '' }}</small></span><span><strong>{{ money(plan.amountCents) }}</strong><small>{{ scopes[plan.visibility] }}</small></span><button class="crm-button" :disabled="opening" :aria-label="`Открыть план ${plan.title}`" @click="open(plan.id)">Открыть</button></article><p v-if="!plans.length" class="crm-empty">Планов пока нет. Добавьте первый расход.</p></template>
          </div>
        </section>
        <p class="crm-inline-note">Ручной учёт, без автоматического списания денег и рассылок. Даты — по Москве. Итоги — за весь выбранный месяц, до фильтров списка; просрочка в других месяцах в них не входит.</p>
      </template>
    </div>
    <Teleport to="body"><div v-if="opened" class="admin-dialog-backdrop crm-detail-backdrop" @click.self="close"><form ref="panel" class="admin-dialog admin-dialog--drawer crm-detail-card" role="dialog" aria-modal="true" aria-labelledby="payment-title" tabindex="-1" @keydown="keyboard" @submit.prevent="save">
      <header><div><p>План расходов</p><h2 id="payment-title">{{ selected ? selected.title : 'Новый платёж' }}</h2></div><button class="crm-button crm-button--icon" type="button" aria-label="Закрыть карточку" :disabled="saving" @click="close"><X :size="18" /></button></header>
      <div class="admin-dialog-body crm-detail-body crm-stack">
        <div v-if="formError" class="crm-stack" role="alert"><p>{{ formError }}</p><button v-if="selected" class="crm-button" type="button" :disabled="saving" @click="reloadCard">Загрузить актуальную карточку</button></div>
        <section v-if="occurrence" class="crm-surface crm-surface--tint crm-record crm-stack" aria-label="Отметка оплаты"><h3>{{ dateLabel(occurrence.dueDate) }} · {{ money(occurrence.amountCents) }}</h3><p>{{ statusLabel(occurrence.status) }}{{ occurrence.paidOn ? ' · ' + dateLabel(occurrence.paidOn) : '' }}</p><template v-if="data?.canSettle"><label v-if="!occurrence.paidOn" class="crm-field">Дата оплаты<input v-model="paidOn" class="crm-input" type="date" :max="data.today" :disabled="saving" /></label><label class="crm-field">{{ occurrence.paidOn ? 'Причина исправления' : 'Комментарий к оплате' }}<input v-model="reason" class="crm-input" maxlength="500" :disabled="saving" /></label><button class="crm-button" type="button" :disabled="saving || dirty" @click="settle">{{ occurrence.paidOn ? 'Снять отметку оплаты' : 'Отметить оплачено' }}</button><p v-if="dirty">Сначала сохраните изменения плана.</p></template></section>
        <p v-if="!data?.canWrite">План доступен только для просмотра.</p>
        <fieldset class="ui-fieldset-reset crm-stack" :disabled="saving || !data?.canWrite">
          <label class="crm-field">Название платежа<input v-model="draft.title" class="crm-input" required maxlength="160" placeholder="Например, сервер сайта" /></label>
          <div class="two"><label class="crm-field">Категория<select v-model="draft.category" class="crm-input"><option v-for="(label,key) in categories" :key="key" :value="key">{{ label }}</option></select></label><label class="crm-field">Сумма, ₽<input v-model="draft.amount" class="crm-input" inputmode="decimal" required placeholder="0,00" /></label></div>
          <label class="crm-field">Поставщик<input v-model="draft.vendor" class="crm-input" maxlength="160" placeholder="Компания или сервис" /></label>
          <div class="two"><label class="crm-field">Первый платёж<input v-model="draft.startDate" class="crm-input" type="date" required :disabled="selected?.scheduleLocked" /></label><label class="crm-field">Повторение<select v-model="draft.frequency" class="crm-input" :disabled="selected?.scheduleLocked"><option value="ONCE">Разовый платёж</option><option value="WEEK">По неделям</option><option value="MONTH">По месяцам</option><option value="YEAR">По годам</option></select></label></div>
          <div v-if="draft.frequency !== 'ONCE'" class="two"><label class="crm-field">Интервал повторения<input v-model="draft.interval" class="crm-input" type="number" min="1" max="36" required :disabled="selected?.scheduleLocked" /></label><label class="crm-field">Последняя дата (необязательно)<input v-model="draft.endDate" class="crm-input" type="date" :min="draft.startDate" /></label></div>
          <p class="crm-inline-note">Интервал 1 — каждую неделю, месяц или год; 3 месяца — раз в квартал. Если нужного числа нет, платёж приходится на последний день месяца. Последняя дата ограничивает повторы включительно.</p>
          <p v-if="selected?.scheduleLocked">У плана уже есть история оплат: начало и периодичность закреплены. Чтобы изменить их, завершите этот план датой окончания и создайте новый.</p>
          <label class="crm-field">Кто видит план<select v-model="draft.visibility" class="crm-input"><option v-for="value in [...new Set([...(data?.visibilities || []), draft.visibility])]" :key="value" :value="value">{{ scopes[value] }}</option></select></label>
          <p class="crm-inline-note">Личный план виден вам, администраторам и высшему руководству; план отдела — также сотрудникам этого отдела с финансовым доступом.</p>
          <label class="crm-field">Примечание<textarea v-model="draft.notes" class="crm-input" rows="3" maxlength="3000" placeholder="Тариф, лицевой счёт или условия оплаты. Не указывайте пароли и данные карты." /></label>
        </fieldset>
        <p v-if="selected" class="crm-inline-note">Сумма и описание изменятся для всех неоплаченных дат этого плана. Оплаченные даты сохраняют прежние сумму, название и поставщика.</p>
      </div>
      <footer class="crm-detail-footer"><button class="crm-button" type="button" :disabled="saving" @click="close">Закрыть</button><button v-if="data?.canWrite" class="crm-button crm-button--primary" type="submit" :disabled="saving">{{ saving ? 'Сохраняем…' : 'Сохранить план' }}</button></footer>
    </form></div></Teleport>
  </main>
</template>
