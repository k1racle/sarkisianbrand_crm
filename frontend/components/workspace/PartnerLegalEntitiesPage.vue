<script setup lang="ts">
import { Save, Plus, RefreshCw, Building2, Pencil, ArrowLeft } from '@lucide/vue';
defineProps<{ embedded?: boolean }>();
const config=useRuntimeConfig(),{token}=useWorkspaceSession();
const rows=ref<any[]>([]),loading=ref(false),busy=ref(false),error=ref(''),notice=ref(''),editing=ref<any>(null);
const emit = defineEmits<{ dirty: [value: boolean] }>();
const baseline = ref('');
const dirty = computed(() => Boolean(editing.value) && JSON.stringify(editing.value) !== baseline.value);
watch(dirty, value => emit('dirty', value));
onBeforeUnmount(() => emit('dirty', false));
function closeEditor() { if (!busy.value && (!dirty.value || window.confirm('Закрыть реквизиты без сохранения?'))) editing.value = null; }
onBeforeRouteLeave(() => !busy.value && (!dirty.value || window.confirm('Уйти без сохранения реквизитов?')));
const blank=()=>({entityType:'IP',legalName:'',inn:'',kpp:'',ogrn:'',ogrnip:'',address:'',signerName:'',signerTitle:'',signerBasis:'',email:'',isActive:true});
function api(path='',options:any={}){return $fetch<any>(`/partners/admin/legal-entities${path}`,{baseURL:config.public.apiBase,headers:{Authorization:`Bearer ${token.value}`},timeout:15000,...options});}
async function load(){loading.value=true;error.value='';try{rows.value=await api();}catch(e:any){error.value=e?.data?.message||'Не удалось загрузить реквизиты';}finally{loading.value=false;}}
function edit(row?:any){editing.value=row?{...row}:{...blank()};baseline.value=JSON.stringify(editing.value);error.value='';notice.value='';}
async function save(){if(busy.value||!editing.value)return;busy.value=true;error.value='';notice.value='';try{const {id,...body}=editing.value;await api(id?`/${id}`:'',{method:id?'PATCH':'POST',body});editing.value=null;notice.value='Профиль реквизитов сохранён';await load();}catch(e:any){error.value=Array.isArray(e?.data?.message)?e.data.message.join(' · '):e?.data?.message||'Не удалось сохранить профиль';}finally{busy.value=false;}}
onMounted(load);
</script>
<template>
  <section class="partner-workspace partner-legal crm-management-workspace" :class="{'partner-legal--embedded':embedded,'crm-standard':!embedded}" :aria-busy="loading || busy">
    <header v-if="!embedded || !editing" class="partner-page-head" :class="embedded?'pds-heading':'crm-page-header'">
      <div><component :is="embedded?'h2':'h1'">Реквизиты стороны договора</component><p>Ваши ИП и ООО для автоматического заполнения договоров, актов и заявлений.</p></div>
      <div class="partner-actions"><button type="button" class="partner-button crm-button" :disabled="loading || busy || dirty" @click="load"><RefreshCw :size="17"/>Обновить</button><button v-if="!editing" type="button" class="partner-button partner-primary crm-button crm-button--primary" @click="edit()"><Plus :size="17"/>Добавить реквизиты</button></div>
    </header>
    <p v-if="error" class="partner-feedback" role="alert">{{error}}</p><p v-if="notice" class="partner-feedback" role="status">{{notice}}</p>
    <p v-if="loading && !rows.length" class="partner-legal-loading" role="status">Загружаем реквизиты…</p>
    <div v-if="!editing" class="partner-legal-cards">
      <article v-for="row in rows" :key="row.id" class="partner-panel crm-surface partner-legal-card">
        <header><span class="partner-legal-icon"><Building2 :size="22"/></span><div><span class="partner-legal-kind">{{row.entityType==='IP'?'Индивидуальный предприниматель':'Общество с ограниченной ответственностью'}}</span><h3>{{row.legalName}}</h3></div><span class="partner-legal-status" :data-active="row.isActive">{{row.isActive?'Действует':'Отключено'}}</span></header>
        <dl><div><dt>ИНН</dt><dd>{{row.inn}}</dd></div><div v-if="row.kpp"><dt>КПП</dt><dd>{{row.kpp}}</dd></div><div><dt>{{row.entityType==='IP'?'ОГРНИП':'ОГРН'}}</dt><dd>{{row.entityType==='IP'?row.ogrnip:row.ogrn}}</dd></div><div><dt>Адрес</dt><dd>{{row.address}}</dd></div><div><dt>Подписант</dt><dd>{{row.signerName}}<small>{{row.signerBasis}}</small></dd></div></dl>
        <footer><span>{{row.isActive?'Доступно при генерации':'Не используется в новых документах'}}</span><button type="button" class="partner-button crm-button" @click="edit(row)"><Pencil :size="15"/>Изменить</button></footer>
      </article>
      <div v-if="!rows.length && !loading && !error" class="partner-panel crm-surface partner-legal-empty"><Building2 :size="30"/><h3>Добавьте реквизиты компании</h3><p>Можно сохранить несколько ИП и ООО, чтобы выбирать нужную сторону при генерации документов.</p><button type="button" class="partner-button crm-button" @click="edit()"><Plus :size="17"/>Добавить реквизиты</button></div>
      <div v-else-if="error && !rows.length" class="partner-panel crm-surface partner-legal-empty"><Building2 :size="30"/><h3>Реквизиты недоступны</h3><p>Повторите загрузку, чтобы увидеть сохранённые компании.</p><button type="button" class="crm-button" @click="load"><RefreshCw :size="16"/>Повторить загрузку</button></div>
    </div>
    <div v-else class="partner-panel crm-surface partner-legal-editor">
      <header class="partner-legal-editor-head"><button type="button" class="crm-button" :disabled="busy" @click="closeEditor"><ArrowLeft :size="16"/>К реквизитам</button><div><h2>{{editing.id?'Изменить реквизиты':'Новые реквизиты'}}</h2><p>Изменения применятся к новым документам. Готовые файлы сохранят исходные сведения.</p></div></header>
      <form class="partner-form-grid" @submit.prevent="save">
        <label>Тип стороны<select class="crm-input" aria-label="Тип стороны" v-model="editing.entityType"><option value="IP">Индивидуальный предприниматель</option><option value="LLC">Общество с ограниченной ответственностью</option></select></label>
        <label class="partner-legal-name">Полное юридическое наименование<input class="crm-input" v-model="editing.legalName" required maxlength="300" placeholder="Как в регистрационных документах"/></label>
        <label>ИНН<input class="crm-input" v-model="editing.inn" required inputmode="numeric" maxlength="12"/></label>
        <label v-if="editing.entityType==='LLC'">КПП<input class="crm-input" v-model="editing.kpp" required inputmode="numeric" maxlength="9"/></label>
        <label v-if="editing.entityType==='LLC'">ОГРН<input class="crm-input" v-model="editing.ogrn" required inputmode="numeric" maxlength="13"/></label>
        <label v-if="editing.entityType==='IP'">ОГРНИП<input class="crm-input" v-model="editing.ogrnip" required inputmode="numeric" maxlength="15"/></label>
        <label class="partner-legal-wide">Адрес регистрации<input class="crm-input" v-model="editing.address" required maxlength="500" placeholder="Индекс, город, улица, дом"/></label>
        <label>ФИО подписанта<input class="crm-input" v-model="editing.signerName" required maxlength="200"/></label>
        <label>Должность подписанта<input class="crm-input" v-model="editing.signerTitle" maxlength="120" placeholder="Для ООО, например генеральный директор"/></label>
        <label>Основание полномочий<input class="crm-input" v-model="editing.signerBasis" required maxlength="200" placeholder="Устав или регистрация ИП"/></label>
        <label>Email<input class="crm-input" v-model="editing.email" type="email" maxlength="254"/></label>
        <label class="partner-option partner-legal-wide"><input class="crm-check" v-model="editing.isActive" type="checkbox"/>Использовать при генерации новых документов</label>
        <footer class="partner-actions partner-legal-wide"><button type="button" class="partner-button crm-button" :disabled="busy" @click="closeEditor">Отмена</button><button class="partner-button partner-primary crm-button crm-button--primary" :disabled="busy" type="submit"><Save :size="17"/>{{busy?'Сохраняем…':'Сохранить реквизиты'}}</button></footer>
      </form>
    </div>
  </section>
</template>
