<script setup lang="ts">
import { ArrowRight, ChevronLeft, X } from '@lucide/vue';

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ close: []; 'after-leave': [] }>();
const motionDuration = useStorefrontMotion();
const config = useRuntimeConfig();
const { accessToken, authHeaders, loadMe, register } = useStorefront();
const attribution = useCookie<string | null>('sb-partner-attribution');
const form = reactive({
  firstName: '', lastName: '', email: '', phone: '', password: '',
  companyName: '', inn: '', kpp: '', legalAddress: '',
});
const busy = ref(false);
const error = ref('');
const created = ref<any>(null);
const accountCreated = ref(false);
const consent = ref(false);
const activeTab = ref<'register' | 'login'>('register');

watch(() => props.open, open => {
  if (open) {
    error.value = '';
    created.value = null;
    accountCreated.value = false;
    activeTab.value = 'register';
    void loadMe();
  }
});

function apiError(exception: any) {
  return Array.isArray(exception?.data?.message)
    ? exception.data.message.join('. ')
    : exception?.data?.message || 'Не удалось отправить заявку. Проверьте данные и попробуйте ещё раз.';
}

function openCrmLogin() {
  emit('close');
  void navigateTo('/b2b-login');
}

async function createOrganization() {
  const details = Object.fromEntries(Object.entries({
    companyName: form.companyName,
    inn: form.inn,
    kpp: form.kpp,
    legalAddress: form.legalAddress,
  }).filter(([, value]) => value.trim()).map(([key, value]) => [key, value.trim()]));
  created.value = await $fetch('/b2b/profile', {
    baseURL: config.public.apiBase,
    method: 'POST',
    headers: authHeaders.value,
    body: { ...details, ...(/^[a-f0-9]{64}$/.test(attribution.value || '') ? { partnerToken: attribution.value } : {}) },
  });
  await loadMe();
}

async function submitBusinessRegistration() {
  if (busy.value) return;
  busy.value = true;
  error.value = '';
  try {
    if (!accessToken.value) {
      await register({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
      });
      accountCreated.value = true;
    }
    await createOrganization();
  } catch (exception: any) {
    error.value = apiError(exception);
    if (accountCreated.value) {
      error.value = `Доступ владельца создан. Не удалось отправить данные компании: ${error.value} Заполните или проверьте данные компании и отправьте заявку ещё раз.`;
    } else if (!accessToken.value && Number(exception?.statusCode || exception?.status) === 409) {
      error.value = 'Такой email или телефон уже зарегистрирован. Нажмите «Войти и добавить компанию», чтобы подключить бизнес к существующему аккаунту.';
    }
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="sf-drawer" :duration="motionDuration" @after-leave="emit('after-leave')">
      <div v-if="open" class="sb-glass-layer sd-layer" @click.self="emit('close')">
        <aside class="sb-side-drawer sb-business-registration-drawer sd-drawer" role="dialog" aria-modal="true" aria-labelledby="business-registration-title">
          <div class="sd-toolbar">
            <button type="button" aria-label="Закрыть панель" @click="emit('close')"><ChevronLeft :size="32" :stroke-width="1" /></button>
            <button type="button" aria-label="Закрыть" @click="emit('close')"><X :size="32" :stroke-width="1.5" /></button>
          </div>
          <div class="sd-content">
            <header class="sd-heading">
              <h2 id="business-registration-title">{{ created ? 'Заявка принята' : accessToken ? 'Данные компании' : 'Регистрация бизнеса' }}</h2>
              <p v-if="created">{{ created.name }} — данные отправлены на проверку. После активации компании станет доступен кабинет.</p>
              <p v-else-if="accessToken">Добавьте сведения о компании. После проверки вы получите доступ к CRM, онлайн-записи и заказам SARKISIAN для бизнеса.</p>
              <p v-else>Создайте отдельный доступ владельца и отправьте заявку на подключение салона или компании.</p>
            </header>

            <div v-if="!created" class="sb-business-registration-tabs" role="tablist" aria-label="Регистрация бизнеса или вход в CRM">
              <button type="button" role="tab" :aria-selected="activeTab === 'register'" :class="{ active: activeTab === 'register' }" @click="activeTab = 'register'">Регистрация</button>
              <button type="button" role="tab" :aria-selected="activeTab === 'login'" :class="{ active: activeTab === 'login' }" @click="activeTab = 'login'; openCrmLogin()">Войти</button>
            </div>

            <div v-if="created" class="sb-business-registration-success">
              <p>Мы проверим данные организации и откроем доступ к кабинету.</p>
              <NuxtLink to="/b2b-login" class="sb-liquid-primary" @click="emit('close')">Войти в кабинет <ArrowRight :size="18" /></NuxtLink>
            </div>

            <div v-else-if="!accessToken" class="sb-business-registration-auth">
              <form class="sb-drawer-form sb-business-registration-form" :aria-busy="busy" @submit.prevent="submitBusinessRegistration">
                <div class="sb-auth-row">
                  <label>Имя<input v-model.trim="form.firstName" autocomplete="given-name" maxlength="80" required :disabled="busy" /></label>
                  <label>Фамилия<input v-model.trim="form.lastName" autocomplete="family-name" maxlength="80" :disabled="busy" /></label>
                </div>
                <label>Email<input v-model.trim="form.email" type="email" autocomplete="email" maxlength="254" required :disabled="busy" /></label>
                <label>Телефон<input v-model.trim="form.phone" type="tel" autocomplete="tel" maxlength="24" placeholder="+7 999 000-00-00" :disabled="busy" /></label>
                <label>Пароль для входа в бизнес-кабинет<input v-model="form.password" type="password" autocomplete="new-password" minlength="10" required :disabled="busy" /></label>
                <label>Название салона или компании<input v-model.trim="form.companyName" minlength="2" maxlength="160" autocomplete="organization" required :disabled="busy" /></label>
                <div class="sb-auth-row">
                  <label>ИНН<input v-model.trim="form.inn" inputmode="numeric" pattern="[0-9]{10}|[0-9]{12}" maxlength="12" autocomplete="off" :disabled="busy" /></label>
                  <label>КПП<input v-model.trim="form.kpp" inputmode="numeric" pattern="[0-9]{9}" maxlength="9" autocomplete="off" :disabled="busy" /></label>
                </div>
                <label>Юридический адрес<input v-model.trim="form.legalAddress" maxlength="500" autocomplete="street-address" :disabled="busy" /></label>
                <label class="sb-auth-consent"><input v-model="consent" type="checkbox" required :disabled="busy" /><span>Принимаю <NuxtLink to="/privacy" target="_blank">политику конфиденциальности</NuxtLink> и <NuxtLink to="/oferta" target="_blank">публичную оферту</NuxtLink>.</span></label>
                <p class="sb-business-registration-note">Данные компании проверит команда SARKISIAN перед активацией кабинета.</p>
                <p v-if="error" class="sb-form-error" role="alert">{{ error }}</p>
                <button class="sb-liquid-primary" type="submit" :disabled="busy">{{ busy ? 'Отправляем…' : 'Зарегистрировать бизнес' }} <ArrowRight :size="18" /></button>
              </form>
            </div>

            <form v-else class="sb-drawer-form sb-business-registration-form" :aria-busy="busy" @submit.prevent="submitBusinessRegistration">
              <p v-if="accountCreated" class="sb-business-registration-note">Доступ владельца создан. Осталось добавить компанию.</p>
              <label>Название салона или компании<input v-model.trim="form.companyName" minlength="2" maxlength="160" autocomplete="organization" required :disabled="busy" /></label>
              <div class="sb-auth-row">
                <label>ИНН<input v-model.trim="form.inn" inputmode="numeric" pattern="[0-9]{10}|[0-9]{12}" maxlength="12" autocomplete="off" :disabled="busy" /></label>
                <label>КПП<input v-model.trim="form.kpp" inputmode="numeric" pattern="[0-9]{9}" maxlength="9" autocomplete="off" :disabled="busy" /></label>
              </div>
              <label>Юридический адрес<input v-model.trim="form.legalAddress" maxlength="500" autocomplete="street-address" :disabled="busy" /></label>
              <p class="sb-business-registration-note">Перед активацией команда проверит данные компании.</p>
              <p v-if="error" class="sb-form-error" role="alert">{{ error }}</p>
              <button class="sb-liquid-primary" type="submit" :disabled="busy">{{ busy ? 'Отправляем…' : 'Отправить заявку' }} <ArrowRight :size="18" /></button>
            </form>
          </div>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>
