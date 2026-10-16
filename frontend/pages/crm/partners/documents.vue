<script setup lang="ts">
import PartnerDocumentsSettingsPage from '~/components/workspace/PartnerDocumentsSettingsPage.vue';
const { active } = useCrmNavigation();
useHead(() => ({ title: `${active.value?.label || 'Документы партнёров'} — SARKISIAN CRM` }));
</script>
<template><PartnerDocumentsSettingsPage/></template>
