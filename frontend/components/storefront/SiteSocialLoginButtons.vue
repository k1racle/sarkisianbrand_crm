<script setup lang="ts">
const emit = defineEmits<{ select: [provider: 'yandex' | 'vk'] }>();
</script>
<template>
  <div class="sb-social-buttons">
    <button type="button" @click="emit('select', 'yandex')"><i class="sb-yandex-icon"><img src="/storefront/icons/yandex-id.svg" alt="" /></i> Яндекс ID</button>
    <button type="button" @click="emit('select', 'vk')"><i class="sb-social-icon sb-social-icon--vk"><img src="/storefront/icons/vk-id.svg" alt="" /></i> VK ID</button>
  </div>
</template>
