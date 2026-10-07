<script setup lang="ts">
const props = defineProps<{ order: any; disabled: boolean; reload: () => Promise<void> }>();
const emit = defineEmits<{ busy: [value: boolean] }>();
const session = useWorkspaceSession(), config = useRuntimeConfig();
const sku = reactive<Record<string, string>>({}), busy = ref(false), error = ref('');
const reason = ref('');
async function resolve() {
  if (props.disabled || busy.value) return;
  if (!reason.value.trim()) { error.value = 'Укажите основание решения по расхождению.'; return; }
  error.value = ''; busy.value = true; emit('busy', true);
  try {
    await $fetch(`/oms/orders/${encodeURIComponent(props.order.id)}/import-resolution`, { baseURL: config.public.apiBase, method: 'POST', headers: { Authorization: `Bearer ${session.token.value}` }, body: { expectedUpdatedAt: props.order.updatedAt, expectedIncomingAt: props.order.marketplaceIncoming.updatedAt, reason: reason.value } });
    await props.reload(); reason.value = '';
  } catch (e: any) { error.value = e?.data?.message || 'Не удалось сохранить решение.'; }
  finally { busy.value = false; emit('busy', false); }
}
const editable = computed(() => !props.order.fulfillmentManaged && props.order.reservationState === 'LEGACY' && ['NEW', 'CONFIRMED', 'PAYMENT_WAITING'].includes(props.order.status));
async function save(itemId: string) {
  if (props.disabled || busy.value) return;
  if (!sku[itemId]?.trim()) { error.value = 'Введите SKU варианта из каталога.'; return; }
  error.value = ''; busy.value = true; emit('busy', true);
  try {
    await $fetch(`/oms/orders/${encodeURIComponent(props.order.id)}/item-mapping`, { baseURL: config.public.apiBase, method: 'PATCH', headers: { Authorization: `Bearer ${session.token.value}` }, body: { itemId, sku: sku[itemId].trim(), expectedUpdatedAt: props.order.updatedAt } });
    await props.reload(); sku[itemId] = '';
  } catch (e: any) { error.value = e?.data?.message || 'Не удалось сохранить сопоставление.'; }
  finally { busy.value = false; emit('busy', false); }
}
</script>
<template>
  <section class="crm-stack" aria-label="Сопоставление товаров площадки">
    <h4>Товары площадки и наш каталог</h4>
    <p v-if="error" role="alert">{{ error }}</p>
    <div v-if="order.marketplaceImportIssue && order.marketplaceIncoming" class="crm-item-card crm-stack crm-execution-card">
      <h4>Данные площадки для сверки</h4>
      <p>Статус площадки: {{ order.marketplaceIncoming.status }} · Сумма: {{ order.marketplaceIncoming.totalAmount }} {{ order.currency }}</p>
      <p>{{ order.marketplaceIncoming.buyerName }} {{ order.marketplaceIncoming.buyerEmail }} {{ order.marketplaceIncoming.buyerPhone }}</p>
      <p v-if="order.marketplaceIncoming.deliveryDate">Дата доставки: {{ new Date(order.marketplaceIncoming.deliveryDate).toLocaleString('ru-RU') }}</p>
      <p v-for="(item, index) in order.marketplaceIncoming.items" :key="index">{{ item.externalSku }} · {{ item.productName }} × {{ item.quantity }} · {{ item.total }} {{ order.currency }}</p>
      <p>Сначала оформите необходимые отмены или возвраты. Решение ниже оставит текущий состав CRM и запишет основание; данные площадки не изменятся.</p>
      <label class="crm-field">Основание решения<textarea v-model="reason" class="crm-input" rows="2" maxlength="1000" :disabled="disabled || busy" /></label>
      <button type="button" class="crm-button" :disabled="disabled || busy" @click="resolve">Сохранить локальную версию</button>
    </div>
    <div v-for="item in order.items" :key="item.id" class="crm-item-card crm-stack crm-execution-card">
      <strong>{{ item.productName }}</strong><p>Артикул площадки: {{ item.externalSku || 'не указан' }} · SKU каталога: {{ item.variant?.sku || 'не сопоставлен' }}</p>
      <template v-if="editable"><input v-model="sku[item.id]" class="crm-input" :aria-label="'SKU каталога: ' + item.productName" placeholder="Точный SKU варианта из каталога" maxlength="200" :disabled="disabled || busy" /><button type="button" class="crm-button" :disabled="disabled || busy" @click="save(item.id)">Сопоставить</button></template>
    </div>
  </section>
</template>
