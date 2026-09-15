<script setup lang="ts">
import { Eye, ImagePlus, Plus, RefreshCw, Save, Search, Trash2, X } from "@lucide/vue";
const config = useRuntimeConfig();
const route = useRoute();
const { token, user } = useWorkspaceSession();
const productEditor = useState<any | null>("admin-product-editor", () => null);
const selected = useState<any | null>("admin-order-selected", () => null);
const notice = ref("");
const search = ref("");
const statusFilter = ref("");
const { openContextMenu, copyText } = useContextMenu();
const siteSections = ["dashboard", "appearance", "orders", "products", "customers"];
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
const savingAppearance = ref(false);
const uploadingMedia = ref(false);
const busy = ref(false);
const savingProduct = ref(false);
const menu = [
  { id: "dashboard", label: "Обзор" },
  { id: "appearance", label: "Витрина" },
  { id: "orders", label: "Заказы" },
  { id: "products", label: "Каталог" },
  { id: "customers", label: "Клиенты" },
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
  if (!token.value) return;
  busy.value = true;
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
    const storefront = await $fetch<any>("/admin/storefront", {
      baseURL: config.public.apiBase,
      headers,
    });
    storefrontSettings.announcementText =
      storefront.settings?.announcementText || storefrontSettings.announcementText;
    storefrontBanners.value = storefront.banners || [];
    categories.value = storefront.categories || categories.value;
  } finally {
    busy.value = false;
  }
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
async function uploadStorefrontImage(file?: File) {
  if (!file) return "";
  uploadingMedia.value = true;
  try {
    const body = new FormData();
    body.append("file", file);
    const result = await $fetch<any>("/admin/storefront/media", {
      baseURL: config.public.apiBase,
      method: "POST",
      headers: { Authorization: `Bearer ${token.value}` },
      body,
    });
    return result.url as string;
  } finally {
    uploadingMedia.value = false;
  }
}
async function selectBannerImage(event: Event, banner: any, field: "imageUrl" | "mobileImageUrl") {
  const input = event.target as HTMLInputElement;
  banner[field] = await uploadStorefrontImage(input.files?.[0]);
  input.value = "";
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
async function selectCategoryImage(event: Event, category: any) {
  const input = event.target as HTMLInputElement;
  const imageUrl = await uploadStorefrontImage(input.files?.[0]);
  input.value = "";
  if (!imageUrl) return;
  const updated = await $fetch<any>(`/admin/categories/${category.id}/presentation`, {
    baseURL: config.public.apiBase,
    method: "PATCH",
    headers: { Authorization: `Bearer ${token.value}` },
    body: { imageUrl },
  });
  Object.assign(category, updated);
  notice.value = "Фото категории обновлено";
  setTimeout(() => (notice.value = ""), 2200);
}
function storefrontPreview(url?: string) {
  if (!url) return "";
  return url.startsWith("/api/") ? new URL(url, config.public.apiBase).toString() : url;
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
    nameRu: product.nameRu,
    descriptionRu: product.descriptionRu || "",
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
          price: Number(productEditor.value.price),
          stock: Number(productEditor.value.stock),
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
    <WorkspaceLoading v-if="!dashboard" label="Загружаем управление сайтом" />
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
        <div class="header-actions">
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
                  <label><ImagePlus :size="15" /> {{ banner.imageUrl ? 'Заменить фото' : 'Выбрать фото' }}<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" @change="selectBannerImage($event, banner, 'imageUrl')" /></label>
                </div>
                <div class="banner-admin-fields">
                  <label>Заголовок<input v-model="banner.title" placeholder="Можно оставить пустым, если текст уже на фото" /></label>
                  <label>Подзаголовок<textarea v-model="banner.subtitle" rows="2" placeholder="Короткое описание предложения"></textarea></label>
                  <div class="banner-admin-row"><label>Текст кнопки<input v-model="banner.buttonLabel" /></label><label>Ссылка<input v-model="banner.linkUrl" placeholder="/catalog" /></label></div>
                  <div class="banner-admin-row compact-row"><label>Порядок<input v-model.number="banner.sortOrder" type="number" min="0" /></label><label class="banner-active"><input v-model="banner.isActive" type="checkbox" /> Показывать на сайте</label></div>
                  <label class="mobile-image-picker"><ImagePlus :size="15" /> {{ banner.mobileImageUrl ? 'Заменить мобильное фото' : 'Добавить отдельное фото для телефона' }}<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" @change="selectBannerImage($event, banner, 'mobileImageUrl')" /></label>
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
                <label><ImagePlus :size="15" /> Выбрать фото<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" @change="selectCategoryImage($event, category)" /></label>
              </section>
            </div>
          </article>
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
      <label>Название<input v-model="productEditor.nameRu" /></label
      ><label
        >Цена, ₽<input
          v-model.number="productEditor.price"
          type="number"
          min="0" /></label
      ><label
        >Остаток<input
          v-model.number="productEditor.stock"
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
@media (max-width: 1000px) {
  .banner-admin-card { grid-template-columns: 1fr; }
  .category-admin-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
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
