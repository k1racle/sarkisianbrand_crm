<script setup lang="ts">
import { ArrowRight, ChevronRight, Sparkles, X } from '@lucide/vue';

defineProps<{ open: boolean }>();
const emit = defineEmits<{ close: [] }>();

const groups = [
  { title: 'Базы и праймеры', query: 'база', items: ['Базы', 'Праймеры', 'Камуфлирующие базы'] },
  { title: 'Гели', query: 'гель', items: ['Гели 30 мл', 'Гели 20 мл', 'Гели 15 мл', 'Гель-мусс и гель-желе'] },
  { title: 'Гель-лаки', query: 'гель-лак', items: ['Классические', 'Светоотражающие', 'Кошачий глаз', 'С перламутровым эффектом'] },
  { title: 'Инструменты', query: 'ножницы', items: ['Ножницы', 'Кисти', 'Магниты', 'Штативы'] },
  { title: 'Фрезы', query: 'фреза', items: ['Алмазные фрезы', 'ТВС фрезы', 'Наборы'] },
  { title: 'Уход', query: 'масло', items: ['Масла для кутикулы', 'Крем-парафин', 'Парафин-маски', 'Воск'] },
];
</script>

<template>
  <Teleport to="body">
    <Transition name="catalog-fade">
      <div v-if="open" class="sb-glass-layer sb-catalog-layer" @click.self="emit('close')">
        <aside class="sb-catalog-drawer" aria-label="Каталог товаров">
          <div class="sb-catalog-drawer__head">
            <div><span><Sparkles :size="13" /> ПРОФЕССИОНАЛЬНЫЙ КАТАЛОГ</span><h2>Всё для мастера</h2><p>Материалы, инструменты и уход в одном месте</p></div>
            <button aria-label="Закрыть каталог" @click="emit('close')"><X :size="21" /></button>
          </div>

          <div class="sb-catalog-quick">
            <NuxtLink to="/catalog?search=нов" @click="emit('close')"><b>Новинки</b><small>Свежие продукты бренда</small><ArrowRight :size="17" /></NuxtLink>
            <NuxtLink to="/catalog?sort=popular" @click="emit('close')"><b>Бестселлеры</b><small>Выбор мастеров</small><ArrowRight :size="17" /></NuxtLink>
            <NuxtLink to="/catalog?search=подарочная" @click="emit('close')"><b>Подарочная карта</b><small>Подарок без ошибки</small><ArrowRight :size="17" /></NuxtLink>
          </div>

          <div class="sb-catalog-menu">
            <section v-for="group in groups" :key="group.title">
              <NuxtLink :to="storefrontCatalogLink(group.query)" @click="emit('close')"><h3>{{ group.title }}</h3><ChevronRight :size="16" /></NuxtLink>
              <NuxtLink v-for="item in group.items" :key="item" :to="storefrontCatalogLink(item)" @click="emit('close')">{{ item }}</NuxtLink>
            </section>
          </div>

          <NuxtLink to="/catalog" class="sb-catalog-all sb-liquid-primary" @click="emit('close')">
            Смотреть весь каталог <ArrowRight :size="17" />
          </NuxtLink>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>
