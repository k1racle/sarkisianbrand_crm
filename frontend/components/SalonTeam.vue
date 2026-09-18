<script setup lang="ts">
import { Search, Users, X } from '@lucide/vue';
const props=defineProps<{profile:any}>();
const query=ref(''),role=ref('');
const roles:Record<string,string>={OWNER:'Владелец',EMPLOYEE:'Сотрудник',BUYER:'Закупщик',ACCOUNTANT:'Бухгалтер'};
const name=(item:any)=>[item.user.firstName,item.user.lastName].filter(Boolean).join(' ')||item.user.email||'Сотрудник';
const filtered=computed(()=>(props.profile.members||[]).filter((item:any)=>(!role.value||item.role===role.value)&&`${name(item)} ${item.user.email||''} ${item.user.phone||''}`.toLocaleLowerCase('ru-RU').includes(query.value.trim().toLocaleLowerCase('ru-RU'))));
function access(item:any){return [(['OWNER','EMPLOYEE'].includes(item.role)?'Запись и клиенты':null),item.canOrder?'Закупки':null,item.canSeeFinance?'Финансы':null,item.role==='OWNER'?'Настройки салона':null].filter(Boolean);}
function reset(){query.value='';role.value='';}
</script>
<template>
  <section class="salon-services-panel salon-team-panel" aria-label="Команда салона">
    <div class="salon-services-filters salon-team-filters"><label class="salon-services-search"><Search :size="18"/><input v-model="query" type="search" placeholder="Имя, email или телефон" aria-label="Поиск сотрудников"/><button v-if="query" type="button" aria-label="Очистить поиск сотрудников" @click="query=''"><X :size="16"/></button></label><select v-model="role" aria-label="Роль сотрудника"><option value="">Все роли</option><option v-for="(label,value) in roles" :key="value" :value="value">{{label}}</option></select></div>
    <table v-if="filtered.length" class="salon-services-table salon-team-table" aria-label="Список сотрудников"><thead><tr><th scope="col">Сотрудник</th><th scope="col">Контакты</th><th scope="col">Роль</th><th scope="col">Доступы</th></tr></thead><tbody><tr v-for="item in filtered" :key="item.id" class="salon-service-row salon-team-row"><th scope="row" class="salon-service-info"><div><span class="salon-person-avatar" aria-hidden="true">{{name(item).slice(0,1).toUpperCase()}}</span><strong>{{name(item)}}</strong></div></th><td class="salon-person-contacts"><a v-if="item.user.email" :href="`mailto:${item.user.email}`">{{item.user.email}}</a><a v-if="item.user.phone" :href="`tel:${item.user.phone.replace(/[^+\d]/g,'')}`">{{item.user.phone}}</a><small v-if="!item.user.email&&!item.user.phone">Не указаны</small></td><td class="salon-team-role"><span class="salon-service-status" :class="{'is-owner':item.role==='OWNER'}">{{roles[item.role]||item.role}}</span></td><td class="salon-team-access"><div class="salon-client-tags"><small v-for="label in access(item)" :key="label">{{label}}</small><small v-if="!access(item).length">Нет расширенных доступов</small></div></td></tr></tbody></table>
    <div v-else class="salon-services-empty"><Users :size="24"/><h3>{{profile.members?.length?'Ничего не найдено':'Команда пока пуста'}}</h3><p v-if="profile.members?.length">Измените запрос или роль сотрудника.</p><button v-if="query||role" type="button" @click="reset">Сбросить фильтры</button></div>
    <footer v-if="profile.members?.length" class="salon-services-total"><small>Сотрудников: {{filtered.length}} из {{profile.members.length}}</small><button v-if="(query||role)&&filtered.length" type="button" @click="reset">Сбросить фильтры</button></footer>
  </section>
</template>
