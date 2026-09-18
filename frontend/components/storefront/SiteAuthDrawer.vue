<script setup lang="ts">
import { ArrowRight, BriefcaseBusiness, Eye, EyeOff, LockKeyhole, Sparkles, UserPlus, X } from '@lucide/vue';

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ close: []; 'after-leave': [] }>();
const motionDuration = useStorefrontMotion();
const config = useRuntimeConfig();
const { authMode: mode } = useStorefrontPanels();
const route = useRoute();
const showPassword = ref(false);
const busy = ref(false);
const error = ref('');
const socialNotice = ref('');
const resetting = ref(false);
const resetSent = ref(false);
const consent = ref(false);
const form = reactive({ email: '', password: '', firstName: '', lastName: '', phone: '' });
const { login, register } = useStorefront();
watch(() => props.open, open => { if (open) { resetting.value = false; resetSent.value = false; error.value = ''; socialNotice.value = ''; } else { form.password = ''; } });
watch(mode, () => { resetting.value = false; error.value = ''; socialNotice.value = ''; });
async function requestReset() {
  busy.value = true; error.value = ''; resetSent.value = false;
  try { const result = await $fetch<any>('/auth/password-reset/request', { baseURL: config.public.apiBase, method: 'POST', body: { email: form.email.trim() } }); socialNotice.value = result.message; resetSent.value = true; }
  catch (exception: any) { error.value = exception?.data?.message || 'Не удалось отправить запрос. Попробуйте позже.'; }
  finally { busy.value = false; }
}

async function submit() {
  error.value = '';
  busy.value = true;
  try {
    if (mode.value === 'login') await login(form.email, form.password);
    else await register(form);
    emit('close');
  } catch (exception: any) {
    error.value = Array.isArray(exception?.data?.message)
      ? exception.data.message.join('. ')
      : (exception?.data?.message || 'Не удалось войти. Проверьте введённые данные.');
  } finally {
    busy.value = false;
  }
}

async function social(provider: 'yandex' | 'vk') {
  socialNotice.value = '';
  try {
    const result = await $fetch<any>(`/auth/social/${provider}/start`, {
      baseURL: config.public.apiBase,
      query: { returnUrl: ['/cart', '/account'].includes(route.path) ? route.fullPath : '/account' },
    });
    if (result.authorizationUrl) window.location.href = result.authorizationUrl;
  } catch (exception: any) {
    socialNotice.value = exception?.data?.message || 'Социальный вход ещё не настроен администратором.';
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="sf-drawer" :duration="motionDuration" @after-leave="emit('after-leave')">
      <div v-if="open" class="sb-glass-layer" @click.self="emit('close')">
        <aside class="sb-side-drawer sb-auth-drawer" aria-label="Вход и регистрация">
          <header class="sb-drawer-head">
            <div>
              <span><Sparkles :size="13" /> SARKISIAN CLUB</span>
              <h2>{{ resetting ? 'Восстановить пароль' : mode === 'login' ? 'С возвращением' : 'Новый аккаунт' }}</h2>
              <p>{{ resetting ? 'Отправим ссылку для смены пароля на ваш email.' : mode === 'login' ? 'Войдите, чтобы продолжить покупки.' : 'Бонусы и история заказов — в одном месте.' }}</p>
            </div>
            <button aria-label="Закрыть" @click="emit('close')"><X :size="20" /></button>
          </header>

          <div v-if="!resetting" class="sb-drawer-tabs">
            <button :class="{ active: mode === 'login' }" @click="mode = 'login'">Вход</button>
            <button :class="{ active: mode === 'register' }" @click="mode = 'register'">Регистрация</button>
          </div>

          <form v-if="resetting" class="sb-drawer-form" @submit.prevent="requestReset">
            <label>Email<input v-model="form.email" type="email" autocomplete="email" required maxlength="254" placeholder="name@example.ru" /></label>
            <p v-if="resetSent" class="sb-social-notice" role="status">{{ socialNotice }}</p>
            <p v-if="error" class="sb-form-error" role="alert">{{ error }}</p>
            <button class="sb-liquid-primary" :disabled="busy">{{ busy ? 'Отправляем…' : 'Отправить ссылку' }}<ArrowRight :size="18" /></button>
            <button type="button" class="sb-drawer-secondary" @click="resetting = false; error = ''; socialNotice = ''">Вернуться ко входу</button>
          </form>
          <form v-else class="sb-drawer-form" @submit.prevent="submit">
            <div v-if="mode === 'register'" class="sb-auth-row">
              <label>Имя<input v-model="form.firstName" autocomplete="given-name" required placeholder="Ваше имя" /></label>
              <label>Фамилия<input v-model="form.lastName" autocomplete="family-name" placeholder="Фамилия" /></label>
            </div>
            <label>Email<input v-model="form.email" type="email" autocomplete="email" required placeholder="name@example.ru" /></label>
            <label v-if="mode === 'register'">Телефон<input v-model="form.phone" type="tel" autocomplete="tel" placeholder="+7 999 000-00-00" /></label>
            <label>Пароль
              <div class="sb-password">
                <input v-model="form.password" :type="showPassword ? 'text' : 'password'" :autocomplete="mode === 'login' ? 'current-password' : 'new-password'" :minlength="mode === 'register' ? 10 : undefined" required :placeholder="mode === 'register' ? 'Не менее 10 символов' : 'Ваш пароль'" />
                <button type="button" :aria-label="showPassword ? 'Скрыть пароль' : 'Показать пароль'" @click="showPassword = !showPassword"><EyeOff v-if="showPassword" :size="18" /><Eye v-else :size="18" /></button>
              </div>
            </label>
            <button v-if="mode === 'login'" type="button" class="sb-forgot" @click="resetting = true; error = ''; socialNotice = ''">Забыли пароль?</button>
            <label v-if="mode === 'register'" class="sb-auth-consent"><input v-model="consent" type="checkbox" required /><span>Принимаю <NuxtLink to="/privacy" target="_blank">политику конфиденциальности</NuxtLink> и <NuxtLink to="/oferta" target="_blank">публичную оферту</NuxtLink>.</span></label>
            <p v-if="error" class="sb-form-error">{{ error }}</p>
            <button class="sb-liquid-primary" :disabled="busy">
              <LockKeyhole v-if="mode === 'login'" :size="17" /><UserPlus v-else :size="17" />
              {{ busy ? 'Подождите…' : mode === 'login' ? 'Войти' : 'Создать аккаунт' }}
            </button>
          </form>

          <div v-if="!resetting" class="sb-social-divider"><span>или продолжить через</span></div>
          <SiteSocialLoginButtons v-if="!resetting" @select="social" />
          <p v-if="socialNotice && !resetting" class="sb-social-notice">{{ socialNotice }}</p>

          <NuxtLink to="/b2b-login" class="sb-b2b-entry" @click="emit('close')">
            <BriefcaseBusiness :size="20" />
            <span><b>Профессиональный кабинет</b><small>Вход для салонов и B2B-клиентов</small></span>
            <ArrowRight :size="18" />
          </NuxtLink>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>
