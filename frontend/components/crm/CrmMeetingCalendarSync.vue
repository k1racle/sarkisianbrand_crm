<script setup lang="ts">
import { Copy, Download, Link, X } from '@lucide/vue';
const props=defineProps<{modelValue:boolean}>(),emit=defineEmits<{ 'update:modelValue':[value:boolean] }>();
const session=useWorkspaceSession(),config=useRuntimeConfig();
const busy=ref(false),enabled=ref(false),feed=ref(''),error=ref(''),notice=ref('');
const provider=ref('google');
const api=(options:any={})=>$fetch<any>('/crm/meetings/calendar-subscription',{baseURL:config.public.apiBase,headers:{Authorization:`Bearer ${session.token.value}`},retry:0,timeout:15000,...options});
function close(){if(!busy.value){feed.value='';emit('update:modelValue',false);}}
const {panel,keyboard}=useCatalogDialog(computed(()=>props.modelValue),close);
const localAddress=computed(()=>{if(!feed.value)return false;const host=new URL(feed.value).hostname;return host==='localhost'||host==='127.0.0.1'||/^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host);});
const instructions=computed(()=>({google:'Google Календарь → Другие календари → «+» → Добавить по URL. Вставьте персональную ссылку.',yandex:'Яндекс Календарь → Новая подписка. Вставьте ссылку и нажмите «Создать».',apple:'Календарь Apple → Добавить календарь → Подписной календарь. На Mac: Файл → Новая подписка на календарь. Вставьте ссылку.'}[provider.value]));
async function run(action:()=>Promise<void>){if(busy.value)return;busy.value=true;error.value='';notice.value='';try{await action();}catch(e:any){error.value=e?.data?.message||'Не удалось настроить подписку';}finally{busy.value=false;}}
watch(()=>props.modelValue,value=>{if(value)void run(async()=>{const status=await api();enabled.value=status.enabled;});});
async function enable(){await run(async()=>{const result=await api({method:'POST'});enabled.value=true;feed.value=new URL(String(config.public.apiBase).replace(/\/$/,'')+result.path,window.location.origin).href;});}
async function revoke(){await run(async()=>{await api({method:'DELETE'});enabled.value=false;feed.value='';notice.value='Подписка отключена. Прежняя ссылка больше не работает.';});}
async function copy(){try{await navigator.clipboard.writeText(feed.value);notice.value='Ссылка скопирована';}catch{notice.value='Выделите и скопируйте ссылку из поля.';}}
</script>
<template>
 <Teleport to="body"><div v-if="modelValue" class="admin-dialog-backdrop crm-detail-backdrop" @click.self="close"><section ref="panel" class="admin-dialog admin-dialog--drawer crm-detail-card" role="dialog" aria-modal="true" aria-labelledby="calendar-sync-title" tabindex="-1" @keydown="keyboard">
  <header><div><p>Ваш календарь</p><h2 id="calendar-sync-title">Google, Яндекс и Apple</h2></div><button type="button" class="crm-button crm-button--icon" aria-label="Закрыть подключение календаря" :disabled="busy" @click="close"><X :size="18"/></button></header>
  <div class="admin-dialog-body crm-detail-body crm-stack">
   <p>Подпишитесь на свои события CRM: новые приглашения, переносы и отмены будут обновляться во внешнем календаре. Ответы об участии и изменение событий — в CRM.</p>
   <p>Обновления приходят с интервалом, который задаёт внешний сервис. Скачанный файл .ics добавляет разовую копию события; подписка по ссылке получает изменения.</p>
   <p v-if="error" role="alert">{{error}}</p><p v-if="notice" role="status">{{notice}}</p>
   <section class="crm-stack"><h3>Персональная подписка</h3><p>{{enabled?'Подписка включена. Ссылка показывается только после создания. Новая ссылка отключит предыдущую.':'Создайте ссылку и добавьте её в выбранный календарь.'}}</p>
    <button class="crm-button crm-button--primary" type="button" :disabled="busy" @click="enable"><Link :size="17"/>{{enabled?'Заменить ссылку подписки':'Создать ссылку подписки'}}</button>
    <template v-if="feed"><label class="crm-field">Ссылка на ваш календарь<input class="crm-input" :value="feed" readonly @focus="($event.target as HTMLInputElement).select()"/></label><button type="button" class="crm-button" @click="copy"><Copy :size="16"/>Скопировать ссылку</button><p>Ссылка открывает ваши события без входа. Передавайте её только своему календарному приложению.</p><p v-if="localAddress" class="crm-inline-note">Сейчас сайт открыт в локальной сети. Для Google и Яндекса потребуется публичный HTTPS-адрес CRM; до публикации можно скачивать события в .ics.</p></template>
   </section>
   <label class="crm-field">Куда подключить<select v-model="provider" class="crm-input"><option value="google">Google Календарь</option><option value="yandex">Яндекс Календарь</option><option value="apple">Apple Календарь</option></select></label><p>{{instructions}}</p>
   <p><Download :size="16"/> Чтобы скачать отдельное событие, откройте его карточку и нажмите «Скачать .ics».</p>
   <button v-if="enabled" type="button" class="crm-button crm-button--danger" :disabled="busy" @click="revoke">Отключить подписку</button>
  </div><footer class="crm-detail-footer"><button class="crm-button" type="button" :disabled="busy" @click="close">Закрыть</button></footer>
 </section></div></Teleport>
</template>
