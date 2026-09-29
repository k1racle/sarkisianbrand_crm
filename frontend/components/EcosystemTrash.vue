<script setup lang="ts">
import { AlertTriangle, Box, Building2, Check, Clock3, ContactRound, RefreshCw, RotateCcw, Search, ShieldAlert, Trash2, Users, X } from '@lucide/vue';
const config = useRuntimeConfig();
const { token } = useWorkspaceSession();
const entries = ref<any[]>([]), selected = ref<any>(null), preview = ref<any>(null);
const type = ref(''), search = ref(''), page = ref(1), pages = ref(1), total = ref(0);
const loading = ref(false), detailLoading = ref(false), actionBusy = ref(false);
const busy = computed(() => loading.value || detailLoading.value || actionBusy.value);
const error = ref(''), notice = ref(''), confirmation = ref(''), adminPassword = ref('');
let timer: ReturnType<typeof setTimeout>|undefined, listVersion = 0, detailVersion = 0;
let listController: AbortController|undefined, detailController: AbortController|undefined;
const headers = computed(()=>({Authorization:`Bearer ${token.value}`}));
const types = [{id:'',label:'Все данные',icon:Trash2},{id:'USER',label:'Учётные записи',icon:ContactRound},{id:'CUSTOMER',label:'Клиенты',icon:Users},{id:'ORGANIZATION',label:'Организации',icon:Building2},{id:'PRODUCT',label:'Товары',icon:Box},{id:'CATEGORY',label:'Категории',icon:Box}];
const typeLabels:Record<string,string>={USER:'Учётная запись',CUSTOMER:'Клиент',ORGANIZATION:'Организация B2B',PRODUCT:'Товар',CATEGORY:'Категория'};
const visibleDependencies = computed(() => (preview.value?.dependencies || []).filter((item: any) => item.count !== 0));
const canRestore = computed(() => !busy.value && selected.value?.canRestore === true && preview.value?.canRestore === true);
const canPurge = computed(() => !busy.value && preview.value?.canPurge === true && confirmation.value === selected.value?.displayName && !!adminPassword.value);
async function load(){
  const version=++listVersion, identity=token.value; listController?.abort(); listController=new AbortController();
  loading.value=true;error.value='';
  try{const result=await $fetch<any>('/data-lifecycle/trash',{baseURL:config.public.apiBase,headers:headers.value,signal:listController.signal,query:{type:type.value||undefined,search:search.value||undefined,page:page.value,limit:50}});
    if(version!==listVersion||token.value!==identity)return;
    entries.value=result.items;total.value=result.total;pages.value=result.pages||1;
  }catch(e:any){if(version===listVersion){entries.value=[];error.value=messageOf(e)}}finally{if(version===listVersion)loading.value=false}
}
async function openEntry(entry:any){
  if(actionBusy.value)return;const version=++detailVersion,identity=token.value;detailController?.abort();detailController=new AbortController();
  selected.value=entry;confirmation.value='';adminPassword.value='';preview.value=null;error.value='';detailLoading.value=true;
  try{const result=await $fetch(`/data-lifecycle/${entry.entityType}/${entry.entityId}/preview`,{baseURL:config.public.apiBase,headers:headers.value,signal:detailController.signal});if(version===detailVersion&&token.value===identity)preview.value=result}
  catch(e:any){if(version===detailVersion)error.value=messageOf(e)}finally{if(version===detailVersion)detailLoading.value=false}
}
function close(){if(actionBusy.value)return; ++detailVersion;detailController?.abort();selected.value=null;preview.value=null;detailLoading.value=false;adminPassword.value='';confirmation.value='';}
async function restore(){if(!canRestore.value)return;const id=selected.value.id;await act(async()=>{await $fetch(`/data-lifecycle/trash/${id}/restore`,{baseURL:config.public.apiBase,method:'POST',headers:headers.value});selected.value=null;await load();showNotice('Данные восстановлены')})}
async function purge(){if(!canPurge.value)return;const id=selected.value.id;await act(async()=>{await $fetch(`/data-lifecycle/trash/${id}`,{baseURL:config.public.apiBase,method:'DELETE',headers:headers.value,body:{confirmation:confirmation.value,currentAdminPassword:adminPassword.value}});selected.value=null;await load();showNotice('Данные окончательно удалены')});adminPassword.value='';}
async function act(callback:()=>Promise<void>){if(actionBusy.value)return;actionBusy.value=true;error.value='';try{await callback()}catch(e:any){preview.value=null;error.value=messageOf(e)}finally{actionBusy.value=false}}
function messageOf(e:any){return e?.data?.message||'Не удалось выполнить действие. Обновите данные.'}
function showNotice(value:string){notice.value=value;setTimeout(()=>notice.value='',2600)}
function daysLeft(value:string){return Math.max(0,Math.ceil((new Date(value).getTime()-Date.now())/86400000))}
function turn(delta:number){page.value+=delta;void load()}
watch(type,()=>{page.value=1;void load()});watch(search,()=>{clearTimeout(timer);timer=setTimeout(()=>{page.value=1;void load()},350)});onMounted(load);
onBeforeRouteLeave(()=>!actionBusy.value);
onUnmounted(()=>{++listVersion;++detailVersion;listController?.abort();detailController?.abort();clearTimeout(timer)});
</script>

<template><section data-v-ui-fb6b400b9590 class="trash-workspace"><aside data-v-ui-fb6b400b9590 class="trash-types"><header data-v-ui-fb6b400b9590><p data-v-ui-fb6b400b9590>ФИЛЬТР</p><h2 data-v-ui-fb6b400b9590>Тип данных</h2></header><button class="crm-button" data-v-ui-fb6b400b9590 v-for="item in types" :key="item.id" :class="{active:type===item.id}" @click="type=item.id"><component data-v-ui-fb6b400b9590 :is="item.icon" :size="16"/><span data-v-ui-fb6b400b9590>{{item.label}}</span></button><div data-v-ui-fb6b400b9590 class="retention"><Clock3 data-v-ui-fb6b400b9590 :size="18"/><span data-v-ui-fb6b400b9590><strong data-v-ui-fb6b400b9590>Не менее 30 дней</strong><small data-v-ui-fb6b400b9590>Автоматического удаления нет. После срока хранения администратор может удалить запись вручную, если нет связанных данных.</small></span></div></aside><main data-v-ui-fb6b400b9590 class="trash-card crm-standard"><header data-v-ui-fb6b400b9590><div data-v-ui-fb6b400b9590><p data-v-ui-fb6b400b9590>БЕЗОПАСНОЕ УДАЛЕНИЕ</p><h2 data-v-ui-fb6b400b9590>Объекты в корзине</h2><span data-v-ui-fb6b400b9590>{{total}} объектов в доступной области</span></div><div data-v-ui-fb6b400b9590 class="actions"><label class="crm-input-group" data-v-ui-fb6b400b9590><Search data-v-ui-fb6b400b9590 :size="16"/><input class="crm-input" data-v-ui-fb6b400b9590 v-model.trim="search" placeholder="Поиск по названию"/></label><button class="crm-button crm-button--refresh" data-v-ui-fb6b400b9590 title="Обновить" @click="load"><RefreshCw data-v-ui-fb6b400b9590 :size="16" :class="{spin:busy}"/></button></div></header><div data-v-ui-fb6b400b9590 class="trash-table"><div data-v-ui-fb6b400b9590 class="trash-row head crm-table-head"><span data-v-ui-fb6b400b9590>Объект</span><span data-v-ui-fb6b400b9590>Тип</span><span data-v-ui-fb6b400b9590>Удалил</span><span data-v-ui-fb6b400b9590>Срок хранения</span><span data-v-ui-fb6b400b9590></span></div><button data-v-ui-fb6b400b9590 v-for="entry in entries" :key="entry.id" class="trash-row crm-button crm-table-row crm-card-action" @click="openEntry(entry)"><span data-v-ui-fb6b400b9590><i data-v-ui-fb6b400b9590><component data-v-ui-fb6b400b9590 :is="types.find(item=>item.id===entry.entityType)?.icon||Trash2" :size="16"/></i><span data-v-ui-fb6b400b9590><strong data-v-ui-fb6b400b9590>{{entry.displayName}}</strong><small data-v-ui-fb6b400b9590>{{entry.reason||'Причина не указана'}}</small></span></span><span data-v-ui-fb6b400b9590>{{typeLabels[entry.entityType]||entry.entityType}}</span><span data-v-ui-fb6b400b9590>{{[entry.actor?.firstName,entry.actor?.lastName].filter(Boolean).join(' ')||entry.actor?.email||'Система'}}</span><span data-v-ui-fb6b400b9590><b data-v-ui-fb6b400b9590>{{daysLeft(entry.purgeAfter)}}</b> дн.</span><RotateCcw data-v-ui-fb6b400b9590 :size="16"/></button><div data-v-ui-fb6b400b9590 v-if="!entries.length&&!busy" class="empty"><Trash2 data-v-ui-fb6b400b9590 :size="30"/><strong data-v-ui-fb6b400b9590>Корзина пуста</strong><span data-v-ui-fb6b400b9590>Удалённые объекты появятся здесь и будут доступны для восстановления.</span></div></div><footer class="crm-action-bar"><span>{{page}} / {{pages}}</span><button class="crm-button" :disabled="busy || page<=1" @click="turn(-1)">Назад</button><button class="crm-button" :disabled="busy || page>=pages" @click="turn(1)">Далее</button></footer></main>
<Teleport to="body">
  <div v-if="selected" class="trash-backdrop admin-dialog-backdrop crm-detail-backdrop" @mousedown.self="close">
    <aside class="trash-drawer admin-dialog admin-dialog--drawer crm-detail-card" role="dialog" aria-modal="true" aria-labelledby="trash-detail-title">
      <header>
        <div>
          <p class="crm-muted">{{typeLabels[selected.entityType]}}</p>
          <h2 id="trash-detail-title">{{selected.displayName}}</h2>
          <span class="crm-muted">В корзине с {{new Date(selected.trashedAt).toLocaleString('ru-RU')}}</span>
        </div>
        <button class="crm-button crm-button--icon" aria-label="Закрыть карточку корзины" :disabled="actionBusy" @click="close"><X :size="19"/></button>
      </header>
      <div class="crm-detail-body crm-stack">
        <p v-if="detailLoading" class="crm-muted">Проверяем состояние и права…</p>
        <p v-if="error" role="alert">{{error}}</p>
        <section v-if="preview?.canRestore && selected.canRestore" class="restore-block crm-detail-section">
          <h3 class="crm-icon-heading"><RotateCcw/><span>Объект можно восстановить</span></h3>
          <p class="crm-muted">Будет возвращено состояние, которое было до перемещения в корзину.</p>
          <div class="crm-action-bar"><button class="crm-button crm-button--primary" :disabled="!canRestore" @click="restore">Восстановить</button></div>
        </section>
        <section class="crm-detail-section">
          <h3 class="crm-icon-heading"><ShieldAlert/><span>Связи и последствия</span></h3>
          <p class="crm-muted">При наличии связанных рабочих записей окончательное удаление запрещено.</p>
          <div v-if="preview" class="crm-record-list">
            <article v-for="dependency in visibleDependencies" :key="dependency.key" class="crm-item-card crm-record">
              <span><strong>{{dependency.label}}</strong><small class="crm-muted">{{dependency.blocking ? 'блокирует удаление' : 'не блокирует'}}</small></span>
              <b>{{dependency.count ?? 'Недоступно'}}</b>
            </article>
            <p v-if="!visibleDependencies.length" class="crm-muted">Связанных записей нет.</p>
          </div>
        </section>
        <section class="danger-zone crm-detail-section">
          <h3 class="crm-icon-heading"><AlertTriangle/><span>Окончательное удаление</span></h3>
          <p class="crm-muted">Действие нельзя отменить. Снимки этой записи в корзине также будут очищены.</p>
          <div v-if="preview&&!preview.canPurge" class="crm-record crm-surface crm-surface--tint" role="note">
            <span><strong>Удаление сейчас запрещено</strong><small class="crm-muted">Нужны права на изменение, истечение 30 дней хранения и отсутствие блокирующих связей.</small></span>
          </div>
          <template v-else-if="preview?.canPurge">
            <label><span>Введите точно: <b>{{selected.displayName}}</b></span><input class="crm-input" v-model="confirmation" :disabled="actionBusy"/></label>
            <label><span>Пароль администратора</span><input class="crm-input" v-model="adminPassword" :disabled="actionBusy" type="password" autocomplete="current-password"/></label>
            <div class="crm-action-bar"><button class="crm-button crm-button--danger" :disabled="!canPurge" @click="purge"><Trash2 :size="16"/>Удалить без возможности восстановления</button></div>
          </template>
        </section>
      </div>
    </aside>
  </div>
</Teleport><p data-v-ui-fb6b400b9590 v-if="error" class="trash-error" role="alert">{{error}}</p><p data-v-ui-fb6b400b9590 v-if="notice" class="trash-notice"><Check data-v-ui-fb6b400b9590 :size="15"/>{{notice}}</p></section></template>
