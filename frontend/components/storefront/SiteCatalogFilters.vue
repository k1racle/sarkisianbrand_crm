<script setup lang="ts">
import { X } from '@lucide/vue';
const props = defineProps<{ model: any; facets: any }>();
const emit = defineEmits<{ change: [field: string, value: any]; prices: [min: string, max: string]; reset: [] }>();
const min = ref(props.model.minPrice); const max = ref(props.model.maxPrice); const priceError = ref('');
watch(() => [props.model.minPrice, props.model.maxPrice], () => { min.value = props.model.minPrice; max.value = props.model.maxPrice; priceError.value = ''; });
function toggle(field: string, value: string) { const values = props.model[field]; emit('change', field, values.includes(value) ? values.filter((item: string) => item !== value) : [...values, value]); }
function applyPrices() { priceError.value = ''; if (min.value !== '' && max.value !== '' && Number(min.value) > Number(max.value)) { priceError.value = 'Цена «от» не должна быть больше цены «до».'; return; } emit('prices', String(min.value), String(max.value)); }
</script>
<template><div class="sb-catalog-filter-fields">
  <label class="sb-filter-label">Сортировка<select aria-label="Сортировка" :value="model.sort" @change="emit('change', 'sort', ($event.target as HTMLSelectElement).value)"><option value="new">Сначала новинки</option><option value="popular">По популярности</option><option value="price-asc">Сначала дешевле</option><option value="price-desc">Сначала дороже</option><option value="name">По названию</option></select></label>
  <fieldset><legend>Категория</legend><label v-for="category in facets.categories" :key="category.slug" class="sb-filter-option"><input type="checkbox" :checked="model.categories.includes(category.slug)" @change="toggle('categories', category.slug)" /><span>{{ category.nameRu }}</span></label><p v-if="!facets.categories.length" class="sb-filter-note">Категории пока не заполнены.</p></fieldset>
  <form @submit.prevent="applyPrices"><fieldset><legend>Цена, ₽</legend><div class="sb-filter-price-row"><label class="sb-filter-label">От<input v-model="min" type="number" min="0" max="100000000" step="0.01" :placeholder="String(facets.price.min)" /></label><label class="sb-filter-label">До<input v-model="max" type="number" min="0" max="100000000" step="0.01" :placeholder="String(facets.price.max)" /></label></div><p v-if="priceError" class="sb-form-error" role="alert">{{ priceError }}</p><button type="submit" class="sb-filter-apply-price">Применить цену</button></fieldset></form>
  <fieldset><legend>Для чего</legend><label v-for="purpose in facets.purposes" :key="purpose" class="sb-filter-option"><input type="checkbox" :checked="model.purposes.includes(purpose)" @change="toggle('purposes', purpose)" /><span>{{ purpose }}</span></label><p v-if="!facets.purposes.length" class="sb-filter-note">Назначения пока не заполнены.</p></fieldset>
  <fieldset v-if="facets.features.length"><legend>Особенности</legend><label v-for="feature in facets.features" :key="feature" class="sb-filter-option"><input type="checkbox" :checked="model.features.includes(feature)" @change="toggle('features', feature)" /><span>{{ feature }}</span></label></fieldset>
  <fieldset><legend>Наличие</legend><label class="sb-filter-option"><input type="checkbox" :checked="model.inStock" @change="emit('change', 'inStock', ($event.target as HTMLInputElement).checked)" /><span>Только в наличии</span></label></fieldset>
  <button type="button" class="sb-primary sb-secondary sb-filter-reset" @click="emit('reset')">Сбросить фильтры <X class="sb-filter-reset-cross" :size="18" /></button>
</div></template>
