<script setup lang="ts">
defineProps<{profile:any;formatPrice:(value:any)=>string}>();
const {path}=useBusinessWorkspace();
const statuses:Record<string,string>={ACTIVE:'Активна',PENDING:'На проверке',NEW:'На проверке',SUSPENDED:'Приостановлена',BLOCKED:'Заблокирована'};
</script>
<template>
  <article class="salon-organization" aria-label="Ваша организация">
    <div class="salon-organization-main"><small>Ваша организация</small><h2>{{profile.name}}</h2><p><span>ИНН {{profile.inn||'не указан'}}</span><span>{{profile.legalAddress||'Адрес не указан'}}</span></p><NuxtLink :to="path('team')">Команда и доступы <span aria-hidden="true">→</span></NuxtLink></div>
    <div class="salon-organization-details"><span class="salon-organization-status">{{statuses[profile.status]||'Статус не указан'}}</span><div v-if="profile.membership?.canSeeFinance" class="salon-organization-finance"><div><small>Уровень скидки</small><strong>{{profile.discountTier===null?'—':`${profile.discountTier||0}%`}}</strong></div><div><small>Лимит закупок</small><strong>{{formatPrice(profile.creditLimit)}}</strong></div></div></div>
  </article>
</template>
