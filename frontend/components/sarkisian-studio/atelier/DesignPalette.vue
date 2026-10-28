<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import { Check, CheckCheck, Shuffle } from '@lucide/vue'
import NailFinish from '../NailFinish.vue'
import { COLORS, COLOR_FAMILIES, PATTERNS, FINISHES, colorHex, type ColorId, type PatternId, type FinishId } from '../manicure-catalog'
import type { Nail } from '../model'
const props = defineProps<{ colors: readonly typeof COLORS[number][]; color: ColorId; pattern: PatternId; accent: ColorId; finish: FinishId }>()
const emit = defineEmits<{ color: [value: ColorId]; pattern: [value: PatternId]; accent: [value: ColorId]; finish: [value: FinishId]; all: []; inspiration: [value: Nail[]] }>()
const family = ref('all'), search = ref(''), uid = useId().replaceAll(':', '')
const visible = computed(() => props.colors.filter(c => (family.value === 'all' || c.family === family.value) && c.name.toLowerCase().includes(search.value.toLowerCase().trim())))
const geo = { path: 'M3 54V23Q3 2 22 2Q41 2 41 23V54Q41 65 22 65Q3 65 3 54Z', x: 3, y: 2, w: 38, h: 63 }
const inspirations = [
  { name: 'Нюд и золото', colors: ['rose', 'latte', 'milk', 'sand', 'cocoa'], pattern: 'gold', finish: 'glossy', accent: 'champagne' },
  { name: 'Пастельный микс', colors: ['ballet', 'lilac', 'mint', 'lemon', 'periwinkle'], pattern: 'plain', finish: 'matte', accent: 'porcelain' },
  { name: 'Ночной хром', colors: ['midnight', 'graphite', 'plum', 'black', 'denim'], pattern: 'stars', finish: 'chrome', accent: 'silver' },
  { name: 'Летний сад', colors: ['coral', 'peach', 'ballet', 'milk', 'sage'], pattern: 'flowers', finish: 'glossy', accent: 'porcelain' },
] as const
function inspiration(item: typeof inspirations[number]) { emit('inspiration', item.colors.map(color => ({ color, pattern: item.pattern, finish: item.finish, accentColor: item.accent }))) }
function randomize() {
  const pick = <T,>(items: readonly T[]) => items[Math.floor(Math.random() * items.length)]!
  emit('inspiration', Array.from({ length: 5 }, () => ({ color: pick(props.colors).id, pattern: pick(PATTERNS).id, accentColor: pick(props.colors).id, finish: pick(FINISHES).id })))
}
</script>
<template>
 <div class="at-design-palette">
  <h2>Ваш цвет. Ваш характер.</h2>
  <p class="at-color-name">{{ COLORS.find(c => c.id === color)?.name }} · {{ colors.length }} оттенков</p>
  <div class="at-palette-search"><input v-model="search" type="search" placeholder="Найти оттенок" aria-label="Поиск цвета лака"/><select v-model="family" aria-label="Коллекция лаков"><option v-for="item in COLOR_FAMILIES" :key="item.id" :value="item.id">{{ item.name }}</option></select></div>
  <div class="at-expanded-palette" role="group" aria-label="Оттенки лака"><button v-for="item in visible" :key="item.id" :title="item.name" :style="{ '--swatch': item.hex }" :aria-label="item.name" :aria-pressed="color === item.id" @click="emit('color', item.id)"><Check v-if="color === item.id" :size="18"/></button></div>
  <p v-if="!visible.length" class="at-subtle">Такой оттенок не найден. Попробуйте другое название.</p>
  <label class="at-accent-select"><span>Цвет рисунка и градиента</span><span><i :style="{ background: colorHex(accent) }"/><select :value="accent" @change="emit('accent', ($event.target as HTMLSelectElement).value as ColorId)"><option v-for="item in COLORS" :key="item.id" :value="item.id">{{ item.name }}</option></select></span></label>
  <fieldset class="at-finish-options"><legend>Эффект покрытия</legend><div><button v-for="item in FINISHES" :key="item.id" :aria-pressed="finish === item.id" @click="emit('finish', item.id)">{{ item.name }}</button></div></fieldset>
  <div class="at-pattern-grid" role="group" aria-label="Рисунок на ногте"><button v-for="item in PATTERNS" :key="item.id" :aria-label="item.name" :aria-pressed="pattern === item.id" @click="emit('pattern', item.id)"><svg viewBox="0 0 44 68" aria-hidden="true"><defs><clipPath :id="`${uid}-${item.id}`"><path :d="geo.path"/></clipPath><linearGradient :id="`${uid}-gloss`"><stop stop-color="#0002"/><stop offset=".3" stop-color="#fff7"/><stop offset=".6" stop-color="#fff0"/><stop offset="1" stop-color="#0002"/></linearGradient></defs><g :clip-path="`url(#${uid}-${item.id})`"><NailFinish :nail="{ color, pattern: item.id, accentColor: accent, finish }" :geometry="geo" :gloss-id="`${uid}-gloss`"/></g></svg><span>{{ item.name }}</span></button></div>
  <button class="at-btn at-secondary" @click="emit('all')"><CheckCheck :size="16"/> Нанести на все пять ногтей</button>
  <details class="at-inspirations"><summary>Готовые сочетания и идеи</summary><p>Каждый ноготь можно изменить после нанесения.</p><button v-for="item in inspirations" :key="item.name" @click="inspiration(item)"><span>{{ item.name }}</span><span><i v-for="c in item.colors" :key="c" :style="{ background: colorHex(c) }"/></span></button><button @click="randomize"><span>Случайный дизайн</span><Shuffle :size="17"/></button></details>
 </div>
</template>
