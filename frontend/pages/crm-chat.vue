<script setup lang="ts">
const { openChat } = usePlatformChat();
onMounted(async()=>{openChat();await navigateTo('/workspace',{replace:true})});
</script>
<template><WorkspaceLoading label="Открываем чат платформы"/></template>
