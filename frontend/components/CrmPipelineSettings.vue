<script setup lang="ts">
import { Check, GripVertical, Plus, Save, Trash2, X } from '@lucide/vue';

const props = defineProps<{ modelValue: boolean; currentId?: string }>();
const emit = defineEmits(['update:modelValue', 'changed', 'select']);
const config = useRuntimeConfig();
const { token } = useWorkspaceSession();
const pipelines = ref<any[]>([]);
const selectedId = ref('');
const saving = ref(false);
const error = ref('');
const draggedStage = ref('');
const newName = ref('');
const newStage = reactive({ name: '', probability: 20, color: '#f8604a' });
const headers = computed(() => ({ Authorization: `Bearer ${token.value}` }));
const selected = computed(() => pipelines.value.find(item => item.id === selectedId.value));
const fieldOptions = [
  ['title', 'Название сделки'], ['contactName', 'Контакт'], ['contactPhone', 'Телефон'], ['contactEmail', 'Email'],
  ['amount', 'Сумма'], ['managerId', 'Ответственный'], ['organizationId', 'Организация'], ['expectedCloseAt', 'Дата закрытия'], ['nextContactAt', 'Следующий контакт'],
];

async function load() {
  try {
    pipelines.value = await $fetch<any[]>('/crm/pipelines', { baseURL: config.public.apiBase, headers: headers.value });
    selectedId.value = pipelines.value.some(item => item.id === (selectedId.value || props.currentId)) ? (selectedId.value || props.currentId || '') : pipelines.value[0]?.id || '';
  } catch(exception:any) { fail(exception); }
}
function fail(exception:any) { error.value = Array.isArray(exception?.data?.message) ? exception.data.message.join(', ') : exception?.data?.message || 'Изменения не сохранены. Повторите попытку.'; }
async function mutate(action:()=>Promise<void>) { if(saving.value)return;saving.value=true;error.value='';try{await action();}catch(exception:any){fail(exception);}finally{saving.value=false;} }
async function createPipeline() {
  if (!newName.value.trim() || saving.value) return;
  saving.value = true; error.value = '';
  try {
    const created = await $fetch<any>('/crm/pipelines', { baseURL: config.public.apiBase, method: 'POST', headers: headers.value, body: { name: newName.value, requiredFields: ['contactName', 'contactPhone'], lostReasons: ['Не устроила цена', 'Выбран конкурент', 'Нет ответа', 'Отложено клиентом'] } });
    newName.value = ''; await load(); selectedId.value = created.id; emit('changed');
  } catch (exception: any) { error.value = exception?.data?.message || 'Не удалось создать воронку'; } finally { saving.value = false; }
}
async function savePipeline() {
  if (!selected.value || saving.value) return;
  saving.value = true; error.value = '';
  try {
    await $fetch(`/crm/pipelines/${selected.value.id}`, { baseURL: config.public.apiBase, method: 'PATCH', headers: headers.value, body: { name: selected.value.name, isDefault: selected.value.isDefault, requiredFields: selected.value.requiredFields, lostReasons: String(selected.value.lostReasonsText ?? selected.value.lostReasons.join('\n')).split('\n').map((item: string) => item.trim()).filter(Boolean) } });
    await load(); emit('changed');
  } catch (exception: any) { error.value = exception?.data?.message || 'Не удалось сохранить воронку'; } finally { saving.value = false; }
}
async function archivePipeline() {
  if (!selected.value || selected.value.isDefault || saving.value || !window.confirm('Перенести воронку в архив?')) return;
  await mutate(async()=>{await $fetch(`/crm/pipelines/${selected.value.id}`, { baseURL: config.public.apiBase, method: 'DELETE', headers: headers.value });await load();emit('changed');});
}
async function addStage() {
  if (!selected.value || !newStage.name.trim()) return;
  await mutate(async()=>{await $fetch(`/crm/pipelines/${selected.value.id}/stages`, { baseURL: config.public.apiBase, method: 'POST', headers: headers.value, body: {...newStage} });Object.assign(newStage, { name: '', probability: 20, color: '#f8604a' });await load();emit('changed');});
}
async function saveStage(stage: any) {
  await mutate(async()=>{await $fetch(`/crm/pipeline-stages/${stage.id}`, { baseURL: config.public.apiBase, method: 'PATCH', headers: headers.value, body: { name: stage.name, color: stage.color, probability: Number(stage.probability), isWon: stage.isWon, isLost: stage.isLost } });await load();emit('changed');});
}
async function removeStage(stage: any) {
  if(saving.value || !window.confirm(`Удалить этап «${stage.name}»?`))return;
  await mutate(async()=>{await $fetch(`/crm/pipeline-stages/${stage.id}`, { baseURL: config.public.apiBase, method: 'DELETE', headers: headers.value });await load();emit('changed');});
}
async function reorderStages(ids:string[]) {
  const pipeline=selected.value;
  if(!pipeline || saving.value)return;
  const before=[...pipeline.stages];
  if(ids.length!==before.length || new Set(ids).size!==before.length || ids.some(id=>!before.some((stage:any)=>stage.id===id)))return;
  if(ids.every((id,index)=>before[index].id===id))return;
  saving.value=true;error.value='';
  pipeline.stages=ids.map(id=>before.find((stage:any)=>stage.id===id));
  try{await $fetch(`/crm/pipelines/${pipeline.id}/stages/reorder`,{baseURL:config.public.apiBase,method:'POST',headers:headers.value,body:{stageIds:ids}});emit('changed');}
  catch(exception:any){pipeline.stages=before;fail(exception);}
  finally{saving.value=false;draggedStage.value='';}
}
async function moveStage(index: number, direction: number) {
  if (!selected.value || saving.value) return;
  const ids = selected.value.stages.map((item: any) => item.id); const target = index + direction;
  if (target < 0 || target >= ids.length) return;
  [ids[index], ids[target]] = [ids[target], ids[index]];
  await reorderStages(ids);
}
async function dropStage(targetId:string) { const stages=selected.value?.stages||[];const from=stages.findIndex((item:any)=>item.id===draggedStage.value);const to=stages.findIndex((item:any)=>item.id===targetId);if(from<0||to<0||from===to){draggedStage.value='';return;}const ids=stages.map((item:any)=>item.id);const [id]=ids.splice(from,1);ids.splice(to,0,id);await reorderStages(ids); }
function startStageDrag(event:DragEvent,id:string) { if(saving.value){event.preventDefault();return;}draggedStage.value=id;if(event.dataTransfer){event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain',id);} }
function selectForWork() { if (selected.value) { emit('select', selected.value.id); emit('update:modelValue', false); } }
watch(() => props.modelValue, value => { if (value) void load(); });
</script>

<template>
  <Teleport to="body"><div data-v-ui-a26685325278 v-if="modelValue" class="pipeline-settings-backdrop admin-dialog-backdrop" @click.self="!saving && emit('update:modelValue',false)"><section data-v-ui-a26685325278 class="pipeline-settings admin-dialog admin-dialog--modal">
    <header data-v-ui-a26685325278><div data-v-ui-a26685325278><p data-v-ui-a26685325278>CRM / КОНСТРУКТОР</p><h2 data-v-ui-a26685325278>Воронки продаж</h2><span data-v-ui-a26685325278>Этапы, обязательные поля и причины проигрыша</span></div><button class="crm-button crm-button--icon" data-v-ui-a26685325278 :disabled="saving" aria-label="Закрыть настройки воронки" @click="emit('update:modelValue',false)"><X data-v-ui-a26685325278 :size="18"/></button></header>
    <div data-v-ui-a26685325278 class="layout"><aside data-v-ui-a26685325278><form data-v-ui-a26685325278 @submit.prevent="createPipeline"><input class="crm-input" data-v-ui-a26685325278 :disabled="saving" v-model="newName" placeholder="Название новой воронки"/><button class="crm-button" data-v-ui-a26685325278 :disabled="saving"><Plus data-v-ui-a26685325278 :size="14"/></button></form><nav data-v-ui-a26685325278><button class="crm-button" data-v-ui-a26685325278 v-for="item in pipelines" :class="{active:item.id===selectedId}" :disabled="saving" @click="selectedId=item.id"><span data-v-ui-a26685325278><b data-v-ui-a26685325278>{{item.name}}</b><small data-v-ui-a26685325278>{{item.stages.length}} этапов</small></span><Check data-v-ui-a26685325278 v-if="item.isDefault" :size="14"/></button></nav></aside>
      <main class="crm-standard" data-v-ui-a26685325278 v-if="selected"><div data-v-ui-a26685325278 v-if="error" class="error" role="alert">{{error}}</div><section data-v-ui-a26685325278 class="base"><label data-v-ui-a26685325278>Название<input class="crm-input" data-v-ui-a26685325278 :disabled="saving" v-model="selected.name"/></label><label data-v-ui-a26685325278 class="check crm-toggle-row"><input class="crm-check" data-v-ui-a26685325278 :disabled="saving" v-model="selected.isDefault" type="checkbox"/>Основная воронка</label><fieldset data-v-ui-a26685325278><legend data-v-ui-a26685325278>Обязательные поля сделки</legend><label class="crm-toggle-row" data-v-ui-a26685325278 v-for="field in fieldOptions"><input class="crm-check" data-v-ui-a26685325278 :disabled="saving" v-model="selected.requiredFields" type="checkbox" :value="field[0]"/>{{field[1]}}</label></fieldset><label data-v-ui-a26685325278>Причины проигрыша<textarea class="crm-input" data-v-ui-a26685325278 :disabled="saving" v-model="selected.lostReasonsText" :placeholder="selected.lostReasons.join('\n')" rows="4"/></label><div data-v-ui-a26685325278 class="actions"><button data-v-ui-a26685325278 class="danger crm-button crm-button--danger" :disabled="saving || selected.isDefault" @click="archivePipeline"><Trash2 data-v-ui-a26685325278 :size="14"/>В архив</button><button class="crm-button" data-v-ui-a26685325278 :disabled="saving" @click="savePipeline"><Save data-v-ui-a26685325278 :size="14"/>Сохранить</button><button class="crm-button" data-v-ui-a26685325278 :disabled="saving" @click="selectForWork">Открыть воронку</button></div></section>
        <section data-v-ui-a26685325278 class="stages"><header data-v-ui-a26685325278><b data-v-ui-a26685325278>Этапы процесса</b><span data-v-ui-a26685325278>{{selected.stages.length}}</span></header><p data-v-ui-a26685325278 class="stage-order-hint">Перетащите этап за ручку. С клавиатуры: Alt + ↑ / ↓. Порядок сохраняется сразу.</p><article data-v-ui-a26685325278 v-for="(stage,index) in selected.stages" :key="stage.id" :class="{'stage-dragging':draggedStage===stage.id}" @dragover.prevent @drop.stop.prevent="dropStage(stage.id)"><button data-v-ui-a26685325278 class="stage-drag-handle crm-button" :draggable="!saving" :disabled="saving" :aria-label="'Переместить этап '+stage.name" title="Перетащить этап; Alt + стрелка вверх или вниз" @dragstart.stop="startStageDrag($event,stage.id)" @dragend="draggedStage=''" @keydown.alt.up.prevent="moveStage(index,-1)" @keydown.alt.down.prevent="moveStage(index,1)"><GripVertical data-v-ui-a26685325278 :size="13"/></button><input data-v-ui-a26685325278 :disabled="saving" v-model="stage.color" type="color"/><input class="crm-input" data-v-ui-a26685325278 :disabled="saving" v-model="stage.name"/><label data-v-ui-a26685325278>Вероятность<input class="crm-input" data-v-ui-a26685325278 :disabled="saving" v-model.number="stage.probability" type="number" min="0" max="100"/></label><label data-v-ui-a26685325278 class="compact crm-toggle-row"><input class="crm-check" data-v-ui-a26685325278 :disabled="saving" v-model="stage.isWon" type="checkbox"/>Успех</label><label data-v-ui-a26685325278 class="compact crm-toggle-row"><input class="crm-check" data-v-ui-a26685325278 :disabled="saving" v-model="stage.isLost" type="checkbox"/>Проигрыш</label><div data-v-ui-a26685325278><button class="crm-button" data-v-ui-a26685325278 :disabled="saving" :aria-label="'Сохранить этап '+stage.name" @click="saveStage(stage)"><Save data-v-ui-a26685325278 :size="13"/></button><button class="crm-button" data-v-ui-a26685325278 :disabled="saving" :aria-label="'Удалить этап '+stage.name" @click="removeStage(stage)"><Trash2 data-v-ui-a26685325278 :size="13"/></button></div></article><form data-v-ui-a26685325278 @submit.prevent="addStage"><input data-v-ui-a26685325278 :disabled="saving" v-model="newStage.color" type="color"/><input class="crm-input" data-v-ui-a26685325278 :disabled="saving" v-model="newStage.name" placeholder="Новый этап" required/><input class="crm-input" data-v-ui-a26685325278 :disabled="saving" v-model.number="newStage.probability" type="number" min="0" max="100"/><button class="crm-button" data-v-ui-a26685325278 :disabled="saving"><Plus data-v-ui-a26685325278 :size="14"/>Добавить этап</button></form></section>
      </main><main class="crm-standard" data-v-ui-a26685325278 v-else><p data-v-ui-a26685325278 v-if="error" class="error" role="alert">{{error}}</p><button class="crm-button" data-v-ui-a26685325278 :disabled="saving" @click="load">Повторить загрузку воронок</button></main></div>
  </section></div></Teleport>
</template>
