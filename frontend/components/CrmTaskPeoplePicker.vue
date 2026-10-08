<script setup lang="ts">
import { Search, X } from '@lucide/vue';
const props = withDefaults(defineProps<{ taskId?: string; exclude?: string[]; disabled?: boolean }>(), { exclude: () => [] });
const emit = defineEmits<{ select: [user: any]; close: [] }>();
const { request, message } = useCrmDrive();
const query = ref(''), users = ref<any[]>([]), loading = ref(false), error = ref(''), active = ref(0), searchInput = ref<HTMLInputElement>();
const listId = useId();
const people = computed(() => users.value.filter(user => !props.exclude.includes(user.id)));
const person = (u: any) => [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email;
let sequence = 0, timer: ReturnType<typeof setTimeout>;
async function load() {
  const seq = ++sequence; loading.value = true; error.value = '';
  try { const result = await request<any[]>('task-people', { query: { q: query.value, taskId: props.taskId } }); if (seq === sequence) { users.value = result; active.value = 0; } }
  catch (e) { if (seq === sequence) error.value = message(e); }
  finally { if (seq === sequence) loading.value = false; }
}
function choose(user: any) { if (!props.disabled && !loading.value) emit('select', user); }
function keyboard(event: KeyboardEvent) {
  if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); emit('close'); }
  if (['ArrowDown', 'ArrowUp'].includes(event.key)) { event.preventDefault(); active.value = Math.max(0, Math.min(people.value.length - 1, active.value + (event.key === 'ArrowDown' ? 1 : -1))); }
  if (event.key === 'Enter') { event.preventDefault(); if (people.value[active.value]) choose(people.value[active.value]); }
}
watch(query, () => { clearTimeout(timer); ++sequence; loading.value = true; timer = setTimeout(load, 200); });
onMounted(() => { searchInput.value?.focus(); load(); });
onBeforeUnmount(() => { clearTimeout(timer); ++sequence; });
</script>
<template>
  <div class="crm-task-people-picker" @keydown="keyboard">
    <div class="crm-task-people-search">
      <label class="crm-input-group"><Search :size="16" /><input ref="searchInput" class="crm-input" v-model="query" placeholder="Имя или фамилия сотрудника" aria-label="Найти сотрудника" role="combobox" aria-autocomplete="list" :aria-expanded="true" :aria-controls="listId" :aria-activedescendant="people[active] ? `${listId}-${active}` : undefined" :disabled="disabled" /></label>
      <button type="button" class="crm-button crm-button--icon" aria-label="Закрыть выбор сотрудника" @click="emit('close')"><X :size="16" /></button>
    </div>
    <p v-if="error" class="crm-work-error" role="alert">{{ error }} <button type="button" class="crm-button" @click="load">Повторить</button></p>
    <p v-else-if="loading" class="crm-muted" role="status">Ищем сотрудников…</p>
    <div v-else :id="listId" role="listbox" aria-label="Сотрудники" class="crm-task-people-results">
      <button v-for="(user, index) in people" :id="`${listId}-${index}`" :key="user.id" type="button" role="option" :aria-selected="index === active" class="crm-task-person-option" :disabled="disabled" @click="choose(user)">
        <span class="crm-avatar">{{ person(user).slice(0, 1) }}</span><span><strong>{{ person(user) }}</strong><small>{{ user.department?.name || user.email }}</small></span>
      </button>
      <p v-if="!people.length" class="crm-muted">Сотрудники не найдены. Показаны сотрудники с доступом к задаче.</p>
    </div>
  </div>
</template>
