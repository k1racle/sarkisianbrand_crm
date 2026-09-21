<script setup lang="ts">
import { ArrowRight, Check, Mail } from '@lucide/vue';

const config = useRuntimeConfig();
const form = reactive({ name: '', phone: '', email: '', message: '', consent: false, website: '' });
const sending = ref(false);
const sent = ref(false);
const error = ref('');

async function submit() {
  if (sending.value) return;
  error.value = '';
  sending.value = true;
  try {
    await $fetch('/contact-messages', {
      baseURL: config.public.apiBase,
      method: 'POST',
      body: { ...form, name: form.name.trim(), phone: form.phone.trim(), email: form.email.trim(), message: form.message.trim() },
      timeout: 15000,
    });
    sent.value = true;
  } catch (e: any) {
    error.value = e?.status === 429
      ? 'Слишком много попыток. Попробуйте чуть позже.'
      : 'Не удалось отправить сообщение. Попробуйте ещё раз или напишите нам по почте.';
  } finally {
    sending.value = false;
  }
}
</script>

<template>
  <section class="sb-contact-form" aria-labelledby="sb-contact-form-title">
    <div v-if="sent" class="sb-contact-form__success" role="status">
      <span class="sb-contact-form__success-icon"><Check :size="24" /></span>
      <h2>Сообщение отправлено</h2>
      <p>Спасибо! Мы получили ваше обращение и свяжемся с вами по указанным контактам.</p>
      <button type="button" class="sb-contact-form__again" @click="sent = false; form.message = ''; form.consent = false">Написать ещё раз <ArrowRight :size="17" /></button>
    </div>
    <template v-else>
      <div class="sb-contact-form__head"><span class="sb-contact-form__icon"><Mail :size="20" /></span><div><span class="sb-contact-form__eyebrow">НАПИШИТЕ НАМ</span><h2 id="sb-contact-form-title">Есть вопрос? Поможем.</h2></div></div>
      <form @submit.prevent="submit">
        <div class="sb-contact-form__grid">
          <label>Ваше имя <input v-model="form.name" type="text" name="name" autocomplete="name" required minlength="2" maxlength="100" placeholder="Как к вам обращаться" /></label>
          <label>Телефон <input v-model="form.phone" type="tel" name="tel" autocomplete="tel" inputmode="tel" required minlength="7" maxlength="25" placeholder="+7 (999) 000-00-00" /></label>
        </div>
        <label>Электронная почта <input v-model="form.email" type="email" name="email" autocomplete="email" required maxlength="254" placeholder="name@example.ru" /></label>
        <label>Ваше сообщение <textarea v-model="form.message" name="message" required minlength="10" maxlength="5000" rows="4" placeholder="Расскажите, чем мы можем помочь"></textarea></label>
        <label class="sb-contact-form__trap" aria-hidden="true">Сайт <input v-model="form.website" type="text" name="website" tabindex="-1" autocomplete="off" /></label>
        <label class="sb-contact-form__consent"><input v-model="form.consent" type="checkbox" required /><span>Согласен(на) на обработку персональных данных по <NuxtLink to="/privacy" target="_blank">политике конфиденциальности</NuxtLink>.</span></label>
        <p v-if="error" class="sb-contact-form__error" role="alert">{{ error }}</p>
        <button type="submit" class="sb-contact-form__submit" :disabled="sending">{{ sending ? 'Отправляем…' : 'Отправить сообщение' }} <ArrowRight v-if="!sending" :size="19" /></button>
      </form>
    </template>
  </section>
</template>
