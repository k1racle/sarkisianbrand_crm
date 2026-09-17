<script setup lang="ts">
import { BarChart3, CalendarDays, ChevronDown, CircleHelp, ClipboardList, LogOut, PackageSearch, Scissors, Settings, ShoppingBag, Users } from '@lucide/vue';
const route = useRoute(); const config = useRuntimeConfig(); const { user, logout } = useB2BSession(); const { openProfile } = useUserProfilePanel(); const open = ref(false);
const items = [
  { id:'dashboard',label:'Обзор бизнеса',icon:BarChart3 }, { id:'calendar',label:'Записи',icon:CalendarDays },
  { id:'clients',label:'Мои клиенты',icon:Users }, { id:'services',label:'Услуги и цены',icon:Scissors },
  { id:'catalog',label:'Закупить товары',icon:PackageSearch }, { id:'orders',label:'Мои заказы',icon:ShoppingBag },
  { id:'team',label:'Команда',icon:ClipboardList }, { id:'support',label:'Поддержка',icon:CircleHelp },
];
const section=computed(()=>String(route.query.section||'dashboard'));
async function signOut(){const failure=await navigateTo('/b2b-login');if(!failure)logout();}
onMounted(()=>{if(user.value?.forcePasswordChange)openProfile()});
watch(()=>user.value?.forcePasswordChange,(required)=>{if(required)openProfile()});
</script>
<template><aside data-v-ui-4da4dbf479f1 class="b2b-rail"><NuxtLink data-v-ui-4da4dbf479f1 to="/b2b" class="brand"><img data-v-ui-4da4dbf479f1 src="/sarkisian-logo.png" alt="SARKISIAN" /></NuxtLink><button data-v-ui-4da4dbf479f1 class="company" @click="open=!open"><Settings data-v-ui-4da4dbf479f1 :size="17"/><span data-v-ui-4da4dbf479f1><small data-v-ui-4da4dbf479f1>КАБИНЕТ ПАРТНЁРА</small><strong data-v-ui-4da4dbf479f1>B2B-кабинет</strong></span><ChevronDown data-v-ui-4da4dbf479f1 :size="14"/></button><div data-v-ui-4da4dbf479f1 v-if="open" class="company-note">Управление салоном, клиентами, записью и закупками в одном месте.</div><nav data-v-ui-4da4dbf479f1><NuxtLink data-v-ui-4da4dbf479f1 v-for="item in items" :key="item.id" :to="item.id==='dashboard'?'/b2b':`/b2b?section=${item.id}`" :class="{active:section===item.id}"><component data-v-ui-4da4dbf479f1 :is="item.icon" :size="18"/><span data-v-ui-4da4dbf479f1>{{item.label}}</span></NuxtLink></nav><div data-v-ui-4da4dbf479f1 class="bottom"><NuxtLink data-v-ui-4da4dbf479f1 to="/"><ShoppingBag data-v-ui-4da4dbf479f1 :size="17"/><span data-v-ui-4da4dbf479f1>Открыть магазин</span></NuxtLink><button data-v-ui-4da4dbf479f1 @click="signOut"><LogOut data-v-ui-4da4dbf479f1 :size="17"/><span data-v-ui-4da4dbf479f1>Выйти</span></button><button data-v-ui-4da4dbf479f1 class="person" title="Открыть профиль" @click="openProfile"><i data-v-ui-4da4dbf479f1><img data-v-ui-4da4dbf479f1 v-if="user?.avatarUrl" :src="new URL(user.avatarUrl,config.public.apiBase).toString()" alt=""/><template v-else>{{(user?.firstName||user?.email||'B').slice(0,1).toUpperCase()}}</template></i><span data-v-ui-4da4dbf479f1><b data-v-ui-4da4dbf479f1>{{[user?.firstName,user?.lastName].filter(Boolean).join(' ')||'Партнёр'}}</b><small data-v-ui-4da4dbf479f1>{{user?.email}}</small></span></button></div></aside></template>


