<script setup lang="ts">
import { CalendarDays, Code, Copy, ExternalLink, Globe, Save, Users } from '@lucide/vue';
const props=defineProps<{profile:any;scheduleOnly?:boolean}>();
const config=useRuntimeConfig(),session=useB2BSession();
const draft=reactive<any>({enabled:false,timeZone:'Europe/Moscow',startMinute:540,endMinute:1200,slotStep:15,horizonDays:30,workingDays:[1,2,3,4,5,6],masterIds:[],weeklySchedule:[]});
const loading=ref(true),busy=ref(false),error=ref(''),notice=ref(''),baseline=ref('');
const canEdit=computed(()=>props.profile.membership?.role==='OWNER');
const dirty=computed(()=>Boolean(baseline.value)&&JSON.stringify(draft)!==baseline.value);
const days=[{id:1,label:'Пн'},{id:2,label:'Вт'},{id:3,label:'Ср'},{id:4,label:'Чт'},{id:5,label:'Пт'},{id:6,label:'Сб'},{id:0,label:'Вс'}];
const publicUrl=computed(()=>`${String(config.public.siteUrl).replace(/\/$/,'')}/booking/${props.profile.id}`);
const embed=computed(()=>`<iframe src="${publicUrl.value}?embed=1" title="Онлайн-запись в салон" width="100%" height="720" loading="lazy"></iframe>`);
const hours=(key:string)=>computed({get:()=>{const minute=draft[key]===1440?0:draft[key];return `${String(Math.floor(minute/60)).padStart(2,'0')}:${String(minute%60).padStart(2,'0')}`;},set:(value:string)=>{const [h,m]=value.split(':').map(Number);if(Number.isFinite(h)&&Number.isFinite(m))draft[key]=key==='endMinute'&&h===0&&m===0?1440:h*60+m;}});
const opensAt=hours('startMinute'),closesAt=hours('endMinute');
const fields=['enabled','timeZone','startMinute','endMinute','slotStep','horizonDays','workingDays','masterIds','weeklySchedule'];
const headers=computed(()=>({Authorization:`Bearer ${session.token.value}`}));
async function load(){loading.value=true;error.value='';try{const value=await $fetch<any>('/b2b/booking-settings',{baseURL:config.public.apiBase,headers:headers.value});for(const key of fields)if(value[key]!==undefined)draft[key]=value[key];baseline.value=JSON.stringify(draft);}catch{error.value='Не удалось загрузить настройки онлайн-записи.';}finally{loading.value=false;}}
async function save(){if(busy.value||!canEdit.value)return;busy.value=true;error.value='';notice.value='';try{await $fetch('/b2b/booking-settings',{baseURL:config.public.apiBase,headers:headers.value,method:'PATCH',body:Object.fromEntries(fields.map(key=>[key,draft[key]]))});baseline.value=JSON.stringify(draft);notice.value='Настройки сохранены';}catch(e:any){error.value=typeof e.data?.message==='string'?e.data.message:'Не удалось сохранить настройки.';}finally{busy.value=false;}}
async function copy(kind:'widget'|'link'='widget'){error.value='';try{await navigator.clipboard.writeText(kind==='link'?publicUrl.value:embed.value);notice.value=kind==='link'?'Ссылка скопирована':'Код виджета скопирован';}catch{error.value='Не удалось скопировать. Выделите текст и скопируйте вручную.';}}
function leave(){return !busy.value&&(!dirty.value||window.confirm('Настройки онлайн-записи не сохранены. Покинуть раздел?'));}
async function refresh(){if(busy.value||loading.value)return;if(dirty.value&&!window.confirm('Настройки не сохранены. Отменить изменения и обновить?'))return;notice.value='';await load();}
defineExpose({refresh,busy,loading});
onBeforeRouteLeave(leave);onBeforeRouteUpdate(leave);
onMounted(load);
</script>
<template>
  <div class="salon-online-settings">
    <p v-if="error" role="alert" class="salon-settings-error">{{error}} <button v-if="!baseline" type="button" @click="load">Повторить</button></p>
    <p v-if="loading" role="status">Загружаем настройки…</p>
    <form v-else-if="baseline" class="salon-settings-panel" @submit.prevent="save">
      <header class="salon-settings-heading"><h2>Условия онлайн-записи</h2><small v-if="!canEdit">Изменять настройки может владелец компании.</small></header>
      <fieldset :disabled="busy||!canEdit" class="ui-fieldset-reset">
        <label class="salon-publication-control">
          <span><strong>Включить публичную запись</strong><small>{{draft.enabled?'Клиенты могут записаться на странице и через виджет':'Страница и виджет пока не принимают записи'}}</small></span>
          <span class="salon-switch"><input v-model="draft.enabled" type="checkbox" aria-label="Включить публичную запись"/><span aria-hidden="true"/></span>
        </label>
        <section class="salon-settings-group">
          <header class="salon-settings-group-title"><CalendarDays :size="18"/><h3>Расписание</h3></header>
          <div class="salon-settings-fields"><label class="salon-settings-wide">Часовой пояс<input v-model="draft.timeZone" required placeholder="Europe/Moscow"/></label><label>Начало рабочего дня<input v-model="opensAt" type="time" required/></label><label>Конец рабочего дня<input v-model="closesAt" type="time" required/></label><label>Шаг записи, минут<input v-model.number="draft.slotStep" type="number" min="5" max="60" required/></label><label>Запись вперёд, дней<input v-model.number="draft.horizonDays" type="number" min="1" max="90" required/></label></div>
          <fieldset class="salon-settings-days"><legend>Рабочие дни</legend><div class="salon-day-options"><label v-for="day in days" :key="day.id"><input v-model="draft.workingDays" :value="day.id" type="checkbox"/><span>{{day.label}}</span></label></div></fieldset>
        </section>
        <SalonWeeklySchedule v-model="draft.weeklySchedule" :working-days="draft.workingDays" :start-minute="draft.startMinute" :end-minute="draft.endMinute"/>
        <fieldset class="salon-settings-masters"><legend><Users :size="18"/>Мастера для публичной записи</legend><div class="salon-master-options"><label v-for="member in profile.members" :key="member.id"><input v-model="draft.masterIds" :value="member.id" type="checkbox"/><span>{{[member.user.firstName,member.user.lastName].filter(Boolean).join(' ')||'Сотрудник'}}</span></label><small v-if="!profile.members.length">Нет активных сотрудников.</small></div></fieldset>
      </fieldset>
      <details class="salon-settings-notes"><summary>Условия публикации</summary><p class="salon-settings-warning">Публикация доступна для активной организации. Часы по дням недели и перерывы действуют для всех выбранных мастеров. Индивидуальные смены и исключения по датам — следующий этап. Перед массовым запуском необходимо подключить подтверждение телефона.</p></details>
      <footer class="salon-settings-save"><span role="status">{{notice|| (dirty?'Есть несохранённые изменения':'Все изменения сохранены')}}</span><button v-if="canEdit" class="primary" type="submit" :disabled="busy||!dirty"><Save :size="16"/>{{busy?'Сохраняем…':'Сохранить настройки'}}</button></footer>
    </form>
    <aside v-if="!scheduleOnly" class="salon-settings-channels">
      <section class="salon-settings-panel salon-booking-channel"><header class="salon-settings-group-title"><Globe :size="18"/><h2>Страница записи</h2></header><p>Поделитесь ссылкой с клиентами — установка на сайт не нужна.</p><label>Ссылка для клиентов<input :value="publicUrl" readonly aria-label="Ссылка онлайн-записи"/></label><div class="salon-link-actions"><button type="button" @click="copy('link')"><Copy :size="16"/>Скопировать ссылку</button><a :href="publicUrl" target="_blank" rel="noopener" aria-label="Открыть страницу записи" title="Открыть страницу записи"><ExternalLink :size="18"/></a></div></section>
      <section class="salon-settings-panel salon-booking-channel"><header class="salon-settings-group-title"><Code :size="18"/><h2>Виджет для сайта</h2></header><p>Добавьте форму записи на сайт салона. Услуги и свободное время обновляются автоматически.</p><details class="salon-widget-code"><summary>Код для сайта салона</summary><label><span class="salon-settings-code-label">HTML-код виджета</span><textarea :value="embed" readonly rows="5" aria-label="Код виджета"/></label></details><button type="button" @click="copy('widget')"><Copy :size="16"/>Скопировать код виджета</button><small>Оба способа используют ваше расписание и настройки публикации.</small></section>
    </aside>
  </div>
</template>
