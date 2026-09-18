<script setup lang="ts">
import { GripVertical, Plus, Save, Trash2 } from '@lucide/vue';
type Badge={id:string;label:string;color:string;textColor:string;isActive:boolean;rule:'manual'|'new'|'sale';newDays:number};
const badges=ref<Badge[]>([]),revision=ref<number|null>(null),baseline=ref(''),dragged=ref('');
const dirty=computed(()=>revision.value!==null&&JSON.stringify(badges.value)!==baseline.value);
const {busy,loading,error,notice,canEdit,read,write}=useCatalogSettingsEditor('/admin/catalog/badges',dirty);
function accept(data:any){if(!Array.isArray(data?.badges)||!Number.isSafeInteger(data.revision))throw new Error('Invalid badge response');badges.value=data.badges;revision.value=data.revision;baseline.value=JSON.stringify(badges.value);}
async function load(){if(dirty.value&&!window.confirm('Отбросить изменения и обновить бейджи?'))return;await read(accept);}
onMounted(load);
function add(){if(!canEdit.value||busy.value||revision.value===null)return;let i=1;while(badges.value.some(b=>b.id==='badge-'+i))i++;badges.value.push({id:'badge-'+i,label:'Новый бейдж',color:'#202127',textColor:'#ffffff',isActive:true,rule:'manual',newDays:30});}
function remove(id:string){if(busy.value||!canEdit.value)return;if(!window.confirm('Удалить бейдж? После сохранения он будет снят со всех товаров. Выключение бейджа сохраняет назначения.'))return;badges.value=badges.value.filter(b=>b.id!==id);}
function drop(id:string){if(busy.value||!canEdit.value||dragged.value===id)return;const from=badges.value.findIndex(b=>b.id===dragged.value),to=badges.value.findIndex(b=>b.id===id);if(from>=0&&to>=0){const [b]=badges.value.splice(from,1);badges.value.splice(to,0,b);}dragged.value='';}
function keyboardMove(id:string,direction:number){const index=badges.value.findIndex(b=>b.id===id),target=badges.value[index+direction];if(target){dragged.value=id;drop(target.id);}}
async function save(){if(revision.value!==null&&dirty.value)await write('','PATCH',{revision:revision.value,badges:badges.value},accept);}
defineExpose({ load, add, busy: computed(()=>busy.value||loading.value), canAdd: computed(()=>!busy.value&&!loading.value&&canEdit.value&&revision.value!==null&&badges.value.length<30) });
</script>
<template>
  <form class="catalog-settings" @submit.prevent="save">
    <p v-if="error" class="cs-error" role="alert">{{error}} <button type="button" :disabled="busy" @click="load">Обновить</button></p><p v-if="notice" role="status">{{notice}}</p><p v-if="loading" role="status">Загрузка бейджей…</p>
    <article v-for="badge in badges" :key="badge.id" class="cs-badge-row" @dragover.prevent @drop.stop.prevent="drop(badge.id)">
      <button type="button" class="cs-grip" :disabled="busy||!canEdit" :draggable="!busy&&canEdit" :aria-label="'Перетащить бейдж '+badge.label" title="Перетащить; с клавиатуры Alt + ↑ / ↓" @keydown.alt.up.prevent="keyboardMove(badge.id,-1)" @keydown.alt.down.prevent="keyboardMove(badge.id,1)" @dragstart="dragged=badge.id;$event.dataTransfer?.setData('text/plain',badge.id)" @dragend="dragged=''"><GripVertical :size="18"/></button>
      <fieldset :disabled="busy||!canEdit" class="cs-badge-fields"><div class="cs-badge-title"><span class="cs-badge-preview" :style="{background:badge.color,color:badge.textColor}">{{badge.label||'Бейдж'}}</span><small>Код: {{badge.id}}</small><label class="cs-checkbox"><input v-model="badge.isActive" type="checkbox"/>Включён</label><button type="button" :aria-label="'Удалить бейдж '+badge.label" @click="remove(badge.id)"><Trash2 :size="16"/></button></div><div class="cs-field-grid"><label>Текст бейджа<input v-model="badge.label" required maxlength="40"/></label><label>Условие показа<select v-model="badge.rule"><option value="manual">Вручную</option><option value="new">Новинка</option><option value="sale">Акция</option></select></label><label v-if="badge.rule==='new'">Возраст товара, дней<input v-model.number="badge.newDays" type="number" min="1" max="365" required/></label><label>Цвет фона<input v-model="badge.color" type="color"/></label><label>Цвет текста<input v-model="badge.textColor" type="color"/></label></div><small>{{badge.rule==='manual'?'Назначьте бейдж в карточках нужных товаров.':badge.rule==='new'?'Показывается автоматически у недавно добавленных товаров.':'Показывается только пока действует акционная цена.'}} Выключение сохраняет назначения.</small></fieldset>
    </article>
    <p v-if="!loading&&revision!==null&&!badges.length">Бейджей пока нет. Добавьте первый бейдж.</p>
    <div class="cs-savebar"><span>{{dirty?'Есть несохранённые изменения':'Все изменения сохранены'}}</span><button class="cs-primary" :disabled="busy||loading||!canEdit||!dirty"><Save :size="16"/>{{busy?'Сохраняем…':'Сохранить бейджи'}}</button></div>
  </form>
</template>
