<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useId } from 'vue'

const faceId = `clock-face-${useId()}`
const now = ref<Date | null>(null)
let timer: ReturnType<typeof setTimeout> | undefined
const time = computed(() => now.value?.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) ?? '')
const angles = computed(() => {
  const date = now.value
  if (!date) return { hour: 0, minute: 0, second: 0 }
  const seconds = date.getSeconds()
  const minutes = date.getMinutes() + seconds / 60
  return { hour: (date.getHours() % 12 + minutes / 60) * 30, minute: minutes * 6, second: seconds * 6 }
})

function sync() {
  clearTimeout(timer)
  // Read wall time on every tick: background suspension and clock adjustments
  // must not accumulate drift or change the game's appointment-based shifts.
  now.value = new Date()
  if (!document.hidden) timer = setTimeout(sync, 1000 - Date.now() % 1000)
}
onMounted(() => {
  sync()
  document.addEventListener('visibilitychange', sync)
  window.addEventListener('pageshow', sync)
  window.addEventListener('focus', sync)
})
onBeforeUnmount(() => {
  clearTimeout(timer)
  document.removeEventListener('visibilitychange', sync)
  window.removeEventListener('pageshow', sync)
  window.removeEventListener('focus', sync)
})
</script>

<template>
  <svg v-if="now" class="at-wall-clock" viewBox="0 0 1536 1024" role="img" :aria-label="`Местное время: ${time}`">
    <title>Местное время: {{ time }}</title>
    <defs>
      <radialGradient :id="faceId" cx="35%" cy="32%" r="80%">
        <stop stop-color="#f7e7cb"/>
        <stop offset="1" stop-color="#e9cfae"/>
      </radialGradient>
    </defs>
    <!-- Replace the painted dial inside its original wooden rim. All positions
         share the background's coordinate system, including on narrow screens. -->
    <g transform="translate(1159.5 121) scale(.974 1)">
      <circle r="59.2" :fill="`url(#${faceId})`"/>
      <g stroke="#705138" stroke-width="1.25" stroke-linecap="round">
        <line v-for="tick in 12" :key="tick" x1="0" :y1="tick % 3 === 0 ? -47 : -50" x2="0" y2="-56" :transform="`rotate(${tick * 30})`"/>
      </g>
      <g fill="none" stroke-linecap="round">
        <path data-hand="hour" d="M0 3V-32" :transform="`rotate(${angles.hour})`" stroke="#80562f" stroke-width="3.4"/>
        <path data-hand="minute" d="M0 4V-44" :transform="`rotate(${angles.minute})`" stroke="#80562f" stroke-width="2.2"/>
        <path data-hand="second" d="M0 9V-49" :transform="`rotate(${angles.second})`" stroke="#ae7761" stroke-width="1"/>
      </g>
      <circle r="3.1" fill="#957047" stroke="#69492d" stroke-width=".8"/>
      <circle r="1.1" fill="#e7c58e"/>
    </g>
  </svg>
</template>

<style scoped>
.at-wall-clock{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
</style>
