globalThis.__timing__.logStart('Load chunks/build/account-BY9D6eF4');import { r as useSeoMeta, S as SiteShell_default, c as useRoute, p as useStorefront, q as useStorefrontPanels, N as NuxtLink, $ as $fetch$1, f as useRuntimeConfig, x as useStorefrontContent, K as useStorefrontMotion } from '../virtual/entry.mjs';
import { defineComponent, mergeProps, withCtx, createVNode, ref, computed, watch, createTextVNode, unref, toDisplayString, resolveDynamicComponent, openBlock, createBlock, createCommentVNode, Fragment, renderList, reactive, withModifiers, withDirectives, vModelText, vModelCheckbox, useSSRContext } from 'vue';
import { ssrRenderComponent, ssrRenderAttrs, ssrInterpolate, ssrRenderList, ssrRenderClass, ssrRenderAttr, ssrRenderVNode, ssrRenderStyle, ssrIncludeBooleanAttr, ssrLooseContain, ssrLooseEqual, ssrRenderTeleport, ssrRenderSlot } from 'vue/server-renderer';
import { UserRound, Package, Gift, Award, Users, MapPin, Settings, Bell, ArrowRight, BookOpen, LogOut, Wallet, RotateCcw, X, Check, Copy, Link2, Plus, Pencil, Trash2, Mail, Smartphone, MessageCircle, Camera } from '@lucide/vue';
import { c as customerWarehouseApplies, a as customerWarehouseLabel, b as customerWarehouseAsOf } from '../_/customer-warehouse-status.mjs';
import 'nostics';
import 'nostics/formatters/ansi';
import '../_/nitro.mjs';
import 'unhead/server';
import 'unhead/legacy';
import 'unhead/plugins';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'node:url';
import '../routes/renderer.mjs';
import 'vue-bundle-renderer/runtime';
import 'devalue';
import 'unhead/utils';
import 'vue-router';

// components/storefront/SiteAccountDrawer.vue?vue&type=script&setup=true&lang.ts
var SiteAccountDrawer_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "SiteAccountDrawer",
	__ssrInlineRender: true,
	props: {
		open: { type: Boolean },
		title: {}
	},
	emits: ["close"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		useStorefrontMotion();
		ref(null);
		watch(() => props.open, async (open) => {});
		return (_ctx, _push, _parent, _attrs) => {
			ssrRenderTeleport(_push, (_push) => {
				if (__props.open) {
					_push(`<div class="sb-glass-layer sd-layer sk-account-layer"><aside class="sb-side-drawer sa-drawer sd-drawer" role="dialog" aria-modal="true"${ssrRenderAttr("aria-label", __props.title)} tabindex="-1"><header class="sb-drawer-head"><h2>${ssrInterpolate(__props.title)}</h2><button class="sa-close" aria-label="Закрыть">`);
					_push(ssrRenderComponent(unref(X), { size: 28 }, null, _parent));
					_push(`</button></header><div class="sa-drawer-body">`);
					ssrRenderSlot(_ctx.$slots, "default", {}, null, _push, _parent);
					_push(`</div></aside></div>`);
				} else _push(`<!---->`);
			}, "body", false, _parent);
		};
	}
});
// components/storefront/SiteAccountDrawer.vue
var _sfc_setup$8 = SiteAccountDrawer_vue_vue_type_script_setup_true_lang_default.setup;
SiteAccountDrawer_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/storefront/SiteAccountDrawer.vue");
	return _sfc_setup$8 ? _sfc_setup$8(props, ctx) : void 0;
};
var SiteAccountDrawer_default = Object.assign(SiteAccountDrawer_vue_vue_type_script_setup_true_lang_default, { __name: "SiteAccountDrawer" });
// components/storefront/SiteAccountOrders.vue?vue&type=script&setup=true&lang.ts
var SiteAccountOrders_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "SiteAccountOrders",
	__ssrInlineRender: true,
	props: {
		orders: {},
		title: {}
	},
	emits: ["updated"],
	setup(__props, { emit: __emit }) {
		const emit = __emit;
		const config = useRuntimeConfig();
		const { authHeaders, cartSession, cart } = useStorefront();
		const { storefrontMediaUrl } = useStorefrontContent();
		const selected = ref(null), detail = ref(null), busy = ref(""), error = ref(""), repeated = ref(false), confirmingCancel = ref(false);
		const unavailable = ref([]);
		const statuses = {
			NEW: "Новый",
			CONFIRMED: "Подтверждён",
			PAYMENT_WAITING: "Ожидает оплаты",
			PAID: "Оплачен",
			ASSEMBLING: "Собирается",
			SHIPPED: "Отправлен",
			DELIVERED: "Доставлен",
			CANCELLED: "Отменён",
			REFUNDED: "Возврат выполнен"
		};
		const status = (value) => statuses[value] || "Статус уточняется";
		const isCourse = (order) => order?.sourceChannel === "COURSE";
		const courseReview = (order) => isCourse(order) && (order.coursePaymentReview === true || order.priceSnapshot?.coursePaymentReview === true || order.paymentStatus === "SUCCEEDED" && order.status !== "DELIVERED");
		const orderStatus = (order) => courseReview(order) ? "Оплата подтверждена · проверяем доступ" : isCourse(order) && order.status === "DELIVERED" ? "Доступ открыт" : status(order.status);
		const money = (value) => `${Number(value || 0).toLocaleString("ru-RU")} ₽`;
		const date = (value) => new Date(value).toLocaleDateString("ru-RU");
		const delivery = computed(() => {
			const address = detail.value?.shippingAddress;
			if (typeof address === "string") return address;
			if (!address || typeof address !== "object") return "";
			return [
				address.city,
				address.street,
				address.house,
				address.apartment ? `кв. ${address.apartment}` : "",
				address.address,
				address.pickupPointAddress
			].filter(Boolean).join(", ");
		});
		const cancellable = computed(() => detail.value && !["SUCCEEDED", "PAID"].includes(detail.value.paymentStatus) && ["NEW", "PAYMENT_WAITING"].includes(detail.value.status));
		const paymentStatuses = {
			PENDING: "Ожидает оплаты",
			WAITING_FOR_CAPTURE: "Ожидает подтверждения",
			SUCCEEDED: "Оплачен",
			FAILED: "Ошибка оплаты",
			CANCELED: "Отменён",
			CANCELLED: "Отменён",
			REFUNDED: "Возвращён"
		};
		const unavailableReasons = {
			OUT_OF_STOCK: "Нет в наличии",
			INACTIVE: "Товар снят с продажи",
			NOT_FOUND: "Товар больше недоступен",
			INSUFFICIENT_STOCK: "Доступно меньше, чем в прежнем заказе"
		};
		const reason = (value) => unavailableReasons[value] || (/[а-яё]/i.test(value) ? value : "Позиция недоступна");
		function requestOptions() {
			return {
				baseURL: config.public.apiBase,
				headers: authHeaders.value
			};
		}
		function message(exception) {
			const text = exception?.data?.message;
			return Array.isArray(text) ? text.join(". ") : typeof text === "string" && !text.startsWith("Cannot ") ? text : "Не удалось выполнить действие. Попробуйте ещё раз.";
		}
		async function loadDetail() {
			if (!selected.value || busy.value) return;
			busy.value = "detail";
			error.value = "";
			try {
				detail.value = await $fetch$1(`/storefront/orders/${encodeURIComponent(selected.value.orderNumber)}`, requestOptions());
			} catch (exception) {
				error.value = message(exception);
			} finally {
				busy.value = "";
			}
		}
		async function repeat() {
			if (busy.value || repeated.value) return;
			busy.value = "repeat";
			error.value = "";
			try {
				const result = await $fetch$1(`/storefront/orders/${encodeURIComponent(selected.value.orderNumber)}/repeat`, {
					...requestOptions(),
					method: "POST",
					headers: {
						...authHeaders.value,
						"x-cart-session": cartSession.value
					}
				});
				cart.value = result.cart;
				unavailable.value = result.unavailable || [];
				repeated.value = Number(result.added) > 0 || Array.isArray(result.added) && result.added.length > 0;
				if (!repeated.value && !unavailable.value.length) error.value = "В заказе нет доступных для повтора товаров.";
			} catch (exception) {
				error.value = message(exception);
			} finally {
				busy.value = "";
			}
		}
		async function cancel() {
			if (busy.value || !cancellable.value) return;
			busy.value = "cancel";
			error.value = "";
			try {
				detail.value = await $fetch$1(`/storefront/orders/${encodeURIComponent(selected.value.orderNumber)}/cancel`, {
					...requestOptions(),
					method: "POST"
				});
				confirmingCancel.value = false;
			} catch (exception) {
				error.value = message(exception);
			} finally {
				busy.value = "";
			}
		}
		function close() {
			if (busy.value) return;
			selected.value = null;
			if (detail.value?.status === "CANCELLED") emit("updated");
		}
		return (_ctx, _push, _parent, _attrs) => {
			const _component_NuxtLink = NuxtLink;
			const _component_SiteAccountDrawer = SiteAccountDrawer_default;
			_push(`<!--[--><section class="sa-panel"><h2>${ssrInterpolate(__props.title)}</h2>`);
			if (__props.orders.length) {
				_push(`<div><!--[-->`);
				ssrRenderList(__props.orders, (order) => {
					_push(`<button class="sa-order"><span><b>${ssrInterpolate(order.orderNumber)}</b><small>${ssrInterpolate(date(order.createdAt))} · ${ssrInterpolate(isCourse(order) ? "Курс" : `${order.items?.length || 0} поз.`)}</small>`);
					if (unref(customerWarehouseApplies)(order)) _push(`<small>Склад: ${ssrInterpolate(unref(customerWarehouseLabel)(order.warehouseStatus))}</small>`);
					else _push(`<!---->`);
					_push(`</span><span class="sa-badge">${ssrInterpolate(orderStatus(order))}</span><strong>${ssrInterpolate(money(order.finalAmount))}</strong>`);
					_push(ssrRenderComponent(unref(ArrowRight), { size: 20 }, null, _parent));
					_push(`</button>`);
				});
				_push(`<!--]--></div>`);
			} else {
				_push(`<div><p>Заказов пока нет. После покупки здесь появится история и состав заказа.</p>`);
				_push(ssrRenderComponent(_component_NuxtLink, {
					class: "sa-button",
					to: "/catalog"
				}, {
					default: withCtx((_, _push, _parent, _scopeId) => {
						if (_push) {
							_push(`Перейти в каталог `);
							_push(ssrRenderComponent(unref(ArrowRight), { size: 20 }, null, _parent, _scopeId));
						} else return [createTextVNode("Перейти в каталог "), createVNode(unref(ArrowRight), { size: 20 })];
					}),
					_: 1
				}, _parent));
				_push(`</div>`);
			}
			if (__props.orders.length >= 30) _push(`<small class="sa-muted">Показаны последние 30 заказов. Более ранние заказы можно уточнить в поддержке.</small>`);
			else _push(`<!---->`);
			_push(`</section>`);
			_push(ssrRenderComponent(_component_SiteAccountDrawer, {
				open: !!unref(selected),
				title: `Заказ ${unref(selected)?.orderNumber || ""}`,
				onClose: close
			}, {
				default: withCtx((_, _push, _parent, _scopeId) => {
					if (_push) {
						if (unref(busy) === "detail") _push(`<p role="status"${_scopeId}>Загружаем заказ…</p>`);
						else _push(`<!---->`);
						if (unref(error)) _push(`<p class="sa-feedback" role="alert"${_scopeId}>${ssrInterpolate(unref(error))}</p>`);
						else _push(`<!---->`);
						if (!unref(detail) && !unref(busy)) {
							_push(`<button class="sa-button"${_scopeId}>Повторить загрузку `);
							_push(ssrRenderComponent(unref(ArrowRight), { size: 20 }, null, _parent, _scopeId));
							_push(`</button>`);
						} else _push(`<!---->`);
						if (unref(detail)) {
							_push(`<!--[--><p${_scopeId}>${ssrInterpolate(date(unref(detail).createdAt))} · ${ssrInterpolate(isCourse(unref(detail)) ? "Курс · " : "")}${ssrInterpolate(orderStatus(unref(detail)))}</p>`);
							if (courseReview(unref(detail))) _push(`<p class="sa-feedback" role="status"${_scopeId}>Оплата подтверждена. Проверяем данные заказа перед открытием доступа; повторная оплата не нужна. Если доступ долго не появляется, обратитесь в поддержку.</p>`);
							else _push(`<!---->`);
							if (unref(customerWarehouseApplies)(unref(detail))) {
								_push(`<section class="sa-feedback sa-order-warehouse" aria-label="Обработка заказа на складе"${_scopeId}><h3${_scopeId}>Обработка на складе</h3><p role="status"${_scopeId}>${ssrInterpolate(unref(customerWarehouseLabel)(unref(detail).warehouseStatus))}</p>`);
								if (unref(customerWarehouseAsOf)(unref(detail).warehouseStatus)) _push(`<small${_scopeId}>Подтверждено ${ssrInterpolate(unref(customerWarehouseAsOf)(unref(detail).warehouseStatus))}</small>`);
								else _push(`<!---->`);
								_push(`</section>`);
							} else _push(`<!---->`);
							_push(`<div class="sa-order-items"${_scopeId}><!--[-->`);
							ssrRenderList(unref(detail).items, (item) => {
								_push(`<article${_scopeId}>`);
								if (item.variant?.product?.images?.[0]?.url) _push(`<img${ssrRenderAttr("src", unref(storefrontMediaUrl)(item.variant.product.images[0].url))} alt=""${_scopeId}>`);
								else _push(`<!---->`);
								_push(`<div${_scopeId}><b${_scopeId}>${ssrInterpolate(item.productName)}</b>`);
								if (item.variantName && item.variantName !== item.productName) _push(`<small${_scopeId}>${ssrInterpolate(item.variantName)}</small>`);
								else _push(`<!---->`);
								_push(`<small${_scopeId}>${ssrInterpolate(item.quantity)} шт. × ${ssrInterpolate(money(item.price))}</small></div><strong${_scopeId}>${ssrInterpolate(money(item.total))}</strong></article>`);
							});
							_push(`<!--]--></div><div class="sa-totals"${_scopeId}><span${_scopeId}>Сумма заказа</span><b${_scopeId}>${ssrInterpolate(money(unref(detail).finalAmount))}</b></div>`);
							if (unref(delivery)) _push(`<!--[--><h3${_scopeId}>Адрес доставки</h3><p${_scopeId}>${ssrInterpolate(unref(delivery))}</p><!--]-->`);
							else _push(`<!---->`);
							if (unref(detail).comments) _push(`<!--[--><h3${_scopeId}>Комментарий к заказу</h3><p${_scopeId}>${ssrInterpolate(unref(detail).comments)}</p><!--]-->`);
							else _push(`<!---->`);
							if (unref(detail).history?.length) {
								_push(`<!--[--><h3${_scopeId}>История заказа</h3><ol class="sa-timeline"${_scopeId}><!--[-->`);
								ssrRenderList(unref(detail).history, (entry) => {
									_push(`<li${_scopeId}><b${_scopeId}>${ssrInterpolate(isCourse(unref(detail)) && entry.toStatus === "DELIVERED" ? "Доступ открыт" : status(entry.toStatus))}</b><small${_scopeId}>${ssrInterpolate(date(entry.createdAt))}</small></li>`);
								});
								_push(`<!--]--></ol><!--]-->`);
							} else _push(`<!---->`);
							if (unref(detail).payments?.length) {
								_push(`<!--[--><h3${_scopeId}>Оплата</h3><!--[-->`);
								ssrRenderList(unref(detail).payments, (payment) => {
									_push(`<article class="sa-history"${_scopeId}><span${_scopeId}>${ssrInterpolate(paymentStatuses[payment.status] || "Статус оплаты уточняется")}</span><b${_scopeId}>${ssrInterpolate(money(payment.amount))}</b></article>`);
								});
								_push(`<!--]--><!--]-->`);
							} else _push(`<!---->`);
							if (!isCourse(unref(detail))) _push(`<p class="sa-muted"${_scopeId}>При повторе товары добавляются в корзину по текущим ценам и наличию. Новый заказ оформляется только после вашей проверки.</p>`);
							else _push(`<!---->`);
							if (unref(repeated)) _push(`<p class="sa-feedback" role="status"${_scopeId}>Доступные товары добавлены в корзину.</p>`);
							else _push(`<!---->`);
							if (unref(unavailable).length) {
								_push(`<ul class="sa-feedback"${_scopeId}><!--[-->`);
								ssrRenderList(unref(unavailable), (item, index) => {
									_push(`<li${_scopeId}>${ssrInterpolate(item.productName)} — ${ssrInterpolate(reason(item.reason))}</li>`);
								});
								_push(`<!--]--></ul>`);
							} else _push(`<!---->`);
							_push(`<div class="sa-actions"${_scopeId}>`);
							if (isCourse(unref(detail))) _push(ssrRenderComponent(_component_NuxtLink, {
								class: "sa-button",
								to: courseReview(unref(detail)) ? `/orders/${unref(detail).orderNumber}` : unref(detail).status === "DELIVERED" ? "/courses/my" : unref(cancellable) ? `/orders/${unref(detail).orderNumber}` : "/courses"
							}, {
								default: withCtx((_, _push, _parent, _scopeId) => {
									if (_push) {
										_push(`${ssrInterpolate(courseReview(unref(detail)) ? "Проверить статус" : unref(detail).status === "DELIVERED" ? "Мои курсы" : unref(cancellable) ? "Перейти к оплате" : "Каталог курсов")} `);
										_push(ssrRenderComponent(unref(ArrowRight), { size: 20 }, null, _parent, _scopeId));
									} else return [createTextVNode(toDisplayString(courseReview(unref(detail)) ? "Проверить статус" : unref(detail).status === "DELIVERED" ? "Мои курсы" : unref(cancellable) ? "Перейти к оплате" : "Каталог курсов") + " ", 1), createVNode(unref(ArrowRight), { size: 20 })];
								}),
								_: 1
							}, _parent, _scopeId));
							else if (!unref(repeated)) {
								_push(`<button class="sa-button"${ssrIncludeBooleanAttr(!!unref(busy)) ? " disabled" : ""}${_scopeId}>${ssrInterpolate(unref(busy) === "repeat" ? "Добавляем…" : "Повторить заказ")}`);
								_push(ssrRenderComponent(unref(RotateCcw), { size: 20 }, null, _parent, _scopeId));
								_push(`</button>`);
							} else _push(ssrRenderComponent(_component_NuxtLink, {
								class: "sa-button",
								to: "/cart"
							}, {
								default: withCtx((_, _push, _parent, _scopeId) => {
									if (_push) {
										_push(`Перейти в корзину `);
										_push(ssrRenderComponent(unref(ArrowRight), { size: 20 }, null, _parent, _scopeId));
									} else return [createTextVNode("Перейти в корзину "), createVNode(unref(ArrowRight), { size: 20 })];
								}),
								_: 1
							}, _parent, _scopeId));
							if (unref(cancellable) && !unref(confirmingCancel)) {
								_push(`<button class="sa-button sa-secondary"${ssrIncludeBooleanAttr(!!unref(busy)) ? " disabled" : ""}${_scopeId}>Отменить заказ `);
								_push(ssrRenderComponent(unref(X), { size: 20 }, null, _parent, _scopeId));
								_push(`</button>`);
							} else _push(`<!---->`);
							_push(`</div>`);
							if (unref(confirmingCancel)) {
								_push(`<section class="sa-feedback"${_scopeId}><h3${_scopeId}>Отменить заказ?</h3><p${_scopeId}>${ssrInterpolate(isCourse(unref(detail)) ? "Заказ курса будет отменён." : "Заказ будет отменён, резерв товаров освободится.")} Это действие нельзя отменить.</p><div class="sa-actions"${_scopeId}><button class="sa-button sa-secondary"${ssrIncludeBooleanAttr(!!unref(busy)) ? " disabled" : ""}${_scopeId}>Оставить заказ</button><button class="sa-button"${ssrIncludeBooleanAttr(!!unref(busy)) ? " disabled" : ""}${_scopeId}>${ssrInterpolate(unref(busy) === "cancel" ? "Отменяем…" : "Подтвердить отмену")}`);
								_push(ssrRenderComponent(unref(X), { size: 20 }, null, _parent, _scopeId));
								_push(`</button></div></section>`);
							} else _push(`<!---->`);
							_push(ssrRenderComponent(_component_NuxtLink, {
								class: "sa-text-button",
								to: "/contacts"
							}, {
								default: withCtx((_, _push, _parent, _scopeId) => {
									if (_push) {
										_push(`Связаться с поддержкой `);
										_push(ssrRenderComponent(unref(ArrowRight), { size: 18 }, null, _parent, _scopeId));
									} else return [createTextVNode("Связаться с поддержкой "), createVNode(unref(ArrowRight), { size: 18 })];
								}),
								_: 1
							}, _parent, _scopeId));
							_push(`<!--]-->`);
						} else _push(`<!---->`);
					} else return [
						unref(busy) === "detail" ? (openBlock(), createBlock("p", {
							key: 0,
							role: "status"
						}, "Загружаем заказ…")) : createCommentVNode("", true),
						unref(error) ? (openBlock(), createBlock("p", {
							key: 1,
							class: "sa-feedback",
							role: "alert"
						}, toDisplayString(unref(error)), 1)) : createCommentVNode("", true),
						!unref(detail) && !unref(busy) ? (openBlock(), createBlock("button", {
							key: 2,
							class: "sa-button",
							onClick: loadDetail
						}, [createTextVNode("Повторить загрузку "), createVNode(unref(ArrowRight), { size: 20 })])) : createCommentVNode("", true),
						unref(detail) ? (openBlock(), createBlock(Fragment, { key: 3 }, [
							createVNode("p", null, toDisplayString(date(unref(detail).createdAt)) + " · " + toDisplayString(isCourse(unref(detail)) ? "Курс · " : "") + toDisplayString(orderStatus(unref(detail))), 1),
							courseReview(unref(detail)) ? (openBlock(), createBlock("p", {
								key: 0,
								class: "sa-feedback",
								role: "status"
							}, "Оплата подтверждена. Проверяем данные заказа перед открытием доступа; повторная оплата не нужна. Если доступ долго не появляется, обратитесь в поддержку.")) : createCommentVNode("", true),
							unref(customerWarehouseApplies)(unref(detail)) ? (openBlock(), createBlock("section", {
								key: 1,
								class: "sa-feedback sa-order-warehouse",
								"aria-label": "Обработка заказа на складе"
							}, [
								createVNode("h3", null, "Обработка на складе"),
								createVNode("p", { role: "status" }, toDisplayString(unref(customerWarehouseLabel)(unref(detail).warehouseStatus)), 1),
								unref(customerWarehouseAsOf)(unref(detail).warehouseStatus) ? (openBlock(), createBlock("small", { key: 0 }, "Подтверждено " + toDisplayString(unref(customerWarehouseAsOf)(unref(detail).warehouseStatus)), 1)) : createCommentVNode("", true)
							])) : createCommentVNode("", true),
							createVNode("div", { class: "sa-order-items" }, [(openBlock(true), createBlock(Fragment, null, renderList(unref(detail).items, (item) => {
								return openBlock(), createBlock("article", { key: item.id }, [
									item.variant?.product?.images?.[0]?.url ? (openBlock(), createBlock("img", {
										key: 0,
										src: unref(storefrontMediaUrl)(item.variant.product.images[0].url),
										alt: ""
									}, null, 8, ["src"])) : createCommentVNode("", true),
									createVNode("div", null, [
										createVNode("b", null, toDisplayString(item.productName), 1),
										item.variantName && item.variantName !== item.productName ? (openBlock(), createBlock("small", { key: 0 }, toDisplayString(item.variantName), 1)) : createCommentVNode("", true),
										createVNode("small", null, toDisplayString(item.quantity) + " шт. × " + toDisplayString(money(item.price)), 1)
									]),
									createVNode("strong", null, toDisplayString(money(item.total)), 1)
								]);
							}), 128))]),
							createVNode("div", { class: "sa-totals" }, [createVNode("span", null, "Сумма заказа"), createVNode("b", null, toDisplayString(money(unref(detail).finalAmount)), 1)]),
							unref(delivery) ? (openBlock(), createBlock(Fragment, { key: 2 }, [createVNode("h3", null, "Адрес доставки"), createVNode("p", null, toDisplayString(unref(delivery)), 1)], 64)) : createCommentVNode("", true),
							unref(detail).comments ? (openBlock(), createBlock(Fragment, { key: 3 }, [createVNode("h3", null, "Комментарий к заказу"), createVNode("p", null, toDisplayString(unref(detail).comments), 1)], 64)) : createCommentVNode("", true),
							unref(detail).history?.length ? (openBlock(), createBlock(Fragment, { key: 4 }, [createVNode("h3", null, "История заказа"), createVNode("ol", { class: "sa-timeline" }, [(openBlock(true), createBlock(Fragment, null, renderList(unref(detail).history, (entry) => {
								return openBlock(), createBlock("li", { key: entry.id }, [createVNode("b", null, toDisplayString(isCourse(unref(detail)) && entry.toStatus === "DELIVERED" ? "Доступ открыт" : status(entry.toStatus)), 1), createVNode("small", null, toDisplayString(date(entry.createdAt)), 1)]);
							}), 128))])], 64)) : createCommentVNode("", true),
							unref(detail).payments?.length ? (openBlock(), createBlock(Fragment, { key: 5 }, [createVNode("h3", null, "Оплата"), (openBlock(true), createBlock(Fragment, null, renderList(unref(detail).payments, (payment) => {
								return openBlock(), createBlock("article", {
									key: payment.id,
									class: "sa-history"
								}, [createVNode("span", null, toDisplayString(paymentStatuses[payment.status] || "Статус оплаты уточняется"), 1), createVNode("b", null, toDisplayString(money(payment.amount)), 1)]);
							}), 128))], 64)) : createCommentVNode("", true),
							!isCourse(unref(detail)) ? (openBlock(), createBlock("p", {
								key: 6,
								class: "sa-muted"
							}, "При повторе товары добавляются в корзину по текущим ценам и наличию. Новый заказ оформляется только после вашей проверки.")) : createCommentVNode("", true),
							unref(repeated) ? (openBlock(), createBlock("p", {
								key: 7,
								class: "sa-feedback",
								role: "status"
							}, "Доступные товары добавлены в корзину.")) : createCommentVNode("", true),
							unref(unavailable).length ? (openBlock(), createBlock("ul", {
								key: 8,
								class: "sa-feedback"
							}, [(openBlock(true), createBlock(Fragment, null, renderList(unref(unavailable), (item, index) => {
								return openBlock(), createBlock("li", { key: index }, toDisplayString(item.productName) + " — " + toDisplayString(reason(item.reason)), 1);
							}), 128))])) : createCommentVNode("", true),
							createVNode("div", { class: "sa-actions" }, [isCourse(unref(detail)) ? (openBlock(), createBlock(_component_NuxtLink, {
								key: 0,
								class: "sa-button",
								to: courseReview(unref(detail)) ? `/orders/${unref(detail).orderNumber}` : unref(detail).status === "DELIVERED" ? "/courses/my" : unref(cancellable) ? `/orders/${unref(detail).orderNumber}` : "/courses"
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(courseReview(unref(detail)) ? "Проверить статус" : unref(detail).status === "DELIVERED" ? "Мои курсы" : unref(cancellable) ? "Перейти к оплате" : "Каталог курсов") + " ", 1), createVNode(unref(ArrowRight), { size: 20 })]),
								_: 1
							}, 8, ["to"])) : !unref(repeated) ? (openBlock(), createBlock("button", {
								key: 1,
								class: "sa-button",
								disabled: !!unref(busy),
								onClick: repeat
							}, [createTextVNode(toDisplayString(unref(busy) === "repeat" ? "Добавляем…" : "Повторить заказ"), 1), createVNode(unref(RotateCcw), { size: 20 })], 8, ["disabled"])) : (openBlock(), createBlock(_component_NuxtLink, {
								key: 2,
								class: "sa-button",
								to: "/cart"
							}, {
								default: withCtx(() => [createTextVNode("Перейти в корзину "), createVNode(unref(ArrowRight), { size: 20 })]),
								_: 1
							})), unref(cancellable) && !unref(confirmingCancel) ? (openBlock(), createBlock("button", {
								key: 3,
								class: "sa-button sa-secondary",
								disabled: !!unref(busy),
								onClick: ($event) => confirmingCancel.value = true
							}, [createTextVNode("Отменить заказ "), createVNode(unref(X), { size: 20 })], 8, ["disabled", "onClick"])) : createCommentVNode("", true)]),
							unref(confirmingCancel) ? (openBlock(), createBlock("section", {
								key: 9,
								class: "sa-feedback"
							}, [
								createVNode("h3", null, "Отменить заказ?"),
								createVNode("p", null, toDisplayString(isCourse(unref(detail)) ? "Заказ курса будет отменён." : "Заказ будет отменён, резерв товаров освободится.") + " Это действие нельзя отменить.", 1),
								createVNode("div", { class: "sa-actions" }, [createVNode("button", {
									class: "sa-button sa-secondary",
									disabled: !!unref(busy),
									onClick: ($event) => confirmingCancel.value = false
								}, "Оставить заказ", 8, ["disabled", "onClick"]), createVNode("button", {
									class: "sa-button",
									disabled: !!unref(busy),
									onClick: cancel
								}, [createTextVNode(toDisplayString(unref(busy) === "cancel" ? "Отменяем…" : "Подтвердить отмену"), 1), createVNode(unref(X), { size: 20 })], 8, ["disabled"])])
							])) : createCommentVNode("", true),
							createVNode(_component_NuxtLink, {
								class: "sa-text-button",
								to: "/contacts"
							}, {
								default: withCtx(() => [createTextVNode("Связаться с поддержкой "), createVNode(unref(ArrowRight), { size: 18 })]),
								_: 1
							})
						], 64)) : createCommentVNode("", true)
					];
				}),
				_: 1
			}, _parent));
			_push(`<!--]-->`);
		};
	}
});
// components/storefront/SiteAccountOrders.vue
var _sfc_setup$7 = SiteAccountOrders_vue_vue_type_script_setup_true_lang_default.setup;
SiteAccountOrders_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/storefront/SiteAccountOrders.vue");
	return _sfc_setup$7 ? _sfc_setup$7(props, ctx) : void 0;
};
var SiteAccountOrders_default = Object.assign(SiteAccountOrders_vue_vue_type_script_setup_true_lang_default, { __name: "SiteAccountOrders" });
// components/storefront/SiteAccountGiftCards.vue?vue&type=script&setup=true&lang.ts
var SiteAccountGiftCards_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "SiteAccountGiftCards",
	__ssrInlineRender: true,
	props: { cards: {} },
	setup(__props) {
		const config = useRuntimeConfig();
		const { authHeaders } = useStorefront();
		const selected = ref(null);
		const revealed = ref(null);
		const loading = ref(false), error = ref(""), copied = ref(false), copyNotice = ref("");
		let requestId = 0;
		const money = (value) => `${Number(value || 0).toLocaleString("ru-RU")} ₽`;
		const available = (card) => Math.max(0, Number(card.balance) - Number(card.reserved));
		const expiry = (card) => card.expiresAt ? new Date(card.expiresAt).toLocaleDateString("ru-RU") : "Без ограничения срока";
		function state(card) {
			if (card.expiresAt && new Date(card.expiresAt).getTime() <= Date.now()) return "Срок действия истёк";
			if (!card.isActive) return "Карта неактивна";
			if (Number(card.balance) <= 0) return "Баланс использован";
			if (available(card) <= 0) return "Средства зарезервированы";
			return "Доступна к использованию";
		}
		function close() {
			requestId++;
			selected.value = null;
			revealed.value = null;
			loading.value = false;
			error.value = "";
			copied.value = false;
			copyNotice.value = "";
		}
		async function reveal() {
			if (!selected.value || loading.value) return;
			const card = selected.value, currentRequest = ++requestId;
			loading.value = true;
			revealed.value = null;
			error.value = "";
			copied.value = false;
			copyNotice.value = "";
			try {
				const order = await $fetch$1(`/storefront/orders/${encodeURIComponent(card.orderNumber)}`, {
					baseURL: config.public.apiBase,
					headers: authHeaders.value,
					cache: "no-store"
				});
				if (currentRequest !== requestId) return;
				const match = order.orderNumber === card.orderNumber ? order.giftCards?.find((item) => item.id === card.id) : null;
				if (!match || typeof match.code !== "string" || !match.code.trim()) {
					error.value = "Код карты пока недоступен. После подтверждения оплаты он появится здесь. Если заказ уже оплачен, обратитесь в поддержку.";
					return;
				}
				revealed.value = {
					...card,
					code: match.code
				};
			} catch (exception) {
				if (currentRequest !== requestId) return;
				const status = Number(exception?.statusCode || exception?.status);
				error.value = [401, 403].includes(status) ? "Не удалось подтвердить доступ к карте. Войдите в свой аккаунт снова." : status === 404 ? "Карта или её заказ недоступны для этого аккаунта." : "Не удалось загрузить карту. Попробуйте ещё раз.";
			} finally {
				if (currentRequest === requestId) loading.value = false;
			}
		}
		async function copy() {
			const code = revealed.value?.code, currentRequest = requestId;
			if (!code) return;
			try {
				await (void 0).clipboard.writeText(code);
				if (currentRequest === requestId) {
					copied.value = true;
					copyNotice.value = "Код скопирован.";
				}
			} catch {
				if (currentRequest === requestId) copyNotice.value = "Копирование недоступно. Выделите и скопируйте код вручную.";
			}
		}
		return (_ctx, _push, _parent, _attrs) => {
			const _component_NuxtLink = NuxtLink;
			const _component_SiteAccountDrawer = SiteAccountDrawer_default;
			_push(`<!--[--><section class="sa-panel sa-giftcards"><h2>Подарочные карты</h2><p class="sa-muted">Здесь находятся карты, купленные в ваших заказах. Полный код доступен только владельцу заказа после подтверждения оплаты.</p>`);
			if (__props.cards.length) {
				_push(`<div class="sa-gift-grid"><!--[-->`);
				ssrRenderList(__props.cards, (card) => {
					_push(`<article class="sa-gift-card"><div class="sa-gift-heading"><span>SARKISIAN BRAND</span></div><p class="sa-gift-mask">${ssrInterpolate(card.maskedCode)}</p><dl class="sa-gift-values"><div><dt>Доступно</dt><dd>${ssrInterpolate(money(available(card)))}</dd></div><div><dt>Номинал</dt><dd>${ssrInterpolate(money(card.faceValue))}</dd></div></dl>`);
					if (Number(card.reserved) > 0) _push(`<p class="sa-muted">В резерве для оплаты заказа: ${ssrInterpolate(money(card.reserved))}.</p>`);
					else _push(`<!---->`);
					_push(`<small>${ssrInterpolate(state(card))}<br>${ssrInterpolate(card.expiresAt ? `Действует до ${expiry(card)}` : expiry(card))}<br>Заказ ${ssrInterpolate(card.orderNumber)}</small><button class="sa-button">Показать карту `);
					_push(ssrRenderComponent(unref(ArrowRight), { size: 20 }, null, _parent));
					_push(`</button></article>`);
				});
				_push(`<!--]--></div>`);
			} else {
				_push(`<div class="sa-gift-empty"><p>Купленных подарочных карт пока нет. После покупки карты появятся в этом разделе.</p>`);
				_push(ssrRenderComponent(_component_NuxtLink, {
					to: "/catalog",
					class: "sa-button"
				}, {
					default: withCtx((_, _push, _parent, _scopeId) => {
						if (_push) {
							_push(`Перейти в каталог `);
							_push(ssrRenderComponent(unref(ArrowRight), { size: 20 }, null, _parent, _scopeId));
						} else return [createTextVNode("Перейти в каталог "), createVNode(unref(ArrowRight), { size: 20 })];
					}),
					_: 1
				}, _parent));
				_push(`</div>`);
			}
			_push(`</section>`);
			_push(ssrRenderComponent(_component_SiteAccountDrawer, {
				open: !!unref(selected),
				title: "Подарочная карта",
				onClose: close
			}, {
				default: withCtx((_, _push, _parent, _scopeId) => {
					if (_push) {
						if (unref(loading)) _push(`<p role="status"${_scopeId}>Загружаем вашу карту…</p>`);
						else _push(`<!---->`);
						if (unref(error)) _push(`<p class="sa-feedback" role="alert"${_scopeId}>${ssrInterpolate(unref(error))}</p>`);
						else _push(`<!---->`);
						if (unref(selected)) {
							_push(`<!--[--><p class="sa-muted"${_scopeId}>Заказ ${ssrInterpolate(unref(selected).orderNumber)} · ${ssrInterpolate(unref(selected).maskedCode)}</p>`);
							if (unref(revealed)) {
								_push(`<!--[--><div class="sa-form"${_scopeId}><label${_scopeId}>Код подарочной карты<input${ssrRenderAttr("value", unref(revealed).code)} readonly autocomplete="off" spellcheck="false"${_scopeId}></label></div><p class="sa-feedback"${_scopeId}>Храните код в безопасности: его можно использовать для оплаты или передать получателю подарка.</p><button class="sa-button"${_scopeId}>${ssrInterpolate(unref(copied) ? "Скопировано" : "Скопировать код")}`);
								if (unref(copied)) _push(ssrRenderComponent(unref(Check), { size: 20 }, null, _parent, _scopeId));
								else _push(ssrRenderComponent(unref(Copy), { size: 20 }, null, _parent, _scopeId));
								_push(`</button>`);
								if (unref(copyNotice)) _push(`<p role="status"${_scopeId}>${ssrInterpolate(unref(copyNotice))}</p>`);
								else _push(`<!---->`);
								_push(`<p${_scopeId}>Доступно: <strong${_scopeId}>${ssrInterpolate(money(available(unref(selected))))}</strong></p><!--]-->`);
							} else _push(`<!---->`);
							_push(`<div class="sa-actions"${_scopeId}>`);
							if (unref(error) && !unref(loading)) {
								_push(`<button class="sa-button"${_scopeId}>Повторить загрузку `);
								_push(ssrRenderComponent(unref(ArrowRight), { size: 20 }, null, _parent, _scopeId));
								_push(`</button>`);
							} else _push(`<!---->`);
							_push(ssrRenderComponent(_component_NuxtLink, {
								to: "/contacts",
								class: "sa-button sa-secondary",
								onClick: close
							}, {
								default: withCtx((_, _push, _parent, _scopeId) => {
									if (_push) {
										_push(`Связаться с поддержкой `);
										_push(ssrRenderComponent(unref(ArrowRight), { size: 20 }, null, _parent, _scopeId));
									} else return [createTextVNode("Связаться с поддержкой "), createVNode(unref(ArrowRight), { size: 20 })];
								}),
								_: 1
							}, _parent, _scopeId));
							_push(`</div><!--]-->`);
						} else _push(`<!---->`);
					} else return [
						unref(loading) ? (openBlock(), createBlock("p", {
							key: 0,
							role: "status"
						}, "Загружаем вашу карту…")) : createCommentVNode("", true),
						unref(error) ? (openBlock(), createBlock("p", {
							key: 1,
							class: "sa-feedback",
							role: "alert"
						}, toDisplayString(unref(error)), 1)) : createCommentVNode("", true),
						unref(selected) ? (openBlock(), createBlock(Fragment, { key: 2 }, [
							createVNode("p", { class: "sa-muted" }, "Заказ " + toDisplayString(unref(selected).orderNumber) + " · " + toDisplayString(unref(selected).maskedCode), 1),
							unref(revealed) ? (openBlock(), createBlock(Fragment, { key: 0 }, [
								createVNode("div", { class: "sa-form" }, [createVNode("label", null, [createTextVNode("Код подарочной карты"), createVNode("input", {
									value: unref(revealed).code,
									readonly: "",
									autocomplete: "off",
									spellcheck: "false"
								}, null, 8, ["value"])])]),
								createVNode("p", { class: "sa-feedback" }, "Храните код в безопасности: его можно использовать для оплаты или передать получателю подарка."),
								createVNode("button", {
									class: "sa-button",
									onClick: copy
								}, [createTextVNode(toDisplayString(unref(copied) ? "Скопировано" : "Скопировать код"), 1), unref(copied) ? (openBlock(), createBlock(unref(Check), {
									key: 0,
									size: 20
								})) : (openBlock(), createBlock(unref(Copy), {
									key: 1,
									size: 20
								}))]),
								unref(copyNotice) ? (openBlock(), createBlock("p", {
									key: 0,
									role: "status"
								}, toDisplayString(unref(copyNotice)), 1)) : createCommentVNode("", true),
								createVNode("p", null, [createTextVNode("Доступно: "), createVNode("strong", null, toDisplayString(money(available(unref(selected)))), 1)])
							], 64)) : createCommentVNode("", true),
							createVNode("div", { class: "sa-actions" }, [unref(error) && !unref(loading) ? (openBlock(), createBlock("button", {
								key: 0,
								class: "sa-button",
								onClick: reveal
							}, [createTextVNode("Повторить загрузку "), createVNode(unref(ArrowRight), { size: 20 })])) : createCommentVNode("", true), createVNode(_component_NuxtLink, {
								to: "/contacts",
								class: "sa-button sa-secondary",
								onClick: close
							}, {
								default: withCtx(() => [createTextVNode("Связаться с поддержкой "), createVNode(unref(ArrowRight), { size: 20 })]),
								_: 1
							})])
						], 64)) : createCommentVNode("", true)
					];
				}),
				_: 1
			}, _parent));
			_push(`<!--]-->`);
		};
	}
});
// components/storefront/SiteAccountGiftCards.vue
var _sfc_setup$6 = SiteAccountGiftCards_vue_vue_type_script_setup_true_lang_default.setup;
SiteAccountGiftCards_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/storefront/SiteAccountGiftCards.vue");
	return _sfc_setup$6 ? _sfc_setup$6(props, ctx) : void 0;
};
var SiteAccountGiftCards_default = Object.assign(SiteAccountGiftCards_vue_vue_type_script_setup_true_lang_default, { __name: "SiteAccountGiftCards" });
// components/storefront/SitePartnerAccount.vue?vue&type=script&setup=true&lang.ts
var SitePartnerAccount_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "SitePartnerAccount",
	__ssrInlineRender: true,
	props: { kind: {} },
	setup(__props) {
		const props = __props;
		const config = useRuntimeConfig(), { authHeaders } = useStorefront();
		const data = ref(null), loading = ref(false), busy = ref(false), error = ref(""), notice = ref(""), accepted = ref(false);
		const name = ref(""), channelLabel = ref(""), channelUrl = ref(""), description = ref(""), payoutAmount = ref(), requestKey = ref("");
		const documentWorkspace = ref(null), taxStatus = ref("SELF_EMPLOYED"), legalFullName = ref(""), legalInn = ref(""), legalOgrnip = ref(""), legalAddress = ref(""), legalEntityId = ref("");
		const link = computed(() => (data.value?.participant, ""));
		const number = (v) => Number(v || 0).toLocaleString("ru-RU", { maximumFractionDigits: 2 });
		const sum = (unit, status) => number(data.value?.summary?.totals?.find((v) => v.unit === unit && v.status === status)?._sum.amount);
		const statuses = {
			INVITED: "Вы приглашены",
			PENDING: "На проверке",
			ACTIVE: "Активен",
			SUSPENDED: "Приостановлен",
			REJECTED: "Отклонено",
			APPROVED: "Подтверждено",
			REQUESTED: "Запрошено",
			PAID: "Перевод отмечен",
			CANCELLED: "Отменено",
			REVERSED: "Сторнировано"
		};
		const api = (path, options = {}) => $fetch$1("/partners/" + path, {
			baseURL: config.public.apiBase,
			headers: authHeaders.value,
			timeout: 15e3,
			...options
		});
		const message = (e) => Array.isArray(e?.data?.message) ? e.data.message.join(" · ") : e?.data?.message || "Не удалось выполнить действие. Повторите запрос.";
		async function load() {
			loading.value = true;
			error.value = "";
			try {
				data.value = await api(`me/${props.kind}`);
				if (data.value.participant?.status === "INVITED") {
					const p = data.value.participant;
					name.value = p.displayName;
					description.value = p.description || "";
					channelLabel.value = p.channels?.[0]?.label || "";
					channelUrl.value = p.channels?.[0]?.url || "";
				}
			} catch (e) {
				error.value = message(e);
			} finally {
				loading.value = false;
			}
		}
		watch(() => props.kind, () => {
			accepted.value = false;
			notice.value = "";
			requestKey.value = "";
			data.value = null;
			load();
		});
		watch(() => data.value?.participant?.id, async (id) => {
			if (!id) {
				documentWorkspace.value = null;
				return;
			}
			try {
				documentWorkspace.value = await api(`documents/${props.kind}`);
				const p = documentWorkspace.value.legalProfile;
				if (p) {
					taxStatus.value = p.taxStatus;
					legalFullName.value = p.fullName;
					legalInn.value = p.inn;
					legalOgrnip.value = p.ogrnip || "";
					legalAddress.value = p.address;
				}
				legalEntityId.value = documentWorkspace.value.entities?.[0]?.id || "";
			} catch (e) {
				error.value = message(e);
			}
		});
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<section${ssrRenderAttrs(mergeProps({
				class: "sp-account",
				"aria-busy": unref(loading) || unref(busy)
			}, _attrs))}><header class="sa-panel"><h2>${ssrInterpolate(__props.kind === "REFERRAL" ? "Кабинет реферала" : "Кабинет блогера")}</h2><p>${ssrInterpolate(__props.kind === "REFERRAL" ? "Денежное вознаграждение за новых B2C-клиентов и подключённые салоны." : "Начисления за B2C-заказы и привлечение организаций, аналитика и заявки на выплаты.")}</p></header>`);
			if (unref(error)) _push(`<p class="sa-feedback" role="alert">${ssrInterpolate(unref(error))}</p>`);
			else _push(`<!---->`);
			if (unref(notice)) _push(`<p class="sa-feedback" role="status">${ssrInterpolate(unref(notice))}</p>`);
			else _push(`<!---->`);
			if (unref(loading) && !unref(data)) _push(`<p class="sa-panel" role="status">Загружаем программу…</p>`);
			else _push(`<!---->`);
			if (unref(error) && !unref(data)) _push(`<button class="sa-button sa-secondary">Повторить</button>`);
			else _push(`<!---->`);
			if (unref(data)) {
				_push(`<!--[-->`);
				if (!unref(data).participant || ["REJECTED", "INVITED"].includes(unref(data).participant.status)) {
					_push(`<form class="sa-panel sp-join">`);
					if (unref(data).participant?.status === "INVITED") _push(`<p class="sa-feedback">Вас пригласили в партнёрскую программу. Укажите канал и примите условия — после этого менеджер одобрит заявку.</p>`);
					else _push(`<!---->`);
					_push(`<h3>${ssrInterpolate(__props.kind === "BLOGGER" ? "Стать партнёром" : "Присоединиться к программе")}</h3>`);
					if (unref(data).participant?.decisionNote) _push(`<p class="sa-feedback">${ssrInterpolate(unref(data).participant.decisionNote)}</p>`);
					else _push(`<!---->`);
					if (!unref(data).settings.isEnabled) _push(`<p class="sa-muted">Программа пока не открыта. Участие станет доступно после запуска.</p>`);
					else {
						_push(`<!--[-->`);
						if (__props.kind === "REFERRAL") _push(`<p>${ssrInterpolate(unref(data).settings.customerRewardMode === "FIXED" ? `За первого нового B2C-клиента — ${number(unref(data).settings.fixedCustomerRewardAmount)} ₽` : `${number(unref(data).settings.rewardPercent)}% с каждой покупки по реферальной ссылке`)}. За салон — ${ssrInterpolate(number(unref(data).settings.signupRewardAmount))} ₽ после проверки и активации.</p>`);
						else _push(`<p>Вознаграждение за B2C-покупки — ${ssrInterpolate(number(unref(data).settings.rewardPercent))}% деньгами. Ссылка действует ${ssrInterpolate(unref(data).settings.attributionDays)} дней; начисление после доставки и ${ssrInterpolate(unref(data).settings.holdDays)} дней ожидания.</p>`);
						if (__props.kind === "BLOGGER" && Number(unref(data).settings.signupRewardAmount) > 0) _push(`<p>За новую проверенную и активированную организацию — ${ssrInterpolate(number(unref(data).settings.signupRewardAmount))} ${ssrInterpolate(unref(data).settings.signupRewardUnit === "BONUS" ? "бонусов" : "₽")}, однократно. B2B-продажи не участвуют.</p>`);
						else _push(`<!---->`);
						if (__props.kind === "BLOGGER") _push(`<!--[--><div class="sp-form-grid"><label>Публичное имя<input${ssrRenderAttr("value", unref(name))} maxlength="120" required></label><label>Название канала<input${ssrRenderAttr("value", unref(channelLabel))} maxlength="40" required placeholder="Например, Telegram"></label></div><label>Ссылка на ваш канал<input${ssrRenderAttr("value", unref(channelUrl))} type="url" maxlength="500" pattern="https://.*" placeholder="https://…" required></label><label>Расскажите о своей аудитории<textarea maxlength="2000" rows="3">${ssrInterpolate(unref(description))}</textarea></label><!--]-->`);
						else _push(`<!---->`);
						_push(`<details class="sp-terms"><summary>Условия участия</summary><p>${ssrInterpolate(unref(data).settings.termsText)}</p></details><label class="sp-check"><input${ssrIncludeBooleanAttr(Array.isArray(unref(accepted)) ? ssrLooseContain(unref(accepted), null) : unref(accepted)) ? " checked" : ""} type="checkbox" required>Принимаю условия программы</label><button class="sa-button"${ssrIncludeBooleanAttr(unref(busy) || !unref(accepted)) ? " disabled" : ""} type="submit">`);
						_push(ssrRenderComponent(unref(Check), { size: 18 }, null, _parent));
						_push(`${ssrInterpolate(__props.kind === "BLOGGER" ? "Отправить заявку" : "Получить ссылку")}</button><!--]-->`);
					}
					_push(`</form>`);
				} else {
					_push(`<!--[--><article class="sa-panel sp-link"><header><h3>Ваша персональная ссылка</h3><span class="sp-status">${ssrInterpolate(statuses[unref(data).participant.status])}</span></header>`);
					if (unref(data).participant.status === "PENDING") _push(`<p>Заявка рассматривается. Ссылка станет доступна после одобрения.</p>`);
					else if (unref(data).participant.status === "SUSPENDED") _push(`<p>Участие приостановлено. Начисления и история сохранены.</p>`);
					else _push(`<!---->`);
					if (!unref(data).settings.isEnabled) _push(`<p class="sa-muted">Программа сейчас приостановлена. Новые переходы и начисления недоступны.</p>`);
					else _push(`<!---->`);
					if (unref(data).participant.decisionNote) _push(`<p class="sa-muted">${ssrInterpolate(unref(data).participant.decisionNote)}</p>`);
					else _push(`<!---->`);
					if (unref(data).participant.status === "ACTIVE") {
						_push(`<div class="sp-copy-row"><input${ssrRenderAttr("value", unref(link))} readonly aria-label="Персональная ссылка"><button class="sa-button sa-secondary">`);
						_push(ssrRenderComponent(unref(Copy), { size: 18 }, null, _parent));
						_push(`Копировать</button></div>`);
					} else _push(`<!---->`);
					if (__props.kind === "REFERRAL") _push(`<p>${ssrInterpolate(unref(data).settings.customerRewardMode === "FIXED" ? `Фиксированно ${number(unref(data).settings.fixedCustomerRewardAmount)} ₽ за первого нового клиента` : `${number(unref(data).settings.rewardPercent)}% с каждой покупки по реферальной ссылке`)}. За проверенный и активированный салон — ${ssrInterpolate(number(unref(data).settings.signupRewardAmount))} ₽.</p>`);
					else _push(`<p>За B2C-покупки — ${ssrInterpolate(number(unref(data).participant.rewardPercent))}% деньгами. Самоприглашения и B2B-заказы исключены.</p>`);
					if (__props.kind === "BLOGGER" && Number(unref(data).settings.signupRewardAmount) > 0) _push(`<p>За привлечение организации — ${ssrInterpolate(number(unref(data).settings.signupRewardAmount))} ${ssrInterpolate(unref(data).settings.signupRewardUnit === "BONUS" ? "бонусов" : "₽")} после проверки и активации. Не процент с оптовых продаж.</p>`);
					else _push(`<!---->`);
					_push(`</article>`);
					if (unref(documentWorkspace)) {
						_push(`<article class="sa-panel sp-documents"><h3>Договоры и документы</h3><p>Укажите налоговый статус и данные исполнителя, затем выберите, от имени какого лица SARKISIAN подготовить комплект.</p><form class="sp-form-grid"><label>Статус<select><option value="SELF_EMPLOYED"${ssrIncludeBooleanAttr(Array.isArray(unref(taxStatus)) ? ssrLooseContain(unref(taxStatus), "SELF_EMPLOYED") : ssrLooseEqual(unref(taxStatus), "SELF_EMPLOYED")) ? " selected" : ""}>Самозанятый (НПД)</option><option value="INDIVIDUAL_ENTREPRENEUR"${ssrIncludeBooleanAttr(Array.isArray(unref(taxStatus)) ? ssrLooseContain(unref(taxStatus), "INDIVIDUAL_ENTREPRENEUR") : ssrLooseEqual(unref(taxStatus), "INDIVIDUAL_ENTREPRENEUR")) ? " selected" : ""}>Индивидуальный предприниматель</option></select></label><label>ФИО<input${ssrRenderAttr("value", unref(legalFullName))} required maxlength="200"></label><label>ИНН<input${ssrRenderAttr("value", unref(legalInn))} required inputmode="numeric" maxlength="12"></label>`);
						if (unref(taxStatus) === "INDIVIDUAL_ENTREPRENEUR") _push(`<label>ОГРНИП<input${ssrRenderAttr("value", unref(legalOgrnip))} required inputmode="numeric" maxlength="15"></label>`);
						else _push(`<!---->`);
						_push(`<label class="sp-doc-wide">Адрес для документов<input${ssrRenderAttr("value", unref(legalAddress))} required maxlength="500"></label><button class="sa-button" type="submit"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}>Сохранить данные исполнителя</button></form><p class="sa-muted">Банковские реквизиты в кабинете не хранятся. Возможность работы на НПД проверяется по фактическим услугам.</p><div class="sp-form-grid"><label>Сторона SARKISIAN<select required><option value="" disabled${ssrIncludeBooleanAttr(Array.isArray(unref(legalEntityId)) ? ssrLooseContain(unref(legalEntityId), "") : ssrLooseEqual(unref(legalEntityId), "")) ? " selected" : ""}>Выберите ИП или ООО</option><!--[-->`);
						ssrRenderList(unref(documentWorkspace).entities, (entity) => {
							_push(`<option${ssrRenderAttr("value", entity.id)}${ssrIncludeBooleanAttr(Array.isArray(unref(legalEntityId)) ? ssrLooseContain(unref(legalEntityId), entity.id) : ssrLooseEqual(unref(legalEntityId), entity.id)) ? " selected" : ""}>${ssrInterpolate(entity.entityType === "IP" ? "ИП" : "ООО")} · ${ssrInterpolate(entity.legalName)}</option>`);
						});
						_push(`<!--]--></select></label><button class="sa-button"${ssrIncludeBooleanAttr(unref(busy) || !unref(legalEntityId) || !unref(documentWorkspace).legalProfile) ? " disabled" : ""}>Сформировать комплект документов</button></div>`);
						if (!unref(documentWorkspace).entities.length) _push(`<p class="sa-feedback">Реквизиты ИП и ООО ещё не заполнены в CRM. Администратор может добавить обе стороны в настройках партнёрских документов.</p>`);
						else _push(`<!---->`);
						_push(`<p class="sa-feedback">Все файлы сейчас формируются как проекты для правовой проверки. SMS-подписание в кабинете пока не подключено.</p>`);
						if (unref(documentWorkspace).documents.length) {
							_push(`<div class="sp-history"><!--[-->`);
							ssrRenderList(unref(documentWorkspace).documents, (doc) => {
								_push(`<article><span><strong>${ssrInterpolate(doc.title)}</strong><small>${ssrInterpolate(doc.entity.entityType === "IP" ? "ИП" : "ООО")} · ${ssrInterpolate(doc.entity.legalName)} · ${ssrInterpolate(new Date(doc.createdAt).toLocaleDateString("ru-RU"))}</small><small>Черновик · ${ssrInterpolate(doc.templateVersion)}</small></span><button class="sa-button sa-secondary">Скачать .doc</button></article>`);
							});
							_push(`<!--]--></div>`);
						} else _push(`<!---->`);
						_push(`</article>`);
					} else _push(`<!---->`);
					_push(`<div class="sp-metrics"><article class="sa-panel">`);
					_push(ssrRenderComponent(unref(Users), { size: 20 }, null, _parent));
					_push(`<span>Посетители по ссылке</span><strong>${ssrInterpolate(unref(data).summary.uniqueVisitors)}</strong><small>${ssrInterpolate(unref(data).summary.visits)} переходов с согласием</small></article><article class="sa-panel">`);
					_push(ssrRenderComponent(unref(Link2), { size: 20 }, null, _parent));
					_push(`<span>Привязанные покупки</span><strong>${ssrInterpolate(unref(data).summary.orders)}</strong><small>${ssrInterpolate(unref(data).summary.registrations)} организаций</small></article><article class="sa-panel">`);
					_push(ssrRenderComponent(unref(Wallet), { size: 20 }, null, _parent));
					_push(`<span>Доступно к выплате</span><strong>${ssrInterpolate(number(unref(data).summary.availableCash))} ₽</strong><small>В ожидании: ${ssrInterpolate(sum("RUB", "PENDING"))} ₽</small></article></div><article class="sa-panel"><h3>Последние начисления</h3>`);
					if (!unref(data).rewards?.length) _push(`<p class="sa-muted">Начисления появятся после подтверждённой оплаты приглашённым покупателем или проверки новой организации.</p>`);
					else {
						_push(`<div class="sp-history"><!--[-->`);
						ssrRenderList(unref(data).rewards, (reward) => {
							_push(`<article><span><strong>${ssrInterpolate(reward.registrationId ? "Привлечение организации" : "B2C-заказ")}</strong><small>${ssrInterpolate(new Date(reward.createdAt).toLocaleDateString("ru-RU"))} · ${ssrInterpolate(statuses[reward.status])}</small>`);
							if (reward.readyAt && reward.status === "PENDING") _push(`<small>Доступно не ранее ${ssrInterpolate(new Date(reward.readyAt).toLocaleDateString("ru-RU"))}</small>`);
							else _push(`<!---->`);
							_push(`</span><b>${ssrInterpolate(number(reward.amount))} ${ssrInterpolate(reward.unit === "BONUS" ? "бонусов" : "₽")}</b></article>`);
						});
						_push(`<!--]--></div>`);
					}
					_push(`<small class="sa-muted">Показаны последние 30 начислений; показатели выше учитывают всю историю.</small></article><article class="sa-panel sp-payouts"><h3>Денежные выплаты</h3>`);
					if (!unref(data).participant.payoutVerified) _push(`<p class="sa-muted">Перед первой выплатой менеджер проверит статус получателя и необходимые документы. Банковские реквизиты здесь пока не запрашиваются.</p>`);
					else if (unref(data).participant.status === "ACTIVE" && unref(data).settings.isEnabled) _push(`<form><label>Сумма выплаты, ₽<input${ssrRenderAttr("value", unref(payoutAmount))} type="number"${ssrRenderAttr("min", Number(unref(data).settings.minimumPayout))}${ssrRenderAttr("max", Number(unref(data).summary.availableCash))} step="0.01" required${ssrIncludeBooleanAttr(unref(busy) || !!unref(requestKey)) ? " disabled" : ""}></label><button class="sa-button"${ssrIncludeBooleanAttr(unref(busy) || Number(unref(data).summary.availableCash) < Number(unref(data).settings.minimumPayout)) ? " disabled" : ""} type="submit">${ssrInterpolate(unref(requestKey) ? "Повторить запрос" : "Запросить выплату")}</button><small>Минимум ${ssrInterpolate(number(unref(data).settings.minimumPayout))} ₽.</small></form>`);
					else _push(`<!---->`);
					if (unref(data).payouts?.length) {
						_push(`<div class="sp-history"><!--[-->`);
						ssrRenderList(unref(data).payouts, (entry) => {
							_push(`<article><span><strong>${ssrInterpolate(number(entry.amount))} ₽ · ${ssrInterpolate(statuses[entry.status])}</strong><small>${ssrInterpolate(new Date(entry.createdAt).toLocaleDateString("ru-RU"))}</small>`);
							if (entry.decisionNote) _push(`<small>${ssrInterpolate(entry.decisionNote)}</small>`);
							else _push(`<!---->`);
							_push(`</span>`);
							if (entry.status === "REQUESTED") _push(`<button class="sa-button sa-secondary"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}>Отменить</button>`);
							else _push(`<!---->`);
							_push(`</article>`);
						});
						_push(`<!--]--></div>`);
					} else _push(`<!---->`);
					_push(`</article><!--]-->`);
				}
				_push(`<!--]-->`);
			} else _push(`<!---->`);
			_push(`</section>`);
		};
	}
});
// components/storefront/SitePartnerAccount.vue
var _sfc_setup$5 = SitePartnerAccount_vue_vue_type_script_setup_true_lang_default.setup;
SitePartnerAccount_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/storefront/SitePartnerAccount.vue");
	return _sfc_setup$5 ? _sfc_setup$5(props, ctx) : void 0;
};
var SitePartnerAccount_default = Object.assign(SitePartnerAccount_vue_vue_type_script_setup_true_lang_default, { __name: "SitePartnerAccount" });
// components/storefront/SiteAccountAddresses.vue?vue&type=script&setup=true&lang.ts
var SiteAccountAddresses_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "SiteAccountAddresses",
	__ssrInlineRender: true,
	props: {
		addresses: {},
		profile: {}
	},
	emits: ["updated"],
	setup(__props, { emit: __emit }) {
		const emit = __emit;
		const config = useRuntimeConfig();
		const { authHeaders } = useStorefront();
		const editor = ref(false), editingId = ref(""), deleting = ref(null), busy = ref(false), error = ref(""), notice = ref("");
		const form = reactive({
			label: "",
			recipientName: "",
			phone: "",
			city: "",
			street: "",
			house: "",
			apartment: "",
			isDefault: false
		});
		async function refresh() {
			emit("updated", await $fetch$1("/storefront/addresses", {
				baseURL: config.public.apiBase,
				headers: authHeaders.value
			}));
		}
		async function mutate(fn) {
			if (busy.value) return;
			busy.value = true;
			error.value = "";
			notice.value = "";
			try {
				await fn();
			} catch (exception) {
				const message = exception?.data?.message;
				error.value = Array.isArray(message) ? message.join(". ") : typeof message === "string" ? message : "Не удалось изменить адрес. Попробуйте ещё раз.";
			} finally {
				busy.value = false;
			}
		}
		function save() {
			return mutate(async () => {
				const body = Object.fromEntries(Object.entries(form).map(([key, value]) => [key, typeof value === "string" ? value.trim() : value]));
				await $fetch$1(`/storefront/addresses${editingId.value ? `/${encodeURIComponent(editingId.value)}` : ""}`, {
					baseURL: config.public.apiBase,
					method: editingId.value ? "PATCH" : "POST",
					headers: authHeaders.value,
					body
				});
				editor.value = false;
				await refresh();
				notice.value = "Адрес сохранён.";
			});
		}
		function remove() {
			return mutate(async () => {
				await $fetch$1(`/storefront/addresses/${encodeURIComponent(deleting.value.id)}`, {
					baseURL: config.public.apiBase,
					method: "DELETE",
					headers: authHeaders.value
				});
				deleting.value = null;
				await refresh();
				notice.value = "Адрес удалён.";
			});
		}
		return (_ctx, _push, _parent, _attrs) => {
			const _component_SiteAccountDrawer = SiteAccountDrawer_default;
			_push(`<!--[--><section class="sa-panel"><div class="sa-section-head"><h2>Адреса доставки</h2><button class="sa-button">`);
			_push(ssrRenderComponent(unref(Plus), { size: 20 }, null, _parent));
			_push(`Добавить адрес</button></div>`);
			if (unref(notice)) _push(`<p class="sa-feedback" role="status">${ssrInterpolate(unref(notice))}</p>`);
			else _push(`<!---->`);
			if (unref(error) && !unref(editor) && !unref(deleting)) _push(`<p class="sa-feedback" role="alert">${ssrInterpolate(unref(error))}</p>`);
			else _push(`<!---->`);
			if (!__props.addresses.length) _push(`<p class="sa-muted">Сохраните адрес, чтобы не вводить его при следующем заказе.</p>`);
			else {
				_push(`<div><!--[-->`);
				ssrRenderList(__props.addresses, (address) => {
					_push(`<article class="sa-address">`);
					_push(ssrRenderComponent(unref(MapPin), { size: 24 }, null, _parent));
					_push(`<div><h3>${ssrInterpolate(address.label || "Адрес доставки")}`);
					if (address.isDefault) _push(`<small class="sa-badge">Основной</small>`);
					else _push(`<!---->`);
					_push(`</h3><p>${ssrInterpolate(address.city)}, ${ssrInterpolate(address.street)}, ${ssrInterpolate(address.house)}${ssrInterpolate(address.apartment ? `, кв. ${address.apartment}` : "")}</p><small>${ssrInterpolate(address.recipientName)} · ${ssrInterpolate(address.phone)}</small><div class="sa-actions"><button class="sa-button sa-secondary">Изменить `);
					_push(ssrRenderComponent(unref(Pencil), { size: 18 }, null, _parent));
					_push(`</button><button class="sa-button sa-secondary">Удалить `);
					_push(ssrRenderComponent(unref(Trash2), { size: 18 }, null, _parent));
					_push(`</button></div></div></article>`);
				});
				_push(`<!--]--></div>`);
			}
			_push(`</section>`);
			_push(ssrRenderComponent(_component_SiteAccountDrawer, {
				open: unref(editor),
				title: unref(editingId) ? "Изменить адрес" : "Новый адрес",
				onClose: ($event) => !unref(busy) && (editor.value = false)
			}, {
				default: withCtx((_, _push, _parent, _scopeId) => {
					if (_push) {
						_push(`<form class="sa-form"${_scopeId}>`);
						if (unref(error)) _push(`<p class="sa-feedback" role="alert"${_scopeId}>${ssrInterpolate(unref(error))}</p>`);
						else _push(`<!---->`);
						_push(`<label${_scopeId}>Название адреса<input${ssrRenderAttr("value", unref(form).label)} maxlength="40" placeholder="Например, дом или работа"${_scopeId}></label><label${_scopeId}>Имя получателя<input${ssrRenderAttr("value", unref(form).recipientName)} required minlength="2" maxlength="160" autocomplete="name"${_scopeId}></label><label${_scopeId}>Телефон получателя<input${ssrRenderAttr("value", unref(form).phone)} type="tel" required minlength="7" maxlength="30" autocomplete="tel"${_scopeId}></label><label${_scopeId}>Город<input${ssrRenderAttr("value", unref(form).city)} required minlength="2" maxlength="120" autocomplete="address-level2"${_scopeId}></label><label${_scopeId}>Улица<input${ssrRenderAttr("value", unref(form).street)} required minlength="2" maxlength="180" autocomplete="address-line1"${_scopeId}></label><div class="sa-field-grid"${_scopeId}><label${_scopeId}>Дом<input${ssrRenderAttr("value", unref(form).house)} required maxlength="40"${_scopeId}></label><label${_scopeId}>Квартира или офис<input${ssrRenderAttr("value", unref(form).apartment)} maxlength="40" autocomplete="address-line2"${_scopeId}></label></div><label class="sa-checkbox"${_scopeId}><input${ssrIncludeBooleanAttr(Array.isArray(unref(form).isDefault) ? ssrLooseContain(unref(form).isDefault, null) : unref(form).isDefault) ? " checked" : ""} type="checkbox"${_scopeId}>Использовать как основной адрес</label><button class="sa-button"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}${_scopeId}>${ssrInterpolate(unref(busy) ? "Сохраняем…" : "Сохранить адрес")}`);
						_push(ssrRenderComponent(unref(ArrowRight), { size: 20 }, null, _parent, _scopeId));
						_push(`</button></form>`);
					} else return [createVNode("form", {
						class: "sa-form",
						onSubmit: withModifiers(save, ["prevent"])
					}, [
						unref(error) ? (openBlock(), createBlock("p", {
							key: 0,
							class: "sa-feedback",
							role: "alert"
						}, toDisplayString(unref(error)), 1)) : createCommentVNode("", true),
						createVNode("label", null, [createTextVNode("Название адреса"), withDirectives(createVNode("input", {
							"onUpdate:modelValue": ($event) => unref(form).label = $event,
							maxlength: "40",
							placeholder: "Например, дом или работа"
						}, null, 8, ["onUpdate:modelValue"]), [[vModelText, unref(form).label]])]),
						createVNode("label", null, [createTextVNode("Имя получателя"), withDirectives(createVNode("input", {
							"onUpdate:modelValue": ($event) => unref(form).recipientName = $event,
							required: "",
							minlength: "2",
							maxlength: "160",
							autocomplete: "name"
						}, null, 8, ["onUpdate:modelValue"]), [[vModelText, unref(form).recipientName]])]),
						createVNode("label", null, [createTextVNode("Телефон получателя"), withDirectives(createVNode("input", {
							"onUpdate:modelValue": ($event) => unref(form).phone = $event,
							type: "tel",
							required: "",
							minlength: "7",
							maxlength: "30",
							autocomplete: "tel"
						}, null, 8, ["onUpdate:modelValue"]), [[vModelText, unref(form).phone]])]),
						createVNode("label", null, [createTextVNode("Город"), withDirectives(createVNode("input", {
							"onUpdate:modelValue": ($event) => unref(form).city = $event,
							required: "",
							minlength: "2",
							maxlength: "120",
							autocomplete: "address-level2"
						}, null, 8, ["onUpdate:modelValue"]), [[vModelText, unref(form).city]])]),
						createVNode("label", null, [createTextVNode("Улица"), withDirectives(createVNode("input", {
							"onUpdate:modelValue": ($event) => unref(form).street = $event,
							required: "",
							minlength: "2",
							maxlength: "180",
							autocomplete: "address-line1"
						}, null, 8, ["onUpdate:modelValue"]), [[vModelText, unref(form).street]])]),
						createVNode("div", { class: "sa-field-grid" }, [createVNode("label", null, [createTextVNode("Дом"), withDirectives(createVNode("input", {
							"onUpdate:modelValue": ($event) => unref(form).house = $event,
							required: "",
							maxlength: "40"
						}, null, 8, ["onUpdate:modelValue"]), [[vModelText, unref(form).house]])]), createVNode("label", null, [createTextVNode("Квартира или офис"), withDirectives(createVNode("input", {
							"onUpdate:modelValue": ($event) => unref(form).apartment = $event,
							maxlength: "40",
							autocomplete: "address-line2"
						}, null, 8, ["onUpdate:modelValue"]), [[vModelText, unref(form).apartment]])])]),
						createVNode("label", { class: "sa-checkbox" }, [withDirectives(createVNode("input", {
							"onUpdate:modelValue": ($event) => unref(form).isDefault = $event,
							type: "checkbox"
						}, null, 8, ["onUpdate:modelValue"]), [[vModelCheckbox, unref(form).isDefault]]), createTextVNode("Использовать как основной адрес")]),
						createVNode("button", {
							class: "sa-button",
							disabled: unref(busy)
						}, [createTextVNode(toDisplayString(unref(busy) ? "Сохраняем…" : "Сохранить адрес"), 1), createVNode(unref(ArrowRight), { size: 20 })], 8, ["disabled"])
					], 32)];
				}),
				_: 1
			}, _parent));
			_push(ssrRenderComponent(_component_SiteAccountDrawer, {
				open: !!unref(deleting),
				title: "Удалить адрес?",
				onClose: ($event) => !unref(busy) && (deleting.value = null)
			}, {
				default: withCtx((_, _push, _parent, _scopeId) => {
					if (_push) {
						_push(`<p${_scopeId}>Удалить адрес «${ssrInterpolate(unref(deleting)?.label || "Адрес доставки")}»? Данные в уже оформленных заказах не изменятся.</p>`);
						if (unref(error)) _push(`<p class="sa-feedback" role="alert"${_scopeId}>${ssrInterpolate(unref(error))}</p>`);
						else _push(`<!---->`);
						_push(`<div class="sa-actions"${_scopeId}><button class="sa-button sa-secondary"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}${_scopeId}>Отмена</button><button class="sa-button"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}${_scopeId}>${ssrInterpolate(unref(busy) ? "Удаляем…" : "Удалить адрес")}`);
						_push(ssrRenderComponent(unref(Trash2), { size: 20 }, null, _parent, _scopeId));
						_push(`</button></div>`);
					} else return [
						createVNode("p", null, "Удалить адрес «" + toDisplayString(unref(deleting)?.label || "Адрес доставки") + "»? Данные в уже оформленных заказах не изменятся.", 1),
						unref(error) ? (openBlock(), createBlock("p", {
							key: 0,
							class: "sa-feedback",
							role: "alert"
						}, toDisplayString(unref(error)), 1)) : createCommentVNode("", true),
						createVNode("div", { class: "sa-actions" }, [createVNode("button", {
							class: "sa-button sa-secondary",
							disabled: unref(busy),
							onClick: ($event) => deleting.value = null
						}, "Отмена", 8, ["disabled", "onClick"]), createVNode("button", {
							class: "sa-button",
							disabled: unref(busy),
							onClick: remove
						}, [createTextVNode(toDisplayString(unref(busy) ? "Удаляем…" : "Удалить адрес"), 1), createVNode(unref(Trash2), { size: 20 })], 8, ["disabled"])])
					];
				}),
				_: 1
			}, _parent));
			_push(`<!--]-->`);
		};
	}
});
// components/storefront/SiteAccountAddresses.vue
var _sfc_setup$4 = SiteAccountAddresses_vue_vue_type_script_setup_true_lang_default.setup;
SiteAccountAddresses_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/storefront/SiteAccountAddresses.vue");
	return _sfc_setup$4 ? _sfc_setup$4(props, ctx) : void 0;
};
var SiteAccountAddresses_default = Object.assign(SiteAccountAddresses_vue_vue_type_script_setup_true_lang_default, { __name: "SiteAccountAddresses" });
// components/storefront/SiteAccountNotifications.vue?vue&type=script&setup=true&lang.ts
var SiteAccountNotifications_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "SiteAccountNotifications",
	__ssrInlineRender: true,
	emits: ["updated"],
	setup(__props, { emit: __emit }) {
		useStorefront();
		const email = ref(true), loading = ref(true), loaded = ref(false), saving = ref(false);
		const error = ref(""), notice = ref("");
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<section${ssrRenderAttrs(mergeProps({ class: "sa-panel sa-notifications" }, _attrs))}><h2>Уведомления</h2><p class="sa-muted">Выберите, как получать сообщения. Новые каналы появятся здесь после подключения.</p>`);
			if (unref(loading)) _push(`<p role="status">Загружаем настройки уведомлений…</p>`);
			else _push(`<!---->`);
			if (unref(error)) _push(`<p class="sa-feedback" role="alert">${ssrInterpolate(unref(error))}</p>`);
			else _push(`<!---->`);
			if (unref(notice)) _push(`<p class="sa-feedback" role="status">${ssrInterpolate(unref(notice))}</p>`);
			else _push(`<!---->`);
			if (!unref(loaded) && !unref(loading)) {
				_push(`<button class="sa-button">Повторить загрузку `);
				_push(ssrRenderComponent(unref(ArrowRight), { size: 20 }, null, _parent));
				_push(`</button>`);
			} else _push(`<!---->`);
			if (unref(loaded)) {
				_push(`<form class="sa-form"><div class="sa-notification-channel">`);
				_push(ssrRenderComponent(unref(Mail), {
					size: 24,
					"aria-hidden": "true"
				}, null, _parent));
				_push(`<div><h3>Электронная почта</h3><label class="sa-checkbox"><input${ssrIncludeBooleanAttr(Array.isArray(unref(email)) ? ssrLooseContain(unref(email), null) : unref(email)) ? " checked" : ""} type="checkbox" aria-label="Получать уведомления по электронной почте"${ssrIncludeBooleanAttr(unref(saving) || unref(loading)) ? " disabled" : ""}>Получать уведомления по электронной почте</label></div></div><small class="sa-muted">Эта настройка не отключает обязательные письма о безопасности аккаунта и получении купленных подарочных карт.</small><div class="sa-notification-channel">`);
				_push(ssrRenderComponent(unref(Smartphone), {
					size: 24,
					"aria-hidden": "true"
				}, null, _parent));
				_push(`<div><div class="sa-notification-heading"><h3>SMS</h3><span class="sa-badge">Скоро</span></div><label class="sa-checkbox"><input type="checkbox" disabled aria-label="SMS-уведомления — не подключено">SMS-уведомления</label><small>Не подключено. Сообщения не отправляются.</small></div></div><div class="sa-notification-channel">`);
				_push(ssrRenderComponent(unref(MessageCircle), {
					size: 24,
					"aria-hidden": "true"
				}, null, _parent));
				_push(`<div><div class="sa-notification-heading"><h3>Боты в мессенджерах</h3><span class="sa-badge">Скоро</span></div><label class="sa-checkbox"><input type="checkbox" disabled aria-label="Уведомления через ботов — не подключено">Уведомления через ботов</label><small>Не подключено. Сообщения не отправляются.</small></div></div><button class="sa-button"${ssrIncludeBooleanAttr(unref(saving) || unref(loading)) ? " disabled" : ""}>${ssrInterpolate(unref(saving) ? "Сохраняем…" : "Сохранить настройки")}`);
				_push(ssrRenderComponent(unref(ArrowRight), { size: 20 }, null, _parent));
				_push(`</button></form>`);
			} else _push(`<!---->`);
			_push(`</section>`);
		};
	}
});
// components/storefront/SiteAccountNotifications.vue
var _sfc_setup$3 = SiteAccountNotifications_vue_vue_type_script_setup_true_lang_default.setup;
SiteAccountNotifications_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/storefront/SiteAccountNotifications.vue");
	return _sfc_setup$3 ? _sfc_setup$3(props, ctx) : void 0;
};
var SiteAccountNotifications_default = Object.assign(SiteAccountNotifications_vue_vue_type_script_setup_true_lang_default, { __name: "SiteAccountNotifications" });
// components/storefront/SiteAccountProfile.vue?vue&type=script&setup=true&lang.ts
var SiteAccountProfile_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "SiteAccountProfile",
	__ssrInlineRender: true,
	props: { profile: {} },
	emits: ["updated", "password-changed"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const config = useRuntimeConfig();
		const { authHeaders } = useStorefront();
		const busy = ref(""), error = ref(""), notice = ref(""), confirmAvatar = ref(false);
		const form = reactive({
			firstName: "",
			lastName: "",
			phone: "",
			birthday: ""
		});
		const birthdayMax = ref("");
		const isB2C = computed(() => props.profile.role === "CUSTOMER_B2C");
		const password = reactive({
			currentPassword: "",
			newPassword: "",
			confirmation: ""
		});
		watch(() => props.profile, (value) => Object.assign(form, {
			firstName: value.firstName || "",
			lastName: value.lastName || "",
			phone: value.phone || "",
			birthday: value.birthday || ""
		}), { immediate: true });
		const avatar = computed(() => {
			try {
				const url = new URL(props.profile.avatarUrl || "", config.public.apiBase);
				return props.profile.avatarUrl && ["http:", "https:"].includes(url.protocol) ? url.href : "";
			} catch {
				return "";
			}
		});
		async function action(name, fn) {
			if (busy.value) return;
			busy.value = name;
			error.value = "";
			notice.value = "";
			try {
				await fn();
			} catch (exception) {
				const value = exception?.data?.message;
				error.value = Array.isArray(value) ? value.join(". ") : typeof value === "string" ? value : "Не удалось сохранить изменения. Попробуйте ещё раз.";
			} finally {
				busy.value = "";
			}
		}
		function removeAvatar() {
			return action("avatar", async () => {
				await $fetch$1("/auth/profile/avatar", {
					baseURL: config.public.apiBase,
					method: "DELETE",
					headers: authHeaders.value
				});
				emit("updated", { avatarUrl: null });
				confirmAvatar.value = false;
				notice.value = "Фото удалено.";
			});
		}
		return (_ctx, _push, _parent, _attrs) => {
			const _component_SiteAccountDrawer = SiteAccountDrawer_default;
			_push(`<div${ssrRenderAttrs(_attrs)}>`);
			if (unref(error)) _push(`<p class="sa-feedback" role="alert">${ssrInterpolate(unref(error))}</p>`);
			else _push(`<!---->`);
			if (unref(notice)) _push(`<p class="sa-feedback" role="status">${ssrInterpolate(unref(notice))}</p>`);
			else _push(`<!---->`);
			_push(`<section class="sa-panel"><h2>Мои данные</h2><div class="sa-avatar-row">`);
			if (unref(avatar)) _push(`<img${ssrRenderAttr("src", unref(avatar))} alt="Ваше фото" class="sa-avatar">`);
			else _push(`<span class="sa-avatar sa-initials">${ssrInterpolate((__props.profile.firstName || __props.profile.email || "К").slice(0, 1).toUpperCase())}</span>`);
			_push(`<div><label class="sa-button sa-secondary sa-upload">`);
			_push(ssrRenderComponent(unref(Camera), { size: 20 }, null, _parent));
			_push(`${ssrInterpolate(unref(busy) === "avatar" ? "Сохраняем фото…" : "Загрузить фото")}<input type="file" accept="image/jpeg,image/png,image/webp"${ssrIncludeBooleanAttr(!!unref(busy)) ? " disabled" : ""}></label><small>JPG, PNG, WebP — до 5 МБ</small>`);
			if (unref(avatar)) {
				_push(`<button class="sa-text-button"${ssrIncludeBooleanAttr(!!unref(busy)) ? " disabled" : ""}>`);
				_push(ssrRenderComponent(unref(Trash2), { size: 18 }, null, _parent));
				_push(`Удалить фото</button>`);
			} else _push(`<!---->`);
			_push(`</div></div><form class="sa-form"><div class="sa-field-grid sa-profile-fields"><label>Имя<input${ssrRenderAttr("value", unref(form).firstName)} required maxlength="80" autocomplete="given-name"${ssrIncludeBooleanAttr(!!__props.profile.pendingChangeRequest || !!unref(busy)) ? " disabled" : ""}></label><label>Фамилия<input${ssrRenderAttr("value", unref(form).lastName)} required maxlength="80" autocomplete="family-name"${ssrIncludeBooleanAttr(!!__props.profile.pendingChangeRequest || !!unref(busy)) ? " disabled" : ""}></label><label>Телефон<input${ssrRenderAttr("value", unref(form).phone)} type="tel" maxlength="24" pattern="\\+?[0-9 \\(\\)\\-]{7,24}" autocomplete="tel" aria-label="Телефон" aria-describedby="sa-phone-hint"${ssrIncludeBooleanAttr(!!__props.profile.pendingChangeRequest || !!unref(busy)) ? " disabled" : ""}><small id="sa-phone-hint">Изменение телефона подтверждает сотрудник.</small></label><label>Электронная почта<input${ssrRenderAttr("value", __props.profile.email)} type="email" aria-label="Электронная почта" readonly><small>Для изменения почты обратитесь в поддержку.</small></label>`);
			if (unref(isB2C)) _push(`<label>Дата рождения<input${ssrRenderAttr("value", unref(form).birthday)} type="date" aria-label="Дата рождения" aria-describedby="sa-birthday-hint" autocomplete="bday" min="1900-01-01"${ssrRenderAttr("max", unref(birthdayMax) || void 0)}${ssrIncludeBooleanAttr(!!__props.profile.pendingChangeRequest || !!unref(busy)) ? " disabled" : ""}><small id="sa-birthday-hint">Для бонусов ко дню рождения. Дату изменяем после подтверждения сотрудником.</small></label>`);
			else _push(`<!---->`);
			_push(`</div><p class="sa-muted">${ssrInterpolate(unref(isB2C) ? "Изменение имени, фамилии, телефона и даты рождения подтверждает сотрудник." : "Изменение имени, фамилии и телефона подтверждает сотрудник.")} До подтверждения действуют прежние данные.</p>`);
			if (__props.profile.pendingChangeRequest) _push(`<p class="sa-feedback" role="status">Запрос на изменение данных ожидает подтверждения.</p>`);
			else {
				_push(`<button class="sa-button"${ssrIncludeBooleanAttr(!!unref(busy)) ? " disabled" : ""}>${ssrInterpolate(unref(busy) === "request" ? "Отправляем…" : "Запросить изменение")}`);
				_push(ssrRenderComponent(unref(ArrowRight), { size: 20 }, null, _parent));
				_push(`</button>`);
			}
			_push(`</form></section><section class="sa-panel"><h2>Смена пароля</h2><p class="sa-muted">После смены пароля все сеансы будут завершены. Понадобится войти снова.</p><form class="sa-form"><label>Текущий пароль<input${ssrRenderAttr("value", unref(password).currentPassword)} type="password" required autocomplete="current-password"></label><label>Новый пароль<input${ssrRenderAttr("value", unref(password).newPassword)} aria-label="Новый пароль" type="password" required minlength="10" autocomplete="new-password"><small>Не менее 10 символов, буквы и цифры.</small></label><label>Повторите новый пароль<input${ssrRenderAttr("value", unref(password).confirmation)} type="password" required minlength="10" autocomplete="new-password"></label><button class="sa-button"${ssrIncludeBooleanAttr(!!unref(busy)) ? " disabled" : ""}>${ssrInterpolate(unref(busy) === "password" ? "Меняем пароль…" : "Изменить пароль")}`);
			_push(ssrRenderComponent(unref(ArrowRight), { size: 20 }, null, _parent));
			_push(`</button></form></section>`);
			_push(ssrRenderComponent(_component_SiteAccountDrawer, {
				open: unref(confirmAvatar),
				title: "Удалить фото?",
				onClose: ($event) => !unref(busy) && (confirmAvatar.value = false)
			}, {
				default: withCtx((_, _push, _parent, _scopeId) => {
					if (_push) {
						_push(`<p${_scopeId}>Фото будет удалено из вашего профиля. Позже можно загрузить другое.</p>`);
						if (unref(error)) _push(`<p role="alert"${_scopeId}>${ssrInterpolate(unref(error))}</p>`);
						else _push(`<!---->`);
						_push(`<div class="sa-actions"${_scopeId}><button class="sa-button sa-secondary"${ssrIncludeBooleanAttr(!!unref(busy)) ? " disabled" : ""}${_scopeId}>Отмена</button><button class="sa-button"${ssrIncludeBooleanAttr(!!unref(busy)) ? " disabled" : ""}${_scopeId}>Удалить фото `);
						_push(ssrRenderComponent(unref(Trash2), { size: 20 }, null, _parent, _scopeId));
						_push(`</button></div>`);
					} else return [
						createVNode("p", null, "Фото будет удалено из вашего профиля. Позже можно загрузить другое."),
						unref(error) ? (openBlock(), createBlock("p", {
							key: 0,
							role: "alert"
						}, toDisplayString(unref(error)), 1)) : createCommentVNode("", true),
						createVNode("div", { class: "sa-actions" }, [createVNode("button", {
							class: "sa-button sa-secondary",
							disabled: !!unref(busy),
							onClick: ($event) => confirmAvatar.value = false
						}, "Отмена", 8, ["disabled", "onClick"]), createVNode("button", {
							class: "sa-button",
							disabled: !!unref(busy),
							onClick: removeAvatar
						}, [createTextVNode("Удалить фото "), createVNode(unref(Trash2), { size: 20 })], 8, ["disabled"])])
					];
				}),
				_: 1
			}, _parent));
			_push(`</div>`);
		};
	}
});
// components/storefront/SiteAccountProfile.vue
var _sfc_setup$2 = SiteAccountProfile_vue_vue_type_script_setup_true_lang_default.setup;
SiteAccountProfile_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/storefront/SiteAccountProfile.vue");
	return _sfc_setup$2 ? _sfc_setup$2(props, ctx) : void 0;
};
var SiteAccountProfile_default = Object.assign(SiteAccountProfile_vue_vue_type_script_setup_true_lang_default, { __name: "SiteAccountProfile" });
// components/storefront/SiteAccountDashboard.vue?vue&type=script&setup=true&lang.ts
var SiteAccountDashboard_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "SiteAccountDashboard",
	__ssrInlineRender: true,
	setup(__props) {
		const config = useRuntimeConfig();
		const route = useRoute();
		const { accessToken, refreshToken, user, authHeaders, loadMe, logout } = useStorefront();
		const { openAuth } = useStorefrontPanels();
		const active = ref("overview"), loading = ref(true), error = ref("");
		const dashboard = ref(null), profile = ref(null);
		const passwordNotice = ref(false);
		const authNotice = ref("");
		const requestedTab = computed(() => typeof route.query.tab === "string" ? route.query.tab : "");
		const requestedPartner = computed(() => ["referrals", "bloggers"].includes(requestedTab.value));
		const partnerTitle = computed(() => requestedTab.value === "bloggers" ? "Кабинет блогера" : "Реферальная программа");
		const isB2C = computed(() => profile.value?.role === "CUSTOMER_B2C");
		const hasLoyalty = computed(() => isB2C.value && !!dashboard.value?.loyalty && dashboard.value.loyalty.isEligible !== false);
		const roleLink = computed(() => profile.value?.role === "CUSTOMER_B2B" ? {
			to: "/b2b",
			label: "Профессиональный кабинет"
		} : {
			to: "/crm/",
			label: "CRM"
		});
		const tabs = computed(() => [
			{
				id: "overview",
				label: "Обзор",
				icon: UserRound
			},
			{
				id: "orders",
				label: "Мои заказы",
				icon: Package
			},
			{
				id: "giftcards",
				label: "Подарочные карты",
				icon: Gift
			},
			...hasLoyalty.value ? [{
				id: "loyalty",
				label: "Бонусы",
				icon: Award
			}] : [],
			...isB2C.value ? [{
				id: "referrals",
				label: "Пригласить друзей",
				icon: Users
			}, {
				id: "bloggers",
				label: "Блогерам",
				icon: Award
			}] : [],
			{
				id: "addresses",
				label: "Адреса",
				icon: MapPin
			},
			{
				id: "profile",
				label: "Мои данные",
				icon: Settings
			},
			{
				id: "notifications",
				label: "Уведомления",
				icon: Bell
			}
		]);
		watch(hasLoyalty, (eligible) => {
			if (!eligible && active.value === "loyalty") active.value = "overview";
		});
		function selectRequestedTab() {
			const requested = requestedTab.value;
			active.value = tabs.value.some((tab) => tab.id === requested) ? requested : "overview";
		}
		function openRequestedEntry() {
			selectRequestedTab();
			if (requestedPartner.value && !accessToken.value) openAuth("login");
		}
		watch(() => route.query.tab, () => {
			if (!loading.value) openRequestedEntry();
		});
		async function load() {
			loading.value = true;
			error.value = "";
			try {
				const hadSession = !!accessToken.value;
				await loadMe();
				if (!accessToken.value) {
					if (hadSession) authNotice.value = "Сеанс завершён. Войдите снова, чтобы открыть кабинет.";
					return;
				}
				const fetchAccount = () => Promise.all([$fetch$1("/storefront/dashboard", {
					baseURL: config.public.apiBase,
					headers: authHeaders.value
				}), $fetch$1("/auth/profile", {
					baseURL: config.public.apiBase,
					headers: authHeaders.value
				})]);
				let values;
				try {
					values = await fetchAccount();
				} catch (exception) {
					if (Number(exception?.statusCode || exception?.status) !== 401 || !refreshToken.value) throw exception;
					const session = await $fetch$1("/auth/refresh", {
						baseURL: config.public.apiBase,
						method: "POST",
						body: { refreshToken: refreshToken.value }
					});
					accessToken.value = session.accessToken;
					refreshToken.value = session.refreshToken;
					await loadMe();
					if (!accessToken.value) return;
					values = await fetchAccount();
				}
				dashboard.value = values[0];
				profile.value = values[1];
				selectRequestedTab();
			} catch (exception) {
				if ([401, 403].includes(Number(exception?.statusCode || exception?.status))) {
					authNotice.value = "Сеанс завершён или нет доступа к профилю. Войдите снова, чтобы открыть кабинет.";
					signOut();
				} else error.value = "Не удалось загрузить кабинет. Попробуйте ещё раз.";
			} finally {
				loading.value = false;
				openRequestedEntry();
			}
		}
		function updateProfile(value) {
			profile.value = {
				...profile.value,
				...value
			};
			if (user.value) user.value = {
				...user.value,
				...value
			};
		}
		function signOut() {
			logout();
			dashboard.value = null;
			profile.value = null;
		}
		function passwordChanged() {
			passwordNotice.value = true;
			signOut();
		}
		watch(accessToken, (token, previous) => {
			if (token && !previous) load();
		});
		const number = (value) => Number(value || 0).toLocaleString("ru-RU");
		return (_ctx, _push, _parent, _attrs) => {
			const _component_NuxtLink = NuxtLink;
			const _component_SiteAccountOrders = SiteAccountOrders_default;
			const _component_SiteAccountGiftCards = SiteAccountGiftCards_default;
			const _component_SitePartnerAccount = SitePartnerAccount_default;
			const _component_SiteAccountAddresses = SiteAccountAddresses_default;
			const _component_SiteAccountNotifications = SiteAccountNotifications_default;
			const _component_SiteAccountProfile = SiteAccountProfile_default;
			_push(`<div${ssrRenderAttrs(mergeProps({ class: "sb-account-page sa-ui sk-account sh-container" }, _attrs))}><header class="sk-masthead"><div>`);
			_push(ssrRenderComponent(_component_NuxtLink, {
				to: "/",
				class: "sk-brand",
				"aria-label": "SARKISIAN — на главную"
			}, {
				default: withCtx((_, _push, _parent, _scopeId) => {
					if (_push) _push(`SARKISIAN`);
					else return [createTextVNode("SARKISIAN")];
				}),
				_: 1
			}, _parent));
			_push(`<h1>Личный<br>кабинет</h1></div><div class="sk-welcome">`);
			if (unref(profile) && unref(accessToken)) _push(`<p class="sk-greeting">${ssrInterpolate(unref(profile).firstName ? `${unref(profile).firstName}, добрый день` : "Добрый день")}</p>`);
			else _push(`<p class="sk-greeting">Ваше пространство<br>SARKISIAN</p>`);
			_push(`<p>${ssrInterpolate(unref(hasLoyalty) ? "Покупки, бонусы и ваши данные — в одном месте." : "Заказы, адреса и ваши данные — в одном месте.")}</p>`);
			if (unref(profile) && !unref(isB2C)) _push(ssrRenderComponent(_component_NuxtLink, {
				to: unref(roleLink).to,
				class: "sa-button"
			}, {
				default: withCtx((_, _push, _parent, _scopeId) => {
					if (_push) {
						_push(`${ssrInterpolate(unref(roleLink).label)} `);
						_push(ssrRenderComponent(unref(ArrowRight), { size: 18 }, null, _parent, _scopeId));
					} else return [createTextVNode(toDisplayString(unref(roleLink).label) + " ", 1), createVNode(unref(ArrowRight), { size: 18 })];
				}),
				_: 1
			}, _parent));
			else _push(ssrRenderComponent(_component_NuxtLink, {
				to: "/catalog",
				class: "sa-button"
			}, {
				default: withCtx((_, _push, _parent, _scopeId) => {
					if (_push) {
						_push(`Продолжить покупки `);
						_push(ssrRenderComponent(unref(ArrowRight), { size: 18 }, null, _parent, _scopeId));
					} else return [createTextVNode("Продолжить покупки "), createVNode(unref(ArrowRight), { size: 18 })];
				}),
				_: 1
			}, _parent));
			_push(`</div></header>`);
			if (unref(loading)) _push(`<div class="sa-panel" role="status">Загружаем личный кабинет…</div>`);
			else if (!unref(accessToken)) {
				_push(`<section class="sa-panel sk-entry"><h2>${ssrInterpolate(unref(requestedPartner) ? unref(partnerTitle) : "Рады видеть вас")}</h2>`);
				if (unref(passwordNotice)) _push(`<p class="sa-feedback" role="status">Пароль изменён. Все сеансы завершены. Войдите с новым паролем.</p>`);
				else if (unref(authNotice)) _push(`<p class="sa-feedback" role="status">${ssrInterpolate(unref(authNotice))}</p>`);
				else if (unref(requestedPartner)) _push(`<p>Войдите или зарегистрируйтесь как частный покупатель. После входа откроется нужный раздел: здесь можно принять условия и получить персональную ссылку.</p>`);
				else _push(`<p>Войдите, чтобы видеть свои заказы, бонусы и сохранённые адреса.</p>`);
				_push(`<div class="sa-actions"><button class="sa-button">Войти `);
				_push(ssrRenderComponent(unref(ArrowRight), { size: 20 }, null, _parent));
				_push(`</button><button class="sa-button sa-secondary">Зарегистрироваться `);
				_push(ssrRenderComponent(unref(ArrowRight), { size: 20 }, null, _parent));
				_push(`</button></div></section>`);
			} else if (unref(error)) {
				_push(`<section class="sa-panel"><p role="alert">${ssrInterpolate(unref(error))}</p><button class="sa-button">Повторить загрузку `);
				_push(ssrRenderComponent(unref(ArrowRight), { size: 20 }, null, _parent));
				_push(`</button></section>`);
			} else if (unref(dashboard) && unref(profile)) {
				_push(`<!--[-->`);
				if (unref(requestedPartner) && !unref(isB2C)) {
					_push(`<section class="sa-panel" role="note"><h2>${ssrInterpolate(unref(partnerTitle))}</h2><p>Этот раздел доступен частным покупателям. Сейчас вы вошли ${ssrInterpolate(unref(profile).role === "CUSTOMER_B2B" ? "как бизнес-клиент" : "как сотрудник")}. Для участия нужен отдельный аккаунт покупателя.</p><button class="sa-button sa-secondary">Сменить аккаунт и войти как покупатель `);
					_push(ssrRenderComponent(unref(ArrowRight), { size: 20 }, null, _parent));
					_push(`</button></section>`);
				} else _push(`<!---->`);
				_push(`<div class="sb-account-layout"><aside class="sk-sidebar"><nav class="sb-account-nav" aria-label="Разделы личного кабинета"><!--[-->`);
				ssrRenderList(unref(tabs), (tab) => {
					_push(`<button class="${ssrRenderClass([{ active: unref(active) === tab.id }, "sa-button"])}"${ssrRenderAttr("aria-current", unref(active) === tab.id ? "page" : void 0)}>`);
					ssrRenderVNode(_push, createVNode(resolveDynamicComponent(tab.icon), {
						size: 18,
						"aria-hidden": "true"
					}, null), _parent);
					_push(`${ssrInterpolate(tab.label)}</button>`);
				});
				_push(`<!--]-->`);
				_push(ssrRenderComponent(_component_NuxtLink, {
					class: "sa-button",
					to: "/courses/my"
				}, {
					default: withCtx((_, _push, _parent, _scopeId) => {
						if (_push) {
							_push(ssrRenderComponent(unref(BookOpen), {
								size: 18,
								"aria-hidden": "true"
							}, null, _parent, _scopeId));
							_push(`Мои курсы`);
						} else return [createVNode(unref(BookOpen), {
							size: 18,
							"aria-hidden": "true"
						}), createTextVNode("Мои курсы")];
					}),
					_: 1
				}, _parent));
				_push(`<button class="sa-button sk-signout">`);
				_push(ssrRenderComponent(unref(LogOut), {
					size: 18,
					"aria-hidden": "true"
				}, null, _parent));
				_push(`Выйти</button></nav><div class="sk-help"><p>Мы рядом, если<br>нужна помощь.</p>`);
				_push(ssrRenderComponent(_component_NuxtLink, { to: "/contacts" }, {
					default: withCtx((_, _push, _parent, _scopeId) => {
						if (_push) {
							_push(`Связаться с нами `);
							_push(ssrRenderComponent(unref(ArrowRight), { size: 16 }, null, _parent, _scopeId));
						} else return [createTextVNode("Связаться с нами "), createVNode(unref(ArrowRight), { size: 16 })];
					}),
					_: 1
				}, _parent));
				_push(`</div></aside><section class="sb-account-content"${ssrRenderAttr("aria-label", unref(tabs).find((tab) => tab.id === unref(active))?.label)}>`);
				if (unref(active) === "overview") {
					_push(`<!--[--><div class="sk-section-heading"><h2>Обзор</h2><span>SARKISIAN / ${ssrInterpolate(unref(hasLoyalty) ? "CLUB" : "ACCOUNT")}</span></div><div class="sa-summary"><article class="sa-panel"><span>Заказы в истории</span>`);
					_push(ssrRenderComponent(unref(Package), {
						size: 20,
						"aria-hidden": "true"
					}, null, _parent));
					_push(`<b>${ssrInterpolate(number(unref(dashboard).summary.orders))}</b></article><article class="sa-panel"><span>Сумма заказов магазина</span>`);
					_push(ssrRenderComponent(unref(Wallet), {
						size: 20,
						"aria-hidden": "true"
					}, null, _parent));
					_push(`<b>${ssrInterpolate(number(unref(dashboard).summary.spent))} ₽</b></article>`);
					if (unref(hasLoyalty)) {
						_push(`<article class="sa-panel sk-club-card"><span>Бонусный баланс</span>`);
						_push(ssrRenderComponent(unref(Award), {
							size: 20,
							"aria-hidden": "true"
						}, null, _parent));
						_push(`<b>${ssrInterpolate(number(unref(dashboard).loyalty.balance))}</b><button class="sk-club-link">Уровень «${ssrInterpolate(unref(dashboard).loyalty.levelLabel)}» `);
						_push(ssrRenderComponent(unref(ArrowRight), { size: 18 }, null, _parent));
						_push(`</button></article>`);
					} else _push(`<!---->`);
					_push(`</div>`);
					_push(ssrRenderComponent(_component_SiteAccountOrders, {
						orders: unref(dashboard).orders.slice(0, 3),
						title: "Последние заказы",
						onUpdated: load
					}, null, _parent));
					if (unref(dashboard).orders.length > 3) {
						_push(`<button class="sa-button sa-secondary">Все заказы `);
						_push(ssrRenderComponent(unref(ArrowRight), { size: 20 }, null, _parent));
						_push(`</button>`);
					} else _push(`<!---->`);
					_push(`<!--]-->`);
				} else if (unref(active) === "orders") _push(ssrRenderComponent(_component_SiteAccountOrders, {
					orders: unref(dashboard).orders,
					title: "Мои заказы",
					onUpdated: load
				}, null, _parent));
				else if (unref(active) === "giftcards") _push(ssrRenderComponent(_component_SiteAccountGiftCards, { cards: unref(dashboard).giftCards || [] }, null, _parent));
				else if (unref(active) === "referrals" && unref(isB2C)) _push(ssrRenderComponent(_component_SitePartnerAccount, { kind: "REFERRAL" }, null, _parent));
				else if (unref(active) === "bloggers" && unref(isB2C)) _push(ssrRenderComponent(_component_SitePartnerAccount, { kind: "BLOGGER" }, null, _parent));
				else if (unref(active) === "loyalty" && unref(hasLoyalty)) {
					_push(`<section class="sa-panel"><p class="sa-eyebrow">${ssrInterpolate(unref(dashboard).loyalty.programName || "SARKISIAN CLUB")}</p><h2>${ssrInterpolate(number(unref(dashboard).loyalty.balance))} бонусов</h2><p>Ваш уровень: ${ssrInterpolate(unref(dashboard).loyalty.levelLabel)}.</p>`);
					if (unref(dashboard).loyalty.isEnabled === false) _push(`<p class="sa-feedback" role="status">Бонусная программа временно отключена. Ваш баланс и история сохранены.</p>`);
					else if (unref(dashboard).loyalty.earnPercent != null) _push(`<p>Базовое начисление — ${ssrInterpolate(unref(dashboard).loyalty.earnPercent)}% от покупки. Бонусами можно оплатить до ${ssrInterpolate(unref(dashboard).loyalty.maxWriteOffPercent)}% суммы заказа по условиям клуба.</p>`);
					else _push(`<!---->`);
					_push(`<div class="sa-progress" role="progressbar" aria-label="Прогресс уровня клуба"${ssrRenderAttr("aria-valuenow", Math.max(0, Math.min(100, unref(dashboard).loyalty.progress)))}${ssrRenderAttr("aria-valuemin", 0)}${ssrRenderAttr("aria-valuemax", 100)}><span style="${ssrRenderStyle({ width: `${Math.max(0, Math.min(100, unref(dashboard).loyalty.progress))}%` })}"></span></div>`);
					if (unref(dashboard).loyalty.nextLevelLabel) _push(`<p class="sa-muted">До уровня «${ssrInterpolate(unref(dashboard).loyalty.nextLevelLabel)}» — ${ssrInterpolate(number(unref(dashboard).loyalty.toNextLevel))} бонусов.</p>`);
					else _push(`<!---->`);
					_push(ssrRenderComponent(_component_NuxtLink, {
						to: "/club",
						class: "sa-button sa-secondary"
					}, {
						default: withCtx((_, _push, _parent, _scopeId) => {
							if (_push) {
								_push(`О клубе `);
								_push(ssrRenderComponent(unref(ArrowRight), { size: 20 }, null, _parent, _scopeId));
							} else return [createTextVNode("О клубе "), createVNode(unref(ArrowRight), { size: 20 })];
						}),
						_: 1
					}, _parent));
					_push(`<h3>История бонусов</h3>`);
					if (!unref(dashboard).loyalty.entries?.length) _push(`<p class="sa-muted">Начисления и списания появятся здесь.</p>`);
					else {
						_push(`<div><!--[-->`);
						ssrRenderList(unref(dashboard).loyalty.entries, (entry) => {
							_push(`<article class="sa-history"><div>${ssrInterpolate(entry.reason || "Изменение бонусного баланса")}<small>${ssrInterpolate(new Date(entry.createdAt).toLocaleDateString("ru-RU"))}</small></div><b>${ssrInterpolate(entry.amount > 0 ? "+" : "")}${ssrInterpolate(number(entry.amount))}</b></article>`);
						});
						_push(`<!--]--></div>`);
					}
					_push(`</section>`);
				} else if (unref(active) === "addresses") _push(ssrRenderComponent(_component_SiteAccountAddresses, {
					addresses: unref(dashboard).addresses,
					profile: unref(profile),
					onUpdated: ($event) => unref(dashboard).addresses = $event
				}, null, _parent));
				else if (unref(active) === "notifications") _push(ssrRenderComponent(_component_SiteAccountNotifications, { onUpdated: updateProfile }, null, _parent));
				else _push(ssrRenderComponent(_component_SiteAccountProfile, {
					profile: unref(profile),
					onUpdated: updateProfile,
					onPasswordChanged: passwordChanged
				}, null, _parent));
				_push(`</section></div><!--]-->`);
			} else _push(`<!---->`);
			_push(`</div>`);
		};
	}
});
// components/storefront/SiteAccountDashboard.vue
var _sfc_setup$1 = SiteAccountDashboard_vue_vue_type_script_setup_true_lang_default.setup;
SiteAccountDashboard_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/storefront/SiteAccountDashboard.vue");
	return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
var SiteAccountDashboard_default = Object.assign(SiteAccountDashboard_vue_vue_type_script_setup_true_lang_default, { __name: "SiteAccountDashboard" });
// pages/account.vue?vue&type=script&setup=true&lang.ts
var account_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "account",
	__ssrInlineRender: true,
	setup(__props) {
		useSeoMeta({
			title: "Личный кабинет — SARKISIAN BRAND",
			robots: "noindex, nofollow"
		});
		return (_ctx, _push, _parent, _attrs) => {
			_push(ssrRenderComponent(SiteShell_default, mergeProps({
				editorial: "",
				account: ""
			}, _attrs), {
				default: withCtx((_, _push, _parent, _scopeId) => {
					if (_push) _push(ssrRenderComponent(SiteAccountDashboard_default, null, null, _parent, _scopeId));
					else return [createVNode(SiteAccountDashboard_default)];
				}),
				_: 1
			}, _parent));
		};
	}
});
// pages/account.vue
var _sfc_setup = account_vue_vue_type_script_setup_true_lang_default.setup;
account_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/account.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var account_default = account_vue_vue_type_script_setup_true_lang_default;

export { account_default as default };;globalThis.__timing__.logEnd('Load chunks/build/account-BY9D6eF4');
//# sourceMappingURL=account-BY9D6eF4.mjs.map
