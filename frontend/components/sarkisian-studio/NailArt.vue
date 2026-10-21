<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, useId, watch } from 'vue'
import { colorHex, type ColorId, type Design, type Nail } from './model'
import { geometry } from './nail-art-geometry'
import NailFinish from './NailFinish.vue'

const props = withDefaults(defineProps<{
  design: Design; imageUrl: string; interactive?: boolean; selected?: number
  stroke?: { id: number; indices: number[] }; brushColor?: ColorId
  preparing?: boolean; prepared?: number[]
}>(), { interactive: false, selected: -1, brushColor: 'rose' })
const emit = defineEmits<{ paint: [index: number] }>()
const uid = useId().replaceAll(':', '')
const svg = ref<SVGSVGElement | null>(null)
const nails = computed(() => geometry(props.design.kind, props.design.shape, props.design.length))
const shaped = computed(() => props.design.kind === 'manicure' && ((props.design.shape ?? 'almond') !== 'almond' || (props.design.length ?? 'natural') !== 'natural'))
type Stroke = { index: number; before: Nail; start: number; progress: number }
const strokes = shallowRef<Stroke[]>([])
let previous = props.design.nails.map(n => ({ ...n }))
let frame = 0
const reducedMotion = ref(false)
let motionPreference: MediaQueryList | undefined
const pointer = ref({ x: 0, y: 0, visible: false })
let activePointer: number | null = null
const visited = new Set<number>()
const strokeAt = (index: number) => strokes.value.find(s => s.index === index)

function animate(now: number) {
  strokes.value = strokes.value.map(s => ({ ...s, progress: Math.max(0, Math.min(1, (now - s.start) / 430)) })).filter(s => s.progress < 1)
  if (strokes.value.length) frame = requestAnimationFrame(animate)
  else frame = 0
}
watch(() => props.stroke?.id, () => {
  cancelAnimationFrame(frame)
  const indices = props.stroke?.indices ?? []
  const start = performance.now()
  strokes.value = reducedMotion.value || !indices.length ? [] : [
    ...strokes.value.filter(s => !indices.includes(s.index)),
    ...indices.map((index, order) => ({ index, before: { ...previous[index]! }, start: start + order * 130, progress: 0 })),
  ]
  previous = props.design.nails.map(n => ({ ...n }))
  if (strokes.value.length) frame = requestAnimationFrame(animate)
})

const brush = computed(() => {
  if (reducedMotion.value) return null
  const stroke = strokes.value.find(s => s.progress > 0)
  if (stroke) {
    const n = nails.value[stroke.index]!
    return { x: n.x + n.w * .5, y: n.y + n.h * (1 - stroke.progress), active: true }
  }
  return pointer.value.visible ? { ...pointer.value, active: false } : null
})

function localPoint(event: PointerEvent) {
  const matrix = svg.value?.getScreenCTM()
  return matrix ? new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse()) : null
}
function hitNail(point: DOMPoint) {
  const paths = svg.value?.querySelectorAll<SVGPathElement>('.nail-hit-area')
  return paths ? Array.from(paths).findIndex(path => path.isPointInFill(point) || path.isPointInStroke(point)) : -1
}
function paintOnce(index: number) {
  if (index < 0 || visited.has(index)) return
  visited.add(index); emit('paint', index)
}
function pointerDown(event: PointerEvent) {
  if (!props.interactive || !event.isPrimary || event.button !== 0) return
  const point = localPoint(event)
  const index = point ? hitNail(point) : -1
  if (index < 0) return
  event.preventDefault(); activePointer = event.pointerId; visited.clear()
  svg.value?.setPointerCapture(event.pointerId)
  paintOnce(index)
}
function pointerMove(event: PointerEvent) {
  if (!props.interactive || !event.isPrimary) return
  const point = localPoint(event); if (!point) return
  pointer.value = { x: point.x, y: point.y, visible: event.pointerType === 'mouse' }
  if (activePointer === event.pointerId) paintOnce(hitNail(point))
}
function pointerEnd(event: PointerEvent) {
  if (event.pointerId !== activePointer) return
  activePointer = null; visited.clear()
  if (svg.value?.hasPointerCapture(event.pointerId)) svg.value.releasePointerCapture(event.pointerId)
  if (event.pointerType !== 'mouse') pointer.value.visible = false
}
function updateMotion() {
  reducedMotion.value = motionPreference?.matches ?? false
  if (reducedMotion.value) { cancelAnimationFrame(frame); strokes.value = [] }
}
onMounted(() => {
  motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)')
  updateMotion(); motionPreference.addEventListener('change', updateMotion)
})
onBeforeUnmount(() => { cancelAnimationFrame(frame); motionPreference?.removeEventListener('change', updateMotion) })
</script>

<template>
  <svg ref="svg" class="nail-art" :class="{ 'has-brush': interactive && pointer.visible && !reducedMotion }" viewBox="0 0 1448 1086" role="group" :aria-label="design.kind === 'manicure' ? 'Редактор маникюра, пять ногтей' : 'Редактор педикюра, пять ногтей'" @pointerdown="pointerDown" @pointermove="pointerMove" @pointerup="pointerEnd" @pointercancel="pointerEnd" @lostpointercapture="pointerEnd" @pointerleave="pointer.visible = false">
    <defs>
      <linearGradient :id="`${uid}-gloss`"><stop offset="0" stop-color="#000" stop-opacity=".12"/><stop offset=".24" stop-color="#fff" stop-opacity=".5"/><stop offset=".4" stop-color="#fff" stop-opacity=".03"/><stop offset="1" stop-color="#000" stop-opacity=".09"/></linearGradient>
      <linearGradient :id="`${uid}-metal`"><stop stop-color="#8a8174"/><stop offset=".4" stop-color="#f9f4e6"/><stop offset="1" stop-color="#82776a"/></linearGradient>
      <clipPath v-for="(n, i) in nails" :id="`${uid}-clip-${i}`" :key="i"><path :d="n.path"/></clipPath>
      <clipPath v-for="s in strokes" :id="`${uid}-reveal-${s.index}`" :key="s.index" clipPathUnits="userSpaceOnUse"><rect x="0" :y="nails[s.index]!.y + nails[s.index]!.h + 12 - (nails[s.index]!.h + 24) * s.progress" width="1448" height="1086"/></clipPath>
    </defs>
    <image :href="imageUrl" width="1448" height="1086" draggable="false"/>
    <g v-for="(n, i) in nails" :key="i" :class="{ 'nail-target': interactive, 'is-painting': !!strokeAt(i) }" :data-testid="`nail-${i}`" :role="interactive ? 'button' : undefined" :tabindex="interactive ? 0 : undefined" :aria-label="`Нанести покрытие на ноготь ${i + 1}`" @click="(event: MouseEvent) => { if (interactive && event.detail === 0) emit('paint', i) }" @keydown.enter.prevent="interactive && emit('paint', i)" @keydown.space.prevent="interactive && emit('paint', i)">
      <path class="nail-hit-area" :d="n.path" fill="transparent" stroke="transparent" stroke-width="26"/>
      <g v-if="shaped && !design.nails[i]?.color" pointer-events="none"><path :d="n.path" fill="#e5b3a2"/><path :d="n.path" :fill="`url(#${uid}-gloss)`"/></g>
      <path v-if="preparing && prepared?.includes(i)" :d="n.path" fill="#94aa7130" stroke="#819c65" stroke-width="7" pointer-events="none"/>
      <g :clip-path="`url(#${uid}-clip-${i})`" pointer-events="none">
        <NailFinish v-if="strokeAt(i)" :nail="strokeAt(i)!.before" :geometry="n" :gloss-id="`${uid}-gloss`"/>
        <g :clip-path="strokeAt(i) ? `url(#${uid}-reveal-${i})` : undefined"><NailFinish :nail="design.nails[i]!" :geometry="n" :gloss-id="`${uid}-gloss`"/></g>
      </g>
      <path v-if="interactive && selected === i" class="nail-selection" :d="n.path" fill="none" stroke="#fff" stroke-width="4" stroke-dasharray="9 7" pointer-events="none"/>
    </g>
    <g v-if="interactive && brush && !preparing" class="nail-brush" :class="{ 'is-stroking': brush.active }" :transform="`translate(${brush.x} ${brush.y}) rotate(-32)`" pointer-events="none" aria-hidden="true">
      <ellipse cx="18" cy="80" rx="14" ry="76" fill="#33271f" opacity=".12"/>
      <path d="M-13 27 L-11 6 Q0 -4 11 6 L13 27Z" :fill="colorHex(brushColor)" stroke="#534135" stroke-width="1.5"/>
      <path d="M-10 27V8M-5 27V5M0 27V3M5 27V5M10 27V8" stroke="#fff" opacity=".24"/>
      <rect x="-14" y="25" width="28" height="41" rx="3" :fill="`url(#${uid}-metal)`"/>
      <path d="M-12 66H12L8 151Q0 163 -8 151Z" fill="#292a27"/>
      <path d="M-7 72L-4 142" stroke="#65655b" stroke-width="3" stroke-linecap="round"/>
    </g>
    <g v-if="interactive && brush && preparing" class="nail-prep-tool" :transform="`translate(${brush.x} ${brush.y})`" pointer-events="none" aria-hidden="true"><ellipse cx="5" cy="7" rx="29" ry="23" fill="#33271f20"/><ellipse rx="28" ry="22" fill="#fffdf3" stroke="#c8c5b5" stroke-width="2"/><ellipse rx="21" ry="15" fill="none" stroke="#e4e0d4" stroke-width="2"/></g>
  </svg>
</template>

<style scoped>
.nail-art{display:block;width:100%;height:auto;user-select:none;-webkit-user-select:none}
.nail-target{cursor:crosshair;outline:none;touch-action:none}
.has-brush,.has-brush .nail-target{cursor:none}
.nail-target:focus-visible{filter:drop-shadow(0 0 9px #fff)}
.nail-target:hover{filter:brightness(1.04)}
.nail-selection{animation:nail-outline 2s linear infinite}
@keyframes nail-outline{to{stroke-dashoffset:-32}}
@media(prefers-reduced-motion:reduce){.nail-selection{animation:none}}
</style>
