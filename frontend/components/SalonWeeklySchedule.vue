<script setup lang="ts">
import { Plus, Trash2 } from '@lucide/vue';
type Pause={startMinute:number;endMinute:number};type Day={day:number;startMinute:number;endMinute:number;breaks:Pause[]};
const props=defineProps<{modelValue?:Day[];workingDays:number[];startMinute:number;endMinute:number}>();
const emit=defineEmits<{ 'update:modelValue':[value:Day[]] }>();
const days=[{id:1,label:'Понедельник'},{id:2,label:'Вторник'},{id:3,label:'Среда'},{id:4,label:'Четверг'},{id:5,label:'Пятница'},{id:6,label:'Суббота'},{id:0,label:'Воскресенье'}];
const schedule=(day:number):Day=>props.modelValue?.find(d=>d.day===day)||{day,startMinute:props.startMinute,endMinute:props.endMinute,breaks:[]};
const time=(minute:number)=>`${String(Math.floor(minute/60)%24).padStart(2,'0')}:${String(minute%60).padStart(2,'0')}`;
const minute=(event:Event,end=false)=>{const [h,m]=(event.target as HTMLInputElement).value.split(':').map(Number);return end&&h===0&&m===0?1440:h*60+m;};
function change(day:number,edit:(value:Day)=>void){const value=JSON.parse(JSON.stringify(schedule(day)));edit(value);emit('update:modelValue',[...(props.modelValue||[]).filter(d=>d.day!==day),value]);}
function add(day:number){change(day,value=>{const start=Math.min(Math.max(value.startMinute,780),value.endMinute-30);value.breaks.push({startMinute:start,endMinute:start+30});});}
</script>
<template>
 <section class="salon-weekly-schedule" aria-label="График по дням и перерывы"><header class="salon-settings-group-title"><h3>Часы по дням и перерывы</h3></header><small>По умолчанию действует общий график. Разверните день, чтобы изменить часы или добавить перерыв.</small>
  <details v-for="day in days.filter(d=>workingDays.includes(d.id))" :key="day.id" class="salon-day-schedule"><summary><strong>{{day.label}}</strong><span>{{time(schedule(day.id).startMinute)}}–{{time(schedule(day.id).endMinute)}}<small v-if="schedule(day.id).breaks.length"> · {{schedule(day.id).breaks.length}} перерыв</small></span></summary><div class="salon-day-schedule-fields"><label>Начало<input type="time" required :value="time(schedule(day.id).startMinute)" :aria-label="`Начало: ${day.label}`" @change="change(day.id,d=>d.startMinute=minute($event))"/></label><label>Окончание<input type="time" required :value="time(schedule(day.id).endMinute)" :aria-label="`Окончание: ${day.label}`" @change="change(day.id,d=>d.endMinute=minute($event,true))"/></label></div><div v-for="(pause,i) in schedule(day.id).breaks" :key="i" class="salon-day-break"><label>Перерыв с<input type="time" required :value="time(pause.startMinute)" :aria-label="`Перерыв с: ${day.label} ${i+1}`" @change="change(day.id,d=>d.breaks[i].startMinute=minute($event))"/></label><label>До<input type="time" required :value="time(pause.endMinute)" :aria-label="`Перерыв до: ${day.label} ${i+1}`" @change="change(day.id,d=>d.breaks[i].endMinute=minute($event,true))"/></label><button type="button" :aria-label="`Удалить перерыв: ${day.label} ${i+1}`" @click="change(day.id,d=>d.breaks.splice(i,1))"><Trash2 :size="16"/></button></div><button v-if="schedule(day.id).breaks.length<4" type="button" :aria-label="`Добавить перерыв: ${day.label}`" @click="add(day.id)"><Plus :size="16"/>Добавить перерыв</button></details>
 </section>
</template>
