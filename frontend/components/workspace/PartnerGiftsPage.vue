<script setup lang="ts">
import { ArrowUpRight, Gift, Plus, RefreshCw, Trash2 } from '@lucide/vue';

type GiftLine = { variantId: string; quantity: number };
const config = useRuntimeConfig();
const { token, user } = useWorkspaceSession();
const access = useWorkspaceAccess();
const workspace = ref<any>(null), loading = ref(false), saving = ref(false), error = ref(''), notice = ref('');
const form = reactive({ participantId: '', recipientName: '', recipientPhone: '', recipientEmail: '', deliveryAddress: '', deliveryService: '', note: '' });
const lines = ref<GiftLine[]>([{ variantId: '', quantity: 1 }]);
const canCreate = computed(() => access.can('partners.write') && ['ADMIN', 'SUPERVISOR'].includes(user.value?.role || ''));
const products = computed<any[]>(() => workspace.value?.products || []);
const gifts = computed<any[]>(() => workspace.value?.shipments || []);
const statusLabels: Record<string, string> = { NEW: 'Новый', CONFIRMED: 'Подтверждён', ASSEMBLING: 'В сборке', SHIPPED: 'Отправлен', DELIVERED: 'Доставлен', CANCELLED: 'Отменён' };
const date = (value: string) => new Date(value).toLocaleString('ru-RU', { dateStyle: 'medium', timeStyle: 'short' });
function requestKey() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, char => {
    const random = Math.floor(Math.random() * 16);
    return (char === 'x' ? random : (random & 0x3) | 0x8).toString(16);
  });
}
function api(path: string, options: any = {}) { return $fetch<any>(`/partners/admin/gifts${path}`, { baseURL: config.public.apiBase, headers: { Authorization: `Bearer ${token.value}` }, timeout: 30000, ...options }); }
async function load() { loading.value = true; error.value = ''; try { workspace.value = await api(''); } catch (e: any) { error.value = e?.data?.message || 'Не удалось загрузить подарочные отправки'; } finally { loading.value = false; } }
function addLine() { lines.value.push({ variantId: '', quantity: 1 }); }
function removeLine(index: number) { if (lines.value.length > 1) lines.value.splice(index, 1); }
function lineProduct(line: GiftLine) { return products.value.find(item => item.id === line.variantId); }
const orderTotal = (items: any[]) => items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
async function createGift() {
  if (saving.value || !canCreate.value) return;
  saving.value = true; error.value = ''; notice.value = '';
  try {
    const result = await api('', { method: 'POST', body: { requestKey: requestKey(), ...form, items: lines.value.map(line => ({ variantId: line.variantId, quantity: Number(line.quantity) })) } });
    notice.value = `${result.orderNumber}: отправка на 0 ₽ создана, товар зарезервирован, задание передано в «Сборку и отгрузку».`;
    Object.assign(form, { participantId: '', recipientName: '', recipientPhone: '', recipientEmail: '', deliveryAddress: '', deliveryService: '', note: '' });
    lines.value = [{ variantId: '', quantity: 1 }];
    await load();
  } catch (e: any) { error.value = Array.isArray(e?.data?.message) ? e.data.message.join(' · ') : e?.data?.message || 'Не удалось создать подарочную отправку'; }
  finally { saving.value = false; }
}
onMounted(load);
</script>

<template>
  <main class="partner-gifts crm-standard">
    <header class="crm-page-header"><div><h1>Подарки блогерам</h1><p>Создайте отправку: CRM поставит цену 0 ₽, зарезервирует товар и сразу добавит задание на сборку. При отгрузке складская операция передаётся в 1С.</p></div><button class="crm-button" :disabled="loading" @click="load"><RefreshCw :size="16"/> Обновить</button></header>
    <p v-if="error" class="gift-feedback gift-error" role="alert">{{ error }}</p><p v-if="notice" class="gift-feedback gift-notice" role="status">{{ notice }}</p>
    <section v-if="canCreate" class="gift-create crm-surface">
      <div class="gift-section-title"><div><span class="gift-icon"><Gift :size="18"/></span><div><h2>Новая отправка</h2><p>Сумма продажи — 0 ₽. Складской остаток зарезервируется до сборки.</p></div></div></div>
      <form class="gift-form" @submit.prevent="createGift">
        <label>Блогер<select v-model="form.participantId" class="crm-input" required><option value="" disabled>Выберите блогера</option><option v-for="person in workspace?.participants" :key="person.id" :value="person.id">{{ person.displayName }} · {{ person.code }}</option></select></label>
        <label>Имя получателя<input v-model.trim="form.recipientName" class="crm-input" autocomplete="name" maxlength="180" required placeholder="Кому отправляем"/></label>
        <label>Телефон<input v-model.trim="form.recipientPhone" class="crm-input" autocomplete="tel" maxlength="40" required placeholder="+7 …"/></label>
        <label>Email получателя<input v-model.trim="form.recipientEmail" class="crm-input" type="email" autocomplete="email" maxlength="180" placeholder="Необязательно"/></label>
        <label class="gift-wide">Адрес доставки<textarea v-model.trim="form.deliveryAddress" class="crm-input" rows="3" minlength="10" maxlength="500" required placeholder="Город, улица, дом, квартира или адрес пункта выдачи"/></label>
        <label>Служба доставки<input v-model.trim="form.deliveryService" class="crm-input" maxlength="100" placeholder="Например, СДЭК"/></label>
        <label>Комментарий к отправке<input v-model.trim="form.note" class="crm-input" maxlength="1000" placeholder="Повод или внутренний комментарий"/></label>
        <div class="gift-lines gift-wide"><div class="gift-lines-heading"><strong>Товары</strong><button class="crm-button" type="button" @click="addLine"><Plus :size="15"/> Добавить товар</button></div>
          <div v-for="(line,index) in lines" :key="index" class="gift-line"><label>Товар и вариант<select v-model="line.variantId" class="crm-input" required><option value="" disabled>Выберите товар</option><option v-for="item in products" :key="item.id" :value="item.id" :disabled="item.available <= 0">{{ item.productName }} · {{ item.variantName }} · {{ item.sku }} · доступно {{ item.available }}</option></select></label><label>Количество<input v-model.number="line.quantity" class="crm-input" type="number" min="1" max="100" required/></label><div class="gift-line-availability">{{ line.variantId ? `Доступно: ${lineProduct(line)?.available ?? 0}` : 'Выберите позицию' }}</div><button class="crm-button crm-button--icon" type="button" :disabled="lines.length===1" aria-label="Удалить позицию" @click="removeLine(index)"><Trash2 :size="16"/></button></div>
        </div>
        <div class="gift-submit gift-wide"><span>В заказе будет <strong>0 ₽</strong>. Складская себестоимость будет учтена в 1С.</span><button class="crm-button crm-button--primary" :disabled="saving || !workspace?.participants?.length || !products.length"><Gift :size="16"/> {{ saving ? 'Создаём отправку…' : 'Создать отправку и задание на сборку' }}</button></div>
      </form>
      <p v-if="!workspace?.participants?.length && !loading" class="gift-empty-note">Нет активных блогеров, которым можно оформить отправку.</p>
      <p v-if="!products.length && !loading" class="gift-empty-note">В каталоге нет доступных физических товаров.</p>
    </section>

    <section class="gift-history"><div class="gift-section-title"><div><span class="gift-icon"><Gift :size="18"/></span><div><h2>Подарочные отправки</h2><p>Каждая запись связана с заказом и заданием на сборку.</p></div></div><span class="gift-count">{{ gifts.length }}</span></div>
      <div v-if="loading && !workspace" class="crm-surface gift-empty-note">Загружаем отправки…</div>
      <div v-else-if="!gifts.length" class="crm-surface gift-empty-note">Отправок пока нет. Создайте первую выше.</div>
      <article v-for="gift in gifts" :key="gift.id" class="gift-card crm-surface"><div class="gift-card-main"><div class="gift-card-heading"><strong>{{ gift.order.orderNumber }}</strong><span class="gift-status" :data-status="gift.order.status">{{ statusLabels[gift.order.status] || gift.order.status }}</span></div><p>{{ gift.participant.displayName }} · {{ gift.participant.code }} · {{ gift.order.buyerName }}</p><ul><li v-for="item in gift.order.items" :key="item.id">{{ item.productName }} · {{ item.variantName }} · {{ item.quantity }} шт.</li></ul><small>{{ date(gift.createdAt) }} · цена продажи 0 ₽</small></div><div class="gift-card-side"><span :class="['gift-sync', { 'is-synced': gift.order.isSynced1C }]">{{ gift.order.isSynced1C ? `Передано в 1С · ${gift.order.oneCStatus || 'принято'}` : gift.order.oneCSyncError ? 'Ошибка обмена с 1С' : 'Ожидает обмена с 1С' }}</span><small v-if="gift.order.warehouseDocumentId" class="gift-warehouse-document">Складской документ 1С: {{ gift.order.warehouseDocumentId }}</small><small v-if="gift.order.oneCSyncError" class="gift-sync-error">{{ gift.order.oneCSyncError }}</small><NuxtLink class="crm-button" :to="`/crm/fulfillment?order=${encodeURIComponent(gift.order.id)}`">Открыть сборку <ArrowUpRight :size="15"/></NuxtLink></div></article>
    </section>
  </main>
</template>

<style scoped>
.partner-gifts{display:grid;gap:22px}.crm-page-header p{max-width:820px;line-height:1.6}.gift-create,.gift-history{padding:22px}.gift-section-title,.gift-section-title>div{display:flex;align-items:center;gap:12px}.gift-section-title{justify-content:space-between;margin-bottom:20px}.gift-section-title h2{margin:0 0 4px}.gift-section-title p{margin:0;color:var(--crm-muted)}.gift-icon{width:40px;height:40px;display:grid;place-items:center;border:1px solid var(--crm-line);border-radius:50%;color:var(--crm-ink)}.gift-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.gift-form>label,.gift-line label{display:grid;gap:7px}.gift-wide{grid-column:1/-1}.gift-lines{display:grid;gap:10px}.gift-lines-heading,.gift-submit{display:flex;align-items:center;justify-content:space-between;gap:14px}.gift-line{display:grid;grid-template-columns:minmax(0,1fr) 130px minmax(110px,auto) 42px;align-items:end;gap:12px;padding:12px;border:1px solid var(--crm-line);border-radius:10px}.gift-line-availability{padding:12px 0;color:var(--crm-muted);font-size:13px}.gift-submit{padding-top:14px;border-top:1px solid var(--crm-line)}.gift-submit>span{color:var(--crm-muted)}.gift-submit strong{color:var(--crm-ink)}.gift-empty-note{padding:16px;color:var(--crm-muted)}.gift-count{min-width:34px;height:34px;display:grid;place-items:center;border:1px solid var(--crm-line);border-radius:999px}.gift-history{display:grid;gap:12px}.gift-history>.gift-section-title{margin-bottom:0}.gift-card{display:flex;justify-content:space-between;gap:20px;padding:18px}.gift-card-main{min-width:0}.gift-card-heading{display:flex;align-items:center;gap:10px}.gift-card-main p{margin:8px 0;color:var(--crm-muted)}.gift-card-main ul{margin:0 0 9px;padding-left:18px}.gift-card-main li{margin:3px 0}.gift-card-main small,.gift-sync-error,.gift-warehouse-document{color:var(--crm-muted)}.gift-card-side{display:flex;flex-direction:column;align-items:flex-end;gap:10px;min-width:210px}.gift-sync{color:var(--crm-muted);font-size:13px}.gift-sync.is-synced{color:var(--crm-success,#237450)}.gift-sync-error{max-width:260px;overflow-wrap:anywhere;text-align:right;font-size:12px}.gift-status{padding:5px 9px;border:1px solid var(--crm-line);border-radius:999px;font-size:12px}.gift-feedback{padding:12px 14px;border-radius:10px}.gift-error{background:var(--crm-danger-bg,#fff0f0);color:var(--crm-danger,#a22)}.gift-notice{background:var(--crm-success-bg,#eff9f1);color:var(--crm-success,#237450)}
@media(max-width:850px){.gift-form{grid-template-columns:1fr}.gift-wide{grid-column:auto}.gift-line{grid-template-columns:minmax(0,1fr) 100px 40px}.gift-line-availability{grid-column:1/3;grid-row:2;padding:0}.gift-line>button{grid-column:3;grid-row:1}.gift-submit,.gift-card{align-items:flex-start;flex-direction:column}.gift-card-side{align-items:flex-start}.gift-sync-error{text-align:left}}
</style>
