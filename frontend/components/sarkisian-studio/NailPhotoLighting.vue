<script setup lang="ts">
import {useId} from 'vue'
import {surfaceTransform,type AnatomyNail} from './anatomy'
defineProps<{imageUrl:string;geometry:AnatomyNail;matte?:boolean}>()
const uid=useId().replaceAll(':','')
</script>
<template>
 <g>
  <defs>
   <clipPath :id="`${uid}-native`"><path :d="geometry.path"/></clipPath>
   <filter :id="`${uid}-relief`" filterUnits="userSpaceOnUse" :x="geometry.x-3" :y="geometry.y-3" :width="geometry.w+6" :height="geometry.h+6" color-interpolation-filters="sRGB"><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncR type="linear" slope=".828" intercept="-.075"/><feFuncG type="linear" slope=".828" intercept="-.075"/><feFuncB type="linear" slope=".828" intercept="-.075"/></feComponentTransfer></filter>
   <filter :id="`${uid}-glints`" filterUnits="userSpaceOnUse" :x="geometry.x-3" :y="geometry.y-3" :width="geometry.w+6" :height="geometry.h+6" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  1.063 3.576 .361 0 -4.2"/></filter>
   <linearGradient :id="`${uid}-bed`" x2="0" y2="1"><stop stop-color="#000"/><stop offset=".18" stop-color="#000"/><stop offset=".28" stop-color="#fff"/><stop offset=".9" stop-color="#fff"/><stop offset="1" stop-color="#000"/></linearGradient>
   <mask :id="`${uid}-bed-mask`" maskUnits="userSpaceOnUse" x="0" y="0" width="1448" height="1086"><g :transform="surfaceTransform(geometry)"><rect width="100" height="100" :fill="`url(#${uid}-bed)`"/></g></mask>
  </defs>
  <g :clip-path="`url(#${uid}-native)`" pointer-events="none" style="mix-blend-mode:soft-light" opacity=".72"><image :href="imageUrl" width="1448" height="1086" :filter="`url(#${uid}-relief)`"/></g>
  <g v-if="!matte" :clip-path="`url(#${uid}-native)`" pointer-events="none"><image :href="imageUrl" width="1448" height="1086" :filter="`url(#${uid}-glints)`" :mask="`url(#${uid}-bed-mask)`" opacity=".52"/></g>
 </g>
</template>
