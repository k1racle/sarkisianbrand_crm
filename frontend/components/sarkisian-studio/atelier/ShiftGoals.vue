<script setup lang="ts">
import { computed } from 'vue'
import { Check, Flag, Coins } from '@lucide/vue'
import { shiftGoals, type Shift } from './progression'
const props=defineProps<{ shift: Shift; compact?: boolean }>()
defineEmits<{ open: [] }>()
const goals=computed(()=>shiftGoals(props.shift))
</script>
<template>
 <section class="at-goals" :class="{ compact }" aria-label="Цели смены">
  <div class="at-goals-heading"><span><Flag :size="14"/>Смена {{ shift.number }}</span><b>{{ shift.visits.length }} / 3 приёма</b></div>
  <div v-for="goal in goals" :key="goal.id" class="at-goal" :class="{ achieved: goal.current >= goal.target }"><span class="at-goal-check"><Check v-if="goal.current >= goal.target" :size="12"/></span><div><span>{{ goal.name }}</span><small>{{ goal.current }} / {{ goal.target }}</small></div><b>+{{ goal.reward }}</b></div>
  <button v-if="compact" class="at-text-button" @click="$emit('open')">{{ shift.visits.length === 3 ? 'Забрать награду за смену' : 'Цели и награды' }} <Coins :size="14"/></button>
 </section>
</template>
