<script setup lang="ts">
import { ArrowLeft, BookOpen, ChevronRight, Radio, RefreshCw } from '@lucide/vue';

type Lesson = { id: string; title: string; kind: string };
type Course = { id: string; titleRu: string; status: string; modules: Array<{ lessons: Lesson[] }> };
type CourseList = { items: Course[]; total: number; page: number; pages: number };

const session = useWorkspaceSession(), access = useWorkspaceAccess();
const courses = ref<Course[]>([]), selected = ref<Course | null>(null);
const query = ref(''), page = ref(1), pages = ref(1), total = ref(0);
const loading = ref(false), error = ref('');
const liveAvailable = ref<boolean | null>(null);
const canManage = computed(() => access.can('lms.read') && access.can('lms.write'));
const liveCount = (course: Course) => (course.modules || []).reduce((count, module) => count + (module.lessons || []).filter(lesson => lesson.kind === 'LIVE').length, 0);
const statusLabels: Record<string, string> = { DRAFT: 'Черновик', PUBLISHED: 'Опубликован', ARCHIVED: 'Архив' };
const statusLabel = (status: string) => statusLabels[status] || status;
let requestVersion = 0, statusVersion = 0, searchTimer: ReturnType<typeof setTimeout> | undefined;

async function loadLiveStatus() {
  const version = ++statusVersion;
  try {
    const result = await session.request<{ liveAvailable?: boolean }>('/lms/catalog?page=1&limit=1');
    if (version === statusVersion) liveAvailable.value = typeof result?.liveAvailable === 'boolean' ? result.liveAvailable : null;
  } catch { if (version === statusVersion) liveAvailable.value = null; }
}

async function load() {
  const version = ++requestVersion;
  loading.value = true; error.value = '';
  try {
    const params = new URLSearchParams({ page: String(page.value), limit: '20' });
    if (query.value.trim()) params.set('search', query.value.trim());
    const result = await session.request<CourseList>(`/lms/admin/courses?${params}`);
    if (version !== requestVersion) return;
    if (!Array.isArray(result?.items) || !Number.isInteger(result.total) || !Number.isInteger(result.page) || !Number.isInteger(result.pages)) throw new Error('Invalid response');
    courses.value = result.items; total.value = result.total; page.value = result.page; pages.value = result.pages;
  } catch {
    if (version === requestVersion) { courses.value = []; error.value = 'Не удалось загрузить курсы. Проверьте соединение и повторите попытку.'; }
  } finally { if (version === requestVersion) loading.value = false; }
}

function movePage(next: number) { if (loading.value || next < 1 || next > pages.value) return; page.value = next; void load(); }
function refresh() { void loadLiveStatus(); void load(); }
function selectCourse(course: Course) { selected.value = course; }
function showList() { selected.value = null; void load(); }
watch(query, () => { clearTimeout(searchTimer); page.value = 1; searchTimer = setTimeout(() => void load(), 300); });
onMounted(async () => { await access.ensure(); if (access.can('lms.read')) { void loadLiveStatus(); await load(); } });
onBeforeUnmount(() => { requestVersion++; statusVersion++; clearTimeout(searchTimer); });
</script>

<template>
  <section class="crm-management-workspace course-workspace">
    <header class="crm-page-header">
      <div><h1>Онлайн-трансляции</h1><p>Выберите курс, чтобы открыть расписание и управление эфирами.</p></div>
    </header>
    <p v-if="access.error.value" class="course-error" role="alert">{{ access.error.value }}</p>
    <p v-else-if="access.loading.value" class="course-state" role="status">Проверяем доступ…</p>
    <p v-else-if="!access.can('lms.read')" class="course-error" role="alert">Нет доступа к курсам. Обратитесь к администратору.</p>
    <template v-else>
      <div v-if="!canManage" class="course-notice" role="note"><Radio :size="18" aria-hidden="true"/><span>Для управления трансляциями необходим доступ к редактированию курсов.</span></div>
      <div v-if="!selected && liveAvailable === false" class="course-notice" role="note"><Radio :size="18" aria-hidden="true"/><span>Онлайн-трансляции пока недоступны. Можно подготовить уроки; расписание и проведение эфиров станут доступны после подключения сервиса.</span></div>
      <p v-if="error" class="course-error" role="alert">{{ error }}</p>
      <template v-if="!selected">
        <div class="course-toolbar">
          <label class="course-search"><span>Поиск курса</span><input v-model="query" class="crm-input" type="search" maxlength="200" placeholder="Название курса" /></label>
          <button class="crm-button" type="button" :disabled="loading" @click="refresh"><RefreshCw :size="16"/> Обновить</button>
        </div>
        <p v-if="loading" class="course-state" role="status">Загружаем курсы…</p>
        <p v-else-if="courses.length" class="course-hint">Найдено курсов: {{ total }}</p>
        <div v-if="courses.length" class="course-list">
          <button v-for="course in courses" :key="course.id" class="course-row crm-surface crm-button crm-card-action" type="button" :disabled="loading" @click="selectCourse(course)">
            <span class="course-icon"><Radio :size="19" aria-hidden="true"/></span>
            <span class="course-row-title"><strong>{{ course.titleRu }}</strong><small>{{ liveCount(course) ? `Уроков с эфиром: ${liveCount(course)}` : 'Уроки с эфиром ещё не добавлены' }}</small></span>
            <span class="course-status" :data-status="course.status">{{ statusLabel(course.status) }}</span><ChevronRight :size="18" aria-hidden="true"/>
          </button>
        </div>
        <nav v-if="pages > 1" class="course-pagination" aria-label="Страницы курсов">
          <button class="crm-button" type="button" :disabled="loading || page <= 1" @click="movePage(page - 1)">Назад</button><span>{{ page }} из {{ pages }}</span><button class="crm-button" type="button" :disabled="loading || page >= pages" @click="movePage(page + 1)">Далее</button>
        </nav>
        <div v-if="!courses.length && !loading && !error" class="course-empty crm-surface">
          <BookOpen :size="28" aria-hidden="true"/><h2>{{ query ? 'Курсы не найдены' : 'Курсов пока нет' }}</h2><p>{{ query ? 'Попробуйте изменить запрос.' : 'Сначала создайте курс и добавьте урок типа «Прямой эфир».' }}</p><NuxtLink v-if="!query" to="/crm/courses" class="crm-button">Открыть курсы</NuxtLink>
        </div>
      </template>
      <template v-else>
        <div class="course-detail-head"><button class="crm-button" type="button" @click="showList"><ArrowLeft :size="16"/> Все курсы</button><div class="course-detail-title"><h2>{{ selected.titleRu }}</h2><span class="course-status" :data-status="selected.status">{{ statusLabel(selected.status) }}</span></div></div>
        <div v-if="!liveCount(selected)" class="course-notice" role="note"><BookOpen :size="18" aria-hidden="true"/><span>В программе этого курса пока нет уроков типа «Прямой эфир». Добавьте такой урок в разделе «Курсы».</span></div>
        <CourseLiveManagement v-if="canManage" :key="selected.id" :course-id="selected.id" :modules="selected.modules || []" />
      </template>
    </template>
  </section>
</template>
