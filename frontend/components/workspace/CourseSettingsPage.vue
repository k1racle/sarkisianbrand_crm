<script setup lang="ts">
import { BookOpen, Radio, ShieldCheck } from '@lucide/vue';
import EcosystemIntegrations from '~/components/EcosystemIntegrations.vue';

const session = useWorkspaceSession();
const access = useWorkspaceAccess();
const canManageIntegrations = computed(() => session.user.value?.role === 'ADMIN' && access.can('system.manage'));
const status = ref<{ purchasingAvailable: boolean; liveAvailable: boolean } | null>(null);
const loading = ref(true), error = ref('');
let generation = 0;

async function loadStatus() {
  const request = ++generation;
  loading.value = true; error.value = '';
  try {
    const data = await session.request<{ purchasingAvailable: boolean; liveAvailable: boolean }>('/lms/catalog?limit=1');
    if (request !== generation) return;
    if (typeof data?.purchasingAvailable !== 'boolean' || typeof data?.liveAvailable !== 'boolean') throw new Error('Invalid status');
    status.value = data;
  } catch {
    if (request === generation) { status.value = null; error.value = 'Не удалось проверить состояние курсов. Попробуйте обновить страницу.'; }
  } finally { if (request === generation) loading.value = false; }
}
onMounted(loadStatus);
onBeforeUnmount(() => { generation++; });
</script>

<template>
  <section class="crm-management-workspace course-workspace course-settings">
    <header class="crm-page-header"><div><h1>Настройки обучения</h1><p>Оплата курсов, чеки и состояние прямых трансляций.</p></div></header>
    <p v-if="loading" class="course-hint" role="status">Проверяем состояние обучения…</p>
    <div v-else-if="error" class="course-error" role="alert">{{ error }} <button type="button" class="crm-button" @click="loadStatus">Повторить</button></div>
    <div v-else-if="status" class="course-settings-status">
      <article class="crm-surface"><BookOpen :size="19" aria-hidden="true"/><div><strong>Продажа курсов</strong><p>{{ status.purchasingAvailable ? 'Разрешена настройками сервера' : 'Выключена в настройках сервера' }}</p><small>Для оплаты также необходимы проверенный провайдер и параметры чека.</small></div></article>
      <article class="crm-surface"><Radio :size="19" aria-hidden="true"/><div><strong>Онлайн-трансляции</strong><p>{{ status.liveAvailable ? 'Доступны' : 'Пока недоступны' }}</p><small>Управление эфирами доступно сотрудникам с правом изменения курсов.</small></div><NuxtLink v-if="access.can('lms.write')" to="/crm/course-live" class="crm-button">К трансляциям</NuxtLink></article>
    </div>
    <div class="course-notice" role="note"><ShieldCheck :size="18" aria-hidden="true"/><span>Данные ИП, налоговый режим и параметры чека указываются для каждого платёжного провайдера после сверки с бухгалтером. Изменения подключения влияют и на другие продажи сайта.</span></div>
    <EcosystemIntegrations v-if="canManageIntegrations" course-payments-only />
    <div v-else class="course-settings-restricted crm-surface"><strong>Настройки оплаты доступны администратору</strong><p>Попросите администратора настроить платёжные подключения и чеки для курсов.</p></div>
  </section>
</template>
