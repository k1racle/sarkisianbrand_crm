<script setup lang="ts">
import { Minus, Plus } from '@lucide/vue';
const props = withDefaults(defineProps<{ quantity: number; min?: number; max?: number; disabled?: boolean; compact?: boolean }>(), { min: 1, max: Number.MAX_SAFE_INTEGER, disabled: false, compact: false });
const emit = defineEmits<{ change: [quantity: number] }>();
function change(delta: number) {
  const next = props.quantity + delta;
  if (!props.disabled && next >= props.min && next <= props.max) emit('change', next);
}
</script>
<template>
  <div class="sb-quantity" :class="{ 'sb-quantity--compact': compact }" role="group" aria-label="Количество товара">
    <button type="button" :disabled="disabled || quantity <= min" aria-label="Уменьшить количество" @click="change(-1)"><Minus :size="18" /></button>
    <b aria-live="polite" aria-atomic="true">{{ quantity }}</b>
    <button type="button" :disabled="disabled || quantity >= max" aria-label="Увеличить количество" @click="change(1)"><Plus :size="18" /></button>
  </div>
</template>
