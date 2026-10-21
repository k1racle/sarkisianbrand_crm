<script setup lang="ts">
import { NAIL_SHAPES, NAIL_LENGTHS, type NailShape, type NailLength } from '../model'
defineProps<{ shape?: NailShape; length?: NailLength }>()
defineEmits<{ shape: [shape: NailShape]; length: [length: NailLength] }>()
</script>
<template>
 <fieldset class="at-nail-fit"><legend>Форма и длина</legend>
  <div class="at-shape-options" role="group" aria-label="Форма ногтей"><button v-for="item in NAIL_SHAPES" :key="item.id" :aria-label="`Форма: ${item.name}`" :aria-pressed="(shape ?? 'almond') === item.id" @click="$emit('shape',item.id)"><i :class="`fit-${item.id}`"/><span>{{ item.name }}</span></button></div>
  <div class="at-length-options" role="group" aria-label="Длина ногтей"><button v-for="item in NAIL_LENGTHS" :key="item.id" :aria-label="`Длина: ${item.name}`" :aria-pressed="(length ?? 'natural') === item.id" @click="$emit('length',item.id)">{{ item.name }}</button></div>
 </fieldset>
</template>
