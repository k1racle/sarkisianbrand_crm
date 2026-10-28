<script setup lang="ts">
import { AlertTriangle, Clock3, FileText, RefreshCw } from '@lucide/vue';
import { requestKey as createRequestKey } from '~/shared/request-key';
import { orderTransfer, warehouseDocumentName, warehouseExecution, warehouseFactAt, warehouseNeedsReview, warehouseNumber, warehouseQuantity, warehouseStatusLabel, warehouseTotal } from '~/shared/warehouse-execution';
const props = defineProps<{ order: any; disabled: boolean; readonly?: boolean; reload: () => Promise<void> }>();
const emit = defineEmits<{ busy: [value: boolean] }>();
const busy = ref(false), error = ref('');
const config = useRuntimeConfig(), session = useWorkspaceSession();
const compositionChecked = ref(false), pricesChecked = ref(false), localWarehouseConfirmed = ref(false), paymentTerms = ref(''), deliveryTerms = ref('');
const pending = ref<{ signature: string; key: string } | null>(null);
const marketplace = computed(() => ['OZON', 'WILDBERRIES', 'YANDEX_MARKET', 'MEGAMARKET'].includes(props.order.source));
const physicalOrder = computed(() => props.order.items?.some((item: any) => item.productType !== 'GIFT_CARD'));
const confirmable = computed(() => physicalOrder.value && !props.order.execution && !['CANCELLED', 'REFUNDED', 'SHIPPED', 'DELIVERED'].includes(props.order.status) && (['WEB', 'B2B'].includes(props.order.source) || marketplace.value));
const snapshot = computed(() => warehouseExecution(props.order));
const transfer = computed(() => orderTransfer(props.order));
const factAt = computed(() => warehouseFactAt(props.order));
const needsReview = computed(() => warehouseNeedsReview(props.order));
const status = computed(() => snapshot.value?.status || props.order.oneCStatus);
const performer = computed(() => snapshot.value?.executorName || (typeof snapshot.value?.performer === 'string' ? snapshot.value.performer : snapshot.value?.performer?.displayName || snapshot.value?.performer?.name));
const documents = computed<Array<{ id?: string; kind?: string; number?: string; name?: string; status?: string }>>(() => snapshot.value?.documents?.length ? snapshot.value.documents : snapshot.value?.documentId || snapshot.value?.documentNumber ? [{ id: snapshot.value.documentId, number: snapshot.value.documentNumber }] : props.order.warehouseDocumentId ? [{ id: props.order.warehouseDocumentId }] : []);
const metrics = [ ['reserved', 'В резерве'], ['picked', 'Собрано'], ['checked', 'Проверено'], ['shipped', 'Отгружено'] ] as const;
const date = (value?: string) => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' }) : 'Время не передано';
const adjustedItems = computed(() => props.order.items?.filter((item: any) => (['cancelled', 'returned', 'damaged'] as const).some(metric => (warehouseQuantity(props.order, item.id, metric) || 0) > 0)) || []);
const operationNames: Record<string, string> = { CONFIRM: 'Согласование', PICK: 'Сборка в CRM', SHIP: 'Отгрузка в CRM', CANCEL_REMAINDER: 'Отмена остатка в CRM', RETURN: 'Возврат в CRM' };
async function confirm() {
  if (busy.value || props.disabled || props.readonly) return;
  error.value = '';
  if (!props.order.managerId) { error.value = 'Сначала назначьте ответственного менеджера.'; return; }
  if (!compositionChecked.value || !pricesChecked.value || !paymentTerms.value.trim() || !deliveryTerms.value.trim()) { error.value = 'Проверьте состав и цены, заполните условия оплаты и доставки.'; return; }
  if (marketplace.value && !localWarehouseConfirmed.value) { error.value = 'Подтвердите, что заказ площадки отгружается с нашего склада.'; return; }
  const body = { kind: 'CONFIRM', compositionChecked: true, pricesChecked: true, localWarehouseConfirmed: localWarehouseConfirmed.value, paymentTerms: paymentTerms.value.trim(), deliveryTerms: deliveryTerms.value.trim(), expectedVersion: props.order.execution?.version || 0, expectedUpdatedAt: props.order.updatedAt };
  const signature = JSON.stringify(body);
  if (pending.value?.signature !== signature) pending.value = { signature, key: createRequestKey() };
  busy.value = true; emit('busy', true);
  try { await $fetch(`/oms/orders/${encodeURIComponent(props.order.id)}/execution`, { baseURL: config.public.apiBase, method: 'POST', headers: { Authorization: `Bearer ${session.token.value}` }, body: { ...body, requestKey: pending.value!.key } }); await props.reload(); pending.value = null; }
  catch (e: any) { error.value = e?.data?.message || 'Не удалось подтвердить условия заказа. Обновите карточку и повторите попытку.'; }
  finally { busy.value = false; emit('busy', false); }
}
async function refresh() {
  if (props.disabled || busy.value) return;
  busy.value = true; error.value = ''; emit('busy', true);
  try { await props.reload(); }
  catch (e: any) { error.value = e?.data?.message || 'Не удалось обновить данные склада. Повторите попытку.'; }
  finally { busy.value = false; emit('busy', false); }
}
</script>

<template>
  <section v-if="physicalOrder" class="crm-stack crm-order-execution crm-warehouse-monitor" aria-label="Монитор склада 1С">
    <div class="crm-warehouse-heading"><div><h2>Склад 1С</h2><p>Отбор, проверка и отгрузка выполняются на складе. Здесь — подтверждённые результаты из 1С.</p></div><button class="crm-button crm-button--icon" type="button" aria-label="Обновить данные склада" :disabled="disabled || busy" @click="refresh"><RefreshCw :size="18" /></button></div>
    <p v-if="error" class="crm-order-notice crm-order-notice--danger" role="alert">{{ error }}</p>
    <section v-if="confirmable" class="crm-warehouse-confirm"><h3>Перед передачей на склад</h3><p>Проверьте состав и согласуйте коммерческие условия. Резерв и складское задание затем подтверждает 1С.</p><CrmMarketplaceMapping v-if="marketplace" :order="order" :disabled="disabled || readonly || busy" :reload="reload" @busy="emit('busy', $event)" /><fieldset class="ui-fieldset-reset crm-stack" :disabled="disabled || readonly || busy"><label v-if="marketplace" class="crm-field"><span><input class="crm-check" v-model="localWarehouseConfirmed" type="checkbox" /> Отгружаем с нашего склада, а не со склада площадки</span></label><label class="crm-field"><span><input class="crm-check" v-model="compositionChecked" type="checkbox" /> Состав и количество проверены</span></label><label class="crm-field"><span><input class="crm-check" v-model="pricesChecked" type="checkbox" /> Цены и сумма согласованы</span></label><label class="crm-field">Условия оплаты<textarea v-model="paymentTerms" class="crm-input" rows="2" maxlength="1000" /></label><label class="crm-field">Условия доставки<textarea v-model="deliveryTerms" class="crm-input" rows="2" maxlength="1000" /></label><button class="crm-button crm-button--primary" type="button" @click="confirm">Подтвердить и передать в 1С</button></fieldset></section>
    <section class="crm-warehouse-transfer" aria-label="Передача заказа в 1С"><div><span>Передача заказа</span><strong :data-tone="transfer.tone">{{ transfer.label }}</strong></div><p v-if="!snapshot || order.oneCSyncError" :role="order.oneCSyncError ? 'alert' : undefined">{{ transfer.detail }}</p><small v-if="order.oneCSyncAt && !snapshot">Последнее подтверждение: {{ date(order.oneCSyncAt) }}</small><small v-if="order.externalId">Заказ в 1С: {{ order.externalId }}</small></section>
    <div v-if="!snapshot" class="crm-warehouse-awaiting" role="status"><Clock3 :size="24" /><div><h3>Подтверждённые складские данные ещё не получены</h3><p>Собранные количества и резерв появятся после ответа склада. Прочерк означает отсутствие данных, а не нулевой остаток.</p><small v-if="order.oneCStatus">Последний общий статус из 1С: {{ warehouseStatusLabel(order.oneCStatus) }}. Построчные количества ещё не переданы.</small></div></div>
    <template v-else>
      <div v-if="needsReview" class="crm-warehouse-review" role="alert"><AlertTriangle :size="20" /><div><strong>{{ snapshot.isCurrent === false ? 'Исторические данные склада — требуется обновление' : warehouseStatusLabel(snapshot.status) }}</strong><p>{{ snapshot.error || (snapshot.staleReason === 'ORDER_CHANGED' ? 'Заказ изменился после подтверждения склада. Эти количества относятся к предыдущей версии; ожидаем новое подтверждение 1С.' : 'Показаны последние полученные сведения. Перед изменением заказа уточните состояние документов у ответственного в 1С.') }}</p></div></div>
      <dl class="crm-warehouse-facts"><div><dt>Состояние склада</dt><dd>{{ warehouseStatusLabel(status) }}</dd></div><div><dt>Данные на</dt><dd>{{ date(factAt) }}</dd></div><div><dt>Склад</dt><dd>{{ snapshot.warehouseName || snapshot.warehouseId || 'Не передан' }}</dd></div><div><dt>Исполнитель</dt><dd>{{ performer || 'Не передан' }}</dd></div><div v-if="snapshot.revision != null"><dt>Версия данных 1С</dt><dd>{{ snapshot.revision }}</dd></div></dl>
      <div class="crm-warehouse-totals" :aria-label="snapshot.isCurrent === false ? 'Исторические итоги склада' : 'Подтверждённые итоги склада'"><div v-for="[key, label] in metrics" :key="key"><span>{{ label }}</span><strong>{{ warehouseNumber(warehouseTotal(order, key)) }}</strong></div></div>
    </template>
    <section class="crm-warehouse-lines" aria-labelledby="warehouse-lines-title"><div class="crm-order-section-heading"><h3 id="warehouse-lines-title">Позиции заказа</h3><small>Количества — по данным 1С</small></div><div class="crm-warehouse-table-scroll"><table class="crm-warehouse-table"><thead><tr><th scope="col">Товар</th><th scope="col">Заказано</th><th v-for="[key, label] in metrics" :key="key" scope="col">{{ label }}</th></tr></thead><tbody><tr v-for="item in order.items" :key="item.id"><th scope="row"><strong>{{ item.productName }}</strong><small>{{ [item.variantName, item.variant?.sku || item.externalSku].filter(Boolean).join(' · ') }}</small></th><td data-label="Заказано">{{ item.quantity }}</td><td v-for="[key, label] in metrics" :key="key" :data-label="label" :aria-label="warehouseQuantity(order, item.id, key) == null ? label + ': данные 1С не получены' : undefined">{{ warehouseNumber(warehouseQuantity(order, item.id, key)) }}</td></tr></tbody></table></div><p v-if="!order.items?.length" class="crm-order-empty">Состав заказа не передан.</p><p class="crm-warehouse-caption">«Заказано» — количество из заказа. Остальные значения подтверждает склад 1С; неполные данные отмечены прочерком.</p></section>
    <section v-if="adjustedItems.length" class="crm-warehouse-adjustments"><h3>Отмены и возвраты из 1С</h3><div v-for="item in adjustedItems" :key="item.id"><strong>{{ item.productName }}</strong><p>Отменено: {{ warehouseNumber(warehouseQuantity(order, item.id, 'cancelled')) }} · Возвращено: {{ warehouseNumber(warehouseQuantity(order, item.id, 'returned')) }} · Повреждено: {{ warehouseNumber(warehouseQuantity(order, item.id, 'damaged')) }}</p></div></section>
    <section class="crm-warehouse-documents"><h3>Документы склада</h3><div v-for="(document, index) in documents" :key="document.id || index" class="crm-warehouse-document"><FileText :size="18" /><div><strong>{{ warehouseDocumentName(document) }}{{ document.number ? ' № ' + document.number : '' }}</strong><small v-if="document.id">ID: {{ document.id }}</small><small>{{ document.status ? warehouseStatusLabel(document.status) : 'Состояние документа ещё не передано' }}</small></div></div><p v-if="!documents.length" class="crm-warehouse-caption">Документы ещё не получены из 1С.</p></section>
    <p class="crm-warehouse-caption">Для отмены, возврата или исправления складского документа обратитесь к ответственному в 1С. Подтверждённый результат появится в этой карточке.</p>
    <details v-if="order.execution" class="crm-order-execution-terms crm-ops-help"><summary>Согласованные условия заказа</summary><p v-if="order.execution.paymentTerms">Оплата: {{ order.execution.paymentTerms }}</p><p v-if="order.execution.deliveryTerms">Доставка: {{ order.execution.deliveryTerms }}</p></details>
    <details v-if="order.executionOperations?.length" class="crm-warehouse-legacy crm-ops-help"><summary>Предыдущие операции CRM · {{ order.executionOperations.length }}</summary><p>Сохранены для сверки истории. Эти операции не заменяют новое подтверждение склада 1С.</p><div v-for="operation in order.executionOperations" :key="operation.id"><strong>{{ operationNames[operation.kind] || operation.kind }} · {{ date(operation.createdAt) }}</strong><small>{{ operation.actorName }} · {{ operation.id }}</small></div></details>
  </section>
  <p v-else class="crm-order-muted">Электронный заказ не требует отбора и отгрузки на складе. Получение подарочных карт отображается в заказе покупателя.</p>
</template>
