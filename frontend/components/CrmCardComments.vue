<script setup lang="ts">
import { AtSign, MessageSquare } from '@lucide/vue';
const props = defineProps<{ entries: any[]; total: number; busy: boolean; writable: boolean; taskId?: string }>();
const text = defineModel<string>({ default: '' });
const emit = defineEmits<{ send: [mentionIds: string[]] }>();
const person = (user: any) => [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || 'Система';
const textarea = ref<HTMLTextAreaElement>(), choosing = ref(false), mentions = ref<any[]>([]);
let insertion = 0;
const activeMentions = computed(() => mentions.value.filter(user => text.value.includes('@' + person(user))));
function mention(fromTyping = false) {
  if (!props.taskId || props.busy) return;
  insertion = textarea.value?.selectionStart ?? text.value.length;
  if (fromTyping) insertion -= 1;
  choosing.value = true;
}
function typing() {
  const caret = textarea.value?.selectionStart || 0;
  if (text.value[caret - 1] === '@' && (caret < 2 || /\s/.test(text.value[caret - 2]))) mention(true);
}
async function pick(user: any) {
  const end = insertion + (text.value[insertion] === '@' ? 1 : 0);
  const prefix = insertion > 0 && !/\s/.test(text.value[insertion - 1]) ? ' ' : '';
  const token = prefix + '@' + person(user) + ' ';
  text.value = text.value.slice(0, insertion) + token + text.value.slice(end);
  if (!mentions.value.some(row => row.id === user.id)) mentions.value.push(user);
  choosing.value = false; await nextTick(); textarea.value?.focus(); textarea.value?.setSelectionRange(insertion + token.length, insertion + token.length);
}
function send() { if (!props.busy && text.value.trim()) emit('send', activeMentions.value.map(user => user.id)); }
function parts(entry: any) {
  const names = (Array.isArray(entry.mentions) ? entry.mentions : []).map((u: any) => '@' + u.name).sort((a: string, b: string) => b.length - a.length);
  if (!names.length) return [{ text: entry.body, mention: false }];
  const escaped = names.map((name: string) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return String(entry.body).split(new RegExp('(' + escaped.join('|') + ')', 'g')).map(part => ({ text: part, mention: names.includes(part) }));
}
watch(text, value => { if (!value) { mentions.value = []; choosing.value = false; } });
watch(() => props.taskId, () => { mentions.value = []; choosing.value = false; });
</script>

<template>
  <section class="crm-detail-section">
    <h3 class="crm-icon-heading"><MessageSquare :size="18" aria-hidden="true" /><span>Комментарии · {{ total }}</span></h3>
    <div v-if="writable" class="crm-detail-compose">
      <textarea ref="textarea" class="crm-input" v-model="text" rows="3" maxlength="10000" aria-label="Текст комментария" :placeholder="taskId ? 'Написать комментарий… @ — упомянуть сотрудника' : 'Написать комментарий'" :disabled="busy" @input="typing" @keydown.ctrl.enter.prevent="send" />
      <CrmTaskPeoplePicker v-if="choosing && taskId" :task-id="taskId" :exclude="activeMentions.map(user => user.id)" :disabled="busy" @select="pick" @close="choosing = false; textarea?.focus()" />
      <p v-if="activeMentions.length" class="crm-task-mention-hint">Получат уведомление: {{ activeMentions.map(person).join(', ') }}. Они также станут участниками задачи.</p>
      <div class="crm-task-comment-actions"><button v-if="taskId" type="button" class="crm-button" :disabled="busy" @click="mention()"><AtSign :size="16" />Упомянуть</button><button type="button" class="crm-button crm-button--primary" :disabled="busy || !text.trim()" @click="send">{{ busy ? 'Отправляем…' : 'Отправить' }}</button></div>
    </div>
    <p v-if="!entries.length" class="crm-muted">Комментариев пока нет.</p>
    <article v-for="entry in entries" :key="entry.id" class="crm-detail-comment">
      <span class="crm-avatar">{{ person(entry.author).slice(0, 1) }}</span>
      <div><strong>{{ person(entry.author) }}</strong><p><span v-for="(part, index) in parts(entry)" :key="index" :class="{ 'crm-task-mention': part.mention }">{{ part.text }}</span></p><time :datetime="entry.createdAt">{{ new Date(entry.createdAt).toLocaleString('ru-RU') }}</time></div>
    </article>
    <slot />
  </section>
</template>
