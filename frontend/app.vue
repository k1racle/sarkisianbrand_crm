<script setup lang="ts">
import WorkspaceContextMenu from './components/WorkspaceContextMenu.vue';
const route = useRoute();
const { token } = useWorkspaceSession();
const { railCollapsed } = useWorkspaceLayout();
const internalRoutes = ['/workspace', '/admin-workspace', '/media-library', '/crm', '/crm-pipeline', '/crm-customers', '/crm-organizations', '/crm-tasks', '/crm-chat', '/crm-marketplaces', '/leadership', '/helpdesk', '/system-settings'];
const isInternal = computed(() => internalRoutes.some(path => route.path === path || route.path.startsWith(`${path}/`)));
const showWorkspace = computed(() => isInternal.value && Boolean(token.value));
const isStoreWorkspace = computed(() => route.path === '/admin-workspace' || route.path.startsWith('/admin-workspace/'));
const b2bSession = useB2BSession();
const isB2B = computed(() => route.path === '/b2b' || route.path.startsWith('/b2b/'));
const showB2B = computed(() => isB2B.value && Boolean(b2bSession.token.value));
</script>

<template>
  <ClientOnly v-if="isInternal">
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
