<script setup lang="ts">
import { Plus, Pencil, Trash2, RefreshCw, ShieldCheck, Layers, X, Search, Play, AlertTriangle } from '@lucide/vue';
const config = useRuntimeConfig(), session = useWorkspaceSession();
const data = ref<any>(null), loading = ref(false), saving = ref(false), error = ref(''), notice = ref(''), filter = ref(''), view = ref('rules');
const channels: Record<string,string> = { WEB:'Сайт', B2B:'B2B-кабинет', OZON:'Ozon', WILDBERRIES:'Wildberries', YANDEX_MARKET:'Яндекс Маркет', MEGAMARKET:'Мегамаркет' };
const kinds: Record<string,string> = { VARIANT:'Отдельная позиция (SKU)', PRODUCT:'Товар со всеми вариантами', CATEGORY:'Категория', GROUP:'Товарная группа' };
const dialog = ref(''), draft = ref<any>({}), original = ref(''), formError = ref(''), query = ref(''), options = ref<any[]>([]), finding = ref(false), targetLabel = ref(''), members = ref<any[]>([]);
const request = (path:string, method:any='GET', body?:any, params?:any) => $fetch<any>('/inventory-settings'+path,{baseURL:config.public.apiBase,headers:{Authorization:`Bearer ${session.token.value}`},method,body,query:params,retry:0});
const message = (e:any) => Array.isArray(e?.data?.message) ? e.data.message.join('. ') : e?.data?.message || 'Не удалось выполнить действие. Повторите попытку.';
const target = (r:any) => r.variant ? `${r.variant.product.nameRu} · ${r.variant.sku}` : r.product?.nameRu || r.category?.nameRu || r.group?.name || 'Объект недоступен';
const scope = (r:any) => r.variantId?'VARIANT':r.productId?'PRODUCT':r.categoryId?'CATEGORY':'GROUP';
const rules = computed(() => (data.value?.rules || []).filter((r:any) => `${r.name} ${target(r)}`.toLocaleLowerCase().includes(filter.value.toLocaleLowerCase())));
const groups = computed(() => (data.value?.groups || []).filter((g:any) => g.name.toLocaleLowerCase().includes(filter.value.toLocaleLowerCase())));
const snapshot = () => JSON.stringify({draft:draft.value,members:members.value});
const dirty = computed(() => !!dialog.value && snapshot() !== original.value);
let loadGeneration=0, findGeneration=0, timer:ReturnType<typeof setTimeout>|undefined;
async function load(){const n=++loadGeneration;loading.value=true;error.value='';try{const result=await request('');if(n===loadGeneration)data.value=result;}catch(e){if(n===loadGeneration)error.value=message(e);}finally{if(n===loadGeneration)loading.value=false;}}
async function find(){const n=++findGeneration;finding.value=true;try{const result=await request('/targets','GET',undefined,{kind:dialog.value==='group'?'PRODUCT':draft.value.targetKind,search:query.value.trim()||undefined});if(n===findGeneration)options.value=result;}catch(e){if(n===findGeneration)formError.value=message(e);}finally{if(n===findGeneration)finding.value=false;}}
function open(kind:string,row?:any){
 formError.value='';notice.value='';query.value='';options.value=[];targetLabel.value='';members.value=[];
 if(kind==='rule'){
  draft.value=row?{id:row.id,expectedVersion:row.version,name:row.name,targetKind:scope(row),targetId:row.variantId||row.productId||row.categoryId||row.groupId,includeChildren:row.includeChildren,threshold:row.threshold,basis:row.basis,channels:[...row.channels],autoResume:row.autoResume,isEnabled:row.isEnabled}:{name:'',targetKind:'VARIANT',targetId:'',includeChildren:true,threshold:5,basis:'AVAILABLE',channels:['WEB','B2B','OZON','WILDBERRIES','YANDEX_MARKET','MEGAMARKET'],autoResume:true,isEnabled:true};
  targetLabel.value=row?target(row):'';
 }else{
  draft.value=row?{id:row.id,expectedVersion:row.version,name:row.name,isActive:row.isActive}:{name:'',isActive:true};
  members.value=row?row.members.map((m:any)=>({id:m.productId,label:`${m.product.nameRu} · ${m.product.sku}`})):[];
 }
 original.value=snapshot();dialog.value=kind;find();
}
function close(){if(saving.value)return;if(dirty.value&&!window.confirm('Закрыть без сохранения изменений?'))return;dialog.value='';++findGeneration;clearTimeout(timer);}
const {panel,keyboard}=useCatalogDialog(computed(()=>!!dialog.value),close);
function kindChanged(){draft.value.targetId='';targetLabel.value='';query.value='';options.value=[];find();}
function choose(item:any){if(dialog.value==='group'){if(!members.value.some(m=>m.id===item.id))members.value.push(item);}else{draft.value.targetId=item.id;targetLabel.value=item.label;}}
async function save(){
 if(saving.value)return;
 if(!draft.value.name.trim()||(dialog.value==='rule'&&(!draft.value.targetId||!draft.value.channels.length))||(dialog.value==='group'&&!members.value.length)){formError.value='Укажите название, выберите товары и каналы для сценария.';return;}
 saving.value=true;formError.value='';
 try{const {id,...body}=draft.value;await request(`/${dialog.value==='rule'?'rules':'groups'}${id?'/'+id:''}`,id?'PATCH':'POST',dialog.value==='group'?{...body,productIds:members.value.map(m=>m.id)}:body);dialog.value='';notice.value='Настройки сохранены. Доступность товаров пересчитана.';await load();}catch(e){formError.value=message(e);}finally{saving.value=false;}
}
async function action(row:any,remove=false){if(saving.value)return;if(remove&&!window.confirm(`Удалить сценарий «${row.name}»? Его ограничения перестанут действовать.`))return;saving.value=true;error.value='';notice.value='';try{const result=await request(`/rules/${row.id}${remove?'':'/release'}`,remove?'DELETE':'POST',{expectedVersion:row.version});notice.value=remove?'Сценарий удалён.':`Разрешено возобновление для ${result.released} позиций. Другие сценарии продолжают действовать.`;await load();}catch(e){error.value=message(e);}finally{saving.value=false;}}
watch(query,()=>{++findGeneration;clearTimeout(timer);timer=setTimeout(find,250);});
watch(view,()=>{filter.value='';});
function leave(event:BeforeUnloadEvent){if(dirty.value){event.preventDefault();event.returnValue='';}}
onBeforeRouteLeave(()=>!dirty.value||window.confirm('Выйти без сохранения сценария?'));
onMounted(()=>{load();window.addEventListener('beforeunload',leave);});
onBeforeUnmount(()=>{++loadGeneration;++findGeneration;clearTimeout(timer);window.removeEventListener('beforeunload',leave);});
</script>
<template>
 <section class="crm-stock-rules" aria-label="Сценарии минимального запаса">
  <div class="crm-stock-rules-intro"><ShieldCheck :size="24"/><div><h2>Сохраняйте запас для нужных каналов</h2><p>Когда остаток позиции достигает порога, выбранные каналы получают доступное количество 0. Можно сочетать несколько сценариев: при 20 шт. закрыть маркетплейсы, при 5 — все продажи.</p></div></div>
  <div class="crm-stock-rules-toolbar"><div class="crm-stock-rules-switch"><button type="button" class="crm-button" :aria-pressed="view==='rules'" @click="view='rules'">Сценарии <span>{{ data?.rules.length || 0 }}</span></button><button type="button" class="crm-button" :aria-pressed="view==='groups'" @click="view='groups'"><Layers :size="16"/>Товарные группы</button></div><div class="crm-stock-rules-actions"><button class="crm-button crm-button--icon" type="button" aria-label="Обновить сценарии" :disabled="loading||saving" @click="load"><RefreshCw :size="18"/></button><button v-if="data?.canManage" class="crm-button crm-button--primary" type="button" @click="open(view==='rules'?'rule':'group')"><Plus :size="18"/>{{ view==='rules'?'Новый сценарий':'Новая группа' }}</button></div></div>
  <p v-if="error" role="alert" class="crm-stock-rules-error">{{ error }}</p><p v-if="notice" role="status">{{ notice }}</p>
  <label class="crm-input-group"><Search :size="18"/><input v-model="filter" class="crm-input" :aria-label="view==='rules'?'Поиск сценария':'Поиск группы'" :placeholder="view==='rules'?'Название сценария или товара':'Название группы'"/></label>
  <p v-if="loading" role="status">Загружаем настройки…</p>
  <div v-else-if="view==='rules'" class="crm-stock-rules-list">
   <article v-for="rule in rules" :key="rule.id" class="crm-surface crm-stock-rule" :data-disabled="!rule.isEnabled">
    <div class="crm-stock-rule-main"><div class="crm-stock-rule-title"><ShieldCheck :size="19"/><h3>{{ rule.name }}</h3><span class="crm-stock-rule-badge" :data-active="rule._count.states>0">{{ !rule.isEnabled?'Выключен':rule._count.states?`Сработал: ${rule._count.states} поз.`:'Наблюдает' }}</span></div><p>{{ kinds[scope(rule)] }}: <strong>{{ target(rule) }}</strong></p><small v-if="rule.categoryId && rule.includeChildren">Включая вложенные категории</small></div>
    <div class="crm-stock-rule-condition"><small>{{ rule.basis==='AVAILABLE'?'Свободный остаток':'Физический остаток' }}</small><strong>≤ {{ rule.threshold }} шт.</strong><small>{{ rule.autoResume?'Возобновление автоматически':'Возобновление вручную' }}</small></div>
    <div class="crm-stock-rule-channels"><small>Закрыть продажи</small><div><span v-for="channel in rule.channels" :key="channel">{{ channels[channel] }}</span></div></div>
    <div v-if="data.canManage" class="crm-stock-rules-actions"><button v-if="!rule.autoResume && rule._count.states" class="crm-button crm-button--icon" type="button" :disabled="saving" :aria-label="`Возобновить продажи: ${rule.name}`" title="Возобновить позиции выше порога" @click="action(rule)"><Play :size="17"/></button><button class="crm-button crm-button--icon" type="button" :aria-label="`Изменить сценарий: ${rule.name}`" @click="open('rule',rule)"><Pencil :size="17"/></button><button class="crm-button crm-button--icon" type="button" :disabled="saving" :aria-label="`Удалить сценарий: ${rule.name}`" @click="action(rule,true)"><Trash2 :size="17"/></button></div>
   </article>
   <div v-if="!rules.length&&!error" class="crm-surface crm-empty"><ShieldCheck :size="32"/><h3>{{ filter?'Сценарии не найдены':'Первый сценарий защиты запаса' }}</h3><p>Выберите товар, категорию или собственную группу. Укажите порог и каналы, в которых нужно остановить продажи.</p><button v-if="data?.canManage&&!filter" type="button" class="crm-button crm-button--primary" @click="open('rule')"><Plus :size="18"/>Добавить сценарий</button></div>
  </div>
  <div v-else class="crm-stock-rules-list">
   <article v-for="group in groups" :key="group.id" class="crm-surface crm-stock-group"><Layers :size="22"/><div><h3>{{ group.name }} <small v-if="!group.isActive">· Выключена</small></h3><p>Товаров: {{ group.members.length }} · Сценариев: {{ group._count.rules }}</p><small>{{ group.members.slice(0,3).map((m:any)=>m.product.nameRu).join(', ') }}{{ group.members.length>3?'…':'' }}</small></div><button v-if="data.canManage" class="crm-button" type="button" :aria-label="`Изменить группу: ${group.name}`" @click="open('group',group)"><Pencil :size="17"/>Изменить</button></article>
   <div v-if="!groups.length&&!error" class="crm-surface crm-empty"><Layers :size="32"/><h3>{{ filter?'Группы не найдены':'Объедините товары для одного сценария' }}</h3><p>Например, «Бестселлеры» или «Запас для салонов». Товар может состоять в нескольких группах.</p><button v-if="data?.canManage&&!filter" type="button" class="crm-button" @click="open('group')"><Plus :size="18"/>Создать группу</button></div>
  </div>
  <div class="crm-stock-rules-delivery"><AlertTriangle :size="19"/><p>Сайт и B2B применяют правила сразу. Для маркетплейсов рассчитывается остаток к передаче; отправка на площадки ещё не подключена. Значение 0 в CRM не подтверждает остановку продажи на внешней площадке.</p></div>
  <Teleport to="body"><div v-if="dialog" class="admin-dialog-backdrop crm-detail-backdrop" @click.self="close"><section ref="panel" class="admin-dialog admin-dialog--drawer crm-detail-card crm-stock-rule-dialog" role="dialog" aria-modal="true" aria-labelledby="stock-rule-title" tabindex="-1" @keydown="keyboard">
   <header><div><p>МИНИМАЛЬНЫЙ ЗАПАС</p><h2 id="stock-rule-title">{{ dialog==='rule'?(draft.id?'Настройка сценария':'Новый сценарий'):(draft.id?'Настройка группы':'Новая товарная группа') }}</h2></div><button class="crm-button crm-button--icon" type="button" aria-label="Закрыть настройки" :disabled="saving" @click="close"><X :size="18"/></button></header>
   <form id="stock-rule-form" class="admin-dialog-body crm-detail-body crm-stock-rule-form" @submit.prevent="save">
    <p v-if="formError" role="alert" class="crm-stock-rules-error">{{ formError }}</p>
    <label>Название<input v-model="draft.name" class="crm-input" maxlength="120" required placeholder="Например, запас для розницы" :disabled="saving"/></label>
    <template v-if="dialog==='rule'">
     <h3>1. К каким товарам применять</h3><label>Область действия<select v-model="draft.targetKind" aria-label="Область действия" class="crm-input" :disabled="saving" @change="kindChanged"><option v-for="(label,key) in kinds" :key="key" :value="key">{{ label }}</option></select></label>
     <div v-if="targetLabel" class="crm-stock-rule-selected"><ShieldCheck :size="18"/><strong>{{ targetLabel }}</strong></div>
    </template>
    <h3 v-else>Товары в группе</h3>
    <label class="crm-input-group"><Search :size="17"/><input v-model="query" class="crm-input" aria-label="Поиск объекта сценария" placeholder="Найти по названию или артикулу" maxlength="120" :disabled="saving"/></label>
    <div class="crm-stock-rule-targets" :aria-busy="finding"><p v-if="finding">Поиск…</p><template v-else><button v-for="item in options" :key="item.id" type="button" :disabled="saving" :aria-pressed="dialog==='group'?members.some(m=>m.id===item.id):draft.targetId===item.id" @click="choose(item)"><span>{{ item.label }}</span><Plus v-if="dialog==='group'&&!members.some(m=>m.id===item.id)" :size="16"/><ShieldCheck v-else-if="draft.targetId===item.id||members.some(m=>m.id===item.id)" :size="16"/></button><p v-if="!options.length">Ничего не найдено{{ draft.targetKind==='GROUP' ? '. Сначала создайте товарную группу.' : '.' }}</p></template></div>
    <small>Показаны первые 50 результатов. Уточните поиск, чтобы найти нужный товар.</small>
    <template v-if="dialog==='group'"><div class="crm-stock-rule-members"><span v-for="member in members" :key="member.id">{{ member.label }}<button type="button" :disabled="saving" :aria-label="`Убрать ${member.label}`" @click="members=members.filter(m=>m.id!==member.id)"><X :size="15"/></button></span></div><label class="crm-stock-rule-check"><input v-model="draft.isActive" type="checkbox" :disabled="saving"/>Группа активна</label><p>Правила охватывают все варианты выбранных товаров. Выключение группы снимает ограничения её сценариев.</p></template>
    <template v-else>
     <label v-if="draft.targetKind==='CATEGORY'" class="crm-stock-rule-check"><input v-model="draft.includeChildren" type="checkbox" :disabled="saving"/>Включать вложенные категории</label>
     <h3>2. Когда остановить продажи</h3><div class="crm-stock-rule-fields"><label>Порог, шт.<input v-model.number="draft.threshold" class="crm-input" type="number" min="0" max="2147483647" step="1" required :disabled="saving"/></label><label>Как считать остаток<select v-model="draft.basis" aria-label="Как считать остаток" class="crm-input" :disabled="saving"><option value="AVAILABLE">Свободно (остаток − резерв)</option><option value="PHYSICAL">На складе (включая резерв)</option></select></label></div>
     <p>Срабатывает при {{ draft.threshold }} шт. или меньше у каждой позиции отдельно. Заказ, принятый выше порога, может опустить остаток ниже него; уже принятые заказы продолжают исполняться.</p>
     <h3>3. Где закрыть продажи</h3><div class="crm-stock-rules-actions"><button class="crm-button" type="button" :disabled="saving" @click="draft.channels=Object.keys(channels)">Все каналы</button><button class="crm-button" type="button" :disabled="saving" @click="draft.channels=Object.keys(channels).filter(k=>!['WEB','B2B'].includes(k))">Только маркетплейсы</button></div><div class="crm-stock-rule-channel-grid"><label v-for="(label,key) in channels" :key="key" class="crm-stock-rule-check"><input v-model="draft.channels" type="checkbox" :value="key" :disabled="saving"/>{{ label }}</label></div>
     <h3>4. Возобновление продаж</h3><label>После пополнения<select v-model="draft.autoResume" aria-label="После пополнения" class="crm-input" :disabled="saving"><option :value="true">Автоматически, когда остаток выше порога</option><option :value="false">Вручную, когда остаток выше порога</option></select></label><label class="crm-stock-rule-check"><input v-model="draft.isEnabled" type="checkbox" :disabled="saving"/>Сценарий включён</label><p>Если сработали несколько сценариев, действуют все ограничения. Выключение или удаление сценария снимает его запрет. Фактический остаток на складе не меняется.</p>
    </template>
   </form><footer class="crm-detail-footer"><small>{{ dirty?'Есть несохранённые изменения':'Настройте условия и сохраните' }}</small><button class="crm-button crm-button--primary" type="submit" form="stock-rule-form" :disabled="saving">{{ saving?'Сохраняем…':'Сохранить' }}</button></footer>
  </section></div></Teleport>
 </section>
</template>
