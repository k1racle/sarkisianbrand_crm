<script setup lang="ts">
import KeriAvatar from './KeriAvatar.vue'
import type { KeriLook } from './look.ts'
defineProps<{ look: KeriLook; assetBase: string; label: string; selected: boolean; crop: 'hair' | 'top' | 'bottom' | 'look' }>()
defineEmits<{ select: [] }>()
</script>

<template>
  <button class="kw-choice" :class="{ selected }" :aria-label="label" :aria-pressed="selected" @click="$emit('select')">
    <span class="kw-choice-picture" :class="`crop-${crop}`" aria-hidden="true"><KeriAvatar :look="look" :asset-base="assetBase" :width="260" /></span>
    <span class="kw-choice-label">{{ label }}</span>
    <span v-if="selected" class="kw-choice-check" aria-hidden="true">✓</span>
  </button>
</template>
