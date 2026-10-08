<script setup lang="ts">
import { Moon, Sun } from '@lucide/vue';
const { theme, toggleTheme } = useCrmTheme();
const label = computed(() => theme.value === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему');
</script>
<template>
  <button type="button" class="crm-icon-button crm-theme-toggle" :aria-label="label" :title="label" @click="toggleTheme">
    <Sun v-if="theme === 'dark'" :size="20" aria-hidden="true" />
    <Moon v-else :size="20" aria-hidden="true" />
  </button>
</template>
