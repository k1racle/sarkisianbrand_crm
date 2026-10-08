<script setup lang="ts">
import { UsersRound, UserPlus, X } from '@lucide/vue';
const props = defineProps<{ modelValue: any[]; taskId?: string; writable: boolean; disabled?: boolean }>();
const emit = defineEmits<{ 'update:modelValue': [rows: any[]]; busy: [value: boolean] }>();
const { request, message } = useCrmDrive();
const choosing = ref(false), busy = ref(false), error = ref('');
const person = (u: any) => [u?.firstName, u?.lastName].filter(Boolean).join(' ') || u?.email || 'Сотрудник';
async function change(user: any, remove = false) {
  if (busy.value || props.disabled) return;
  busy.value = true; emit('busy', true); error.value = '';
  try {
    const rows = props.taskId ? await request<any[]>(`tasks/${props.taskId}/participants${remove ? '/' + user.id : ''}`, { method: remove ? 'DELETE' : 'POST', ...(!remove ? { body: { userId: user.id } } : {}) })
      : remove ? props.modelValue.filter(row => row.userId !== user.id) : [...props.modelValue, { userId: user.id, user }];
    emit('update:modelValue', rows); choosing.value = false;
  } catch (e) { error.value = message(e); }
  finally { busy.value = false; emit('busy', false); }
}
</script>
<template>
  <section class="crm-task-participants">
    <header><h3 class="crm-icon-heading"><UsersRound :size="18" /><span>Участники <small>{{ modelValue.length }}</small></span></h3><button v-if="writable" type="button" class="crm-button" :disabled="busy || disabled || modelValue.length >= 30" @click="choosing = !choosing"><UserPlus :size="16" />Добавить</button></header>
    <p class="crm-muted">Помогают выполнить задачу и получают уведомления о новых комментариях.</p>
    <p v-if="error" class="crm-work-error" role="alert">{{ error }}</p>
    <div v-if="modelValue.length" class="crm-task-participant-list">
      <div v-for="row in modelValue" :key="row.userId" class="crm-task-participant"><span class="crm-avatar">{{ person(row.user).slice(0, 1) }}</span><span>{{ person(row.user) }}</span><button v-if="writable" type="button" class="crm-button crm-button--icon" :disabled="busy || disabled" :aria-label="'Удалить участника ' + person(row.user)" @click="change(row.user, true)"><X :size="15" /></button></div>
    </div>
    <CrmTaskPeoplePicker v-if="choosing && writable" :task-id="taskId" :exclude="modelValue.map(row => row.userId)" :disabled="busy || disabled" @select="change($event)" @close="choosing = false" />
  </section>
</template>
