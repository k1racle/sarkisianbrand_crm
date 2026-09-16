<script setup lang="ts">
import { Plus, Save, Trash2 } from '@lucide/vue';
const config = useRuntimeConfig();
const { token } = useWorkspaceSession();
const pages = ref<any[]>([]);
const editor = ref<any>(null);
const baseline = ref('');
const busy = ref(false);
const notice = ref('');
const dirty = computed(() => Boolean(editor.value && JSON.stringify(editor.value) !== baseline.value));
const headers = computed(() => ({ Authorization: `Bearer ${token.value}` }));
function select(page: any, force = false) {
  if (!force && dirty.value && !confirm('Перейти к другой странице без сохранения изменений?')) return;
  editor.value = JSON.parse(JSON.stringify(page));
  baseline.value = JSON.stringify(editor.value);
  notice.value = '';
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
  editor.value.blocks.push({ id: `block-${crypto.randomUUID()}`, title: '', body: '' });
}
function moveBlock(index: number, direction: number) {
  const blocks = editor.value.blocks;
  [blocks[index], blocks[index + direction]] = [blocks[index + direction], blocks[index]];
}
function removeBlock(index: number) {
  if (confirm('Удалить этот блок из страницы? Изменение применится после сохранения.')) editor.value.blocks.splice(index, 1);
}
async function save() {
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
  if (dirty.value && !confirm('Загрузить сохранённую версию и отменить локальные изменения?')) return;
  const slug = editor.value?.slug;
  if (!await load()) return;
  const saved = pages.value.find(page => page.slug === slug);
  if (saved) select(saved, true);
}
async function removePage() {
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
function beforeUnload(event: BeforeUnloadEvent) { if (dirty.value) { event.preventDefault(); event.returnValue = ''; } }
onMounted(() => { load(); window.addEventListener('beforeunload', beforeUnload); });
onBeforeUnmount(() => window.removeEventListener('beforeunload', beforeUnload));
onBeforeRouteLeave(() => !dirty.value || confirm('Уйти со страницы без сохранения изменений?'));
onBeforeRouteUpdate(() => !dirty.value || confirm('Перейти в другой раздел без сохранения изменений?'));
</script>

<template>
  <section class="sb-pages-editor">
    <article class="panel"><div class="panel-head sb-cms-hero"><div><p class="kicker">КОНТЕНТ САЙТА</p><h2>Страницы</h2><span>Заголовки, тексты, порядок блоков и публикация — в одном редакторе.</span></div><button class="sb-cms-primary" :disabled="busy" @click="createPage"><Plus :size="16" /> Новая страница</button></div></article>
    <p v-if="notice" class="sb-cms-notice" role="status">{{ notice }}</p>
    <div class="sb-cms-layout">
      <aside class="sb-cms-list panel"><button v-for="page in pages" :key="page.slug" :class="{ active: editor?.slug === page.slug && !editor?._new }" :disabled="busy" @click="select(page)"><strong>{{ page.title }}</strong><span>/{{ page.slug }} · {{ page.isActive ? 'Опубликована' : 'Скрыта' }}</span><small v-if="page.reviewRequired">Требует утверждения</small></button><p v-if="!pages.length">{{ busy ? 'Загружаем…' : 'Создайте первую страницу' }}</p></aside>
      <article v-if="editor" class="panel sb-cms-form">
        <div class="sb-cms-toolbar"><div><b>{{ editor._new ? 'Новая страница' : 'Редактирование страницы' }}</b><small>{{ dirty ? 'Есть несохранённые изменения' : 'Изменения сохранены' }}<template v-if="editor.revision"> · версия {{ editor.revision }}</template></small></div><a v-if="!editor._new && editor.isActive" :href="`/${editor.slug}`" target="_blank" rel="noopener noreferrer">Посмотреть на сайте</a></div>
        <label>Адрес страницы<input v-model="editor.slug" :disabled="!editor._new || busy" maxlength="80" placeholder="about" /><small>Латинские буквы, цифры и дефисы. Адрес существующей страницы не меняется.</small></label>
        <label>Надзаголовок<input v-model="editor.eyebrow" maxlength="80" /></label>
        <label>Заголовок страницы<input v-model="editor.title" maxlength="180" /></label>
        <label>Вводный текст<textarea v-model="editor.lead" maxlength="1500" rows="3" /></label>
        <label>Описание для поисковых систем<textarea v-model="editor.seoDescription" maxlength="320" rows="2" placeholder="Если пусто, используется вводный текст" /></label>
        <div class="sb-cms-flags"><label><input v-model="editor.isActive" type="checkbox" /> Опубликована</label><label><input v-model="editor.reviewRequired" type="checkbox" /> Требует юридического утверждения</label></div>
        <p v-if="editor.reviewRequired" class="sb-cms-review">На странице отображается предупреждение, индексация отключена. Снимите отметку только после проверки документа, реквизитов и фактических условий работы.</p>
        <div class="sb-cms-blocks-head"><h3>Блоки страницы</h3><button class="sb-cms-primary" :disabled="busy || editor.blocks.length >= 40" @click="addBlock">Добавить блок</button></div>
        <section v-for="(block, index) in editor.blocks" :key="block.id" class="sb-cms-block-editor"><div class="sb-cms-block-toolbar"><span>Блок {{ index + 1 }}</span><div><button :disabled="busy || index === 0" aria-label="Переместить блок выше" @click="moveBlock(index, -1)">Выше</button><button :disabled="busy || index === editor.blocks.length - 1" aria-label="Переместить блок ниже" @click="moveBlock(index, 1)">Ниже</button><button :disabled="busy" aria-label="Удалить блок" @click="removeBlock(index)">Удалить</button></div></div><label>Заголовок блока<input v-model="block.title" maxlength="180" /></label><label>Текст<textarea v-model="block.body" maxlength="20000" rows="7" /><small>Каждая новая строка — отдельный абзац. HTML не исполняется.</small></label></section>
        <footer class="sb-cms-savebar"><button class="sb-cms-primary" :disabled="busy" @click="save"><Save :size="16" /> {{ busy ? 'Сохраняем…' : 'Сохранить страницу' }}</button><button :disabled="busy || editor._new" @click="reloadSelected">Загрузить сохранённую версию</button><button :disabled="busy" aria-label="Удалить страницу" @click="removePage"><Trash2 :size="16" /> Удалить страницу</button></footer>
      </article>
    </div>
  </section>
</template>

<style scoped>
.sb-pages-editor { display: grid; gap: 20px; font-size: var(--sb-type-small); }
.sb-cms-hero { display: flex; justify-content: space-between; align-items: center; gap: 24px; padding: 26px; }
.sb-cms-hero h2 { margin: 0 0 12px; font-size: var(--sb-type-subheading); }
.sb-cms-hero .kicker { margin: 0 0 12px; font-size: var(--sb-type-caption); }
.sb-cms-hero span { color: var(--sb-muted); line-height: 1.6; }
.sb-cms-layout { display: grid; grid-template-columns: 260px minmax(0,1fr); gap: 22px; align-items: start; }
.sb-cms-list { padding: 10px; display: grid; gap: 6px; position: sticky; top: 22px; }
.sb-cms-list > button { text-align: left; padding: 16px; border: 1px solid transparent; background: transparent; border-radius: 14px; display: grid; gap: 9px; }
.sb-cms-list > button.active { background: rgba(255,255,255,.8); border-color: var(--sb-line); }
.sb-cms-list span,.sb-cms-list small,.sb-cms-toolbar small,.sb-cms-form label > small { font-size: var(--sb-type-caption); color: var(--sb-muted); }
.sb-cms-form { padding: 26px; display: grid; gap: 20px; min-width: 0; }
.sb-cms-form label { display: grid; gap: 9px; color: var(--sb-muted); }
.sb-cms-form input:not([type=checkbox]),.sb-cms-form textarea { width: 100%; border: 1px solid var(--sb-line); border-radius: 12px; background: rgba(255,255,255,.7); padding: 12px 14px; color: var(--sb-ink); font: inherit; resize: vertical; }
.sb-cms-toolbar { display: flex; justify-content: space-between; gap: 14px; padding-bottom: 20px; border-bottom: 1px solid var(--sb-line); }
.sb-cms-toolbar > div { display: grid; gap: 8px; }
.sb-cms-toolbar a { text-decoration: underline; text-underline-offset: 4px; }
.sb-cms-flags { display: flex; flex-wrap: wrap; gap: 18px; }
.sb-cms-flags label { display: flex; align-items: center; gap: 8px; }
.sb-cms-primary { display: inline-flex; justify-content: center; align-items: center; gap: 8px; border: 0; border-radius: 12px; background: #151515; color: #fff; padding: 12px 16px; font: inherit; }
.sb-cms-notice,.sb-cms-review { margin: 0; padding: 18px 22px; border: 1px solid var(--sb-line); border-radius: 14px; background: rgba(255,255,255,.55); line-height: 1.6; }
.sb-cms-blocks-head,.sb-cms-block-toolbar { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.sb-cms-blocks-head h3 { margin: 0; font-size: var(--sb-type-title); }
.sb-cms-block-editor { display: grid; gap: 16px; padding: 20px; border: 1px solid var(--sb-line); border-radius: 18px; }
.sb-cms-block-toolbar > div,.sb-cms-savebar { display: flex; flex-wrap: wrap; gap: 10px; }
.sb-cms-block-toolbar button,.sb-cms-savebar > button:not(.sb-cms-primary) { display: inline-flex; align-items: center; gap: 8px; border: 1px solid var(--sb-line); border-radius: 10px; padding: 9px 12px; background: transparent; color: #151515; font: inherit; }
.sb-cms-savebar { padding-top: 18px; border-top: 1px solid var(--sb-line); }
button:disabled { opacity: .45; cursor: default; }
@media (max-width: 1100px) { .sb-cms-layout { grid-template-columns: minmax(0,1fr); } .sb-cms-list { position: static; grid-template-columns: repeat(2,minmax(0,1fr)); } }
@media (max-width: 650px) { .sb-cms-list { grid-template-columns: minmax(0,1fr); } .sb-cms-form { padding: 18px; } .sb-cms-hero { padding: 20px; } .sb-cms-toolbar,.sb-cms-block-toolbar,.sb-cms-hero { align-items: flex-start; flex-direction: column; } }
</style>
