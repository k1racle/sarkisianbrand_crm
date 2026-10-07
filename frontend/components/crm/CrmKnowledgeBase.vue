<script setup lang="ts">
import { Plus, RefreshCw, ArrowLeft } from '@lucide/vue';
type Article={id:string;title:string;category:string;body:string;status:string;version:number;updatedAt:string;canWrite?:boolean};
type Listing={items:Article[];total:number;page:number;pages:number;canWrite:boolean};
const {token}=useWorkspaceSession(),config=useRuntimeConfig();
const data=ref<Listing|null>(null),selected=ref<Article|null>(null),search=ref(''),status=ref('PUBLISHED'),loading=ref(false),saving=ref(false),editing=ref(false),error=ref(''),notice=ref('');
const form=reactive({title:'',category:'',body:'',status:'DRAFT'});
const labels:Record<string,string>={DRAFT:'Черновик',PUBLISHED:'Опубликована',ARCHIVED:'В архиве'};
let generation=0,alive=true,controller:AbortController|null=null;
const request=<T,>(path:string,options:any={})=>$fetch<T>('/helpdesk/knowledge'+path,{baseURL:config.public.apiBase,headers:{Authorization:`Bearer ${token.value}`},timeout:20000,retry:0,...options});
const message=(e:any)=>Array.isArray(e?.data?.message)?e.data.message.join('. '):e?.data?.message||'Не удалось выполнить действие. Проверьте соединение и обновите список.';
async function load(page=1){
  const current=++generation;controller?.abort();controller=new AbortController();loading.value=true;error.value='';data.value=null;
  try{const result=await request<Listing>('',{query:{search:search.value,status:status.value,page},signal:controller.signal});if(alive&&current===generation)data.value=result;}
  catch(e){if(alive&&current===generation)error.value=message(e);}finally{if(alive&&current===generation)loading.value=false;}
}
async function open(id:string){
  const current=++generation;controller?.abort();controller=new AbortController();loading.value=true;error.value='';editing.value=false;selected.value=null;
  try{const result=await request<Article>('/'+id,{signal:controller.signal});if(alive&&current===generation)selected.value=result;}
  catch(e){if(alive&&current===generation)error.value=message(e);}finally{if(alive&&current===generation)loading.value=false;}
}
function edit(){if(!selected.value?.canWrite)return;Object.assign(form,selected.value);editing.value=true;notice.value='';}
function create(){selected.value=null;Object.assign(form,{title:'',category:'Общие инструкции',body:'',status:'DRAFT'});editing.value=true;error.value='';notice.value='';}
async function back(){if(saving.value)return;selected.value=null;editing.value=false;await load(data.value?.page||1);}
async function save(){
  if(saving.value)return;const identity=token.value;saving.value=true;error.value='';
  const destination=selected.value?.id;
  try{
    const body={title:form.title.trim(),category:form.category.trim(),body:form.body.trim(),...(destination?{status:form.status,version:selected.value!.version}:{})};
    const result=await request<Article>(destination?'/'+destination:'',{method:destination?'PATCH':'POST',body});
    if(!alive||identity!==token.value)return;
    selected.value={...result,canWrite:true};editing.value=false;notice.value=destination?'Статья сохранена.':'Черновик создан. Проверьте текст и опубликуйте статью.';
  }catch(e){if(alive&&identity===token.value)error.value=message(e);}finally{if(alive&&identity===token.value)saving.value=false;}
}
watch(token,()=>{++generation;controller?.abort();data.value=null;selected.value=null;editing.value=false;saving.value=false;notice.value='';status.value='PUBLISHED';search.value='';if(token.value)load();});
onMounted(()=>load());onUnmounted(()=>{alive=false;++generation;controller?.abort();});
</script>
<template>
  <main class="crm-standard">
    <header class="crm-page-header"><div><h1>База знаний</h1><p>Инструкции и ответы для сотрудников поддержки</p></div><div class="crm-action-bar"><button v-if="selected||editing" class="crm-button" :disabled="saving" @click="back"><ArrowLeft :size="18" />К списку</button><button v-else-if="data?.canWrite" class="crm-button crm-button--primary" @click="create"><Plus :size="18" />Новая статья</button></div></header>
    <div class="crm-page-content crm-page-content--stack">
      <p v-if="error" role="alert">{{error}}</p><p v-if="notice" role="status">{{notice}}</p><p v-if="loading" role="status">Загружаем базу знаний…</p>
      <form v-if="editing" class="crm-surface crm-register crm-stack" aria-label="Редактор статьи" @submit.prevent="save">
        <h2>{{selected?'Редактирование статьи':'Новая статья'}}</h2>
        <fieldset class="crm-knowledge-fields" :disabled="saving">
          <label>Название статьи<input v-model="form.title" class="crm-input" required minlength="3" maxlength="200" /></label>
          <label>Раздел<input v-model="form.category" class="crm-input" required maxlength="80" /></label>
          <label>Текст инструкции<textarea v-model="form.body" class="crm-input" required minlength="10" maxlength="50000" rows="16" /></label>
          <label v-if="selected">Состояние<select v-model="form.status" class="crm-input" aria-label="Состояние"><option v-for="(label,key) in labels" :key="key" :value="key">{{label}}</option></select></label>
          <p class="crm-inline-note">Черновики и архив видны редакторам. Опубликованные статьи доступны сотрудникам с доступом к поддержке. Текст сохраняется без HTML-разметки.</p>
          <div class="crm-action-bar"><button class="crm-button crm-button--primary">{{saving?'Сохраняем…':selected?'Сохранить статью':'Создать черновик'}}</button><button type="button" class="crm-button" @click="selected?editing=false:back()">Отмена</button></div>
        </fieldset>
      </form>
      <article v-else-if="selected" class="crm-surface crm-register crm-stack">
        <div class="crm-action-bar crm-action-bar--spread"><span class="crm-badge">{{labels[selected.status]}} · v{{selected.version}}</span><button v-if="selected.canWrite" class="crm-button" @click="edit">Редактировать статью</button></div>
        <p class="crm-inline-note">{{selected.category}} · Обновлена {{new Date(selected.updatedAt).toLocaleString('ru-RU')}}</p><h2>{{selected.title}}</h2><div class="crm-knowledge-text">{{selected.body}}</div>
      </article>
      <template v-else>
        <form class="crm-toolbar" aria-label="Поиск по базе знаний" @submit.prevent="load()"><label>Поиск по статьям<input v-model="search" class="crm-input" maxlength="100" placeholder="Название, раздел или текст" /></label><label v-if="data?.canWrite||status!=='PUBLISHED'">Состояние<select v-model="status" aria-label="Состояние" class="crm-input" @change="load()"><option value="PUBLISHED">Опубликованные</option><option value="DRAFT">Черновики</option><option value="ARCHIVED">Архив</option><option value="ALL">Все статьи</option></select></label><button class="crm-button" :disabled="loading"><RefreshCw :size="18" />Найти</button></form>
        <section v-if="data" class="crm-surface crm-register crm-stack" aria-label="Статьи базы знаний"><p v-if="!data.items.length">Статей по выбранным условиям пока нет.</p><article v-for="row in data.items" :key="row.id" class="crm-item-card crm-register"><p class="crm-inline-note">{{row.category}} · {{labels[row.status]}}</p><button class="crm-knowledge-title" @click="open(row.id)">{{row.title}}</button></article><div class="crm-action-bar crm-action-bar--spread"><span>Всего: {{data.total}} · Страница {{data.page}} / {{data.pages}}</span><div class="crm-action-bar"><button class="crm-button" :disabled="data.page<=1" @click="load(data.page-1)">Назад</button><button class="crm-button" :disabled="data.page>=data.pages" @click="load(data.page+1)">Далее</button></div></div></section>
      </template>
    </div>
  </main>
</template>
