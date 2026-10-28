<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { keriLayers, type KeriLook } from '../keri/look'
import { loadKeriImage } from '../keri/render'
import { drawStyledKeri } from '../keri/styling'
const props = withDefaults(defineProps<{ look: KeriLook; assetBase: string; crop?: 'head' | 'seated'; animated?: boolean; label?: string }>(), { crop: 'head', animated: false, label: 'Персонаж' })
const canvas = ref<HTMLCanvasElement>()
let layers: HTMLImageElement[] = [], revision = 0, timer: ReturnType<typeof setTimeout> | undefined
let eyeBounds = { x: 0, y: 0, w: 0, h: 0 }, reduced: MediaQueryList | undefined, disposed = false
const ready = ref(false)
function draw(closed = false) {
  const ctx = canvas.value?.getContext('2d'); if (!ctx || !layers.length) return
  const crop = props.crop === 'head' ? [195, 10, 575, 630] : [120, 0, 700, 1120]
  const [x, y, w, h] = crop as [number, number, number, number]
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  ctx.save(); ctx.scale(ctx.canvas.width / w, ctx.canvas.height / h); ctx.translate(-x, -y)
  drawStyledKeri(ctx, layers, props.look, closed, eyeBounds); ctx.restore()
}
function schedule() {
  clearTimeout(timer)
  if (disposed || !props.animated) return
  timer = setTimeout(() => {
    if (!document.hidden && !reduced?.matches) { draw(true); timer = setTimeout(() => { draw(); schedule() }, 110) }
    else schedule()
  }, 4200 + Math.random() * 2500)
}
watch(() => [props.look, props.assetBase, props.crop, canvas.value] as const, async () => {
  if (!canvas.value) return
  const current = ++revision
  try {
    const next = await Promise.all(keriLayers(props.look, `${props.assetBase.replace(/\/?$/, '/')}keri/`).map(loadKeriImage))
    if (current !== revision || disposed) return
    layers = next
    const c = document.createElement('canvas'); c.width = 948; c.height = 1920
    const ctx = c.getContext('2d')!; ctx.drawImage(layers[4]!, 0, 0)
    const { data } = ctx.getImageData(0, 0, 948, 600)
    let x0 = 948, y0 = 600, x1 = 0, y1 = 0
    for (let y = 0; y < 600; y++) for (let x = 0; x < 948; x++) if (data[(y * 948 + x) * 4 + 3]! > 32) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y) }
    eyeBounds = { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 }
    draw(); ready.value = true; schedule()
  } catch { ready.value = false }
}, { deep: true, flush: 'post' })
onMounted(() => { reduced = matchMedia('(prefers-reduced-motion: reduce)') })
onBeforeUnmount(() => { disposed = true; revision++; clearTimeout(timer) })
</script>
<template><canvas ref="canvas" :width="crop === 'head' ? 256 : 560" :height="crop === 'head' ? 280 : 896" :data-ready="ready" class="at-portrait" role="img" :aria-label="label" /></template>
<style scoped>.at-portrait{display:block;width:100%;height:auto}</style>
