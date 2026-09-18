<script setup lang="ts">
const route=useRoute();
useHead({title:'Онлайн-запись — SARKISIAN',meta:[{name:'robots',content:'noindex,nofollow'}]});
</script>
<template><SalonBookingForm :organization-id="String(route.params.organizationId)" :embedded="route.query.embed==='1'"/></template>
