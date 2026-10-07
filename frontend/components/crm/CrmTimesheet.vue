<script setup lang="ts">
import { requestKey as createRequestKey } from '~/shared/request-key';
import { ArrowRight, Download, RefreshCw, X } from '@lucide/vue';
import { workTimeDuration } from '~/shared/crm-work-time';
import { sheetPerson, sheetIssueLabels, sheetStatus, sheetAction, sheetEvent, type SheetAction, type SheetList, type SheetDetail } from '~/shared/crm-timesheet';
const props=defineProps<{visible:boolean}>(), emit=defineEmits<{correction:[id:string,employeeId:string]}>();
const {token,user}=useWorkspaceSession(),config=useRuntimeConfig();
const month=ref(new Intl.DateTimeFormat('sv-SE',{timeZone:user.value?.timezone||'Europe/Moscow'}).format(new Date()).slice(0,7)),departmentId=ref(''),search=ref(''),attention=ref(false);
const data=ref<SheetList|null>(null),options=ref<{departments:{id:string;name:string;archivedAt:string|null}[];canExport:boolean}|null>(null),loading=ref(false),error=ref('');
const exporting=ref(false),exportError=ref('');
let appliedQuery:Record<string,unknown>|null=null,exportController:AbortController|null=null;
const opened=ref(false),detail=ref<SheetDetail|null>(null),detailLoading=ref(false),detailError=ref(''),target=ref<{id:string;month:string;revision?:number}|null>(null);
const action=ref<SheetAction>('REVIEW'),reason=ref(''),saving=ref(false),actionError=ref(''),notice=ref('');
const pending=ref<{month:string;action:SheetAction;revision:number;reason:string;requestKey:string}|null>(null);
let alive=true,version=0,detailVersion=0;
const request=<T,>(path:string,query:any={})=>$fetch<T>('/crm/work-time/timesheet'+path,{baseURL:config.public.apiBase,headers:{Authorization:`Bearer ${token.value}`},query,timeout:35000,retry:0});
const message=(e:any)=>Array.isArray(e?.data?.message)?e.data.message.join('. '):e?.data?.message||'Не удалось загрузить табель. Попробуйте ещё раз.';
const duration=(ms:number|null)=>ms===null?'—':workTimeDuration(ms);
const date=(value:string|null)=>value?new Date(value).toLocaleString('ru-RU',{timeZone:detail.value?.timezone||'Europe/Moscow',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):'Не завершено';
const dayLabel=(value:string)=>new Date(value+'T12:00Z').toLocaleDateString('ru-RU',{timeZone:'UTC',day:'numeric',month:'short',weekday:'short'});
const intervals=computed(()=>new Map(detail.value?.intervals.map(row=>[row.id,row])||[]));
function close(){if(saving.value)return;opened.value=false;detail.value=null;detailError.value='';detailLoading.value=false;target.value=null;pending.value=null;actionError.value='';++detailVersion;}
const {panel,keyboard}=useCatalogDialog(computed(()=>opened.value),close);
async function load(page=1){
  if(!props.visible)return;
  const current=++version,identity=token.value;loading.value=true;data.value=null;error.value='';exportError.value='';close();
  const query={month:month.value,...(departmentId.value?{departmentId:departmentId.value}:{}),...(search.value.trim()?{search:search.value.trim()}:{}),view:attention.value?'ATTENTION':'ALL',page};
  try{
    const [result,choices]=await Promise.all([request<SheetList>('',query),request<any>('/options')]);
    if(alive&&current===version&&identity===token.value){data.value=result;options.value=choices;appliedQuery=query;}
  }catch(e){if(alive&&current===version&&identity===token.value)error.value=message(e);}
  finally{if(alive&&current===version&&identity===token.value)loading.value=false;}
}
async function exportExcel(){
  if(exporting.value||!data.value||!appliedQuery||!options.value?.canExport)return;
  const identity=token.value,query={...appliedQuery},controller=new AbortController();exportController=controller;exporting.value=true;exportError.value='';
  try{
    const blob=await $fetch<Blob>('/crm/work-time/timesheet/export',{baseURL:config.public.apiBase,headers:{Authorization:`Bearer ${identity}`},query,responseType:'blob',signal:controller.signal,timeout:60000,retry:0});
    if(!alive||identity!==token.value||controller.signal.aborted)return;
    const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`timesheet-${query.month}.xlsx`;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }catch(e:any){
    if(e?.data instanceof Blob){try{e.data=JSON.parse(await e.data.text());}catch{}}
    if(alive&&identity===token.value&&!controller.signal.aborted)exportError.value=e?.data?.message||'Не удалось выгрузить табель. Повторите попытку.';
  }finally{if(exportController===controller){exporting.value=false;exportController=null;}}
}
async function open(id:string,reportMonth=data.value?.month,revision?:number){
  if(!reportMonth)return;
  const current=++detailVersion,identity=token.value;target.value={id,month:reportMonth,revision};opened.value=true;detail.value=null;detailError.value='';detailLoading.value=true;pending.value=null;actionError.value='';reason.value='';
  try{const result=await request<SheetDetail>('/'+id+(revision?'/versions/'+revision:''),{month:reportMonth});if(alive&&current===detailVersion&&identity===token.value){detail.value=result;const actions=result.workflow?.actions||[];action.value=actions.find(value=>value!=='REVIEW')||'REVIEW';}}
  catch(e){if(alive&&current===detailVersion&&identity===token.value)detailError.value=message(e);}
  finally{if(alive&&current===detailVersion&&identity===token.value)detailLoading.value=false;}
}
async function decide(){
  if(!target.value||!detail.value?.workflow||saving.value)return;
  const current=detailVersion,identity=token.value,destination={...target.value};saving.value=true;actionError.value='';notice.value='';
  pending.value??={month:destination.month,action:action.value,revision:detail.value.workflow.revision,reason:reason.value.trim(),requestKey:createRequestKey()};
  try{
    await $fetch('/crm/work-time/timesheet/'+destination.id+'/actions',{baseURL:config.public.apiBase,headers:{Authorization:`Bearer ${identity}`},method:'POST',body:pending.value,timeout:35000,retry:0});
    if(!alive||identity!==token.value||current!==detailVersion)return;
    pending.value=null;saving.value=false;notice.value='Решение сохранено.';await load(data.value?.page||1);await open(destination.id,destination.month);
  }catch(e:any){if(alive&&identity===token.value&&current===detailVersion){actionError.value=message(e);if([400,401,403,404,409,422].includes(e?.statusCode||e?.status))pending.value=null;else actionError.value+=' Результат отправки неизвестен. Повторите этот же запрос.';}}
  finally{if(alive&&identity===token.value)saving.value=false;}
}
function correction(id:string){const employee=detail.value?.employee.id;if(!employee)return;close();emit('correction',id,employee);}
function reset(){++version;exportController?.abort();exportController=null;exporting.value=false;exportError.value='';appliedQuery=null;saving.value=false;close();data.value=null;options.value=null;loading.value=false;error.value='';notice.value='';}
watch(()=>props.visible,visible=>{reset();if(visible)load();});
watch(token,()=>{reset();departmentId.value='';search.value='';attention.value=false;if(props.visible)load();});
onMounted(()=>{if(props.visible)load();});onUnmounted(()=>{alive=false;reset();});
</script>
<template>
  <div v-if="visible" class="crm-page-content--stack">
    <form class="crm-toolbar crm-filter-form" aria-label="Фильтры табеля" @submit.prevent="load()">
      <label>Месяц табеля<input v-model="month" class="crm-input" type="month" required min="2000-01" max="2099-12" @change="load()" /></label>
      <label>Отдел<select v-model="departmentId" class="crm-input" aria-label="Отдел" @change="load()"><option value="">Все доступные</option><option v-for="row in options?.departments||[]" :key="row.id" :value="row.id">{{row.name}}{{row.archivedAt?' · архив':''}}</option></select></label>
      <label>Сотрудник<input v-model="search" class="crm-input" maxlength="80" placeholder="Имя или фамилия" /></label>
      <button class="crm-button crm-button--refresh" :disabled="loading"><RefreshCw :size="18" />Обновить табель</button>
      <button v-if="options?.canExport" type="button" class="crm-button" :disabled="loading||exporting||!data" @click="exportExcel"><Download :size="18" />{{exporting?'Готовим Excel…':'Скачать Excel'}}</button>
    </form>
    <label class="crm-toggle-row"><span>Только требующие проверки</span><input v-model="attention" class="crm-check" type="checkbox" @change="load()" /></label>
    <p v-if="loading" role="status">Рассчитываем табель по всей выбранной команде…</p><p v-if="error" role="alert">{{error}}</p><p v-if="notice" role="status">{{notice}}</p>
    <p v-if="exportError" role="alert">{{exportError}}</p>
    <p v-if="data&&options?.canExport" class="crm-inline-note">Excel содержит всю выборку последнего обновления, включая остальные страницы. Открытые табели пересчитываются при скачивании.</p>
    <section v-if="data" class="crm-surface" aria-label="Табель команды">
      <header class="crm-panel-header"><div><p>ПЛАН И ФАКТ · {{data.month}}</p><h2>Табель команды</h2></div><span class="crm-badge">Проверка и закрытие месяца</span></header>
      <div class="crm-register crm-page-content--stack">
        <p class="crm-inline-note">Пояс новых отчётов: {{data.timezone}}. После начала проверки пояс закрепляется за табелем сотрудника и указан в строке. Закрытые месяцы показаны по сохранённой версии; остальные — на момент обновления. Итоги относятся ко всей выборке.</p>
        <div class="crm-summary-grid"><div><small>Сотрудников</small><strong>{{data.summary.employees}}</strong></div><div><small>План</small><strong>{{duration(data.summary.plannedMs)}}</strong></div><div><small>Факт работы</small><strong>{{duration(data.summary.workedMs)}}</strong></div><div><small>Требуют проверки</small><strong>{{data.summary.attention}}</strong></div></div>
        <p class="crm-inline-note">Фильтр отдела — по текущей принадлежности. В закрытой версии имя и отдел сохранены на момент закрытия. {{data.scope==='COMPANY'?'Включены неактивные сотрудники.':'Доступны только табели своих текущих отделов, без чужой истории.'}} День с планом без отметок — повод проверить данные, а не автоматически считать прогул.</p>
        <p v-if="data.summary.unavailablePlan||data.summary.unavailableActual" role="status">{{data.summary.unavailablePlan?`Не рассчитан план сотрудников: ${data.summary.unavailablePlan}. `:''}}{{data.summary.unavailableActual?`Есть пересечения отметок у сотрудников: ${data.summary.unavailableActual}.`:''}} Вместо недостоверного общего итога показан прочерк.</p>
      </div>
      <div role="table" aria-label="План и факт сотрудников">
        <div class="crm-table-head crm-responsive-row crm-responsive-head" role="row"><span role="columnheader">Сотрудник</span><span role="columnheader">План</span><span role="columnheader">Факт</span><span role="columnheader">Перерывы</span><span role="columnheader">Проверка</span><span role="columnheader" aria-label="Открыть" /></div>
        <div v-for="row in data.items" :key="row.employee.id" class="crm-table-row crm-responsive-row" role="row">
          <div class="crm-responsive-main" role="cell"><strong>{{sheetPerson(row.employee)}}</strong><br /><small class="crm-inline-note">{{row.employee.department?.name||'Без отдела'}}{{row.employee.isActive?'':' · Неактивен'}}</small><br /><small class="crm-inline-note">{{row.timezone||data.timezone}}</small></div>
          <span class="crm-responsive-cell" role="cell" data-label="План">{{duration(row.plannedMs)}}</span><span class="crm-responsive-cell" role="cell" data-label="Факт">{{duration(row.workedMs)}}</span><span class="crm-responsive-cell" role="cell" data-label="Перерывы">{{duration(row.breakMs)}}</span>
          <div class="crm-responsive-cell" role="cell" data-label="Проверка"><div><span v-if="row.workflow" class="crm-badge">{{sheetStatus[row.workflow.status]}} · v{{row.workflow.edition}}</span><br v-if="row.workflow" /><small v-if="row.workflow?.stale">Данные изменились · нужна проверка<br /></small><small v-for="label in sheetIssueLabels(row.issues)" :key="label">{{label}}<br /></small><small v-if="!row.needsAttention">{{row.openSessions?'Рабочий день идёт':'Нет замечаний'}}</small></div></div>
          <button class="crm-button crm-button--icon crm-responsive-action" :aria-label="'Открыть табель: '+sheetPerson(row.employee)" @click="open(row.employee.id)"><ArrowRight :size="18" /></button>
        </div>
      </div>
      <div class="crm-register"><p v-if="!data.items.length">Сотрудников по выбранным условиям нет.</p><div class="crm-action-bar crm-action-bar--spread"><span>Всего: {{data.total}} · Страница {{data.page}} / {{data.pages}}</span><div class="crm-action-bar"><button class="crm-button" :disabled="data.page<=1||loading" @click="load(data.page-1)">Назад</button><button class="crm-button" :disabled="data.page>=data.pages||loading" @click="load(data.page+1)">Далее</button></div></div></div>
    </section>
  </div>
  <Teleport to="body"><div v-if="opened" class="admin-dialog-backdrop crm-detail-backdrop" @click.self="close"><section ref="panel" class="admin-dialog admin-dialog--drawer crm-detail-card" role="dialog" aria-modal="true" aria-labelledby="timesheet-title" tabindex="-1" @keydown="keyboard">
    <header><div><p>ТАБЕЛЬ · {{target?.month}}</p><h2 id="timesheet-title">{{detail?sheetPerson(detail.employee):'Табель сотрудника'}}</h2></div><button class="crm-button crm-button--icon" :disabled="saving" aria-label="Закрыть табель" @click="close"><X :size="18" /></button></header>
    <div class="admin-dialog-body crm-detail-body crm-stack"><p v-if="detailLoading" role="status">Загружаем расшифровку…</p><p v-if="detailError" role="alert">{{detailError}}</p><button v-if="detailError&&target" class="crm-button" @click="open(target.id,target.month,target.revision)">Повторить загрузку табеля</button>
      <template v-if="detail">
        <section v-if="detail.workflow" class="crm-stack" aria-label="Состояние табеля">
          <h3>{{sheetStatus[detail.workflow.status]}} · Версия {{detail.workflow.edition}}</h3>
          <p v-if="detail.workflow.status==='CLOSED'" class="crm-inline-note">{{detail.workflow.archived?'Архивная версия.':'Месяц закрыт.'}} Это сохранённые данные на {{date(detail.serverTime)}}; график и отметки за закрытый период защищены от правок.</p>
          <p v-if="detail.workflow.stale" role="status">После проверки данные изменились. Подтвердите проверку заново перед утверждением.</p>
          <p v-for="blocker in detail.workflow.blockers||[]" :key="blocker" class="crm-inline-note">{{blocker}}</p>
          <form v-if="detail.workflow.actions?.length" class="crm-stack" aria-label="Решение по табелю" @submit.prevent="decide">
            <label>Действие с табелем<select v-model="action" class="crm-input" :disabled="saving||!!pending"><option v-for="value in detail.workflow.actions" :key="value" :value="value">{{sheetAction[value]}}</option></select></label>
            <p v-if="action==='REOPEN'" class="crm-inline-note">Предыдущая закрытая версия останется в истории. Новую версию потребуется проверить, утвердить и закрыть повторно.</p>
            <label>Комментарий решения<textarea v-model="reason" class="crm-input" rows="2" minlength="5" maxlength="1000" required :disabled="saving||!!pending" :placeholder="action==='REOPEN'?'Почему необходимо изменить закрытый месяц?':'Что проверено или на основании чего принято решение?'" /></label>
            <p v-if="actionError" role="alert">{{actionError}}</p>
            <button class="crm-button crm-button--primary" :disabled="saving||(!pending&&reason.trim().length<5)">{{saving?'Сохраняем…':pending?'Повторить отправку':sheetAction[action]}}</button>
          </form>
          <details v-if="detail.workflow.events?.length" class="crm-item-card crm-register"><summary>История решений · {{detail.workflow.events.length}}</summary><div class="crm-stack"><p class="crm-inline-note">Последние 100 решений. Закрытые версии доступны только для просмотра.</p><article v-for="event in detail.workflow.events" :key="event.revision" class="crm-item-card crm-register crm-stack"><strong>{{sheetEvent[event.action]}} · v{{event.edition}}</strong><small class="crm-inline-note">{{event.actorName}} · {{date(event.createdAt)}}</small><p>{{event.reason}}</p><button v-if="event.action==='CLOSE'&&target" class="crm-button" :disabled="saving||!!pending" @click="open(target.id,target.month,event.revision)">Просмотреть версию {{event.edition}}</button></article></div></details>
        </section>
        <p class="crm-inline-note">{{detail.timezone}} · {{detail.employee.department?.name||'Без отдела'}}. Ночные интервалы разделяются по датам отчёта. Плановый перерыв распределяется пропорционально, фактический — по отметкам. Это не расчёт зарплаты.</p>
        <div class="crm-summary-grid"><div><small>План</small><strong>{{duration(detail.plannedMs)}}</strong></div><div><small>Факт</small><strong>{{duration(detail.workedMs)}}</strong></div><div><small>Перерывы</small><strong>{{duration(detail.breakMs)}}</strong></div></div>
        <p v-if="detail.planWarning" role="status">{{detail.planWarning}}</p>
        <div v-if="detail.corrections.length" class="crm-stack"><h3>Исправления на проверке</h3><button v-for="(row,index) in detail.corrections" :key="row.id" class="crm-button" @click="correction(row.id)">Открыть исправление {{index+1}}{{row.stale?' · отметка уже изменена':''}}<ArrowRight :size="18" /></button></div>
        <h3>По дням</h3>
        <details v-for="day in detail.days" :key="day.date" class="crm-item-card crm-register">
          <summary>{{dayLabel(day.date)}} · План {{duration(day.plannedMs)}} · Факт {{duration(day.workedMs)}}</summary>
          <div class="crm-stack"><p class="crm-inline-note">Перерывы за эту дату: {{duration(day.breakMs)}}{{day.openSessions?' · Есть открытый интервал':''}}</p><p v-for="label in sheetIssueLabels(day.issues)" :key="label" class="crm-inline-note">{{label}}</p>
            <p v-if="!day.sessionIds.length" class="crm-inline-note">Фактических отметок нет.</p>
            <template v-for="id in day.sessionIds" :key="id"><div v-if="intervals.get(id)" class="crm-stack"><strong>Интервал: {{date(intervals.get(id)!.startedAt)}} — {{date(intervals.get(id)!.endedAt)}}</strong><small class="crm-inline-note">Пояс исходной отметки: {{intervals.get(id)!.timezone}}. Выше показаны границы всего интервала; в итог даты входит только её часть.</small><small v-for="(pause,index) in intervals.get(id)!.breaks" :key="index" class="crm-inline-note">Перерыв {{index+1}}: {{date(pause.startedAt)}} — {{date(pause.endedAt)}}</small></div></template>
          </div>
        </details>
      </template>
    </div>
    <footer class="crm-detail-footer"><button class="crm-button" :disabled="saving" @click="close">Закрыть</button><button v-if="target" class="crm-button crm-button--refresh" :disabled="detailLoading||saving||!!pending" @click="open(target.id,target.month)"><RefreshCw :size="18" />{{target.revision?'К текущей версии':'Обновить табель сотрудника'}}</button></footer>
  </section></div></Teleport>
</template>
