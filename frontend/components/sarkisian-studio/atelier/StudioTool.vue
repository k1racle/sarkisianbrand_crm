<script setup lang="ts">
import { computed } from 'vue'
import { TOOLS, type ToolId } from './preparation'
const props = defineProps<{ tool: ToolId; active?: boolean }>()
const kind = computed(() => TOOLS.find(t => t.id === props.tool)?.kind)
</script>
<template>
  <svg class="at-real-tool" :class="{ working: active }" viewBox="0 0 80 160" aria-hidden="true" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <template v-if="kind === 'drill'">
      <path d="M40 10V47" stroke="#aeb8c2" stroke-width="7"/>
      <path v-if="tool === 'carbide'" d="M30 16Q29 5 40 4Q51 5 50 16L48 37H32Z" fill="#d2c4a7" stroke="#847766" stroke-width="2"/>
      <path v-else-if="tool === 'flame'" d="M40 3Q58 29 40 35Q22 29 40 3Z" fill="#b5bfc9" stroke="#75828f" stroke-width="2"/>
      <circle v-else cx="40" cy="18" r="12" fill="#bfccd3" stroke="#75828f" stroke-width="2"/>
      <path d="M27 50Q40 43 53 50L57 128Q57 143 40 144Q23 143 23 128Z" fill="#e4e8eb" stroke="#909ba3" stroke-width="2"/>
      <path d="M29 61H51M28 69H52M28 77H52M27 85H53" stroke="#929fa9" stroke-width="3"/>
      <path d="M40 144V158" stroke="#50545c" stroke-width="6"/>
    </template>
    <template v-else-if="kind === 'scissors'">
      <path d="M34 88L19 9Q33 17 42 78L58 9Q68 24 45 89" fill="#d8e0e7" stroke="#8b9aa4" stroke-width="2"/>
      <path d="M33 88L25 115M46 88L55 115" stroke="#c2cbd2" stroke-width="8"/>
      <ellipse cx="21" cy="132" rx="14" ry="20" stroke="#c6d1d8" stroke-width="7"/>
      <ellipse cx="58" cy="132" rx="14" ry="20" stroke="#c6d1d8" stroke-width="7"/>
      <circle cx="40" cy="83" r="4" fill="#727e87"/>
    </template>
    <template v-else-if="kind === 'file' || kind === 'buff'">
      <rect :x="kind === 'buff' ? 12 : 23" y="9" :width="kind === 'buff' ? 56 : 34" height="142" rx="15" :fill="kind === 'buff' ? '#c3adcc' : '#b7b7bd'" stroke="#89848e" stroke-width="3"/>
      <path d="M31 27H49M31 38H49M31 49H49M31 60H49M31 71H49M31 82H49M31 93H49M31 104H49M31 115H49M31 126H49" stroke="#ffffff55" stroke-width="2"/>
    </template>
    <template v-else-if="kind === 'pusher'">
      <path d="M40 40V137" stroke="#a5b3bf" stroke-width="10"/>
      <path d="M30 33Q18 2 40 4Q62 2 50 33L45 47H35Z" fill="#d0d9df" stroke="#8c9aa5" stroke-width="2"/>
      <path d="M40 136L35 155L46 149Z" fill="#c2cbd2"/>
      <path d="M35 65H45M35 74H45M35 83H45M35 92H45M35 101H45" stroke="#e8edf0" stroke-width="2"/>
    </template>
    <template v-else-if="kind === 'bottle'">
      <rect x="25" y="8" width="30" height="47" rx="5" fill="#2b2d31" stroke="#8c8d92" stroke-width="2"/>
      <rect x="15" y="55" width="50" height="93" rx="13" :fill="tool === 'base' ? '#ddd3c3' : '#a3c4cb'" stroke="#8d9a9e" stroke-width="2"/>
      <path d="M23 76H57V118H23Z" fill="#f9f6ef"/>
      <path d="M29 88H51M29 96H51M32 106H48" stroke="#626166" stroke-width="2"/>
    </template>
    <template v-else><ellipse cx="40" cy="83" rx="34" ry="40" fill="#f4eee2" stroke="#c2b9a9" stroke-width="2"/><path d="M20 70Q40 55 60 73M19 88Q40 73 61 91M24 104Q40 94 56 107" stroke="#ddd6c9" stroke-width="2"/></template>
  </svg>
</template>
<style scoped>
.at-real-tool{display:block;width:100%;height:100%;overflow:visible;filter:drop-shadow(3px 6px 4px #0004)}.working{animation:tool-work .15s ease-in-out infinite alternate}@keyframes tool-work{to{transform:translate(2px,-2px) rotate(3deg)}}@media(prefers-reduced-motion:reduce){.working{animation:none}}
</style>
