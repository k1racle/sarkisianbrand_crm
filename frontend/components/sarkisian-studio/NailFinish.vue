<script setup lang="ts">
import { computed, useId } from 'vue'
import { colorHex, type Nail } from './model'
import type { NailGeometry } from './nail-art-geometry'
import { nailMarks } from './nail-effects'
import { surfaceTransform } from './anatomy'
const props = defineProps<{ nail: Nail; geometry: NailGeometry; glossId: string; photographic?:boolean }>()
const uid = useId().replaceAll(':', '')
const marks = computed(() => nailMarks(props.nail))
const gradient = computed(() => props.nail.pattern === 'ombre' || props.nail.pattern === 'aura' || props.nail.finish === 'chrome')
</script>
<template>
  <g v-if="nail.color">
    <defs>
      <linearGradient :id="`${uid}-blend`" x1="0" y1="0" :x2="nail.finish === 'chrome' ? '1' : '0'" :y2="nail.finish === 'chrome' ? '0' : '1'"><stop :stop-color="colorHex(nail.color)"/><stop :offset="nail.finish === 'chrome' ? '.4' : '1'" :stop-color="nail.finish === 'chrome' ? '#fff3dc' : colorHex(nail.accentColor ?? 'porcelain')"/><stop v-if="nail.finish === 'chrome'" offset="1" :stop-color="colorHex(nail.color)"/></linearGradient>
      <radialGradient :id="`${uid}-aura`"><stop :stop-color="colorHex(nail.accentColor ?? 'porcelain')"/><stop offset="1" :stop-color="colorHex(nail.color)"/></radialGradient>
      <radialGradient :id="`${uid}-curvature`" cx="50%" cy="45%" r="75%"><stop stop-color="#ffffff0c"/><stop offset=".6" stop-color="#0000"/><stop offset="1" stop-color="#0005"/></radialGradient>
      <filter :id="`${uid}-soft-sheen`" x="-30%" y="-20%" width="160%" height="140%"><feGaussianBlur stdDeviation=".8"/></filter>
    </defs>
    <path :d="geometry.path" :fill="gradient ? `url(#${uid}-${nail.pattern === 'aura' ? 'aura' : 'blend'})` : colorHex(nail.color)" opacity=".98"/>
    <g :transform="surfaceTransform(geometry)"><component :is="mark.tag" v-for="(mark, index) in marks" :key="index" v-bind="mark.attrs"/><rect x="0" y="0" width="100" height="100" :fill="`url(#${uid}-curvature)`"/><g v-if="nail.finish !== 'matte' && !photographic" fill="none" stroke="#fff" stroke-linecap="round"><path d="M27 20C20 32 20 54 24 68" stroke-width="4" opacity=".38" :filter="`url(#${uid}-soft-sheen)`"/><path d="M27 22Q23 31 23 42" stroke-width="1.2" opacity=".55"/></g></g>
  </g>
</template>
