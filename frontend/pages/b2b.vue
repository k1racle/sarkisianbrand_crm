<script setup lang="ts">
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CircleHelp,
  Clock3,
  PackageCheck,
  Plus,
  RefreshCw,
  Repeat2,
  Search,
  ShoppingBag,
  Sparkles,
  UserPlus,
  Users,
  Wallet,
  X,
} from "@lucide/vue";
import { resolveProductImageUrl } from "~/shared/product-images";
import {
  salonDay,
  salonInstant,
  salonMinute,
  shiftSalonDay,
} from "~/shared/salon-calendar";
const route = useRoute();
const {canUseSalon,area}=useBusinessWorkspace();
const router = useRouter();
const config = useRuntimeConfig();
const session = useB2BSession();
const { openContextMenu, copyText } = useContextMenu();
const profile = ref<any>(null),
  dashboard = ref<any>({}),
  clients = ref<any[]>([]),
  services = ref<any[]>([]),
  bookings = ref<any[]>([]),
  catalog = ref<any[]>([]),
  orders = ref<any[]>([]),
  tickets = ref<any[]>([]);
const salonBranding=useState<any>('salon-branding',()=>null);
const loading = ref(true),
  error = ref(""),
  notice = ref(""),
  dialog = ref("");
const search = ref("");
const onlineSettingsPanel = ref<{refresh:()=>Promise<void>;busy:boolean;loading:boolean}|null>(null);
const companySettingsPanel=ref<{refresh:()=>Promise<void>}|null>(null);
async function refreshSection(){
  if(section.value==='online-booking'&&onlineSettingsPanel.value)await onlineSettingsPanel.value.refresh();
  else if(section.value==='settings'&&companySettingsPanel.value)await companySettingsPanel.value.refresh();
  else await load();
}
const cart = reactive<Record<string, number>>({});
const draft = reactive<any>({});
const { actionBusy: saving, runOperation } = useWorkspaceOperation(error);
const portalReady = ref(false),
  draftBaseline = ref(""),
  calendarMode = ref<"day" | "list" | "week" | "month">("day"),
  calendarAnchor = ref(new Date());
const bookingSettings = ref<any>({ timeZone: "Europe/Moscow" });
const calendarDay = computed(() =>
  salonDay(calendarAnchor.value, bookingSettings.value.timeZone),
);
const dialogDirty = computed(
  () => Boolean(dialog.value) && JSON.stringify(draft) !== draftBaseline.value,
);
const failedImages = ref<Record<string, string>>({});
function productImage(product: any) {
  const image = resolveProductImageUrl(
    product.images?.[0]?.url,
    config.public.apiBase,
    String(config.public.siteUrl || ""),
  );
  return failedImages.value[product.id] === image ? "" : image;
}
const calendarRange = computed(() => {
  const zone = bookingSettings.value.timeZone;
  const day = calendarDay.value;
  const next = shiftSalonDay(
    day,
    calendarMode.value === "week" ? 7 : calendarMode.value === "day" ? 1 : 31,
  );
  return {
    from: salonInstant(day, 0, zone)!,
    to: salonInstant(next, 0, zone)!,
  };
});
const calendarLabel = computed(() =>
  calendarMode.value === "month"
    ? calendarRange.value.from.toLocaleDateString("ru-RU", {
        month: "long",
        year: "numeric",
      })
    : `${calendarRange.value.from.toLocaleDateString("ru-RU")} — ${new Date(calendarRange.value.to.getTime() - 1).toLocaleDateString("ru-RU")}`,
);
function shiftCalendar(direction: number) {
  calendarAnchor.value = salonInstant(
    shiftSalonDay(
      calendarDay.value,
      direction * (calendarMode.value === "day" ? 1 : 7),
    ),
    720,
    bookingSettings.value.timeZone,
  )!;
}
function selectCalendarDate(event: Event) {
  const day = (event.target as HTMLInputElement).value;
  if (day)
    calendarAnchor.value = salonInstant(
      day,
      720,
      bookingSettings.value.timeZone,
    )!;
}
let loadVersion = 0;
let loadController: AbortController | undefined;
const section = computed(() => String(route.query.section || "dashboard"));
const headers = computed(() => ({
  Authorization: `Bearer ${session.token.value}`,
}));
const titles: any = {
  dashboard: [
    "ЦЕНТР УПРАВЛЕНИЯ",
    "Обзор бизнеса",
    "Главное о салоне, клиентах, записи и закупках",
  ],
  calendar: [
    "РАБОЧИЙ КАЛЕНДАРЬ",
    "Записи",
    "Расписание клиентов и загрузка команды",
  ],
  clients: [
    "КЛИЕНТСКАЯ БАЗА",
    "Мои клиенты",
    "История посещений, контакты и заметки",
  ],
  services: [
    "ПРАЙС-ЛИСТ",
    "Услуги и цены",
    "Продолжительность, стоимость и доступность услуг",
  ],
  catalog: [
    "ПАРТНЁРСКИЙ КАТАЛОГ",
    "Закупить товары",
    "Персональные B2B-цены и актуальные остатки 1С",
  ],
  orders: [
    "ИСТОРИЯ ЗАКУПОК",
    "Мои заказы",
    "Статусы, состав и быстрый повтор заказа",
  ],
  team: ["ОРГАНИЗАЦИЯ", "Команда", "Сотрудники и права в кабинете"],
  support: [
    "ПОМОЩЬ БИЗНЕСУ",
    "Поддержка",
    "Обращения к команде Sarkisian и контроль ответов",
  ],
};
const currentTitle = computed(() => titles[section.value] || titles.dashboard);
const money = (v: any) =>
  v === null
    ? "—"
    : new Intl.NumberFormat("ru-RU", {
        style: "currency",
        currency: "RUB",
        maximumFractionDigits: 0,
      }).format(Number(v || 0));
const dateTime = (v: any) =>
  new Date(v).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
const statusLabels: any = {
  NEW: "Новая",
  CONFIRMED: "Подтверждена",
  COMPLETED: "Завершена",
  CANCELLED: "Отменена",
  NO_SHOW: "Не пришёл",
  PAYMENT_WAITING: "Ожидает оплаты",
  PAID: "Оплачен",
  ASSEMBLING: "Собирается",
  SHIPPED: "Отправлен",
  DELIVERED: "Доставлен",
  REFUNDED: "Возврат",
  OPEN: "В работе",
  WAITING_REQUESTER: "Ожидает ответа",
  WAITING_CUSTOMER: "Ждём ответ",
  WAITING_INTERNAL: "На уточнении",
  RESOLVED: "Решена",
  CLOSED: "Закрыта",
};
titles.purchases = [
  "ОПТОВЫЕ ЗАКУПКИ",
  "Обзор закупок",
  "Заказы, условия компании и поставки SARKISIAN",
];
titles.dashboard=['САЛОН','Обзор салона','Запись, клиенты и загрузка команды'];
titles["online-booking"] = [
  "САЛОН",
  "Онлайн-запись",
  "Публичная страница и виджет записи",
];
titles.settings=['НАСТРОЙКИ','Настройки','Данные организации и личного кабинета'];
function fulfillmentLabel(item: any) {
  if (item.oneCSyncError) return "Ошибка передачи";
  if (item.packedAt) return "Упакован";
  if (item.pickedAt) return "Товар отобран";
  if (item.pickingStartedAt) return "Собирается на складе";
  if (item.isSynced1C) return "Передан в 1С";
  return "В очереди 1С";
}
const cartLines = computed(() =>
  catalog.value.flatMap((p) =>
    p.variants
      .filter((v: any) => cart[v.id])
      .map((v: any) => ({ product: p, variant: v, quantity: cart[v.id] })),
  ),
);
const cartTotal = computed(() =>
  cartLines.value.reduce((s, l) => s + l.variant.b2bPrice * l.quantity, 0),
);
async function api<T>(path: string, options: any = {}) {
  return $fetch<T>(path, {
    baseURL: config.public.apiBase,
    headers: headers.value,
    ...options,
  });
}
async function load() {
  if (!portalReady.value || !session.token.value) return;
  const version = ++loadVersion,
    identity = session.token.value;
  loadController?.abort();
  const controller = new AbortController();
  loadController = controller;
  loading.value = true;
  error.value = "";
  const sectionSources: Record<string, string[]> = {
    dashboard: ["dashboard"],
    purchases: ["dashboard", "orders"],
    clients: ["clients"],
    services: ["services"],
    calendar: ["clients", "services", "bookings", "booking-settings"],
    catalog: ["catalog"],
    orders: ["orders"],
    team: [],
    support: ["support"],
    "online-booking": [],
    settings: [],
  };
  const sources = [
    "profile",
    ...(sectionSources[section.value] || sectionSources.dashboard),
  ];
  try {
    const company=await api<any>('/b2b/profile',{signal:controller.signal,timeout:20000});
    if(version!==loadVersion||session.token.value!==identity)return;
    salonBranding.value=company.presentation||null;
    canUseSalon.value=company.capabilities?.salon ?? ['OWNER','EMPLOYEE'].includes(company.membership?.role);
    if(!canUseSalon.value&&['dashboard','calendar','clients','services','online-booking'].includes(section.value)){
      profile.value=company;
      await router.replace('/b2b?section=purchases');
      return;
    }
    if(section.value==='calendar')bookingSettings.value=await api<any>('/b2b/booking-settings',{signal:controller.signal,timeout:20000});
    const result = await Promise.all(
      sources.map((source) =>
        source==='profile'?Promise.resolve(company):source==='booking-settings'?Promise.resolve(bookingSettings.value):
        api<any>("/b2b/" + source, {
          signal: controller.signal,
          timeout: 20000,
          ...(source === "bookings"
            ? {
                query: {
                  from: calendarRange.value.from.toISOString(),
                  to: calendarRange.value.to.toISOString(),
                },
              }
            : {}),
        }),
      ),
    );
    if (version !== loadVersion || session.token.value !== identity) return;
    const targets: Record<string, Ref<any>> = {
      profile,
      dashboard,
      clients,
      services,
      bookings,
      catalog,
      orders,
      support: tickets,
      "booking-settings": bookingSettings,
    };
    sources.forEach((source, index) => (targets[source].value = result[index]));
  } catch (e: any) {
    if (version === loadVersion && !controller.signal.aborted)
      error.value =
        typeof e?.data?.message === "string"
          ? e.data.message
          : "Не удалось загрузить раздел кабинета. Повторите попытку.";
  } finally {
    if (version === loadVersion) loading.value = false;
  }
}
function flash(value: string) {
  notice.value = value;
  setTimeout(() => (notice.value = ""), 2500);
}
function resetDialog() {
  dialog.value = "";
  draftBaseline.value = "";
}
function close() {
  if (saving.value) return false;
  if (
    dialogDirty.value &&
    !window.confirm("Закрыть форму без сохранения изменений?")
  )
    return false;
  resetDialog();
  return true;
}
function open(type: string, value: any = {}) {
  if (!close()) return;
  Object.keys(draft).forEach((key) => delete draft[key]);
  Object.assign(draft, JSON.parse(JSON.stringify(value)));
  draftBaseline.value = JSON.stringify(draft);
  dialog.value = type;
  error.value = "";
}
const { panel: dialogPanel, keyboard: dialogKeys } = useCatalogDialog(
  computed(() => Boolean(dialog.value)),
  close,
);
onBeforeRouteLeave(
  () =>
    !saving.value &&
    (!dialogDirty.value ||
      window.confirm("Есть несохранённые изменения. Покинуть кабинет?")),
);
onBeforeRouteUpdate(() => {
  if (saving.value) return false;
  if (
    dialogDirty.value &&
    !window.confirm("Есть несохранённые изменения. Перейти в другой раздел?")
  )
    return false;
  resetDialog();
  return true;
});
onBeforeUnmount(() => {
  ++loadVersion;
  loadController?.abort();
});
watch(section, () => {
  search.value = "";
  load();
});
watch([calendarMode, calendarAnchor], () => {
  if (section.value === "calendar") load();
});
async function saveClient() {
  await runOperation(async () => {
    const editing=Boolean(draft.id);
    await api(draft.id ? `/b2b/clients/${draft.id}` : "/b2b/clients", {
      method: draft.id ? "PATCH" : "POST",
      body: {
        firstName: draft.firstName,
        lastName: draft.lastName || undefined,
        phone: draft.phone || undefined,
        email: draft.email || undefined,
        notes: draft.notes || undefined,
        tags: String(draft.tags || "")
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
        personalDataConsent: Boolean(draft.personalDataConsent),
      },
    });
    resetDialog();
    await load();
    flash(editing?"Клиент обновлён":"Клиент добавлен");
  });
}
async function saveService() {
  await runOperation(async () => {
    const editing=Boolean(draft.id);
    await api(draft.id ? `/b2b/services/${draft.id}` : "/b2b/services", {
      method: draft.id ? "PATCH" : "POST",
      body: {
        name: draft.name,
        description: draft.description || undefined,
        duration: Number(draft.duration),
        price: Number(draft.price),
        color: draft.color || "#77709e",
        ...(editing?{isActive:draft.isActive!==false}:{}),
      },
    });
    resetDialog();
    await load();
    flash(editing?"Услуга обновлена":"Услуга добавлена");
  });
}
function openCalendarBooking(value: any) {
  const zone = bookingSettings.value.timeZone;
  const instant = new Date(value.startTime);
  const minute = salonMinute(instant.toISOString(), zone);
  open("booking", {
    ...value,
    originalStart: value.startTime,
    originalStatus: value.status,
    startTime: `${salonDay(instant, zone)}T${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`,
  });
}
async function saveBooking() {
  await runOperation(async () => {
    const [day, time] = String(draft.startTime || "").split("T");
    const [hour, minute] = String(time || "")
      .split(":")
      .map(Number);
    const start =
      day && Number.isFinite(hour) && Number.isFinite(minute)
        ? salonInstant(day, hour * 60 + minute, bookingSettings.value.timeZone)
        : null;
    if (!start)
      throw { data: { message: "Укажите корректную дату и время записи" } };
    await api(draft.id ? `/b2b/bookings/${draft.id}` : "/b2b/bookings", {
      method: draft.id ? "PATCH" : "POST",
      body: draft.id
        ? {
            masterMemberId: draft.masterMemberId || null,
            startTime:
              start.toISOString() === draft.originalStart
                ? undefined
                : start.toISOString(),
            notes: draft.notes || "",
            status: draft.status,
          }
        : {
            clientId: draft.clientId,
            serviceId: draft.serviceId,
            masterMemberId: draft.masterMemberId || undefined,
            startTime: start.toISOString(),
            notes: draft.notes || undefined,
          },
    });
    resetDialog();
    await load();
    flash(draft.id ? "Запись обновлена" : "Запись сохранена");
  });
}
async function moveCalendarBooking(value: any) {
  if (saving.value || !window.confirm("Перенести запись на выбранное время?"))
    return;
  await runOperation(async () => {
    await api(`/b2b/bookings/${value.booking.id}`, {
      method: "PATCH",
      body: {
        startTime: value.startTime,
        masterMemberId: value.masterMemberId,
      },
    });
    await load();
    flash("Запись перенесена");
  });
}
async function bookingStatus(item: any, status: string) {
  if (saving.value) return;
  if (status === "CANCELLED" && !window.confirm("Отменить запись клиента?"))
    return;
  await runOperation(async () => {
    await api(`/b2b/bookings/${item.id}`, {
      method: "PATCH",
      body: { status },
    });
    await load();
    flash(status === "COMPLETED" ? "Визит завершён" : "Статус записи обновлён");
  });
}
async function checkout() {
  if (!cartLines.value.length || !profile.value?.membership?.canOrder) return;
  const completed = await runOperation(async () => {
    const order: any = await api("/b2b/orders", {
      method: "POST",
      body: {
        items: cartLines.value.map((line) => ({
          variantId: line.variant.id,
          quantity: line.quantity,
        })),
      },
    });
    Object.keys(cart).forEach((key) => delete cart[key]);
    resetDialog();
    flash(`Заказ ${order.orderNumber} создан`);
  });
  if (completed) {
    const failure = await router.push("/b2b?section=orders");
    if (!failure) await load();
  }
}
async function repeatOrder(item: any) {
  if (!profile.value?.membership?.canOrder || saving.value) return;
  if (
    !window.confirm(
      "Создать новый заказ из этих позиций по актуальным ценам и остаткам?",
    )
  )
    return;
  await runOperation(async () => {
    await api(`/b2b/orders/${item.id}/repeat`, { method: "POST" });
    await load();
    flash("Повторный заказ создан");
  });
}
async function saveSupport() {
  await runOperation(async () => {
    await api("/b2b/support", {
      method: "POST",
      body: {
        subject: draft.subject,
        description: draft.description,
        priority: draft.priority || "MEDIUM",
      },
    });
    resetDialog();
    await load();
    flash("Обращение отправлено");
  });
}
function clientMenu(e: MouseEvent, item: any) {
  openContextMenu(
    e,
    `${item.firstName} ${item.lastName || ""}`,
    [
      {
        label: "Редактировать клиента",
        icon: "open",
        action: () =>
          open("client", {
            ...item,
            tags: (item.tags || []).join(", "),
            personalDataConsent: Boolean(item.consentPersonalDataAt),
          }),
      },
      {
        label: "Создать запись",
        icon: "open",
        action: () => open("booking", { clientId: item.id }),
      },
      {
        label: "Копировать телефон",
        icon: "copy",
        action: () => copyText(item.phone || "", "Телефон скопирован"),
      },
    ],
    item.phone || item.email || "Клиент",
  );
}
function orderMenu(e: MouseEvent, item: any) {
  openContextMenu(
    e,
    item.orderNumber,
    [
      {
        label: "Повторить заказ",
        icon: "copy",
        action: () => repeatOrder(item),
      },
      {
        label: "Копировать номер",
        icon: "copy",
        action: () => copyText(item.orderNumber, "Номер заказа скопирован"),
      },
    ],
    statusLabels[item.status] || item.status,
  );
}
onMounted(async () => {
  session.hydrate();
  if (!session.token.value) return navigateTo("/b2b-login");
  const restored = await session.restore();
  if (!restored) return navigateTo("/b2b-login");
  portalReady.value = true;
  await load();
});
</script>

<template>
  <main data-v-ui-5c3d2dc5697c class="portal">
    <header data-v-ui-5c3d2dc5697c class="top">
      <div data-v-ui-5c3d2dc5697c>
        <h1 data-v-ui-5c3d2dc5697c>{{ currentTitle[1] }}</h1>
        <span data-v-ui-5c3d2dc5697c>{{ currentTitle[2] }}</span>
      </div>
      <div data-v-ui-5c3d2dc5697c class="top-actions">
        <button data-v-ui-5c3d2dc5697c type="button" :disabled="loading || saving || onlineSettingsPanel?.busy || onlineSettingsPanel?.loading" @click="refreshSection">
          <RefreshCw data-v-ui-5c3d2dc5697c :size="15" />Обновить</button
        ><button
          data-v-ui-5c3d2dc5697c
          v-if="section === 'clients'"
          class="primary"
          @click="open('client')"
        >
          <UserPlus data-v-ui-5c3d2dc5697c :size="15" />Новый клиент</button
        ><button
          data-v-ui-5c3d2dc5697c
          v-else-if="section === 'calendar'"
          class="primary"
          @click="open('booking')"
        >
          <Plus data-v-ui-5c3d2dc5697c :size="15" />Новая запись</button
        ><button
          data-v-ui-5c3d2dc5697c
          v-else-if="section === 'services'"
          class="primary"
          @click="open('service', { duration: 60, color: '#77709e' })"
        >
          <Plus data-v-ui-5c3d2dc5697c :size="15" />Новая услуга</button
        ><button
          data-v-ui-5c3d2dc5697c
          v-else-if="section === 'support'"
          class="primary"
          @click="open('support', { priority: 'MEDIUM' })"
        >
          <Plus data-v-ui-5c3d2dc5697c :size="15" />Обращение</button
        ><button
          data-v-ui-5c3d2dc5697c
          v-else-if="section === 'catalog'"
          class="primary"
          @click="open('cart')"
        >
          <ShoppingBag data-v-ui-5c3d2dc5697c :size="15" />Корзина ·
          {{ cartLines.length }}
        </button>
      </div>
    </header>
    <div data-v-ui-5c3d2dc5697c v-if="loading" class="loading">
      Загружаем рабочее пространство…
    </div>
    <div
      data-v-ui-5c3d2dc5697c
      v-else-if="error && !dialog"
      class="page-error"
      role="alert"
    >
      <span><CircleAlert :size="16" />{{ error }}</span
      ><button type="button" class="b2b-retry" @click="load">
        <RefreshCw :size="16" />Повторить загрузку
      </button>
    </div>
    <section data-v-ui-5c3d2dc5697c v-else class="body">
      <template v-if="section === 'dashboard'"><SalonDashboard :dashboard="dashboard" :profile="profile" /></template>

      <SalonClients v-else-if="section === 'clients'" :clients="clients" :can-see-finance="Boolean(profile.membership?.canSeeFinance)" :format-price="money" @context="clientMenu" @edit="open('client',{...$event,tags:($event.tags||[]).join(', '),personalDataConsent:Boolean($event.consentPersonalDataAt)})"/>

      <template v-else-if="section === 'calendar'">
        <div class="salon-calendar-tools">
          <button
            type="button"
            aria-label="Предыдущий период"
            @click="shiftCalendar(-1)"
          >
            <ChevronLeft :size="16" />
          </button>
          <input
            type="date"
            :value="calendarDay"
            aria-label="Дата календаря"
            @change="selectCalendarDate"
          />
          <button
            type="button"
            aria-label="Следующий период"
            @click="shiftCalendar(1)"
          >
            <ChevronRight :size="16" />
          </button>
          <button type="button" @click="calendarAnchor = new Date()">
            Сегодня
          </button>
          <div class="salon-calendar-modes">
            <button
              v-for="mode in [
                { id: 'day', label: 'День' },
                { id: 'week', label: 'Неделя' },
                { id: 'list', label: 'Список' },
              ]"
              :key="mode.id"
              type="button"
              :class="{ active: calendarMode === mode.id }"
              :aria-pressed="calendarMode === mode.id"
              @click="calendarMode = mode.id as any"
            >
              {{ mode.label }}
            </button>
          </div>
        </div>
        <SalonCalendar
          :bookings="bookings"
          :members="profile.members"
          :day="calendarDay"
          :mode="calendarMode"
          :time-zone="bookingSettings.timeZone"
          :busy="saving"
          :settings="bookingSettings"
          @create="openCalendarBooking"
          @edit="openCalendarBooking"
          @move="moveCalendarBooking"
        />
      </template>
      <template v-else-if="section === 'online-booking'"
        ><SalonOnlineBookingSettings ref="onlineSettingsPanel" :profile="profile"
      /></template>
      <BusinessPurchasesDashboard v-else-if="section === 'purchases'" :profile="profile" :dashboard="dashboard" :orders="orders" :format-price="money" :status-labels="statusLabels" :fulfillment="fulfillmentLabel"/>

      <SalonServices v-else-if="section === 'services'" :services="services" :format-price="money" @edit="open('service',$event)"/>

      <BusinessCatalog v-else-if="section === 'catalog'" :products="catalog" :cart="cart" :can-order="Boolean(profile.membership?.canOrder)" :busy="saving" :format-price="money" @quantity="(id,value)=>cart[id]=value" @checkout="open('cart')"/>

      <BusinessOrders v-else-if="section === 'orders'" :orders="orders" :can-order="Boolean(profile.membership?.canOrder)" :can-see-finance="Boolean(profile.membership?.canSeeFinance)" :busy="saving" :format-price="money" :status-labels="statusLabels" :fulfillment="fulfillmentLabel" @repeat="repeatOrder" @context="orderMenu"/>

      <SalonTeam v-else-if="section === 'team'" :profile="profile"/>
      <BusinessSettings ref="companySettingsPanel" v-else-if="section === 'settings'" :profile="profile" :area="area"/>

      <template v-else-if="section === 'support'"
        >
        <article data-v-ui-5c3d2dc5697c class="panel list-panel">
          <header data-v-ui-5c3d2dc5697c>
            <div data-v-ui-5c3d2dc5697c>
              <p data-v-ui-5c3d2dc5697c>МОИ ОБРАЩЕНИЯ</p>
              <h3 data-v-ui-5c3d2dc5697c>{{ tickets.length }} заявок</h3>
            </div>
          </header>
          <div data-v-ui-5c3d2dc5697c class="table tickets">
            <div data-v-ui-5c3d2dc5697c class="row labels">
              <span data-v-ui-5c3d2dc5697c>Номер</span
              ><span data-v-ui-5c3d2dc5697c>Тема</span
              ><span data-v-ui-5c3d2dc5697c>Приоритет</span
              ><span data-v-ui-5c3d2dc5697c>Статус</span
              ><span data-v-ui-5c3d2dc5697c>Создано</span>
            </div>
            <div
              data-v-ui-5c3d2dc5697c
              v-for="item in tickets"
              :key="item.id"
              class="row"
            >
              <b data-v-ui-5c3d2dc5697c>{{ item.number }}</b
              ><span data-v-ui-5c3d2dc5697c>{{ item.subject }}</span
              ><span data-v-ui-5c3d2dc5697c>{{
                item.priority === "CRITICAL"
                  ? "Критичный"
                  : item.priority === "HIGH"
                    ? "Высокий"
                    : item.priority === "LOW"
                      ? "Низкий"
                      : "Обычный"
              }}</span
              ><em data-v-ui-5c3d2dc5697c>{{
                statusLabels[item.status] || item.status
              }}</em
              ><span data-v-ui-5c3d2dc5697c>{{
                new Date(item.createdAt).toLocaleDateString("ru-RU")
              }}</span>
            </div>
            <div data-v-ui-5c3d2dc5697c v-if="!tickets.length" class="empty">
              Обращений пока нет.
            </div>
          </div>
        </article></template
      >
    </section>

    <div
      data-v-ui-5c3d2dc5697c
      v-if="dialog"
      class="backdrop admin-dialog-backdrop"
      @click.self="close"
    >
      <form
        data-v-ui-5c3d2dc5697c
        ref="dialogPanel"
        class="drawer admin-dialog admin-dialog--drawer"
        role="dialog"
        aria-modal="true"
        tabindex="-1"
        @keydown="dialogKeys"
        @submit.prevent="
          dialog === 'client'
            ? saveClient()
            : dialog === 'service'
              ? saveService()
              : dialog === 'booking'
                ? saveBooking()
                : dialog === 'support'
                  ? saveSupport()
                  : checkout()
        "
      >
        <header data-v-ui-5c3d2dc5697c>
          <div data-v-ui-5c3d2dc5697c>
            <p data-v-ui-5c3d2dc5697c>
              {{
                dialog === "client"
                  ? "КЛИЕНТСКАЯ БАЗА"
                  : dialog === "service"
                    ? "ПРАЙС-ЛИСТ"
                    : dialog === "booking"
                      ? "КАЛЕНДАРЬ"
                      : dialog === "support"
                        ? "HELPDESK"
                        : "ЗАКУПКА"
              }}
            </p>
            <h2 data-v-ui-5c3d2dc5697c>
              {{
                dialog === "client"
                  ? draft.id
                    ? "Карточка клиента"
                    : "Новый клиент"
                  : dialog === "service"
                    ? draft.id
                      ? "Карточка услуги"
                      : "Новая услуга"
                    : dialog === "booking"
                      ? draft.id ? "Карточка записи" : "Новая запись"
                      : dialog === "support"
                        ? "Новое обращение"
                        : "Подтверждение заказа"
              }}
            </h2>
          </div>
          <button
            data-v-ui-5c3d2dc5697c
            type="button"
            :disabled="saving"
            @click="close"
          >
            <X data-v-ui-5c3d2dc5697c :size="18" />
          </button>
        </header>
        <div data-v-ui-5c3d2dc5697c class="drawer-body admin-dialog-body">
          <fieldset
            data-v-ui-5c3d2dc5697c
            class="ui-fieldset-reset"
            :disabled="saving"
          >
            <template v-if="dialog === 'client'"
              ><div data-v-ui-5c3d2dc5697c class="two">
                <label data-v-ui-5c3d2dc5697c
                  >Имя<input
                    data-v-ui-5c3d2dc5697c
                    v-model="draft.firstName"
                    required /></label
                ><label data-v-ui-5c3d2dc5697c
                  >Фамилия<input
                    data-v-ui-5c3d2dc5697c
                    v-model="draft.lastName"
                /></label>
              </div>
              <label data-v-ui-5c3d2dc5697c
                >Телефон<input
                  data-v-ui-5c3d2dc5697c
                  v-model="draft.phone"
                  placeholder="+7 900 000-00-00" /></label
              ><label data-v-ui-5c3d2dc5697c
                >Email<input
                  data-v-ui-5c3d2dc5697c
                  v-model="draft.email"
                  type="email" /></label
              ><label data-v-ui-5c3d2dc5697c
                >Теги через запятую<input
                  data-v-ui-5c3d2dc5697c
                  v-model="draft.tags"
                  placeholder="VIP, маникюр" /></label
              ><label data-v-ui-5c3d2dc5697c
                >Заметки<textarea
                  data-v-ui-5c3d2dc5697c
                  v-model="draft.notes"
                  rows="4"
                /></label
              ><label data-v-ui-5c3d2dc5697c class="check"
                ><input
                  data-v-ui-5c3d2dc5697c
                  v-model="draft.personalDataConsent"
                  type="checkbox"
                /><span data-v-ui-5c3d2dc5697c
                  ><b data-v-ui-5c3d2dc5697c
                    >Согласие на обработку данных получено</b
                  ><small data-v-ui-5c3d2dc5697c
                    >Зафиксировать согласие клиента в карточке</small
                  ></span
                ></label
              ></template
            >
            <template v-else-if="dialog === 'service'"
              ><label data-v-ui-5c3d2dc5697c
                >Название<input
                  data-v-ui-5c3d2dc5697c
                  v-model="draft.name"
                  required /></label
              ><label data-v-ui-5c3d2dc5697c
                >Описание<textarea
                  data-v-ui-5c3d2dc5697c
                  v-model="draft.description"
                  rows="4"
                />
              </label>
              <div data-v-ui-5c3d2dc5697c class="two">
                <label data-v-ui-5c3d2dc5697c
                  >Длительность, минут<input
                    data-v-ui-5c3d2dc5697c
                    v-model.number="draft.duration"
                    type="number"
                    min="10"
                    required /></label
                ><label data-v-ui-5c3d2dc5697c
                  >Цена, ₽<input
                    data-v-ui-5c3d2dc5697c
                    v-model.number="draft.price"
                    type="number"
                    min="0"
                    required
                /></label>
              </div>
              <label data-v-ui-5c3d2dc5697c
                >Цвет в календаре<input
                  data-v-ui-5c3d2dc5697c
                  v-model="draft.color"
                  type="color" /></label
            ><label v-if="draft.id" class="check"><input v-model="draft.isActive" type="checkbox"/>Услуга доступна для записи</label></template>
            <template v-else-if="dialog === 'booking'">
              <label
                >Клиент<select
                  v-model="draft.clientId"
                  aria-label="Клиент"
                  required
                  :disabled="Boolean(draft.id)"
                >
                  <option value="" disabled>Выберите клиента</option>
                  <option
                    v-for="item in clients"
                    :key="item.id"
                    :value="item.id"
                  >
                    {{ item.firstName }} {{ item.lastName }}
                  </option>
                </select></label
              >
              <label
                >Услуга<select
                  v-model="draft.serviceId"
                  aria-label="Услуга"
                  required
                  :disabled="Boolean(draft.id)"
                >
                  <option value="" disabled>Выберите услугу</option>
                  <option
                    v-for="item in services.filter(
                      (x) => x.isActive || x.id === draft.serviceId,
                    )"
                    :key="item.id"
                    :value="item.id"
                  >
                    {{ item.name }} · {{ item.duration }} мин.
                  </option>
                </select></label
              >
              <label
                >Мастер<select
                  v-model="draft.masterMemberId"
                  aria-label="Мастер"
                  :disabled="draft.originalStatus === 'COMPLETED'"
                >
                  <option value="">Не назначать</option>
                  <option
                    v-for="item in profile.members"
                    :key="item.id"
                    :value="item.id"
                  >
                    {{ item.user.firstName }} {{ item.user.lastName }}
                  </option>
                </select></label
              >
              <label
                >Дата и время салона<input
                  v-model="draft.startTime"
                  type="datetime-local"
                  required
                  :disabled="draft.originalStatus === 'COMPLETED'"
              /></label>
              <label v-if="draft.id"
                >Статус<select
                  v-model="draft.status"
                  :disabled="draft.originalStatus === 'COMPLETED'"
                >
                  <option
                    v-for="status in [
                      'NEW',
                      'CONFIRMED',
                      'COMPLETED',
                      'CANCELLED',
                      'NO_SHOW',
                    ]"
                    :key="status"
                    :value="status"
                  >
                    {{ statusLabels[status] }}
                  </option>
                </select></label
              >
              <label
                >Комментарий<textarea v-model="draft.notes" rows="3" />
              </label>
            </template>
            <template v-else-if="dialog === 'support'"
              ><label data-v-ui-5c3d2dc5697c
                >Тема<input
                  data-v-ui-5c3d2dc5697c
                  v-model="draft.subject"
                  required /></label
              ><label data-v-ui-5c3d2dc5697c
                >Приоритет<select
                  data-v-ui-5c3d2dc5697c
                  v-model="draft.priority"
                >
                  <option data-v-ui-5c3d2dc5697c value="LOW">Низкий</option>
                  <option data-v-ui-5c3d2dc5697c value="MEDIUM">Обычный</option>
                  <option data-v-ui-5c3d2dc5697c value="HIGH">Высокий</option>
                  <option data-v-ui-5c3d2dc5697c value="CRITICAL">
                    Критичный
                  </option>
                </select></label
              ><label data-v-ui-5c3d2dc5697c
                >Опишите вопрос<textarea
                  data-v-ui-5c3d2dc5697c
                  v-model="draft.description"
                  rows="7"
                  required
                /></label
            ></template>
            <template v-else
              ><div data-v-ui-5c3d2dc5697c class="checkout-lines">
                <div data-v-ui-5c3d2dc5697c v-for="line in cartLines">
                  <span data-v-ui-5c3d2dc5697c
                    >{{ line.product.nameRu
                    }}<small data-v-ui-5c3d2dc5697c
                      >{{ line.quantity }} шт.</small
                    ></span
                  ><b data-v-ui-5c3d2dc5697c>{{
                    money(line.quantity * line.variant.b2bPrice)
                  }}</b>
                </div>
              </div>
              <div data-v-ui-5c3d2dc5697c class="checkout-total">
                <span data-v-ui-5c3d2dc5697c>К оплате</span
                ><b data-v-ui-5c3d2dc5697c>{{ money(cartTotal) }}</b>
              </div>
              <p data-v-ui-5c3d2dc5697c class="checkout-note">
                Заказ появится в системе обработки закупок. Передача в 1С
                зависит от настроенного подключения; её статус будет виден в
                заказе.
              </p></template
            >
          </fieldset>
          <p
            data-v-ui-5c3d2dc5697c
            v-if="error"
            class="form-error"
            role="alert"
          >
            {{ error }}
          </p>
        </div>
        <footer data-v-ui-5c3d2dc5697c>
          <button
            data-v-ui-5c3d2dc5697c
            type="button"
            :disabled="saving"
            @click="close"
          >
            Отмена</button
          ><button data-v-ui-5c3d2dc5697c class="primary" :disabled="saving">
            {{
              saving
                ? "Сохраняем…"
                : dialog === "cart"
                  ? "Оформить заказ"
                  : "Сохранить"
            }}
          </button>
        </footer>
      </form>
    </div>
    <div data-v-ui-5c3d2dc5697c v-if="notice" class="toast">{{ notice }}</div>
  </main>
</template>
