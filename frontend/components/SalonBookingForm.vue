<script setup lang="ts">
import { ArrowLeft, ArrowRight, CalendarCheck, Check } from '@lucide/vue';
import { shiftSalonDay } from '~/shared/salon-calendar';
import { requestKey as createRequestKey } from '~/shared/request-key';
const props=defineProps<{organizationId:string;embedded?:boolean}>();
const config=useRuntimeConfig();
const logoFailed=ref(false);
const logoSrc=computed(()=>profile.value?.presentation?.logoUrl&&!logoFailed.value?new URL(profile.value.presentation.logoUrl,config.public.apiBase).toString():'/sarkisian-logo.png');
const hours=(minute:number)=>`${String(Math.floor(minute/60)%24).padStart(2,'0')}:${String(minute%60).padStart(2,'0')}`;
const weekdays=['Вс','Пн','Вт','Ср','Чт','Пт','Сб'];
const profile=ref<any>(null),loading=ref(true),error=ref(''),step=ref(1),servicesId=ref(''),masterId=ref(''),day=ref(''),selected=ref(''),slots=ref<string[]>([]),slotsLoading=ref(false),busy=ref(false),result=ref<any>(null);
watch(()=>profile.value?.presentation?.logoUrl,()=>{logoFailed.value=false;});
const firstName=ref(''),phone=ref(''),email=ref(''),consent=ref(false);
const manageLink=computed(()=>result.value?.manageToken && import.meta.client ? `${window.location.origin}/booking-manage/${encodeURIComponent(props.organizationId)}#token=${encodeURIComponent(result.value.manageToken)}` : '');
const slotsError=ref('');
const stageHeading=ref<HTMLElement|null>(null),successHeading=ref<HTMLElement|null>(null);
const stageLabels=['Выберите услугу','Выберите удобное время','Проверьте запись'];
const nearestDays=computed(()=>profile.value?Array.from({length:Math.min(7,profile.value.horizonDays)},(_,index)=>({value:shiftSalonDay(profile.value.today,index),label:index===0?'Сегодня':index===1?'Завтра':new Date(shiftSalonDay(profile.value.today,index)+'T12:00:00Z').toLocaleDateString('ru-RU',{weekday:'short',day:'numeric',month:'short',timeZone:'UTC'})})):[]);
watch(step,async()=>{await nextTick();(step.value===4?successHeading.value:stageHeading.value)?.focus();});
const service=computed(()=>profile.value?.services.find((s:any)=>s.id===servicesId.value));
const master=computed(()=>profile.value?.masters.find((m:any)=>m.id===masterId.value));
const bookingAvailable=computed(()=>Boolean(profile.value?.services?.length&&profile.value?.masters?.length));
const maxDay=computed(()=>profile.value?shiftSalonDay(profile.value.today,profile.value.horizonDays-1):'');
const time=(value:string)=>new Date(value).toLocaleTimeString('ru-RU',{timeZone:profile.value.timeZone,hour:'2-digit',minute:'2-digit'});
const fullDate=(value:string)=>new Date(value).toLocaleString('ru-RU',{timeZone:profile.value.timeZone,day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'});
const price=(value:any)=>new Intl.NumberFormat('ru-RU',{style:'currency',currency:'RUB',maximumFractionDigits:2}).format(Number(value));
let version=0,controller:AbortController|undefined;
// Preserve the same operation after a timeout: the server may already have
// created the visit. Changing any submitted field creates a new operation.
let pendingRequest:{signature:string;key:string}|undefined;
async function load(){loading.value=true;error.value='';try{profile.value=await $fetch(`/salon-booking/${encodeURIComponent(props.organizationId)}`,{baseURL:config.public.apiBase,timeout:20000});day.value=profile.value.today;}catch(e:any){error.value=e.status===404?'Салон пока не открыл онлайн-запись. Свяжитесь с ним напрямую.':'Не удалось загрузить запись. Попробуйте ещё раз.';}finally{loading.value=false;}}
async function loadSlots(){const current=++version;controller?.abort();selected.value='';slots.value=[];slotsError.value='';slotsLoading.value=false;if(!servicesId.value||!masterId.value||!day.value)return;controller=new AbortController();slotsLoading.value=true;try{const value=await $fetch<any>(`/salon-booking/${encodeURIComponent(props.organizationId)}/slots`,{baseURL:config.public.apiBase,signal:controller.signal,timeout:20000,query:{serviceId:servicesId.value,masterMemberId:masterId.value,date:day.value}});if(current===version)slots.value=value.slots;}catch(e:any){if(current===version&&e.name!=='AbortError')slotsError.value=typeof e.data?.message==='string'?e.data.message:'Не удалось загрузить свободное время.';}finally{if(current===version)slotsLoading.value=false;}}
watch([servicesId,masterId,day],()=>{error.value='';loadSlots();});
async function submit(){if(busy.value||!selected.value||!consent.value)return;busy.value=true;error.value='';const body={serviceId:servicesId.value,masterMemberId:masterId.value,date:day.value,startTime:selected.value,firstName:firstName.value.trim(),phone:phone.value.replace(/\D/g,''),...(email.value.trim()?{email:email.value.trim()}:{}),personalDataConsent:consent.value};const signature=JSON.stringify(body);if(pendingRequest?.signature!==signature)pendingRequest={signature,key:createRequestKey()};try{result.value=await $fetch(`/salon-booking/${encodeURIComponent(props.organizationId)}/bookings`,{baseURL:config.public.apiBase,method:'POST',timeout:20000,retry:0,body:{...body,requestKey:pendingRequest.key}});pendingRequest=undefined;step.value=4;}catch(e:any){error.value=typeof e.data?.message==='string'?e.data.message:'Не удалось получить подтверждение. Нажмите «Записаться» ещё раз — повторная запись не появится.';if(e.status===409||e.statusCode===409){pendingRequest=undefined;step.value=2;await loadSlots();}}finally{busy.value=false;}}
onMounted(load);onBeforeUnmount(()=>{++version;controller?.abort();});
</script>
<template>
  <main class="public-salon-booking" :class="{'is-embedded':embedded}">
    <section class="public-booking-card">
      <header><img :src="logoSrc" :class="{'public-salon-logo':profile?.presentation?.logoUrl&&!logoFailed}" :alt="profile?.presentation?.logoUrl&&!logoFailed?profile.name:'SARKISIAN'" @error="logoFailed=true"/><small>Онлайн-запись</small><h1>{{profile?.name||'Запись в салон'}}</h1><template v-if="profile?.presentation"><p v-if="profile.presentation.address" class="public-salon-address">{{profile.presentation.address}}</p><details class="public-salon-info"><summary>Контакты и часы работы</summary><div class="public-salon-contacts"><p v-if="profile.workingDays?.length&&!profile.weeklySchedule?.length">{{profile.workingDays.map((day:number)=>weekdays[day]).join(', ')}} · {{hours(profile.startMinute)}}–{{hours(profile.endMinute)}} <small>{{profile.timeZone}}</small></p><div><a v-for="phone in profile.presentation.phones" :key="phone" :href="`tel:${phone.replace(/[^+\d]/g,'')}`">{{phone}}</a><a v-for="email in profile.presentation.emails" :key="email" :href="`mailto:${email}`">{{email}}</a><a v-for="link in profile.presentation.socialLinks" :key="link.url" :href="link.url" target="_blank" rel="noopener noreferrer">{{link.label}}</a></div><details v-if="profile.weeklySchedule?.length" class="public-salon-hours"><summary>Часы работы и перерывы</summary><div v-for="day in profile.workingDays" :key="day"><strong>{{weekdays[day]}}</strong><span>{{hours((profile.weeklySchedule.find((row:any)=>row.day===day)||profile).startMinute)}}–{{hours((profile.weeklySchedule.find((row:any)=>row.day===day)||profile).endMinute)}}</span><small v-for="(pause,i) in profile.weeklySchedule.find((row:any)=>row.day===day)?.breaks||[]" :key="i">Перерыв {{hours(pause.startMinute)}}–{{hours(pause.endMinute)}}</small></div></details></div></details></template></header>
      <p v-if="loading" role="status">Загружаем услуги и расписание…</p>
      <p v-if="error" role="alert" class="public-booking-error">{{error}}</p>
      <button v-if="!loading&&!profile" type="button" @click="load">Повторить загрузку</button>
      <template v-if="profile&&!loading">
        <ol v-if="step<4&&bookingAvailable" class="public-booking-steps" aria-label="Этапы записи"><li v-for="(label,index) in ['Услуга','Время','Контакты']" :key="label" :aria-current="step===index+1?'step':undefined" :class="{active:step===index+1,done:step>index+1}"><span><Check v-if="step>index+1" :size="14" aria-hidden="true"/><template v-else>{{index+1}}</template></span>{{label}}</li></ol>
        <h2 v-if="step<4&&bookingAvailable" ref="stageHeading" tabindex="-1" class="public-booking-title">{{stageLabels[step-1]}}</h2>
        <div v-if="!bookingAvailable" class="public-booking-stage" role="status"><h2>Онлайн-запись пока недоступна</h2><p>Сейчас нет доступных услуг или мастеров. Свяжитесь с салоном, чтобы подобрать услугу и время.</p></div>
        <form v-else-if="step===1" @submit.prevent="step=2">
          <label>Услуга<select v-model="servicesId" aria-label="Услуга" required><option disabled value="">Выберите услугу</option><option v-for="item in profile.services" :key="item.id" :value="item.id">{{item.name}} · {{item.duration}} мин. · {{price(item.price)}}</option></select></label>
          <label>Мастер<select v-model="masterId" aria-label="Мастер" required><option disabled value="">Выберите мастера</option><option v-for="item in profile.masters" :key="item.id" :value="item.id">{{item.name}}</option></select></label>
          <p v-if="service" class="public-booking-service-preview"><span>{{service.duration}} мин.<small>Продолжительность визита</small></span><strong>{{price(service.price)}}</strong></p>
          <button type="submit" class="public-booking-primary" :disabled="!servicesId||!masterId">Выбрать время<ArrowRight :size="16"/></button>
        </form>
        <div v-else-if="step===2" class="public-booking-stage">
          <p class="public-booking-summary"><strong>{{service?.name}}</strong><small>{{master?.name}} · {{service?.duration}} мин.</small></p>
          <div class="public-booking-nearest" role="group" aria-label="Ближайшие даты записи"><button v-for="item in nearestDays" :key="item.value" type="button" :aria-pressed="day===item.value" @click="day=item.value">{{item.label}}</button></div>
          <label>Дата визита<input v-model="day" type="date" :min="profile.today" :max="maxDay" required/></label>
          <small>Время салона: {{profile.timeZone}}</small>
          <p v-if="slotsLoading" role="status">Ищем свободное время…</p>
          <div v-else-if="slotsError" class="public-booking-error"><p role="alert">{{slotsError}}</p><button type="button" @click="loadSlots">Повторить поиск времени</button></div>
          <div v-else class="public-booking-slots" role="group" aria-label="Свободное время"><button v-for="slot in slots" :key="slot" type="button" :aria-pressed="selected===slot" :class="{selected:selected===slot}" @click="selected=slot">{{time(slot)}}</button></div>
          <p v-if="!slotsLoading&&!slotsError&&!slots.length">На эту дату свободного времени нет. Выберите другой день или мастера.</p>
          <footer><button type="button" @click="step=1"><ArrowLeft :size="16"/>Назад</button><button type="button" class="public-booking-primary" :disabled="!selected||slotsLoading" @click="step=3">Продолжить<ArrowRight :size="16"/></button></footer>
        </div>
        <form v-else-if="step===3" @submit.prevent="submit">
          <p class="public-booking-summary"><strong>{{service?.name}}</strong><span>{{fullDate(selected)}} · {{master?.name}}</span><small>{{service?.duration}} мин. · {{price(service?.price)}}</small></p>
          <fieldset :disabled="busy"><label>Ваше имя<input v-model="firstName" required maxlength="80" autocomplete="given-name"/></label><label>Телефон<input v-model="phone" type="tel" required minlength="8" maxlength="30" autocomplete="tel" placeholder="+7 900 000-00-00"/></label><label>Email <small>необязательно</small><input v-model="email" type="email" maxlength="254" autocomplete="email" placeholder="name@example.ru"/></label><label class="public-booking-consent"><input v-model="consent" type="checkbox" required/>Согласен на обработку контактных данных для оформления записи и связи по визиту.</label></fieldset>
          <footer><button type="button" :disabled="busy" @click="step=2"><ArrowLeft :size="16"/>Назад</button><button type="submit" class="public-booking-primary" :disabled="busy||!consent||!firstName.trim()">{{busy?'Записываем…':'Записаться'}}<Check :size="16"/></button></footer>
        </form>
        <div v-else class="public-booking-success" role="status"><CalendarCheck :size="40"/><h2 ref="successHeading" tabindex="-1">Запись создана</h2><strong>{{result.serviceName}}</strong><p>{{fullDate(result.startTime)}} · {{master?.name}}</p><small>Салон увидит запись в календаре. {{ email.trim() ? 'Если отправка почты подключена, на указанный адрес придёт письмо.' : 'Чтобы не потерять доступ, сохраните ссылку на эту запись.' }}</small><a v-if="manageLink" :href="manageLink" target="_blank" rel="noopener noreferrer">Управлять записью</a><small v-if="manageLink">Сохраните ссылку и не передавайте её другим людям.</small><small v-else>Для изменения визита свяжитесь с салоном.</small></div>
      </template>
      <small class="public-booking-powered">Работает на платформе SARKISIAN</small>
    </section>
  </main>
</template>
