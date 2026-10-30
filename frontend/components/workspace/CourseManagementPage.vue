<script setup lang="ts">
import { ArrowLeft, BookOpen, Check, ChevronRight, FileText, Layers, Plus, RefreshCw, Save, Ticket, Video } from '@lucide/vue';

type LessonKind = 'TEXT' | 'VIDEO' | 'PRESENTATION' | 'LIVE';
type Lesson = { id: string; title: string; kind: LessonKind; sortOrder: number; revision: number; isPreview: boolean; isPublished?: boolean; hasDraftChanges?: boolean; content?: string | null; videoUrl?: string | null; presentationUrl?: string | null; assets?: { id: string }[] };
type CourseModule = { id: string; title: string; sortOrder: number; lessons: Lesson[] };
type Tariff = { id: string; title: string; price: string | number; accessDays: number | null; isActive: boolean };
type Course = { id: string; titleRu: string; titleEn?: string | null; description?: string | null; status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'; tariffs: Tariff[]; modules: CourseModule[] };
type Editor = 'course' | 'tariff' | 'module' | 'lesson';
const session = useWorkspaceSession(), access = useWorkspaceAccess();
const courses = ref<Course[]>([]), selectedId = ref(''), selected = ref<Course | null>(null);
const loading = ref(false), saving = ref(false), assetBusy = ref(false), error = ref(''), notice = ref(''), query = ref('');
const page = ref(1), pages = ref(1), total = ref(0);
const tab = ref('program'), editor = ref<Editor | null>(null), editorId = ref(''), parentId = ref('');
const editBaseline = ref('');
// Capture the revision when opening the editor. Refreshes caused by file
// uploads must not silently update the version of an already-open form.
const lessonRevision = ref<number | null>(null), lessonConflict = ref(false);
const courseForm = reactive({ titleRu: '', titleEn: '', description: '' });
const tariffForm = reactive({ title: '', price: '', accessDays: '', isActive: true });
const moduleForm = reactive({ title: '', sortOrder: 0 });
const lessonForm = reactive({ title: '', kind: 'TEXT' as LessonKind, content: '', videoUrl: '', presentationUrl: '', sortOrder: 0, isPreview: false });
const existingLesson = computed(() => selected.value?.modules.flatMap(module => module.lessons).find(lesson => lesson.id === editorId.value));
const hasPendingLessons = computed(() => selected.value?.modules.some(module => module.lessons.some(lesson => lesson.hasDraftChanges || lesson.isPublished === false)) ?? false);
const hasPublishedLessons = computed(() => selected.value?.modules.some(module => module.lessons.some(lesson => lesson.isPublished === true)) ?? false);
const canWrite = computed(() => access.can('lms.write'));
const tabs = computed<ReadonlyArray<readonly [string, string]>>(() => canWrite.value ? [['program', 'Программа'], ['tariffs', 'Тарифы'], ['details', 'Описание'], ['live', 'Эфиры']] : [['program', 'Программа'], ['tariffs', 'Тарифы'], ['details', 'Описание']]);
const lessonCount = (course: Course) => (course.modules || []).reduce((total, module) => total + (module.lessons || []).length, 0);
const statusLabel = (status: Course['status']) => ({ DRAFT: 'Черновик', PUBLISHED: 'Опубликован', ARCHIVED: 'Архив' })[status] || status;
const kindLabel = (kind: LessonKind) => ({ TEXT: 'Текст', VIDEO: 'Видео', PRESENTATION: 'Презентация', LIVE: 'Прямой эфир' })[kind] || kind;
const money = (amount: string | number) => new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 2 }).format(Number(amount));
const editorForm = computed(() => editor.value === 'course' ? courseForm : editor.value === 'tariff' ? tariffForm : editor.value === 'module' ? moduleForm : lessonForm);
const dirty = computed(() => !!editor.value && JSON.stringify(editorForm.value) !== editBaseline.value);
let loadVersion = 0, detailVersion = 0, searchTimer: ReturnType<typeof setTimeout> | undefined;
function message(e: any, fallback: string) { const value = e?.data?.message; return Array.isArray(value) ? value.join('; ') : typeof value === 'string' ? value : fallback; }
function canLeave() { return !saving.value && !assetBusy.value && (!dirty.value || window.confirm('Есть несохранённые изменения. Продолжить без сохранения?')); }
onBeforeRouteLeave(canLeave);
onBeforeRouteUpdate(canLeave);
function setBaseline() { editBaseline.value = JSON.stringify(editorForm.value); }
function closeEditor() { if (!canLeave()) return; const refresh = lessonConflict.value; editor.value = null; editorId.value = ''; parentId.value = ''; lessonRevision.value = null; lessonConflict.value = false; if (refresh && selectedId.value) { selected.value = null; void loadDetail(selectedId.value); } }
async function load() {
  const version = ++loadVersion; loading.value = true; error.value = '';
  try {
    const params = new URLSearchParams({ page: String(page.value), limit: '20' });
    if (query.value.trim()) params.set('search', query.value.trim());
    const data = await session.request<{ items: Course[]; total: number; page: number; pages: number }>(`/lms/admin/courses?${params}`);
    if (version === loadVersion) { if (!Array.isArray(data?.items) || !Number.isInteger(data.total) || !Number.isInteger(data.page) || !Number.isInteger(data.pages)) throw new Error('Некорректный ответ'); courses.value = data.items; total.value = data.total; page.value = data.page; pages.value = data.pages; }
  } catch (e) { if (version === loadVersion) error.value = message(e, 'Не удалось загрузить курсы. Проверьте соединение и повторите попытку.'); }
  finally { if (version === loadVersion) loading.value = false; }
}
async function loadDetail(id: string) {
  const version = ++detailVersion; loading.value = true; error.value = '';
  try { const data = await session.request<Course>(`/lms/admin/courses/${encodeURIComponent(id)}`); if (version === detailVersion) selected.value = data; }
  catch (e) { if (version === detailVersion) { selected.value = null; error.value = message(e, 'Не удалось открыть курс. Повторите попытку.'); } }
  finally { if (version === detailVersion) loading.value = false; }
}
async function selectCourse(id: string) { if (!canLeave()) return; clearTimeout(searchTimer); loadVersion++; editor.value = null; selectedId.value = id; selected.value = null; tab.value = 'program'; await loadDetail(id); }
function showList() { if (!canLeave()) return; detailVersion++; editor.value = null; selectedId.value = ''; selected.value = null; error.value = ''; void load(); }
function openCourse(course?: Course) { if (!canLeave()) return; Object.assign(courseForm, { titleRu: course?.titleRu || '', titleEn: course?.titleEn || '', description: typeof course?.description === 'string' ? course.description : '' }); editorId.value = course?.id || ''; editor.value = 'course'; setBaseline(); }
function openTariff(tariff?: Tariff) { if (!canLeave()) return; Object.assign(tariffForm, { title: tariff?.title || '', price: tariff ? String(tariff.price) : '', accessDays: tariff?.accessDays == null ? '' : String(tariff.accessDays), isActive: tariff?.isActive ?? true }); editorId.value = tariff?.id || ''; editor.value = 'tariff'; setBaseline(); }
function openModule(module?: CourseModule) { if (!canLeave()) return; Object.assign(moduleForm, { title: module?.title || '', sortOrder: module?.sortOrder ?? (selected.value?.modules.length || 0) }); editorId.value = module?.id || ''; editor.value = 'module'; setBaseline(); }
function openLesson(module: CourseModule, lesson?: Lesson) { if (!canLeave()) return; if (lesson && (!Number.isSafeInteger(lesson.revision) || lesson.revision < 0)) { error.value = 'Не удалось проверить версию урока. Обновите курс и попробуйте снова.'; return; } error.value = ''; lessonRevision.value = lesson?.revision ?? null; lessonConflict.value = false; Object.assign(lessonForm, { title: lesson?.title || '', kind: lesson?.kind || 'TEXT', content: lesson?.content || '', videoUrl: lesson?.videoUrl || '', presentationUrl: lesson?.presentationUrl || '', sortOrder: lesson?.sortOrder ?? module.lessons.length, isPreview: lesson?.isPreview || false }); editorId.value = lesson?.id || ''; parentId.value = module.id; editor.value = 'lesson'; setBaseline(); }
async function save() {
  if (!editor.value || saving.value || lessonConflict.value || !canWrite.value) return;
  const kind = editor.value, existing = editorId.value, courseId = selectedId.value;
  let path = '', body: Record<string, unknown> = {};
  if (kind === 'course') { path = existing ? `/lms/admin/courses/${existing}` : '/lms/admin/courses'; body = { titleRu: courseForm.titleRu.trim(), titleEn: courseForm.titleEn.trim() || null, description: courseForm.description.trim() || null }; }
  if (kind === 'tariff') { const price = Number(tariffForm.price), days = tariffForm.accessDays === '' ? null : Number(tariffForm.accessDays); if (!Number.isFinite(price) || price < 0 || price > 100000000 || (days !== null && (!Number.isInteger(days) || days < 1 || days > 3650))) { error.value = 'Проверьте цену и срок доступа.'; return; } path = existing ? `/lms/admin/tariffs/${existing}` : `/lms/admin/courses/${courseId}/tariffs`; body = { title: tariffForm.title.trim(), price, accessDays: days, isActive: tariffForm.isActive }; }
  if (kind === 'module') { path = existing ? `/lms/admin/modules/${existing}` : `/lms/admin/courses/${courseId}/modules`; body = { title: moduleForm.title.trim(), sortOrder: Number(moduleForm.sortOrder) }; }
  if (kind === 'lesson') { if (existing && lessonRevision.value === null) { error.value = 'Не удалось проверить версию урока. Обновите курс и попробуйте снова.'; return; } path = existing ? `/lms/admin/lessons/${existing}` : `/lms/admin/modules/${parentId.value}/lessons`; body = { title: lessonForm.title.trim(), kind: lessonForm.kind, content: lessonForm.content.trim() || null, videoUrl: lessonForm.videoUrl.trim() || null, presentationUrl: lessonForm.presentationUrl.trim() || null, sortOrder: Number(lessonForm.sortOrder), isPreview: lessonForm.kind === 'LIVE' ? false : lessonForm.isPreview, ...(existing ? { revision: lessonRevision.value } : {}) }; }
  saving.value = true; error.value = ''; notice.value = '';
  try { const result = await session.request<{ id: string }>(path, { method: existing ? 'PATCH' : 'POST', body }); editor.value = null; notice.value = kind === 'lesson' ? 'Урок сохранён. Чтобы изменения увидели ученики, опубликуйте программу курса.' : 'Изменения сохранены'; await load(); const id = kind === 'course' && !existing ? result.id : courseId; if (id) { selectedId.value = id; await loadDetail(id); } }
  catch (e: any) { if (kind === 'lesson' && existing && (e?.statusCode ?? e?.status ?? e?.response?.status) === 409) { lessonConflict.value = true; } else { error.value = message(e, 'Не удалось сохранить. Проверьте данные и повторите попытку.'); } }
  finally { saving.value = false; }
}
async function changeStatus(status: Course['status']) {
  if (!selected.value || !canWrite.value || saving.value || !canLeave()) return;
  if (status === 'ARCHIVED' && !window.confirm('Переместить курс в архив?')) return;
  if (status === 'PUBLISHED' && selected.value.status === 'PUBLISHED' && !window.confirm('Опубликовать все сохранённые изменения и новые уроки? Они станут доступны ученикам.')) return;
  saving.value = true; error.value = ''; notice.value = '';
  try { const wasPublished = selected.value.status === 'PUBLISHED'; await session.request(`/lms/admin/courses/${selected.value.id}`, { method: 'PATCH', body: { status } }); notice.value = status === 'PUBLISHED' ? (wasPublished ? 'Изменения уроков опубликованы' : 'Курс опубликован') : status === 'ARCHIVED' ? 'Курс перемещён в архив' : 'Курс возвращён в черновики'; await load(); await loadDetail(selectedId.value); }
  catch (e) { error.value = message(e, 'Не удалось изменить статус курса.'); }
  finally { saving.value = false; }
}
onMounted(load);
watch(query, () => { clearTimeout(searchTimer); page.value = 1; searchTimer = setTimeout(() => void load(), 300); });
function movePage(next: number) { if (loading.value || next < 1 || next > pages.value) return; page.value = next; void load(); }
onBeforeUnmount(() => { loadVersion++; detailVersion++; clearTimeout(searchTimer); });
</script>

<template>
  <section class="crm-management-workspace course-workspace">
    <header class="crm-page-header"><div><h1>Курсы</h1><p>Соберите программу, уроки и тарифы в одном месте.</p></div><button v-if="canWrite && !selectedId" class="crm-button crm-button--primary" type="button" @click="openCourse()"><Plus :size="17"/> Создать курс</button></header>
    <div class="course-notice" role="note"><BookOpen :size="18" aria-hidden="true"/><span>Здесь можно подготовить курс и его содержание. Продажа курсов и прямые трансляции ещё не подключены.</span></div>
    <p v-if="error" class="course-error" role="alert">{{error}}</p><p v-if="notice" class="course-success" role="status">{{notice}}</p>
    <p v-if="loading && !selected && !courses.length" class="course-state" role="status">Загружаем курсы…</p>
    <template v-if="!selectedId && !editor">
      <div class="course-toolbar"><label class="course-search"><span>Поиск курса</span><input v-model="query" class="crm-input" type="search" maxlength="200" placeholder="Название курса"/></label><button class="crm-button" type="button" :disabled="loading" @click="load"><RefreshCw :size="16"/> Обновить</button></div>
      <p v-if="loading && courses.length" class="course-state" role="status">Обновляем список…</p><p v-if="!loading && courses.length" class="course-hint">Найдено курсов: {{total}}</p>
      <div v-if="courses.length" class="course-list"><button v-for="course in courses" :key="course.id" class="course-row crm-surface crm-button crm-card-action" type="button" :disabled="loading" @click="selectCourse(course.id)"><span class="course-icon"><BookOpen :size="19"/></span><span class="course-row-title"><strong>{{course.titleRu}}</strong><small>{{lessonCount(course)}} уроков · {{(course.tariffs || []).length}} тарифов</small></span><span class="course-status" :data-status="course.status">{{statusLabel(course.status)}}</span><ChevronRight :size="18" aria-hidden="true"/></button></div>
      <nav v-if="pages > 1" class="course-pagination" aria-label="Страницы курсов"><button class="crm-button" type="button" :disabled="loading || page<=1" @click="movePage(page-1)">Назад</button><span>{{page}} из {{pages}}</span><button class="crm-button" type="button" :disabled="loading || page>=pages" @click="movePage(page+1)">Далее</button></nav>
      <div v-if="!courses.length && !loading && !error" class="course-empty crm-surface"><BookOpen :size="28"/><h2>{{query ? 'Курсы не найдены' : 'Пока нет курсов'}}</h2><p>{{query ? 'Попробуйте изменить запрос.' : 'Создайте курс, затем добавьте программу и тарифы.'}}</p><button v-if="!query && canWrite" class="crm-button crm-button--primary" type="button" @click="openCourse()"><Plus :size="16"/> Создать курс</button></div>
    </template>
    <template v-if="selectedId && selected && !editor">
      <div class="course-detail-head"><button class="crm-button" type="button" @click="showList"><ArrowLeft :size="16"/> Все курсы</button><div class="course-detail-title"><h2>{{selected.titleRu}}</h2><span class="course-status" :data-status="selected.status">{{statusLabel(selected.status)}}</span></div><div v-if="canWrite" class="course-actions"><button v-if="selected.status !== 'PUBLISHED'" class="crm-button crm-button--primary" type="button" :disabled="saving" @click="changeStatus('PUBLISHED')"><Check :size="16"/> Опубликовать</button><button v-else-if="hasPendingLessons" class="crm-button crm-button--primary" type="button" :disabled="saving" @click="changeStatus('PUBLISHED')"><Check :size="16"/> Опубликовать изменения</button><button v-if="selected.status === 'PUBLISHED'" class="crm-button" type="button" :disabled="saving" @click="changeStatus('DRAFT')">Снять с публикации</button><button v-if="selected.status !== 'ARCHIVED'" class="crm-button" type="button" :disabled="saving" @click="changeStatus('ARCHIVED')">В архив</button></div></div>
      <div v-if="hasPendingLessons" class="course-publication-note" role="note">
        <strong>Есть неопубликованные уроки или изменения</strong>
        <span v-if="hasPublishedLessons">Ученики с доступом видят опубликованные версии уроков. Новые уроки и изменения появятся после публикации.</span>
        <span v-else>Ученики увидят уроки после публикации курса.</span>
      </div>
      <CrmCardTabs v-model="tab" prefix="course" :tabs="tabs" label="Разделы курса"/>
      <section v-if="tab==='program'" id="course-program-panel" role="tabpanel" aria-labelledby="course-program-tab" class="course-panel"><header><div><h3>Программа курса</h3><p>Разделите материалы на модули и добавьте уроки.</p></div><button v-if="canWrite" class="crm-button" type="button" @click="openModule()"><Plus :size="16"/> Добавить модуль</button></header><div v-if="selected.modules?.length" class="course-modules"><article v-for="module in selected.modules" :key="module.id" class="course-module crm-surface"><header><div><h4>{{module.title}}</h4><small>{{module.lessons?.length || 0}} уроков</small></div><div v-if="canWrite" class="course-actions"><button class="crm-button" type="button" @click="openModule(module)">Изменить модуль</button><button class="crm-button" type="button" @click="openLesson(module)"><Plus :size="16"/> Урок</button></div></header><div v-if="module.lessons?.length" class="course-lessons"><div v-for="lesson in module.lessons" :key="lesson.id" class="course-lesson"><Video v-if="lesson.kind==='VIDEO'" :size="18"/><FileText v-else :size="18"/><span><strong>{{lesson.title}}</strong><small>{{kindLabel(lesson.kind)}}{{lesson.isPreview ? ' · открытый просмотр' : ''}}</small><span v-if="lesson.hasDraftChanges || lesson.isPublished === false" class="course-lesson-state">{{lesson.hasDraftChanges ? 'Есть неопубликованные изменения' : 'Новый урок не опубликован'}}</span></span><button v-if="canWrite" class="crm-button" type="button" :aria-label="`Изменить урок ${lesson.title}`" @click="openLesson(module,lesson)">Изменить</button></div></div><p v-else class="course-hint">В этом модуле пока нет уроков.</p></article></div><div v-else class="course-empty crm-surface"><Layers :size="26"/><h3>Программа пока пуста</h3><p>Создайте первый модуль и добавьте в него уроки.</p></div></section>
      <section v-else-if="tab==='tariffs'" id="course-tariffs-panel" role="tabpanel" aria-labelledby="course-tariffs-tab" class="course-panel"><header><div><h3>Тарифы</h3><p>Укажите стоимость и срок доступа для каждого варианта.</p></div><button v-if="canWrite" class="crm-button" type="button" @click="openTariff()"><Plus :size="16"/> Добавить тариф</button></header><div v-if="selected.tariffs?.length" class="course-tariffs"><article v-for="tariff in selected.tariffs" :key="tariff.id" class="course-tariff crm-surface"><Ticket :size="19"/><div><strong>{{tariff.title}}</strong><small>{{tariff.accessDays ? `${tariff.accessDays} дней доступа` : 'Без ограничения срока'}} · {{tariff.isActive ? 'Активен' : 'Выключен'}}</small></div><b>{{money(tariff.price)}}</b><button v-if="canWrite" class="crm-button" type="button" :aria-label="`Изменить тариф ${tariff.title}`" @click="openTariff(tariff)">Изменить</button></article></div><div v-else class="course-empty crm-surface"><Ticket :size="26"/><h3>Тарифов пока нет</h3><p>Добавьте стоимость и срок доступа к курсу.</p></div></section>
      <section v-else-if="tab==='details'" id="course-details-panel" role="tabpanel" aria-labelledby="course-details-tab" class="course-panel"><header><div><h3>Описание курса</h3><p>Основные сведения о программе.</p></div><button v-if="canWrite" class="crm-button" type="button" @click="openCourse(selected)">Изменить</button></header><div class="course-description crm-surface"><p>{{selected.description || 'Описание ещё не добавлено.'}}</p><p v-if="selected.titleEn"><strong>Название на английском:</strong> {{selected.titleEn}}</p></div></section>
      <div v-else-if="tab==='live' && canWrite" id="course-live-panel" role="tabpanel" aria-labelledby="course-live-tab"><CourseLiveManagement :course-id="selected.id" :modules="selected.modules || []" /></div>
    </template>
    <p v-if="selectedId && loading && !selected && !editor" class="course-state" role="status">Открываем курс…</p><button v-if="selectedId && !selected && !loading && !editor" class="crm-button" type="button" @click="showList"><ArrowLeft :size="16"/> Вернуться к курсам</button>
    <form v-if="editor" class="course-editor crm-surface" @submit.prevent="save"><header><div><h2>{{editor==='course'?(editorId?'Изменить курс':'Новый курс'):editor==='tariff'?(editorId?'Изменить тариф':'Новый тариф'):editor==='module'?(editorId?'Изменить модуль':'Новый модуль'):(editorId?'Изменить урок':'Новый урок')}}</h2><p>Поля со звёздочкой обязательны.</p></div><button class="crm-button" type="button" :disabled="saving || assetBusy" @click="closeEditor">Закрыть</button></header>
      <p v-if="lessonConflict" class="course-error" role="alert">Урок изменился или был опубликован, пока вы его редактировали. Ваши изменения не сохранены: скопируйте нужный текст, закройте редактор и откройте урок снова.</p>
      <template v-if="editor==='course'"><label>Название курса *<input v-model="courseForm.titleRu" class="crm-input" required maxlength="200"/></label><label>Название на английском<input v-model="courseForm.titleEn" class="crm-input" maxlength="200"/></label><label>Описание<textarea v-model="courseForm.description" class="crm-input" rows="6" maxlength="10000"/></label></template>
      <template v-else-if="editor==='tariff'"><label>Название тарифа *<input v-model="tariffForm.title" class="crm-input" required maxlength="200" placeholder="Например, Самостоятельно"/></label><div class="course-form-grid"><label>Цена, ₽ *<input v-model="tariffForm.price" class="crm-input" required type="number" min="0" max="100000000" step="0.01"/></label><label>Срок доступа, дней<input v-model="tariffForm.accessDays" class="crm-input" type="number" min="1" max="3650" step="1" placeholder="Без ограничения"/></label></div><label class="course-check"><input v-model="tariffForm.isActive" class="crm-check" type="checkbox"/> Тариф активен</label></template>
      <template v-else-if="editor==='module'"><label>Название модуля *<input v-model="moduleForm.title" class="crm-input" required maxlength="200"/></label><label>Порядок в программе<input v-model.number="moduleForm.sortOrder" class="crm-input" type="number" min="0" max="10000" step="1" required/></label></template>
      <template v-else>
        <div class="course-publication-note" role="note"><strong>{{existingLesson?.isPublished ? 'Вы редактируете черновик урока' : 'Урок ещё не опубликован'}}</strong><span>{{existingLesson?.isPublished ? 'После сохранения ученики продолжат видеть опубликованную версию. Изменения появятся после публикации курса.' : 'Сохранённый урок появится у учеников после публикации курса.'}}</span></div>
        <label>Название урока *<input v-model="lessonForm.title" class="crm-input" required maxlength="200"/></label><div class="course-form-grid"><label>Тип урока<select v-model="lessonForm.kind" class="crm-input"><option value="TEXT">Текст</option><option value="VIDEO">Видео</option><option value="PRESENTATION">Презентация</option><option value="LIVE">Прямой эфир</option></select></label><label>Порядок в модуле<input v-model.number="lessonForm.sortOrder" class="crm-input" type="number" min="0" max="10000" step="1" required/></label></div><label v-if="lessonForm.kind==='TEXT' || lessonForm.kind==='LIVE'">{{ lessonForm.kind==='LIVE' ? 'Описание эфира *' : 'Текст урока' }}<textarea v-model="lessonForm.content" class="crm-input" rows="10" maxlength="50000" :required="lessonForm.kind==='LIVE'"/></label><label v-if="lessonForm.kind==='VIDEO'">HTTPS-ссылка на видео<input v-model="lessonForm.videoUrl" class="crm-input" type="url" maxlength="2048" placeholder="https://…" /></label><label v-if="lessonForm.kind==='PRESENTATION'">HTTPS-ссылка на презентацию<input v-model="lessonForm.presentationUrl" class="crm-input" type="url" maxlength="2048" placeholder="https://…" /></label><p v-if="lessonForm.kind==='VIDEO' || lessonForm.kind==='PRESENTATION'" class="course-hint">Файл открывается по указанной ссылке; доступ к самому файлу настраивается у его владельца.</p><p v-if="lessonForm.kind==='LIVE'" class="course-hint">Эфиры ещё не подключены. Здесь можно подготовить описание; расписание и запуск будут доступны после настройки сервиса трансляций.</p><label v-if="lessonForm.kind!=='LIVE'" class="course-check"><input v-model="lessonForm.isPreview" class="crm-check" type="checkbox"/> Разрешить открытый просмотр</label><p class="course-hint">Материал можно сохранить черновиком. Для публикации добавьте содержание урока.</p>
      </template>
      <CourseLessonAssets v-if="editor==='lesson' && editorId && existingLesson && (['VIDEO','PRESENTATION'].includes(lessonForm.kind) || existingLesson.assets?.length)" :key="editorId" :lesson-id="editorId" :kind="existingLesson.kind" :allow-upload="existingLesson.kind===lessonForm.kind && ['VIDEO','PRESENTATION'].includes(lessonForm.kind)" :editable="selected?.status==='DRAFT' || selected?.status==='PUBLISHED'" @busy-change="assetBusy=$event" @changed="loadDetail(selectedId)" />
      <p v-else-if="editor==='lesson' && ['VIDEO','PRESENTATION'].includes(lessonForm.kind)" class="course-hint">Чтобы добавить файлы, сначала сохраните урок, затем откройте его для изменения.</p>
      <p v-if="dirty" class="course-hint" role="status">Есть несохранённые изменения.</p><footer><button class="crm-button" type="button" :disabled="saving || assetBusy" @click="closeEditor">Отмена</button><button class="crm-button crm-button--primary" type="submit" :disabled="saving || assetBusy || lessonConflict"><Save :size="16"/> {{saving?'Сохраняем…':'Сохранить'}}</button></footer>
    </form>
  </section>
</template>
