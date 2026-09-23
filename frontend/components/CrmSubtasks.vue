<script setup lang="ts">
import { ListChecks, Plus, ExternalLink } from '@lucide/vue';
defineProps<{ rows: any[]; team: any[]; busy: boolean; writable: boolean; description: string }>();
const title = defineModel<string>('title', { default: '' });
const assignee = defineModel<string>('assignee', { default: '' });
defineEmits<{ create: []; toggle: [task: any]; open: [task: any] }>();
const person = (user: any) => [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || 'Не назначен';
</script>

<template>
  <section class="crm-detail-section">
    <h3 class="crm-icon-heading"><ListChecks :size="18" aria-hidden="true" /><span>Подзадачи · {{ rows.filter(row => row.status === 'DONE').length }}/{{ rows.length }}</span></h3>
    <p class="crm-muted">{{ description }}</p>
    <p v-if="!rows.length" class="crm-muted">Подзадач пока нет. Разбейте работу на небольшие шаги.</p>
    <div v-for="task in rows" :key="task.id" class="crm-detail-subtask">
      <input class="crm-check" type="checkbox" :checked="task.status === 'DONE'" :disabled="busy || !writable" :aria-label="`Выполнено: ${task.title}`" @change="$emit('toggle', task)" />
      <div>
        <strong>{{ task.title }}</strong>
        <small>{{ person(task.assignedTo || team.find(user => user.id === task.assignedToId)) }} · {{ task.progress || 0 }}%</small>
        <progress :value="task.progress || 0" max="100" :aria-label="`Прогресс: ${task.progress || 0}%`" />
      </div>
      <button type="button" class="crm-button crm-button--icon" :disabled="busy" :aria-label="`Открыть подзадачу: ${task.title}`" @click="$emit('open', task)"><ExternalLink :size="18" /></button>
    </div>
    <div v-if="writable" class="crm-detail-subtask-create">
      <label class="crm-field crm-detail-wide">Название подзадачи<input class="crm-input" v-model="title" maxlength="200" placeholder="Что нужно сделать?" :disabled="busy" @keydown.enter.prevent="$emit('create')" /></label>
      <label class="crm-field">Ответственный за подзадачу<select class="crm-input" v-model="assignee" :disabled="busy"><option v-for="user in team" :key="user.id" :value="user.id">{{ person(user) }}</option></select></label>
      <button type="button" class="crm-button" :disabled="busy || !title.trim()" @click="$emit('create')"><Plus :size="16" />Добавить подзадачу</button>
    </div>
  </section>
</template>
