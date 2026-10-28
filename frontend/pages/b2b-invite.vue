<script setup lang="ts">
import { ArrowRight, Building2 } from '@lucide/vue';
const config = useRuntimeConfig(), session = useB2BSession();
const token = ref(''), preview = ref<any>(null), terms = ref<any>(null), termsError = ref(''), loading = ref(true), busy = ref(false), error = ref(''), mode = ref<'login'|'register'>('login');
const form = reactive({ email: '', password: '', firstName: '', lastName: '' }), consent = ref(false);
let active = true;
onBeforeUnmount(() => { active = false; });
const roles: Record<string, string> = { EMPLOYEE: 'Сотрудник салона', BUYER: 'Закупщик', ACCOUNTANT: 'Бухгалтер' };
watch(mode, () => { error.value = ''; });
useHead({ title: 'Приглашение в команду — SARKISIAN', meta: [{ name: 'robots', content: 'noindex, nofollow' }, { name: 'referrer', content: 'no-referrer' }] });
function message(e: any) { return Array.isArray(e?.data?.message) ? e.data.message.join('. ') : e?.data?.message || e?.message || 'Не удалось принять приглашение. Повторите попытку.'; }
async function accept() {
  if (busy.value || !preview.value) return;
  session.hydrate(); session.syncStoredSession(); let actor = session.generation.value;
  const assertActor = () => { session.syncStoredSession(); if (!active || session.generation.value !== actor) throw new Error('Сессия изменилась. Повторите действие в текущем бизнес-аккаунте.'); };
  busy.value = true; error.value = '';
  try {
    let organizationId = '';
    if (mode.value === 'register' && !session.token.value) {
      if (!consent.value) throw new Error('Примите условия регистрации');
      if (!terms.value?.version) throw new Error('Условия регистрации временно недоступны. Обновите страницу или обратитесь в поддержку.');
      const result = await $fetch<any>('/business-team-invitations/register', { baseURL: config.public.apiBase, method: 'POST', retry: 0, timeout: 20000, body: { ...form, token: token.value, acceptedTerms: consent.value, termsVersion: terms.value.version } });
      assertActor(); session.adoptSession(result, actor); actor = session.generation.value; organizationId = result.organizationId;
    } else {
      if (!session.token.value) { await session.login(form.email, form.password); actor = session.generation.value; }
      const result = await session.request<any>('/business-team-invitations/accept', { method: 'POST', body: { token: token.value } }); organizationId = result.organizationId;
    }
    assertActor(); await session.loadOrganizations(true); assertActor(); session.selectOrganization(organizationId);
    await navigateTo({ path: '/b2b', query: { section: 'team', organization: organizationId } });
    token.value = '';
  } catch (e: any) {
    error.value = message(e);
    if (e?.data?.code === 'BUSINESS_TERMS_CHANGED') {
      consent.value = false;
      try { terms.value = await $fetch('/business-registration/terms', { baseURL: config.public.apiBase, retry: 0 }); }
      catch { terms.value = null; termsError.value = 'Не удалось обновить условия. Попробуйте позже.'; }
    }
  } finally { busy.value = false; }
}
async function anotherAccount() { await session.endSession(); }
onMounted(async () => {
  const params = new URLSearchParams(location.hash.slice(1)); token.value = params.get('token') || '';
  history.replaceState(null, '', location.pathname + location.search); // Never keep the capability in browser history, logs or referrers.
  session.hydrate();
  try {
    if (!/^[A-Za-z0-9_-]{43}$/.test(token.value)) throw new Error('Откройте полную ссылку из приглашения. После обновления страницы откройте её повторно.');
    const [invitation, conditions] = await Promise.allSettled([
      $fetch('/business-team-invitations/preview', { baseURL: config.public.apiBase, method: 'POST', retry: 0, body: { token: token.value } }),
      $fetch('/business-registration/terms', { baseURL: config.public.apiBase, retry: 0 }),
    ]);
    if (invitation.status === 'rejected') throw invitation.reason;
    preview.value = invitation.value;
    if (conditions.status === 'fulfilled') terms.value = conditions.value;
    else termsError.value = 'Условия регистрации временно недоступны. Попробуйте позже или войдите в существующий бизнес-аккаунт.';
    if (session.token.value) await session.restore();
  } catch (e: any) { error.value = message(e); } finally { loading.value = false; }
});
</script>
<template>
  <main class="login-page b2b-login business-invite">
    <section class="login-brand"><NuxtLink to="/" class="login-logo"><img src="/sarkisian-logo.png" alt="SARKISIAN" width="200" height="40"/></NuxtLink><div class="login-brand-copy"><Building2 :size="28"/><h2>Ваша команда.<br>В одном кабинете.</h2><p class="login-brand-description">Записи клиентов и закупки для бизнеса — с доступами, которые назначил владелец компании.</p></div></section>
    <section class="login-area"><form class="login-card" :aria-busy="busy" @submit.prevent="accept">
      <h1>Приглашение в команду</h1><p v-if="loading" role="status">Проверяем приглашение…</p>
      <template v-if="preview"><p class="hint">{{preview.organizationName}} · {{roles[preview.role]}}</p><p>Приглашение для {{preview.emailHint}}. {{preview.canOrder?'Разрешены закупки.':''}} {{preview.canSeeFinance?'Разрешён просмотр финансов.':''}}</p>
        <template v-if="!session.token.value"><div class="business-invite-tabs" role="tablist" aria-label="Бизнес-аккаунт"><button type="button" :aria-selected="mode==='login'" role="tab" :disabled="busy" @click="mode='login'">Войти</button><button type="button" :aria-selected="mode==='register'" role="tab" :disabled="busy" @click="mode='register'">Создать бизнес-аккаунт</button></div>
          <p class="hint">Используйте отдельный бизнес-аккаунт. Обычный аккаунт покупателя не изменяется.</p>
          <template v-if="mode==='register'"><label>Имя<input v-model.trim="form.firstName" autocomplete="given-name" maxlength="80" required :disabled="busy"/></label><label>Фамилия<input v-model.trim="form.lastName" autocomplete="family-name" maxlength="80" :disabled="busy"/></label></template>
          <label>Email из приглашения<input v-model.trim="form.email" type="email" autocomplete="username" maxlength="254" required :disabled="busy"/></label><label>Пароль<input v-model="form.password" type="password" :autocomplete="mode==='login'?'current-password':'new-password'" :minlength="mode==='register'?10:undefined" maxlength="72" required :disabled="busy"/></label>
          <label v-if="mode==='register'" class="business-invite-consent"><input v-model="consent" type="checkbox" required :disabled="busy||!terms"/>Принимаю <NuxtLink to="/privacy" target="_blank">политику конфиденциальности</NuxtLink> и <NuxtLink to="/oferta" target="_blank">условия использования</NuxtLink>.</label><p v-if="mode==='register'&&termsError" class="login-error" role="alert">{{termsError}}</p>
        </template><template v-else><p>Вы вошли как {{session.user.value?.email}}.</p><button type="button" :disabled="busy" @click="anotherAccount">Войти в другой бизнес-аккаунт</button></template>
      </template>
      <p v-if="error" class="login-error" role="alert">{{error}}</p><button v-if="preview" class="submit" type="submit" :disabled="busy||loading"><span>{{busy?'Подключаем…':'Принять приглашение'}}</span><ArrowRight :size="20"/></button><NuxtLink to="/b2b-login" class="login-site-link">Открыть вход для бизнеса</NuxtLink>
    </form></section>
  </main>
</template>
