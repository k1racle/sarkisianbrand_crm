<script setup lang="ts">
import WorkspaceContextMenu from './components/WorkspaceContextMenu.vue';
const route = useRoute();
const { token } = useWorkspaceSession();
const internalRoutes = ['/workspace', '/admin-workspace', '/crm', '/crm-customers', '/crm-organizations', '/crm-tasks', '/crm-marketplaces', '/leadership', '/helpdesk', '/system-settings'];
const isInternal = computed(() => internalRoutes.some(path => route.path === path || route.path.startsWith(`${path}/`)));
const showWorkspace = computed(() => isInternal.value && Boolean(token.value));
</script>

<template>
  <ClientOnly v-if="isInternal">
    <ConsoleRail v-if="showWorkspace" />
    <AdminProductEditor v-if="showWorkspace && route.path === '/admin-workspace'" />
    <AdminOrderDrawer v-if="showWorkspace && route.path === '/admin-workspace'" />
    <AdminNewProduct v-if="showWorkspace && route.path === '/admin-workspace'" />
    <WorkspaceContextMenu v-if="showWorkspace" />
    <div :class="{ 'workspace-frame': showWorkspace }"><NuxtPage /></div>
    <template #fallback><WorkspaceLoading /></template>
  </ClientOnly>
  <NuxtPage v-else />
</template>

<style>
html,body,#__nuxt{margin:0;min-height:100%;overflow-x:hidden}.workspace-frame{min-height:100vh;padding-left:250px;box-sizing:border-box;background:var(--sb-bg)}.workspace-frame>.admin-main,.workspace-frame>.site-admin-console,.workspace-frame>.crm-main,.workspace-frame>.marketplace-page,.workspace-frame>.simple-console,.workspace-frame>.simple-panel{margin:0!important;width:100%!important;max-width:none!important;box-sizing:border-box}.workspace-frame>.site-admin-console{padding:0!important}.product-drawer{display:none!important}.admin-main>.drawer-backdrop,.site-admin-console>.drawer-backdrop{display:none!important}@media(max-width:800px){.workspace-frame{padding-left:72px}}
</style>
