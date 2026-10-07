<script setup lang="ts">
import { requestKey } from '~/shared/request-key';
const props = defineProps<{ order: any; disabled: boolean; reload: () => Promise<void> }>();
const emit = defineEmits<{ busy: [value: boolean] }>();
const config = useRuntimeConfig(), session = useWorkspaceSession();
const kind = ref<'CANCEL_REMAINDER' | 'RETURN'>('CANCEL_REMAINDER'), reason = ref(''), error = ref(''), busy = ref(false);
const quantities = reactive<Record<string, number>>({}), damaged = reactive<Record<string, number>>({});
const pending = ref<{ signature: string; key: string } | null>(null);
const canCancel = computed(() => props.order.reservationState === 'ACTIVE' && !['CANCELLED', 'REFUNDED', 'SHIPPED', 'DELIVERED'].includes(props.order.status) && props.order.items.some((i: any) => i.quantity > i.shippedQuantity + i.cancelledQuantity));
const canReturn = computed(() => !['CANCELLED', 'REFUNDED'].includes(props.order.status) && props.order.items.some((i: any) => i.shippedQuantity > i.returnedQuantity));
watch(canCancel, value => { if (!value) kind.value = 'RETURN'; }, { immediate: true });
watch(kind, () => { Object.keys(quantities).forEach(key => delete quantities[key]); Object.keys(damaged).forEach(key => delete damaged[key]); error.value = ''; });
const available = (item: any) => kind.value === 'CANCEL_REMAINDER' ? item.quantity - item.shippedQuantity - item.cancelledQuantity : item.shippedQuantity - item.returnedQuantity;
async function submit() {
  if (props.disabled || busy.value) return;
  error.value = '';
  const lines = props.order.items.map((item: any) => ({ itemId: item.id, quantity: Number(quantities[item.id] || 0), damagedQuantity: kind.value === 'RETURN' ? Number(damaged[item.id] || 0) : 0 })).filter((line: any) => line.quantity !== 0 || line.damagedQuantity !== 0);
  if (!reason.value.trim() || !lines.length) { error.value = 'Укажите причину и количество хотя бы для одной позиции.'; return; }
  if (lines.some((line: any) => !Number.isSafeInteger(line.quantity) || line.quantity < 1 || !Number.isSafeInteger(line.damagedQuantity) || line.damagedQuantity < 0 || line.damagedQuantity > line.quantity)) { error.value = 'Проверьте целые количества: повреждённых не может быть больше принятого.'; return; }
  const body = { kind: kind.value, expectedVersion: props.order.execution.version, expectedUpdatedAt: props.order.updatedAt, reason: reason.value, lines };
  const signature = JSON.stringify(body);
  if (pending.value?.signature !== signature) pending.value = { signature, key: requestKey() };
  busy.value = true; emit('busy', true);
  try {
    await $fetch(`/oms/orders/${encodeURIComponent(props.order.id)}/adjustments`, { baseURL: config.public.apiBase, method: 'POST', headers: { Authorization: `Bearer ${session.token.value}` }, body: { ...body, requestKey: pending.value!.key } });
    await props.reload(); pending.value = null; reason.value = '';
    Object.keys(quantities).forEach(key => delete quantities[key]); Object.keys(damaged).forEach(key => delete damaged[key]);
  } catch (e: any) { error.value = e?.data?.message || 'Операция не завершена. Повторите запрос или обновите карточку.'; }
  finally { busy.value = false; emit('busy', false); }
}
</script>

<template>
  <section v-if="order.execution" class="crm-stack" aria-label="Возвраты и отмена остатка">
    <h4>Возвраты и отмена остатка</h4>
    <p v-if="error" role="alert">{{ error }}</p>
    <p v-if="order.execution.settlementReviewRequired" role="status">Отмена или приёмка товара требует финансовой сверки в 1С. Результат и возврат денег проверяйте в блоке «Расчёты и документы из 1С».</p>
    <fieldset v-if="canCancel || canReturn" class="ui-fieldset-reset crm-stack" :disabled="disabled || busy">
      <label class="crm-field">Операция<select v-model="kind" class="crm-input" aria-label="Операция возврата или отмены"><option v-if="canCancel" value="CANCEL_REMAINDER">Отменить неотгруженный остаток</option><option v-if="canReturn" value="RETURN">Принять возврат товара</option></select></label>
      <p>{{ kind === 'RETURN' ? 'Укажите фактически принятый товар. Годные единицы вернутся в доступный остаток; повреждённые будут учтены отдельно и не попадут в продажу.' : 'Укажите количество к отмене. С него будет снят резерв. Уже отгруженные позиции не изменятся.' }}</p>
      <template v-for="item in order.items" :key="item.id">
        <div v-if="available(item) > 0" class="crm-item-card crm-stack crm-execution-card">
          <strong>{{ item.productName }} · {{ item.variantName }}</strong>
          <p>Доступно для операции: {{ available(item) }}</p>
          <label class="crm-field">Количество<input v-model.number="quantities[item.id]" class="crm-input" type="number" min="0" :max="available(item)" step="1" :aria-label="'Количество коррекции: ' + item.productName" /></label>
          <label v-if="kind === 'RETURN'" class="crm-field">Из них повреждено<input v-model.number="damaged[item.id]" class="crm-input" type="number" min="0" :max="quantities[item.id] || 0" step="1" :aria-label="'Повреждено: ' + item.productName" /></label>
        </div>
      </template>
      <label class="crm-field">Причина<textarea v-model="reason" class="crm-input" rows="2" maxlength="1000" aria-label="Причина возврата или отмены" /></label>
      <button type="button" class="crm-button" @click="submit">{{ kind === 'RETURN' ? 'Принять возврат' : 'Отменить выбранный остаток' }}</button>
    </fieldset>
    <p v-else>Нет неотгруженного остатка или товаров, доступных для возврата.</p>
  </section>
</template>
