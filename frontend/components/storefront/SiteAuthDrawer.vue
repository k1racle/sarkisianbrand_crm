<script setup lang="ts">
import { ArrowRight, BriefcaseBusiness, Eye, EyeOff, LockKeyhole, Sparkles, UserPlus, X } from '@lucide/vue';

defineProps<{ open: boolean }>();
const emit = defineEmits<{ close: [] }>();
const config = useRuntimeConfig();
const mode = ref<'login' | 'register'>('login');
const showPassword = ref(false);
const busy = ref(false);
const error = ref('');
const socialNotice = ref('');
const form = reactive({ email: '', password: '', firstName: '', lastName: '', phone: '' });
const { login, register } = useStorefront();

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
      query: { returnUrl: '/account' },
    });
    if (result.authorizationUrl) window.location.href = result.authorizationUrl;
  } catch (exception: any) {
    socialNotice.value = exception?.data?.message || 'Социальный вход ещё не настроен администратором.';
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="sf-drawer">
      <div v-if="open" class="sb-glass-layer" @click.self="emit('close')">
        <aside class="sb-side-drawer sb-auth-drawer" aria-label="Вход и регистрация">
          <header class="sb-drawer-head">
            <div>
              <span><Sparkles :size="13" /> SARKISIAN CLUB</span>
              <h2>{{ mode === 'login' ? 'С возвращением' : 'Новый аккаунт' }}</h2>
              <p>{{ mode === 'login' ? 'Войдите, чтобы продолжить покупки.' : 'Бонусы и история заказов — в одном месте.' }}</p>
            </div>
            <button aria-label="Закрыть" @click="emit('close')"><X :size="20" /></button>
          </header>

          <div class="sb-drawer-tabs">
            <button :class="{ active: mode === 'login' }" @click="mode = 'login'">Вход</button>
            <button :class="{ active: mode === 'register' }" @click="mode = 'register'">Регистрация</button>
          </div>

          <form class="sb-drawer-form" @submit.prevent="submit">
            <div v-if="mode === 'register'" class="sb-auth-row">
              <label>Имя<input v-model="form.firstName" autocomplete="given-name" required placeholder="Ваше имя" /></label>
              <label>Фамилия<input v-model="form.lastName" autocomplete="family-name" placeholder="Фамилия" /></label>
            </div>
            <label>Email<input v-model="form.email" type="email" autocomplete="email" required placeholder="name@example.ru" /></label>
            <label v-if="mode === 'register'">Телефон<input v-model="form.phone" type="tel" autocomplete="tel" placeholder="+7 999 000-00-00" /></label>
            <label>Пароль
              <div class="sb-password">
                <input v-model="form.password" :type="showPassword ? 'text' : 'password'" :autocomplete="mode === 'login' ? 'current-password' : 'new-password'" minlength="10" required placeholder="Не менее 10 символов" />
                <button type="button" :aria-label="showPassword ? 'Скрыть пароль' : 'Показать пароль'" @click="showPassword = !showPassword"><EyeOff v-if="showPassword" :size="18" /><Eye v-else :size="18" /></button>
              </div>
            </label>
            <NuxtLink v-if="mode === 'login'" to="/password-reset" class="sb-forgot" @click="emit('close')">Забыли пароль?</NuxtLink>
            <p v-if="error" class="sb-form-error">{{ error }}</p>
            <button class="sb-liquid-primary" :disabled="busy">
              <LockKeyhole v-if="mode === 'login'" :size="17" /><UserPlus v-else :size="17" />
              {{ busy ? 'Подождите…' : mode === 'login' ? 'Войти' : 'Создать аккаунт' }}
            </button>
          </form>

          <div class="sb-social-divider"><span>или продолжить через</span></div>
          <div class="sb-social-buttons">
            <button @click="social('yandex')"><i class="sb-yandex-icon">Я</i> Яндекс ID</button>
            <button @click="social('vk')"><i class="sb-social-icon sb-social-icon--vk"><img src="/storefront/icons/vk.svg" alt="" /></i> VK ID</button>
          </div>
          <p v-if="socialNotice" class="sb-social-notice">{{ socialNotice }}</p>

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
