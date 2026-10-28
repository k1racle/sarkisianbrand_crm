<script setup lang="ts">
import { Rows3 } from '@lucide/vue';
const { density, toggleDensity } = useCrmDensity();
</script>
<template>
  <button type="button" class="crm-icon-button crm-density-toggle" :aria-pressed="density === 'compact'" :aria-label="density === 'compact' ? 'Плотность: компактная. Включить свободный вид' : 'Плотность: свободная. Включить компактный вид'" :title="density === 'compact' ? 'Включить свободный вид' : 'Включить компактный вид'" @click="toggleDensity"><Rows3 :size="17" aria-hidden="true" /><span>{{ density === 'compact' ? 'Компактно' : 'Свободно' }}</span></button>
</template>
