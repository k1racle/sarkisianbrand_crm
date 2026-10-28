<script setup lang="ts">
import { RefreshCw, Search } from '@lucide/vue';

type Market = 'wildberries' | 'ozon';
type Mode = 'WB_FBS' | 'OZON_FBS' | 'OZON_FBO';
type Status = { supported?: boolean; enabled: boolean; configured: boolean; automatic?: boolean; running?: boolean; isRunning?: boolean; hasMore?: boolean; hasNext?: boolean; coverageGap?: boolean; lastSuccessAt?: string | null; lastError?: string | null };
type Variant = { id: string; sku: string; name?: string | null; product?: { nameRu?: string } };
type Unresolved = { externalVariantId: string; article?: string; orders: number };
type Mapping = { externalVariantId: string; variantId: string; variant: { sku: string; name?: string | null } };

const access = useWorkspaceAccess(), session = useWorkspaceSession(), config = useRuntimeConfig(), route = useRoute();
const status = reactive<Partial<Record<Mode, Status>>>({});
const statusErrors = reactive<Partial<Record<Mode, string>>>({});
const busy = ref<Mode | null>(null), loading = ref(false), message = ref(''), error = ref('');
const unresolved = reactive<Record<Market, Unresolved[]>>({ wildberries: [], ozon: [] });
const mappings = reactive<Record<Market, Mapping[]>>({ wildberries: [], ozon: [] });
const truncated = reactive<Record<Market, boolean>>({ wildberries: false, ozon: false });
const mappingError = reactive<Record<Market, string>>({ wildberries: '', ozon: '' });
const selected = ref<{ market: Market; item: Unresolved } | null>(null);
const search = ref(''), variants = ref<Variant[]>([]), selectedVariant = ref(''), searching = ref(false), mappingBusy = ref(false);
let generation = 0, searchGeneration = 0;
const canSync = computed(() => ['marketplace.read', 'marketplace.write', 'customers.read', 'customers.write'].every(key => access.can(key)));
const canReadMappings = computed(() => access.can('marketplace.read') && access.can('catalog.read'));
const canMap = computed(() => canReadMappings.value && access.can('marketplace.configure'));
const settingsPath = computed(() => route.path.startsWith('/crm/') ? '/crm/settings/integrations' : '/system-settings/integrations');
const request = <T>(path: string, options: any = {}) => $fetch<T>(path, { baseURL: config.public.apiBase, headers: { Authorization: `Bearer ${session.token.value}` }, timeout: 120000, retry: 0, ...options });
const reason = (value: any) => Array.isArray(value?.data?.message) ? value.data.message.join(', ') : typeof value?.data?.message === 'string' ? value.data.message : 'Не удалось получить данные. Обновите страницу или проверьте права доступа.';
const date = (value?: string | null) => value ? new Date(value).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' }) : 'ещё не загружались';
const rows: { key: Mode; title: string; description: string }[] = [
  { key: 'WB_FBS', title: 'Wildberries · FBS', description: 'Заказы для сборки на нашем складе' },
  { key: 'OZON_FBS', title: 'Ozon · FBS', description: 'Заказы для сборки на нашем складе' },
  { key: 'OZON_FBO', title: 'Ozon · FBO', description: 'Заказы со склада Ozon' },
];

async function refresh() {
  if (!session.token.value || !access.can('marketplace.read')) return;
  const version = ++generation, identity = session.token.value;
  loading.value = true;
  const [wb, ozon, wbMissing, ozonMissing, wbMappings, ozonMappings] = await Promise.allSettled([
    request<Status>('/marketplaces/wildberries/fbs/status'),
    request<Record<'FBS' | 'FBO', Status>>('/marketplaces/ozon/status'),
    canReadMappings.value ? request<{ items: Unresolved[]; truncated: boolean }>('/marketplaces/wildberries/fbs/unresolved') : Promise.resolve(null),
    canReadMappings.value ? request<{ items: Unresolved[]; truncated: boolean }>('/marketplaces/ozon/unresolved') : Promise.resolve(null),
    canReadMappings.value ? request<Mapping[]>('/marketplaces/wildberries/fbs/mappings') : Promise.resolve([]),
    canReadMappings.value ? request<Mapping[]>('/marketplaces/ozon/mappings') : Promise.resolve([]),
  ]);
  if (version !== generation || identity !== session.token.value) return;
  if (wb.status === 'fulfilled') { status.WB_FBS = wb.value; statusErrors.WB_FBS = ''; } else { delete status.WB_FBS; statusErrors.WB_FBS = reason(wb.reason); }
  if (ozon.status === 'fulfilled') { status.OZON_FBS = ozon.value.FBS; status.OZON_FBO = ozon.value.FBO; statusErrors.OZON_FBS = ''; statusErrors.OZON_FBO = ''; }
  else { delete status.OZON_FBS; delete status.OZON_FBO; statusErrors.OZON_FBS = reason(ozon.reason); statusErrors.OZON_FBO = reason(ozon.reason); }
  for (const [market, result] of [['wildberries', wbMissing], ['ozon', ozonMissing]] as const) {
    if (result.status === 'fulfilled') { unresolved[market] = result.value?.items || []; truncated[market] = Boolean(result.value?.truncated); mappingError[market] = ''; }
    else { unresolved[market] = []; mappingError[market] = reason(result.reason); }
  }
  for (const [market, result] of [['wildberries', wbMappings], ['ozon', ozonMappings]] as const) {
    if (result.status === 'fulfilled') mappings[market] = result.value;
    else { mappings[market] = []; mappingError[market] = reason(result.reason); }
  }
  loading.value = false;
}

function statusText(value?: Status) {
  if (!value) return 'Состояние неизвестно';
  if (value.supported === false) return 'Загрузка пока не подключена';
  if (!value.enabled) return 'Подключение выключено';
  if (!value.configured) return 'Нужны настройки API';
  if (value.running || value.isRunning) return 'Обмен выполняется';
  if (value.lastError) return 'Последний обмен не завершён';
  if (value.coverageGap) return 'Требуется сверить пропущенный период';
  if (value.hasMore || value.hasNext) return 'Есть необработанные страницы';
  if (value.lastSuccessAt) return 'Последняя страница получена';
  return 'Ожидает первой загрузки';
}
async function sync(key: Mode) {
  if (!canSync.value || busy.value) return;
  busy.value = key; message.value = ''; error.value = '';
  try {
    if (key === 'WB_FBS') {
      const result = await request<{ processed: number; unmapped: number; hasMore: boolean }>('/marketplaces/wildberries/fbs/sync', { method: 'POST' });
      message.value = `Wildberries: обработано заказов — ${result.processed}. ${result.unmapped ? `Без сопоставления — ${result.unmapped}. ` : ''}${result.hasMore ? 'Есть следующие страницы: продолжите загрузку.' : 'Текущий проход завершён.'}`;
    } else {
      const mode = key === 'OZON_FBS' ? 'FBS' : 'FBO';
      const result = await request<{ processed: number; conflicts: number; hasNext: boolean }>('/marketplaces/ozon/sync', { method: 'POST', body: { mode } });
      message.value = `Ozon ${mode}: обработано отправлений — ${result.processed}. ${result.conflicts ? `На сверке — ${result.conflicts}. ` : ''}${result.hasNext ? 'Есть следующие страницы: продолжите загрузку.' : 'Текущий проход завершён.'}`;
    }
    await refresh();
  } catch (e: any) { error.value = reason(e); await refresh(); }
  finally { busy.value = null; }
}

function openMapping(market: Market, item: Unresolved) { selected.value = { market, item }; search.value = ''; selectedVariant.value = ''; variants.value = []; error.value = ''; }
async function findVariants() {
  if (!selected.value || !canReadMappings.value) return;
  const version = ++searchGeneration, current = selected.value, query = search.value.trim();
  if (!query) { variants.value = []; error.value = 'Введите название товара или SKU для поиска.'; return; }
  searching.value = true; selectedVariant.value = ''; error.value = '';
  try {
    const list = await request<Variant[]>(`/marketplaces/${current.market === 'wildberries' ? 'wildberries/fbs' : 'ozon'}/variants`, { query: { search: query } });
    if (version === searchGeneration && selected.value === current) variants.value = list;
  } catch (e: any) { if (version === searchGeneration) error.value = reason(e); }
  finally { if (version === searchGeneration) searching.value = false; }
}
async function saveMapping() {
  if (!selected.value || !selectedVariant.value || !canMap.value || mappingBusy.value) return;
  const { market, item } = selected.value;
  mappingBusy.value = true; error.value = ''; message.value = '';
  try {
    await request(`/marketplaces/${market === 'wildberries' ? 'wildberries/fbs' : 'ozon'}/mappings`, { method: 'POST', body: { externalVariantId: item.externalVariantId, variantId: selectedVariant.value } });
    selected.value = null; variants.value = []; search.value = ''; selectedVariant.value = '';
    message.value = 'Соответствие сохранено. Повторите загрузку этой площадки: ранее полученные заказы обновятся при следующем чтении.';
    await refresh();
  } catch (e: any) { error.value = reason(e); }
  finally { mappingBusy.value = false; }
}
watch([() => access.ready.value, () => session.token.value], ([ready, token]) => {
  generation++; searchGeneration++; loading.value = false; selected.value = null; variants.value = []; message.value = ''; error.value = '';
  for (const key of ['WB_FBS', 'OZON_FBS', 'OZON_FBO'] as Mode[]) { delete status[key]; delete statusErrors[key]; }
  unresolved.wildberries = []; unresolved.ozon = []; mappings.wildberries = []; mappings.ozon = []; mappingError.wildberries = ''; mappingError.ozon = '';
  if (ready && token && access.can('marketplace.read')) void refresh();
}, { immediate: true });
onUnmounted(() => { generation++; searchGeneration++; });
</script>

<template>
 <section v-if="access.can('marketplace.read')" class="marketplace-exchange crm-surface" aria-labelledby="marketplace-exchange-title">
  <div class="marketplace-exchange-heading"><div><h2 id="marketplace-exchange-title">Обмен заказами</h2><p>Загружайте заказы площадок в CRM. После сопоставления товаров заказ передаётся в 1С.</p></div><button type="button" class="crm-button" :disabled="loading || !!busy" @click="refresh"><RefreshCw :size="16" /> Обновить состояние</button></div>
  <p class="crm-inline-note">Для передачи заказов в 1С необходимо включённое подключение и работающий обмен. FBO не создаёт задание на нашем складе.</p>
  <p v-if="message" class="marketplace-exchange-message" role="status">{{ message }}</p><p v-if="error" class="marketplace-exchange-error" role="alert">{{ error }}</p>
  <div class="marketplace-exchange-rows">
   <article v-for="row in rows" :key="row.key" class="marketplace-exchange-row">
    <div><h3>{{ row.title }}</h3><p>{{ row.description }}</p></div>
    <div class="marketplace-exchange-status"><strong>{{ statusText(status[row.key]) }}</strong><small v-if="status[row.key]?.lastError">{{ status[row.key]?.lastError }}</small><small v-else-if="statusErrors[row.key]">{{ statusErrors[row.key] }}</small><small v-else-if="status[row.key]?.coverageGap">Возможно, часть заказов не загружена. Проверьте период в кабинете площадки.</small><small v-else-if="status[row.key]?.supported !== false">Последняя страница: {{ date(status[row.key]?.lastSuccessAt) }}<template v-if="status[row.key]?.automatic"> · Автообновление включено</template></small></div>
    <button v-if="canSync && status[row.key]?.supported !== false" type="button" class="crm-button" :disabled="loading || !!busy || !status[row.key]?.enabled || !status[row.key]?.configured || status[row.key]?.running || status[row.key]?.isRunning" @click="sync(row.key)">{{ busy === row.key ? 'Загружаем…' : status[row.key]?.hasMore || status[row.key]?.hasNext ? 'Продолжить загрузку' : 'Загрузить заказы' }}</button>
   </article>
  </div>
  <p v-if="!canSync" class="crm-muted">Для запуска загрузки нужны права на маркетплейсы и клиентскую базу всей компании.</p>
  <p class="crm-muted">Возвраты площадок отдельным потоком пока не загружаются. После записи заказа CRM ожидает подтверждение 1С.</p>
  <NuxtLink v-if="access.can('system.manage')" :to="settingsPath">Открыть настройки интеграций</NuxtLink>
  <section v-if="canReadMappings" class="marketplace-exchange-mapping" aria-labelledby="marketplace-mapping-title">
   <div><h3 id="marketplace-mapping-title">Товары без соответствия</h3><p>Выберите товар из каталога для каждого варианта площадки. Пока соответствия нет, заказ не передаётся в 1С.</p></div>
   <template v-for="market in (['wildberries','ozon'] as Market[])" :key="market">
    <h4>{{ market === 'wildberries' ? 'Wildberries' : 'Ozon' }}</h4>
    <p v-if="mappingError[market]" class="marketplace-exchange-error" role="status">{{ mappingError[market] }}</p>
    <p v-else-if="!unresolved[market].length" class="crm-muted">Не найдены среди загруженных заказов.</p>
    <article v-for="item in unresolved[market]" :key="item.externalVariantId" class="marketplace-exchange-unresolved"><div><strong>{{ item.article || 'Товар площадки' }}</strong><small>{{ market === 'wildberries' ? 'chrtId' : 'ID товара' }}: {{ item.externalVariantId }} · Заказов: {{ item.orders }}</small></div><button v-if="canMap" type="button" class="crm-button" :disabled="mappingBusy || !!busy" @click="openMapping(market, item)">Выбрать товар</button></article>
    <p v-if="truncated[market]" class="crm-muted">Показана часть списка; после обработки обновите данные.</p>
    <details v-if="mappings[market].length" class="marketplace-exchange-saved"><summary>Сохранённые соответствия: {{ mappings[market].length }}</summary><p class="crm-muted">Замена существующей связи требует сверки заказов и пока недоступна.</p><div v-for="item in mappings[market].slice(0, 50)" :key="item.externalVariantId" class="marketplace-exchange-unresolved"><span>{{ item.externalVariantId }}</span><strong>{{ item.variant.name }} · {{ item.variant.sku }}</strong></div><p v-if="mappings[market].length > 50" class="crm-muted">Показаны первые 50 соответствий.</p></details>
   </template>
   <p v-if="!canMap" class="crm-muted">Для сохранения соответствий обратитесь к сотруднику с правом настройки маркетплейсов.</p>
   <div v-if="selected" class="marketplace-exchange-editor crm-item-card" aria-labelledby="marketplace-selected-title">
    <h4 id="marketplace-selected-title">{{ selected.item.article || 'Товар площадки' }} · {{ selected.item.externalVariantId }}</h4>
    <form class="marketplace-exchange-search" @submit.prevent="findVariants"><label class="crm-field">Поиск по названию или SKU<input v-model="search" class="crm-input" maxlength="80" :disabled="searching || mappingBusy" /></label><button class="crm-button" type="submit" :disabled="searching || mappingBusy"><Search :size="16" /> Найти</button></form>
    <p v-if="searching" role="status">Ищем в каталоге…</p>
    <label v-else-if="variants.length" class="crm-field">Товар каталога<select v-model="selectedVariant" class="crm-input" :disabled="mappingBusy"><option value="">Выберите товар</option><option v-for="variant in variants" :key="variant.id" :value="variant.id">{{ variant.product?.nameRu || variant.name }} · {{ variant.name }} · {{ variant.sku }}</option></select></label>
    <p v-else-if="search && !error" class="crm-muted">Товары пока не найдены. Уточните название или SKU и нажмите «Найти».</p>
    <div class="marketplace-exchange-actions"><button type="button" class="crm-button crm-button--primary" :disabled="!selectedVariant || mappingBusy" @click="saveMapping">Сохранить соответствие</button><button type="button" class="crm-button" :disabled="mappingBusy" @click="selected = null">Отмена</button></div>
   </div>
  </section>
 </section>
</template>
