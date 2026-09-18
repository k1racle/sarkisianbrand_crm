<script setup lang="ts">
import { salonDay, salonInstant, salonMinute, shiftSalonDay } from '~/shared/salon-calendar';
const props = defineProps<{ bookings:any[]; members:any[]; day:string; mode:string; timeZone:string; busy:boolean;settings?:any }>();
const emit = defineEmits<{ create:[value:any]; edit:[booking:any]; move:[value:any] }>();
const master = ref('');
const moving = ref<any>(null);
const statuses:Record<string,string> = {NEW:'Новая',CONFIRMED:'Подтверждена',COMPLETED:'Завершена',CANCELLED:'Отменена',NO_SHOW:'Не пришёл'};
const name = (member:any) => [member.user?.firstName,member.user?.lastName].filter(Boolean).join(' ') || 'Сотрудник';
function fragment(b:any,day:string) {
  const startDay=salonDay(new Date(b.startTime),props.timeZone),endDay=salonDay(new Date(b.endTime),props.timeZone);
  const from=startDay<day?0:salonMinute(b.startTime,props.timeZone),to=endDay>day?1440:salonMinute(b.endTime,props.timeZone);
  return startDay<=day&&endDay>=day&&to>from?{from,to}:null;
}
const hours = computed(() => {
  const visits=props.bookings.filter(b=>!['CANCELLED','NO_SHOW'].includes(b.status));
  const days=props.mode==='week'?Array.from({length:7},(_,i)=>shiftSalonDay(props.day,i)):[props.day];
  const pieces=visits.flatMap(b=>days.map(day=>fragment(b,day)).filter(Boolean)) as {from:number;to:number}[];
  const workdays=days.flatMap(day=>{
    const weekday=new Date(`${day}T12:00:00Z`).getUTCDay();
    if(!props.settings?.workingDays?.includes(weekday))return [];
    const schedule=props.settings.weeklySchedule?.find((row:any)=>row.day===weekday)||props.settings;
    return [{from:schedule.startMinute,to:schedule.endMinute}];
  });
  const from = Math.min(8,...[...pieces,...workdays].map(p=>Math.floor(p.from/60)));
  const to = Math.min(24,Math.max(22,...[...pieces,...workdays].map(p=>Math.ceil(p.to/60))));
  return {from,to};
});
const slots = computed(()=>Array.from({length:(hours.value.to-hours.value.from)*4},(_,i)=>hours.value.from*60+i*15));
const columns = computed(()=>props.mode==='week' ? Array.from({length:7},(_,i)=>({id:shiftSalonDay(props.day,i),day:shiftSalonDay(props.day,i),master:master.value,label:new Date(`${shiftSalonDay(props.day,i)}T12:00:00Z`).toLocaleDateString('ru-RU',{weekday:'short',day:'numeric',month:'short',timeZone:'UTC'})})) : [...props.members.filter(m=>!master.value||m.id===master.value).map(m=>({id:m.id,day:props.day,master:m.id,label:name(m)})),...(!master.value?[{id:'unassigned',day:props.day,master:'',label:'Без мастера'}]:[])]);
const visible = (column:any) => props.bookings.filter(b=>!['CANCELLED','NO_SHOW'].includes(b.status) && fragment(b,column.day) && (props.mode==='week' ? !master.value||b.masterMemberId===master.value : (b.masterMemberId||'')===column.master));
const position = (b:any,day:string) => {
  const piece=fragment(b,day)!;
  const lanes = props.mode==='week'&&!master.value ? [...new Set(props.bookings.filter(x=>fragment(x,day)&&!['CANCELLED','NO_SHOW'].includes(x.status)).map(x=>x.masterMemberId||''))] : [b.masterMemberId||''];
  return {'--visit-top':`${(piece.from-hours.value.from*60)*1.6}px`,'--visit-height':`${Math.max(15,piece.to-piece.from)*1.6}px`,'--visit-color':b.service?.color,'--visit-left':`${lanes.indexOf(b.masterMemberId||'')*100/lanes.length}%`,'--visit-width':`${100/lanes.length}%`};
};
const time = (minute:number) => `${String(Math.floor(minute/60)).padStart(2,'0')}:${String(minute%60).padStart(2,'0')}`;
function create(column:any,minute:number) {
  const date=salonInstant(column.day,minute,props.timeZone);
  if(date&&!props.busy&&!unavailable(column,minute))emit('create',{startTime:date.toISOString(),masterMemberId:column.master});
}
function unavailable(column:any,minute:number,duration=15){
 if(!props.settings?.workingDays)return '';
 const day=new Date(`${column.day}T12:00:00Z`).getUTCDay();
 if(!props.settings.workingDays.includes(day))return 'Выходной';
 const row=props.settings.weeklySchedule?.find((d:any)=>d.day===day)||props.settings;
 if(minute<row.startMinute||minute+duration>row.endMinute)return 'Вне рабочего времени';
 if(row.breaks?.some((b:any)=>minute<b.endMinute&&minute+duration>b.startMinute))return 'Перерыв';
 return '';
}
const past=(column:any,minute:number)=>{const date=salonInstant(column.day,minute,props.timeZone);return !date||date.getTime()<Date.now();};
function drop(column:any,minute:number) {
  const booking=moving.value;moving.value=null;
  const date=salonInstant(column.day,minute,props.timeZone);
  const duration=booking ? (Date.parse(booking.endTime)-Date.parse(booking.startTime))/60000 : 15;
  if(booking&&date&&!props.busy&&!unavailable(column,minute,duration))emit('move',{booking,startTime:date.toISOString(),masterMemberId:props.mode==='week'&&!master.value?booking.masterMemberId:column.master||null});
}
</script>
<template>
  <section class="salon-calendar" aria-label="Календарь записи">
    <div class="salon-calendar-filter"><label>Мастер<select v-model="master" aria-label="Фильтр мастера"><option value="">Все мастера</option><option v-for="member in members" :key="member.id" :value="member.id">{{ name(member) }}</option></select></label><small>Время салона: {{ timeZone }} · шаг 15 минут</small></div>
    <div v-if="mode==='list' || mode==='month'" class="salon-agenda">
      <button v-for="booking in bookings" :key="booking.id" type="button" :disabled="busy" @click="emit('edit',booking)"><time>{{ new Date(booking.startTime).toLocaleString('ru-RU',{timeZone,day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}) }}</time><span><strong>{{ booking.client.firstName }} {{ booking.client.lastName }}</strong><small>{{ booking.service.name }}</small></span><span>{{ statuses[booking.status] }}</span></button><p v-if="!bookings.length">Записей за этот период нет.</p>
    </div>
    <div v-else class="salon-calendar-scroll" tabindex="0" aria-label="Расписание по времени, прокрутка по горизонтали">
      <div class="salon-calendar-grid" :style="{'--calendar-columns':columns.length,'--calendar-height':`${(hours.to-hours.from)*96}px`}">
        <div class="salon-calendar-corner">Время</div><div v-for="column in columns" :key="`head-${column.id}`" class="salon-calendar-heading">{{ column.label }}</div>
        <div class="salon-calendar-times"><span v-for="minute in slots.filter(x=>x%60===0)" :key="minute">{{ time(minute) }}</span></div>
        <div v-for="column in columns" :key="column.id" class="salon-calendar-column">
          <button v-for="minute in slots" :key="minute" class="salon-calendar-slot" :class="{'is-unavailable':unavailable(column,minute),'is-break':unavailable(column,minute)==='Перерыв'}" :title="unavailable(column,minute)||'Свободное время'" type="button" :disabled="busy||past(column,minute)||Boolean(unavailable(column,minute))" :aria-label="`Создать запись: ${column.label}, ${column.day}, ${time(minute)}`" @click="create(column,minute)" @dragover.prevent @drop.prevent="drop(column,minute)" />
          <button v-for="booking in visible(column)" :key="booking.id" :data-booking-id="booking.id" type="button" class="salon-calendar-visit" :class="`is-${booking.status.toLowerCase()}`" :style="position(booking,column.day)" :draggable="!busy&&['NEW','CONFIRMED'].includes(booking.status)" :disabled="busy" @dragstart="moving=booking; $event.dataTransfer?.setData('text/plain',booking.id)" @dragend="moving=null" @click="emit('edit',booking)">
            <time>{{ time(salonMinute(booking.startTime,timeZone)) }}–{{ time(salonMinute(booking.endTime,timeZone)) }}</time><strong>{{ booking.client.firstName }} {{ booking.client.lastName }}</strong><small>{{ booking.service.name }} · {{ statuses[booking.status] }}</small>
          </button>
        </div>
      </div>
    </div>
    <small class="salon-calendar-hint">Нажмите свободное время для записи, карточку — для редактирования. На компьютере запись можно перетащить; на телефоне перенести через карточку.</small>
  </section>
</template>
