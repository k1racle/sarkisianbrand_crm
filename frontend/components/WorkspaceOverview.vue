<script setup lang="ts">
import { ArrowRight, CheckCheck, ClipboardList, Clock3, Headphones, Package, RefreshCw, ShoppingBag } from '@lucide/vue';
const config = useRuntimeConfig();
const { token, user } = useWorkspaceSession();
const access = useWorkspaceAccess();
const { leaves } = useWorkspaceNavigation();
type Source = 'store' | 'support' | 'tasks';
type SourceState = { loading: boolean; error: string; data: any | null };
const states = reactive<Record<Source, SourceState>>({ store: { loading: false, error: '', data: null }, support: { loading: false, error: '', data: null }, tasks: { loading: false, error: '', data: null } });
const has = (id: string) => leaves.value.some(item => item.id === id);
const sources = computed<Source[]>(() => [...(has('web-dashboard') ? ['store' as const] : []), ...(has('helpdesk') ? ['support' as const] : []), ...(has('tasks') ? ['tasks' as const] : [])]);
const identity = computed(() => `${user.value?.id || ''}:${token.value}:${access.ready.value}:${sources.value.join(',')}`);
const busy = computed(() => Object.values(states).some(item => item.loading));
const refreshedAt = ref('');
let controller: AbortController | undefined;
let generation = 0;
const endpoints: Record<Source, string> = { store: '/admin/dashboard', support: '/helpdesk/dashboard', tasks: '/crm/tasks' };
const titles: Record<Source, string> = { store: 'Магазин', support: 'Поддержка', tasks: 'Мои задачи' };
async function load() {
  const current = ++generation, requestedIdentity = identity.value;
  controller?.abort(); controller = new AbortController();
  refreshedAt.value = '';
  for (const key of Object.keys(states) as Source[]) Object.assign(states[key], { loading: false, error: '', data: null });
  if (!token.value || !user.value?.id || !access.ready.value) return;
  const signal = controller.signal;
  await Promise.all(sources.value.map(async source => {
    states[source].loading = true;
    try {
      const result = await $fetch<any>(endpoints[source], { baseURL: config.public.apiBase, headers: { Authorization: `Bearer ${token.value}` }, query: source === 'tasks' ? { assignedToId: user.value!.id } : undefined, signal, timeout: 12000 });
      if (signal.aborted || current !== generation || requestedIdentity !== identity.value) return;
      if (source === 'tasks' ? !Array.isArray(result) : !result || typeof result !== 'object' || Array.isArray(result)) throw new Error('invalid-response');
      states[source].data = result;
    } catch (error: any) {
      if (signal.aborted || current !== generation || requestedIdentity !== identity.value) return;
      states[source].error = error?.statusCode === 403 || error?.response?.status === 403 ? 'Нет доступа к данным. Обновите права или обратитесь к администратору.' : 'Не удалось загрузить данные. Повторите загрузку.';
    } finally { if (current === generation && requestedIdentity === identity.value) states[source].loading = false; }
  }));
  if (!signal.aborted && current === generation && requestedIdentity === identity.value) refreshedAt.value = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}
watch(identity, load, { immediate: true });
onBeforeUnmount(() => { ++generation; controller?.abort(); });
const taskList = computed<any[]>(() => Array.isArray(states.tasks.data) ? states.tasks.data.filter((task: any) => !['DONE', 'CANCELLED'].includes(task.status)) : []);
const urgentTasks = computed(() => [...taskList.value].sort((a, b) => deadline(a) - deadline(b)).slice(0, 5));
function deadline(task: any) { const time = task.dueDate ? Date.parse(task.dueDate) : NaN; return Number.isFinite(time) ? time : Infinity; }
function dueLabel(task: any) { return Number.isFinite(deadline(task)) ? new Date(deadline(task)).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }) : 'Без срока'; }
function number(value: unknown) { return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value.toLocaleString('ru-RU') : '—'; }
const metrics = computed(() => {
  const store = states.store.data, support = states.support.data;
  return [
    ...(has('web-orders') && sources.value.includes('store') ? [{ id: 'orders', label: 'Новые заказы', value: number(store?.newOrders), detail: 'Ожидают обработки · интернет-магазин', to: '/admin-workspace?section=orders&status=NEW', source: 'store' as Source, icon: ShoppingBag }, { id: 'paid', label: 'Оплаченные заказы', value: number(store?.paidOrders), detail: 'За всё время · подтверждённая оплата', to: '/admin-workspace?section=orders', source: 'store' as Source, icon: CheckCheck }] : []),
    ...(has('products') && sources.value.includes('store') ? [{ id: 'catalog', label: 'Опубликовано товаров', value: number(store?.products), detail: 'Текущий каталог магазина', to: '/admin-workspace?section=products', source: 'store' as Source, icon: Package }] : []),
    ...(sources.value.includes('tasks') ? [{ id: 'tasks', label: 'Мои активные задачи', value: states.tasks.data ? number(taskList.value.length) : '—', detail: 'Среди последних 500 загруженных задач', to: '/crm-tasks', source: 'tasks' as Source, icon: ClipboardList }] : []),
    ...(sources.value.includes('support') ? [{ id: 'support', label: 'Новые заявки', value: number(support?.new), detail: 'Текущая очередь поддержки', to: '/helpdesk?section=tickets', source: 'support' as Source, icon: Headphones }] : []),
  ];
});
</script>

<template>
  <section class="wo-overview" aria-labelledby="workspace-overview-title">
    <div class="wo-heading"><div><p class="eyebrow">ОБЗОР РАБОТЫ</p><h2 id="workspace-overview-title">Главное под рукой</h2><p>Заказы, задачи и обращения доступных вам разделов.</p></div><button type="button" class="wo-button wo-button--white" :disabled="busy || !access.ready.value" @click="load"><RefreshCw :size="17" :class="{ 'wo-spin': busy }" /> Обновить обзор</button></div>
    <p v-if="!access.ready.value" class="wo-notice" role="status">{{ access.loading.value ? 'Проверяем доступ к данным…' : 'Не удалось проверить доступ к обзору.' }} <button v-if="!access.loading.value" type="button" class="wo-text-button" @click="access.refresh">Повторить проверку</button></p>
    <div v-else-if="metrics.length" class="wo-metrics"><NuxtLink v-for="metric in metrics" :key="metric.id" :to="metric.to" class="wo-metric" :aria-busy="states[metric.source].loading"><span class="wo-metric-top"><span>{{ metric.label }}</span><component :is="metric.icon" :size="20" /></span><strong>{{ states[metric.source].loading ? '…' : metric.value }}</strong><small>{{ states[metric.source].error ? 'Данные недоступны' : metric.detail }}</small><ArrowRight :size="18" class="wo-metric-arrow" /></NuxtLink></div>
    <p v-else class="wo-notice">Для вашей роли доступны быстрые переходы ниже. Данные других отделов не запрашиваются.</p>
    <p v-for="source in sources.filter(item => states[item].error)" :key="source" class="wo-notice" role="alert"><strong>{{ titles[source] }}:</strong> {{ states[source].error }}</p>
    <div v-if="access.ready.value && sources.includes('tasks')" class="wo-task-panel"><header><div><Clock3 :size="20" /><h3>Ближайшие мои задачи</h3></div><NuxtLink to="/crm-tasks" class="wo-text-link">Все задачи <ArrowRight :size="17" /></NuxtLink></header><p v-if="states.tasks.loading" role="status">Загружаем задачи…</p><p v-else-if="states.tasks.error">Список появится после успешной загрузки.</p><p v-else-if="!urgentTasks.length">Активных задач в загруженном списке нет.</p><ol v-else><li v-for="task in urgentTasks" :key="task.id"><span class="wo-task-dot" aria-hidden="true"></span><span>{{ task.title || 'Задача без названия' }}</span><time :datetime="task.dueDate || undefined">{{ dueLabel(task) }}</time></li></ol></div>
    <p v-if="refreshedAt" class="wo-updated">Обновлено в {{ refreshedAt }} · «—» — данные недоступны</p>
  </section>
</template>
