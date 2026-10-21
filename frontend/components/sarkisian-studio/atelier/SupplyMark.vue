<script setup lang="ts">
import { useId } from 'vue'
import { supplyById, type SupplyId } from './supplies'
defineProps<{ id: SupplyId }>()
const fillId = `supply-${useId()}`
</script>
<template>
  <svg class="at-supply-mark" viewBox="0 0 120 130" aria-hidden="true">
    <defs><linearGradient :id="fillId"><stop stop-color="#44413e"/><stop offset=".35" stop-color="#242525"/><stop offset=".75" stop-color="#343331"/><stop offset="1" stop-color="#1d1f1f"/></linearGradient></defs>
    <ellipse cx="61" cy="119" rx="44" ry="5" fill="#6e62591a"/>
    <g :fill="`url(#${fillId})`" stroke="#3f3a34" stroke-width=".9">
      <template v-if="supplyById(id)?.bottle"><path d="M46 14Q60 11 74 14L73 66H47Z"/><path d="M47 65Q28 65 28 78V109Q28 119 39 119H81Q92 119 92 109V78Q92 65 73 65Z"/></template>
      <template v-else><path d="M17 72H103V105Q103 119 60 119Q17 119 17 105Z"/><path d="M16 63Q60 54 104 63V79Q60 88 16 79Z"/><ellipse cx="60" cy="63" rx="44" ry="8" fill="#514b45"/></template>
    </g>
    <text x="60" y="94" fill="#f5e8d4" text-anchor="middle" font-family="Arial,sans-serif" :font-size="id === 'polish' ? 6.5 : 8" letter-spacing="1.4">SARKISIAN</text>
    <text x="60" y="101" fill="#d4c5b1" text-anchor="middle" font-family="Arial,sans-serif" font-size="3.7" letter-spacing=".8">{{ supplyById(id)?.label }}</text>
    <rect x="48" y="106" width="24" height="4" rx="2" :fill="supplyById(id)?.shade"/>
  </svg>
</template>
