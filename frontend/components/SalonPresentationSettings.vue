<script setup lang="ts">
import { ImagePlus, Plus, Save, Trash2 } from '@lucide/vue';
const props=defineProps<{profile:any}>();
const config=useRuntimeConfig(),session=useB2BSession(),branding=useState<any>('salon-branding',()=>null);
const draft=reactive({displayName:'',address:'',phones:[] as string[],emails:[] as string[],socialLinks:[] as {label:string;url:string}[]});
const loading=ref(true),busy=ref(false),error=ref(''),notice=ref(''),baseline=ref(''),logo=ref('');
const canEdit=computed(()=>props.profile.membership?.role==='OWNER');
const dirty=computed(()=>!!baseline.value&&JSON.stringify(draft)!==baseline.value);
const logoSrc=computed(()=>logo.value?new URL(logo.value,config.public.apiBase).toString():'');
const request=(path:string,options:any={})=>$fetch<any>(path,{baseURL:config.public.apiBase,headers:{Authorization:`Bearer ${session.token.value}`},...options});
function apply(value:any){for(const key of Object.keys(draft) as (keyof typeof draft)[])if(value[key]!==undefined)(draft as any)[key]=value[key];logo.value=value.logoUrl||'';branding.value=value;baseline.value=JSON.stringify(draft);}
async function load(){loading.value=true;error.value='';try{apply(await request('/b2b/salon-presentation'));}catch{error.value='Не удалось загрузить оформление салона.';}finally{loading.value=false;}}
async function save(){if(busy.value||!canEdit.value)return;busy.value=true;error.value='';notice.value='';try{apply(await request('/b2b/salon-presentation',{method:'PATCH',body:draft}));notice.value='Оформление сохранено';}catch(e:any){error.value=typeof e.data?.message==='string'?e.data.message:'Проверьте контакты и ссылки. Не удалось сохранить оформление.';}finally{busy.value=false;}}
async function upload(event:Event){const input=event.target as HTMLInputElement,file=input.files?.[0];input.value='';if(!file||busy.value||!canEdit.value)return;if(file.size>3*1024*1024||!['image/png','image/jpeg','image/webp'].includes(file.type)){error.value='Выберите PNG, JPG или WEBP до 3 МБ';return;}busy.value=true;error.value='';try{const body=new FormData();body.append('file',file);const value=await request('/b2b/salon-logo',{method:'POST',body});logo.value=value.logoUrl;branding.value={...branding.value,...value};notice.value='Логотип обновлён';}catch{error.value='Не удалось загрузить логотип.';}finally{busy.value=false;}}
async function removeLogo(){if(busy.value||!canEdit.value)return;busy.value=true;error.value='';try{await request('/b2b/salon-logo',{method:'DELETE'});logo.value='';branding.value={...branding.value,logoUrl:null};notice.value='Логотип удалён';}catch{error.value='Не удалось удалить логотип.';}finally{busy.value=false;}}
function leave(){return !busy.value&&(!dirty.value||window.confirm('Оформление салона не сохранено. Покинуть раздел?'));}
async function refresh(){if(busy.value||loading.value)return;if(dirty.value&&!window.confirm('Отменить несохранённое оформление?'))return;await load();}
defineExpose({refresh});
onBeforeRouteLeave(leave);onBeforeRouteUpdate(leave);onMounted(load);
</script>
<template>
 <form class="salon-settings-panel salon-presentation-settings" aria-label="Оформление салона" @submit.prevent="save">
  <header class="salon-settings-heading"><h2>Ваш салон: оформление и контакты</h2><small>Общие данные для кабинета, страницы и виджета записи. Часы работы задаются в расписании выше.</small></header>
  <p v-if="error" role="alert">{{error}} <button v-if="!baseline" type="button" @click="load">Повторить</button></p><p v-if="loading" role="status">Загружаем оформление…</p>
  <fieldset v-else-if="baseline" class="ui-fieldset-reset" :disabled="busy||!canEdit">
   <div class="salon-logo-editor"><div class="salon-logo-preview"><img v-if="logoSrc" :src="logoSrc" alt="Логотип салона"/><ImagePlus v-else :size="28"/></div><div><strong>Логотип салона</strong><small>PNG, JPG или WEBP · до 3 МБ. Изображение сохраняется сразу.</small><div class="salon-logo-actions"><label class="salon-upload-control">Загрузить логотип<input type="file" accept="image/png,image/jpeg,image/webp" aria-label="Загрузить логотип салона" @change="upload"/></label><button v-if="logo" type="button" aria-label="Удалить логотип салона" @click="removeLogo"><Trash2 :size="16"/></button></div></div></div>
   <div class="salon-settings-fields"><label>Название для клиентов<input v-model="draft.displayName" maxlength="120" :placeholder="profile.name" aria-label="Название салона для клиентов"/></label><label>Адрес салона<input v-model="draft.address" maxlength="500" placeholder="Город, улица, дом" aria-label="Адрес салона"/></label></div>
   <div class="salon-contact-columns"><section v-for="kind in (['phones','emails'] as const)" :key="kind" class="salon-settings-group"><h3>{{kind==='phones'?'Телефоны':'Электронная почта'}}</h3><div v-for="(_,i) in draft[kind]" :key="i" class="salon-contact-row"><input v-model="draft[kind][i]" :type="kind==='phones'?'tel':'email'" required :maxlength="kind==='phones'?40:254" :aria-label="`${kind==='phones'?'Телефон':'Email'} салона ${i+1}`"/><button type="button" :aria-label="`Удалить ${kind==='phones'?'телефон':'email'} ${i+1}`" @click="draft[kind].splice(i,1)"><Trash2 :size="16"/></button></div><button v-if="draft[kind].length<5" type="button" @click="draft[kind].push('')"><Plus :size="16"/>{{kind==='phones'?'Добавить телефон':'Добавить email'}}</button></section></div>
   <section class="salon-settings-group"><h3>Социальные сети</h3><div v-for="(link,i) in draft.socialLinks" :key="i" class="salon-contact-row salon-social-row"><input v-model="link.label" maxlength="40" required placeholder="Название" :aria-label="`Название соцсети ${i+1}`"/><input v-model="link.url" type="url" pattern="https://.*" maxlength="500" required placeholder="https://…" :aria-label="`Ссылка соцсети ${i+1}`"/><button type="button" :aria-label="`Удалить соцсеть ${i+1}`" @click="draft.socialLinks.splice(i,1)"><Trash2 :size="16"/></button></div><button v-if="draft.socialLinks.length<8" type="button" @click="draft.socialLinks.push({label:'',url:''})"><Plus :size="16"/>Добавить соцсеть</button></section>
  </fieldset>
  <footer v-if="baseline" class="salon-settings-save"><span role="status">{{notice||(dirty?'Есть несохранённые изменения':'Все изменения сохранены')}}</span><button v-if="canEdit" type="submit" class="primary" :disabled="busy||!dirty"><Save :size="16"/>Сохранить оформление</button><small v-else>Изменять оформление может владелец.</small></footer>
 </form>
</template>
