<script setup lang="ts">
import { Check, CheckCircle2, ChevronRight, CircleAlert, Copy, ExternalLink, KeyRound, RefreshCw, Save, Search, X } from '@lucide/vue';

const config = useRuntimeConfig();
const { token } = useWorkspaceSession();
const { openContextMenu, copyText } = useContextMenu();
const integrations = ref<any[]>([]);
const loading = ref(true);
const saving = ref(false);
const selected = ref<any>(null);
const draft = reactive<any>({ config: {}, secrets: {}, clearSecrets: [] });
const category = ref('ALL');
const audience = ref('ALL');
const search = ref('');
const notice = ref('');
const error = ref('');

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
    integrations.value = await $fetch<any[]>('/system-settings/integrations', { baseURL: config.public.apiBase, headers: headers.value });
    if (selected.value) selected.value = integrations.value.find((item) => item.key === selected.value.key) || null;
  } catch (reason: any) {
    error.value = reason?.data?.message || 'Не удалось загрузить интеграции';
  } finally {
    loading.value = false;
  }
}
function edit(item: any) {
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
}
function close() { selected.value = null; error.value = ''; }
function flash(message: string) { notice.value = message; setTimeout(() => notice.value = '', 2600); }
function toggleClear(key: string) {
  draft.clearSecrets = draft.clearSecrets.includes(key)
    ? draft.clearSecrets.filter((item: string) => item !== key)
    : [...draft.clearSecrets, key];
  draft.secrets[key] = '';
}
async function save(closeAfter = true) {
  if (!selected.value) return;
  saving.value = true;
  error.value = '';
  try {
    const updated = await $fetch<any>(`/system-settings/integrations/${selected.value.key}`, {
      baseURL: config.public.apiBase, method: 'PUT', headers: headers.value,
      body: { isEnabled: draft.isEnabled, environment: draft.environment, config: draft.config, secrets: draft.secrets, clearSecrets: draft.clearSecrets },
    });
    integrations.value = integrations.value.map((item) => item.key === updated.key ? updated : item);
    flash('Настройки интеграции сохранены');
    if (closeAfter) close(); else edit(updated);
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
onMounted(load);
</script>

<template>
  <section class="integration-settings">
    <div class="integration-kpis">
      <article><span>Подключений в реестре</span><strong>{{ counts.total }}</strong><small>все каналы экосистемы</small></article>
      <article><span>Включено</span><strong>{{ counts.enabled }}</strong><small>участвуют в процессах</small></article>
      <article><span>Настроено</span><strong>{{ counts.configured }}</strong><small>обязательные поля заполнены</small></article>
      <article :class="{ warn: counts.attention }"><span>Требуют внимания</span><strong>{{ counts.attention }}</strong><small>включены без полной настройки</small></article>
    </div>

    <article class="registry panel">
      <header class="registry-head">
        <div><p class="kicker">ЦЕНТР ПОДКЛЮЧЕНИЙ</p><h2>Интеграции экосистемы</h2><span>Ключи хранятся зашифрованно и не возвращаются из API.</span></div>
        <div class="registry-actions"><label><Search :size="15" /><input v-model="search" placeholder="Найти подключение" /></label><button @click="load"><RefreshCw :size="15" :class="{ spin: loading }" /> Обновить</button></div>
      </header>
      <nav class="category-tabs"><button v-for="item in categories" :key="item.id" :class="{ active: category === item.id }" @click="category = item.id">{{ item.label }}</button></nav>
      <div v-if="category === 'BOT' || audience !== 'ALL'" class="audience-filter"><span>Аудитория бота</span><button v-for="item in [{id:'ALL',label:'Все'}, {id:'EMPLOYEE',label:'Сотрудники'}, {id:'B2C',label:'B2C'}, {id:'B2B',label:'B2B'}]" :key="item.id" :class="{ active: audience === item.id }" @click="audience = item.id">{{ item.label }}</button></div>
      <div v-if="loading" class="loading-state">Загружаем реестр подключений…</div>
      <div v-else class="integration-grid">
        <button v-for="item in filtered" :key="item.key" class="integration-card" @click="edit(item)" @contextmenu.prevent="integrationMenu($event, item)">
          <IntegrationBrandLogo :provider="item.provider" />
          <span class="integration-copy"><span class="card-title"><strong>{{ item.name }}</strong><em v-if="item.audience">{{ audienceLabels[item.audience] }}</em></span><small>{{ item.description }}</small><span class="field-state"><i :class="`state-${item.status.toLowerCase()}`"></i>{{ statusLabels[item.status] }} · {{ item.environment === 'PRODUCTION' ? 'рабочий режим' : 'тестовый режим' }}</span></span>
          <ChevronRight :size="18" />
        </button>
        <p v-if="!filtered.length" class="empty">Подключения по выбранному фильтру не найдены.</p>
      </div>
      <p v-if="error && !selected" class="form-error">{{ error }}</p>
    </article>

    <aside v-if="selected" class="drawer-backdrop" @click.self="close">
      <form class="integration-drawer" @submit.prevent="save(true)">
        <header><IntegrationBrandLogo :provider="selected.provider" :size="42" /><div><p class="kicker">{{ categoryLabels[selected.category] }}</p><h2>{{ selected.name }}</h2><small v-if="selected.audience">Аудитория: {{ audienceLabels[selected.audience] }}</small></div><button type="button" class="close" @click="close"><X :size="18" /></button></header>
        <div class="drawer-scroll">
          <p class="drawer-description">{{ selected.description }}</p>
          <div class="mode-row"><label><span>Режим</span><select v-model="draft.environment"><option value="TEST">Тестовый</option><option value="PRODUCTION">Рабочий</option></select></label><label class="switch-line"><span><b>Подключение включено</b><small>Разрешить фоновые процессы</small></span><input v-model="draft.isEnabled" type="checkbox" /></label></div>
          <div class="security-note"><KeyRound :size="17" /><span><b>Безопасное хранение</b><small>Секреты шифруются AES-256-GCM. После сохранения их нельзя прочитать через интерфейс.</small></span></div>
          <section class="fields"><h3>Параметры подключения</h3>
            <label v-for="field in selected.fields" :key="field.key"><span>{{ field.label }} <b v-if="field.required">обязательно</b></span>
              <span v-if="field.type !== 'secret' && field.key === 'webhookUrl'" class="webhook-input"><input v-model="draft.config[field.key]" type="url" :placeholder="field.placeholder || ''" /><button type="button" title="Копировать адрес" @click="copyText(draft.config[field.key], 'Адрес webhook скопирован')"><Copy :size="14" /></button></span>
              <input v-else-if="field.type !== 'secret'" v-model="draft.config[field.key]" :type="field.type === 'url' ? 'url' : field.type === 'number' ? 'number' : 'text'" :placeholder="field.placeholder || ''" />
              <span v-else class="secret-input"><input v-model="draft.secrets[field.key]" type="password" autocomplete="new-password" :placeholder="field.configured && !draft.clearSecrets.includes(field.key) ? 'Сохранено ••••••••' : 'Введите секрет'" /><button v-if="field.configured" type="button" :class="{ danger: draft.clearSecrets.includes(field.key) }" @click="toggleClear(field.key)">{{ draft.clearSecrets.includes(field.key) ? 'Отменить удаление' : 'Удалить ключ' }}</button></span>
              <small v-if="field.hint">{{ field.hint }}</small>
            </label>
          </section>
          <a class="docs-link" :href="selected.documentationUrl" target="_blank" rel="noopener noreferrer"><ExternalLink :size="15" /> Открыть документацию {{ selected.provider }}</a>
          <div v-if="selected.lastTestMessage" class="last-check"><CheckCircle2 :size="17" /><span><b>Последняя проверка</b><small>{{ selected.lastTestMessage }}<template v-if="selected.lastTestAt"> · {{ new Date(selected.lastTestAt).toLocaleString('ru-RU') }}</template></small></span></div>
          <p v-if="error" class="form-error"><CircleAlert :size="15" /> {{ error }}</p>
        </div>
        <footer><button v-if="selected.key === 'ONE_C'" type="button" :disabled="saving" @click="runOneCExchange"><RefreshCw :size="15" /> Запустить обмен</button><button type="button" :disabled="saving" @click="testCurrent"><Check :size="15" /> {{ selected.key === 'ONE_C' ? 'Проверить соединение' : 'Проверить заполнение' }}</button><button class="primary" type="submit" :disabled="saving"><Save :size="15" /> {{ saving ? 'Сохраняем…' : 'Сохранить' }}</button></footer>
      </form>
    </aside>
    <div v-if="notice" class="integration-toast">{{ notice }}</div>
  </section>
</template>

<style scoped>
.integration-settings{display:grid;gap:15px}.integration-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}.integration-kpis article,.panel{background:#fff;border:1px solid var(--sb-line)}.integration-kpis article{padding:20px;display:grid;gap:7px}.integration-kpis span,.integration-kpis small{font-size:10px;color:var(--sb-muted)}.integration-kpis strong{font-size:27px;font-weight:500}.integration-kpis article.warn strong{color:#bb654c}.registry{min-width:0}.registry-head{padding:23px;display:flex;justify-content:space-between;gap:20px;align-items:flex-start}.registry-head h2{font-size:20px;margin:0 0 6px}.registry-head>div>span{font-size:10px;color:var(--sb-muted)}.kicker{font-size:9px;letter-spacing:.16em;color:var(--sb-coral);font-weight:600;margin:0 0 8px}.registry-actions{display:flex;gap:8px}.registry-actions label{width:250px;height:38px;border:1px solid var(--sb-line);display:flex;align-items:center;gap:8px;padding:0 10px;color:var(--sb-muted)}.registry-actions input{border:0;height:auto;padding:0;outline:0;width:100%;font-size:10px}.registry-actions button{height:38px;border:1px solid var(--sb-line);background:#fff;padding:0 12px;display:flex;align-items:center;gap:7px;font-size:10px}.category-tabs{display:flex;gap:3px;padding:0 23px;border-top:1px solid #eff0f2;border-bottom:1px solid #eff0f2;overflow:auto}.category-tabs button{height:43px;border:0;border-bottom:2px solid transparent;background:none;padding:0 12px;white-space:nowrap;color:var(--sb-muted);font-size:10px}.category-tabs button.active{color:var(--sb-ink);border-color:var(--sb-coral)}.audience-filter{display:flex;align-items:center;gap:6px;padding:12px 23px;border-bottom:1px solid #eff0f2}.audience-filter>span{font-size:9px;color:var(--sb-muted);margin-right:7px}.audience-filter button{height:27px;padding:0 10px;border:1px solid var(--sb-line);background:#fff;font-size:9px}.audience-filter button.active{background:var(--sb-ink);color:#fff;border-color:var(--sb-ink)}.integration-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0}.integration-card{min-height:118px;padding:19px 22px;border:0;border-right:1px solid #eff0f2;border-bottom:1px solid #eff0f2;background:#fff;display:grid;grid-template-columns:38px 1fr 18px;gap:13px;align-items:start;text-align:left;cursor:pointer}.integration-card:hover{background:#fafafa}.integration-icon{width:38px;height:38px;background:#f3f3f4;display:grid;place-items:center;color:#50535a;flex:none}.integration-copy{display:grid;gap:8px;min-width:0}.card-title{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.card-title strong{font-size:13px}.card-title em{font-style:normal;font-size:8px;padding:3px 6px;background:#f0f1f3;color:#676a70}.integration-copy>small{font-size:9px;line-height:1.5;color:var(--sb-muted)}.field-state{display:flex;align-items:center;gap:7px;font-size:9px;color:#686b72}.field-state i{width:7px;height:7px;border-radius:50%;background:#aaa}.field-state i.state-configured,.field-state i.state-connected{background:#2c9566;box-shadow:0 0 0 3px #e8f6ef}.field-state i.state-error{background:#bc5547;box-shadow:0 0 0 3px #f9e8e5}.field-state i.state-not_configured{background:#d18b33;box-shadow:0 0 0 3px #fff3df}.loading-state,.empty{grid-column:1/-1;padding:38px;text-align:center;color:var(--sb-muted);font-size:10px}.drawer-backdrop{position:fixed;inset:0;background:#0005;z-index:550}.integration-drawer{position:absolute;right:0;top:0;bottom:0;width:min(560px,96vw);background:#fff;display:grid;grid-template-rows:auto 1fr auto;box-shadow:-20px 0 60px #0002}.integration-drawer>header{padding:25px 27px;display:flex;gap:13px;align-items:center;border-bottom:1px solid var(--sb-line)}.integration-drawer header h2{font-size:21px;margin:0 0 4px}.integration-drawer header small{font-size:9px;color:var(--sb-muted)}.close{margin-left:auto;border:0;background:none;width:34px;height:34px}.drawer-scroll{overflow:auto;padding:24px 27px 32px}.drawer-description{font-size:11px;line-height:1.65;color:#666970;margin:0 0 19px}.mode-row{display:grid;grid-template-columns:1fr 1.35fr;gap:10px}.mode-row>label{display:grid;gap:6px;font-size:9px;color:var(--sb-muted)}select,input{height:39px;border:1px solid var(--sb-line);background:#fff;padding:0 10px;font:10px var(--sb-font);box-sizing:border-box}.switch-line{height:58px!important;border:1px solid var(--sb-line);padding:0 12px;display:flex!important;align-items:center;justify-content:space-between}.switch-line>span{display:grid;gap:4px}.switch-line b{font-size:10px;color:var(--sb-ink)}.switch-line small{font-size:8px}.switch-line input{width:17px;height:17px}.security-note,.last-check{margin-top:15px;padding:14px;background:#f5f6f7;display:flex;gap:10px;color:#59616c}.security-note span,.last-check span{display:grid;gap:4px}.security-note b,.last-check b{font-size:9px}.security-note small,.last-check small{font-size:8px;line-height:1.5;color:var(--sb-muted)}.fields{margin-top:24px}.fields h3{font-size:13px;margin:0 0 14px}.fields>label{display:grid;gap:7px;margin-bottom:13px;font-size:9px;color:#686b72}.fields>label>span:first-child{display:flex;justify-content:space-between}.fields>label>span>b{font-size:7px;font-weight:500;text-transform:uppercase;color:var(--sb-coral)}.fields input{width:100%}.secret-input{display:grid;grid-template-columns:1fr auto}.secret-input button{border:1px solid var(--sb-line);border-left:0;background:#fff;padding:0 10px;font-size:8px;color:#8a5c54}.secret-input button.danger{background:#fff0ed;color:#b34c3d}.docs-link{height:38px;border:1px solid var(--sb-line);display:flex;align-items:center;justify-content:center;gap:7px;text-decoration:none;color:#33363b;font-size:9px;margin-top:18px}.last-check{background:#edf7f1;color:#277654}.integration-drawer>footer{padding:16px 27px;border-top:1px solid var(--sb-line);display:flex;justify-content:flex-end;gap:8px}.integration-drawer>footer button{height:39px;border:1px solid var(--sb-line);background:#fff;padding:0 13px;display:flex;align-items:center;gap:7px;font-size:10px}.integration-drawer>footer .primary{background:var(--sb-ink);color:#fff;border-color:var(--sb-ink)}.form-error{display:flex;gap:7px;align-items:center;color:#b34c3d;background:#fff0ed;padding:11px 13px;font-size:9px}.integration-toast{position:fixed;right:24px;bottom:24px;background:var(--sb-ink);color:#fff;padding:13px 18px;font-size:10px;z-index:700}.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}@media(max-width:1000px){.integration-kpis{grid-template-columns:1fr 1fr}.integration-grid{grid-template-columns:1fr}}@media(max-width:650px){.registry-head{flex-direction:column}.registry-actions{width:100%;flex-wrap:wrap}.registry-actions label{width:100%;box-sizing:border-box}.integration-kpis{grid-template-columns:1fr 1fr}.mode-row{grid-template-columns:1fr}.integration-drawer>footer{justify-content:stretch}.integration-drawer>footer button{flex:1;justify-content:center}}
.webhook-input{display:grid;grid-template-columns:1fr 40px}.webhook-input input{min-width:0}.webhook-input button{border:1px solid var(--sb-line);border-left:0;background:#fff;display:grid;place-items:center;color:#656970}
</style>
