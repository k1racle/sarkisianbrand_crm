<script setup lang="ts">
import { GripVertical, Plus, Save, Trash2 } from '@lucide/vue';
const config = useRuntimeConfig();
const { token } = useWorkspaceSession();
const pages = ref<any[]>([]);
const editor = ref<any>(null);
const baseline = ref('');
const busy = ref(false);
const notice = ref('');
const draggedBlock = ref<{ id: string; slug: string } | null>(null);
const blockAnnouncement = ref('');
const dirty = computed(() => Boolean(editor.value && JSON.stringify(editor.value) !== baseline.value));
const headers = computed(() => ({ Authorization: `Bearer ${token.value}` }));
function select(page: any, force = false) {
  if (!force && busy.value) return;
  if (!force && dirty.value && !confirm('Перейти к другой странице без сохранения изменений?')) return;
  editor.value = JSON.parse(JSON.stringify(page));
  baseline.value = JSON.stringify(editor.value);
  notice.value = '';
  draggedBlock.value = null;
}
async function load() {
  busy.value = true;
  try {
    pages.value = await $fetch<any[]>('/admin/storefront/pages', { baseURL: config.public.apiBase, headers: headers.value });
    if (!editor.value && pages.value.length) select(pages.value[0], true);
    return true;
  } catch { notice.value = 'Не удалось загрузить страницы. Попробуйте обновить список.'; }
  finally { busy.value = false; }
}
function createPage() {
  select({ _new: true, slug: '', title: '', eyebrow: '', lead: '', seoDescription: '', blocks: [], isActive: false, reviewRequired: false });
}
function addBlock() {
  if (busy.value || !editor.value || editor.value.blocks.length >= 40) return;
  editor.value.blocks.push({ id: `block-${crypto.randomUUID()}`, title: '', body: '' });
}
function moveBlock(index: number, direction: number) {
  if (busy.value || !editor.value) return;
  const blocks = editor.value.blocks;
  if (index < 0 || index >= blocks.length || index + direction < 0 || index + direction >= blocks.length) return;
  [blocks[index], blocks[index + direction]] = [blocks[index + direction], blocks[index]];
  blockAnnouncement.value = 'Порядок блоков изменён. Сохраните страницу.';
}
function startBlockDrag(event: DragEvent, index: number) {
  if (busy.value || !editor.value || !editor.value.blocks[index] || !event.dataTransfer) { event.preventDefault(); return; }
  draggedBlock.value = { id: editor.value.blocks[index].id, slug: editor.value.slug }; event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', 'site-page-block-order');
}
function dropBlock(event: DragEvent, index: number) {
  event.preventDefault(); const source = draggedBlock.value; draggedBlock.value = null;
  if (!source || busy.value || !editor.value || source.slug !== editor.value.slug) return;
  const blocks = editor.value.blocks, from = blocks.findIndex((block: any) => block.id === source.id);
  if (from < 0 || index < 0 || index >= blocks.length || from === index) return;
  const [block] = blocks.splice(from, 1); blocks.splice(index, 0, block); blockAnnouncement.value = 'Порядок блоков изменён. Сохраните страницу.';
}
function removeBlock(index: number) {
  if (busy.value || !editor.value || index < 0 || index >= editor.value.blocks.length) return;
  if (confirm('Удалить этот блок из страницы? Изменение применится после сохранения.')) editor.value.blocks.splice(index, 1);
}
async function save() {
  if (busy.value || !editor.value) return;
  draggedBlock.value = null;
  if (!editor.value.title.trim() || !editor.value.slug.trim()) { notice.value = 'Введите заголовок и адрес страницы.'; return; }
  busy.value = true;
  notice.value = '';
  const item = editor.value;
  const payload: any = { title: item.title, eyebrow: item.eyebrow, lead: item.lead, seoDescription: item.seoDescription || '', blocks: item.blocks, isActive: item.isActive, reviewRequired: item.reviewRequired };
  if (item._new) payload.slug = item.slug;
  else payload.revision = item.revision;
  try {
    const saved = await $fetch<any>(item._new ? '/admin/storefront/pages' : `/admin/storefront/pages/${item.slug}`, { baseURL: config.public.apiBase, headers: headers.value, method: item._new ? 'POST' : 'PATCH', body: payload });
    const index = pages.value.findIndex(page => page.slug === saved.slug);
    if (index < 0) pages.value.push(saved); else pages.value[index] = saved;
    select(saved, true);
    notice.value = 'Страница сохранена. Изменения доступны при следующем открытии страницы сайта.';
  } catch (error: any) { notice.value = Array.isArray(error?.data?.message) ? error.data.message.join('. ') : error?.data?.message || 'Не удалось сохранить страницу.'; }
  finally { busy.value = false; }
}
async function reloadSelected() {
  if (busy.value) return;
  if (dirty.value && !confirm('Загрузить сохранённую версию и отменить локальные изменения?')) return;
  const slug = editor.value?.slug;
  if (!await load()) return;
  const saved = pages.value.find(page => page.slug === slug);
  if (saved) select(saved, true);
}
async function removePage() {
  if (busy.value || !editor.value) return;
  const item = editor.value;
  if (!confirm(`Удалить страницу «${item.title}» без возможности восстановления? Ссылки на неё в настраиваемом меню также будут удалены.`)) return;
  if (!item._new && prompt(`Для подтверждения введите адрес страницы: ${item.slug}`) !== item.slug) return;
  busy.value = true;
  try {
    if (!item._new) await $fetch(`/admin/storefront/pages/${item.slug}`, { baseURL: config.public.apiBase, headers: headers.value, method: 'DELETE' });
    pages.value = pages.value.filter(page => page.slug !== item.slug);
    editor.value = null;
    baseline.value = '';
    if (pages.value.length) select(pages.value[0], true);
    notice.value = 'Страница удалена. Проверьте также ссылки в футере и других материалах.';
  } catch { notice.value = 'Не удалось удалить страницу.'; }
  finally { busy.value = false; }
}
function beforeUnload(event: BeforeUnloadEvent) { if (dirty.value || busy.value) { event.preventDefault(); event.returnValue = ''; } }
onMounted(() => { load(); window.addEventListener('beforeunload', beforeUnload); });
onBeforeUnmount(() => window.removeEventListener('beforeunload', beforeUnload));
onBeforeRouteLeave(() => !busy.value && (!dirty.value || confirm('Уйти со страницы без сохранения изменений?')));
onBeforeRouteUpdate(() => !busy.value && (!dirty.value || confirm('Перейти в другой раздел без сохранения изменений?')));
</script>

<template>
  <section data-v-ui-bffa0889dfe6 class="sb-pages-editor">
    <article data-v-ui-bffa0889dfe6 class="panel"><div data-v-ui-bffa0889dfe6 class="panel-head sb-cms-hero"><div data-v-ui-bffa0889dfe6><p data-v-ui-bffa0889dfe6 class="kicker">КОНТЕНТ САЙТА</p><h2 data-v-ui-bffa0889dfe6>Страницы</h2><span data-v-ui-bffa0889dfe6>Заголовки, тексты, порядок блоков и публикация — в одном редакторе.</span></div><button data-v-ui-bffa0889dfe6 class="sb-cms-primary" :disabled="busy" @click="createPage"><Plus data-v-ui-bffa0889dfe6 :size="16" /> Новая страница</button></div></article>
    <p data-v-ui-bffa0889dfe6 v-if="notice" class="sb-cms-notice" role="status">{{ notice }}</p>
    <div data-v-ui-bffa0889dfe6 class="sb-cms-layout">
      <aside data-v-ui-bffa0889dfe6 class="sb-cms-list panel"><button data-v-ui-bffa0889dfe6 v-for="page in pages" :key="page.slug" :class="{ active: editor?.slug === page.slug && !editor?._new }" :disabled="busy" @click="select(page)"><strong data-v-ui-bffa0889dfe6>{{ page.title }}</strong><span data-v-ui-bffa0889dfe6>/{{ page.slug }} · {{ page.isActive ? 'Опубликована' : 'Скрыта' }}</span><small data-v-ui-bffa0889dfe6 v-if="page.reviewRequired">Требует утверждения</small></button><p data-v-ui-bffa0889dfe6 v-if="!pages.length">{{ busy ? 'Загружаем…' : 'Создайте первую страницу' }}</p></aside>
      <article data-v-ui-bffa0889dfe6 v-if="editor" class="panel sb-cms-form">
        <div data-v-ui-bffa0889dfe6 class="sb-cms-toolbar"><div data-v-ui-bffa0889dfe6><b data-v-ui-bffa0889dfe6>{{ editor._new ? 'Новая страница' : 'Редактирование страницы' }}</b><small data-v-ui-bffa0889dfe6>{{ dirty ? 'Есть несохранённые изменения' : 'Изменения сохранены' }}<template v-if="editor.revision"> · версия {{ editor.revision }}</template></small></div><a data-v-ui-bffa0889dfe6 v-if="!editor._new && editor.isActive" :href="`/${editor.slug}`" target="_blank" rel="noopener noreferrer">Посмотреть на сайте</a></div>
        <label data-v-ui-bffa0889dfe6>Адрес страницы<input data-v-ui-bffa0889dfe6 v-model="editor.slug" :disabled="!editor._new || busy" maxlength="80" placeholder="about" /><small data-v-ui-bffa0889dfe6>Латинские буквы, цифры и дефисы. Адрес существующей страницы не меняется.</small></label>
        <label data-v-ui-bffa0889dfe6>Надзаголовок<input data-v-ui-bffa0889dfe6 v-model="editor.eyebrow" :disabled="busy" maxlength="80" /></label>
        <label data-v-ui-bffa0889dfe6>Заголовок страницы<input data-v-ui-bffa0889dfe6 v-model="editor.title" :disabled="busy" maxlength="180" /></label>
        <label data-v-ui-bffa0889dfe6>Вводный текст<textarea data-v-ui-bffa0889dfe6 v-model="editor.lead" :disabled="busy" maxlength="1500" rows="3" /></label>
        <label data-v-ui-bffa0889dfe6>Описание для поисковых систем<textarea data-v-ui-bffa0889dfe6 v-model="editor.seoDescription" :disabled="busy" maxlength="320" rows="2" placeholder="Если пусто, используется вводный текст" /></label>
        <div data-v-ui-bffa0889dfe6 class="sb-cms-flags"><label data-v-ui-bffa0889dfe6><input data-v-ui-bffa0889dfe6 v-model="editor.isActive" :disabled="busy" type="checkbox" /> Опубликована</label><label data-v-ui-bffa0889dfe6><input data-v-ui-bffa0889dfe6 v-model="editor.reviewRequired" :disabled="busy" type="checkbox" /> Требует юридического утверждения</label></div>
        <p data-v-ui-bffa0889dfe6 v-if="editor.reviewRequired" class="sb-cms-review">На странице отображается предупреждение, индексация отключена. Снимите отметку только после проверки документа, реквизитов и фактических условий работы.</p>
        <div data-v-ui-bffa0889dfe6 class="sb-cms-blocks-head"><h3 data-v-ui-bffa0889dfe6>Блоки страницы</h3><button data-v-ui-bffa0889dfe6 class="sb-cms-primary" :disabled="busy || editor.blocks.length >= 40" @click="addBlock">Добавить блок</button></div>
        <section data-v-ui-bffa0889dfe6 v-for="(block, index) in editor.blocks" :key="block.id" class="sb-cms-block-editor" @dragover.prevent @drop="dropBlock($event, index)"><button data-v-ui-bffa0889dfe6 type="button" class="sb-cms-drag-handle" :disabled="busy" :draggable="!busy" :aria-label="'Перетащить блок ' + (index + 1)" @dragstart="startBlockDrag($event, index)" @dragend="draggedBlock = null" @keydown.alt.up.prevent="moveBlock(index, -1)" @keydown.alt.down.prevent="moveBlock(index, 1)"><GripVertical data-v-ui-bffa0889dfe6 :size="20" /></button><div data-v-ui-bffa0889dfe6 class="workspace-sort-content"><div data-v-ui-bffa0889dfe6 class="sb-cms-block-toolbar"><span data-v-ui-bffa0889dfe6>Блок {{ index + 1 }}</span><div data-v-ui-bffa0889dfe6><button data-v-ui-bffa0889dfe6 :disabled="busy" aria-label="Удалить блок" @click="removeBlock(index)">Удалить</button></div></div><label data-v-ui-bffa0889dfe6>Заголовок блока<input data-v-ui-bffa0889dfe6 v-model="block.title" :disabled="busy" maxlength="180" /></label><label data-v-ui-bffa0889dfe6>Текст<textarea data-v-ui-bffa0889dfe6 v-model="block.body" :disabled="busy" maxlength="20000" rows="7" /><small data-v-ui-bffa0889dfe6>Каждая новая строка — отдельный абзац. HTML не исполняется.</small></label></div></section>
        <p data-v-ui-bffa0889dfe6 class="sb-cms-order-announcement" aria-live="polite">{{ blockAnnouncement }}</p>
        <footer data-v-ui-bffa0889dfe6 class="sb-cms-savebar"><button data-v-ui-bffa0889dfe6 class="sb-cms-primary" :disabled="busy" @click="save"><Save data-v-ui-bffa0889dfe6 :size="16" /> {{ busy ? 'Сохраняем…' : 'Сохранить страницу' }}</button><button data-v-ui-bffa0889dfe6 :disabled="busy || editor._new" @click="reloadSelected">Загрузить сохранённую версию</button><button data-v-ui-bffa0889dfe6 :disabled="busy" aria-label="Удалить страницу" @click="removePage"><Trash2 data-v-ui-bffa0889dfe6 :size="16" /> Удалить страницу</button></footer>
      </article>
    </div>
  </section>
</template>


