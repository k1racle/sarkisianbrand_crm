<script setup lang="ts">
import { GripVertical } from '@lucide/vue';
const props = defineProps<{ apiBase: string; token: string }>();
type Category = { id: string; nameRu: string; slug: string; parentId: string | null; isActive: boolean };
type Entry = { categoryId: string; label: string; isVisible: boolean };
type QuickKey = 'new' | 'popular' | 'gift-card';
type QuickLink = { key: QuickKey; label: string; isVisible: boolean };
type MenuResponse = { revision: number; entries: Entry[]; quickLinks: QuickLink[]; categories: Category[] };
const quickDefaults: QuickLink[] = [
  { key: 'new', label: 'Новинки', isVisible: true },
  { key: 'popular', label: 'Бестселлеры', isVisible: true },
  { key: 'gift-card', label: 'Подарочная карта', isVisible: true },
];
const quickUrls: Record<QuickKey, string> = { new: '/catalog?sort=new', popular: '/catalog?sort=popular', 'gift-card': '/products/gift-card' };
const categories = ref<Category[]>([]);
const entries = ref<Entry[]>([]);
const quickLinks = ref<QuickLink[]>([]);
const revision = ref<number | null>(null);
const baseline = ref('');
const loaded = ref(false);
const loading = ref(false);
const saving = ref(false);
const conflict = ref(false);
const forbidden = ref(false);
const error = ref('');
const notice = ref('');
const orderAnnouncement = ref('');
const dragged = ref<{ group: 'categories' | 'quick'; index: number; key: string; identity: number } | null>(null);
const controllers = new Set<AbortController>();
let identity = 0;
let requestVersion = 0;
let mounted = false;
const snapshot = () => JSON.stringify({ entries: entries.value, quickLinks: quickLinks.value });
const dirty = computed(() => loaded.value && snapshot() !== baseline.value);
const categoryById = computed(() => new Map(categories.value.map(category => [category.id, category])));
const previewGroups = computed(() => storefrontCategoryGroups(categories.value, { entries: entries.value }));
const visibleQuickLinks = computed(() => quickLinks.value.filter(link => link.isVisible));

function failure(caught: any, fallback: string) {
  const status = caught?.statusCode || caught?.response?.status;
  if (status === 401) return 'Сессия завершилась. Войдите в рабочее пространство заново.';
  if (status === 403) return 'Недостаточно прав для редактирования меню каталога.';
  if (status === 409) return 'Меню уже изменено другим сотрудником. Ваши изменения не перезаписаны. Загрузите актуальную версию перед новым сохранением.';
  if (status === 503) return 'Сервис меню временно недоступен. Изменения не сохранены. Попробуйте ещё раз позже.';
  return fallback;
}
async function request(options: Record<string, any> = {}) {
  if (!props.token) throw { statusCode: 401 };
  const controller = new AbortController(); controllers.add(controller);
  try { return await $fetch<MenuResponse>('/admin/storefront/catalog-menu', { baseURL: props.apiBase, headers: { Authorization: `Bearer ${props.token}` }, signal: controller.signal, timeout: 15000, ...options }); }
  finally { controllers.delete(controller); }
}
function applyResponse(result: MenuResponse) {
  if (!result || !Number.isSafeInteger(result.revision) || result.revision < 0 || !Array.isArray(result.categories) || !Array.isArray(result.entries) || !Array.isArray(result.quickLinks)) throw new Error('Некорректный ответ меню');
  const byId = new Map<string, Category>();
  for (const category of result.categories) {
    if (!category?.id || typeof category.nameRu !== 'string' || typeof category.slug !== 'string' || typeof category.isActive !== 'boolean' || byId.has(category.id)) throw new Error('Некорректный список категорий');
    byId.set(category.id, { id: category.id, nameRu: category.nameRu, slug: category.slug, parentId: category.parentId || null, isActive: category.isActive });
  }
  const knownEntries = new Map<string, Entry>();
  for (const entry of result.entries) {
    if (!byId.has(entry.categoryId) || knownEntries.has(entry.categoryId)) continue;
    if (typeof entry.label !== 'string' || typeof entry.isVisible !== 'boolean') throw new Error('Некорректный пункт меню');
    knownEntries.set(entry.categoryId, { categoryId: entry.categoryId, label: entry.label, isVisible: entry.isVisible });
  }
  // Defaults may only come from actual DB categories, never demonstration items.
  for (const category of byId.values()) if (!knownEntries.has(category.id)) knownEntries.set(category.id, { categoryId: category.id, label: category.nameRu.trim().slice(0, 80) || 'Категория', isVisible: true });
  const knownQuick = new Map<QuickKey, QuickLink>();
  for (const link of result.quickLinks) {
    if (!quickDefaults.some(item => item.key === link.key) || knownQuick.has(link.key)) continue;
    if (typeof link.label !== 'string' || typeof link.isVisible !== 'boolean') throw new Error('Некорректная быстрая ссылка');
    knownQuick.set(link.key, { key: link.key, label: link.label, isVisible: link.isVisible });
  }
  for (const item of quickDefaults) if (!knownQuick.has(item.key)) knownQuick.set(item.key, { ...item });
  categories.value = [...byId.values()]; entries.value = [...knownEntries.values()]; quickLinks.value = [...knownQuick.values()];
  revision.value = result.revision; loaded.value = true; baseline.value = snapshot(); conflict.value = false; forbidden.value = false;
}
async function load() {
  if (saving.value || loading.value || (dirty.value && !window.confirm('Загрузить актуальное меню и отменить несохранённые изменения?'))) return;
  const currentIdentity = identity, version = ++requestVersion;
  loading.value = true; error.value = ''; notice.value = '';
  try { const result = await request(); if (currentIdentity === identity && version === requestVersion) applyResponse(result); }
  catch (caught: any) { if (currentIdentity === identity && version === requestVersion) { forbidden.value = [401, 403].includes(caught?.statusCode || caught?.response?.status); error.value = failure(caught, 'Не удалось загрузить меню каталога. Попробуйте ещё раз.'); } }
  finally { if (currentIdentity === identity && version === requestVersion) loading.value = false; }
}
function move<T>(items: T[], index: number, direction: -1 | 1) {
  if (saving.value || loading.value || forbidden.value) return;
  const next = index + direction;
  if (index < 0 || next < 0 || next >= items.length) return;
  const [item] = items.splice(index, 1); items.splice(next, 0, item!);
  orderAnnouncement.value = 'Порядок изменён. Сохраните меню для публикации.';
}
function startOrderDrag(event: DragEvent, group: 'categories' | 'quick', index: number) {
  if (saving.value || loading.value || forbidden.value || !event.dataTransfer) { event.preventDefault(); return; }
  const key = group === 'categories' ? entries.value[index]?.categoryId : quickLinks.value[index]?.key;
  if (!key) { event.preventDefault(); return; }
  dragged.value = { group, index, key, identity }; event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', 'catalog-menu-order');
}
function dropOrder(event: DragEvent, group: 'categories' | 'quick', index: number) {
  event.preventDefault(); event.stopPropagation(); const source = dragged.value; dragged.value = null;
  if (!source || source.group !== group || source.identity !== identity || saving.value || loading.value || forbidden.value) return;
  const items: Array<Entry | QuickLink> = group === 'categories' ? entries.value : quickLinks.value;
  const key = (item: Entry | QuickLink) => 'categoryId' in item ? item.categoryId : item.key;
  if (source.index < 0 || index < 0 || source.index >= items.length || index >= items.length || key(items[source.index]!) !== source.key || index === source.index) return;
  const [item] = items.splice(source.index, 1); items.splice(index, 0, item!); orderAnnouncement.value = 'Порядок изменён. Сохраните меню для публикации.';
}
function cancel() {
  if (saving.value || loading.value || !dirty.value || !window.confirm('Отменить изменения названий, видимости и порядка меню?')) return;
  const saved = JSON.parse(baseline.value); entries.value = saved.entries; quickLinks.value = saved.quickLinks;
  dragged.value = null;
  error.value = ''; notice.value = 'Несохранённые изменения отменены.';
}
async function save() {
  if (!loaded.value || !dirty.value || saving.value || loading.value || forbidden.value || conflict.value) return;
  error.value = ''; notice.value = '';
  const label = (value: string) => {
    const text = value.trim();
    if (!text || text.length > 80) throw new Error('Название каждого пункта: от 1 до 80 символов, в том числе у скрытых пунктов.');
    return text;
  };
  let body;
  try { if (entries.value.length > 200) throw new Error('Меню поддерживает до 200 категорий. Уточните состав категорий перед сохранением.'); body = { revision: revision.value, entries: entries.value.map(item => ({ categoryId: item.categoryId, label: label(item.label), isVisible: item.isVisible })), quickLinks: quickLinks.value.map(item => ({ key: item.key, label: label(item.label), isVisible: item.isVisible })) }; }
  catch (caught: any) { error.value = caught.message; return; }
  saving.value = true;
  const currentIdentity = identity, version = ++requestVersion;
  try { const result = await request({ method: 'PATCH', body }); if (currentIdentity === identity && version === requestVersion) { applyResponse(result); notice.value = 'Меню каталога сохранено.'; } }
  catch (caught: any) { if (currentIdentity === identity && version === requestVersion) { const status = caught?.statusCode || caught?.response?.status; conflict.value = status === 409; forbidden.value = [401, 403].includes(status); error.value = failure(caught, 'Не удалось подтвердить сохранение меню. Ваши изменения оставлены в редакторе. Проверьте актуальную версию перед повторной попыткой.'); } }
  finally { if (currentIdentity === identity && version === requestVersion) saving.value = false; }
}
function beforeUnload(event: BeforeUnloadEvent) { if (dirty.value || saving.value) { event.preventDefault(); event.returnValue = ''; } }
const leave = () => !saving.value && (!dirty.value || window.confirm('Выйти из редактора без сохранения меню?'));
onMounted(() => { mounted = true; load(); window.addEventListener('beforeunload', beforeUnload); });
watch(() => [props.apiBase, props.token], () => {
  if (!mounted) return;
  ++identity; ++requestVersion; controllers.forEach(controller => controller.abort());
  dragged.value = null;
  categories.value = []; entries.value = []; quickLinks.value = []; revision.value = null; baseline.value = ''; loaded.value = false;
  loading.value = false; saving.value = false; conflict.value = false; forbidden.value = false; error.value = ''; notice.value = ''; load();
});
onBeforeUnmount(() => { ++identity; ++requestVersion; controllers.forEach(controller => controller.abort()); window.removeEventListener('beforeunload', beforeUnload); });
onBeforeRouteLeave(leave);
onBeforeRouteUpdate(leave);
</script>

<template>
  <section data-v-ui-a4aaf54a5982 class="sb-catalog-menu-admin" aria-label="Редактор меню каталога">
    <header data-v-ui-a4aaf54a5982 class="sb-cma-panel sb-cma-hero">
      <div data-v-ui-a4aaf54a5982><p data-v-ui-a4aaf54a5982 class="sb-cma-eyebrow">НАВИГАЦИЯ МАГАЗИНА</p><h2 data-v-ui-a4aaf54a5982>Меню каталога</h2><p data-v-ui-a4aaf54a5982>Названия, видимость и порядок пунктов бокового каталога. Адреса категорий и быстрых ссылок не меняются.</p></div>
      <button data-v-ui-a4aaf54a5982 type="button" class="sb-cma-button sb-cma-button--white" :disabled="loading || saving" @click="load">{{ loading ? 'Загружаем…' : 'Обновить меню' }}</button>
    </header>
    <p data-v-ui-a4aaf54a5982 v-if="error" class="sb-cma-notice" role="alert">{{ error }} <button data-v-ui-a4aaf54a5982 v-if="!loaded" class="sb-cma-button sb-cma-button--white" :disabled="loading" @click="load">Повторить загрузку</button></p>
    <p data-v-ui-a4aaf54a5982 v-if="notice" class="sb-cma-notice" role="status">{{ notice }}</p>
    <p data-v-ui-a4aaf54a5982 v-if="loading" class="sb-cma-notice" role="status">Загружаем категории и настройки меню…</p>
    <form data-v-ui-a4aaf54a5982 v-if="loaded" novalidate @submit.prevent="save">
      <fieldset data-v-ui-a4aaf54a5982 :disabled="loading || saving || forbidden" class="sb-cma-fields">
        <section data-v-ui-a4aaf54a5982 class="sb-cma-panel sb-cma-section">
          <header data-v-ui-a4aaf54a5982 class="sb-cma-section-head"><h3 data-v-ui-a4aaf54a5982>Категории</h3><small data-v-ui-a4aaf54a5982>Перетаскивайте за ручку в первом столбце.</small></header>
          <p data-v-ui-a4aaf54a5982 class="sb-cma-note">Здесь только категории из базы. Создание, состав и активность категорий настраиваются в разделе управления товарами.</p>
          <ol data-v-ui-a4aaf54a5982 v-if="entries.length" class="sb-cma-list" aria-label="Порядок категорий">
            <li data-v-ui-a4aaf54a5982 v-for="(entry, index) in entries" :key="entry.categoryId" class="sb-cma-row" :data-category-id="entry.categoryId" @dragover.prevent @drop="dropOrder($event, 'categories', index)">
              <div data-v-ui-a4aaf54a5982 class="sb-cma-order"><button data-v-ui-a4aaf54a5982 type="button" class="sb-cma-button sb-cma-button--white sb-cma-drag-handle" :draggable="!loading && !saving && !forbidden" :aria-label="'Перетащить ' + entry.label" @dragstart="startOrderDrag($event, 'categories', index)" @dragend="dragged = null" @keydown.alt.up.prevent="move(entries, index, -1)" @keydown.alt.down.prevent="move(entries, index, 1)"><GripVertical data-v-ui-a4aaf54a5982 :size="20" /></button></div>
              <div data-v-ui-a4aaf54a5982 class="sb-cma-row-main">
                <label data-v-ui-a4aaf54a5982 class="sb-cma-field"><span data-v-ui-a4aaf54a5982>{{ categoryById.get(entry.categoryId)?.nameRu }}</span><input data-v-ui-a4aaf54a5982 v-model="entry.label" maxlength="80" :aria-label="`Название пункта ${categoryById.get(entry.categoryId)?.nameRu}`" required /></label>
                <small data-v-ui-a4aaf54a5982 class="sb-cma-url">{{ storefrontCatalogLink(categoryById.get(entry.categoryId)) }}</small>
                <small data-v-ui-a4aaf54a5982 v-if="categoryById.get(entry.categoryId)?.parentId">Родитель: {{ categoryById.get(categoryById.get(entry.categoryId)!.parentId!)?.nameRu || 'Не найден' }}</small>
                <small data-v-ui-a4aaf54a5982 v-if="!categoryById.get(entry.categoryId)?.isActive" class="sb-cma-note">Категория неактивна — не появится на сайте, даже если включена в меню.</small>
              </div>
              <label data-v-ui-a4aaf54a5982 class="sb-cma-checkbox"><input data-v-ui-a4aaf54a5982 v-model="entry.isVisible" type="checkbox" :aria-label="`Показывать ${categoryById.get(entry.categoryId)?.nameRu} в меню`" /> В меню</label>

            </li>
          </ol>
          <p data-v-ui-a4aaf54a5982 v-else class="sb-cma-empty">В базе пока нет категорий. Демонстрационные категории не добавляются.</p>
        </section>
        <section data-v-ui-a4aaf54a5982 class="sb-cma-panel sb-cma-section">
          <header data-v-ui-a4aaf54a5982 class="sb-cma-section-head"><h3 data-v-ui-a4aaf54a5982>Быстрые ссылки</h3><small data-v-ui-a4aaf54a5982>Три фиксированных назначения, без произвольных адресов.</small></header>
          <ol data-v-ui-a4aaf54a5982 class="sb-cma-list" aria-label="Порядок быстрых ссылок">
            <li data-v-ui-a4aaf54a5982 v-for="(link, index) in quickLinks" :key="link.key" class="sb-cma-row" :data-quick-key="link.key" @dragover.prevent @drop="dropOrder($event, 'quick', index)">
              <div data-v-ui-a4aaf54a5982 class="sb-cma-order"><button data-v-ui-a4aaf54a5982 type="button" class="sb-cma-button sb-cma-button--white sb-cma-drag-handle" :draggable="!loading && !saving && !forbidden" :aria-label="'Перетащить ' + link.label" @dragstart="startOrderDrag($event, 'quick', index)" @dragend="dragged = null" @keydown.alt.up.prevent="move(quickLinks, index, -1)" @keydown.alt.down.prevent="move(quickLinks, index, 1)"><GripVertical data-v-ui-a4aaf54a5982 :size="20" /></button></div>
              <div data-v-ui-a4aaf54a5982 class="sb-cma-row-main"><label data-v-ui-a4aaf54a5982 class="sb-cma-field"><span data-v-ui-a4aaf54a5982>{{ quickDefaults.find(item => item.key === link.key)?.label }}</span><input data-v-ui-a4aaf54a5982 v-model="link.label" maxlength="80" :aria-label="`Название быстрой ссылки ${link.key}`" required /></label><small data-v-ui-a4aaf54a5982 class="sb-cma-url">{{ quickUrls[link.key] }}</small></div>
              <label data-v-ui-a4aaf54a5982 class="sb-cma-checkbox"><input data-v-ui-a4aaf54a5982 v-model="link.isVisible" type="checkbox" :aria-label="`Показывать быструю ссылку ${link.key}`" /> В меню</label>

            </li>
          </ol>
        </section>
      </fieldset>
      <footer data-v-ui-a4aaf54a5982 class="sb-cma-panel sb-cma-actions"><span data-v-ui-a4aaf54a5982>{{ conflict ? 'Нужна актуальная версия меню' : dirty ? 'Есть несохранённые изменения' : `Версия ${revision} · Изменения сохранены` }}</span><div data-v-ui-a4aaf54a5982><button data-v-ui-a4aaf54a5982 type="button" class="sb-cma-button sb-cma-button--white" :disabled="!dirty || saving || loading" @click="cancel">Отменить изменения</button><button data-v-ui-a4aaf54a5982 type="submit" class="sb-cma-button" :disabled="!dirty || saving || loading || conflict || forbidden">{{ saving ? 'Сохраняем…' : 'Сохранить меню' }}</button></div></footer>
    </form>
    <p data-v-ui-a4aaf54a5982 class="sb-cma-order-announcement" aria-live="polite">{{ orderAnnouncement }}</p>
    <section data-v-ui-a4aaf54a5982 v-if="loaded" class="sb-cma-panel sb-cma-section sb-cma-preview" aria-label="Предпросмотр меню каталога">
      <header data-v-ui-a4aaf54a5982 class="sb-cma-section-head"><h3 data-v-ui-a4aaf54a5982>Предпросмотр</h3><small data-v-ui-a4aaf54a5982>Текущий черновик. На сайте изменения появятся после сохранения.</small></header>
      <div data-v-ui-a4aaf54a5982 v-if="visibleQuickLinks.length" class="sb-cma-preview-quick"><span data-v-ui-a4aaf54a5982 v-for="link in visibleQuickLinks" :key="link.key">{{ link.label.trim() || quickDefaults.find(item => item.key === link.key)?.label }}</span></div>
      <div data-v-ui-a4aaf54a5982 v-if="previewGroups.length" class="sb-cma-preview-groups"><section data-v-ui-a4aaf54a5982 v-for="group in previewGroups" :key="group.id"><h4 data-v-ui-a4aaf54a5982>{{ group.label }}</h4><p data-v-ui-a4aaf54a5982 v-for="item in group.items" :key="item.id">{{ item.label }}</p></section></div>
      <p data-v-ui-a4aaf54a5982 v-else class="sb-cma-note">Нет видимых активных категорий.</p>
      <p data-v-ui-a4aaf54a5982 class="sb-cma-note">Скрытие категории скрывает все вложенные категории. Неактивные категории не выводятся; категория с отсутствующим родителем отображается отдельно.</p>
    </section>
  </section>
</template>

