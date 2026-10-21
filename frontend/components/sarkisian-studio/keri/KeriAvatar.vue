<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { KERI_SIZE, type KeriLook } from './look.ts'
import { renderKeriLook } from './render.ts'
const props = withDefaults(defineProps<{ look: KeriLook; assetBase: string; width?: number; label?: string }>(), { width: 700, label: 'Твой персонаж' })
const emit = defineEmits<{ loading: [value: boolean]; error: [message: string]; ready: [] }>()
const canvas = ref<HTMLCanvasElement>()
const ready = ref(false)
let revision = 0
watch(() => [props.look, props.assetBase, props.width, canvas.value] as const, async () => {
  if (!canvas.value) return
  const current = ++revision
  emit('loading', true)
  try {
    const result = await renderKeriLook({ ...props.look }, props.assetBase, props.width)
    if (current !== revision || !canvas.value) return
    canvas.value.width = result.width
    canvas.value.height = result.height
    canvas.value.getContext('2d')!.drawImage(result, 0, 0)
    ready.value = true
    emit('ready')
  } catch (error) {
    if (current === revision) emit('error', error instanceof Error ? error.message : 'Не удалось показать образ.')
  } finally { if (current === revision) emit('loading', false) }
}, { deep: true, flush: 'post' })
onBeforeUnmount(() => { revision++ })
</script>

<template>
  <canvas ref="canvas" class="keri-avatar" :data-ready="ready" :width="width" :height="Math.round(width * KERI_SIZE.height / KERI_SIZE.width)" role="img" :aria-label="label" />
</template>

<style scoped>
.keri-avatar { display: block; width: 100%; height: auto; aspect-ratio: 948 / 1920; }
</style>
