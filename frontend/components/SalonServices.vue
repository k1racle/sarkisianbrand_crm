<script setup lang="ts">
import { ChevronLeft, ChevronRight, Clock3, Pencil, Search, Scissors, X } from '@lucide/vue';
type Service = { id:string;name:string;description?:string;price:number|string;duration:number;isActive:boolean;color?:string };
const props=defineProps<{services:Service[];formatPrice:(value:any)=>string}>();
const emit=defineEmits<{edit:[service:Service]}>();
const query=ref(''),availability=ref('all'),sort=ref('name'),page=ref(1);
const filtered=computed(()=>{
  const needle=query.value.trim().toLocaleLowerCase('ru-RU');
  return props.services.filter(item=>(availability.value==='all'||item.isActive===(availability.value==='active'))&&(!needle||`${item.name} ${item.description||''}`.toLocaleLowerCase('ru-RU').includes(needle))).sort((a,b)=>{
    if(sort.value==='price')return Number(a.price)-Number(b.price)||a.name.localeCompare(b.name,'ru');
    if(sort.value==='duration')return a.duration-b.duration||a.name.localeCompare(b.name,'ru');
    return a.name.localeCompare(b.name,'ru');
  });
});
const hasFilters=computed(()=>Boolean(query.value.trim())||availability.value!=='all');
const pageCount=computed(()=>Math.max(1,Math.ceil(filtered.value.length/25)));
const visible=computed(()=>filtered.value.slice((page.value-1)*25,page.value*25));
watch([query,availability,sort],()=>{page.value=1;});
watch(pageCount,value=>{page.value=Math.min(page.value,value);});
function reset(){query.value='';availability.value='all';sort.value='name';page.value=1;}
</script>
<template>
  <section class="salon-services-panel business-register-panel" aria-label="Услуги салона">
    <div class="salon-services-filters">
      <label class="salon-services-search"><Search :size="18"/><input v-model="query" type="search" placeholder="Название или описание услуги" aria-label="Поиск услуг"/><button v-if="query" type="button" aria-label="Очистить поиск услуг" @click="query=''"><X :size="16"/></button></label>
      <select v-model="availability" aria-label="Доступность услуг"><option value="all">Все услуги</option><option value="active">Доступные</option><option value="inactive">Выключенные</option></select>
      <select v-model="sort" aria-label="Сортировка услуг"><option value="name">По названию</option><option value="price">Сначала дешевле</option><option value="duration">Сначала короче</option></select>
    </div>
    <div class="business-results-summary"><span role="status" aria-live="polite">{{hasFilters?`Найдено: ${filtered.length} из ${services.length}`:`Услуг: ${services.length} · Доступно для записи: ${services.filter(service=>service.isActive).length}`}}</span><button v-if="hasFilters" type="button" class="business-text-control" @click="reset">Сбросить фильтры<X :size="14"/></button></div>
    <table v-if="filtered.length" class="salon-services-table" aria-label="Список услуг">
      <thead><tr><th scope="col">Услуга</th><th scope="col" class="business-money-heading">Цена</th><th scope="col">Длительность</th><th scope="col">Доступность</th><th scope="col"><span class="salon-services-sr-only">Действия</span></th></tr></thead>
      <tbody><tr v-for="item in visible" :key="item.id" class="salon-service-row">
        <th scope="row" class="salon-service-info"><div><span class="salon-service-color" :style="{'--service-color':item.color||'var(--ui-accent)'}" aria-hidden="true"/><div><button type="button" class="b2b-edit-link" @click="emit('edit',item)">{{item.name}}</button><p v-if="item.description">{{item.description}}</p></div></div></th>
        <td class="salon-service-price" data-label="Цена"><strong>{{formatPrice(item.price)}}</strong></td>
        <td class="salon-service-duration" data-label="Длительность"><span><Clock3 :size="14"/>{{item.duration}} мин.</span></td>
        <td class="salon-service-availability"><span class="salon-service-status" :class="{'is-active':item.isActive}"><i aria-hidden="true"/>{{item.isActive?'Доступна':'Выключена'}}</span></td>
        <td class="salon-service-actions"><button type="button" :aria-label="`Редактировать ${item.name}`" :title="`Редактировать ${item.name}`" @click="emit('edit',item)"><Pencil :size="17"/></button></td>
      </tr></tbody>
    </table>
    <div v-else class="salon-services-empty"><Scissors :size="24"/><h3>{{services.length?'Ничего не найдено':'Услуг пока нет'}}</h3><p>{{services.length?'Измените запрос или доступность услуг.':'Добавьте первую услугу кнопкой «Новая услуга» вверху страницы.'}}</p><button v-if="hasFilters" type="button" @click="reset">Сбросить фильтры</button></div>
    <footer v-if="pageCount>1" class="salon-services-total"><small>Показаны {{(page-1)*25+1}}–{{Math.min(page*25,filtered.length)}} из {{filtered.length}}</small><nav class="business-pagination" aria-label="Страницы услуг"><button type="button" :disabled="page===1" aria-label="Предыдущая страница услуг" @click="page--"><ChevronLeft :size="17"/></button><span aria-live="polite">{{page}} из {{pageCount}}</span><button type="button" :disabled="page===pageCount" aria-label="Следующая страница услуг" @click="page++"><ChevronRight :size="17"/></button></nav></footer>
  </section>
</template>
