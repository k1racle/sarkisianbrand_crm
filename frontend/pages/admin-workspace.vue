<script setup lang="ts">
import { Award, Coins, Eye, Gift, ImagePlus, Plus, RefreshCw, Save, Search, Trash2, X } from "@lucide/vue";
const config = useRuntimeConfig();
const route = useRoute();
const { token, user } = useWorkspaceSession();
const productEditor = useState<any | null>("admin-product-editor", () => null);
const selected = useState<any | null>("admin-order-selected", () => null);
const notice = ref("");
const search = ref("");
const statusFilter = ref("");
const { openContextMenu, copyText } = useContextMenu();
const siteSections = ["dashboard", "appearance", "catalog-menu", "pages", "orders", "products", "customers", "loyalty", "promotions", "gift-cards"];
const initialSection = String(route.query.section || "dashboard");
const active = ref(siteSections.includes(initialSection) ? initialSection : "dashboard");
watch(
  () => route.query.section,
  (v) => {
    if (typeof v === "string")
      active.value = siteSections.includes(v) ? v : "dashboard";
  },
  { immediate: true },
);
const dashboard = ref<any>(null);
const products = ref<any[]>([]);
const orders = ref<any[]>([]);
const customers = ref<any[]>([]);
const categories = ref<any[]>([]);
const storefrontSettings = reactive({ announcementText: "SARKISIAN BRAND – это официальный интернет-магазин скоростного мастера-блогера Светланы Саркисян" });
const storefrontBanners = ref<any[]>([]);
const storefrontSocialLinks = ref<any[]>([]);
const storefrontMenuItems = ref<any[]>([]);
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
const savingProduct = ref(false);
const menu = [
  { id: "dashboard", label: "Обзор" },
  { id: "appearance", label: "Витрина" },
  { id: "catalog-menu", label: "Меню каталога" },
  { id: "pages", label: "Страницы" },
  { id: "orders", label: "Заказы" },
  { id: "products", label: "Каталог" },
  { id: "customers", label: "Клиенты" },
  { id: "loyalty", label: "Бонусная программа" },
  { id: "promotions", label: "Промокоды" },
  { id: "gift-cards", label: "Подарочные карты" },
];
const orderStatuses = [
  { id: "NEW", label: "Новый" },
  { id: "CONFIRMED", label: "Подтверждён" },
  { id: "PAID", label: "Оплачен" },
  { id: "ASSEMBLING", label: "Сборка" },
  { id: "SHIPPED", label: "Отправлен" },
  { id: "DELIVERED", label: "Доставлен" },
  { id: "CANCELLED", label: "Отменён" },
  { id: "REFUNDED", label: "Возврат" },
];
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
  if (!token.value || active.value === "catalog-menu") return;
  busy.value = true;
  loadError.value = "";
  const headers = { Authorization: `Bearer ${token.value}` };
  try {
    [
      dashboard.value,
      products.value,
      orders.value,
      customers.value,
      categories.value,
    ] = await Promise.all([
      $fetch("/admin/dashboard", { baseURL: config.public.apiBase, headers }),
      $fetch<any[]>("/admin/products", {
        baseURL: config.public.apiBase,
        headers,
      }),
      $fetch<any[]>("/admin/orders", {
        baseURL: config.public.apiBase,
        headers,
      }),
      $fetch<any[]>("/crm/customers", {
        baseURL: config.public.apiBase,
        headers,
      }),
      $fetch<any[]>("/admin/categories", {
        baseURL: config.public.apiBase,
        headers,
      }),
    ]);
    const [storefront, loyalty] = await Promise.all([
      $fetch<any>("/admin/storefront", { baseURL: config.public.apiBase, headers }),
      ["ADMIN", "MANAGER_SALES", "SUPERVISOR"].includes(user.value?.role || "")
        ? $fetch<any>("/loyalty/admin/overview", { baseURL: config.public.apiBase, headers })
        : Promise.resolve(null),
    ]);
    storefrontSettings.announcementText =
      storefront.settings?.announcementText || storefrontSettings.announcementText;
    storefrontBanners.value = storefront.banners || [];
    storefrontSocialLinks.value = storefront.socialLinks || [];
    storefrontMenuItems.value = storefront.menuItems || [];
    categories.value = storefront.categories || categories.value;
    if (loyalty) {
      loyaltyDashboard.value = loyalty;
      Object.assign(loyaltySettings, loyalty.settings);
    }
  } catch (error: any) {
    loadError.value = error?.data?.message || "Не удалось загрузить данные админки. Попробуйте ещё раз.";
  } finally {
    busy.value = false;
  }
}

async function saveLoyaltySettings() {
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
    if (loyaltyDashboard.value) loyaltyDashboard.value.settings = saved;
    notice.value = "Настройки бонусной программы сохранены";
    setTimeout(() => (notice.value = ""), 2200);
  } finally { savingLoyalty.value = false; }
}

function openLoyaltyAccount(account: any) {
  loyaltyAccountEditor.value = { ...account, entries: [...(account.entries || [])] };
  loyaltyAdjustment.type = "ACCRUAL";
  loyaltyAdjustment.amount = 100;
  loyaltyAdjustment.reason = "";
}

async function applyLoyaltyAdjustment() {
  if (!loyaltyAccountEditor.value || !loyaltyAdjustment.reason.trim() || loyaltyAdjustment.amount < 1) {
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
async function saveStorefrontSettings() {
  savingAppearance.value = true;
  try {
    await $fetch("/admin/storefront/settings", {
      baseURL: config.public.apiBase,
      method: "PATCH",
      headers: { Authorization: `Bearer ${token.value}` },
      body: storefrontSettings,
    });
    notice.value = "Текст верхней строки сохранён";
    setTimeout(() => (notice.value = ""), 2200);
  } finally {
    savingAppearance.value = false;
  }
}
function addStorefrontBanner() {
  storefrontBanners.value.unshift({
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
async function saveStorefrontBanner(banner: any) {
  if (!banner.imageUrl) {
    notice.value = "Сначала выберите изображение баннера";
    return;
  }
  savingAppearance.value = true;
  try {
    const body = {
      title: banner.title || undefined,
      subtitle: banner.subtitle || undefined,
      buttonLabel: banner.buttonLabel,
      linkUrl: banner.linkUrl,
      imageUrl: banner.imageUrl,
      mobileImageUrl: banner.mobileImageUrl || undefined,
      isActive: banner.isActive,
      sortOrder: Number(banner.sortOrder || 0),
    };
    const saved = await $fetch<any>(
      banner._new ? "/admin/storefront/banners" : `/admin/storefront/banners/${banner.id}`,
      {
        baseURL: config.public.apiBase,
        method: banner._new ? "POST" : "PATCH",
        headers: { Authorization: `Bearer ${token.value}` },
        body,
      },
    );
    Object.assign(banner, saved, { _new: false });
    notice.value = "Баннер сохранён";
    setTimeout(() => (notice.value = ""), 2200);
  } finally {
    savingAppearance.value = false;
  }
}
async function deleteStorefrontBanner(banner: any) {
  if (!window.confirm("Удалить этот баннер? Отменить действие будет нельзя.")) return;
  if (!banner._new) {
    await $fetch(`/admin/storefront/banners/${banner.id}`, {
      baseURL: config.public.apiBase,
      method: "DELETE",
      headers: { Authorization: `Bearer ${token.value}` },
    });
  }
  storefrontBanners.value = storefrontBanners.value.filter((item) => item !== banner);
  notice.value = "Баннер удалён";
  setTimeout(() => (notice.value = ""), 2200);
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
async function saveStorefrontMenuItem(item: any) {
  if (!item.label?.trim() || !item.url?.trim()) { notice.value = "Заполните название и ссылку пункта меню"; return; }
  savingAppearance.value = true;
  try {
    const saved = await $fetch<any>(item._new ? "/admin/storefront/menu-items" : `/admin/storefront/menu-items/${item.id}`, {
      baseURL: config.public.apiBase, method: item._new ? "POST" : "PATCH",
      headers: { Authorization: `Bearer ${token.value}` },
      body: { label: item.label.trim(), url: item.url.trim(), isActive: item.isActive, newTab: item.newTab, sortOrder: Number(item.sortOrder) || 0 },
    });
    Object.assign(item, saved, { _new: false });
    storefrontMenuItems.value.sort((a, b) => a.sortOrder - b.sortOrder);
    notice.value = "Пункт меню сохранён";
  } catch (error: any) {
    notice.value = Array.isArray(error?.data?.message) ? error.data.message.join(". ") : (error?.data?.message || "Не удалось сохранить пункт меню");
  } finally {
    savingAppearance.value = false;
    setTimeout(() => (notice.value = ""), 4000);
  }
}
async function deleteStorefrontMenuItem(item: any) {
  if (!confirm(`Удалить пункт «${item.label || 'Новый пункт'}» из меню? Сама страница останется на сайте.`)) return;
  savingAppearance.value = true;
  try {
    if (!item._new) await $fetch(`/admin/storefront/menu-items/${item.id}`, { baseURL: config.public.apiBase, method: "DELETE", headers: { Authorization: `Bearer ${token.value}` } });
    storefrontMenuItems.value = storefrontMenuItems.value.filter(row => row !== item);
    notice.value = "Пункт меню удалён";
  } catch { notice.value = "Не удалось удалить пункт меню"; }
  finally { savingAppearance.value = false; }
}

function addStorefrontSocialLink() {
  storefrontSocialLinks.value.push({ id: `new-social-${Date.now()}`, _new: true, name: "", iconKey: "vk", url: "", isActive: true, sortOrder: storefrontSocialLinks.value.length });
}
async function saveStorefrontSocialLink(social: any) {
  if (!social.name.trim() || !social.url.trim()) {
    notice.value = "Укажите название и ссылку социальной сети";
    return;
  }
  savingAppearance.value = true;
  try {
    const body = { name: social.name.trim(), iconKey: social.iconKey, url: social.url.trim(), isActive: social.isActive, sortOrder: Number(social.sortOrder || 0) };
    const saved = await $fetch<any>(social._new ? "/admin/storefront/social-links" : `/admin/storefront/social-links/${social.id}`, {
      baseURL: config.public.apiBase,
      method: social._new ? "POST" : "PATCH",
      headers: { Authorization: `Bearer ${token.value}` },
      body,
    });
    Object.assign(social, saved, { _new: false });
    notice.value = "Социальная сеть сохранена";
    setTimeout(() => (notice.value = ""), 2200);
  } finally {
    savingAppearance.value = false;
  }
}
async function deleteStorefrontSocialLink(social: any) {
  if (!window.confirm(`Удалить «${social.name || "социальную сеть"}» из сайта?`)) return;
  if (!social._new) await $fetch(`/admin/storefront/social-links/${social.id}`, { baseURL: config.public.apiBase, method: "DELETE", headers: { Authorization: `Bearer ${token.value}` } });
  storefrontSocialLinks.value = storefrontSocialLinks.value.filter((item) => item !== social);
  notice.value = "Социальная сеть удалена";
  setTimeout(() => (notice.value = ""), 2200);
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
    nameRu: product.nameRu,
    descriptionRu: product.descriptionRu || "",
    purposesText: (product.purposes || []).join(', '),
    featuresText: (product.features || []).join(', '),
    price: Number(product.variants?.[0]?.price || product.basePrice || 0),
    stock: product.variants?.[0]?.stock || 0,
    isActive: product.isActive,
    images: (product.images || []).map((image: any) => ({
      url: image.url,
      alt: image.alt || "",
    })),
    categoryIds: (product.categories || []).map((item: any) => item.categoryId),
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
  await $fetch(`/admin/orders/${order.orderNumber}/status`, {
    baseURL: config.public.apiBase,
    method: "PATCH",
    headers: { Authorization: `Bearer ${token.value}` },
    body: { status },
  });
  order.status = status;
  order.isSynced1C = false;
  order.oneCSyncError = null;
  notice.value = "Статус обновлён и передаётся в 1С";
  setTimeout(() => (notice.value = ""), 2200);
}
function go(section: string) {
  navigateTo(`/admin-workspace?section=${section}`);
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
  const index = orderStatuses.findIndex((item) => item.id === order.status);
  const next = orderStatuses[index + 1];
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
      ...(next
        ? [
            {
              label: `Статус: ${next.label}`,
              icon: "status" as const,
              separator: true,
              action: () => updateOrder(order, next.id),
            },
          ]
        : []),
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
  const row = (event.target as HTMLElement).closest(".table .row:not(.head)");
  if (!row) return;
  const rows = Array.from(document.querySelectorAll(".table .row:not(.head)"));
  const index = rows.indexOf(row);
  if (products.value[index]) editProduct(products.value[index]);
}
watch(active, () => { if (!dashboard.value && !busy.value) load(); });
onMounted(() => {
  load();
  document
    .querySelector(".site-admin-console")
    ?.addEventListener("dblclick", openProductFromTable);
});
onBeforeUnmount(() =>
  document
    .querySelector(".site-admin-console")
    ?.removeEventListener("dblclick", openProductFromTable),
);
</script>
<template>
  <main class="site-admin-console">
    <WorkspaceLoading v-if="!dashboard && active !== 'catalog-menu' && !loadError" label="Загружаем управление сайтом" />
    <section v-else-if="!dashboard && active !== 'catalog-menu' && loadError" class="panel admin-load-error" role="alert"><h1>Управление сайтом</h1><p>{{ loadError }}</p><button type="button" :disabled="busy" @click="load">Повторить загрузку</button></section>
    <template v-else
      ><header
        class="site-admin-header"
        :class="{ 'has-new-product': active === 'products' }"
      >
        <div class="site-admin-heading">
          <p class="kicker">
            SARKISIAN / {{ menu.find((m) => m.id === active)?.label }}
          </p>
          <h1>{{ menu.find((m) => m.id === active)?.label }}</h1>
        </div>
        <div v-if="active !== 'catalog-menu'" class="header-actions">
          <button @click="load">
            <RefreshCw :size="16" :class="{ spin: busy }" /> Обновить
          </button>
        </div>
      </header>
      <div class="admin-body">
        <section v-if="active === 'dashboard'">
          <div class="kpi-grid">
            <article>
              <span>Заказы</span><strong>{{ dashboard.orders }}</strong
              ><small>всего заказов</small>
            </article>
            <article>
              <span>Оплачено</span
              ><strong class="green">{{ dashboard.paidOrders }}</strong
              ><small>успешных оплат</small>
            </article>
            <article>
              <span>Клиенты</span><strong>{{ dashboard.customers }}</strong
              ><small>зарегистрированных</small>
            </article>
            <article>
              <span>Активный каталог</span
              ><strong>{{ dashboard.products }}</strong
              ><small>товаров опубликовано</small>
            </article>
          </div>
          <div class="welcome">
            <div>
              <p class="kicker">ПАНЕЛЬ УПРАВЛЕНИЯ</p>
              <h2>Добро пожаловать в SARKISIAN</h2>
              <p>Все ключевые операции магазина — в одном месте.</p>
            </div>
            <div class="quick">
              <button @click="go('products')">Управлять каталогом</button
              ><button @click="go('orders')">Обработать заказы</button
              >
            </div>
          </div>
        </section>
        <SitePagesEditor v-else-if="active === 'pages'" />
        <SiteCatalogMenuEditor v-else-if="active === 'catalog-menu'" :api-base="String(config.public.apiBase)" :token="token" />
        <SitePromoCodesEditor v-else-if="active === 'promotions'" :api-base="String(config.public.apiBase)" :token="token" />
        <SiteGiftCardsEditor v-else-if="active === 'gift-cards'" :api-base="String(config.public.apiBase)" :token="token" :role="user?.role" />
        <section v-else-if="active === 'appearance'" class="appearance-workspace">
          <article class="panel appearance-panel">
            <div class="panel-head">
              <div><p class="kicker">ВЕРХНЯЯ СТРОКА</p><h2>Информационное сообщение</h2><span>Текст отображается над основной шапкой сайта</span></div>
            </div>
            <div class="appearance-form">
              <label>Текст верхней строки<textarea v-model="storefrontSettings.announcementText" maxlength="280" rows="3"></textarea><small>{{ storefrontSettings.announcementText.length }} / 280</small></label>
              <button class="appearance-save" :disabled="savingAppearance" @click="saveStorefrontSettings"><Save :size="16" /> Сохранить текст</button>
            </div>
          </article>

          <article class="panel appearance-panel menu-settings-panel">
            <div class="panel-head appearance-panel-head">
              <div><p class="kicker">НАВИГАЦИЯ</p><h2>Меню сайта</h2><span>Пункты отображаются в центре шапки на ПК и в мобильном меню. Страницы: /about, /delivery, /contacts, /club. Их содержимое редактируется в разделе «Страницы».</span></div>
              <button class="appearance-add" @click="addStorefrontMenuItem"><Plus :size="16" /> Добавить пункт</button>
            </div>
            <div class="menu-admin-list">
              <section v-for="item in storefrontMenuItems" :key="item.id" class="menu-admin-row">
                <label>Название<input v-model="item.label" maxlength="60" placeholder="О бренде" /></label>
                <label>Ссылка<input v-model="item.url" maxlength="500" placeholder="/#about или /страница" /></label>
                <label>Порядок<input v-model.number="item.sortOrder" type="number" min="0" max="10000" /></label>
                <label class="banner-active"><input v-model="item.isActive" type="checkbox" /> Показывать</label>
                <label class="banner-active"><input v-model="item.newTab" type="checkbox" /> В новой вкладке</label>
                <div class="menu-admin-actions"><button :disabled="savingAppearance" aria-label="Сохранить пункт меню" @click="saveStorefrontMenuItem(item)"><Save :size="16" /></button><button class="danger" :disabled="savingAppearance" aria-label="Удалить пункт меню" @click="deleteStorefrontMenuItem(item)"><Trash2 :size="16" /></button></div>
              </section>
              <div v-if="!storefrontMenuItems.length" class="appearance-empty"><span>Меню пока пустое — добавьте ссылки на страницы сайта.</span></div>
            </div>
          </article>

          <article class="panel appearance-panel">
            <div class="panel-head appearance-panel-head">
              <div><p class="kicker">ГЛАВНЫЙ ЭКРАН</p><h2>Баннеры</h2><span>Можно создать несколько баннеров — на сайте они сменяются автоматически</span></div>
              <button class="appearance-add" @click="addStorefrontBanner"><Plus :size="16" /> Новый баннер</button>
            </div>
            <div class="banner-admin-list">
              <section v-for="banner in storefrontBanners" :key="banner.id" class="banner-admin-card">
                <div class="banner-admin-preview" :class="{ empty: !banner.imageUrl }">
                  <img v-if="banner.imageUrl" :src="storefrontPreview(banner.imageUrl)" alt="Предпросмотр баннера" />
                  <ImagePlus v-else :size="30" />
                </div>
                <div class="banner-admin-fields">
                  <AdminMediaPicker v-model="banner.imageUrl" :disabled="savingAppearance" :show-preview="false" label="Изображение баннера" />
                  <label>Описание изображения<input v-model="banner.title" placeholder="Для доступности, не выводится поверх фото" /></label>
                  <label>Внутреннее описание<textarea v-model="banner.subtitle" rows="2" placeholder="Не выводится поверх баннера"></textarea></label>
                  <div class="banner-admin-row"><label>Описание перехода<input v-model="banner.buttonLabel" /></label><label>Ссылка<input v-model="banner.linkUrl" placeholder="/catalog" /></label></div>
                  <div class="banner-admin-row compact-row"><label>Порядок<input v-model.number="banner.sortOrder" type="number" min="0" /></label><label class="banner-active"><input v-model="banner.isActive" type="checkbox" /> Показывать на сайте</label></div>
                  <AdminMediaPicker v-model="banner.mobileImageUrl" :disabled="savingAppearance" :show-preview="false" label="Изображение для телефона — необязательно" />
                  <div class="banner-admin-actions"><button :disabled="savingAppearance || uploadingMedia" @click="saveStorefrontBanner(banner)"><Save :size="15" /> Сохранить</button><button class="danger" @click="deleteStorefrontBanner(banner)"><Trash2 :size="15" /> Удалить</button></div>
                </div>
              </section>
              <div v-if="!storefrontBanners.length" class="appearance-empty"><ImagePlus :size="28" /><span>Баннеров пока нет</span><button @click="addStorefrontBanner">Создать первый баннер</button></div>
            </div>
          </article>

          <article class="panel appearance-panel">
            <div class="panel-head"><div><p class="kicker">КАТАЛОГ</p><h2>Фото категорий</h2><span>Эти изображения используются в блоке категорий на главной странице</span></div></div>
            <div class="category-admin-grid">
              <section v-for="(category, index) in categories" :key="category.id">
                <div><img v-if="category.imageUrl" :src="storefrontPreview(category.imageUrl)" :alt="category.nameRu" /><img v-else :src="storefrontCategories[index % storefrontCategories.length].image" :alt="category.nameRu" /></div>
                <span><b>{{ category.nameRu }}</b><small>{{ category.slug }}</small></span>
                <footer class="category-admin-media"><AdminMediaPicker :model-value="category.imageUrl || ''" :disabled="uploadingMedia" :show-preview="false" label="Фото категории" @update:model-value="saveCategoryImage(category, $event)" /></footer>
              </section>
            </div>
          </article>

          <article class="panel appearance-panel">
            <div class="panel-head appearance-panel-head">
              <div><p class="kicker">ПОДВАЛ САЙТА</p><h2>Социальные сети</h2><span>Добавляйте ссылки, меняйте порядок и скрывайте временно неиспользуемые каналы</span></div>
              <button class="appearance-add" @click="addStorefrontSocialLink"><Plus :size="16" /> Добавить соцсеть</button>
            </div>
            <div class="social-admin-list">
              <section v-for="social in storefrontSocialLinks" :key="social.id" class="social-admin-row">
                <div class="social-admin-icon"><img v-if="['vk', 'telegram', 'max'].includes(social.iconKey)" :src="`/storefront/icons/${social.iconKey}.svg`" alt="" /><span v-else>↗</span></div>
                <label>Название<input v-model="social.name" placeholder="Например, ВКонтакте" /></label>
                <label>Иконка<select v-model="social.iconKey"><option value="vk">ВКонтакте</option><option value="telegram">Telegram</option><option value="max">MAX</option><option value="link">Другая ссылка</option></select></label>
                <label class="social-url">Ссылка<input v-model="social.url" placeholder="https://..." /></label>
                <label>Порядок<input v-model.number="social.sortOrder" type="number" min="0" /></label>
                <label class="banner-active"><input v-model="social.isActive" type="checkbox" /> Показывать</label>
                <div class="social-admin-actions"><button :disabled="savingAppearance" @click="saveStorefrontSocialLink(social)"><Save :size="15" /></button><button class="danger" @click="deleteStorefrontSocialLink(social)"><Trash2 :size="15" /></button></div>
              </section>
              <div v-if="!storefrontSocialLinks.length" class="appearance-empty"><span>Социальные сети пока не добавлены</span><button @click="addStorefrontSocialLink"><Plus :size="15" /> Добавить первую</button></div>
            </div>
          </article>
        </section>
        <section v-else-if="active === 'loyalty'" class="loyalty-workspace">
          <template v-if="loyaltyDashboard">
            <div class="loyalty-kpis">
              <article><i><Award :size="20" /></i><span>Участники</span><strong>{{ loyaltyDashboard.summary.participants }}</strong><small>зарегистрированных клиентов</small></article>
              <article><i><Coins :size="20" /></i><span>На балансах</span><strong>{{ Number(loyaltyDashboard.summary.activeBalances).toLocaleString('ru-RU') }}</strong><small>доступных бонусов</small></article>
              <article><i><Plus :size="20" /></i><span>Начислено</span><strong>{{ Number(loyaltyDashboard.summary.earned).toLocaleString('ru-RU') }}</strong><small>за всё время</small></article>
              <article><i><Gift :size="20" /></i><span>Использовано</span><strong>{{ Number(loyaltyDashboard.summary.spent).toLocaleString('ru-RU') }}</strong><small>{{ loyaltyDashboard.summary.operations }} операций</small></article>
            </div>

            <article class="panel loyalty-settings-panel">
              <div class="loyalty-program-preview">
                <small>БОНУСНАЯ ПРОГРАММА</small>
                <h2>{{ loyaltySettings.programName }}</h2>
                <p>{{ loyaltySettings.isEnabled ? 'Программа работает' : 'Начисления приостановлены' }}</p>
                <div><b>{{ loyaltySettings.earnPercent }}%</b><span>базовое начисление<br />с каждой покупки</span></div>
                <i><span :style="{ width: `${Math.min(100, loyaltySettings.maxWriteOffPercent)}%` }"></span></i>
                <footer><span>Можно списать</span><strong>до {{ loyaltySettings.maxWriteOffPercent }}%</strong></footer>
              </div>
              <div class="loyalty-settings-form">
                <div class="panel-head"><div><p class="kicker">ПРАВИЛА ПРОГРАММЫ</p><h2>Начисления и уровни</h2><span>Изменения применяются к новым операциям и не пересчитывают историю</span></div><label class="loyalty-status"><input v-model="loyaltySettings.isEnabled" type="checkbox" /><span>{{ loyaltySettings.isEnabled ? 'Активна' : 'Приостановлена' }}</span></label></div>
                <div class="loyalty-form-grid">
                  <label class="wide">Название программы<input v-model="loyaltySettings.programName" maxlength="80" /></label>
                  <label>Начислять с покупки, %<input v-model.number="loyaltySettings.earnPercent" type="number" min="0" max="100" /></label>
                  <label>Максимум списания, %<input v-model.number="loyaltySettings.maxWriteOffPercent" type="number" min="0" max="100" /></label>
                  <label>За регистрацию<input v-model.number="loyaltySettings.signupBonus" type="number" min="0" /></label>
                  <label>На день рождения<input v-model.number="loyaltySettings.birthdayBonus" type="number" min="0" /></label>
                  <label>Срок действия, дней<input v-model.number="loyaltySettings.bonusValidityDays" type="number" min="1" /></label>
                </div>
                <div class="loyalty-levels">
                  <section><span>СТАРТ</span><b>Базовые условия</b><small>Сразу после регистрации</small></section>
                  <section><span>ПРОФЕССИОНАЛ</span><label>Порог<input v-model.number="loyaltySettings.proThreshold" type="number" min="0" /></label><label>Множитель, %<input v-model.number="loyaltySettings.proMultiplierPercent" type="number" min="100" /></label></section>
                  <section><span>ПРЕМИУМ</span><label>Порог<input v-model.number="loyaltySettings.premiumThreshold" type="number" min="0" /></label><label>Множитель, %<input v-model.number="loyaltySettings.premiumMultiplierPercent" type="number" min="100" /></label></section>
                </div>
                <button class="loyalty-save" :disabled="savingLoyalty" @click="saveLoyaltySettings"><Save :size="16" /> {{ savingLoyalty ? 'Сохраняем…' : 'Сохранить правила' }}</button>
              </div>
            </article>

            <article class="panel loyalty-members-panel">
              <div class="panel-head"><div><p class="kicker">УЧАСТНИКИ</p><h2>Бонусные счета клиентов</h2><span>Открывайте счёт для просмотра истории, начисления или списания</span></div><label class="search"><Search :size="16" /><input v-model="loyaltySearch" placeholder="Имя, email или телефон" /></label></div>
              <div class="loyalty-table">
                <div class="loyalty-row head"><span>Клиент</span><span>Уровень</span><span>Баланс</span><span>Последняя операция</span><span></span></div>
                <div v-for="account in filteredLoyaltyAccounts" :key="account.userId" class="loyalty-row" @click="openLoyaltyAccount(account)" @contextmenu.prevent="loyaltyMenu($event, account)">
                  <div><strong>{{ [account.firstName, account.lastName].filter(Boolean).join(' ') || 'Без имени' }}</strong><small>{{ account.email }}</small></div>
                  <span class="loyalty-level">{{ loyaltyLevelLabel(account.level) }}</span>
                  <strong>{{ Number(account.balance).toLocaleString('ru-RU') }}</strong>
                  <span>{{ account.entries[0] ? `${account.entries[0].amount > 0 ? '+' : ''}${account.entries[0].amount} · ${account.entries[0].reason}` : 'Операций ещё нет' }}</span>
                  <button aria-label="Открыть бонусный счёт" @click.stop="openLoyaltyAccount(account)"><Eye :size="16" /></button>
                </div>
                <div v-if="!filteredLoyaltyAccounts.length" class="appearance-empty">Клиенты не найдены</div>
              </div>
            </article>
          </template>
          <WorkspaceLoading v-else label="Загружаем бонусную программу" />
        </section>
        <section v-else-if="active === 'products'" class="panel">
          <div class="panel-head">
            <div>
              <p class="kicker">ТОВАРЫ И ЦЕНЫ</p>
              <h2>Каталог</h2>
              <span>{{ filteredProducts.length }} позиций</span>
            </div>
            <label class="search"
              ><Search :size="16" /><input
                v-model="search"
                placeholder="Поиск по названию или SKU"
            /></label>
          </div>
          <div class="table">
            <div class="row head">
              <span>Товар</span><span>Цена</span><span>Остаток</span
              ><span>Статус</span><span></span>
            </div>
            <div
              v-for="p in filteredProducts"
              :key="p.id"
              class="row"
              @contextmenu.prevent="productMenu($event, p)"
            >
              <div>
                <strong>{{ p.nameRu }}</strong
                ><small>{{ p.sku }}</small>
              </div>
              <span
                >{{
                  Number(
                    p.variants?.[0]?.price || p.basePrice || 0,
                  ).toLocaleString("ru-RU")
                }}
                ₽</span
              ><span>{{ p.variants?.[0]?.stock || 0 }}</span
              ><span :class="p.isActive ? 'green' : 'red'">{{
                p.isActive ? "Активен" : "Скрыт"
              }}</span
              ><button
                v-if="p.isActive"
                class="icon"
                title="Скрыть товар"
                @click="archiveProduct(p)"
              >
                <X :size="16" />
              </button>
            </div>
            <p v-if="!filteredProducts.length" class="empty">
              Товары не найдены
            </p>
          </div>
        </section>
        <section v-else-if="active === 'orders'" class="panel">
          <div class="panel-head">
            <div>
              <p class="kicker">ОПЕРАЦИИ МАГАЗИНА</p>
              <h2>Заказы</h2>
              <span>{{ filteredOrders.length }} заказов</span>
            </div>
          </div>
          <div class="filters">
            <label class="search"
              ><Search :size="16" /><input
                v-model="search"
                placeholder="Номер заказа или email" /></label
            ><select v-model="statusFilter">
              <option value="">Все статусы</option>
              <option v-for="s in orderStatuses" :key="s.id" :value="s.id">
                {{ s.label }}
              </option></select
            ><button
              v-if="search || statusFilter"
              class="clear"
              @click="
                search = '';
                statusFilter = '';
              "
            >
              Сбросить
            </button>
          </div>
          <div class="table order-table">
            <div class="row head">
              <span>Заказ</span><span>Клиент</span><span>Сумма</span
              ><span>Статус</span><span>Оплата</span><span>1С и склад</span>
            </div>
            <div
              v-for="o in filteredOrders"
              :key="o.id"
              class="row clickable"
              @click="selected = o"
              @contextmenu.prevent="orderMenu($event, o)"
            >
              <strong>{{ o.orderNumber }}</strong
              ><span>{{ o.user?.email || "Гость" }}</span
              ><strong
                >{{
                  Number(o.finalAmount || 0).toLocaleString("ru-RU")
                }}
                ₽</strong
              ><select
                :value="o.status"
                @click.stop
                @change="
                  updateOrder(o, ($event.target as HTMLSelectElement).value)
                "
              >
                <option v-for="s in orderStatuses" :key="s.id" :value="s.id">
                  {{ s.label }}
                </option></select
              ><span>{{ labelStatus(o.paymentStatus) }}</span
              ><span :class="o.oneCSyncError ? 'red' : 'green'">{{
                oneCLabel(o)
              }}</span>
            </div>
            <p v-if="!filteredOrders.length" class="empty">
              Заказов не найдено
            </p>
          </div>
        </section>
        <section v-else-if="active === 'customers'" class="panel">
          <div class="panel-head">
            <div>
              <p class="kicker">КЛИЕНТСКАЯ БАЗА</p>
              <h2>Клиенты</h2>
              <span>{{ customers.length }} профилей</span>
            </div>
          </div>
          <div class="table">
            <div class="row head">
              <span>Клиент</span><span>Email</span><span>Телефон</span
              ><span>Заказы</span><span>Регистрация</span>
            </div>
            <div
              v-for="c in customers"
              :key="c.id"
              class="row"
              @contextmenu.prevent="customerMenu($event, c)"
            >
              <div>
                <strong>{{
                  [c.firstName, c.lastName].filter(Boolean).join(" ") ||
                  "Без имени"
                }}</strong
                ><small>{{ c.role }}</small>
              </div>
              <span>{{ c.email }}</span
              ><span>{{ c.phone || "—" }}</span
              ><span>{{ c._count?.orders || 0 }}</span
              ><span>{{
                new Date(c.createdAt).toLocaleDateString("ru-RU")
              }}</span>
            </div>
          </div>
        </section>
      </div>
    </template>
    <aside
      v-if="selected"
      class="drawer-backdrop"
      @click.self="selected = null"
    >
      <div class="drawer">
        <button class="close" @click="selected = null"><X :size="18" /></button>
        <p class="kicker">ЗАКАЗ</p>
        <h2>{{ selected.orderNumber }}</h2>
        <dl>
          <dt>Клиент</dt>
          <dd>{{ selected.user?.email || "Гость" }}</dd>
          <dt>Сумма</dt>
          <dd>
            {{ Number(selected.finalAmount || 0).toLocaleString("ru-RU") }} ₽
          </dd>
          <dt>Статус</dt>
          <dd>{{ labelStatus(selected.status) }}</dd>
          <dt>Создан</dt>
          <dd>{{ new Date(selected.createdAt).toLocaleString("ru-RU") }}</dd>
          <dt>Передача в 1С</dt>
          <dd :class="selected.oneCSyncError ? 'red' : 'green'">
            {{ oneCLabel(selected) }}
          </dd>
          <dt>Складское задание</dt>
          <dd>{{ selected.warehouseDocumentId || "Ещё не сформировано" }}</dd>
        </dl>
        <p v-if="selected.oneCSyncError" class="sync-error-text">
          {{ selected.oneCSyncError }}
        </p>
      </div>
    </aside>
    <div v-if="notice" class="toast">{{ notice }}</div>
  </main>
  <aside
    v-if="productEditor"
    class="drawer-backdrop"
    @click.self="productEditor = null"
  >
    <div class="drawer product-drawer">
      <button class="close" @click="productEditor = null">
        <X :size="18" />
      </button>
      <p class="kicker">КАТАЛОГ / РЕДАКТИРОВАНИЕ</p>
      <h2>Карточка товара</h2>
      <label>Для чего<input v-model="productEditor.purposesText" maxlength="1600" placeholder="Например: Моделирование, Маникюр" /><small>Несколько назначений — через запятую. Используются в фильтрах сайта.</small></label>
      <label>Особенности<input v-model="productEditor.featuresText" maxlength="1600" placeholder="Например: Прозрачный, Шиммер" /><small>Задавайте только подтверждённые характеристики товара.</small></label>
      <label>Название<input v-model="productEditor.nameRu" /></label
      ><label
        >Цена, ₽<input
          v-model.number="productEditor.price"
          :disabled="productEditor.productType === 'GIFT_CARD'"
          type="number"
          min="0" /></label
      ><label
        >Остаток<input
          v-model.number="productEditor.stock"
          :disabled="productEditor.productType === 'GIFT_CARD'"
          type="number"
          min="0" /></label
      ><label
        >Описание<textarea
          v-model="productEditor.descriptionRu"
          rows="5"
        ></textarea></label
      ><label class="check"
        ><input v-model="productEditor.isActive" type="checkbox" /> Показывать в
        каталоге</label
      ><button class="save" :disabled="savingProduct" @click="saveProduct">
        {{ savingProduct ? "Сохраняем…" : "Сохранить товар" }}
      </button>
    </div>
  </aside>
  <aside v-if="loyaltyAccountEditor" class="drawer-backdrop loyalty-drawer-backdrop" @click.self="loyaltyAccountEditor = null">
    <div class="drawer loyalty-drawer">
      <button class="close" @click="loyaltyAccountEditor = null"><X :size="18" /></button>
      <p class="kicker">БОНУСНЫЙ СЧЁТ</p>
      <h2>{{ [loyaltyAccountEditor.firstName, loyaltyAccountEditor.lastName].filter(Boolean).join(' ') || 'Клиент' }}</h2>
      <span class="loyalty-client-email">{{ loyaltyAccountEditor.email }}</span>
      <div class="loyalty-drawer-balance"><small>Доступно</small><strong>{{ Number(loyaltyAccountEditor.balance).toLocaleString('ru-RU') }}</strong><span>бонусов · {{ loyaltyLevelLabel(loyaltyAccountEditor.level) }}</span></div>
      <div class="loyalty-operation-tabs"><button :class="{ active: loyaltyAdjustment.type === 'ACCRUAL' }" @click="loyaltyAdjustment.type = 'ACCRUAL'">Начислить</button><button :class="{ active: loyaltyAdjustment.type === 'WRITE_OFF' }" @click="loyaltyAdjustment.type = 'WRITE_OFF'">Списать</button></div>
      <div class="loyalty-adjustment-form"><label>Количество бонусов<input v-model.number="loyaltyAdjustment.amount" type="number" min="1" /></label><label>Причина<textarea v-model="loyaltyAdjustment.reason" maxlength="240" rows="3" placeholder="Например, компенсация по обращению"></textarea></label><button :disabled="savingLoyalty" @click="applyLoyaltyAdjustment">{{ savingLoyalty ? 'Проводим операцию…' : loyaltyAdjustment.type === 'ACCRUAL' ? 'Начислить бонусы' : 'Списать бонусы' }}</button></div>
      <div class="loyalty-history"><h3>Последние операции</h3><article v-for="entry in loyaltyAccountEditor.entries" :key="entry.id"><div><b>{{ entry.reason }}</b><small>{{ new Date(entry.createdAt).toLocaleString('ru-RU') }}</small></div><strong :class="{ minus: entry.amount < 0 }">{{ entry.amount > 0 ? '+' : '' }}{{ entry.amount }}</strong></article><p v-if="!loyaltyAccountEditor.entries.length">Операций ещё нет</p></div>
    </div>
  </aside>
</template>
<style scoped>
.admin-main {
  min-height: 100vh;
  background: #f4f5f7;
  color: #202124;
  font-family: var(--sb-font);
}
.admin-login {
  min-height: 100vh;
  display: grid;
  place-items: center;
}
.admin-login form {
  width: min(430px, 90vw);
  padding: 40px;
  background: #fff;
  border: 1px solid #e3e5e8;
  display: grid;
  gap: 14px;
}
.admin-login h1 {
  font-size: 32px;
  margin: 0;
}
.admin-login p:not(.kicker) {
  font-size: 13px;
  line-height: 1.6;
  color: #858991;
}
.admin-login input {
  height: 44px;
  border: 1px solid #dfe1e5;
  padding: 0 12px;
}
.admin-login span {
  font-size: 12px;
  color: #f15b49;
}
.admin-login button,
.save {
  height: 44px;
  border: 0;
  background: #1d1e22;
  color: #fff;
}
.admin-header {
  background: #fff;
  border-bottom: 1px solid #e3e5e8;
  padding: 28px 5%;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
}
.kicker {
  font-size: 10px;
  letter-spacing: 0.16em;
  color: #f15b49;
  margin: 0 0 8px;
}
.admin-header h1 {
  font-size: 32px;
  margin: 0;
}
.header-actions {
  display: flex;
  gap: 8px;
}
.header-actions button,
.header-actions a {
  height: 40px;
  padding: 0 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid #dfe1e5;
  background: #fff;
  text-decoration: none;
  color: #202124;
  font-size: 12px;
}
.spin {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.admin-body {
  max-width: 1240px;
  margin: 0 auto;
  padding: 30px 5%;
}
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}
.kpi-grid article {
  padding: 22px;
  background: #fff;
  border: 1px solid #e3e5e8;
  display: grid;
  gap: 9px;
}
.kpi-grid span,
.kpi-grid small,
.panel-head span {
  font-size: 11px;
  color: #858991;
}
.kpi-grid strong {
  font-size: 28px;
  font-weight: 500;
}
.green {
  color: #2c9566 !important;
}
.red {
  color: #c45c4d !important;
}
.welcome {
  margin-top: 16px;
  background: #1d1e22;
  color: #fff;
  padding: 30px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.welcome h2 {
  font-size: 24px;
  margin: 0;
}
.welcome p:not(.kicker) {
  color: #b8bbc1;
  font-size: 13px;
}
.quick {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.quick button {
  padding: 11px 13px;
  border: 1px solid #555;
  background: #2c2e32;
  color: #fff;
  font-size: 11px;
}
.panel {
  background: #fff;
  border: 1px solid #e3e5e8;
}
.panel-head {
  padding: 25px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}
.panel-head h2 {
  font-size: 21px;
  margin: 0 0 6px;
}
.search {
  height: 36px;
  border: 1px solid #dfe1e5;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 10px;
  color: #858991;
  min-width: 300px;
}
.search input {
  border: 0;
  outline: 0;
  width: 100%;
  font-size: 12px;
}
.table {
  overflow: auto;
}
.row {
  display: grid;
  grid-template-columns: 2fr 1.2fr 1fr 1fr 1fr;
  gap: 14px;
  align-items: center;
  padding: 14px 25px;
  border-top: 1px solid #eff0f2;
  min-width: 800px;
  font-size: 12px;
}
.row div {
  display: grid;
  gap: 4px;
}
.row small {
  color: #858991;
  font-size: 10px;
}
.row.head {
  font-size: 10px;
  color: #858991;
  text-transform: uppercase;
}
.row select {
  height: 30px;
  border: 1px solid #dfe1e5;
  background: #fff;
  font-size: 11px;
}
.clickable {
  cursor: pointer;
}
.clickable:hover {
  background: #fafafa;
}
.filters {
  display: flex;
  gap: 8px;
  padding: 0 25px 18px;
  border-bottom: 1px solid #eff0f2;
}
.filters select {
  height: 36px;
  border: 1px solid #dfe1e5;
  background: #fff;
  padding: 0 10px;
}
.clear {
  border: 0;
  background: transparent;
  color: #f15b49;
  font-size: 11px;
}
.empty {
  text-align: center;
  color: #858991;
  padding: 35px;
  font-size: 12px;
}
.compact {
  margin: 0 25px 25px;
}
.settings {
  padding-bottom: 25px;
}
.settings .panel-head {
  padding-bottom: 20px;
}
.settings-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  padding: 0 25px;
}
.settings-grid label {
  display: grid;
  gap: 7px;
  color: #858991;
  font-size: 11px;
}
.settings-grid input {
  height: 40px;
  border: 1px solid #dfe1e5;
  padding: 0 10px;
}
.save {
  margin: 22px 25px 0;
  padding: 0 18px;
}
.drawer-backdrop {
  position: fixed;
  inset: 0;
  background: #0004;
  z-index: 200;
}
.drawer {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: min(430px, 90vw);
  background: #fff;
  padding: 38px;
}
.close {
  position: absolute;
  right: 20px;
  top: 20px;
  border: 0;
  background: none;
}
.drawer h2 {
  font-size: 28px;
  margin: 0 0 25px;
}
.drawer dl {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  border-top: 1px solid #ececef;
  padding-top: 20px;
}
.drawer dt {
  font-size: 11px;
  color: #858991;
}
.drawer dd {
  font-size: 12px;
  margin: 0;
}
.toast {
  position: fixed;
  right: 24px;
  bottom: 24px;
  background: #1d1e22;
  color: #fff;
  padding: 13px 18px;
  font-size: 12px;
  z-index: 300;
}
@media (max-width: 900px) {
  .kpi-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .welcome {
    align-items: flex-start;
    gap: 20px;
    flex-direction: column;
  }
  .quick {
    justify-content: flex-start;
  }
  .header-actions {
    flex-direction: column;
  }
  .settings-grid {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 600px) {
  .admin-header {
    align-items: flex-start;
    gap: 18px;
    flex-direction: column;
  }
  .admin-body {
    padding: 20px 16px;
  }
  .panel-head {
    gap: 16px;
    flex-direction: column;
  }
  .search {
    min-width: 0;
    width: 100%;
    box-sizing: border-box;
  }
  .kpi-grid {
    gap: 8px;
  }
  .kpi-grid article {
    padding: 15px;
  }
}
.order-table .row {
  grid-template-columns: 1.7fr 1.2fr 0.8fr 1fr 0.9fr 1.1fr;
  min-width: 980px;
}
.compact {
  grid-template-columns: repeat(4, 1fr);
}
.sync-error-text {
  margin-top: 20px;
  padding: 12px;
  background: #fff0ed;
  color: #a74436;
  font-size: 11px;
  line-height: 1.5;
}
</style>
<style scoped>
/* Внутренняя часть сайта следует тому же стеклянному дизайн-коду, что и витрина. */
.site-admin-console {
  background:
    radial-gradient(circle at 2% 10%, rgba(203,198,193,.20), transparent 30rem),
    radial-gradient(circle at 98% 45%, rgba(198,207,218,.22), transparent 38rem),
    linear-gradient(180deg, #faf9f8, #f3f1ee 52%, #faf9f8);
  color: #171717;
}
.site-admin-header {
  min-height: 120px;
  margin: 12px 16px 0;
  padding: 24px clamp(24px, 4vw, 54px);
  border: 1px solid rgba(255,255,255,.82);
  border-radius: 26px;
  background: linear-gradient(135deg, rgba(255,255,255,.88), rgba(255,255,255,.62));
  box-shadow: inset 0 1px 0 #fff, 0 16px 45px rgba(31,27,25,.07);
  backdrop-filter: blur(24px) saturate(145%);
}
.site-admin-heading .kicker,
.panel-head .kicker { color: #76726f; }
.site-admin-header h1 { font-size: 36px; letter-spacing: -.045em; font-weight: 600; }
.header-actions button,
.header-actions a,
.appearance-save,
.appearance-add,
.banner-admin-actions button,
.appearance-empty button,
.loyalty-save {
  min-height: 44px;
  border: 1px solid #171717;
  border-radius: 14px;
  background: #171717;
  color: #fff;
  box-shadow: 0 11px 25px rgba(20,18,17,.13);
}
.admin-body { max-width: 1380px; padding: 30px clamp(16px, 4vw, 54px) 80px; }
.panel,
.kpi-grid article {
  border: 1px solid rgba(255,255,255,.84);
  border-radius: 24px;
  background: linear-gradient(135deg, rgba(255,255,255,.84), rgba(249,247,245,.66));
  box-shadow: inset 0 1px 0 #fff, 0 18px 48px rgba(31,27,25,.06);
  backdrop-filter: blur(22px) saturate(135%);
}
.kpi-grid { gap: 14px; }
.kpi-grid article { min-height: 130px; padding: 24px; }
.welcome { border-radius: 24px; background: linear-gradient(145deg, #282625, #111); box-shadow: 0 24px 60px rgba(20,18,17,.16); }
.quick button { min-height: 42px; padding: 0 15px; border: 1px solid rgba(255,255,255,.15); border-radius: 13px; background: rgba(255,255,255,.08); }
.search { height: 44px; border-color: rgba(28,27,26,.11); border-radius: 14px; background: rgba(255,255,255,.66); }
.row { min-height: 58px; }
.row.clickable:hover,
.loyalty-row:hover { background: rgba(255,255,255,.64); }
.appearance-workspace { gap: 22px; }
.banner-admin-card,
.category-admin-grid > section,
.social-admin-row { border-color: rgba(28,27,26,.09); border-radius: 18px; background: rgba(255,255,255,.50); }
.banner-admin-preview { border-radius: 14px; }
.category-admin-grid > section > div { border-radius: 17px 17px 0 0; }
.appearance-form textarea,
.banner-admin-fields input:not([type="checkbox"]),
.banner-admin-fields textarea,
.social-admin-row input:not([type="checkbox"]),
.social-admin-row select { border-radius: 11px; background: rgba(255,255,255,.78); }

.loyalty-workspace { display: grid; gap: 22px; }
.loyalty-kpis { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }
.loyalty-kpis article { min-height: 150px; padding: 24px; display: grid; align-content: space-between; gap: 8px; border: 1px solid rgba(255,255,255,.84); border-radius: 23px; background: rgba(255,255,255,.64); box-shadow: inset 0 1px 0 #fff, 0 17px 44px rgba(31,27,25,.06); backdrop-filter: blur(20px); }
.loyalty-kpis i { width: 40px; height: 40px; border-radius: 13px; display: grid; place-items: center; background: #ece9e6; color: #171717; }
.loyalty-kpis span,
.loyalty-kpis small { color: #7d7976; font-size: 10px; }
.loyalty-kpis strong { font-size: 29px; font-weight: 550; letter-spacing: -.04em; }
.loyalty-settings-panel { padding: 16px; display: grid; grid-template-columns: minmax(280px, .72fr) minmax(560px, 1.28fr); gap: 26px; }
.loyalty-program-preview { min-height: 410px; padding: 34px; box-sizing: border-box; border-radius: 23px; display: flex; flex-direction: column; color: #fff; background: radial-gradient(circle at 88% 12%, rgba(166,145,231,.78), transparent 36%), radial-gradient(circle at 4% 100%, rgba(64,129,174,.70), transparent 48%), linear-gradient(145deg, #373050, #57547a 56%, #343549); box-shadow: inset 0 1px 0 rgba(255,255,255,.28), 0 25px 58px rgba(11,10,22,.25); }
.loyalty-program-preview > small { color: rgba(255,255,255,.64); font-size: 9px; letter-spacing: .16em; }
.loyalty-program-preview h2 { margin: 10px 0 5px; font-size: 26px; }
.loyalty-program-preview > p { margin: 0; color: rgba(255,255,255,.66); font-size: 10px; }
.loyalty-program-preview > div { margin-top: auto; display: flex; align-items: end; gap: 14px; }
.loyalty-program-preview > div b { font-size: 62px; line-height: .9; font-weight: 500; letter-spacing: -.06em; }
.loyalty-program-preview > div span { color: rgba(255,255,255,.68); font-size: 10px; line-height: 1.5; }
.loyalty-program-preview > i { height: 8px; margin-top: 34px; border-radius: 8px; overflow: hidden; background: rgba(255,255,255,.17); }
.loyalty-program-preview > i span { display: block; height: 100%; border-radius: inherit; background: #fff; transition: width .25s ease; }
.loyalty-program-preview footer { margin-top: 10px; display: flex; justify-content: space-between; color: rgba(255,255,255,.62); font-size: 9px; }
.loyalty-program-preview footer strong { color: #fff; font-weight: 500; }
.loyalty-settings-form { min-width: 0; padding: 4px 8px 8px 0; }
.loyalty-settings-form .panel-head { padding: 10px 0 22px; }
.loyalty-status { min-width: 128px; height: 42px; padding: 0 13px; border-radius: 13px; display: flex; align-items: center; gap: 8px; background: #ece9e6; font-size: 10px; }
.loyalty-status input { accent-color: #171717; }
.loyalty-form-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.loyalty-form-grid label,
.loyalty-levels label,
.loyalty-adjustment-form label { display: grid; gap: 7px; color: #7d7976; font-size: 10px; }
.loyalty-form-grid label.wide { grid-column: span 2; }
.loyalty-form-grid input,
.loyalty-levels input,
.loyalty-adjustment-form input,
.loyalty-adjustment-form textarea { width: 100%; height: 42px; padding: 0 11px; box-sizing: border-box; border: 1px solid rgba(28,27,26,.11); border-radius: 11px; background: rgba(255,255,255,.76); color: #171717; outline: 0; font: 11px var(--sb-font); }
.loyalty-adjustment-form textarea { height: auto; padding-block: 11px; resize: vertical; }
.loyalty-levels { margin-top: 16px; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 9px; }
.loyalty-levels section { min-height: 118px; padding: 15px; border: 1px solid rgba(28,27,26,.08); border-radius: 15px; display: grid; align-content: start; gap: 9px; background: rgba(245,243,241,.70); }
.loyalty-levels section > span { color: #7d7976; font-size: 8px; letter-spacing: .12em; }
.loyalty-levels section > b { font-size: 13px; }
.loyalty-levels section > small { color: #8b8784; font-size: 9px; }
.loyalty-levels section label { grid-template-columns: 1fr 74px; align-items: center; }
.loyalty-levels input { height: 34px; }
.loyalty-save { margin-top: 18px; padding: 0 17px; display: inline-flex; align-items: center; gap: 8px; }
.loyalty-members-panel { overflow: hidden; }
.loyalty-table { overflow-x: auto; }
.loyalty-row { min-width: 940px; min-height: 64px; padding: 0 25px; display: grid; grid-template-columns: 1.5fr .8fr .65fr 1.7fr 42px; gap: 16px; align-items: center; border-top: 1px solid rgba(28,27,26,.07); font-size: 11px; cursor: pointer; transition: background .16s ease; }
.loyalty-row.head { min-height: 44px; color: #87837f; font-size: 9px; text-transform: uppercase; letter-spacing: .08em; cursor: default; }
.loyalty-row > div { min-width: 0; display: grid; gap: 4px; }
.loyalty-row small { color: #898581; font-size: 9px; }
.loyalty-row > span:nth-child(4) { overflow: hidden; color: #77736f; text-overflow: ellipsis; white-space: nowrap; }
.loyalty-level { width: max-content; padding: 6px 9px; border-radius: 9px; background: #ece9e6; }
.loyalty-row > button { width: 36px; height: 36px; border: 0; border-radius: 11px; display: grid; place-items: center; background: #171717; color: #fff; }
.loyalty-drawer-backdrop { backdrop-filter: blur(12px); }
.loyalty-drawer { overflow-y: auto; border-radius: 28px 0 0 28px; background: linear-gradient(145deg, rgba(255,255,255,.96), rgba(244,241,238,.91)); box-shadow: -28px 0 80px rgba(18,15,14,.18); }
.loyalty-client-email { display: block; margin-top: -18px; color: #7d7976; font-size: 10px; }
.loyalty-drawer-balance { margin: 25px 0 18px; padding: 25px; border-radius: 20px; display: grid; gap: 6px; color: #fff; background: radial-gradient(circle at 90% 0, rgba(166,145,231,.72), transparent 38%), linear-gradient(145deg, #3d3658, #3c526a); }
.loyalty-drawer-balance small,
.loyalty-drawer-balance span { color: rgba(255,255,255,.67); font-size: 9px; }
.loyalty-drawer-balance strong { font-size: 46px; line-height: 1; font-weight: 500; letter-spacing: -.05em; }
.loyalty-operation-tabs { padding: 5px; border-radius: 14px; display: grid; grid-template-columns: 1fr 1fr; background: #e9e6e3; }
.loyalty-operation-tabs button { height: 38px; border: 0; border-radius: 10px; background: transparent; font-size: 10px; }
.loyalty-operation-tabs button.active { background: #fff; box-shadow: 0 7px 18px rgba(28,23,20,.07); }
.loyalty-adjustment-form { margin-top: 18px; display: grid; gap: 13px; }
.loyalty-adjustment-form > button { height: 44px; border: 0; border-radius: 13px; background: #171717; color: #fff; }
.loyalty-history { margin-top: 30px; }
.loyalty-history h3 { font-size: 14px; }
.loyalty-history article { min-height: 55px; border-top: 1px solid rgba(28,27,26,.09); display: flex; align-items: center; justify-content: space-between; gap: 14px; }
.loyalty-history article div { display: grid; gap: 4px; }
.loyalty-history article b { font-size: 10px; font-weight: 500; }
.loyalty-history article small,
.loyalty-history > p { color: #888480; font-size: 9px; }
.loyalty-history article > strong { color: #267a53; }
.loyalty-history article > strong.minus { color: #6e5650; }
@media (max-width: 1100px) {
  .loyalty-kpis { grid-template-columns: repeat(2, 1fr); }
  .loyalty-settings-panel { grid-template-columns: 1fr; }
  .loyalty-program-preview { min-height: 330px; }
}
@media (max-width: 650px) {
  .site-admin-header { margin: 7px 8px 0; border-radius: 20px; }
  .loyalty-kpis { grid-template-columns: 1fr 1fr; gap: 8px; }
  .loyalty-kpis article { min-height: 125px; padding: 17px; }
  .loyalty-settings-panel { padding: 9px; }
  .loyalty-program-preview { min-height: 300px; padding: 25px; }
  .loyalty-form-grid { grid-template-columns: 1fr 1fr; }
  .loyalty-form-grid label.wide { grid-column: 1 / -1; }
  .loyalty-levels { grid-template-columns: 1fr; }
}
</style>
<style scoped>
.appearance-workspace {
  display: grid;
  gap: 18px;
}
.appearance-panel {
  overflow: hidden;
}
.appearance-panel-head {
  gap: 20px;
}
.appearance-form {
  padding: 0 25px 25px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  gap: 14px;
}
.appearance-form label,
.banner-admin-fields label {
  display: grid;
  gap: 7px;
  color: #858991;
  font-size: 11px;
}
.appearance-form textarea,
.banner-admin-fields input:not([type="checkbox"]),
.banner-admin-fields textarea {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #dfe1e5;
  background: #fff;
  padding: 11px 12px;
  color: #202124;
  font: 12px var(--sb-font);
  outline: 0;
  resize: vertical;
}
.appearance-form textarea:focus,
.banner-admin-fields input:focus,
.banner-admin-fields textarea:focus {
  border-color: #f15b49;
  box-shadow: 0 0 0 3px rgba(241, 91, 73, .08);
}
.appearance-form small {
  justify-self: end;
}
.appearance-save,
.appearance-add,
.banner-admin-actions button,
.appearance-empty button {
  min-height: 40px;
  padding: 0 15px;
  border: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: #1d1e22;
  color: #fff;
  font: 11px var(--sb-font);
  cursor: pointer;
}
.appearance-save:disabled,
.banner-admin-actions button:disabled { opacity: .55; cursor: wait; }
.appearance-add { flex: none; }
.banner-admin-list {
  padding: 0 25px 25px;
  display: grid;
  gap: 14px;
}
.banner-admin-card {
  min-width: 0;
  padding: 14px;
  border: 1px solid #e3e5e8;
  display: grid;
  grid-template-columns: minmax(260px, .9fr) minmax(320px, 1.1fr);
  gap: 18px;
  background: #fafafa;
}
.banner-admin-preview {
  position: relative;
  min-height: 260px;
  overflow: hidden;
  display: grid;
  place-items: center;
  background: #eceff2;
  color: #858991;
}
.banner-admin-preview img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.banner-admin-preview label,
.mobile-image-picker,
.category-admin-grid label {
  position: relative;
  z-index: 2;
  width: max-content;
  min-height: 36px;
  padding: 0 12px;
  border: 1px solid rgba(255,255,255,.65);
  display: inline-flex !important;
  align-items: center;
  justify-content: center;
  gap: 7px;
  background: rgba(29,30,34,.82);
  color: #fff !important;
  font-size: 10px !important;
  cursor: pointer;
  backdrop-filter: blur(12px);
}
.banner-admin-preview input,
.mobile-image-picker input,
.category-admin-grid label input { display: none; }
.banner-admin-fields { min-width: 0; display: grid; gap: 11px; }
.banner-admin-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.compact-row { grid-template-columns: 120px 1fr; align-items: end; }
.banner-active { min-height: 40px; display: flex !important; align-items: center; gap: 8px; color: #202124 !important; }
.banner-active input { accent-color: #f15b49; }
.mobile-image-picker { background: #fff; color: #202124 !important; border-color: #dfe1e5; }
.banner-admin-actions { margin-top: auto; display: flex; gap: 8px; }
.banner-admin-actions .danger { border: 1px solid #ead7d3; background: #fff; color: #b64b3d; }
.appearance-empty { min-height: 180px; display: grid; place-content: center; justify-items: center; gap: 12px; color: #858991; }
.category-admin-grid {
  padding: 0 25px 25px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}
.category-admin-grid > section { min-width: 0; border: 1px solid #e3e5e8; background: #fafafa; }
.category-admin-grid > section > div { aspect-ratio: 1.35 / 1; overflow: hidden; background: #eceff2; }
.category-admin-grid img { width: 100%; height: 100%; object-fit: cover; }
.category-admin-grid > section > span { padding: 12px; display: grid; gap: 4px; }
.category-admin-grid b { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; }
.category-admin-grid small { color: #858991; font-size: 9px; }
.category-admin-grid label { width: auto; margin: 0 12px 12px; background: #1d1e22; }
.social-admin-list { padding: 0 25px 25px; display: grid; gap: 9px; }
.social-admin-row { padding: 12px; border: 1px solid #e3e5e8; display: grid; grid-template-columns: 48px 1fr 145px minmax(220px, 1.5fr) 85px 105px 78px; align-items: end; gap: 10px; background: #fafafa; }
.social-admin-row > label { min-width: 0; display: grid; gap: 7px; color: #858991; font-size: 10px; }
.social-admin-row input:not([type="checkbox"]),
.social-admin-row select { width: 100%; height: 38px; box-sizing: border-box; border: 1px solid #dfe1e5; padding: 0 9px; background: #fff; color: #202124; font: 11px var(--sb-font); outline: 0; }
.social-admin-icon { width: 48px; height: 48px; border-radius: 14px; display: grid; place-items: center; align-self: end; background: #1d1e22; }
.social-admin-icon img { width: 21px; height: 21px; object-fit: contain; filter: brightness(0) invert(1); }
.social-admin-icon span { color: #fff; font-size: 19px; }
.social-admin-row .banner-active { min-height: 38px; font-size: 10px; }
.social-admin-actions { display: flex; gap: 5px; align-self: end; }
.social-admin-actions button { width: 36px; height: 38px; border: 0; display: grid; place-items: center; background: #1d1e22; color: #fff; cursor: pointer; }
.social-admin-actions button.danger { border: 1px solid #ead7d3; background: #fff; color: #b64b3d; }
@media (max-width: 1000px) {
  .banner-admin-card { grid-template-columns: 1fr; }
  .category-admin-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .social-admin-row { grid-template-columns: 48px 1fr 140px; }
  .social-admin-row .social-url { grid-column: 2 / 4; }
}
@media (max-width: 600px) {
  .appearance-form { grid-template-columns: 1fr; padding: 0 16px 18px; }
  .appearance-save { width: 100%; }
  .banner-admin-list,
  .category-admin-grid { padding: 0 16px 18px; }
  .banner-admin-card { padding: 10px; }
  .banner-admin-row { grid-template-columns: 1fr; }
  .compact-row { grid-template-columns: 100px 1fr; }
  .category-admin-grid { grid-template-columns: 1fr 1fr; gap: 8px; }
  .social-admin-list { padding: 0 16px 18px; }
  .social-admin-row { grid-template-columns: 44px 1fr; }
  .social-admin-row .social-url { grid-column: 1 / -1; }
}
</style>
<style scoped>
.product-drawer {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.product-drawer label {
  display: grid;
  gap: 7px;
  color: #858991;
  font-size: 11px;
}
.product-drawer input:not([type="checkbox"]),
.product-drawer textarea {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #dfe1e5;
  padding: 10px;
  font: 12px var(--sb-font);
  resize: vertical;
}
.product-drawer input:not([type="checkbox"]) {
  height: 40px;
}
.product-drawer .check {
  display: flex;
  display: flex;
  align-items: center;
  gap: 8px;
}
.product-drawer .check input {
  accent-color: #f15b49;
}
.product-drawer .save {
  margin: 8px 0 0;
  height: 42px;
  border: 0;
  background: #1d1e22;
  color: #fff;
}
.row-actions {
  display: flex;
  gap: 4px;
}
.icon {
  border: 0;
  background: #fff;
  color: #7d8087;
  cursor: pointer;
}
.icon:hover {
  color: #f15b49;
}
</style>
<style scoped>
.site-admin-console {
  min-height: 100vh;
  background: #f4f5f7;
  color: #202124;
  font-family: var(--sb-font);
}
.site-admin-header {
  min-height: 112px;
  box-sizing: border-box;
  background: #fff;
  border-bottom: 1px solid #e3e5e8;
  padding: 23px 5%;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.site-admin-heading {
  display: grid;
  align-content: center;
}
.site-admin-heading .kicker {
  line-height: 1.2;
  margin: 0 0 8px;
}
.site-admin-header h1 {
  font-size: 32px;
  line-height: 1.08;
  margin: 0;
}
@media (max-width: 600px) {
  .site-admin-header {
    align-items: flex-start;
    gap: 18px;
    flex-direction: column;
  }
}
</style>
<style scoped>
.site-admin-console {
  background: radial-gradient(circle at 2% 10%, rgba(203,198,193,.20), transparent 30rem), radial-gradient(circle at 98% 45%, rgba(198,207,218,.22), transparent 38rem), linear-gradient(180deg, #faf9f8, #f3f1ee 52%, #faf9f8);
  color: #171717;
}
.site-admin-header {
  min-height: 120px;
  margin: 12px 16px 0;
  padding: 24px clamp(24px, 4vw, 54px);
  border: 1px solid rgba(255,255,255,.82);
  border-radius: 26px;
  background: linear-gradient(135deg, rgba(255,255,255,.88), rgba(255,255,255,.62));
  box-shadow: inset 0 1px 0 #fff, 0 16px 45px rgba(31,27,25,.07);
  backdrop-filter: blur(24px) saturate(145%);
}
.site-admin-header h1 { font-size: 36px; letter-spacing: -.045em; font-weight: 600; }
.banner-admin-card,
.category-admin-grid > section,
.social-admin-row { border-color: rgba(28,27,26,.09); border-radius: 18px; background: rgba(255,255,255,.50); }
.banner-admin-preview { border-radius: 14px; }
.category-admin-grid > section > div { border-radius: 17px 17px 0 0; }
.appearance-form textarea,
.banner-admin-fields input:not([type="checkbox"]),
.banner-admin-fields textarea,
.social-admin-row input:not([type="checkbox"]),
.social-admin-row select { border-radius: 11px; background: rgba(255,255,255,.78); }
.icon:hover { color: #171717; }
@media (max-width: 600px) {
  .site-admin-header { margin: 7px 8px 0; padding: 20px; border-radius: 20px; }
}
</style>
