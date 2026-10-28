<script setup lang="ts">
import { ArrowRight, ChevronLeft, X } from '@lucide/vue';
const props=defineProps<{open:boolean}>();
const emit=defineEmits<{close:[];'after-leave':[]}>();
const motionDuration=useStorefrontMotion(),config=useRuntimeConfig(),business=useB2BSession();
const attribution=useCookie<string|null>('sb-partner-attribution');
const form=reactive({firstName:'',lastName:'',email:'',phone:'',password:'',companyName:'',inn:'',kpp:'',legalAddress:''});
const busy=ref(false),error=ref(''),created=ref<any>(null),consent=ref(false),terms=ref<{version:string}|null>(null),termsLoading=ref(false);
const activeTab=ref<'register'|'login'>('register');
async function loadTerms(){termsLoading.value=true;terms.value=null;try{terms.value=await $fetch('/business-registration/terms',{baseURL:config.public.apiBase,timeout:15000,retry:0});}catch{error.value='Не удалось загрузить условия регистрации. Попробуйте ещё раз.';}finally{termsLoading.value=false;}}
watch(()=>props.open,open=>{if(open){error.value='';created.value=null;consent.value=false;activeTab.value='register';void loadTerms();}},{immediate:true});
function close(){if(!busy.value)emit('close');}
function openCrmLogin(){close();void navigateTo('/b2b-login');}
function apiError(exception:any){return Array.isArray(exception?.data?.message)?exception.data.message.join('. '):exception?.data?.message||'Не удалось отправить заявку. Проверьте данные и попробуйте ещё раз.';}
async function submit(){
 if(busy.value||!consent.value||!terms.value)return;
 busy.value=true;error.value='';
 try{
  business.hydrate();business.syncStoredSession();const actor=business.generation.value;
  const details=Object.fromEntries(Object.entries({inn:form.inn,kpp:form.kpp,legalAddress:form.legalAddress}).filter(([,value])=>value.trim()).map(([key,value])=>[key,value.trim()]));
  const result=await $fetch<any>('/business-registration',{baseURL:config.public.apiBase,method:'POST',timeout:20000,retry:0,body:{...details,firstName:form.firstName.trim(),lastName:form.lastName.trim(),email:form.email.trim(),phone:form.phone.trim()||undefined,password:form.password,companyName:form.companyName.trim(),acceptedTerms:consent.value,termsVersion:terms.value.version,...(/^[a-f0-9]{64}$/.test(attribution.value||'')?{partnerToken:attribution.value}:{})}});
  business.adoptSession(result,actor);created.value=result.organization;form.password='';
 }catch(exception:any){
  if(exception?.data?.code==='BUSINESS_TERMS_CHANGED'){consent.value=false;await loadTerms();}
  error.value=apiError(exception);
 }finally{busy.value=false;}
}
</script>
<template>
 <Teleport to="body"><Transition name="sf-drawer" :duration="motionDuration" @after-leave="emit('after-leave')">
  <div v-if="open" class="sb-glass-layer sd-layer" @click.self="close">
   <aside class="sb-side-drawer sb-business-registration-drawer sd-drawer" role="dialog" aria-modal="true" aria-labelledby="business-registration-title" :aria-busy="busy">
    <div class="sd-toolbar"><button type="button" :disabled="busy" aria-label="Закрыть панель" @click="close"><ChevronLeft :size="32" :stroke-width="1"/></button><button type="button" :disabled="busy" aria-label="Закрыть" @click="close"><X :size="32" :stroke-width="1.5"/></button></div>
    <div class="sd-content">
     <header class="sd-heading"><h2 id="business-registration-title">{{created?'Заявка принята':'Регистрация бизнеса'}}</h2><p v-if="created">{{created.name}} — доступ владельца создан. Команда SARKISIAN проверит данные компании.</p><p v-else>Создайте отдельный бизнес-аккаунт владельца для салона, онлайн-записи и закупок SARKISIAN.</p></header>
     <div v-if="!created" class="sb-business-registration-tabs" role="tablist" aria-label="Регистрация бизнеса или вход в CRM"><button type="button" role="tab" :disabled="busy" :aria-selected="activeTab==='register'" :class="{active:activeTab==='register'}" @click="activeTab='register'">Регистрация</button><button type="button" role="tab" :disabled="busy" :aria-selected="activeTab==='login'" :class="{active:activeTab==='login'}" @click="activeTab='login';openCrmLogin()">Войти</button></div>
     <div v-if="created" class="sb-business-registration-success"><p>Откройте кабинет для настройки салона. После проверки компании подключим закупки и публичную онлайн-запись.</p><NuxtLink :to="`/b2b?organization=${created.id}`" class="sb-liquid-primary" @click="close">Открыть бизнес-кабинет<ArrowRight :size="18"/></NuxtLink></div>
     <form v-else class="sb-drawer-form sb-business-registration-form" :aria-busy="busy" @submit.prevent="submit">
      <div class="sb-auth-row"><label>Имя<input v-model.trim="form.firstName" autocomplete="given-name" maxlength="80" required :disabled="busy"/></label><label>Фамилия<input v-model.trim="form.lastName" autocomplete="family-name" maxlength="80" :disabled="busy"/></label></div>
      <label>Email для бизнес-кабинета<input v-model.trim="form.email" type="email" autocomplete="email" maxlength="254" required :disabled="busy"/></label><label>Телефон<input v-model.trim="form.phone" type="tel" autocomplete="tel" maxlength="24" placeholder="+7 999 000-00-00" :disabled="busy"/></label>
      <label>Пароль для бизнес-кабинета<input v-model="form.password" type="password" autocomplete="new-password" minlength="10" maxlength="128" required :disabled="busy"/></label>
      <label>Название салона или компании<input v-model.trim="form.companyName" minlength="2" maxlength="160" autocomplete="organization" required :disabled="busy"/></label>
      <div class="sb-auth-row"><label>ИНН<input v-model.trim="form.inn" inputmode="numeric" pattern="[0-9]{10}|[0-9]{12}" maxlength="12" autocomplete="off" :disabled="busy"/></label><label>КПП<input v-model.trim="form.kpp" inputmode="numeric" pattern="[0-9]{9}" maxlength="9" autocomplete="off" :disabled="busy"/></label></div><label>Юридический адрес<input v-model.trim="form.legalAddress" maxlength="500" autocomplete="street-address" :disabled="busy"/></label>
      <p v-if="termsLoading" role="status">Загружаем условия регистрации…</p><button v-else-if="!terms" type="button" @click="loadTerms">Повторить загрузку условий</button>
      <label class="sb-auth-consent"><input v-model="consent" type="checkbox" required :disabled="busy||!terms"/><span>Принимаю <NuxtLink to="/privacy" target="_blank">политику конфиденциальности</NuxtLink> и <NuxtLink to="/oferta" target="_blank">публичную оферту</NuxtLink>.</span></label>
      <p class="sb-business-registration-note">Данные компании проверит команда SARKISIAN. Для бизнес-аккаунта используйте отдельные email и телефон.</p><p v-if="error" class="sb-form-error" role="alert">{{error}}</p><button class="sb-liquid-primary" type="submit" :disabled="busy||!consent||!terms">{{busy?'Отправляем…':'Зарегистрировать бизнес'}}<ArrowRight :size="18"/></button>
     </form>
    </div>
   </aside>
  </div>
 </Transition></Teleport>
</template>
