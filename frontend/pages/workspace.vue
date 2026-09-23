<script setup lang="ts">
import { ArrowRight, ChevronDown, Star } from '@lucide/vue';
import { WORKSPACE_AREAS } from '~/composables/useWorkspaceNavigation';
const { user } = useWorkspaceSession();
const { groups, leaves, favorites, recent, start, toggleFavorite } = useWorkspaceNavigation();
const roleLabels: Record<string, string> = { ADMIN: 'Администратор платформы', CONTENT_MANAGER: 'Контент-менеджер', MANAGER_B2B: 'Менеджер B2B', MANAGER_SALES: 'Менеджер продаж', MARKETPLACE_MANAGER: 'Менеджер маркетплейсов', SUPERVISOR: 'Руководитель направления', EXECUTIVE: 'Руководитель компании', IT_SUPPORT: 'IT-поддержка', CURATOR: 'Куратор', WAREHOUSE: 'Сотрудник склада' };
const daily = computed(() => ['web-orders', 'channel-orders', 'products', 'tasks', 'appearance', 'tickets', 'leadership', 'media-library'].flatMap(id => leaves.value.filter(item => item.id === id)).slice(0, 4));
const groupIcon = (id: string) => groups.value.find(group => group.id === id)?.icon;
const spaces = computed(() => WORKSPACE_AREAS.map(space => ({ ...space, items: leaves.value.filter(item => (space.groupIds as readonly string[]).includes(item.groupId)) })).filter(space => space.items.length));
const date = new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'long' });
useHead({ title: 'Рабочий стол — SARKISIAN', meta: [{ name: 'robots', content: 'noindex, nofollow' }] });
</script>

<template>
  <main class="hub wn-hub">
    <header><div><p class="eyebrow">SARKISIAN WORKSPACE</p><h1>Рабочий стол</h1><span class="wn-hub-role">Добрый день, {{ user?.firstName || 'коллега' }} · {{ roleLabels[user?.role || ''] || 'Рабочее пространство' }}</span></div><div class="wn-hub-header-right"><time class="wn-hub-date">{{ date }}</time><NuxtLink v-if="start && start.id !== 'workspace'" :to="start.to" class="wn-hub-primary">Мой стартовый раздел <ArrowRight :size="20" /></NuxtLink></div></header>
    <section class="hub-body">
      <WorkspaceOverview />
      <section class="wn-hub-section"><div class="wn-section-heading"><div><p class="eyebrow">БЫСТРЫЕ ПЕРЕХОДЫ</p><h2>С чего начнём?</h2></div><p>Основные рабочие разделы для вашей роли.</p></div><div class="wn-daily-grid"><NuxtLink v-for="item in daily" :key="item.id" :to="item.to" class="wn-daily-card"><span class="wn-daily-top"><span class="wn-section-symbol"><WorkspaceSectionIcon :name="groupIcon(item.groupId)" /></span><span>{{ item.groupLabel }}</span></span><strong>{{ item.label }}</strong><ArrowRight :size="20" /></NuxtLink></div><p v-if="!daily.length" class="wn-hub-empty">Доступные разделы появятся после проверки учётной записи.</p></section>
      <section v-if="favorites.length || recent.length" class="wn-personal-grid"><article class="wn-personal-panel"><h2>Избранное</h2><p v-if="!favorites.length">Нажмите звезду рядом с названием раздела, чтобы сохранить быстрый переход.</p><div v-for="item in favorites" :key="item.id" class="wn-personal-row"><NuxtLink :to="item.to">{{ item.label }} <ArrowRight :size="18" /></NuxtLink><button type="button" class="wn-favorite-control" :aria-label="'Убрать из избранного: ' + item.label" @click="toggleFavorite(item.id)"><Star :size="18" /></button></div></article><article class="wn-personal-panel"><h2>Недавние разделы</h2><p v-if="!recent.length">Здесь появятся ваши последние переходы.</p><div v-for="item in recent.slice(0, 5)" :key="item.id" class="wn-personal-row"><NuxtLink :to="item.to">{{ item.label }} <ArrowRight :size="18" /></NuxtLink></div></article></section>
      <section class="wn-hub-section"><div class="wn-section-heading"><div><p class="eyebrow">РАЗДЕЛЫ ПЛАТФОРМЫ</p><h2>Рабочие пространства</h2></div><p>Вся работа команды — в CRM. Витрина и контент — в админке сайта.</p></div><div class="studio-space-grid"><article v-for="space in spaces" :key="space.id" class="studio-space"><header><span class="wn-section-symbol"><WorkspaceSectionIcon :name="space.icon" /></span><div><h3>{{ space.label }}</h3><p>{{ space.description }}</p></div><NuxtLink :to="space.items[0].to" :aria-label="'Открыть пространство ' + space.label"><ArrowRight :size="20" /></NuxtLink></header><details><summary>Разделы пространства <ChevronDown :size="16" /></summary><nav :aria-label="space.label"><NuxtLink v-for="item in space.items" :key="item.id" :to="item.to"><span>{{ item.label }}</span><ArrowRight :size="16" /></NuxtLink></nav></details></article></div></section>
      <aside class="wn-personal-note"><p>Избранное и стартовый раздел сохраняются в этом браузере отдельно для вашей учётной записи. Быстрый поиск разделов — Ctrl K.</p></aside>
    </section>
  </main>
</template>
