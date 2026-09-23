<script setup lang="ts">
import { MessageSquare } from '@lucide/vue';
defineProps<{ entries: any[]; total: number; busy: boolean; writable: boolean }>();
const text = defineModel<string>({ default: '' });
defineEmits<{ send: [] }>();
const person = (user: any) => [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || 'Система';
</script>

<template>
  <section class="crm-detail-section">
    <h3 class="crm-icon-heading"><MessageSquare :size="18" aria-hidden="true" /><span>Комментарии · {{ total }}</span></h3>
    <div v-if="writable" class="crm-detail-compose">
      <textarea class="crm-input" v-model="text" rows="3" maxlength="10000" aria-label="Текст комментария" placeholder="Написать комментарий" :disabled="busy" @keydown.ctrl.enter.prevent="!busy && text.trim() && $emit('send')" />
      <button type="button" class="crm-button crm-button--primary" :disabled="busy || !text.trim()" @click="$emit('send')">{{ busy ? 'Отправляем…' : 'Отправить' }}</button>
    </div>
    <p v-if="!entries.length" class="crm-muted">Комментариев пока нет.</p>
    <article v-for="entry in entries" :key="entry.id" class="crm-detail-comment">
      <span class="crm-avatar">{{ person(entry.author).slice(0, 1) }}</span>
      <div><strong>{{ person(entry.author) }}</strong><p>{{ entry.body }}</p><time :datetime="entry.createdAt">{{ new Date(entry.createdAt).toLocaleString('ru-RU') }}</time></div>
    </article>
    <slot />
  </section>
</template>
