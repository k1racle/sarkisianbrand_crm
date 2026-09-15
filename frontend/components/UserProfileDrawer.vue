<script setup lang="ts">
import { Bell, Camera, Check, KeyRound, Laptop, LoaderCircle, LockKeyhole, MapPin, ShieldCheck, Trash2, UserRound, X } from '@lucide/vue';

const props = defineProps<{ mode: 'workspace' | 'b2b' }>();
const config = useRuntimeConfig();
const workspace = useWorkspaceSession();
const b2b = useB2BSession();
const { isOpen, closeProfile } = useUserProfilePanel();
const tab = ref<'profile' | 'security' | 'notifications'>('profile');
const profile = ref<any>(null);
const loading = ref(false);
const saving = ref(false);
const notice = ref('');
const error = ref('');
const fileInput = ref<HTMLInputElement | null>(null);
const basic = reactive({ city: '', country: 'RU', timezone: 'Europe/Moscow' });
const requested = reactive({ firstName: '', lastName: '', phone: '' });
const passwords = reactive({ currentPassword: '', newPassword: '', repeatPassword: '' });
const notifications = reactive({ email: true, push: true, chat: true });
const activeToken = computed(() => props.mode === 'workspace' ? workspace.token.value : b2b.token.value);
const currentSessionId = computed(() => {
  try { return JSON.parse(atob(activeToken.value.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).sid || ''; }
  catch { return ''; }
});
const avatarUrl = computed(() => profile.value?.avatarUrl ? new URL(profile.value.avatarUrl, config.public.apiBase).toString() : '');
const displayName = computed(() => [profile.value?.firstName, profile.value?.lastName].filter(Boolean).join(' ') || 'Пользователь');
const headers = computed(() => ({ Authorization: `Bearer ${activeToken.value}` }));

function fill(data: any) {
  profile.value = data;
  Object.assign(basic, { city: data.city || '', country: data.country || 'RU', timezone: data.timezone || 'Europe/Moscow' });
  Object.assign(requested, { firstName: data.firstName || '', lastName: data.lastName || '', phone: data.phone || '' });
  Object.assign(notifications, { email: data.notificationPreferences?.email !== false, push: data.notificationPreferences?.push !== false, chat: data.notificationPreferences?.chat !== false });
  const session = props.mode === 'workspace' ? workspace : b2b;
  if (session.user.value) Object.assign(session.user.value, data);
  session.persist();
}

async function load() {
  if (!activeToken.value) return;
  loading.value = true; error.value = '';
  try { fill(await $fetch('/auth/profile', { baseURL: config.public.apiBase, headers: headers.value })); }
  catch (exception: any) { error.value = messageOf(exception); }
  finally { loading.value = false; }
}

async function saveBasic() {
  await act(async () => {
    await $fetch('/auth/profile', { baseURL: config.public.apiBase, method: 'PATCH', headers: headers.value, body: basic });
    await load(); showNotice('Настройки профиля сохранены');
  });
}

async function submitChangeRequest() {
  await act(async () => {
    await $fetch('/auth/profile/change-request', { baseURL: config.public.apiBase, method: 'POST', headers: headers.value, body: requested });
    await load(); showNotice('Запрос отправлен администратору');
  });
}

async function saveNotifications() {
  await act(async () => {
    await $fetch('/auth/profile', { baseURL: config.public.apiBase, method: 'PATCH', headers: headers.value, body: { notificationPreferences: notifications } });
    await load(); showNotice('Каналы уведомлений сохранены');
  });
}

async function changePassword() {
  if (passwords.newPassword !== passwords.repeatPassword) { error.value = 'Новые пароли не совпадают'; return; }
  await act(async () => {
    await $fetch('/auth/profile/password', { baseURL: config.public.apiBase, method: 'POST', headers: headers.value, body: { currentPassword: passwords.currentPassword, newPassword: passwords.newPassword } });
    props.mode === 'workspace' ? workspace.logout() : b2b.logout();
    closeProfile();
    await navigateTo(props.mode === 'workspace' ? '/workspace-login' : '/b2b-login');
  });
}

async function uploadAvatar(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const body = new FormData(); body.append('file', file);
  await act(async () => {
    await $fetch('/auth/profile/avatar', { baseURL: config.public.apiBase, method: 'POST', headers: headers.value, body });
    await load(); showNotice('Фотография обновлена');
  });
  if (fileInput.value) fileInput.value.value = '';
}

async function removeAvatar() {
  await act(async () => {
    await $fetch('/auth/profile/avatar', { baseURL: config.public.apiBase, method: 'DELETE', headers: headers.value });
    await load(); showNotice('Фотография удалена');
  });
}

async function revokeSession(session: any) {
  await act(async () => {
    await $fetch(`/auth/profile/sessions/${session.id}`, { baseURL: config.public.apiBase, method: 'DELETE', headers: headers.value });
    if (session.id === currentSessionId.value) {
      props.mode === 'workspace' ? workspace.logout() : b2b.logout();
      closeProfile();
      await navigateTo(props.mode === 'workspace' ? '/workspace-login' : '/b2b-login');
      return;
    }
    await load(); showNotice('Сессия завершена');
  });
}

async function act(callback: () => Promise<void>) {
  saving.value = true; error.value = '';
  try { await callback(); } catch (exception: any) { error.value = messageOf(exception); }
  finally { saving.value = false; }
}
function messageOf(exception: any) { return exception?.data?.message || exception?.message || 'Не удалось выполнить действие'; }
function showNotice(value: string) { notice.value = value; setTimeout(() => notice.value = '', 2500); }
function tryClose() { if (!profile.value?.forcePasswordChange) closeProfile(); }
function deviceName(value?: string) {
  if (!value) return 'Неизвестное устройство';
  if (/Mobile|Android|iPhone/i.test(value)) return 'Мобильное устройство';
  if (/Windows/i.test(value)) return 'Компьютер Windows';
  if (/Macintosh|Mac OS/i.test(value)) return 'Компьютер Mac';
  return 'Браузер';
}
watch(isOpen, (value) => { if (value) { tab.value = 'profile'; load(); } });
</script>

<template>
  <Teleport to="body">
    <Transition name="profile-fade">
      <div v-if="isOpen" class="profile-backdrop" @mousedown.self="tryClose">
        <aside class="profile-drawer" role="dialog" aria-modal="true" aria-label="Профиль пользователя">
          <header class="profile-head">
            <div><p>УЧЁТНАЯ ЗАПИСЬ</p><h2>Мой профиль</h2></div>
            <button class="icon-button" aria-label="Закрыть" :disabled="profile?.forcePasswordChange" @click="tryClose"><X :size="19" /></button>
          </header>
          <div v-if="loading && !profile" class="profile-loading"><LoaderCircle :size="24" class="spin" /><span>Загружаем профиль</span></div>
          <template v-else-if="profile">
            <section class="identity">
              <button class="avatar" title="Загрузить фотографию" @click="fileInput?.click()">
                <img v-if="avatarUrl" :src="avatarUrl" alt="Фото профиля" />
                <span v-else>{{ (profile.firstName || profile.email).slice(0, 1).toUpperCase() }}</span>
                <Camera :size="14" />
              </button>
              <div><strong>{{ displayName }}</strong><span>{{ profile.email }}</span><small>{{ profile.role === 'CUSTOMER_B2B' ? 'Партнёр B2B' : 'Сотрудник SARKISIAN' }}</small></div>
              <button v-if="avatarUrl" class="remove-photo" title="Удалить фотографию" @click="removeAvatar"><Trash2 :size="15" /></button>
              <input ref="fileInput" type="file" accept="image/jpeg,image/png,image/webp" hidden @change="uploadAvatar" />
            </section>
            <div v-if="profile.forcePasswordChange" class="profile-alert"><LockKeyhole :size="17" /><span><strong>Требуется сменить пароль</strong><small>Администратор выдал временный пароль. Задайте постоянный во вкладке «Безопасность».</small></span></div>
            <nav class="profile-tabs">
              <button :class="{ active: tab === 'profile' }" @click="tab='profile'"><UserRound :size="16" />Профиль</button>
              <button :class="{ active: tab === 'security' }" @click="tab='security'"><ShieldCheck :size="16" />Безопасность</button>
              <button :class="{ active: tab === 'notifications' }" @click="tab='notifications'"><Bell :size="16" />Уведомления</button>
            </nav>
            <div class="profile-content">
              <template v-if="tab === 'profile'">
                <section class="profile-section">
                  <div class="section-title"><div><h3>Основные данные</h3><p>Имя и телефон изменяются после подтверждения администратором.</p></div></div>
                  <div v-if="profile.pendingChangeRequest" class="pending"><Check :size="16" /><span>Запрос от {{ new Date(profile.pendingChangeRequest.createdAt).toLocaleDateString('ru-RU') }} ожидает рассмотрения</span></div>
                  <div class="field-grid"><label><span>Имя</span><input v-model.trim="requested.firstName" /></label><label><span>Фамилия</span><input v-model.trim="requested.lastName" /></label><label class="wide"><span>Телефон</span><input v-model.trim="requested.phone" placeholder="+7 999 000-00-00" /></label></div>
                  <button class="secondary" :disabled="saving || profile.pendingChangeRequest" @click="submitChangeRequest">Отправить запрос на изменение</button>
                </section>
                <section class="profile-section">
                  <div class="section-title"><div><h3>Регион и время</h3><p>Используется в календарях, задачах и отчётах.</p></div><MapPin :size="18" /></div>
                  <div class="field-grid"><label><span>Город</span><input v-model.trim="basic.city" /></label><label><span>Страна</span><input v-model.trim="basic.country" maxlength="2" /></label><label class="wide"><span>Часовой пояс</span><select v-model="basic.timezone"><option value="Europe/Moscow">Москва (UTC+3)</option><option value="Europe/Kaliningrad">Калининград (UTC+2)</option><option value="Asia/Yekaterinburg">Екатеринбург (UTC+5)</option><option value="Asia/Novosibirsk">Новосибирск (UTC+7)</option><option value="Asia/Vladivostok">Владивосток (UTC+10)</option></select></label></div>
                  <button class="primary" :disabled="saving" @click="saveBasic">Сохранить настройки</button>
                </section>
              </template>
              <template v-else-if="tab === 'security'">
                <section class="profile-section">
                  <div class="section-title"><div><h3>Смена пароля</h3><p>После смены пароля вход будет завершён на всех устройствах.</p></div><KeyRound :size="18" /></div>
                  <div class="field-grid single"><label><span>Текущий пароль</span><input v-model="passwords.currentPassword" type="password" autocomplete="current-password" /></label><label><span>Новый пароль</span><input v-model="passwords.newPassword" type="password" autocomplete="new-password" placeholder="Не менее 10 символов, буквы и цифры" /></label><label><span>Повторите новый пароль</span><input v-model="passwords.repeatPassword" type="password" autocomplete="new-password" /></label></div>
                  <button class="primary" :disabled="saving || !passwords.currentPassword || !passwords.newPassword" @click="changePassword">Сменить пароль</button>
                </section>
                <section class="profile-section">
                  <div class="section-title"><div><h3>Активные сессии</h3><p>Завершите доступ на незнакомом или потерянном устройстве.</p></div><Laptop :size="18" /></div>
                  <div class="sessions"><article v-for="session in profile.sessions" :key="session.id"><Laptop :size="17" /><span><strong>{{ deviceName(session.userAgent) }} <em v-if="session.id === currentSessionId">текущая</em></strong><small>{{ session.ipAddress || 'IP не определён' }} · вход {{ new Date(session.createdAt).toLocaleString('ru-RU') }}</small></span><button title="Завершить сессию" @click="revokeSession(session)"><X :size="16" /></button></article></div>
                </section>
              </template>
              <section v-else class="profile-section">
                <div class="section-title"><div><h3>Каналы уведомлений</h3><p>Обязательные сообщения безопасности отключить нельзя.</p></div><Bell :size="18" /></div>
                <div class="notification-list"><label><span><strong>Email</strong><small>Заказы, задачи, обращения и системные события</small></span><input v-model="notifications.email" type="checkbox" /></label><label><span><strong>Внутри платформы</strong><small>Уведомления в рабочих кабинетах</small></span><input v-model="notifications.push" type="checkbox" /></label><label><span><strong>Чат платформы</strong><small>Новые сообщения и упоминания</small></span><input v-model="notifications.chat" type="checkbox" /></label></div>
                <button class="primary" :disabled="saving" @click="saveNotifications">Сохранить уведомления</button>
              </section>
            </div>
          </template>
          <p v-if="error" class="profile-error">{{ error }}</p><p v-if="notice" class="profile-notice"><Check :size="15" />{{ notice }}</p>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.profile-backdrop{position:fixed;z-index:1200;inset:0;background:rgba(16,17,19,.48);display:flex;justify-content:flex-end;font-family:var(--sb-font);color:var(--sb-text)}.profile-drawer{width:min(560px,100vw);height:100%;background:var(--sb-panel);box-shadow:-18px 0 55px rgba(0,0,0,.16);display:flex;flex-direction:column;overflow:hidden}.profile-head{height:88px;padding:0 28px;border-bottom:1px solid var(--sb-line);display:flex;align-items:center;justify-content:space-between;box-sizing:border-box}.profile-head p{margin:0 0 6px;color:var(--sb-coral);font-size:9px;font-weight:700;letter-spacing:.16em}.profile-head h2{margin:0;font-size:25px;letter-spacing:-.03em}.icon-button{width:38px;height:38px;border:1px solid var(--sb-line);background:#fff;display:grid;place-items:center;cursor:pointer}.identity{padding:22px 28px;display:flex;align-items:center;gap:14px;border-bottom:1px solid var(--sb-line)}.avatar{position:relative;width:58px;height:58px;border:0;border-radius:50%;padding:0;background:var(--sb-coral);color:#fff;display:grid;place-items:center;font-size:20px;overflow:visible;cursor:pointer}.avatar img{width:100%;height:100%;border-radius:50%;object-fit:cover}.avatar>svg{position:absolute;right:-3px;bottom:-1px;width:23px;height:23px;padding:5px;box-sizing:border-box;border-radius:50%;background:var(--sb-ink);color:#fff}.identity>div{display:grid;gap:4px;min-width:0}.identity strong{font-size:14px}.identity span{font-size:11px;color:var(--sb-muted)}.identity small{font-size:8px;color:var(--sb-coral);letter-spacing:.11em}.remove-photo{margin-left:auto;width:34px;height:34px;border:1px solid var(--sb-line);background:#fff;color:var(--sb-muted);display:grid;place-items:center}.profile-alert{margin:18px 28px 0;padding:13px;background:var(--sb-coral-soft);color:#8f3e32;display:flex;gap:10px}.profile-alert span{display:grid;gap:3px}.profile-alert strong{font-size:11px}.profile-alert small{font-size:9px;line-height:1.5}.profile-tabs{padding:18px 28px 0;display:grid;grid-template-columns:repeat(3,1fr);border-bottom:1px solid var(--sb-line)}.profile-tabs button{height:42px;border:0;border-bottom:2px solid transparent;background:transparent;color:var(--sb-muted);display:flex;align-items:center;justify-content:center;gap:7px;font-size:10px;cursor:pointer}.profile-tabs button.active{color:var(--sb-ink);border-color:var(--sb-coral)}.profile-content{padding:24px 28px 50px;overflow:auto;display:grid;gap:18px}.profile-section{border:1px solid var(--sb-line);padding:20px;display:grid;gap:18px}.section-title{display:flex;justify-content:space-between;gap:16px}.section-title h3{margin:0 0 5px;font-size:15px}.section-title p{margin:0;color:var(--sb-muted);font-size:9px;line-height:1.5}.section-title>svg{color:var(--sb-coral)}.field-grid{display:grid;grid-template-columns:1fr 1fr;gap:13px}.field-grid.single{grid-template-columns:1fr}.field-grid .wide{grid-column:1/-1}.field-grid label{display:grid;gap:6px}.field-grid label span{font-size:9px;color:var(--sb-muted)}.field-grid input,.field-grid select{height:42px;border:1px solid var(--sb-line);background:#fff;padding:0 11px;box-sizing:border-box;font-size:11px;outline:0}.field-grid input:focus,.field-grid select:focus{border-color:var(--sb-ink)}.primary,.secondary{height:42px;border:1px solid var(--sb-ink);padding:0 16px;font-size:10px;cursor:pointer;justify-self:start}.primary{background:var(--sb-ink);color:#fff}.secondary{background:#fff;color:var(--sb-ink)}button:disabled{opacity:.48;cursor:not-allowed}.pending{padding:11px;background:#fff7e6;color:#8b6418;display:flex;gap:8px;align-items:center;font-size:9px}.sessions{display:grid}.sessions article{min-height:55px;border-top:1px solid var(--sb-line);display:flex;align-items:center;gap:10px}.sessions article:first-child{border-top:0}.sessions article>svg{color:var(--sb-muted)}.sessions article span{display:grid;gap:4px;min-width:0}.sessions strong{font-size:10px}.sessions small{font-size:8px;color:var(--sb-muted)}.sessions em{font-style:normal;color:#2d9a66;font-size:8px}.sessions button{margin-left:auto;width:30px;height:30px;border:0;background:transparent;color:var(--sb-muted)}.notification-list{display:grid}.notification-list label{min-height:63px;border-top:1px solid var(--sb-line);display:flex;align-items:center;justify-content:space-between;gap:16px}.notification-list label:first-child{border-top:0}.notification-list span{display:grid;gap:4px}.notification-list strong{font-size:11px}.notification-list small{color:var(--sb-muted);font-size:8px}.notification-list input{accent-color:var(--sb-coral);width:17px;height:17px}.profile-loading{margin:auto;display:grid;place-items:center;gap:10px;color:var(--sb-muted);font-size:10px}.profile-error,.profile-notice{position:absolute;right:25px;bottom:22px;margin:0;padding:12px 14px;box-shadow:var(--sb-shadow);font-size:10px}.profile-error{background:#fff0ed;color:#a83e31}.profile-notice{background:#1e8e61;color:#fff;display:flex;align-items:center;gap:7px}.spin{animation:spin 1s linear infinite}.profile-fade-enter-active,.profile-fade-leave-active{transition:opacity .2s}.profile-fade-enter-from,.profile-fade-leave-to{opacity:0}@keyframes spin{to{transform:rotate(360deg)}}@media(max-width:620px){.profile-head,.identity{padding-left:20px;padding-right:20px}.profile-tabs{padding-left:14px;padding-right:14px}.profile-tabs button{font-size:0}.profile-content{padding:18px 14px 42px}.field-grid{grid-template-columns:1fr}.field-grid .wide{grid-column:auto}}
.primary,.secondary{min-height:42px;height:auto;white-space:nowrap}
</style>
