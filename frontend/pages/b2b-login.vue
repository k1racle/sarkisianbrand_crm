<script setup lang="ts">
import { ArrowRight, Building2, Eye, EyeOff } from '@lucide/vue';
import { safeInternalRedirect } from '~/shared/internal-redirect';
const { login, hydrate, token }=useB2BSession(); const route=useRoute(); const email=ref(''); const password=ref(''); const show=ref(false); const loading=ref(false); const error=ref('');
onMounted(()=>{hydrate();if(token.value)navigateTo('/b2b')});
async function submit(){if(loading.value)return;loading.value=true;error.value='';try{await login(email.value,password.value);await navigateTo(safeInternalRedirect(route.query.redirect,'/b2b'))}catch(e:any){error.value=e?.data?.message||e?.message||'Не удалось войти'}finally{loading.value=false}}
</script>
<template>
  <main data-v-ui-9238ae0be0ec class="login-page b2b-login">
    <section data-v-ui-9238ae0be0ec class="login-brand" aria-label="SARKISIAN для бизнеса">
      <NuxtLink data-v-ui-9238ae0be0ec to="/" class="login-logo" aria-label="SARKISIAN — на главную сайта"><img data-v-ui-9238ae0be0ec src="/sarkisian-logo.png" alt="SARKISIAN" width="200" height="40" /></NuxtLink>
      <div data-v-ui-9238ae0be0ec class="login-brand-copy"><p data-v-ui-9238ae0be0ec class="login-brand-kicker">SARKISIAN для бизнеса</p><h2 data-v-ui-9238ae0be0ec>Ваш салон.<br data-v-ui-9238ae0be0ec><em data-v-ui-9238ae0be0ec>В одном окне.</em></h2><p data-v-ui-9238ae0be0ec class="login-brand-description">Клиенты, календарь записей, услуги, команда и закупки профессиональных материалов — в одной экосистеме.</p><div data-v-ui-9238ae0be0ec class="login-brand-note"><Building2 data-v-ui-9238ae0be0ec :size="18" aria-hidden="true" /><span data-v-ui-9238ae0be0ec>Один кабинет для владельца и команды.</span></div></div>
      <footer data-v-ui-9238ae0be0ec>Рабочее пространство партнёров SARKISIAN</footer>
    </section>
    <section data-v-ui-9238ae0be0ec class="login-area" aria-labelledby="b2b-login-title">
      <form data-v-ui-9238ae0be0ec class="login-card" :aria-busy="loading" @submit.prevent="submit">
        <header data-v-ui-9238ae0be0ec class="login-card-header"><div data-v-ui-9238ae0be0ec class="login-symbol"><Building2 data-v-ui-9238ae0be0ec :size="22" aria-hidden="true" /></div><p data-v-ui-9238ae0be0ec class="eyebrow">КАБИНЕТ ПАРТНЁРА</p></header>
        <h1 data-v-ui-9238ae0be0ec id="b2b-login-title">Вход для бизнеса</h1><p data-v-ui-9238ae0be0ec id="b2b-login-hint" class="hint">Используйте учётную запись владельца или сотрудника организации.</p>
        <label data-v-ui-9238ae0be0ec for="b2b-email">Email</label><input data-v-ui-9238ae0be0ec id="b2b-email" v-model.trim="email" type="email" name="username" autocomplete="username" autocapitalize="none" :spellcheck="false" inputmode="email" placeholder="name@company.ru" :disabled="loading" :aria-invalid="Boolean(error)" :aria-describedby="error ? 'b2b-login-error' : 'b2b-login-hint'" required />
        <label data-v-ui-9238ae0be0ec for="b2b-password">Пароль</label><div data-v-ui-9238ae0be0ec class="password"><input data-v-ui-9238ae0be0ec id="b2b-password" v-model="password" :type="show ? 'text' : 'password'" name="password" autocomplete="current-password" placeholder="Введите пароль" :disabled="loading" :aria-invalid="Boolean(error)" :aria-describedby="error ? 'b2b-login-error' : undefined" required /><button data-v-ui-9238ae0be0ec type="button" :disabled="loading" :aria-label="show ? 'Скрыть пароль' : 'Показать пароль'" :aria-pressed="show" aria-controls="b2b-password" @click="show=!show"><EyeOff data-v-ui-9238ae0be0ec v-if="show" :size="20" aria-hidden="true" /><Eye data-v-ui-9238ae0be0ec v-else :size="20" aria-hidden="true" /></button></div>
        <p data-v-ui-9238ae0be0ec v-if="error" id="b2b-login-error" class="login-error" role="alert">{{ error }}</p>
        <button data-v-ui-9238ae0be0ec class="submit" type="submit" :disabled="loading"><span data-v-ui-9238ae0be0ec>{{ loading ? 'Проверяем данные…' : 'Войти в кабинет' }}</span><ArrowRight data-v-ui-9238ae0be0ec :size="20" aria-hidden="true" /></button>
        <small data-v-ui-9238ae0be0ec>Нет B2B-доступа? Обратитесь к персональному менеджеру SARKISIAN.</small><NuxtLink data-v-ui-9238ae0be0ec to="/" class="login-site-link">Вернуться на сайт <ArrowRight data-v-ui-9238ae0be0ec :size="16" aria-hidden="true" /></NuxtLink>
      </form>
    </section>
  </main>
</template>
