<script setup lang="ts">
import { Award, BarChart3, Boxes, Cable, Headphones, Images, LayoutDashboard, Palette, Settings, ShoppingBag, Users } from '@lucide/vue';
withDefaults(defineProps<{ name?: string; size?: number }>(), { name: 'LayoutDashboard', size: 20 });
const icons = { Award, BarChart3, Boxes, Cable, Headphones, Images, LayoutDashboard, Palette, Settings, ShoppingBag, Users };
</script>

<template>
  <component :is="icons[name as keyof typeof icons] || LayoutDashboard" :size="size" aria-hidden="true" />
</template>
