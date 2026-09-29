<script setup lang="ts">
import { AlarmClock, Check, ChevronRight, X } from '@lucide/vue';

const { lastReminder, connectRealtime } = usePlatformChat();
const { reminders, allowed, canDismiss, busy, error, load, dismiss } = useCrmReminders();
const collapsed = ref(false);
let poll: ReturnType<typeof setInterval> | undefined;
function openTask(reminder: any) {
  if (allowed.value) navigateTo(`/crm/tasks?task=${encodeURIComponent(reminder.task.id)}`);
}
function due(value?: string) {
  return value ? new Date(value).toLocaleString('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Без срока';
}

watch(lastReminder, reminder => { if (reminder && allowed.value) void load(); });
onMounted(() => { connectRealtime(); void load(); poll = setInterval(load, 60000); });
onBeforeUnmount(() => { if (poll) clearInterval(poll); });
</script>

<template>
  <aside data-v-ui-639b14d2d5e5 v-if="allowed && reminders.length" class="reminder-center crm-surface" :class="{ collapsed }" aria-label="Напоминания о задачах">
    <header data-v-ui-639b14d2d5e5><span data-v-ui-639b14d2d5e5><AlarmClock data-v-ui-639b14d2d5e5 :size="16"/><b data-v-ui-639b14d2d5e5>Напоминания</b><em data-v-ui-639b14d2d5e5>{{reminders.length}}</em></span><button class="crm-button" data-v-ui-639b14d2d5e5 :title="collapsed?'Развернуть':'Свернуть'" :aria-expanded="!collapsed" @click="collapsed=!collapsed"><X data-v-ui-639b14d2d5e5 v-if="!collapsed" :size="15"/><AlarmClock data-v-ui-639b14d2d5e5 v-else :size="15"/></button></header>
    <div data-v-ui-639b14d2d5e5 v-if="!collapsed">
      <p v-if="error" class="crm-inline-note" role="alert">{{ error }}</p>
      <article data-v-ui-639b14d2d5e5 v-for="reminder in reminders" :key="reminder.id">
        <button data-v-ui-639b14d2d5e5 class="open" @click="openTask(reminder)"><span data-v-ui-639b14d2d5e5><b data-v-ui-639b14d2d5e5>{{reminder.task.title}}</b><small data-v-ui-639b14d2d5e5>Срок: {{due(reminder.task.dueDate)}}</small></span><ChevronRight data-v-ui-639b14d2d5e5 :size="15"/></button>
        <button v-if="canDismiss" :disabled="busy" data-v-ui-639b14d2d5e5 class="done crm-button" title="Скрыть напоминание" @click="dismiss(reminder.id)"><Check data-v-ui-639b14d2d5e5 :size="14"/></button>
      </article>
    </div>
  </aside>
</template>
