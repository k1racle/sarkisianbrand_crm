<script setup lang="ts">
import { Save, UserRound } from '@lucide/vue';
const props=defineProps<{profile:any;area:string}>();
const config=useRuntimeConfig(),session=useB2BSession(),{openProfile}=useUserProfilePanel();
const draft=reactive({name:props.profile.name||'',legalName:props.profile.legalName||'',legalAddress:props.profile.legalAddress||''});
const baseline=ref(JSON.stringify(draft)),busy=ref(false),error=ref(''),notice=ref('');
const canEdit=computed(()=>props.profile.membership?.role==='OWNER'),dirty=computed(()=>baseline.value!==JSON.stringify(draft));
const presentationPanel=ref<any>(null),schedulePanel=ref<any>(null);
async function refresh(){if(busy.value||!leave())return;busy.value=true;error.value='';try{const value=await session.request<any>('/b2b/profile');Object.assign(draft,{name:value.name||'',legalName:value.legalName||'',legalAddress:value.legalAddress||''});baseline.value=JSON.stringify(draft);}catch{error.value='Не удалось обновить данные компании.';}finally{busy.value=false;}await presentationPanel.value?.refresh();await schedulePanel.value?.refresh();}
defineExpose({refresh});
async function save(){if(busy.value||!canEdit.value)return;busy.value=true;error.value='';try{await session.request('/b2b/company-settings',{method:'PATCH',body:draft});baseline.value=JSON.stringify(draft);notice.value='Данные компании сохранены';}catch(e:any){error.value=typeof e.data?.message==='string'?e.data.message:'Не удалось сохранить данные компании.';}finally{busy.value=false;}}
function leave(){return !busy.value&&(!dirty.value||window.confirm('Данные компании не сохранены. Покинуть раздел?'));}
function jumpToSettings(event:MouseEvent){const link=event.currentTarget as HTMLAnchorElement;const target=document.getElementById(link.hash.slice(1));if(target){target.setAttribute('tabindex','-1');target.focus({preventScroll:true});target.scrollIntoView({block:'start'});}}
onBeforeRouteLeave(leave);onBeforeRouteUpdate(leave);
</script>
<template>
 <div class="business-settings">
  <nav class="business-settings-jumps" aria-label="Разделы настроек"><a href="#business-company" @click.prevent="jumpToSettings">Организация</a><a href="#business-personal" @click.prevent="jumpToSettings">Мой профиль</a><template v-if="area==='salon'"><a href="#business-presentation" @click.prevent="jumpToSettings">Страница салона</a><a href="#business-schedule" @click.prevent="jumpToSettings">Расписание</a></template></nav>
  <form id="business-company" class="salon-settings-panel business-company-settings" @submit.prevent="save"><header class="salon-settings-heading"><h2>Данные организации</h2><small>ИНН, статус, скидки и финансовые условия изменяются через вашего менеджера.</small></header><p v-if="error" role="alert">{{error}}</p><fieldset class="ui-fieldset-reset" :disabled="busy||!canEdit"><div class="salon-settings-fields"><label>Название компании<input v-model="draft.name" required maxlength="120"/></label><label>Юридическое название<input v-model="draft.legalName" maxlength="250"/></label><label class="salon-settings-wide">Юридический адрес<input v-model="draft.legalAddress" maxlength="500"/></label><label>ИНН<input :value="profile.inn||'Не указан'" readonly/></label><label>КПП<input :value="profile.kpp||'Не указан'" readonly/></label></div></fieldset><footer class="salon-settings-save"><span role="status">{{notice||(dirty?'Есть несохранённые изменения':'Все изменения сохранены')}}</span><button v-if="canEdit" class="primary" type="submit" :disabled="busy||!dirty"><Save :size="16"/>Сохранить компанию</button><small v-else>Изменять данные может владелец.</small></footer></form>
  <section id="business-personal" class="salon-settings-panel business-personal-settings"><div><h2>Личная учётная запись</h2><p>Имя, контакты, пароль и уведомления вашего профиля.</p></div><button type="button" @click="openProfile"><UserRound :size="16"/>Открыть мой профиль</button></section>
  <template v-if="area==='salon'"><div id="business-presentation"><SalonPresentationSettings ref="presentationPanel" :profile="profile"/></div><div id="business-schedule"><SalonOnlineBookingSettings ref="schedulePanel" :profile="profile" schedule-only/></div></template>
 </div>
</template>
