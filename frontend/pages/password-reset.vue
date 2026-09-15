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
async function submit(){
  error.value='';
  if(!token.value){error.value='В ссылке отсутствует код восстановления';return}
  if(password.value!==repeat.value){error.value='Пароли не совпадают';return}
  busy.value=true;
  try{await $fetch('/auth/password-reset/complete',{baseURL:config.public.apiBase,method:'POST',body:{token:token.value,newPassword:password.value}});complete.value=true}
  catch(exception:any){error.value=exception?.data?.message||exception?.message||'Не удалось изменить пароль'}finally{busy.value=false}
}
</script>
<template><main class="reset-page"><section><img src="/sarkisian-logo.png" alt="SARKISIAN"/><div v-if="complete" class="success"><CheckCircle2 :size="34"/><p>ПАРОЛЬ ИЗМЕНЁН</p><h1>Доступ восстановлен</h1><span>Все прежние сессии завершены. Теперь можно войти с новым паролем.</span><NuxtLink to="/workspace-login">Перейти ко входу</NuxtLink></div><form v-else @submit.prevent="submit"><div class="symbol"><KeyRound :size="21"/></div><p>БЕЗОПАСНОСТЬ</p><h1>Новый пароль</h1><span>Используйте не менее 10 символов, обязательно добавьте буквы и цифры.</span><label><small>Новый пароль</small><div><input v-model="password" :type="show?'text':'password'" minlength="10" required/><button type="button" @click="show=!show"><EyeOff v-if="show" :size="17"/><Eye v-else :size="17"/></button></div></label><label><small>Повторите пароль</small><input v-model="repeat" :type="show?'text':'password'" minlength="10" required/></label><b v-if="error">{{error}}</b><button class="submit" :disabled="busy">{{busy?'Сохраняем…':'Сохранить новый пароль'}}</button></form></section></main></template>
<style scoped>.reset-page{min-height:100vh;background:var(--sb-bg);display:grid;place-items:center;padding:24px;box-sizing:border-box;font-family:var(--sb-font);color:var(--sb-text)}.reset-page>section{width:min(470px,100%)}.reset-page img{display:block;width:165px;margin:0 auto 25px}form,.success{padding:42px;background:#fff;border:1px solid var(--sb-line);display:grid;box-sizing:border-box}.symbol{width:42px;height:42px;background:var(--sb-ink);color:#fff;display:grid;place-items:center;margin-bottom:24px}p{margin:0 0 12px;color:var(--sb-coral);font-size:9px;font-weight:700;letter-spacing:.16em}h1{font-size:29px;margin:0 0 12px}form>span,.success>span{font-size:10px;line-height:1.7;color:var(--sb-muted);margin-bottom:25px}label{display:grid;gap:7px;margin-bottom:14px}label small{font-size:9px;color:var(--sb-muted)}input{width:100%;height:44px;border:1px solid var(--sb-line);padding:0 11px;box-sizing:border-box;outline:0}label div{position:relative}label div input{padding-right:43px}label div button{position:absolute;right:0;top:0;width:43px;height:44px;border:0;background:transparent;color:var(--sb-muted)}form>b{padding:10px;background:var(--sb-coral-soft);color:var(--sb-danger);font-size:9px;margin-bottom:12px}.submit,.success a{height:44px;background:var(--sb-ink);color:#fff;border:0;text-decoration:none;display:grid;place-items:center;font-size:10px}.success svg{color:var(--sb-success);margin-bottom:20px}.success a{margin-top:4px}@media(max-width:520px){form,.success{padding:30px 24px}}</style>
