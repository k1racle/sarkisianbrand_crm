<script setup lang="ts">
import { ArrowRight, ChevronRight, Search, X } from '@lucide/vue';

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ close: []; 'after-leave': [] }>();
const motionDuration = useStorefrontMotion();
const search = ref('');

function submitSearch() {
  navigateTo({ path: '/catalog', query: search.value.trim() ? { search: search.value.trim() } : {} });
  emit('close');
}

const { content, loadStorefrontContent } = useStorefrontContent();
const menu = computed(() => storefrontCatalogMenu(content.value.categories || [], content.value.settings.catalogMenu));
const groups = computed(() => menu.value.groups);
watch(() => props.open, open => { if (open) loadStorefrontContent(true); }, { immediate: true });
</script>

<template>
  <Teleport to="body">
    <Transition name="catalog-fade" :duration="motionDuration" @after-leave="emit('after-leave')">
      <div v-if="open" class="sb-glass-layer sb-catalog-layer" @click.self="emit('close')">
        <aside class="sb-catalog-drawer" aria-label="Каталог товаров">
          <div class="sb-catalog-drawer__head">
            <div><h2>Всё для мастера</h2></div>
            <button aria-label="Закрыть каталог" @click="emit('close')"><X :size="21" /></button>
          </div>

          <form class="sb-catalog-search" role="search" @submit.prevent="submitSearch">
            <Search :size="19" />
            <input v-model="search" type="search" aria-label="Поиск товаров" placeholder="Найти материалы и инструменты" />
            <button type="submit" aria-label="Найти товары"><ArrowRight :size="19" /></button>
          </form>

          <div v-if="menu.quickLinks.length" class="sb-catalog-quick">
            <NuxtLink v-for="link in menu.quickLinks" :key="link.key" :to="link.url" @click="emit('close')"><b>{{ link.label }}</b><small>{{ link.description }}</small><ArrowRight :size="17" /></NuxtLink>
          </div>

          <div class="sb-catalog-menu">
            <section v-for="group in groups" :key="group.id">
              <NuxtLink :to="storefrontCatalogLink(group)" @click="emit('close')"><h3>{{ group.label }}</h3><ChevronRight :size="16" /></NuxtLink>
              <NuxtLink v-for="item in group.items" :key="item.id" :to="storefrontCatalogLink(item)" @click="emit('close')">{{ item.label }}</NuxtLink>
            </section>
          </div>
          <p v-if="!groups.length">Категории пока недоступны. Откройте весь каталог или попробуйте позже.</p>

          <NuxtLink to="/catalog" class="sb-catalog-all sb-liquid-primary" @click="emit('close')">
            Смотреть весь каталог <ArrowRight :size="17" />
          </NuxtLink>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>
