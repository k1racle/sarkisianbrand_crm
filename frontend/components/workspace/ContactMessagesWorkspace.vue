<script setup lang="ts">
import { Check, Inbox, Mail, RefreshCw, Save, X } from '@lucide/vue';

const config = useRuntimeConfig();
const route = useRoute();
const { token, user, generation } = useWorkspaceSession();
const access = useWorkspaceAccess();
const canEditSettings = computed(() => ['ADMIN', 'SUPERVISOR'].includes(user.value?.role || '') && access.can('crm.write'));
const canMarkRead = computed(() => access.can('crm.write'));
const settings = ref<{ recipientEmail: string; deliveryEnabled: boolean } | null>(null);
const recipient = ref('');
const data = ref<{ items: any[]; total: number; unread: number; page: number; pages: number } | null>(null);
const selected = ref<any>(null);
const page = ref(1);
const unreadOnly = ref(false);
const loading = ref(false);
const saving = ref(false);
const error = ref('');
const notice = ref('');
const recipientDirty = computed(() => settings.value != null && recipient.value.trim() !== (settings.value.recipientEmail || ''));
let loadVersion = 0, loadController: AbortController | undefined;
function closeMessage() { selected.value = null; }
const { panel: detailPanel, keyboard: detailKeys } = useCatalogDialog(computed(() => Boolean(selected.value)), closeMessage);
onBeforeRouteLeave(() => !saving.value && (!recipientDirty.value || window.confirm('Уйти без сохранения адреса уведомлений?')));

const api = (path: string, options: any = {}) => $fetch<any>(`/admin/contact-messages${path}`, {
  baseURL: config.public.apiBase,
  headers: { Authorization: `Bearer ${token.value}` },
  timeout: 15000,
  ...options,
});
const date = (value: string) => new Date(value).toLocaleString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const message = (e: any) => Array.isArray(e?.data?.message) ? e.data.message.join(' · ') : e?.data?.message || 'Не удалось загрузить данные. Повторите попытку.';

async function load() {
  if (!token.value) return;
  const version = ++loadVersion;
  loadController?.abort(); const controller = new AbortController(); loadController = controller;
  loading.value = true;
  error.value = '';
  const actorToken = token.value;
  try {
    const [inbox, configResult] = await Promise.all([
      api('', { signal: controller.signal, query: { page: page.value, unread: unreadOnly.value } }),
      api('/settings', { signal: controller.signal }),
    ]);
    if (version !== loadVersion || token.value !== actorToken) return;
    data.value = inbox;
    const keepRecipient = recipientDirty.value;
    settings.value = configResult;
    if (!saving.value && !keepRecipient) recipient.value = configResult.recipientEmail || '';
    if (selected.value) selected.value = inbox.items.find((item: any) => item.id === selected.value.id) || selected.value;
  } catch (e) {
    if (version === loadVersion && token.value === actorToken && !controller.signal.aborted) error.value = message(e);
  } finally { if (version === loadVersion) loading.value = false; }
}

async function saveSettings() {
  if (!canEditSettings.value || saving.value) return;
  saving.value = true;
  error.value = '';
  notice.value = '';
  try {
    settings.value = await api('/settings', { method: 'PATCH', body: { recipientEmail: recipient.value.trim() || null } });
    recipient.value = settings.value?.recipientEmail || '';
    notice.value = 'Адрес для уведомлений сохранён.';
  } catch (e) { error.value = message(e); }
  finally { saving.value = false; }
}

async function open(item: any) {
  selected.value = item;
  if (item.readAt || !canMarkRead.value) return;
  try {
    const updated = await api(`/${item.id}/read`, { method: 'PATCH' });
    selected.value = updated;
    if (data.value) {
      data.value.items = data.value.items.map(row => row.id === item.id ? updated : row);
      data.value.unread = Math.max(0, data.value.unread - 1);
    }
  } catch (e) { error.value = message(e); }
}

watch([page, unreadOnly], () => { selected.value = null; void load(); });
watch([() => user.value?.id, generation], () => { ++loadVersion; loadController?.abort(); data.value = null; settings.value = null; selected.value = null; recipient.value = ''; if (token.value && user.value?.id) void load(); });
watch(token, () => { if (token.value && user.value?.id) void load(); });
let targetVersion = 0;
async function openRequestedMessage() {
  const id = route.query.message, identity = token.value, version = ++targetVersion;
  if (typeof id !== 'string' || !id || !identity) return;
  try { const item = await api('/' + encodeURIComponent(id)); if (version === targetVersion && identity === token.value) await open(item); }
  catch (e) { if (version === targetVersion && identity === token.value) { selected.value = null; error.value = message(e); } }
}
watch(() => route.query.message, openRequestedMessage);
onBeforeUnmount(() => { ++targetVersion; ++loadVersion; loadController?.abort(); });
onMounted(async () => { await load(); await openRequestedMessage(); });
</script>

<template>
  <main class="contact-inbox crm-standard crm-management-workspace" :aria-busy="loading || saving">
    <header class="contact-inbox__head crm-page-header"><div><span class="contact-inbox__eyebrow">МАРКЕТИНГ / САЙТ</span><h1>Сообщения с сайта</h1><p>Обращения из формы на странице «Контакты» — в одном месте.</p></div><button type="button" class="contact-inbox__button crm-button crm-button--refresh" :disabled="loading" @click="load"><RefreshCw :size="18" /> Обновить</button></header>
    <p v-if="error" class="contact-inbox__error" role="alert">{{ error }}</p>
    <p v-if="notice" class="contact-inbox__notice" role="status">{{ notice }}</p>

    <section class="contact-inbox__settings crm-surface" aria-labelledby="contact-inbox-settings-title">
      <div class="contact-inbox__settings-intro"><span class="contact-inbox__symbol"><Mail :size="22" /></span><div><h2 id="contact-inbox-settings-title">Уведомления на почту</h2><p>Укажите адрес, куда дублировать новые сообщения. Даже без почтовой доставки обращения сохраняются здесь.</p></div></div>
      <form class="contact-inbox__settings-form" @submit.prevent="saveSettings"><label for="contact-recipient">Почта получателя</label><div><input class="crm-input" id="contact-recipient" v-model="recipient" type="email" autocomplete="email" placeholder="manager@example.ru" :disabled="!canEditSettings || saving" /><button v-if="canEditSettings" type="submit" class="contact-inbox__button contact-inbox__button--dark crm-button crm-button--primary" :disabled="saving || loading || !settings || !recipientDirty"><Save :size="17" /> Сохранить</button></div><small v-if="recipientDirty" role="status">Адрес изменён. Сохраните его, чтобы новые уведомления приходили на эту почту.</small><small v-if="settings">{{ !settings.recipientEmail ? 'Адрес не задан: сообщения остаются только в этом разделе.' : settings.deliveryEnabled ? 'Почтовая доставка включена. Статус конкретных писем проверяйте в почтовой очереди.' : 'Почтовая доставка сейчас выключена в конфигурации сервера. Сообщения сохраняются и в админке, и в очереди писем.' }}</small></form>
    </section>

    <section class="contact-inbox__panel crm-surface" aria-labelledby="contact-inbox-list-title">
      <header class="contact-inbox__panel-head"><div><h2 id="contact-inbox-list-title">Входящие <span v-if="data">{{ data.total }}</span></h2><p v-if="data">Непрочитанных: {{ data.unread }}</p></div><label class="contact-inbox__filter crm-toggle-row"><input class="crm-check" v-model="unreadOnly" type="checkbox" @change="page = 1" /> Только новые</label></header>
      <p v-if="loading && !data" class="contact-inbox__empty" role="status">Загружаем сообщения…</p>
      <div v-else-if="data && !data.items.length" class="contact-inbox__empty"><Inbox :size="30" /><strong>{{ unreadOnly ? 'Новых сообщений нет' : 'Сообщений пока нет' }}</strong><span>Новые обращения появятся здесь после отправки формы на сайте.</span></div>
      <div v-else-if="data" class="contact-inbox__list"><button v-for="item in data.items" :key="item.id" type="button" class="contact-inbox__row crm-button crm-card-action crm-interactive" :class="{ 'is-unread': !item.readAt }" @click="open(item)"><span class="contact-inbox__avatar">{{ item.name.slice(0, 1).toUpperCase() }}</span><span class="contact-inbox__row-body"><strong>{{ item.name }} <span v-if="!item.readAt" class="contact-inbox__new">Новое</span></strong><span>{{ item.message }}</span></span><time :datetime="item.createdAt">{{ date(item.createdAt) }}</time></button></div>
      <footer v-if="data && data.pages > 1" class="contact-inbox__pagination" role="navigation" aria-label="Страницы сообщений"><button class="crm-button" type="button" :disabled="page <= 1 || loading" @click="page--">Назад</button><span>{{ page }} / {{ data.pages }}</span><button class="crm-button" type="button" :disabled="page >= data.pages || loading" @click="page++">Далее</button></footer>
    </section>

    <Teleport :disabled="!route.path.startsWith('/crm/')" to="body">
      <div v-if="selected" class="contact-inbox__backdrop crm-management-backdrop" @click.self="selected = null">
        <section ref="detailPanel" tabindex="-1" @keydown="detailKeys" class="contact-inbox__detail admin-dialog crm-management-dialog" role="dialog" aria-modal="true" aria-labelledby="contact-inbox-detail-title">
          <header><div><h2 id="contact-inbox-detail-title">{{selected.name}}</h2><time :datetime="selected.createdAt">{{date(selected.createdAt)}}</time></div><button type="button" class="crm-button crm-button--icon" aria-label="Закрыть обращение" @click="selected = null"><X :size="18"/></button></header>
          <div class="admin-dialog-body crm-stack">
            <div class="contact-inbox__contact"><a v-if="selected.phone" :href="`tel:${selected.phone.replace(/[^+\d]/g, '')}`">{{selected.phone}}</a><a v-if="selected.email" :href="`mailto:${selected.email}`">{{selected.email}}</a></div>
            <div class="contact-inbox__message">{{selected.message}}</div>
            <p class="contact-inbox__delivery"><Check :size="16"/> Сообщение сохранено{{selected.notificationStatus === 'QUEUED' ? ' и поставлено в очередь письма' : '. Почтовое уведомление не сформировано'}}.</p>
          </div>
        </section>
      </div>
    </Teleport>
  </main>
</template>
