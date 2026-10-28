<script setup lang="ts">
import WorkspaceContextMenu from './components/WorkspaceContextMenu.vue';
import { isCrmPath } from '~/shared/crm-workspace';
const route = useRoute();
// Nuxt's deferred route keeps the existing page alive during a checked transition.
// The login exception also follows the live router so a revoked view cannot block it.
const liveRoute = useRouter().currentRoute;
const { token, refreshToken, sessionError, restoreUser } = useWorkspaceSession();
const restoringCrmSession = ref(false);
async function retryCrmSession() {
  if (restoringCrmSession.value) return;
  restoringCrmSession.value = true;
  try { await restoreUser(); } catch { /* The session retains a readable retry error. */ }
  finally { restoringCrmSession.value = false; }
}
const { railCollapsed } = useWorkspaceLayout();
const internalRoutes = ['/workspace', '/admin-workspace', '/media-library', '/crm', '/crm-pipeline', '/crm-customers', '/crm-organizations', '/crm-tasks', '/crm-chat', '/crm-marketplaces', '/leadership', '/helpdesk', '/system-settings'];
const isInternal = computed(() => internalRoutes.some(path => route.path === path || route.path.startsWith(`${path}/`)));
const isCrm = computed(() => isCrmPath(route.path));
const { theme } = useCrmTheme();
const { density } = useCrmDensity();
const showWorkspace = computed(() => isInternal.value && Boolean(token.value));
const isStoreWorkspace = computed(() => route.path === '/admin-workspace' || route.path.startsWith('/admin-workspace/'));
const b2bSession = useB2BSession();
const isB2B = computed(() => route.path === '/b2b' || route.path.startsWith('/b2b/'));
const showB2B = computed(() => isB2B.value && Boolean(b2bSession.token.value));
const isBusiness = computed(() => isB2B.value || ['/b2b-login', '/b2b-invite'].includes(route.path));
useHead(() => isCrm.value ? {
  htmlAttrs: { lang: 'ru', 'data-crm-ui': 'true', 'data-crm-theme': theme.value, 'data-crm-density': density.value, 'data-business-ui': null, 'data-business-theme': null },
  link: [{ rel: 'manifest', href: '/crm/manifest.webmanifest' }, { rel: 'apple-touch-icon', href: '/crm/pwa/icon-180.png?v=brand2' }, { rel: 'icon', type: 'image/svg+xml', href: '/crm/pwa/icon.svg?v=brand2' }],
  meta: [{ name: 'theme-color', content: theme.value === 'dark' ? '#252629' : '#ffffff' }, { name: 'apple-mobile-web-app-capable', content: 'yes' }, { name: 'apple-mobile-web-app-title', content: 'SARKISIAN CRM' }, { name: 'robots', content: 'noindex, nofollow' }],
} : { htmlAttrs: { lang: 'ru', 'data-crm-ui': null, 'data-crm-theme': null, 'data-crm-density': null, 'data-business-ui': isBusiness.value ? 'true' : null, 'data-business-theme': isBusiness.value ? theme.value : null } });
</script>

<template>
  <ClientOnly v-if="isCrm">
    <LazyCrmShell v-if="token && route.path !== '/crm/login' && liveRoute.path !== '/crm/login'"><NuxtPage /></LazyCrmShell>
    <NuxtPage v-else-if="liveRoute.path === '/crm/login' || (token && route.path === '/crm/login')" />
    <main v-else class="crm-standard crm-session-ended">
      <section class="crm-surface" role="alert">
        <header class="crm-panel-header"><h1>{{refreshToken?'Не удалось проверить вход':'Сессия завершена'}}</h1></header>
        <div class="crm-register crm-stack">
          <p>{{refreshToken?(sessionError||'Проверьте соединение и повторите попытку. Данные входа сохранены.'):'Войдите снова, чтобы продолжить работу.'}}</p>
          <div class="crm-action-bar"><button v-if="refreshToken" type="button" class="crm-button" :disabled="restoringCrmSession" @click="retryCrmSession">{{restoringCrmSession?'Проверяем…':'Повторить проверку'}}</button><NuxtLink class="crm-button" :to="{path:'/crm/login',query:{redirect:route.fullPath}}">Войти в CRM</NuxtLink></div>
        </div>
      </section>
    </main>
    <template #fallback><WorkspaceLoading label="Открываем CRM" /></template>
  </ClientOnly>
  <ClientOnly v-else-if="isInternal">
    <ConsoleRail v-if="showWorkspace" />
    <AdminProductEditor v-if="showWorkspace && isStoreWorkspace" />
    <AdminOrderDrawer v-if="showWorkspace && isStoreWorkspace" />
    <AdminNewProduct v-if="showWorkspace && isStoreWorkspace" />
    <WorkspaceContextMenu v-if="showWorkspace" />
    <PlatformChatDrawer v-if="showWorkspace" />
    <TaskReminderCenter v-if="showWorkspace" />
    <UserProfileDrawer v-if="showWorkspace" mode="workspace" />
    <div :class="{ 'workspace-frame': showWorkspace, 'workspace-frame--collapsed': showWorkspace && railCollapsed }"><ClientOnly><WorkspaceToolbar v-if="showWorkspace" /></ClientOnly><NuxtPage /></div>
    <template #fallback><WorkspaceLoading /></template>
  </ClientOnly>
  <ClientOnly v-else-if="isB2B">
    <B2BPortalRail v-if="showB2B" />
    <WorkspaceContextMenu v-if="showB2B" />
    <UserProfileDrawer v-if="showB2B" mode="b2b" />
    <div :class="{ 'b2b-frame': showB2B, 'b2b-frame--collapsed': showB2B && railCollapsed }"><BusinessToolbar v-if="showB2B" /><NuxtPage /></div>
    <template #fallback><WorkspaceLoading /></template>
  </ClientOnly>
  <NuxtPage v-else />
</template>
