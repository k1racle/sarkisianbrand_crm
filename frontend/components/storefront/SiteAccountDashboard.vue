<script setup lang="ts">
import { ArrowRight, Award, Bell, Gift, LogOut, MapPin, Package, Settings, UserRound } from '@lucide/vue';
import { Users as UsersIcon } from '@lucide/vue';
const config = useRuntimeConfig();
const route = useRoute();
const { accessToken, refreshToken, user, authHeaders, loadMe, logout } = useStorefront();
const { openAuth } = useStorefrontPanels();
const active = ref('overview'), loading = ref(true), error = ref('');
const dashboard = ref<any>(null), profile = ref<any>(null);
const passwordNotice = ref(false);
const authNotice = ref('');
const requestedTab = computed(() => typeof route.query.tab === 'string' ? route.query.tab : '');
const requestedPartner = computed(() => ['referrals', 'bloggers'].includes(requestedTab.value));
const partnerTitle = computed(() => requestedTab.value === 'bloggers' ? 'Кабинет блогера' : 'Реферальная программа');
const isB2C = computed(() => profile.value?.role === 'CUSTOMER_B2C');
const hasLoyalty = computed(() => isB2C.value && !!dashboard.value?.loyalty && dashboard.value.loyalty.isEligible !== false);
const roleLink = computed(() => profile.value?.role === 'CUSTOMER_B2B' ? { to: '/b2b', label: 'Профессиональный кабинет' } : { to: '/workspace', label: 'Рабочее пространство' });
const tabs = computed(() => [{ id: 'overview', label: 'Обзор', icon: UserRound }, { id: 'orders', label: 'Мои заказы', icon: Package }, { id: 'giftcards', label: 'Подарочные карты', icon: Gift }, ...(hasLoyalty.value ? [{ id: 'loyalty', label: 'Бонусы', icon: Award }] : []), ...(isB2C.value?[{id:'referrals',label:'Пригласить друзей',icon:UsersIcon},{id:'bloggers',label:'Блогерам',icon:Award}]:[]), { id: 'addresses', label: 'Адреса', icon: MapPin }, { id: 'profile', label: 'Мои данные', icon: Settings }, { id: 'notifications', label: 'Уведомления', icon: Bell }]);
watch(hasLoyalty, eligible => { if (!eligible && active.value === 'loyalty') active.value = 'overview'; });
function selectRequestedTab() {
  const requested = requestedTab.value;
  active.value = tabs.value.some(tab => tab.id === requested) ? requested : 'overview';
}
function openRequestedEntry() {
  selectRequestedTab();
  if (requestedPartner.value && !accessToken.value) openAuth('login');
}
watch(() => route.query.tab, () => { if (!loading.value) openRequestedEntry(); });
function selectTab(id: string) {
  active.value = id;
  return navigateTo({ path: '/account', query: { ...route.query, tab: id } }, { replace: true });
}
function switchToCustomer() { signOut(); openAuth('login'); }
async function load() {
  loading.value = true; error.value = '';
  try {
    const hadSession = !!accessToken.value;
    await loadMe(); if (!accessToken.value) { if (hadSession) authNotice.value = 'Сеанс завершён. Войдите снова, чтобы открыть кабинет.'; return; }
    const fetchAccount = () => Promise.all([$fetch('/storefront/dashboard', { baseURL: config.public.apiBase, headers: authHeaders.value }), $fetch('/auth/profile', { baseURL: config.public.apiBase, headers: authHeaders.value })]);
    let values;
    try { values = await fetchAccount(); } catch (exception: any) {
      if (Number(exception?.statusCode || exception?.status) !== 401 || !refreshToken.value) throw exception;
      const session = await $fetch<any>('/auth/refresh', { baseURL: config.public.apiBase, method: 'POST', body: { refreshToken: refreshToken.value } });
      accessToken.value = session.accessToken; refreshToken.value = session.refreshToken;
      await loadMe(); if (!accessToken.value) return;
      values = await fetchAccount();
    }
    dashboard.value = values[0]; profile.value = values[1];
    selectRequestedTab();
  } catch (exception: any) {
    if ([401, 403].includes(Number(exception?.statusCode || exception?.status))) { authNotice.value = 'Сеанс завершён или нет доступа к профилю. Войдите снова, чтобы открыть кабинет.'; signOut(); }
    else error.value = 'Не удалось загрузить кабинет. Попробуйте ещё раз.';
  }
  finally { loading.value = false; openRequestedEntry(); }
}
function updateProfile(value: any) { profile.value = { ...profile.value, ...value }; if (user.value) user.value = { ...user.value, ...value }; }
function signOut() { logout(); dashboard.value = null; profile.value = null; }
function passwordChanged() { passwordNotice.value = true; signOut(); }
onMounted(load);
watch(accessToken, (token, previous) => { if (token && !previous) load(); });
const number = (value: any) => Number(value || 0).toLocaleString('ru-RU');
</script>
<template>
  <div class="sb-account-page sa-ui">
    <div v-if="loading" class="sa-panel" role="status">Загружаем личный кабинет…</div>
    <section v-else-if="!accessToken" class="sa-panel"><h1>{{ requestedPartner ? partnerTitle : 'Личный кабинет' }}</h1><p v-if="passwordNotice" class="sa-feedback" role="status">Пароль изменён. Все сеансы завершены. Войдите с новым паролем.</p><p v-else-if="authNotice" class="sa-feedback" role="status">{{ authNotice }}</p><p v-else-if="requestedPartner">Войдите или зарегистрируйтесь как частный покупатель. После входа откроется нужный раздел: здесь можно принять условия и получить персональную ссылку.</p><p v-else>Войдите, чтобы видеть свои заказы, бонусы и сохранённые адреса.</p><div class="sa-actions"><button class="sa-button" @click="openAuth('login')">Войти <ArrowRight :size="20" /></button><button class="sa-button sa-secondary" @click="openAuth('register')">Зарегистрироваться <ArrowRight :size="20" /></button></div></section>
    <section v-else-if="error" class="sa-panel"><p role="alert">{{ error }}</p><button class="sa-button" @click="load">Повторить загрузку <ArrowRight :size="20" /></button></section>
    <template v-else-if="dashboard && profile">
      <header class="sb-account-head"><div><p>ЛИЧНЫЙ КАБИНЕТ</p><h1>{{ profile.firstName ? `${profile.firstName}, добрый день` : 'Добрый день' }}</h1><span>{{ hasLoyalty ? 'Покупки, бонусы и ваши данные — в одном месте.' : 'Заказы, адреса и ваши данные — в одном месте.' }}</span></div><div v-if="hasLoyalty" class="sb-loyalty-mini"><Award :size="24" /><span><small>Бонусный баланс</small><b>{{ number(dashboard.loyalty.balance) }} бонусов</b></span></div><NuxtLink v-else-if="!isB2C" :to="roleLink.to" class="sa-button sa-secondary">{{ roleLink.label }} <ArrowRight :size="20" /></NuxtLink></header>
      <section v-if="requestedPartner && !isB2C" class="sa-panel" role="note"><h2>{{ partnerTitle }}</h2><p>Этот раздел доступен частным покупателям. Сейчас вы вошли {{ profile.role === 'CUSTOMER_B2B' ? 'как бизнес-клиент' : 'как сотрудник' }}. Для участия нужен отдельный аккаунт покупателя.</p><button class="sa-button sa-secondary" @click="switchToCustomer">Сменить аккаунт и войти как покупатель <ArrowRight :size="20" /></button></section>
      <div class="sb-account-layout"><nav class="sb-account-nav" aria-label="Разделы личного кабинета"><button v-for="tab in tabs" :key="tab.id" :class="{ active: active === tab.id }" :aria-current="active === tab.id ? 'page' : undefined" @click="selectTab(tab.id)"><component :is="tab.icon" :size="20" />{{ tab.label }}</button><button @click="signOut"><LogOut :size="20" />Выйти</button></nav><section class="sb-account-content" :aria-label="tabs.find(tab => tab.id === active)?.label">
        <template v-if="active === 'overview'"><div class="sa-summary"><article class="sa-panel"><Package :size="24" /><span>Заказы в истории</span><b>{{ dashboard.summary.orders }}</b></article><article class="sa-panel"><Package :size="24" /><span>Сумма заказов</span><b>{{ number(dashboard.summary.spent) }} ₽</b></article><article v-if="hasLoyalty" class="sa-panel"><Award :size="24" /><span>Уровень клуба</span><b>{{ dashboard.loyalty.levelLabel }}</b></article></div><SiteAccountOrders :orders="dashboard.orders.slice(0, 3)" title="Последние заказы" @updated="load" /><button v-if="dashboard.orders.length > 3" class="sa-button sa-secondary" @click="active = 'orders'">Все заказы <ArrowRight :size="20" /></button></template>
        <SiteAccountOrders v-else-if="active === 'orders'" :orders="dashboard.orders" title="Мои заказы" @updated="load" />
        <SiteAccountGiftCards v-else-if="active === 'giftcards'" :cards="dashboard.giftCards || []" />
        <SitePartnerAccount v-else-if="active==='referrals'&&isB2C" kind="REFERRAL"/>
        <SitePartnerAccount v-else-if="active==='bloggers'&&isB2C" kind="BLOGGER"/>
        <section v-else-if="active === 'loyalty' && hasLoyalty" class="sa-panel">
          <p class="sa-eyebrow">{{ dashboard.loyalty.programName || 'SARKISIAN CLUB' }}</p><h2>{{ number(dashboard.loyalty.balance) }} бонусов</h2><p>Ваш уровень: {{ dashboard.loyalty.levelLabel }}.</p>
          <p v-if="dashboard.loyalty.isEnabled === false" class="sa-feedback" role="status">Бонусная программа временно отключена. Ваш баланс и история сохранены.</p>
          <p v-else-if="dashboard.loyalty.earnPercent != null">Базовое начисление — {{ dashboard.loyalty.earnPercent }}% от покупки. Бонусами можно оплатить до {{ dashboard.loyalty.maxWriteOffPercent }}% суммы заказа по условиям клуба.</p>
          <div class="sa-progress" role="progressbar" aria-label="Прогресс уровня клуба" :aria-valuenow="Math.max(0, Math.min(100, dashboard.loyalty.progress))" :aria-valuemin="0" :aria-valuemax="100"><span :style="{ width: `${Math.max(0, Math.min(100, dashboard.loyalty.progress))}%` }" /></div>
          <p v-if="dashboard.loyalty.nextLevelLabel" class="sa-muted">До уровня «{{ dashboard.loyalty.nextLevelLabel }}» — {{ number(dashboard.loyalty.toNextLevel) }} бонусов.</p>
          <NuxtLink to="/club" class="sa-button sa-secondary">О клубе <ArrowRight :size="20" /></NuxtLink><h3>История бонусов</h3><p v-if="!dashboard.loyalty.entries?.length" class="sa-muted">Начисления и списания появятся здесь.</p><div v-else><article v-for="entry in dashboard.loyalty.entries" :key="entry.id" class="sa-history"><div>{{ entry.reason || 'Изменение бонусного баланса' }}<small>{{ new Date(entry.createdAt).toLocaleDateString('ru-RU') }}</small></div><b>{{ entry.amount > 0 ? '+' : '' }}{{ number(entry.amount) }}</b></article></div>
        </section>
        <SiteAccountAddresses v-else-if="active === 'addresses'" :addresses="dashboard.addresses" :profile="profile" @updated="dashboard.addresses = $event" />
        <SiteAccountNotifications v-else-if="active === 'notifications'" @updated="updateProfile" />
        <SiteAccountProfile v-else :profile="profile" @updated="updateProfile" @password-changed="passwordChanged" />
      </section></div>
    </template>
  </div>
</template>
