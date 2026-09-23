<script setup lang="ts">
import { RefreshCw, Search, ShieldCheck, X } from '@lucide/vue';
const props = defineProps<{ employeeId: string }>();
const emit = defineEmits<{ close: [] }>();
const session = useWorkspaceSession(), config = useRuntimeConfig();
const result = ref<any>(null), loading = ref(false), error = ref(''), search = ref(''), filter = ref('all');
const sources: Record<string, string> = { ROLE: 'По роли', ALLOW: 'Личное разрешение', DENY: 'Личный запрет', NOT_GRANTED: 'Не выдано', BLOCKED_ACCOUNT: 'Учётная запись заблокирована' };
const visible = computed(() => (result.value?.permissions || []).filter((item: any) =>
  (filter.value === 'all' || item.allowed === (filter.value === 'allowed')) &&
  `${item.description} ${item.key}`.toLocaleLowerCase('ru-RU').includes(search.value.toLocaleLowerCase('ru-RU'))));
const opened = ref(false);
const { panel, keyboard } = useCatalogDialog(computed(() => opened.value), () => emit('close'));
onMounted(() => { opened.value = true; });
let version = 0, controller: AbortController | undefined;
async function load() {
  controller?.abort(); controller = new AbortController();
  const generation = ++version, identity = session.token.value;
  result.value = null; error.value = ''; loading.value = true;
  try {
    const data = await $fetch(`/system-settings/staff/${encodeURIComponent(props.employeeId)}/access-review`, {
      baseURL: config.public.apiBase, headers: { Authorization: `Bearer ${identity}` }, signal: controller.signal, timeout: 15000,
    });
    if (generation === version && identity === session.token.value) result.value = data;
  } catch (e: any) {
    if (generation === version && identity === session.token.value && !controller.signal.aborted) error.value = e?.data?.message || 'Не удалось проверить права. Повторите запрос.';
  } finally { if (generation === version) loading.value = false; }
}
watch(() => `${props.employeeId}:${session.token.value}`, load, { immediate: true });
onBeforeUnmount(() => { ++version; controller?.abort(); });
</script>

<template>
  <Teleport to="body"><div class="admin-dialog-backdrop crm-detail-backdrop" @click.self="emit('close')">
    <section ref="panel" class="admin-dialog admin-dialog--drawer crm-detail-card" role="dialog" aria-modal="true" aria-labelledby="access-review-title" tabindex="-1" @keydown="keyboard">
      <header><div><p class="crm-eyebrow">ПРОВЕРКА ДОСТУПА</p><h2 id="access-review-title">Права сотрудника</h2></div><button type="button" class="crm-button crm-button--icon" aria-label="Закрыть проверку прав" @click="emit('close')"><X :size="18" /></button></header>
      <div class="admin-dialog-body crm-detail-body crm-stack">
        <p v-if="loading" role="status">Проверяем сохранённые настройки…</p><p v-if="error" role="alert">{{ error }}</p>
        <template v-if="result">
          <section class="crm-detail-section">
            <h3 class="crm-icon-heading"><ShieldCheck :size="18" /><span>{{ [result.employee.firstName, result.employee.lastName].filter(Boolean).join(' ') || result.employee.email }}</span></h3>
            <p>{{ result.role?.label }}</p>
            <p>{{ result.role?.description }}</p>
            <p>Отдел: {{ result.employee.department?.name || 'Не назначен' }}</p>
            <p v-if="!result.employee.isActive" role="alert">Учётная запись заблокирована. Доступ закрыт.</p>
            <p role="note">{{ result.dataVisibility.message }}</p>
            <p>Показаны права роли с учётом ранее сохранённых личных разрешений и запретов.</p>
          </section>
          <label class="crm-input-group"><Search :size="18" aria-hidden="true" /><input v-model="search" class="crm-input" aria-label="Поиск разрешений" placeholder="Найти разрешение" /></label>
          <label class="crm-field">Показать<select v-model="filter" class="crm-input"><option value="all">Все разрешения</option><option value="allowed">Разрешённые</option><option value="denied">Недоступные</option></select></label>
          <div class="crm-stack" aria-label="Результат проверки прав"><article v-for="permission in visible" :key="permission.key" class="crm-item-card crm-stack crm-register"><strong>{{ permission.description }}</strong><small>{{ permission.key }}</small><span>{{ permission.allowed ? 'Разрешено' : 'Недоступно' }} · {{ sources[permission.source] || 'Неизвестное правило' }}</span></article><p v-if="!visible.length" class="crm-empty">Нет разрешений по выбранному фильтру.</p></div>
        </template>
      </div>
      <footer class="crm-detail-footer"><button type="button" class="crm-button" @click="emit('close')">Закрыть</button><button type="button" class="crm-button" :disabled="loading" @click="load"><RefreshCw :size="18" />Проверить снова</button></footer>
    </section>
  </div></Teleport>
</template>
