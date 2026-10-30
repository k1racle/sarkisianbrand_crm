<script setup lang="ts">
import { Check, CheckCircle2, ChevronRight, CircleAlert, Copy, ExternalLink, KeyRound, RefreshCw, Save, Search, X } from '@lucide/vue';

const props = withDefaults(defineProps<{ coursePaymentsOnly?: boolean }>(), { coursePaymentsOnly: false });
const config = useRuntimeConfig();
const route = useRoute();
const { token } = useWorkspaceSession();
const { openContextMenu, copyText } = useContextMenu();
const integrations = ref<any[]>([]);
const loading = ref(true);
const loaded = ref(false);
const saving = ref(false);
const selected = ref<any>(null);
const { panel: settingsPanel, keyboard: settingsKeys } = useCatalogDialog(computed(() => Boolean(selected.value)), () => close());
const draft = reactive<any>({ config: {}, secrets: {}, clearSecrets: [] });
const baseline = ref('');
const dirty = computed(() => Boolean(selected.value) && JSON.stringify(draft) !== baseline.value);
const category = ref('ALL');
const categoryTabs = ref<HTMLElement | null>(null);
function revealCategory() {
  const nav = categoryTabs.value;
  const button = nav?.querySelector<HTMLElement>('button.active');
  if (!nav || !button) return;
  const left = button.offsetLeft - nav.offsetLeft;
  if (left < nav.scrollLeft) nav.scrollLeft = left;
  else if (left + button.offsetWidth > nav.scrollLeft + nav.clientWidth) nav.scrollLeft = left + button.offsetWidth - nav.clientWidth;
}
watch(category, () => nextTick(revealCategory));
const audience = ref('ALL');
const search = ref('');
const notice = ref('');
const error = ref('');
const paymentResultUrl = computed(() => {
  if (!import.meta.client || !['ROBOKASSA','TBANK'].includes(selected.value?.key)) return '';
  return new URL(`/api/v1/payments/webhook/${selected.value.key.toLowerCase()}`, window.location.origin).href;
});

const categories = [
  { id: 'ALL', label: 'Все' },
  { id: 'MARKETPLACE', label: 'Маркетплейсы' },
  { id: 'DELIVERY', label: 'Доставка' },
  { id: 'ERP', label: '1С и учёт' },
  { id: 'PAYMENT', label: 'Оплата' },
  { id: 'FISCAL', label: 'Онлайн-касса' },
  { id: 'COMMUNICATION', label: 'Сообщения' },
  { id: 'BOT', label: 'Боты' },
];
const audienceLabels: Record<string, string> = { EMPLOYEE: 'Сотрудники', B2C: 'B2C', B2B: 'B2B' };
const statusLabels: Record<string, string> = {
  NOT_CONFIGURED: 'Требует настройки', DISABLED: 'Выключена', CONFIGURED: 'Настроена', CONNECTED: 'Подключена', ERROR: 'Ошибка',
};
const courseFiscalOptions: Record<string, { value: string; label: string }[]> = {
  courseFiscalMode: [{ value: 'PROVIDER', label: 'Онлайн-касса платёжного провайдера' }],
  courseTaxation: [
    { value: 'osn', label: 'Общая система налогообложения' },
    { value: 'usn_income', label: 'УСН: доходы' },
    { value: 'usn_income_outcome', label: 'УСН: доходы минус расходы' },
    { value: 'esn', label: 'Единый сельскохозяйственный налог' },
    { value: 'patent', label: 'Патент' },
  ],
  courseTax: [
    { value: 'none', label: 'Без НДС' }, { value: 'vat0', label: 'НДС 0%' },
    { value: 'vat5', label: 'НДС 5%' }, { value: 'vat7', label: 'НДС 7%' },
    { value: 'vat10', label: 'НДС 10%' }, { value: 'vat22', label: 'НДС 22%' },
    { value: 'vat105', label: 'НДС 5/105' }, { value: 'vat107', label: 'НДС 7/107' },
    { value: 'vat110', label: 'НДС 10/110' }, { value: 'vat122', label: 'НДС 22/122' },
  ],
  coursePaymentMethod: [
    { value: 'full_payment', label: 'Полный расчёт' },
  ],
  coursePaymentObject: [
    { value: 'service', label: 'Услуга' }, { value: 'intellectual_activity', label: 'Результат интеллектуальной деятельности' },
    { value: 'another', label: 'Иной предмет расчёта' },
  ],
  courseFiscalConfirmed: [{ value: 'YES', label: 'Сверено с бухгалтером' }],
};
const categoryLabels = Object.fromEntries(categories.map((item) => [item.id, item.label]));
const headers = computed(() => ({ Authorization: `Bearer ${token.value}` }));
const filtered = computed(() => integrations.value.filter((item) => {
  if (category.value !== 'ALL' && item.category !== category.value) return false;
  if (audience.value !== 'ALL' && item.audience !== audience.value) return false;
  const query = search.value.trim().toLowerCase();
  return !query || `${item.name} ${item.provider} ${item.description}`.toLowerCase().includes(query);
}));
const counts = computed(() => ({
  total: integrations.value.length,
  enabled: integrations.value.filter((item) => item.isEnabled).length,
  configured: integrations.value.filter((item) => ['CONFIGURED', 'CONNECTED'].includes(item.status)).length,
  attention: integrations.value.filter((item) => item.isEnabled && ['NOT_CONFIGURED', 'ERROR'].includes(item.status)).length,
}));

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const result = await $fetch<any[]>('/system-settings/integrations', { baseURL: config.public.apiBase, headers: headers.value });
    integrations.value = props.coursePaymentsOnly ? result.filter(item => ['ROBOKASSA', 'TBANK'].includes(item.key)) : result;
    loaded.value = true;
    if (selected.value) selected.value = integrations.value.find((item) => item.key === selected.value.key) || null;
  } catch (reason: any) {
    error.value = reason?.data?.message || 'Не удалось загрузить интеграции';
  } finally {
    loading.value = false;
  }
}
function edit(item: any, force = false) {
  if (saving.value && !force) return;
  selected.value = item;
  const publicConfig = Object.fromEntries(item.fields.filter((field: any) => field.type !== 'secret').map((field: any) => [field.key, field.value ?? '']));
  if (item.category === 'BOT' && !publicConfig.webhookUrl) {
    publicConfig.webhookUrl = `${String(config.public.apiBase).replace(/\/$/, '')}/bots/webhooks/${item.provider.toLowerCase()}/${item.audience.toLowerCase()}`;
  }
  Object.assign(draft, {
    isEnabled: item.isEnabled,
    environment: item.environment,
    config: publicConfig,
    secrets: Object.fromEntries(item.fields.filter((field: any) => field.type === 'secret').map((field: any) => [field.key, ''])),
    clearSecrets: [],
  });
  baseline.value = JSON.stringify(draft);
}
function close(force = false) {
  if (force !== true && (saving.value || (dirty.value && !window.confirm('Закрыть без сохранения настроек?')))) return false;
  selected.value = null; error.value = ''; draft.secrets = {}; draft.clearSecrets = []; return true;
}
onBeforeRouteLeave(() => !saving.value && (!dirty.value || window.confirm('Уйти без сохранения настроек интеграции?')));
function flash(message: string) { notice.value = message; setTimeout(() => notice.value = '', 2600); }
function toggleClear(key: string) {
  draft.clearSecrets = draft.clearSecrets.includes(key)
    ? draft.clearSecrets.filter((item: string) => item !== key)
    : [...draft.clearSecrets, key];
  draft.secrets[key] = '';
}
async function save(closeAfter = true) {
  if (!selected.value || saving.value) return;
  saving.value = true;
  error.value = '';
  try {
    const updated = await $fetch<any>(`/system-settings/integrations/${selected.value.key}`, {
      baseURL: config.public.apiBase, method: 'PUT', headers: headers.value,
      body: { isEnabled: draft.isEnabled, environment: draft.environment, config: draft.config, secrets: draft.secrets, clearSecrets: draft.clearSecrets },
    });
    integrations.value = integrations.value.map((item) => item.key === updated.key ? updated : item);
    flash('Настройки интеграции сохранены');
    if (closeAfter) close(true); else edit(updated, true);
    return updated;
  } catch (reason: any) {
    error.value = Array.isArray(reason?.data?.message) ? reason.data.message.join(', ') : reason?.data?.message || 'Не удалось сохранить настройки';
  } finally { saving.value = false; }
}
async function testCurrent() {
  const updated = await save(false);
  if (!updated) return;
  saving.value = true;
  error.value = '';
  try {
    if (updated.key === 'ONE_C') {
      const result = await $fetch<any>('/1c-sync/test-connection', { baseURL: config.public.apiBase, method: 'POST', headers: headers.value });
      await load();
      const checked = integrations.value.find((item) => item.key === updated.key);
      if (checked) edit(checked);
      flash(result.message || 'Соединение с 1С установлено');
      return;
    }
    const checked = await $fetch<any>(`/system-settings/integrations/${updated.key}/test`, { baseURL: config.public.apiBase, method: 'POST', headers: headers.value });
    integrations.value = integrations.value.map((item) => item.key === checked.key ? checked : item);
    edit(checked);
    flash('Готовность подключения проверена');
  } catch (reason: any) {
    error.value = reason?.data?.message || 'Проверка не выполнена';
  } finally { saving.value = false; }
}
async function runOneCExchange() {
  const updated = await save(false);
  if (!updated) return;
  saving.value = true;
  error.value = '';
  try {
    await $fetch('/1c-sync/exchange', { baseURL: config.public.apiBase, method: 'POST', headers: headers.value });
    flash('Полный обмен с 1С поставлен в очередь');
  } catch (reason: any) {
    error.value = reason?.data?.message || 'Не удалось запустить обмен с 1С';
  } finally { saving.value = false; }
}
async function quickToggle(item: any) {
  const updated = await $fetch<any>(`/system-settings/integrations/${item.key}`, {
    baseURL: config.public.apiBase, method: 'PUT', headers: headers.value, body: { isEnabled: !item.isEnabled },
  });
  integrations.value = integrations.value.map((entry) => entry.key === updated.key ? updated : entry);
  flash(updated.isEnabled ? 'Интеграция включена' : 'Интеграция выключена');
}
function integrationMenu(event: MouseEvent, item: any) {
  openContextMenu(event, item.name, [
    { label: 'Открыть настройки', icon: 'edit', action: () => edit(item) },
    { label: item.isEnabled ? 'Выключить' : 'Включить', icon: 'block', action: () => quickToggle(item) },
    { label: 'Открыть документацию', icon: 'open', separator: true, action: () => window.open(item.documentationUrl, '_blank', 'noopener,noreferrer') },
    { label: 'Копировать код подключения', icon: 'copy', action: () => copyText(item.key, 'Код подключения скопирован') },
  ], `${categoryLabels[item.category]}${item.audience ? ` · ${audienceLabels[item.audience]}` : ''}`);
}
onMounted(async () => {
  await load();
  await nextTick();
  revealCategory();
  document.fonts?.ready.then(revealCategory);
});
</script>

<template>
  <section data-v-ui-1e872dee0e70 class="integration-settings">
    <WorkspaceLoading v-if="loading && !loaded" label="Загружаем настройки…"/><div v-else-if="error && !loaded" class="crm-management-error" role="alert"><p>{{error}}</p><button type="button" class="crm-button" :disabled="loading" @click="load">Повторить загрузку</button></div>
    <div data-v-ui-1e872dee0e70 v-if="loaded && !coursePaymentsOnly" class="integration-kpis">
      <article class="crm-surface" data-v-ui-1e872dee0e70><span data-v-ui-1e872dee0e70>Подключений в реестре</span><strong data-v-ui-1e872dee0e70>{{ counts.total }}</strong><small data-v-ui-1e872dee0e70>все каналы экосистемы</small></article>
      <article class="crm-surface" data-v-ui-1e872dee0e70><span data-v-ui-1e872dee0e70>Включено</span><strong data-v-ui-1e872dee0e70>{{ counts.enabled }}</strong><small data-v-ui-1e872dee0e70>участвуют в процессах</small></article>
      <article class="crm-surface" data-v-ui-1e872dee0e70><span data-v-ui-1e872dee0e70>Настроено</span><strong data-v-ui-1e872dee0e70>{{ counts.configured }}</strong><small data-v-ui-1e872dee0e70>обязательные поля заполнены</small></article>
      <article class="crm-surface" data-v-ui-1e872dee0e70 :class="{ warn: counts.attention }"><span data-v-ui-1e872dee0e70>Требуют внимания</span><strong data-v-ui-1e872dee0e70>{{ counts.attention }}</strong><small data-v-ui-1e872dee0e70>включены без полной настройки</small></article>
    </div>

    <article data-v-ui-1e872dee0e70 v-if="loaded" class="registry panel crm-surface">
      <header data-v-ui-1e872dee0e70 class="registry-head">
        <div data-v-ui-1e872dee0e70><p v-if="!coursePaymentsOnly" data-v-ui-1e872dee0e70 class="kicker">ЦЕНТР ПОДКЛЮЧЕНИЙ</p><h2 data-v-ui-1e872dee0e70>{{ coursePaymentsOnly ? 'Оплата и чеки' : 'Интеграции экосистемы' }}</h2><span data-v-ui-1e872dee0e70>{{ coursePaymentsOnly ? 'Подключения общие для сайта и курсов. Данные чека курсов задаются в карточке провайдера.' : 'Ключи хранятся зашифрованно и не возвращаются из API.' }}</span></div>
        <div data-v-ui-1e872dee0e70 class="registry-actions"><label v-if="!coursePaymentsOnly" class="crm-input-group" data-v-ui-1e872dee0e70><Search data-v-ui-1e872dee0e70 :size="15" /><input class="crm-input" data-v-ui-1e872dee0e70 v-model="search" placeholder="Найти подключение" /></label><button class="crm-button crm-button--refresh" data-v-ui-1e872dee0e70 @click="load"><RefreshCw data-v-ui-1e872dee0e70 :size="15" :class="{ spin: loading }" /> Обновить</button></div>
      </header>
      <nav v-if="!coursePaymentsOnly" ref="categoryTabs" data-v-ui-1e872dee0e70 class="category-tabs" aria-label="Категории интеграций"><button type="button" class="crm-button" data-v-ui-1e872dee0e70 v-for="item in categories" :key="item.id" :class="{ active: category === item.id }" :aria-pressed="category === item.id" @click="category = item.id">{{ item.label }}</button></nav>
      <div data-v-ui-1e872dee0e70 v-if="category === 'BOT' || audience !== 'ALL'" class="audience-filter"><span data-v-ui-1e872dee0e70>Аудитория бота</span><button class="crm-button" data-v-ui-1e872dee0e70 v-for="item in [{id:'ALL',label:'Все'}, {id:'EMPLOYEE',label:'Сотрудники'}, {id:'B2C',label:'B2C'}, {id:'B2B',label:'B2B'}]" :key="item.id" :class="{ active: audience === item.id }" @click="audience = item.id">{{ item.label }}</button></div>
      <div data-v-ui-1e872dee0e70 v-if="loading" class="loading-state">Загружаем реестр подключений…</div>
      <div data-v-ui-1e872dee0e70 v-else class="integration-grid">
        <button data-v-ui-1e872dee0e70 v-for="item in filtered" :key="item.key" class="integration-card crm-button crm-card-action crm-surface crm-item-card" @click="edit(item)" @contextmenu.prevent="integrationMenu($event, item)">
          <IntegrationBrandLogo :provider="item.provider" />
          <span data-v-ui-1e872dee0e70 class="integration-copy"><span data-v-ui-1e872dee0e70 class="card-title"><strong data-v-ui-1e872dee0e70>{{ item.name }}</strong><em data-v-ui-1e872dee0e70 v-if="item.audience">{{ audienceLabels[item.audience] }}</em></span><small data-v-ui-1e872dee0e70>{{ item.description }}</small><span data-v-ui-1e872dee0e70 class="field-state"><i data-v-ui-1e872dee0e70 :class="`state-${item.status.toLowerCase()}`"></i>{{ statusLabels[item.status] }} · {{ item.environment === 'PRODUCTION' ? 'рабочий режим' : 'тестовый режим' }}</span></span>
          <ChevronRight data-v-ui-1e872dee0e70 :size="18" />
        </button>
        <p data-v-ui-1e872dee0e70 v-if="!filtered.length" class="empty">Подключения по выбранному фильтру не найдены.</p>
      </div>
      <p data-v-ui-1e872dee0e70 v-if="error && !selected" class="form-error">{{ error }}</p>
    </article>

    <Teleport :disabled="!route.path.startsWith('/crm/')" to="body"><aside data-v-ui-1e872dee0e70 v-if="selected" class="drawer-backdrop admin-dialog-backdrop crm-management-backdrop" @click.self="close">
      <form data-v-ui-1e872dee0e70 ref="settingsPanel" tabindex="-1" @keydown="settingsKeys" class="integration-drawer admin-dialog admin-dialog--drawer crm-management-dialog" role="dialog" aria-modal="true" aria-label="Настройки интеграции" @submit.prevent="save(true)">
        <header data-v-ui-1e872dee0e70><IntegrationBrandLogo :provider="selected.provider" :size="42" /><div data-v-ui-1e872dee0e70><p data-v-ui-1e872dee0e70 class="kicker">{{ categoryLabels[selected.category] }}</p><h2 data-v-ui-1e872dee0e70>{{ selected.name }}</h2><small data-v-ui-1e872dee0e70 v-if="selected.audience">Аудитория: {{ audienceLabels[selected.audience] }}</small></div><button data-v-ui-1e872dee0e70 type="button" class="close crm-button crm-button--icon" aria-label="Закрыть интеграцию" @click="close"><X data-v-ui-1e872dee0e70 :size="18" /></button></header>
        <div data-v-ui-1e872dee0e70 class="drawer-scroll admin-dialog-body">
          <p data-v-ui-1e872dee0e70 class="drawer-description">{{ selected.description }}</p>
          <p v-if="selected.key === 'ROBOKASSA'" class="drawer-description">Укажите рабочие и тестовые пароли № 1 и № 2 одного магазина из личного кабинета Робокассы. Тестовые пароли должны отличаться от рабочих. В каждом режиме используется своя пара; для рабочего режима нужны обе пары.</p>
          <p v-if="paymentResultUrl" class="drawer-description">Адрес уведомлений об оплате: <strong>{{ paymentResultUrl }}</strong> <button class="crm-button" type="button" @click="copyText(paymentResultUrl, 'Адрес уведомлений скопирован')">Копировать</button>. Проверка заполнения не подтверждает, что платёж и чек работают.</p>
          <p v-if="['ROBOKASSA','TBANK'].includes(selected.key)" class="drawer-description">Для продажи курсов укажите данные ИП и параметры чека, согласованные с бухгалтером. Проверьте, что этот терминал и касса оформлены на указанного ИП. Пока данные не заполнены и не сверены, оплата курсов через этот способ недоступна.</p>
          <p v-if="['ROBOKASSA','TBANK'].includes(selected.key)" class="drawer-description">Сейчас поддерживается только полный расчёт. Не выбирайте его, пока бухгалтер не подтвердит, что он подходит для продажи курса: второй чек для предоплаты ещё не подключён.</p>
          <div data-v-ui-1e872dee0e70 class="mode-row"><label data-v-ui-1e872dee0e70><span data-v-ui-1e872dee0e70>Режим</span><select class="crm-input" data-v-ui-1e872dee0e70 v-model="draft.environment"><option data-v-ui-1e872dee0e70 value="TEST">Тестовый</option><option data-v-ui-1e872dee0e70 value="PRODUCTION">Рабочий</option></select></label><label data-v-ui-1e872dee0e70 class="switch-line crm-toggle-row"><span data-v-ui-1e872dee0e70><b data-v-ui-1e872dee0e70>Подключение включено</b><small data-v-ui-1e872dee0e70>Разрешить фоновые процессы</small></span><input class="crm-check" data-v-ui-1e872dee0e70 v-model="draft.isEnabled" type="checkbox" /></label></div>
          <div data-v-ui-1e872dee0e70 class="security-note"><KeyRound data-v-ui-1e872dee0e70 :size="17" /><span data-v-ui-1e872dee0e70><b data-v-ui-1e872dee0e70>Безопасное хранение</b><small data-v-ui-1e872dee0e70>Секреты шифруются AES-256-GCM. После сохранения их нельзя прочитать через интерфейс.</small></span></div>
          <section data-v-ui-1e872dee0e70 class="fields"><h3 data-v-ui-1e872dee0e70>Параметры подключения</h3>
            <label data-v-ui-1e872dee0e70 v-for="field in selected.fields" :key="field.key"><span data-v-ui-1e872dee0e70>{{ field.label }} <b data-v-ui-1e872dee0e70 v-if="field.required">обязательно</b></span>
              <span data-v-ui-1e872dee0e70 v-if="field.type !== 'secret' && field.key === 'webhookUrl'" class="webhook-input"><input class="crm-input" data-v-ui-1e872dee0e70 v-model="draft.config[field.key]" type="url" :placeholder="field.placeholder || ''" /><button class="crm-button" data-v-ui-1e872dee0e70 type="button" title="Копировать адрес" @click="copyText(draft.config[field.key], 'Адрес webhook скопирован')"><Copy data-v-ui-1e872dee0e70 :size="14" /></button></span>
              <select v-else-if="selected.key === 'ROBOKASSA' && field.key === 'signatureAlgorithm'" v-model="draft.config[field.key]" class="crm-input"><option value="">Выберите алгоритм из кабинета Робокассы</option><option value="SHA256">SHA-256</option><option value="SHA512">SHA-512</option><option value="MD5">MD5</option></select>
              <select v-else-if="['ROBOKASSA','TBANK'].includes(selected.key) && field.key === 'fiscalMode'" v-model="draft.config[field.key]" class="crm-input"><option value="">Выберите способ фискализации</option><option value="EXTERNAL">Чеки настроены вне платёжной формы</option></select>
              <select v-else-if="['ROBOKASSA','TBANK'].includes(selected.key) && courseFiscalOptions[field.key]" v-model="draft.config[field.key]" class="crm-input"><option value="">Выберите после сверки с бухгалтером</option><option v-for="option in courseFiscalOptions[field.key]" :key="option.value" :value="option.value">{{ option.label }}</option></select>
              <input class="crm-input" data-v-ui-1e872dee0e70 v-else-if="field.type !== 'secret'" v-model="draft.config[field.key]" :type="field.type === 'url' ? 'url' : field.type === 'number' ? 'number' : 'text'" :placeholder="field.placeholder || ''" />
              <span data-v-ui-1e872dee0e70 v-else class="secret-input"><input class="crm-input" data-v-ui-1e872dee0e70 v-model="draft.secrets[field.key]" type="password" autocomplete="new-password" :placeholder="field.configured && !draft.clearSecrets.includes(field.key) ? 'Сохранено ••••••••' : 'Введите секрет'" /><button class="crm-button" data-v-ui-1e872dee0e70 v-if="field.configured" type="button" :class="{ danger: draft.clearSecrets.includes(field.key) }" @click="toggleClear(field.key)">{{ draft.clearSecrets.includes(field.key) ? 'Отменить удаление' : 'Удалить ключ' }}</button></span>
              <small data-v-ui-1e872dee0e70 v-if="field.hint">{{ field.hint }}</small>
            </label>
          </section>
          <a data-v-ui-1e872dee0e70 class="docs-link" :href="selected.documentationUrl" target="_blank" rel="noopener noreferrer"><ExternalLink data-v-ui-1e872dee0e70 :size="15" /> Открыть документацию {{ selected.provider }}</a>
          <div data-v-ui-1e872dee0e70 v-if="selected.lastTestMessage" class="last-check" :data-status="selected.status"><CircleAlert v-if="selected.status==='ERROR'" :size="17"/><CheckCircle2 v-else data-v-ui-1e872dee0e70 :size="17" /><span data-v-ui-1e872dee0e70><b data-v-ui-1e872dee0e70>Последняя проверка</b><small data-v-ui-1e872dee0e70>{{ selected.lastTestMessage }}<template v-if="selected.lastTestAt"> · {{ new Date(selected.lastTestAt).toLocaleString('ru-RU') }}</template></small></span></div>
          <p data-v-ui-1e872dee0e70 v-if="error" class="form-error"><CircleAlert data-v-ui-1e872dee0e70 :size="15" /> {{ error }}</p>
        </div>
        <footer data-v-ui-1e872dee0e70><button class="crm-button crm-button--refresh" data-v-ui-1e872dee0e70 v-if="selected.key === 'ONE_C'" type="button" :disabled="saving" @click="runOneCExchange"><RefreshCw data-v-ui-1e872dee0e70 :size="15" /> Запустить обмен</button><button class="crm-button" data-v-ui-1e872dee0e70 type="button" :disabled="saving" @click="testCurrent"><Check data-v-ui-1e872dee0e70 :size="15" /> {{ selected.key === 'ONE_C' ? 'Проверить соединение' : 'Проверить заполнение' }}</button><button data-v-ui-1e872dee0e70 class="primary crm-button crm-button--primary" type="submit" :disabled="saving"><Save data-v-ui-1e872dee0e70 :size="15" /> {{ saving ? 'Сохраняем…' : 'Сохранить' }}</button></footer>
      </form>
    </aside></Teleport>
    <div data-v-ui-1e872dee0e70 v-if="notice" class="integration-toast">{{ notice }}</div>
  </section>
</template>
