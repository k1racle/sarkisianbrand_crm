<script setup lang="ts">
import { History, RefreshCw } from '@lucide/vue';
const props=defineProps<{bookingId:string;timeZone:string;members:any[]}>();
const session=useB2BSession(),rows=ref<any[]>([]),busy=ref(false),error=ref('');
let controller:AbortController|undefined;
const actions:Record<string,string>={CREATED:'Запись создана',MOVED:'Запись перенесена',STATUS_CHANGED:'Статус изменён',COMPLETED:'Визит завершён',UPDATED:'Комментарий изменён',BASELINE:'Состояние при обновлении системы'};
const statuses:Record<string,string>={NEW:'Новая',CONFIRMED:'Подтверждена',COMPLETED:'Завершена',CANCELLED:'Отменена',NO_SHOW:'Не пришёл'};
const date=(value:string)=>new Date(value).toLocaleString('ru-RU',{timeZone:props.timeZone,day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
const master=(id:string|null)=>{const member=props.members.find(item=>item.id===id);return id?(member?[member.user?.firstName,member.user?.lastName].filter(Boolean).join(' ')||'Мастер':'Мастер отключён'):'Не назначен';};
function changes(row:any){
 const before=row.before,after=row.after,result:string[]=[];
 if(!before){result.push(`${date(after.startTime)} · ${statuses[after.status]||after.status}`);if(after.priceSnapshot!==null&&after.priceSnapshot!==undefined)result.push(`Стоимость визита: ${new Intl.NumberFormat('ru-RU',{style:'currency',currency:'RUB'}).format(Number(after.priceSnapshot))}`);return result;}
 if(before.startTime!==after.startTime)result.push(`Время: ${date(before.startTime)} → ${date(after.startTime)}`);
 if(before.masterMemberId!==after.masterMemberId)result.push(`Мастер: ${master(before.masterMemberId)} → ${master(after.masterMemberId)}`);
 if(before.status!==after.status)result.push(`Статус: ${statuses[before.status]||before.status} → ${statuses[after.status]||after.status}`);
 if(before.notes!==after.notes)result.push(after.notes?`Комментарий: ${after.notes}`:'Комментарий удалён');
 return result;
}
async function load(){controller?.abort();const current=new AbortController();controller=current;busy.value=true;error.value='';try{const result=await session.request<any[]>(`/b2b/bookings/${props.bookingId}/history`,{signal:current.signal,timeout:20000});if(controller===current)rows.value=result;}catch(e:any){if(!current.signal.aborted)error.value=typeof e.data?.message==='string'?e.data.message:'Не удалось загрузить историю записи.';}finally{if(controller===current)busy.value=false;}}
watch(()=>props.bookingId,()=>{rows.value=[];load();},{immediate:true});onBeforeUnmount(()=>controller?.abort());
</script>
<template>
 <section class="salon-booking-history" aria-label="История записи">
  <header><h3><History :size="18"/>История записи</h3><button type="button" :disabled="busy" aria-label="Обновить историю записи" @click="load"><RefreshCw :size="16"/></button></header>
  <p v-if="busy" role="status">Загружаем историю…</p><p v-else-if="error" role="alert">{{error}}</p><p v-else-if="!rows.length">Изменений пока нет.</p>
  <ol v-else><li v-for="row in rows" :key="row.id"><strong>{{actions[row.action]||'Запись изменена'}}</strong><small>{{row.actorLabel}} · {{date(row.createdAt)}}</small><p v-for="line in changes(row)" :key="line">{{line}}</p></li></ol>
 </section>
</template>
