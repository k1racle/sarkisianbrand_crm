<script setup lang="ts">
import { GripVertical, Plus, Save, Trash2 } from '@lucide/vue';
const config = useRuntimeConfig();
const { token } = useWorkspaceSession();
const pages = ref<any[]>([]);
const editorialLabels: Record<string, string> = { club: 'О клубе', 'club-referrals': 'Для покупателей', business: 'Для бизнеса', partnerships: 'Для блогеров' };
const editorialLabel = (page: any) => editorialLabels[page.slug] || page.title;
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
      <aside data-v-ui-bffa0889dfe6 class="sb-cms-list panel"><button data-v-ui-bffa0889dfe6 v-for="page in pages" :key="page.slug" :class="{ active: editor?.slug === page.slug && !editor?._new }" :disabled="busy" @click="select(page)"><strong data-v-ui-bffa0889dfe6>{{ editorialLabel(page) }}</strong><span data-v-ui-bffa0889dfe6>{{ page.title }} · /{{ page.slug }} · {{ page.isActive ? 'Опубликована' : 'Скрыта' }}</span><small data-v-ui-bffa0889dfe6 v-if="page.reviewRequired">Требует утверждения</small></button><p data-v-ui-bffa0889dfe6 v-if="!pages.length">{{ busy ? 'Загружаем…' : 'Создайте первую страницу' }}</p></aside>
      <article data-v-ui-bffa0889dfe6 v-if="editor" class="panel sb-cms-form">
        <div data-v-ui-bffa0889dfe6 class="sb-cms-toolbar"><div data-v-ui-bffa0889dfe6><b data-v-ui-bffa0889dfe6>{{ editor._new ? 'Новая страница' : 'Редактирование страницы' }}</b><small data-v-ui-bffa0889dfe6>{{ dirty ? 'Есть несохранённые изменения' : 'Изменения сохранены' }}<template v-if="editor.revision"> · версия {{ editor.revision }}</template></small></div><a data-v-ui-bffa0889dfe6 v-if="!editor._new && editor.isActive" :href="`/${editor.slug}`" target="_blank" rel="noopener noreferrer">Посмотреть на сайте</a></div>
        <label data-v-ui-bffa0889dfe6>Адрес страницы<input data-v-ui-bffa0889dfe6 v-model="editor.slug" :disabled="!editor._new || busy" maxlength="80" placeholder="about" /><small data-v-ui-bffa0889dfe6>Латинские буквы, цифры и дефисы. Адрес существующей страницы не меняется.</small></label>
        <label data-v-ui-bffa0889dfe6>Надзаголовок<input data-v-ui-bffa0889dfe6 v-model="editor.eyebrow" :disabled="busy" maxlength="80" /></label>
        <label data-v-ui-bffa0889dfe6>Заголовок страницы<input data-v-ui-bffa0889dfe6 v-model="editor.title" :disabled="busy" maxlength="180" /></label>
        <label data-v-ui-bffa0889dfe6>Вводный текст<textarea data-v-ui-bffa0889dfe6 v-model="editor.lead" :disabled="busy" maxlength="1500" rows="3" /></label>
        <label data-v-ui-bffa0889dfe6>Описание для поисковых систем<textarea data-v-ui-bffa0889dfe6 v-model="editor.seoDescription" :disabled="busy" maxlength="320" rows="2" placeholder="Если пусто, используется вводный текст" /></label>
        <div data-v-ui-bffa0889dfe6 class="sb-cms-flags"><label data-v-ui-bffa0889dfe6><input data-v-ui-bffa0889dfe6 v-model="editor.isActive" :disabled="busy" type="checkbox" /> Опубликована</label><label data-v-ui-bffa0889dfe6><input data-v-ui-bffa0889dfe6 v-model="editor.reviewRequired" :disabled="busy" type="checkbox" /> Требует юридического утверждения</label></div>
        <p data-v-ui-bffa0889dfe6 v-if="editor.reviewRequired" class="sb-cms-review">На странице отображается предупреждение, индексация отключена. Снимите отметку только после проверки документа, реквизитов и фактических условий работы.</p>
        <section v-for="biography in editor.blocks.filter((block: any) => block.kind === 'biography')" :key="'socials-' + biography.id" class="sb-cms-founder-socials">
          <h3>Личные соцсети основательницы</h3><p>Эти ссылки отображаются под биографией и не связаны с общими соцсетями бренда. Пустые поля скрыты на сайте.</p>
          <label v-for="network in [{key:'vk',name:'ВКонтакте'},{key:'telegram',name:'Telegram'},{key:'instagram',name:'Instagram'},{key:'youtube',name:'YouTube'},{key:'tiktok',name:'TikTok'}]" :key="network.key">{{ network.name }}<input type="url" :aria-label="'Личная страница: ' + network.name" :value="biography.socials?.[network.key] || ''" :disabled="busy" maxlength="500" placeholder="https://…" @input="(biography.socials ||= {})[network.key] = ($event.target as HTMLInputElement).value" /></label>
        </section>
        <div data-v-ui-bffa0889dfe6 class="sb-cms-blocks-head"><h3 data-v-ui-bffa0889dfe6>Блоки страницы</h3><button data-v-ui-bffa0889dfe6 class="sb-cms-primary" :disabled="busy || editor.blocks.length >= 40" @click="addBlock">Добавить блок</button></div>
        <section data-v-ui-bffa0889dfe6 v-for="(block, index) in editor.blocks" :key="block.id" class="sb-cms-block-editor" @dragover.prevent @drop="dropBlock($event, index)"><button data-v-ui-bffa0889dfe6 type="button" class="sb-cms-drag-handle" :disabled="busy" :draggable="!busy" :aria-label="'Перетащить блок ' + (index + 1)" @dragstart="startBlockDrag($event, index)" @dragend="draggedBlock = null" @keydown.alt.up.prevent="moveBlock(index, -1)" @keydown.alt.down.prevent="moveBlock(index, 1)"><GripVertical data-v-ui-bffa0889dfe6 :size="20" /></button><div data-v-ui-bffa0889dfe6 class="workspace-sort-content"><div data-v-ui-bffa0889dfe6 class="sb-cms-block-toolbar"><span data-v-ui-bffa0889dfe6>Блок {{ index + 1 }}</span><div data-v-ui-bffa0889dfe6><button data-v-ui-bffa0889dfe6 :disabled="busy" aria-label="Удалить блок" @click="removeBlock(index)">Удалить</button></div></div><div data-v-ui-bffa0889dfe6 class="sb-cms-flags"><label data-v-ui-bffa0889dfe6>Формат<select data-v-ui-bffa0889dfe6 aria-label="Формат" :value="block.kind || 'text'" :disabled="busy" @change="block.kind = ($event.target as HTMLSelectElement).value"><option value="text">Текстовый раздел</option><option value="hero">Обложка и кнопки страницы</option><option value="feature">Карточка преимущества</option><option value="steps">Пошаговый процесс</option><option value="faq">Раскрываемый вопрос</option><option value="action">Приглашение к действию</option><option value="biography">Биография и фотослайдер</option></select></label><label data-v-ui-bffa0889dfe6>Иконка<select data-v-ui-bffa0889dfe6 aria-label="Иконка" :value="block.icon || ''" :disabled="busy" @change="block.icon = ($event.target as HTMLSelectElement).value || undefined"><option value="">Без иконки</option><option value="business">Бизнес</option><option value="calendar">Календарь</option><option value="users">Команда</option><option value="gift">Бонусы</option><option value="link">Ссылка</option><option value="chart">Аналитика</option><option value="wallet">Выплаты</option><option value="shield">Условия</option></select></label></div><label data-v-ui-bffa0889dfe6>Заголовок блока<input data-v-ui-bffa0889dfe6 v-model="block.title" :disabled="busy" maxlength="180" /></label><label data-v-ui-bffa0889dfe6>Текст<textarea data-v-ui-bffa0889dfe6 v-model="block.body" :disabled="busy" maxlength="20000" rows="7" /><small data-v-ui-bffa0889dfe6>Каждая новая строка — отдельный абзац. HTML не исполняется.</small></label><details data-v-ui-bffa0889dfe6 class="sb-cms-page-actions"><summary data-v-ui-bffa0889dfe6>Кнопки блока / обложки</summary><label data-v-ui-bffa0889dfe6>Подпись основной кнопки<input data-v-ui-bffa0889dfe6 v-model="block.buttonLabel" :disabled="busy" maxlength="80" /></label><label data-v-ui-bffa0889dfe6>Адрес основной кнопки<input data-v-ui-bffa0889dfe6 v-model="block.buttonUrl" :disabled="busy" maxlength="500" placeholder="/business-registration" /></label><label data-v-ui-bffa0889dfe6>Подпись второй кнопки<input data-v-ui-bffa0889dfe6 v-model="block.secondaryLabel" :disabled="busy" maxlength="80" /></label><label data-v-ui-bffa0889dfe6>Адрес второй кнопки<input data-v-ui-bffa0889dfe6 v-model="block.secondaryUrl" :disabled="busy" maxlength="500" placeholder="/contacts" /></label><small data-v-ui-bffa0889dfe6>Подпись и адрес заполняются вместе. Для шагов и обложки каждая новая строка текста — отдельный пункт.</small></details><div v-if="block.kind === 'biography'" class="sb-cms-biography-images"><h3>Фотографии слайдера</h3><div v-for="(photo, photoIndex) in (block.images || [])" :key="photoIndex"><AdminMediaPicker :model-value="photo" :api-base="config.public.apiBase" :token="token" :disabled="busy" :label="'Фотография ' + (photoIndex + 1)" @update:model-value="block.images[photoIndex] = $event" /><button type="button" :disabled="busy" :aria-label="'Удалить фотографию ' + (photoIndex + 1)" @click="block.images.splice(photoIndex, 1)"><Trash2 :size="18" /></button></div><button type="button" :disabled="busy || (block.images || []).length >= 12" @click="(block.images ||= []).push('')"><Plus :size="18" /> Добавить фотографию</button><small>До 12 фотографий. Текст биографии редактируется в поле выше.</small></div></div></section>
        <p data-v-ui-bffa0889dfe6 class="sb-cms-order-announcement" aria-live="polite">{{ blockAnnouncement }}</p>
        <footer data-v-ui-bffa0889dfe6 class="sb-cms-savebar"><button data-v-ui-bffa0889dfe6 class="sb-cms-primary" :disabled="busy" @click="save"><Save data-v-ui-bffa0889dfe6 :size="16" /> {{ busy ? 'Сохраняем…' : 'Сохранить страницу' }}</button><button data-v-ui-bffa0889dfe6 :disabled="busy || editor._new" @click="reloadSelected">Загрузить сохранённую версию</button><button data-v-ui-bffa0889dfe6 :disabled="busy" aria-label="Удалить страницу" @click="removePage"><Trash2 data-v-ui-bffa0889dfe6 :size="16" /> Удалить страницу</button></footer>
      </article>
    </div>
  </section>
</template>
