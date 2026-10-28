<script setup lang="ts">
import { ChevronLeft, ChevronRight, Pencil, Search, Users, X } from '@lucide/vue';
type Client={id:string;firstName:string;lastName?:string;phone?:string;email?:string;tags?:string[];lastVisitAt?:string;totalVisits?:number;totalSpent?:number|string|null;consentPersonalDataAt?:string|null};
const props=defineProps<{clients:Client[];canSeeFinance:boolean;formatPrice:(value:any)=>string}>();
const emit=defineEmits<{edit:[client:Client];context:[event:MouseEvent,client:Client]}>();
const query=ref(''),tag=ref(''),sort=ref('recent'),page=ref(1);
const tags=computed(()=>[...new Set(props.clients.flatMap(item=>item.tags||[]))].sort((a,b)=>a.localeCompare(b,'ru')));
const name=(item:Client)=>[item.firstName,item.lastName].filter(Boolean).join(' ')||'Клиент';
const phone=(value:string)=>value.replace(/[^+\d]/g,'');
const filtered=computed(()=>{
  const needle=query.value.trim().toLocaleLowerCase('ru-RU'),digits=needle.replace(/\D/g,'');
  return props.clients.filter(item=>(!tag.value||item.tags?.includes(tag.value))&&(!needle||`${name(item)} ${item.phone||''} ${item.email||''} ${(item.tags||[]).join(' ')}`.toLocaleLowerCase('ru-RU').includes(needle)||(digits.length>=3&&Boolean(item.phone?.replace(/\D/g,'').includes(digits))))).sort((a,b)=>{
    if(sort.value==='name')return name(a).localeCompare(name(b),'ru');
    if(sort.value==='visits')return (b.totalVisits||0)-(a.totalVisits||0)||name(a).localeCompare(name(b),'ru');
    return (b.lastVisitAt?Date.parse(b.lastVisitAt):0)-(a.lastVisitAt?Date.parse(a.lastVisitAt):0)||name(a).localeCompare(name(b),'ru');
  });
});
const hasFilters=computed(()=>Boolean(query.value.trim()||tag.value));
const pageCount=computed(()=>Math.max(1,Math.ceil(filtered.value.length/25)));
const visible=computed(()=>filtered.value.slice((page.value-1)*25,page.value*25));
watch([query,tag,sort],()=>{page.value=1;});
watch(pageCount,value=>{page.value=Math.min(page.value,value);});
function reset(){query.value='';tag.value='';sort.value='recent';page.value=1;}
</script>
<template>
  <section class="salon-services-panel salon-clients-panel business-register-panel" aria-label="Клиенты салона">
    <div class="salon-services-filters">
      <label class="salon-services-search"><Search :size="18"/><input v-model="query" type="search" placeholder="Имя, телефон или email" aria-label="Поиск клиентов"/><button v-if="query" type="button" aria-label="Очистить поиск клиентов" @click="query=''"><X :size="16"/></button></label>
      <select v-model="tag" aria-label="Тег клиента"><option value="">Все теги</option><option v-for="value in tags" :key="value" :value="value">{{value}}</option></select>
      <select v-model="sort" aria-label="Сортировка клиентов"><option value="recent">Последние визиты</option><option value="name">По имени</option><option value="visits">Частые гости</option></select>
    </div>
    <div class="business-results-summary"><span role="status" aria-live="polite">{{hasFilters?`Найдено: ${filtered.length} из ${clients.length}`:`Всего клиентов: ${clients.length}`}}</span><button v-if="hasFilters" type="button" class="business-text-control" @click="reset">Сбросить фильтры<X :size="14"/></button></div>
    <table v-if="filtered.length" class="salon-services-table salon-clients-table" aria-label="Список клиентов">
      <thead><tr><th scope="col">Клиент</th><th scope="col">Контакты</th><th scope="col">Последний визит</th><th scope="col">Посещения</th><th v-if="canSeeFinance" scope="col" class="business-money-heading">Сумма услуг</th><th scope="col"><span class="salon-services-sr-only">Действия</span></th></tr></thead>
      <tbody><tr v-for="item in visible" :key="item.id" class="salon-service-row salon-client-row" @contextmenu.prevent="emit('context',$event,item)">
        <th scope="row" class="salon-service-info salon-client-info"><div><span class="salon-person-avatar" aria-hidden="true">{{name(item).slice(0,1).toUpperCase()}}</span><div><button type="button" class="b2b-edit-link" @click="emit('edit',item)">{{name(item)}}</button><div v-if="item.tags?.length" class="salon-client-tags"><small v-for="value in item.tags" :key="value">{{value}}</small></div></div></div></th>
        <td class="salon-person-contacts"><a v-if="item.phone" :href="`tel:${phone(item.phone)}`">{{item.phone}}</a><a v-if="item.email" :href="`mailto:${item.email}`">{{item.email}}</a><small v-if="!item.phone&&!item.email">Не указаны</small></td>
        <td class="salon-client-visit" data-label="Последний визит">{{item.lastVisitAt?new Date(item.lastVisitAt).toLocaleDateString('ru-RU'):'Ещё не был'}}</td>
        <td class="salon-client-visits" data-label="Посещения">{{item.totalVisits||0}}</td>
        <td v-if="canSeeFinance" class="salon-client-spent" data-label="Сумма услуг"><strong>{{formatPrice(item.totalSpent)}}</strong></td>
        <td class="salon-service-actions"><button type="button" :aria-label="`Редактировать ${name(item)}`" :title="`Редактировать ${name(item)}`" @click="emit('edit',item)"><Pencil :size="17"/></button></td>
      </tr></tbody>
    </table>
    <div v-else class="salon-services-empty"><Users :size="24"/><h3>{{clients.length?'Ничего не найдено':'Клиентов пока нет'}}</h3><p>{{clients.length?'Измените запрос или выбранный тег.':'Добавьте первого клиента кнопкой «Новый клиент» вверху страницы.'}}</p><button v-if="hasFilters" type="button" @click="reset">Сбросить фильтры</button></div>
    <footer v-if="pageCount>1" class="salon-services-total"><small>Показаны {{(page-1)*25+1}}–{{Math.min(page*25,filtered.length)}} из {{filtered.length}}</small><nav class="business-pagination" aria-label="Страницы клиентов"><button type="button" :disabled="page===1" aria-label="Предыдущая страница клиентов" @click="page--"><ChevronLeft :size="17"/></button><span aria-live="polite">{{page}} из {{pageCount}}</span><button type="button" :disabled="page===pageCount" aria-label="Следующая страница клиентов" @click="page++"><ChevronRight :size="17"/></button></nav></footer>
  </section>
</template>
