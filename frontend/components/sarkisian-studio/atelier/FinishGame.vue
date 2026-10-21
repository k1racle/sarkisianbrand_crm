<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { Check, Sparkles, Play } from '@lucide/vue'
const props = defineProps<{ upgraded: boolean; value: number | null }>()
const emit = defineEmits<{ done: [accuracy: number] }>()
const position = ref(10), running = ref(false), reduced = ref(false), round = ref(0)
let frame = 0, start = 0, elapsed = 0
const scores: number[] = []
function tick(now: number) {
  position.value = 50 - 46 * Math.cos((elapsed + now - start) / 620)
  frame = requestAnimationFrame(tick)
}
function begin() { running.value = true; start = performance.now(); elapsed = 0; frame = requestAnimationFrame(tick) }
function hit() {
  if (!running.value) return
  cancelAnimationFrame(frame); running.value = false
  const distance = Math.abs(position.value - 50)
  const score = Math.round(Math.max(0, 100 - Math.max(0, distance - (props.upgraded ? 13 : 7)) * 3))
  scores.push(score); round.value++
  if (scores.length === 3) emit('done', Math.round(scores.reduce((a, b) => a + b, 0) / 3))
}
function visibility() {
  if (!running.value) return
  if (document.hidden) { cancelAnimationFrame(frame); elapsed += performance.now() - start }
  else { start = performance.now(); frame = requestAnimationFrame(tick) }
}
onMounted(() => { reduced.value = matchMedia('(prefers-reduced-motion: reduce)').matches; document.addEventListener('visibilitychange', visibility) })
onBeforeUnmount(() => { cancelAnimationFrame(frame); document.removeEventListener('visibilitychange', visibility) })
</script>
<template>
 <div class="at-finish-game">
   <div class="at-finish-emblem"><Check v-if="value !== null" :size="28"/><Sparkles v-else :size="28"/></div>
   <h3>{{ value !== null ? 'Последний штрих готов' : 'Поймай ровный блик' }}</h3>
   <p>{{ value !== null ? `Аккуратность: ${value}%. Можно показывать результат.` : reduced ? 'Спокойный режим: выставь ровный блик по центру шкалы.' : 'Останови бегунок в зелёной зоне. Три лёгких касания — и идеальный финиш.' }}</p>
   <div v-if="value === null" class="at-finish-track" :style="{ '--zone': upgraded ? '36%' : '24%' }"><div class="at-finish-zone"/><span :style="{ left: `${position}%` }"/></div>
   <template v-if="value === null">
     <template v-if="reduced"><input v-model.number="position" type="range" min="4" max="96" aria-label="Положение блика"/><button class="at-btn at-primary" @click="emit('done',Math.round(Math.max(0,100-Math.abs(position-50)*2)))">Закрепить блик <Check :size="17"/></button></template>
     <template v-else><div class="at-rounds"><span v-for="i in 3" :key="i" :class="{ done: i <= round }">{{ i <= round ? `${scores[i-1]}%` : `0${i}` }}</span></div><button v-if="running" class="at-btn at-primary" @click="hit">Поймать блик <Sparkles :size="17"/></button><button v-else class="at-btn at-primary" @click="begin">{{ round ? 'Следующее касание' : 'Начать' }} <Play :size="16"/></button></template>
   </template>
 </div>
</template>
