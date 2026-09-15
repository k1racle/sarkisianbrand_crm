<script setup lang="ts">
import { ArrowDown, ArrowUp, Check, Plus, Save, Trash2, X } from '@lucide/vue';

const props = defineProps<{ modelValue: boolean; currentId?: string }>();
const emit = defineEmits(['update:modelValue', 'changed', 'select']);
const config = useRuntimeConfig();
const { token } = useWorkspaceSession();
const pipelines = ref<any[]>([]);
const selectedId = ref('');
const saving = ref(false);
const error = ref('');
const newName = ref('');
const newStage = reactive({ name: '', probability: 20, color: '#f8604a' });
const headers = computed(() => ({ Authorization: `Bearer ${token.value}` }));
const selected = computed(() => pipelines.value.find(item => item.id === selectedId.value));
const fieldOptions = [
  ['title', 'Название сделки'], ['contactName', 'Контакт'], ['contactPhone', 'Телефон'], ['contactEmail', 'Email'],
  ['amount', 'Сумма'], ['managerId', 'Ответственный'], ['organizationId', 'Организация'], ['expectedCloseAt', 'Дата закрытия'], ['nextContactAt', 'Следующий контакт'],
];

async function load() {
  pipelines.value = await $fetch<any[]>('/crm/pipelines', { baseURL: config.public.apiBase, headers: headers.value });
  selectedId.value = pipelines.value.some(item => item.id === (selectedId.value || props.currentId)) ? (selectedId.value || props.currentId || '') : pipelines.value[0]?.id || '';
}
async function createPipeline() {
  if (!newName.value.trim()) return;
  saving.value = true; error.value = '';
  try {
    const created = await $fetch<any>('/crm/pipelines', { baseURL: config.public.apiBase, method: 'POST', headers: headers.value, body: { name: newName.value, requiredFields: ['contactName', 'contactPhone'], lostReasons: ['Не устроила цена', 'Выбран конкурент', 'Нет ответа', 'Отложено клиентом'] } });
    newName.value = ''; await load(); selectedId.value = created.id; emit('changed');
  } catch (exception: any) { error.value = exception?.data?.message || 'Не удалось создать воронку'; } finally { saving.value = false; }
}
async function savePipeline() {
  if (!selected.value) return;
  saving.value = true; error.value = '';
  try {
    await $fetch(`/crm/pipelines/${selected.value.id}`, { baseURL: config.public.apiBase, method: 'PATCH', headers: headers.value, body: { name: selected.value.name, isDefault: selected.value.isDefault, requiredFields: selected.value.requiredFields, lostReasons: String(selected.value.lostReasonsText ?? selected.value.lostReasons.join('\n')).split('\n').map((item: string) => item.trim()).filter(Boolean) } });
    await load(); emit('changed');
  } catch (exception: any) { error.value = exception?.data?.message || 'Не удалось сохранить воронку'; } finally { saving.value = false; }
}
async function archivePipeline() {
  if (!selected.value || selected.value.isDefault) return;
  await $fetch(`/crm/pipelines/${selected.value.id}`, { baseURL: config.public.apiBase, method: 'DELETE', headers: headers.value });
  await load(); emit('changed');
}
async function addStage() {
  if (!selected.value || !newStage.name.trim()) return;
  await $fetch(`/crm/pipelines/${selected.value.id}/stages`, { baseURL: config.public.apiBase, method: 'POST', headers: headers.value, body: newStage });
  Object.assign(newStage, { name: '', probability: 20, color: '#f8604a' }); await load(); emit('changed');
}
async function saveStage(stage: any) {
  await $fetch(`/crm/pipeline-stages/${stage.id}`, { baseURL: config.public.apiBase, method: 'PATCH', headers: headers.value, body: { name: stage.name, color: stage.color, probability: Number(stage.probability), isWon: stage.isWon, isLost: stage.isLost } });
  await load(); emit('changed');
}
async function removeStage(stage: any) {
  try { await $fetch(`/crm/pipeline-stages/${stage.id}`, { baseURL: config.public.apiBase, method: 'DELETE', headers: headers.value }); await load(); emit('changed'); }
  catch (exception: any) { error.value = exception?.data?.message || 'Не удалось удалить этап'; }
}
async function moveStage(index: number, direction: number) {
  if (!selected.value) return;
  const ids = selected.value.stages.map((item: any) => item.id); const target = index + direction;
  if (target < 0 || target >= ids.length) return;
  [ids[index], ids[target]] = [ids[target], ids[index]];
  await $fetch(`/crm/pipelines/${selected.value.id}/stages/reorder`, { baseURL: config.public.apiBase, method: 'POST', headers: headers.value, body: { stageIds: ids } });
  await load(); emit('changed');
}
function selectForWork() { if (selected.value) { emit('select', selected.value.id); emit('update:modelValue', false); } }
watch(() => props.modelValue, value => { if (value) void load(); });
</script>

<template>
  <Teleport to="body"><div v-if="modelValue" class="pipeline-settings-backdrop" @click.self="emit('update:modelValue',false)"><section class="pipeline-settings">
    <header><div><p>CRM / КОНСТРУКТОР</p><h2>Воронки продаж</h2><span>Этапы, обязательные поля и причины проигрыша</span></div><button @click="emit('update:modelValue',false)"><X :size="18"/></button></header>
    <div class="layout"><aside><form @submit.prevent="createPipeline"><input v-model="newName" placeholder="Название новой воронки"/><button :disabled="saving"><Plus :size="14"/></button></form><nav><button v-for="item in pipelines" :class="{active:item.id===selectedId}" @click="selectedId=item.id"><span><b>{{item.name}}</b><small>{{item.stages.length}} этапов</small></span><Check v-if="item.isDefault" :size="14"/></button></nav></aside>
      <main v-if="selected"><div v-if="error" class="error">{{error}}</div><section class="base"><label>Название<input v-model="selected.name"/></label><label class="check"><input v-model="selected.isDefault" type="checkbox"/>Основная воронка</label><fieldset><legend>Обязательные поля сделки</legend><label v-for="field in fieldOptions"><input v-model="selected.requiredFields" type="checkbox" :value="field[0]"/>{{field[1]}}</label></fieldset><label>Причины проигрыша<textarea v-model="selected.lostReasonsText" :placeholder="selected.lostReasons.join('\n')" rows="4"/></label><div class="actions"><button class="danger" :disabled="selected.isDefault" @click="archivePipeline"><Trash2 :size="14"/>В архив</button><button @click="savePipeline"><Save :size="14"/>Сохранить</button><button @click="selectForWork">Открыть воронку</button></div></section>
        <section class="stages"><header><b>Этапы процесса</b><span>{{selected.stages.length}}</span></header><article v-for="(stage,index) in selected.stages" :key="stage.id"><input v-model="stage.color" type="color"/><input v-model="stage.name"/><label>Вероятность<input v-model.number="stage.probability" type="number" min="0" max="100"/></label><label class="compact"><input v-model="stage.isWon" type="checkbox"/>Успех</label><label class="compact"><input v-model="stage.isLost" type="checkbox"/>Проигрыш</label><div><button @click="moveStage(index,-1)"><ArrowUp :size="13"/></button><button @click="moveStage(index,1)"><ArrowDown :size="13"/></button><button @click="saveStage(stage)"><Save :size="13"/></button><button @click="removeStage(stage)"><Trash2 :size="13"/></button></div></article><form @submit.prevent="addStage"><input v-model="newStage.color" type="color"/><input v-model="newStage.name" placeholder="Новый этап" required/><input v-model.number="newStage.probability" type="number" min="0" max="100"/><button><Plus :size="14"/>Добавить этап</button></form></section>
      </main></div>
  </section></div></Teleport>
</template>

<style scoped>
.pipeline-settings-backdrop{position:fixed;z-index:850;inset:0;background:#0006;font-family:var(--sb-font);color:var(--sb-ink)}.pipeline-settings{position:absolute;right:0;top:0;bottom:0;width:min(1120px,calc(100vw - 72px));background:#f4f5f7;display:grid;grid-template-rows:88px 1fr}.pipeline-settings>header{background:#fff;border-bottom:1px solid var(--sb-line);padding:0 26px;display:flex;align-items:center;justify-content:space-between}.pipeline-settings>header p{font-size:8px;color:var(--sb-coral);letter-spacing:.16em;margin:0 0 7px}.pipeline-settings>header h2{font-size:24px;margin:0}.pipeline-settings>header span{font-size:9px;color:#888}.pipeline-settings>header button{border:0;background:none}.layout{min-height:0;display:grid;grid-template-columns:260px 1fr}.layout>aside{background:#fff;border-right:1px solid var(--sb-line);padding:16px}.layout>aside form{display:grid;grid-template-columns:1fr 36px}.layout>aside input{height:36px;border:1px solid var(--sb-line);padding:0 9px;font:9px var(--sb-font)}.layout>aside form button{border:0;background:#1d1e22;color:#fff}.layout nav{display:grid;margin-top:13px}.layout nav button{min-height:52px;border:0;background:#fff;padding:9px;text-align:left;display:flex;align-items:center;justify-content:space-between}.layout nav button.active{background:#f0f1f3}.layout nav span{display:grid;gap:4px}.layout nav b{font-size:9px}.layout nav small{font-size:7px;color:#888}.layout>main{padding:20px;overflow:auto;display:grid;gap:14px;align-content:start}.base,.stages{background:#fff;border:1px solid var(--sb-line);padding:20px}.base{display:grid;grid-template-columns:1fr 180px;gap:14px}.base>label{display:grid;gap:6px;font-size:8px;color:#777}.base input:not([type=checkbox]),.base textarea{border:1px solid var(--sb-line);padding:9px;font:9px var(--sb-font)}.base .check{display:flex;align-items:center}.base fieldset{grid-column:1/-1;border:1px solid var(--sb-line);display:flex;flex-wrap:wrap;gap:12px;padding:13px}.base legend{font-size:8px;color:#777}.base fieldset label{font-size:8px;display:flex;align-items:center;gap:5px}.base .actions{grid-column:1/-1;display:flex;justify-content:flex-end;gap:7px}.base button,.stages button{height:34px;border:0;background:#1d1e22;color:#fff;padding:0 11px;display:inline-flex;align-items:center;gap:6px;font:8px var(--sb-font)}.base .danger{margin-right:auto;background:#fff0ed;color:#a84538}.stages>header{display:flex;justify-content:space-between;margin-bottom:10px}.stages>header b{font-size:11px}.stages>header span{font-size:9px;color:#888}.stages article{display:grid;grid-template-columns:34px 1fr 110px 75px 85px 145px;gap:8px;align-items:center;padding:8px 0;border-top:1px solid #eee}.stages article>input,.stages article>label input,.stages>form input{height:34px;border:1px solid var(--sb-line);padding:0 8px;font:8px var(--sb-font);box-sizing:border-box}.stages article>input[type=color],.stages>form input[type=color]{padding:3px;width:34px}.stages article>label{display:grid;gap:3px;font-size:7px;color:#888}.stages article>label.compact{display:flex;align-items:center;color:#555}.stages article>label.compact input{height:auto}.stages article>div{display:flex;gap:3px}.stages article>div button{width:32px;padding:0;justify-content:center;background:#f0f1f3;color:#555}.stages>form{display:grid;grid-template-columns:34px 1fr 90px 130px;gap:8px;margin-top:10px}.error{background:#fff0ed;color:#a84538;padding:10px;font-size:8px}@media(max-width:850px){.layout{grid-template-columns:190px 1fr}.stages article{grid-template-columns:34px 1fr 90px}.stages article>label,.stages article>div{grid-column:auto}.base{grid-template-columns:1fr}.base>*{grid-column:1!important}}@media(max-width:650px){.pipeline-settings{width:100vw}.layout{grid-template-columns:1fr}.layout>aside{display:none}}
</style>
