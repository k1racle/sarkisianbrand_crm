<script setup lang="ts">
import { RefreshCw, Save } from '@lucide/vue';
useHead({meta:[{name:'robots',content:'noindex, nofollow'}]});
const config=useRuntimeConfig(),session=useWorkspaceSession();
const draft=reactive({name:'Кабинет салона',monthlyPrice:0,annualPrice:0,freeAccess:true});
const loading=ref(true),busy=ref(false),error=ref(''),notice=ref(''),baseline=ref('');
const dirty=computed(()=>!!baseline.value&&baseline.value!==JSON.stringify(draft));
const request=(options:any={})=>$fetch<any>('/admin/salon-subscription',{baseURL:config.public.apiBase,headers:{Authorization:`Bearer ${session.token.value}`},...options});
async function load(){if(busy.value)return;if(dirty.value&&!window.confirm('Отменить несохранённые настройки?'))return;loading.value=true;error.value='';try{const value=await request();Object.assign(draft,{name:value.name,monthlyPrice:Number(value.monthlyPrice),annualPrice:Number(value.annualPrice),freeAccess:value.freeAccess});baseline.value=JSON.stringify(draft);}catch{error.value='Не удалось загрузить настройки подписки.';}finally{loading.value=false;}}
async function save(){if(busy.value)return;busy.value=true;error.value='';try{await request({method:'PATCH',body:draft});baseline.value=JSON.stringify(draft);notice.value='Настройки сохранены';}catch{error.value='Не удалось сохранить настройки подписки.';}finally{busy.value=false;}}
function leave(){return !busy.value&&(!dirty.value||window.confirm('Настройки подписки не сохранены. Покинуть страницу?'));}
onBeforeRouteLeave(leave);onBeforeRouteUpdate(leave);onMounted(load);
</script>
<template>
 <main class="salon-subscription-page"><header><h1>Подписка для салонов</h1><button type="button" :disabled="loading||busy" @click="load"><RefreshCw :size="18"/>Обновить</button></header>
  <p v-if="error" role="alert">{{error}}</p><p v-if="loading" role="status">Загружаем настройки…</p>
  <form v-else-if="baseline" class="salon-settings-panel" @submit.prevent="save"><h2>Тариф кабинета и онлайн-записи</h2><p>Сейчас функции доступны всем салонам бесплатно. Цены и режим ниже — подготовка будущей подписки: платежи, списания и блокировка доступа не активированы.</p><fieldset class="ui-fieldset-reset" :disabled="busy"><div class="salon-settings-fields"><label class="salon-settings-wide">Название тарифа<input v-model="draft.name" maxlength="100" required/></label><label>Цена за месяц, ₽<input v-model.number="draft.monthlyPrice" type="number" min="0" max="1000000" step="0.01" required/></label><label>Цена за год, ₽<input v-model.number="draft.annualPrice" type="number" min="0" max="10000000" step="0.01" required/></label></div><label class="salon-subscription-switch"><input v-model="draft.freeAccess" type="checkbox"/>Бесплатный режим тарифа</label></fieldset><footer class="salon-settings-save"><span role="status">{{notice||(dirty?'Есть несохранённые изменения':'Все изменения сохранены')}}</span><button type="submit" :disabled="busy||!dirty"><Save :size="18"/>Сохранить тариф</button></footer></form>
 </main>
</template>
