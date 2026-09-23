<script setup lang="ts">
import { Award, Check, Coins, Eye, Gift, GripVertical, ImagePlus, Pencil, Plus, RefreshCw, Save, Search, Trash2, X } from "@lucide/vue";
import { inlineProductPrices } from '~/shared/inline-product-prices';
import { storefrontVariantPrice } from '~/shared/product-merchandising';
import { storefrontProductImage } from '~/composables/useStorefrontCatalog';
import { WEB_ORDER_OPERATOR_ROLES, webOrderNextStatuses } from '~/shared/web-order-actions';
const config = useRuntimeConfig();
const route = useRoute();
const props = defineProps<{ pageSection?: string }>();
const { token, user } = useWorkspaceSession();
const productEditor = useState<any | null>("admin-product-editor", () => null);
const selected = useState<any | null>("admin-order-selected", () => null);
const notice = ref("");
const search = ref(typeof route.query.q === 'string' ? route.query.q : '');
const statusFilter = ref(typeof route.query.status === 'string' && ['NEW','CONFIRMED','PAYMENT_WAITING','PAID','ASSEMBLING','SHIPPED','DELIVERED','CANCELLED','REFUNDED'].includes(route.query.status) ? route.query.status : '');
const catalogSettingsEditor = ref<any>(null);
const dashboardDays = ref(30);
function refreshSection() { return ['categories','product-badges','gift-cards'].includes(active.value) ? catalogSettingsEditor.value?.load() : load(); }
const productCategory=ref(''),productVisibility=ref(''),productAvailability=ref(''),productSort=ref('updated'),selectedProductIds=ref<string[]>([]),bulkSaving=ref(false);
const productAccess=useWorkspaceAccess();
const canManageWebOrders = computed(() => productAccess.ready.value && WEB_ORDER_OPERATOR_ROLES.includes(user.value?.role || '') && productAccess.can('web_orders.write'));
const savingOrder = ref(false);
const canEditCatalog=computed(()=>['ADMIN','CONTENT_MANAGER','MANAGER_SALES','SUPERVISOR'].includes(user.value?.role||'')&&productAccess.can('catalog.write'));
const allProductsSelected=computed(()=>filteredProducts.value.length>0&&filteredProducts.value.every(p=>selectedProductIds.value.includes(p.id)));
const { openContextMenu, copyText } = useContextMenu();
const siteSections = ["loyalty-settings", "loyalty-members", "dashboard", "appearance", "site-content", "catalog-menu", "pages", "orders", "products", "categories", "product-badges", "customers", "loyalty", "promotions", "gift-cards"];
const initialSection = String(props.pageSection || route.query.section || "dashboard");
const active = ref(siteSections.includes(initialSection) ? initialSection : "dashboard");
watch(
  () => props.pageSection || route.query.section,
  (v) => {
    active.value = typeof v === "string" && siteSections.includes(v) ? v : "dashboard";
  },
  { immediate: true },
);
const dashboard = ref<any>(null);
const products = ref<any[]>([]);
const failedProductImages = ref<Record<string, string>>({});
function productPreview(product: any) {
  const url = storefrontProductImage(product);
  return url && failedProductImages.value[product.id] !== url ? url : null;
}
function productPreviewFailed(product: any) {
  failedProductImages.value[product.id] = storefrontProductImage(product) || '';
}
const orders = ref<any[]>([]);
const customers = ref<any[]>([]);
const categories = ref<any[]>([]);
const storefrontSettings = reactive({ announcementText: "SARKISIAN BRAND – это официальный интернет-магазин скоростного мастера-блогера Светланы Саркисян" });
const storefrontBanners = ref<any[]>([]);
const storefrontSocialLinks = ref<any[]>([]);
const storefrontMenuItems = ref<any[]>([]);
const appearanceTabs = [{ id: 'banners', label: 'Баннеры' }, { id: 'menu', label: 'Меню сайта' }, { id: 'social', label: 'Социальные сети' }, { id: 'announcement', label: 'Верхняя строка' }];
const appearanceTab = ref('banners');
watch(() => route.query.tab, tab => { if (typeof tab === 'string' && appearanceTabs.some(item => item.id === tab)) appearanceTab.value = tab; }, { immediate: true });
const appearanceRevision = ref('');
const appearanceBaseline = ref('');
const bannerEditor = ref<any | null>(null);
const bannerEditorBaseline = ref('');
const bannerEditorError = ref('');
const bannerEditorDirty = computed(() => Boolean(bannerEditor.value && JSON.stringify(bannerEditor.value) !== bannerEditorBaseline.value));
const { panel: bannerPanel, keyboard: bannerKeyboard } = useCatalogDialog(computed(() => Boolean(bannerEditor.value)), closeBannerEditor);
const loyaltyBaseline = ref('');
function appearanceSnapshot() { return JSON.stringify({ settings: storefrontSettings, banners: storefrontBanners.value, menu: storefrontMenuItems.value, social: storefrontSocialLinks.value }); }
const appearanceDirty = computed(() => bannerEditorDirty.value || Boolean(appearanceBaseline.value && appearanceSnapshot() !== appearanceBaseline.value));
const loyaltyDirty = computed(() => Boolean(loyaltyBaseline.value && JSON.stringify(loyaltySettings) !== loyaltyBaseline.value));
onBeforeRouteLeave(() => {
  if(savingPrice.value) return false;
  if(priceEditing.value && !confirm('Есть несохранённые цены. Перейти без сохранения?')) return false;
  if(savingAppearance.value){notice.value='Дождитесь завершения сохранения.';return false;}
  if(bulkSaving.value){notice.value='Дождитесь завершения обновления товаров.';return false;}
  if ((active.value === 'appearance' && appearanceDirty.value) || (['loyalty', 'loyalty-settings'].includes(active.value) && loyaltyDirty.value)) return confirm('Есть несохранённые изменения. Перейти без сохранения?');
});
onBeforeRouteUpdate((to, from) => {
  if(savingAppearance.value)return false;
  if (to.query.section !== from.query.section && ((active.value === 'appearance' && appearanceDirty.value) || (['loyalty', 'loyalty-settings'].includes(active.value) && loyaltyDirty.value))) return confirm('Есть несохранённые изменения. Перейти без сохранения?');
});
let appearanceDragged: { collection: 'banners' | 'menu' | 'social'; id: string } | undefined;
function appearanceItems(collection: 'banners' | 'menu' | 'social') { return collection === 'banners' ? storefrontBanners.value : collection === 'menu' ? storefrontMenuItems.value : storefrontSocialLinks.value; }
function dragAppearance(event: DragEvent, collection: 'banners' | 'menu' | 'social', item: any) {
  if (savingAppearance.value) { event.preventDefault(); return; }
  appearanceDragged = { collection, id: item.id }; event.dataTransfer?.setData('text/plain', item.id);
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
}
function moveAppearance(collection: 'banners' | 'menu' | 'social', id: string, target: number) {
  if (savingAppearance.value) return;
  const items = appearanceItems(collection), index = items.findIndex(item => item.id === id);
  if (index < 0 || target < 0 || target >= items.length || index === target) return;
  items.splice(target, 0, items.splice(index, 1)[0]); items.forEach((item, order) => item.sortOrder = order);
}
function dropAppearance(collection: 'banners' | 'menu' | 'social', targetId: string) {
  if (appearanceDragged?.collection !== collection) return;
  moveAppearance(collection, appearanceDragged.id, appearanceItems(collection).findIndex(item => item.id === targetId)); appearanceDragged = undefined;
}
const loyaltyDashboard = ref<any>(null);
const loyaltySearch = ref("");
const loyaltyAccountEditor = ref<any | null>(null);
const loyaltyAdjustment = reactive({ type: "ACCRUAL", amount: 100, reason: "" });
const loyaltySettings = reactive({
  programName: "SARKISIAN CLUB", isEnabled: true, earnPercent: 1, maxWriteOffPercent: 30,
  signupBonus: 0, birthdayBonus: 0, bonusValidityDays: 365, proThreshold: 3000,
  premiumThreshold: 10000, proMultiplierPercent: 120, premiumMultiplierPercent: 150,
});
const savingLoyalty = ref(false);
const savingAppearance = ref(false);
const uploadingMedia = ref(false);
const busy = ref(false);
const loadError = ref("");
const pageLoaded = ref(false);
const listPage = ref(1);
const listTotal = ref(0);
const listLimit = 24;
let loadGeneration = 0;
let loadController: AbortController | undefined;
const productSaved = useState<any>('admin-product-saved', () => null);
const orderSaved = useState<any>('admin-order-saved', () => null);
watch(orderSaved, saved => { if (saved?.id && active.value === 'orders') load(); });
watch(productSaved, saved => {
  if (!saved?.id || !saved.product) return;
  const index = products.value.findIndex(product => product.id === saved.id);
  if (index >= 0) products.value[index] = saved.product;
});
const savingProduct = ref(false);
const priceEditor = ref<{ id: string; variantId: string; field: 'price' | 'salePrice'; price: string; salePrice: string; error: string } | null>(null);
const savingPrice = ref(false);
const priceEditing = computed(() => Boolean(priceEditor.value));
function editPrices(product: any, field: 'price' | 'salePrice') {
  if (!canEditCatalog.value || savingPrice.value || product.productType === 'GIFT_CARD' || !product.variants?.[0]) return;
  if (priceEditor.value && priceEditor.value.id !== product.id) return;
  if (!priceEditor.value) priceEditor.value = { id: product.id, field, variantId: product.variants[0].id, price: String(product.variants[0].price ?? product.basePrice ?? 0), salePrice: product.variants[0].salePrice == null ? '' : String(product.variants[0].salePrice), error: '' };
  nextTick(() => document.querySelector<HTMLInputElement>(`[data-product-id="${product.id}"] input[data-price-field="${field}"]`)?.focus());
}
function cancelPrices() { if (!savingPrice.value) priceEditor.value = null; }
async function savePrices() {
  const draft = priceEditor.value;
  if (!draft || savingPrice.value || !canEditCatalog.value) return;
  draft.error = '';
  let payload;
  try { payload = inlineProductPrices(draft.price, draft.salePrice); }
  catch (error: any) { draft.error = error.message; return; }
  savingPrice.value = true;
  const actorToken = token.value;
  try {
    const updated = await $fetch<any>(`/admin/products/${draft.id}`, { baseURL: config.public.apiBase, method: 'PATCH', headers: { Authorization: `Bearer ${actorToken}` }, body: { ...payload, variantId: draft.variantId } });
    if (token.value !== actorToken) return;
    const index = products.value.findIndex(product => product.id === draft.id);
    if (index >= 0) products.value[index] = updated;
    priceEditor.value = null;
    notice.value = 'Цены сохранены';
  } catch (error: any) {
    if (token.value === actorToken && priceEditor.value) priceEditor.value.error = Array.isArray(error?.data?.message) ? error.data.message.join('. ') : error?.data?.message || 'Не удалось сохранить цены. Попробуйте ещё раз.';
  } finally { savingPrice.value = false; }
}
watch(token, () => { priceEditor.value = null; });
const canConfigureLoyalty = computed(() => ['ADMIN', 'SUPERVISOR'].includes(user.value?.role || '') && productAccess.can('loyalty.write'));
const canAdjustLoyalty = computed(() => ['ADMIN', 'SUPERVISOR', 'MANAGER_SALES'].includes(user.value?.role || '') && productAccess.can('loyalty.write'));
const menu = [
  { id: "dashboard", label: "Обзор магазина" },
  { id: "appearance", label: "Витрина" },
  { id: "site-content", label: "Контент сайта" },
  { id: "catalog-menu", label: "Меню каталога" },
  { id: "pages", label: "Страницы" },
  { id: "orders", label: "Заказы" },
  { id: "products", label: "Товары" },
  { id: "categories", label: "Категории" },
  { id: "product-badges", label: "Бейджи товаров" },
  { id: "customers", label: "Клиенты" },
  { id: "loyalty-settings", label: "Настройки программы" },
  { id: "loyalty-members", label: "Участники" },
  { id: "promotions", label: "Промокоды" },
  { id: "gift-cards", label: "Подарочные карты" },
];
const orderStatuses = [
  { id: "NEW", label: "Новый" },
  { id: "CONFIRMED", label: "Подтверждён" },
  { id: "PAYMENT_WAITING", label: "Ожидает оплаты" },
  { id: "PAID", label: "Оплачен" },
  { id: "ASSEMBLING", label: "Сборка" },
  { id: "SHIPPED", label: "Отправлен" },
  { id: "DELIVERED", label: "Доставлен" },
  { id: "CANCELLED", label: "Отменён" },
  { id: "REFUNDED", label: "Возврат" },
];
function routeOrderStatus() { return typeof route.query.status === 'string' && orderStatuses.some(item => item.id === route.query.status) ? route.query.status : ''; }
watch(() => route.query.status, () => { if (active.value === 'orders') statusFilter.value = routeOrderStatus(); }, { immediate: true });
watch(() => route.query.q, q => { if (active.value === 'orders') search.value = typeof q === 'string' ? q : ''; }, { immediate: true });
const filteredProducts = computed(() =>
  products.value.filter(
    (p) =>
      !search.value ||
      `${p.nameRu} ${p.sku}`.toLowerCase().includes(search.value.toLowerCase()),
  ),
);
const filteredOrders = computed(() =>
  orders.value.filter(
    (o) =>
      (!statusFilter.value || o.status === statusFilter.value) &&
      (!search.value ||
        `${o.orderNumber} ${o.user?.email || ""}`
          .toLowerCase()
          .includes(search.value.toLowerCase())),
  ),
);
const filteredLoyaltyAccounts = computed(() => {
  const query = loyaltySearch.value.trim().toLowerCase();
  const accounts = loyaltyDashboard.value?.accounts || [];
  if (!query) return accounts;
  return accounts.filter((account: any) => `${account.firstName || ""} ${account.lastName || ""} ${account.email || ""} ${account.phone || ""}`.toLowerCase().includes(query));
});
const loyaltyLevelLabels: Record<string, string> = {
  START: "Старт",
  PRO: "Профессионал",
  PREMIUM: "Премиум",
};
const loyaltyLevelLabel = (level: string) => loyaltyLevelLabels[level] || level;
const labelStatus = (v: string) =>
  orderStatuses.find((s) => s.id === v)?.label || v;
const oneCQueued = computed(
  () =>
    orders.value.filter((order) => !order.isSynced1C && !order.oneCSyncError)
      .length,
);
const oneCErrors = computed(
  () => orders.value.filter((order) => order.oneCSyncError).length,
);
function oneCLabel(order: any) {
  if (order.oneCSyncError) return "Ошибка передачи";
  if (order.packedAt) return "Упакован";
  if (order.pickedAt) return "Товар отобран";
  if (order.pickingStartedAt) return "Сборка на ТСД";
  if (order.isSynced1C) return "Передан в 1С";
  return "В очереди";
}
async function load() {
  if(savingAppearance.value)return;
  if (active.value === 'appearance' && pageLoaded.value && appearanceDirty.value && !confirm('Обновить список и потерять несохранённые изменения?')) return;
  bannerEditor.value = null;
  loadController?.abort();
  const generation = ++loadGeneration;
  const section = active.value;
  if (!token.value) return;
  if (['catalog-menu', 'pages', 'promotions', 'gift-cards', 'site-content', 'categories', 'product-badges'].includes(section)) {
    pageLoaded.value = true; busy.value = false; loadError.value = ''; return;
  }
  const controller = loadController = new AbortController();
  busy.value = true;
  loadError.value = "";
  const headers = { Authorization: `Bearer ${token.value}` };
  const options = { baseURL: config.public.apiBase, headers, signal: controller.signal, timeout: 20000 };
  try {
    if (section === 'dashboard') {
      const result = await $fetch<any>('/admin/dashboard', { ...options, query: { days: dashboardDays.value } });
      if (generation !== loadGeneration) return;
      dashboard.value = result;
    } else if (section === 'products' || section === 'orders') {
      const result = await $fetch<any>(`/admin/${section}/list`, { ...options, query: { q: search.value.trim() || undefined, page: listPage.value, limit: listLimit, ...(section==='products'?{categoryId:productCategory.value||undefined,visibility:productVisibility.value||undefined,availability:productAvailability.value||undefined,sort:productSort.value}:{}), ...(section === 'orders' && statusFilter.value ? { status: statusFilter.value } : {}) } });
      if(section==='products'&&!categories.value.length){
        try{const categoryData=await $fetch<any>('/admin/catalog/categories',options);if(generation===loadGeneration)categories.value=categoryData.items||[];}
        catch(error){if(!controller.signal.aborted)notice.value='Не удалось загрузить фильтр категорий. Остальные фильтры доступны.';}
      }
      if (generation !== loadGeneration) return;
      if (!Array.isArray(result?.items) || !Number.isFinite(result.total)) throw new Error('Некорректный ответ списка');
      if (section === 'products') products.value = result.items; else { orders.value = result.items; if (selected.value) selected.value = result.items.find((order: any) => order.id === selected.value.id) || selected.value; }
      listTotal.value = result.total;
    } else if (section === 'customers') {
      const result = await $fetch<any[]>('/crm/customers', options);
      if (generation !== loadGeneration) return;
      customers.value = result;
    } else if (section === 'appearance') {
      const storefront = await $fetch<any>('/admin/storefront', options);
      if (generation !== loadGeneration) return;
      storefrontSettings.announcementText = storefront.settings?.announcementText ?? storefrontSettings.announcementText;
      appearanceRevision.value = storefront.revision || '';
      storefrontBanners.value = (storefront.banners || []).map((banner: any) => ({ ...banner, startsAt: bannerLocalDate(banner.startsAt), endsAt: bannerLocalDate(banner.endsAt) }));
      storefrontSocialLinks.value = storefront.socialLinks || [];
      storefrontMenuItems.value = storefront.menuItems || [];
      categories.value = storefront.categories || [];
      appearanceBaseline.value = appearanceSnapshot();
    } else if (['loyalty', 'loyalty-settings', 'loyalty-members'].includes(section)) {
      const loyalty = await $fetch<any>('/loyalty/admin/overview', options);
      if (generation !== loadGeneration) return;
      loyaltyDashboard.value = loyalty;
      Object.assign(loyaltySettings, loyalty.settings);
      loyaltyBaseline.value = JSON.stringify(loyaltySettings);
    }
    pageLoaded.value = true;
  } catch (error: any) {
    if (generation === loadGeneration && !controller.signal.aborted) loadError.value = error?.statusCode === 403 || error?.response?.status === 403 ? 'Нет доступа к этому разделу. Выберите доступный пункт меню.' : error?.data?.message || error?.message || "Не удалось загрузить раздел. Попробуйте ещё раз.";
  } finally {
    if (generation === loadGeneration) busy.value = false;
  }
}

async function saveLoyaltySettings() {
  if (savingLoyalty.value || !canConfigureLoyalty.value) return;
  savingLoyalty.value = true;
  try {
    const payload = {
      programName: loyaltySettings.programName,
      isEnabled: loyaltySettings.isEnabled,
      earnPercent: loyaltySettings.earnPercent,
      maxWriteOffPercent: loyaltySettings.maxWriteOffPercent,
      signupBonus: loyaltySettings.signupBonus,
      birthdayBonus: loyaltySettings.birthdayBonus,
      bonusValidityDays: loyaltySettings.bonusValidityDays,
      proThreshold: loyaltySettings.proThreshold,
      premiumThreshold: loyaltySettings.premiumThreshold,
      proMultiplierPercent: loyaltySettings.proMultiplierPercent,
      premiumMultiplierPercent: loyaltySettings.premiumMultiplierPercent,
    };
    const saved = await $fetch<any>("/loyalty/admin/settings", {
      baseURL: config.public.apiBase, method: "PATCH",
      headers: { Authorization: `Bearer ${token.value}` }, body: payload,
    });
    Object.assign(loyaltySettings, saved);
    loyaltyBaseline.value = JSON.stringify(loyaltySettings);
    if (loyaltyDashboard.value) loyaltyDashboard.value.settings = saved;
    notice.value = "Настройки бонусной программы сохранены";
    setTimeout(() => (notice.value = ""), 2200);
  } catch (error: any) { notice.value = error?.data?.message || 'Не удалось сохранить настройки бонусной программы'; }
  finally { savingLoyalty.value = false; }
}

function openLoyaltyAccount(account: any) {
  loyaltyAccountEditor.value = { ...account, entries: [...(account.entries || [])] };
  loyaltyAdjustment.type = "ACCRUAL";
  loyaltyAdjustment.amount = 100;
  loyaltyAdjustment.reason = "";
}

async function applyLoyaltyAdjustment() {
  if (!canAdjustLoyalty.value || !loyaltyAccountEditor.value || !loyaltyAdjustment.reason.trim() || loyaltyAdjustment.amount < 1) {
    notice.value = "Укажите сумму и причину операции";
    return;
  }
  savingLoyalty.value = true;
  try {
    await $fetch(`/loyalty/admin/users/${loyaltyAccountEditor.value.userId}/${loyaltyAdjustment.type === "ACCRUAL" ? "accrual" : "write-off"}`, {
      baseURL: config.public.apiBase, method: "POST",
      headers: { Authorization: `Bearer ${token.value}` },
      body: { amount: Number(loyaltyAdjustment.amount), reason: loyaltyAdjustment.reason.trim() },
    });
    notice.value = loyaltyAdjustment.type === "ACCRUAL" ? "Бонусы начислены" : "Бонусы списаны";
    loyaltyAccountEditor.value = null;
    await load();
    setTimeout(() => (notice.value = ""), 2200);
  } finally { savingLoyalty.value = false; }
}

function loyaltyMenu(event: MouseEvent, account: any) {
  openContextMenu(event, [account.firstName, account.lastName].filter(Boolean).join(" ") || "Клиент", [
    { label: "Открыть бонусный счёт", icon: "open", action: () => openLoyaltyAccount(account) },
    { label: "Копировать email", icon: "copy", action: () => copyText(account.email, "Email скопирован") },
  ], `${account.balance} бонусов`);
}
function appearanceBannerPayload(banner: any, sortOrder: number) {
  if (!banner.imageUrl?.trim()) throw new Error('Выберите изображение для каждого баннера.');
  const startsAt = banner.startsAt ? new Date(banner.startsAt).toISOString() : undefined;
  const endsAt = banner.endsAt ? new Date(banner.endsAt).toISOString() : undefined;
  if (startsAt && endsAt && startsAt >= endsAt) throw new Error('Окончание показа баннера должно быть позже начала.');
  return {
    id: banner._new ? undefined : banner.id,
    title: banner.title || '', subtitle: banner.subtitle || '',
    buttonLabel: banner.buttonLabel || 'Перейти в каталог', linkUrl: banner.linkUrl || '/catalog',
    imageUrl: banner.imageUrl.trim(), mobileImageUrl: banner.mobileImageUrl || undefined,
    isActive: Boolean(banner.isActive), sortOrder, startsAt, endsAt,
  };
}
async function saveStorefrontAppearance() {
  if (savingAppearance.value || uploadingMedia.value || !appearanceDirty.value) return;
  let payload: any;
  try {
    payload = {
      revision: appearanceRevision.value, settings: { ...storefrontSettings },
      banners: storefrontBanners.value.map(appearanceBannerPayload),
      menuItems: storefrontMenuItems.value.map((item, sortOrder) => {
        if (!item.label?.trim() || !item.url?.trim()) throw new Error('Заполните название и ссылку каждого пункта меню.');
        return { id: item._new ? undefined : item.id, label: item.label.trim(), url: item.url.trim(), newTab: Boolean(item.newTab), isActive: Boolean(item.isActive), sortOrder };
      }),
      socialLinks: storefrontSocialLinks.value.map((item, sortOrder) => {
        if (!item.name?.trim() || !item.url?.trim()) throw new Error('Заполните название и ссылку каждой социальной сети.');
        return { id: item._new ? undefined : item.id, name: item.name.trim(), iconKey: item.iconKey, url: item.url.trim(), isActive: Boolean(item.isActive), sortOrder };
      }),
    };
  } catch (error: any) { notice.value = error.message || 'Проверьте обязательные поля.'; return; }
  const actorToken = token.value;
  savingAppearance.value = true;
  try {
    const saved = await $fetch<any>('/admin/storefront/appearance', {
      baseURL: config.public.apiBase, method: 'PATCH',
      headers: { Authorization: `Bearer ${actorToken}` }, body: payload,
    });
    if (token.value !== actorToken) return;
    if (!saved?.revision || !Array.isArray(saved.banners) || !Array.isArray(saved.menuItems) || !Array.isArray(saved.socialLinks)) throw new Error('Некорректный ответ сохранения.');
    Object.assign(storefrontSettings, { announcementText: saved.settings.announcementText });
    storefrontBanners.value = saved.banners.map((row: any) => ({ ...row, startsAt: bannerLocalDate(row.startsAt), endsAt: bannerLocalDate(row.endsAt) }));
    storefrontMenuItems.value = saved.menuItems; storefrontSocialLinks.value = saved.socialLinks;
    appearanceRevision.value = saved.revision; appearanceBaseline.value = appearanceSnapshot();
    notice.value = 'Все настройки витрины сохранены.';
  } catch (error: any) {
    if (token.value === actorToken) notice.value = Array.isArray(error?.data?.message) ? error.data.message.join('. ') : error?.data?.message || error?.message || 'Не удалось сохранить настройки. Черновик остался на экране.';
  } finally { savingAppearance.value = false; }
}
function closeBannerEditor() {
  if(savingAppearance.value)return false;
  if(bannerEditorDirty.value&&!window.confirm('Закрыть настройки без применения изменений в черновик?'))return false;
  bannerEditor.value=null;bannerEditorError.value='';return true;
}
function openBannerEditor(banner:any) {
  if(savingAppearance.value||!closeBannerEditor())return;
  bannerEditor.value=JSON.parse(JSON.stringify(banner));
  bannerEditorBaseline.value=JSON.stringify(bannerEditor.value);bannerEditorError.value='';
}
function addStorefrontBanner() {
  openBannerEditor({
    id: `new-${Date.now()}`,
    _new: true,
    title: "",
    subtitle: "",
    buttonLabel: "Перейти в каталог",
    linkUrl: "/catalog",
    imageUrl: "",
    mobileImageUrl: "",
    isActive: true,
    sortOrder: storefrontBanners.value.length,
  });
}
function bannerDisplayStatus(banner:any) {
  if(!banner.isActive)return 'Скрыт';
  if(banner.startsAt&&new Date(banner.startsAt).getTime()>Date.now())return 'Запланирован';
  if(banner.endsAt&&new Date(banner.endsAt).getTime()<=Date.now())return 'Завершён';
  return 'Активен';
}
async function saveBannerEditor(){
  if(!bannerEditor.value||savingAppearance.value)return;
  if(await saveStorefrontBanner(bannerEditor.value)){bannerEditor.value=null;bannerEditorError.value='';}
}
function bannerLocalDate(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
async function saveStorefrontBanner(banner: any) {
  if (savingAppearance.value) return false;
  try {
    appearanceBannerPayload(banner, Number(banner.sortOrder || 0));
    const existing = storefrontBanners.value.find(item => item.id === banner.id);
    if (existing) Object.assign(existing, JSON.parse(JSON.stringify(banner)));
    else storefrontBanners.value.push(JSON.parse(JSON.stringify(banner)));
    bannerEditorError.value = ''; notice.value = 'Баннер добавлен в черновик. Сохраните общие настройки витрины.';
    return true;
  } catch (error: any) { bannerEditorError.value = error.message || 'Проверьте настройки баннера.'; return false; }
}
function deleteStorefrontBanner(banner: any) {
  if (savingAppearance.value || !window.confirm('Убрать баннер? Изменение вступит в силу после общего сохранения.')) return;
  storefrontBanners.value = storefrontBanners.value.filter(item => item.id !== banner.id);
  if (bannerEditor.value?.id === banner.id) bannerEditor.value = null;
  notice.value = 'Баннер убран из черновика.';
}
async function saveCategoryImage(category: any, imageUrl: string) {
  if (uploadingMedia.value) return;
  uploadingMedia.value = true;
  try {
    const updated = await $fetch<any>(`/admin/categories/${category.id}/presentation`, {
    baseURL: config.public.apiBase,
    method: "PATCH",
    headers: { Authorization: `Bearer ${token.value}` },
    body: { imageUrl },
  });
  Object.assign(category, updated);
  notice.value = "Фото категории обновлено";
  setTimeout(() => (notice.value = ""), 2200);
  } catch (error: any) {
    notice.value = error?.data?.message || "Не удалось сохранить фото категории. Попробуйте ещё раз.";
  } finally { uploadingMedia.value = false; }
}
function storefrontPreview(url?: string) {
  if (!url) return "";
  return url.startsWith("/api/") ? new URL(url, config.public.apiBase).toString() : url;
}

function addStorefrontMenuItem() {
  const sortOrder = storefrontMenuItems.value.reduce((max, item) => Math.max(max, Number(item.sortOrder) || 0), -1) + 1;
  storefrontMenuItems.value.push({ id: `new-menu-${Date.now()}`, _new: true, label: "", url: "/", newTab: false, isActive: true, sortOrder });
}
function deleteStorefrontMenuItem(item: any) {
  if (savingAppearance.value || !confirm(`Убрать пункт «${item.label || 'Новый пункт'}»? Сама страница останется на сайте. Изменение применится после общего сохранения.`)) return;
  storefrontMenuItems.value = storefrontMenuItems.value.filter(row => row.id !== item.id);
  notice.value = 'Пункт меню убран из черновика.';
}

function addStorefrontSocialLink() {
  storefrontSocialLinks.value.push({ id: `new-social-${Date.now()}`, _new: true, name: "", iconKey: "vk", url: "", isActive: true, sortOrder: storefrontSocialLinks.value.length });
}
function deleteStorefrontSocialLink(social: any) {
  if (savingAppearance.value || !window.confirm(`Убрать «${social.name || 'социальную сеть'}»? Изменение применится после общего сохранения.`)) return;
  storefrontSocialLinks.value = storefrontSocialLinks.value.filter(item => item.id !== social.id);
  notice.value = 'Социальная сеть убрана из черновика.';
}

async function archiveProduct(product: any) {
  await $fetch(`/admin/products/${product.id}`, {
    baseURL: config.public.apiBase,
    method: "DELETE",
    headers: { Authorization: `Bearer ${token.value}` },
  });
  product.isActive = false;
  notice.value = "Товар скрыт из каталога";
  setTimeout(() => (notice.value = ""), 2200);
}
async function trashProduct(product: any) {
  await $fetch(`/data-lifecycle/PRODUCT/${product.id}/trash`, {
    baseURL: config.public.apiBase,
    method: "POST",
    headers: { Authorization: `Bearer ${token.value}` },
    body: { reason: "Удалено администратором из каталога сайта" },
  });
  products.value = products.value.filter((item) => item.id !== product.id);
  notice.value = "Товар перемещён в корзину экосистемы";
  setTimeout(() => (notice.value = ""), 2200);
}
function editProduct(product: any) {
  productEditor.value = {
    id: product.id,
    productType: product.productType,
    variants: product.variants,
    nameRu: product.nameRu,
    descriptionRu: product.descriptionRu || "",
    purposesText: (product.purposes || []).join(', '),
    featuresText: (product.features || []).join(', '),
    price: Number(product.variants?.[0]?.price || product.basePrice || 0),
    salePrice: product.variants?.[0]?.salePrice ?? '',
    saleStartsAt: product.variants?.[0]?.saleStartsAt ?? '',
    saleEndsAt: product.variants?.[0]?.saleEndsAt ?? '',
    badgeIds: product.badgeIds || [],
    stock: product.variants?.[0]?.stock || 0,
    isActive: product.isActive,
    images: (product.images || []).map((image: any) => ({
      url: image.url,
      alt: image.alt || "",
    })),
    categoryIds: [...(product.categories || [])].sort((a: any, b: any) => Number(Boolean(b.isPrimary)) - Number(Boolean(a.isPrimary))).map((item: any) => item.categoryId),
    metaTitle: product.seo?.metaTitle || "",
    metaDesc: product.seo?.metaDesc || "",
    canonical: product.seo?.canonical || "",
  };
}
async function saveProduct() {
  if (!productEditor.value) return;
  savingProduct.value = true;
  try {
    const updated = await $fetch<any>(
      `/admin/products/${productEditor.value.id}`,
      {
        baseURL: config.public.apiBase,
        method: "PATCH",
        headers: { Authorization: `Bearer ${token.value}` },
        body: {
          nameRu: productEditor.value.nameRu,
          descriptionRu: productEditor.value.descriptionRu,
          purposes: [...new Set(productEditor.value.purposesText.split(',').map((value: string) => value.trim()).filter(Boolean))],
          features: [...new Set(productEditor.value.featuresText.split(',').map((value: string) => value.trim()).filter(Boolean))],
          ...(productEditor.value.productType !== 'GIFT_CARD' ? { price: Number(productEditor.value.price), stock: Number(productEditor.value.stock) } : {}),
          isActive: productEditor.value.isActive,
          images: productEditor.value.images.filter((image: any) => image.url),
          categoryIds: productEditor.value.categoryIds,
          metaTitle: productEditor.value.metaTitle,
          metaDesc: productEditor.value.metaDesc,
          canonical: productEditor.value.canonical,
        },
      },
    );
    const index = products.value.findIndex((p) => p.id === updated.id);
    if (index >= 0) products.value[index] = updated;
    productEditor.value = null;
    notice.value = "Товар сохранён";
    setTimeout(() => (notice.value = ""), 2200);
  } finally {
    savingProduct.value = false;
  }
}
function addImage() {
  if (productEditor.value)
    productEditor.value.images.push({ url: "", alt: "" });
}
async function updateOrder(order: any, status: string) {
  if (savingOrder.value || !token.value || !canManageWebOrders.value || !webOrderNextStatuses(order).includes(status)) return;
  const actorToken = token.value;
  savingOrder.value = true;
  try {
    const result = await $fetch<any>(`/admin/orders/${encodeURIComponent(order.orderNumber)}/status`, {
      baseURL: config.public.apiBase, method: 'PATCH',
      headers: { Authorization: `Bearer ${actorToken}` }, body: { status }, timeout: 35000,
    });
    if (token.value !== actorToken) return;
    if (!result || result.id !== order.id || result.status !== status) throw new Error('Invalid response');
    Object.assign(order, result);
    orderSaved.value = { id: order.id, order: result };
    notice.value = 'Статус обновлён и передаётся в 1С';
  } catch (error: any) {
    if (token.value !== actorToken) return;
    const message = error?.data?.message;
    notice.value = Array.isArray(message) ? message.join(' · ') : typeof message === 'string' ? message : 'Не удалось подтвердить изменение. Обновите заказ перед повторной попыткой: сервер уже мог принять запрос.';
  } finally { savingOrder.value = false; }
}
function go(section: string) {
  navigateTo(`/admin-workspace/${section}`);
}
function productMenu(event: MouseEvent, product: any) {
  openContextMenu(
    event,
    product.nameRu,
    [
      {
        label: "Редактировать товар",
        icon: "edit",
        action: () => editProduct(product),
      },
      {
        label: "Открыть в магазине",
        icon: "external",
        action: () => window.open(`/products/${product.slug}`, "_blank"),
      },
      {
        label: "Копировать SKU",
        icon: "copy",
        separator: true,
        action: () => copyText(product.sku, "SKU скопирован"),
      },
      ...(product.isActive
        ? [
            {
              label: "Скрыть из каталога",
              icon: "archive" as const,
              danger: true,
              confirm: `Скрыть товар «${product.nameRu}»?`,
              action: () => archiveProduct(product),
            },
          ]
        : []),
      ...(user.value?.role === "ADMIN"
        ? [
            {
              label: "Переместить в корзину",
              icon: "archive" as const,
              danger: true,
              separator: true,
              confirm: `Переместить товар «${product.nameRu}» в корзину? Его можно будет восстановить в настройках экосистемы.`,
              action: () => trashProduct(product),
            },
          ]
        : []),
    ],
    product.sku,
  );
}
function orderMenu(event: MouseEvent, order: any) {
  const actions = canManageWebOrders.value && !savingOrder.value ? webOrderNextStatuses(order) : [];
  openContextMenu(
    event,
    order.orderNumber,
    [
      {
        label: "Открыть карточку",
        icon: "open",
        action: () => (selected.value = order),
      },
      {
        label: "Копировать номер",
        icon: "copy",
        action: () => copyText(order.orderNumber, "Номер заказа скопирован"),
      },
      ...actions.map((status, index) => ({
        label: `Статус: ${orderStatuses.find(item => item.id === status)?.label || status}`,
        icon: 'status' as const,
        separator: index === 0,
        danger: status === 'CANCELLED',
        confirm: status === 'CANCELLED' ? 'Отменить неоплаченный заказ? Доступность отмены и снятие резервов проверит сервер.' : undefined,
        action: () => updateOrder(order, status),
      })),
    ],
    order.user?.email || "Гость",
  );
}
function customerMenu(event: MouseEvent, customer: any) {
  openContextMenu(
    event,
    [customer.firstName, customer.lastName].filter(Boolean).join(" ") ||
      "Клиент",
    [
      {
        label: "Открыть Customer 360",
        icon: "open",
        action: () => navigateTo(`/crm-customers?customer=${customer.id}`),
      },
      {
        label: "Копировать email",
        icon: "copy",
        action: () => copyText(customer.email, "Email скопирован"),
      },
    ],
    customer.email,
  );
}
function openProductFromTable(event: MouseEvent) {
  if (active.value !== "products") return;
  if((event.target as HTMLElement).closest('input,select,button,a'))return;
  const row = (event.target as HTMLElement).closest(".table .row:not(.head)");
  if (!row) return;
  const productId = row.getAttribute('data-product-id');
  const product = products.value.find(item => item.id === productId);
  if (product) editProduct(product);
}
watch(active, () => { if (searchTimer) clearTimeout(searchTimer); pageLoaded.value = false; listPage.value = 1; search.value = active.value === 'orders' && typeof route.query.q === 'string' ? route.query.q : ''; statusFilter.value = active.value === 'orders' ? routeOrderStatus() : ''; load(); });
let searchTimer: ReturnType<typeof setTimeout> | undefined;
watch([search, statusFilter], () => {
  if (!['products', 'orders'].includes(active.value)) return;
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => { listPage.value = 1; load(); }, 250);
});
function changeListPage(direction: number) { listPage.value += direction; load(); }
watch([productCategory,productVisibility,productAvailability,productSort],()=>{if(active.value==='products'){selectedProductIds.value=[];listPage.value=1;load();}});
watch([listPage,search],()=>{selectedProductIds.value=[];});
function selectPage(){selectedProductIds.value=allProductsSelected.value?[]:filteredProducts.value.map(p=>p.id);}
function currentCatalogPrice(product:any){return product.variants?.[0]?storefrontVariantPrice(product.variants[0],product.productType==='GIFT_CARD'):Number(product.basePrice||0);}
async function bulkProducts(action:'publish'|'hide'){
  if(bulkSaving.value||busy.value||!canEditCatalog.value||!selectedProductIds.value.length)return;
  if(!window.confirm(`${action==='publish'?'Опубликовать':'Скрыть'} выбранные товары (${selectedProductIds.value.length})?`))return;
  bulkSaving.value=true;notice.value='';
  try{await $fetch('/admin/products/bulk',{baseURL:config.public.apiBase,method:'POST',headers:{Authorization:`Bearer ${token.value}`},body:{action,ids:[...selectedProductIds.value]}});selectedProductIds.value=[];await load();notice.value=action==='publish'?'Выбранные товары опубликованы.':'Выбранные товары скрыты.';}
  catch(error:any){notice.value=Array.isArray(error?.data?.message)?error.data.message.join('. '):error?.data?.message||'Не удалось обновить товары. Выбор сохранён для повторной попытки.';}
  finally{bulkSaving.value=false;}
}
onMounted(() => {
  load();
  document
    .querySelector(".site-admin-console")
    ?.addEventListener("dblclick", openProductFromTable);
});
watch(token, () => { pageLoaded.value = false; products.value = []; orders.value = []; customers.value = []; categories.value = []; productEditor.value = null; selected.value = null; load(); });
onBeforeUnmount(() => {
  ++loadGeneration; loadController?.abort();
  if (searchTimer) clearTimeout(searchTimer);
  document.querySelector('.site-admin-console')?.removeEventListener('dblclick', openProductFromTable);
});
</script>
<template>
  <main data-v-ui-642ff821094a class="site-admin-console crm-standard">
    <WorkspaceLoading v-if="!pageLoaded && !loadError" label="Загружаем раздел" />
    <section data-v-ui-642ff821094a v-else-if="!pageLoaded && loadError" class="panel admin-load-error crm-surface" role="alert"><h1 data-v-ui-642ff821094a>Управление платформой</h1><p data-v-ui-642ff821094a>{{ loadError }}</p><button class="crm-button" data-v-ui-642ff821094a type="button" :disabled="busy" @click="load">Повторить загрузку</button></section>
    <template v-else
      ><header data-v-ui-642ff821094a
        class="site-admin-header crm-page-header"
        v-if="active !== 'site-content'"
        :class="{ 'has-new-product': active === 'products', 'has-store-overview': active === 'dashboard' }"
      >
        <div data-v-ui-642ff821094a class="site-admin-heading">
          <p data-v-ui-642ff821094a class="kicker">
            SARKISIAN / {{ menu.find((m) => m.id === active)?.label }}
          </p>
          <h1 data-v-ui-642ff821094a>{{ menu.find((m) => m.id === active)?.label }}</h1>
        </div>
        <div data-v-ui-642ff821094a v-if="active !== 'catalog-menu' && !(route.path.startsWith('/crm/') && active === 'promotions')" class="header-actions">
          <select class="crm-input" v-if="active === 'dashboard'" v-model.number="dashboardDays" aria-label="Период обзора" :disabled="busy" @change="load"><option :value="7">За 7 дней</option><option :value="30">За 30 дней</option></select>
          <button class="crm-button crm-button--refresh" data-v-ui-642ff821094a :disabled="busy || savingAppearance || priceEditing || catalogSettingsEditor?.busy" @click="refreshSection">
            <RefreshCw data-v-ui-642ff821094a :size="16" :class="{ spin: busy }" /> Обновить
          </button>
          <button v-if="['categories','product-badges'].includes(active)" type="button" class="cs-primary crm-button" :disabled="!catalogSettingsEditor?.canAdd" @click="catalogSettingsEditor?.add()"><Plus :size="16"/>{{active === 'categories' ? 'Добавить категорию' : 'Добавить бейдж'}}</button>
          <button data-v-ui-642ff821094a v-if="active === 'appearance'" type="button" class="appearance-save appearance-save-all crm-button" :disabled="savingAppearance || uploadingMedia || !appearanceDirty" @click="saveStorefrontAppearance"><Save data-v-ui-642ff821094a :size="16" /> {{ savingAppearance ? 'Сохраняем…' : 'Сохранить изменения' }}</button>
        </div>
      </header>
      <div data-v-ui-642ff821094a class="admin-body crm-page-content">
        <p data-v-ui-642ff821094a v-if="pageLoaded && loadError" class="panel crm-surface" role="alert">{{ loadError }}</p>
        <StoreDashboard v-if="active === 'dashboard' && dashboard" :data="dashboard" :busy="busy" />
        <SitePagesEditor v-else-if="active === 'pages'" />
        <SiteContentEditor v-else-if="active === 'site-content'" :api-base="String(config.public.apiBase)" :token="token" />
        <SiteCatalogMenuEditor v-else-if="active === 'catalog-menu'" :api-base="String(config.public.apiBase)" :token="token" />
        <SiteCategoriesEditor v-else-if="active === 'categories'" ref="catalogSettingsEditor" />
        <SiteProductBadgesEditor v-else-if="active === 'product-badges'" ref="catalogSettingsEditor" />
        <SitePromoCodesEditor v-else-if="active === 'promotions'" :compact="route.path.startsWith('/crm/')" :api-base="String(config.public.apiBase)" :token="token" />
        <SiteGiftCardsEditor v-else-if="active === 'gift-cards'" ref="catalogSettingsEditor" :api-base="String(config.public.apiBase)" :token="token" :role="user?.role" />
        <section data-v-ui-642ff821094a v-else-if="active === 'appearance'" class="appearance-workspace">
          <nav data-v-ui-642ff821094a class="appearance-tabs" aria-label="Настройки оформления"><button class="crm-button" data-v-ui-642ff821094a v-for="tab in appearanceTabs" :key="tab.id" type="button" :aria-pressed="appearanceTab === tab.id" @click="appearanceTab = tab.id">{{ tab.label }}</button></nav>
          <p data-v-ui-642ff821094a class="appearance-guidance">Перетаскивайте элементы за ручку слева. Все разделы сохраняются одной кнопкой «Сохранить изменения».</p>
          <fieldset data-v-ui-642ff821094a class="ui-fieldset-reset" :disabled="savingAppearance">
          <article data-v-ui-642ff821094a v-if="appearanceTab === 'announcement'" class="panel appearance-panel crm-surface">
            <div data-v-ui-642ff821094a class="panel-head">
              <div data-v-ui-642ff821094a><p data-v-ui-642ff821094a class="kicker">ВЕРХНЯЯ СТРОКА</p><h2 data-v-ui-642ff821094a>Информационное сообщение</h2><span data-v-ui-642ff821094a>Текст отображается над основной шапкой сайта</span></div>
            </div>
            <div data-v-ui-642ff821094a class="appearance-form">
              <label data-v-ui-642ff821094a>Текст верхней строки<textarea class="crm-input" data-v-ui-642ff821094a v-model="storefrontSettings.announcementText" maxlength="280" rows="3"></textarea><small data-v-ui-642ff821094a>{{ storefrontSettings.announcementText.length }} / 280</small></label>
            </div>
          </article>

          <article data-v-ui-642ff821094a v-if="appearanceTab === 'menu'" class="panel appearance-panel menu-settings-panel crm-surface">
            <div data-v-ui-642ff821094a class="panel-head appearance-panel-head">
              <div data-v-ui-642ff821094a><p data-v-ui-642ff821094a class="kicker">НАВИГАЦИЯ</p><h2 data-v-ui-642ff821094a>Меню сайта</h2><span data-v-ui-642ff821094a>Пункты отображаются в центре шапки на ПК и в мобильном меню. Страницы: /about, /delivery, /contacts, /club. Их содержимое редактируется в разделе «Страницы».</span></div>
              <button data-v-ui-642ff821094a class="appearance-add crm-button" @click="addStorefrontMenuItem"><Plus data-v-ui-642ff821094a :size="16" /> Добавить пункт</button>
            </div>
            <div data-v-ui-642ff821094a class="menu-admin-list">
              <section data-v-ui-642ff821094a v-for="(item,index) in storefrontMenuItems" :key="item.id" class="menu-admin-row" @dragover.prevent @drop.prevent="dropAppearance('menu', item.id)">
                <div data-v-ui-642ff821094a class="appearance-order-tools"><button class="crm-button crm-button--icon" data-v-ui-642ff821094a type="button" :disabled="savingAppearance" :draggable="!savingAppearance" aria-label="Перетащить пункт меню" @dragstart="dragAppearance($event, 'menu', item)" @dragend="appearanceDragged = undefined"><GripVertical data-v-ui-642ff821094a :size="18" /></button></div>
                <label data-v-ui-642ff821094a>Название<input class="crm-input" data-v-ui-642ff821094a v-model="item.label" maxlength="60" placeholder="О бренде" /></label>
                <label data-v-ui-642ff821094a>Ссылка<input class="crm-input" data-v-ui-642ff821094a v-model="item.url" maxlength="500" placeholder="/#about или /страница" /></label>
                <label data-v-ui-642ff821094a class="banner-active crm-toggle-row"><input class="crm-check" data-v-ui-642ff821094a v-model="item.isActive" type="checkbox" /> Показывать</label>
                <label data-v-ui-642ff821094a class="banner-active crm-toggle-row"><input class="crm-check" data-v-ui-642ff821094a v-model="item.newTab" type="checkbox" /> В новой вкладке</label>
                <div data-v-ui-642ff821094a class="menu-admin-actions"><button data-v-ui-642ff821094a class="danger crm-button crm-button--danger crm-button--icon" :disabled="savingAppearance" aria-label="Удалить пункт меню" @click="deleteStorefrontMenuItem(item)"><Trash2 data-v-ui-642ff821094a :size="16" /></button></div>
              </section>
              <div data-v-ui-642ff821094a v-if="!storefrontMenuItems.length" class="appearance-empty"><span data-v-ui-642ff821094a>Меню пока пустое — добавьте ссылки на страницы сайта.</span></div>
            </div>
          </article>

          <article data-v-ui-642ff821094a v-if="appearanceTab === 'banners'" class="panel appearance-panel crm-surface">
            <div data-v-ui-642ff821094a class="panel-head appearance-panel-head">
              <div data-v-ui-642ff821094a><p data-v-ui-642ff821094a class="kicker">ГЛАВНЫЙ ЭКРАН</p><h2 data-v-ui-642ff821094a>Баннеры</h2><span data-v-ui-642ff821094a>Можно создать несколько баннеров — на сайте они сменяются автоматически</span></div>
              <button data-v-ui-642ff821094a class="appearance-add crm-button" @click="addStorefrontBanner"><Plus data-v-ui-642ff821094a :size="16" /> Новый баннер</button>
            </div>
            <div data-v-ui-642ff821094a class="banner-admin-list">
              <section data-v-ui-642ff821094a v-for="(banner,index) in storefrontBanners" :key="banner.id" :data-banner-id="banner.id" class="banner-admin-card" @dragover.prevent @drop.prevent="dropAppearance('banners', banner.id)">
                <div data-v-ui-642ff821094a class="appearance-order-tools"><button class="crm-button crm-button--icon" data-v-ui-642ff821094a type="button" :disabled="savingAppearance" :draggable="!savingAppearance" aria-label="Перетащить баннер" title="Перетащить; с клавиатуры Alt + ↑ / ↓" @keydown.alt.up.prevent="moveAppearance('banners',banner.id,index-1)" @keydown.alt.down.prevent="moveAppearance('banners',banner.id,index+1)" @dragstart="dragAppearance($event, 'banners', banner)" @dragend="appearanceDragged = undefined"><GripVertical data-v-ui-642ff821094a :size="18" /></button></div>
                <div data-v-ui-642ff821094a class="banner-admin-preview" :class="{ empty: !banner.imageUrl }">
                  <img data-v-ui-642ff821094a v-if="banner.imageUrl" :src="storefrontPreview(banner.imageUrl)" alt="Предпросмотр баннера" />
                  <ImagePlus data-v-ui-642ff821094a v-else :size="30" />
                </div>
                <div data-v-ui-642ff821094a class="banner-admin-summary">
                  <strong data-v-ui-642ff821094a>{{banner.title || `Баннер ${index+1}`}}</strong>
                  <small data-v-ui-642ff821094a>{{banner.linkUrl || 'Без перехода'}}</small>
                  <span data-v-ui-642ff821094a class="studio-status">{{bannerDisplayStatus(banner)}}</span>
                </div>
                <div data-v-ui-642ff821094a class="banner-admin-actions">
                  <button class="crm-button" data-v-ui-642ff821094a type="button" :disabled="savingAppearance" :aria-label="'Настройки баннера '+(index+1)" @click="openBannerEditor(banner)"><Pencil data-v-ui-642ff821094a :size="16"/><span data-v-ui-642ff821094a>Настройки</span></button>
                  <button data-v-ui-642ff821094a type="button" class="danger crm-button crm-button--danger" :disabled="savingAppearance" :aria-label="'Удалить баннер '+(index+1)" @click="deleteStorefrontBanner(banner)"><Trash2 data-v-ui-642ff821094a :size="16"/></button>
                </div>
              </section>
              <div data-v-ui-642ff821094a v-if="!storefrontBanners.length" class="appearance-empty"><ImagePlus data-v-ui-642ff821094a :size="28" /><span data-v-ui-642ff821094a>Баннеров пока нет</span><button class="crm-button" data-v-ui-642ff821094a @click="addStorefrontBanner">Создать первый баннер</button></div>
            </div>
            <Teleport to="body">
              <div data-v-ui-642ff821094a v-if="bannerEditor" class="banner-editor-backdrop admin-dialog-backdrop" @click.self="closeBannerEditor">
                <form data-v-ui-642ff821094a ref="bannerPanel" class="banner-editor-drawer admin-dialog admin-dialog--drawer" role="dialog" aria-modal="true" aria-labelledby="banner-editor-title" :aria-busy="savingAppearance" tabindex="-1" @keydown="bannerKeyboard" @submit.prevent="saveBannerEditor">
                  <header data-v-ui-642ff821094a><div data-v-ui-642ff821094a><p data-v-ui-642ff821094a class="eyebrow">Сайт / Баннеры</p><h2 data-v-ui-642ff821094a id="banner-editor-title">{{bannerEditor._new?'Новый баннер':'Настройки баннера'}}</h2><p data-v-ui-642ff821094a class="editor-subtitle">{{bannerEditorDirty?'Есть несохранённые изменения':'Главный экран сайта'}}</p></div><button class="crm-button crm-button--icon" data-v-ui-642ff821094a type="button" :disabled="savingAppearance" aria-label="Закрыть настройки баннера" @click="closeBannerEditor"><X data-v-ui-642ff821094a :size="20"/></button></header>
                  <div data-v-ui-642ff821094a class="admin-dialog-body">
                    <fieldset data-v-ui-642ff821094a class="banner-admin-fields" :disabled="savingAppearance">
                      <section data-v-ui-642ff821094a class="cs-category-section" aria-labelledby="banner-image-heading">
                        <h3 data-v-ui-642ff821094a id="banner-image-heading">Изображение</h3>
                        <div data-v-ui-642ff821094a v-if="bannerEditor.imageUrl" class="banner-editor-preview"><img data-v-ui-642ff821094a :src="storefrontPreview(bannerEditor.imageUrl)" alt="Предпросмотр баннера"/></div>
                        <AdminMediaPicker v-model="bannerEditor.imageUrl" :disabled="savingAppearance" :show-preview="false" label="Изображение баннера" />
                        <label data-v-ui-642ff821094a>Описание изображения<input class="crm-input" data-v-ui-642ff821094a v-model="bannerEditor.title" placeholder="Для доступности, не выводится поверх фото" /></label>
                        <label data-v-ui-642ff821094a>Внутреннее описание<textarea class="crm-input" data-v-ui-642ff821094a v-model="bannerEditor.subtitle" rows="2" placeholder="Не выводится поверх баннера"></textarea></label>
                      </section>
                      <section data-v-ui-642ff821094a class="cs-category-section" aria-labelledby="banner-link-heading">
                        <h3 data-v-ui-642ff821094a id="banner-link-heading">Переход и расписание</h3>
                        <div data-v-ui-642ff821094a class="banner-editor-grid"><label data-v-ui-642ff821094a>Описание перехода<input class="crm-input" data-v-ui-642ff821094a v-model="bannerEditor.buttonLabel" /></label><label data-v-ui-642ff821094a>Ссылка<input class="crm-input" data-v-ui-642ff821094a v-model="bannerEditor.linkUrl" placeholder="/catalog" /></label><label data-v-ui-642ff821094a>Начало показа<input class="crm-input" data-v-ui-642ff821094a v-model="bannerEditor.startsAt" type="datetime-local" /></label><label data-v-ui-642ff821094a>Окончание показа<input class="crm-input" data-v-ui-642ff821094a v-model="bannerEditor.endsAt" type="datetime-local" /></label></div>
                        <label data-v-ui-642ff821094a class="banner-active crm-toggle-row"><input class="crm-check" data-v-ui-642ff821094a v-model="bannerEditor.isActive" type="checkbox" /> Показывать на сайте</label>
                      </section>
                      <section data-v-ui-642ff821094a class="cs-category-section" aria-labelledby="banner-mobile-heading">
                        <h3 data-v-ui-642ff821094a id="banner-mobile-heading">Изображение для телефона</h3>
                        <small data-v-ui-642ff821094a>Необязательно. Без него используется основное изображение.</small>
                        <AdminMediaPicker v-model="bannerEditor.mobileImageUrl" :disabled="savingAppearance" label="Мобильное изображение" />
                      </section>
                    </fieldset>
                    <p data-v-ui-642ff821094a v-if="bannerEditorError" class="cs-error" role="alert">{{bannerEditorError}}</p>
                  </div>
                  <footer data-v-ui-642ff821094a><button class="crm-button" data-v-ui-642ff821094a type="button" :disabled="savingAppearance" @click="closeBannerEditor">Отмена</button><button data-v-ui-642ff821094a type="button" class="primary crm-button crm-button--primary" :disabled="savingAppearance || uploadingMedia" @click="saveBannerEditor">Готово</button></footer>
                </form>
              </div>
            </Teleport>
          </article>

          <article data-v-ui-642ff821094a v-if="appearanceTab === 'social'" class="panel appearance-panel crm-surface">
            <div data-v-ui-642ff821094a class="panel-head appearance-panel-head">
              <div data-v-ui-642ff821094a><p data-v-ui-642ff821094a class="kicker">ПОДВАЛ САЙТА</p><h2 data-v-ui-642ff821094a>Социальные сети</h2><span data-v-ui-642ff821094a>Добавляйте ссылки, меняйте порядок и скрывайте временно неиспользуемые каналы</span></div>
              <button data-v-ui-642ff821094a class="appearance-add crm-button" @click="addStorefrontSocialLink"><Plus data-v-ui-642ff821094a :size="16" /> Добавить соцсеть</button>
            </div>
            <div data-v-ui-642ff821094a class="social-admin-list">
              <section data-v-ui-642ff821094a v-for="(social,index) in storefrontSocialLinks" :key="social.id" class="social-admin-row" @dragover.prevent @drop.prevent="dropAppearance('social', social.id)">
                <div data-v-ui-642ff821094a class="appearance-order-tools"><button class="crm-button crm-button--icon" data-v-ui-642ff821094a type="button" :disabled="savingAppearance" :draggable="!savingAppearance" aria-label="Перетащить социальную сеть" @dragstart="dragAppearance($event, 'social', social)" @dragend="appearanceDragged = undefined"><GripVertical data-v-ui-642ff821094a :size="18" /></button></div>
                <div data-v-ui-642ff821094a class="social-admin-icon"><img data-v-ui-642ff821094a v-if="['vk', 'telegram', 'max'].includes(social.iconKey)" :src="`/storefront/icons/${social.iconKey}.svg`" alt="" /><span data-v-ui-642ff821094a v-else>↗</span></div>
                <label data-v-ui-642ff821094a>Название<input class="crm-input" data-v-ui-642ff821094a v-model="social.name" placeholder="Например, ВКонтакте" /></label>
                <label data-v-ui-642ff821094a>Иконка<select class="crm-input" data-v-ui-642ff821094a v-model="social.iconKey"><option data-v-ui-642ff821094a value="vk">ВКонтакте</option><option data-v-ui-642ff821094a value="telegram">Telegram</option><option data-v-ui-642ff821094a value="max">MAX</option><option data-v-ui-642ff821094a value="link">Другая ссылка</option></select></label>
                <label data-v-ui-642ff821094a class="social-url">Ссылка<input class="crm-input" data-v-ui-642ff821094a v-model="social.url" placeholder="https://..." /></label>
                <label data-v-ui-642ff821094a class="banner-active crm-toggle-row"><input class="crm-check" data-v-ui-642ff821094a v-model="social.isActive" type="checkbox" /> Показывать</label>
                <div data-v-ui-642ff821094a class="social-admin-actions"><button data-v-ui-642ff821094a class="danger crm-button crm-button--danger" @click="deleteStorefrontSocialLink(social)"><Trash2 data-v-ui-642ff821094a :size="15" /></button></div>
              </section>
              <div data-v-ui-642ff821094a v-if="!storefrontSocialLinks.length" class="appearance-empty"><span data-v-ui-642ff821094a>Социальные сети пока не добавлены</span><button class="crm-button" data-v-ui-642ff821094a @click="addStorefrontSocialLink"><Plus data-v-ui-642ff821094a :size="15" /> Добавить первую</button></div>
            </div>
          </article>
          </fieldset>
          <p data-v-ui-642ff821094a class="appearance-draft-status" role="status">{{ appearanceDirty ? 'Есть несохранённые изменения во вкладках витрины.' : 'Все изменения сохранены.' }}</p>
        </section>
        <section data-v-ui-642ff821094a v-else-if="['loyalty', 'loyalty-settings', 'loyalty-members'].includes(active)" class="loyalty-workspace">
          <template v-if="loyaltyDashboard">
            <div data-v-ui-642ff821094a v-if="active === 'loyalty-members'" class="loyalty-kpis">
              <article class="crm-surface" data-v-ui-642ff821094a><i class="crm-icon-tile" data-v-ui-642ff821094a><Award data-v-ui-642ff821094a :size="20" /></i><span data-v-ui-642ff821094a>Участники</span><strong data-v-ui-642ff821094a>{{ loyaltyDashboard.summary.participants }}</strong><small data-v-ui-642ff821094a>зарегистрированных клиентов</small></article>
              <article class="crm-surface" data-v-ui-642ff821094a><i class="crm-icon-tile" data-v-ui-642ff821094a><Coins data-v-ui-642ff821094a :size="20" /></i><span data-v-ui-642ff821094a>На балансах</span><strong data-v-ui-642ff821094a>{{ Number(loyaltyDashboard.summary.activeBalances).toLocaleString('ru-RU') }}</strong><small data-v-ui-642ff821094a>доступных бонусов</small></article>
              <article class="crm-surface" data-v-ui-642ff821094a><i class="crm-icon-tile" data-v-ui-642ff821094a><Plus data-v-ui-642ff821094a :size="20" /></i><span data-v-ui-642ff821094a>Начислено</span><strong data-v-ui-642ff821094a>{{ Number(loyaltyDashboard.summary.earned).toLocaleString('ru-RU') }}</strong><small data-v-ui-642ff821094a>за всё время</small></article>
              <article class="crm-surface" data-v-ui-642ff821094a><i class="crm-icon-tile" data-v-ui-642ff821094a><Gift data-v-ui-642ff821094a :size="20" /></i><span data-v-ui-642ff821094a>Использовано</span><strong data-v-ui-642ff821094a>{{ Number(loyaltyDashboard.summary.spent).toLocaleString('ru-RU') }}</strong><small data-v-ui-642ff821094a>{{ loyaltyDashboard.summary.operations }} операций</small></article>
            </div>

            <article data-v-ui-642ff821094a v-if="active !== 'loyalty-members'" class="panel loyalty-settings-panel crm-surface">
              <div data-v-ui-642ff821094a class="loyalty-program-preview">
                <small data-v-ui-642ff821094a>БОНУСНАЯ ПРОГРАММА</small>
                <h2 data-v-ui-642ff821094a>{{ loyaltySettings.programName }}</h2>
                <p data-v-ui-642ff821094a>{{ loyaltySettings.isEnabled ? 'Программа работает' : 'Начисления приостановлены' }}</p>
                <div data-v-ui-642ff821094a><b data-v-ui-642ff821094a>{{ loyaltySettings.earnPercent }}%</b><span data-v-ui-642ff821094a>базовое начисление<br data-v-ui-642ff821094a />с каждой покупки</span></div>
                <i class="crm-icon-tile" data-v-ui-642ff821094a><span data-v-ui-642ff821094a :style="{ width: `${Math.min(100, loyaltySettings.maxWriteOffPercent)}%` }"></span></i>
                <footer data-v-ui-642ff821094a><span data-v-ui-642ff821094a>Можно списать</span><strong data-v-ui-642ff821094a>до {{ loyaltySettings.maxWriteOffPercent }}%</strong></footer>
              </div>
              <div data-v-ui-642ff821094a class="loyalty-settings-form"><fieldset class="ui-fieldset-reset" :disabled="savingLoyalty || !canConfigureLoyalty">
                <div data-v-ui-642ff821094a class="panel-head"><div data-v-ui-642ff821094a><p data-v-ui-642ff821094a class="kicker">ПРАВИЛА ПРОГРАММЫ</p><h2 data-v-ui-642ff821094a>Начисления и уровни</h2><span data-v-ui-642ff821094a>Изменения применяются к новым операциям и не пересчитывают историю</span></div><label data-v-ui-642ff821094a class="loyalty-status crm-toggle-row"><input class="crm-check" data-v-ui-642ff821094a v-model="loyaltySettings.isEnabled" type="checkbox" /><span data-v-ui-642ff821094a>{{ loyaltySettings.isEnabled ? 'Активна' : 'Приостановлена' }}</span></label></div>
                <div data-v-ui-642ff821094a class="loyalty-form-grid">
                  <label data-v-ui-642ff821094a class="wide">Название программы<input class="crm-input" data-v-ui-642ff821094a v-model="loyaltySettings.programName" maxlength="80" /></label>
                  <label data-v-ui-642ff821094a>Начислять с покупки, %<input class="crm-input" data-v-ui-642ff821094a v-model.number="loyaltySettings.earnPercent" type="number" min="0" max="100" /></label>
                  <label data-v-ui-642ff821094a>Максимум списания, %<input class="crm-input" data-v-ui-642ff821094a v-model.number="loyaltySettings.maxWriteOffPercent" type="number" min="0" max="100" /></label>
                  <label data-v-ui-642ff821094a>За регистрацию<input class="crm-input" data-v-ui-642ff821094a v-model.number="loyaltySettings.signupBonus" type="number" min="0" /></label>
                  <label data-v-ui-642ff821094a>На день рождения<input class="crm-input" data-v-ui-642ff821094a v-model.number="loyaltySettings.birthdayBonus" type="number" min="0" /></label>
                  <label data-v-ui-642ff821094a>Срок действия, дней<input class="crm-input" data-v-ui-642ff821094a v-model.number="loyaltySettings.bonusValidityDays" type="number" min="1" /></label>
                </div>
                <div data-v-ui-642ff821094a class="loyalty-levels">
                  <section class="crm-surface crm-surface--tint" data-v-ui-642ff821094a><span data-v-ui-642ff821094a>СТАРТ</span><b data-v-ui-642ff821094a>Базовые условия</b><small data-v-ui-642ff821094a>Сразу после регистрации</small></section>
                  <section class="crm-surface" data-v-ui-642ff821094a><span data-v-ui-642ff821094a>ПРОФЕССИОНАЛ</span><label data-v-ui-642ff821094a>Порог<input class="crm-input" data-v-ui-642ff821094a v-model.number="loyaltySettings.proThreshold" type="number" min="0" /></label><label data-v-ui-642ff821094a>Множитель, %<input class="crm-input" data-v-ui-642ff821094a v-model.number="loyaltySettings.proMultiplierPercent" type="number" min="100" /></label></section>
                  <section class="crm-surface" data-v-ui-642ff821094a><span data-v-ui-642ff821094a>ПРЕМИУМ</span><label data-v-ui-642ff821094a>Порог<input class="crm-input" data-v-ui-642ff821094a v-model.number="loyaltySettings.premiumThreshold" type="number" min="0" /></label><label data-v-ui-642ff821094a>Множитель, %<input class="crm-input" data-v-ui-642ff821094a v-model.number="loyaltySettings.premiumMultiplierPercent" type="number" min="100" /></label></section>
                </div>
                <button data-v-ui-642ff821094a class="loyalty-save crm-button crm-button--primary" :disabled="savingLoyalty || !canConfigureLoyalty" @click="saveLoyaltySettings"><Save data-v-ui-642ff821094a :size="16" /> {{ savingLoyalty ? 'Сохраняем…' : 'Сохранить правила' }}</button>
              </fieldset></div>
            </article>

            <article data-v-ui-642ff821094a v-if="active === 'loyalty-members'" class="panel loyalty-members-panel crm-surface">
              <div data-v-ui-642ff821094a class="panel-head"><div data-v-ui-642ff821094a><p data-v-ui-642ff821094a class="kicker">УЧАСТНИКИ</p><h2 data-v-ui-642ff821094a>Бонусные счета клиентов</h2><span data-v-ui-642ff821094a>Открывайте счёт для просмотра истории, начисления или списания</span></div><label data-v-ui-642ff821094a class="search crm-input-group"><Search data-v-ui-642ff821094a :size="16" /><input class="crm-input" data-v-ui-642ff821094a v-model="loyaltySearch" placeholder="Имя, email или телефон" /></label></div>
              <div data-v-ui-642ff821094a class="loyalty-table">
                <div data-v-ui-642ff821094a class="loyalty-row head crm-table-head"><span data-v-ui-642ff821094a>Клиент</span><span data-v-ui-642ff821094a>Уровень</span><span data-v-ui-642ff821094a>Баланс</span><span data-v-ui-642ff821094a>Последняя операция</span><span data-v-ui-642ff821094a></span></div>
                <div data-v-ui-642ff821094a v-for="account in filteredLoyaltyAccounts" :key="account.userId" class="loyalty-row crm-table-row" @click="openLoyaltyAccount(account)" @contextmenu.prevent="loyaltyMenu($event, account)">
                  <div data-v-ui-642ff821094a><strong data-v-ui-642ff821094a>{{ [account.firstName, account.lastName].filter(Boolean).join(' ') || 'Без имени' }}</strong><small data-v-ui-642ff821094a>{{ account.email }}</small></div>
                  <span data-v-ui-642ff821094a class="loyalty-level crm-badge">{{ loyaltyLevelLabel(account.level) }}</span>
                  <strong data-v-ui-642ff821094a>{{ Number(account.balance).toLocaleString('ru-RU') }}</strong>
                  <span data-v-ui-642ff821094a>{{ account.entries[0] ? `${account.entries[0].amount > 0 ? '+' : ''}${account.entries[0].amount} · ${account.entries[0].reason}` : 'Операций ещё нет' }}</span>
                  <button class="crm-button crm-button--icon" data-v-ui-642ff821094a aria-label="Открыть бонусный счёт" @click.stop="openLoyaltyAccount(account)"><Eye data-v-ui-642ff821094a :size="16" /></button>
                </div>
                <div data-v-ui-642ff821094a v-if="!filteredLoyaltyAccounts.length" class="appearance-empty">Клиенты не найдены</div>
              </div>
            </article>
          </template>
          <WorkspaceLoading v-else label="Загружаем бонусную программу" />
        </section>
        <section data-v-ui-642ff821094a v-else-if="active === 'products'" class="panel crm-surface">
          <div data-v-ui-642ff821094a class="filters cs-product-filters crm-toolbar"><label data-v-ui-642ff821094a class="search cs-product-search crm-input-group"><Search data-v-ui-642ff821094a :size="16" /><input class="crm-input" data-v-ui-642ff821094a v-model="search" type="search" aria-label="Поиск товаров" placeholder="Название или SKU" :disabled="bulkSaving" /></label><select class="crm-input" data-v-ui-642ff821094a v-model="productCategory" aria-label="Категория товаров" :disabled="busy||bulkSaving||priceEditing"><option data-v-ui-642ff821094a value="">Все категории</option><option data-v-ui-642ff821094a v-for="category in categories" :key="category.id" :value="category.id">{{category.nameRu}}</option></select><select class="crm-input" data-v-ui-642ff821094a v-model="productVisibility" aria-label="Публикация товаров" :disabled="busy||bulkSaving||priceEditing"><option data-v-ui-642ff821094a value="">Любая публикация</option><option data-v-ui-642ff821094a value="active">На сайте</option><option data-v-ui-642ff821094a value="hidden">Скрытые</option></select><select class="crm-input" data-v-ui-642ff821094a v-model="productAvailability" aria-label="Наличие товаров" :disabled="busy||bulkSaving||priceEditing"><option data-v-ui-642ff821094a value="">Любой остаток</option><option data-v-ui-642ff821094a value="stocked">В наличии</option><option data-v-ui-642ff821094a value="empty">Нет в наличии</option></select><select class="crm-input" data-v-ui-642ff821094a v-model="productSort" aria-label="Порядок товаров" :disabled="busy||bulkSaving||priceEditing"><option data-v-ui-642ff821094a value="updated">По обновлению</option><option data-v-ui-642ff821094a value="name">По названию</option><option data-v-ui-642ff821094a value="sku">По артикулу</option></select></div>
          <div data-v-ui-642ff821094a v-if="selectedProductIds.length" class="cs-bulk-bar"><span data-v-ui-642ff821094a>Выбрано: {{selectedProductIds.length}}</span><button class="crm-button" data-v-ui-642ff821094a :disabled="busy||bulkSaving||!canEditCatalog" @click="bulkProducts('publish')">Опубликовать</button><button class="crm-button" data-v-ui-642ff821094a :disabled="busy||bulkSaving||!canEditCatalog" @click="bulkProducts('hide')">Скрыть</button><button class="crm-button" data-v-ui-642ff821094a :disabled="bulkSaving" @click="selectedProductIds=[]">Снять выбор</button></div>
          <div data-v-ui-642ff821094a class="table products-table">
            <div data-v-ui-642ff821094a class="row head crm-table-head">
              <input class="crm-check" data-v-ui-642ff821094a type="checkbox" :checked="allProductsSelected" :disabled="busy||bulkSaving||!canEditCatalog||!filteredProducts.length" aria-label="Выбрать товары на странице" @change="selectPage"/>
              <span data-v-ui-642ff821094a>Товар</span><span data-v-ui-642ff821094a>Цена</span><span data-v-ui-642ff821094a>Акционная цена</span><span data-v-ui-642ff821094a>Остаток</span
              ><span data-v-ui-642ff821094a>Статус</span>
            </div>
            <div data-v-ui-642ff821094a
              v-for="p in filteredProducts"
              :key="p.id"
              :data-product-id="p.id"
              class="row"
              @contextmenu.prevent="productMenu($event, p)"
            >
              <input class="crm-check" data-v-ui-642ff821094a v-model="selectedProductIds" type="checkbox" :value="p.id" :disabled="busy||bulkSaving||!canEditCatalog" :aria-label="'Выбрать товар '+p.nameRu"/>
              <div data-v-ui-642ff821094a class="cs-product-identity">
                <img data-v-ui-642ff821094a v-if="productPreview(p)" :src="productPreview(p)!" :alt="p.nameRu" loading="lazy" @error="productPreviewFailed(p)"/><span data-v-ui-642ff821094a v-else class="cs-product-thumb" :class="{ 'cs-product-thumb--gift': p.productType === 'GIFT_CARD' }" :aria-label="p.productType === 'GIFT_CARD' ? 'Подарочная карта' : 'Нет фотографии товара'"><Gift data-v-ui-642ff821094a v-if="p.productType === 'GIFT_CARD'" :size="20"/><ImagePlus data-v-ui-642ff821094a v-else :size="20"/></span>
                <button data-v-ui-642ff821094a type="button" class="product-open crm-button" @click="editProduct(p)">{{ p.nameRu }}</button
                ><small data-v-ui-642ff821094a>{{ p.sku }}</small>
              </div>
              <div class="cs-inline-price">
                <input v-if="priceEditor?.id === p.id" v-model="priceEditor.price" data-price-field="price" @focus="priceEditor.field = 'price'" class="cs-inline-price-input crm-input" type="text" inputmode="decimal" :aria-label="'Цена: ' + p.nameRu" :disabled="savingPrice" @keydown.enter.prevent="savePrices" @keydown.escape.stop.prevent="cancelPrices"/>
                <div v-if="priceEditor?.id === p.id && priceEditor.field === 'price'" class="cs-inline-price-actions">
                  <button type="button" class="cs-price-save crm-button" :disabled="savingPrice" @click="savePrices" :aria-label="'Сохранить цены: ' + p.nameRu" title="Сохранить цены"><Check :size="16"/></button>
                  <button type="button" class="cs-price-cancel crm-button crm-button--icon" :disabled="savingPrice" @click="cancelPrices" aria-label="Отменить изменение цен" title="Отменить изменение цен"><X :size="16"/></button>
                </div>
                <button v-if="priceEditor?.id !== p.id" type="button" class="cs-price-value crm-button" :disabled="!canEditCatalog || priceEditing || p.productType === 'GIFT_CARD' || !p.variants?.length" :aria-label="'Изменить цену: ' + p.nameRu" :title="p.productType === 'GIFT_CARD' ? 'Номиналы настраиваются в разделе подарочных карт' : 'Нажмите, чтобы изменить цену'" @click="editPrices(p, 'price')">{{ Number(p.variants?.[0]?.price ?? p.basePrice ?? 0).toLocaleString('ru-RU') }} ₽<Pencil v-if="canEditCatalog && p.productType !== 'GIFT_CARD'" :size="14"/></button>
              </div>
              <div class="cs-inline-price">
                <input v-if="priceEditor?.id === p.id" v-model="priceEditor.salePrice" data-price-field="salePrice" @focus="priceEditor.field = 'salePrice'" class="cs-inline-price-input crm-input" type="text" inputmode="decimal" placeholder="Без акции" :aria-label="'Акционная цена: ' + p.nameRu" :disabled="savingPrice" @keydown.enter.prevent="savePrices" @keydown.escape.stop.prevent="cancelPrices"/>
                <div v-if="priceEditor?.id === p.id && priceEditor.field === 'salePrice'" class="cs-inline-price-actions">
                  <button type="button" class="cs-price-save crm-button" :disabled="savingPrice" @click="savePrices" :aria-label="'Сохранить цены: ' + p.nameRu" title="Сохранить цены"><Check :size="16"/></button>
                  <button type="button" class="cs-price-cancel crm-button crm-button--icon" :disabled="savingPrice" @click="cancelPrices" aria-label="Отменить изменение цен" title="Отменить изменение цен"><X :size="16"/></button>
                </div>
                <button v-if="priceEditor?.id !== p.id" type="button" class="cs-price-value crm-button" :disabled="!canEditCatalog || priceEditing || p.productType === 'GIFT_CARD' || !p.variants?.length" :aria-label="'Изменить акционную цену: ' + p.nameRu" @click="editPrices(p, 'salePrice')">{{ p.variants?.[0]?.salePrice != null ? Number(p.variants[0].salePrice).toLocaleString('ru-RU') + ' ₽' : '—' }}<Pencil v-if="canEditCatalog && p.productType !== 'GIFT_CARD'" :size="14"/></button>
              </div>
              <span data-v-ui-642ff821094a>{{ p.variants?.[0]?.stock || 0 }}</span>
              <span data-v-ui-642ff821094a :class="p.isActive ? 'green' : 'red'">{{ p.isActive ? "Активен" : "Скрыт" }}</span>

              <p v-if="priceEditor?.id === p.id && priceEditor.error" class="cs-inline-price-error" role="alert">{{priceEditor.error}}</p>
            </div>
            <p data-v-ui-642ff821094a v-if="!filteredProducts.length" class="empty">
              Товары не найдены
            </p>
          </div>
        </section>
        <WorkspaceOrdersTable v-else-if="active === 'orders'" :items="filteredOrders" :total="listTotal" v-model:search="search" v-model:status="statusFilter" :busy="busy" @open="selected = $event" @context="orderMenu" />
        <section data-v-ui-642ff821094a v-else-if="active === 'customers'" class="panel crm-surface">
          <div data-v-ui-642ff821094a class="panel-head">
            <div data-v-ui-642ff821094a>
              <p data-v-ui-642ff821094a class="kicker">КЛИЕНТСКАЯ БАЗА</p>
              <h2 data-v-ui-642ff821094a>Клиенты</h2>
              <span data-v-ui-642ff821094a>{{ customers.length }} профилей</span>
            </div>
          </div>
          <div data-v-ui-642ff821094a class="table">
            <div data-v-ui-642ff821094a class="row head crm-table-head">
              <span data-v-ui-642ff821094a>Клиент</span><span data-v-ui-642ff821094a>Email</span><span data-v-ui-642ff821094a>Телефон</span
              ><span data-v-ui-642ff821094a>Заказы</span><span data-v-ui-642ff821094a>Регистрация</span>
            </div>
            <div data-v-ui-642ff821094a
              v-for="c in customers"
              :key="c.id"
              class="row"
              @contextmenu.prevent="customerMenu($event, c)"
            >
              <div data-v-ui-642ff821094a>
                <strong data-v-ui-642ff821094a>{{
                  [c.firstName, c.lastName].filter(Boolean).join(" ") ||
                  "Без имени"
                }}</strong
                ><small data-v-ui-642ff821094a>{{ c.role }}</small>
              </div>
              <span data-v-ui-642ff821094a>{{ c.email }}</span
              ><span data-v-ui-642ff821094a>{{ c.phone || "—" }}</span
              ><span data-v-ui-642ff821094a>{{ c._count?.orders || 0 }}</span
              ><span data-v-ui-642ff821094a>{{
                new Date(c.createdAt).toLocaleDateString("ru-RU")
              }}</span>
            </div>
          </div>
        </section>
        <nav data-v-ui-642ff821094a v-if="['products','orders'].includes(active)" class="admin-pagination" aria-label="Страницы списка"><span data-v-ui-642ff821094a>Всего: {{ listTotal }} · Страница {{ listPage }} из {{ Math.max(1, Math.ceil(listTotal / listLimit)) }}</span><div data-v-ui-642ff821094a><button class="crm-button" data-v-ui-642ff821094a type="button" :disabled="busy || priceEditing || listPage <= 1" @click="changeListPage(-1)">Назад</button><button class="crm-button" data-v-ui-642ff821094a type="button" :disabled="busy || priceEditing || listPage * listLimit >= listTotal" @click="changeListPage(1)">Далее</button></div></nav>
      </div>
    </template>
    <div data-v-ui-642ff821094a v-if="notice" class="toast">{{ notice }}</div>
  </main>
  <aside data-v-ui-642ff821094a v-if="loyaltyAccountEditor" class="drawer-backdrop loyalty-drawer-backdrop admin-dialog-backdrop" @click.self="loyaltyAccountEditor = null">
    <div data-v-ui-642ff821094a class="drawer loyalty-drawer admin-dialog admin-dialog--drawer">
      <header data-v-ui-642ff821094a><div data-v-ui-642ff821094a><p data-v-ui-642ff821094a class="kicker">БОНУСНЫЙ СЧЁТ</p><h2 data-v-ui-642ff821094a>{{ [loyaltyAccountEditor.firstName, loyaltyAccountEditor.lastName].filter(Boolean).join(' ') || 'Клиент' }}</h2><span data-v-ui-642ff821094a class="loyalty-client-email">{{ loyaltyAccountEditor.email }}</span></div><button class="crm-button crm-button--icon" data-v-ui-642ff821094a type="button" aria-label="Закрыть бонусный счёт" @click="loyaltyAccountEditor = null"><X data-v-ui-642ff821094a :size="18" /></button></header>
      <div data-v-ui-642ff821094a class="admin-dialog-body">
      <div data-v-ui-642ff821094a class="loyalty-drawer-balance"><small data-v-ui-642ff821094a>Доступно</small><strong data-v-ui-642ff821094a>{{ Number(loyaltyAccountEditor.balance).toLocaleString('ru-RU') }}</strong><span data-v-ui-642ff821094a>бонусов · {{ loyaltyLevelLabel(loyaltyAccountEditor.level) }}</span></div>
      <div data-v-ui-642ff821094a class="loyalty-operation-tabs"><button class="crm-button" data-v-ui-642ff821094a :class="{ active: loyaltyAdjustment.type === 'ACCRUAL' }" @click="loyaltyAdjustment.type = 'ACCRUAL'">Начислить</button><button class="crm-button" data-v-ui-642ff821094a :class="{ active: loyaltyAdjustment.type === 'WRITE_OFF' }" @click="loyaltyAdjustment.type = 'WRITE_OFF'">Списать</button></div>
      <div data-v-ui-642ff821094a class="loyalty-adjustment-form"><label data-v-ui-642ff821094a>Количество бонусов<input class="crm-input" data-v-ui-642ff821094a v-model.number="loyaltyAdjustment.amount" type="number" min="1" /></label><label data-v-ui-642ff821094a>Причина<textarea class="crm-input" data-v-ui-642ff821094a v-model="loyaltyAdjustment.reason" maxlength="240" rows="3" placeholder="Например, компенсация по обращению"></textarea></label><button class="crm-button" data-v-ui-642ff821094a :disabled="savingLoyalty" @click="applyLoyaltyAdjustment">{{ savingLoyalty ? 'Проводим операцию…' : loyaltyAdjustment.type === 'ACCRUAL' ? 'Начислить бонусы' : 'Списать бонусы' }}</button></div>
      <div data-v-ui-642ff821094a class="loyalty-history"><h3 data-v-ui-642ff821094a>Последние операции</h3><article data-v-ui-642ff821094a v-for="entry in loyaltyAccountEditor.entries" :key="entry.id"><div data-v-ui-642ff821094a><b data-v-ui-642ff821094a>{{ entry.reason }}</b><small data-v-ui-642ff821094a>{{ new Date(entry.createdAt).toLocaleString('ru-RU') }}</small></div><strong data-v-ui-642ff821094a :class="{ minus: entry.amount < 0 }">{{ entry.amount > 0 ? '+' : '' }}{{ entry.amount }}</strong></article><p data-v-ui-642ff821094a v-if="!loyaltyAccountEditor.entries.length">Операций ещё нет</p></div>
      </div>
    </div>
  </aside>
  <AdminOrderDrawer v-if="active === 'orders' && route.path.startsWith('/crm/')" />
</template>
