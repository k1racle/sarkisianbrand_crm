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
      <div data-v-ui-6d8134092fd8 v-if="isOpen" class="profile-backdrop admin-dialog-backdrop" @mousedown.self="tryClose">
        <aside data-v-ui-6d8134092fd8 class="profile-drawer admin-dialog admin-dialog--drawer" role="dialog" aria-modal="true" aria-label="Профиль пользователя">
          <header data-v-ui-6d8134092fd8 class="profile-head admin-dialog-head">
            <div data-v-ui-6d8134092fd8><p data-v-ui-6d8134092fd8>УЧЁТНАЯ ЗАПИСЬ</p><h2 data-v-ui-6d8134092fd8>Мой профиль</h2></div>
            <button data-v-ui-6d8134092fd8 class="icon-button" aria-label="Закрыть" :disabled="profile?.forcePasswordChange" @click="tryClose"><X data-v-ui-6d8134092fd8 :size="19" /></button>
          </header>
          <div data-v-ui-6d8134092fd8 v-if="loading && !profile" class="profile-loading"><LoaderCircle data-v-ui-6d8134092fd8 :size="24" class="spin" /><span data-v-ui-6d8134092fd8>Загружаем профиль</span></div>
          <template v-else-if="profile">
            <section data-v-ui-6d8134092fd8 class="identity">
              <button data-v-ui-6d8134092fd8 class="avatar" title="Загрузить фотографию" @click="fileInput?.click()">
                <img data-v-ui-6d8134092fd8 v-if="avatarUrl" :src="avatarUrl" alt="Фото профиля" />
                <span data-v-ui-6d8134092fd8 v-else>{{ (profile.firstName || profile.email).slice(0, 1).toUpperCase() }}</span>
                <Camera data-v-ui-6d8134092fd8 :size="14" />
              </button>
              <div data-v-ui-6d8134092fd8><strong data-v-ui-6d8134092fd8>{{ displayName }}</strong><span data-v-ui-6d8134092fd8>{{ profile.email }}</span><small data-v-ui-6d8134092fd8>{{ profile.role === 'CUSTOMER_B2B' ? 'Партнёр B2B' : 'Сотрудник SARKISIAN' }}</small></div>
              <button data-v-ui-6d8134092fd8 v-if="avatarUrl" class="remove-photo" title="Удалить фотографию" @click="removeAvatar"><Trash2 data-v-ui-6d8134092fd8 :size="15" /></button>
              <input data-v-ui-6d8134092fd8 ref="fileInput" type="file" accept="image/jpeg,image/png,image/webp" hidden @change="uploadAvatar" />
            </section>
            <div data-v-ui-6d8134092fd8 v-if="profile.forcePasswordChange" class="profile-alert"><LockKeyhole data-v-ui-6d8134092fd8 :size="17" /><span data-v-ui-6d8134092fd8><strong data-v-ui-6d8134092fd8>Требуется сменить пароль</strong><small data-v-ui-6d8134092fd8>Администратор выдал временный пароль. Задайте постоянный во вкладке «Безопасность».</small></span></div>
            <nav data-v-ui-6d8134092fd8 class="profile-tabs admin-dialog-tabs">
              <button data-v-ui-6d8134092fd8 :class="{ active: tab === 'profile' }" @click="tab='profile'"><UserRound data-v-ui-6d8134092fd8 :size="16" />Профиль</button>
              <button data-v-ui-6d8134092fd8 :class="{ active: tab === 'security' }" @click="tab='security'"><ShieldCheck data-v-ui-6d8134092fd8 :size="16" />Безопасность</button>
              <button data-v-ui-6d8134092fd8 :class="{ active: tab === 'notifications' }" @click="tab='notifications'"><Bell data-v-ui-6d8134092fd8 :size="16" />Уведомления</button>
            </nav>
            <div data-v-ui-6d8134092fd8 class="profile-content admin-dialog-body">
              <template v-if="tab === 'profile'">
                <section data-v-ui-6d8134092fd8 class="profile-section">
                  <div data-v-ui-6d8134092fd8 class="section-title"><div data-v-ui-6d8134092fd8><h3 data-v-ui-6d8134092fd8>Основные данные</h3><p data-v-ui-6d8134092fd8>Имя и телефон изменяются после подтверждения администратором.</p></div></div>
                  <div data-v-ui-6d8134092fd8 v-if="profile.pendingChangeRequest" class="pending"><Check data-v-ui-6d8134092fd8 :size="16" /><span data-v-ui-6d8134092fd8>Запрос от {{ new Date(profile.pendingChangeRequest.createdAt).toLocaleDateString('ru-RU') }} ожидает рассмотрения</span></div>
                  <div data-v-ui-6d8134092fd8 class="field-grid"><label data-v-ui-6d8134092fd8><span data-v-ui-6d8134092fd8>Имя</span><input data-v-ui-6d8134092fd8 v-model.trim="requested.firstName" /></label><label data-v-ui-6d8134092fd8><span data-v-ui-6d8134092fd8>Фамилия</span><input data-v-ui-6d8134092fd8 v-model.trim="requested.lastName" /></label><label data-v-ui-6d8134092fd8 class="wide"><span data-v-ui-6d8134092fd8>Телефон</span><input data-v-ui-6d8134092fd8 v-model.trim="requested.phone" placeholder="+7 999 000-00-00" /></label></div>
                  <button data-v-ui-6d8134092fd8 class="secondary" :disabled="saving || profile.pendingChangeRequest" @click="submitChangeRequest">Отправить запрос на изменение</button>
                </section>
                <section data-v-ui-6d8134092fd8 class="profile-section">
                  <div data-v-ui-6d8134092fd8 class="section-title"><div data-v-ui-6d8134092fd8><h3 data-v-ui-6d8134092fd8>Регион и время</h3><p data-v-ui-6d8134092fd8>Используется в календарях, задачах и отчётах.</p></div><MapPin data-v-ui-6d8134092fd8 :size="18" /></div>
                  <div data-v-ui-6d8134092fd8 class="field-grid"><label data-v-ui-6d8134092fd8><span data-v-ui-6d8134092fd8>Город</span><input data-v-ui-6d8134092fd8 v-model.trim="basic.city" /></label><label data-v-ui-6d8134092fd8><span data-v-ui-6d8134092fd8>Страна</span><input data-v-ui-6d8134092fd8 v-model.trim="basic.country" maxlength="2" /></label><label data-v-ui-6d8134092fd8 class="wide"><span data-v-ui-6d8134092fd8>Часовой пояс</span><select data-v-ui-6d8134092fd8 v-model="basic.timezone"><option data-v-ui-6d8134092fd8 value="Europe/Moscow">Москва (UTC+3)</option><option data-v-ui-6d8134092fd8 value="Europe/Kaliningrad">Калининград (UTC+2)</option><option data-v-ui-6d8134092fd8 value="Asia/Yekaterinburg">Екатеринбург (UTC+5)</option><option data-v-ui-6d8134092fd8 value="Asia/Novosibirsk">Новосибирск (UTC+7)</option><option data-v-ui-6d8134092fd8 value="Asia/Vladivostok">Владивосток (UTC+10)</option></select></label></div>
                  <button data-v-ui-6d8134092fd8 class="primary" :disabled="saving" @click="saveBasic">Сохранить настройки</button>
                </section>
              </template>
              <template v-else-if="tab === 'security'">
                <section data-v-ui-6d8134092fd8 class="profile-section">
                  <div data-v-ui-6d8134092fd8 class="section-title"><div data-v-ui-6d8134092fd8><h3 data-v-ui-6d8134092fd8>Смена пароля</h3><p data-v-ui-6d8134092fd8>После смены пароля вход будет завершён на всех устройствах.</p></div><KeyRound data-v-ui-6d8134092fd8 :size="18" /></div>
                  <div data-v-ui-6d8134092fd8 class="field-grid single"><label data-v-ui-6d8134092fd8><span data-v-ui-6d8134092fd8>Текущий пароль</span><input data-v-ui-6d8134092fd8 v-model="passwords.currentPassword" type="password" autocomplete="current-password" /></label><label data-v-ui-6d8134092fd8><span data-v-ui-6d8134092fd8>Новый пароль</span><input data-v-ui-6d8134092fd8 v-model="passwords.newPassword" type="password" autocomplete="new-password" placeholder="Не менее 10 символов, буквы и цифры" /></label><label data-v-ui-6d8134092fd8><span data-v-ui-6d8134092fd8>Повторите новый пароль</span><input data-v-ui-6d8134092fd8 v-model="passwords.repeatPassword" type="password" autocomplete="new-password" /></label></div>
                  <button data-v-ui-6d8134092fd8 class="primary" :disabled="saving || !passwords.currentPassword || !passwords.newPassword" @click="changePassword">Сменить пароль</button>
                </section>
                <section data-v-ui-6d8134092fd8 class="profile-section">
                  <div data-v-ui-6d8134092fd8 class="section-title"><div data-v-ui-6d8134092fd8><h3 data-v-ui-6d8134092fd8>Активные сессии</h3><p data-v-ui-6d8134092fd8>Завершите доступ на незнакомом или потерянном устройстве.</p></div><Laptop data-v-ui-6d8134092fd8 :size="18" /></div>
                  <div data-v-ui-6d8134092fd8 class="sessions"><article data-v-ui-6d8134092fd8 v-for="session in profile.sessions" :key="session.id"><Laptop data-v-ui-6d8134092fd8 :size="17" /><span data-v-ui-6d8134092fd8><strong data-v-ui-6d8134092fd8>{{ deviceName(session.userAgent) }} <em data-v-ui-6d8134092fd8 v-if="session.id === currentSessionId">текущая</em></strong><small data-v-ui-6d8134092fd8>{{ session.ipAddress || 'IP не определён' }} · вход {{ new Date(session.createdAt).toLocaleString('ru-RU') }}</small></span><button data-v-ui-6d8134092fd8 title="Завершить сессию" @click="revokeSession(session)"><X data-v-ui-6d8134092fd8 :size="16" /></button></article></div>
                </section>
              </template>
              <section data-v-ui-6d8134092fd8 v-else class="profile-section">
                <div data-v-ui-6d8134092fd8 class="section-title"><div data-v-ui-6d8134092fd8><h3 data-v-ui-6d8134092fd8>Каналы уведомлений</h3><p data-v-ui-6d8134092fd8>Обязательные сообщения безопасности отключить нельзя.</p></div><Bell data-v-ui-6d8134092fd8 :size="18" /></div>
                <div data-v-ui-6d8134092fd8 class="notification-list"><label data-v-ui-6d8134092fd8><span data-v-ui-6d8134092fd8><strong data-v-ui-6d8134092fd8>Email</strong><small data-v-ui-6d8134092fd8>Заказы, задачи, обращения и системные события</small></span><input data-v-ui-6d8134092fd8 v-model="notifications.email" type="checkbox" /></label><label data-v-ui-6d8134092fd8><span data-v-ui-6d8134092fd8><strong data-v-ui-6d8134092fd8>Внутри платформы</strong><small data-v-ui-6d8134092fd8>Уведомления в рабочих кабинетах</small></span><input data-v-ui-6d8134092fd8 v-model="notifications.push" type="checkbox" /></label><label data-v-ui-6d8134092fd8><span data-v-ui-6d8134092fd8><strong data-v-ui-6d8134092fd8>Чат платформы</strong><small data-v-ui-6d8134092fd8>Новые сообщения и упоминания</small></span><input data-v-ui-6d8134092fd8 v-model="notifications.chat" type="checkbox" /></label></div>
                <button data-v-ui-6d8134092fd8 class="primary" :disabled="saving" @click="saveNotifications">Сохранить уведомления</button>
              </section>
            </div>
          </template>
          <p data-v-ui-6d8134092fd8 v-if="error" class="profile-error">{{ error }}</p><p data-v-ui-6d8134092fd8 v-if="notice" class="profile-notice"><Check data-v-ui-6d8134092fd8 :size="15" />{{ notice }}</p>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>


