<script setup lang="ts">
import { CheckCircle2, Eye, EyeOff, KeyRound } from '@lucide/vue';
const route = useRoute();
const config = useRuntimeConfig();
const password = ref('');
const repeat = ref('');
const show = ref(false);
const busy = ref(false);
const error = ref('');
const complete = ref(false);
const token = computed(() => typeof route.query.token === 'string' ? route.query.token : '');
const { openAuth } = useStorefrontPanels();
useStorefrontSeo({ title: 'Восстановление пароля — SARKISIAN BRAND', noindex: true });
useHead({ meta: [{ name: 'referrer', content: 'no-referrer' }] });
async function submit(){
  error.value='';
  if(!token.value){error.value='В ссылке отсутствует код восстановления';return}
  if(password.value!==repeat.value){error.value='Пароли не совпадают';return}
  busy.value=true;
  try{await $fetch('/auth/password-reset/complete',{baseURL:config.public.apiBase,method:'POST',body:{token:token.value,newPassword:password.value}});complete.value=true}
  catch(exception:any){error.value=exception?.data?.message||exception?.message||'Не удалось изменить пароль'}finally{busy.value=false}
}
</script>
<template>
  <SiteShell>
    <div class="sb-reset-page">
      <section v-if="complete" class="sb-reset-card" role="status">
        <CheckCircle2 :size="24" />
        <p class="sb-kicker">ПАРОЛЬ ИЗМЕНЁН</p>
        <h1>Доступ восстановлен</h1>
        <p>Все прежние сессии завершены. Теперь можно войти с новым паролем.</p>
        <button class="sb-primary" @click="openAuth()">Войти с новым паролем</button>
      </section>
      <section v-else-if="!token" class="sb-reset-card"><KeyRound :size="24" /><h1>Восстановить пароль</h1><p>Откройте вход и нажмите «Забыли пароль?». Мы отправим ссылку для восстановления на ваш email.</p><button class="sb-primary" @click="openAuth()">Открыть вход</button></section>
      <section v-else class="sb-reset-card">
        <KeyRound :size="24" />
        <p class="sb-kicker">БЕЗОПАСНОСТЬ</p>
        <h1>Новый пароль</h1>
        <p>Используйте не менее 10 символов, обязательно добавьте буквы и цифры.</p>
        <form @submit.prevent="submit">
          <label>Новый пароль
            <div class="sb-password">
              <input v-model="password" :type="show ? 'text' : 'password'" autocomplete="new-password" minlength="10" required />
              <button type="button" :aria-label="show ? 'Скрыть пароль' : 'Показать пароль'" :aria-pressed="show" @click="show = !show"><EyeOff v-if="show" :size="18" /><Eye v-else :size="18" /></button>
            </div>
          </label>
          <label>Повторите пароль<input v-model="repeat" :type="show ? 'text' : 'password'" autocomplete="new-password" minlength="10" required /></label>
          <p v-if="error" class="sb-form-error" role="alert">{{ error }}</p>
          <button class="sb-primary" :disabled="busy">{{ busy ? 'Сохраняем…' : 'Сохранить новый пароль' }}</button>
        </form>
      </section>
    </div>
  </SiteShell>
</template>
