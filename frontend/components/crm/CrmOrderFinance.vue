<script setup lang="ts">
import { requestKey } from '~/shared/request-key';
const props = defineProps<{ order: any; disabled: boolean; hasUnsavedChanges?: boolean; reload: () => Promise<void> }>();
const emit = defineEmits<{ busy: [value: boolean] }>();
const config = useRuntimeConfig(), session = useWorkspaceSession(), access = useWorkspaceAccess();
const data = ref<any>(null), loading = ref(false), busy = ref(false), error = ref(''), notice = ref('');
const kind = ref('RECONCILE'), comment = ref(''), operationId = ref('');
const names: Record<string,string> = { INVOICE: 'Запросить счёт', RECONCILE: 'Запросить сверку расчётов', RETURN_REVIEW: 'Передать отмену / возврат на рассмотрение', TERMS_REVIEW: 'Запросить изменение условий оплаты' };
const statuses: Record<string,string> = { PENDING: 'Ожидает передачи в 1С', RECEIVED: 'Получен 1С, ожидает обработки', COMPLETED: 'Выполнен в 1С', REJECTED: 'Отклонён в 1С' };
const docs: Record<string,string> = { INVOICE: 'Счёт', PAYMENT: 'Оплата', REFUND: 'Возврат', CORRECTION: 'Корректировка', SHIPMENT: 'Отгрузка' };
const reviewStatuses: Record<string,string> = { REVIEW_REQUIRED: 'Ожидает сверки в 1С', PENDING: 'На рассмотрении в 1С', RECONCILED: 'Сверено в 1С', REJECTED: 'Отклонено в 1С' };
const dispositions: Record<string,string> = { REFUNDED: 'Возврат денег подтверждён', NOT_REQUIRED: 'Возврат денег не требуется', OFFSET: 'Зачёт подтверждён' };
const reviews = computed(() => (data.value?.operations || []).map((op: any) => ({ ...op, result: data.value?.snapshot?.adjustments?.find((item: any) => item.operationId === op.id) })));
const documentLabel = (id: string) => { const doc = data.value?.snapshot?.documents?.find((item: any) => item.id === id); return doc ? `${docs[doc.kind]} № ${doc.number}` : id; };
const money = (value: any) => value == null ? 'Нет данных' : new Intl.NumberFormat('ru-RU', { style: 'currency', currency: data.value?.currency || 'RUB' }).format(Number(value));
const date = (value: string) => new Date(value).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' });
const request = (path: string, options: any = {}) => $fetch<any>(`/oms/orders/${props.order.id}/${path}`, { baseURL: config.public.apiBase, headers: { Authorization: `Bearer ${session.token.value}` }, retry: 0, ...options });
const pending = ref<{ signature: string; key: string } | null>(null);let generation = 0;
async function load() { const n = ++generation; loading.value = true; error.value = ''; try { const result = await request('finance'); if (n === generation) data.value = result; } catch (e: any) { if (n === generation) { data.value = null; error.value = e?.data?.message || 'Не удалось загрузить данные 1С'; } } finally { if (n === generation) loading.value = false; } }
watch(() => [props.order.id, props.order.updatedAt, session.token.value], load, { immediate: true });onBeforeUnmount(() => { ++generation; });watch(kind, () => { operationId.value = ''; });
async function refresh() {
 if (busy.value || loading.value) return;
 if (props.hasUnsavedChanges) { error.value = 'Сначала сохраните изменения заказа, затем обновите данные 1С.'; return; }
 busy.value = true;emit('busy', true);
 try { await props.reload();await load(); } catch (e: any) { error.value = e?.data?.message || 'Не удалось обновить карточку'; } finally { busy.value = false;emit('busy', false); }
}
async function submit() {
 if (busy.value || loading.value || props.disabled || !data.value) return;
 error.value = '';notice.value = '';if (!comment.value.trim()) { error.value = 'Укажите основание запроса.'; return; }
 const body = { kind: kind.value, comment: comment.value.trim(), expectedUpdatedAt: data.value.updatedAt, ...(kind.value === 'RETURN_REVIEW' && operationId.value ? { operationId: operationId.value } : {}) };
 const signature = JSON.stringify(body);if (pending.value?.signature !== signature) pending.value = { signature, key: requestKey() };
 busy.value = true;emit('busy', true);
 try { await request('1c-requests', { method: 'POST', body: { ...body, requestKey: pending.value!.key } });notice.value = 'Запрос сохранён. Результат появится после обработки в 1С.';comment.value = '';pending.value = null;await props.reload();await load(); } catch (e: any) { error.value = e?.data?.message || 'Не удалось сохранить запрос'; } finally { busy.value = false;emit('busy', false); }
}
</script>
<template>
 <section class="crm-stack crm-detail-section" aria-label="Расчёты из 1С">
  <h3>Расчёты и документы из 1С</h3><p>Оплаты, возвраты, задолженность и условия ведутся в 1С:Комплексная автоматизация. Здесь доступны полученные данные и запросы на обработку.</p>
  <p v-if="error" role="alert">{{ error }}</p><p v-if="notice" role="status">{{ notice }}</p><p v-if="loading">Загружаем данные…</p>
  <template v-if="data">
   <p role="status"><strong>{{ data.reason }}</strong></p><p v-if="data.legacyEntries">Ранее созданные ручные записи сохранены в архиве и не используются в расчётах.</p>
   <p v-if="data.closure?.required" role="status"><strong>{{ data.closure.reason }}</strong></p>
   <template v-if="data.snapshot"><p>Данные на {{ date(data.snapshot.asOf) }} · получены {{ date(data.snapshot.receivedAt) }}.</p><p v-if="data.state !== 'CURRENT'">Показан последний полученный ответ. Актуальное состояние нужно запросить в 1С.</p>
    <div class="crm-record-list"><div v-for="[key,label] in [['total','Сумма в 1С'],['paid','Оплаты по данным 1С'],['refunded','Возвращено по данным 1С'],['debt','Задолженность'],['refundDue','К возврату']]" :key="key" class="crm-item-card crm-record"><span>{{ label }}</span><strong>{{ money(data.snapshot[key]) }}</strong></div></div>
    <p>Срок оплаты: {{ data.snapshot.paymentDueAt ? date(data.snapshot.paymentDueAt) : 'не передан из 1С' }}{{ data.overdue ? ' · Просрочено' : '' }}</p>
    <h4>Документы 1С</h4><p v-if="!data.snapshot.documents.length">Документы не переданы.</p><article v-for="doc in data.snapshot.documents" :key="doc.id" class="crm-item-card crm-stack crm-execution-card"><strong>{{ docs[doc.kind] }} № {{ doc.number }} · {{ money(doc.amount) }}</strong><span>{{ date(doc.date) }} · {{ doc.status === 'POSTED' ? 'Проведён в 1С' : 'Отменён в 1С' }}</span></article>
   </template>
   <template v-if="reviews.length">
    <h4>Сверка отмен и возвратов</h4>
    <p v-if="data.snapshot?.closeReason">Решение 1С по закрытию расчётов: {{ data.snapshot.closeReason }}</p>
    <article v-for="op in reviews" :key="op.id" class="crm-item-card crm-stack crm-execution-card">
     <strong>{{ op.kind === 'RETURN' ? 'Возврат' : 'Отмена остатка' }} · {{ date(op.createdAt) }}</strong><small>№ {{ op.id }}</small><p>{{ op.reason }}</p>
     <strong>{{ reviewStatuses[op.result?.status || op.settlementStatus] || 'Ожидает сверки в 1С' }}</strong>
     <template v-if="op.result"><p>{{ op.result.message }}</p><p v-if="op.result.refundDisposition">{{ dispositions[op.result.refundDisposition] }}</p><p v-for="id in op.result.documentIds" :key="id">{{ documentLabel(id) }}</p></template>
    </article>
   </template>
   <fieldset v-if="access.can('order_finance.write')" class="ui-fieldset-reset crm-stack" :disabled="disabled || busy || loading"><h4>Запрос в 1С</h4><label class="crm-field">Что нужно сделать<select v-model="kind" class="crm-input"><option v-for="(label,value) in names" :key="value" :value="value">{{ label }}</option></select></label><label v-if="kind === 'RETURN_REVIEW'" class="crm-field">Документ CRM<select v-model="operationId" class="crm-input"><option value="">По заказу в целом</option><option v-for="op in data.operations" :key="op.id" :value="op.id">{{ op.kind === 'RETURN' ? 'Возврат' : 'Отмена' }} · {{ date(op.createdAt) }} · {{ op.reason }}</option></select></label><label class="crm-field">Основание запроса<textarea v-model="comment" class="crm-input" rows="3" maxlength="1000" /></label><button type="button" class="crm-button crm-button--primary" @click="submit">Создать запрос в 1С</button></fieldset>
   <h4>Запросы и ответы</h4><p v-if="!data.requests.length">Запросов ещё нет.</p><article v-for="item in data.requests" :key="item.id" class="crm-item-card crm-stack crm-execution-card"><strong>{{ names[item.kind] }}</strong><span>{{ statuses[item.status] }}</span><p>{{ item.comment }}</p><p v-if="item.responseMessage">Ответ 1С: {{ item.responseMessage }}</p><small>{{ item.actorName }} · {{ date(item.createdAt) }}</small></article>
  </template><button type="button" class="crm-button" :disabled="busy || loading" @click="refresh">Обновить данные 1С</button>
 </section>
</template>
