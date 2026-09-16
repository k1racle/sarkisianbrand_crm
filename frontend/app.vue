<script setup lang="ts">
import WorkspaceContextMenu from './components/WorkspaceContextMenu.vue';
const route = useRoute();
const { token } = useWorkspaceSession();
const internalRoutes = ['/workspace', '/admin-workspace', '/media-library', '/crm', '/crm-pipeline', '/crm-customers', '/crm-organizations', '/crm-tasks', '/crm-chat', '/crm-marketplaces', '/leadership', '/helpdesk', '/system-settings'];
const isInternal = computed(() => internalRoutes.some(path => route.path === path || route.path.startsWith(`${path}/`)));
const showWorkspace = computed(() => isInternal.value && Boolean(token.value));
const b2bSession = useB2BSession();
const isB2B = computed(() => route.path === '/b2b' || route.path.startsWith('/b2b/'));
const showB2B = computed(() => isB2B.value && Boolean(b2bSession.token.value));
</script>

<template>
  <ClientOnly v-if="isInternal">
    <ConsoleRail v-if="showWorkspace" />
    <AdminProductEditor v-if="showWorkspace && route.path === '/admin-workspace'" />
    <AdminOrderDrawer v-if="showWorkspace && route.path === '/admin-workspace'" />
    <AdminNewProduct v-if="showWorkspace && route.path === '/admin-workspace'" />
    <WorkspaceContextMenu v-if="showWorkspace" />
    <PlatformChatDrawer v-if="showWorkspace" />
    <TaskReminderCenter v-if="showWorkspace" />
    <UserProfileDrawer v-if="showWorkspace" mode="workspace" />
    <div :class="{ 'workspace-frame': showWorkspace }"><NuxtPage /></div>
    <template #fallback><WorkspaceLoading /></template>
  </ClientOnly>
  <ClientOnly v-else-if="isB2B">
    <B2BPortalRail v-if="showB2B" />
    <WorkspaceContextMenu v-if="showB2B" />
    <UserProfileDrawer v-if="showB2B" mode="b2b" />
    <div :class="{ 'b2b-frame': showB2B }"><NuxtPage /></div>
    <template #fallback><WorkspaceLoading /></template>
  </ClientOnly>
  <NuxtPage v-else />
</template>

<style>
html,body,#__nuxt{margin:0;min-height:100%;overflow-x:clip}.workspace-frame{min-height:100vh;padding-left:250px;box-sizing:border-box;background:var(--sb-bg)}.workspace-frame>.admin-main,.workspace-frame>.site-admin-console,.workspace-frame>.crm-main,.workspace-frame>.marketplace-page,.workspace-frame>.simple-console,.workspace-frame>.simple-panel{margin:0!important;width:100%!important;max-width:none!important;box-sizing:border-box}.workspace-frame>.site-admin-console{padding:0!important}.product-drawer{display:none!important}.admin-main>.drawer-backdrop,.site-admin-console>.drawer-backdrop{display:none!important}@media(max-width:800px){.workspace-frame{padding-left:72px}}
.b2b-frame{min-height:100vh;padding-left:250px;box-sizing:border-box;background:var(--sb-bg)}@media(max-width:800px){.b2b-frame{padding-left:72px}}
</style>
