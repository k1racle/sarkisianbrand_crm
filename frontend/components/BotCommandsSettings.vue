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
  selected.value = item || { id: null };
  Object.assign(draft, item ? JSON.parse(JSON.stringify(item)) : blankCommand());
  error.value = '';
}
function close() { selected.value = null; error.value = ''; }
function flash(message: string) { notice.value = message; setTimeout(() => notice.value = '', 2600); }
function toggleArray(field: 'audiences' | 'channels', value: string) {
  draft[field] = draft[field].includes(value) ? draft[field].filter((item: string) => item !== value) : [...draft[field], value];
}
async function save() {
  if (!selected.value) return;
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
    close(); await load(); flash(editing ? 'Команда обновлена' : 'Команда создана');
  } catch (reason: any) {
    error.value = Array.isArray(reason?.data?.message) ? reason.data.message.join(', ') : reason?.data?.message || 'Не удалось сохранить команду';
  } finally { saving.value = false; }
}
async function quickToggle(item: any) {
  await $fetch(`/system-settings/bot-commands/${item.id}`, { baseURL: config.public.apiBase, method: 'PATCH', headers: headers.value, body: { isEnabled: !item.isEnabled } });
  await load(); flash(item.isEnabled ? 'Команда выключена' : 'Команда включена');
}
async function remove(item: any) {
  if (!confirm(`Удалить команду «${item.command}»? Это действие попадёт в журнал аудита.`)) return;
  await $fetch(`/system-settings/bot-commands/${item.id}`, { baseURL: config.public.apiBase, method: 'DELETE', headers: headers.value });
  await load(); flash('Команда удалена');
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
  <section class="command-settings">
    <div class="command-kpis">
      <article><span>Команд</span><strong>{{ stats.total }}</strong><small>в общем реестре</small></article>
      <article><span>Активно</span><strong>{{ stats.enabled }}</strong><small>доступны пользователям</small></article>
      <article><span>Без авторизации</span><strong>{{ stats.public }}</strong><small>публичные сценарии</small></article>
      <article><span>С проверкой профиля</span><strong>{{ stats.protected }}</strong><small>привязаны к экосистеме</small></article>
    </div>

    <article class="commands-panel">
      <header class="commands-head">
        <div><p class="kicker">ЕДИНЫЙ РЕЕСТР СЦЕНАРИЕВ</p><h2>Команды ботов</h2><span>Одна команда может работать в нескольких мессенджерах, но только для выбранных аудиторий.</span></div>
        <div class="head-actions"><label><Search :size="15" /><input v-model="search" placeholder="Команда или название" /></label><button @click="load"><RefreshCw :size="15" :class="{ spin: loading }" /></button><button class="primary" @click="edit()"><Plus :size="15" /> Новая команда</button></div>
      </header>
      <div class="filters"><span>Аудитория</span><button v-for="item in [{id:'ALL',label:'Все'},...audiences]" :key="item.id" :class="{ active: audienceFilter === item.id }" @click="audienceFilter = item.id">{{ item.label }}</button><i></i><span>Канал</span><button v-for="item in [{id:'ALL',label:'Все'},...channels]" :key="item.id" :class="{ active: channelFilter === item.id }" @click="channelFilter = item.id">{{ item.label }}</button></div>
      <div class="command-table">
        <div class="command-row head"><span>Команда</span><span>Аудитории</span><span>Каналы</span><span>Доступ</span><span>Состояние</span><span></span></div>
        <div v-for="item in filtered" :key="item.id" class="command-row" @dblclick="edit(item)" @contextmenu.prevent="commandMenu($event, item)">
          <div class="command-name"><span class="bot-icon"><Bot :size="17" /></span><span><code>{{ item.command }}</code><strong>{{ item.title }}</strong><small>{{ item.description || 'Описание не задано' }}</small></span></div>
          <div class="chips"><em v-for="value in item.audiences" :key="value">{{ audienceLabels[value] }}</em></div>
          <div class="chips channels"><em v-for="value in item.channels" :key="value">{{ channelLabels[value] }}</em></div>
          <span class="access-state"><KeyRound v-if="item.requiresAuth" :size="14" /><MessageCircleMore v-else :size="14" />{{ item.requiresAuth ? 'Нужен профиль' : 'Публичная' }}</span>
          <span :class="item.isEnabled ? 'enabled' : 'disabled'"><i></i>{{ item.isEnabled ? 'Включена' : 'Выключена' }}</span>
          <div class="row-actions"><button title="Редактировать" @click="edit(item)"><Pencil :size="14" /></button><button title="Удалить" @click="remove(item)"><Trash2 :size="14" /></button></div>
        </div>
        <p v-if="!filtered.length && !loading" class="empty">Команды по выбранному фильтру не найдены.</p>
      </div>
      <p v-if="error && !selected" class="form-error">{{ error }}</p>
    </article>

    <article class="activity-panel">
      <header class="activity-head">
        <div><p class="kicker">ЖИВОЙ КОНТУР WEBHOOK</p><h2>События и привязки профилей</h2><span>Входящие события защищены секретом, дедуплицируются и обрабатываются через очередь.</span></div>
        <div class="activity-summary"><span><Link2 :size="14" /><b>{{ botActivity.identities }}</b> профилей</span><span :class="{ attention: botActivity.unlinked }"><CircleAlert :size="14" /><b>{{ botActivity.unlinked }}</b> ждут привязки</span></div>
      </header>
      <div class="activity-table">
        <div class="activity-row activity-labels"><span>Канал</span><span>Событие</span><span>Пользователь</span><span>Результат</span><span>Получено</span></div>
        <div v-for="item in botActivity.items.slice(0, 12)" :key="item.id" class="activity-row" @contextmenu.prevent="eventMenu($event, item)">
          <span class="activity-channel"><IntegrationBrandLogo :provider="item.provider" :size="30" /><span><b>{{ channelLabels[item.provider] || item.provider }}</b><small>{{ audienceLabels[item.audience] }}</small></span></span>
          <span class="activity-command"><code>{{ item.commandText || item.eventType || 'Системное событие' }}</code><small>{{ item.command?.title || item.integration?.name }}</small></span>
          <span>{{ item.externalUserId || 'Не определён' }}</span>
          <span class="event-status" :class="`event-${item.status.toLowerCase()}`"><i></i>{{ eventStatusLabels[item.status] || item.status }}</span>
          <span>{{ new Date(item.receivedAt).toLocaleString('ru-RU') }}</span>
        </div>
        <div v-if="!botActivity.items.length" class="activity-empty"><Activity :size="22" /><b>Событий пока нет</b><span>Они появятся здесь после подключения webhook в кабинете мессенджера.</span></div>
      </div>
    </article>

    <aside v-if="selected" class="drawer-backdrop" @click.self="close">
      <form class="command-drawer" @submit.prevent="save">
        <header><span class="bot-icon large"><Bot :size="20" /></span><div><p class="kicker">{{ selected.id ? 'РЕДАКТИРОВАНИЕ СЦЕНАРИЯ' : 'НОВЫЙ СЦЕНАРИЙ' }}</p><h2>{{ selected.id ? draft.title : 'Создать команду' }}</h2></div><button type="button" class="close" @click="close"><X :size="18" /></button></header>
        <div class="drawer-scroll">
          <div class="two-fields"><label><span>Команда</span><input v-model.trim="draft.command" placeholder="/orders" required pattern="/?[a-z0-9_]{2,32}" /></label><label><span>Порядок</span><input v-model.number="draft.sortOrder" type="number" min="0" max="10000" /></label></div>
          <label><span>Название</span><input v-model.trim="draft.title" required maxlength="80" placeholder="Мои заказы" /></label>
          <label><span>Описание</span><textarea v-model.trim="draft.description" rows="3" maxlength="300" placeholder="Что увидит пользователь после вызова команды"></textarea></label>
          <label><span>Обработчик</span><input v-model.trim="draft.handlerKey" required pattern="[A-Z0-9_]{2,64}" placeholder="CUSTOMER_ORDERS" @input="draft.handlerKey = draft.handlerKey.toUpperCase().replace(/[^A-Z0-9_]/g, '')" /><small>Системный код обработчика. Заглавные латинские буквы и подчёркивания.</small></label>
          <section class="choice-section"><h3>Кому доступна команда</h3><button v-for="item in audiences" :key="item.id" type="button" :class="{ selected: draft.audiences.includes(item.id) }" @click="toggleArray('audiences', item.id)"><span><ShieldCheck :size="16" />{{ item.label }}</span><CheckCircle2 v-if="draft.audiences.includes(item.id)" :size="16" /></button></section>
          <section class="choice-section"><h3>В каких ботах работает</h3><button v-for="item in channels" :key="item.id" type="button" :class="{ selected: draft.channels.includes(item.id) }" @click="toggleArray('channels', item.id)"><span><MessageCircleMore :size="16" />{{ item.label }}</span><CheckCircle2 v-if="draft.channels.includes(item.id)" :size="16" /></button></section>
          <label><span>Шаблон ответа</span><textarea v-model="draft.responseTemplate" rows="5" maxlength="2000" placeholder="Необязательно. Можно использовать подготовленный системный обработчик."></textarea></label>
          <div class="switches"><label><span><b>Требовать авторизацию</b><small>Проверять привязку мессенджера к профилю</small></span><input v-model="draft.requiresAuth" type="checkbox" /></label><label><span><b>Команда включена</b><small>Показывать и обрабатывать команду</small></span><input v-model="draft.isEnabled" type="checkbox" /></label></div>
          <p v-if="error" class="form-error"><CircleAlert :size="15" />{{ error }}</p>
        </div>
        <footer><button type="button" @click="close">Отмена</button><button class="primary" type="submit" :disabled="saving"><Save :size="15" />{{ saving ? 'Сохраняем…' : 'Сохранить команду' }}</button></footer>
      </form>
    </aside>
    <div v-if="notice" class="command-toast">{{ notice }}</div>
  </section>
</template>

<style scoped>
.command-settings{display:grid;gap:15px}.command-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}.command-kpis article,.commands-panel{background:#fff;border:1px solid var(--sb-line)}.command-kpis article{padding:20px;display:grid;gap:7px}.command-kpis span,.command-kpis small{font-size:10px;color:var(--sb-muted)}.command-kpis strong{font-size:27px;font-weight:500}.commands-head{padding:23px;display:flex;justify-content:space-between;gap:20px}.commands-head h2{font-size:20px;margin:0 0 6px}.commands-head>div>span{font-size:10px;color:var(--sb-muted)}.kicker{font-size:9px;letter-spacing:.16em;color:var(--sb-coral);font-weight:600;margin:0 0 8px}.head-actions{display:flex;gap:7px;align-items:flex-start}.head-actions label{width:230px;height:38px;border:1px solid var(--sb-line);display:flex;align-items:center;gap:7px;padding:0 10px;color:var(--sb-muted)}.head-actions input{border:0;outline:0;height:auto;padding:0;width:100%}.head-actions button{height:38px;border:1px solid var(--sb-line);background:#fff;padding:0 11px;display:flex;align-items:center;gap:7px;font-size:10px}.head-actions .primary,.command-drawer .primary{background:var(--sb-ink);color:#fff;border-color:var(--sb-ink)}.filters{min-height:47px;border-top:1px solid #eff0f2;border-bottom:1px solid #eff0f2;padding:8px 23px;display:flex;align-items:center;gap:6px;box-sizing:border-box;overflow:auto}.filters>span{font-size:8px;text-transform:uppercase;letter-spacing:.08em;color:var(--sb-muted);margin-right:3px;white-space:nowrap}.filters>i{height:20px;border-left:1px solid var(--sb-line);margin:0 8px}.filters button{height:27px;padding:0 9px;border:1px solid var(--sb-line);background:#fff;font-size:8px;white-space:nowrap}.filters button.active{background:var(--sb-ink);border-color:var(--sb-ink);color:#fff}.command-table{overflow:auto}.command-row{min-width:1050px;display:grid;grid-template-columns:2.2fr 1.25fr 1fr 1fr .85fr 76px;gap:14px;align-items:center;padding:13px 23px;border-bottom:1px solid #eff0f2;font-size:9px}.command-row.head{font-size:8px;text-transform:uppercase;color:var(--sb-muted);min-height:38px;padding-top:8px;padding-bottom:8px}.command-name{display:flex;align-items:flex-start;gap:11px}.bot-icon{width:34px;height:34px;background:#f1f2f4;color:#555960;display:grid;place-items:center;flex:none}.bot-icon.large{width:40px;height:40px}.command-name>span:last-child{display:grid;gap:3px}.command-name code{color:var(--sb-coral);font-size:10px}.command-name strong{font-size:10px}.command-name small{font-size:8px;color:var(--sb-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:300px}.chips{display:flex;gap:4px;flex-wrap:wrap}.chips em{font-style:normal;background:#eef2f5;color:#5d6670;padding:4px 6px;font-size:7px}.chips.channels em{background:#f5f0f4;color:#745d70}.access-state{display:flex;align-items:center;gap:6px;color:#666a71}.enabled,.disabled{display:flex;align-items:center;gap:7px;color:#27865b}.enabled i,.disabled i{width:7px;height:7px;border-radius:50%;background:#2c9566;box-shadow:0 0 0 3px #e8f6ef}.disabled{color:#8b8e94}.disabled i{background:#aaa;box-shadow:0 0 0 3px #f0f1f3}.row-actions{display:flex;gap:5px}.row-actions button{width:32px;height:30px;border:1px solid var(--sb-line);background:#fff}.empty{padding:35px;text-align:center;color:var(--sb-muted);font-size:10px}.drawer-backdrop{position:fixed;inset:0;background:#0005;z-index:550}.command-drawer{position:absolute;right:0;top:0;bottom:0;width:min(560px,96vw);background:#fff;display:grid;grid-template-rows:auto 1fr auto;box-shadow:-20px 0 60px #0002}.command-drawer>header{padding:25px 27px;display:flex;gap:13px;align-items:center;border-bottom:1px solid var(--sb-line)}.command-drawer header h2{font-size:21px;margin:0}.close{margin-left:auto;border:0;background:none;width:34px;height:34px}.drawer-scroll{overflow:auto;padding:24px 27px 32px}.drawer-scroll>label,.two-fields label{display:grid;gap:7px;margin-bottom:14px;font-size:9px;color:#666a71}.drawer-scroll input,.drawer-scroll textarea{width:100%;box-sizing:border-box;border:1px solid var(--sb-line);background:#fff;padding:0 10px;font:10px var(--sb-font)}.drawer-scroll input{height:39px}.drawer-scroll textarea{padding:10px;resize:vertical;line-height:1.5}.drawer-scroll label small{font-size:8px;color:var(--sb-muted);line-height:1.5}.two-fields{display:grid;grid-template-columns:2fr 1fr;gap:10px}.choice-section{margin:21px 0}.choice-section h3{font-size:12px;margin:0 0 9px}.choice-section button{width:100%;height:42px;border:1px solid var(--sb-line);border-bottom:0;background:#fff;padding:0 12px;display:flex;align-items:center;justify-content:space-between;color:#757980}.choice-section button:last-child{border-bottom:1px solid var(--sb-line)}.choice-section button span{display:flex;align-items:center;gap:9px;font-size:9px}.choice-section button.selected{background:#f4f6f5;color:#287355}.switches{display:grid;grid-template-columns:1fr 1fr;gap:10px}.switches label{min-height:59px;border:1px solid var(--sb-line);padding:0 12px;display:flex;align-items:center;justify-content:space-between}.switches label>span{display:grid;gap:4px}.switches b{font-size:9px}.switches small{font-size:7px;color:var(--sb-muted)}.switches input{width:17px;height:17px}.form-error{display:flex;align-items:center;gap:7px;color:#b34c3d;background:#fff0ed;padding:11px 13px;font-size:9px;margin-top:14px}.command-drawer>footer{padding:16px 27px;border-top:1px solid var(--sb-line);display:flex;justify-content:flex-end;gap:8px}.command-drawer>footer button{height:39px;border:1px solid var(--sb-line);background:#fff;padding:0 13px;display:flex;align-items:center;gap:7px;font-size:10px}.command-toast{position:fixed;right:24px;bottom:24px;background:var(--sb-ink);color:#fff;padding:13px 18px;font-size:10px;z-index:700}.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}@media(max-width:1000px){.command-kpis{grid-template-columns:1fr 1fr}.commands-head{flex-direction:column}.head-actions{flex-wrap:wrap}}@media(max-width:650px){.head-actions label{width:100%;box-sizing:border-box}.command-kpis{grid-template-columns:1fr 1fr}.two-fields,.switches{grid-template-columns:1fr}.command-drawer>footer button{flex:1;justify-content:center}}
.activity-panel{background:#fff;border:1px solid var(--sb-line)}.activity-head{padding:23px;display:flex;align-items:flex-start;justify-content:space-between;gap:20px;border-bottom:1px solid #eff0f2}.activity-head h2{font-size:20px;margin:0 0 6px}.activity-head>div>span{font-size:10px;color:var(--sb-muted)}.activity-summary{display:flex;gap:8px}.activity-summary>span{height:38px;border:1px solid var(--sb-line);display:flex;align-items:center;gap:6px;padding:0 11px;font-size:9px!important;white-space:nowrap}.activity-summary b{font-size:13px;color:var(--sb-ink)}.activity-summary .attention{color:#a14f40;background:#fff8f5;border-color:#f0d6ce}.activity-table{overflow:auto}.activity-row{min-width:880px;display:grid;grid-template-columns:1.15fr 1.55fr 1fr 1fr 1fr;gap:16px;align-items:center;padding:12px 23px;border-bottom:1px solid #eff0f2;font-size:9px;color:#686b72}.activity-labels{padding-top:9px;padding-bottom:9px;text-transform:uppercase;font-size:8px;color:var(--sb-muted)}.activity-channel{display:flex;align-items:center;gap:9px}.activity-channel>span{display:grid;gap:3px}.activity-channel b{font-size:10px;color:var(--sb-ink)}.activity-channel small,.activity-command small{font-size:8px;color:var(--sb-muted)}.activity-command{display:grid;gap:4px;min-width:0}.activity-command code{font-size:9px;color:var(--sb-coral);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.event-status{display:flex;align-items:center;gap:7px}.event-status i{width:7px;height:7px;border-radius:50%;background:#9a9da2;box-shadow:0 0 0 3px #f0f1f3}.event-completed{color:#27865b}.event-completed i{background:#2c9566;box-shadow:0 0 0 3px #e8f6ef}.event-failed{color:#b34c3d}.event-failed i{background:#bc5547;box-shadow:0 0 0 3px #f9e8e5}.event-requires_auth{color:#aa7029}.event-requires_auth i{background:#d18b33;box-shadow:0 0 0 3px #fff3df}.activity-empty{min-height:150px;display:grid;place-items:center;align-content:center;gap:7px;color:var(--sb-muted);font-size:9px}.activity-empty b{color:var(--sb-ink);font-size:11px}@media(max-width:850px){.activity-head{flex-direction:column}.activity-summary{flex-wrap:wrap}}
</style>
