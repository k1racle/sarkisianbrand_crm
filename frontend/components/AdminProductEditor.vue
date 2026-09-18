<script setup lang="ts">
import { GripVertical, ImagePlus, Save, X } from '@lucide/vue';
import { normalizeMediaImageUrl, resolveProductImageUrl } from '~/shared/product-images';
type GalleryImage = { key: number; url: string; alt: string };
type ProductDraft = {
  id: string; productType: string; nameRu: string; descriptionRu: string;
  purposesText: string; featuresText: string; price: number | string; stock: number | string;
  salePrice:number|string; saleStartsAt:string; saleEndsAt:string; badgeIds:string[];
  isActive: boolean; categoryIds: string[]; images: GalleryImage[];
  metaTitle: string; metaDesc: string; canonical: string;
};
const config = useRuntimeConfig();
const router = useRouter();
const { token } = useWorkspaceSession();
const productEditor = useState<any | null>('admin-product-editor', () => null);
const savedProduct = useState<any | null>('admin-product-saved', () => null);
const draft = ref<ProductDraft | null>(null);
const baseline = ref('');
const categories = ref<any[]>([]);
const categoriesLoading = ref(false);
const categoriesError = ref('');
const badgeDefinitions=ref<any[]>([]),badgesError=ref('');
const badgesLoaded=ref(false);
const unlistedBadgeIds=computed(()=>badgesLoaded.value?(draft.value?.badgeIds||[]).filter(id=>!badgeDefinitions.value.some(b=>b.id===id)):[]);
const categorySearch = ref('');
const saving = ref(false);
const message = ref('');
const galleryStatus = ref('');
const tab = ref<'main' | 'images' | 'seo'>('main');
const tabs = [{ id: 'main', label: 'Основное' }, { id: 'images', label: 'Изображения' }, { id: 'seo', label: 'SEO' }] as const;
const dialog = ref<HTMLElement | null>(null);
const draggedKey = ref<number | null>(null);
let imageKey = 0;
let source: any = null;
let mounted = false;
let previousFocus: HTMLElement | null = null;
let categoryGeneration = 0;
let removeRouteGuard: (() => void) | undefined;
function localDate(value:any){if(!value)return '';const date=new Date(value);if(!Number.isFinite(date.getTime()))return '';return new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16);}
function createDraft(product: any): ProductDraft {
  return {
    id: String(product.id), productType: String(product.productType || 'PHYSICAL'),
    nameRu: String(product.nameRu || ''), descriptionRu: String(product.descriptionRu || ''),
    purposesText: String(product.purposesText ?? (product.purposes || []).join(', ')),
    featuresText: String(product.featuresText ?? (product.features || []).join(', ')),
    price: product.price ?? product.variants?.[0]?.price ?? product.basePrice ?? 0,
    salePrice:product.variants?.[0]?.salePrice??'',saleStartsAt:localDate(product.variants?.[0]?.saleStartsAt),saleEndsAt:localDate(product.variants?.[0]?.saleEndsAt),badgeIds:[...(product.badgeIds||[])],
    stock: product.stock ?? product.variants?.[0]?.stock ?? 0, isActive: product.isActive !== false,
    categoryIds: [...(product.categoryIds || (product.categories || []).map((item: any) => item.categoryId))],
    images: (product.images || []).map((image: any) => ({ key: ++imageKey, url: String(image.url || ''), alt: String(image.alt || '') })),
    metaTitle: String(product.metaTitle ?? product.seo?.metaTitle ?? ''), metaDesc: String(product.metaDesc ?? product.seo?.metaDesc ?? ''), canonical: String(product.canonical ?? product.seo?.canonical ?? ''),
  };
}
function snapshot(value: ProductDraft | null) {
  if (!value) return '';
  const { images, ...fields } = value;
  return JSON.stringify({ ...fields, images: images.map(({ url, alt }) => ({ url, alt })) });
}
const dirty = computed(() => snapshot(draft.value) !== baseline.value);
const isGift = computed(() => draft.value?.productType === 'GIFT_CARD');
const visibleCategories = computed(() => categories.value.filter(category => String(category.nameRu || '').toLocaleLowerCase().includes(categorySearch.value.trim().toLocaleLowerCase())));
function normalizeError(error: any, fallback = 'Не удалось сохранить товар. Попробуйте ещё раз.') {
  const value = error?.data?.message;
  if (Array.isArray(value)) return value.filter(item => typeof item === 'string').join('. ') || fallback;
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}
function mayLeave() {
  if (saving.value) { message.value = 'Дождитесь завершения сохранения.'; return false; }
  return !dirty.value || (typeof window !== 'undefined' && window.confirm('Изменения не сохранены. Закрыть редактор без сохранения?'));
}
function closeEditor() {
  if (!mayLeave()) return false;
  baseline.value = snapshot(draft.value); // Confirm only once, including shared-state closes.
  productEditor.value = null;
  return true;
}
async function giftSettings() { if (closeEditor()) await navigateTo('/admin-workspace?section=gift-cards'); }
async function loadCategories() {
  if (!token.value || categoriesLoading.value) return;
  const generation = ++categoryGeneration;
  categoriesLoading.value = true; categoriesError.value = '';
  badgesError.value='';badgesLoaded.value=false;
  void $fetch<any>('/admin/catalog/badges',{baseURL:config.public.apiBase,headers:{Authorization:`Bearer ${token.value}`},timeout:20000}).then(data=>{if(generation===categoryGeneration){badgeDefinitions.value=data.badges||[];badgesLoaded.value=true;}}).catch(error=>{if(generation===categoryGeneration)badgesError.value=normalizeError(error,'Не удалось загрузить бейджи. Существующие назначения сохранены.');});
  try {
    const result = await $fetch<any[]>('/admin/categories', { baseURL: config.public.apiBase, headers: { Authorization: `Bearer ${token.value}` } });
    if (generation === categoryGeneration) categories.value = Array.isArray(result) ? result : [];
  } catch (error) {
    if (generation === categoryGeneration) categoriesError.value = normalizeError(error, 'Не удалось загрузить категории. Существующий выбор сохранён.');
  } finally { if (generation === categoryGeneration) categoriesLoading.value = false; }
}
watch(() => [productEditor.value, productEditor.value?.id], () => {
  const value = productEditor.value;
  if (value === source && (!value || String(value.id) === draft.value?.id)) return;
  if (source && !mayLeave()) { productEditor.value = source; return; }
  const wasOpen = Boolean(source);
  source = value;
  draft.value = value ? createDraft(value) : null;
  baseline.value = snapshot(draft.value);
  tab.value = 'main'; categorySearch.value = ''; message.value = ''; galleryStatus.value = ''; draggedKey.value = null;
  if (mounted && value) {
    if (!wasOpen) previousFocus = document.activeElement as HTMLElement;
    void loadCategories(); void nextTick(() => dialog.value?.focus());
  } else if (mounted && previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
}, { immediate: true, flush: 'sync' });
watch(token, () => {
  ++categoryGeneration; categoriesLoading.value = false; categories.value = []; categoriesError.value = '';
  if (mounted && draft.value) void loadCategories();
});
function terms(value: string) { return [...new Set(value.split(',').map(item => item.trim()).filter(Boolean))]; }
function buildPayload(value: ProductDraft) {
  const body: Record<string, any> = {
    nameRu: value.nameRu.trim(), descriptionRu: value.descriptionRu, purposes: terms(value.purposesText), features: terms(value.featuresText), isActive: value.isActive,
    images: value.images.filter(image => image.url.trim()).map(image => ({ url: image.url.trim(), alt: image.alt.trim() })),
    categoryIds: [...value.categoryIds], metaTitle: value.metaTitle.trim(), metaDesc: value.metaDesc.trim(), canonical: value.canonical.trim(),
    badgeIds:[...value.badgeIds],
  };
  if (value.productType !== 'GIFT_CARD' && source?.variants?.[0]?.id) body.variantId = source.variants[0].id;
  if (value.productType !== 'GIFT_CARD') { body.price = Number(value.price); body.stock = Number(value.stock);body.salePrice=value.salePrice===''?null:Number(value.salePrice);body.saleStartsAt=value.salePrice!==''&&value.saleStartsAt?new Date(value.saleStartsAt).toISOString():null;body.saleEndsAt=value.salePrice!==''&&value.saleEndsAt?new Date(value.saleEndsAt).toISOString():null; }
  return body;
}
function validationError(value: ProductDraft) {
  if (!value.nameRu.trim()) return 'Укажите название товара.';
  if(value.productType!=='GIFT_CARD'&&value.salePrice!==''&&(!Number.isFinite(Number(value.salePrice))||Number(value.salePrice)<0||Number(value.salePrice)>=Number(value.price)))return 'Акционная цена должна быть меньше обычной цены.';
  if([value.saleStartsAt,value.saleEndsAt].some(date=>date&&!Number.isFinite(new Date(date).getTime())))return 'Проверьте даты акции.';
  if(value.saleStartsAt&&value.saleEndsAt&&new Date(value.saleStartsAt)>=new Date(value.saleEndsAt))return 'Окончание акции должно быть позже начала.';
  if (value.productType !== 'GIFT_CARD' && (value.price === '' || !Number.isFinite(Number(value.price)) || Number(value.price) < 0)) return 'Укажите корректную неотрицательную цену.';
  if (value.productType !== 'GIFT_CARD' && (value.stock === '' || !Number.isSafeInteger(Number(value.stock)) || Number(value.stock) < 0)) return 'Остаток должен быть целым неотрицательным числом.';
  if ([terms(value.purposesText), terms(value.featuresText)].some(list => list.length > 20 || list.some(item => item.length > 80))) return 'Не более 20 назначений и особенностей, до 80 символов каждое.';
  if (value.images.some(image => image.url && !normalizeMediaImageUrl(image.url, String(config.public.apiBase), String(config.public.siteUrl || 'http://localhost:3001')))) return 'Проверьте адреса изображений: разрешены пути сайта и HTTP/HTTPS без учётных данных.';
  if (value.canonical.trim()) {
    try { const url = new URL(value.canonical.trim()); if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return 'Canonical должен быть полным HTTP/HTTPS-адресом.'; }
    catch { return 'Canonical должен быть полным HTTP/HTTPS-адресом.'; }
  }
  return '';
}
async function save() {
  if (!draft.value || saving.value) return;
  message.value = validationError(draft.value);
  if (message.value) return;
  if (!token.value) { message.value = 'Сессия завершена. Войдите снова, чтобы сохранить товар.'; return; }
  const id = draft.value.id, body = buildPayload(draft.value);
  saving.value = true;
  try {
    const product = await $fetch<any>(`/admin/products/${encodeURIComponent(id)}`, { baseURL: config.public.apiBase, method: 'PATCH', headers: { Authorization: `Bearer ${token.value}` }, body });
    if (!product || String(product.id) !== id) throw new Error('Invalid product response');
    savedProduct.value = { id, product }; // Parent merges the returned server product.
    baseline.value = snapshot(draft.value);
    saving.value = false;
    productEditor.value = null;
  } catch (error) { message.value = normalizeError(error); }
  finally { saving.value = false; }
}
function previewImage(value: string) {
  return resolveProductImageUrl(value, String(config.public.apiBase), String(config.public.siteUrl || 'http://localhost:3001'));
}
function addImage() {
  if (saving.value || !draft.value) return;
  draft.value.images.push({ key: ++imageKey, url: '', alt: '' });
  galleryStatus.value = 'Добавлено поле изображения. Выберите файл через медиабиблиотеку.';
}
function removeImage(index: number) {
  if (saving.value || !draft.value || index < 0 || index >= draft.value.images.length) return;
  draft.value.images.splice(index, 1); galleryStatus.value = 'Изображение удалено из черновика. Общий файл не удаляется.';
}
function moveImage(from: number, to: number) {
  if (saving.value || !draft.value || from === to || from < 0 || to < 0 || from >= draft.value.images.length || to >= draft.value.images.length) return;
  const [image] = draft.value.images.splice(from, 1);
  draft.value.images.splice(to, 0, image); galleryStatus.value = `Изображение перемещено на позицию ${to + 1}.`;
}
function dragImage(event: DragEvent, key: number) {
  if (saving.value || !event.dataTransfer) { event.preventDefault(); return; }
  draggedKey.value = key; event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('application/x-admin-product-image', String(key));
}
function dropImage(event: DragEvent, index: number) {
  event.preventDefault();
  if (event.dataTransfer?.files.length) { galleryStatus.value = 'Загрузите файл кнопкой «Загрузить файл» в общем выборе изображения.'; draggedKey.value = null; return; }
  const from = draft.value?.images.findIndex(image => image.key === draggedKey.value) ?? -1;
  moveImage(from, index); draggedKey.value = null;
}
function tabKeys(event: KeyboardEvent, index: number) {
  const next = event.key === 'ArrowRight' ? (index + 1) % 3 : event.key === 'ArrowLeft' ? (index + 2) % 3 : event.key === 'Home' ? 0 : event.key === 'End' ? 2 : -1;
  if (next < 0 || saving.value) return;
  event.preventDefault(); tab.value = tabs[next].id;
  dialog.value?.querySelector<HTMLButtonElement>(`#product-editor-tab-${tabs[next].id}`)?.focus();
}
function dialogKeys(event: KeyboardEvent) {
  if (!draft.value || !dialog.value || !dialog.value.contains(event.target as Node)) return;
  if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeEditor(); return; }
  if (event.key !== 'Tab') return;
  const controls = [...dialog.value.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),summary,[tabindex="0"]')].filter(element => element.getClientRects().length);
  const first = controls[0], last = controls[controls.length - 1];
  if (!first) { event.preventDefault(); dialog.value.focus(); }
  else if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.value)) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
}
function beforeUnload(event: BeforeUnloadEvent) {
  if (!draft.value || (!dirty.value && !saving.value)) return;
  event.preventDefault(); event.returnValue = '';
}
onMounted(() => {
  mounted = true; window.addEventListener('beforeunload', beforeUnload);
  // This global editor lives outside NuxtPage, so register a router guard directly.
  removeRouteGuard = router.beforeEach(() => !draft.value || mayLeave());
  if (draft.value) { previousFocus = document.activeElement as HTMLElement; void loadCategories(); void nextTick(() => dialog.value?.focus()); }
});
onBeforeUnmount(() => { mounted = false; ++categoryGeneration; removeRouteGuard?.(); window.removeEventListener('beforeunload', beforeUnload); });
</script>

<template>
  <aside data-v-ui-c7d5f9a002b6 v-if="draft" class="editor-backdrop admin-dialog-backdrop" @click.self="closeEditor">
    <section data-v-ui-c7d5f9a002b6 ref="dialog" class="editor-drawer admin-dialog admin-dialog--drawer" role="dialog" aria-modal="true" aria-labelledby="product-editor-title" :aria-busy="saving" tabindex="-1" @keydown="dialogKeys">
      <header data-v-ui-c7d5f9a002b6 class="editor-header admin-dialog-head"><div data-v-ui-c7d5f9a002b6><p data-v-ui-c7d5f9a002b6 class="eyebrow">КАТАЛОГ / РЕДАКТИРОВАНИЕ</p><h2 data-v-ui-c7d5f9a002b6 id="product-editor-title">Карточка товара</h2><p data-v-ui-c7d5f9a002b6 class="editor-subtitle">{{ draft.nameRu }}<span data-v-ui-c7d5f9a002b6 v-if="dirty"> · Не сохранено</span></p></div><button data-v-ui-c7d5f9a002b6 type="button" class="editor-icon-button" :disabled="saving" aria-label="Закрыть редактор товара" @click="closeEditor"><X data-v-ui-c7d5f9a002b6 :size="20" aria-hidden="true" /></button></header>
      <nav data-v-ui-c7d5f9a002b6 class="editor-tabs admin-dialog-tabs" role="tablist" aria-label="Разделы карточки товара"><button data-v-ui-c7d5f9a002b6 v-for="(item, index) in tabs" :id="'product-editor-tab-' + item.id" :key="item.id" type="button" role="tab" :aria-selected="tab === item.id" :aria-controls="'product-editor-panel-' + item.id" :tabindex="tab === item.id ? 0 : -1" :disabled="saving" :class="{ active: tab === item.id }" @click="tab = item.id" @keydown="tabKeys($event, index)">{{ item.label }}<span data-v-ui-c7d5f9a002b6 v-if="item.id === 'images'"> ({{ draft.images.length }})</span></button></nav>
      <form data-v-ui-c7d5f9a002b6 id="product-editor-form" class="editor-scroll admin-dialog-body" novalidate @submit.prevent="save">
        <fieldset data-v-ui-c7d5f9a002b6 class="editor-fieldset" :disabled="saving">
          <section data-v-ui-c7d5f9a002b6 v-show="tab === 'main'" id="product-editor-panel-main" class="editor-fields" role="tabpanel" aria-labelledby="product-editor-tab-main">
            <label data-v-ui-c7d5f9a002b6 for="product-editor-name"><span data-v-ui-c7d5f9a002b6>Название товара <span data-v-ui-c7d5f9a002b6 aria-hidden="true">*</span></span><input data-v-ui-c7d5f9a002b6 id="product-editor-name" v-model="draft.nameRu" name="productName" required /></label>
            <label data-v-ui-c7d5f9a002b6 for="product-editor-description">Описание<textarea data-v-ui-c7d5f9a002b6 id="product-editor-description" v-model="draft.descriptionRu" rows="5" /></label>
            <label data-v-ui-c7d5f9a002b6 for="product-editor-purposes">Для чего<input data-v-ui-c7d5f9a002b6 id="product-editor-purposes" v-model="draft.purposesText" maxlength="1600" placeholder="Назначения через запятую" /></label>
            <label data-v-ui-c7d5f9a002b6 for="product-editor-features">Особенности<input data-v-ui-c7d5f9a002b6 id="product-editor-features" v-model="draft.featuresText" maxlength="1600" placeholder="Характеристики через запятую" /></label>
            <div data-v-ui-c7d5f9a002b6 v-if="!isGift" class="two-fields"><label data-v-ui-c7d5f9a002b6 for="product-editor-price">Цена, ₽<input data-v-ui-c7d5f9a002b6 id="product-editor-price" v-model="draft.price" type="number" min="0" step="0.01" required /></label><label data-v-ui-c7d5f9a002b6 for="product-editor-stock">Остаток, шт.<input data-v-ui-c7d5f9a002b6 id="product-editor-stock" v-model="draft.stock" type="number" min="0" step="1" required /></label></div>
            <fieldset data-v-ui-c7d5f9a002b6 v-if="!isGift" class="category-box"><legend data-v-ui-c7d5f9a002b6>Акционная цена основного варианта</legend><label data-v-ui-c7d5f9a002b6>Цена по акции, ₽<input data-v-ui-c7d5f9a002b6 v-model="draft.salePrice" type="number" min="0" step="0.01" placeholder="Без акции"/></label><div data-v-ui-c7d5f9a002b6 class="two-fields"><label data-v-ui-c7d5f9a002b6>Начало акции<input data-v-ui-c7d5f9a002b6 v-model="draft.saleStartsAt" type="datetime-local" :disabled="draft.salePrice===''"/></label><label data-v-ui-c7d5f9a002b6>Окончание акции<input data-v-ui-c7d5f9a002b6 v-model="draft.saleEndsAt" type="datetime-local" :disabled="draft.salePrice===''"/></label></div><small data-v-ui-c7d5f9a002b6>Пустые даты — акция без ограничения срока. Очистите акционную цену, чтобы выключить её. Учётная цена 1С не заменяется.</small></fieldset>
            <section data-v-ui-c7d5f9a002b6 v-if="isGift" class="editor-note" aria-label="Настройки подарочной карты"><h3 data-v-ui-c7d5f9a002b6>Подарочная карта</h3><p data-v-ui-c7d5f9a002b6>Номиналы и срок действия настраиваются отдельно. Цена и остаток здесь не изменяются.</p><button data-v-ui-c7d5f9a002b6 type="button" class="editor-button editor-button--white" @click="giftSettings">Настройки подарочных карт</button></section>
            <fieldset data-v-ui-c7d5f9a002b6 class="category-box"><legend data-v-ui-c7d5f9a002b6>Категории</legend><label data-v-ui-c7d5f9a002b6 for="product-editor-category-search" class="category-search">Найти категорию<input data-v-ui-c7d5f9a002b6 id="product-editor-category-search" v-model="categorySearch" type="search" placeholder="Название категории" /></label><p data-v-ui-c7d5f9a002b6 v-if="categoriesLoading" role="status">Загружаем категории…</p><p data-v-ui-c7d5f9a002b6 v-if="categoriesError" role="alert">{{ categoriesError }} <button data-v-ui-c7d5f9a002b6 type="button" class="editor-button editor-button--white" @click="loadCategories">Повторить</button></p><div data-v-ui-c7d5f9a002b6 class="category-list"><label data-v-ui-c7d5f9a002b6 v-for="category in visibleCategories" :key="category.id" class="category-option"><input data-v-ui-c7d5f9a002b6 v-model="draft.categoryIds" type="checkbox" :value="category.id" />{{ category.nameRu }}</label><p data-v-ui-c7d5f9a002b6 v-if="!categoriesLoading && !categoriesError && !visibleCategories.length">Категории не найдены</p></div></fieldset>
            <label data-v-ui-c7d5f9a002b6 class="published"><input data-v-ui-c7d5f9a002b6 v-model="draft.isActive" type="checkbox" /> Показывать товар в каталоге</label>
            <fieldset data-v-ui-c7d5f9a002b6 class="category-box"><legend data-v-ui-c7d5f9a002b6>Бейджи товара</legend><p data-v-ui-c7d5f9a002b6 v-if="badgesError" role="alert">{{badgesError}}</p><label data-v-ui-c7d5f9a002b6 v-for="badge in badgeDefinitions.filter(b=>b.rule==='manual')" :key="badge.id" class="category-option"><input data-v-ui-c7d5f9a002b6 v-model="draft.badgeIds" type="checkbox" :value="badge.id"/>{{badge.label}}{{badge.isActive?'':' — выключен'}}</label><label data-v-ui-c7d5f9a002b6 v-for="id in unlistedBadgeIds" :key="id" class="category-option"><input data-v-ui-c7d5f9a002b6 v-model="draft.badgeIds" type="checkbox" :value="id"/>{{id}} — бейдж удалён, снимите назначение</label><small data-v-ui-c7d5f9a002b6>Автоматические бейджи показываются по условиям редактора бейджей.</small></fieldset>
          </section>
          <section data-v-ui-c7d5f9a002b6 v-show="tab === 'images'" id="product-editor-panel-images" class="images-editor" role="tabpanel" aria-labelledby="product-editor-tab-images">
            <div data-v-ui-c7d5f9a002b6 class="images-intro"><div data-v-ui-c7d5f9a002b6><h3 data-v-ui-c7d5f9a002b6>Галерея товара</h3><p data-v-ui-c7d5f9a002b6 id="product-editor-gallery-help">Первое изображение — обложка. Перетаскивайте изображения за ручку слева.</p></div><button data-v-ui-c7d5f9a002b6 type="button" class="editor-button editor-button--white" @click="addImage"><ImagePlus data-v-ui-c7d5f9a002b6 :size="18" aria-hidden="true" /> Добавить</button></div><p data-v-ui-c7d5f9a002b6 class="editor-gallery-status" role="status" aria-live="polite">{{ galleryStatus }}</p>
            <ol data-v-ui-c7d5f9a002b6 class="image-list" aria-label="Порядок изображений товара"><li data-v-ui-c7d5f9a002b6 v-for="(image, index) in draft.images" :key="image.key" class="image-card" :class="{ 'is-dragging': draggedKey === image.key }" @dragover.prevent @drop="dropImage($event, index)">
              <div data-v-ui-c7d5f9a002b6 class="image-order-column"><button data-v-ui-c7d5f9a002b6 type="button" class="editor-icon-button image-handle" :draggable="!saving" :disabled="saving" :aria-label="'Перетащить изображение ' + (index + 1)" aria-describedby="product-editor-gallery-help" @dragstart="dragImage($event, image.key)" @dragend="draggedKey = null" @keydown.alt.up.prevent="moveImage(index, index - 1)" @keydown.alt.down.prevent="moveImage(index, index + 1)"><GripVertical data-v-ui-c7d5f9a002b6 :size="20" aria-hidden="true" /></button></div><div data-v-ui-c7d5f9a002b6 class="workspace-sort-content"><div data-v-ui-c7d5f9a002b6 class="image-card-head"><span data-v-ui-c7d5f9a002b6>{{ index === 0 ? 'Обложка' : 'Изображение ' + (index + 1) }}</span><div data-v-ui-c7d5f9a002b6 class="image-order-actions"><button data-v-ui-c7d5f9a002b6 type="button" class="editor-icon-button" :disabled="saving" :aria-label="'Удалить изображение ' + (index + 1)" @click="removeImage(index)"><X data-v-ui-c7d5f9a002b6 :size="18" aria-hidden="true" /></button></div></div>
              <div data-v-ui-c7d5f9a002b6 class="image-card-body"><div data-v-ui-c7d5f9a002b6 class="image-preview"><img data-v-ui-c7d5f9a002b6 v-if="previewImage(image.url)" :src="previewImage(image.url)" :alt="image.alt || 'Предпросмотр изображения ' + (index + 1)" /><ImagePlus data-v-ui-c7d5f9a002b6 v-else :size="28" aria-hidden="true" /></div><div data-v-ui-c7d5f9a002b6 class="image-inputs"><AdminMediaPicker v-model="image.url" :disabled="saving" :show-preview="false" :label="'Изображение ' + (index + 1)" /><label data-v-ui-c7d5f9a002b6 :for="'product-editor-alt-' + image.key">Описание изображения (alt)<input data-v-ui-c7d5f9a002b6 :id="'product-editor-alt-' + image.key" v-model="image.alt" placeholder="Что изображено на фото" /></label></div></div>
            </div></li></ol><div data-v-ui-c7d5f9a002b6 v-if="!draft.images.length" class="empty-images"><ImagePlus data-v-ui-c7d5f9a002b6 :size="28" aria-hidden="true" /><p data-v-ui-c7d5f9a002b6>Изображений пока нет</p><button data-v-ui-c7d5f9a002b6 type="button" class="editor-button editor-button--white" @click="addImage">Добавить первое изображение</button></div>
          </section>
          <section data-v-ui-c7d5f9a002b6 v-show="tab === 'seo'" id="product-editor-panel-seo" class="editor-fields" role="tabpanel" aria-labelledby="product-editor-tab-seo">
            <p data-v-ui-c7d5f9a002b6 class="editor-note">Canonical заполняйте только для переопределения основного адреса страницы.</p><label data-v-ui-c7d5f9a002b6 for="product-editor-meta-title">Заголовок для поиска<input data-v-ui-c7d5f9a002b6 id="product-editor-meta-title" v-model="draft.metaTitle" placeholder="Название товара — SARKISIAN" /><small data-v-ui-c7d5f9a002b6>{{ draft.metaTitle.length }} символов · рекомендуется до 60</small></label><label data-v-ui-c7d5f9a002b6 for="product-editor-meta-description">Описание для поиска<textarea data-v-ui-c7d5f9a002b6 id="product-editor-meta-description" v-model="draft.metaDesc" rows="4" /><small data-v-ui-c7d5f9a002b6>{{ draft.metaDesc.length }} символов · рекомендуется до 160</small></label><label data-v-ui-c7d5f9a002b6 for="product-editor-canonical">Canonical URL<input data-v-ui-c7d5f9a002b6 id="product-editor-canonical" v-model="draft.canonical" type="url" placeholder="https://sarkisianbrand.ru/products/slug" /></label>
          </section>
        </fieldset>
      </form>
      <footer data-v-ui-c7d5f9a002b6 class="editor-footer admin-dialog-foot"><p data-v-ui-c7d5f9a002b6 v-if="message" class="editor-error" role="alert">{{ message }}</p><p data-v-ui-c7d5f9a002b6 v-else-if="saving" role="status">Сохраняем изменения…</p><div data-v-ui-c7d5f9a002b6 class="editor-footer-actions"><button data-v-ui-c7d5f9a002b6 type="button" class="editor-button editor-button--white" :disabled="saving" @click="closeEditor">Отмена</button><button data-v-ui-c7d5f9a002b6 type="submit" form="product-editor-form" class="editor-button" :disabled="saving"><Save data-v-ui-c7d5f9a002b6 :size="18" aria-hidden="true" />{{ saving ? 'Сохраняем…' : 'Сохранить' }}</button></div></footer>
    </section>
  </aside>
</template>

