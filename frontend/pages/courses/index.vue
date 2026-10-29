<script setup lang="ts">
import { ArrowRight, BookOpen } from '@lucide/vue';
import { courseDescription, coursePrice, type PublicCourse } from '~/shared/course-types';
const config = useRuntimeConfig();
const page = ref(1);
const { data, status, error, refresh } = await useAsyncData('course-catalog', () => $fetch<{items:PublicCourse[]; page:number; pages:number}>('/lms/catalog', { baseURL: config.public.apiBase, query: { page: page.value, limit: 20 } }), { watch: [page] });
useSeoMeta({ title: 'Курсы — SARKISIAN', description: 'Обучение для мастеров от SARKISIAN.' });
</script>
<template>
  <SiteShell editorial><div class="site-courses">
    <header class="site-courses-hero"><h1>Курсы<br/>SARKISIAN</h1><div><p>Учитесь в своём темпе: уроки, материалы и практический опыт для мастеров.</p><NuxtLink class="site-courses-link" to="/courses/my">Моё обучение <ArrowRight :size="18"/></NuxtLink></div></header>
    <section class="site-courses-section" aria-labelledby="course-list"><div class="site-courses-section-head"><h2 id="course-list">Выберите курс</h2><p>Программы и условия доступа — в карточке курса.</p></div>
      <p v-if="status==='pending'" class="site-courses-state" role="status">Загружаем курсы…</p>
      <div v-else-if="error" class="site-courses-state" role="alert"><p>Не удалось загрузить курсы. Проверьте соединение и попробуйте ещё раз.</p><button type="button" class="site-courses-button" @click="refresh()">Повторить</button></div>
      <div v-else-if="!data?.items?.length" class="site-courses-state"><BookOpen :size="26" aria-hidden="true"/><h3>Курсы скоро появятся</h3><p>Здесь будут программы обучения SARKISIAN.</p></div>
      <div v-else class="site-courses-grid"><article v-for="course in data.items" :key="course.id" class="site-course-card"><div><h3><NuxtLink :to="`/courses/${encodeURIComponent(course.id)}`">{{ course.titleRu }}</NuxtLink></h3><p v-if="courseDescription(course.description)">{{ courseDescription(course.description) }}</p></div><div class="site-course-card-bottom"><span>{{course.tariffs.length ? `от ${coursePrice(Math.min(...course.tariffs.map(t => Number(t.price))))}` : 'Условия уточняются'}}</span><NuxtLink :to="`/courses/${encodeURIComponent(course.id)}`" :aria-label="`Подробнее о курсе ${course.titleRu}`"><ArrowRight :size="20"/></NuxtLink></div></article></div>
      <nav v-if="data && data.pages > 1" class="site-courses-pagination" aria-label="Страницы каталога курсов"><button type="button" class="site-courses-button" :disabled="page <= 1 || status === 'pending'" @click="page--">Назад</button><span aria-live="polite">{{data.page}} / {{data.pages}}</span><button type="button" class="site-courses-button" :disabled="page >= data.pages || status === 'pending'" @click="page++">Далее</button></nav>
    </section>
  </div></SiteShell>
</template>
