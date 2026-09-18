<script setup lang="ts">
import { Clock3, Pencil, Search, Scissors, X } from '@lucide/vue';
type Service = { id:string;name:string;description?:string;price:number|string;duration:number;isActive:boolean;color?:string };
const props=defineProps<{services:Service[];formatPrice:(value:any)=>string}>();
const emit=defineEmits<{edit:[service:Service]}>();
const query=ref(''),availability=ref('all'),sort=ref('name');
const filtered=computed(()=>{
  const needle=query.value.trim().toLocaleLowerCase('ru-RU');
  return props.services.filter(item=>(availability.value==='all'||item.isActive===(availability.value==='active'))&&(!needle||`${item.name} ${item.description||''}`.toLocaleLowerCase('ru-RU').includes(needle))).sort((a,b)=>{
    if(sort.value==='price')return Number(a.price)-Number(b.price)||a.name.localeCompare(b.name,'ru');
    if(sort.value==='duration')return a.duration-b.duration||a.name.localeCompare(b.name,'ru');
    return a.name.localeCompare(b.name,'ru');
  });
});
const hasFilters=computed(()=>Boolean(query.value.trim())||availability.value!=='all');
function reset(){query.value='';availability.value='all';sort.value='name';}
</script>
<template>
  <section class="salon-services-panel" aria-label="Услуги салона">
    <div class="salon-services-filters">
      <label class="salon-services-search"><Search :size="18"/><input v-model="query" type="search" placeholder="Название или описание услуги" aria-label="Поиск услуг"/><button v-if="query" type="button" aria-label="Очистить поиск услуг" @click="query=''"><X :size="16"/></button></label>
      <select v-model="availability" aria-label="Доступность услуг"><option value="all">Все услуги</option><option value="active">Доступные</option><option value="inactive">Выключенные</option></select>
      <select v-model="sort" aria-label="Сортировка услуг"><option value="name">По названию</option><option value="price">Сначала дешевле</option><option value="duration">Сначала короче</option></select>
    </div>
    <table v-if="filtered.length" class="salon-services-table" aria-label="Список услуг">
      <thead><tr><th scope="col">Услуга</th><th scope="col">Цена</th><th scope="col">Длительность</th><th scope="col">Доступность</th><th scope="col"><span class="salon-services-sr-only">Действия</span></th></tr></thead>
      <tbody><tr v-for="item in filtered" :key="item.id" class="salon-service-row">
        <th scope="row" class="salon-service-info"><div><span class="salon-service-color" :style="{'--service-color':item.color||'var(--ui-accent)'}" aria-hidden="true"/><div><button type="button" class="b2b-edit-link" @click="emit('edit',item)">{{item.name}}</button><p v-if="item.description">{{item.description}}</p></div></div></th>
        <td class="salon-service-price" data-label="Цена"><strong>{{formatPrice(item.price)}}</strong></td>
        <td class="salon-service-duration" data-label="Длительность"><span><Clock3 :size="14"/>{{item.duration}} мин.</span></td>
        <td class="salon-service-availability"><span class="salon-service-status" :class="{'is-active':item.isActive}"><i aria-hidden="true"/>{{item.isActive?'Доступна':'Выключена'}}</span></td>
        <td class="salon-service-actions"><button type="button" :aria-label="`Редактировать ${item.name}`" :title="`Редактировать ${item.name}`" @click="emit('edit',item)"><Pencil :size="17"/></button></td>
      </tr></tbody>
    </table>
    <div v-else class="salon-services-empty"><Scissors :size="24"/><h3>{{services.length?'Ничего не найдено':'Услуг пока нет'}}</h3><p>{{services.length?'Измените запрос или доступность услуг.':'Добавьте первую услугу кнопкой «Новая услуга» вверху страницы.'}}</p><button v-if="hasFilters" type="button" @click="reset">Сбросить фильтры</button></div>
    <footer v-if="services.length" class="salon-services-total"><small>{{hasFilters?`Найдено: ${filtered.length} из ${services.length}`:`Всего услуг: ${services.length}`}}</small><button v-if="hasFilters&&filtered.length" type="button" @click="reset">Сбросить фильтры</button></footer>
  </section>
</template>
