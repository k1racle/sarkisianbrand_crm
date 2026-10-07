<script setup lang="ts">
// Keep old bookmarks working without a separate workspace hub.
await navigateTo('/crm/', { replace: true });
</script>
<template><WorkspaceLoading label="Открываем CRM" /></template>