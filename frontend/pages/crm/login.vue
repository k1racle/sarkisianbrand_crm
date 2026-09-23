<script setup lang="ts">
import { ArrowRight, Eye, EyeOff, LockKeyhole } from '@lucide/vue';
import { safeInternalRedirect } from '~/shared/internal-redirect';
import { isCrmPath } from '~/shared/crm-workspace';
const route = useRoute();
const { login, logoutWarning } = useWorkspaceSession();
const { online } = useCrmPwa();
const email = ref(''), password = ref(''), error = ref('');
const loading = ref(false), showPassword = ref(false);
useHead({ title: 'Вход — SARKISIAN CRM' });
async function submit() {
  if (loading.value || !online.value) return;
  error.value = ''; loading.value = true;
  try {
    await login(email.value, password.value);
    const redirect = safeInternalRedirect(route.query.redirect, '/crm/');
    await navigateTo(isCrmPath(redirect.split('?')[0].split('#')[0]) && !redirect.startsWith('/crm/login') ? redirect : '/crm/');
  } catch (exception: any) { error.value = exception?.data?.message || exception?.message || 'Не удалось войти. Попробуйте ещё раз.'; }
  finally { loading.value = false; }
}
</script>
<template>
  <main class="crm-app-login">
    <header class="crm-login-brand"><img class="crm-brand-mark" src="/crm/pwa/icon.svg" width="42" height="42" alt="" /><strong>SARKISIAN CRM</strong></header>
    <form class="crm-login-card" :aria-busy="loading" @submit.prevent="submit">
      <LockKeyhole :size="28" aria-hidden="true" /><h1>Ваша команда.<br>Всё под рукой.</h1><p>Клиенты, сделки и задачи — в одном рабочем пространстве.</p>
      <p v-if="logoutWarning" class="crm-login-error" role="alert">{{ logoutWarning }}</p>
      <label for="crm-email">Рабочая почта</label><input id="crm-email" v-model.trim="email" type="email" autocomplete="username" inputmode="email" autocapitalize="none" :spellcheck="false" placeholder="name@company.ru" required :disabled="loading" />
      <label for="crm-password">Пароль</label><div class="crm-password"><input id="crm-password" v-model="password" :type="showPassword ? 'text' : 'password'" autocomplete="current-password" required :disabled="loading" /><button type="button" class="crm-icon-button" :aria-label="showPassword ? 'Скрыть пароль' : 'Показать пароль'" :aria-pressed="showPassword" @click="showPassword = !showPassword"><component :is="showPassword ? EyeOff : Eye" :size="20" /></button></div>
      <p v-if="error" class="crm-login-error" role="alert">{{ error }}</p><p v-if="!online" class="crm-login-error" role="status">Для входа подключитесь к интернету.</p>
      <button type="submit" class="crm-primary-button" :disabled="loading || !online">{{ loading ? 'Входим…' : 'Войти в CRM' }}<ArrowRight :size="18" /></button>
      <small>Используйте учётную запись сотрудника SARKISIAN.</small>
    </form>
    <div class="crm-login-install"><CrmInstallButton /><NuxtLink to="/">На сайт SARKISIAN <ArrowRight :size="16" /></NuxtLink></div>
  </main>
</template>
