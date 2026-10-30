<script setup lang="ts">
import { Check, FileText, PlayCircle } from '@lucide/vue';
import { safeCourseLink, type CourseEnrollment, type CourseMaterial } from '~/shared/course-types';
const config = useRuntimeConfig(), route = useRoute();
const { accessToken, loadMe } = useStorefront();
const { openAuth } = useStorefrontPanels();
const enrollment = ref<CourseEnrollment | null>(null), material = ref<CourseMaterial | null>(null);
const loading = ref(true), error = ref(''), materialLoading = ref(false), materialError = ref(''), saving = ref(false);
const quizAvailability = ref<boolean | null>(null);
const completed = computed(() => new Set(enrollment.value?.lessonsProgress?.map(item => item.lessonId) || []));
let revision = 0, lessonRevision = 0;
async function load() {
  const current = ++revision; lessonRevision++; loading.value = true; error.value = ''; enrollment.value = null; material.value = null; quizAvailability.value = null;
  try {
    await loadMe(); const token = accessToken.value;
    if (!token) return;
    const data = await $fetch<CourseEnrollment>(`/lms/my/${encodeURIComponent(String(route.params.id))}`, { baseURL: config.public.apiBase, headers: { Authorization: `Bearer ${token}` } });
    if (current === revision && accessToken.value === token) enrollment.value = data;
  } catch (e:any) { if (current === revision) error.value = [403,404].includes(Number(e?.statusCode || e?.status)) ? 'Курс недоступен этому аккаунту или срок доступа закончился.' : 'Не удалось загрузить курс. Проверьте соединение и попробуйте ещё раз.'; }
  finally { if (current === revision) loading.value = false; }
}
async function openLesson(id:string) {
  const current = ++lessonRevision, token = accessToken.value; if (!token) return;
  material.value = null; materialError.value = ''; materialLoading.value = true; quizAvailability.value = null;
  try { const result = await $fetch<CourseMaterial>(`/lms/my/${encodeURIComponent(String(route.params.id))}/lessons/${encodeURIComponent(id)}`, { baseURL: config.public.apiBase, headers: { Authorization: `Bearer ${token}` } }); if (current === lessonRevision && token === accessToken.value) material.value = result; }
  catch { if (current === lessonRevision) materialError.value = 'Не удалось открыть урок. Проверьте доступ и попробуйте снова.'; }
  finally { if (current === lessonRevision) materialLoading.value = false; }
}
function quizPassed(result: {progress:number; isCompleted:boolean}) {
  if (!material.value || !enrollment.value) return;
  const lessonId=material.value.id;
  enrollment.value.progress=result.progress; enrollment.value.isCompleted=result.isCompleted;
  enrollment.value.lessonsProgress=[...(enrollment.value.lessonsProgress || []).filter(item => item.lessonId !== lessonId),{lessonId,completedAt:new Date().toISOString()}];
}
async function completeLesson() {
  const token = accessToken.value, lessonId = material.value?.id, current = revision; if (!token || !lessonId || saving.value) return;
  saving.value = true; materialError.value = '';
  try {
    const result = await $fetch<{ progress:number; isCompleted:boolean }>(`/lms/my/${encodeURIComponent(String(route.params.id))}/lessons/${encodeURIComponent(lessonId)}/complete`, { baseURL: config.public.apiBase, method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    if (current === revision && token === accessToken.value && enrollment.value) { enrollment.value.progress = result.progress; enrollment.value.isCompleted = result.isCompleted; enrollment.value.lessonsProgress = [...(enrollment.value.lessonsProgress || []).filter(item => item.lessonId !== lessonId), { lessonId, completedAt: new Date().toISOString() }]; }
  } catch { if (current === revision) materialError.value = 'Не удалось сохранить прогресс. Попробуйте ещё раз.'; }
  finally { saving.value = false; }
}
onMounted(() => { void load(); }); watch([accessToken, () => route.params.id], () => { if (import.meta.client) void load(); }); onBeforeUnmount(() => { revision++; lessonRevision++; });
useSeoMeta({ title: 'Мой курс — SARKISIAN', robots: 'noindex,nofollow' });
</script>
<template><SiteShell editorial><div class="site-courses">
  <NuxtLink class="site-courses-link site-courses-back" to="/courses/my">← Моё обучение</NuxtLink>
  <p v-if="loading" class="site-courses-state" role="status">Загружаем курс…</p>
  <div v-else-if="!accessToken" class="site-courses-state"><h1>Войдите в аккаунт</h1><p>Уроки доступны в аккаунте, на котором открыт курс.</p><button type="button" class="site-courses-button" @click="openAuth('login')">Войти</button></div>
  <div v-else-if="error || !enrollment" class="site-courses-state" role="alert"><h1>Курс недоступен</h1><p>{{error}}</p><button type="button" class="site-courses-button" @click="load()">Повторить</button></div>
  <template v-else><header class="site-courses-hero"><h1>{{enrollment.course.titleRu}}</h1><div><p>Пройдено {{enrollment.progress}}%</p><progress :value="enrollment.progress" max="100" :aria-label="`Пройдено ${enrollment.progress}%`"/></div></header>
    <CourseCertificate v-if="accessToken" :key="enrollment.courseId" :course-id="enrollment.courseId" :token="accessToken" :completed="enrollment.isCompleted" />
    <div class="site-course-learning"><section aria-labelledby="learning-program"><h2 id="learning-program">Уроки курса</h2><article v-for="module in enrollment.course.modules" :key="module.id" class="site-course-module"><h3>{{module.title}}</h3><ul><li v-for="lesson in module.lessons" :key="lesson.id"><button type="button" :aria-current="material?.id===lesson.id?'true':undefined" @click="openLesson(lesson.id)"><Check v-if="completed.has(lesson.id)" :size="16"/><PlayCircle v-else-if="lesson.kind==='VIDEO'" :size="16"/><FileText v-else :size="16"/> {{lesson.title}}</button></li></ul></article></section>
      <section class="site-course-material" aria-live="polite"><p v-if="materialLoading">Открываем урок…</p><template v-else-if="material"><h2>{{material.title}}</h2><p v-if="material.content" class="site-course-text">{{material.content}}</p><CourseLiveStudent v-if="material.kind==='LIVE' && accessToken" :key="material.id" :course-id="String(route.params.id)" :lesson-id="material.id" :token="accessToken"/><video v-if="safeCourseLink(material.videoUrl)" :src="safeCourseLink(material.videoUrl)!" controls playsinline preload="metadata"/><a v-if="safeCourseLink(material.videoUrl)" :href="safeCourseLink(material.videoUrl)!" target="_blank" rel="noopener noreferrer">Открыть видео в новой вкладке</a><a v-if="safeCourseLink(material.presentationUrl)" :href="safeCourseLink(material.presentationUrl)!" target="_blank" rel="noopener noreferrer">Открыть презентацию</a><CourseProtectedAssets v-if="accessToken" :key="material.id" :course-id="String(route.params.id)" :lesson-id="material.id" :token="accessToken"/><CourseQuizStudent v-if="accessToken" :key="material.id" :course-id="String(route.params.id)" :lesson-id="material.id" :token="accessToken" @availability="quizAvailability=$event" @passed="quizPassed"/><button v-if="material.kind!=='LIVE' && quizAvailability===false" type="button" class="site-courses-button" :disabled="saving || completed.has(material.id)" @click="completeLesson()">{{completed.has(material.id) ? 'Урок пройден' : saving ? 'Сохраняем…' : 'Отметить пройденным'}}</button></template><p v-else>Выберите урок в программе.</p><p v-if="materialError" role="alert">{{materialError}}</p></section>
    </div></template>
</div></SiteShell></template>
