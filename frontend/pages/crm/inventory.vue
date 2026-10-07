<script setup lang="ts">
import { ArrowLeft, ArrowRight, Boxes, PackageCheck, RefreshCw, Search, X, Database, CheckCircle2, AlertTriangle, Clock3 } from '@lucide/vue';
import { resolveProductImageUrl } from '~/shared/product-images';
useHead({ title: 'Товары и остатки — SARKISIAN CRM' });
const config = useRuntimeConfig(), session = useWorkspaceSession();
const data = ref<any>(null), categories = ref<any[]>([]), loading = ref(false), error = ref('');
const section = ref('stock');
const sections = [['stock','Остатки и резервы'],['rules','Минимальный запас']] as const;
const search = ref(''), categoryId = ref(''), stock = ref('ALL'), activity = ref('ALL'), page = ref(1);
const selectedId = ref(''), detail = ref<any>(null), detailLoading = ref(false), detailError = ref(''), orderPage = ref(1), tab = ref('reserves');
const tabs = [['reserves', 'Резервы и отгрузка'], ['sales','Продажи'], ['reconciliation', 'Сверка 1С'], ['product', 'О товаре']] as const;
const reconciliationLabels: Record<string,string> = { MISSING:'Данные 1С ещё не получены', RECEIVED:'Получен снимок 1С', MATCHED:'Остатки совпадают', PENDING:'Документы ожидают отражения в 1С', DIFFERENCE:'Обнаружено расхождение', STALE:'Данные 1С устарели', UNCONFIGURED:'Не настроен склад 1С', WAREHOUSE_CHANGED:'Изменился склад обмена', MAPPING_CHANGED:'Изменилось соответствие товара', HISTORY_INCOMPLETE:'Требуется проверка истории движений' };
const reconciliationHints: Record<string,string> = { MISSING:'После получения остатков из 1С здесь появятся сравнение и состояние обмена. Отсутствие данных не означает нулевой остаток.', MATCHED:'Количество в CRM совпадает с полученным остатком 1С. Все складские документы CRM этой позиции включены в снимок.', PENDING:'С учётом ещё не отражённых в 1С отгрузок и возвратов количество совпадает. Нужен следующий ответ 1С с подтверждением этих документов.', DIFFERENCE:'Количество в CRM отличается от остатка 1С с учётом ожидающих обмена движений. Проверьте складские документы и соответствие товара. Остатки автоматически не исправлялись.', STALE:'Срок актуальности снимка истёк. Для сверки нужен новый ответ 1С; ниже показаны последние полученные значения.', UNCONFIGURED:'Укажите склад в настройках интеграции 1С. Сравнение возможно только для одного и того же склада.', WAREHOUSE_CHANGED:'Снимок относится к прежнему складу. Перед продолжением обмена требуется сверить начальные остатки.', MAPPING_CHANGED:'Артикул или связь с товаром 1С изменились после получения снимка. Требуется проверить соответствие.', HISTORY_INCOMPLETE:'История документов не позволяет надёжно рассчитать остаток: движения отсутствуют, неполны либо превышен объём одной проверки. Требуется сверка с ответственным за склад.' };
const reconciliation = computed(() => detail.value?.reconciliation);
const signed = (value: number) => value > 0 ? `+${value}` : String(value);
const sources: Record<string,string> = { WEB:'Сайт', B2B:'B2B', OZON:'Ozon', WILDBERRIES:'Wildberries', YANDEX_MARKET:'Яндекс Маркет', MEGAMARKET:'Мегамаркет', ONE_C:'1С', MANUAL:'Ручной заказ' };
const statuses: Record<string,string> = { NEW:'Новый', CONFIRMED:'Подтверждён', PAYMENT_WAITING:'Ожидает оплаты', PAID:'Оплачен', ASSEMBLING:'В сборке' };
const request = (path: string, query: any = {}, signal?: AbortSignal) => $fetch<any>(path, { baseURL: config.public.apiBase, headers: { Authorization: `Bearer ${session.token.value}` }, query, signal, retry: 0 });
const message = (e: any) => typeof e?.data?.message === 'string' ? e.data.message : 'Не удалось загрузить данные. Повторите попытку.';
const date = (value: string) => new Date(value).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' });
const money = (value: any, currency: string) => new Intl.NumberFormat('ru-RU', { style:'currency', currency }).format(Number(value));
const picture = (item: any) => resolveProductImageUrl(item.image?.url, config.public.apiBase, config.public.siteUrl);
function address(value: any) {
 if (!value || typeof value !== 'object') return 'Адрес не указан';
 return ['postalCode','city','address','street','house','apartment'].map(key => typeof value[key] === 'string' ? value[key].trim() : '').filter(Boolean).join(', ') || 'Адрес не указан';
}
let generation = 0, detailGeneration = 0, controller: AbortController | undefined, timer: ReturnType<typeof setTimeout> | undefined;
async function load() {
 const n = ++generation; controller?.abort(); controller = new AbortController(); loading.value = true; error.value = '';
 try {
  const result = await request('/oms/inventory', { search: search.value.trim() || undefined, categoryId: categoryId.value || undefined, stock: stock.value, activity: activity.value, page: page.value, limit: 30 }, controller.signal);
  if (n === generation) { data.value = result; categories.value = result.categories; }
 } catch (e: any) { if (n === generation) { error.value = message(e); data.value = null; } }
 finally { if (n === generation) loading.value = false; }
}
async function loadDetail() {
 const id = selectedId.value; if (!id) return;
 const n = ++detailGeneration; detailLoading.value = true; detailError.value = '';
 try { const result = await request(`/oms/inventory/${encodeURIComponent(id)}`, { page: orderPage.value, limit: 20 }); if (n === detailGeneration && selectedId.value === id) detail.value = result; }
 catch (e: any) { if (n === detailGeneration) { detailError.value = message(e); detail.value = null; } }
 finally { if (n === detailGeneration) detailLoading.value = false; }
}
function open(item: any) { selectedId.value = item.id; detail.value = null; orderPage.value = 1; tab.value = 'reserves'; loadDetail(); }
function close() { selectedId.value = ''; detail.value = null; ++detailGeneration; detailLoading.value = false; }
const { panel, keyboard } = useCatalogDialog(computed(() => !!selectedId.value), close);
async function refresh() { await Promise.all([load(), ...(selectedId.value ? [loadDetail()] : [])]); }
function turn(delta: number) { page.value += delta; load(); }
function turnOrders(delta: number) { orderPage.value += delta; loadDetail(); }
watch(search, () => { ++generation; controller?.abort(); loading.value = true; clearTimeout(timer); timer = setTimeout(() => { page.value = 1; load(); }, 300); });
watch([categoryId, stock, activity], () => { clearTimeout(timer); page.value = 1; load(); });
watch(() => session.token.value, () => { close(); data.value = null; load(); });
onMounted(load);
onBeforeUnmount(() => { ++generation; ++detailGeneration; controller?.abort(); clearTimeout(timer); });
</script>
<template>
 <main class="crm-standard crm-inventory">
  <header class="crm-page-header"><div><h1>Товары и остатки</h1><p>Наличие, резервы и предстоящие отгрузки по товарным позициям</p></div><button type="button" class="crm-button crm-button--refresh" :disabled="loading || detailLoading" @click="refresh"><RefreshCw :size="18" />Обновить</button></header>
  <CrmCardTabs v-model="section" prefix="inventory-page" :tabs="sections" label="Разделы товаров и остатков" />
  <section id="inventory-page-rules-panel" class="crm-order-tab-panel" role="tabpanel" aria-labelledby="inventory-page-rules-tab" :hidden="section !== 'rules'" :inert="section !== 'rules'"><CrmStockRules v-if="section === 'rules'" /></section>
  <section id="inventory-page-stock-panel" class="crm-order-tab-panel crm-stack" role="tabpanel" aria-labelledby="inventory-page-stock-tab" :hidden="section !== 'stock'" :inert="section !== 'stock'">
  <p v-if="error" role="alert">{{ error }}</p>
  <div v-if="data" class="crm-summary-grid crm-inventory-kpis" :aria-busy="loading">
   <article class="crm-surface"><span>Товарных позиций</span><strong>{{ data.summary.positions }}</strong><small>По выбранным фильтрам</small></article>
   <article class="crm-surface"><span>На остатке</span><strong>{{ data.summary.stock }} шт.</strong><small>Годные товары, включая резерв</small></article>
   <article class="crm-surface"><span>В резерве</span><strong>{{ data.summary.reserved }} шт.</strong><small>Занято в общем остатке</small></article>
   <article class="crm-surface"><span>Осталось отгрузить</span><strong>{{ data.summary.toShip }} шт.</strong><small>{{ data.allOrdersVisible ? 'По заказам с резервом' : 'По доступным вам заказам с резервом' }}</small></article>
  </div>
  <section class="crm-surface crm-inventory-register" aria-label="Товарные позиции">
   <div class="crm-toolbar crm-inventory-filters">
    <label class="crm-input-group"><Search :size="18" /><input v-model="search" class="crm-input" aria-label="Поиск товаров" placeholder="Название, артикул или вариант" maxlength="200" /></label>
    <select v-model="categoryId" class="crm-input" aria-label="Категория товаров"><option value="">Все категории</option><option v-for="category in categories" :key="category.id" :value="category.id">{{ category.nameRu }}</option></select>
    <select v-model="stock" class="crm-input" aria-label="Фильтр остатков"><option value="ALL">Все остатки</option><option value="RESERVED">Есть резерв</option><option value="AVAILABLE">Есть свободный остаток</option><option value="SHORTAGE">Не хватает под резерв</option><option value="EMPTY">Нет на остатке</option><option value="DAMAGED">Есть повреждённые</option></select>
    <select v-model="activity" class="crm-input" aria-label="Активность товаров"><option value="ALL">Все позиции</option><option value="ACTIVE">Активные</option><option value="INACTIVE">Неактивные</option></select>
   </div>
   <p class="crm-inventory-note" role="status">{{ loading ? 'Загружаем остатки…' : `Найдено: ${data?.total || 0}` }}<span v-if="data && !loading"> · Данные CRM на {{ date(data.asOf) }}</span></p>
   <p v-if="data && !data.allOrdersVisible" class="crm-inventory-note">Остаток и резерв показаны по компании. Отгрузки и расшифровка заказов — в пределах вашего доступа.</p>
   <div class="crm-table-head crm-inventory-row crm-inventory-head" aria-hidden="true"><span>Товарная позиция</span><span>На остатке</span><span>Резерв</span><span>Свободно</span><span>Отгрузить</span><span>Собрано</span><span /></div>
   <div :aria-busy="loading">
    <button v-for="item in data?.items || []" :key="item.id" type="button" class="crm-table-row crm-inventory-row" :disabled="loading" :aria-label="`Резервы: ${item.name}, ${item.sku}`" @click="open(item)">
     <span class="crm-inventory-product"><img v-if="picture(item)" :src="picture(item)" alt="" loading="lazy" /><span v-else class="crm-inventory-placeholder"><Boxes :size="22" /></span><span><strong>{{ item.name }}</strong><small>{{ item.variantName }} · {{ item.sku }}</small><small v-if="!item.active">Неактивная позиция</small><small v-if="item.shortage" class="negative">Не хватает {{ item.shortage }} шт. под резерв</small><small v-if="item.reservationDifference !== 0" class="negative">Резерв требует сверки с заказами</small></span></span>
     <span class="crm-inventory-quantity"><small>На остатке</small><strong>{{ item.stock }}</strong><em class="crm-inventory-sync-hint">{{ item.oneCStock?.status === 'MISSING' || !item.oneCStock ? '1С: нет данных' : item.oneCStock.status === 'RECEIVED' ? '1С: есть снимок' : '1С: нужна сверка' }}</em></span>
     <span class="crm-inventory-quantity"><small>Резерв</small><strong>{{ item.reserved }}</strong></span>
     <span class="crm-inventory-quantity"><small>Свободно</small><strong>{{ item.available }}</strong></span>
     <span class="crm-inventory-quantity"><small>Отгрузить</small><strong>{{ item.toShip }}</strong></span>
     <span class="crm-inventory-quantity"><small>Собрано</small><strong>{{ item.picked }}</strong></span><ArrowRight :size="18" class="crm-inventory-arrow" />
    </button>
   </div>
   <div v-if="!loading && !error && !data?.items.length" class="crm-empty"><Boxes :size="28" /><h2>Позиций не найдено</h2><p>Измените поиск или фильтры.</p></div>
   <footer v-if="data" class="crm-pagination"><button class="crm-button crm-button--icon" type="button" aria-label="Предыдущая страница товаров" :disabled="loading || page <= 1" @click="turn(-1)"><ArrowLeft :size="18" /></button><span>{{ data.page }} / {{ data.pages }}</span><button class="crm-button crm-button--icon" type="button" aria-label="Следующая страница товаров" :disabled="loading || page >= data.pages" @click="turn(1)"><ArrowRight :size="18" /></button></footer>
  </section>
  <p class="crm-inventory-note">Свободно = остаток − резерв. Повреждённые товары учитываются отдельно. Подтверждение остатков и ожидающие обмена движения — во вкладке «Сверка 1С» карточки товара.</p>
  </section>
  <Teleport to="body"><div v-if="selectedId" class="admin-dialog-backdrop crm-detail-backdrop" @click.self="close"><section ref="panel" class="admin-dialog admin-dialog--drawer crm-detail-card" role="dialog" aria-modal="true" aria-labelledby="inventory-title" tabindex="-1" @keydown="keyboard">
   <header><div><p>ТОВАРНАЯ ПОЗИЦИЯ</p><h2 id="inventory-title">{{ detail?.item.name || 'Остатки и резервы' }}</h2><small v-if="detail">{{ detail.item.variantName }} · {{ detail.item.sku }}</small></div><button type="button" class="crm-button crm-button--icon" aria-label="Закрыть товар" @click="close"><X :size="18" /></button></header>
   <CrmCardTabs v-model="tab" prefix="inventory" :tabs="tabs" label="Разделы товарной позиции" />
   <div class="admin-dialog-body crm-detail-body crm-stack" :aria-busy="detailLoading">
    <p v-if="detailLoading" role="status">Обновляем данные…</p><p v-if="detailError" role="alert">{{ detailError }}</p>
    <template v-if="detail">
     <section id="inventory-reserves-panel" class="crm-order-tab-panel crm-stack" role="tabpanel" aria-labelledby="inventory-reserves-tab" :hidden="tab !== 'reserves'" :inert="tab !== 'reserves'">
      <div class="crm-summary-grid crm-inventory-detail-metrics"><div><small>На остатке</small><strong>{{ detail.item.stock }} шт.</strong></div><div><small>В резерве</small><strong>{{ detail.item.reserved }} шт.</strong></div><div><small>Свободно</small><strong>{{ detail.item.available }} шт.</strong></div><div><small>Повреждённые</small><strong>{{ detail.item.damaged }} шт.</strong></div></div>
      <p v-if="detail.item.shortage" class="negative">Не хватает {{ detail.item.shortage }} шт., чтобы покрыть весь резерв.</p>
      <p v-if="detail.item.reservationDifference !== 0" class="negative">Требуется сверка: в резерве {{ detail.item.reserved }} шт., по активным заказам с резервом — {{ detail.item.allocated }} шт. Количества автоматически не исправлялись.</p>
      <p v-if="!detail.allOrdersVisible">Ниже только доступные вам заказы. Общий резерв может включать другие заказы.</p>
      <div><h3>Куда и сколько отгрузить</h3><p>Осталось {{ detail.item.toShip }} шт. · Собрано к отгрузке {{ detail.item.picked }} шт. · Ещё собрать {{ detail.item.toPick }} шт.</p></div>
      <div v-if="!detail.total" class="crm-empty"><PackageCheck :size="28" /><p>Нет доступных заказов с неотгруженным резервом.</p></div>
      <NuxtLink v-for="order in detail.orders" :key="order.id" :to="{ path: '/crm/fulfillment', query: { order: order.id } }" class="crm-item-card crm-stack crm-execution-card crm-inventory-order" :aria-label="`Открыть заказ ${order.orderNumber}`">
       <div class="crm-inventory-order-heading"><strong>{{ order.orderNumber }}</strong><ArrowRight :size="18" /></div><small>{{ sources[order.source] || order.source }} · {{ statuses[order.status] || order.status }}</small>
       <strong>{{ order.destination }}</strong><span>{{ address(order.shippingAddress) }}</span><small>Доставка: {{ order.deliveryDate ? date(order.deliveryDate) : 'срок не указан' }}{{ order.shippingProvider ? ' · ' + order.shippingProvider : '' }}</small><small>Менеджер: {{ order.manager || 'не назначен' }}</small>
       <div class="crm-inventory-order-quantities"><strong>Отгрузить {{ order.remaining }} шт.</strong><span>Собрано {{ order.picked }} шт.</span><span>Ещё собрать {{ order.toPick }} шт.</span></div>
       <p v-if="order.reservationExpired" class="negative">Срок резерва истёк. Резерв ещё удерживается — проверьте заказ.</p><small v-else-if="order.reservationExpiresAt">Резерв до {{ date(order.reservationExpiresAt) }}</small><small v-if="!order.fulfillmentManaged">Задание на сборку ещё не создано.</small>
      </NuxtLink>
      <div v-if="detail.pages > 1" class="crm-pagination"><button type="button" class="crm-button crm-button--icon" aria-label="Предыдущая страница резервов" :disabled="detailLoading || orderPage <= 1" @click="turnOrders(-1)"><ArrowLeft :size="18" /></button><span>{{ detail.page }} / {{ detail.pages }}</span><button type="button" class="crm-button crm-button--icon" aria-label="Следующая страница резервов" :disabled="detailLoading || orderPage >= detail.pages" @click="turnOrders(1)"><ArrowRight :size="18" /></button></div>
     </section>
     <section id="inventory-sales-panel" class="crm-order-tab-panel crm-stack" role="tabpanel" aria-labelledby="inventory-sales-tab" :hidden="tab !== 'sales'" :inert="tab !== 'sales'">
      <h3>Доступность по каналам</h3><p>На складе {{ detail.item.stock }} шт. · В резерве {{ detail.item.reserved }} шт. · Свободно {{ detail.item.available }} шт.</p>
      <div v-for="channel in detail.item.channelStocks || []" :key="channel.channel" class="crm-channel-stock"><strong>{{ sources[channel.channel] }}</strong><strong>{{ channel.quantity }} шт.</strong><small>{{ channel.blocked ? 'Продажи остановлены сценарием минимального запаса.' : channel.quantity ? 'Доступно для новых заказов.' : 'Нет доступного количества.' }} {{ ['WEB','B2B'].includes(channel.channel) ? 'Применяется при оформлении заказа.' : 'Остаток к передаче. Отправка на площадку ещё не подключена.' }}</small></div>
      <p class="crm-inventory-note">Правила настраиваются во вкладке «Минимальный запас». Они не меняют складской остаток и не отменяют уже принятые заказы.</p>
     </section>
     <section id="inventory-reconciliation-panel" class="crm-order-tab-panel crm-stack" role="tabpanel" aria-labelledby="inventory-reconciliation-tab" :hidden="tab !== 'reconciliation'" :inert="tab !== 'reconciliation'">
      <template v-if="reconciliation">
       <div class="crm-stock-status" :data-state="reconciliation.status" role="status"><CheckCircle2 v-if="reconciliation.status === 'MATCHED'" :size="24" /><Clock3 v-else-if="['PENDING','STALE'].includes(reconciliation.status)" :size="24" /><Database v-else-if="reconciliation.status === 'MISSING'" :size="24" /><AlertTriangle v-else :size="24" /><div><h3>{{ reconciliationLabels[reconciliation.status] }}</h3><p>{{ reconciliationHints[reconciliation.status] }}</p></div></div>
       <template v-if="reconciliation.snapshot">
        <div class="crm-stock-snapshot-meta"><span>Снимок на {{ date(reconciliation.snapshot.asOf) }}</span><span>Актуален до {{ date(reconciliation.snapshot.validUntil) }}</span><small>Получен {{ date(reconciliation.snapshot.receivedAt) }} · Версия {{ reconciliation.snapshot.revision }}</small></div>
        <div class="crm-stock-comparison" role="table" aria-label="Сравнение остатков CRM и 1С">
         <div role="row" class="crm-stock-comparison-head"><span role="columnheader">Количество, шт.</span><strong role="columnheader">Годные</strong><strong role="columnheader">Повреждённые</strong></div>
         <div role="row"><span role="rowheader">Сейчас в CRM<small>Включая резерв {{ detail.item.reserved }} шт.</small></span><strong role="cell">{{ detail.item.stock }}</strong><strong role="cell">{{ detail.item.damaged }}</strong></div>
         <div role="row"><span role="rowheader">В снимке 1С<small>Физический остаток, включая резерв</small></span><strong role="cell">{{ reconciliation.snapshot.stock }}</strong><strong role="cell">{{ reconciliation.snapshot.damagedStock }}</strong></div>
         <template v-if="reconciliation.expectedStock !== null">
          <div role="row"><span role="rowheader">Ожидается с учётом движений CRM</span><strong role="cell">{{ reconciliation.expectedStock }}</strong><strong role="cell">{{ reconciliation.expectedDamaged }}</strong></div>
          <div role="row" class="crm-stock-difference"><span role="rowheader">Разница CRM − ожидается</span><strong role="cell">{{ signed(reconciliation.difference) }}</strong><strong role="cell">{{ signed(reconciliation.damagedDifference) }}</strong></div>
         </template>
        </div>
        <div v-if="reconciliation.expectedStock !== null && reconciliation.pendingOperations" class="crm-item-card crm-stack crm-execution-card"><h3>Ещё не отражено в снимке 1С</h3><p>Складских документов: {{ reconciliation.pendingOperations }}</p><div class="crm-stock-pending"><span>Отгружено<strong>−{{ reconciliation.pendingShipped }} шт.</strong></span><span>Возвращено годных<strong>+{{ reconciliation.pendingReturned }} шт.</strong></span><span>Повреждённые возвраты<strong>+{{ reconciliation.pendingDamaged }} шт.</strong></span></div></div>
        <p class="crm-inventory-note">Снимок 1С + годные возвраты − отгрузки, ещё не включённые в него, = ожидаемый годный остаток. Резерв из физического остатка при сверке не вычитается. Приём данных не меняет количества в CRM.</p>
       </template>
      </template>
     </section>
     <section id="inventory-product-panel" class="crm-order-tab-panel crm-stack" role="tabpanel" aria-labelledby="inventory-product-tab" :hidden="tab !== 'product'" :inert="tab !== 'product'">
      <img v-if="picture(detail.item)" :src="picture(detail.item)" :alt="detail.item.name" class="crm-inventory-photo" />
      <div class="crm-item-card crm-stack crm-execution-card"><h3>{{ detail.item.name }}</h3><p>Вариант: {{ detail.item.variantName }}</p><p>Артикул позиции: {{ detail.item.sku }}</p><p>Артикул товара: {{ detail.item.productSku }}</p><p v-if="detail.item.vendorCode">Артикул производителя: {{ detail.item.vendorCode }}</p><p>Цена варианта в каталоге: {{ money(detail.item.price, detail.item.currency) }}</p><p>Категории: {{ detail.item.categories.map((item: any) => item.nameRu).join(', ') || 'не заданы' }}</p><p>{{ detail.item.active ? 'Активная позиция' : 'Неактивная позиция' }}</p><p>{{ detail.item.externalId ? 'ID товара в 1С: ' + detail.item.externalId : 'Товар ещё не связан с 1С' }}</p></div>
     </section>
    </template>
   </div><footer class="crm-detail-footer"><small v-if="detail">Данные на {{ date(detail.asOf) }}</small><button type="button" class="crm-button" :disabled="detailLoading || loading" @click="refresh"><RefreshCw :size="18" />Обновить</button></footer>
  </section></div></Teleport>
 </main>
</template>
