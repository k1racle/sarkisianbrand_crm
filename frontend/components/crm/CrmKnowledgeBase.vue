<script setup lang="ts">
import { ArrowLeft, BookOpen, Check, ChevronLeft, ChevronRight, Clock3, FileText, FolderOpen, Pencil, Plus, RefreshCw, Save, Search, X } from '@lucide/vue';
type ArticleSummary = { id: string; title: string; category: string; excerpt: string; status: string; version: number; updatedAt: string };
type Article = ArticleSummary & { body: string; canWrite?: boolean };
type Listing = { items: ArticleSummary[]; categories: { name: string; count: number }[]; total: number; page: number; pages: number; canWrite: boolean };
const { token } = useWorkspaceSession(), config = useRuntimeConfig();
const data = ref<Listing | null>(null), selected = ref<Article | null>(null), activeId = ref('');
const search = ref(''), status = ref('PUBLISHED'), category = ref('');
const loading = ref(false), opening = ref(false), saving = ref(false), editing = ref(false);
const listError = ref(''), detailError = ref(''), notice = ref('');
const readerTitle = ref<HTMLElement | null>(null), editorTitle = ref<HTMLInputElement | null>(null);
const form = reactive({ title: '', category: '', body: '', status: 'DRAFT' });
const original = ref('');
const labels: Record<string, string> = { DRAFT: 'Черновик', PUBLISHED: 'Опубликована', ARCHIVED: 'В архиве' };
const dirty = computed(() => editing.value && JSON.stringify(form) !== original.value);
const reading = computed(() => !!activeId.value || editing.value);
const categories = computed(() => data.value?.categories || []);
const categoryTotal = computed(() => categories.value.reduce((sum, item) => sum + item.count, 0));
const paragraphs = computed(() => selected.value?.body.split(/\n\s*\n/).filter(Boolean) || []);
const readingMinutes = computed(() => Math.max(1, Math.ceil((selected.value?.body.trim().split(/\s+/).length || 0) / 180)));
let listVersion = 0, detailVersion = 0, alive = true;
let listController: AbortController | undefined, detailController: AbortController | undefined;
let searchTimer: ReturnType<typeof setTimeout> | undefined;
const request = <T,>(path: string, options: any = {}) => $fetch<T>('/helpdesk/knowledge' + path, { baseURL: config.public.apiBase, headers: { Authorization: `Bearer ${token.value}` }, timeout: 20000, retry: 0, ...options });
const message = (e: any) => Array.isArray(e?.data?.message) ? e.data.message.join('. ') : e?.data?.message || 'Не удалось загрузить данные. Попробуйте ещё раз.';
const date = (value: string) => new Date(value).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });

async function load(page = 1) {
  clearTimeout(searchTimer);
  const current = ++listVersion;
  listController?.abort(); listController = new AbortController(); loading.value = true; listError.value = '';
  try {
    const result = await request<Listing>('', { query: { search: search.value, status: status.value, category: category.value || undefined, page }, signal: listController.signal });
    if (alive && current === listVersion) data.value = result;
  } catch (e) { if (alive && current === listVersion) listError.value = message(e); }
  finally { if (alive && current === listVersion) loading.value = false; }
}
function mayLeave() { return !saving.value && (!dirty.value || window.confirm('Уйти без сохранения изменений статьи?')); }
function resetReader() {
  ++detailVersion; detailController?.abort(); activeId.value = ''; selected.value = null;
  opening.value = false; editing.value = false; detailError.value = ''; notice.value = '';
}
async function back() {
  if (!mayLeave()) return;
  const id = activeId.value; resetReader();
  await nextTick(); document.getElementById('knowledge-' + id)?.focus({ preventScroll: true });
}
function chooseCategory(value: string) {
  if (!mayLeave()) return;
  resetReader(); category.value = value;
}
function selectCategory(event: Event) {
  const select = event.target as HTMLSelectElement;
  chooseCategory(select.value);
  select.value = category.value;
}
async function open(id: string) {
  if (!mayLeave()) return;
  resetReader(); activeId.value = id;
  const current = ++detailVersion;
  detailController = new AbortController(); opening.value = true;
  try {
    const result = await request<Article>('/' + id, { signal: detailController.signal });
    if (!alive || current !== detailVersion) return;
    selected.value = result;
  } catch (e) { if (alive && current === detailVersion) detailError.value = message(e); }
  finally {
    if (alive && current === detailVersion) { opening.value = false; await nextTick(); readerTitle.value?.focus({ preventScroll: true }); }
  }
}
async function edit() {
  if (!selected.value?.canWrite || saving.value) return;
  const article = selected.value;
  Object.assign(form, { title: article.title, category: article.category, body: article.body, status: article.status });
  original.value = JSON.stringify(form); editing.value = true; notice.value = ''; detailError.value = '';
  await nextTick(); editorTitle.value?.focus();
}
async function create() {
  if (!data.value?.canWrite || !mayLeave()) return;
  resetReader(); Object.assign(form, { title: '', category: category.value || 'Общие инструкции', body: '', status: 'DRAFT' });
  original.value = JSON.stringify(form); editing.value = true;
  await nextTick(); editorTitle.value?.focus();
}
async function cancelEdit() {
  if (!mayLeave()) return;
  editing.value = false; detailError.value = '';
  await nextTick(); readerTitle.value?.focus({ preventScroll: true });
}
async function save() {
  if (saving.value) return;
  const title = form.title.trim(), bodyText = form.body.trim(), section = form.category.trim();
  if (title.length < 3 || bodyText.length < 10 || !section) { detailError.value = 'Укажите название от 3 символов, раздел и текст от 10 символов.'; return; }
  const identity = token.value, current = detailVersion, destination = selected.value?.id;
  saving.value = true; detailError.value = '';
  try {
    const body = { title, category: section, body: bodyText, ...(destination ? { status: form.status, version: selected.value!.version } : {}) };
    const result = await request<Article>(destination ? '/' + destination : '', { method: destination ? 'PATCH' : 'POST', body });
    if (!alive || identity !== token.value || current !== detailVersion) return;
    selected.value = { ...result, canWrite: true }; activeId.value = result.id; editing.value = false;
    notice.value = destination ? 'Статья сохранена.' : 'Черновик создан. Чтобы опубликовать его, откройте редактирование и выберите состояние «Опубликована».';
    void load(data.value?.page || 1);
    await nextTick(); readerTitle.value?.focus({ preventScroll: true });
  } catch (e) { if (alive && identity === token.value && current === detailVersion) detailError.value = message(e); }
  finally { if (alive && identity === token.value && current === detailVersion) saving.value = false; }
}
function clearFilters() { search.value = ''; status.value = 'PUBLISHED'; category.value = ''; }
watch([search, status, category], (values, previous) => {
  clearTimeout(searchTimer); ++listVersion; listController?.abort();
  if (!token.value) return;
  loading.value = true;
  searchTimer = setTimeout(() => void load(), values[0] !== previous[0] ? 300 : 0);
});
watch(token, () => {
  ++listVersion; listController?.abort(); clearTimeout(searchTimer); resetReader();
  data.value = null; saving.value = false; listError.value = ''; clearFilters();
  if (token.value) void load();
});
function beforeUnload(event: BeforeUnloadEvent) { if (dirty.value || saving.value) { event.preventDefault(); event.returnValue = ''; } }
onBeforeRouteLeave(() => mayLeave());
onMounted(() => { void load(); window.addEventListener('beforeunload', beforeUnload); });
onUnmounted(() => {
  alive = false; ++listVersion; ++detailVersion; listController?.abort(); detailController?.abort();
  clearTimeout(searchTimer); window.removeEventListener('beforeunload', beforeUnload);
});
</script>

<template>
  <main class="crm-standard crm-knowledge">
    <header class="crm-page-header">
      <div><h1>База знаний</h1><p>Инструкции, рабочие процессы и ответы на частые вопросы</p></div>
      <button v-if="data?.canWrite" type="button" class="crm-button crm-button--primary" :disabled="saving" @click="create"><Plus :size="18" />Новая статья</button>
    </header>
    <div class="crm-knowledge-layout">
      <aside class="crm-knowledge-sections crm-surface" aria-label="Разделы базы знаний">
        <div class="crm-knowledge-sections-heading"><BookOpen :size="19" /><strong>Разделы</strong></div>
        <nav class="crm-knowledge-section-list" aria-label="Выбрать раздел">
          <button type="button" :aria-current="!category ? 'true' : undefined" :disabled="saving" @click="chooseCategory('')"><BookOpen :size="18" /><span>Все статьи</span><small>{{ categoryTotal }}</small></button>
          <button v-for="item in categories" :key="item.name" type="button" :aria-current="category === item.name ? 'true' : undefined" :disabled="saving" @click="chooseCategory(item.name)"><FolderOpen :size="18" /><span>{{ item.name }}</span><small>{{ item.count }}</small></button>
          <button v-if="category && !categories.some(item => item.name === category)" type="button" aria-current="true" :disabled="saving" @click="chooseCategory(category)"><FolderOpen :size="18" /><span>{{ category }}</span><small>0</small></button>
        </nav>
        <select class="crm-input crm-knowledge-mobile-sections" aria-label="Раздел базы знаний" :value="category" :disabled="saving" @change="selectCategory">
          <option value="">Все разделы · {{ categoryTotal }}</option><option v-for="item in categories" :key="item.name" :value="item.name">{{ item.name }} · {{ item.count }}</option><option v-if="category && !categories.some(item => item.name === category)" :value="category">{{ category }} · 0</option>
        </select>
        <p class="crm-knowledge-sections-note">{{ data?.canWrite ? 'Соберите здесь знания команды: от первого входа до сложных рабочих процессов.' : 'Выберите раздел или найдите инструкцию по ключевым словам.' }}</p>
      </aside>

      <div class="crm-knowledge-content">
        <template v-if="!reading">
          <form class="crm-knowledge-toolbar crm-surface" aria-label="Поиск по базе знаний" @submit.prevent="load()">
            <label class="crm-input-group crm-knowledge-search"><Search :size="18" /><input v-model="search" class="crm-input" type="search" aria-label="Поиск по статьям" maxlength="100" placeholder="Найти инструкцию по названию или тексту" /><button v-if="search" type="button" class="crm-knowledge-clear" aria-label="Очистить поиск" @click="search = ''"><X :size="17" /></button></label>
            <select v-if="data?.canWrite || status !== 'PUBLISHED'" v-model="status" class="crm-input" aria-label="Состояние статей"><option value="PUBLISHED">Опубликованные</option><option value="DRAFT">Черновики</option><option value="ARCHIVED">Архив</option><option value="ALL">Все состояния</option></select>
            <button type="submit" class="crm-button crm-button--icon" aria-label="Обновить статьи" title="Обновить статьи" :disabled="loading"><RefreshCw :size="18" /></button>
          </form>
          <div class="crm-knowledge-list-heading"><h2>{{ category || 'Все статьи' }}</h2><span role="status">{{ loading ? 'Ищем статьи…' : 'Найдено: ' + (data?.total ?? 0) }}</span></div>
          <div v-if="listError" class="crm-knowledge-empty crm-surface" role="alert"><BookOpen :size="30" /><p>{{ listError }}</p><button class="crm-button" @click="load()">Повторить</button></div>
          <section v-else class="crm-knowledge-results" aria-label="Статьи базы знаний" :aria-busy="loading">
            <div v-if="!data" class="crm-knowledge-empty crm-surface"><BookOpen :size="30" /><p>Загружаем статьи…</p></div>
            <div v-else-if="!data.items.length && !loading" class="crm-knowledge-empty crm-surface"><Search :size="30" /><h2>Статьи не найдены</h2><p>Попробуйте другое название или выберите другой раздел.</p><button v-if="search || category || status !== 'PUBLISHED'" class="crm-button" @click="clearFilters">Сбросить фильтры</button><button v-else-if="data.canWrite" class="crm-button" @click="create"><Plus :size="18" />Создать первую статью</button></div>
            <div v-else class="crm-knowledge-grid">
              <button v-for="row in data.items" :id="'knowledge-' + row.id" :key="row.id" type="button" class="crm-knowledge-card crm-surface" :disabled="loading" @click="open(row.id)">
                <span class="crm-knowledge-card-top"><span class="crm-knowledge-card-icon"><FileText :size="20" /></span><span class="crm-knowledge-category">{{ row.category }}</span><span v-if="row.status !== 'PUBLISHED'" class="crm-badge">{{ labels[row.status] }}</span></span>
                <strong>{{ row.title }}</strong><span class="crm-knowledge-excerpt">{{ row.excerpt }}</span>
                <span class="crm-knowledge-card-bottom"><small>Обновлена {{ date(row.updatedAt) }}</small><ChevronRight :size="18" /></span>
              </button>
            </div>
            <div v-if="data && data.pages > 1" class="crm-knowledge-pagination"><span>Страница {{ data.page }} из {{ data.pages }}</span><div><button class="crm-button" :disabled="loading || data.page <= 1" aria-label="Предыдущая страница" @click="load(data.page - 1)"><ChevronLeft :size="18" />Назад</button><button class="crm-button" :disabled="loading || data.page >= data.pages" @click="load(data.page + 1)">Далее<ChevronRight :size="18" /></button></div></div>
          </section>
        </template>

        <template v-else>
          <div class="crm-knowledge-back"><button type="button" class="crm-button" :disabled="saving" @click="back"><ArrowLeft :size="18" />К статьям</button><span>{{ editing ? (selected ? 'Редактирование' : 'Новая статья') : selected?.category }}</span></div>
          <p v-if="notice" class="crm-knowledge-notice crm-surface" role="status"><Check :size="18" />{{ notice }}</p>
          <p v-if="detailError" class="crm-knowledge-notice crm-surface" role="alert">{{ detailError }}<button v-if="!editing && activeId" class="crm-button" @click="open(activeId)">Повторить</button></p>
          <form v-if="editing" class="crm-knowledge-editor crm-surface" aria-label="Редактор статьи" @submit.prevent="save">
            <fieldset :disabled="saving">
              <label class="crm-knowledge-field-wide">Название статьи<input ref="editorTitle" v-model="form.title" class="crm-input" required minlength="3" maxlength="200" placeholder="Например, как передать заказ на сборку" /></label>
              <label>Раздел<input v-model="form.category" class="crm-input" list="knowledge-categories" required maxlength="80" /><datalist id="knowledge-categories"><option v-for="item in categories" :key="item.name" :value="item.name" /></datalist></label>
              <label v-if="selected">Состояние<select v-model="form.status" class="crm-input" aria-label="Состояние статьи"><option v-for="(label, key) in labels" :key="key" :value="key">{{ label }}</option></select></label>
              <div v-else class="crm-knowledge-draft-note"><FileText :size="18" /><span>Новая статья будет сохранена как черновик</span></div>
              <label class="crm-knowledge-field-wide">Текст инструкции<textarea v-model="form.body" class="crm-input" required minlength="10" maxlength="50000" rows="16" placeholder="Опишите действия по шагам. Разделяйте абзацы пустой строкой." /></label>
            </fieldset>
            <p class="crm-inline-note">Черновики и архив доступны редакторам. Опубликованные статьи видят сотрудники с доступом к поддержке.</p>
            <div class="crm-knowledge-editor-footer"><span>{{ dirty ? 'Есть несохранённые изменения' : selected ? 'Все изменения сохранены' : 'Заполните название и текст статьи' }}</span><button type="button" class="crm-button" :disabled="saving" @click="cancelEdit">Отмена</button><button type="submit" class="crm-button crm-button--primary" :disabled="saving"><Save :size="18" />{{ saving ? 'Сохраняем…' : selected ? 'Сохранить статью' : 'Создать черновик' }}</button></div>
          </form>
          <div v-else-if="opening" class="crm-knowledge-empty crm-surface" role="status"><BookOpen :size="30" /><p>Открываем статью…</p></div>
          <article v-else-if="selected" class="crm-knowledge-reader crm-surface" aria-label="Текст статьи">
            <div class="crm-knowledge-reader-tools"><span class="crm-badge">{{ labels[selected.status] }}</span><button v-if="selected.canWrite" type="button" class="crm-button" @click="edit"><Pencil :size="17" />Редактировать</button></div>
            <div class="crm-knowledge-prose"><h2 ref="readerTitle" tabindex="-1">{{ selected.title }}</h2><div class="crm-knowledge-reader-meta"><span><Clock3 :size="15" />{{ readingMinutes }} мин на чтение</span><span>Обновлена {{ date(selected.updatedAt) }}</span></div><div class="crm-knowledge-text"><p v-for="(paragraph, index) in paragraphs" :key="index">{{ paragraph }}</p></div></div>
          </article>
        </template>
      </div>
    </div>
  </main>
</template>
