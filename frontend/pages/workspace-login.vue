<script setup lang="ts">
import { ArrowRight, Eye, EyeOff, LockKeyhole } from '@lucide/vue';
const route = useRoute();
const { login } = useWorkspaceSession();
const email = ref('admin@sarkisianbrand.ru');
const password = ref('');
const showPassword = ref(false);
const loading = ref(false);
const error = ref('');

async function submit() {
  loading.value = true;
  error.value = '';
  try {
    await login(email.value, password.value);
    const redirect = typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/') ? route.query.redirect : '/workspace';
    await navigateTo(redirect);
  } catch (exception: any) {
    error.value = exception?.data?.message || exception?.message || 'Не удалось войти';
  } finally { loading.value = false; }
}
</script>

<template>
  <main class="login-page sb-storefront">
    <section class="login-brand" aria-label="SARKISIAN Workspace">
      <NuxtLink to="/" class="login-logo" aria-label="SARKISIAN — на главную сайта"><img src="/sarkisian-logo.png" alt="SARKISIAN" width="200" height="40" /></NuxtLink>
      <div class="login-brand-copy">
        <p class="login-brand-kicker">Единая бизнес-платформа</p>
        <h2>Вся компания.<br><em>В одном ритме.</em></h2>
        <p class="login-brand-description">Продажи, клиенты, маркетплейсы, поддержка и управленческие показатели — в одной экосистеме.</p>
        <div class="login-brand-note"><LockKeyhole :size="18" aria-hidden="true" /><span>Один кабинет. Доступ согласно вашей роли.</span></div>
      </div>
      <footer>Рабочее пространство команды SARKISIAN</footer>
    </section>
    <section class="login-area" aria-labelledby="workspace-login-title">
      <form class="login-card" :aria-busy="loading" @submit.prevent="submit">
        <header class="login-card-header"><div class="login-symbol"><LockKeyhole :size="22" aria-hidden="true" /></div><p class="eyebrow">SARKISIAN WORKSPACE</p></header>
        <h1 id="workspace-login-title">Вход в систему</h1>
        <p id="workspace-login-hint" class="hint">Используйте корпоративную учётную запись. Доступные разделы появятся согласно вашей роли.</p>
        <label for="workspace-email">Корпоративный email</label>
        <input id="workspace-email" v-model.trim="email" type="email" name="username" autocomplete="username" autocapitalize="none" :spellcheck="false" inputmode="email" placeholder="name@sarkisianbrand.ru" :disabled="loading" aria-describedby="workspace-login-hint" :aria-invalid="Boolean(error)" required />
        <label for="workspace-password">Пароль</label>
        <div class="password"><input id="workspace-password" v-model="password" :type="showPassword ? 'text' : 'password'" name="password" autocomplete="current-password" placeholder="Введите пароль" :disabled="loading" :aria-invalid="Boolean(error)" :aria-describedby="error ? 'workspace-login-error' : undefined" required /><button type="button" :disabled="loading" :aria-label="showPassword ? 'Скрыть пароль' : 'Показать пароль'" :aria-pressed="showPassword" aria-controls="workspace-password" @click="showPassword=!showPassword"><EyeOff v-if="showPassword" :size="20" aria-hidden="true" /><Eye v-else :size="20" aria-hidden="true" /></button></div>
        <p v-if="error" id="workspace-login-error" class="login-error" role="alert">{{ error }}</p>
        <button class="submit" type="submit" :disabled="loading"><span>{{ loading ? 'Проверяем данные…' : 'Войти в Workspace' }}</span><ArrowRight :size="20" aria-hidden="true" /></button>
        <small>Проблемы со входом? Создайте обращение в IT Helpdesk.</small>
        <NuxtLink to="/" class="login-site-link">Вернуться на сайт <ArrowRight :size="16" aria-hidden="true" /></NuxtLink>
      </form>
    </section>
  </main>
</template>

<style scoped>
.login-page { min-height: 100vh; min-height: 100svh; display: grid; grid-template-columns: minmax(0,44%) minmax(0,1fr); background: #f7f5f2; color: var(--sf-black); font: var(--sb-weight-regular) var(--sb-type-body)/var(--sb-leading-body) var(--sb-font); }
.login-page *, .login-page *::before, .login-page *::after { box-sizing: border-box; }
.login-brand { position: relative; display: flex; flex-direction: column; justify-content: space-between; gap: 48px; min-width: 0; padding: clamp(32px,5vw,80px); overflow: hidden; background: radial-gradient(ellipse at 0 0,rgba(157,145,132,.18),transparent 65%), linear-gradient(145deg,#252321,#151515); color: var(--sf-on-dark); }
.login-logo { display: inline-flex; align-self: flex-start; border-radius: var(--sf-radius-compact); }
.login-logo img { display: block; width: 200px; max-width: 100%; height: auto; filter: brightness(0) invert(1); opacity: .88; }
.login-brand-copy { max-width: 490px; }
.login-brand-kicker { margin: 0 0 24px; color: var(--sf-muted-on-dark); font-size: var(--sb-type-caption); font-weight: var(--sb-weight-semibold); letter-spacing: var(--sb-tracking-eyebrow); text-transform: uppercase; }
.login-brand h2 { margin: 0 0 28px; font-size: var(--sb-type-display); font-weight: var(--sb-weight-semibold); line-height: var(--sb-leading-heading); letter-spacing: var(--sb-tracking-heading); }
.login-brand h2 em { color: var(--sf-muted-on-dark); font: italic var(--sb-weight-regular) var(--sb-type-display)/var(--sb-leading-heading) var(--sb-font-editorial); }
.login-brand-description { max-width: 420px; margin: 0; color: var(--sf-muted-on-dark); font-size: var(--sb-type-body); line-height: var(--sb-leading-body); }
.login-brand-note { display: flex; align-items: flex-start; gap: 12px; max-width: 420px; margin-top: 32px; padding-top: 24px; border-top: 1px solid rgba(255,255,255,.14); color: var(--sf-muted-on-dark); font-size: var(--sb-type-small); }
.login-brand-note svg { flex: none; margin-top: 2px; }
.login-brand footer { color: var(--sf-muted-on-dark); font-size: var(--sb-type-caption); }
.login-area { display: grid; place-items: center; min-width: 0; padding: clamp(24px,5vw,80px); background: radial-gradient(ellipse at 100% 0,rgba(223,217,211,.28),transparent 65%); }
.login-card { width: min(480px,100%); padding: 40px; border: 1px solid var(--sf-glass-border); border-radius: 32px; background: var(--sf-surface); box-shadow: var(--sf-surface-shadow); -webkit-backdrop-filter: blur(24px) saturate(120%); backdrop-filter: blur(24px) saturate(120%); }
.login-card-header { display: flex; align-items: center; gap: var(--sf-gap); margin-bottom: 28px; }
.login-symbol { display: grid; place-items: center; flex: none; width: 48px; height: 48px; border: 1px solid var(--sf-line); border-radius: var(--sf-radius-control); background: var(--sf-glass-strong); color: var(--sf-black); }
.eyebrow { margin: 0; color: var(--sf-muted); font-size: var(--sb-type-caption); font-weight: var(--sb-weight-semibold); letter-spacing: var(--sb-tracking-eyebrow); overflow-wrap: anywhere; }
.login-area h1 { margin: 0 0 12px; font-size: var(--sb-type-dialog); font-weight: var(--sb-weight-semibold); line-height: var(--sb-leading-heading); letter-spacing: var(--sb-tracking-heading); }
.hint { margin: 0 0 28px; color: var(--sf-muted); font-size: var(--sb-type-small); line-height: var(--sb-leading-body); }
.login-area label { display: block; margin: 20px 0 8px; color: var(--sf-muted); font-size: var(--sb-type-small); }
.login-area input { display: block; width: 100%; min-width: 0; height: 52px; padding: 0 16px; border: 1px solid var(--sf-line); border-radius: var(--sf-radius-control); outline: none; background: var(--sf-glass-strong); color: var(--sf-black); font: var(--sb-weight-regular) var(--sb-type-body)/var(--sb-leading-control) var(--sb-font); transition: border-color var(--sf-motion) var(--sf-ease), box-shadow var(--sf-motion) var(--sf-ease), background var(--sf-motion) var(--sf-ease); }
.login-area input::placeholder { color: var(--sf-muted); opacity: .8; }
.login-area input:focus { border-color: var(--sf-black); background: var(--sf-on-dark); box-shadow: var(--sf-focus-ring); }
.login-area input[aria-invalid="true"] { border-color: var(--sf-black); }
.login-area input:autofill { color: var(--sf-black); background: var(--sf-glass-strong); }
.login-area input:-webkit-autofill { -webkit-text-fill-color: var(--sf-black); -webkit-box-shadow: 0 0 0 100px #f7f5f2 inset; caret-color: var(--sf-black); }
.password { position: relative; }
.password input { padding-right: 56px; }
.password button { position: absolute; right: 3px; top: 3px; display: grid; place-items: center; width: 46px; height: 46px; padding: 0; border: 0; border-radius: var(--sf-radius-compact); background: transparent; color: var(--sf-muted); cursor: pointer; transition: background var(--sf-motion) var(--sf-ease), color var(--sf-motion) var(--sf-ease); }
.password button:hover:not(:disabled) { background: var(--sf-glass); color: var(--sf-black); }
.login-error { margin: 20px 0 0; padding: 12px 16px; border: 1px solid var(--sf-line); border-radius: var(--sf-radius-control); background: var(--sf-glass-strong); color: var(--sf-black); font-size: var(--sb-type-small); line-height: var(--sb-leading-body); overflow-wrap: anywhere; }
.submit { display: flex; align-items: center; justify-content: space-between; gap: var(--sf-gap); width: 100%; min-height: 52px; margin-top: 28px; padding: 14px 20px; border: 1px solid var(--sf-black); border-radius: var(--sf-radius-control); background: var(--sf-black); color: var(--sf-on-dark); font: var(--sb-weight-semibold) var(--sb-type-small)/var(--sb-leading-control) var(--sb-font); box-shadow: var(--sf-action-shadow); cursor: pointer; transition: background var(--sf-motion) var(--sf-ease), box-shadow var(--sf-motion) var(--sf-ease); }
.submit:hover:not(:disabled) { background: var(--sf-action-hover); }
.submit svg { flex: none; }
.login-area :is(input,button):disabled { opacity: .6; cursor: not-allowed; }
.login-card > small { display: block; margin-top: 20px; color: var(--sf-muted); text-align: center; font-size: var(--sb-type-caption); line-height: var(--sb-leading-body); }
.login-site-link { display: flex; align-items: center; justify-content: center; gap: var(--sf-gap-small); width: fit-content; margin: 24px auto 0; padding: 4px; border-radius: var(--sf-radius-compact); color: var(--sf-black); font-size: var(--sb-type-small); text-decoration: underline; text-underline-offset: 5px; }
.login-page :is(a,button,input):focus-visible { outline: 2px solid var(--sf-black); outline-offset: 4px; }
.login-brand a:focus-visible { outline-color: var(--sf-on-dark); }
@media (max-width: 850px) {
  .login-page { grid-template-columns: minmax(0,1fr); grid-template-rows: auto 1fr; }
  .login-brand { padding: 28px 24px; background: transparent; color: var(--sf-black); }
  .login-logo { margin: auto; }
  .login-logo img { width: 190px; filter: none; opacity: .9; }
  .login-brand-copy, .login-brand footer { display: none; }
  .login-area { align-items: start; padding: 8px 20px 32px; }
  .login-card { padding: 28px; border-radius: var(--sf-radius-panel); }
}
@media (max-width: 360px) { .login-area { padding-inline: 12px; } .login-card { padding: 24px 20px; } .login-card-header { gap: 12px; } }
@media (prefers-reduced-motion: reduce) { .login-area :is(input,button) { transition: none; } }
</style>
