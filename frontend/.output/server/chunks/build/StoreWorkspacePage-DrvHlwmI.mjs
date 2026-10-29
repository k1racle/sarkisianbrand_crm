globalThis.__timing__.logStart('Load chunks/build/StoreWorkspacePage-DrvHlwmI');import { c as useRoute, a as useWorkspaceSession, j as useState, b as useWorkspaceAccess, $ as $fetch$1, W as WorkspaceLoading_default, e as crmDestination, f as useRuntimeConfig, k as storefrontProductImage, g as useWorkspaceNavigation, N as NuxtLink, m as mergeSiteContent, l as storefrontCategoryGroups, o as storefrontCatalogLink } from '../virtual/entry.mjs';
import { A as AdminMediaBrowser_default } from './AdminMediaBrowser-BENAljZN.mjs';
import { u as useCatalogDialog } from './useCatalogDialog-2pnsnnsL.mjs';
import { u as useContextMenu } from './useContextMenu-CQeSn2KJ.mjs';
import { defineComponent, ref, computed, watch, reactive, unref, isRef, mergeProps, withCtx, createTextVNode, createVNode, resolveDynamicComponent, openBlock, createBlock, toDisplayString, useId, nextTick, useSSRContext } from 'vue';
import { onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router';
import { ssrRenderComponent, ssrInterpolate, ssrIncludeBooleanAttr, ssrRenderClass, ssrRenderAttr, ssrLooseContain, ssrLooseEqual, ssrRenderList, ssrRenderTeleport, ssrRenderStyle, ssrRenderAttrs, ssrRenderVNode } from 'vue/server-renderer';
import { RefreshCw, Plus, Save, GripVertical, Trash2, ImagePlus, Pencil, X, Award, Coins, Gift, Search, Eye, Check, Image, FolderTree, Boxes, Package, TrendingUp, Wallet, ShoppingBag, ArrowRight, AlertCircle, EyeOff, ChevronRight, ChevronDown, Power, Ticket, Shuffle, Palette, CreditCard, RotateCcw, Clock3, History, ArrowLeft, Copy, Upload, Images, ArrowUpRight, Phone, MapPin } from '@lucide/vue';
import { d as warehouseTotal, w as warehouseExecution, b as warehouseFactAt, e as warehouseNumber } from '../_/warehouse-execution.mjs';

const WEB_ORDER_OPERATOR_ROLES = ["ADMIN", "CONTENT_MANAGER", "MANAGER_SALES", "SUPERVISOR", "WAREHOUSE", "EXECUTIVE"];
function webOrderNextStatuses(order) {
  var _a, _b, _c;
  if (!order || order.source !== "WEB" || order.reservationState === "RELEASED" || ["CANCELLED", "REFUNDED", "DELIVERED"].includes(order.status)) return [];
  const paid = order.paymentStatus === "SUCCEEDED";
  const financiallyPaid = ["SUCCEEDED", "PAID", "REFUNDING", "REFUNDED"].includes(order.paymentStatus || "");
  const digital = order.reservationState === "DIGITAL" || ((_a = order.priceSnapshot) == null ? void 0 : _a.digitalDelivery) === true || Boolean(((_b = order.items) == null ? void 0 : _b.length) && order.items.every((item) => item.productType === "GIFT_CARD"));
  const warehouseOwned = !digital && (["ACTIVE", "CONSUMED"].includes(order.reservationState || "") || Boolean(order.fulfillmentManaged || order.execution || order.warehouseExecution || order.isSynced1C || order.pickingStartedAt || order.pickedAt || order.packedAt) || Boolean((_c = order.items) == null ? void 0 : _c.some((item) => item.productType === "PHYSICAL")));
  const next = order.status === "NEW" ? ["CONFIRMED"] : [];
  if (paid) {
    if (digital && ["NEW", "CONFIRMED", "PAYMENT_WAITING", "PAID"].includes(order.status)) next.push("DELIVERED");
  } else if (!warehouseOwned && !financiallyPaid && ["NEW", "CONFIRMED", "PAYMENT_WAITING"].includes(order.status)) next.push("CANCELLED");
  return next;
}

// components/workspace/StoreDashboard.vue?vue&type=script&setup=true&lang.ts
var StoreDashboard_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "StoreDashboard",
	__ssrInlineRender: true,
	props: {
		data: {},
		busy: { type: Boolean }
	},
	setup(__props) {
		const props = __props;
		const { leaves } = useWorkspaceNavigation();
		const allowed = (section) => leaves.value.some((item) => item.to === `/admin-workspace/${section}`);
		const money = (value) => Number(value || 0).toLocaleString("ru-RU", { maximumFractionDigits: 0 }) + " ₽";
		const date = (value) => new Date(value).toLocaleDateString("ru-RU", {
			day: "numeric",
			month: "short",
			timeZone: "Europe/Moscow"
		});
		const queue = [
			{
				status: "NEW",
				label: "Новые",
				icon: ShoppingBag
			},
			{
				status: "CONFIRMED",
				label: "Подтверждены",
				icon: Check
			},
			{
				status: "ASSEMBLING",
				label: "В сборке",
				icon: Package
			},
			{
				status: "PAYMENT_WAITING",
				label: "Ожидают оплаты",
				icon: Wallet
			},
			{
				status: "PAID",
				label: "Оплачены, не в сборке",
				icon: Wallet
			},
			{
				status: "SHIPPED",
				label: "Отправлены",
				icon: Package
			}
		];
		const statuses = {
			NEW: "Новый",
			CONFIRMED: "Подтверждён",
			PAYMENT_WAITING: "Ожидает оплаты",
			PAID: "Оплачен",
			ASSEMBLING: "В сборке",
			SHIPPED: "Отправлен",
			DELIVERED: "Доставлен",
			CANCELLED: "Отменён",
			REFUNDED: "Возврат"
		};
		const payments = {
			PAID: "Оплачен",
			SUCCEEDED: "Оплачен",
			PENDING: "Не оплачен",
			FAILED: "Ошибка оплаты",
			REFUNDED: "Возврат",
			PARTIALLY_REFUNDED: "Частичный возврат"
		};
		const trend = computed(() => props.data.trend || []);
		const maxRevenue = computed(() => Math.max(1, ...trend.value.map((item) => Number(item.revenue))));
		const sales = computed(() => props.data.sales || {
			revenue: 0,
			orders: 0,
			paidOrders: 0,
			averageOrder: 0
		});
		const issues = computed(() => props.data.issues || {});
		const attention = computed(() => [
			{
				label: "Товары без изображений",
				value: issues.value.missingImages || 0,
				icon: Image
			},
			{
				label: "Товары без категории",
				value: issues.value.uncategorized || 0,
				icon: FolderTree
			},
			{
				label: "Товары не в наличии",
				value: issues.value.outOfStock || 0,
				icon: Boxes
			},
			{
				label: "Варианты с остатком до 5 шт.",
				value: issues.value.lowStock || 0,
				icon: Package
			}
		]);
		const shortcuts = computed(() => [
			{
				section: "products",
				label: "Товары",
				icon: Boxes
			},
			{
				section: "appearance",
				label: "Витрина и баннеры",
				icon: Image
			},
			{
				section: "categories",
				label: "Категории",
				icon: FolderTree
			},
			{
				section: "promotions",
				label: "Промокоды",
				icon: TrendingUp
			}
		].filter((item) => allowed(item.section)));
		return (_ctx, _push, _parent, _attrs) => {
			const _component_NuxtLink = NuxtLink;
			_push(`<section${ssrRenderAttrs(mergeProps({
				class: "store-dashboard",
				"aria-busy": __props.busy,
				"aria-label": "Сводка интернет-магазина"
			}, _attrs))}><div class="sd-metrics kpi-grid"><article class="sd-metric sd-metric--primary"><span>`);
			_push(ssrRenderComponent(unref(Wallet), { size: 18 }, null, _parent));
			_push(`Оплаченные заказы, сумма</span><strong>${ssrInterpolate(money(unref(sales).revenue))}</strong><small>${ssrInterpolate(unref(sales).paidOrders)} оплаченных заказов за период</small></article><article class="sd-metric"><span>`);
			_push(ssrRenderComponent(unref(ShoppingBag), { size: 18 }, null, _parent));
			_push(`Заказы за период</span><strong>${ssrInterpolate(unref(sales).orders)}</strong><small>все статусы · только сайт</small></article><article class="sd-metric"><span>`);
			_push(ssrRenderComponent(unref(TrendingUp), { size: 18 }, null, _parent));
			_push(`Средний оплаченный заказ</span><strong>${ssrInterpolate(money(unref(sales).averageOrder))}</strong><small>без отменённых и возвратов</small></article><article class="sd-metric"><span>`);
			_push(ssrRenderComponent(unref(Package), { size: 18 }, null, _parent));
			_push(`Опубликовано товаров</span><strong>${ssrInterpolate(__props.data.products || 0)}</strong><small>${ssrInterpolate(unref(issues).outOfStock || 0)} не в наличии</small></article></div><div class="sd-main-grid"><article class="sd-panel sd-sales"><header><div><h2>Динамика продаж</h2><p>Оплаченные заказы по дате создания · московское время</p></div><span>${ssrInterpolate(__props.data.period?.days || 30)} дней</span></header>`);
			if (unref(sales).paidOrders) {
				_push(`<div class="sd-chart" role="img"${ssrRenderAttr("aria-label", "Сумма оплаченных заказов по дням: " + unref(trend).map((item) => date(item.day) + ": " + money(item.revenue)).join("; "))}><!--[-->`);
				ssrRenderList(unref(trend), (item, index) => {
					_push(`<div class="sd-chart-column"${ssrRenderAttr("title", date(item.day) + ": " + money(item.revenue) + " · " + item.orders + " заказов")}><div class="sd-chart-track"><span style="${ssrRenderStyle({ "--sales-height": `${Number(item.revenue) / unref(maxRevenue) * 100}%` })}"></span></div>`);
					if (index === 0 || index === unref(trend).length - 1 || unref(trend).length === 7) _push(`<small>${ssrInterpolate(new Date(item.day).getUTCDate())}</small>`);
					else _push(`<small aria-hidden="true">·</small>`);
					_push(`</div>`);
				});
				_push(`<!--]--></div>`);
			} else {
				_push(`<div class="sd-empty">`);
				_push(ssrRenderComponent(unref(TrendingUp), { size: 28 }, null, _parent));
				_push(`<strong>Нет оплаченных заказов за период</strong><p>После первых оплат здесь появится динамика продаж.</p></div>`);
			}
			if (unref(trend).length) _push(`<footer class="sd-chart-dates"><span>${ssrInterpolate(date(unref(trend)[0].day))}</span><span>${ssrInterpolate(date(unref(trend)[unref(trend).length - 1].day))}</span></footer>`);
			else _push(`<!---->`);
			_push(`</article><article class="sd-panel"><header><h2>Заказы в работе</h2>`);
			if (allowed("orders")) _push(ssrRenderComponent(_component_NuxtLink, { to: "/admin-workspace/orders" }, {
				default: withCtx((_, _push, _parent, _scopeId) => {
					if (_push) {
						_push(`Все заказы`);
						_push(ssrRenderComponent(unref(ArrowRight), { size: 16 }, null, _parent, _scopeId));
					} else return [createTextVNode("Все заказы"), createVNode(unref(ArrowRight), { size: 16 })];
				}),
				_: 1
			}, _parent));
			else _push(`<!---->`);
			_push(`</header><div class="sd-queue"><!--[-->`);
			ssrRenderList(queue, (stage) => {
				_push(`<button class="crm-button" type="button"${ssrIncludeBooleanAttr(!allowed("orders")) ? " disabled" : ""}>`);
				ssrRenderVNode(_push, createVNode(resolveDynamicComponent(stage.icon), { size: 18 }, null), _parent);
				_push(`<span>${ssrInterpolate(stage.label)}</span><strong>${ssrInterpolate(__props.data.queue?.[stage.status] || 0)}</strong>`);
				_push(ssrRenderComponent(unref(ArrowRight), { size: 16 }, null, _parent));
				_push(`</button>`);
			});
			_push(`<!--]--></div>`);
			if (unref(issues).syncErrors) {
				_push(`<p class="sd-warning">`);
				_push(ssrRenderComponent(unref(AlertCircle), { size: 17 }, null, _parent));
				_push(`Не переданы в 1С из-за ошибки: ${ssrInterpolate(unref(issues).syncErrors)}</p>`);
			} else _push(`<!---->`);
			_push(`<footer>Незавершённые заказы за всё время</footer></article></div><div class="sd-bottom-grid"><article class="sd-panel"><header><h2>Последние заказы</h2>`);
			if (allowed("orders")) _push(ssrRenderComponent(_component_NuxtLink, { to: "/admin-workspace/orders" }, {
				default: withCtx((_, _push, _parent, _scopeId) => {
					if (_push) {
						_push(`Все заказы`);
						_push(ssrRenderComponent(unref(ArrowRight), { size: 16 }, null, _parent, _scopeId));
					} else return [createTextVNode("Все заказы"), createVNode(unref(ArrowRight), { size: 16 })];
				}),
				_: 1
			}, _parent));
			else _push(`<!---->`);
			_push(`</header>`);
			if (__props.data.recentOrders?.length) {
				_push(`<div class="sd-recent"><!--[-->`);
				ssrRenderList(__props.data.recentOrders, (order) => {
					_push(`<button class="crm-button" type="button"${ssrIncludeBooleanAttr(!allowed("orders")) ? " disabled" : ""}><span><strong>${ssrInterpolate(order.orderNumber)}</strong><small>${ssrInterpolate(date(order.createdAt))}</small></span><span><span class="sd-order-status">${ssrInterpolate(statuses[order.status] || order.status)}</span><small>${ssrInterpolate(payments[order.paymentStatus] || "Оплата не подтверждена")}</small></span><strong>${ssrInterpolate(money(order.finalAmount))}</strong>`);
					_push(ssrRenderComponent(unref(ArrowRight), { size: 16 }, null, _parent));
					_push(`</button>`);
				});
				_push(`<!--]--></div>`);
			} else {
				_push(`<div class="sd-empty">`);
				_push(ssrRenderComponent(unref(ShoppingBag), { size: 28 }, null, _parent));
				_push(`<strong>Заказов пока нет</strong><p>Здесь появятся последние заказы с сайта.</p></div>`);
			}
			_push(`</article><article class="sd-panel"><header><h2>Состояние каталога</h2>`);
			if (allowed("products")) _push(ssrRenderComponent(_component_NuxtLink, { to: "/admin-workspace/products" }, {
				default: withCtx((_, _push, _parent, _scopeId) => {
					if (_push) {
						_push(`Каталог`);
						_push(ssrRenderComponent(unref(ArrowRight), { size: 16 }, null, _parent, _scopeId));
					} else return [createTextVNode("Каталог"), createVNode(unref(ArrowRight), { size: 16 })];
				}),
				_: 1
			}, _parent));
			else _push(`<!---->`);
			_push(`</header><div class="sd-attention"><!--[-->`);
			ssrRenderList(unref(attention), (item) => {
				_push(`<div>`);
				ssrRenderVNode(_push, createVNode(resolveDynamicComponent(item.icon), { size: 18 }, null), _parent);
				_push(`<span>${ssrInterpolate(item.label)}</span><strong class="${ssrRenderClass({ "sd-attention-count": item.value > 0 })}">${ssrInterpolate(item.value)}</strong></div>`);
			});
			_push(`<!--]--></div><footer>Только опубликованные товары · без подарочных карт</footer></article></div>`);
			if (unref(shortcuts).length) {
				_push(`<nav class="sd-shortcuts" aria-label="Быстрые действия магазина"><!--[-->`);
				ssrRenderList(unref(shortcuts), (item) => {
					_push(ssrRenderComponent(_component_NuxtLink, {
						key: item.section,
						to: "/admin-workspace/" + item.section
					}, {
						default: withCtx((_, _push, _parent, _scopeId) => {
							if (_push) {
								ssrRenderVNode(_push, createVNode(resolveDynamicComponent(item.icon), { size: 18 }, null), _parent, _scopeId);
								_push(`<span${_scopeId}>${ssrInterpolate(item.label)}</span>`);
								_push(ssrRenderComponent(unref(ArrowRight), { size: 16 }, null, _parent, _scopeId));
							} else return [
								(openBlock(), createBlock(resolveDynamicComponent(item.icon), { size: 18 })),
								createVNode("span", null, toDisplayString(item.label), 1),
								createVNode(unref(ArrowRight), { size: 16 })
							];
						}),
						_: 2
					}, _parent));
				});
				_push(`<!--]--></nav>`);
			} else _push(`<!---->`);
			_push(`</section>`);
		};
	}
});
// components/workspace/StoreDashboard.vue
var _sfc_setup$11 = StoreDashboard_vue_vue_type_script_setup_true_lang_default.setup;
StoreDashboard_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/workspace/StoreDashboard.vue");
	return _sfc_setup$11 ? _sfc_setup$11(props, ctx) : void 0;
};
var StoreDashboard_default = Object.assign(StoreDashboard_vue_vue_type_script_setup_true_lang_default, { __name: "StoreDashboard" });
// components/AdminMediaPicker.vue?vue&type=script&setup=true&lang.ts
var AdminMediaPicker_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "AdminMediaPicker",
	__ssrInlineRender: true,
	props: {
		modelValue: { default: "" },
		apiBase: {},
		token: {},
		disabled: {
			type: Boolean,
			default: false
		},
		label: { default: "Изображение" },
		showPreview: {
			type: Boolean,
			default: true
		}
	},
	emits: ["update:modelValue", "selected"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const config = useRuntimeConfig();
		const session = useWorkspaceSession();
		const apiBase = computed(() => props.apiBase ?? String(config.public.apiBase || ""));
		const token = computed(() => props.token ?? session.token.value);
		const dialogId = "media-picker-" + useId();
		const inputId = dialogId + "-url";
		const opened = ref(false);
		ref(null);
		const browser = ref(null);
		const urlDraft = ref(props.modelValue || "");
		const error = ref("");
		const status = ref("");
		let previousOverflow = "";
		function displayUrl(value) {
			const raw = String(value || "").trim();
			if (!raw || /[\x00-\x20\\]/.test(raw) || !/^(?:\/(?!\/)|https?:\/\/)/i.test(raw)) return "";
			try {
				if (/^\/api(?:\/|$)/.test(raw)) return new URL(raw, new URL(apiBase.value, String(config.public.siteUrl || "http://localhost:3001")).origin).href;
				if (raw.startsWith("/")) return raw;
				const parsed = new URL(raw);
				return parsed.username || parsed.password ? "" : raw;
			} catch {
				return "";
			}
		}
		const currentPreview = computed(() => displayUrl(props.modelValue || ""));
		function closeLibrary() {
			browser.value?.cancelPending();
			opened.value = false;
			error.value = "";
			(void 0).documentElement.style.overflow = previousOverflow;
		}
		function chooseAsset(asset) {
			if (!opened.value || props.disabled) return;
			if (!/^\/api\/v1\/media\/files\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:jpg|png|webp|avif)$/.test(asset.url)) {
				error.value = "Сервер вернул некорректный адрес файла.";
				return;
			}
			emit("update:modelValue", asset.url);
			emit("selected", asset);
			urlDraft.value = asset.url;
			closeLibrary();
			status.value = "Изображение выбрано. Сохраните изменения в основном редакторе.";
		}
		watch(() => props.modelValue, (value) => {
			urlDraft.value = value || "";
		});
		watch(() => [
			apiBase.value,
			token.value,
			props.disabled
		], () => {
			error.value = "";
			status.value = "";
			urlDraft.value = props.modelValue || "";
		});
		return (_ctx, _push, _parent, _attrs) => {
			const _component_AdminMediaBrowser = AdminMediaBrowser_default;
			_push(`<div${ssrRenderAttrs(mergeProps({ class: "admin-media-library admin-media-picker" }, _attrs))}><span class="aml-label">${ssrInterpolate(__props.label)}</span>`);
			if (__props.showPreview && unref(currentPreview)) _push(`<div class="aml-current"><img${ssrRenderAttr("src", unref(currentPreview))}${ssrRenderAttr("alt", __props.label)}></div>`);
			else _push(`<!---->`);
			_push(`<div class="aml-actions"><button type="button" class="aml-button crm-button"${ssrIncludeBooleanAttr(__props.disabled) ? " disabled" : ""}>`);
			_push(ssrRenderComponent(unref(Upload), { size: 18 }, null, _parent));
			_push(` Загрузить файл</button><button type="button" class="aml-button aml-button--white crm-button"${ssrIncludeBooleanAttr(__props.disabled) ? " disabled" : ""}>`);
			_push(ssrRenderComponent(unref(Images), { size: 18 }, null, _parent));
			_push(` Выбрать из библиотеки</button></div><details class="aml-manual"><summary>Указать путь вручную</summary><div class="aml-url-row"><input class="crm-input"${ssrRenderAttr("id", inputId)}${ssrRenderAttr("value", unref(urlDraft))} type="text" maxlength="2048"${ssrIncludeBooleanAttr(__props.disabled) ? " disabled" : ""}${ssrRenderAttr("aria-label", "Путь: " + __props.label)} placeholder="/api/v1/media/files/…"><button type="button" class="aml-button aml-button--white crm-button"${ssrIncludeBooleanAttr(__props.disabled) ? " disabled" : ""}>Применить путь</button></div></details>`);
			if (unref(error) && !unref(opened)) _push(`<p class="aml-message" role="alert">${ssrInterpolate(unref(error))}</p>`);
			else _push(`<!---->`);
			if (unref(status) && !unref(opened)) _push(`<p class="aml-message" role="status">${ssrInterpolate(unref(status))}</p>`);
			else _push(`<!---->`);
			ssrRenderTeleport(_push, (_push) => {
				if (unref(opened)) {
					_push(`<div class="admin-media-library aml-backdrop admin-dialog-backdrop"><section class="aml-panel admin-dialog admin-dialog--modal" role="dialog" aria-modal="true"${ssrRenderAttr("aria-labelledby", dialogId)}${ssrRenderAttr("aria-describedby", dialogId + "-description")}><header class="aml-head"><div><p class="aml-eyebrow">ОБЩАЯ БИБЛИОТЕКА</p><h2${ssrRenderAttr("id", dialogId)}>Выбрать изображение</h2></div><button type="button" class="aml-close crm-button crm-button--icon" aria-label="Закрыть медиабиблиотеку">`);
					_push(ssrRenderComponent(unref(X), { size: 20 }, null, _parent));
					_push(`</button></header><p${ssrRenderAttr("id", dialogId + "-description")} class="aml-help">Выбор меняет только поле текущего редактора. Сохраняется путь файла без адреса хоста.</p>`);
					if (unref(error)) _push(`<p class="aml-message" role="alert">${ssrInterpolate(unref(error))}</p>`);
					else _push(`<!---->`);
					_push(ssrRenderComponent(_component_AdminMediaBrowser, {
						ref_key: "browser",
						ref: browser,
						"api-base": unref(apiBase),
						token: unref(token),
						disabled: __props.disabled,
						"show-cancel": "",
						onSelect: chooseAsset,
						onCancel: closeLibrary
					}, null, _parent));
					_push(`</section></div>`);
				} else _push(`<!---->`);
			}, "body", false, _parent);
			_push(`</div>`);
		};
	}
});
// components/AdminMediaPicker.vue
var _sfc_setup$10 = AdminMediaPicker_vue_vue_type_script_setup_true_lang_default.setup;
AdminMediaPicker_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/AdminMediaPicker.vue");
	return _sfc_setup$10 ? _sfc_setup$10(props, ctx) : void 0;
};
var AdminMediaPicker_default = Object.assign(AdminMediaPicker_vue_vue_type_script_setup_true_lang_default, { __name: "AdminMediaPicker" });
// components/storefront/SitePagesEditor.vue?vue&type=script&setup=true&lang.ts
var SitePagesEditor_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "SitePagesEditor",
	__ssrInlineRender: true,
	setup(__props) {
		const config = useRuntimeConfig();
		const { token } = useWorkspaceSession();
		const pages = ref([]);
		const editorialLabels = {
			club: "О клубе",
			"club-referrals": "Для покупателей",
			business: "Для бизнеса",
			partnerships: "Для блогеров"
		};
		const editorialLabel = (page) => editorialLabels[page.slug] || page.title;
		const editor = ref(null);
		const baseline = ref("");
		const busy = ref(false);
		const notice = ref("");
		ref(null);
		const blockAnnouncement = ref("");
		const dirty = computed(() => Boolean(editor.value && JSON.stringify(editor.value) !== baseline.value));
		computed(() => ({ Authorization: `Bearer ${token.value}` }));
		onBeforeRouteLeave(() => !busy.value && (!dirty.value || confirm("Уйти со страницы без сохранения изменений?")));
		onBeforeRouteUpdate(() => !busy.value && (!dirty.value || confirm("Перейти в другой раздел без сохранения изменений?")));
		return (_ctx, _push, _parent, _attrs) => {
			const _component_AdminMediaPicker = AdminMediaPicker_default;
			_push(`<section${ssrRenderAttrs(mergeProps({
				"data-v-ui-bffa0889dfe6": "",
				class: "sb-pages-editor"
			}, _attrs))}><article data-v-ui-bffa0889dfe6 class="panel"><div data-v-ui-bffa0889dfe6 class="panel-head sb-cms-hero"><div data-v-ui-bffa0889dfe6><p data-v-ui-bffa0889dfe6 class="kicker">КОНТЕНТ САЙТА</p><h2 data-v-ui-bffa0889dfe6>Страницы</h2><span data-v-ui-bffa0889dfe6>Заголовки, тексты, порядок блоков и публикация — в одном редакторе.</span></div><button data-v-ui-bffa0889dfe6 class="sb-cms-primary"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}>`);
			_push(ssrRenderComponent(unref(Plus), {
				"data-v-ui-bffa0889dfe6": "",
				size: 16
			}, null, _parent));
			_push(` Новая страница</button></div></article>`);
			if (unref(notice)) _push(`<p data-v-ui-bffa0889dfe6 class="sb-cms-notice" role="status">${ssrInterpolate(unref(notice))}</p>`);
			else _push(`<!---->`);
			_push(`<div data-v-ui-bffa0889dfe6 class="sb-cms-layout"><aside data-v-ui-bffa0889dfe6 class="sb-cms-list panel"><!--[-->`);
			ssrRenderList(unref(pages), (page) => {
				_push(`<button data-v-ui-bffa0889dfe6 class="${ssrRenderClass({ active: unref(editor)?.slug === page.slug && !unref(editor)?._new })}"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}><strong data-v-ui-bffa0889dfe6>${ssrInterpolate(editorialLabel(page))}</strong><span data-v-ui-bffa0889dfe6>${ssrInterpolate(page.title)} · /${ssrInterpolate(page.slug)} · ${ssrInterpolate(page.isActive ? "Опубликована" : "Скрыта")}</span>`);
				if (page.reviewRequired) _push(`<small data-v-ui-bffa0889dfe6>Требует утверждения</small>`);
				else _push(`<!---->`);
				_push(`</button>`);
			});
			_push(`<!--]-->`);
			if (!unref(pages).length) _push(`<p data-v-ui-bffa0889dfe6>${ssrInterpolate(unref(busy) ? "Загружаем…" : "Создайте первую страницу")}</p>`);
			else _push(`<!---->`);
			_push(`</aside>`);
			if (unref(editor)) {
				_push(`<article data-v-ui-bffa0889dfe6 class="panel sb-cms-form"><div data-v-ui-bffa0889dfe6 class="sb-cms-toolbar"><div data-v-ui-bffa0889dfe6><b data-v-ui-bffa0889dfe6>${ssrInterpolate(unref(editor)._new ? "Новая страница" : "Редактирование страницы")}</b><small data-v-ui-bffa0889dfe6>${ssrInterpolate(unref(dirty) ? "Есть несохранённые изменения" : "Изменения сохранены")}`);
				if (unref(editor).revision) _push(`<!--[--> · версия ${ssrInterpolate(unref(editor).revision)}<!--]-->`);
				else _push(`<!---->`);
				_push(`</small></div>`);
				if (!unref(editor)._new && unref(editor).isActive) _push(`<a data-v-ui-bffa0889dfe6${ssrRenderAttr("href", `/${unref(editor).slug}`)} target="_blank" rel="noopener noreferrer">Посмотреть на сайте</a>`);
				else _push(`<!---->`);
				_push(`</div><label data-v-ui-bffa0889dfe6>Адрес страницы<input data-v-ui-bffa0889dfe6${ssrRenderAttr("value", unref(editor).slug)}${ssrIncludeBooleanAttr(!unref(editor)._new || unref(busy)) ? " disabled" : ""} maxlength="80" placeholder="about"><small data-v-ui-bffa0889dfe6>Латинские буквы, цифры и дефисы. Адрес существующей страницы не меняется.</small></label><label data-v-ui-bffa0889dfe6>Надзаголовок<input data-v-ui-bffa0889dfe6${ssrRenderAttr("value", unref(editor).eyebrow)}${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""} maxlength="80"></label><label data-v-ui-bffa0889dfe6>Заголовок страницы<input data-v-ui-bffa0889dfe6${ssrRenderAttr("value", unref(editor).title)}${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""} maxlength="180"></label><label data-v-ui-bffa0889dfe6>Вводный текст<textarea data-v-ui-bffa0889dfe6${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""} maxlength="1500" rows="3">${ssrInterpolate(unref(editor).lead)}</textarea></label><label data-v-ui-bffa0889dfe6>Описание для поисковых систем<textarea data-v-ui-bffa0889dfe6${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""} maxlength="320" rows="2" placeholder="Если пусто, используется вводный текст">${ssrInterpolate(unref(editor).seoDescription)}</textarea></label><div data-v-ui-bffa0889dfe6 class="sb-cms-flags"><label data-v-ui-bffa0889dfe6><input data-v-ui-bffa0889dfe6${ssrIncludeBooleanAttr(Array.isArray(unref(editor).isActive) ? ssrLooseContain(unref(editor).isActive, null) : unref(editor).isActive) ? " checked" : ""}${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""} type="checkbox"> Опубликована</label><label data-v-ui-bffa0889dfe6><input data-v-ui-bffa0889dfe6${ssrIncludeBooleanAttr(Array.isArray(unref(editor).reviewRequired) ? ssrLooseContain(unref(editor).reviewRequired, null) : unref(editor).reviewRequired) ? " checked" : ""}${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""} type="checkbox"> Требует юридического утверждения</label></div>`);
				if (unref(editor).reviewRequired) _push(`<p data-v-ui-bffa0889dfe6 class="sb-cms-review">На странице отображается предупреждение, индексация отключена. Снимите отметку только после проверки документа, реквизитов и фактических условий работы.</p>`);
				else _push(`<!---->`);
				_push(`<!--[-->`);
				ssrRenderList(unref(editor).blocks.filter((block) => block.kind === "biography"), (biography) => {
					_push(`<section class="sb-cms-founder-socials"><h3>Личные соцсети основательницы</h3><p>Эти ссылки отображаются под биографией и не связаны с общими соцсетями бренда. Пустые поля скрыты на сайте.</p><!--[-->`);
					ssrRenderList([
						{
							key: "vk",
							name: "ВКонтакте"
						},
						{
							key: "telegram",
							name: "Telegram"
						},
						{
							key: "instagram",
							name: "Instagram"
						},
						{
							key: "youtube",
							name: "YouTube"
						},
						{
							key: "tiktok",
							name: "TikTok"
						}
					], (network) => {
						_push(`<label>${ssrInterpolate(network.name)}<input type="url"${ssrRenderAttr("aria-label", "Личная страница: " + network.name)}${ssrRenderAttr("value", biography.socials?.[network.key] || "")}${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""} maxlength="500" placeholder="https://…"></label>`);
					});
					_push(`<!--]--></section>`);
				});
				_push(`<!--]--><div data-v-ui-bffa0889dfe6 class="sb-cms-blocks-head"><h3 data-v-ui-bffa0889dfe6>Блоки страницы</h3><button data-v-ui-bffa0889dfe6 class="sb-cms-primary"${ssrIncludeBooleanAttr(unref(busy) || unref(editor).blocks.length >= 40) ? " disabled" : ""}>Добавить блок</button></div><!--[-->`);
				ssrRenderList(unref(editor).blocks, (block, index) => {
					_push(`<section data-v-ui-bffa0889dfe6 class="sb-cms-block-editor"><button data-v-ui-bffa0889dfe6 type="button" class="sb-cms-drag-handle"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}${ssrRenderAttr("draggable", !unref(busy))}${ssrRenderAttr("aria-label", "Перетащить блок " + (index + 1))}>`);
					_push(ssrRenderComponent(unref(GripVertical), {
						"data-v-ui-bffa0889dfe6": "",
						size: 20
					}, null, _parent));
					_push(`</button><div data-v-ui-bffa0889dfe6 class="workspace-sort-content"><div data-v-ui-bffa0889dfe6 class="sb-cms-block-toolbar"><span data-v-ui-bffa0889dfe6>Блок ${ssrInterpolate(index + 1)}</span><div data-v-ui-bffa0889dfe6><button data-v-ui-bffa0889dfe6${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""} aria-label="Удалить блок">Удалить</button></div></div><div data-v-ui-bffa0889dfe6 class="sb-cms-flags"><label data-v-ui-bffa0889dfe6>Формат<select data-v-ui-bffa0889dfe6 aria-label="Формат"${ssrRenderAttr("value", block.kind || "text")}${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}><option value="text">Текстовый раздел</option><option value="hero">Обложка и кнопки страницы</option><option value="feature">Карточка преимущества</option><option value="steps">Пошаговый процесс</option><option value="faq">Раскрываемый вопрос</option><option value="action">Приглашение к действию</option><option value="biography">Биография и фотослайдер</option></select></label><label data-v-ui-bffa0889dfe6>Иконка<select data-v-ui-bffa0889dfe6 aria-label="Иконка"${ssrRenderAttr("value", block.icon || "")}${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}><option value="">Без иконки</option><option value="business">Бизнес</option><option value="calendar">Календарь</option><option value="users">Команда</option><option value="gift">Бонусы</option><option value="link">Ссылка</option><option value="chart">Аналитика</option><option value="wallet">Выплаты</option><option value="shield">Условия</option></select></label></div><label data-v-ui-bffa0889dfe6>Заголовок блока<input data-v-ui-bffa0889dfe6${ssrRenderAttr("value", block.title)}${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""} maxlength="180"></label><label data-v-ui-bffa0889dfe6>Текст<textarea data-v-ui-bffa0889dfe6${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""} maxlength="20000" rows="7">${ssrInterpolate(block.body)}</textarea><small data-v-ui-bffa0889dfe6>Каждая новая строка — отдельный абзац. HTML не исполняется.</small></label><details data-v-ui-bffa0889dfe6 class="sb-cms-page-actions"><summary data-v-ui-bffa0889dfe6>Кнопки блока / обложки</summary><label data-v-ui-bffa0889dfe6>Подпись основной кнопки<input data-v-ui-bffa0889dfe6${ssrRenderAttr("value", block.buttonLabel)}${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""} maxlength="80"></label><label data-v-ui-bffa0889dfe6>Адрес основной кнопки<input data-v-ui-bffa0889dfe6${ssrRenderAttr("value", block.buttonUrl)}${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""} maxlength="500" placeholder="/business-registration"></label><label data-v-ui-bffa0889dfe6>Подпись второй кнопки<input data-v-ui-bffa0889dfe6${ssrRenderAttr("value", block.secondaryLabel)}${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""} maxlength="80"></label><label data-v-ui-bffa0889dfe6>Адрес второй кнопки<input data-v-ui-bffa0889dfe6${ssrRenderAttr("value", block.secondaryUrl)}${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""} maxlength="500" placeholder="/contacts"></label><small data-v-ui-bffa0889dfe6>Подпись и адрес заполняются вместе. Для шагов и обложки каждая новая строка текста — отдельный пункт.</small></details>`);
					if (block.kind === "biography") {
						_push(`<div class="sb-cms-biography-images"><h3>Фотографии слайдера</h3><!--[-->`);
						ssrRenderList(block.images || [], (photo, photoIndex) => {
							_push(`<div>`);
							_push(ssrRenderComponent(_component_AdminMediaPicker, {
								"model-value": photo,
								"api-base": unref(config).public.apiBase,
								token: unref(token),
								disabled: unref(busy),
								label: "Фотография " + (photoIndex + 1),
								"onUpdate:modelValue": ($event) => block.images[photoIndex] = $event
							}, null, _parent));
							_push(`<button type="button"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}${ssrRenderAttr("aria-label", "Удалить фотографию " + (photoIndex + 1))}>`);
							_push(ssrRenderComponent(unref(Trash2), { size: 18 }, null, _parent));
							_push(`</button></div>`);
						});
						_push(`<!--]--><button type="button"${ssrIncludeBooleanAttr(unref(busy) || (block.images || []).length >= 12) ? " disabled" : ""}>`);
						_push(ssrRenderComponent(unref(Plus), { size: 18 }, null, _parent));
						_push(` Добавить фотографию</button><small>До 12 фотографий. Текст биографии редактируется в поле выше.</small></div>`);
					} else _push(`<!---->`);
					_push(`</div></section>`);
				});
				_push(`<!--]--><p data-v-ui-bffa0889dfe6 class="sb-cms-order-announcement" aria-live="polite">${ssrInterpolate(unref(blockAnnouncement))}</p><footer data-v-ui-bffa0889dfe6 class="sb-cms-savebar"><button data-v-ui-bffa0889dfe6 class="sb-cms-primary"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}>`);
				_push(ssrRenderComponent(unref(Save), {
					"data-v-ui-bffa0889dfe6": "",
					size: 16
				}, null, _parent));
				_push(` ${ssrInterpolate(unref(busy) ? "Сохраняем…" : "Сохранить страницу")}</button><button data-v-ui-bffa0889dfe6${ssrIncludeBooleanAttr(unref(busy) || unref(editor)._new) ? " disabled" : ""}>Загрузить сохранённую версию</button><button data-v-ui-bffa0889dfe6${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""} aria-label="Удалить страницу">`);
				_push(ssrRenderComponent(unref(Trash2), {
					"data-v-ui-bffa0889dfe6": "",
					size: 16
				}, null, _parent));
				_push(` Удалить страницу</button></footer></article>`);
			} else _push(`<!---->`);
			_push(`</div></section>`);
		};
	}
});
// components/storefront/SitePagesEditor.vue
var _sfc_setup$9 = SitePagesEditor_vue_vue_type_script_setup_true_lang_default.setup;
SitePagesEditor_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/storefront/SitePagesEditor.vue");
	return _sfc_setup$9 ? _sfc_setup$9(props, ctx) : void 0;
};
var SitePagesEditor_default = Object.assign(SitePagesEditor_vue_vue_type_script_setup_true_lang_default, { __name: "SitePagesEditor" });
// components/storefront/SiteContentEditor.vue?vue&type=script&setup=true&lang.ts
var SiteContentEditor_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "SiteContentEditor",
	__ssrInlineRender: true,
	props: {
		apiBase: {},
		token: {}
	},
	setup(__props) {
		const props = __props;
		const tabs = [
			{
				id: "home",
				label: "Главная"
			},
			{
				id: "header",
				label: "Шапка и футер"
			},
			{
				id: "contacts",
				label: "Контакты"
			},
			{
				id: "history",
				label: "История"
			}
		];
		const tab = ref("home");
		const selectedHome = ref("categories");
		const draft = ref(mergeSiteContent({}));
		const baseline = ref("");
		const revision = ref(null);
		const loaded = ref(false), loading = ref(false), saving = ref(false), conflict = ref(false), forbidden = ref(false);
		const error = ref(""), notice = ref(""), referenceError = ref(""), historyError = ref("");
		const pages = ref([]), products = ref([]);
		const productsLoaded = ref(false), referencesLoading = ref(false);
		const productPage = ref(1), productTotal = ref(0), productMoreLoading = ref(false);
		const history = ref([]), historyLoading = ref(false), historyLoaded = ref(false);
		const historyTotal = ref(0);
		const preview = ref(false), previewWidth = ref("desktop");
		ref(null);
		const moveNotice = ref("");
		const snapshot = () => JSON.stringify(draft.value);
		const dirty = computed(() => loaded.value && snapshot() !== baseline.value);
		const busy = computed(() => loading.value || saving.value);
		const editingDisabled = computed(() => busy.value || forbidden.value);
		const sectionNames = {
			hero: "Главный баннер",
			categories: "Категории",
			bestsellers: "Бестселлеры",
			business: "Для бизнеса",
			referral: "Реферальная программа",
			bloggers: "Блогерам",
			club: "SARKISIAN CLUB",
			manifesto: "О бренде — главный тезис",
			story: "История и портрет",
			benefits: "Преимущества"
		};
		const partnershipFields = [
			{
				key: "eyebrow",
				label: "Надзаголовок",
				max: 100
			},
			{
				key: "title",
				label: "Заголовок",
				max: 200
			},
			{
				key: "accent",
				label: "Акцент заголовка",
				max: 200
			},
			{
				key: "body",
				label: "Описание",
				max: 1e3,
				multiline: true
			},
			{
				key: "buttonLabel",
				label: "Подпись кнопки",
				max: 80
			},
			{
				key: "url",
				label: "Адрес кнопки",
				max: 500
			},
			{
				key: "visualLabel",
				label: "Подпись иллюстрации",
				max: 100
			},
			{
				key: "visualTitle",
				label: "Заголовок иллюстрации",
				max: 200
			}
		];
		const businessPreviewFields = [
			{
				key: "salonTitle",
				label: "Название вкладки салона",
				max: 80
			},
			{
				key: "purchasesTitle",
				label: "Название вкладки закупок",
				max: 80
			},
			{
				key: "scheduleTitle",
				label: "Заголовок расписания",
				max: 80
			},
			{
				key: "breakTitle",
				label: "Подпись перерыва",
				max: 80
			},
			{
				key: "appointmentTitle",
				label: "Первая услуга в примере",
				max: 80
			},
			{
				key: "appointmentDetail",
				label: "Подпись первой записи",
				max: 80
			},
			{
				key: "secondAppointmentTitle",
				label: "Вторая услуга в примере",
				max: 80
			},
			{
				key: "secondAppointmentDetail",
				label: "Подпись второй записи",
				max: 80
			},
			{
				key: "widgetTitle",
				label: "Заголовок примера виджета",
				max: 80
			},
			{
				key: "widgetAction",
				label: "Подпись действия в виджете",
				max: 80
			},
			{
				key: "productTitle",
				label: "Название демонстрационного товара",
				max: 80
			},
			{
				key: "productDetail",
				label: "Описание демонстрационного товара",
				max: 80
			},
			{
				key: "productCaption",
				label: "Подпись примерной цены",
				max: 80
			},
			{
				key: "productImageUrl",
				label: "Фото демонстрационного товара",
				max: 500
			},
			{
				key: "orderTitle",
				label: "Заголовок примера заказа",
				max: 80
			},
			{
				key: "orderBody",
				label: "Этапы доставки в примере",
				max: 80
			},
			{
				key: "demoLabel",
				label: "Пометка демонстрационных данных",
				max: 80
			}
		];
		const businessPreviewData = computed(() => draft.value.home.business.preview);
		const sectionFields = {
			business: partnershipFields,
			referral: partnershipFields,
			bloggers: partnershipFields,
			categories: [
				{
					key: "eyebrow",
					label: "Надзаголовок",
					max: 100
				},
				{
					key: "title",
					label: "Заголовок",
					max: 200
				},
				{
					key: "buttonLabel",
					label: "Кнопка каталога",
					max: 80
				}
			],
			bestsellers: [
				{
					key: "eyebrow",
					label: "Надзаголовок",
					max: 100
				},
				{
					key: "title",
					label: "Заголовок",
					max: 200
				},
				{
					key: "buttonLabel",
					label: "Кнопка каталога",
					max: 80
				}
			],
			club: [
				{
					key: "label",
					label: "Название клуба",
					max: 80
				},
				{
					key: "title",
					label: "Заголовок",
					max: 200
				},
				{
					key: "accent",
					label: "Акцент заголовка",
					max: 200
				},
				{
					key: "joinLabel",
					label: "Кнопка вступления",
					max: 80
				},
				{
					key: "aboutLabel",
					label: "Кнопка страницы клуба",
					max: 80
				},
				{
					key: "previewLabel",
					label: "Подпись демонстрационной карты",
					max: 100
				}
			],
			manifesto: [{
				key: "text",
				label: "Главный тезис о бренде",
				max: 500,
				multiline: true
			}],
			story: [
				{
					key: "eyebrow",
					label: "Надзаголовок",
					max: 100
				},
				{
					key: "title",
					label: "Заголовок",
					max: 200
				},
				{
					key: "accent",
					label: "Акцент заголовка",
					max: 200
				},
				{
					key: "body",
					label: "Текст",
					max: 2e3,
					multiline: true
				},
				{
					key: "buttonLabel",
					label: "Кнопка каталога",
					max: 80
				}
			]
		};
		function sectionData(key) {
			return draft.value.home[key] || {};
		}
		function publicSiteUrl() {
			const config = useRuntimeConfig();
			return String(config.public.siteUrl || "/");
		}
		const siteUrl = publicSiteUrl();
		function pageChoice(item) {
			return pages.value.some((page) => "/" + page.slug === item.url) ? item.url : "";
		}
		const leave = () => !saving.value && (!dirty.value || (void 0).confirm("Уйти без сохранения контента сайта?"));
		watch(() => [props.apiBase, props.token], () => {});
		onBeforeRouteLeave(leave);
		onBeforeRouteUpdate(leave);
		return (_ctx, _push, _parent, _attrs) => {
			const _component_AdminMediaPicker = AdminMediaPicker_default;
			_push(`<section${ssrRenderAttrs(mergeProps({ class: "site-content-admin" }, _attrs))}><header class="sca-panel sca-head"><div><p class="sca-eyebrow">КОНТЕНТ МАГАЗИНА</p><h1>Контент сайта</h1><p>Главная, бренд, контакты и футер. Баннеры, меню шапки и тексты страниц редактируются в своих разделах.</p></div><div class="sca-actions"><a class="sca-button sca-button--white"${ssrRenderAttr("href", unref(siteUrl))} target="_blank" rel="noopener noreferrer">Открыть сайт</a><button class="sca-button sca-button--white" type="button"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}>Обновить контент</button></div></header><nav class="sca-tabs" aria-label="Разделы контента"><!--[-->`);
			ssrRenderList(tabs, (item) => {
				_push(`<button type="button" class="${ssrRenderClass({ "is-active": unref(tab) === item.id })}"${ssrRenderAttr("aria-current", unref(tab) === item.id ? "page" : void 0)}${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""}>${ssrInterpolate(item.label)}</button>`);
			});
			_push(`<!--]--></nav>`);
			if (unref(error)) {
				_push(`<p class="sca-notice" role="alert">${ssrInterpolate(unref(error))} `);
				if (!unref(loaded)) _push(`<button class="sca-button sca-button--white" type="button"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}>Повторить загрузку</button>`);
				else _push(`<!---->`);
				_push(`</p>`);
			} else _push(`<!---->`);
			if (unref(notice)) _push(`<p class="sca-notice" role="status">${ssrInterpolate(unref(notice))}</p>`);
			else _push(`<!---->`);
			if (unref(loading)) _push(`<p class="sca-notice" role="status">Загружаем контент…</p>`);
			else _push(`<!---->`);
			_push(`<p class="sca-sr-only" aria-live="polite">${ssrInterpolate(unref(moveNotice))}</p>`);
			if (unref(loaded) && unref(tab) !== "history") {
				_push(`<form novalidate><fieldset${ssrIncludeBooleanAttr(unref(editingDisabled)) ? " disabled" : ""} class="sca-fields">`);
				if (unref(tab) === "home") {
					_push(`<div class="studio-content-layout"><section class="sca-panel studio-content-outline"><header class="sca-group-head"><div><p class="sca-eyebrow">ГЛАВНАЯ СТРАНИЦА</p><h3>Структура страницы</h3></div></header><p class="sca-help">Выберите блок для редактирования. Перетаскивайте за ручку, чтобы изменить порядок.</p><label class="studio-mobile-block-picker"><span>Редактируемый блок</span><select aria-label="Выбрать блок главной"><!--[-->`);
					ssrRenderList(unref(draft).home.order, (key) => {
						_push(`<option${ssrRenderAttr("value", key)}${ssrIncludeBooleanAttr(Array.isArray(unref(selectedHome)) ? ssrLooseContain(unref(selectedHome), key) : ssrLooseEqual(unref(selectedHome), key)) ? " selected" : ""}>${ssrInterpolate(sectionNames[key])}</option>`);
					});
					_push(`<!--]--></select></label><ol class="sca-order"><!--[-->`);
					ssrRenderList(unref(draft).home.order, (key, index) => {
						_push(`<li class="${ssrRenderClass([{ "studio-content-block--selected": unref(selectedHome) === key }, "sca-order-row studio-content-block"])}"><button class="sca-handle" type="button"${ssrRenderAttr("draggable", !unref(editingDisabled))}${ssrRenderAttr("aria-label", "Перетащить " + sectionNames[key])}>`);
						_push(ssrRenderComponent(unref(GripVertical), { size: 16 }, null, _parent));
						_push(`</button><button type="button" class="studio-block-select"${ssrRenderAttr("aria-pressed", unref(selectedHome) === key)}><span>${ssrInterpolate(sectionNames[key])}</span><small>${ssrInterpolate(unref(draft).home.hidden.includes(key) ? "Скрыт" : "На сайте")}</small></button><button type="button" class="sca-close studio-block-visibility"${ssrRenderAttr("aria-label", (unref(draft).home.hidden.includes(key) ? "Показать " : "Скрыть ") + sectionNames[key])}${ssrRenderAttr("aria-pressed", !unref(draft).home.hidden.includes(key))}>`);
						if (unref(draft).home.hidden.includes(key)) _push(ssrRenderComponent(unref(EyeOff), { size: 16 }, null, _parent));
						else _push(ssrRenderComponent(unref(Eye), { size: 16 }, null, _parent));
						_push(`</button></li>`);
					});
					_push(`<!--]--></ol><button class="sca-button sca-button--white" type="button">${ssrInterpolate(unref(preview) ? "Закрыть просмотр структуры" : "Просмотреть структуру")}</button></section><div class="studio-content-detail">`);
					if (unref(preview)) {
						_push(`<section class="sca-panel"><header class="sca-group-head"><h3>Черновой просмотр</h3><select aria-label="Ширина чернового просмотра"><option value="desktop"${ssrIncludeBooleanAttr(Array.isArray(unref(previewWidth)) ? ssrLooseContain(unref(previewWidth), "desktop") : ssrLooseEqual(unref(previewWidth), "desktop")) ? " selected" : ""}>ПК — структура</option><option value="mobile"${ssrIncludeBooleanAttr(Array.isArray(unref(previewWidth)) ? ssrLooseContain(unref(previewWidth), "mobile") : ssrLooseEqual(unref(previewWidth), "mobile")) ? " selected" : ""}>Телефон — структура</option></select></header><p class="sca-help">Это текстовая структура черновика, не точный рендер сайта. Изменения ещё не опубликованы; баланс карты демонстрационный.</p><div class="${ssrRenderClass([{ "sca-preview--mobile": unref(previewWidth) === "mobile" }, "sca-preview"])}"><!--[-->`);
						ssrRenderList(unref(draft).home.order.filter((item) => !unref(draft).home.hidden.includes(item)), (key) => {
							_push(`<article><small>${ssrInterpolate(sectionNames[key])}</small><h4>${ssrInterpolate(sectionData(key).title || sectionData(key).text || sectionNames[key])}</h4><p>${ssrInterpolate(sectionData(key).accent || sectionData(key).body || "")}</p></article>`);
						});
						_push(`<!--]--></div></section>`);
					} else _push(`<!---->`);
					_push(`<!--[-->`);
					ssrRenderList(unref(draft).home.order.filter((item) => item === unref(selectedHome)), (key) => {
						_push(`<section class="sca-panel studio-content-fields"><header class="sca-group-head"><div><p class="sca-eyebrow">НАСТРОЙКИ БЛОКА</p><h3>${ssrInterpolate(sectionNames[key])}</h3></div><span class="${ssrRenderClass([{ "studio-status--muted": unref(draft).home.hidden.includes(key) }, "studio-status"])}">${ssrInterpolate(unref(draft).home.hidden.includes(key) ? "Скрыт на сайте" : "Показывается на сайте")}</span></header>`);
						if (key === "hero") _push(`<p class="sca-help">Изображения, ссылки и смена главного баннера настраиваются в редакторе баннеров. Здесь доступны порядок и видимость блока.</p>`);
						else _push(`<!---->`);
						if (sectionFields[key]?.length) {
							_push(`<div class="sca-grid"><!--[-->`);
							ssrRenderList(sectionFields[key], (field) => {
								_push(`<label class="${ssrRenderClass([{ "sca-wide": field.multiline }, "sca-field"])}"><span>${ssrInterpolate(field.label)}</span>`);
								if (field.multiline) _push(`<textarea${ssrRenderAttr("maxlength", field.max)} rows="4">${ssrInterpolate(sectionData(key)[field.key])}</textarea>`);
								else _push(`<input${ssrRenderAttr("value", sectionData(key)[field.key])}${ssrRenderAttr("maxlength", field.max)} type="text">`);
								_push(`</label>`);
							});
							_push(`<!--]--></div>`);
						} else _push(`<!---->`);
						if (key === "bestsellers") {
							_push(`<!--[--><label class="sca-field"><span>Источник товаров</span><select><option value="popular"${ssrIncludeBooleanAttr(Array.isArray(unref(draft).home.bestsellers.mode) ? ssrLooseContain(unref(draft).home.bestsellers.mode, "popular") : ssrLooseEqual(unref(draft).home.bestsellers.mode, "popular")) ? " selected" : ""}>По популярности</option><option value="manual"${ssrIncludeBooleanAttr(Array.isArray(unref(draft).home.bestsellers.mode) ? ssrLooseContain(unref(draft).home.bestsellers.mode, "manual") : ssrLooseEqual(unref(draft).home.bestsellers.mode, "manual")) ? " selected" : ""}>Ручная подборка</option></select></label><p class="sca-help">До восьми товаров. Неактивные ранее выбранные товары сохраняются в настройках, но не показываются на сайте.</p>`);
							if (unref(draft).home.bestsellers.mode === "manual") {
								_push(`<label class="sca-field"><span>Товары подборки</span><select multiple size="8"${ssrIncludeBooleanAttr(unref(referencesLoading) || !unref(productsLoaded)) ? " disabled" : ""} aria-label="Выбрать до восьми товаров"><!--[-->`);
								ssrRenderList(unref(products).filter((item) => item.isActive || unref(draft).home.bestsellers.productIds.includes(item.id)), (product) => {
									_push(`<option${ssrRenderAttr("value", product.id)}${ssrIncludeBooleanAttr(Array.isArray(unref(draft).home.bestsellers.productIds) ? ssrLooseContain(unref(draft).home.bestsellers.productIds, product.id) : ssrLooseEqual(unref(draft).home.bestsellers.productIds, product.id)) ? " selected" : ""}>${ssrInterpolate(product.nameRu)}${ssrInterpolate(product.isActive ? "" : " — скрыт")}</option>`);
								});
								_push(`<!--]--><!--[-->`);
								ssrRenderList(unref(draft).home.bestsellers.productIds.filter((value) => !unref(products).some((product) => product.id === value)), (id) => {
									_push(`<option${ssrRenderAttr("value", id)}${ssrIncludeBooleanAttr(Array.isArray(unref(draft).home.bestsellers.productIds) ? ssrLooseContain(unref(draft).home.bestsellers.productIds, id) : ssrLooseEqual(unref(draft).home.bestsellers.productIds, id)) ? " selected" : ""}>Недоступный товар · ${ssrInterpolate(id)}</option>`);
								});
								_push(`<!--]--></select></label>`);
							} else _push(`<!---->`);
							if (unref(draft).home.bestsellers.mode === "manual") {
								_push(`<div class="sca-actions"><small class="sca-help">Выбрано ${ssrInterpolate(unref(draft).home.bestsellers.productIds.length)} из 8 · загружено ${ssrInterpolate(unref(products).length)} из ${ssrInterpolate(unref(productTotal))} товаров.</small>`);
								if (unref(productPage) * 100 < unref(productTotal)) _push(`<button class="sca-button sca-button--white" type="button"${ssrIncludeBooleanAttr(unref(referencesLoading) || unref(productMoreLoading) || unref(busy)) ? " disabled" : ""}>${ssrInterpolate(unref(productMoreLoading) ? "Загружаем…" : "Загрузить ещё товары")}</button>`);
								else _push(`<!---->`);
								_push(`</div>`);
							} else _push(`<!---->`);
							if (unref(draft).home.bestsellers.mode === "manual") {
								_push(`<ol class="sca-order"><!--[-->`);
								ssrRenderList(unref(draft).home.bestsellers.productIds, (id, index) => {
									_push(`<li class="sca-order-row workspace-product-sort-row"><button class="sca-handle" type="button"${ssrRenderAttr("draggable", !unref(editingDisabled))}${ssrRenderAttr("aria-label", "Перетащить товар подборки " + (index + 1))}>`);
									_push(ssrRenderComponent(unref(GripVertical), { size: 20 }, null, _parent));
									_push(`</button><strong>${ssrInterpolate(unref(products).find((product) => product.id === id)?.nameRu || "Товар вне загруженных страниц")}</strong><div class="sca-actions"><button class="sca-close" type="button"${ssrRenderAttr("aria-label", "Убрать товар подборки " + (index + 1))}>`);
									_push(ssrRenderComponent(unref(X), { size: 20 }, null, _parent));
									_push(`</button></div></li>`);
								});
								_push(`<!--]--></ol>`);
							} else _push(`<!---->`);
							_push(`<!--]-->`);
						} else _push(`<!---->`);
						if (key === "club") {
							_push(`<!--[--><label class="sca-field"><span>Демонстрационный баланс</span><input${ssrRenderAttr("value", unref(draft).home.club.previewBalance)} type="number" min="0" max="1000000" step="1"><small>Не изменяет реальные бонусные счета.</small></label><header class="sca-group-head"><h4>Преимущества вступления</h4><button class="sca-button sca-button--white" type="button"${ssrIncludeBooleanAttr(unref(draft).home.club.benefits.length >= 6) ? " disabled" : ""}>`);
							_push(ssrRenderComponent(unref(Plus), { size: 18 }, null, _parent));
							_push(` Добавить</button></header><!--[-->`);
							ssrRenderList(unref(draft).home.club.benefits, (item, index) => {
								_push(`<div class="sca-inline-item"><label class="sca-field"><span>Иконка</span><select><option value="award"${ssrIncludeBooleanAttr(Array.isArray(item.icon) ? ssrLooseContain(item.icon, "award") : ssrLooseEqual(item.icon, "award")) ? " selected" : ""}>Бонусы</option><option value="gift"${ssrIncludeBooleanAttr(Array.isArray(item.icon) ? ssrLooseContain(item.icon, "gift") : ssrLooseEqual(item.icon, "gift")) ? " selected" : ""}>Подарок</option><option value="shield"${ssrIncludeBooleanAttr(Array.isArray(item.icon) ? ssrLooseContain(item.icon, "shield") : ssrLooseEqual(item.icon, "shield")) ? " selected" : ""}>Защита</option></select></label><label class="sca-field"><span>Текст преимущества</span><input${ssrRenderAttr("value", item.text)} maxlength="250"></label><button class="sca-close" type="button"${ssrRenderAttr("aria-label", "Удалить преимущество клуба " + (index + 1))}>`);
								_push(ssrRenderComponent(unref(X), { size: 20 }, null, _parent));
								_push(`</button></div>`);
							});
							_push(`<!--]--><!--]-->`);
						} else _push(`<!---->`);
						if (key === "business") {
							_push(`<section class="sca-panel" aria-label="Редактирование мини-макета B2B"><h3>Мини-макет кабинета</h3><p class="sca-help">Демонстрация на главной: вкладки салона и закупок. Не меняет реальные услуги, цены или заказы. Время записей в иллюстрации фиксированное.</p><div class="sca-grid"><!--[-->`);
							ssrRenderList(businessPreviewFields.filter((item) => item.key !== "productImageUrl"), (field) => {
								_push(`<label class="sca-field"><span>${ssrInterpolate(field.label)}</span><input${ssrRenderAttr("value", unref(businessPreviewData)[field.key])}${ssrRenderAttr("maxlength", field.max)}></label>`);
							});
							_push(`<!--]--><label class="sca-field"><span>Цена товара в примере, ₽</span><input${ssrRenderAttr("value", unref(businessPreviewData).productPrice)} type="number" min="0" max="1000000" step="1"></label></div>`);
							_push(ssrRenderComponent(_component_AdminMediaPicker, {
								modelValue: unref(businessPreviewData).productImageUrl,
								"onUpdate:modelValue": ($event) => unref(businessPreviewData).productImageUrl = $event,
								"api-base": __props.apiBase,
								token: __props.token,
								disabled: unref(editingDisabled),
								label: "Фото демонстрационного товара"
							}, null, _parent));
							_push(`</section>`);
						} else _push(`<!---->`);
						if (key === "story") _push(ssrRenderComponent(_component_AdminMediaPicker, {
							modelValue: unref(draft).home.story.portraitUrl,
							"onUpdate:modelValue": ($event) => unref(draft).home.story.portraitUrl = $event,
							"api-base": __props.apiBase,
							token: __props.token,
							disabled: unref(editingDisabled),
							label: "Портрет без фона"
						}, null, _parent));
						else _push(`<!---->`);
						if (key === "bloggers") _push(ssrRenderComponent(_component_AdminMediaPicker, {
							modelValue: unref(draft).home.bloggers.visualImageUrl,
							"onUpdate:modelValue": ($event) => unref(draft).home.bloggers.visualImageUrl = $event,
							"api-base": __props.apiBase,
							token: __props.token,
							disabled: unref(editingDisabled),
							label: "Изображение на экране iPhone"
						}, null, _parent));
						else _push(`<!---->`);
						if (key === "bloggers") _push(`<label>Видео на экране iPhone (MP4)<input${ssrRenderAttr("value", unref(draft).home.bloggers.visualVideoUrl)}${ssrIncludeBooleanAttr(unref(editingDisabled)) ? " disabled" : ""} placeholder="/storefront/video.mp4"><small>Локальный путь или HTTPS-ссылка. Оставьте пустым, чтобы показывать только изображение.</small></label>`);
						else _push(`<!---->`);
						if (key === "business" || key === "referral" || key === "bloggers") {
							_push(`<!--[--><label class="sca-field"><span>Оформление блока</span><select><option value="dark"${ssrIncludeBooleanAttr(Array.isArray(unref(draft).home[key].theme) ? ssrLooseContain(unref(draft).home[key].theme, "dark") : ssrLooseEqual(unref(draft).home[key].theme, "dark")) ? " selected" : ""}>Тёмный — графит</option><option value="rose"${ssrIncludeBooleanAttr(Array.isArray(unref(draft).home[key].theme) ? ssrLooseContain(unref(draft).home[key].theme, "rose") : ssrLooseEqual(unref(draft).home[key].theme, "rose")) ? " selected" : ""}>Светлый — стекло</option><option value="light"${ssrIncludeBooleanAttr(Array.isArray(unref(draft).home[key].theme) ? ssrLooseContain(unref(draft).home[key].theme, "light") : ssrLooseEqual(unref(draft).home[key].theme, "light")) ? " selected" : ""}>Белый</option></select></label>`);
							if (key !== "bloggers") _push(`<label class="sca-field"><span>Строки иллюстрации</span><textarea maxlength="604" rows="4">${ssrInterpolate(unref(draft).home[key].visualLines.join("\n"))}</textarea><small>До четырёх строк, по 150 символов. Каждая новая строка — отдельный пункт.</small></label>`);
							else _push(`<!---->`);
							_push(`<a class="sca-button sca-button--white" href="/admin-workspace/pages">Редактировать страницу перехода</a><p class="sca-help">Тексты, адрес кнопки, иллюстрация и тема сохраняются вместе с остальным контентом. Блок можно скрыть или переместить в структуре слева.</p><!--]-->`);
						} else _push(`<!---->`);
						if (key === "benefits") {
							_push(`<!--[--><header class="sca-group-head"><p class="sca-help">До восьми преимуществ.</p><button class="sca-button sca-button--white" type="button"${ssrIncludeBooleanAttr(unref(draft).home.benefits.length >= 8) ? " disabled" : ""}>`);
							_push(ssrRenderComponent(unref(Plus), { size: 18 }, null, _parent));
							_push(` Добавить</button></header><!--[-->`);
							ssrRenderList(unref(draft).home.benefits, (item, index) => {
								_push(`<article class="sca-subpanel"><header class="sca-group-head"><h4>Преимущество ${ssrInterpolate(index + 1)}</h4><button class="sca-close" type="button"${ssrRenderAttr("aria-label", "Удалить преимущество " + (index + 1))}>`);
								_push(ssrRenderComponent(unref(X), { size: 20 }, null, _parent));
								_push(`</button></header><div class="sca-grid"><label class="sca-field"><span>Иконка</span><select><option value="package"${ssrIncludeBooleanAttr(Array.isArray(item.icon) ? ssrLooseContain(item.icon, "package") : ssrLooseEqual(item.icon, "package")) ? " selected" : ""}>Посылка</option><option value="shield"${ssrIncludeBooleanAttr(Array.isArray(item.icon) ? ssrLooseContain(item.icon, "shield") : ssrLooseEqual(item.icon, "shield")) ? " selected" : ""}>Защита</option><option value="award"${ssrIncludeBooleanAttr(Array.isArray(item.icon) ? ssrLooseContain(item.icon, "award") : ssrLooseEqual(item.icon, "award")) ? " selected" : ""}>Бонусы</option><option value="sparkles"${ssrIncludeBooleanAttr(Array.isArray(item.icon) ? ssrLooseContain(item.icon, "sparkles") : ssrLooseEqual(item.icon, "sparkles")) ? " selected" : ""}>Экспертиза</option></select></label><label class="sca-field"><span>Надзаголовок</span><input${ssrRenderAttr("value", item.eyebrow)} maxlength="100"></label><label class="sca-field sca-wide"><span>Заголовок</span><input${ssrRenderAttr("value", item.title)} maxlength="200"></label><label class="sca-field sca-wide"><span>Описание</span><textarea maxlength="1000" rows="3">${ssrInterpolate(item.body)}</textarea></label></div></article>`);
							});
							_push(`<!--]--><!--]-->`);
						} else _push(`<!---->`);
						_push(`</section>`);
					});
					_push(`<!--]--></div></div>`);
				} else if (unref(tab) === "header") {
					_push(`<!--[--><section class="sca-panel"><h3>Бренд и шапка</h3><label class="sca-field"><span>Название бренда</span><input${ssrRenderAttr("value", unref(draft).brand.name)} maxlength="80"></label>`);
					_push(ssrRenderComponent(_component_AdminMediaPicker, {
						modelValue: unref(draft).brand.logoUrl,
						"onUpdate:modelValue": ($event) => unref(draft).brand.logoUrl = $event,
						"api-base": __props.apiBase,
						token: __props.token,
						disabled: unref(editingDisabled),
						label: "Логотип"
					}, null, _parent));
					_push(`<label class="sca-field"><span>Описание бренда в футере</span><textarea maxlength="500" rows="3">${ssrInterpolate(unref(draft).brand.footerText)}</textarea></label><p class="sca-help">Текст верхней строки и пункты меню шапки пока редактируются в разделе «Витрина».</p></section><section class="sca-panel"><header class="sca-group-head"><h3>Колонки футера</h3><button class="sca-button sca-button--white" type="button"${ssrIncludeBooleanAttr(unref(draft).footer.columns.length >= 4) ? " disabled" : ""}>`);
					_push(ssrRenderComponent(unref(Plus), { size: 18 }, null, _parent));
					_push(` Добавить колонку</button></header><p class="sca-help">Колонки и ссылки перемещаются за ручку слева. Ссылки нельзя перетаскивать между колонками.</p><!--[-->`);
					ssrRenderList(unref(draft).footer.columns, (column, columnIndex) => {
						_push(`<article class="sca-subpanel"><header class="sca-group-head"><button class="sca-handle" type="button"${ssrRenderAttr("draggable", !unref(editingDisabled))}${ssrRenderAttr("aria-label", "Перетащить колонку " + (columnIndex + 1))}>`);
						_push(ssrRenderComponent(unref(GripVertical), { size: 20 }, null, _parent));
						_push(`</button><label class="sca-field sca-grow"><span>Заголовок колонки</span><input${ssrRenderAttr("value", column.title)} maxlength="100"></label><div class="sca-actions"><button class="sca-close" type="button"${ssrRenderAttr("aria-label", "Удалить колонку " + (columnIndex + 1))}>`);
						_push(ssrRenderComponent(unref(X), { size: 20 }, null, _parent));
						_push(`</button></div></header><!--[-->`);
						ssrRenderList(column.items, (item, itemIndex) => {
							_push(`<div class="sca-link-editor"><div class="sca-group-head"><button class="sca-handle" type="button"${ssrRenderAttr("draggable", !unref(editingDisabled))}${ssrRenderAttr("aria-label", "Перетащить ссылку " + (itemIndex + 1))}>`);
							_push(ssrRenderComponent(unref(GripVertical), { size: 20 }, null, _parent));
							_push(`</button><label class="sca-field sca-grow"><span>Название ссылки</span><input${ssrRenderAttr("value", item.label)} maxlength="80"></label><div class="sca-actions"><button class="sca-close" type="button"${ssrRenderAttr("aria-label", "Удалить ссылку " + (itemIndex + 1))}>`);
							_push(ssrRenderComponent(unref(X), { size: 20 }, null, _parent));
							_push(`</button></div></div><div class="sca-grid"><label class="sca-field"><span>Действие</span><select${ssrRenderAttr("value", item.action)}><option value="none">Перейти по ссылке</option><option value="account">Открыть аккаунт</option><option value="favorites">Открыть избранное</option><option value="cart">Открыть корзину</option></select></label>`);
							if (item.action === "none") {
								_push(`<label class="sca-field"><span>Страница сайта</span><select${ssrRenderAttr("value", pageChoice(item))}${ssrIncludeBooleanAttr(unref(referencesLoading)) ? " disabled" : ""}><option value="">Другой адрес / выбрать страницу</option><!--[-->`);
								ssrRenderList(unref(pages), (page) => {
									_push(`<option${ssrRenderAttr("value", "/" + page.slug)}>${ssrInterpolate(page.title)}${ssrInterpolate(page.isActive ? "" : " — скрыта")}</option>`);
								});
								_push(`<!--]--></select></label>`);
							} else _push(`<!---->`);
							_push(`</div>`);
							if (item.action === "none") _push(`<!--[--><small class="sca-help">${ssrInterpolate(item.url || "Адрес не задан")}</small><details class="sca-custom"><summary>Указать другой адрес</summary><label class="sca-field"><span>Внутренний путь или HTTPS URL</span><input${ssrRenderAttr("value", item.url)} maxlength="500" placeholder="/catalog"></label></details><label class="sca-checkbox"><input${ssrIncludeBooleanAttr(Array.isArray(item.newTab) ? ssrLooseContain(item.newTab, null) : item.newTab) ? " checked" : ""} type="checkbox"> В новой вкладке</label><!--]-->`);
							else _push(`<!---->`);
							_push(`</div>`);
						});
						_push(`<!--]--><button class="sca-button sca-button--white" type="button"${ssrIncludeBooleanAttr(column.items.length >= 12) ? " disabled" : ""}>`);
						_push(ssrRenderComponent(unref(Plus), { size: 18 }, null, _parent));
						_push(` Добавить ссылку</button></article>`);
					});
					_push(`<!--]--></section><section class="sca-panel"><header class="sca-group-head"><h3>Юридические ссылки</h3><button class="sca-button sca-button--white" type="button"${ssrIncludeBooleanAttr(unref(draft).footer.legalLinks.length >= 8) ? " disabled" : ""}>`);
					_push(ssrRenderComponent(unref(Plus), { size: 18 }, null, _parent));
					_push(` Добавить ссылку</button></header><!--[-->`);
					ssrRenderList(unref(draft).footer.legalLinks, (item, index) => {
						_push(`<article class="sca-link-editor"><header class="sca-group-head"><button class="sca-handle" type="button"${ssrRenderAttr("draggable", !unref(editingDisabled))}${ssrRenderAttr("aria-label", "Перетащить юридическую ссылку " + (index + 1))}>`);
						_push(ssrRenderComponent(unref(GripVertical), { size: 20 }, null, _parent));
						_push(`</button><label class="sca-field sca-grow"><span>Название</span><input${ssrRenderAttr("value", item.label)} maxlength="80"></label><div class="sca-actions"><button class="sca-close" type="button"${ssrRenderAttr("aria-label", "Удалить юридическую ссылку " + (index + 1))}>`);
						_push(ssrRenderComponent(unref(X), { size: 20 }, null, _parent));
						_push(`</button></div></header><label class="sca-field"><span>Страница документа</span><select${ssrRenderAttr("value", pageChoice(item))}><option value="">Другой адрес / выбрать страницу</option><!--[-->`);
						ssrRenderList(unref(pages), (page) => {
							_push(`<option${ssrRenderAttr("value", "/" + page.slug)}>${ssrInterpolate(page.title)}${ssrInterpolate(page.isActive ? "" : " — скрыта")}</option>`);
						});
						_push(`<!--]--></select></label><small class="sca-help">${ssrInterpolate(item.url || "Адрес не задан")}</small><details class="sca-custom"><summary>Указать другой адрес</summary><label class="sca-field"><span>Внутренний путь или HTTPS URL</span><input${ssrRenderAttr("value", item.url)} maxlength="500"></label></details><label class="sca-checkbox"><input${ssrIncludeBooleanAttr(Array.isArray(item.newTab) ? ssrLooseContain(item.newTab, null) : item.newTab) ? " checked" : ""} type="checkbox"> В новой вкладке</label></article>`);
					});
					_push(`<!--]--></section><!--]-->`);
				} else if (unref(tab) === "contacts") _push(`<section class="sca-panel"><h3>Контакты магазина</h3><p class="sca-help">Единые контакты для общих блоков сайта. Текст страницы «Контакты» редактируется отдельно в «Страницах».</p><div class="sca-grid"><label class="sca-field"><span>Телефон</span><input${ssrRenderAttr("value", unref(draft).contacts.phone)} type="tel" maxlength="30" placeholder="+7…"></label><label class="sca-field"><span>Email</span><input${ssrRenderAttr("value", unref(draft).contacts.email)} type="email" maxlength="254"></label><label class="sca-field"><span>Страна</span><input${ssrRenderAttr("value", unref(draft).contacts.country)} maxlength="80"></label></div></section>`);
				else _push(`<!---->`);
				_push(`</fieldset>`);
				if (unref(referenceError)) _push(`<p class="sca-notice" role="alert">${ssrInterpolate(unref(referenceError))} <button class="sca-button sca-button--white" type="button"${ssrIncludeBooleanAttr(unref(referencesLoading) || unref(saving)) ? " disabled" : ""}>Загрузить страницы и товары</button></p>`);
				else _push(`<!---->`);
				_push(`<footer class="sca-panel sca-savebar"><span>${ssrInterpolate(unref(conflict) ? "Нужна актуальная версия" : unref(dirty) ? "Есть несохранённые изменения" : "Версия " + unref(revision) + " · Изменения сохранены")}</span><div class="sca-actions"><button class="sca-button sca-button--white" type="button"${ssrIncludeBooleanAttr(!unref(dirty) || unref(busy)) ? " disabled" : ""}>Отменить изменения</button><button class="sca-button" type="submit"${ssrIncludeBooleanAttr(!unref(dirty) || unref(busy) || unref(conflict) || unref(forbidden)) ? " disabled" : ""}>`);
				_push(ssrRenderComponent(unref(Save), { size: 18 }, null, _parent));
				_push(` ${ssrInterpolate(unref(saving) ? "Сохраняем…" : "Сохранить контент")}</button></div></footer></form>`);
			} else _push(`<!---->`);
			if (unref(tab) === "history") {
				_push(`<section class="sca-panel"><header class="sca-group-head"><h3>История контента</h3><button class="sca-button sca-button--white" type="button"${ssrIncludeBooleanAttr(unref(historyLoading) || unref(busy)) ? " disabled" : ""}>Обновить историю</button></header><p class="sca-help">Восстановление создаёт новую версию контента. Заказы, платежи, бонусы и другие финансовые данные не откатываются.</p>`);
				if (unref(historyError)) _push(`<p class="sca-notice" role="alert">${ssrInterpolate(unref(historyError))}</p>`);
				else _push(`<!---->`);
				if (unref(historyLoading)) _push(`<p role="status">Загружаем историю…</p>`);
				else _push(`<!---->`);
				if (unref(historyLoaded) && unref(historyTotal) > unref(history).length) _push(`<p class="sca-help">Показаны последние ${ssrInterpolate(unref(history).length)} версий из ${ssrInterpolate(unref(historyTotal))}.</p>`);
				else _push(`<!---->`);
				if (!unref(historyLoading)) {
					_push(`<ol class="sca-history"><!--[-->`);
					ssrRenderList(unref(history), (entry) => {
						_push(`<li><div><strong>Версия ${ssrInterpolate(entry.revision)}</strong><small>${ssrInterpolate(Number.isNaN(new Date(entry.createdAt).getTime()) ? "Дата не указана" : new Date(entry.createdAt).toLocaleString("ru-RU"))}</small></div>`);
						if (entry.revision === unref(revision)) _push(`<span>Текущая версия</span>`);
						else _push(`<button class="sca-button sca-button--white" type="button"${ssrIncludeBooleanAttr(!unref(loaded) || unref(busy) || unref(conflict) || unref(forbidden)) ? " disabled" : ""}>Восстановить</button>`);
						_push(`</li>`);
					});
					_push(`<!--]--></ol>`);
				} else _push(`<!---->`);
				if (unref(historyLoaded) && !unref(history).length) _push(`<p class="sca-help">Сохранённых версий пока нет.</p>`);
				else _push(`<!---->`);
				_push(`</section>`);
			} else _push(`<!---->`);
			_push(`</section>`);
		};
	}
});
// components/storefront/SiteContentEditor.vue
var _sfc_setup$8 = SiteContentEditor_vue_vue_type_script_setup_true_lang_default.setup;
SiteContentEditor_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/storefront/SiteContentEditor.vue");
	return _sfc_setup$8 ? _sfc_setup$8(props, ctx) : void 0;
};
var SiteContentEditor_default = Object.assign(SiteContentEditor_vue_vue_type_script_setup_true_lang_default, { __name: "SiteContentEditor" });
// components/storefront/SiteCatalogMenuEditor.vue?vue&type=script&setup=true&lang.ts
var SiteCatalogMenuEditor_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "SiteCatalogMenuEditor",
	__ssrInlineRender: true,
	props: {
		apiBase: {},
		token: {}
	},
	setup(__props) {
		const props = __props;
		const quickDefaults = [
			{
				key: "new",
				label: "Новинки",
				isVisible: true
			},
			{
				key: "popular",
				label: "Бестселлеры",
				isVisible: true
			},
			{
				key: "gift-card",
				label: "Подарочная карта",
				isVisible: true
			}
		];
		const quickUrls = {
			new: "/catalog?sort=new",
			popular: "/catalog?sort=popular",
			"gift-card": "/catalog/gift-card"
		};
		const categories = ref([]);
		const entries = ref([]);
		const quickLinks = ref([]);
		const revision = ref(null);
		const baseline = ref("");
		const loaded = ref(false);
		const loading = ref(false);
		const saving = ref(false);
		const conflict = ref(false);
		const forbidden = ref(false);
		const error = ref("");
		const notice = ref("");
		const orderAnnouncement = ref("");
		ref(null);
		const snapshot = () => JSON.stringify({
			entries: entries.value,
			quickLinks: quickLinks.value
		});
		const dirty = computed(() => loaded.value && snapshot() !== baseline.value);
		const categoryById = computed(() => new Map(categories.value.map((category) => [category.id, category])));
		const previewGroups = computed(() => storefrontCategoryGroups(categories.value, { entries: entries.value }));
		const visibleQuickLinks = computed(() => quickLinks.value.filter((link) => link.isVisible));
		const leave = () => !saving.value && (!dirty.value || (void 0).confirm("Выйти из редактора без сохранения меню?"));
		watch(() => [props.apiBase, props.token], () => {});
		onBeforeRouteLeave(leave);
		onBeforeRouteUpdate(leave);
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<section${ssrRenderAttrs(mergeProps({
				"data-v-ui-a4aaf54a5982": "",
				class: "sb-catalog-menu-admin",
				"aria-label": "Редактор меню каталога"
			}, _attrs))}><header data-v-ui-a4aaf54a5982 class="sb-cma-panel sb-cma-hero"><div data-v-ui-a4aaf54a5982><p data-v-ui-a4aaf54a5982 class="sb-cma-eyebrow">НАВИГАЦИЯ МАГАЗИНА</p><h2 data-v-ui-a4aaf54a5982>Меню каталога</h2><p data-v-ui-a4aaf54a5982>Названия, видимость и порядок пунктов бокового каталога. Адреса категорий и быстрых ссылок не меняются.</p></div><button data-v-ui-a4aaf54a5982 type="button" class="sb-cma-button sb-cma-button--white"${ssrIncludeBooleanAttr(unref(loading) || unref(saving)) ? " disabled" : ""}>${ssrInterpolate(unref(loading) ? "Загружаем…" : "Обновить меню")}</button></header>`);
			if (unref(error)) {
				_push(`<p data-v-ui-a4aaf54a5982 class="sb-cma-notice" role="alert">${ssrInterpolate(unref(error))} `);
				if (!unref(loaded)) _push(`<button data-v-ui-a4aaf54a5982 class="sb-cma-button sb-cma-button--white"${ssrIncludeBooleanAttr(unref(loading)) ? " disabled" : ""}>Повторить загрузку</button>`);
				else _push(`<!---->`);
				_push(`</p>`);
			} else _push(`<!---->`);
			if (unref(notice)) _push(`<p data-v-ui-a4aaf54a5982 class="sb-cma-notice" role="status">${ssrInterpolate(unref(notice))}</p>`);
			else _push(`<!---->`);
			if (unref(loading)) _push(`<p data-v-ui-a4aaf54a5982 class="sb-cma-notice" role="status">Загружаем категории и настройки меню…</p>`);
			else _push(`<!---->`);
			if (unref(loaded)) {
				_push(`<form data-v-ui-a4aaf54a5982 novalidate><fieldset data-v-ui-a4aaf54a5982${ssrIncludeBooleanAttr(unref(loading) || unref(saving) || unref(forbidden)) ? " disabled" : ""} class="sb-cma-fields"><section data-v-ui-a4aaf54a5982 class="sb-cma-panel sb-cma-section"><header data-v-ui-a4aaf54a5982 class="sb-cma-section-head"><h3 data-v-ui-a4aaf54a5982>Категории</h3><small data-v-ui-a4aaf54a5982>Перетаскивайте за ручку в первом столбце.</small></header><p data-v-ui-a4aaf54a5982 class="sb-cma-note">Здесь только категории из базы. Создание, состав и активность категорий настраиваются в разделе управления товарами.</p>`);
				if (unref(entries).length) {
					_push(`<ol data-v-ui-a4aaf54a5982 class="sb-cma-list" aria-label="Порядок категорий"><!--[-->`);
					ssrRenderList(unref(entries), (entry, index) => {
						_push(`<li data-v-ui-a4aaf54a5982 class="sb-cma-row"${ssrRenderAttr("data-category-id", entry.categoryId)}><div data-v-ui-a4aaf54a5982 class="sb-cma-order"><button data-v-ui-a4aaf54a5982 type="button" class="sb-cma-button sb-cma-button--white sb-cma-drag-handle"${ssrRenderAttr("draggable", !unref(loading) && !unref(saving) && !unref(forbidden))}${ssrRenderAttr("aria-label", "Перетащить " + entry.label)}>`);
						_push(ssrRenderComponent(unref(GripVertical), {
							"data-v-ui-a4aaf54a5982": "",
							size: 20
						}, null, _parent));
						_push(`</button></div><div data-v-ui-a4aaf54a5982 class="sb-cma-row-main"><label data-v-ui-a4aaf54a5982 class="sb-cma-field"><span data-v-ui-a4aaf54a5982>${ssrInterpolate(unref(categoryById).get(entry.categoryId)?.nameRu)}</span><input data-v-ui-a4aaf54a5982${ssrRenderAttr("value", entry.label)} maxlength="80"${ssrRenderAttr("aria-label", `Название пункта ${unref(categoryById).get(entry.categoryId)?.nameRu}`)} required></label><small data-v-ui-a4aaf54a5982 class="sb-cma-url">${ssrInterpolate(("storefrontCatalogLink" in _ctx ? _ctx.storefrontCatalogLink : unref(storefrontCatalogLink))(unref(categoryById).get(entry.categoryId)))}</small>`);
						if (unref(categoryById).get(entry.categoryId)?.parentId) _push(`<small data-v-ui-a4aaf54a5982>Родитель: ${ssrInterpolate(unref(categoryById).get(unref(categoryById).get(entry.categoryId).parentId)?.nameRu || "Не найден")}</small>`);
						else _push(`<!---->`);
						if (!unref(categoryById).get(entry.categoryId)?.isActive) _push(`<small data-v-ui-a4aaf54a5982 class="sb-cma-note">Категория неактивна — не появится на сайте, даже если включена в меню.</small>`);
						else _push(`<!---->`);
						_push(`</div><label data-v-ui-a4aaf54a5982 class="sb-cma-checkbox"><input data-v-ui-a4aaf54a5982${ssrIncludeBooleanAttr(Array.isArray(entry.isVisible) ? ssrLooseContain(entry.isVisible, null) : entry.isVisible) ? " checked" : ""} type="checkbox"${ssrRenderAttr("aria-label", `Показывать ${unref(categoryById).get(entry.categoryId)?.nameRu} в меню`)}> В меню</label></li>`);
					});
					_push(`<!--]--></ol>`);
				} else _push(`<p data-v-ui-a4aaf54a5982 class="sb-cma-empty">В базе пока нет категорий. Демонстрационные категории не добавляются.</p>`);
				_push(`</section><section data-v-ui-a4aaf54a5982 class="sb-cma-panel sb-cma-section"><header data-v-ui-a4aaf54a5982 class="sb-cma-section-head"><h3 data-v-ui-a4aaf54a5982>Быстрые ссылки</h3><small data-v-ui-a4aaf54a5982>Три фиксированных назначения, без произвольных адресов.</small></header><ol data-v-ui-a4aaf54a5982 class="sb-cma-list" aria-label="Порядок быстрых ссылок"><!--[-->`);
				ssrRenderList(unref(quickLinks), (link, index) => {
					_push(`<li data-v-ui-a4aaf54a5982 class="sb-cma-row"${ssrRenderAttr("data-quick-key", link.key)}><div data-v-ui-a4aaf54a5982 class="sb-cma-order"><button data-v-ui-a4aaf54a5982 type="button" class="sb-cma-button sb-cma-button--white sb-cma-drag-handle"${ssrRenderAttr("draggable", !unref(loading) && !unref(saving) && !unref(forbidden))}${ssrRenderAttr("aria-label", "Перетащить " + link.label)}>`);
					_push(ssrRenderComponent(unref(GripVertical), {
						"data-v-ui-a4aaf54a5982": "",
						size: 20
					}, null, _parent));
					_push(`</button></div><div data-v-ui-a4aaf54a5982 class="sb-cma-row-main"><label data-v-ui-a4aaf54a5982 class="sb-cma-field"><span data-v-ui-a4aaf54a5982>${ssrInterpolate(quickDefaults.find((item) => item.key === link.key)?.label)}</span><input data-v-ui-a4aaf54a5982${ssrRenderAttr("value", link.label)} maxlength="80"${ssrRenderAttr("aria-label", `Название быстрой ссылки ${link.key}`)} required></label><small data-v-ui-a4aaf54a5982 class="sb-cma-url">${ssrInterpolate(quickUrls[link.key])}</small></div><label data-v-ui-a4aaf54a5982 class="sb-cma-checkbox"><input data-v-ui-a4aaf54a5982${ssrIncludeBooleanAttr(Array.isArray(link.isVisible) ? ssrLooseContain(link.isVisible, null) : link.isVisible) ? " checked" : ""} type="checkbox"${ssrRenderAttr("aria-label", `Показывать быструю ссылку ${link.key}`)}> В меню</label></li>`);
				});
				_push(`<!--]--></ol></section></fieldset><footer data-v-ui-a4aaf54a5982 class="sb-cma-panel sb-cma-actions"><span data-v-ui-a4aaf54a5982>${ssrInterpolate(unref(conflict) ? "Нужна актуальная версия меню" : unref(dirty) ? "Есть несохранённые изменения" : `Версия ${unref(revision)} · Изменения сохранены`)}</span><div data-v-ui-a4aaf54a5982><button data-v-ui-a4aaf54a5982 type="button" class="sb-cma-button sb-cma-button--white"${ssrIncludeBooleanAttr(!unref(dirty) || unref(saving) || unref(loading)) ? " disabled" : ""}>Отменить изменения</button><button data-v-ui-a4aaf54a5982 type="submit" class="sb-cma-button"${ssrIncludeBooleanAttr(!unref(dirty) || unref(saving) || unref(loading) || unref(conflict) || unref(forbidden)) ? " disabled" : ""}>${ssrInterpolate(unref(saving) ? "Сохраняем…" : "Сохранить меню")}</button></div></footer></form>`);
			} else _push(`<!---->`);
			_push(`<p data-v-ui-a4aaf54a5982 class="sb-cma-order-announcement" aria-live="polite">${ssrInterpolate(unref(orderAnnouncement))}</p>`);
			if (unref(loaded)) {
				_push(`<section data-v-ui-a4aaf54a5982 class="sb-cma-panel sb-cma-section sb-cma-preview" aria-label="Предпросмотр меню каталога"><header data-v-ui-a4aaf54a5982 class="sb-cma-section-head"><h3 data-v-ui-a4aaf54a5982>Предпросмотр</h3><small data-v-ui-a4aaf54a5982>Текущий черновик. На сайте изменения появятся после сохранения.</small></header>`);
				if (unref(visibleQuickLinks).length) {
					_push(`<div data-v-ui-a4aaf54a5982 class="sb-cma-preview-quick"><!--[-->`);
					ssrRenderList(unref(visibleQuickLinks), (link) => {
						_push(`<span data-v-ui-a4aaf54a5982>${ssrInterpolate(link.label.trim() || quickDefaults.find((item) => item.key === link.key)?.label)}</span>`);
					});
					_push(`<!--]--></div>`);
				} else _push(`<!---->`);
				if (unref(previewGroups).length) {
					_push(`<div data-v-ui-a4aaf54a5982 class="sb-cma-preview-groups"><!--[-->`);
					ssrRenderList(unref(previewGroups), (group) => {
						_push(`<section data-v-ui-a4aaf54a5982><h4 data-v-ui-a4aaf54a5982>${ssrInterpolate(group.label)}</h4><!--[-->`);
						ssrRenderList(group.items, (item) => {
							_push(`<p data-v-ui-a4aaf54a5982>${ssrInterpolate(item.label)}</p>`);
						});
						_push(`<!--]--></section>`);
					});
					_push(`<!--]--></div>`);
				} else _push(`<p data-v-ui-a4aaf54a5982 class="sb-cma-note">Нет видимых активных категорий.</p>`);
				_push(`<p data-v-ui-a4aaf54a5982 class="sb-cma-note">Скрытие категории скрывает все вложенные категории. Неактивные категории не выводятся; категория с отсутствующим родителем отображается отдельно.</p></section>`);
			} else _push(`<!---->`);
			_push(`</section>`);
		};
	}
});
// components/storefront/SiteCatalogMenuEditor.vue
var _sfc_setup$7 = SiteCatalogMenuEditor_vue_vue_type_script_setup_true_lang_default.setup;
SiteCatalogMenuEditor_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/storefront/SiteCatalogMenuEditor.vue");
	return _sfc_setup$7 ? _sfc_setup$7(props, ctx) : void 0;
};
var SiteCatalogMenuEditor_default = Object.assign(SiteCatalogMenuEditor_vue_vue_type_script_setup_true_lang_default, { __name: "SiteCatalogMenuEditor" });
// composables/useCatalogSettingsEditor.ts
function useCatalogSettingsEditor(path, dirty) {
	const config = useRuntimeConfig();
	const { token, user } = useWorkspaceSession();
	const access = useWorkspaceAccess();
	const busy = ref(false), loading = ref(false), error = ref(""), notice = ref("");
	const canEdit = computed(() => !!token.value && [
		"ADMIN",
		"CONTENT_MANAGER",
		"MANAGER_SALES",
		"SUPERVISOR"
	].includes(user.value?.role || "") && access.can("catalog.write"));
	let generation = 0;
	let controller;
	let reader;
	watch(token, (value) => {
		++generation;
		controller?.abort();
		loading.value = false;
		if (value && reader) read(reader);
	});
	function mayLeave() {
		return !busy.value && (!dirty.value || (void 0).confirm("Изменения не сохранены. Покинуть редактор?"));
	}
	onBeforeRouteLeave(() => mayLeave());
	function errorText(e) {
		const m = e?.data?.message;
		return Array.isArray(m) ? m.join(". ") : m || "Не удалось выполнить действие. Изменения сохранены в черновике.";
	}
	async function read(accept) {
		reader = accept;
		if (!token.value || busy.value) return;
		controller?.abort();
		controller = new AbortController();
		const current = ++generation;
		loading.value = true;
		error.value = "";
		try {
			const data = await $fetch$1(path, {
				baseURL: config.public.apiBase,
				headers: { Authorization: `Bearer ${token.value}` },
				signal: controller.signal,
				timeout: 2e4
			});
			if (current === generation) accept(data);
		} catch (e) {
			if (current === generation) error.value = errorText(e);
		} finally {
			if (current === generation) loading.value = false;
		}
	}
	async function write(suffix, method, body, accept) {
		if (busy.value || loading.value || !canEdit.value || !token.value) return false;
		busy.value = true;
		error.value = "";
		notice.value = "";
		try {
			accept(await $fetch$1(path + suffix, {
				baseURL: config.public.apiBase,
				method,
				headers: { Authorization: `Bearer ${token.value}` },
				body,
				timeout: 2e4
			}));
			notice.value = "Изменения сохранены.";
			return true;
		} catch (e) {
			error.value = errorText(e);
			return false;
		} finally {
			busy.value = false;
		}
	}
	return {
		busy,
		loading,
		error,
		notice,
		canEdit,
		read,
		write,
		mayLeave
	};
}
// components/storefront/SiteCategoriesEditor.vue?vue&type=script&setup=true&lang.ts
var SiteCategoriesEditor_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "SiteCategoriesEditor",
	__ssrInlineRender: true,
	setup(__props, { expose: __expose }) {
		const items = ref([]), revision = ref(null), baseline = ref(""), search = ref(""), collapsed = ref([]), dragged = ref("");
		const form = ref(null), formBaseline = ref("");
		const layoutSnapshot = () => JSON.stringify(items.value.map((item) => ({
			id: item.id,
			parentId: item.parentId
		})));
		const layoutDirty = computed(() => revision.value !== null && layoutSnapshot() !== baseline.value);
		const formDirty = computed(() => !!form.value && JSON.stringify(form.value) !== formBaseline.value);
		const dirty = computed(() => layoutDirty.value || formDirty.value);
		const { busy, loading, error, notice, canEdit, read} = useCatalogSettingsEditor("/admin/catalog/categories", dirty);
		useCatalogDialog(computed(() => !!form.value), close);
		function accept(data) {
			if (!Array.isArray(data?.items) || !Number.isSafeInteger(data.revision)) throw new Error("Invalid category response");
			items.value = data.items;
			revision.value = data.revision;
			baseline.value = layoutSnapshot();
		}
		async function load() {
			if (dirty.value && !(void 0).confirm("Обновить список и отбросить несохранённые изменения?")) return;
			form.value = null;
			await read(accept);
		}
		const tree = computed(() => {
			const result = [], visited = /* @__PURE__ */ new Set();
			const query = search.value.trim().toLocaleLowerCase();
			function visit(parent, depth) {
				for (const category of items.value.filter((item) => item.parentId === parent)) {
					if (visited.has(category.id)) continue;
					visited.add(category.id);
					const children = items.value.some((item) => item.parentId === category.id);
					if (!query || `${category.nameRu} ${category.slug}`.toLocaleLowerCase().includes(query)) result.push({
						category,
						depth,
						hasChildren: children
					});
					if (query || !collapsed.value.includes(category.id)) visit(category.id, depth + 1);
				}
			}
			visit(null, 0);
			return result;
		});
		const descendants = (id) => {
			const found = /* @__PURE__ */ new Set([id]);
			for (let changed = true; changed;) {
				changed = false;
				for (const item of items.value) if (item.parentId && found.has(item.parentId) && !found.has(item.id)) {
					found.add(item.id);
					changed = true;
				}
			}
			return found;
		};
		const categoryById = computed(() => new Map(items.value.map((item) => [item.id, item])));
		function onSite(category) {
			const seen = /* @__PURE__ */ new Set();
			let current = category;
			while (current) {
				if (!current.isActive || seen.has(current.id)) return false;
				seen.add(current.id);
				if (!current.parentId) return true;
				current = categoryById.value.get(current.parentId);
			}
			return false;
		}
		const parents = computed(() => items.value.filter((item) => !descendants(form.value?.id || "").has(item.id)));
		function close() {
			if (busy.value) return false;
			if (formDirty.value && !(void 0).confirm("Закрыть без сохранения категории?")) return false;
			form.value = null;
			return true;
		}
		function edit(category) {
			if (layoutDirty.value || !canEdit.value || loading.value || !close()) return;
			form.value = category ? {
				id: category.id,
				nameRu: category.nameRu,
				slug: category.slug,
				parentId: category.parentId || "",
				description: typeof category.description === "string" ? category.description : String(category.description?.ru || ""),
				imageUrl: category.imageUrl || "",
				isActive: category.isActive
			} : {
				id: "",
				nameRu: "",
				slug: "",
				parentId: "",
				description: "",
				imageUrl: "",
				isActive: true
			};
			formBaseline.value = JSON.stringify(form.value);
		}
		__expose({
			load,
			add: edit,
			busy: computed(() => busy.value || loading.value),
			canAdd: computed(() => !busy.value && !loading.value && canEdit.value && revision.value !== null && !layoutDirty.value)
		});
		return (_ctx, _push, _parent, _attrs) => {
			const _component_AdminMediaPicker = AdminMediaPicker_default;
			_push(`<section${ssrRenderAttrs(mergeProps({ class: "catalog-settings" }, _attrs))}>`);
			if (unref(error)) _push(`<p role="alert" class="cs-error">${ssrInterpolate(unref(error))} <button${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}>Обновить список</button></p>`);
			else _push(`<!---->`);
			if (unref(notice)) _push(`<p role="status">${ssrInterpolate(unref(notice))}</p>`);
			else _push(`<!---->`);
			_push(`<div class="cs-toolbar"><label>`);
			_push(ssrRenderComponent(unref(Search), { size: 17 }, null, _parent));
			_push(`<input${ssrRenderAttr("value", unref(search))} placeholder="Название или адрес категории" aria-label="Поиск категорий"></label><button${ssrIncludeBooleanAttr(unref(busy) || unref(loading)) ? " disabled" : ""}>Развернуть дерево</button></div>`);
			if (unref(loading)) _push(`<p role="status">Загрузка категорий…</p>`);
			else if (!unref(tree).length) _push(`<p>${ssrInterpolate(unref(items).length ? "По вашему запросу категории не найдены." : "Категорий пока нет. Добавьте первую категорию.")}</p>`);
			else {
				_push(`<div class="cs-tree" aria-label="Дерево категорий"><!--[-->`);
				ssrRenderList(unref(tree), (row) => {
					_push(`<article class="cs-category-row"${ssrRenderAttr("data-category-id", row.category.id)}><button type="button" class="cs-grip"${ssrIncludeBooleanAttr(unref(busy) || unref(loading) || !unref(canEdit) || !!unref(search)) ? " disabled" : ""}${ssrRenderAttr("draggable", !unref(busy) && !unref(loading) && unref(canEdit) && !unref(search))}${ssrRenderAttr("aria-label", "Перетащить категорию " + row.category.nameRu)} title="Перетащить; с клавиатуры Alt + ↑ / ↓">`);
					_push(ssrRenderComponent(unref(GripVertical), { size: 18 }, null, _parent));
					_push(`</button><div class="cs-category-content" style="${ssrRenderStyle({ "--category-depth": row.depth })}">`);
					if (row.hasChildren) {
						_push(`<button class="cs-expand"${ssrRenderAttr("aria-label", "Развернуть или свернуть " + row.category.nameRu)}>`);
						if (unref(collapsed).includes(row.category.id)) _push(ssrRenderComponent(unref(ChevronRight), { size: 16 }, null, _parent));
						else _push(ssrRenderComponent(unref(ChevronDown), { size: 16 }, null, _parent));
						_push(`</button>`);
					} else _push(`<!---->`);
					_push(`<div><strong>${ssrInterpolate(row.category.nameRu)}</strong><small>${ssrInterpolate(("storefrontCatalogLink" in _ctx ? _ctx.storefrontCatalogLink : unref(storefrontCatalogLink))(row.category))} · ${ssrInterpolate(row.category._count?.products || 0)} товаров</small></div><span class="${ssrRenderClass([{ "is-hidden": !onSite(row.category) }, "cs-status"])}">${ssrInterpolate(onSite(row.category) ? "На сайте" : row.category.isActive ? "Скрыта родителем" : "Скрыта")}</span></div><button${ssrIncludeBooleanAttr(unref(busy) || unref(loading) || !unref(canEdit) || unref(layoutDirty)) ? " disabled" : ""}${ssrRenderAttr("aria-label", "Редактировать категорию " + row.category.nameRu)}>`);
					_push(ssrRenderComponent(unref(Pencil), { size: 16 }, null, _parent));
					_push(`</button>`);
					if (unref(dragged) && unref(dragged) !== row.category.id) _push(`<div class="cs-nest-target">Вложить в «${ssrInterpolate(row.category.nameRu)}»</div>`);
					else _push(`<!---->`);
					_push(`</article>`);
				});
				_push(`<!--]--></div>`);
			}
			if (unref(layoutDirty)) _push(`<div class="cs-savebar"><span>Порядок дерева изменён — сохраните его перед редактированием категорий.</span><button${ssrIncludeBooleanAttr(unref(busy) || unref(loading)) ? " disabled" : ""}>Отменить порядок</button><button class="cs-primary"${ssrIncludeBooleanAttr(unref(busy) || unref(loading) || !unref(canEdit)) ? " disabled" : ""}>Сохранить порядок</button></div>`);
			else _push(`<!---->`);
			if (unref(form)) {
				_push(`<div class="cs-edit-backdrop admin-dialog-backdrop"><form class="cs-edit-panel admin-dialog admin-dialog--drawer" role="dialog" aria-modal="true" aria-labelledby="category-edit-title" tabindex="-1"><header><div><p class="eyebrow">Каталог / Категории</p><h2 id="category-edit-title">${ssrInterpolate(unref(form).id ? "Настройки категории" : "Новая категория")}</h2>`);
				if (unref(form).id) _push(`<p class="editor-subtitle">${ssrInterpolate(unref(form).nameRu)}</p>`);
				else _push(`<!---->`);
				_push(`</div><button type="button"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""} aria-label="Закрыть категорию">`);
				_push(ssrRenderComponent(unref(X), { size: 20 }, null, _parent));
				_push(`</button></header><div class="admin-dialog-body cs-category-body"><fieldset${ssrIncludeBooleanAttr(unref(busy) || !unref(canEdit)) ? " disabled" : ""}><section class="cs-category-section" aria-labelledby="category-main-heading"><h3 id="category-main-heading">Основная информация</h3><div class="cs-category-fields"><label>Название<input${ssrRenderAttr("value", unref(form).nameRu)} required maxlength="120"></label><label>Адрес категории<input${ssrRenderAttr("value", unref(form).slug)} required maxlength="100" pattern="[a-zа-яё0-9]+(-[a-zа-яё0-9]+)*"><small>Изменение адреса меняет ссылку на категорию.</small></label><label class="cs-category-wide">Родительская категория<select><option value=""${ssrIncludeBooleanAttr(Array.isArray(unref(form).parentId) ? ssrLooseContain(unref(form).parentId, "") : ssrLooseEqual(unref(form).parentId, "")) ? " selected" : ""}>Верхний уровень</option><!--[-->`);
				ssrRenderList(unref(parents), (parent) => {
					_push(`<option${ssrRenderAttr("value", parent.id)}${ssrIncludeBooleanAttr(Array.isArray(unref(form).parentId) ? ssrLooseContain(unref(form).parentId, parent.id) : ssrLooseEqual(unref(form).parentId, parent.id)) ? " selected" : ""}>${ssrInterpolate(parent.nameRu)}</option>`);
				});
				_push(`<!--]--></select></label></div></section><section class="cs-category-section" aria-labelledby="category-appearance-heading"><h3 id="category-appearance-heading">Оформление в каталоге</h3><label>Описание<textarea rows="4" maxlength="10000">${ssrInterpolate(unref(form).description)}</textarea></label>`);
				_push(ssrRenderComponent(_component_AdminMediaPicker, {
					modelValue: unref(form).imageUrl,
					"onUpdate:modelValue": ($event) => unref(form).imageUrl = $event,
					disabled: unref(busy),
					label: "Фото категории"
				}, null, _parent));
				_push(`</section><section class="cs-category-section cs-category-publication" aria-labelledby="category-publication-heading"><h3 id="category-publication-heading">Публикация</h3><label class="cs-checkbox"><input${ssrIncludeBooleanAttr(Array.isArray(unref(form).isActive) ? ssrLooseContain(unref(form).isActive, null) : unref(form).isActive) ? " checked" : ""} type="checkbox">Показывать категорию на сайте</label><small>Категория со скрытым родителем также не показывается на сайте.</small></section></fieldset>`);
				if (unref(error)) _push(`<p class="cs-error" role="alert">${ssrInterpolate(unref(error))}</p>`);
				else _push(`<!---->`);
				if (unref(layoutDirty)) _push(`<p class="cs-error">Сначала сохраните порядок дерева в основном списке.</p>`);
				else _push(`<!---->`);
				_push(`</div><footer><button type="button"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}>Отмена</button><button class="cs-primary"${ssrIncludeBooleanAttr(unref(busy) || !unref(canEdit) || unref(layoutDirty)) ? " disabled" : ""}>${ssrInterpolate(unref(busy) ? "Сохраняем…" : "Сохранить категорию")}</button></footer></form></div>`);
			} else _push(`<!---->`);
			_push(`</section>`);
		};
	}
});
// components/storefront/SiteCategoriesEditor.vue
var _sfc_setup$6 = SiteCategoriesEditor_vue_vue_type_script_setup_true_lang_default.setup;
SiteCategoriesEditor_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/storefront/SiteCategoriesEditor.vue");
	return _sfc_setup$6 ? _sfc_setup$6(props, ctx) : void 0;
};
var SiteCategoriesEditor_default = Object.assign(SiteCategoriesEditor_vue_vue_type_script_setup_true_lang_default, { __name: "SiteCategoriesEditor" });
// components/storefront/SiteProductBadgesEditor.vue?vue&type=script&setup=true&lang.ts
var SiteProductBadgesEditor_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "SiteProductBadgesEditor",
	__ssrInlineRender: true,
	setup(__props, { expose: __expose }) {
		const badges = ref([]), revision = ref(null), baseline = ref("");
		ref("");
		const dirty = computed(() => revision.value !== null && JSON.stringify(badges.value) !== baseline.value);
		const { busy, loading, error, notice, canEdit, read} = useCatalogSettingsEditor("/admin/catalog/badges", dirty);
		function accept(data) {
			if (!Array.isArray(data?.badges) || !Number.isSafeInteger(data.revision)) throw new Error("Invalid badge response");
			badges.value = data.badges;
			revision.value = data.revision;
			baseline.value = JSON.stringify(badges.value);
		}
		async function load() {
			if (dirty.value && !(void 0).confirm("Отбросить изменения и обновить бейджи?")) return;
			await read(accept);
		}
		function add() {
			if (!canEdit.value || busy.value || revision.value === null) return;
			let i = 1;
			while (badges.value.some((b) => b.id === "badge-" + i)) i++;
			badges.value.push({
				id: "badge-" + i,
				label: "Новый бейдж",
				color: "#202127",
				textColor: "#ffffff",
				isActive: true,
				rule: "manual",
				newDays: 30
			});
		}
		__expose({
			load,
			add,
			busy: computed(() => busy.value || loading.value),
			canAdd: computed(() => !busy.value && !loading.value && canEdit.value && revision.value !== null && badges.value.length < 30)
		});
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<form${ssrRenderAttrs(mergeProps({ class: "catalog-settings" }, _attrs))}>`);
			if (unref(error)) _push(`<p class="cs-error" role="alert">${ssrInterpolate(unref(error))} <button type="button"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}>Обновить</button></p>`);
			else _push(`<!---->`);
			if (unref(notice)) _push(`<p role="status">${ssrInterpolate(unref(notice))}</p>`);
			else _push(`<!---->`);
			if (unref(loading)) _push(`<p role="status">Загрузка бейджей…</p>`);
			else _push(`<!---->`);
			_push(`<!--[-->`);
			ssrRenderList(unref(badges), (badge) => {
				_push(`<article class="cs-badge-row"><button type="button" class="cs-grip"${ssrIncludeBooleanAttr(unref(busy) || !unref(canEdit)) ? " disabled" : ""}${ssrRenderAttr("draggable", !unref(busy) && unref(canEdit))}${ssrRenderAttr("aria-label", "Перетащить бейдж " + badge.label)} title="Перетащить; с клавиатуры Alt + ↑ / ↓">`);
				_push(ssrRenderComponent(unref(GripVertical), { size: 18 }, null, _parent));
				_push(`</button><fieldset${ssrIncludeBooleanAttr(unref(busy) || !unref(canEdit)) ? " disabled" : ""} class="cs-badge-fields"><div class="cs-badge-title"><span class="cs-badge-preview" style="${ssrRenderStyle({
					background: badge.color,
					color: badge.textColor
				})}">${ssrInterpolate(badge.label || "Бейдж")}</span><small>Код: ${ssrInterpolate(badge.id)}</small><label class="cs-checkbox"><input${ssrIncludeBooleanAttr(Array.isArray(badge.isActive) ? ssrLooseContain(badge.isActive, null) : badge.isActive) ? " checked" : ""} type="checkbox">Включён</label><button type="button"${ssrRenderAttr("aria-label", "Удалить бейдж " + badge.label)}>`);
				_push(ssrRenderComponent(unref(Trash2), { size: 16 }, null, _parent));
				_push(`</button></div><div class="cs-field-grid"><label>Текст бейджа<input${ssrRenderAttr("value", badge.label)} required maxlength="40"></label><label>Условие показа<select><option value="manual"${ssrIncludeBooleanAttr(Array.isArray(badge.rule) ? ssrLooseContain(badge.rule, "manual") : ssrLooseEqual(badge.rule, "manual")) ? " selected" : ""}>Вручную</option><option value="new"${ssrIncludeBooleanAttr(Array.isArray(badge.rule) ? ssrLooseContain(badge.rule, "new") : ssrLooseEqual(badge.rule, "new")) ? " selected" : ""}>Новинка</option><option value="sale"${ssrIncludeBooleanAttr(Array.isArray(badge.rule) ? ssrLooseContain(badge.rule, "sale") : ssrLooseEqual(badge.rule, "sale")) ? " selected" : ""}>Акция</option></select></label>`);
				if (badge.rule === "new") _push(`<label>Возраст товара, дней<input${ssrRenderAttr("value", badge.newDays)} type="number" min="1" max="365" required></label>`);
				else _push(`<!---->`);
				_push(`<label>Цвет фона<input${ssrRenderAttr("value", badge.color)} type="color"></label><label>Цвет текста<input${ssrRenderAttr("value", badge.textColor)} type="color"></label></div><small>${ssrInterpolate(badge.rule === "manual" ? "Назначьте бейдж в карточках нужных товаров." : badge.rule === "new" ? "Показывается автоматически у недавно добавленных товаров." : "Показывается только пока действует акционная цена.")} Выключение сохраняет назначения.</small></fieldset></article>`);
			});
			_push(`<!--]-->`);
			if (!unref(loading) && unref(revision) !== null && !unref(badges).length) _push(`<p>Бейджей пока нет. Добавьте первый бейдж.</p>`);
			else _push(`<!---->`);
			_push(`<div class="cs-savebar"><span>${ssrInterpolate(unref(dirty) ? "Есть несохранённые изменения" : "Все изменения сохранены")}</span><button class="cs-primary"${ssrIncludeBooleanAttr(unref(busy) || unref(loading) || !unref(canEdit) || !unref(dirty)) ? " disabled" : ""}>`);
			_push(ssrRenderComponent(unref(Save), { size: 16 }, null, _parent));
			_push(`${ssrInterpolate(unref(busy) ? "Сохраняем…" : "Сохранить бейджи")}</button></div></form>`);
		};
	}
});
// components/storefront/SiteProductBadgesEditor.vue
var _sfc_setup$5 = SiteProductBadgesEditor_vue_vue_type_script_setup_true_lang_default.setup;
SiteProductBadgesEditor_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/storefront/SiteProductBadgesEditor.vue");
	return _sfc_setup$5 ? _sfc_setup$5(props, ctx) : void 0;
};
var SiteProductBadgesEditor_default = Object.assign(SiteProductBadgesEditor_vue_vue_type_script_setup_true_lang_default, { __name: "SiteProductBadgesEditor" });
// components/storefront/SitePromoCodesEditor.vue?vue&type=script&setup=true&lang.ts
var pageSize$1 = 50;
var SitePromoCodesEditor_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "SitePromoCodesEditor",
	__ssrInlineRender: true,
	props: {
		apiBase: {},
		token: {},
		compact: { type: Boolean }
	},
	setup(__props) {
		const props = __props;
		const access = useWorkspaceAccess();
		const writable = computed(() => access.can("promotions.read") && access.can("promotions.write"));
		const items = ref([]);
		const search = ref("");
		const statusFilter = ref("all");
		const loading = ref(false);
		const busy = ref(false);
		const loaded = ref(false);
		const page = ref(1);
		const total = ref(0);
		let loadVersion = 0;
		let filterTimer;
		const notice = ref("");
		const error = ref("");
		const draft = ref(null);
		const baseline = ref("");
		ref(null);
		ref(null);
		const confirmation = ref("");
		const action = ref(null);
		const requests = /* @__PURE__ */ new Set();
		const dirty = computed(() => draft.value !== null && JSON.stringify(draft.value) !== baseline.value);
		const filtered = computed(() => items.value);
		const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize$1)));
		const money = (value) => new Intl.NumberFormat("ru-RU", {
			style: "currency",
			currency: "RUB",
			maximumFractionDigits: 2
		}).format(Number(value || 0));
		const uses = (item) => Math.max(Number(item.historyCount || 0), Number(item.usageCount || 0), Number(item.reservedCount || 0) + Number(item.appliedCount || 0));
		function displayDate(value) {
			return value ? new Date(value).toLocaleString("ru-RU", {
				dateStyle: "short",
				timeStyle: "short"
			}) : "Не ограничено";
		}
		function promoStatus(item) {
			if (!item.isActive) return "Выключен";
			if (item.endsAt && new Date(item.endsAt).getTime() <= Date.now()) return "Истёк";
			if (item.startsAt && new Date(item.startsAt).getTime() > Date.now()) return "Запланирован";
			return "Активен";
		}
		function failure(caught, fallback) {
			const status = caught?.statusCode || caught?.response?.status;
			if (status === 401) return "Сессия завершилась. Войдите в рабочее пространство заново.";
			if (status === 403) return "Недостаточно прав для управления промокодами.";
			if (status === 409) return action.value?.kind === "delete" ? "У промокода есть история использования. Его нельзя удалить — выключите его, чтобы сохранить историю." : "Промокод изменён другим сотрудником либо такой код уже существует. Обновите список и проверьте сохранённую версию.";
			const message = caught?.data?.message;
			const text = Array.isArray(message) ? message.join(". ") : message;
			return typeof text === "string" && /[а-яё]/i.test(text) ? text : fallback;
		}
		async function request(path, options = {}) {
			if (!props.token) throw new Error("Войдите в рабочее пространство для управления промокодами.");
			await access.ensure();
			if (!access.can("promotions.read") || options.method && options.method !== "GET" && !writable.value) throw new Error("Недостаточно прав для этой операции с промокодами.");
			const controller = new AbortController();
			requests.add(controller);
			try {
				return await $fetch$1(path, {
					baseURL: props.apiBase,
					headers: { Authorization: `Bearer ${props.token}` },
					signal: controller.signal,
					timeout: 15e3,
					...options
				});
			} finally {
				requests.delete(controller);
			}
		}
		async function load() {
			if (busy.value) return;
			const version = ++loadVersion;
			loading.value = true;
			error.value = "";
			try {
				const result = await request("/promotions", { query: {
					search: search.value.trim() || void 0,
					status: statusFilter.value,
					page: page.value,
					limit: pageSize$1
				} });
				if (version !== loadVersion) return;
				if (!Array.isArray(result.items)) throw new Error("Некорректный ответ сервера");
				if (page.value > 1 && result.total != null && !result.items.length) {
					page.value = Math.max(1, Math.ceil(result.total / pageSize$1));
					await load();
					return;
				}
				items.value = result.items.map((item) => ({
					...item,
					discountType: item.discountType || item.type,
					usageCount: item.usageCount ?? item.usage?.total ?? 0,
					reservedCount: item.reservedCount ?? item.usage?.reserved ?? 0,
					appliedCount: item.appliedCount ?? item.usage?.applied ?? 0,
					historyCount: item.usage?.history ?? 0
				}));
				total.value = result.total ?? result.items.length;
				loaded.value = true;
			} catch (caught) {
				if (version === loadVersion) error.value = failure(caught, "Не удалось загрузить промокоды. Попробуйте обновить список.");
			} finally {
				if (version === loadVersion) loading.value = false;
			}
		}
		watch([search, statusFilter], () => {
			if (filterTimer) clearTimeout(filterTimer);
			filterTimer = setTimeout(() => {
				page.value = 1;
				load();
			}, 250);
		});
		watch(() => [props.apiBase, props.token], () => {});
		onBeforeRouteLeave(() => !dirty.value || (void 0).confirm("Уйти без сохранения параметров промокода?"));
		onBeforeRouteUpdate(() => !dirty.value || (void 0).confirm("Перейти в другой раздел без сохранения параметров промокода?"));
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<section${ssrRenderAttrs(mergeProps({
				class: "sb-promotions-admin",
				"aria-label": "Управление промокодами"
			}, _attrs))}><header class="${ssrRenderClass([__props.compact ? "crm-action-bar" : "crm-surface", "sb-promo-panel sb-promo-hero crm-surface"])}">`);
			if (!__props.compact) _push(`<div><p class="sb-promo-eyebrow">АКЦИИ САЙТА</p><h2>Промокоды</h2><p>Скидки, сроки и ограничения использования. Все условия проверяются при оформлении заказа.</p></div>`);
			else _push(`<!---->`);
			_push(`<div class="sb-promo-actions"><button class="sb-promo-button sb-promo-button--white crm-button crm-button--refresh"${ssrIncludeBooleanAttr(unref(busy) || unref(loading)) ? " disabled" : ""}>`);
			_push(ssrRenderComponent(unref(RefreshCw), { size: 18 }, null, _parent));
			_push(` Обновить</button>`);
			if (unref(writable)) {
				_push(`<button class="sb-promo-button crm-button crm-button--primary"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}>`);
				_push(ssrRenderComponent(unref(Plus), { size: 18 }, null, _parent));
				_push(` Новый промокод</button>`);
			} else _push(`<!---->`);
			_push(`</div></header>`);
			if (unref(notice)) _push(`<p class="sb-promo-notice" role="status">${ssrInterpolate(unref(notice))}</p>`);
			else _push(`<!---->`);
			if (unref(error) && !unref(action)) _push(`<p class="sb-promo-notice" role="alert">${ssrInterpolate(unref(error))}</p>`);
			else _push(`<!---->`);
			_push(`<div class="sb-promo-panel sb-promo-list crm-surface"><div class="sb-promo-filters"><label class="sb-promo-search crm-input-group">`);
			_push(ssrRenderComponent(unref(Search), { size: 18 }, null, _parent));
			_push(`<input class="crm-input"${ssrRenderAttr("value", unref(search))}${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""} maxlength="160" aria-label="Поиск промокода" type="search" placeholder="Поиск по коду или названию"></label><label class="sb-promo-status-filter"><span>Показывать</span><select class="crm-input"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""} aria-label="Статус промокодов"><option value="all"${ssrIncludeBooleanAttr(Array.isArray(unref(statusFilter)) ? ssrLooseContain(unref(statusFilter), "all") : ssrLooseEqual(unref(statusFilter), "all")) ? " selected" : ""}>Все промокоды</option><option value="active"${ssrIncludeBooleanAttr(Array.isArray(unref(statusFilter)) ? ssrLooseContain(unref(statusFilter), "active") : ssrLooseEqual(unref(statusFilter), "active")) ? " selected" : ""}>Активные</option><option value="inactive"${ssrIncludeBooleanAttr(Array.isArray(unref(statusFilter)) ? ssrLooseContain(unref(statusFilter), "inactive") : ssrLooseEqual(unref(statusFilter), "inactive")) ? " selected" : ""}>Выключенные</option><option value="scheduled"${ssrIncludeBooleanAttr(Array.isArray(unref(statusFilter)) ? ssrLooseContain(unref(statusFilter), "scheduled") : ssrLooseEqual(unref(statusFilter), "scheduled")) ? " selected" : ""}>Запланированные</option><option value="expired"${ssrIncludeBooleanAttr(Array.isArray(unref(statusFilter)) ? ssrLooseContain(unref(statusFilter), "expired") : ssrLooseEqual(unref(statusFilter), "expired")) ? " selected" : ""}>Истёкшие</option></select></label></div>`);
			if (unref(loading)) _push(`<p class="sb-promo-empty" role="status">Загружаем промокоды…</p>`);
			else if (unref(filtered).length) {
				_push(`<table class="sb-promo-table"><caption class="sb-promo-sr-only">Промокоды, условия и статистика использования</caption><thead><tr><th>Промокод</th><th>Скидка и условия</th><th>Срок действия</th><th>Использование</th><th>Действия</th></tr></thead><tbody><!--[-->`);
				ssrRenderList(unref(filtered), (item) => {
					_push(`<tr><td data-label="Промокод"><div class="sb-promo-cell"><strong class="sb-promo-code">${ssrInterpolate(item.code)}</strong><span>${ssrInterpolate(item.title)}</span><span class="sb-promo-badge crm-badge">${ssrInterpolate(promoStatus(item))}</span></div></td><td data-label="Условия"><div class="sb-promo-cell"><strong>${ssrInterpolate(item.discountType === "PERCENT" ? `${Number(item.amount)}%` : money(item.amount))}</strong><small>Заказ от ${ssrInterpolate(money(item.minimumAmount))}</small>`);
					if (item.maximumDiscount) _push(`<small>Скидка до ${ssrInterpolate(money(item.maximumDiscount))}</small>`);
					else _push(`<!---->`);
					_push(`<small>На клиента: ${ssrInterpolate(item.perCustomerLimit || "без лимита")}</small></div></td><td data-label="Срок"><div class="sb-promo-cell"><small>Начало: ${ssrInterpolate(item.startsAt ? displayDate(item.startsAt) : "сразу после включения")}</small><small>Окончание: ${ssrInterpolate(displayDate(item.endsAt))}</small></div></td><td data-label="Использование"><div class="sb-promo-cell"><strong>Применено: ${ssrInterpolate(item.appliedCount || 0)}</strong><small>Зарезервировано: ${ssrInterpolate(item.reservedCount || 0)}</small><small>Использований: ${ssrInterpolate(item.usageCount || 0)} / ${ssrInterpolate(item.usageLimit || "без лимита")}</small></div></td><td data-label="Действия">`);
					if (unref(writable)) {
						_push(`<div class="sb-promo-row-actions"><button class="sb-promo-icon-button crm-button"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}${ssrRenderAttr("aria-label", `Редактировать ${item.code}`)} title="Редактировать">`);
						_push(ssrRenderComponent(unref(Pencil), { size: 18 }, null, _parent));
						_push(`</button>`);
						if (item.isActive) {
							_push(`<button class="sb-promo-icon-button crm-button"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}${ssrRenderAttr("aria-label", `Выключить ${item.code}`)} title="Выключить и сохранить историю">`);
							_push(ssrRenderComponent(unref(Power), { size: 18 }, null, _parent));
							_push(`</button>`);
						} else _push(`<!---->`);
						_push(`<button class="sb-promo-icon-button crm-button"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}${ssrRenderAttr("aria-label", `Удалить ${item.code}`)} title="Удалить с подтверждением">`);
						_push(ssrRenderComponent(unref(Trash2), { size: 18 }, null, _parent));
						_push(`</button></div>`);
					} else _push(`<!---->`);
					_push(`</td></tr>`);
				});
				_push(`<!--]--></tbody></table>`);
			} else if (unref(loaded)) {
				_push(`<div class="sb-promo-empty">`);
				_push(ssrRenderComponent(unref(Ticket), { size: 32 }, null, _parent));
				_push(`<p>${ssrInterpolate(unref(search) || unref(statusFilter) !== "all" ? "По выбранным условиям ничего не найдено." : "Промокодов пока нет. Создайте первый и задайте условия акции.")}</p>`);
				if (unref(search) || unref(statusFilter) !== "all") {
					_push(`<button class="sb-promo-button sb-promo-button--white crm-button">`);
					_push(ssrRenderComponent(unref(X), { size: 18 }, null, _parent));
					_push(` Сбросить поиск</button>`);
				} else _push(`<!---->`);
				_push(`</div>`);
			} else _push(`<!---->`);
			if (unref(pageCount) > 1) _push(`<nav class="sb-promo-pagination sb-promo-actions" aria-label="Страницы промокодов"><button class="sb-promo-button sb-promo-button--white crm-button"${ssrIncludeBooleanAttr(unref(busy) || unref(loading) || unref(page) === 1) ? " disabled" : ""}>Назад</button><span>Страница ${ssrInterpolate(unref(page))} из ${ssrInterpolate(unref(pageCount))}</span><button class="sb-promo-button sb-promo-button--white crm-button"${ssrIncludeBooleanAttr(unref(busy) || unref(loading) || unref(page) >= unref(pageCount)) ? " disabled" : ""}>Далее</button></nav>`);
			else _push(`<!---->`);
			_push(`</div>`);
			if (unref(draft) && unref(writable)) {
				_push(`<form class="sb-promo-panel sb-promo-form crm-surface" novalidate><header class="sb-promo-form-head"><div><h3>${ssrInterpolate(unref(draft).existing ? `Промокод ${unref(draft).code}` : "Новый промокод")}</h3><small>${ssrInterpolate(unref(dirty) ? "Есть несохранённые изменения" : unref(draft).existing ? `Сохранённая версия ${unref(draft).revision}` : "Заполните условия и сохраните")}</small></div><button type="button" class="sb-promo-icon-button crm-button crm-button--icon"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""} aria-label="Закрыть редактор">`);
				_push(ssrRenderComponent(unref(X), { size: 20 }, null, _parent));
				_push(`</button></header><fieldset${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""} class="sb-promo-fields"><label class="sb-promo-field sb-promo-field--wide"><span>Название акции</span><input class="crm-input"${ssrRenderAttr("value", unref(draft).title)} maxlength="160" placeholder="Например, приветственная скидка" required><small>Внутреннее название для сотрудников.</small></label><label class="sb-promo-field sb-promo-field--wide"><span>Код для покупателя</span><div class="sb-promo-code-input"><input class="crm-input"${ssrRenderAttr("value", unref(draft).code)}${ssrIncludeBooleanAttr(unref(draft).existing) ? " disabled" : ""} maxlength="40" placeholder="WELCOME10" autocapitalize="characters" spellcheck="false">`);
				if (!unref(draft).existing) {
					_push(`<button type="button" class="sb-promo-button sb-promo-button--white crm-button">`);
					_push(ssrRenderComponent(unref(Shuffle), { size: 18 }, null, _parent));
					_push(` Сгенерировать</button>`);
				} else _push(`<!---->`);
				_push(`</div><small>${ssrInterpolate(unref(draft).existing ? "Код существующего промокода не меняется." : "3–40 символов: латинские буквы, цифры, дефис или подчёркивание. Пустой код сгенерируется при сохранении.")}</small></label><label class="sb-promo-field"><span>Тип скидки</span><select class="crm-input" aria-label="Тип скидки"><option value="PERCENT"${ssrIncludeBooleanAttr(Array.isArray(unref(draft).discountType) ? ssrLooseContain(unref(draft).discountType, "PERCENT") : ssrLooseEqual(unref(draft).discountType, "PERCENT")) ? " selected" : ""}>Процент от суммы товаров</option><option value="FIXED"${ssrIncludeBooleanAttr(Array.isArray(unref(draft).discountType) ? ssrLooseContain(unref(draft).discountType, "FIXED") : ssrLooseEqual(unref(draft).discountType, "FIXED")) ? " selected" : ""}>Фиксированная сумма, ₽</option></select></label><label class="sb-promo-field"><span>${ssrInterpolate(unref(draft).discountType === "PERCENT" ? "Размер скидки, %" : "Размер скидки, ₽")}</span><input class="crm-input"${ssrRenderAttr("value", unref(draft).amount)} inputmode="decimal" placeholder="10" required><small>${ssrInterpolate(unref(draft).discountType === "PERCENT" ? "От 0,01 до 100%." : "Сумма в рублях, до двух знаков после запятой.")}</small></label><label class="sb-promo-field"><span>Минимальная сумма заказа, ₽</span><input class="crm-input"${ssrRenderAttr("value", unref(draft).minimumAmount)} inputmode="decimal" placeholder="0"><small>0 — без минимальной суммы.</small></label>`);
				if (unref(draft).discountType === "PERCENT") _push(`<label class="sb-promo-field"><span>Максимальная скидка, ₽</span><input class="crm-input"${ssrRenderAttr("value", unref(draft).maximumDiscount)} inputmode="decimal" placeholder="Без ограничения"><small>Ограничивает сумму процентной скидки. Необязательное поле.</small></label>`);
				else _push(`<!---->`);
				_push(`<label class="sb-promo-field"><span>Общий лимит использований</span><input class="crm-input"${ssrRenderAttr("value", unref(draft).usageLimit)} inputmode="numeric" placeholder="Без ограничения"><small>Пустое поле — без лимита. Бронь при оформлении тоже учитывается.</small></label><label class="sb-promo-field"><span>Лимит на одного клиента</span><input class="crm-input"${ssrRenderAttr("value", unref(draft).perCustomerLimit)} inputmode="numeric" placeholder="1" required><small>Обязательное поле. Например, 1 для однократной скидки.</small></label><label class="sb-promo-field"><span>Начало действия</span><input class="crm-input"${ssrRenderAttr("value", unref(draft).startsAt)} type="datetime-local"><small>Часовой пояс вашего устройства. Пусто — сразу после включения.</small></label><label class="sb-promo-field"><span>Окончание действия</span><input class="crm-input"${ssrRenderAttr("value", unref(draft).endsAt)} type="datetime-local"><small>Пусто — без ограничения по дате.</small></label><label class="sb-promo-checkbox sb-promo-field--wide crm-toggle-row"><input class="crm-check"${ssrIncludeBooleanAttr(Array.isArray(unref(draft).isActive) ? ssrLooseContain(unref(draft).isActive, null) : unref(draft).isActive) ? " checked" : ""} type="checkbox"> Промокод включён</label></fieldset><footer class="sb-promo-actions"><button type="submit" class="sb-promo-button crm-button crm-button--primary"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}>`);
				_push(ssrRenderComponent(unref(Save), { size: 18 }, null, _parent));
				_push(` ${ssrInterpolate(unref(busy) ? "Сохраняем…" : "Сохранить промокод")}</button><button type="button" class="sb-promo-button sb-promo-button--white crm-button"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}>`);
				_push(ssrRenderComponent(unref(X), { size: 18 }, null, _parent));
				_push(` Отмена</button></footer></form>`);
			} else _push(`<!---->`);
			ssrRenderTeleport(_push, (_push) => {
				if (unref(action) && unref(writable)) {
					_push(`<div class="sb-promo-dialog-layer admin-dialog-backdrop"><section class="sb-promotions-admin sb-promo-panel sb-promo-dialog admin-dialog admin-dialog--modal crm-surface" role="dialog" aria-modal="true" aria-labelledby="sb-promo-dialog-title" aria-describedby="sb-promo-dialog-description"><header class="sb-promo-form-head"><h3 id="sb-promo-dialog-title">${ssrInterpolate(unref(action).kind === "delete" ? "Удалить промокод?" : "Выключить промокод?")}</h3><button class="sb-promo-icon-button crm-button crm-button--icon"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""} aria-label="Закрыть подтверждение">`);
					_push(ssrRenderComponent(unref(X), { size: 20 }, null, _parent));
					_push(`</button></header><p id="sb-promo-dialog-description">${ssrInterpolate(unref(action).kind === "delete" ? `Промокод ${unref(action).item.code} будет удалён без возможности восстановления. При наличии истории использования сервер запретит удаление.` : `Промокод ${unref(action).item.code} больше не будет доступен для новых применений. История использования сохранится.`)}</p>`);
					if (unref(action).kind === "delete" && uses(unref(action).item)) _push(`<p class="sb-promo-notice">Есть использования или резервы. Рекомендуем выключить промокод вместо удаления.</p>`);
					else _push(`<!---->`);
					if (unref(action).kind === "delete") _push(`<label class="sb-promo-field"><span>Введите код ${ssrInterpolate(unref(action).item.code)} для подтверждения</span><input class="crm-input"${ssrRenderAttr("value", unref(confirmation))}${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""} autocomplete="off" spellcheck="false"${ssrRenderAttr("placeholder", unref(action).item.code)}><small>Код должен совпадать полностью, включая регистр.</small></label>`);
					else _push(`<!---->`);
					if (unref(error)) _push(`<p class="sb-promo-notice" role="alert">${ssrInterpolate(unref(error))}</p>`);
					else _push(`<!---->`);
					_push(`<footer class="sb-promo-actions"><button class="sb-promo-button crm-button crm-button--primary"${ssrIncludeBooleanAttr(unref(busy) || unref(action).kind === "delete" && unref(confirmation) !== unref(action).item.code) ? " disabled" : ""}>${ssrInterpolate(unref(busy) ? "Выполняем…" : unref(action).kind === "delete" ? "Удалить промокод" : "Выключить промокод")}</button>`);
					if (unref(action).kind === "delete" && unref(action).item.isActive && uses(unref(action).item)) {
						_push(`<button class="sb-promo-button sb-promo-button--white crm-button"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}>`);
						_push(ssrRenderComponent(unref(Power), { size: 18 }, null, _parent));
						_push(` Выключить вместо удаления</button>`);
					} else _push(`<!---->`);
					_push(`<button class="sb-promo-button sb-promo-button--white crm-button"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}>Отмена</button></footer></section></div>`);
				} else _push(`<!---->`);
			}, "body", false, _parent);
			_push(`</section>`);
		};
	}
});
// components/storefront/SitePromoCodesEditor.vue
var _sfc_setup$4 = SitePromoCodesEditor_vue_vue_type_script_setup_true_lang_default.setup;
SitePromoCodesEditor_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/storefront/SitePromoCodesEditor.vue");
	return _sfc_setup$4 ? _sfc_setup$4(props, ctx) : void 0;
};
var SitePromoCodesEditor_default = Object.assign(SitePromoCodesEditor_vue_vue_type_script_setup_true_lang_default, { __name: "SitePromoCodesEditor" });
// components/storefront/SiteGiftCardsEditor.vue?vue&type=script&setup=true&lang.ts
var pageSize = 30;
var historyLimit = 30;
var SiteGiftCardsEditor_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "SiteGiftCardsEditor",
	__ssrInlineRender: true,
	props: {
		apiBase: {},
		token: {},
		role: {}
	},
	setup(__props, { expose: __expose }) {
		const props = __props;
		const access = useWorkspaceAccess();
		const canReadProduct = computed(() => access.can("gift_card_product.read"));
		const canWriteProduct = computed(() => canReadProduct.value && access.can("gift_card_product.write"));
		const canReadCards = computed(() => [
			"ADMIN",
			"MANAGER_SALES",
			"SUPERVISOR"
		].includes(props.role || "") && access.can("gift_cards.read"));
		const canManageCards = computed(() => canReadCards.value && access.can("gift_cards.write"));
		const tab = ref("product");
		const productFormId = "gift-product-" + useId();
		ref(null);
		const customValidity = ref(false);
		const previewKey = ref("");
		const previewImageFailed = ref(false);
		const product = ref(null);
		const productBaseline = ref("");
		const cards = ref([]);
		const total = ref(0);
		const page = ref(1);
		const search = ref("");
		const loading = ref(false);
		const busy = ref(false);
		const notice = ref("");
		const error = ref("");
		const issue = ref(null);
		const cardEditor = ref(null);
		const editorBaseline = ref("");
		const dialog = ref(null);
		const historyCard = ref(null);
		const historyItems = ref([]);
		const historyLoading = ref(false);
		const historyPage = ref(1);
		const historyTotal = ref(0);
		const historyPageCount = computed(() => Math.max(1, Math.ceil(historyTotal.value / historyLimit)));
		const historyStatuses = {
			RESERVED: "Зарезервировано",
			APPLIED: "Списано",
			RELEASED: "Резерв снят"
		};
		const historyStatus = (value) => historyStatuses[value] || "Неизвестный статус";
		ref(null);
		const secret = ref("");
		const revealedForId = ref("");
		ref(null);
		const controllers = /* @__PURE__ */ new Set();
		let loadVersion = 0;
		const productDirty = computed(() => Boolean(product.value && JSON.stringify(product.value) !== productBaseline.value));
		const editorDirty = computed(() => Boolean((issue.value || cardEditor.value) && JSON.stringify(issue.value || cardEditor.value) !== editorBaseline.value));
		const dirty = computed(() => productDirty.value || editorDirty.value);
		const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize)));
		const visibleCards = computed(() => cards.value.filter((card) => `${card.maskedCode} ${card.label || ""}`.toLocaleLowerCase("ru").includes(search.value.trim().toLocaleLowerCase("ru"))));
		const money = (value) => new Intl.NumberFormat("ru-RU", {
			style: "currency",
			currency: "RUB",
			maximumFractionDigits: 2
		}).format(Number(value || 0));
		const previewDenominations = computed(() => product.value?.denominations.filter((item) => /^\d+$/.test(item.value) && Number(item.value) >= 1 && Number(item.value) <= 1e6) || []);
		const previewNominal = computed(() => previewDenominations.value.find((item) => item.key === previewKey.value) || previewDenominations.value[0]);
		const previewImage = computed(() => {
			try {
				const path = safeImage(product.value?.imageUrl || "");
				if (path.startsWith("/api/")) return new URL(path, props.apiBase).href;
				return path;
			} catch {
				return "";
			}
		});
		watch(() => product.value?.imageUrl, () => {
			previewImageFailed.value = false;
		});
		const date = (value) => value && !Number.isNaN(new Date(value).getTime()) ? new Date(value).toLocaleString("ru-RU", {
			dateStyle: "short",
			timeStyle: "short"
		}) : "Не указано";
		const status = (card) => !card.isActive ? "Выключена" : new Date(card.expiresAt).getTime() <= Date.now() ? "Истекла" : Number(card.balance) <= 0 ? "Израсходована" : "Активна";
		function failure(caught, fallback) {
			const code = caught?.statusCode || caught?.response?.status;
			if (code === 401) return "Сессия завершилась. Войдите в рабочее пространство заново.";
			if (code === 403) return "Недостаточно прав для управления подарочными картами.";
			if (code === 409) return "Карта изменена другим сотрудником или такой код уже существует. Обновите список и проверьте сохранённую версию.";
			const raw = caught?.data?.message;
			const text = Array.isArray(raw) ? raw.join(". ") : raw;
			return typeof text === "string" && /[а-яё]/i.test(text) ? text : fallback;
		}
		async function request(url, options = {}) {
			if (!props.token) throw new Error("Необходим вход в рабочее пространство");
			await access.ensure();
			const productRequest = url === "/gift-cards/product";
			if (!(productRequest ? canReadProduct.value : canReadCards.value) || options.method && options.method !== "GET" && !(productRequest ? canWriteProduct.value : canManageCards.value)) throw new Error("Недостаточно прав для этой операции с подарочными картами.");
			const controller = new AbortController();
			controllers.add(controller);
			try {
				return await $fetch$1(url, {
					baseURL: props.apiBase,
					headers: { Authorization: `Bearer ${props.token}` },
					signal: controller.signal,
					timeout: 15e3,
					...options
				});
			} finally {
				controllers.delete(controller);
			}
		}
		async function load(force = false) {
			if (busy.value) return;
			await access.ensure();
			if (tab.value !== "cards" && !canReadProduct.value && canReadCards.value) tab.value = "cards";
			if (force && tab.value !== "cards" && productDirty.value && !(void 0).confirm("Загрузить сохранённые настройки и отменить локальные изменения?")) return;
			const version = ++loadVersion;
			const currentTab = tab.value;
			loading.value = true;
			error.value = "";
			try {
				if (currentTab !== "cards") {
					const result = await request("/gift-cards/product");
					if (version !== loadVersion) return;
					product.value = {
						nameRu: result.nameRu || "",
						descriptionRu: result.descriptionRu || "",
						denominations: (Array.isArray(result.denominations) ? result.denominations : []).map((value, index) => ({
							key: `saved-${index}`,
							value: String(value)
						})),
						validityDays: String(result.validityDays || 365),
						isActive: result.isActive === true,
						imageUrl: result.imageUrl || ""
					};
					productBaseline.value = JSON.stringify(product.value);
					customValidity.value = validityPreset(product.value.validityDays) === "custom";
				} else {
					const result = await request("/gift-cards", { query: {
						page: page.value,
						limit: pageSize
					} });
					if (version !== loadVersion) return;
					if (!Array.isArray(result.items)) throw new Error("Неверный ответ списка");
					total.value = result.total ?? result.items.length;
					if (page.value > pageCount.value) {
						page.value = pageCount.value;
						await load();
						return;
					}
					cards.value = result.items.map((item) => ({
						id: item.id,
						maskedCode: item.maskedCode || item.codeMasked || item.codePreview || "••••",
						faceValue: item.faceValue,
						balance: item.balance,
						reserved: item.reserved,
						issuedAt: item.issuedAt,
						expiresAt: item.expiresAt,
						isActive: item.isActive,
						revision: item.revision,
						label: item.label || ""
					}));
				}
			} catch (caught) {
				if (version === loadVersion) error.value = failure(caught, "Не удалось загрузить подарочные карты. Обновите список.");
			} finally {
				if (version === loadVersion) loading.value = false;
			}
		}
		function validityPreset(value) {
			return [
				"90",
				"180",
				"365",
				"730"
			].includes(value) ? value : "custom";
		}
		function safeImage(value) {
			const path = value.trim();
			if (path && (!/^\/(?!\/)/.test(path) || /[\\\s?#]/.test(path))) throw new Error("Для изображения укажите путь локального файла, например /uploads/gift-card.webp.");
			return path;
		}
		watch(() => [
			props.apiBase,
			props.token,
			props.role
		], () => {});
		onBeforeRouteLeave(() => !dirty.value || (void 0).confirm("Уйти без сохранения настроек подарочных карт?"));
		onBeforeRouteUpdate(() => !dirty.value || (void 0).confirm("Перейти в другой раздел без сохранения изменений?"));
		__expose({
			load: () => load(true),
			busy: computed(() => busy.value || loading.value)
		});
		return (_ctx, _push, _parent, _attrs) => {
			const _component_AdminMediaPicker = AdminMediaPicker_default;
			_push(`<section${ssrRenderAttrs(mergeProps({
				class: "sb-gift-admin",
				"aria-label": "Управление подарочными картами"
			}, _attrs))}><div class="sb-gift-workbar"><nav class="sb-gift-tabs" aria-label="Разделы подарочных карт">`);
			if (unref(canReadProduct)) {
				_push(`<button type="button" class="${ssrRenderClass([{ active: unref(tab) === "product" }, "crm-button"])}"${ssrRenderAttr("aria-current", unref(tab) === "product" ? "page" : void 0)}${ssrIncludeBooleanAttr(unref(busy) || unref(loading)) ? " disabled" : ""}>`);
				_push(ssrRenderComponent(unref(Palette), { size: 18 }, null, _parent));
				_push(`Оформление</button>`);
			} else _push(`<!---->`);
			if (unref(canReadProduct)) {
				_push(`<button type="button" class="${ssrRenderClass([{ active: unref(tab) === "terms" }, "crm-button"])}"${ssrRenderAttr("aria-current", unref(tab) === "terms" ? "page" : void 0)}${ssrIncludeBooleanAttr(unref(busy) || unref(loading)) ? " disabled" : ""}>`);
				_push(ssrRenderComponent(unref(Coins), { size: 18 }, null, _parent));
				_push(`Номиналы и срок</button>`);
			} else _push(`<!---->`);
			if (unref(canReadCards)) {
				_push(`<button type="button" class="${ssrRenderClass([{ active: unref(tab) === "cards" }, "crm-button"])}"${ssrRenderAttr("aria-current", unref(tab) === "cards" ? "page" : void 0)}${ssrIncludeBooleanAttr(unref(busy) || unref(loading)) ? " disabled" : ""}>`);
				_push(ssrRenderComponent(unref(CreditCard), { size: 18 }, null, _parent));
				_push(`Выданные карты</button>`);
			} else _push(`<!---->`);
			_push(`</nav>`);
			if (unref(tab) !== "cards" && unref(product) && unref(canWriteProduct)) {
				_push(`<div class="sb-gift-save-actions"><span>${ssrInterpolate(unref(productDirty) ? "Есть изменения" : "Изменений нет")}</span><button type="button" class="crm-button crm-button--icon" aria-label="Отменить изменения настроек" title="Отменить изменения"${ssrIncludeBooleanAttr(unref(busy) || unref(loading) || !unref(productDirty)) ? " disabled" : ""}>`);
				_push(ssrRenderComponent(unref(RotateCcw), { size: 18 }, null, _parent));
				_push(`</button><button type="submit"${ssrRenderAttr("form", productFormId)} class="crm-button crm-button--primary"${ssrIncludeBooleanAttr(unref(busy) || unref(loading) || !unref(productDirty)) ? " disabled" : ""}>`);
				_push(ssrRenderComponent(unref(Save), { size: 18 }, null, _parent));
				_push(`${ssrInterpolate(unref(busy) ? "Сохраняем…" : "Сохранить настройки")}</button></div>`);
			} else _push(`<!---->`);
			_push(`</div>`);
			if (unref(notice)) _push(`<p class="sb-gift-notice" role="status">${ssrInterpolate(unref(notice))}</p>`);
			else _push(`<!---->`);
			if (unref(error) && !unref(dialog)) _push(`<p class="sb-gift-notice" role="alert">${ssrInterpolate(unref(error))}</p>`);
			else _push(`<!---->`);
			if (unref(loading)) _push(`<p class="sb-gift-notice" role="status">Загружаем подарочные карты…</p>`);
			else _push(`<!---->`);
			if (unref(tab) !== "cards" && unref(product) && !unref(loading)) {
				_push(`<form${ssrRenderAttr("id", productFormId)} class="sb-gift-product-form" novalidate><div class="sb-gift-settings">`);
				if (unref(tab) === "product") {
					_push(`<section class="sb-gift-panel sb-gift-form sb-gift-product-block crm-surface" aria-label="Настройки товара подарочной карты"><header class="sb-gift-form-head"><div><h3>Оформление карты</h3><small>Название, описание и изображение для покупателей</small></div></header><fieldset${ssrIncludeBooleanAttr(unref(busy) || (unref(tab) === "cards" ? !unref(canManageCards) : !unref(canWriteProduct))) ? " disabled" : ""} class="sb-gift-fields"><label class="sb-gift-field sb-gift-wide"><span>Название товара</span><input name="gift-name" class="crm-input"${ssrRenderAttr("value", unref(product).nameRu)} maxlength="160" required></label><label class="sb-gift-field sb-gift-wide"><span>Описание для покупателей</span><textarea class="crm-input" maxlength="20000" rows="4">${ssrInterpolate(unref(product).descriptionRu)}</textarea></label><div class="sb-gift-field sb-gift-wide">`);
					_push(ssrRenderComponent(_component_AdminMediaPicker, {
						modelValue: unref(product).imageUrl,
						"onUpdate:modelValue": ($event) => unref(product).imageUrl = $event,
						"api-base": __props.apiBase,
						token: __props.token,
						"show-preview": false,
						disabled: unref(busy) || !unref(canWriteProduct),
						label: "Изображение карты"
					}, null, _parent));
					_push(`<small>Выбранное изображение сразу появится в предпросмотре.</small></div><label class="sb-gift-checkbox sb-gift-wide crm-toggle-row"><input class="crm-check"${ssrIncludeBooleanAttr(Array.isArray(unref(product).isActive) ? ssrLooseContain(unref(product).isActive, null) : unref(product).isActive) ? " checked" : ""} type="checkbox"><span>Продавать подарочную карту на сайте</span></label></fieldset></section>`);
				} else {
					_push(`<!--[--><section class="sb-gift-panel sb-gift-form sb-gift-denomination-block crm-surface" aria-label="Номиналы подарочной карты"><header class="sb-gift-form-head"><div><h3>Номиналы карты</h3><small>Суммы, которые покупатель сможет выбрать на сайте</small></div><button type="button" data-add-denomination class="crm-button"${ssrIncludeBooleanAttr(unref(busy) || unref(product).denominations.length >= 30) ? " disabled" : ""}>`);
					_push(ssrRenderComponent(unref(Plus), { size: 18 }, null, _parent));
					_push(`Добавить</button></header><fieldset${ssrIncludeBooleanAttr(unref(busy) || !unref(canWriteProduct)) ? " disabled" : ""} class="sb-gift-denominations"><!--[-->`);
					ssrRenderList(unref(product).denominations, (item, index) => {
						_push(`<div class="sb-gift-denomination"><label class="sb-gift-field"><span>Номинал ${ssrInterpolate(index + 1)}, ₽</span><input${ssrRenderAttr("name", "gift-nominal-" + index)} class="crm-input"${ssrRenderAttr("value", item.value)} type="number" inputmode="numeric" min="1" max="1000000" step="1" placeholder="1000"></label><button type="button" class="crm-button crm-button--icon"${ssrRenderAttr("aria-label", "Убрать номинал " + (index + 1))}>`);
						_push(ssrRenderComponent(unref(X), { size: 18 }, null, _parent));
						_push(`</button></div>`);
					});
					_push(`<!--]--></fieldset>`);
					if (!unref(product).denominations.length) _push(`<p class="sb-gift-note">Добавьте хотя бы один номинал.</p>`);
					else _push(`<!---->`);
					_push(`<small>От 1 до 1 000 000 ₽, целыми рублями и без повторов. До 30 номиналов.</small></section><section class="sb-gift-panel sb-gift-form sb-gift-validity-block crm-surface" aria-label="Срок действия карты"><header class="sb-gift-form-head"><div><h3>Срок действия</h3><small>Отсчитывается с момента выдачи новой карты</small></div></header><fieldset${ssrIncludeBooleanAttr(unref(busy) || (unref(tab) === "cards" ? !unref(canManageCards) : !unref(canWriteProduct))) ? " disabled" : ""} class="sb-gift-fields"><label class="${ssrRenderClass([{ "sb-gift-wide": !unref(customValidity) }, "sb-gift-field"])}"><span>Срок действия после выдачи</span><select aria-label="Срок действия после выдачи" class="crm-input"${ssrRenderAttr("value", unref(customValidity) ? "custom" : validityPreset(unref(product).validityDays))}><option value="90">90 дней</option><option value="180">180 дней</option><option value="365">1 год — 365 дней</option><option value="730">2 года — 730 дней</option><option value="custom">Другой срок</option></select></label>`);
					if (unref(customValidity)) _push(`<label class="sb-gift-field"><span>Срок действия, дней</span><input name="gift-validity" class="crm-input"${ssrRenderAttr("value", unref(product).validityDays)} inputmode="numeric" required></label>`);
					else _push(`<!---->`);
					_push(`</fieldset><small>От 1 до 3650 дней. Срок уже выданных карт не меняется.</small></section><!--]-->`);
				}
				_push(`</div><aside class="sb-gift-preview crm-surface" aria-label="Предпросмотр подарочной карты"><div class="sb-gift-preview-heading">`);
				_push(ssrRenderComponent(unref(Eye), { size: 18 }, null, _parent));
				_push(`<strong>Предпросмотр</strong><span class="crm-badge">${ssrInterpolate(unref(product).isActive ? "В продаже" : "Продажа выключена")}</span></div><div class="sb-gift-preview-art">`);
				if (unref(previewImage) && !unref(previewImageFailed)) _push(`<img${ssrRenderAttr("src", unref(previewImage))} alt="Изображение подарочной карты">`);
				else {
					_push(`<!--[--><div class="sb-gift-preview-brand"><span>SARKISIAN</span>`);
					_push(ssrRenderComponent(unref(Gift), { size: 32 }, null, _parent));
					_push(`</div><div class="sb-gift-preview-value"><span>ПОДАРОЧНАЯ КАРТА</span><strong>${ssrInterpolate(unref(previewNominal) ? money(unref(previewNominal).value) : "Выберите номинал")}</strong></div><!--]-->`);
				}
				_push(`</div><div class="sb-gift-preview-copy"><h3>${ssrInterpolate(unref(product).nameRu || "Подарочная карта")}</h3><p>${ssrInterpolate(unref(product).descriptionRu || "Добавьте описание для покупателей")}</p></div>`);
				if (unref(previewDenominations).length) {
					_push(`<div class="sb-gift-preview-nominals" aria-label="Номинал в предпросмотре"><!--[-->`);
					ssrRenderList(unref(previewDenominations), (item) => {
						_push(`<button class="crm-button" type="button"${ssrRenderAttr("aria-pressed", unref(previewNominal)?.key === item.key)}>${ssrInterpolate(money(item.value))}</button>`);
					});
					_push(`<!--]--></div>`);
				} else _push(`<!---->`);
				_push(`<p class="sb-gift-preview-term">`);
				_push(ssrRenderComponent(unref(Clock3), { size: 16 }, null, _parent));
				_push(`Срок действия: ${ssrInterpolate(unref(product).validityDays || "—")} дн.</p><small class="sb-gift-preview-note">Предпросмотр текущих настроек. Изменения появятся на сайте после сохранения.</small></aside></form>`);
			} else _push(`<!---->`);
			if (unref(tab) === "cards" && unref(canReadCards) && !unref(issue) && !unref(cardEditor)) {
				_push(`<div class="sb-gift-panel sb-gift-list crm-surface"><header class="sb-gift-list-head"><label class="sb-gift-field"><span>Поиск на текущей странице</span><input class="crm-input"${ssrRenderAttr("value", unref(search))} type="search" maxlength="160" placeholder="Код или заметка"></label>`);
				if (unref(canManageCards)) {
					_push(`<button class="sb-gift-button crm-button crm-button--primary"${ssrIncludeBooleanAttr(unref(busy) || unref(loading)) ? " disabled" : ""}>`);
					_push(ssrRenderComponent(unref(Plus), { size: 18 }, null, _parent));
					_push(` Выдать карту</button>`);
				} else _push(`<!---->`);
				_push(`</header>`);
				if (unref(visibleCards).length) {
					_push(`<table class="sb-gift-table"><caption class="sb-gift-sr-only">Выданные карты и их балансы</caption><thead><tr><th>Карта</th><th>Номинал и баланс</th><th>Выдача и срок</th><th>Статус</th><th>Действия</th></tr></thead><tbody><!--[-->`);
					ssrRenderList(unref(visibleCards), (card) => {
						_push(`<tr><td data-label="Карта"><div class="sb-gift-cell"><strong>${ssrInterpolate(card.maskedCode)}</strong>`);
						if (card.label) _push(`<span>${ssrInterpolate(card.label)}</span>`);
						else _push(`<!---->`);
						_push(`<small>Версия ${ssrInterpolate(card.revision)}</small></div></td><td data-label="Баланс"><div class="sb-gift-cell"><strong>${ssrInterpolate(money(card.balance))}</strong><small>Номинал: ${ssrInterpolate(money(card.faceValue))}</small><small>Зарезервировано: ${ssrInterpolate(money(card.reserved))}</small></div></td><td data-label="Срок"><div class="sb-gift-cell"><small>Выдана: ${ssrInterpolate(date(card.issuedAt))}</small><small>Действует до: ${ssrInterpolate(date(card.expiresAt))}</small></div></td><td data-label="Статус"><span class="sb-gift-badge">${ssrInterpolate(status(card))}</span></td><td data-label="Действия"><div class="sb-gift-row-actions">`);
						if (unref(canManageCards)) {
							_push(`<button class="sb-gift-icon-button crm-button"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}${ssrRenderAttr("aria-label", `Редактировать карту ${card.maskedCode}`)} title="Редактировать">`);
							_push(ssrRenderComponent(unref(Pencil), { size: 18 }, null, _parent));
							_push(`</button>`);
						} else _push(`<!---->`);
						if (unref(canManageCards)) {
							_push(`<button class="sb-gift-icon-button crm-button"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}${ssrRenderAttr("aria-label", `Открыть код карты ${card.maskedCode}`)} title="Открыть полный код">`);
							_push(ssrRenderComponent(unref(Eye), { size: 18 }, null, _parent));
							_push(`</button>`);
						} else _push(`<!---->`);
						_push(`<button class="sb-gift-button sb-gift-button--white sb-gift-history-button crm-button"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}${ssrRenderAttr("aria-label", `История карты ${card.maskedCode}`)}>`);
						_push(ssrRenderComponent(unref(History), { size: 18 }, null, _parent));
						_push(` История</button>`);
						if (unref(canManageCards) && card.isActive) {
							_push(`<button class="sb-gift-icon-button crm-button"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}${ssrRenderAttr("aria-label", `Выключить карту ${card.maskedCode}`)} title="Выключить с сохранением истории">`);
							_push(ssrRenderComponent(unref(Power), { size: 18 }, null, _parent));
							_push(`</button>`);
						} else _push(`<!---->`);
						_push(`</div></td></tr>`);
					});
					_push(`<!--]--></tbody></table>`);
				} else if (!unref(loading)) {
					_push(`<div class="sb-gift-empty">`);
					_push(ssrRenderComponent(unref(Gift), { size: 32 }, null, _parent));
					_push(`<p>${ssrInterpolate(unref(search) ? "На этой странице карты не найдены." : "Выданных карт пока нет.")}</p></div>`);
				} else _push(`<!---->`);
				if (unref(pageCount) > 1) _push(`<nav class="sb-gift-actions sb-gift-pagination" aria-label="Страницы выданных карт"><button class="sb-gift-button sb-gift-button--white crm-button"${ssrIncludeBooleanAttr(unref(busy) || unref(loading) || unref(page) === 1) ? " disabled" : ""}>Назад</button><span>Страница ${ssrInterpolate(unref(page))} из ${ssrInterpolate(unref(pageCount))}</span><button class="sb-gift-button sb-gift-button--white crm-button"${ssrIncludeBooleanAttr(unref(busy) || unref(loading) || unref(page) >= unref(pageCount)) ? " disabled" : ""}>Далее</button></nav>`);
				else _push(`<!---->`);
				_push(`</div>`);
			} else _push(`<!---->`);
			if (unref(tab) === "cards" && unref(canManageCards) && (unref(issue) || unref(cardEditor))) {
				_push(`<form class="sb-gift-panel sb-gift-form crm-surface" novalidate><header class="sb-gift-form-head"><div><h3>${ssrInterpolate(unref(issue) ? "Ручная выдача карты" : `Карта ${unref(cardEditor)?.maskedCode}`)}</h3><small>${ssrInterpolate(unref(editorDirty) ? "Есть несохранённые изменения" : "Заполните параметры и сохраните")}</small></div><button type="button" class="sb-gift-icon-button crm-button crm-button--icon"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""} aria-label="Закрыть редактор карты">`);
				_push(ssrRenderComponent(unref(ArrowLeft), { size: 20 }, null, _parent));
				_push(`</button></header><fieldset${ssrIncludeBooleanAttr(unref(busy) || (unref(tab) === "cards" ? !unref(canManageCards) : !unref(canWriteProduct))) ? " disabled" : ""} class="sb-gift-fields">`);
				if (unref(issue)) {
					_push(`<!--[--><p class="sb-gift-note sb-gift-wide">Ручная выдача создаёт финансовое обязательство компании. Укажите основание; это не тестовый предпросмотр и не продажа с оплатой.</p><label class="sb-gift-field"><span>Номинал, ₽</span><input class="crm-input"${ssrRenderAttr("value", unref(issue).nominal)} type="number" inputmode="numeric" min="1" max="1000000" step="1" placeholder="1000" required></label><label class="sb-gift-field"><span>Срок действия, дней</span><input class="crm-input"${ssrRenderAttr("value", unref(issue).validityDays)} inputmode="numeric" required></label><label class="sb-gift-field sb-gift-wide"><span>Код карты</span><div class="sb-gift-code-input"><input class="crm-input"${ssrRenderAttr("value", unref(issue).code)} maxlength="63" spellcheck="false" autocapitalize="characters" placeholder="Сгенерируется при выдаче"><button type="button" class="sb-gift-button sb-gift-button--white crm-button">`);
					_push(ssrRenderComponent(unref(Shuffle), { size: 18 }, null, _parent));
					_push(` Сгенерировать</button></div><small>Генерация кода сама по себе не выдаёт карту. Код скрывается после сохранения.</small></label><label class="sb-gift-field sb-gift-wide"><span>Заметка</span><input class="crm-input"${ssrRenderAttr("value", unref(issue).label)} maxlength="160" placeholder="Получатель или назначение"></label><label class="sb-gift-field sb-gift-wide"><span>Причина ручной выдачи</span><textarea class="crm-input" rows="3" maxlength="500" placeholder="Например, компенсация по согласованию руководителя" required>${ssrInterpolate(unref(issue).reason)}</textarea><small>Обязательное поле для финансовой истории.</small></label><!--]-->`);
				} else if (unref(cardEditor)) _push(`<!--[--><label class="sb-gift-field sb-gift-wide"><span>Заметка</span><input class="crm-input"${ssrRenderAttr("value", unref(cardEditor).label)} maxlength="160"></label><label class="sb-gift-field"><span>Действует до</span><input class="crm-input"${ssrRenderAttr("value", unref(cardEditor).expiresAt)} type="datetime-local" required></label><label class="sb-gift-checkbox crm-toggle-row"><input class="crm-check"${ssrIncludeBooleanAttr(Array.isArray(unref(cardEditor).isActive) ? ssrLooseContain(unref(cardEditor).isActive, null) : unref(cardEditor).isActive) ? " checked" : ""} type="checkbox"> Карта включена</label><p class="sb-gift-note sb-gift-wide">Номинал и баланс не редактируются вручную. Финансовая история не удаляется. Изменения проверяются по версии карты.</p><!--]-->`);
				else _push(`<!---->`);
				_push(`</fieldset><footer class="sb-gift-actions"><button type="submit" class="sb-gift-button crm-button crm-button--primary"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}>`);
				_push(ssrRenderComponent(unref(Save), { size: 18 }, null, _parent));
				_push(` ${ssrInterpolate(unref(busy) ? "Сохраняем…" : unref(issue) ? "Выдать карту" : "Сохранить изменения")}</button><button type="button" class="sb-gift-button sb-gift-button--white crm-button"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}>`);
				_push(ssrRenderComponent(unref(X), { size: 18 }, null, _parent));
				_push(` Отмена</button></footer></form>`);
			} else _push(`<!---->`);
			ssrRenderTeleport(_push, (_push) => {
				if (unref(dialog)) {
					_push(`<div class="sb-gift-dialog-layer admin-dialog-backdrop crm-management-backdrop"><section class="${ssrRenderClass([{ "sb-gift-dialog--history": unref(dialog).kind === "history" }, "sb-gift-admin sb-gift-panel sb-gift-dialog admin-dialog admin-dialog--modal crm-surface crm-management-dialog"])}" role="dialog" aria-modal="true" aria-labelledby="sb-gift-dialog-title" aria-describedby="sb-gift-dialog-description"><header class="sb-gift-form-head"><h3 id="sb-gift-dialog-title">${ssrInterpolate(unref(dialog).kind === "history" ? "История карты" : unref(dialog).kind === "reveal" ? "Полный код карты" : "Выключить карту?")}</h3><button class="sb-gift-icon-button crm-button crm-button--icon"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""} aria-label="Закрыть окно карты">`);
					_push(ssrRenderComponent(unref(X), { size: 20 }, null, _parent));
					_push(`</button></header><p id="sb-gift-dialog-description">${ssrInterpolate(unref(dialog).kind === "history" ? `Карта ${unref(dialog).card.maskedCode}. Резервирование и применение средств по заказам. Только просмотр.` : unref(dialog).kind === "reveal" ? "Код даёт доступ к средствам карты. Открывайте его только для передачи получателю. Через минуту код снова скроется." : `Карта ${unref(dialog).card.maskedCode} будет недоступна для новых применений. Баланс, резервы и история сохранятся.`)}</p>`);
					if (unref(dialog).kind === "history") {
						_push(`<!--[-->`);
						if (unref(historyCard)) _push(`<dl class="sb-gift-history-summary"><div><dt>Номинал</dt><dd>${ssrInterpolate(money(unref(historyCard).faceValue))}</dd></div><div><dt>Баланс</dt><dd>${ssrInterpolate(money(unref(historyCard).balance))}</dd></div><div><dt>Зарезервировано</dt><dd>${ssrInterpolate(money(unref(historyCard).reserved))}</dd></div></dl>`);
						else _push(`<!---->`);
						if (unref(historyCard)) _push(`<p class="sb-gift-history-meta">${ssrInterpolate(unref(historyCard).isActive ? "Карта включена" : "Карта выключена")} · Действует до ${ssrInterpolate(date(unref(historyCard).expiresAt))}</p>`);
						else _push(`<!---->`);
						if (unref(historyLoading)) _push(`<p class="sb-gift-notice" role="status">Загружаем историю…</p>`);
						else if (unref(historyItems).length) {
							_push(`<ol class="sb-gift-history-list" aria-label="Финансовые операции карты"><!--[-->`);
							ssrRenderList(unref(historyItems), (item) => {
								_push(`<li><div class="sb-gift-history-operation"><strong>${ssrInterpolate(money(item.amount))}</strong><span class="sb-gift-badge">${ssrInterpolate(historyStatus(item.status))}</span></div><p class="sb-gift-history-order">${ssrInterpolate(item.orderNumber ? `Заказ № ${item.orderNumber}` : "Номер заказа не указан")}</p><dl class="sb-gift-history-times"><div><dt>Создано</dt><dd>${ssrInterpolate(date(item.createdAt))}</dd></div>`);
								if (item.appliedAt) _push(`<div><dt>Списано</dt><dd>${ssrInterpolate(date(item.appliedAt))}</dd></div>`);
								else _push(`<!---->`);
								if (item.releasedAt) _push(`<div><dt>Резерв снят</dt><dd>${ssrInterpolate(date(item.releasedAt))}</dd></div>`);
								else _push(`<!---->`);
								_push(`</dl></li>`);
							});
							_push(`<!--]--></ol>`);
						} else if (!unref(error)) _push(`<p class="sb-gift-notice">Операций по карте пока нет.</p>`);
						else _push(`<!---->`);
						if (unref(historyPageCount) > 1) _push(`<nav class="sb-gift-actions sb-gift-pagination" aria-label="Страницы истории карты"><button class="sb-gift-button sb-gift-button--white crm-button"${ssrIncludeBooleanAttr(unref(historyLoading) || unref(historyPage) === 1) ? " disabled" : ""}>Назад</button><span>Страница ${ssrInterpolate(unref(historyPage))} из ${ssrInterpolate(unref(historyPageCount))}</span><button class="sb-gift-button sb-gift-button--white crm-button"${ssrIncludeBooleanAttr(unref(historyLoading) || unref(historyPage) === unref(historyPageCount)) ? " disabled" : ""}>Далее</button></nav>`);
						else _push(`<!---->`);
						_push(`<!--]-->`);
					} else _push(`<!---->`);
					if (unref(secret) && unref(revealedForId) === unref(dialog).card.id) {
						_push(`<div class="sb-gift-secret"><code tabindex="0">${ssrInterpolate(unref(secret))}</code><button class="sb-gift-button sb-gift-button--white crm-button">`);
						_push(ssrRenderComponent(unref(Copy), { size: 18 }, null, _parent));
						_push(` Копировать код</button></div>`);
					} else _push(`<!---->`);
					if (unref(error)) _push(`<p class="sb-gift-notice" role="alert">${ssrInterpolate(unref(error))}</p>`);
					else _push(`<!---->`);
					_push(`<footer class="sb-gift-actions">`);
					if (unref(dialog).kind === "history" && unref(error)) {
						_push(`<button class="sb-gift-button sb-gift-button--white crm-button crm-button--refresh"${ssrIncludeBooleanAttr(unref(historyLoading)) ? " disabled" : ""}>`);
						_push(ssrRenderComponent(unref(RefreshCw), { size: 18 }, null, _parent));
						_push(` Повторить</button>`);
					} else _push(`<!---->`);
					if (unref(dialog).kind !== "history" && !unref(secret)) _push(`<button class="sb-gift-button crm-button crm-button--primary"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}>${ssrInterpolate(unref(busy) ? "Выполняем…" : unref(dialog).kind === "reveal" ? "Показать полный код" : "Выключить карту")}</button>`);
					else _push(`<!---->`);
					_push(`<button class="sb-gift-button sb-gift-button--white crm-button"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}>${ssrInterpolate(unref(dialog).kind === "history" ? "Закрыть" : unref(secret) ? "Скрыть и закрыть" : "Отмена")}</button></footer></section></div>`);
				} else _push(`<!---->`);
			}, "body", false, _parent);
			_push(`</section>`);
		};
	}
});
// components/storefront/SiteGiftCardsEditor.vue
var _sfc_setup$3 = SiteGiftCardsEditor_vue_vue_type_script_setup_true_lang_default.setup;
SiteGiftCardsEditor_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/storefront/SiteGiftCardsEditor.vue");
	return _sfc_setup$3 ? _sfc_setup$3(props, ctx) : void 0;
};
var SiteGiftCardsEditor_default = Object.assign(SiteGiftCardsEditor_vue_vue_type_script_setup_true_lang_default, { __name: "SiteGiftCardsEditor" });
// components/WorkspaceOrdersTable.vue?vue&type=script&setup=true&lang.ts
var WorkspaceOrdersTable_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "WorkspaceOrdersTable",
	__ssrInlineRender: true,
	props: {
		items: {},
		total: {},
		search: {},
		status: {},
		busy: { type: Boolean }
	},
	emits: [
		"update:search",
		"update:status",
		"open",
		"context"
	],
	setup(__props, { emit: __emit }) {
		const statuses = [
			{
				id: "",
				label: "Все заказы"
			},
			{
				id: "NEW",
				label: "Новые"
			},
			{
				id: "CONFIRMED",
				label: "Подтверждены"
			},
			{
				id: "ASSEMBLING",
				label: "В сборке"
			},
			{
				id: "SHIPPED",
				label: "Отправлены"
			},
			{
				id: "DELIVERED",
				label: "Доставлены"
			},
			{
				id: "PAYMENT_WAITING",
				label: "Ожидают оплаты"
			},
			{
				id: "PAID",
				label: "Оплачены"
			},
			{
				id: "CANCELLED",
				label: "Отменены"
			},
			{
				id: "REFUNDED",
				label: "Возврат"
			}
		];
		const paymentNames = {
			PENDING: "Ожидает оплаты",
			PAID: "Оплачен",
			SUCCEEDED: "Оплачен",
			UNPAID: "Не оплачен",
			FAILED: "Ошибка оплаты",
			CANCELLED: "Отменена",
			REFUNDED: "Возвращена",
			PARTIALLY_REFUNDED: "Частичный возврат"
		};
		const statusNames = {
			NEW: "Новый",
			CONFIRMED: "Подтверждён",
			ASSEMBLING: "В сборке",
			SHIPPED: "Отправлен",
			DELIVERED: "Доставлен",
			PAID: "Оплачен",
			PAYMENT_WAITING: "Ожидает оплаты",
			CANCELLED: "Отменён",
			REFUNDED: "Возврат"
		};
		const customerName = (order) => [order.user?.firstName, order.user?.lastName].filter(Boolean).join(" ") || "Гостевой заказ";
		function amount(value) {
			const n = value == null || value === "" ? NaN : Number(value);
			return Number.isFinite(n) ? `${n.toLocaleString("ru-RU")} ₽` : "—";
		}
		function date(value) {
			const d = new Date(value);
			return Number.isFinite(d.getTime()) ? d.toLocaleDateString("ru-RU", {
				day: "numeric",
				month: "short",
				year: "numeric"
			}) : "Дата не указана";
		}
		function delivery(order) {
			return order.deliveryMethod === "PVZ" ? "Пункт выдачи" : order.deliveryMethod === "COURIER" ? "Курьер" : "Способ не выбран";
		}
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<section${ssrRenderAttrs(mergeProps({
				class: "studio-orders crm-approved-orders-register",
				"aria-label": "Заказы интернет-магазина",
				"aria-busy": __props.busy
			}, _attrs))}><div class="studio-order-tools"><label class="studio-order-search crm-input-group">`);
			_push(ssrRenderComponent(unref(Search), {
				size: 18,
				"aria-hidden": "true"
			}, null, _parent));
			_push(`<span class="wn-sr-only">Поиск заказов</span><input class="crm-input" id="studio-orders-query"${ssrRenderAttr("value", __props.search)} type="search" aria-label="Поиск заказов" placeholder="Номер заказа или email клиента"></label><label class="studio-order-filter"><span class="wn-sr-only">Статус заказа</span><select class="crm-input"${ssrRenderAttr("value", __props.status)} aria-label="Статус заказа"><!--[-->`);
			ssrRenderList(statuses, (view) => {
				_push(`<option${ssrRenderAttr("value", view.id)}>${ssrInterpolate(view.label)}</option>`);
			});
			_push(`<!--]--></select></label>`);
			if (__props.search || __props.status) {
				_push(`<button type="button" class="studio-order-reset crm-button">`);
				_push(ssrRenderComponent(unref(X), { size: 16 }, null, _parent));
				_push(` Сбросить</button>`);
			} else _push(`<!---->`);
			_push(`<span class="studio-order-total" role="status">${ssrInterpolate(__props.busy ? "Обновляем…" : `Найдено: ${__props.total}`)}</span></div><div class="studio-orders-scroll"><table class="studio-orders-table"><thead><tr><th scope="col">Заказ</th><th scope="col">Покупатель</th><th scope="col">Доставка</th><th scope="col" class="studio-order-amount">Сумма</th><th scope="col">Заказ и оплата</th><th scope="col">Передача в 1С</th><th scope="col"><span class="wn-sr-only">Открыть заказ</span></th></tr></thead><tbody><!--[-->`);
			ssrRenderList(__props.items, (order) => {
				_push(`<tr><td><button type="button" class="studio-order-open crm-button crm-button--text">${ssrInterpolate(order.orderNumber)}</button><small>${ssrInterpolate(date(order.createdAt))}</small></td><td><strong>${ssrInterpolate(customerName(order))}</strong><small>${ssrInterpolate(order.user?.email || "Email не указан")}</small></td><td><span>${ssrInterpolate(delivery(order))}</span><small>${ssrInterpolate(order.shippingAddress?.city || "—")}</small></td><td class="studio-order-amount"><strong>${ssrInterpolate(amount(order.finalAmount))}</strong></td><td><span class="${ssrRenderClass([{
					"studio-status--positive": ["DELIVERED", "PAID"].includes(order.status),
					"studio-status--new": order.status === "NEW",
					"studio-status--muted": ["CANCELLED", "REFUNDED"].includes(order.status)
				}, "studio-status"])}">${ssrInterpolate(statusNames[order.status] || order.status)}</span><small>${ssrInterpolate(paymentNames[order.paymentStatus] || order.paymentStatus || "Не указана")}</small></td><td><span class="${ssrRenderClass([{ "studio-sync--error": order.oneCSyncError }, "studio-sync"])}">${ssrInterpolate(order.oneCSyncError ? "Ошибка передачи" : order.isSynced1C ? "Передан" : "Не передан")}</span></td><td>`);
				_push(ssrRenderComponent(unref(ArrowUpRight), {
					size: 18,
					"aria-hidden": "true"
				}, null, _parent));
				_push(`</td></tr>`);
			});
			_push(`<!--]--></tbody></table></div><div class="studio-orders-mobile"><!--[-->`);
			ssrRenderList(__props.items, (order) => {
				_push(`<button type="button" class="studio-mobile-order crm-button crm-card-action"><span class="studio-mobile-order-top"><strong>${ssrInterpolate(order.orderNumber)}</strong><span class="${ssrRenderClass([{ "studio-status--new": order.status === "NEW" }, "studio-status"])}">${ssrInterpolate(statusNames[order.status] || order.status)}</span></span><span class="studio-mobile-order-date">${ssrInterpolate(date(order.createdAt))}</span><span class="studio-mobile-order-top"><span>${ssrInterpolate(customerName(order))}</span><strong>${ssrInterpolate(amount(order.finalAmount))}</strong></span><span class="studio-mobile-order-meta">${ssrInterpolate(delivery(order))} · ${ssrInterpolate(order.shippingAddress?.city || "Адрес не указан")}</span><span class="studio-mobile-order-meta">${ssrInterpolate(paymentNames[order.paymentStatus] || order.paymentStatus || "Оплата не указана")}</span></button>`);
			});
			_push(`<!--]--></div>`);
			if (!__props.items.length) {
				_push(`<div class="studio-orders-empty">`);
				_push(ssrRenderComponent(unref(ShoppingBag), { size: 28 }, null, _parent));
				_push(`<h3>${ssrInterpolate(__props.busy ? "Загружаем заказы" : "Заказы не найдены")}</h3><p>${ssrInterpolate(__props.search || __props.status ? "Измените поисковый запрос или сбросьте фильтры." : "Здесь появятся заказы интернет-магазина.")}</p></div>`);
			} else _push(`<!---->`);
			_push(`<footer class="studio-orders-foot">На странице: ${ssrInterpolate(__props.items.length)} · Нажмите на номер заказа, чтобы открыть карточку.</footer></section>`);
		};
	}
});
// components/WorkspaceOrdersTable.vue
var _sfc_setup$2 = WorkspaceOrdersTable_vue_vue_type_script_setup_true_lang_default.setup;
WorkspaceOrdersTable_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/WorkspaceOrdersTable.vue");
	return _sfc_setup$2 ? _sfc_setup$2(props, ctx) : void 0;
};
var WorkspaceOrdersTable_default = Object.assign(WorkspaceOrdersTable_vue_vue_type_script_setup_true_lang_default, { __name: "WorkspaceOrdersTable" });
// components/AdminOrderDrawer.vue?vue&type=script&setup=true&lang.ts
var AdminOrderDrawer_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "AdminOrderDrawer",
	__ssrInlineRender: true,
	setup(__props) {
		const selected = useState("admin-order-selected", () => null);
		const copied = ref(false);
		const route = useRoute(), isCrmOrder = computed(() => route.path.startsWith("/crm/"));
		const session = useWorkspaceSession();
		const access = useWorkspaceAccess();
		useState("admin-order-saved", () => null);
		const statusDraft = ref("");
		const saving = ref(false);
		const actionError = ref("");
		const canManage = computed(() => access.ready.value && WEB_ORDER_OPERATOR_ROLES.includes(session.user.value?.role || "") && access.can("web_orders.write"));
		const nextStatuses = computed(() => canManage.value ? webOrderNextStatuses(selected.value) : []);
		watch(() => `${selected.value?.id || ""}:${session.token.value}`, () => {
			statusDraft.value = "";
			actionError.value = "";
		});
		watch(() => Boolean(selected.value), async (open) => {
			if (open) {
				(void 0).activeElement instanceof HTMLElement && (void 0).activeElement;
				await nextTick();
				(void 0).querySelector(".order-drawer .close")?.focus();
			}
		});
		onBeforeRouteLeave(() => {
			if (saving.value) return false;
			if (selected.value && statusDraft.value && !confirm("Уйти без изменения статуса заказа?")) return false;
			selected.value = null;
		});
		const statuses = {
			NEW: "Новый",
			CONFIRMED: "Подтверждён",
			PAID: "Оплачен",
			ASSEMBLING: "Сборка",
			SHIPPED: "Отправлен",
			DELIVERED: "Доставлен",
			CANCELLED: "Отменён",
			REFUNDED: "Возврат"
		};
		const paymentNames = {
			PENDING: "Ожидает оплаты",
			UNPAID: "Не оплачен",
			PAID: "Оплачен",
			SUCCEEDED: "Оплачен",
			FAILED: "Ошибка оплаты",
			CANCELED: "Платёж отменён",
			CANCELLED: "Платёж отменён",
			REFUNDED: "Возвращена",
			PARTIALLY_REFUNDED: "Частичный возврат"
		};
		const money = (value) => new Intl.NumberFormat("ru-RU", {
			style: "currency",
			currency: selected.value?.currency || "RUB"
		}).format(Number(value || 0));
		const unitCount = computed(() => (selected.value?.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0));
		const pickingCount = computed(() => warehouseTotal(selected.value, "picked"));
		const shippingCount = computed(() => warehouseTotal(selected.value, "shipped"));
		const reserveCount = computed(() => warehouseTotal(selected.value, "reserved"));
		const warehouse = computed(() => warehouseExecution(selected.value));
		const warehouseCaption = computed(() => {
			const at = warehouseFactAt(selected.value);
			return at ? (warehouse.value?.isCurrent === false ? "Исторические данные на " : "По данным 1С на ") + new Date(at).toLocaleString("ru-RU", { timeZone: "Europe/Moscow" }) : "Подтверждённые данные 1С не получены";
		});
		const physicalOrder = computed(() => selected.value?.items?.some((item) => item.productType !== "GIFT_CARD"));
		const canOpenExecution = computed(() => physicalOrder.value && access.ready.value && access.can("oms.read"));
		const executionRoute = computed(() => "/crm/fulfillment?order=" + encodeURIComponent(selected.value?.id || ""));
		const address = computed(() => {
			const value = selected.value?.shippingAddress;
			if (!value) return "Адрес доставки не указан";
			if (typeof value === "string") return value;
			return Object.values(value).filter(Boolean).join(", ");
		});
		return (_ctx, _push, _parent, _attrs) => {
			const _component_NuxtLink = NuxtLink;
			if (unref(selected) && unref(isCrmOrder)) ssrRenderTeleport(_push, (_push) => {
				_push(`<aside class="order-backdrop admin-dialog-backdrop crm-order-webbackdrop"><section class="order-drawer admin-dialog admin-dialog--drawer crm-approved-order crm-order-webdrawer" role="dialog" aria-modal="true" aria-labelledby="web-order-title"><header class="drawer-header admin-dialog-head crm-order-webdrawer-header"><div class="crm-order-title-line"><h2 id="web-order-title">Заказ ${ssrInterpolate(unref(selected).orderNumber)}</h2><button class="crm-button crm-button--icon" type="button"${ssrRenderAttr("title", unref(copied) ? "Номер скопирован" : "Скопировать номер заказа")}${ssrRenderAttr("aria-label", unref(copied) ? "Номер скопирован" : "Скопировать номер заказа")}>`);
				if (unref(copied)) _push(ssrRenderComponent(unref(Check), { size: 16 }, null, _parent));
				else _push(ssrRenderComponent(unref(Copy), { size: 16 }, null, _parent));
				_push(`</button><span class="crm-badge"${ssrRenderAttr("data-status", unref(selected).status)}>${ssrInterpolate(statuses[unref(selected).status] || unref(selected).status)}</span></div><button type="button" class="close crm-button crm-button--icon"${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""} aria-label="Закрыть карточку заказа">`);
				_push(ssrRenderComponent(unref(X), { size: 20 }, null, _parent));
				_push(`</button></header><div class="drawer-body admin-dialog-body crm-order-webdrawer-body"><div class="crm-order-identity"><div><strong class="crm-order-company">${ssrInterpolate([unref(selected).user?.firstName, unref(selected).user?.lastName].filter(Boolean).join(" ") || unref(selected).buyerName || "Гостевой заказ")}</strong><p class="crm-order-meta">Интернет-магазин <span>·</span> ${ssrInterpolate(new Date(unref(selected).createdAt).toLocaleString("ru-RU"))}</p></div><div class="crm-order-total"><span>Сумма заказа</span><strong>${ssrInterpolate(money(unref(selected).finalAmount))}</strong></div></div><div class="crm-order-stages" aria-label="Состояния заказа"><div><span>Оплата</span><strong${ssrRenderAttr("data-tone", ["PAID", "SUCCEEDED"].includes(unref(selected).paymentStatus) ? "success" : "neutral")}>${ssrInterpolate(paymentNames[unref(selected).paymentStatus] || "Нет подтверждения")}</strong><small>Статус платёжной системы</small></div><div><span>Резерв</span><strong>${ssrInterpolate(!unref(physicalOrder) ? "Не требуется" : unref(reserveCount) == null ? "Нет данных 1С" : unref(warehouseNumber)(unref(reserveCount)) + " ед.")}</strong><small>${ssrInterpolate(!unref(physicalOrder) ? "Электронный заказ" : unref(warehouseCaption))}</small></div><div><span>Сборка</span><strong>${ssrInterpolate(!unref(physicalOrder) ? "Не требуется" : unref(pickingCount) == null ? "Нет данных 1С" : unref(pickingCount) + " из " + unref(unitCount) + " единиц")}</strong><small>${ssrInterpolate(!unref(physicalOrder) ? "Электронный заказ" : unref(warehouseCaption))}</small></div><div><span>Отгрузка</span><strong>${ssrInterpolate(!unref(physicalOrder) ? "Электронная доставка" : unref(shippingCount) == null ? "Нет данных 1С" : unref(shippingCount) + " из " + unref(unitCount) + " единиц")}</strong><small>${ssrInterpolate(unref(selected).trackingNumber ? "Трек: " + unref(selected).trackingNumber : "Трек-номер не указан")}</small></div></div><div class="crm-order-workspace"><div class="crm-order-primary">`);
				if (unref(canOpenExecution)) {
					_push(`<div class="crm-order-next-action"><div><h2>Исполнение на складе 1С</h2><p>Проверьте подтверждённый резерв, ход отбора и документы отгрузки. Складские операции выполняются в 1С.</p></div>`);
					_push(ssrRenderComponent(_component_NuxtLink, {
						class: "crm-button crm-button--primary",
						to: unref(executionRoute)
					}, {
						default: withCtx((_, _push, _parent, _scopeId) => {
							if (_push) {
								_push(`Монитор склада 1С`);
								_push(ssrRenderComponent(unref(ArrowRight), { size: 17 }, null, _parent, _scopeId));
							} else return [createTextVNode("Монитор склада 1С"), createVNode(unref(ArrowRight), { size: 17 })];
						}),
						_: 1
					}, _parent));
					_push(`</div>`);
				} else _push(`<!---->`);
				_push(`<section class="crm-order-table-panel"><div class="crm-order-section-heading"><h2>Состав заказа</h2><span>${ssrInterpolate(unref(selected).items?.length || 0)} позиций · ${ssrInterpolate(unref(unitCount))} единиц</span></div><div class="crm-order-table-scroll"><table class="crm-order-items-table"><thead><tr><th scope="col">Товар</th><th scope="col">Шт.</th><th scope="col">Цена за шт.</th><th scope="col">Сумма</th></tr></thead><tbody><!--[-->`);
				ssrRenderList(unref(selected).items, (item) => {
					_push(`<tr><td><strong>${ssrInterpolate(item.productName)}</strong><small>${ssrInterpolate([item.variantName, item.variant?.sku || item.externalSku].filter(Boolean).join(" · "))}</small></td><td data-label="Количество">${ssrInterpolate(item.quantity)}</td><td data-label="Цена за шт.">${ssrInterpolate(money(item.price))}</td><td data-label="Сумма"><strong>${ssrInterpolate(money(item.total))}</strong></td></tr>`);
				});
				_push(`<!--]--></tbody></table></div>`);
				if (!unref(selected).items?.length) _push(`<p class="crm-order-empty">Состав не указан.</p>`);
				else _push(`<!---->`);
				_push(`<div class="crm-order-calculation"><p>Суммы и условия — из заказа интернет-магазина.</p><dl>`);
				if (unref(selected).totalAmount != null) _push(`<div><dt>Сумма товаров</dt><dd>${ssrInterpolate(money(unref(selected).totalAmount))}</dd></div>`);
				else _push(`<!---->`);
				if (Number(unref(selected).discountAmount) > 0) _push(`<div><dt>Скидка</dt><dd>−${ssrInterpolate(money(unref(selected).discountAmount))}</dd></div>`);
				else _push(`<!---->`);
				if (unref(selected).shippingCost != null) _push(`<div><dt>Доставка</dt><dd>${ssrInterpolate(money(unref(selected).shippingCost))}</dd></div>`);
				else _push(`<!---->`);
				_push(`<div class="crm-order-calculation-total"><dt>Итого по заказу</dt><dd>${ssrInterpolate(money(unref(selected).finalAmount))}</dd></div></dl></div></section><section class="crm-order-delivery" aria-label="Клиент и доставка"><div><h2>`);
				_push(ssrRenderComponent(unref(Phone), { size: 16 }, null, _parent));
				_push(`Получатель</h2><strong>${ssrInterpolate([unref(selected).user?.firstName, unref(selected).user?.lastName].filter(Boolean).join(" ") || unref(selected).buyerName || "Гость")}</strong><span>${ssrInterpolate(unref(selected).user?.email || unref(selected).buyerEmail || "Email не указан")}</span><span>${ssrInterpolate(unref(selected).user?.phone || unref(selected).buyerPhone || "Телефон не указан")}</span></div><div><h2>`);
				_push(ssrRenderComponent(unref(MapPin), { size: 16 }, null, _parent));
				_push(`Доставка</h2><strong>${ssrInterpolate(unref(selected).shippingProvider || "Способ не указан")}</strong><span>${ssrInterpolate(unref(address))}</span>`);
				if (unref(selected).trackingNumber) _push(`<span>Трек: ${ssrInterpolate(unref(selected).trackingNumber)}</span>`);
				else _push(`<!---->`);
				_push(`</div></section></div><aside class="crm-order-context"><section class="crm-order-sync"${ssrRenderAttr("data-confirmed", unref(selected).isSynced1C)}><div><h2>Обмен с 1С</h2><span class="crm-order-state"${ssrRenderAttr("data-tone", unref(selected).oneCSyncError ? "warning" : unref(selected).isSynced1C ? "success" : "warning")}>${ssrInterpolate(unref(selected).oneCSyncError ? "Ошибка передачи" : unref(selected).isSynced1C ? "Подтверждён" : "Не подтверждён")}</span></div><p>${ssrInterpolate(unref(selected).oneCSyncError || (unref(selected).oneCSyncAt ? "Последнее подтверждение: " + new Date(unref(selected).oneCSyncAt).toLocaleString("ru-RU") : "Подтверждение передачи ещё не получено."))}</p></section><section class="crm-order-recent"><h2>История заказа</h2><ol class="crm-order-timeline"><!--[-->`);
				ssrRenderList(unref(selected).history, (entry) => {
					_push(`<li><time>${ssrInterpolate(new Date(entry.createdAt).toLocaleString("ru-RU"))}</time><div><strong>${ssrInterpolate(statuses[entry.toStatus] || entry.toStatus)}</strong>`);
					if (entry.comment) _push(`<p>${ssrInterpolate(entry.comment)}</p>`);
					else _push(`<!---->`);
					_push(`</div></li>`);
				});
				_push(`<!--]--></ol>`);
				if (!unref(selected).history?.length) _push(`<p class="crm-order-muted">История пока пуста.</p>`);
				else _push(`<!---->`);
				_push(`</section></aside></div></div>`);
				if (unref(nextStatuses).length || unref(actionError)) {
					_push(`<footer class="crm-order-webdrawer-footer">`);
					if (unref(actionError)) _push(`<p class="crm-order-notice crm-order-notice--danger" role="alert">${ssrInterpolate(unref(actionError))}</p>`);
					else _push(`<!---->`);
					if (unref(nextStatuses).length) {
						_push(`<div class="studio-order-actions"><label>Изменить статус заказа<select class="crm-input"${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""}><option value=""${ssrIncludeBooleanAttr(Array.isArray(unref(statusDraft)) ? ssrLooseContain(unref(statusDraft), "") : ssrLooseEqual(unref(statusDraft), "")) ? " selected" : ""}>Выберите действие</option><!--[-->`);
						ssrRenderList(unref(nextStatuses), (status) => {
							_push(`<option${ssrRenderAttr("value", status)}${ssrIncludeBooleanAttr(Array.isArray(unref(statusDraft)) ? ssrLooseContain(unref(statusDraft), status) : ssrLooseEqual(unref(statusDraft), status)) ? " selected" : ""}>${ssrInterpolate(statuses[status])}</option>`);
						});
						_push(`<!--]--></select></label><button type="button" class="studio-order-save crm-button crm-button--primary"${ssrIncludeBooleanAttr(unref(saving) || !unref(statusDraft)) ? " disabled" : ""}>${ssrInterpolate(unref(saving) ? "Сохраняем…" : "Изменить статус")}</button></div>`);
					} else _push(`<!---->`);
					_push(`</footer>`);
				} else _push(`<!---->`);
				_push(`</section></aside>`);
			}, "body", false, _parent);
			else if (unref(selected)) {
				_push(`<aside${ssrRenderAttrs(mergeProps({
					"data-v-ui-3f69e94afb94": "",
					class: "order-backdrop admin-dialog-backdrop"
				}, _attrs))}><section data-v-ui-3f69e94afb94 class="order-drawer admin-dialog admin-dialog--drawer" role="dialog" aria-modal="true" aria-label="Карточка заказа"><header data-v-ui-3f69e94afb94 class="drawer-header admin-dialog-head"><div data-v-ui-3f69e94afb94><p data-v-ui-3f69e94afb94 class="eyebrow">ЗАКАЗ МАГАЗИНА</p><div data-v-ui-3f69e94afb94 class="number-line"><h2 data-v-ui-3f69e94afb94>${ssrInterpolate(unref(selected).orderNumber)}</h2><button class="crm-button" data-v-ui-3f69e94afb94 title="Скопировать номер">`);
				if (unref(copied)) _push(ssrRenderComponent(unref(Check), {
					"data-v-ui-3f69e94afb94": "",
					size: 15
				}, null, _parent));
				else _push(ssrRenderComponent(unref(Copy), {
					"data-v-ui-3f69e94afb94": "",
					size: 15
				}, null, _parent));
				_push(`</button></div><span data-v-ui-3f69e94afb94>${ssrInterpolate(new Date(unref(selected).createdAt).toLocaleString("ru-RU"))}</span></div><button data-v-ui-3f69e94afb94 type="button" class="close crm-button crm-button--icon"${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""} aria-label="Закрыть карточку заказа">`);
				_push(ssrRenderComponent(unref(X), {
					"data-v-ui-3f69e94afb94": "",
					size: 19
				}, null, _parent));
				_push(`</button></header><div data-v-ui-3f69e94afb94 class="drawer-body admin-dialog-body"><div data-v-ui-3f69e94afb94 class="order-summary"><div data-v-ui-3f69e94afb94><span data-v-ui-3f69e94afb94>Статус</span><strong data-v-ui-3f69e94afb94 class="${ssrRenderClass(`status-${unref(selected).status.toLowerCase()}`)}">${ssrInterpolate(statuses[unref(selected).status] || unref(selected).status)}</strong></div><div data-v-ui-3f69e94afb94><span data-v-ui-3f69e94afb94>Оплата</span><strong data-v-ui-3f69e94afb94>${ssrInterpolate(statuses[unref(selected).paymentStatus] || unref(selected).paymentStatus)}</strong></div><div data-v-ui-3f69e94afb94><span data-v-ui-3f69e94afb94>Итого</span><strong data-v-ui-3f69e94afb94>${ssrInterpolate(Number(unref(selected).finalAmount || 0).toLocaleString("ru-RU"))} ₽</strong></div></div><section data-v-ui-3f69e94afb94 class="detail-section"><h3 data-v-ui-3f69e94afb94>`);
				_push(ssrRenderComponent(unref(Package), {
					"data-v-ui-3f69e94afb94": "",
					size: 16
				}, null, _parent));
				_push(` Состав заказа</h3><!--[-->`);
				ssrRenderList(unref(selected).items, (item) => {
					_push(`<div data-v-ui-3f69e94afb94 class="item"><div data-v-ui-3f69e94afb94><strong data-v-ui-3f69e94afb94>${ssrInterpolate(item.productName)}</strong><small data-v-ui-3f69e94afb94>${ssrInterpolate(item.variantName)} · ${ssrInterpolate(item.quantity)} шт.</small></div><span data-v-ui-3f69e94afb94>${ssrInterpolate(Number(item.total || 0).toLocaleString("ru-RU"))} ₽</span></div>`);
				});
				_push(`<!--]-->`);
				if (!unref(selected).items?.length) _push(`<p data-v-ui-3f69e94afb94 class="muted">Состав не указан</p>`);
				else _push(`<!---->`);
				_push(`</section><section data-v-ui-3f69e94afb94 class="detail-section"><h3 data-v-ui-3f69e94afb94>`);
				_push(ssrRenderComponent(unref(Phone), {
					"data-v-ui-3f69e94afb94": "",
					size: 16
				}, null, _parent));
				_push(` Клиент</h3><div data-v-ui-3f69e94afb94 class="client"><strong data-v-ui-3f69e94afb94>${ssrInterpolate([unref(selected).user?.firstName, unref(selected).user?.lastName].filter(Boolean).join(" ") || "Гость")}</strong><span data-v-ui-3f69e94afb94>${ssrInterpolate(unref(selected).user?.email || "Email не указан")}</span><span data-v-ui-3f69e94afb94>${ssrInterpolate(unref(selected).user?.phone || "Телефон не указан")}</span></div></section><section data-v-ui-3f69e94afb94 class="detail-section"><h3 data-v-ui-3f69e94afb94>`);
				_push(ssrRenderComponent(unref(MapPin), {
					"data-v-ui-3f69e94afb94": "",
					size: 16
				}, null, _parent));
				_push(` Доставка</h3><p data-v-ui-3f69e94afb94 class="address">${ssrInterpolate(unref(address))}</p>`);
				if (unref(selected).shippingProvider || unref(selected).trackingNumber) {
					_push(`<p data-v-ui-3f69e94afb94 class="delivery-meta">${ssrInterpolate(unref(selected).shippingProvider || "Служба доставки")} `);
					if (unref(selected).trackingNumber) _push(`<b data-v-ui-3f69e94afb94>· ${ssrInterpolate(unref(selected).trackingNumber)}</b>`);
					else _push(`<!---->`);
					_push(`</p>`);
				} else _push(`<!---->`);
				_push(`</section><section data-v-ui-3f69e94afb94 class="detail-section history"><h3 data-v-ui-3f69e94afb94>История статусов</h3><!--[-->`);
				ssrRenderList(unref(selected).history, (entry) => {
					_push(`<div data-v-ui-3f69e94afb94 class="history-row"><i data-v-ui-3f69e94afb94></i><div data-v-ui-3f69e94afb94><strong data-v-ui-3f69e94afb94>${ssrInterpolate(statuses[entry.toStatus] || entry.toStatus)}</strong><small data-v-ui-3f69e94afb94>${ssrInterpolate(new Date(entry.createdAt).toLocaleString("ru-RU"))}`);
					if (entry.comment) _push(`<!--[--> · ${ssrInterpolate(entry.comment)}<!--]-->`);
					else _push(`<!---->`);
					_push(`</small></div></div>`);
				});
				_push(`<!--]-->`);
				if (!unref(selected).history?.length) _push(`<p data-v-ui-3f69e94afb94 class="muted">История пока пуста</p>`);
				else _push(`<!---->`);
				_push(`</section></div>`);
				if (unref(actionError)) _push(`<p data-v-ui-3f69e94afb94 class="studio-order-action-error" role="alert">${ssrInterpolate(unref(actionError))}</p>`);
				else _push(`<!---->`);
				if (unref(nextStatuses).length) {
					_push(`<footer data-v-ui-3f69e94afb94 class="studio-order-actions"><label data-v-ui-3f69e94afb94>Следующий этап<select class="crm-input" data-v-ui-3f69e94afb94${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""}><option data-v-ui-3f69e94afb94 value=""${ssrIncludeBooleanAttr(Array.isArray(unref(statusDraft)) ? ssrLooseContain(unref(statusDraft), "") : ssrLooseEqual(unref(statusDraft), "")) ? " selected" : ""}>Выберите действие</option><!--[-->`);
					ssrRenderList(unref(nextStatuses), (status) => {
						_push(`<option data-v-ui-3f69e94afb94${ssrRenderAttr("value", status)}${ssrIncludeBooleanAttr(Array.isArray(unref(statusDraft)) ? ssrLooseContain(unref(statusDraft), status) : ssrLooseEqual(unref(statusDraft), status)) ? " selected" : ""}>${ssrInterpolate(statuses[status])}</option>`);
					});
					_push(`<!--]--></select></label><button data-v-ui-3f69e94afb94 type="button" class="studio-order-save crm-button"${ssrIncludeBooleanAttr(unref(saving) || !unref(statusDraft)) ? " disabled" : ""}>${ssrInterpolate(unref(saving) ? "Сохраняем…" : "Изменить статус")}</button></footer>`);
				} else _push(`<!---->`);
				_push(`</section></aside>`);
			} else _push(`<!---->`);
		};
	}
});
// components/AdminOrderDrawer.vue
var _sfc_setup$1 = AdminOrderDrawer_vue_vue_type_script_setup_true_lang_default.setup;
AdminOrderDrawer_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/AdminOrderDrawer.vue");
	return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
var AdminOrderDrawer_default = Object.assign(AdminOrderDrawer_vue_vue_type_script_setup_true_lang_default, { __name: "AdminOrderDrawer" });
// components/workspace/StoreWorkspacePage.vue?vue&type=script&setup=true&lang.ts
var listLimit = 24;
var StoreWorkspacePage_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "StoreWorkspacePage",
	__ssrInlineRender: true,
	props: { pageSection: {} },
	setup(__props) {
		const config = useRuntimeConfig();
		const route = useRoute();
		const props = __props;
		const { token, user } = useWorkspaceSession();
		const productEditor = useState("admin-product-editor", () => null);
		const selected = useState("admin-order-selected", () => null);
		const notice = ref("");
		const search = ref(typeof route.query.q === "string" ? route.query.q : "");
		const statusFilter = ref(typeof route.query.status === "string" && [
			"NEW",
			"CONFIRMED",
			"PAYMENT_WAITING",
			"PAID",
			"ASSEMBLING",
			"SHIPPED",
			"DELIVERED",
			"CANCELLED",
			"REFUNDED"
		].includes(route.query.status) ? route.query.status : "");
		const catalogSettingsEditor = ref(null);
		const dashboardDays = ref(30);
		const productCategory = ref(""), productVisibility = ref(""), productAvailability = ref(""), productSort = ref("updated"), selectedProductIds = ref([]), bulkSaving = ref(false);
		const productAccess = useWorkspaceAccess();
		const canManageWebOrders = computed(() => productAccess.ready.value && WEB_ORDER_OPERATOR_ROLES.includes(user.value?.role || "") && productAccess.can("web_orders.write"));
		const savingOrder = ref(false);
		const canEditCatalog = computed(() => [
			"ADMIN",
			"CONTENT_MANAGER",
			"MANAGER_SALES",
			"SUPERVISOR"
		].includes(user.value?.role || "") && productAccess.can("catalog.write"));
		const allProductsSelected = computed(() => filteredProducts.value.length > 0 && filteredProducts.value.every((p) => selectedProductIds.value.includes(p.id)));
		const { openContextMenu, copyText } = useContextMenu();
		const siteSections = [
			"loyalty-settings",
			"loyalty-members",
			"dashboard",
			"appearance",
			"site-content",
			"catalog-menu",
			"pages",
			"orders",
			"products",
			"categories",
			"product-badges",
			"customers",
			"loyalty",
			"promotions",
			"gift-cards"
		];
		const initialSection = String(props.pageSection || route.query.section || "dashboard");
		const active = ref(siteSections.includes(initialSection) ? initialSection : "dashboard");
		watch(() => props.pageSection || route.query.section, (v) => {
			active.value = typeof v === "string" && siteSections.includes(v) ? v : "dashboard";
		}, { immediate: true });
		const dashboard = ref(null);
		const products = ref([]);
		const failedProductImages = ref({});
		function productPreview(product) {
			const url = storefrontProductImage(product);
			return url && failedProductImages.value[product.id] !== url ? url : null;
		}
		const orders = ref([]);
		const customers = ref([]);
		const categories = ref([]);
		const storefrontSettings = reactive({ announcementText: "SARKISIAN BRAND – это официальный интернет-магазин скоростного мастера-блогера Светланы Саркисян" });
		const storefrontBanners = ref([]);
		const storefrontSocialLinks = ref([]);
		const storefrontMenuItems = ref([]);
		const appearanceTabs = [
			{
				id: "banners",
				label: "Баннеры"
			},
			{
				id: "menu",
				label: "Меню сайта"
			},
			{
				id: "social",
				label: "Социальные сети"
			},
			{
				id: "announcement",
				label: "Верхняя строка"
			}
		];
		const appearanceTab = ref("banners");
		watch(() => route.query.tab, (tab) => {
			if (typeof tab === "string" && appearanceTabs.some((item) => item.id === tab)) appearanceTab.value = tab;
		}, { immediate: true });
		const appearanceRevision = ref("");
		const appearanceBaseline = ref("");
		const bannerEditor = ref(null);
		const bannerEditorBaseline = ref("");
		const bannerEditorError = ref("");
		const bannerEditorDirty = computed(() => Boolean(bannerEditor.value && JSON.stringify(bannerEditor.value) !== bannerEditorBaseline.value));
		useCatalogDialog(computed(() => Boolean(bannerEditor.value)), closeBannerEditor);
		const loyaltyBaseline = ref("");
		function appearanceSnapshot() {
			return JSON.stringify({
				settings: storefrontSettings,
				banners: storefrontBanners.value,
				menu: storefrontMenuItems.value,
				social: storefrontSocialLinks.value
			});
		}
		const appearanceDirty = computed(() => bannerEditorDirty.value || Boolean(appearanceBaseline.value && appearanceSnapshot() !== appearanceBaseline.value));
		const loyaltyDirty = computed(() => Boolean(loyaltyBaseline.value && JSON.stringify(loyaltySettings) !== loyaltyBaseline.value));
		onBeforeRouteLeave(() => {
			if (savingPrice.value) return false;
			if (priceEditing.value && !confirm("Есть несохранённые цены. Перейти без сохранения?")) return false;
			if (savingAppearance.value) {
				notice.value = "Дождитесь завершения сохранения.";
				return false;
			}
			if (bulkSaving.value) {
				notice.value = "Дождитесь завершения обновления товаров.";
				return false;
			}
			if (active.value === "appearance" && appearanceDirty.value || ["loyalty", "loyalty-settings"].includes(active.value) && loyaltyDirty.value) return confirm("Есть несохранённые изменения. Перейти без сохранения?");
		});
		onBeforeRouteUpdate((to, from) => {
			if (savingAppearance.value) return false;
			if (to.query.section !== from.query.section && (active.value === "appearance" && appearanceDirty.value || ["loyalty", "loyalty-settings"].includes(active.value) && loyaltyDirty.value)) return confirm("Есть несохранённые изменения. Перейти без сохранения?");
		});
		const loyaltyDashboard = ref(null);
		const loyaltySearch = ref("");
		const loyaltyAccountEditor = ref(null);
		const loyaltyAdjustment = reactive({
			type: "ACCRUAL",
			amount: 100,
			reason: ""
		});
		const loyaltySettings = reactive({
			programName: "SARKISIAN CLUB",
			isEnabled: true,
			earnPercent: 1,
			maxWriteOffPercent: 30,
			signupBonus: 0,
			birthdayBonus: 0,
			bonusValidityDays: 365,
			proThreshold: 3e3,
			premiumThreshold: 1e4,
			proMultiplierPercent: 120,
			premiumMultiplierPercent: 150
		});
		const savingLoyalty = ref(false);
		function closeLoyaltyAccount() {
			if (!savingLoyalty.value && (!loyaltyAdjustment.reason.trim() || (void 0).confirm("Закрыть без проведения бонусной операции?"))) loyaltyAccountEditor.value = null;
		}
		useCatalogDialog(computed(() => Boolean(loyaltyAccountEditor.value)), closeLoyaltyAccount);
		const savingAppearance = ref(false);
		const uploadingMedia = ref(false);
		const busy = ref(false);
		const loadError = ref("");
		const pageLoaded = ref(false);
		const listPage = ref(1);
		const listTotal = ref(0);
		let loadGeneration = 0;
		let loadController;
		const productSaved = useState("admin-product-saved", () => null);
		const orderSaved = useState("admin-order-saved", () => null);
		watch(orderSaved, (saved) => {
			if (saved?.id && active.value === "orders") load();
		});
		watch(productSaved, (saved) => {
			if (!saved?.id || !saved.product) return;
			const index = products.value.findIndex((product) => product.id === saved.id);
			if (index >= 0) products.value[index] = saved.product;
		});
		ref(false);
		const priceEditor = ref(null);
		const savingPrice = ref(false);
		const priceEditing = computed(() => Boolean(priceEditor.value));
		watch(token, () => {
			priceEditor.value = null;
		});
		const canConfigureLoyalty = computed(() => ["ADMIN", "SUPERVISOR"].includes(user.value?.role || "") && productAccess.can("loyalty.write"));
		computed(() => [
			"ADMIN",
			"SUPERVISOR",
			"MANAGER_SALES"
		].includes(user.value?.role || "") && productAccess.can("loyalty.write"));
		const menu = [
			{
				id: "dashboard",
				label: "Обзор магазина"
			},
			{
				id: "appearance",
				label: "Витрина"
			},
			{
				id: "site-content",
				label: "Контент сайта"
			},
			{
				id: "catalog-menu",
				label: "Меню каталога"
			},
			{
				id: "pages",
				label: "Страницы"
			},
			{
				id: "orders",
				label: "Заказы"
			},
			{
				id: "products",
				label: "Товары"
			},
			{
				id: "categories",
				label: "Категории"
			},
			{
				id: "product-badges",
				label: "Бейджи товаров"
			},
			{
				id: "customers",
				label: "Клиенты"
			},
			{
				id: "loyalty-settings",
				label: "Настройки программы"
			},
			{
				id: "loyalty-members",
				label: "Участники"
			},
			{
				id: "promotions",
				label: "Промокоды"
			},
			{
				id: "gift-cards",
				label: "Подарочные карты"
			}
		];
		const orderStatuses = [
			{
				id: "NEW",
				label: "Новый"
			},
			{
				id: "CONFIRMED",
				label: "Подтверждён"
			},
			{
				id: "PAYMENT_WAITING",
				label: "Ожидает оплаты"
			},
			{
				id: "PAID",
				label: "Оплачен"
			},
			{
				id: "ASSEMBLING",
				label: "Сборка"
			},
			{
				id: "SHIPPED",
				label: "Отправлен"
			},
			{
				id: "DELIVERED",
				label: "Доставлен"
			},
			{
				id: "CANCELLED",
				label: "Отменён"
			},
			{
				id: "REFUNDED",
				label: "Возврат"
			}
		];
		function routeOrderStatus() {
			return typeof route.query.status === "string" && orderStatuses.some((item) => item.id === route.query.status) ? route.query.status : "";
		}
		watch(() => route.query.status, () => {
			if (active.value === "orders") statusFilter.value = routeOrderStatus();
		}, { immediate: true });
		watch(() => route.query.q, (q) => {
			if (active.value === "orders") search.value = typeof q === "string" ? q : "";
		}, { immediate: true });
		const filteredProducts = computed(() => products.value.filter((p) => !search.value || `${p.nameRu} ${p.sku}`.toLowerCase().includes(search.value.toLowerCase())));
		const filteredOrders = computed(() => orders.value.filter((o) => (!statusFilter.value || o.status === statusFilter.value) && (!search.value || `${o.orderNumber} ${o.user?.email || ""}`.toLowerCase().includes(search.value.toLowerCase()))));
		const filteredLoyaltyAccounts = computed(() => {
			const query = loyaltySearch.value.trim().toLowerCase();
			const accounts = loyaltyDashboard.value?.accounts || [];
			if (!query) return accounts;
			return accounts.filter((account) => `${account.firstName || ""} ${account.lastName || ""} ${account.email || ""} ${account.phone || ""}`.toLowerCase().includes(query));
		});
		const loyaltyLevelLabels = {
			START: "Старт",
			PRO: "Профессионал",
			PREMIUM: "Премиум"
		};
		const loyaltyLevelLabel = (level) => loyaltyLevelLabels[level] || level;
		computed(() => orders.value.filter((order) => !order.isSynced1C && !order.oneCSyncError).length);
		computed(() => orders.value.filter((order) => order.oneCSyncError).length);
		async function load() {
			if (savingAppearance.value) return;
			if (active.value === "appearance" && pageLoaded.value && appearanceDirty.value && !confirm("Обновить список и потерять несохранённые изменения?")) return;
			bannerEditor.value = null;
			loadController?.abort();
			const generation = ++loadGeneration;
			const section = active.value;
			if (!token.value) return;
			if ([
				"catalog-menu",
				"pages",
				"promotions",
				"gift-cards",
				"site-content",
				"categories",
				"product-badges"
			].includes(section)) {
				pageLoaded.value = true;
				busy.value = false;
				loadError.value = "";
				return;
			}
			const controller = loadController = new AbortController();
			busy.value = true;
			loadError.value = "";
			const headers = { Authorization: `Bearer ${token.value}` };
			const options = {
				baseURL: config.public.apiBase,
				headers,
				signal: controller.signal,
				timeout: 2e4
			};
			try {
				if (section === "dashboard") {
					const result = await $fetch$1("/admin/dashboard", {
						...options,
						query: { days: dashboardDays.value }
					});
					if (generation !== loadGeneration) return;
					dashboard.value = result;
				} else if (section === "products" || section === "orders") {
					const result = await $fetch$1(`/admin/${section}/list`, {
						...options,
						query: {
							q: search.value.trim() || void 0,
							page: listPage.value,
							limit: listLimit,
							...section === "products" ? {
								categoryId: productCategory.value || void 0,
								visibility: productVisibility.value || void 0,
								availability: productAvailability.value || void 0,
								sort: productSort.value
							} : {},
							...section === "orders" && statusFilter.value ? { status: statusFilter.value } : {}
						}
					});
					if (section === "products" && !categories.value.length) try {
						const categoryData = await $fetch$1("/admin/catalog/categories", options);
						if (generation === loadGeneration) categories.value = categoryData.items || [];
					} catch (error) {
						if (!controller.signal.aborted) notice.value = "Не удалось загрузить фильтр категорий. Остальные фильтры доступны.";
					}
					if (generation !== loadGeneration) return;
					if (!Array.isArray(result?.items) || !Number.isFinite(result.total)) throw new Error("Некорректный ответ списка");
					if (section === "products") products.value = result.items;
					else {
						orders.value = result.items;
						if (selected.value) selected.value = result.items.find((order) => order.id === selected.value.id) || selected.value;
					}
					listTotal.value = result.total;
				} else if (section === "customers") {
					const result = await $fetch$1("/crm/customers", options);
					if (generation !== loadGeneration) return;
					customers.value = result;
				} else if (section === "appearance") {
					const storefront = await $fetch$1("/admin/storefront", options);
					if (generation !== loadGeneration) return;
					storefrontSettings.announcementText = storefront.settings?.announcementText ?? storefrontSettings.announcementText;
					appearanceRevision.value = storefront.revision || "";
					storefrontBanners.value = (storefront.banners || []).map((banner) => ({
						...banner,
						startsAt: bannerLocalDate(banner.startsAt),
						endsAt: bannerLocalDate(banner.endsAt)
					}));
					storefrontSocialLinks.value = storefront.socialLinks || [];
					storefrontMenuItems.value = storefront.menuItems || [];
					categories.value = storefront.categories || [];
					appearanceBaseline.value = appearanceSnapshot();
				} else if ([
					"loyalty",
					"loyalty-settings",
					"loyalty-members"
				].includes(section)) {
					const loyalty = await $fetch$1("/loyalty/admin/overview", options);
					if (generation !== loadGeneration) return;
					loyaltyDashboard.value = loyalty;
					Object.assign(loyaltySettings, loyalty.settings);
					loyaltyBaseline.value = JSON.stringify(loyaltySettings);
				}
				pageLoaded.value = true;
			} catch (error) {
				if (generation === loadGeneration && !controller.signal.aborted) loadError.value = error?.statusCode === 403 || error?.response?.status === 403 ? "Нет доступа к этому разделу. Выберите доступный пункт меню." : error?.data?.message || error?.message || "Не удалось загрузить раздел. Попробуйте ещё раз.";
			} finally {
				if (generation === loadGeneration) busy.value = false;
			}
		}
		function closeBannerEditor() {
			if (savingAppearance.value) return false;
			if (bannerEditorDirty.value && !(void 0).confirm("Закрыть настройки без применения изменений в черновик?")) return false;
			bannerEditor.value = null;
			bannerEditorError.value = "";
			return true;
		}
		function bannerDisplayStatus(banner) {
			if (!banner.isActive) return "Скрыт";
			if (banner.startsAt && new Date(banner.startsAt).getTime() > Date.now()) return "Запланирован";
			if (banner.endsAt && new Date(banner.endsAt).getTime() <= Date.now()) return "Завершён";
			return "Активен";
		}
		function bannerLocalDate(value) {
			if (!value) return "";
			const date = new Date(value);
			return Number.isNaN(date.getTime()) ? "" : (/* @__PURE__ */ new Date(date.getTime() - date.getTimezoneOffset() * 6e4)).toISOString().slice(0, 16);
		}
		function storefrontPreview(url) {
			if (!url) return "";
			return url.startsWith("/api/") ? new URL(url, config.public.apiBase).toString() : url;
		}
		async function updateOrder(order, status) {
			if (savingOrder.value || !token.value || !canManageWebOrders.value || !webOrderNextStatuses(order).includes(status)) return;
			const actorToken = token.value;
			savingOrder.value = true;
			try {
				const result = await $fetch$1(`/admin/orders/${encodeURIComponent(order.orderNumber)}/status`, {
					baseURL: config.public.apiBase,
					method: "PATCH",
					headers: { Authorization: `Bearer ${actorToken}` },
					body: { status },
					timeout: 35e3
				});
				if (token.value !== actorToken) return;
				if (!result || result.id !== order.id || result.status !== status) throw new Error("Invalid response");
				Object.assign(order, result);
				orderSaved.value = {
					id: order.id,
					order: result
				};
				notice.value = "Статус обновлён и передаётся в 1С";
			} catch (error) {
				if (token.value !== actorToken) return;
				const message = error?.data?.message;
				notice.value = Array.isArray(message) ? message.join(" · ") : typeof message === "string" ? message : "Не удалось подтвердить изменение. Обновите заказ перед повторной попыткой: сервер уже мог принять запрос.";
			} finally {
				savingOrder.value = false;
			}
		}
		function orderMenu(event, order) {
			const actions = canManageWebOrders.value && !savingOrder.value ? webOrderNextStatuses(order) : [];
			openContextMenu(event, order.orderNumber, [
				{
					label: "Открыть карточку",
					icon: "open",
					action: () => selected.value = order
				},
				{
					label: "Копировать номер",
					icon: "copy",
					action: () => copyText(order.orderNumber, "Номер заказа скопирован")
				},
				...actions.map((status, index) => ({
					label: `Статус: ${orderStatuses.find((item) => item.id === status)?.label || status}`,
					icon: "status",
					separator: index === 0,
					danger: status === "CANCELLED",
					confirm: status === "CANCELLED" ? "Отменить неоплаченный заказ? Доступность отмены и снятие резервов проверит сервер." : void 0,
					action: () => updateOrder(order, status)
				}))
			], order.user?.email || "Гость");
		}
		watch(active, () => {
			if (searchTimer) clearTimeout(searchTimer);
			pageLoaded.value = false;
			listPage.value = 1;
			search.value = active.value === "orders" && typeof route.query.q === "string" ? route.query.q : "";
			statusFilter.value = active.value === "orders" ? routeOrderStatus() : "";
			load();
		});
		let searchTimer;
		watch([search, statusFilter], () => {
			if (!["products", "orders"].includes(active.value)) return;
			if (searchTimer) clearTimeout(searchTimer);
			searchTimer = setTimeout(() => {
				listPage.value = 1;
				load();
			}, 250);
		});
		watch([
			productCategory,
			productVisibility,
			productAvailability,
			productSort
		], () => {
			if (active.value === "products") {
				selectedProductIds.value = [];
				listPage.value = 1;
				load();
			}
		});
		watch([listPage, search], () => {
			selectedProductIds.value = [];
		});
		watch(token, () => {
			pageLoaded.value = false;
			products.value = [];
			orders.value = [];
			customers.value = [];
			categories.value = [];
			productEditor.value = null;
			selected.value = null;
			load();
		});
		return (_ctx, _push, _parent, _attrs) => {
			const _component_WorkspaceLoading = WorkspaceLoading_default;
			const _component_StoreDashboard = StoreDashboard_default;
			const _component_SitePagesEditor = SitePagesEditor_default;
			const _component_SiteContentEditor = SiteContentEditor_default;
			const _component_SiteCatalogMenuEditor = SiteCatalogMenuEditor_default;
			const _component_SiteCategoriesEditor = SiteCategoriesEditor_default;
			const _component_SiteProductBadgesEditor = SiteProductBadgesEditor_default;
			const _component_SitePromoCodesEditor = SitePromoCodesEditor_default;
			const _component_SiteGiftCardsEditor = SiteGiftCardsEditor_default;
			const _component_AdminMediaPicker = AdminMediaPicker_default;
			const _component_WorkspaceOrdersTable = WorkspaceOrdersTable_default;
			const _component_AdminOrderDrawer = AdminOrderDrawer_default;
			_push(`<!--[--><main data-v-ui-642ff821094a class="site-admin-console crm-standard crm-management-workspace">`);
			if (!unref(pageLoaded) && !unref(loadError)) _push(ssrRenderComponent(_component_WorkspaceLoading, { label: "Загружаем раздел" }, null, _parent));
			else if (!unref(pageLoaded) && unref(loadError)) _push(`<section data-v-ui-642ff821094a class="panel admin-load-error crm-surface" role="alert"><h1 data-v-ui-642ff821094a>${ssrInterpolate(unref(crmDestination)(unref(route).path)?.label || menu.find((m) => m.id === unref(active))?.label || "Управление платформой")}</h1><p data-v-ui-642ff821094a>${ssrInterpolate(unref(loadError))}</p><button class="crm-button" data-v-ui-642ff821094a type="button"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}>Повторить загрузку</button></section>`);
			else {
				_push(`<!--[-->`);
				if (unref(active) !== "site-content") {
					_push(`<header data-v-ui-642ff821094a class="${ssrRenderClass([{
						"has-new-product": unref(active) === "products",
						"has-store-overview": unref(active) === "dashboard"
					}, "site-admin-header crm-page-header"])}"><div data-v-ui-642ff821094a class="site-admin-heading"><p data-v-ui-642ff821094a class="kicker"> SARKISIAN / ${ssrInterpolate(menu.find((m) => m.id === unref(active))?.label)}</p><h1 data-v-ui-642ff821094a>${ssrInterpolate(unref(crmDestination)(unref(route).path)?.label || menu.find((m) => m.id === unref(active))?.label)}</h1></div>`);
					if (unref(active) !== "catalog-menu" && !(unref(route).path.startsWith("/crm/") && unref(active) === "promotions")) {
						_push(`<div data-v-ui-642ff821094a class="header-actions">`);
						if (unref(active) === "dashboard") _push(`<select class="crm-input" aria-label="Период обзора"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}><option${ssrRenderAttr("value", 7)}${ssrIncludeBooleanAttr(Array.isArray(unref(dashboardDays)) ? ssrLooseContain(unref(dashboardDays), 7) : ssrLooseEqual(unref(dashboardDays), 7)) ? " selected" : ""}>За 7 дней</option><option${ssrRenderAttr("value", 30)}${ssrIncludeBooleanAttr(Array.isArray(unref(dashboardDays)) ? ssrLooseContain(unref(dashboardDays), 30) : ssrLooseEqual(unref(dashboardDays), 30)) ? " selected" : ""}>За 30 дней</option></select>`);
						else _push(`<!---->`);
						_push(`<button class="crm-button crm-button--refresh" data-v-ui-642ff821094a${ssrIncludeBooleanAttr(unref(busy) || unref(savingAppearance) || unref(priceEditing) || unref(catalogSettingsEditor)?.busy) ? " disabled" : ""}>`);
						_push(ssrRenderComponent(unref(RefreshCw), {
							"data-v-ui-642ff821094a": "",
							size: 16,
							class: { spin: unref(busy) }
						}, null, _parent));
						_push(` Обновить </button>`);
						if (["categories", "product-badges"].includes(unref(active))) {
							_push(`<button type="button" class="cs-primary crm-button"${ssrIncludeBooleanAttr(!unref(catalogSettingsEditor)?.canAdd) ? " disabled" : ""}>`);
							_push(ssrRenderComponent(unref(Plus), { size: 16 }, null, _parent));
							_push(`${ssrInterpolate(unref(active) === "categories" ? "Добавить категорию" : "Добавить бейдж")}</button>`);
						} else _push(`<!---->`);
						if (unref(active) === "appearance") {
							_push(`<button data-v-ui-642ff821094a type="button" class="appearance-save appearance-save-all crm-button"${ssrIncludeBooleanAttr(unref(savingAppearance) || unref(uploadingMedia) || !unref(appearanceDirty)) ? " disabled" : ""}>`);
							_push(ssrRenderComponent(unref(Save), {
								"data-v-ui-642ff821094a": "",
								size: 16
							}, null, _parent));
							_push(` ${ssrInterpolate(unref(savingAppearance) ? "Сохраняем…" : "Сохранить изменения")}</button>`);
						} else _push(`<!---->`);
						_push(`</div>`);
					} else _push(`<!---->`);
					_push(`</header>`);
				} else _push(`<!---->`);
				_push(`<div data-v-ui-642ff821094a class="admin-body crm-page-content">`);
				if (unref(pageLoaded) && unref(loadError)) _push(`<p data-v-ui-642ff821094a class="panel crm-surface" role="alert">${ssrInterpolate(unref(loadError))}</p>`);
				else _push(`<!---->`);
				if (unref(active) === "dashboard" && unref(dashboard)) _push(ssrRenderComponent(_component_StoreDashboard, {
					data: unref(dashboard),
					busy: unref(busy)
				}, null, _parent));
				else if (unref(active) === "pages") _push(ssrRenderComponent(_component_SitePagesEditor, null, null, _parent));
				else if (unref(active) === "site-content") _push(ssrRenderComponent(_component_SiteContentEditor, {
					"api-base": String(unref(config).public.apiBase),
					token: unref(token)
				}, null, _parent));
				else if (unref(active) === "catalog-menu") _push(ssrRenderComponent(_component_SiteCatalogMenuEditor, {
					"api-base": String(unref(config).public.apiBase),
					token: unref(token)
				}, null, _parent));
				else if (unref(active) === "categories") _push(ssrRenderComponent(_component_SiteCategoriesEditor, {
					ref_key: "catalogSettingsEditor",
					ref: catalogSettingsEditor
				}, null, _parent));
				else if (unref(active) === "product-badges") _push(ssrRenderComponent(_component_SiteProductBadgesEditor, {
					ref_key: "catalogSettingsEditor",
					ref: catalogSettingsEditor
				}, null, _parent));
				else if (unref(active) === "promotions") _push(ssrRenderComponent(_component_SitePromoCodesEditor, {
					compact: unref(route).path.startsWith("/crm/"),
					"api-base": String(unref(config).public.apiBase),
					token: unref(token)
				}, null, _parent));
				else if (unref(active) === "gift-cards") _push(ssrRenderComponent(_component_SiteGiftCardsEditor, {
					ref_key: "catalogSettingsEditor",
					ref: catalogSettingsEditor,
					"api-base": String(unref(config).public.apiBase),
					token: unref(token),
					role: unref(user)?.role
				}, null, _parent));
				else if (unref(active) === "appearance") {
					_push(`<section data-v-ui-642ff821094a class="appearance-workspace"><nav data-v-ui-642ff821094a class="appearance-tabs" aria-label="Настройки оформления"><!--[-->`);
					ssrRenderList(appearanceTabs, (tab) => {
						_push(`<button class="crm-button" data-v-ui-642ff821094a type="button"${ssrRenderAttr("aria-pressed", unref(appearanceTab) === tab.id)}>${ssrInterpolate(tab.label)}</button>`);
					});
					_push(`<!--]--></nav><p data-v-ui-642ff821094a class="appearance-guidance">Перетаскивайте элементы за ручку слева. Все разделы сохраняются одной кнопкой «Сохранить изменения».</p><fieldset data-v-ui-642ff821094a class="ui-fieldset-reset"${ssrIncludeBooleanAttr(unref(savingAppearance)) ? " disabled" : ""}>`);
					if (unref(appearanceTab) === "announcement") _push(`<article data-v-ui-642ff821094a class="panel appearance-panel crm-surface"><div data-v-ui-642ff821094a class="panel-head"><div data-v-ui-642ff821094a><p data-v-ui-642ff821094a class="kicker">ВЕРХНЯЯ СТРОКА</p><h2 data-v-ui-642ff821094a>Информационное сообщение</h2><span data-v-ui-642ff821094a>Текст отображается над основной шапкой сайта</span></div></div><div data-v-ui-642ff821094a class="appearance-form"><label data-v-ui-642ff821094a>Текст верхней строки<textarea class="crm-input" data-v-ui-642ff821094a maxlength="280" rows="3">${ssrInterpolate(unref(storefrontSettings).announcementText)}</textarea><small data-v-ui-642ff821094a>${ssrInterpolate(unref(storefrontSettings).announcementText.length)} / 280</small></label></div></article>`);
					else _push(`<!---->`);
					if (unref(appearanceTab) === "menu") {
						_push(`<article data-v-ui-642ff821094a class="panel appearance-panel menu-settings-panel crm-surface"><div data-v-ui-642ff821094a class="panel-head appearance-panel-head"><div data-v-ui-642ff821094a><p data-v-ui-642ff821094a class="kicker">НАВИГАЦИЯ</p><h2 data-v-ui-642ff821094a>Меню сайта</h2><span data-v-ui-642ff821094a>Пункты отображаются в центре шапки на ПК и в мобильном меню. Страницы: /about, /delivery, /contacts, /club. Их содержимое редактируется в разделе «Страницы».</span></div><button data-v-ui-642ff821094a class="appearance-add crm-button">`);
						_push(ssrRenderComponent(unref(Plus), {
							"data-v-ui-642ff821094a": "",
							size: 16
						}, null, _parent));
						_push(` Добавить пункт</button></div><div data-v-ui-642ff821094a class="menu-admin-list"><!--[-->`);
						ssrRenderList(unref(storefrontMenuItems), (item, index) => {
							_push(`<section data-v-ui-642ff821094a class="menu-admin-row"><div data-v-ui-642ff821094a class="appearance-order-tools"><button class="crm-button crm-button--icon" data-v-ui-642ff821094a type="button"${ssrIncludeBooleanAttr(unref(savingAppearance)) ? " disabled" : ""}${ssrRenderAttr("draggable", !unref(savingAppearance))} aria-label="Перетащить пункт меню">`);
							_push(ssrRenderComponent(unref(GripVertical), {
								"data-v-ui-642ff821094a": "",
								size: 18
							}, null, _parent));
							_push(`</button></div><label data-v-ui-642ff821094a>Название<input class="crm-input" data-v-ui-642ff821094a${ssrRenderAttr("value", item.label)} maxlength="60" placeholder="О бренде"></label><label data-v-ui-642ff821094a>Ссылка<input class="crm-input" data-v-ui-642ff821094a${ssrRenderAttr("value", item.url)} maxlength="500" placeholder="/#about или /страница"></label><label data-v-ui-642ff821094a class="banner-active crm-toggle-row"><input class="crm-check" data-v-ui-642ff821094a${ssrIncludeBooleanAttr(Array.isArray(item.isActive) ? ssrLooseContain(item.isActive, null) : item.isActive) ? " checked" : ""} type="checkbox"> Показывать</label><label data-v-ui-642ff821094a class="banner-active crm-toggle-row"><input class="crm-check" data-v-ui-642ff821094a${ssrIncludeBooleanAttr(Array.isArray(item.newTab) ? ssrLooseContain(item.newTab, null) : item.newTab) ? " checked" : ""} type="checkbox"> В новой вкладке</label><div data-v-ui-642ff821094a class="menu-admin-actions"><button data-v-ui-642ff821094a class="danger crm-button crm-button--danger crm-button--icon"${ssrIncludeBooleanAttr(unref(savingAppearance)) ? " disabled" : ""} aria-label="Удалить пункт меню">`);
							_push(ssrRenderComponent(unref(Trash2), {
								"data-v-ui-642ff821094a": "",
								size: 16
							}, null, _parent));
							_push(`</button></div></section>`);
						});
						_push(`<!--]-->`);
						if (!unref(storefrontMenuItems).length) _push(`<div data-v-ui-642ff821094a class="appearance-empty"><span data-v-ui-642ff821094a>Меню пока пустое — добавьте ссылки на страницы сайта.</span></div>`);
						else _push(`<!---->`);
						_push(`</div></article>`);
					} else _push(`<!---->`);
					if (unref(appearanceTab) === "banners") {
						_push(`<article data-v-ui-642ff821094a class="panel appearance-panel crm-surface"><div data-v-ui-642ff821094a class="panel-head appearance-panel-head"><div data-v-ui-642ff821094a><p data-v-ui-642ff821094a class="kicker">ГЛАВНЫЙ ЭКРАН</p><h2 data-v-ui-642ff821094a>Баннеры</h2><span data-v-ui-642ff821094a>Можно создать несколько баннеров — на сайте они сменяются автоматически</span></div><button data-v-ui-642ff821094a class="appearance-add crm-button">`);
						_push(ssrRenderComponent(unref(Plus), {
							"data-v-ui-642ff821094a": "",
							size: 16
						}, null, _parent));
						_push(` Новый баннер</button></div><div data-v-ui-642ff821094a class="banner-admin-list"><!--[-->`);
						ssrRenderList(unref(storefrontBanners), (banner, index) => {
							_push(`<section data-v-ui-642ff821094a${ssrRenderAttr("data-banner-id", banner.id)} class="banner-admin-card"><div data-v-ui-642ff821094a class="appearance-order-tools"><button class="crm-button crm-button--icon" data-v-ui-642ff821094a type="button"${ssrIncludeBooleanAttr(unref(savingAppearance)) ? " disabled" : ""}${ssrRenderAttr("draggable", !unref(savingAppearance))} aria-label="Перетащить баннер" title="Перетащить; с клавиатуры Alt + ↑ / ↓">`);
							_push(ssrRenderComponent(unref(GripVertical), {
								"data-v-ui-642ff821094a": "",
								size: 18
							}, null, _parent));
							_push(`</button></div><div data-v-ui-642ff821094a class="${ssrRenderClass([{ empty: !banner.imageUrl }, "banner-admin-preview"])}">`);
							if (banner.imageUrl) _push(`<img data-v-ui-642ff821094a${ssrRenderAttr("src", storefrontPreview(banner.imageUrl))} alt="Предпросмотр баннера">`);
							else _push(ssrRenderComponent(unref(ImagePlus), {
								"data-v-ui-642ff821094a": "",
								size: 30
							}, null, _parent));
							_push(`</div><div data-v-ui-642ff821094a class="banner-admin-summary"><strong data-v-ui-642ff821094a>${ssrInterpolate(banner.title || `Баннер ${index + 1}`)}</strong><small data-v-ui-642ff821094a>${ssrInterpolate(banner.linkUrl || "Без перехода")}</small><span data-v-ui-642ff821094a class="studio-status">${ssrInterpolate(bannerDisplayStatus(banner))}</span></div><div data-v-ui-642ff821094a class="banner-admin-actions"><button class="crm-button" data-v-ui-642ff821094a type="button"${ssrIncludeBooleanAttr(unref(savingAppearance)) ? " disabled" : ""}${ssrRenderAttr("aria-label", "Настройки баннера " + (index + 1))}>`);
							_push(ssrRenderComponent(unref(Pencil), {
								"data-v-ui-642ff821094a": "",
								size: 16
							}, null, _parent));
							_push(`<span data-v-ui-642ff821094a>Настройки</span></button><button data-v-ui-642ff821094a type="button" class="danger crm-button crm-button--danger"${ssrIncludeBooleanAttr(unref(savingAppearance)) ? " disabled" : ""}${ssrRenderAttr("aria-label", "Удалить баннер " + (index + 1))}>`);
							_push(ssrRenderComponent(unref(Trash2), {
								"data-v-ui-642ff821094a": "",
								size: 16
							}, null, _parent));
							_push(`</button></div></section>`);
						});
						_push(`<!--]-->`);
						if (!unref(storefrontBanners).length) {
							_push(`<div data-v-ui-642ff821094a class="appearance-empty">`);
							_push(ssrRenderComponent(unref(ImagePlus), {
								"data-v-ui-642ff821094a": "",
								size: 28
							}, null, _parent));
							_push(`<span data-v-ui-642ff821094a>Баннеров пока нет</span><button class="crm-button" data-v-ui-642ff821094a>Создать первый баннер</button></div>`);
						} else _push(`<!---->`);
						_push(`</div>`);
						ssrRenderTeleport(_push, (_push) => {
							if (unref(bannerEditor)) {
								_push(`<div data-v-ui-642ff821094a class="banner-editor-backdrop admin-dialog-backdrop crm-management-backdrop"><form data-v-ui-642ff821094a class="banner-editor-drawer admin-dialog admin-dialog--drawer crm-management-dialog" role="dialog" aria-modal="true" aria-labelledby="banner-editor-title"${ssrRenderAttr("aria-busy", unref(savingAppearance))} tabindex="-1"><header data-v-ui-642ff821094a><div data-v-ui-642ff821094a><p data-v-ui-642ff821094a class="eyebrow">Сайт / Баннеры</p><h2 data-v-ui-642ff821094a id="banner-editor-title">${ssrInterpolate(unref(bannerEditor)._new ? "Новый баннер" : "Настройки баннера")}</h2><p data-v-ui-642ff821094a class="editor-subtitle">${ssrInterpolate(unref(bannerEditorDirty) ? "Есть несохранённые изменения" : "Главный экран сайта")}</p></div><button class="crm-button crm-button--icon" data-v-ui-642ff821094a type="button"${ssrIncludeBooleanAttr(unref(savingAppearance)) ? " disabled" : ""} aria-label="Закрыть настройки баннера">`);
								_push(ssrRenderComponent(unref(X), {
									"data-v-ui-642ff821094a": "",
									size: 20
								}, null, _parent));
								_push(`</button></header><div data-v-ui-642ff821094a class="admin-dialog-body"><fieldset data-v-ui-642ff821094a class="banner-admin-fields"${ssrIncludeBooleanAttr(unref(savingAppearance)) ? " disabled" : ""}><section data-v-ui-642ff821094a class="cs-category-section" aria-labelledby="banner-image-heading"><h3 data-v-ui-642ff821094a id="banner-image-heading">Изображение</h3>`);
								if (unref(bannerEditor).imageUrl) _push(`<div data-v-ui-642ff821094a class="banner-editor-preview"><img data-v-ui-642ff821094a${ssrRenderAttr("src", storefrontPreview(unref(bannerEditor).imageUrl))} alt="Предпросмотр баннера"></div>`);
								else _push(`<!---->`);
								_push(ssrRenderComponent(_component_AdminMediaPicker, {
									modelValue: unref(bannerEditor).imageUrl,
									"onUpdate:modelValue": ($event) => unref(bannerEditor).imageUrl = $event,
									disabled: unref(savingAppearance),
									"show-preview": false,
									label: "Изображение баннера"
								}, null, _parent));
								_push(`<label data-v-ui-642ff821094a>Описание изображения<input class="crm-input" data-v-ui-642ff821094a${ssrRenderAttr("value", unref(bannerEditor).title)} placeholder="Для доступности, не выводится поверх фото"></label><label data-v-ui-642ff821094a>Внутреннее описание<textarea class="crm-input" data-v-ui-642ff821094a rows="2" placeholder="Не выводится поверх баннера">${ssrInterpolate(unref(bannerEditor).subtitle)}</textarea></label></section><section data-v-ui-642ff821094a class="cs-category-section" aria-labelledby="banner-link-heading"><h3 data-v-ui-642ff821094a id="banner-link-heading">Переход и расписание</h3><div data-v-ui-642ff821094a class="banner-editor-grid"><label data-v-ui-642ff821094a>Описание перехода<input class="crm-input" data-v-ui-642ff821094a${ssrRenderAttr("value", unref(bannerEditor).buttonLabel)}></label><label data-v-ui-642ff821094a>Ссылка<input class="crm-input" data-v-ui-642ff821094a${ssrRenderAttr("value", unref(bannerEditor).linkUrl)} placeholder="/catalog"></label><label data-v-ui-642ff821094a>Начало показа<input class="crm-input" data-v-ui-642ff821094a${ssrRenderAttr("value", unref(bannerEditor).startsAt)} type="datetime-local"></label><label data-v-ui-642ff821094a>Окончание показа<input class="crm-input" data-v-ui-642ff821094a${ssrRenderAttr("value", unref(bannerEditor).endsAt)} type="datetime-local"></label></div><label data-v-ui-642ff821094a class="banner-active crm-toggle-row"><input class="crm-check" data-v-ui-642ff821094a${ssrIncludeBooleanAttr(Array.isArray(unref(bannerEditor).isActive) ? ssrLooseContain(unref(bannerEditor).isActive, null) : unref(bannerEditor).isActive) ? " checked" : ""} type="checkbox"> Показывать на сайте</label></section><section data-v-ui-642ff821094a class="cs-category-section" aria-labelledby="banner-mobile-heading"><h3 data-v-ui-642ff821094a id="banner-mobile-heading">Изображение для телефона</h3><small data-v-ui-642ff821094a>Необязательно. Без него используется основное изображение.</small>`);
								_push(ssrRenderComponent(_component_AdminMediaPicker, {
									modelValue: unref(bannerEditor).mobileImageUrl,
									"onUpdate:modelValue": ($event) => unref(bannerEditor).mobileImageUrl = $event,
									disabled: unref(savingAppearance),
									label: "Мобильное изображение"
								}, null, _parent));
								_push(`</section></fieldset>`);
								if (unref(bannerEditorError)) _push(`<p data-v-ui-642ff821094a class="cs-error" role="alert">${ssrInterpolate(unref(bannerEditorError))}</p>`);
								else _push(`<!---->`);
								_push(`</div><footer data-v-ui-642ff821094a><button class="crm-button" data-v-ui-642ff821094a type="button"${ssrIncludeBooleanAttr(unref(savingAppearance)) ? " disabled" : ""}>Отмена</button><button data-v-ui-642ff821094a type="button" class="primary crm-button crm-button--primary"${ssrIncludeBooleanAttr(unref(savingAppearance) || unref(uploadingMedia)) ? " disabled" : ""}>Готово</button></footer></form></div>`);
							} else _push(`<!---->`);
						}, "body", false, _parent);
						_push(`</article>`);
					} else _push(`<!---->`);
					if (unref(appearanceTab) === "social") {
						_push(`<article data-v-ui-642ff821094a class="panel appearance-panel crm-surface"><div data-v-ui-642ff821094a class="panel-head appearance-panel-head"><div data-v-ui-642ff821094a><p data-v-ui-642ff821094a class="kicker">ПОДВАЛ САЙТА</p><h2 data-v-ui-642ff821094a>Социальные сети</h2><span data-v-ui-642ff821094a>Добавляйте ссылки, меняйте порядок и скрывайте временно неиспользуемые каналы</span></div><button data-v-ui-642ff821094a class="appearance-add crm-button">`);
						_push(ssrRenderComponent(unref(Plus), {
							"data-v-ui-642ff821094a": "",
							size: 16
						}, null, _parent));
						_push(` Добавить соцсеть</button></div><div data-v-ui-642ff821094a class="social-admin-list"><!--[-->`);
						ssrRenderList(unref(storefrontSocialLinks), (social, index) => {
							_push(`<section data-v-ui-642ff821094a class="social-admin-row"><div data-v-ui-642ff821094a class="appearance-order-tools"><button class="crm-button crm-button--icon" data-v-ui-642ff821094a type="button"${ssrIncludeBooleanAttr(unref(savingAppearance)) ? " disabled" : ""}${ssrRenderAttr("draggable", !unref(savingAppearance))} aria-label="Перетащить социальную сеть">`);
							_push(ssrRenderComponent(unref(GripVertical), {
								"data-v-ui-642ff821094a": "",
								size: 18
							}, null, _parent));
							_push(`</button></div><div data-v-ui-642ff821094a class="social-admin-icon">`);
							if ([
								"vk",
								"telegram",
								"max"
							].includes(social.iconKey)) _push(`<img data-v-ui-642ff821094a${ssrRenderAttr("src", `/storefront/icons/${social.iconKey}.svg`)} alt="">`);
							else _push(`<span data-v-ui-642ff821094a>↗</span>`);
							_push(`</div><label data-v-ui-642ff821094a>Название<input class="crm-input" data-v-ui-642ff821094a${ssrRenderAttr("value", social.name)} placeholder="Например, ВКонтакте"></label><label data-v-ui-642ff821094a>Иконка<select class="crm-input" data-v-ui-642ff821094a><option data-v-ui-642ff821094a value="vk"${ssrIncludeBooleanAttr(Array.isArray(social.iconKey) ? ssrLooseContain(social.iconKey, "vk") : ssrLooseEqual(social.iconKey, "vk")) ? " selected" : ""}>ВКонтакте</option><option data-v-ui-642ff821094a value="telegram"${ssrIncludeBooleanAttr(Array.isArray(social.iconKey) ? ssrLooseContain(social.iconKey, "telegram") : ssrLooseEqual(social.iconKey, "telegram")) ? " selected" : ""}>Telegram</option><option data-v-ui-642ff821094a value="max"${ssrIncludeBooleanAttr(Array.isArray(social.iconKey) ? ssrLooseContain(social.iconKey, "max") : ssrLooseEqual(social.iconKey, "max")) ? " selected" : ""}>MAX</option><option data-v-ui-642ff821094a value="link"${ssrIncludeBooleanAttr(Array.isArray(social.iconKey) ? ssrLooseContain(social.iconKey, "link") : ssrLooseEqual(social.iconKey, "link")) ? " selected" : ""}>Другая ссылка</option></select></label><label data-v-ui-642ff821094a class="social-url">Ссылка<input class="crm-input" data-v-ui-642ff821094a${ssrRenderAttr("value", social.url)} placeholder="https://..."></label><label data-v-ui-642ff821094a class="banner-active crm-toggle-row"><input class="crm-check" data-v-ui-642ff821094a${ssrIncludeBooleanAttr(Array.isArray(social.isActive) ? ssrLooseContain(social.isActive, null) : social.isActive) ? " checked" : ""} type="checkbox"> Показывать</label><div data-v-ui-642ff821094a class="social-admin-actions"><button data-v-ui-642ff821094a class="danger crm-button crm-button--danger" type="button"${ssrRenderAttr("aria-label", "Удалить социальную ссылку: " + (social.name || social.url))}>`);
							_push(ssrRenderComponent(unref(Trash2), {
								"data-v-ui-642ff821094a": "",
								size: 15
							}, null, _parent));
							_push(`</button></div></section>`);
						});
						_push(`<!--]-->`);
						if (!unref(storefrontSocialLinks).length) {
							_push(`<div data-v-ui-642ff821094a class="appearance-empty"><span data-v-ui-642ff821094a>Социальные сети пока не добавлены</span><button class="crm-button" data-v-ui-642ff821094a>`);
							_push(ssrRenderComponent(unref(Plus), {
								"data-v-ui-642ff821094a": "",
								size: 15
							}, null, _parent));
							_push(` Добавить первую</button></div>`);
						} else _push(`<!---->`);
						_push(`</div></article>`);
					} else _push(`<!---->`);
					_push(`</fieldset><p data-v-ui-642ff821094a class="appearance-draft-status" role="status">${ssrInterpolate(unref(appearanceDirty) ? "Есть несохранённые изменения во вкладках витрины." : "Все изменения сохранены.")}</p></section>`);
				} else if ([
					"loyalty",
					"loyalty-settings",
					"loyalty-members"
				].includes(unref(active))) {
					_push(`<section data-v-ui-642ff821094a class="loyalty-workspace">`);
					if (unref(loyaltyDashboard)) {
						_push(`<!--[-->`);
						if (unref(active) === "loyalty-members") {
							_push(`<div data-v-ui-642ff821094a class="loyalty-kpis"><article class="crm-surface" data-v-ui-642ff821094a><i class="crm-icon-tile" data-v-ui-642ff821094a>`);
							_push(ssrRenderComponent(unref(Award), {
								"data-v-ui-642ff821094a": "",
								size: 20
							}, null, _parent));
							_push(`</i><span data-v-ui-642ff821094a>Участники</span><strong data-v-ui-642ff821094a>${ssrInterpolate(unref(loyaltyDashboard).summary.participants)}</strong><small data-v-ui-642ff821094a>зарегистрированных клиентов</small></article><article class="crm-surface" data-v-ui-642ff821094a><i class="crm-icon-tile" data-v-ui-642ff821094a>`);
							_push(ssrRenderComponent(unref(Coins), {
								"data-v-ui-642ff821094a": "",
								size: 20
							}, null, _parent));
							_push(`</i><span data-v-ui-642ff821094a>На балансах</span><strong data-v-ui-642ff821094a>${ssrInterpolate(Number(unref(loyaltyDashboard).summary.activeBalances).toLocaleString("ru-RU"))}</strong><small data-v-ui-642ff821094a>доступных бонусов</small></article><article class="crm-surface" data-v-ui-642ff821094a><i class="crm-icon-tile" data-v-ui-642ff821094a>`);
							_push(ssrRenderComponent(unref(Plus), {
								"data-v-ui-642ff821094a": "",
								size: 20
							}, null, _parent));
							_push(`</i><span data-v-ui-642ff821094a>Начислено</span><strong data-v-ui-642ff821094a>${ssrInterpolate(Number(unref(loyaltyDashboard).summary.earned).toLocaleString("ru-RU"))}</strong><small data-v-ui-642ff821094a>за всё время</small></article><article class="crm-surface" data-v-ui-642ff821094a><i class="crm-icon-tile" data-v-ui-642ff821094a>`);
							_push(ssrRenderComponent(unref(Gift), {
								"data-v-ui-642ff821094a": "",
								size: 20
							}, null, _parent));
							_push(`</i><span data-v-ui-642ff821094a>Использовано</span><strong data-v-ui-642ff821094a>${ssrInterpolate(Number(unref(loyaltyDashboard).summary.spent).toLocaleString("ru-RU"))}</strong><small data-v-ui-642ff821094a>${ssrInterpolate(unref(loyaltyDashboard).summary.operations)} операций</small></article></div>`);
						} else _push(`<!---->`);
						if (unref(active) !== "loyalty-members") {
							_push(`<article data-v-ui-642ff821094a class="panel loyalty-settings-panel crm-surface"><div data-v-ui-642ff821094a class="loyalty-program-preview"><small data-v-ui-642ff821094a>БОНУСНАЯ ПРОГРАММА</small><h2 data-v-ui-642ff821094a>${ssrInterpolate(unref(loyaltySettings).programName)}</h2><p data-v-ui-642ff821094a>${ssrInterpolate(unref(loyaltySettings).isEnabled ? "Программа работает" : "Начисления приостановлены")}</p><div data-v-ui-642ff821094a><b data-v-ui-642ff821094a>${ssrInterpolate(unref(loyaltySettings).earnPercent)}%</b><span data-v-ui-642ff821094a>базовое начисление<br data-v-ui-642ff821094a>с каждой покупки</span></div><i class="crm-icon-tile" data-v-ui-642ff821094a><span data-v-ui-642ff821094a style="${ssrRenderStyle({ width: `${Math.min(100, unref(loyaltySettings).maxWriteOffPercent)}%` })}"></span></i><footer data-v-ui-642ff821094a><span data-v-ui-642ff821094a>Можно списать</span><strong data-v-ui-642ff821094a>до ${ssrInterpolate(unref(loyaltySettings).maxWriteOffPercent)}%</strong></footer></div><div data-v-ui-642ff821094a class="loyalty-settings-form"><fieldset class="ui-fieldset-reset"${ssrIncludeBooleanAttr(unref(savingLoyalty) || !unref(canConfigureLoyalty)) ? " disabled" : ""}><div data-v-ui-642ff821094a class="panel-head"><div data-v-ui-642ff821094a><p data-v-ui-642ff821094a class="kicker">ПРАВИЛА ПРОГРАММЫ</p><h2 data-v-ui-642ff821094a>Начисления и уровни</h2><span data-v-ui-642ff821094a>Изменения применяются к новым операциям и не пересчитывают историю</span></div><label data-v-ui-642ff821094a class="loyalty-status crm-toggle-row"><input class="crm-check" data-v-ui-642ff821094a${ssrIncludeBooleanAttr(Array.isArray(unref(loyaltySettings).isEnabled) ? ssrLooseContain(unref(loyaltySettings).isEnabled, null) : unref(loyaltySettings).isEnabled) ? " checked" : ""} type="checkbox"><span data-v-ui-642ff821094a>${ssrInterpolate(unref(loyaltySettings).isEnabled ? "Активна" : "Приостановлена")}</span></label></div><div data-v-ui-642ff821094a class="loyalty-form-grid"><label data-v-ui-642ff821094a class="wide">Название программы<input class="crm-input" data-v-ui-642ff821094a${ssrRenderAttr("value", unref(loyaltySettings).programName)} maxlength="80"></label><label data-v-ui-642ff821094a>Начислять с покупки, %<input class="crm-input" data-v-ui-642ff821094a${ssrRenderAttr("value", unref(loyaltySettings).earnPercent)} type="number" min="0" max="100"></label><label data-v-ui-642ff821094a>Максимум списания, %<input class="crm-input" data-v-ui-642ff821094a${ssrRenderAttr("value", unref(loyaltySettings).maxWriteOffPercent)} type="number" min="0" max="100"></label><label data-v-ui-642ff821094a>За регистрацию<input class="crm-input" data-v-ui-642ff821094a${ssrRenderAttr("value", unref(loyaltySettings).signupBonus)} type="number" min="0"></label><label data-v-ui-642ff821094a>На день рождения<input class="crm-input" data-v-ui-642ff821094a${ssrRenderAttr("value", unref(loyaltySettings).birthdayBonus)} type="number" min="0"></label><label data-v-ui-642ff821094a>Срок действия, дней<input class="crm-input" data-v-ui-642ff821094a${ssrRenderAttr("value", unref(loyaltySettings).bonusValidityDays)} type="number" min="1"></label></div><div data-v-ui-642ff821094a class="loyalty-levels"><section class="crm-surface crm-surface--tint" data-v-ui-642ff821094a><span data-v-ui-642ff821094a>СТАРТ</span><b data-v-ui-642ff821094a>Базовые условия</b><small data-v-ui-642ff821094a>Сразу после регистрации</small></section><section class="crm-surface" data-v-ui-642ff821094a><span data-v-ui-642ff821094a>ПРОФЕССИОНАЛ</span><label data-v-ui-642ff821094a>Порог<input class="crm-input" data-v-ui-642ff821094a${ssrRenderAttr("value", unref(loyaltySettings).proThreshold)} type="number" min="0"></label><label data-v-ui-642ff821094a>Множитель, %<input class="crm-input" data-v-ui-642ff821094a${ssrRenderAttr("value", unref(loyaltySettings).proMultiplierPercent)} type="number" min="100"></label></section><section class="crm-surface" data-v-ui-642ff821094a><span data-v-ui-642ff821094a>ПРЕМИУМ</span><label data-v-ui-642ff821094a>Порог<input class="crm-input" data-v-ui-642ff821094a${ssrRenderAttr("value", unref(loyaltySettings).premiumThreshold)} type="number" min="0"></label><label data-v-ui-642ff821094a>Множитель, %<input class="crm-input" data-v-ui-642ff821094a${ssrRenderAttr("value", unref(loyaltySettings).premiumMultiplierPercent)} type="number" min="100"></label></section></div><button data-v-ui-642ff821094a class="loyalty-save crm-button crm-button--primary"${ssrIncludeBooleanAttr(unref(savingLoyalty) || !unref(canConfigureLoyalty)) ? " disabled" : ""}>`);
							_push(ssrRenderComponent(unref(Save), {
								"data-v-ui-642ff821094a": "",
								size: 16
							}, null, _parent));
							_push(` ${ssrInterpolate(unref(savingLoyalty) ? "Сохраняем…" : "Сохранить правила")}</button></fieldset></div></article>`);
						} else _push(`<!---->`);
						if (unref(active) === "loyalty-members") {
							_push(`<article data-v-ui-642ff821094a class="panel loyalty-members-panel crm-surface"><div data-v-ui-642ff821094a class="panel-head"><div data-v-ui-642ff821094a><p data-v-ui-642ff821094a class="kicker">УЧАСТНИКИ</p><h2 data-v-ui-642ff821094a>Бонусные счета клиентов</h2><span data-v-ui-642ff821094a>Открывайте счёт для просмотра истории, начисления или списания</span></div><label data-v-ui-642ff821094a class="search crm-input-group">`);
							_push(ssrRenderComponent(unref(Search), {
								"data-v-ui-642ff821094a": "",
								size: 16
							}, null, _parent));
							_push(`<input class="crm-input" data-v-ui-642ff821094a${ssrRenderAttr("value", unref(loyaltySearch))} placeholder="Имя, email или телефон"></label></div><div data-v-ui-642ff821094a class="loyalty-table"><div data-v-ui-642ff821094a class="loyalty-row head crm-table-head"><span data-v-ui-642ff821094a>Клиент</span><span data-v-ui-642ff821094a>Уровень</span><span data-v-ui-642ff821094a>Баланс</span><span data-v-ui-642ff821094a>Последняя операция</span><span data-v-ui-642ff821094a></span></div><!--[-->`);
							ssrRenderList(unref(filteredLoyaltyAccounts), (account) => {
								_push(`<div data-v-ui-642ff821094a class="loyalty-row crm-table-row"><div data-v-ui-642ff821094a><strong data-v-ui-642ff821094a>${ssrInterpolate([account.firstName, account.lastName].filter(Boolean).join(" ") || "Без имени")}</strong><small data-v-ui-642ff821094a>${ssrInterpolate(account.email)}</small></div><span data-v-ui-642ff821094a class="loyalty-level crm-badge">${ssrInterpolate(loyaltyLevelLabel(account.level))}</span><strong data-v-ui-642ff821094a>${ssrInterpolate(Number(account.balance).toLocaleString("ru-RU"))}</strong><span data-v-ui-642ff821094a>${ssrInterpolate(account.entries[0] ? `${account.entries[0].amount > 0 ? "+" : ""}${account.entries[0].amount} · ${account.entries[0].reason}` : "Операций ещё нет")}</span><button class="crm-button crm-button--icon" data-v-ui-642ff821094a aria-label="Открыть бонусный счёт">`);
								_push(ssrRenderComponent(unref(Eye), {
									"data-v-ui-642ff821094a": "",
									size: 16
								}, null, _parent));
								_push(`</button></div>`);
							});
							_push(`<!--]-->`);
							if (!unref(filteredLoyaltyAccounts).length) _push(`<div data-v-ui-642ff821094a class="appearance-empty">Клиенты не найдены</div>`);
							else _push(`<!---->`);
							_push(`</div></article>`);
						} else _push(`<!---->`);
						_push(`<!--]-->`);
					} else _push(ssrRenderComponent(_component_WorkspaceLoading, { label: "Загружаем бонусную программу" }, null, _parent));
					_push(`</section>`);
				} else if (unref(active) === "products") {
					_push(`<section data-v-ui-642ff821094a class="panel crm-surface"><div data-v-ui-642ff821094a class="filters cs-product-filters crm-toolbar"><label data-v-ui-642ff821094a class="search cs-product-search crm-input-group">`);
					_push(ssrRenderComponent(unref(Search), {
						"data-v-ui-642ff821094a": "",
						size: 16
					}, null, _parent));
					_push(`<input class="crm-input" data-v-ui-642ff821094a${ssrRenderAttr("value", unref(search))} type="search" aria-label="Поиск товаров" placeholder="Название или SKU"${ssrIncludeBooleanAttr(unref(bulkSaving)) ? " disabled" : ""}></label><select class="crm-input" data-v-ui-642ff821094a aria-label="Категория товаров"${ssrIncludeBooleanAttr(unref(busy) || unref(bulkSaving) || unref(priceEditing)) ? " disabled" : ""}><option data-v-ui-642ff821094a value=""${ssrIncludeBooleanAttr(Array.isArray(unref(productCategory)) ? ssrLooseContain(unref(productCategory), "") : ssrLooseEqual(unref(productCategory), "")) ? " selected" : ""}>Все категории</option><!--[-->`);
					ssrRenderList(unref(categories), (category) => {
						_push(`<option data-v-ui-642ff821094a${ssrRenderAttr("value", category.id)}${ssrIncludeBooleanAttr(Array.isArray(unref(productCategory)) ? ssrLooseContain(unref(productCategory), category.id) : ssrLooseEqual(unref(productCategory), category.id)) ? " selected" : ""}>${ssrInterpolate(category.nameRu)}</option>`);
					});
					_push(`<!--]--></select><select class="crm-input" data-v-ui-642ff821094a aria-label="Публикация товаров"${ssrIncludeBooleanAttr(unref(busy) || unref(bulkSaving) || unref(priceEditing)) ? " disabled" : ""}><option data-v-ui-642ff821094a value=""${ssrIncludeBooleanAttr(Array.isArray(unref(productVisibility)) ? ssrLooseContain(unref(productVisibility), "") : ssrLooseEqual(unref(productVisibility), "")) ? " selected" : ""}>Любая публикация</option><option data-v-ui-642ff821094a value="active"${ssrIncludeBooleanAttr(Array.isArray(unref(productVisibility)) ? ssrLooseContain(unref(productVisibility), "active") : ssrLooseEqual(unref(productVisibility), "active")) ? " selected" : ""}>На сайте</option><option data-v-ui-642ff821094a value="hidden"${ssrIncludeBooleanAttr(Array.isArray(unref(productVisibility)) ? ssrLooseContain(unref(productVisibility), "hidden") : ssrLooseEqual(unref(productVisibility), "hidden")) ? " selected" : ""}>Скрытые</option></select><select class="crm-input" data-v-ui-642ff821094a aria-label="Наличие товаров"${ssrIncludeBooleanAttr(unref(busy) || unref(bulkSaving) || unref(priceEditing)) ? " disabled" : ""}><option data-v-ui-642ff821094a value=""${ssrIncludeBooleanAttr(Array.isArray(unref(productAvailability)) ? ssrLooseContain(unref(productAvailability), "") : ssrLooseEqual(unref(productAvailability), "")) ? " selected" : ""}>Любой остаток</option><option data-v-ui-642ff821094a value="stocked"${ssrIncludeBooleanAttr(Array.isArray(unref(productAvailability)) ? ssrLooseContain(unref(productAvailability), "stocked") : ssrLooseEqual(unref(productAvailability), "stocked")) ? " selected" : ""}>В наличии</option><option data-v-ui-642ff821094a value="empty"${ssrIncludeBooleanAttr(Array.isArray(unref(productAvailability)) ? ssrLooseContain(unref(productAvailability), "empty") : ssrLooseEqual(unref(productAvailability), "empty")) ? " selected" : ""}>Нет в наличии</option></select><select class="crm-input" data-v-ui-642ff821094a aria-label="Порядок товаров"${ssrIncludeBooleanAttr(unref(busy) || unref(bulkSaving) || unref(priceEditing)) ? " disabled" : ""}><option data-v-ui-642ff821094a value="updated"${ssrIncludeBooleanAttr(Array.isArray(unref(productSort)) ? ssrLooseContain(unref(productSort), "updated") : ssrLooseEqual(unref(productSort), "updated")) ? " selected" : ""}>По обновлению</option><option data-v-ui-642ff821094a value="name"${ssrIncludeBooleanAttr(Array.isArray(unref(productSort)) ? ssrLooseContain(unref(productSort), "name") : ssrLooseEqual(unref(productSort), "name")) ? " selected" : ""}>По названию</option><option data-v-ui-642ff821094a value="sku"${ssrIncludeBooleanAttr(Array.isArray(unref(productSort)) ? ssrLooseContain(unref(productSort), "sku") : ssrLooseEqual(unref(productSort), "sku")) ? " selected" : ""}>По артикулу</option></select></div>`);
					if (unref(selectedProductIds).length) _push(`<div data-v-ui-642ff821094a class="cs-bulk-bar"><span data-v-ui-642ff821094a>Выбрано: ${ssrInterpolate(unref(selectedProductIds).length)}</span><button class="crm-button" data-v-ui-642ff821094a${ssrIncludeBooleanAttr(unref(busy) || unref(bulkSaving) || !unref(canEditCatalog)) ? " disabled" : ""}>Опубликовать</button><button class="crm-button" data-v-ui-642ff821094a${ssrIncludeBooleanAttr(unref(busy) || unref(bulkSaving) || !unref(canEditCatalog)) ? " disabled" : ""}>Скрыть</button><button class="crm-button" data-v-ui-642ff821094a${ssrIncludeBooleanAttr(unref(bulkSaving)) ? " disabled" : ""}>Снять выбор</button></div>`);
					else _push(`<!---->`);
					_push(`<div data-v-ui-642ff821094a class="table products-table"><div data-v-ui-642ff821094a class="row head crm-table-head"><input class="crm-check" data-v-ui-642ff821094a type="checkbox"${ssrIncludeBooleanAttr(unref(allProductsSelected)) ? " checked" : ""}${ssrIncludeBooleanAttr(unref(busy) || unref(bulkSaving) || !unref(canEditCatalog) || !unref(filteredProducts).length) ? " disabled" : ""} aria-label="Выбрать товары на странице"><span data-v-ui-642ff821094a>Товар</span><span data-v-ui-642ff821094a>Цена</span><span data-v-ui-642ff821094a>Акционная цена</span><span data-v-ui-642ff821094a>Остаток</span><span data-v-ui-642ff821094a>Статус</span></div><!--[-->`);
					ssrRenderList(unref(filteredProducts), (p) => {
						_push(`<div data-v-ui-642ff821094a${ssrRenderAttr("data-product-id", p.id)} class="row"><input class="crm-check" data-v-ui-642ff821094a${ssrIncludeBooleanAttr(Array.isArray(unref(selectedProductIds)) ? ssrLooseContain(unref(selectedProductIds), p.id) : unref(selectedProductIds)) ? " checked" : ""} type="checkbox"${ssrRenderAttr("value", p.id)}${ssrIncludeBooleanAttr(unref(busy) || unref(bulkSaving) || !unref(canEditCatalog)) ? " disabled" : ""}${ssrRenderAttr("aria-label", "Выбрать товар " + p.nameRu)}><div data-v-ui-642ff821094a class="cs-product-identity">`);
						if (productPreview(p)) _push(`<img data-v-ui-642ff821094a${ssrRenderAttr("src", productPreview(p))}${ssrRenderAttr("alt", p.nameRu)} loading="lazy">`);
						else {
							_push(`<span data-v-ui-642ff821094a class="${ssrRenderClass([{ "cs-product-thumb--gift": p.productType === "GIFT_CARD" }, "cs-product-thumb"])}"${ssrRenderAttr("aria-label", p.productType === "GIFT_CARD" ? "Подарочная карта" : "Нет фотографии товара")}>`);
							if (p.productType === "GIFT_CARD") _push(ssrRenderComponent(unref(Gift), {
								"data-v-ui-642ff821094a": "",
								size: 20
							}, null, _parent));
							else _push(ssrRenderComponent(unref(ImagePlus), {
								"data-v-ui-642ff821094a": "",
								size: 20
							}, null, _parent));
							_push(`</span>`);
						}
						_push(`<button data-v-ui-642ff821094a type="button" class="product-open crm-button">${ssrInterpolate(p.nameRu)}</button><small data-v-ui-642ff821094a>${ssrInterpolate(p.sku)}</small></div><div class="cs-inline-price">`);
						if (unref(priceEditor)?.id === p.id) _push(`<input${ssrRenderAttr("value", unref(priceEditor).price)} data-price-field="price" class="cs-inline-price-input crm-input" type="text" inputmode="decimal"${ssrRenderAttr("aria-label", "Цена: " + p.nameRu)}${ssrIncludeBooleanAttr(unref(savingPrice)) ? " disabled" : ""}>`);
						else _push(`<!---->`);
						if (unref(priceEditor)?.id === p.id && unref(priceEditor).field === "price") {
							_push(`<div class="cs-inline-price-actions"><button type="button" class="cs-price-save crm-button"${ssrIncludeBooleanAttr(unref(savingPrice)) ? " disabled" : ""}${ssrRenderAttr("aria-label", "Сохранить цены: " + p.nameRu)} title="Сохранить цены">`);
							_push(ssrRenderComponent(unref(Check), { size: 16 }, null, _parent));
							_push(`</button><button type="button" class="cs-price-cancel crm-button crm-button--icon"${ssrIncludeBooleanAttr(unref(savingPrice)) ? " disabled" : ""} aria-label="Отменить изменение цен" title="Отменить изменение цен">`);
							_push(ssrRenderComponent(unref(X), { size: 16 }, null, _parent));
							_push(`</button></div>`);
						} else _push(`<!---->`);
						if (unref(priceEditor)?.id !== p.id) {
							_push(`<button type="button" class="cs-price-value crm-button"${ssrIncludeBooleanAttr(!unref(canEditCatalog) || unref(priceEditing) || p.productType === "GIFT_CARD" || !p.variants?.length) ? " disabled" : ""}${ssrRenderAttr("aria-label", "Изменить цену: " + p.nameRu)}${ssrRenderAttr("title", p.productType === "GIFT_CARD" ? "Номиналы настраиваются в разделе подарочных карт" : "Нажмите, чтобы изменить цену")}>${ssrInterpolate(Number(p.variants?.[0]?.price ?? p.basePrice ?? 0).toLocaleString("ru-RU"))} ₽`);
							if (unref(canEditCatalog) && p.productType !== "GIFT_CARD") _push(ssrRenderComponent(unref(Pencil), { size: 14 }, null, _parent));
							else _push(`<!---->`);
							_push(`</button>`);
						} else _push(`<!---->`);
						_push(`</div><div class="cs-inline-price">`);
						if (unref(priceEditor)?.id === p.id) _push(`<input${ssrRenderAttr("value", unref(priceEditor).salePrice)} data-price-field="salePrice" class="cs-inline-price-input crm-input" type="text" inputmode="decimal" placeholder="Без акции"${ssrRenderAttr("aria-label", "Акционная цена: " + p.nameRu)}${ssrIncludeBooleanAttr(unref(savingPrice)) ? " disabled" : ""}>`);
						else _push(`<!---->`);
						if (unref(priceEditor)?.id === p.id && unref(priceEditor).field === "salePrice") {
							_push(`<div class="cs-inline-price-actions"><button type="button" class="cs-price-save crm-button"${ssrIncludeBooleanAttr(unref(savingPrice)) ? " disabled" : ""}${ssrRenderAttr("aria-label", "Сохранить цены: " + p.nameRu)} title="Сохранить цены">`);
							_push(ssrRenderComponent(unref(Check), { size: 16 }, null, _parent));
							_push(`</button><button type="button" class="cs-price-cancel crm-button crm-button--icon"${ssrIncludeBooleanAttr(unref(savingPrice)) ? " disabled" : ""} aria-label="Отменить изменение цен" title="Отменить изменение цен">`);
							_push(ssrRenderComponent(unref(X), { size: 16 }, null, _parent));
							_push(`</button></div>`);
						} else _push(`<!---->`);
						if (unref(priceEditor)?.id !== p.id) {
							_push(`<button type="button" class="cs-price-value crm-button"${ssrIncludeBooleanAttr(!unref(canEditCatalog) || unref(priceEditing) || p.productType === "GIFT_CARD" || !p.variants?.length) ? " disabled" : ""}${ssrRenderAttr("aria-label", "Изменить акционную цену: " + p.nameRu)}>${ssrInterpolate(p.variants?.[0]?.salePrice != null ? Number(p.variants[0].salePrice).toLocaleString("ru-RU") + " ₽" : "—")}`);
							if (unref(canEditCatalog) && p.productType !== "GIFT_CARD") _push(ssrRenderComponent(unref(Pencil), { size: 14 }, null, _parent));
							else _push(`<!---->`);
							_push(`</button>`);
						} else _push(`<!---->`);
						_push(`</div><span data-v-ui-642ff821094a>${ssrInterpolate(p.variants?.[0]?.stock || 0)}</span><span data-v-ui-642ff821094a class="${ssrRenderClass(p.isActive ? "green" : "red")}">${ssrInterpolate(p.isActive ? "Активен" : "Скрыт")}</span>`);
						if (unref(priceEditor)?.id === p.id && unref(priceEditor).error) _push(`<p class="cs-inline-price-error" role="alert">${ssrInterpolate(unref(priceEditor).error)}</p>`);
						else _push(`<!---->`);
						_push(`</div>`);
					});
					_push(`<!--]-->`);
					if (!unref(filteredProducts).length) _push(`<p data-v-ui-642ff821094a class="empty"> Товары не найдены </p>`);
					else _push(`<!---->`);
					_push(`</div></section>`);
				} else if (unref(active) === "orders") _push(ssrRenderComponent(_component_WorkspaceOrdersTable, {
					items: unref(filteredOrders),
					total: unref(listTotal),
					search: unref(search),
					"onUpdate:search": ($event) => isRef(search) ? search.value = $event : null,
					status: unref(statusFilter),
					"onUpdate:status": ($event) => isRef(statusFilter) ? statusFilter.value = $event : null,
					busy: unref(busy),
					onOpen: ($event) => selected.value = $event,
					onContext: orderMenu
				}, null, _parent));
				else if (unref(active) === "customers") {
					_push(`<section data-v-ui-642ff821094a class="panel crm-surface"><div data-v-ui-642ff821094a class="panel-head"><div data-v-ui-642ff821094a><p data-v-ui-642ff821094a class="kicker">КЛИЕНТСКАЯ БАЗА</p><h2 data-v-ui-642ff821094a>Клиенты</h2><span data-v-ui-642ff821094a>${ssrInterpolate(unref(customers).length)} профилей</span></div></div><div data-v-ui-642ff821094a class="table"><div data-v-ui-642ff821094a class="row head crm-table-head"><span data-v-ui-642ff821094a>Клиент</span><span data-v-ui-642ff821094a>Email</span><span data-v-ui-642ff821094a>Телефон</span><span data-v-ui-642ff821094a>Заказы</span><span data-v-ui-642ff821094a>Регистрация</span></div><!--[-->`);
					ssrRenderList(unref(customers), (c) => {
						_push(`<div data-v-ui-642ff821094a class="row"><div data-v-ui-642ff821094a><strong data-v-ui-642ff821094a>${ssrInterpolate([c.firstName, c.lastName].filter(Boolean).join(" ") || "Без имени")}</strong><small data-v-ui-642ff821094a>${ssrInterpolate(c.role)}</small></div><span data-v-ui-642ff821094a>${ssrInterpolate(c.email)}</span><span data-v-ui-642ff821094a>${ssrInterpolate(c.phone || "—")}</span><span data-v-ui-642ff821094a>${ssrInterpolate(c._count?.orders || 0)}</span><span data-v-ui-642ff821094a>${ssrInterpolate(new Date(c.createdAt).toLocaleDateString("ru-RU"))}</span></div>`);
					});
					_push(`<!--]--></div></section>`);
				} else _push(`<!---->`);
				if (["products", "orders"].includes(unref(active))) _push(`<nav data-v-ui-642ff821094a class="admin-pagination" aria-label="Страницы списка"><span data-v-ui-642ff821094a>Всего: ${ssrInterpolate(unref(listTotal))} · Страница ${ssrInterpolate(unref(listPage))} из ${ssrInterpolate(Math.max(1, Math.ceil(unref(listTotal) / listLimit)))}</span><div data-v-ui-642ff821094a><button class="crm-button" data-v-ui-642ff821094a type="button"${ssrIncludeBooleanAttr(unref(busy) || unref(priceEditing) || unref(listPage) <= 1) ? " disabled" : ""}>Назад</button><button class="crm-button" data-v-ui-642ff821094a type="button"${ssrIncludeBooleanAttr(unref(busy) || unref(priceEditing) || unref(listPage) * listLimit >= unref(listTotal)) ? " disabled" : ""}>Далее</button></div></nav>`);
				else _push(`<!---->`);
				_push(`</div><!--]-->`);
			}
			if (unref(notice)) _push(`<div data-v-ui-642ff821094a class="toast">${ssrInterpolate(unref(notice))}</div>`);
			else _push(`<!---->`);
			_push(`</main>`);
			if (unref(loyaltyAccountEditor)) {
				_push(`<aside data-v-ui-642ff821094a class="drawer-backdrop loyalty-drawer-backdrop admin-dialog-backdrop crm-management-backdrop"><div data-v-ui-642ff821094a tabindex="-1" class="drawer loyalty-drawer admin-dialog admin-dialog--drawer crm-management-dialog" role="dialog" aria-modal="true" aria-label="Бонусный счёт клиента"><header data-v-ui-642ff821094a><div data-v-ui-642ff821094a><p data-v-ui-642ff821094a class="kicker">БОНУСНЫЙ СЧЁТ</p><h2 data-v-ui-642ff821094a>${ssrInterpolate([unref(loyaltyAccountEditor).firstName, unref(loyaltyAccountEditor).lastName].filter(Boolean).join(" ") || "Клиент")}</h2><span data-v-ui-642ff821094a class="loyalty-client-email">${ssrInterpolate(unref(loyaltyAccountEditor).email)}</span></div><button class="crm-button crm-button--icon" data-v-ui-642ff821094a type="button" aria-label="Закрыть бонусный счёт">`);
				_push(ssrRenderComponent(unref(X), {
					"data-v-ui-642ff821094a": "",
					size: 18
				}, null, _parent));
				_push(`</button></header><div data-v-ui-642ff821094a class="admin-dialog-body"><div data-v-ui-642ff821094a class="loyalty-drawer-balance"><small data-v-ui-642ff821094a>Доступно</small><strong data-v-ui-642ff821094a>${ssrInterpolate(Number(unref(loyaltyAccountEditor).balance).toLocaleString("ru-RU"))}</strong><span data-v-ui-642ff821094a>бонусов · ${ssrInterpolate(loyaltyLevelLabel(unref(loyaltyAccountEditor).level))}</span></div><div data-v-ui-642ff821094a class="loyalty-operation-tabs"><button data-v-ui-642ff821094a class="${ssrRenderClass([{ active: unref(loyaltyAdjustment).type === "ACCRUAL" }, "crm-button"])}">Начислить</button><button data-v-ui-642ff821094a class="${ssrRenderClass([{ active: unref(loyaltyAdjustment).type === "WRITE_OFF" }, "crm-button"])}">Списать</button></div><div data-v-ui-642ff821094a class="loyalty-adjustment-form"><label data-v-ui-642ff821094a>Количество бонусов<input class="crm-input" data-v-ui-642ff821094a${ssrRenderAttr("value", unref(loyaltyAdjustment).amount)} type="number" min="1"></label><label data-v-ui-642ff821094a>Причина<textarea class="crm-input" data-v-ui-642ff821094a maxlength="240" rows="3" placeholder="Например, компенсация по обращению">${ssrInterpolate(unref(loyaltyAdjustment).reason)}</textarea></label><button class="crm-button" data-v-ui-642ff821094a${ssrIncludeBooleanAttr(unref(savingLoyalty)) ? " disabled" : ""}>${ssrInterpolate(unref(savingLoyalty) ? "Проводим операцию…" : unref(loyaltyAdjustment).type === "ACCRUAL" ? "Начислить бонусы" : "Списать бонусы")}</button></div><div data-v-ui-642ff821094a class="loyalty-history"><h3 data-v-ui-642ff821094a>Последние операции</h3><!--[-->`);
				ssrRenderList(unref(loyaltyAccountEditor).entries, (entry) => {
					_push(`<article data-v-ui-642ff821094a><div data-v-ui-642ff821094a><b data-v-ui-642ff821094a>${ssrInterpolate(entry.reason)}</b><small data-v-ui-642ff821094a>${ssrInterpolate(new Date(entry.createdAt).toLocaleString("ru-RU"))}</small></div><strong data-v-ui-642ff821094a class="${ssrRenderClass({ minus: entry.amount < 0 })}">${ssrInterpolate(entry.amount > 0 ? "+" : "")}${ssrInterpolate(entry.amount)}</strong></article>`);
				});
				_push(`<!--]-->`);
				if (!unref(loyaltyAccountEditor).entries.length) _push(`<p data-v-ui-642ff821094a>Операций ещё нет</p>`);
				else _push(`<!---->`);
				_push(`</div></div></div></aside>`);
			} else _push(`<!---->`);
			if (unref(active) === "orders" && unref(route).path.startsWith("/crm/")) _push(ssrRenderComponent(_component_AdminOrderDrawer, null, null, _parent));
			else _push(`<!---->`);
			_push(`<!--]-->`);
		};
	}
});
// components/workspace/StoreWorkspacePage.vue
var _sfc_setup = StoreWorkspacePage_vue_vue_type_script_setup_true_lang_default.setup;
StoreWorkspacePage_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/workspace/StoreWorkspacePage.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var StoreWorkspacePage_default = Object.assign(StoreWorkspacePage_vue_vue_type_script_setup_true_lang_default, { __name: "StoreWorkspacePage" });

export { StoreWorkspacePage_default as S };;globalThis.__timing__.logEnd('Load chunks/build/StoreWorkspacePage-DrvHlwmI');
//# sourceMappingURL=StoreWorkspacePage-DrvHlwmI.mjs.map
