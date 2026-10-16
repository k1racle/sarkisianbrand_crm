<script setup lang="ts">
import { Funnel } from '@lucide/vue';
const props = defineProps<{ model: any; facets: any }>();
const emit = defineEmits<{ apply: [value: any]; reset: [] }>();
const { t } = useHomeLocale();
const copy = () => ({ ...props.model, categories: [...props.model.categories], volumes: [...props.model.volumes], purposes: [...props.model.purposes], features: [...props.model.features] });
const draft = reactive(copy());
const priceError = ref('');
const expanded = ref(Boolean(props.model.search || props.model.purposes.length || props.model.features.length || props.model.inStock || props.model.sort !== 'new'));
watch(() => props.model, () => { Object.assign(draft, copy()); priceError.value = ''; }, { deep: true });
const volumes = computed(() => [...new Set<string>([...(props.facets.volumes || []), ...props.model.volumes])].sort((a, b) => Number(a) - Number(b)));
function apply() {
  priceError.value = '';
  if (draft.minPrice !== '' && draft.maxPrice !== '' && Number(draft.minPrice) > Number(draft.maxPrice)) { priceError.value = 'Цена «от» не должна быть больше цены «до».'; return; }
  emit('apply', { ...draft, minPrice: String(draft.minPrice), maxPrice: String(draft.maxPrice), page: 1 });
}
function reset() { Object.assign(draft, { search: '', categories: [], volumes: [], purposes: [], features: [], minPrice: '', maxPrice: '', inStock: false, sort: 'new', page: 1 }); priceError.value = ''; emit('reset'); }
</script>

<template>
  <form class="sc-filters" @submit.prevent="apply">
    <div class="sc-filter-main">
      <button type="button" class="sc-filter-toggle" :aria-label="t('Фильтры и сортировка')" :aria-expanded="expanded" aria-controls="catalog-extra-filters" @click="expanded = !expanded"><Funnel :stroke-width="1" /></button>
      <fieldset class="sc-filter-price"><legend>{{ t('Цена') }}</legend><label><span>{{ t('от') }}</span><input v-model="draft.minPrice" :aria-label="t('Цена от')" type="number" min="0" max="100000000" step="0.01" inputmode="decimal" /></label><label><span>{{ t('до') }}</span><input v-model="draft.maxPrice" :aria-label="t('Цена до')" type="number" min="0" max="100000000" step="0.01" inputmode="decimal" /></label></fieldset>
      <fieldset class="sc-filter-volumes"><legend>{{ t('Объём') }}</legend><label v-for="volume in volumes" :key="volume" class="sc-filter-option"><span>{{ volume }}</span><input v-model="draft.volumes" type="checkbox" :value="volume" :aria-label="`${t('Объём')} ${volume}`" /></label><span v-if="!volumes.length" class="sc-filter-note">{{ t('Не указан') }}</span></fieldset>
      <fieldset class="sc-filter-categories"><legend>{{ t('Категория') }}</legend><label v-for="category in facets.categories" :key="category.slug" class="sc-filter-option"><span>{{ category.nameRu }}</span><input v-model="draft.categories" type="checkbox" :value="category.slug" /></label><span v-if="!facets.categories.length" class="sc-filter-note">{{ t('Все товары') }}</span></fieldset>
    </div>
    <div v-show="expanded" id="catalog-extra-filters" class="sc-filter-extra">
      <label>{{ t('Поиск') }}<input v-model="draft.search" type="search" :placeholder="t('Название или артикул')" maxlength="200" /></label>
      <label>{{ t('Сортировка') }}<select v-model="draft.sort"><option value="new">{{ t('Сначала новинки') }}</option><option value="popular">{{ t('По популярности') }}</option><option value="price-asc">{{ t('Сначала дешевле') }}</option><option value="price-desc">{{ t('Сначала дороже') }}</option><option value="name">{{ t('По названию') }}</option></select></label>
      <label class="sc-filter-option"><span>{{ t('Только в наличии') }}</span><input v-model="draft.inStock" type="checkbox" /></label>
      <fieldset v-if="facets.purposes.length"><legend>{{ t('Для чего') }}</legend><label v-for="purpose in facets.purposes" :key="purpose" class="sc-filter-option"><span>{{ purpose }}</span><input v-model="draft.purposes" type="checkbox" :value="purpose" /></label></fieldset>
      <fieldset v-if="facets.features.length"><legend>{{ t('Особенности') }}</legend><label v-for="feature in facets.features" :key="feature" class="sc-filter-option"><span>{{ feature }}</span><input v-model="draft.features" type="checkbox" :value="feature" /></label></fieldset>
    </div>
    <p v-if="priceError" class="sc-filter-error" role="alert">{{ t(priceError) }}</p>
    <div class="sc-filter-buttons"><button type="submit" class="sb-design-button">{{ t('Применить') }}</button><button type="button" class="sb-design-button" @click="reset">{{ t('Сбросить') }}</button></div>
  </form>
</template>
