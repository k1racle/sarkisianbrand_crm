<script setup lang="ts">
const route=useRoute();
useHead({title:'Приглашение в SARKISIAN',meta:[{name:'robots',content:'noindex, nofollow'}]});
</script>
<template><SiteShell><SitePartnerLink :code="String(route.params.code)"/></SiteShell></template>
