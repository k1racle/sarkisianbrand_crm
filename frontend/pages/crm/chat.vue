<script setup lang="ts">
const { openChat } = usePlatformChat();
const { home } = useCrmNavigation();
onMounted(async()=>{await navigateTo(home.value,{replace:true});openChat();});
</script>
<template><WorkspaceLoading label="Открываем чат платформы"/></template>
