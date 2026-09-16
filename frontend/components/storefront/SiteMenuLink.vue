<script setup lang="ts">
import { ArrowRight } from '@lucide/vue';
defineProps<{ item: { label: string; url: string; newTab?: boolean }; arrow?: boolean }>();
const emit = defineEmits<{ activate: [] }>();
const pressed = ref(false);
</script>

<template>
  <NuxtLink class="sb-menu-link" :class="{ 'is-pressed': pressed }" :to="item.url" :external="/^https?:\/\//i.test(item.url)" :target="item.newTab ? '_blank' : undefined" :rel="item.newTab ? 'noopener noreferrer' : undefined" @pointerdown="pressed = $event.pointerType === 'touch'" @pointerup="pressed = false" @pointercancel="pressed = false" @pointerleave="pressed = false" @blur="pressed = false" @click="pressed = false; emit('activate')"><span>{{ item.label }}</span><ArrowRight v-if="arrow" class="sb-menu-link__arrow" :size="18" aria-hidden="true" /></NuxtLink>
</template>
