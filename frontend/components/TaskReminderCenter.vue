<script setup lang="ts">
import { AlarmClock, Check, ChevronRight, X } from '@lucide/vue';

const config = useRuntimeConfig();
const { token, user } = useWorkspaceSession();
const { lastReminder, connectRealtime } = usePlatformChat();
const reminders = ref<any[]>([]);
const collapsed = ref(false);
let poll: ReturnType<typeof setInterval> | undefined;
const allowed = computed(() => ['ADMIN', 'MANAGER_B2B', 'MANAGER_SALES', 'SUPERVISOR'].includes(user.value?.role || ''));
const headers = computed(() => ({ Authorization: `Bearer ${token.value}` }));

async function load() {
  if (!allowed.value || !token.value) return;
  try { reminders.value = await $fetch<any[]>('/crm/reminders', { baseURL: config.public.apiBase, headers: headers.value }); } catch { /* Напоминания не блокируют рабочий интерфейс. */ }
}
async function dismiss(id: string) {
  await $fetch(`/crm/reminders/${id}/dismiss`, { baseURL: config.public.apiBase, method: 'POST', headers: headers.value });
  reminders.value = reminders.value.filter(item => item.id !== id);
}
function openTask(reminder: any) {
  navigateTo(`/crm-tasks?task=${reminder.task.id}`);
}
function due(value?: string) {
  return value ? new Date(value).toLocaleString('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Без срока';
}

watch(lastReminder, reminder => { if (reminder && allowed.value) void load(); });
onMounted(() => { connectRealtime(); void load(); poll = setInterval(load, 60000); });
onBeforeUnmount(() => { if (poll) clearInterval(poll); });
</script>

<template>
  <aside data-v-ui-639b14d2d5e5 v-if="allowed && reminders.length" class="reminder-center" :class="{ collapsed }">
    <header data-v-ui-639b14d2d5e5><span data-v-ui-639b14d2d5e5><AlarmClock data-v-ui-639b14d2d5e5 :size="16"/><b data-v-ui-639b14d2d5e5>Напоминания</b><em data-v-ui-639b14d2d5e5>{{reminders.length}}</em></span><button data-v-ui-639b14d2d5e5 :title="collapsed?'Развернуть':'Свернуть'" @click="collapsed=!collapsed"><X data-v-ui-639b14d2d5e5 v-if="!collapsed" :size="15"/><AlarmClock data-v-ui-639b14d2d5e5 v-else :size="15"/></button></header>
    <div data-v-ui-639b14d2d5e5 v-if="!collapsed">
      <article data-v-ui-639b14d2d5e5 v-for="reminder in reminders" :key="reminder.id">
        <button data-v-ui-639b14d2d5e5 class="open" @click="openTask(reminder)"><span data-v-ui-639b14d2d5e5><b data-v-ui-639b14d2d5e5>{{reminder.task.title}}</b><small data-v-ui-639b14d2d5e5>Срок: {{due(reminder.task.dueDate)}}</small></span><ChevronRight data-v-ui-639b14d2d5e5 :size="15"/></button>
        <button data-v-ui-639b14d2d5e5 class="done" title="Скрыть напоминание" @click="dismiss(reminder.id)"><Check data-v-ui-639b14d2d5e5 :size="14"/></button>
      </article>
    </div>
  </aside>
</template>


