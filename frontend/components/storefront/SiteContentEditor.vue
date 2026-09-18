<script setup lang="ts">
import { Eye, EyeOff, GripVertical, Plus, Save, X } from '@lucide/vue';
import { homeSectionKeys as HOME_SECTION_KEYS, partnershipSectionKeys, mergeSiteContent as resolveSiteContent, safeSiteContentUrl, type HomeSection as HomeSectionKey, type SiteContent, type SiteContentInput } from '../../shared/site-content';
const props = defineProps<{ apiBase: string; token: string }>();
type Response = { revision: number; content: SiteContentInput };
type PageOption = { slug: string; title: string; isActive: boolean };
type ProductOption = { id: string; nameRu: string; isActive: boolean };
type HistoryEntry = { revision: number; createdAt: string };
type Field = { key: string; label: string; max: number; multiline?: boolean };
type FooterItem = SiteContent['footer']['columns'][number]['items'][number];
const tabs = [{ id: 'home', label: 'Главная' }, { id: 'header', label: 'Шапка и футер' }, { id: 'contacts', label: 'Контакты' }, { id: 'history', label: 'История' }] as const;
const tab = ref<(typeof tabs)[number]['id']>('home');
const selectedHome = ref<HomeSectionKey>('categories');
const draft = ref<SiteContent>(resolveSiteContent({}));
const baseline = ref('');
const revision = ref<number | null>(null);
const loaded = ref(false), loading = ref(false), saving = ref(false), conflict = ref(false), forbidden = ref(false);
const error = ref(''), notice = ref(''), referenceError = ref(''), historyError = ref('');
const pages = ref<PageOption[]>([]), products = ref<ProductOption[]>([]);
const productsLoaded = ref(false), referencesLoading = ref(false);
const productPage = ref(1), productTotal = ref(0), productMoreLoading = ref(false);
const history = ref<HistoryEntry[]>([]), historyLoading = ref(false), historyLoaded = ref(false);
const historyTotal = ref(0);
const preview = ref(false), previewWidth = ref<'desktop' | 'mobile'>('desktop');
const drag = ref<{ group: string; index: number; identity: number } | null>(null);
const moveNotice = ref('');
const controllers = new Set<AbortController>();
let identity = 0, contentVersion = 0, referenceVersion = 0, historyVersion = 0, productVersion = 0, mounted = false;
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const snapshot = () => JSON.stringify(draft.value);
const dirty = computed(() => loaded.value && snapshot() !== baseline.value);
const busy = computed(() => loading.value || saving.value);
const editingDisabled = computed(() => busy.value || forbidden.value);
const sectionNames: Record<HomeSectionKey, string> = { hero: 'Главный баннер', categories: 'Категории', bestsellers: 'Бестселлеры', business: 'Для бизнеса', referral: 'Реферальная программа', bloggers: 'Блогерам', club: 'SARKISIAN CLUB', manifesto: 'О бренде — главный тезис', story: 'История и портрет', benefits: 'Преимущества' };
const partnershipFields: Field[] = [{ key: 'eyebrow', label: 'Надзаголовок', max: 100 }, { key: 'title', label: 'Заголовок', max: 200 }, { key: 'accent', label: 'Акцент заголовка', max: 200 }, { key: 'body', label: 'Описание', max: 1000, multiline: true }, { key: 'buttonLabel', label: 'Подпись кнопки', max: 80 }, { key: 'url', label: 'Адрес кнопки', max: 500 }, { key: 'visualLabel', label: 'Подпись иллюстрации', max: 100 }, { key: 'visualTitle', label: 'Заголовок иллюстрации', max: 200 }];
const businessPreviewFields: Field[] = [
  { key: 'salonTitle', label: 'Название вкладки салона', max: 80 }, { key: 'purchasesTitle', label: 'Название вкладки закупок', max: 80 },
  { key: 'scheduleTitle', label: 'Заголовок расписания', max: 80 }, { key: 'breakTitle', label: 'Подпись перерыва', max: 80 },
  { key: 'appointmentTitle', label: 'Первая услуга в примере', max: 80 }, { key: 'appointmentDetail', label: 'Подпись первой записи', max: 80 },
  { key: 'secondAppointmentTitle', label: 'Вторая услуга в примере', max: 80 }, { key: 'secondAppointmentDetail', label: 'Подпись второй записи', max: 80 },
  { key: 'widgetTitle', label: 'Заголовок примера виджета', max: 80 }, { key: 'widgetAction', label: 'Подпись действия в виджете', max: 80 },
  { key: 'productTitle', label: 'Название демонстрационного товара', max: 80 }, { key: 'productDetail', label: 'Описание демонстрационного товара', max: 80 },
  { key: 'productCaption', label: 'Подпись примерной цены', max: 80 }, { key: 'productImageUrl', label: 'Фото демонстрационного товара', max: 500 },
  { key: 'orderTitle', label: 'Заголовок примера заказа', max: 80 }, { key: 'orderBody', label: 'Этапы доставки в примере', max: 80 }, { key: 'demoLabel', label: 'Пометка демонстрационных данных', max: 80 },
];
const businessPreviewData = computed(() => draft.value.home.business.preview! as unknown as Record<string, any>);
const sectionFields: Partial<Record<HomeSectionKey, Field[]>> = {
  business: partnershipFields, referral: partnershipFields, bloggers: partnershipFields,
  categories: [{ key: 'eyebrow', label: 'Надзаголовок', max: 100 }, { key: 'title', label: 'Заголовок', max: 200 }, { key: 'buttonLabel', label: 'Кнопка каталога', max: 80 }],
  bestsellers: [{ key: 'eyebrow', label: 'Надзаголовок', max: 100 }, { key: 'title', label: 'Заголовок', max: 200 }, { key: 'buttonLabel', label: 'Кнопка каталога', max: 80 }],
  club: [{ key: 'label', label: 'Название клуба', max: 80 }, { key: 'title', label: 'Заголовок', max: 200 }, { key: 'accent', label: 'Акцент заголовка', max: 200 }, { key: 'joinLabel', label: 'Кнопка вступления', max: 80 }, { key: 'aboutLabel', label: 'Кнопка страницы клуба', max: 80 }, { key: 'previewLabel', label: 'Подпись демонстрационной карты', max: 100 }],
  manifesto: [{ key: 'text', label: 'Главный тезис о бренде', max: 500, multiline: true }],
  story: [{ key: 'eyebrow', label: 'Надзаголовок', max: 100 }, { key: 'title', label: 'Заголовок', max: 200 }, { key: 'accent', label: 'Акцент заголовка', max: 200 }, { key: 'body', label: 'Текст', max: 2000, multiline: true }, { key: 'buttonLabel', label: 'Кнопка каталога', max: 80 }],
};
function sectionData(key: HomeSectionKey): Record<string, any> { return (draft.value.home as any)[key] || {}; }
function publicSiteUrl() { const config = useRuntimeConfig(); return String(config.public.siteUrl || '/'); }
const siteUrl = publicSiteUrl();
function failure(caught: any, fallback: string) {
  const status = caught?.statusCode || caught?.response?.status;
  if (status === 401) return 'Сессия завершилась. Войдите в рабочее пространство заново.';
  if (status === 403) return 'Недостаточно прав для редактирования контента сайта.';
  if (status === 409) return 'Контент изменён другим сотрудником. Черновик сохранён в редакторе; загрузите актуальную версию перед новым сохранением.';
  if (status === 503) return 'Редактор временно недоступен. Изменения не подтверждены сервером.';
  const detail = caught?.data?.message;
  return Array.isArray(detail) ? detail.join('. ') : typeof detail === 'string' ? detail : fallback;
}
async function request<T>(suffix = '', options: Record<string, any> = {}, root = '/admin/storefront/site-content') {
  if (!props.token) throw { statusCode: 401 };
  const controller = new AbortController(); controllers.add(controller);
  try { return await $fetch<T>(root + suffix, { baseURL: props.apiBase, headers: { Authorization: 'Bearer ' + props.token }, signal: controller.signal, timeout: 20000, ...options }); }
  finally { controllers.delete(controller); }
}
function applyResponse(result: Response) {
  if (!result || !Number.isSafeInteger(result.revision) || result.revision < 0 || result.revision > 2147483646 || !result.content || typeof result.content !== 'object' || Array.isArray(result.content)) throw new Error('Некорректный ответ редактора');
  draft.value = clone(resolveSiteContent(result.content)); revision.value = result.revision;
  baseline.value = snapshot(); loaded.value = true; conflict.value = false; forbidden.value = false; drag.value = null;
}
async function load() {
  if (busy.value || (dirty.value && !window.confirm('Загрузить актуальную версию и отменить несохранённый черновик?'))) return;
  const current = identity, version = ++contentVersion; loading.value = true; error.value = ''; notice.value = '';
  try { const result = await request<Response>(); if (mounted && current === identity && version === contentVersion) applyResponse(result); }
  catch (caught: any) { if (mounted && current === identity && version === contentVersion) { forbidden.value = [401, 403].includes(caught?.statusCode || caught?.response?.status); error.value = failure(caught, 'Не удалось загрузить контент. Повторите попытку.'); } }
  finally { if (current === identity && version === contentVersion) { loading.value = false; if (mounted && loaded.value && tab.value === 'history' && !historyLoaded.value) loadHistory(); } }
}
async function loadReferences() {
  if (referencesLoading.value || productMoreLoading.value || !props.token) return;
  const current = identity, version = ++referenceVersion; referencesLoading.value = true; referenceError.value = '';
  const results = await Promise.allSettled([
    request<PageOption[]>('', {}, '/admin/storefront/pages'),
    request<{ items: ProductOption[]; total: number }>('', { query: { page: 1, limit: 100 } }, '/admin/products/list'),
  ]);
  if (!mounted || current !== identity || version !== referenceVersion) return;
  const [pageResult, productResult] = results;
  if (pageResult.status === 'fulfilled' && Array.isArray(pageResult.value)) pages.value = pageResult.value.map(item => ({ slug: item.slug, title: item.title, isActive: item.isActive === true })).filter(item => /^[a-z0-9][a-z0-9-]{0,79}$/.test(item.slug));
  else referenceError.value = 'Не удалось загрузить страницы для выбора ссылок.';
  if (productResult.status === 'fulfilled' && Array.isArray(productResult.value.items) && Number.isSafeInteger(productResult.value.total) && productResult.value.total >= 0) { products.value = productResult.value.items.map(item => ({ id: item.id, nameRu: item.nameRu, isActive: item.isActive === true })).filter(item => typeof item.id === 'string' && typeof item.nameRu === 'string'); productsLoaded.value = true; productPage.value = 1; productTotal.value = productResult.value.total; }
  else { productsLoaded.value = false; referenceError.value += (referenceError.value ? ' ' : '') + 'Не удалось загрузить товары. Новую ручную подборку нельзя подтвердить до загрузки списка.'; }
  referencesLoading.value = false;
}
async function loadMoreProducts() {
  if (referencesLoading.value || productMoreLoading.value || busy.value || !productsLoaded.value || productPage.value * 100 >= productTotal.value) return;
  const current = identity, version = ++productVersion, page = productPage.value + 1; productMoreLoading.value = true; referenceError.value = '';
  try {
    const result = await request<{ items: ProductOption[]; total: number }>('', { query: { page, limit: 100 } }, '/admin/products/list');
    if (!mounted || current !== identity || version !== productVersion) return;
    if (!Array.isArray(result?.items) || !Number.isSafeInteger(result.total) || result.total < 0) throw new Error('Некорректный список товаров');
    const known = new Map(products.value.map(item => [item.id, item]));
    for (const item of result.items) if (typeof item.id === 'string' && typeof item.nameRu === 'string') known.set(item.id, { id: item.id, nameRu: item.nameRu, isActive: item.isActive === true });
    products.value = [...known.values()]; productPage.value = page; productTotal.value = result.total;
  } catch (caught) { if (mounted && current === identity && version === productVersion) referenceError.value = failure(caught, 'Не удалось загрузить следующую страницу товаров. Попробуйте ещё раз.'); }
  finally { if (current === identity && version === productVersion) productMoreLoading.value = false; }
}
function moveProduct(index: number, direction: -1 | 1) {
  if (editingDisabled.value) return; const ids = draft.value.home.bestsellers.productIds, next = index + direction;
  if (index < 0 || next < 0 || index >= ids.length || next >= ids.length) return;
  const [id] = ids.splice(index, 1); ids.splice(next, 0, id!); moveNotice.value = 'Порядок подборки изменён. Сохраните контент.';
}
async function loadHistory() {
  if (historyLoading.value || busy.value) return;
  const current = identity, version = ++historyVersion; historyLoading.value = true; historyError.value = '';
  try {
    const result = await request<{ items: HistoryEntry[]; total?: number }>('/revisions');
    if (!mounted || current !== identity || version !== historyVersion) return;
    if (!Array.isArray(result?.items)) throw new Error('Некорректная история');
    history.value = result.items.filter(item => Number.isSafeInteger(item.revision) && item.revision >= 0 && typeof item.createdAt === 'string').map(item => ({ revision: item.revision, createdAt: item.createdAt }));
    historyTotal.value = Number.isSafeInteger(result.total) && result.total! >= history.value.length ? result.total! : history.value.length;
    historyLoaded.value = true;
  } catch (caught) { if (mounted && current === identity && version === historyVersion) historyError.value = failure(caught, 'Не удалось загрузить историю контента.'); }
  finally { if (current === identity && version === historyVersion) historyLoading.value = false; }
}
function selectTab(value: typeof tab.value) { if (saving.value) return; tab.value = value; if (value === 'history' && !historyLoaded.value) loadHistory(); }
function safeUrl(value: string, image = false) {
  return value === '' || safeSiteContentUrl(value, image);
}
function validate() {
  const text = (value: unknown, max: number, label: string) => { if (typeof value !== 'string' || value.length > max || value.includes('\u0000')) throw new Error(label + ': максимум ' + max + ' символов, без нулевых управляющих символов.'); };
  const list = (items: any[], max: number, label: string) => { if (!Array.isArray(items) || items.length > max) throw new Error(label + ': максимум ' + max + ' элементов.'); const ids = new Set<string>(); for (const item of items) { text(item.id, 80, 'ID'); const id = item.id.trim(); if (!id || ids.has(id)) throw new Error(label + ': ID должны быть уникальными и непустыми.'); ids.add(id); } };
  const url = (value: unknown, image = false) => { text(value, image ? 500 : 500, 'Ссылка'); if (!safeUrl(value as string, image)) throw new Error(image ? 'Изображение: используйте путь медиатеки, /storefront/ или публичный HTTPS URL.' : 'Ссылка: используйте внутренний путь или публичный HTTPS URL без логина и пароля.'); };
  text(draft.value.contacts.phone, 30, 'Телефон'); text(draft.value.contacts.email, 254, 'Email'); text(draft.value.contacts.country, 80, 'Страна');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.value.contacts.email)) throw new Error('Укажите корректный email для контактов.');
  if (draft.value.contacts.phone && !/^\+?[\d ()-]+$/.test(draft.value.contacts.phone)) throw new Error('Телефон: используйте цифры, +, пробелы, скобки и дефисы.');
  text(draft.value.brand.name, 80, 'Название бренда'); text(draft.value.brand.footerText, 500, 'Описание в футере'); url(draft.value.brand.logoUrl, true);
  const home = draft.value.home;
  if (home.order.length !== HOME_SECTION_KEYS.length || new Set(home.order).size !== HOME_SECTION_KEYS.length || home.order.some(key => !HOME_SECTION_KEYS.includes(key))) throw new Error('Главная должна содержать все разделы без повторений.');
  if (new Set(home.hidden).size !== home.hidden.length || home.hidden.some(key => !HOME_SECTION_KEYS.includes(key))) throw new Error('Некорректный список скрытых разделов.');
  for (const key of HOME_SECTION_KEYS) for (const field of sectionFields[key] || []) text(sectionData(key)[field.key], field.max, field.label);
  for (const key of partnershipSectionKeys) {
    const block = home[key]; url(block.url); if (block.visualImageUrl) url(block.visualImageUrl, true); if (block.visualVideoUrl) url(block.visualVideoUrl, true);
    if (!['dark', 'light', 'rose'].includes(block.theme)) throw new Error('Выберите тему блока.');
    if (!Array.isArray(block.visualLines) || block.visualLines.length > 4) throw new Error('В иллюстрации — до четырёх строк.');
    for (const line of block.visualLines) text(line, 150, 'Строка иллюстрации');
  }
  if (!['popular', 'manual'].includes(home.bestsellers.mode)) throw new Error('Выберите источник бестселлеров.');
  for (const field of businessPreviewFields) text(businessPreviewData.value[field.key], field.max, field.label);
  url(businessPreviewData.value.productImageUrl, true);
  if (!Number.isInteger(businessPreviewData.value.productPrice) || businessPreviewData.value.productPrice < 0 || businessPreviewData.value.productPrice > 1000000) throw new Error('Цена в мини-макете: целое число от 0 до 1 000 000.');
  const ids = home.bestsellers.productIds;
  if (ids.length > 8 || new Set(ids).size !== ids.length || ids.some(id => typeof id !== 'string' || !id || id.length > 80)) throw new Error('Ручная подборка: до восьми уникальных ID товаров.');
  const oldIds = JSON.parse(baseline.value).home.bestsellers.productIds;
  // A loaded page is not an authoritative ID registry.
  // Preserve IDs from the stored snapshot; backend validates existence of every submitted ID.
  if (productsLoaded.value && ids.some(id => !oldIds.includes(id) && !products.value.some(product => product.id === id))) throw new Error('Новый товар не найден в загруженном списке. Выберите товар из списка.');
  if (!productsLoaded.value && JSON.stringify(ids) !== JSON.stringify(oldIds)) throw new Error('Загрузите список товаров перед сохранением новой ручной подборки.');
  if (!Number.isInteger(home.club.previewBalance) || home.club.previewBalance < 0 || home.club.previewBalance > 1000000) throw new Error('Демонстрационный баланс: целое число от 0 до 1 000 000.');
  list(home.club.benefits, 6, 'Преимущества клуба');
  for (const item of home.club.benefits) { if (!['award', 'gift', 'shield'].includes(item.icon)) throw new Error('Некорректная иконка клуба.'); text(item.text, 250, 'Преимущество клуба'); }
  url(home.story.portraitUrl, true); list(home.benefits, 8, 'Преимущества');
  for (const item of home.benefits) { if (!['package', 'shield', 'award', 'sparkles'].includes(item.icon)) throw new Error('Некорректная иконка преимущества.'); text(item.eyebrow, 100, 'Надзаголовок'); text(item.title, 200, 'Заголовок'); text(item.body, 1000, 'Описание'); }
  list(draft.value.footer.columns, 4, 'Колонки футера');
  for (const column of draft.value.footer.columns) { text(column.title, 100, 'Заголовок колонки'); list(column.items, 12, 'Ссылки колонки'); for (const item of column.items) { text(item.label, 80, 'Название ссылки'); url(item.url); if (!['none', 'account', 'favorites', 'cart'].includes(item.action) || typeof item.newTab !== 'boolean') throw new Error('Некорректное действие ссылки.'); } }
  list(draft.value.footer.legalLinks, 8, 'Юридические ссылки');
  for (const item of draft.value.footer.legalLinks) { text(item.label, 80, 'Название ссылки'); url(item.url); if (typeof item.newTab !== 'boolean') throw new Error('Некорректное открытие ссылки.'); }
  if (new TextEncoder().encode(snapshot()).length > 32 * 1024) throw new Error('Общий объём контента превышает 32 КБ. Сократите тексты или количество ссылок.');
}
async function save() {
  if (!loaded.value || !dirty.value || busy.value || conflict.value || forbidden.value) return;
  error.value = ''; notice.value = '';
  try { validate(); } catch (caught: any) { error.value = caught.message; return; }
  const body = { revision: revision.value, content: clone(resolveSiteContent(draft.value)) };
  const current = identity, version = ++contentVersion; saving.value = true; drag.value = null;
  try { const result = await request<Response>('', { method: 'PATCH', body }); if (mounted && current === identity && version === contentVersion) { applyResponse(result); notice.value = 'Контент сохранён. На сайте изменения появятся после обновления страницы.'; historyLoaded.value = false; } }
  catch (caught: any) { if (mounted && current === identity && version === contentVersion) { const status = caught?.statusCode || caught?.response?.status; conflict.value = status === 409; forbidden.value = [401, 403].includes(status); error.value = failure(caught, 'Не удалось подтвердить сохранение. Черновик оставлен в редакторе; проверьте актуальную версию.'); } }
  finally { if (current === identity && version === contentVersion) saving.value = false; }
}
function cancel() { if (!dirty.value || busy.value || !window.confirm('Отменить все несохранённые изменения контента?')) return; draft.value = JSON.parse(baseline.value); drag.value = null; error.value = ''; notice.value = 'Черновик отменён.'; }
async function restore(targetRevision: number) {
  if (!loaded.value || busy.value || conflict.value || forbidden.value || targetRevision === revision.value) return;
  if (!window.confirm('Восстановить контент версии ' + targetRevision + ' в новой версии? ' + (dirty.value ? 'Несохранённый черновик будет заменён. ' : '') + 'Заказы, платежи и бонусные операции не изменяются.')) return;
  const current = identity, version = ++contentVersion; saving.value = true; error.value = ''; notice.value = '';
  try { const result = await request<Response>('/restore', { method: 'POST', body: { revision: revision.value, targetRevision } }); if (mounted && current === identity && version === contentVersion) { applyResponse(result); notice.value = 'Контент восстановлен в новой версии ' + result.revision + '.'; historyLoaded.value = false; } }
  catch (caught: any) { if (mounted && current === identity && version === contentVersion) { const status = caught?.statusCode || caught?.response?.status; conflict.value = status === 409; forbidden.value = [401, 403].includes(status); error.value = failure(caught, 'Не удалось подтвердить восстановление. Проверьте актуальную версию.'); } }
  finally { if (current === identity && version === contentVersion) { saving.value = false; if (!conflict.value && !forbidden.value && !historyLoaded.value) loadHistory(); } }
}
function listFor(group: string): any[] | null {
  if (group === 'home') return draft.value.home.order;
  if (group === 'products') return draft.value.home.bestsellers.productIds;
  if (group === 'columns') return draft.value.footer.columns;
  if (group === 'legal') return draft.value.footer.legalLinks;
  if (group.startsWith('items:')) return draft.value.footer.columns.find(column => column.id === group.slice(6))?.items || null;
  return null;
}
function reorder(group: string, from: number, to: number) {
  if (editingDisabled.value) return; const items = listFor(group);
  if (!items || from < 0 || to < 0 || from >= items.length || to >= items.length || from === to) return;
  const [item] = items.splice(from, 1); items.splice(to, 0, item); moveNotice.value = 'Порядок изменён. Сохраните контент для публикации.';
}
function beginDrag(event: DragEvent, group: string, index: number) {
  if (editingDisabled.value || !event.dataTransfer) { event.preventDefault(); return; }
  drag.value = { group, index, identity }; event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', 'site-content-order');
}
function drop(event: DragEvent, group: string, index: number) {
  event.preventDefault(); event.stopPropagation(); const source = drag.value; drag.value = null;
  if (!source || source.group !== group || source.identity !== identity) return; reorder(group, source.index, index);
}
function toggleHidden(key: HomeSectionKey, visible: boolean) { if (editingDisabled.value) return; draft.value.home.hidden = visible ? draft.value.home.hidden.filter(item => item !== key) : [...new Set([...draft.value.home.hidden, key])]; }
function addColumn() { if (!editingDisabled.value && draft.value.footer.columns.length < 4) draft.value.footer.columns.push({ id: crypto.randomUUID(), title: '', items: [] }); }
function addFooterItem(column: SiteContent['footer']['columns'][number]) { if (!editingDisabled.value && column.items.length < 12) column.items.push({ id: crypto.randomUUID(), label: '', url: '/', action: 'none', newTab: false }); }
function addLegal() { if (!editingDisabled.value && draft.value.footer.legalLinks.length < 8) draft.value.footer.legalLinks.push({ id: crypto.randomUUID(), label: '', url: '/', newTab: false }); }
function remove(items: any[], index: number) { if (!editingDisabled.value && window.confirm('Удалить элемент из черновика? На сайте изменение появится только после сохранения.')) items.splice(index, 1); }
function pageChoice(item: { url: string }) { return pages.value.some(page => '/' + page.slug === item.url) ? item.url : ''; }
function setPage(item: { url: string; action?: string }, value: string) { if (editingDisabled.value || !pages.value.some(page => '/' + page.slug === value)) return; item.url = value; if ('action' in item) item.action = 'none'; }
function setAction(item: FooterItem, value: FooterItem['action']) { if (editingDisabled.value) return; item.action = value; if (value !== 'none') item.newTab = false; }
function addClubBenefit() { if (!editingDisabled.value && draft.value.home.club.benefits.length < 6) draft.value.home.club.benefits.push({ id: crypto.randomUUID(), icon: 'award', text: '' }); }
function addBenefit() { if (!editingDisabled.value && draft.value.home.benefits.length < 8) draft.value.home.benefits.push({ id: crypto.randomUUID(), icon: 'package', eyebrow: '', title: '', body: '' }); }
function beforeUnload(event: BeforeUnloadEvent) { if (dirty.value || saving.value) { event.preventDefault(); event.returnValue = ''; } }
const leave = () => !saving.value && (!dirty.value || window.confirm('Уйти без сохранения контента сайта?'));
function stopRequests() { ++identity; ++contentVersion; ++referenceVersion; ++historyVersion; ++productVersion; controllers.forEach(controller => controller.abort()); drag.value = null; }
onMounted(() => { mounted = true; load(); loadReferences(); window.addEventListener('beforeunload', beforeUnload); });
watch(() => [props.apiBase, props.token], () => {
  if (!mounted) return; stopRequests(); draft.value = resolveSiteContent({}); baseline.value = ''; revision.value = null; loaded.value = false;
  loading.value = false; saving.value = false; conflict.value = false; forbidden.value = false; error.value = ''; notice.value = ''; preview.value = false;
  pages.value = []; products.value = []; productsLoaded.value = false; referencesLoading.value = false; productPage.value = 1; productTotal.value = 0; productMoreLoading.value = false; referenceError.value = '';
  history.value = []; historyTotal.value = 0; historyLoading.value = false; historyLoaded.value = false; historyError.value = ''; load(); loadReferences();
});
onBeforeUnmount(() => { mounted = false; stopRequests(); window.removeEventListener('beforeunload', beforeUnload); });
onBeforeRouteLeave(leave); onBeforeRouteUpdate(leave);
</script>

<template>
  <section class="site-content-admin">
    <header class="sca-panel sca-head"><div><p class="sca-eyebrow">КОНТЕНТ МАГАЗИНА</p><h1>Контент сайта</h1><p>Главная, бренд, контакты и футер. Баннеры, меню шапки и тексты страниц редактируются в своих разделах.</p></div><div class="sca-actions"><a class="sca-button sca-button--white" :href="siteUrl" target="_blank" rel="noopener noreferrer">Открыть сайт</a><button class="sca-button sca-button--white" type="button" :disabled="busy" @click="load">Обновить контент</button></div></header>
    <nav class="sca-tabs" aria-label="Разделы контента"><button v-for="item in tabs" :key="item.id" type="button" :class="{ 'is-active': tab === item.id }" :aria-current="tab === item.id ? 'page' : undefined" :disabled="saving" @click="selectTab(item.id)">{{ item.label }}</button></nav>
    <p v-if="error" class="sca-notice" role="alert">{{ error }} <button v-if="!loaded" class="sca-button sca-button--white" type="button" :disabled="busy" @click="load">Повторить загрузку</button></p>
    <p v-if="notice" class="sca-notice" role="status">{{ notice }}</p><p v-if="loading" class="sca-notice" role="status">Загружаем контент…</p><p class="sca-sr-only" aria-live="polite">{{ moveNotice }}</p>
    <form v-if="loaded && tab !== 'history'" novalidate @submit.prevent="save">
      <fieldset :disabled="editingDisabled" class="sca-fields">
        <template v-if="tab === 'home'">
          <div class="studio-content-layout">
          <section class="sca-panel studio-content-outline"><header class="sca-group-head"><div><p class="sca-eyebrow">ГЛАВНАЯ СТРАНИЦА</p><h3>Структура страницы</h3></div></header><p class="sca-help">Выберите блок для редактирования. Перетаскивайте за ручку, чтобы изменить порядок.</p>
            <label class="studio-mobile-block-picker"><span>Редактируемый блок</span><select v-model="selectedHome" aria-label="Выбрать блок главной"><option v-for="key in draft.home.order" :key="key" :value="key">{{ sectionNames[key] }}</option></select></label>
            <ol class="sca-order"><li v-for="(key, index) in draft.home.order" :key="key" class="sca-order-row studio-content-block" :class="{ 'studio-content-block--selected': selectedHome === key }" @dragover.prevent @drop="drop($event, 'home', index)"><button class="sca-handle" type="button" :draggable="!editingDisabled" :aria-label="'Перетащить ' + sectionNames[key]" @dragstart="beginDrag($event, 'home', index)" @dragend="drag = null" @keydown.alt.up.prevent="reorder('home', index, index - 1)" @keydown.alt.down.prevent="reorder('home', index, index + 1)"><GripVertical :size="16" /></button><button type="button" class="studio-block-select" :aria-pressed="selectedHome === key" @click="selectedHome = key"><span>{{ sectionNames[key] }}</span><small>{{ draft.home.hidden.includes(key) ? 'Скрыт' : 'На сайте' }}</small></button><button type="button" class="sca-close studio-block-visibility" :aria-label="(draft.home.hidden.includes(key) ? 'Показать ' : 'Скрыть ') + sectionNames[key]" :aria-pressed="!draft.home.hidden.includes(key)" @click="toggleHidden(key, draft.home.hidden.includes(key))"><EyeOff v-if="draft.home.hidden.includes(key)" :size="16" /><Eye v-else :size="16" /></button></li></ol>
            <button class="sca-button sca-button--white" type="button" @click="preview = !preview">{{ preview ? 'Закрыть просмотр структуры' : 'Просмотреть структуру' }}</button>
          </section>
          <div class="studio-content-detail">
          <section v-if="preview" class="sca-panel"><header class="sca-group-head"><h3>Черновой просмотр</h3><select v-model="previewWidth" aria-label="Ширина чернового просмотра"><option value="desktop">ПК — структура</option><option value="mobile">Телефон — структура</option></select></header><p class="sca-help">Это текстовая структура черновика, не точный рендер сайта. Изменения ещё не опубликованы; баланс карты демонстрационный.</p><div class="sca-preview" :class="{ 'sca-preview--mobile': previewWidth === 'mobile' }"><article v-for="key in draft.home.order.filter(item => !draft.home.hidden.includes(item))" :key="key"><small>{{ sectionNames[key] }}</small><h4>{{ sectionData(key).title || sectionData(key).text || sectionNames[key] }}</h4><p>{{ sectionData(key).accent || sectionData(key).body || '' }}</p></article></div></section>
          <section v-for="key in draft.home.order.filter(item => item === selectedHome)" :key="'fields-' + key" class="sca-panel studio-content-fields"><header class="sca-group-head"><div><p class="sca-eyebrow">НАСТРОЙКИ БЛОКА</p><h3>{{ sectionNames[key] }}</h3></div><span class="studio-status" :class="{ 'studio-status--muted': draft.home.hidden.includes(key) }">{{ draft.home.hidden.includes(key) ? 'Скрыт на сайте' : 'Показывается на сайте' }}</span></header>
            <p v-if="key === 'hero'" class="sca-help">Изображения, ссылки и смена главного баннера настраиваются в редакторе баннеров. Здесь доступны порядок и видимость блока.</p>
            <div v-if="sectionFields[key]?.length" class="sca-grid"><label v-for="field in sectionFields[key]" :key="field.key" class="sca-field" :class="{ 'sca-wide': field.multiline }"><span>{{ field.label }}</span><textarea v-if="field.multiline" v-model="sectionData(key)[field.key]" :maxlength="field.max" rows="4" /><input v-else v-model="sectionData(key)[field.key]" :maxlength="field.max" type="text" /></label></div>
            <template v-if="key === 'bestsellers'"><label class="sca-field"><span>Источник товаров</span><select v-model="draft.home.bestsellers.mode"><option value="popular">По популярности</option><option value="manual">Ручная подборка</option></select></label><p class="sca-help">До восьми товаров. Неактивные ранее выбранные товары сохраняются в настройках, но не показываются на сайте.</p><label v-if="draft.home.bestsellers.mode === 'manual'" class="sca-field"><span>Товары подборки</span><select v-model="draft.home.bestsellers.productIds" multiple size="8" :disabled="referencesLoading || !productsLoaded" aria-label="Выбрать до восьми товаров"><option v-for="product in products.filter(item => item.isActive || draft.home.bestsellers.productIds.includes(item.id))" :key="product.id" :value="product.id">{{ product.nameRu }}{{ product.isActive ? '' : ' — скрыт' }}</option><option v-for="id in draft.home.bestsellers.productIds.filter(value => !products.some(product => product.id === value))" :key="id" :value="id">Недоступный товар · {{ id }}</option></select></label><div v-if="draft.home.bestsellers.mode === 'manual'" class="sca-actions"><small class="sca-help">Выбрано {{ draft.home.bestsellers.productIds.length }} из 8 · загружено {{ products.length }} из {{ productTotal }} товаров.</small><button v-if="productPage * 100 < productTotal" class="sca-button sca-button--white" type="button" :disabled="referencesLoading || productMoreLoading || busy" @click="loadMoreProducts">{{ productMoreLoading ? 'Загружаем…' : 'Загрузить ещё товары' }}</button></div><ol v-if="draft.home.bestsellers.mode === 'manual'" class="sca-order"><li v-for="(id, index) in draft.home.bestsellers.productIds" :key="id" class="sca-order-row workspace-product-sort-row" @dragover.prevent @drop="drop($event, 'products', index)"><button class="sca-handle" type="button" :draggable="!editingDisabled" :aria-label="'Перетащить товар подборки ' + (index + 1)" @dragstart="beginDrag($event, 'products', index)" @dragend="drag = null" @keydown.alt.up.prevent="moveProduct(index, -1)" @keydown.alt.down.prevent="moveProduct(index, 1)"><GripVertical :size="20" /></button><strong>{{ products.find(product => product.id === id)?.nameRu || 'Товар вне загруженных страниц' }}</strong><div class="sca-actions"><button class="sca-close" type="button" :aria-label="'Убрать товар подборки ' + (index + 1)" @click="draft.home.bestsellers.productIds.splice(index, 1)"><X :size="20" /></button></div></li></ol></template>
            <template v-if="key === 'club'"><label class="sca-field"><span>Демонстрационный баланс</span><input v-model.number="draft.home.club.previewBalance" type="number" min="0" max="1000000" step="1" /><small>Не изменяет реальные бонусные счета.</small></label><header class="sca-group-head"><h4>Преимущества вступления</h4><button class="sca-button sca-button--white" type="button" :disabled="draft.home.club.benefits.length >= 6" @click="addClubBenefit"><Plus :size="18" /> Добавить</button></header><div v-for="(item, index) in draft.home.club.benefits" :key="item.id" class="sca-inline-item"><label class="sca-field"><span>Иконка</span><select v-model="item.icon"><option value="award">Бонусы</option><option value="gift">Подарок</option><option value="shield">Защита</option></select></label><label class="sca-field"><span>Текст преимущества</span><input v-model="item.text" maxlength="250" /></label><button class="sca-close" type="button" :aria-label="'Удалить преимущество клуба ' + (index + 1)" @click="remove(draft.home.club.benefits, index)"><X :size="20" /></button></div></template>
            <section v-if="key === 'business'" class="sca-panel" aria-label="Редактирование мини-макета B2B"><h3>Мини-макет кабинета</h3><p class="sca-help">Демонстрация на главной: вкладки салона и закупок. Не меняет реальные услуги, цены или заказы. Время записей в иллюстрации фиксированное.</p><div class="sca-grid"><label v-for="field in businessPreviewFields.filter(item => item.key !== 'productImageUrl')" :key="field.key" class="sca-field"><span>{{ field.label }}</span><input v-model="businessPreviewData[field.key]" :maxlength="field.max" /></label><label class="sca-field"><span>Цена товара в примере, ₽</span><input v-model.number="businessPreviewData.productPrice" type="number" min="0" max="1000000" step="1" /></label></div><AdminMediaPicker v-model="businessPreviewData.productImageUrl" :api-base="apiBase" :token="token" :disabled="editingDisabled" label="Фото демонстрационного товара" /></section>
            <AdminMediaPicker v-if="key === 'story'" v-model="draft.home.story.portraitUrl" :api-base="apiBase" :token="token" :disabled="editingDisabled" label="Портрет без фона" />
            <AdminMediaPicker v-if="key === 'bloggers'" v-model="draft.home.bloggers.visualImageUrl" :api-base="apiBase" :token="token" :disabled="editingDisabled" label="Изображение на экране iPhone" />
            <label v-if="key === 'bloggers'">Видео на экране iPhone (MP4)<input v-model="draft.home.bloggers.visualVideoUrl" :disabled="editingDisabled" placeholder="/storefront/video.mp4" /><small>Локальный путь или HTTPS-ссылка. Оставьте пустым, чтобы показывать только изображение.</small></label>
            <template v-if="key === 'business' || key === 'referral' || key === 'bloggers'"><label class="sca-field"><span>Оформление блока</span><select v-model="draft.home[key].theme"><option value="dark">Тёмный — графит</option><option value="rose">Светлый — стекло</option><option value="light">Белый</option></select></label><label v-if="key !== 'bloggers'" class="sca-field"><span>Строки иллюстрации</span><textarea :value="draft.home[key].visualLines.join('\n')" maxlength="604" rows="4" @input="draft.home[key].visualLines = ($event.target as HTMLTextAreaElement).value.split('\n')" /><small>До четырёх строк, по 150 символов. Каждая новая строка — отдельный пункт.</small></label><a class="sca-button sca-button--white" href="/admin-workspace/pages">Редактировать страницу перехода</a><p class="sca-help">Тексты, адрес кнопки, иллюстрация и тема сохраняются вместе с остальным контентом. Блок можно скрыть или переместить в структуре слева.</p></template>
            <template v-if="key === 'benefits'"><header class="sca-group-head"><p class="sca-help">До восьми преимуществ.</p><button class="sca-button sca-button--white" type="button" :disabled="draft.home.benefits.length >= 8" @click="addBenefit"><Plus :size="18" /> Добавить</button></header><article v-for="(item, index) in draft.home.benefits" :key="item.id" class="sca-subpanel"><header class="sca-group-head"><h4>Преимущество {{ index + 1 }}</h4><button class="sca-close" type="button" :aria-label="'Удалить преимущество ' + (index + 1)" @click="remove(draft.home.benefits, index)"><X :size="20" /></button></header><div class="sca-grid"><label class="sca-field"><span>Иконка</span><select v-model="item.icon"><option value="package">Посылка</option><option value="shield">Защита</option><option value="award">Бонусы</option><option value="sparkles">Экспертиза</option></select></label><label class="sca-field"><span>Надзаголовок</span><input v-model="item.eyebrow" maxlength="100" /></label><label class="sca-field sca-wide"><span>Заголовок</span><input v-model="item.title" maxlength="200" /></label><label class="sca-field sca-wide"><span>Описание</span><textarea v-model="item.body" maxlength="1000" rows="3" /></label></div></article></template>
          </section>
          </div></div>
        </template>
        <template v-else-if="tab === 'header'">
          <section class="sca-panel"><h3>Бренд и шапка</h3><label class="sca-field"><span>Название бренда</span><input v-model="draft.brand.name" maxlength="80" /></label><AdminMediaPicker v-model="draft.brand.logoUrl" :api-base="apiBase" :token="token" :disabled="editingDisabled" label="Логотип" /><label class="sca-field"><span>Описание бренда в футере</span><textarea v-model="draft.brand.footerText" maxlength="500" rows="3" /></label><p class="sca-help">Текст верхней строки и пункты меню шапки пока редактируются в разделе «Витрина».</p></section>
          <section class="sca-panel"><header class="sca-group-head"><h3>Колонки футера</h3><button class="sca-button sca-button--white" type="button" :disabled="draft.footer.columns.length >= 4" @click="addColumn"><Plus :size="18" /> Добавить колонку</button></header><p class="sca-help">Колонки и ссылки перемещаются за ручку слева. Ссылки нельзя перетаскивать между колонками.</p>
            <article v-for="(column, columnIndex) in draft.footer.columns" :key="column.id" class="sca-subpanel" @dragover.prevent @drop="drop($event, 'columns', columnIndex)">
              <header class="sca-group-head"><button class="sca-handle" type="button" :draggable="!editingDisabled" :aria-label="'Перетащить колонку ' + (columnIndex + 1)" @dragstart.stop="beginDrag($event, 'columns', columnIndex)" @dragend="drag = null"><GripVertical :size="20" /></button><label class="sca-field sca-grow"><span>Заголовок колонки</span><input v-model="column.title" maxlength="100" /></label><div class="sca-actions"><button class="sca-close" type="button" :aria-label="'Удалить колонку ' + (columnIndex + 1)" @click="remove(draft.footer.columns, columnIndex)"><X :size="20" /></button></div></header>
              <div v-for="(item, itemIndex) in column.items" :key="item.id" class="sca-link-editor" @dragover.prevent.stop @drop="drop($event, 'items:' + column.id, itemIndex)"><div class="sca-group-head"><button class="sca-handle" type="button" :draggable="!editingDisabled" :aria-label="'Перетащить ссылку ' + (itemIndex + 1)" @dragstart.stop="beginDrag($event, 'items:' + column.id, itemIndex)" @dragend="drag = null"><GripVertical :size="20" /></button><label class="sca-field sca-grow"><span>Название ссылки</span><input v-model="item.label" maxlength="80" /></label><div class="sca-actions"><button class="sca-close" type="button" :aria-label="'Удалить ссылку ' + (itemIndex + 1)" @click="remove(column.items, itemIndex)"><X :size="20" /></button></div></div>
                <div class="sca-grid"><label class="sca-field"><span>Действие</span><select :value="item.action" @change="setAction(item, ($event.target as HTMLSelectElement).value as FooterItem['action'])"><option value="none">Перейти по ссылке</option><option value="account">Открыть аккаунт</option><option value="favorites">Открыть избранное</option><option value="cart">Открыть корзину</option></select></label><label v-if="item.action === 'none'" class="sca-field"><span>Страница сайта</span><select :value="pageChoice(item)" :disabled="referencesLoading" @change="setPage(item, ($event.target as HTMLSelectElement).value)"><option value="">Другой адрес / выбрать страницу</option><option v-for="page in pages" :key="page.slug" :value="'/' + page.slug">{{ page.title }}{{ page.isActive ? '' : ' — скрыта' }}</option></select></label></div>
                <template v-if="item.action === 'none'"><small class="sca-help">{{ item.url || 'Адрес не задан' }}</small><details class="sca-custom"><summary>Указать другой адрес</summary><label class="sca-field"><span>Внутренний путь или HTTPS URL</span><input v-model="item.url" maxlength="500" placeholder="/catalog" /></label></details><label class="sca-checkbox"><input v-model="item.newTab" type="checkbox" /> В новой вкладке</label></template>
              </div><button class="sca-button sca-button--white" type="button" :disabled="column.items.length >= 12" @click="addFooterItem(column)"><Plus :size="18" /> Добавить ссылку</button>
            </article>
          </section>
          <section class="sca-panel"><header class="sca-group-head"><h3>Юридические ссылки</h3><button class="sca-button sca-button--white" type="button" :disabled="draft.footer.legalLinks.length >= 8" @click="addLegal"><Plus :size="18" /> Добавить ссылку</button></header><article v-for="(item, index) in draft.footer.legalLinks" :key="item.id" class="sca-link-editor" @dragover.prevent @drop="drop($event, 'legal', index)"><header class="sca-group-head"><button class="sca-handle" type="button" :draggable="!editingDisabled" :aria-label="'Перетащить юридическую ссылку ' + (index + 1)" @dragstart="beginDrag($event, 'legal', index)" @dragend="drag = null"><GripVertical :size="20" /></button><label class="sca-field sca-grow"><span>Название</span><input v-model="item.label" maxlength="80" /></label><div class="sca-actions"><button class="sca-close" type="button" :aria-label="'Удалить юридическую ссылку ' + (index + 1)" @click="remove(draft.footer.legalLinks, index)"><X :size="20" /></button></div></header><label class="sca-field"><span>Страница документа</span><select :value="pageChoice(item)" @change="setPage(item, ($event.target as HTMLSelectElement).value)"><option value="">Другой адрес / выбрать страницу</option><option v-for="page in pages" :key="page.slug" :value="'/' + page.slug">{{ page.title }}{{ page.isActive ? '' : ' — скрыта' }}</option></select></label><small class="sca-help">{{ item.url || 'Адрес не задан' }}</small><details class="sca-custom"><summary>Указать другой адрес</summary><label class="sca-field"><span>Внутренний путь или HTTPS URL</span><input v-model="item.url" maxlength="500" /></label></details><label class="sca-checkbox"><input v-model="item.newTab" type="checkbox" /> В новой вкладке</label></article></section>
        </template>
        <section v-else-if="tab === 'contacts'" class="sca-panel"><h3>Контакты магазина</h3><p class="sca-help">Единые контакты для общих блоков сайта. Текст страницы «Контакты» редактируется отдельно в «Страницах».</p><div class="sca-grid"><label class="sca-field"><span>Телефон</span><input v-model="draft.contacts.phone" type="tel" maxlength="30" placeholder="+7…" /></label><label class="sca-field"><span>Email</span><input v-model="draft.contacts.email" type="email" maxlength="254" /></label><label class="sca-field"><span>Страна</span><input v-model="draft.contacts.country" maxlength="80" /></label></div></section>
      </fieldset>
      <p v-if="referenceError" class="sca-notice" role="alert">{{ referenceError }} <button class="sca-button sca-button--white" type="button" :disabled="referencesLoading || saving" @click="loadReferences">Загрузить страницы и товары</button></p>
      <footer class="sca-panel sca-savebar"><span>{{ conflict ? 'Нужна актуальная версия' : dirty ? 'Есть несохранённые изменения' : 'Версия ' + revision + ' · Изменения сохранены' }}</span><div class="sca-actions"><button class="sca-button sca-button--white" type="button" :disabled="!dirty || busy" @click="cancel">Отменить изменения</button><button class="sca-button" type="submit" :disabled="!dirty || busy || conflict || forbidden"><Save :size="18" /> {{ saving ? 'Сохраняем…' : 'Сохранить контент' }}</button></div></footer>
    </form>
    <section v-if="tab === 'history'" class="sca-panel"><header class="sca-group-head"><h3>История контента</h3><button class="sca-button sca-button--white" type="button" :disabled="historyLoading || busy" @click="loadHistory">Обновить историю</button></header><p class="sca-help">Восстановление создаёт новую версию контента. Заказы, платежи, бонусы и другие финансовые данные не откатываются.</p><p v-if="historyError" class="sca-notice" role="alert">{{ historyError }}</p><p v-if="historyLoading" role="status">Загружаем историю…</p><p v-if="historyLoaded && historyTotal > history.length" class="sca-help">Показаны последние {{ history.length }} версий из {{ historyTotal }}.</p><ol v-if="!historyLoading" class="sca-history"><li v-for="entry in history" :key="entry.revision"><div><strong>Версия {{ entry.revision }}</strong><small>{{ Number.isNaN(new Date(entry.createdAt).getTime()) ? 'Дата не указана' : new Date(entry.createdAt).toLocaleString('ru-RU') }}</small></div><span v-if="entry.revision === revision">Текущая версия</span><button v-else class="sca-button sca-button--white" type="button" :disabled="!loaded || busy || conflict || forbidden" @click="restore(entry.revision)">Восстановить</button></li></ol><p v-if="historyLoaded && !history.length" class="sca-help">Сохранённых версий пока нет.</p></section>
  </section>
</template>
