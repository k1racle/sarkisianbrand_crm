<script setup lang="ts">
import { requestKey as createRequestKey } from '~/shared/request-key';
const props = defineProps<{ order: any; disabled: boolean; reload: () => Promise<void> }>();
const emit = defineEmits<{ busy: [value: boolean] }>();
const config = useRuntimeConfig(), session = useWorkspaceSession();
const compositionChecked = ref(false), pricesChecked = ref(false), paymentTerms = ref(''), deliveryTerms = ref(''), trackingNumber = ref('');
const quantities = reactive<Record<string, number>>({}), error = ref(''), busy = ref(false);
const pending = ref<{ signature: string; key: string } | null>(null);
const marketplace = computed(() => ['OZON', 'WILDBERRIES', 'YANDEX_MARKET', 'MEGAMARKET'].includes(props.order.source));
const localWarehouseConfirmed = ref(false);
const terminal = computed(() => ['CANCELLED', 'REFUNDED', 'SHIPPED', 'DELIVERED'].includes(props.order.status));
const eligible = computed(() => (['WEB', 'B2B'].includes(props.order.source) || marketplace.value) && (props.order.reservationState === 'ACTIVE' || (marketplace.value && props.order.reservationState === 'LEGACY')) && !terminal.value && !props.order.marketplaceImportIssue);
const selectedLines = computed(() => props.order.items.map((item: any) => ({ itemId: item.id, quantity: Number(quantities[item.id] || 0) })).filter((item: any) => item.quantity > 0));
const totals = computed(() => props.order.items.reduce((sum: any, item: any) => ({ ordered: sum.ordered + item.quantity, picked: sum.picked + item.pickedQuantity, shipped: sum.shipped + item.shippedQuantity, cancelled: sum.cancelled + item.cancelledQuantity, returned: sum.returned + item.returnedQuantity, damaged: sum.damaged + item.damagedReturnedQuantity }), { ordered: 0, picked: 0, shipped: 0, cancelled: 0, returned: 0, damaged: 0 }));
const operationNames: Record<string, string> = { CONFIRM: 'Подтверждение и задание на сборку', PICK: 'Сборка', SHIP: 'Отгрузка', CANCEL_REMAINDER: 'Отмена неотгруженного остатка', RETURN: 'Приёмка возврата' };
async function execute(kind: 'CONFIRM' | 'PICK' | 'SHIP') {
  if (busy.value || props.disabled) return;
  error.value = '';
  if (!props.order.managerId) { error.value = 'Сначала назначьте ответственного менеджера.'; return; }
  if (kind === 'CONFIRM' && (!compositionChecked.value || !pricesChecked.value || !paymentTerms.value.trim() || !deliveryTerms.value.trim())) { error.value = 'Проверьте состав и цены, заполните условия оплаты и доставки.'; return; }
  if (kind !== 'CONFIRM' && (!selectedLines.value.length || selectedLines.value.some((line: any) => !Number.isSafeInteger(line.quantity)))) { error.value = 'Укажите целое количество хотя бы для одной позиции.'; return; }
  const body = { kind, expectedVersion: props.order.execution?.version || 0, expectedUpdatedAt: props.order.updatedAt,
    ...(kind === 'CONFIRM' ? { localWarehouseConfirmed: localWarehouseConfirmed.value, compositionChecked: compositionChecked.value, pricesChecked: pricesChecked.value, paymentTerms: paymentTerms.value, deliveryTerms: deliveryTerms.value } : { lines: selectedLines.value, ...(kind === 'SHIP' ? { trackingNumber: trackingNumber.value } : {}) }) };
  const signature = JSON.stringify(body);
  if (pending.value?.signature !== signature) pending.value = { signature, key: createRequestKey() };
  busy.value = true; emit('busy', true);
  try {
    await $fetch(`/oms/orders/${encodeURIComponent(props.order.id)}/execution`, { baseURL: config.public.apiBase, method: 'POST', headers: { Authorization: `Bearer ${session.token.value}` }, body: { ...body, requestKey: pending.value!.key } });
    await props.reload();
    pending.value = null; Object.keys(quantities).forEach(key => delete quantities[key]); trackingNumber.value = '';
  } catch (e: any) { error.value = e?.data?.message || 'Не удалось выполнить действие. Повторите запрос или обновите карточку.'; }
  finally { busy.value = false; emit('busy', false); }
}
</script>

<template>
  <section class="crm-stack" aria-label="Сборка и отгрузка">
    <CrmMarketplaceMapping v-if="marketplace" :order="order" :disabled="disabled || busy" :reload="reload" @busy="emit('busy', $event)" />
    <h3>Сборка и отгрузка</h3>
    <p v-if="error" role="alert">{{ error }}</p>
    <template v-if="!order.execution">
      <p>Проверьте позиции во вкладке «Состав» и согласуйте условия. Подтверждение создаст задание на сборку.</p>
      <p v-if="!eligible">Создание задания доступно для физических товаров с действующим резервом до начала сборки.</p>
      <fieldset v-else class="ui-fieldset-reset crm-stack" :disabled="disabled || busy">
        <label v-if="marketplace" class="crm-field"><span><input v-model="localWarehouseConfirmed" type="checkbox" /> Отгружаем с нашего склада, не со склада площадки. Создать резерв.</span></label>
        <label class="crm-field"><span><input v-model="compositionChecked" type="checkbox" /> Состав и количество проверены</span></label>
        <label class="crm-field"><span><input v-model="pricesChecked" type="checkbox" /> Цены и сумма согласованы</span></label>
        <label class="crm-field">Условия оплаты<textarea v-model="paymentTerms" class="crm-input" rows="2" maxlength="1000" placeholder="Например: оплата по счёту до отгрузки" /></label>
        <label class="crm-field">Условия доставки<textarea v-model="deliveryTerms" class="crm-input" rows="2" maxlength="1000" placeholder="Способ, адрес и согласованный срок" /></label>
        <p>Условия фиксируют договорённость с покупателем. Подтверждение не отмечает банковскую оплату.</p>
        <button type="button" class="crm-button crm-button--primary" @click="execute('CONFIRM')">Подтвердить и создать задание</button>
      </fieldset>
    </template>
    <template v-else>
      <div class="crm-item-card crm-stack crm-execution-card"><strong>Задание от {{ new Date(order.execution.confirmedAt).toLocaleString('ru-RU') }}</strong><p>Оплата: {{ order.execution.paymentTerms }}</p><p>Доставка: {{ order.execution.deliveryTerms }}</p></div>
      <p role="status">Заказано: {{ totals.ordered }} · Собрано: {{ totals.picked }} · Отгружено: {{ totals.shipped }} · Осталось отгрузить: {{ totals.ordered - totals.shipped - totals.cancelled }}</p>
      <p v-if="totals.cancelled || totals.returned">Отменено: {{ totals.cancelled }} · Возвращено: {{ totals.returned }} · Из них повреждено: {{ totals.damaged }}</p>
      <div v-for="item in order.items" :key="item.id" class="crm-item-card crm-stack crm-execution-card">
        <strong>{{ item.productName }} · {{ item.variantName }}</strong>
        <p>Заказано {{ item.quantity }} · Собрано {{ item.pickedQuantity }} · Отгружено {{ item.shippedQuantity }} · Отменено {{ item.cancelledQuantity }} · Возвращено {{ item.returnedQuantity }}</p>
        <label v-if="eligible" class="crm-field">Количество в этой операции<input v-model.number="quantities[item.id]" class="crm-input" type="number" min="0" :max="item.quantity - item.shippedQuantity - item.cancelledQuantity" step="1" :aria-label="'Количество: ' + item.productName" :disabled="disabled || busy" /></label>
      </div>
      <fieldset v-if="eligible" class="ui-fieldset-reset crm-stack" :disabled="disabled || busy">
        <p>Введите количество для выбранных позиций. Сначала отметьте сборку, затем укажите количество к отгрузке. Можно работать частями.</p>
        <button type="button" class="crm-button" @click="execute('PICK')">Отметить сборку</button>
        <label class="crm-field">Трек-номер этой отгрузки<input v-model="trackingNumber" class="crm-input" maxlength="200" /></label>
        <button type="button" class="crm-button crm-button--primary" @click="execute('SHIP')">Провести отгрузку</button>
      </fieldset>
    </template>
    <CrmOrderAdjustments :order="order" :disabled="disabled || busy" :reload="reload" @busy="emit('busy', $event)" />
    <template v-if="order.executionOperations?.length">
      <h4>Документы исполнения</h4>
      <div v-for="operation in order.executionOperations" :key="operation.id" class="crm-item-card crm-stack crm-execution-card">
        <strong>{{ operationNames[operation.kind] }} · {{ new Date(operation.createdAt).toLocaleString('ru-RU') }}</strong>
        <small>{{ operation.actorName }} · № {{ operation.id }}</small>
        <p v-for="line in operation.lines" :key="line.itemId">{{ line.productName }} × {{ line.quantity }}<span v-if="line.damagedQuantity"> · Повреждено {{ line.damagedQuantity }}</span></p>
        <p v-if="operation.reason">Причина: {{ operation.reason }}</p><p v-if="operation.settlementStatus === 'REVIEW_REQUIRED'">Финансовый результат проверяйте во вкладке «Расчёты 1С».</p>
        <p v-if="operation.trackingNumber">Трек: {{ operation.trackingNumber }}</p>
      </div>
      <p v-if="order.executionOperations.length === 100">Показаны последние 100 документов.</p>
    </template>
  </section>
</template>
