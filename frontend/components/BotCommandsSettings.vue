<script setup lang="ts">
import { Activity, Bot, CheckCircle2, CircleAlert, KeyRound, Link2, MessageCircleMore, Pencil, Plus, RefreshCw, Save, Search, ShieldCheck, Trash2, X } from '@lucide/vue';

const config = useRuntimeConfig();
const { token } = useWorkspaceSession();
const { openContextMenu, copyText } = useContextMenu();
const commands = ref<any[]>([]);
const botActivity = ref<any>({ items: [], identities: 0, unlinked: 0, statuses: {} });
const loading = ref(true);
const saving = ref(false);
const selected = ref<any>(null);
const search = ref('');
const audienceFilter = ref('ALL');
const channelFilter = ref('ALL');
const notice = ref('');
const error = ref('');
const draft = reactive<any>({});
const baseline = ref('');
const dirty = computed(() => Boolean(selected.value) && JSON.stringify(draft) !== baseline.value);
const audiences = [{ id: 'EMPLOYEE', label: 'Сотрудники' }, { id: 'B2C', label: 'B2C-клиенты' }, { id: 'B2B', label: 'B2B-клиенты' }];
const channels = [{ id: 'TELEGRAM', label: 'Telegram' }, { id: 'MAX', label: 'MAX' }, { id: 'VK', label: 'VK' }];
const audienceLabels = Object.fromEntries(audiences.map((item) => [item.id, item.label]));
const channelLabels = Object.fromEntries(channels.map((item) => [item.id, item.label]));
const eventStatusLabels: Record<string, string> = {
  RECEIVED: 'Принято', QUEUED: 'В очереди', PROCESSING: 'Обрабатывается', REQUIRES_AUTH: 'Нужна привязка',
  COMPLETED: 'Обработано', IGNORED: 'Пропущено', FAILED: 'Ошибка',
};
const headers = computed(() => ({ Authorization: `Bearer ${token.value}` }));
const filtered = computed(() => commands.value.filter((item) => {
  if (audienceFilter.value !== 'ALL' && !item.audiences.includes(audienceFilter.value)) return false;
  if (channelFilter.value !== 'ALL' && !item.channels.includes(channelFilter.value)) return false;
  const query = search.value.trim().toLowerCase();
  return !query || `${item.command} ${item.title} ${item.description || ''}`.toLowerCase().includes(query);
}));
const stats = computed(() => ({
  total: commands.value.length,
  enabled: commands.value.filter((item) => item.isEnabled).length,
  public: commands.value.filter((item) => !item.requiresAuth).length,
  protected: commands.value.filter((item) => item.requiresAuth).length,
}));

async function load() {
  loading.value = true;
  try {
    const [commandRows, activity] = await Promise.all([
      $fetch<any[]>('/system-settings/bot-commands', { baseURL: config.public.apiBase, headers: headers.value }),
      $fetch<any>('/system-settings/bot-events', { baseURL: config.public.apiBase, headers: headers.value }),
    ]);
    commands.value = commandRows;
    botActivity.value = activity;
  }
  catch (reason: any) { error.value = reason?.data?.message || 'Не удалось загрузить команды'; }
  finally { loading.value = false; }
}
function blankCommand() {
  return { command: '/', title: '', description: '', audiences: ['B2C'], channels: ['TELEGRAM'], handlerKey: 'CUSTOM_HANDLER', responseTemplate: '', requiresAuth: true, isEnabled: true, sortOrder: 100 };
}
function edit(item?: any) {
  if (saving.value) return;
  selected.value = item || { id: null };
  Object.assign(draft, item ? JSON.parse(JSON.stringify(item)) : blankCommand());
  error.value = '';
  baseline.value = JSON.stringify(draft);
}
function close(force = false) {
  if (force !== true && (saving.value || (dirty.value && !window.confirm('Закрыть без сохранения команды?')))) return false;
  selected.value = null; error.value = ''; return true;
}
onBeforeRouteLeave(() => !saving.value && (!dirty.value || window.confirm('Уйти без сохранения команды бота?')));
function flash(message: string) { notice.value = message; setTimeout(() => notice.value = '', 2600); }
function toggleArray(field: 'audiences' | 'channels', value: string) {
  draft[field] = draft[field].includes(value) ? draft[field].filter((item: string) => item !== value) : [...draft[field], value];
}
async function save() {
  if (!selected.value || saving.value) return;
  const editing = Boolean(selected.value.id);
  if (!draft.audiences.length || !draft.channels.length) { error.value = 'Выберите хотя бы одну аудиторию и один канал'; return; }
  saving.value = true;
  error.value = '';
  const body = {
    command: draft.command, title: draft.title, description: draft.description || undefined,
    audiences: draft.audiences, channels: draft.channels, handlerKey: draft.handlerKey.toUpperCase(),
    responseTemplate: draft.responseTemplate || undefined, requiresAuth: draft.requiresAuth,
    isEnabled: draft.isEnabled, sortOrder: Number(draft.sortOrder || 100),
  };
  try {
    await $fetch(selected.value.id ? `/system-settings/bot-commands/${selected.value.id}` : '/system-settings/bot-commands', {
      baseURL: config.public.apiBase, method: selected.value.id ? 'PATCH' : 'POST', headers: headers.value, body,
    });
    close(true); await load(); flash(editing ? 'Команда обновлена' : 'Команда создана');
  } catch (reason: any) {
    error.value = Array.isArray(reason?.data?.message) ? reason.data.message.join(', ') : reason?.data?.message || 'Не удалось сохранить команду';
  } finally { saving.value = false; }
}
async function quickToggle(item: any) {
  if (saving.value || loading.value) return;
  saving.value = true; error.value = '';
  try {
    await $fetch(`/system-settings/bot-commands/${item.id}`, { baseURL: config.public.apiBase, method: 'PATCH', headers: headers.value, body: { isEnabled: !item.isEnabled } });
    await load(); flash(item.isEnabled ? 'Команда выключена' : 'Команда включена');
  } catch (reason:any) { error.value = typeof reason?.data?.message === 'string' ? reason.data.message : 'Не удалось изменить команду.'; }
  finally { saving.value = false; }
}
async function remove(item: any) {
  if (saving.value || loading.value) return;
  if (!confirm(`Удалить команду «${item.command}»? Это действие попадёт в журнал аудита.`)) return;
  saving.value = true; error.value = '';
  try {
    await $fetch(`/system-settings/bot-commands/${item.id}`, { baseURL: config.public.apiBase, method: 'DELETE', headers: headers.value });
    await load(); flash('Команда удалена');
  } catch (reason:any) { error.value = typeof reason?.data?.message === 'string' ? reason.data.message : 'Не удалось удалить команду.'; }
  finally { saving.value = false; }
}
function commandMenu(event: MouseEvent, item: any) {
  openContextMenu(event, `${item.command} — ${item.title}`, [
    { label: 'Редактировать команду', icon: 'edit', action: () => edit(item) },
    { label: item.isEnabled ? 'Выключить команду' : 'Включить команду', icon: 'block', action: () => quickToggle(item) },
    { label: 'Копировать команду', icon: 'copy', action: () => copyText(item.command, 'Команда скопирована') },
    { label: 'Удалить команду', icon: 'trash', danger: true, separator: true, action: () => remove(item) },
  ], `${item.audiences.map((value: string) => audienceLabels[value]).join(', ')} · ${item.channels.map((value: string) => channelLabels[value]).join(', ')}`);
}
function eventMenu(event: MouseEvent, item: any) {
  openContextMenu(event, `${channelLabels[item.provider] || item.provider} · ${eventStatusLabels[item.status] || item.status}`, [
    { label: 'Копировать ID события', icon: 'copy', action: () => copyText(item.id, 'ID события скопирован') },
    ...(item.externalUserId ? [{ label: 'Копировать ID пользователя', icon: 'copy', action: () => copyText(item.externalUserId, 'ID пользователя скопирован') }] : []),
    ...(item.commandText ? [{ label: 'Копировать команду', icon: 'copy', action: () => copyText(item.commandText, 'Команда скопирована') }] : []),
  ], item.integration?.name || 'Событие бота');
}
onMounted(load);
</script>

<template>
  <section data-v-ui-4d3f24510037 class="command-settings">
    <div data-v-ui-4d3f24510037 class="command-kpis">
      <article class="crm-surface" data-v-ui-4d3f24510037><span data-v-ui-4d3f24510037>Команд</span><strong data-v-ui-4d3f24510037>{{ stats.total }}</strong><small data-v-ui-4d3f24510037>в общем реестре</small></article>
      <article class="crm-surface" data-v-ui-4d3f24510037><span data-v-ui-4d3f24510037>Активно</span><strong data-v-ui-4d3f24510037>{{ stats.enabled }}</strong><small data-v-ui-4d3f24510037>доступны пользователям</small></article>
      <article class="crm-surface" data-v-ui-4d3f24510037><span data-v-ui-4d3f24510037>Без авторизации</span><strong data-v-ui-4d3f24510037>{{ stats.public }}</strong><small data-v-ui-4d3f24510037>публичные сценарии</small></article>
      <article class="crm-surface" data-v-ui-4d3f24510037><span data-v-ui-4d3f24510037>С проверкой профиля</span><strong data-v-ui-4d3f24510037>{{ stats.protected }}</strong><small data-v-ui-4d3f24510037>привязаны к экосистеме</small></article>
    </div>

    <article data-v-ui-4d3f24510037 class="commands-panel">
      <header data-v-ui-4d3f24510037 class="commands-head">
        <div data-v-ui-4d3f24510037><p data-v-ui-4d3f24510037 class="kicker">ЕДИНЫЙ РЕЕСТР СЦЕНАРИЕВ</p><h2 data-v-ui-4d3f24510037>Команды ботов</h2><span data-v-ui-4d3f24510037>Одна команда может работать в нескольких мессенджерах, но только для выбранных аудиторий.</span></div>
        <div data-v-ui-4d3f24510037 class="head-actions"><label class="crm-input-group" data-v-ui-4d3f24510037><Search data-v-ui-4d3f24510037 :size="15" /><input class="crm-input" data-v-ui-4d3f24510037 id="bot-command-query" v-model="search" aria-label="Поиск команд ботов" placeholder="Команда или название" /></label><button class="crm-button crm-button--refresh crm-button--icon" data-v-ui-4d3f24510037 aria-label="Обновить команды" @click="load"><RefreshCw data-v-ui-4d3f24510037 :size="15" :class="{ spin: loading }" /></button><button data-v-ui-4d3f24510037 class="primary crm-button crm-button--primary" @click="edit()"><Plus data-v-ui-4d3f24510037 :size="15" /> Новая команда</button></div>
      </header>
      <div data-v-ui-4d3f24510037 class="filters crm-toolbar"><span data-v-ui-4d3f24510037>Аудитория</span><button class="crm-button" data-v-ui-4d3f24510037 v-for="item in [{id:'ALL',label:'Все'},...audiences]" :key="item.id" :class="{ active: audienceFilter === item.id }" @click="audienceFilter = item.id">{{ item.label }}</button><i data-v-ui-4d3f24510037></i><span data-v-ui-4d3f24510037>Канал</span><button class="crm-button" data-v-ui-4d3f24510037 v-for="item in [{id:'ALL',label:'Все'},...channels]" :key="item.id" :class="{ active: channelFilter === item.id }" @click="channelFilter = item.id">{{ item.label }}</button></div>
      <div data-v-ui-4d3f24510037 class="command-table">
        <div data-v-ui-4d3f24510037 class="command-row head crm-table-head"><span data-v-ui-4d3f24510037>Команда</span><span data-v-ui-4d3f24510037>Аудитории</span><span data-v-ui-4d3f24510037>Каналы</span><span data-v-ui-4d3f24510037>Доступ</span><span data-v-ui-4d3f24510037>Состояние</span><span data-v-ui-4d3f24510037></span></div>
        <div data-v-ui-4d3f24510037 v-for="item in filtered" :key="item.id" class="command-row" @dblclick="edit(item)" @contextmenu.prevent="commandMenu($event, item)">
          <div data-v-ui-4d3f24510037 class="command-name"><span data-v-ui-4d3f24510037 class="bot-icon"><Bot data-v-ui-4d3f24510037 :size="17" /></span><span data-v-ui-4d3f24510037><code data-v-ui-4d3f24510037>{{ item.command }}</code><strong data-v-ui-4d3f24510037>{{ item.title }}</strong><small data-v-ui-4d3f24510037>{{ item.description || 'Описание не задано' }}</small></span></div>
          <div data-v-ui-4d3f24510037 class="chips"><em data-v-ui-4d3f24510037 v-for="value in item.audiences" :key="value">{{ audienceLabels[value] }}</em></div>
          <div data-v-ui-4d3f24510037 class="chips channels"><em data-v-ui-4d3f24510037 v-for="value in item.channels" :key="value">{{ channelLabels[value] }}</em></div>
          <span data-v-ui-4d3f24510037 class="access-state"><KeyRound data-v-ui-4d3f24510037 v-if="item.requiresAuth" :size="14" /><MessageCircleMore data-v-ui-4d3f24510037 v-else :size="14" />{{ item.requiresAuth ? 'Нужен профиль' : 'Публичная' }}</span>
          <span data-v-ui-4d3f24510037 :class="item.isEnabled ? 'enabled' : 'disabled'"><i data-v-ui-4d3f24510037></i>{{ item.isEnabled ? 'Включена' : 'Выключена' }}</span>
          <div data-v-ui-4d3f24510037 class="row-actions"><button class="crm-button" data-v-ui-4d3f24510037 title="Редактировать" @click="edit(item)"><Pencil data-v-ui-4d3f24510037 :size="14" /></button><button class="crm-button" data-v-ui-4d3f24510037 title="Удалить" @click="remove(item)"><Trash2 data-v-ui-4d3f24510037 :size="14" /></button></div>
        </div>
        <p data-v-ui-4d3f24510037 v-if="!filtered.length && !loading" class="empty">Команды по выбранному фильтру не найдены.</p>
      </div>
      <p data-v-ui-4d3f24510037 v-if="error && !selected" class="form-error">{{ error }}</p>
    </article>

    <article data-v-ui-4d3f24510037 class="activity-panel">
      <header data-v-ui-4d3f24510037 class="activity-head">
        <div data-v-ui-4d3f24510037><p data-v-ui-4d3f24510037 class="kicker">ЖИВОЙ КОНТУР WEBHOOK</p><h2 data-v-ui-4d3f24510037>События и привязки профилей</h2><span data-v-ui-4d3f24510037>Входящие события защищены секретом, дедуплицируются и обрабатываются через очередь.</span></div>
        <div data-v-ui-4d3f24510037 class="activity-summary"><span data-v-ui-4d3f24510037><Link2 data-v-ui-4d3f24510037 :size="14" /><b data-v-ui-4d3f24510037>{{ botActivity.identities }}</b> профилей</span><span data-v-ui-4d3f24510037 :class="{ attention: botActivity.unlinked }"><CircleAlert data-v-ui-4d3f24510037 :size="14" /><b data-v-ui-4d3f24510037>{{ botActivity.unlinked }}</b> ждут привязки</span></div>
      </header>
      <div data-v-ui-4d3f24510037 class="activity-table">
        <div data-v-ui-4d3f24510037 class="activity-row activity-labels"><span data-v-ui-4d3f24510037>Канал</span><span data-v-ui-4d3f24510037>Событие</span><span data-v-ui-4d3f24510037>Пользователь</span><span data-v-ui-4d3f24510037>Результат</span><span data-v-ui-4d3f24510037>Получено</span></div>
        <div data-v-ui-4d3f24510037 v-for="item in botActivity.items.slice(0, 12)" :key="item.id" class="activity-row" @contextmenu.prevent="eventMenu($event, item)">
          <span data-v-ui-4d3f24510037 class="activity-channel"><IntegrationBrandLogo :provider="item.provider" :size="30" /><span data-v-ui-4d3f24510037><b data-v-ui-4d3f24510037>{{ channelLabels[item.provider] || item.provider }}</b><small data-v-ui-4d3f24510037>{{ audienceLabels[item.audience] }}</small></span></span>
          <span data-v-ui-4d3f24510037 class="activity-command"><code data-v-ui-4d3f24510037>{{ item.commandText || item.eventType || 'Системное событие' }}</code><small data-v-ui-4d3f24510037>{{ item.command?.title || item.integration?.name }}</small></span>
          <span data-v-ui-4d3f24510037>{{ item.externalUserId || 'Не определён' }}</span>
          <span data-v-ui-4d3f24510037 class="event-status" :class="`event-${item.status.toLowerCase()}`"><i data-v-ui-4d3f24510037></i>{{ eventStatusLabels[item.status] || item.status }}</span>
          <span data-v-ui-4d3f24510037>{{ new Date(item.receivedAt).toLocaleString('ru-RU') }}</span>
        </div>
        <div data-v-ui-4d3f24510037 v-if="!botActivity.items.length" class="activity-empty"><Activity data-v-ui-4d3f24510037 :size="22" /><b data-v-ui-4d3f24510037>Событий пока нет</b><span data-v-ui-4d3f24510037>Они появятся здесь после подключения webhook в кабинете мессенджера.</span></div>
      </div>
    </article>

    <aside data-v-ui-4d3f24510037 v-if="selected" class="drawer-backdrop admin-dialog-backdrop" @click.self="close">
      <form data-v-ui-4d3f24510037 class="command-drawer admin-dialog admin-dialog--drawer" @submit.prevent="save">
        <header data-v-ui-4d3f24510037><span data-v-ui-4d3f24510037 class="bot-icon large"><Bot data-v-ui-4d3f24510037 :size="20" /></span><div data-v-ui-4d3f24510037><p data-v-ui-4d3f24510037 class="kicker">{{ selected.id ? 'РЕДАКТИРОВАНИЕ СЦЕНАРИЯ' : 'НОВЫЙ СЦЕНАРИЙ' }}</p><h2 data-v-ui-4d3f24510037>{{ selected.id ? draft.title : 'Создать команду' }}</h2></div><button data-v-ui-4d3f24510037 type="button" class="close crm-button" @click="close"><X data-v-ui-4d3f24510037 :size="18" /></button></header>
        <div data-v-ui-4d3f24510037 class="drawer-scroll admin-dialog-body">
          <div data-v-ui-4d3f24510037 class="two-fields"><label data-v-ui-4d3f24510037><span data-v-ui-4d3f24510037>Команда</span><input class="crm-input" data-v-ui-4d3f24510037 v-model.trim="draft.command" placeholder="/orders" required pattern="/?[a-z0-9_]{2,32}" /></label><label data-v-ui-4d3f24510037><span data-v-ui-4d3f24510037>Порядок</span><input class="crm-input" data-v-ui-4d3f24510037 v-model.number="draft.sortOrder" type="number" min="0" max="10000" /></label></div>
          <label data-v-ui-4d3f24510037><span data-v-ui-4d3f24510037>Название</span><input class="crm-input" data-v-ui-4d3f24510037 v-model.trim="draft.title" required maxlength="80" placeholder="Мои заказы" /></label>
          <label data-v-ui-4d3f24510037><span data-v-ui-4d3f24510037>Описание</span><textarea class="crm-input" data-v-ui-4d3f24510037 v-model.trim="draft.description" rows="3" maxlength="300" placeholder="Что увидит пользователь после вызова команды"></textarea></label>
          <label data-v-ui-4d3f24510037><span data-v-ui-4d3f24510037>Обработчик</span><input class="crm-input" data-v-ui-4d3f24510037 v-model.trim="draft.handlerKey" required pattern="[A-Z0-9_]{2,64}" placeholder="CUSTOMER_ORDERS" @input="draft.handlerKey = draft.handlerKey.toUpperCase().replace(/[^A-Z0-9_]/g, '')" /><small data-v-ui-4d3f24510037>Системный код обработчика. Заглавные латинские буквы и подчёркивания.</small></label>
          <section data-v-ui-4d3f24510037 class="choice-section"><h3 data-v-ui-4d3f24510037>Кому доступна команда</h3><button class="crm-button" data-v-ui-4d3f24510037 v-for="item in audiences" :key="item.id" type="button" :class="{ selected: draft.audiences.includes(item.id) }" @click="toggleArray('audiences', item.id)"><span data-v-ui-4d3f24510037><ShieldCheck data-v-ui-4d3f24510037 :size="16" />{{ item.label }}</span><CheckCircle2 data-v-ui-4d3f24510037 v-if="draft.audiences.includes(item.id)" :size="16" /></button></section>
          <section data-v-ui-4d3f24510037 class="choice-section"><h3 data-v-ui-4d3f24510037>В каких ботах работает</h3><button class="crm-button" data-v-ui-4d3f24510037 v-for="item in channels" :key="item.id" type="button" :class="{ selected: draft.channels.includes(item.id) }" @click="toggleArray('channels', item.id)"><span data-v-ui-4d3f24510037><MessageCircleMore data-v-ui-4d3f24510037 :size="16" />{{ item.label }}</span><CheckCircle2 data-v-ui-4d3f24510037 v-if="draft.channels.includes(item.id)" :size="16" /></button></section>
          <label data-v-ui-4d3f24510037><span data-v-ui-4d3f24510037>Шаблон ответа</span><textarea class="crm-input" data-v-ui-4d3f24510037 v-model="draft.responseTemplate" rows="5" maxlength="2000" placeholder="Необязательно. Можно использовать подготовленный системный обработчик."></textarea></label>
          <div data-v-ui-4d3f24510037 class="switches"><label class="crm-toggle-row" data-v-ui-4d3f24510037><span data-v-ui-4d3f24510037><b data-v-ui-4d3f24510037>Требовать авторизацию</b><small data-v-ui-4d3f24510037>Проверять привязку мессенджера к профилю</small></span><input class="crm-check" data-v-ui-4d3f24510037 v-model="draft.requiresAuth" type="checkbox" /></label><label class="crm-toggle-row" data-v-ui-4d3f24510037><span data-v-ui-4d3f24510037><b data-v-ui-4d3f24510037>Команда включена</b><small data-v-ui-4d3f24510037>Показывать и обрабатывать команду</small></span><input class="crm-check" data-v-ui-4d3f24510037 v-model="draft.isEnabled" type="checkbox" /></label></div>
          <p data-v-ui-4d3f24510037 v-if="error" class="form-error"><CircleAlert data-v-ui-4d3f24510037 :size="15" />{{ error }}</p>
        </div>
        <footer data-v-ui-4d3f24510037><button class="crm-button" data-v-ui-4d3f24510037 type="button" @click="close">Отмена</button><button data-v-ui-4d3f24510037 class="primary crm-button crm-button--primary" type="submit" :disabled="saving"><Save data-v-ui-4d3f24510037 :size="15" />{{ saving ? 'Сохраняем…' : 'Сохранить команду' }}</button></footer>
      </form>
    </aside>
    <div data-v-ui-4d3f24510037 v-if="notice" class="command-toast">{{ notice }}</div>
  </section>
</template>
