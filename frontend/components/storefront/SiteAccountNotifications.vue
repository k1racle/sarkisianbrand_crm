<script setup lang="ts">
import { ArrowRight, Mail, MessageCircle, Smartphone } from '@lucide/vue';
const emit = defineEmits<{ updated: [value: any] }>();
const config = useRuntimeConfig();
const { authHeaders } = useStorefront();
const email = ref(true), loading = ref(true), loaded = ref(false), saving = ref(false);
const error = ref(''), notice = ref('');
let requestId = 0;
function message(exception: any) {
  return [401, 403].includes(Number(exception?.statusCode || exception?.status))
    ? 'Сеанс завершён или нет доступа к профилю. Войдите снова, чтобы изменить уведомления.'
    : 'Не удалось сохранить или загрузить настройки уведомлений. Попробуйте ещё раз.';
}
async function load() {
  const current = ++requestId;
  loading.value = true; error.value = ''; notice.value = '';
  try {
    const profile = await $fetch<any>('/auth/profile', { baseURL: config.public.apiBase, headers: authHeaders.value, cache: 'no-store' });
    if (current !== requestId) return;
    email.value = profile.notificationPreferences?.email !== false; loaded.value = true;
    emit('updated', profile);
  } catch (exception) { if (current === requestId) error.value = message(exception); }
  finally { if (current === requestId) loading.value = false; }
}
async function save() {
  if (loading.value || saving.value || !loaded.value) return;
  const current = ++requestId;
  saving.value = true; error.value = ''; notice.value = '';
  try {
    // Backend merges this boolean patch under its user row lock. Do not send stale channels or city.
    const profile = await $fetch<any>('/auth/profile', { baseURL: config.public.apiBase, method: 'PATCH', headers: authHeaders.value, body: { notificationPreferences: { email: email.value } } });
    if (current !== requestId) return;
    email.value = profile.notificationPreferences?.email !== false;
    emit('updated', profile); notice.value = 'Настройки уведомлений сохранены.';
  } catch (exception) { if (current === requestId) error.value = message(exception); }
  finally { if (current === requestId) saving.value = false; }
}
onMounted(load);
onBeforeUnmount(() => { requestId++; });
</script>

<template>
  <section class="sa-panel sa-notifications">
    <h2>Уведомления</h2>
    <p class="sa-muted">Выберите, как получать сообщения. Новые каналы появятся здесь после подключения.</p>
    <p v-if="loading" role="status">Загружаем настройки уведомлений…</p>
    <p v-if="error" class="sa-feedback" role="alert">{{ error }}</p>
    <p v-if="notice" class="sa-feedback" role="status">{{ notice }}</p>
    <button v-if="!loaded && !loading" class="sa-button" @click="load">Повторить загрузку <ArrowRight :size="20" /></button>
    <form v-if="loaded" class="sa-form" @submit.prevent="save">
      <div class="sa-notification-channel"><Mail :size="24" aria-hidden="true" /><div><h3>Электронная почта</h3><label class="sa-checkbox"><input v-model="email" type="checkbox" aria-label="Получать уведомления по электронной почте" :disabled="saving || loading" />Получать уведомления по электронной почте</label></div></div>
      <small class="sa-muted">Эта настройка не отключает обязательные письма о безопасности аккаунта и получении купленных подарочных карт.</small>
      <div class="sa-notification-channel"><Smartphone :size="24" aria-hidden="true" /><div><div class="sa-notification-heading"><h3>SMS</h3><span class="sa-badge">Скоро</span></div><label class="sa-checkbox"><input type="checkbox" disabled aria-label="SMS-уведомления — не подключено" />SMS-уведомления</label><small>Не подключено. Сообщения не отправляются.</small></div></div>
      <div class="sa-notification-channel"><MessageCircle :size="24" aria-hidden="true" /><div><div class="sa-notification-heading"><h3>Боты в мессенджерах</h3><span class="sa-badge">Скоро</span></div><label class="sa-checkbox"><input type="checkbox" disabled aria-label="Уведомления через ботов — не подключено" />Уведомления через ботов</label><small>Не подключено. Сообщения не отправляются.</small></div></div>
      <button class="sa-button" :disabled="saving || loading">{{ saving ? 'Сохраняем…' : 'Сохранить настройки' }}<ArrowRight :size="20" /></button>
    </form>
  </section>
</template>
