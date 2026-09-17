<script setup lang="ts">
import { ChevronDown, ChevronRight, GripVertical, Pencil, Plus, Search, X } from '@lucide/vue';
type Category={id:string;nameRu:string;slug:string;parentId:string|null;description:any;imageUrl:string|null;isActive:boolean;sortOrder:number;_count?:{products:number}};
const items=ref<Category[]>([]),revision=ref<number|null>(null),baseline=ref(''),search=ref(''),collapsed=ref<string[]>([]),dragged=ref('');
const form=ref<any|null>(null),formBaseline=ref('');
const layoutSnapshot=()=>JSON.stringify(items.value.map(item=>({id:item.id,parentId:item.parentId})));
const layoutDirty=computed(()=>revision.value!==null&&layoutSnapshot()!==baseline.value);
const formDirty=computed(()=>!!form.value&&JSON.stringify(form.value)!==formBaseline.value);
const dirty=computed(()=>layoutDirty.value||formDirty.value);
const {busy,loading,error,notice,canEdit,read,write}=useCatalogSettingsEditor('/admin/catalog/categories',dirty);
const {panel,keyboard}=useCatalogDialog(computed(()=>!!form.value),close);
function accept(data:any){if(!Array.isArray(data?.items)||!Number.isSafeInteger(data.revision))throw new Error('Invalid category response');items.value=data.items;revision.value=data.revision;baseline.value=layoutSnapshot();}
async function load(){if(dirty.value&&!window.confirm('Обновить список и отбросить несохранённые изменения?'))return;form.value=null;await read(accept);}
onMounted(load);
const tree=computed(()=>{
  const result:{category:Category;depth:number;hasChildren:boolean}[]=[],visited=new Set<string>();
  const query=search.value.trim().toLocaleLowerCase();
  function visit(parent:string|null,depth:number){
    for(const category of items.value.filter(item=>item.parentId===parent)){
      if(visited.has(category.id))continue;visited.add(category.id);
      const children=items.value.some(item=>item.parentId===category.id);
      if(!query||`${category.nameRu} ${category.slug}`.toLocaleLowerCase().includes(query))result.push({category,depth,hasChildren:children});
      if(query||!collapsed.value.includes(category.id))visit(category.id,depth+1);
    }
  }
  visit(null,0);return result;
});
const descendants=(id:string)=>{const found=new Set([id]);for(let changed=true;changed;){changed=false;for(const item of items.value)if(item.parentId&&found.has(item.parentId)&&!found.has(item.id)){found.add(item.id);changed=true;}}return found;};
const categoryById=computed(()=>new Map(items.value.map(item=>[item.id,item])));
function onSite(category:Category){const seen=new Set<string>();let current:Category|undefined=category;while(current){if(!current.isActive||seen.has(current.id))return false;seen.add(current.id);if(!current.parentId)return true;current=categoryById.value.get(current.parentId);}return false;}
const parents=computed(()=>items.value.filter(item=>!descendants(form.value?.id||'').has(item.id)));
function close(){if(busy.value)return false;if(formDirty.value&&!window.confirm('Закрыть без сохранения категории?'))return false;form.value=null;return true;}
function edit(category?:Category){if(layoutDirty.value||!canEdit.value||loading.value||!close())return;form.value=category?{id:category.id,nameRu:category.nameRu,slug:category.slug,parentId:category.parentId||'',description:typeof category.description==='string'?category.description:String(category.description?.ru||''),imageUrl:category.imageUrl||'',isActive:category.isActive}:{id:'',nameRu:'',slug:'',parentId:'',description:'',imageUrl:'',isActive:true};formBaseline.value=JSON.stringify(form.value);}
function resetLayout(){if(busy.value)return;const original=JSON.parse(baseline.value),byId=new Map(items.value.map(item=>[item.id,item]));items.value=original.map((node:any)=>({...byId.get(node.id),parentId:node.parentId}));dragged.value='';}
function slugify(){if(form.value&&!form.value.id&&!form.value.slug)form.value.slug=form.value.nameRu.toLowerCase().trim().replace(/[^a-zа-яё0-9]+/gi,'-').replace(/^-|-$/g,'');}
function drop(id:string,inside=false){
  if(!canEdit.value||busy.value||loading.value||!dragged.value||dragged.value===id||search.value)return;
  const source=items.value.find(item=>item.id===dragged.value),target=items.value.find(item=>item.id===id);
  if(!source||!target||descendants(source.id).has(target.id))return;
  const from=items.value.findIndex(item=>item.id===source.id),to=items.value.findIndex(item=>item.id===target.id);
  source.parentId=inside?target.id:target.parentId;
  items.value.splice(from,1);items.value.splice(inside?items.value.findIndex(item=>item.id===target.id)+1:to,0,source);dragged.value='';
}
function keyboardMove(id:string,direction:number){const siblings=items.value.filter(item=>item.parentId===items.value.find(c=>c.id===id)?.parentId),index=siblings.findIndex(item=>item.id===id),target=siblings[index+direction];if(target){dragged.value=id;drop(target.id);}}
async function saveLayout(){if(revision.value===null||!layoutDirty.value)return;await write('/layout','PATCH',{revision:revision.value,nodes:items.value.map(item=>({id:item.id,parentId:item.parentId||''}))},accept);}
async function saveCategory(){
  if(!form.value||revision.value===null)return;
  if(layoutDirty.value){error.value='Сначала сохраните порядок дерева, затем изменения категории.';return;}
  const {id,...fields}=form.value;
  if(await write(id?'/'+encodeURIComponent(id):'',id?'PATCH':'POST',{...fields,revision:revision.value},accept))form.value=null;
}
</script>
<template>
  <section class="catalog-settings">
    <div class="catalog-settings-intro"><p>Создавайте категории и подкатегории, меняйте порядок и оформление. Категории сайта не зависят от учетной структуры 1С.</p><button class="cs-primary" :disabled="busy||loading||!canEdit||revision===null||layoutDirty" @click="edit()"><Plus :size="16"/>Добавить категорию</button></div>
    <p v-if="error" role="alert" class="cs-error">{{error}} <button :disabled="busy" @click="load">Обновить список</button></p><p v-if="notice" role="status">{{notice}}</p>
    <div class="cs-toolbar"><label><Search :size="17"/><input v-model="search" placeholder="Название или адрес категории" aria-label="Поиск категорий"/></label><button :disabled="busy||loading" @click="collapsed=[]">Развернуть дерево</button></div>
    <p v-if="loading" role="status">Загрузка категорий…</p>
    <p v-else-if="!tree.length">{{items.length?'По вашему запросу категории не найдены.':'Категорий пока нет. Добавьте первую категорию.'}}</p>
    <div v-else class="cs-tree" aria-label="Дерево категорий">
      <article v-for="row in tree" :key="row.category.id" class="cs-category-row" :data-category-id="row.category.id" @dragover.prevent @drop.stop.prevent="drop(row.category.id)">
        <button type="button" class="cs-grip" :disabled="busy||loading||!canEdit||!!search" :draggable="!busy&&!loading&&canEdit&&!search" :aria-label="'Перетащить категорию '+row.category.nameRu" title="Перетащить; с клавиатуры Alt + ↑ / ↓" @keydown.alt.up.prevent="keyboardMove(row.category.id,-1)" @keydown.alt.down.prevent="keyboardMove(row.category.id,1)" @dragstart="dragged=row.category.id;$event.dataTransfer?.setData('text/plain',row.category.id)" @dragend="dragged='' "><GripVertical :size="18"/></button>
        <div class="cs-category-content" :style="{ '--category-depth': row.depth }"><button v-if="row.hasChildren" class="cs-expand" :aria-label="'Развернуть или свернуть '+row.category.nameRu" @click="collapsed.includes(row.category.id)?collapsed=collapsed.filter(id=>id!==row.category.id):collapsed.push(row.category.id)"><ChevronRight v-if="collapsed.includes(row.category.id)" :size="16"/><ChevronDown v-else :size="16"/></button><div><strong>{{row.category.nameRu}}</strong><small>/catalog?category={{row.category.slug}} · {{row.category._count?.products||0}} товаров</small></div><span class="cs-status" :class="{'is-hidden':!onSite(row.category)}">{{onSite(row.category)?'На сайте':row.category.isActive?'Скрыта родителем':'Скрыта'}}</span></div>
        <button :disabled="busy||loading||!canEdit||layoutDirty" :aria-label="'Редактировать категорию '+row.category.nameRu" @click="edit(row.category)"><Pencil :size="16"/></button>
        <div v-if="dragged&&dragged!==row.category.id" class="cs-nest-target" @dragover.stop.prevent @drop.stop.prevent="drop(row.category.id,true)">Вложить в «{{row.category.nameRu}}»</div>
      </article>
    </div>
    <div v-if="layoutDirty" class="cs-savebar"><span>Порядок дерева изменён — сохраните его перед редактированием категорий.</span><button :disabled="busy||loading" @click="resetLayout">Отменить порядок</button><button class="cs-primary" :disabled="busy||loading||!canEdit" @click="saveLayout">Сохранить порядок</button></div>
    <div v-if="form" class="cs-edit-backdrop admin-dialog-backdrop" @click.self="close">
      <form ref="panel" class="cs-edit-panel admin-dialog admin-dialog--drawer" role="dialog" aria-modal="true" aria-labelledby="category-edit-title" tabindex="-1" @keydown="keyboard" @submit.prevent="saveCategory">
        <header><div><p class="eyebrow">Каталог / Категории</p><h2 id="category-edit-title">{{form.id?'Настройки категории':'Новая категория'}}</h2><p v-if="form.id" class="editor-subtitle">{{form.nameRu}}</p></div><button type="button" :disabled="busy" aria-label="Закрыть категорию" @click="close"><X :size="20"/></button></header>
        <div class="admin-dialog-body cs-category-body">
          <fieldset :disabled="busy||!canEdit">
            <section class="cs-category-section" aria-labelledby="category-main-heading">
              <h3 id="category-main-heading">Основная информация</h3>
              <div class="cs-category-fields">
                <label>Название<input v-model="form.nameRu" required maxlength="120" @blur="slugify"/></label>
                <label>Адрес категории<input v-model="form.slug" required maxlength="100" pattern="[a-zа-яё0-9]+(-[a-zа-яё0-9]+)*"/><small>Изменение адреса меняет ссылку на категорию.</small></label>
                <label class="cs-category-wide">Родительская категория<select v-model="form.parentId"><option value="">Верхний уровень</option><option v-for="parent in parents" :key="parent.id" :value="parent.id">{{parent.nameRu}}</option></select></label>
              </div>
            </section>
            <section class="cs-category-section" aria-labelledby="category-appearance-heading">
              <h3 id="category-appearance-heading">Оформление в каталоге</h3>
              <label>Описание<textarea v-model="form.description" rows="4" maxlength="10000"/></label>
              <AdminMediaPicker v-model="form.imageUrl" :disabled="busy" label="Фото категории"/>
            </section>
            <section class="cs-category-section cs-category-publication" aria-labelledby="category-publication-heading">
              <h3 id="category-publication-heading">Публикация</h3>
              <label class="cs-checkbox"><input v-model="form.isActive" type="checkbox"/>Показывать категорию на сайте</label>
              <small>Категория со скрытым родителем также не показывается на сайте.</small>
            </section>
          </fieldset>
          <p v-if="error" class="cs-error" role="alert">{{error}}</p><p v-if="layoutDirty" class="cs-error">Сначала сохраните порядок дерева в основном списке.</p>
        </div>
        <footer><button type="button" :disabled="busy" @click="close">Отмена</button><button class="cs-primary" :disabled="busy||!canEdit||layoutDirty">{{busy?'Сохраняем…':'Сохранить категорию'}}</button></footer>
      </form>
    </div>
  </section>
</template>
