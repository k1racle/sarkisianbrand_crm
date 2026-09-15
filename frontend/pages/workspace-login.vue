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
  <main class="login-page">
    <section class="login-brand"><img src="/sarkisian-logo.png" alt="SARKISIAN" /><div><p>ЕДИНАЯ БИЗНЕС-ПЛАТФОРМА</p><h1>Вся компания.<br><em>В одном ритме.</em></h1><span>Продажи, клиенты, маркетплейсы, поддержка и управленческие показатели связаны в одной экосистеме.</span></div><footer>Только для сотрудников SARKISIAN</footer></section>
    <section class="login-area"><form @submit.prevent="submit"><div class="login-symbol"><LockKeyhole :size="21" /></div><p class="eyebrow">SARKISIAN WORKSPACE</p><h2>Вход в систему</h2><p class="hint">Используйте корпоративную учётную запись. Доступные разделы появятся согласно вашей роли.</p><label><span>Корпоративный email</span><input v-model.trim="email" type="email" autocomplete="username" placeholder="name@sarkisianbrand.ru" required /></label><label><span>Пароль</span><div class="password"><input v-model="password" :type="showPassword ? 'text' : 'password'" autocomplete="current-password" placeholder="Введите пароль" required /><button type="button" :aria-label="showPassword ? 'Скрыть пароль' : 'Показать пароль'" @click="showPassword=!showPassword"><EyeOff v-if="showPassword" :size="17" /><Eye v-else :size="17" /></button></div></label><p v-if="error" class="login-error">{{ error }}</p><button class="submit" :disabled="loading"><span>{{ loading ? 'Проверяем данные…' : 'Войти в Workspace' }}</span><ArrowRight :size="17" /></button><small>Проблемы со входом? Создайте обращение в IT Helpdesk.</small></form></section>
  </main>
</template>

<style scoped>
.login-page{min-height:100vh;display:grid;grid-template-columns:minmax(350px,42%) 1fr;background:#f4f5f7;color:#1d1e22;font-family:var(--sb-font)}.login-brand{padding:45px 11%;background:#191919;color:#fff;display:flex;flex-direction:column;justify-content:space-between}.login-brand>img{width:170px;filter:brightness(0) invert(1)}.login-brand>div{max-width:480px}.login-brand p,.eyebrow{margin:0 0 20px;color:#f8604a;font-size:10px;font-weight:600;letter-spacing:.17em}.login-brand h1{font-size:clamp(40px,5vw,68px);line-height:1.02;letter-spacing:-.055em;font-weight:500;margin:0 0 28px}.login-brand h1 em{font-family:Georgia,serif;color:#f7aa9d;font-weight:400}.login-brand span{display:block;max-width:410px;color:#b9bbc0;font-size:13px;line-height:1.8}.login-brand footer{font-size:9px;letter-spacing:.13em;color:#777a80;text-transform:uppercase}.login-area{display:grid;place-items:center;padding:40px}.login-area form{width:min(430px,100%);padding:44px;background:#fff;border:1px solid #e0e2e5;box-sizing:border-box}.login-symbol{width:42px;height:42px;background:#191919;color:#fff;display:grid;place-items:center;margin-bottom:27px}.login-area h2{font-size:32px;line-height:1.15;margin:0 0 12px;font-weight:600;letter-spacing:-.025em}.hint{font-size:12px;line-height:1.7;color:#858991;margin:0 0 27px}.login-area label{display:grid;gap:7px;margin-bottom:15px}.login-area label>span{font-size:10px;color:#74777f}.login-area input{width:100%;height:44px;border:1px solid #dfe1e5;padding:0 12px;box-sizing:border-box;outline:0;font-size:12px}.login-area input:focus{border-color:#9a9da3}.password{position:relative}.password button{position:absolute;right:0;top:0;width:42px;height:44px;border:0;background:none;color:#858991}.password input{padding-right:44px}.login-error{padding:10px 12px;background:#fff0ed;color:#b64e3d;font-size:11px;line-height:1.5}.submit{width:100%;height:46px;border:0;background:#191919;color:#fff;display:flex;justify-content:space-between;align-items:center;padding:0 16px;font-size:12px;margin-top:6px}.submit:disabled{opacity:.65}.login-area form>small{display:block;text-align:center;color:#9699a0;font-size:9px;margin-top:18px}@media(max-width:800px){.login-page{grid-template-columns:1fr}.login-brand{display:none}.login-area{padding:20px}.login-area form{padding:32px 26px}}
</style>
