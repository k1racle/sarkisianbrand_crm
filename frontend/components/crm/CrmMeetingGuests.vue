<script setup lang="ts">
import { Copy, RefreshCw, UserPlus } from '@lucide/vue';
const props=defineProps<{meetingId:string;version:number;disabled:boolean;active:boolean}>();
const emit=defineEmits<{busy:[value:boolean];refresh:[]}>();
type Invitation={id:string;label:string;version:number;expiresAt:string;revokedAt:string|null;guest:{id:string;displayName:string;version:number;state:string;joinedAt:string}|null};
const config=useRuntimeConfig(),session=useWorkspaceSession();
const rows=ref<Invitation[]>([]),loading=ref(false),busy=ref(false),error=ref(''),label=ref(''),canInvite=ref(false),reserved=ref(0),employeeCount=ref(0);
const issued=ref<{link:string;pin:string;expiresAt:string}|null>(null),copied=ref(false),requestKey=ref('');
const request=(suffix:string,options:any={})=>$fetch<any>(`/crm/meetings/${props.meetingId}${suffix}`,{baseURL:config.public.apiBase,headers:{Authorization:`Bearer ${session.token.value}`},timeout:15000,retry:0,...options});
const message=(e:any)=>Array.isArray(e?.data?.message)?e.data.message.join('. '):e?.data?.message||'Не удалось выполнить действие. Обновите список и повторите.';
const state=(row:Invitation)=>row.guest?.state|| (row.revokedAt?'REVOKED':new Date(row.expiresAt)<new Date()?'EXPIRED':'INVITED');
const stateLabel=(value:string)=>({INVITED:'Приглашение выдано',WAITING:'Ожидает допуска',ADMITTED:'Допущен',REJECTED:'Отклонён',REVOKED:'Доступ отозван',LEFT:'Вышел',EXPIRED:'Срок истёк'}[value]||value);
const when=(value:string)=>new Date(value).toLocaleString('ru-RU');
let revision=0,timer:ReturnType<typeof setTimeout>|undefined,disposed=false;
function schedule(){clearTimeout(timer);if(!disposed&&props.active)timer=setTimeout(()=>load(true),5000);}
async function load(quiet=false){
  if(disposed||busy.value){schedule();return;}
  const current=++revision;if(!quiet)loading.value=true;
  try{const data=await request('/invitations');if(disposed||current!==revision)return;rows.value=data.items;reserved.value=data.reserved;employeeCount.value=data.employeeCount;canInvite.value=data.canInvite;if(!quiet)error.value='';}
  catch(e){if(!disposed&&current===revision)error.value=message(e);}
  finally{if(current===revision)loading.value=false;schedule();}
}
async function action(run:()=>Promise<void>){
  if(props.disabled||busy.value)return;
  busy.value=true;emit('busy',true);++revision;clearTimeout(timer);error.value='';
  try{await run();}catch(e){error.value=message(e);}
  finally{busy.value=false;emit('busy',false);loading.value=false;await load(true);}
}
async function create(){
  if(!label.value.trim()||issued.value)return;
  await action(async()=>{if(!requestKey.value)requestKey.value=crypto.randomUUID();const data=await request('/invitations',{method:'POST',body:{label:label.value.trim(),version:props.version,requestKey:requestKey.value}});issued.value={link:`${window.location.origin}/meeting-guest#invite=${data.invitationToken}`,pin:data.pin,expiresAt:data.expiresAt};copied.value=false;label.value='';requestKey.value='';});
}
async function revoke(row:Invitation){
  if(!window.confirm(`Отозвать приглашение «${row.label}»? Гость потеряет доступ.`))return;
  await action(async()=>{await request(`/invitations/${row.id}/revoke`,{method:'POST',body:{version:row.version}});requestKey.value='';});
}
async function decide(row:Invitation,decision:'ADMIT'|'REJECT'){
  if(!row.guest)return;
  if(decision==='REJECT'&&!window.confirm('Отклонить гостя и закрыть его приглашение?'))return;
  await action(async()=>{await request(`/guests/${row.guest!.id}/decision`,{method:'POST',body:{version:row.guest!.version,action:decision}});});
}
async function copy(){if(!issued.value)return;try{await navigator.clipboard.writeText(`Приглашение на встречу SARKISIAN\n${issued.value.link}\nPIN: ${issued.value.pin}\nВход за 30 минут до встречи. Дождитесь допуска организатора.`);copied.value=true;}catch{error.value='Браузер не разрешил копирование. Выделите ссылку и PIN вручную.';}}
watch(()=>props.active,value=>{if(value)load();else{clearTimeout(timer);++revision;loading.value=false;}});
onMounted(()=>{if(props.active)load();});
onBeforeUnmount(()=>{disposed=true;++revision;clearTimeout(timer);});
defineExpose({hasUnsaved:computed(()=>Boolean(issued.value&&!copied.value)||Boolean(label.value.trim()))});
</script>
<template>
  <section class="crm-detail-section" aria-label="Гости встречи">
    <div class="crm-action-bar"><button type="button" class="crm-button crm-button--refresh" :disabled="loading||busy" @click="load()"><RefreshCw :size="18" />Обновить гостей</button></div>
    <p>Приглашения можно выдавать за 29 дней до встречи. Ссылка рассчитана на одного гостя. PIN и ссылка показываются один раз. Вход — за 30 минут до встречи, затем гость ждёт вашего допуска. Имя гость указывает самостоятельно.</p>
    <p class="crm-inline-note">Видеосервер пока не подключён: допуск не запускает звонок.</p>
    <div v-if="error" role="alert" class="crm-stack"><p>{{error}}</p><button class="crm-button" type="button" :disabled="busy||disabled" @click="emit('refresh')">Обновить карточку встречи</button></div>
    <p v-if="disabled">Сначала сохраните изменения встречи. При переносе или отмене старые приглашения отзываются.</p>
    <p v-if="loading" role="status">Загружаем приглашения…</p>
    <section v-if="issued" class="crm-surface crm-register crm-stack" aria-label="Новое приглашение">
      <strong>Сохраните данные для гостя</strong><label class="crm-field">Ссылка<input class="crm-input" readonly :value="issued.link" /></label><label class="crm-field">PIN<input class="crm-input" readonly :value="issued.pin" /></label><small>Действует до {{when(issued.expiresAt)}}. Передайте только адресату.</small>
      <button type="button" class="crm-button" @click="copy"><Copy :size="18" />{{copied?'Скопировано':'Копировать приглашение'}}</button><button type="button" class="crm-button" @click="issued=null">Данные сохранены — скрыть</button>
    </section>
    <fieldset v-else class="ui-fieldset-reset crm-stack" :disabled="disabled||busy||!canInvite"><legend>Пригласить гостя · {{employeeCount+reserved}}/10 мест</legend><label class="crm-field">Для кого приглашение<input v-model="label" class="crm-input" maxlength="80" placeholder="Например, кандидат Анна" @keydown.enter.prevent="create" /></label><button type="button" class="crm-button crm-button--primary" :disabled="!label.trim()||employeeCount+reserved>=10" @click="create"><UserPlus :size="18" />Создать приглашение</button></fieldset>
    <div v-for="row in rows" :key="row.id" class="crm-item-card crm-register crm-stack"><strong>{{row.label}}</strong><span class="crm-badge" :data-status="['REVOKED','REJECTED'].includes(state(row))?'REJECTED':undefined">{{stateLabel(state(row))}}</span><p v-if="row.guest">Имя гостя: {{row.guest.displayName}}</p><small>Приглашение до {{when(row.expiresAt)}}</small><div class="crm-action-bar"><template v-if="state(row)==='WAITING'"><button type="button" class="crm-button crm-button--primary" :disabled="disabled||busy" @click="decide(row,'ADMIT')">Допустить</button><button type="button" class="crm-button crm-button--danger" :disabled="disabled||busy" @click="decide(row,'REJECT')">Отклонить</button></template><button v-else-if="!row.revokedAt&&new Date(row.expiresAt)>new Date()" type="button" class="crm-button crm-button--danger" :disabled="disabled||busy" @click="revoke(row)">Отозвать доступ</button></div></div>
    <p v-if="!loading&&!rows.length">Гостевых приглашений пока нет.</p>
  </section>
</template>
