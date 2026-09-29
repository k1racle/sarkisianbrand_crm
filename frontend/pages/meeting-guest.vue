<script setup lang="ts">
import { CalendarClock, RefreshCw } from '@lucide/vue';
useHead({title:'Гостевой вход на встречу — SARKISIAN',htmlAttrs:{lang:'ru','data-crm-ui':'true'},meta:[{name:'robots',content:'noindex, nofollow'},{name:'referrer',content:'no-referrer'}],link:[{rel:'icon',type:'image/svg+xml',href:'/crm/pwa/icon.svg?v=brand2'}]});
const config=useRuntimeConfig(),invitation=ref(''),pin=ref(''),name=ref(''),ticket=ref(''),clientKey=ref('');
const busy=ref(false),error=ref(''),connectionLost=ref(false),status=ref<any>(null),ready=ref(false);
const storageKey='sarkisian-meeting-guest',terminal=computed(()=>status.value&&!['WAITING','ADMITTED'].includes(status.value.state));
const request=(path:string,body:any)=>$fetch<any>('/meeting-guests/'+path,{baseURL:config.public.apiBase,method:'POST',credentials:'omit',body,timeout:15000,retry:0});
const message=(e:any)=>Array.isArray(e?.data?.message)?e.data.message.join('. '):e?.data?.message||'Нет связи с сервером. Проверьте интернет и повторите.';
const when=(value:string)=>new Date(value).toLocaleString('ru-RU');
let timer:ReturnType<typeof setTimeout>|undefined,disposed=false,generation=0,retryMs=5000;
function secret(){return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
function persist(){try{sessionStorage.setItem(storageKey,JSON.stringify({invitation:invitation.value,clientKey:clientKey.value,ticket:ticket.value}));}catch{/* Memory-only access still works; a reload will require a new invitation. */}}
function clear(){ticket.value='';try{sessionStorage.removeItem(storageKey);}catch{}}
function schedule(){clearTimeout(timer);if(!disposed&&!terminal.value&&ticket.value)timer=setTimeout(()=>refresh(),retryMs);}
async function join(){
  if(busy.value||!invitation.value||!name.value.trim())return;
  busy.value=true;error.value='';persist();const current=++generation;
  try{const data=await request('join',{invitationToken:invitation.value,pin:pin.value,displayName:name.value.trim(),clientKey:clientKey.value});if(disposed||generation!==current)return;ticket.value=data.ticket;status.value=data;pin.value='';connectionLost.value=false;persist();schedule();}
  catch(e){if(!disposed&&current===generation)error.value=message(e);}
  finally{if(current===generation)busy.value=false;}
}
async function refresh(){
  if(busy.value||!ticket.value||disposed)return;
  busy.value=true;const current=++generation;
  try{const data=await request('status',{ticket:ticket.value});if(disposed||current!==generation)return;status.value=data;error.value='';connectionLost.value=false;retryMs=5000;if(terminal.value)clear();}
  catch(e:any){if(disposed||current!==generation)return;error.value=message(e);connectionLost.value=true;retryMs=Math.max(5000,Math.min(600000,Number(e?.data?.retryAfter||10)*1000));if(e?.status===401||e?.statusCode===401){status.value={state:'INVALID'};clear();}}
  finally{if(current===generation)busy.value=false;schedule();}
}
async function leave(){
  if(busy.value||!ticket.value||!window.confirm('Выйти из ожидания? Для повторного входа понадобится новое приглашение.'))return;
  busy.value=true;clearTimeout(timer);const current=++generation;
  try{const data=await request('leave',{ticket:ticket.value});if(disposed||current!==generation)return;status.value=data;clear();error.value='';}
  catch(e){if(!disposed&&current===generation)error.value=message(e);}
  finally{if(current===generation)busy.value=false;schedule();}
}
onMounted(()=>{
  const value=new URLSearchParams(window.location.hash.slice(1)).get('invite')||'';
  invitation.value=/^[A-Za-z0-9_-]{43}$/.test(value)?value:'';clientKey.value=secret();
  try{const saved=JSON.parse(sessionStorage.getItem(storageKey)||'null');if(saved?.invitation===invitation.value&&/^[A-Za-z0-9_-]{43}$/.test(saved.clientKey)){clientKey.value=saved.clientKey;if(/^[A-Za-z0-9_-]{43}$/.test(saved.ticket||''))ticket.value=saved.ticket;}}catch{}
  ready.value=true;if(ticket.value)refresh();
});
onBeforeUnmount(()=>{disposed=true;++generation;clearTimeout(timer);pin.value='';ticket.value='';});
</script>
<template>
  <main class="crm-app-login crm-standard">
    <header class="crm-login-brand"><img class="crm-brand-mark" src="/crm/pwa/icon.svg?v=brand2" width="42" height="42" alt="" /><strong>SARKISIAN · Встречи</strong></header>
    <section class="crm-login-card crm-surface crm-stack">
      <CalendarClock :size="28" aria-hidden="true" /><h1>Гостевой вход</h1>
      <p v-if="!ready">Подготавливаем приглашение…</p>
      <p v-else-if="!invitation" role="alert">Откройте полную ссылку от организатора. В ней должен быть код приглашения.</p>
      <p v-if="error" role="alert">{{error}}</p>
      <template v-if="status">
        <p v-if="connectionLost" role="status">Связь потеряна. Текущий допуск не подтверждён; восстанавливаем соединение.</p>
        <template v-if="!terminal"><strong>{{status.meeting?.title}}</strong><small v-if="status.meeting">{{when(status.meeting.startsAt)}} — {{when(status.meeting.endsAt)}} · время вашего устройства</small><h2>{{status.state==='ADMITTED'?'Организатор допустил вас':'Ожидайте допуска'}}</h2><p>{{status.state==='ADMITTED'?'Допуск получен, но видеосервер ещё не подключён. Камера и микрофон не включаются.':'Организатор видит вашу заявку. Статус обновляется автоматически.'}}</p><button type="button" class="crm-button" :disabled="busy" @click="refresh"><RefreshCw :size="18" />Проверить статус</button><button type="button" class="crm-button crm-button--danger" :disabled="busy" @click="leave">Выйти</button></template>
        <template v-else><h2>{{status.state==='REJECTED'?'Вход отклонён':status.state==='LEFT'?'Вы вышли':status.state==='EXPIRED'?'Срок доступа истёк':'Доступ закрыт'}}</h2><p>Для нового входа попросите организатора выдать новое приглашение.</p></template>
      </template>
      <form v-else-if="ready&&invitation" class="crm-stack" @submit.prevent="join"><p>Регистрация не нужна. Введите имя и 8-значный PIN, затем дождитесь допуска организатора. Вход откроется за 30 минут до встречи.</p><label class="crm-field">Ваше имя<input v-model="name" class="crm-input" autocomplete="name" maxlength="80" required :disabled="busy" /></label><label class="crm-field">PIN приглашения<input v-model="pin" class="crm-input" type="password" inputmode="numeric" autocomplete="off" pattern="[0-9]{8}" minlength="8" maxlength="8" required :disabled="busy" /></label><button type="submit" class="crm-button crm-button--primary" :disabled="busy||!name.trim()||!/^\d{8}$/.test(pin)">{{busy?'Проверяем…':'Войти в зал ожидания'}}</button></form>
      <p class="crm-inline-note">Видеосвязь пока не подключена. Гостевой доступ не открывает CRM и данные компании.</p>
    </section>
  </main>
</template>
