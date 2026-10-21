<script setup lang="ts">
import { colorHex, type Nail } from './model'
import type { NailGeometry } from './nail-art'
defineProps<{ nail: Nail; geometry: NailGeometry; glossId: string }>()
</script>
<template>
  <g v-if="nail.color">
    <path :d="geometry.path" :fill="colorHex(nail.color)"/>
    <path :d="geometry.path" :fill="`url(#${glossId})`"/>
    <ellipse v-if="nail.pattern === 'french'" :cx="geometry.x + geometry.w / 2" :cy="geometry.y - geometry.h * .1" :rx="geometry.w * .8" :ry="geometry.h * .26" fill="#fffaf3"/>
    <g v-if="nail.pattern === 'dots'" fill="#fffaf3"><circle v-for="k in 3" :key="k" :cx="geometry.x + geometry.w * .5" :cy="geometry.y + geometry.h * (.14 + k * .18)" :r="geometry.w * .05"/></g>
    <path v-if="nail.pattern === 'gold'" :d="`M${geometry.x} ${geometry.y + geometry.h * .8} C${geometry.x + geometry.w} ${geometry.y + geometry.h * .7} ${geometry.x} ${geometry.y + geometry.h * .35} ${geometry.x + geometry.w} ${geometry.y + geometry.h * .2}`" fill="none" stroke="#d9b15d" :stroke-width="Math.max(2, geometry.w * .055)"/>
  </g>
</template>
