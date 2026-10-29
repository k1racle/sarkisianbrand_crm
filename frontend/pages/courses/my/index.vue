<script setup lang="ts">
import { ArrowRight } from '@lucide/vue';
import type { CourseEnrollment } from '~/shared/course-types';
const config = useRuntimeConfig();
const { accessToken, loadMe } = useStorefront();
const { openAuth } = useStorefrontPanels();
const loading = ref(true), error = ref(''), courses = ref<CourseEnrollment[]>([]);
let revision = 0;
async function load() {
  const current = ++revision; loading.value = true; error.value = ''; courses.value = [];
  try {
    await loadMe(); const token = accessToken.value;
    if (!token) return;
    const result = await $fetch<CourseEnrollment[]>('/lms/my', { baseURL: config.public.apiBase, headers: { Authorization: `Bearer ${token}` } });
    if (current === revision && accessToken.value === token) courses.value = result;
  } catch { if (current === revision) error.value = 'Не удалось загрузить обучение. Проверьте соединение и попробуйте ещё раз.'; }
  finally { if (current === revision) loading.value = false; }
}
onMounted(() => { void load(); });
watch(accessToken, () => { if (import.meta.client) void load(); });
onBeforeUnmount(() => { revision++; });
useSeoMeta({ title: 'Моё обучение — SARKISIAN', robots: 'noindex,nofollow' });
</script>
<template><SiteShell editorial><div class="site-courses">
  <NuxtLink class="site-courses-link site-courses-back" to="/courses">← Все курсы</NuxtLink>
  <header class="site-courses-hero"><h1>Моё<br/>обучение</h1><div><p>Ваши курсы и пройденные уроки собраны здесь.</p></div></header>
  <section class="site-courses-section" aria-labelledby="my-courses"><h2 id="my-courses">Мои курсы</h2>
    <p v-if="loading" class="site-courses-state" role="status">Загружаем обучение…</p>
    <div v-else-if="!accessToken" class="site-courses-state"><h3>Войдите в аккаунт</h3><p>После входа здесь появятся доступные вам курсы.</p><button type="button" class="site-courses-button" @click="openAuth('login')">Войти</button></div>
    <div v-else-if="error" class="site-courses-state" role="alert"><p>{{error}}</p><button type="button" class="site-courses-button" @click="load()">Повторить</button></div>
    <div v-else-if="!courses.length" class="site-courses-state"><h3>У вас пока нет доступных курсов</h3><p>Посмотрите программы обучения SARKISIAN.</p><NuxtLink class="site-courses-button" to="/courses">Открыть курсы</NuxtLink></div>
    <div v-else class="site-courses-grid"><article v-for="item in courses" :key="item.id" class="site-course-card"><div><h3>{{item.course.titleRu}}</h3><p>{{item.isCompleted ? 'Курс пройден' : `Пройдено ${item.progress}%`}}</p><progress :value="item.progress" max="100" :aria-label="`Пройдено ${item.progress}%`"/></div><NuxtLink class="site-courses-link" :to="`/courses/my/${encodeURIComponent(item.courseId)}`">Продолжить <ArrowRight :size="18"/></NuxtLink></article></div>
  </section>
</div></SiteShell></template>
