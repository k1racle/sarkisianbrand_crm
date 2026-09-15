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
  <aside v-if="allowed && reminders.length" class="reminder-center" :class="{ collapsed }">
    <header><span><AlarmClock :size="16"/><b>Напоминания</b><em>{{reminders.length}}</em></span><button :title="collapsed?'Развернуть':'Свернуть'" @click="collapsed=!collapsed"><X v-if="!collapsed" :size="15"/><AlarmClock v-else :size="15"/></button></header>
    <div v-if="!collapsed">
      <article v-for="reminder in reminders" :key="reminder.id">
        <button class="open" @click="openTask(reminder)"><span><b>{{reminder.task.title}}</b><small>Срок: {{due(reminder.task.dueDate)}}</small></span><ChevronRight :size="15"/></button>
        <button class="done" title="Скрыть напоминание" @click="dismiss(reminder.id)"><Check :size="14"/></button>
      </article>
    </div>
  </aside>
</template>

<style scoped>
.reminder-center{position:fixed;z-index:650;right:18px;top:18px;width:330px;background:#fff;border:1px solid var(--sb-line);box-shadow:0 16px 45px #0002;font-family:var(--sb-font);color:var(--sb-ink)}.reminder-center>header{height:46px;padding:0 10px 0 14px;background:#1d1e22;color:#fff;display:flex;align-items:center;justify-content:space-between}.reminder-center header span{display:flex;align-items:center;gap:8px}.reminder-center header b{font-size:10px}.reminder-center header em{min-width:18px;height:18px;border-radius:10px;background:var(--sb-coral);display:grid;place-items:center;font-size:8px;font-style:normal}.reminder-center header button{border:0;background:none;color:#fff;width:30px;height:30px}.reminder-center article{min-height:58px;display:grid;grid-template-columns:1fr 36px;border-top:1px solid #eee}.reminder-center .open{border:0;background:#fff;padding:9px 12px;display:flex;align-items:center;justify-content:space-between;text-align:left}.reminder-center .open span{display:grid;gap:5px}.reminder-center .open b{font-size:9px}.reminder-center .open small{font-size:7px;color:#888}.reminder-center .done{border:0;background:#fff;color:#888}.reminder-center button:hover{background:#f3f4f5}.reminder-center.collapsed{width:170px}.reminder-center.collapsed>header{border:0}@media(max-width:700px){.reminder-center{right:8px;top:8px;width:min(330px,calc(100vw - 88px))}}
</style>
