<script setup lang="ts">
import { X } from '@lucide/vue';
const props = defineProps<{ pipeline?: any; departments: any[] }>();
const emit = defineEmits<{ close: []; saved: [id: string] }>();
const defaults: Record<string, string> = { BACKLOG: 'Бэклог', TODO: 'К выполнению', IN_PROGRESS: 'В работе', REVIEW: 'Проверка', OVERDUE: 'Просрочено', DONE: 'Готово' };
const draft = reactive({ name: props.pipeline?.name || '', departmentId: props.pipeline?.departmentId || '', labels: { ...(props.pipeline?.labels || defaults) } });
const baseline = JSON.stringify(draft), busy = ref(false), error = ref('');
const config = useRuntimeConfig(), session = useWorkspaceSession();
function discard() { return !busy.value && (JSON.stringify(draft) === baseline || window.confirm('Закрыть настройки без сохранения?')); }
function close() { if (discard()) emit('close'); }
const opened = ref(false);
const { panel, keyboard } = useCatalogDialog(computed(() => opened.value), close);
onMounted(() => { opened.value = true; });
onBeforeRouteLeave(discard);
async function save() {
 if (busy.value) return; busy.value = true; error.value = '';
 try {
  const result = await $fetch<any>(props.pipeline ? `/crm/task-pipelines/${props.pipeline.id}` : '/crm/task-pipelines', {
   baseURL: config.public.apiBase, headers: { Authorization: `Bearer ${session.token.value}` }, method: props.pipeline ? 'PATCH' : 'POST',
   body: { ...draft, departmentId: draft.departmentId || null, ...(props.pipeline ? { expectedVersion: props.pipeline.version } : {}) },
  });
  emit('saved', result.id);
 } catch (e: any) { error.value = e?.data?.message || 'Не удалось сохранить настройки'; }
 finally { busy.value = false; }
}
</script>
<template>
 <Teleport to="body"><div class="admin-dialog-backdrop crm-detail-backdrop" @click.self="close">
  <form ref="panel" class="admin-dialog admin-dialog--drawer crm-detail-card" role="dialog" aria-modal="true" aria-labelledby="task-pipeline-title" tabindex="-1" @keydown="keyboard" @submit.prevent="save">
   <header><h2 id="task-pipeline-title">{{ pipeline ? 'Настройки воронки' : 'Новая воронка задач' }}</h2><button type="button" class="crm-button crm-button--icon" aria-label="Закрыть настройки воронки" :disabled="busy" @click="close"><X :size="18" /></button></header>
   <fieldset class="admin-dialog-body crm-detail-body crm-stack ui-fieldset-reset" :disabled="busy">
    <p v-if="error" role="alert">{{ error }}</p>
    <label class="crm-field">Название воронки<input v-model="draft.name" class="crm-input" required maxlength="100" /></label>
    <label class="crm-field">Отдел<select aria-label="Отдел" v-model="draft.departmentId" class="crm-input" :disabled="pipeline?.id === '00000000-0000-4000-8000-000000000001'"><option value="">Все отделы</option><option v-for="department in departments" :key="department.id" :value="department.id">{{ department.name }}</option></select></label>
    <p class="crm-inline-note">Отдел помогает организовать работу. Доступ к задачам определяется правами сотрудников.</p>
    <h3>Названия статусов</h3>
    <label v-for="(label, key) in defaults" :key="key" class="crm-field">{{ label }}<input v-model="draft.labels[key]" class="crm-input" required maxlength="60" /></label>
    <p class="crm-inline-note">Названия действуют только в этой воронке. Завершение задач, проверка сроков и напоминания сохраняют свой смысл.</p>
   </fieldset>
   <footer class="crm-detail-footer"><button type="button" class="crm-button" :disabled="busy" @click="close">Отмена</button><button type="submit" class="crm-button crm-button--primary" :disabled="busy">{{ busy ? 'Сохраняем…' : 'Сохранить воронку' }}</button></footer>
  </form>
 </div></Teleport>
</template>
