<script setup lang="ts">
import { ArrowDown, ArrowUp, ArrowUpRight, Check, GripVertical, Pencil, Plus, Trash2, X } from '@lucide/vue';
const props = defineProps<{ modelValue: boolean; currentId?: string }>();
const emit = defineEmits(['update:modelValue', 'changed', 'select']);
const config = useRuntimeConfig();
const { token } = useWorkspaceSession();
const headers = computed(() => ({ Authorization: 'Bearer ' + token.value }));
const pipelines = ref<any[]>([]);
const selectedId = ref('');
const selected = computed(() => pipelines.value.find(item => item.id === selectedId.value));
const loading = ref(false), saving = ref(false), error = ref(''), notice = ref('');
const tab = ref('stages');
const tabs = [{ id: 'stages', label: 'Этапы' }, { id: 'fields', label: 'Поля сделки' }, { id: 'reasons', label: 'Причины отказа' }, { id: 'settings', label: 'Настройки' }];
const draft = ref<any>(null), baseline = ref('');
const creating = ref(false), newName = ref(''), newReason = ref('');
const stageDraft = ref<any>(null), stageBaseline = ref(''), draggedStage = ref('');
const pipelineDirty = computed(() => Boolean(draft.value && JSON.stringify(draft.value) !== baseline.value));
const stageDirty = computed(() => Boolean(stageDraft.value && JSON.stringify(stageDraft.value) !== stageBaseline.value));
const dirty = computed(() => pipelineDirty.value || stageDirty.value || Boolean(creating.value && newName.value.trim()) || Boolean(newReason.value.trim()));
const fieldOptions = [
  { id: 'title', label: 'Название сделки', hint: 'Краткое описание запроса' },
  { id: 'contactName', label: 'Контакт', hint: 'Имя контактного лица' },
  { id: 'contactPhone', label: 'Телефон', hint: 'Номер для связи' },
  { id: 'contactEmail', label: 'Email', hint: 'Адрес электронной почты' },
  { id: 'amount', label: 'Сумма', hint: 'Планируемая сумма сделки' },
  { id: 'managerId', label: 'Ответственный', hint: 'Менеджер сделки' },
  { id: 'organizationId', label: 'Организация', hint: 'Связанная компания' },
  { id: 'expectedCloseAt', label: 'Дата закрытия', hint: 'Планируемое завершение' },
  { id: 'nextContactAt', label: 'Следующий контакт', hint: 'Дата следующего обращения' },
];
const stageKind = (stage: any) => stage.isWon ? 'won' : stage.isLost ? 'lost' : 'open';
const kindLabel = (stage: any) => stage.isWon ? 'Успешный' : stage.isLost ? 'Проигранный' : 'В работе';
function fail(exception: any) { error.value = Array.isArray(exception?.data?.message) ? exception.data.message.join(', ') : exception?.data?.message || 'Не удалось сохранить изменения. Повторите попытку.'; }
function resetDraft() {
  const item = selected.value;
  draft.value = item ? { name: item.name, isDefault: Boolean(item.isDefault), requiredFields: [...(item.requiredFields || [])], lostReasons: [...(item.lostReasons || [])] } : null;
  baseline.value = JSON.stringify(draft.value); stageDraft.value = null; stageBaseline.value = ''; newReason.value = ''; error.value = ''; notice.value = '';
}
function allowDiscard() { return !saving.value && (!dirty.value || window.confirm('Есть несохранённые изменения. Закрыть их без сохранения?')); }
function close() { if (allowDiscard()) emit('update:modelValue', false); }
const { panel, keyboard } = useCatalogDialog(computed(() => props.modelValue), close);
onBeforeRouteLeave(() => !props.modelValue || allowDiscard());
function choosePipeline(id: string) {
  if ((id === selectedId.value && !creating.value) || !allowDiscard()) return;
  selectedId.value = id; creating.value = false; newName.value = ''; resetDraft(); tab.value = 'stages';
}
function selectMobile(event: Event) { const select = event.target as HTMLSelectElement; choosePipeline(select.value); select.value = selectedId.value; }
async function load() {
  loading.value = true; error.value = '';
  try {
    pipelines.value = await $fetch<any[]>('/crm/pipelines', { baseURL: config.public.apiBase, headers: headers.value });
    selectedId.value = pipelines.value.some(item => item.id === props.currentId) ? props.currentId! : pipelines.value[0]?.id || '';
    creating.value = false; newName.value = ''; resetDraft(); tab.value = 'stages';
  } catch (exception: any) { fail(exception); } finally { loading.value = false; }
}
async function mutate(action: () => Promise<void>, message: string) {
  if (saving.value) return;
  saving.value = true; error.value = ''; notice.value = '';
  try { await action(); notice.value = message; emit('changed'); } catch (exception: any) { fail(exception); } finally { saving.value = false; }
}
async function startCreate() {
  if (!allowDiscard()) return;
  resetDraft(); creating.value = true; newName.value = '';
  await nextTick(); panel.value?.querySelector<HTMLInputElement>('#pipeline-new-name')?.focus();
}
function cancelCreate() { if (!allowDiscard()) return; creating.value = false; newName.value = ''; resetDraft(); }
async function createPipeline() {
  if (!newName.value.trim()) return;
  await mutate(async () => {
    const row = await $fetch<any>('/crm/pipelines', { baseURL: config.public.apiBase, method: 'POST', headers: headers.value, body: { name: newName.value.trim(), requiredFields: ['contactName', 'contactPhone'], lostReasons: ['Не устроила цена', 'Выбран конкурент', 'Нет ответа', 'Отложено клиентом'] } });
    pipelines.value.push(row); selectedId.value = row.id; creating.value = false; newName.value = ''; resetDraft(); tab.value = 'stages';
  }, 'Воронка создана');
}
function appendReason() {
  const text = newReason.value.trim();
  if (!text || !draft.value) return;
  if (draft.value.lostReasons.some((item: string) => item.toLocaleLowerCase() === text.toLocaleLowerCase())) { error.value = 'Такая причина уже есть в списке'; return; }
  draft.value.lostReasons.push(text); newReason.value = ''; error.value = '';
}
async function savePipeline() {
  if (!selected.value || !draft.value) return;
  if (!draft.value.name.trim()) { tab.value = 'settings'; error.value = 'Укажите название воронки'; return; }
  if (newReason.value.trim()) { appendReason(); if (newReason.value.trim()) { tab.value = 'reasons'; return; } }
  await mutate(async () => {
    const row = await $fetch<any>('/crm/pipelines/' + selectedId.value, { baseURL: config.public.apiBase, method: 'PATCH', headers: headers.value, body: { ...draft.value, name: draft.value.name.trim() } });
    pipelines.value = pipelines.value.map(item => item.id === row.id ? row : row.isDefault ? { ...item, isDefault: false } : item);
    draft.value.name = row.name; draft.value.lostReasons = [...row.lostReasons]; baseline.value = JSON.stringify(draft.value);
  }, 'Настройки сохранены');
}
async function archivePipeline() {
  if (!selected.value || selected.value.isDefault || !allowDiscard() || !window.confirm('Перенести воронку «' + selected.value.name + '» в архив?')) return;
  await mutate(async () => {
    await $fetch('/crm/pipelines/' + selectedId.value, { baseURL: config.public.apiBase, method: 'DELETE', headers: headers.value });
    pipelines.value = pipelines.value.filter(item => item.id !== selectedId.value); selectedId.value = pipelines.value[0]?.id || ''; resetDraft(); tab.value = 'stages';
  }, 'Воронка перенесена в архив');
}
async function editStage(stage?: any) {
  if (saving.value || (stageDirty.value && !window.confirm('Отменить несохранённые изменения этапа?'))) return;
  stageDraft.value = stage ? { id: stage.id, name: stage.name, color: stage.color || '#3c3c3b', probability: stage.probability ?? 0, kind: stageKind(stage) } : { id: '', name: '', color: '#3c3c3b', probability: 20, kind: 'open' };
  stageBaseline.value = JSON.stringify(stageDraft.value); error.value = ''; notice.value = '';
  await nextTick(); panel.value?.querySelector('.crm-pipeline-stage-editor')?.scrollIntoView({ block: 'start' }); panel.value?.querySelector<HTMLInputElement>('#pipeline-stage-name')?.focus({ preventScroll: true });
}
function cancelStage() { if (saving.value || (stageDirty.value && !window.confirm('Отменить несохранённые изменения этапа?'))) return; stageDraft.value = null; error.value = ''; }
function changeStageKind() { if (stageDraft.value?.kind === 'won') stageDraft.value.probability = 100; else if (stageDraft.value?.kind === 'lost') stageDraft.value.probability = 0; }
async function saveStage() {
  if (!selected.value || !stageDraft.value?.name.trim()) return;
  const edit = stageDraft.value;
  await mutate(async () => {
    const body = { name: edit.name.trim(), color: edit.color, probability: Number(edit.probability), isWon: edit.kind === 'won', isLost: edit.kind === 'lost' };
    const row = await $fetch<any>(edit.id ? '/crm/pipeline-stages/' + edit.id : '/crm/pipelines/' + selectedId.value + '/stages', { baseURL: config.public.apiBase, method: edit.id ? 'PATCH' : 'POST', headers: headers.value, body });
    if (edit.id) selected.value.stages = selected.value.stages.map((item: any) => item.id === row.id ? { ...item, ...row } : item);
    else selected.value.stages.push(row);
    stageDraft.value = null; stageBaseline.value = '';
  }, edit.id ? 'Этап сохранён' : 'Этап добавлен');
}
async function removeStage() {
  const stage = stageDraft.value;
  if (!stage?.id || saving.value || !window.confirm('Удалить этап «' + stage.name + '»?')) return;
  await mutate(async () => {
    await $fetch('/crm/pipeline-stages/' + stage.id, { baseURL: config.public.apiBase, method: 'DELETE', headers: headers.value });
    selected.value.stages = selected.value.stages.filter((item: any) => item.id !== stage.id); stageDraft.value = null;
  }, 'Этап удалён');
}
async function reorderStages(ids: string[]) {
  const pipeline = selected.value;
  if (!pipeline || saving.value) return;
  const before = [...pipeline.stages];
  if (ids.length !== before.length || new Set(ids).size !== before.length || ids.some(id => !before.some(stage => stage.id === id)) || ids.every((id, index) => before[index].id === id)) return;
  saving.value = true; error.value = ''; notice.value = '';
  pipeline.stages = ids.map(id => before.find(stage => stage.id === id));
  try { await $fetch('/crm/pipelines/' + pipeline.id + '/stages/reorder', { baseURL: config.public.apiBase, method: 'POST', headers: headers.value, body: { stageIds: ids } }); notice.value = 'Порядок этапов сохранён'; emit('changed'); }
  catch (exception: any) { pipeline.stages = before; fail(exception); }
  finally { saving.value = false; draggedStage.value = ''; }
}
async function moveStage(index: number, direction: number) {
  const ids = selected.value?.stages.map((item: any) => item.id) || [], target = index + direction;
  if (target < 0 || target >= ids.length) return;
  [ids[index], ids[target]] = [ids[target], ids[index]]; await reorderStages(ids);
}
async function dropStage(targetId: string) {
  const ids = selected.value?.stages.map((item: any) => item.id) || [], from = ids.indexOf(draggedStage.value), to = ids.indexOf(targetId);
  if (from < 0 || to < 0 || from === to) { draggedStage.value = ''; return; }
  const [id] = ids.splice(from, 1); ids.splice(to, 0, id); await reorderStages(ids);
}
function startStageDrag(event: DragEvent, id: string) { if (saving.value) { event.preventDefault(); return; } draggedStage.value = id; if (event.dataTransfer) { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', id); } }
function selectForWork() { if (selected.value && allowDiscard()) { emit('select', selectedId.value); emit('update:modelValue', false); } }
function tabKeys(event: KeyboardEvent) {
  const index = tabs.findIndex(item => item.id === tab.value);
  const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : -1;
  if (next < 0) return; event.preventDefault(); tab.value = tabs[next].id; nextTick(() => document.getElementById('pipeline-tab-' + tab.value)?.focus());
}
watch(() => props.modelValue, value => { if (value) void load(); }, { immediate: true });
</script>

<template>
  <Teleport to="body">
    <div v-if="modelValue" class="pipeline-settings-backdrop admin-dialog-backdrop crm-pipeline-backdrop" @click.self="close">
      <section ref="panel" class="pipeline-settings admin-dialog admin-dialog--modal crm-pipeline-settings" role="dialog" aria-modal="true" aria-labelledby="pipeline-settings-title" tabindex="-1" @keydown="keyboard">
        <header class="crm-pipeline-header"><div><h2 id="pipeline-settings-title">Воронки продаж</h2><p>Настройте процесс работы со сделками</p></div><button class="crm-button crm-button--icon" :disabled="saving" aria-label="Закрыть настройки воронки" @click="close"><X :size="20" /></button></header>
        <div class="crm-pipeline-layout">
          <aside class="crm-pipeline-sidebar" aria-label="Выбор воронки">
            <div class="crm-pipeline-sidebar-heading"><strong>Ваши воронки</strong><span>{{ pipelines.length }}</span></div>
            <select class="crm-input crm-pipeline-mobile-select" :value="selectedId" :disabled="saving || loading || !pipelines.length" aria-label="Редактируемая воронка" @change="selectMobile"><option v-if="!pipelines.length" value="">Нет воронок</option><option v-for="item in pipelines" :key="item.id" :value="item.id">{{ item.name }}</option></select>
            <nav class="crm-pipeline-list" aria-label="Список воронок"><button v-for="item in pipelines" :key="item.id" class="crm-button" :aria-pressed="item.id === selectedId && !creating" :disabled="saving || loading" @click="choosePipeline(item.id)"><span><strong>{{ item.name }}</strong><small>{{ item.stages.length }} этапов<template v-if="item.isDefault"> · Основная</template></small></span><Check v-if="item.id === selectedId && !creating" :size="16" /></button></nav>
            <button class="crm-button crm-pipeline-create" :disabled="saving || loading" @click="startCreate"><Plus :size="18" /><span>Новая воронка</span></button>
          </aside>
          <div class="crm-pipeline-workspace">
            <WorkspaceLoading v-if="loading" label="Загружаем воронки" />
            <template v-else>
              <div v-if="selected && !creating" class="crm-pipeline-current"><div><h3>{{ selected.name }}</h3><span>{{ selected.stages.length }} этапов<template v-if="selected.isDefault"> · Основная воронка</template></span></div><button class="crm-button crm-button--text" :disabled="saving" @click="selectForWork">К сделкам <ArrowUpRight :size="16" /></button></div>
              <nav v-if="selected && !creating" class="crm-pipeline-tabs" role="tablist" aria-label="Настройки воронки" @keydown="tabKeys"><button v-for="item in tabs" :id="'pipeline-tab-' + item.id" :key="item.id" class="crm-button" role="tab" :aria-selected="tab === item.id" :tabindex="tab === item.id ? 0 : -1" :aria-controls="'pipeline-panel-' + item.id" @click="tab = item.id">{{ item.label }}</button></nav>
              <div class="crm-pipeline-body">
                <p v-if="error" class="operation-error" role="alert">{{ error }}</p>
                <form v-if="creating" id="pipeline-create-form" class="crm-pipeline-new-form" @submit.prevent="createPipeline"><h3>Новая воронка</h3><p>Отдельный процесс для отдела или направления продаж.</p><label>Название воронки<input id="pipeline-new-name" class="crm-input" v-model="newName" :disabled="saving" required maxlength="120" placeholder="Например, Оптовые продажи" /></label><p class="crm-pipeline-note">Добавим стандартные этапы. Их можно переименовать и настроить под вашу команду.</p></form>
                <template v-else-if="selected && draft">
                  <section id="pipeline-panel-stages" role="tabpanel" aria-labelledby="pipeline-tab-stages" :hidden="tab !== 'stages'">
                    <div class="crm-pipeline-section-heading"><div><h3>Этапы сделки</h3><p>От первого обращения до результата</p></div><button class="crm-button" :disabled="saving" @click="editStage()"><Plus :size="16" /> Добавить этап</button></div>
                    <p class="crm-pipeline-hint">Перетаскивайте этапы за ручку, чтобы изменить порядок.</p>
                    <form v-if="stageDraft" id="pipeline-stage-form" class="crm-pipeline-stage-editor" @submit.prevent="saveStage">
                      <div class="crm-pipeline-editor-heading"><h4>{{ stageDraft.id ? 'Редактирование этапа' : 'Новый этап' }}</h4><button class="crm-button crm-button--icon" type="button" :disabled="saving" aria-label="Закрыть редактирование этапа" @click="cancelStage"><X :size="18" /></button></div>
                      <fieldset class="ui-fieldset-reset crm-pipeline-stage-fields" :disabled="saving">
                        <label class="crm-pipeline-stage-name">Название<input id="pipeline-stage-name" class="crm-input" v-model="stageDraft.name" required maxlength="100" placeholder="Например, Согласование условий" /></label>
                        <label class="crm-pipeline-color">Цвет<input v-model="stageDraft.color" type="color" /></label>
                        <label>Тип этапа<select class="crm-input" aria-label="Тип этапа" v-model="stageDraft.kind" @change="changeStageKind"><option value="open">В работе</option><option value="won">Успешный</option><option value="lost">Проигранный</option></select></label>
                        <label class="crm-pipeline-probability">Вероятность, %<input class="crm-input" aria-label="Вероятность, %" v-model.number="stageDraft.probability" type="number" min="0" max="100" required /></label>
                      </fieldset>
                      <p class="crm-pipeline-hint">{{ stageDraft.kind === 'open' ? 'Вероятность используется в прогнозе продаж.' : stageDraft.kind === 'won' ? 'При переходе на этот этап сделка считается выигранной.' : 'При переходе на этот этап сделка считается проигранной.' }}</p>
                      <div v-if="stageDraft.id" class="crm-pipeline-position"><span>Положение в списке</span><button class="crm-button crm-button--icon" type="button" :disabled="saving || selected.stages[0]?.id === stageDraft.id" aria-label="Поднять этап" @click="moveStage(selected.stages.findIndex((item: any) => item.id === stageDraft.id), -1)"><ArrowUp :size="16" /></button><button class="crm-button crm-button--icon" type="button" :disabled="saving || selected.stages[selected.stages.length - 1]?.id === stageDraft.id" aria-label="Опустить этап" @click="moveStage(selected.stages.findIndex((item: any) => item.id === stageDraft.id), 1)"><ArrowDown :size="16" /></button></div>
                      <div class="crm-pipeline-editor-actions"><button v-if="stageDraft.id" class="crm-button crm-button--danger crm-pipeline-delete" type="button" :disabled="saving || selected.stages.length <= 1" @click="removeStage"><Trash2 :size="16" /> Удалить</button></div>
                    </form>
                    <div class="crm-pipeline-stages">
                      <article v-for="(stage, index) in selected.stages" :key="stage.id" class="crm-pipeline-stage" :class="{ 'is-dragging': draggedStage === stage.id, 'is-editing': stageDraft?.id === stage.id }" @dragover.prevent @drop.stop.prevent="dropStage(stage.id)">
                        <button class="stage-drag-handle crm-button crm-button--icon" :draggable="!saving" :disabled="saving" :aria-label="'Переместить этап ' + stage.name" title="Перетащить; Alt + стрелка вверх или вниз" @dragstart.stop="startStageDrag($event, stage.id)" @dragend="draggedStage = ''" @keydown.alt.up.prevent="moveStage(index, -1)" @keydown.alt.down.prevent="moveStage(index, 1)"><GripVertical :size="18" /></button>
                        <button class="crm-button crm-pipeline-stage-open" :disabled="saving" :aria-label="'Настроить этап ' + stage.name" @click="editStage(stage)"><span class="crm-pipeline-stage-dot" :style="{ backgroundColor: stage.color }" /><span class="crm-pipeline-stage-description"><strong>{{ stage.name }}</strong><span class="crm-pipeline-stage-kind" :data-kind="stageKind(stage)">{{ kindLabel(stage) }}</span></span><span class="crm-pipeline-stage-chance" title="Вероятность успеха">{{ stage.probability }}%</span><Pencil :size="16" /></button>
                      </article>
                    </div>
                  </section>
                  <section id="pipeline-panel-fields" role="tabpanel" aria-labelledby="pipeline-tab-fields" :hidden="tab !== 'fields'"><div class="crm-pipeline-section-heading"><div><h3>Обязательные поля</h3><p>Без этих данных сотрудник не сможет сохранить сделку.</p></div></div><fieldset class="ui-fieldset-reset crm-pipeline-required-fields" :disabled="saving"><label v-for="field in fieldOptions" :key="field.id" :class="{ 'is-required': draft.requiredFields.includes(field.id) }"><span><strong>{{ field.label }}</strong><small>{{ field.hint }}</small></span><input class="crm-check" v-model="draft.requiredFields" type="checkbox" :value="field.id" :aria-label="field.label" /></label></fieldset></section>
                  <section id="pipeline-panel-reasons" role="tabpanel" aria-labelledby="pipeline-tab-reasons" :hidden="tab !== 'reasons'"><div class="crm-pipeline-section-heading"><div><h3>Почему сделка не состоялась</h3><p>Сотрудник выберет одну из причин при закрытии проигранной сделки.</p></div></div><div class="crm-pipeline-reasons"><div v-for="(reason, index) in draft.lostReasons" :key="index"><span class="crm-pipeline-reason-number">{{ index + 1 }}</span><input class="crm-input" v-model="draft.lostReasons[index]" :disabled="saving" :aria-label="'Причина отказа ' + (index + 1)" /><button class="crm-button crm-button--icon" :disabled="saving" :aria-label="'Удалить причину ' + reason" @click="draft.lostReasons.splice(index, 1)"><X :size="16" /></button></div></div><p v-if="!draft.lostReasons.length" class="crm-pipeline-note">Причины пока не заданы. При закрытии сделки выбор причины не потребуется.</p><form class="crm-pipeline-add-reason" @submit.prevent="appendReason"><input class="crm-input" v-model="newReason" :disabled="saving" aria-label="Новая причина отказа" placeholder="Например, Не подошёл ассортимент" /><button class="crm-button" :disabled="saving || !newReason.trim()" type="submit"><Plus :size="16" /> Добавить</button></form></section>
                  <section id="pipeline-panel-settings" role="tabpanel" aria-labelledby="pipeline-tab-settings" :hidden="tab !== 'settings'"><div class="crm-pipeline-section-heading"><div><h3>Общие настройки</h3><p>Название и назначение воронки</p></div></div><label>Название воронки<input class="crm-input" v-model="draft.name" :disabled="saving" maxlength="120" /></label><label class="crm-pipeline-default"><span><strong>Основная воронка</strong><small>Используется по умолчанию для новых сделок.</small></span><input class="crm-check" v-model="draft.isDefault" :disabled="saving" type="checkbox" /></label><div class="crm-pipeline-archive"><div><h4>Архив воронки</h4><p>{{ selected.isDefault ? 'Для архивации сначала назначьте другую основную воронку.' : 'Уберите воронку из активных. История сделок сохранится.' }}</p></div><button class="crm-button crm-button--danger" :disabled="saving || selected.isDefault" @click="archivePipeline"><Trash2 :size="16" /> В архив</button></div></section>
                </template>
                <div v-else class="crm-pipeline-empty"><h3>{{ error ? 'Не удалось загрузить воронки' : 'Создайте первую воронку' }}</h3><p v-if="!error">Настройте этапы под процесс вашей команды.</p><button class="crm-button" :disabled="saving" @click="error ? load() : startCreate()"><Plus v-if="!error" :size="18" />{{ error ? 'Повторить загрузку' : 'Новая воронка' }}</button></div>
              </div>
            </template>
          </div>
        </div>
        <footer class="crm-pipeline-footer"><span role="status">{{ saving ? 'Сохраняем…' : dirty ? 'Есть несохранённые изменения' : notice || 'Все изменения сохранены' }}</span><template v-if="creating"><button class="crm-button" :disabled="saving" @click="cancelCreate">Отмена</button><button class="crm-button crm-button--primary" type="submit" form="pipeline-create-form" :disabled="saving || !newName.trim()">Создать воронку</button></template><template v-else-if="stageDraft && tab === 'stages'"><button class="crm-button" :disabled="saving" @click="cancelStage">Отмена</button><button class="crm-button crm-button--primary" type="submit" form="pipeline-stage-form" :disabled="saving || (!!stageDraft.id && !stageDirty)">{{ stageDraft.id ? 'Сохранить этап' : 'Добавить этап' }}</button></template><template v-else><button v-if="pipelineDirty || newReason.trim()" class="crm-button crm-button--primary" :disabled="saving" @click="savePipeline">Сохранить настройки</button><button class="crm-button" :disabled="saving" @click="close">Готово</button></template></footer>
      </section>
    </div>
  </Teleport>
</template>
