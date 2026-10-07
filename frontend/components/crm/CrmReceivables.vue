<script setup lang="ts">
import { ArrowLeft, ArrowRight, Database, Info, RefreshCw, Search, X } from '@lucide/vue';
const props = defineProps<{ refreshKey?: string }>();
const emit = defineEmits<{ open: [order: any] }>();
const config = useRuntimeConfig(), session = useWorkspaceSession();
const data = ref<any>(null), page = ref(1), search = ref(''), busy = ref(false), error = ref('');
let generation = 0, timer: ReturnType<typeof setTimeout> | undefined;
const money = (value: any, currency: string) => value == null ? '—' : new Intl.NumberFormat('ru-RU', { style: 'currency', currency }).format(Number(value));
const stateNames: Record<string, string> = { MISSING: 'Нет данных 1С', CURRENT: 'Актуальные данные', STALE: 'Данные устарели', CHANGED: 'Нужна повторная сверка' };
const date = (value: string) => new Date(value).toLocaleString('ru-RU');
const pages = computed(() => Math.max(1, Math.ceil((data.value?.total || 0) / (data.value?.limit || 30))));
async function load() {
  const n = ++generation; busy.value = true; error.value = '';
  try {
    const value = await $fetch('/oms/receivables', { baseURL: config.public.apiBase, headers: { Authorization: 'Bearer ' + session.token.value }, query: { page: page.value, search: search.value.trim() }, retry: 0 });
    if (n === generation) data.value = value;
  } catch (e: any) {
    if (n === generation) { data.value = null; error.value = e?.data?.message || 'Не удалось загрузить расчёты из 1С'; }
  } finally { if (n === generation) busy.value = false; }
}
function refresh() { clearTimeout(timer); void load(); }
function turn(delta: number) { page.value += delta; void load(); }
watch(search, () => { clearTimeout(timer); ++generation; page.value = 1; timer = setTimeout(load, 300); });
watch(() => props.refreshKey, refresh);
watch(() => session.token.value, () => { data.value = null; refresh(); });
onMounted(load);
onBeforeUnmount(() => { ++generation; clearTimeout(timer); });
</script>
<template>
  <section class="crm-surface crm-directory-register" aria-label="Расчёты B2B из 1С" :aria-busy="busy">
    <div class="crm-directory-register-heading"><h2>Расчёты из 1С <span v-if="data">{{ data.total }}</span></h2><small>1С:Комплексная автоматизация</small></div>
    <div class="crm-orders-finance-note"><Info :size="18" aria-hidden="true" /><p>Долг, возвраты и разрешение отгрузки приходят из 1С. Если данных нет, задолженность неизвестна. Для сверки откройте заказ.</p></div>
    <div class="crm-directory-toolbar">
      <div class="crm-input-group crm-directory-search"><Search :size="18" aria-hidden="true" /><input v-model="search" class="crm-input" type="search" aria-label="Номер заказа для расчётов" placeholder="Найти расчёты по номеру заказа" maxlength="150" @keydown.enter.prevent="refresh" /><button v-if="search" class="crm-directory-clear" aria-label="Очистить поиск расчётов" @click="search = ''"><X :size="16" /></button></div>
      <button type="button" class="crm-button crm-button--refresh" :disabled="busy" @click="refresh"><RefreshCw :size="16" />Обновить данные</button>
    </div>
    <p v-if="error" class="crm-orders-error" role="alert">{{ error }}</p>
    <div v-if="data?.items.length" class="crm-directory-columns crm-finance-columns" aria-hidden="true"><span>Заказ</span><span>Состояние расчётов</span><span>Задолженность</span><span>К возврату</span><span /></div>
    <div v-if="data" class="crm-directory-rows">
      <button v-for="row in data.items" :key="row.id" type="button" class="crm-button crm-card-action crm-directory-row crm-finance-row" @click="emit('open', row)">
        <span class="crm-directory-stack"><strong>{{ row.orderNumber }}</strong><small>{{ row.snapshot ? 'Ответ от ' + date(row.snapshot.asOf) : 'Ответ из 1С ещё не получен' }}</small></span>
        <span class="crm-directory-stack"><span class="crm-directory-status" :data-status="row.state === 'CURRENT' ? 'ACTIVE' : 'ON_HOLD'">{{ stateNames[row.state] || 'Состояние не определено' }}</span><small>{{ row.reason }}</small></span>
        <span class="crm-directory-stack"><small class="crm-finance-mobile-label">Задолженность</small><b>{{ row.snapshot ? money(row.snapshot.debt, row.currency) : '—' }}</b><small v-if="row.overdue" class="crm-orders-attention">Просрочена</small><small v-else-if="!row.snapshot">Нет данных</small><small v-else-if="row.state !== 'CURRENT'">Последний ответ 1С</small></span>
        <span class="crm-directory-stack"><small class="crm-finance-mobile-label">К возврату</small><b>{{ row.snapshot ? money(row.snapshot.refundDue, row.currency) : '—' }}</b><small v-if="!row.snapshot">Нет данных</small><small v-else-if="row.state !== 'CURRENT'">Последний ответ 1С</small></span>
        <ArrowRight class="crm-directory-open" :size="18" aria-hidden="true" />
      </button>
    </div>
    <div v-if="!busy && data && !data.items.length" class="crm-directory-empty"><Database :size="28" /><strong>{{ search ? 'Заказ не найден' : 'Нет заказов для сверки' }}</strong><p>{{ search ? 'Проверьте номер или очистите поиск.' : 'Расчёты появятся после оформления B2B-заказов и ответа из 1С.' }}</p><button v-if="search" class="crm-button" @click="search = ''">Очистить поиск</button></div>
    <footer class="crm-directory-footer"><small role="status">{{ busy ? 'Загружаем данные…' : error ? 'Данные недоступны' : 'Найдено: ' + (data?.total || 0) }}</small><nav v-if="data && pages > 1" class="crm-directory-pagination" aria-label="Страницы расчётов"><button type="button" class="crm-button crm-button--icon" aria-label="Предыдущая страница расчётов" :disabled="busy || page <= 1" @click="turn(-1)"><ArrowLeft :size="16" /></button><span>{{ page }} / {{ pages }}</span><button type="button" class="crm-button crm-button--icon" aria-label="Следующая страница расчётов" :disabled="busy || page >= pages" @click="turn(1)"><ArrowRight :size="16" /></button></nav><small v-else class="crm-directory-hint">Нажмите на заказ, чтобы посмотреть документы и запросить сверку</small></footer>
  </section>
</template>