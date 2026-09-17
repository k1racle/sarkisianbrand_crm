<script setup lang="ts">
import { ArrowRight, Eye, EyeOff, LockKeyhole } from '@lucide/vue';
import { safeInternalRedirect } from '~/shared/internal-redirect';
const route = useRoute();
const { login } = useWorkspaceSession();
const email = ref('admin@sarkisianbrand.ru');
const password = ref('');
const showPassword = ref(false);
const loading = ref(false);
const error = ref('');

async function submit() {
  if(loading.value)return;
  loading.value = true;
  error.value = '';
  try {
    await login(email.value, password.value);
    const redirect = safeInternalRedirect(route.query.redirect,'/workspace');
    await navigateTo(redirect);
  } catch (exception: any) {
    error.value = exception?.data?.message || exception?.message || 'Не удалось войти';
  } finally { loading.value = false; }
}
</script>

<template>
  <main data-v-ui-cf8895abb452 class="login-page workspace-login sb-storefront">
    <section data-v-ui-cf8895abb452 class="login-brand" aria-label="SARKISIAN Workspace">
      <NuxtLink data-v-ui-cf8895abb452 to="/" class="login-logo" aria-label="SARKISIAN — на главную сайта"><img data-v-ui-cf8895abb452 src="/sarkisian-logo.png" alt="SARKISIAN" width="200" height="40" /></NuxtLink>
      <div data-v-ui-cf8895abb452 class="login-brand-copy">
        <p data-v-ui-cf8895abb452 class="login-brand-kicker">Единая бизнес-платформа</p>
        <h2 data-v-ui-cf8895abb452>Вся компания.<br data-v-ui-cf8895abb452><em data-v-ui-cf8895abb452>В одном ритме.</em></h2>
        <p data-v-ui-cf8895abb452 class="login-brand-description">Продажи, клиенты, маркетплейсы, поддержка и управленческие показатели — в одной экосистеме.</p>
        <div data-v-ui-cf8895abb452 class="login-brand-note"><LockKeyhole data-v-ui-cf8895abb452 :size="18" aria-hidden="true" /><span data-v-ui-cf8895abb452>Один кабинет. Доступ согласно вашей роли.</span></div>
      </div>
      <footer data-v-ui-cf8895abb452>Рабочее пространство команды SARKISIAN</footer>
    </section>
    <section data-v-ui-cf8895abb452 class="login-area" aria-labelledby="workspace-login-title">
      <form data-v-ui-cf8895abb452 class="login-card" :aria-busy="loading" @submit.prevent="submit">
        <header data-v-ui-cf8895abb452 class="login-card-header"><div data-v-ui-cf8895abb452 class="login-symbol"><LockKeyhole data-v-ui-cf8895abb452 :size="22" aria-hidden="true" /></div><p data-v-ui-cf8895abb452 class="eyebrow">SARKISIAN WORKSPACE</p></header>
        <h1 data-v-ui-cf8895abb452 id="workspace-login-title">Вход в систему</h1>
        <p data-v-ui-cf8895abb452 id="workspace-login-hint" class="hint">Используйте корпоративную учётную запись. Доступные разделы появятся согласно вашей роли.</p>
        <label data-v-ui-cf8895abb452 for="workspace-email">Корпоративный email</label>
        <input data-v-ui-cf8895abb452 id="workspace-email" v-model.trim="email" type="email" name="username" autocomplete="username" autocapitalize="none" :spellcheck="false" inputmode="email" placeholder="name@sarkisianbrand.ru" :disabled="loading" aria-describedby="workspace-login-hint" :aria-invalid="Boolean(error)" required />
        <label data-v-ui-cf8895abb452 for="workspace-password">Пароль</label>
        <div data-v-ui-cf8895abb452 class="password"><input data-v-ui-cf8895abb452 id="workspace-password" v-model="password" :type="showPassword ? 'text' : 'password'" name="password" autocomplete="current-password" placeholder="Введите пароль" :disabled="loading" :aria-invalid="Boolean(error)" :aria-describedby="error ? 'workspace-login-error' : undefined" required /><button data-v-ui-cf8895abb452 type="button" :disabled="loading" :aria-label="showPassword ? 'Скрыть пароль' : 'Показать пароль'" :aria-pressed="showPassword" aria-controls="workspace-password" @click="showPassword=!showPassword"><EyeOff data-v-ui-cf8895abb452 v-if="showPassword" :size="20" aria-hidden="true" /><Eye data-v-ui-cf8895abb452 v-else :size="20" aria-hidden="true" /></button></div>
        <p data-v-ui-cf8895abb452 v-if="error" id="workspace-login-error" class="login-error" role="alert">{{ error }}</p>
        <button data-v-ui-cf8895abb452 class="submit" type="submit" :disabled="loading"><span data-v-ui-cf8895abb452>{{ loading ? 'Проверяем данные…' : 'Войти в Workspace' }}</span><ArrowRight data-v-ui-cf8895abb452 :size="20" aria-hidden="true" /></button>
        <small data-v-ui-cf8895abb452>Проблемы со входом? Создайте обращение в IT Helpdesk.</small>
        <NuxtLink data-v-ui-cf8895abb452 to="/" class="login-site-link">Вернуться на сайт <ArrowRight data-v-ui-cf8895abb452 :size="16" aria-hidden="true" /></NuxtLink>
      </form>
    </section>
  </main>
</template>

