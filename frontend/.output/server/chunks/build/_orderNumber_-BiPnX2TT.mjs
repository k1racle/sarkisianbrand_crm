globalThis.__timing__.logStart('Load chunks/build/_orderNumber_-BiPnX2TT');import { c as useRoute, p as useStorefront, q as useStorefrontPanels, S as SiteShell_default, N as NuxtLink, $ as $fetch$1, f as useRuntimeConfig } from '../virtual/entry.mjs';
import { u as useStorefrontSeo } from './useStorefrontSeo-DvgEOsDg.mjs';
import { u as usePaymentProviders, P as PaymentProviderSelect_default, s as submitRobokassaCourseForm, o as officialPaymentUrl } from './usePaymentProviders-CQ8-qJn6.mjs';
import { defineComponent, ref, computed, watch, withCtx, createTextVNode, unref, createVNode, isRef, toDisplayString, openBlock, createBlock, Fragment, createCommentVNode, renderList, useSSRContext } from 'vue';
import { ssrRenderComponent, ssrInterpolate, ssrRenderList, ssrIncludeBooleanAttr } from 'vue/server-renderer';
import { LockKeyhole, ArrowRight, RefreshCw, CheckCircle2, Package, Clock3, UserRound, Mail, MapPin, CreditCard, Copy } from '@lucide/vue';
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

// pages/orders/[orderNumber].vue?vue&type=script&setup=true&lang.ts
var _orderNumber__vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "[orderNumber]",
	__ssrInlineRender: true,
	setup(__props) {
		const route = useRoute(), config = useRuntimeConfig();
		const { authHeaders, accessToken } = useStorefront();
		const { openAuth } = useStorefrontPanels();
		const order = ref(null), loading = ref(true), paying = ref(false), error = ref(""), paymentError = ref(""), notice = ref("");
		const coursePaymentMode = computed(() => order.value?.sourceChannel === "COURSE" || order.value?.priceSnapshot?.kind === "COURSE" || Boolean(order.value?.items?.length && order.value.items.every((item) => item.productType === "COURSE")));
		const { available: availablePaymentProviders, selected: selectedPaymentProvider, pending: capabilityPending, error: paymentAvailabilityError, load: loadPaymentProviders } = usePaymentProviders(coursePaymentMode);
		const now = ref(Date.now());
		const orderNumber = computed(() => String(route.params.orderNumber || ""));
		const validNumber = computed(() => /^[A-Za-z0-9_-]{1,100}$/.test(orderNumber.value));
		const labels = {
			NEW: "Заказ принят",
			CONFIRMED: "Заказ подтверждён",
			PAYMENT_WAITING: "Ожидает оплаты",
			PAID: "Оплачен",
			PROCESSING: "В обработке",
			ASSEMBLING: "Собираем заказ",
			READY: "Готов к отправке",
			SHIPPED: "Передан в доставку",
			DELIVERED: "Доставлен",
			COMPLETED: "Завершён",
			CANCELLED: "Отменён",
			CANCELED: "Отменён",
			RETURNED: "Возвращён",
			REFUNDED: "Возврат оформлен"
		};
		const paid = computed(() => ["PAID", "SUCCEEDED"].includes(order.value?.paymentStatus) || order.value?.status === "PAID");
		const confirmed = computed(() => order.value?.deliveryConfirmed === true || order.value?.priceSnapshot?.deliveryConfirmed === true);
		const reservationExpires = computed(() => Date.parse(order.value?.reservationExpiresAt || ""));
		const reservationActive = computed(() => order.value?.reservationState === "ACTIVE" && Number.isFinite(reservationExpires.value) && reservationExpires.value > now.value);
		const activePayments = computed(() => coursePaymentMode.value && Array.isArray(order.value?.payments) ? order.value.payments.filter((payment) => [
			"CREATING",
			"PENDING",
			"SUCCEEDED"
		].includes(payment?.status)) : []);
		const activePayment = computed(() => activePayments.value.length === 1 ? activePayments.value[0] : null);
		const paymentProviders = computed(() => !activePayments.value.length ? availablePaymentProviders.value : activePayment.value ? availablePaymentProviders.value.filter((item) => item.provider === activePayment.value.provider) : []);
		const activePaymentNeedsReview = computed(() => activePayments.value.length > 1 || Boolean(activePayment.value && (activePayment.value.needsReview === true || activePayment.value.retryAllowed !== true || !reservationActive.value || !capabilityPending.value && !paymentProviders.value.length)));
		const reviewPaidCourse = computed(() => coursePaymentMode.value && order.value?.paymentStatus === "SUCCEEDED" && order.value?.priceSnapshot?.coursePaymentReview === true);
		const payable = computed(() => Boolean(order.value && !paid.value && [
			"NEW",
			"CONFIRMED",
			"PAYMENT_WAITING"
		].includes(order.value.status) && reservationActive.value && confirmed.value && order.value.canPay !== false && Number.isFinite(Number(order.value.finalAmount)) && Number(order.value.finalAmount) > 0));
		const canPay = computed(() => payable.value && !activePaymentNeedsReview.value && paymentProviders.value.some((item) => item.provider === selectedPaymentProvider.value) && !loading.value && !paying.value && !capabilityPending.value);
		const statusLabel = computed(() => reviewPaidCourse.value ? "Оплата на проверке" : courseOrder.value && paid.value ? "Оплачен" : labels[order.value?.status] || "Статус уточняется");
		const deliveryAddress = computed(() => {
			const value = order.value?.shippingAddress;
			return value && typeof value === "object" ? [value.city, value.address || [
				value.street,
				value.house,
				value.apartment
			].filter(Boolean).join(", ")].filter(Boolean).join(", ") : "";
		});
		const snapshot = computed(() => order.value?.priceSnapshot || {});
		const courseOrder = computed(() => order.value?.sourceChannel === "COURSE" || snapshot.value.kind === "COURSE" || Boolean(order.value?.items?.length && order.value.items.every((item) => item.productType === "COURSE")));
		const courseAccessReady = computed(() => courseOrder.value && paid.value && !reviewPaidCourse.value && order.value?.status === "DELIVERED");
		const digitalDelivery = computed(() => !courseOrder.value && (snapshot.value.digitalDelivery === true || Boolean(order.value?.items?.length && order.value.items.every((item) => item.productType === "GIFT_CARD"))));
		const issuedCards = computed(() => paid.value && digitalDelivery.value && Array.isArray(order.value?.giftCards) ? order.value.giftCards.filter((card) => typeof card.code === "string" && /^(?:[A-Fa-f0-9]{32}|[A-Fa-f0-9]{8}(?:-[A-Fa-f0-9]{8}){3})$/.test(card.code)) : []);
		const copyNotice = ref("");
		const remainingMinutes = computed(() => Math.max(0, Math.ceil((reservationExpires.value - now.value) / 6e4)));
		useStorefrontSeo({
			title: () => "Заказ — SARKISIAN BRAND",
			noindex: true
		});
		function money(value) {
			const amount = Number(value);
			return value === null || value === void 0 || !Number.isFinite(amount) ? "Уточняется" : amount.toLocaleString("ru-RU", { maximumFractionDigits: 2 }) + " ₽";
		}
		function cardExpiry(value) {
			const date = typeof value === "string" ? new Date(value) : null;
			return date && Number.isFinite(date.getTime()) ? date.toLocaleDateString("ru-RU") : "Срок уточняется";
		}
		async function copyGiftCode(card) {
			copyNotice.value = "";
			if (!issuedCards.value.includes(card)) return;
			try {
				await (void 0).clipboard.writeText(card.code);
				copyNotice.value = "Код скопирован. Не передавайте его посторонним.";
			} catch {
				copyNotice.value = "Не удалось скопировать автоматически. Выделите код и скопируйте его вручную.";
			}
		}
		function protectedHeaders() {
			return {
				...authHeaders.value,
				...{},
				"Cache-Control": "no-cache"
			};
		}
		function friendlyError(e) {
			const status = Number(e?.statusCode || e?.response?.status || e?.data?.statusCode);
			if ([
				401,
				403,
				404
			].includes(status)) return "Заказ не найден или недоступен. Войдите в аккаунт, с которого он оформлен, либо откройте заказ в том же браузере.";
			const message = e?.data?.message;
			return Array.isArray(message) ? message.join(". ") : typeof message === "string" ? message : "Не удалось обновить заказ. Попробуйте ещё раз.";
		}
		async function loadOrder(showLoading = true) {}
		async function loadCapability() {
			await loadPaymentProviders();
		}
		async function pay() {
			if (!canPay.value || !selectedPaymentProvider.value) return;
			const provider = selectedPaymentProvider.value;
			paying.value = true;
			paymentError.value = "";
			try {
				await loadOrder();
				await loadPaymentProviders(true);
				now.value = Date.now();
				if (!payable.value) return;
				if (activePaymentNeedsReview.value || !paymentProviders.value.some((item) => item.provider === provider) || selectedPaymentProvider.value !== provider) {
					paymentError.value = paymentAvailabilityError.value || "Платёж требует проверки. Обновите статус или обратитесь в поддержку.";
					return;
				}
				const payment = await $fetch$1("/payments/orders/" + encodeURIComponent(orderNumber.value), {
					baseURL: config.public.apiBase,
					method: "POST",
					headers: protectedHeaders(),
					body: {
						returnUrl: (void 0).location.origin + "/orders/" + encodeURIComponent(orderNumber.value),
						provider
					},
					timeout: 2e4,
					retry: 0
				});
				if (coursePaymentMode.value && provider === "ROBOKASSA") {
					if (!payment.confirmationForm || payment.confirmationUrl) throw new Error("Получена некорректная форма оплаты. Заказ сохранён, обратитесь в поддержку.");
					submitRobokassaCourseForm(payment.confirmationForm, payment.provider, provider);
					return;
				}
				if (payment.confirmationForm) throw new Error("Получена некорректная форма оплаты. Заказ сохранён, обратитесь в поддержку.");
				if (payment.confirmationUrl) {
					(void 0).location.assign(officialPaymentUrl(payment.confirmationUrl, payment.provider, provider));
					return;
				}
				await loadOrder();
				if (!paid.value) notice.value = "Статус платежа ещё подтверждается. Обновите заказ через несколько секунд.";
			} catch (e) {
				paymentError.value = e?.message?.startsWith("Получена") ? e.message : friendlyError(e);
			} finally {
				paying.value = false;
			}
		}
		async function retry() {
			if (!paying.value) await Promise.all([loadOrder(), loadCapability()]);
		}
		watch(orderNumber, () => {});
		watch(accessToken, () => {});
		watch(paymentProviders, (providers) => {
			if (!providers.some((item) => item.provider === selectedPaymentProvider.value)) selectedPaymentProvider.value = providers[0]?.provider || "";
		}, { immediate: true });
		return (_ctx, _push, _parent, _attrs) => {
			const _component_SiteShell = SiteShell_default;
			const _component_NuxtLink = NuxtLink;
			const _component_PaymentProviderSelect = PaymentProviderSelect_default;
			_push(ssrRenderComponent(_component_SiteShell, _attrs, {
				default: withCtx((_, _push, _parent, _scopeId) => {
					if (_push) {
						_push(`<div class="sb-order-page sb-cart-page"${_scopeId}><div class="sb-breadcrumbs"${_scopeId}>`);
						_push(ssrRenderComponent(_component_NuxtLink, { to: "/" }, {
							default: withCtx((_, _push, _parent, _scopeId) => {
								if (_push) _push(`Главная`);
								else return [createTextVNode("Главная")];
							}),
							_: 1
						}, _parent, _scopeId));
						_push(`<span${_scopeId}>/</span><span${_scopeId}>Заказ</span></div><header class="sb-page-title sb-checkout-heading"${_scopeId}><div${_scopeId}><p${_scopeId}>ВАШ ЗАКАЗ</p><h1${_scopeId}>${ssrInterpolate(unref(validNumber) ? "Заказ " + unref(orderNumber) : "Заказ")}</h1></div></header>`);
						if (unref(loading)) _push(`<div class="sb-state" role="status"${_scopeId}>Загружаем защищённые данные заказа…</div>`);
						else if (unref(error) || !unref(order)) {
							_push(`<section class="sb-checkout-panel sb-order-access"${_scopeId}>`);
							_push(ssrRenderComponent(unref(LockKeyhole), { size: 32 }, null, _parent, _scopeId));
							_push(`<h2${_scopeId}>Защищённый доступ к заказу</h2><p role="alert"${_scopeId}>${ssrInterpolate(unref(error))}</p><div class="sb-order-actions"${_scopeId}><button class="sb-primary"${_scopeId}>Войти `);
							_push(ssrRenderComponent(unref(ArrowRight), { size: 18 }, null, _parent, _scopeId));
							_push(`</button><button class="sb-checkout-secondary"${_scopeId}>Повторить `);
							_push(ssrRenderComponent(unref(RefreshCw), { size: 18 }, null, _parent, _scopeId));
							_push(`</button></div>`);
							_push(ssrRenderComponent(_component_NuxtLink, {
								to: "/catalog",
								class: "sb-checkout-text"
							}, {
								default: withCtx((_, _push, _parent, _scopeId) => {
									if (_push) _push(`Вернуться в каталог`);
									else return [createTextVNode("Вернуться в каталог")];
								}),
								_: 1
							}, _parent, _scopeId));
							_push(`</section>`);
						} else {
							_push(`<!--[-->`);
							if (unref(notice)) _push(`<p class="sb-checkout-note" role="status"${_scopeId}>${ssrInterpolate(unref(notice))}</p>`);
							else _push(`<!---->`);
							_push(`<div class="sb-checkout-flow"${_scopeId}><div class="sb-checkout-stage sb-order-details"${_scopeId}><section class="sb-checkout-panel"${_scopeId}><h2${_scopeId}>`);
							if (unref(paid)) _push(ssrRenderComponent(unref(CheckCircle2), { size: 24 }, null, _parent, _scopeId));
							else _push(ssrRenderComponent(unref(Package), { size: 24 }, null, _parent, _scopeId));
							_push(` ${ssrInterpolate(unref(statusLabel))}</h2><p${_scopeId}>${ssrInterpolate(unref(reviewPaidCourse) ? "Оплата подтверждена. Проверяем данные заказа перед открытием доступа; повторная оплата не нужна. Если доступ долго не появляется, обратитесь в поддержку." : unref(paid) ? "Оплата подтверждена сервером. Спасибо за покупку!" : "Заказ сохранён. Здесь отображается актуальный статус, полученный с сервера.")}</p>`);
							if (!unref(confirmed) && !unref(courseOrder)) _push(`<p class="sb-checkout-note"${_scopeId}>Способ получения и стоимость доставки требуют подтверждения. Пока итог не согласован, оплатить заказ нельзя.</p>`);
							else _push(`<!---->`);
							if (!unref(confirmed) && unref(courseOrder)) _push(`<p class="sb-checkout-note"${_scopeId}>Условия заказа ещё не подтверждены. Обновите статус перед оплатой.</p>`);
							else _push(`<!---->`);
							if (unref(reservationActive) && !unref(paid)) {
								_push(`<p class="sb-checkout-hint"${_scopeId}>`);
								_push(ssrRenderComponent(unref(Clock3), { size: 18 }, null, _parent, _scopeId));
								_push(` ${ssrInterpolate(unref(courseOrder) ? `На оплату осталось примерно ${unref(remainingMinutes)} мин.` : `Товары зарезервированы ещё примерно на ${unref(remainingMinutes)} мин.`)}</p>`);
							} else if (!unref(paid) && !unref(activePayments).length && [
								"NEW",
								"CONFIRMED",
								"PAYMENT_WAITING"
							].includes(unref(order).status)) _push(`<p class="sb-checkout-note"${_scopeId}>${ssrInterpolate(unref(courseOrder) ? "Срок оплаты заказа истёк. Вернитесь на страницу курса, чтобы оформить новый заказ." : "Действующий резерв отсутствует или истёк. Перед оплатой требуется проверка наличия сотрудником.")}</p>`);
							else _push(`<!---->`);
							if (!unref(courseOrder) && !unref(digitalDelivery) && unref(customerWarehouseApplies)(unref(order))) {
								_push(`<section class="sb-order-warehouse" aria-label="Обработка заказа на складе"${_scopeId}><h3${_scopeId}>Обработка на складе</h3><p role="status"${_scopeId}>${ssrInterpolate(unref(customerWarehouseLabel)(unref(order).warehouseStatus))}</p>`);
								if (unref(customerWarehouseAsOf)(unref(order).warehouseStatus)) _push(`<small${_scopeId}>Подтверждено ${ssrInterpolate(unref(customerWarehouseAsOf)(unref(order).warehouseStatus))}</small>`);
								else _push(`<!---->`);
								_push(`</section>`);
							} else _push(`<!---->`);
							_push(`</section><section class="sb-checkout-panel"${_scopeId}><h2${_scopeId}>`);
							_push(ssrRenderComponent(unref(UserRound), { size: 20 }, null, _parent, _scopeId));
							_push(` Получатель</h2>`);
							if (unref(order).buyerName) _push(`<p${_scopeId}>${ssrInterpolate(unref(order).buyerName)}</p>`);
							else _push(`<!---->`);
							if (unref(order).buyerEmail) _push(`<p${_scopeId}>${ssrInterpolate(unref(order).buyerEmail)}</p>`);
							else _push(`<!---->`);
							if (unref(order).buyerPhone) _push(`<p${_scopeId}>${ssrInterpolate(unref(order).buyerPhone)}</p>`);
							else _push(`<!---->`);
							if (!unref(courseOrder)) {
								_push(`<!--[--><h2 class="sb-order-delivery-title"${_scopeId}>`);
								if (unref(digitalDelivery)) _push(ssrRenderComponent(unref(Mail), { size: 20 }, null, _parent, _scopeId));
								else _push(ssrRenderComponent(unref(MapPin), { size: 20 }, null, _parent, _scopeId));
								_push(` ${ssrInterpolate(unref(digitalDelivery) ? "Получение карты" : "Доставка")}</h2><p${_scopeId}>${ssrInterpolate(unref(digitalDelivery) ? "Электронная карта · " + (unref(order).buyerEmail || "Email указан при оформлении") : unref(deliveryAddress) || "Адрес уточняется")}</p>`);
								if (!unref(digitalDelivery) && unref(order).shippingAddress?.pickupPointName) _push(`<p${_scopeId}>${ssrInterpolate(unref(order).shippingAddress.pickupPointName)}</p>`);
								else _push(`<!---->`);
								_push(`<!--]-->`);
							} else _push(`<!---->`);
							if (unref(order).comments) _push(`<p${_scopeId}>${ssrInterpolate(unref(order).comments)}</p>`);
							else _push(`<!---->`);
							_push(`</section>`);
							if (unref(courseOrder)) {
								_push(`<section class="sb-checkout-panel"${_scopeId}><h2${_scopeId}>Доступ к курсу</h2>`);
								if (unref(reviewPaidCourse)) _push(`<p${_scopeId}>Откроем доступ после проверки данных заказа.</p>`);
								else if (unref(courseAccessReady)) _push(`<p${_scopeId}>Оплата подтверждена. Проверьте доступ в разделе «Мои курсы».</p>`);
								else if (unref(paid)) _push(`<p${_scopeId}>Оплата подтверждена. Доступ к курсу подготавливается.</p>`);
								else _push(`<p${_scopeId}>После подтверждения оплаты курс появится в разделе «Мои курсы» этого аккаунта.</p>`);
								if (unref(courseAccessReady)) _push(ssrRenderComponent(_component_NuxtLink, {
									to: "/courses/my",
									class: "sb-checkout-text"
								}, {
									default: withCtx((_, _push, _parent, _scopeId) => {
										if (_push) {
											_push(`Мои курсы `);
											_push(ssrRenderComponent(unref(ArrowRight), { size: 18 }, null, _parent, _scopeId));
										} else return [createTextVNode("Мои курсы "), createVNode(unref(ArrowRight), { size: 18 })];
									}),
									_: 1
								}, _parent, _scopeId));
								else _push(`<!---->`);
								_push(`</section>`);
							} else _push(`<!---->`);
							if (unref(digitalDelivery)) {
								_push(`<section class="sb-checkout-panel sb-order-gift-cards"${_scopeId}><h2${_scopeId}>`);
								_push(ssrRenderComponent(unref(CreditCard), { size: 20 }, null, _parent, _scopeId));
								_push(` Подарочные карты</h2>`);
								if (!unref(paid)) _push(`<p${_scopeId}>Коды появятся здесь после подтверждения оплаты сервером.</p>`);
								else if (!unref(issuedCards).length) _push(`<p${_scopeId}>Оплата подтверждена. Карты ещё подготавливаются — обновите статус через несколько секунд.</p>`);
								else {
									_push(`<div class="sb-order-gift-list"${_scopeId}><!--[-->`);
									ssrRenderList(unref(issuedCards), (card, index) => {
										_push(`<article class="sb-order-gift-card"${_scopeId}><strong${_scopeId}>Подарочная карта ${ssrInterpolate(money(card.faceValue ?? card.nominal))}</strong><p${_scopeId}>Баланс: ${ssrInterpolate(money(card.balance))} · Действует до ${ssrInterpolate(cardExpiry(card.expiresAt))}</p><code${_scopeId}>${ssrInterpolate(card.code)}</code><button type="button" class="sb-checkout-secondary"${_scopeId}>Скопировать код `);
										_push(ssrRenderComponent(unref(Copy), { size: 18 }, null, _parent, _scopeId));
										_push(`</button></article>`);
									});
									_push(`<!--]--></div>`);
								}
								if (unref(copyNotice)) _push(`<p class="sb-checkout-hint" role="status"${_scopeId}>${ssrInterpolate(unref(copyNotice))}</p>`);
								else _push(`<!---->`);
								if (unref(issuedCards).length) _push(`<p class="sb-checkout-hint"${_scopeId}>Код позволяет использовать баланс карты. Храните его как платёжные данные.</p>`);
								else _push(`<!---->`);
								_push(`</section>`);
							} else _push(`<!---->`);
							_push(`<section class="sb-checkout-panel"${_scopeId}><h2${_scopeId}>`);
							_push(ssrRenderComponent(unref(Package), { size: 20 }, null, _parent, _scopeId));
							_push(` Состав заказа</h2><div class="sb-order-items"${_scopeId}><!--[-->`);
							ssrRenderList(unref(order).items, (item, index) => {
								_push(`<article${_scopeId}><div${_scopeId}><b${_scopeId}>${ssrInterpolate(item.productName || item.variant?.product?.nameRu || "Товар")}</b><small${_scopeId}>${ssrInterpolate(item.variantName || item.variant?.name)}`);
								if (item.externalSku || item.variant?.sku) _push(`<!--[--> · ${ssrInterpolate(item.externalSku || item.variant?.sku)}<!--]-->`);
								else _push(`<!---->`);
								_push(`</small><span${_scopeId}>${ssrInterpolate(item.quantity)} шт. × ${ssrInterpolate(money(item.price))}</span></div><strong${_scopeId}>${ssrInterpolate(money(item.total ?? Number(item.price) * item.quantity))}</strong></article>`);
							});
							_push(`<!--]--></div></section></div><aside class="sb-checkout-summary sb-checkout-panel sb-order-summary"${_scopeId}><p class="sb-kicker"${_scopeId}>${ssrInterpolate(unref(confirmed) ? "ИТОГО" : "ПРЕДВАРИТЕЛЬНАЯ СУММА")}</p><h2${_scopeId}>${ssrInterpolate(money(unref(order).finalAmount))}</h2>`);
							if (unref(snapshot).subtotal !== void 0 || unref(order).totalAmount !== void 0) _push(`<div${_scopeId}><span${_scopeId}>${ssrInterpolate(unref(courseOrder) ? "Курс" : "Товары")}</span><b${_scopeId}>${ssrInterpolate(money(unref(snapshot).subtotal ?? unref(order).totalAmount))}</b></div>`);
							else _push(`<!---->`);
							if (Number(unref(snapshot).discount ?? unref(order).discountAmount) > 0) _push(`<div${_scopeId}><span${_scopeId}>Скидка</span><b${_scopeId}>−${ssrInterpolate(money(unref(snapshot).discount ?? unref(order).discountAmount))}</b></div>`);
							else _push(`<!---->`);
							if (Number(unref(snapshot).bonusAmount) > 0) _push(`<div${_scopeId}><span${_scopeId}>Списание бонусов</span><b${_scopeId}>−${ssrInterpolate(money(unref(snapshot).bonusAmount))}</b></div>`);
							else _push(`<!---->`);
							if (Number(unref(snapshot).giftCardAmount ?? unref(order).giftCardAmount) > 0) _push(`<div${_scopeId}><span${_scopeId}>Подарочная карта</span><b${_scopeId}>−${ssrInterpolate(money(unref(snapshot).giftCardAmount ?? unref(order).giftCardAmount))}</b></div>`);
							else _push(`<!---->`);
							if (!unref(courseOrder)) _push(`<div${_scopeId}><span${_scopeId}>${ssrInterpolate(unref(digitalDelivery) ? "Электронная доставка" : "Доставка")}</span><b${_scopeId}>${ssrInterpolate(unref(confirmed) ? money(unref(snapshot).shippingAmount ?? unref(order).shippingCost) : "Требует подтверждения")}</b></div>`);
							else _push(`<!---->`);
							if (!unref(confirmed)) _push(`<p${_scopeId}>Окончательную сумму подтвердим до оплаты.</p>`);
							else _push(`<!---->`);
							if (unref(reviewPaidCourse)) _push(`<p class="sb-checkout-note" role="status"${_scopeId}>Оплата подтверждена. Заказ на проверке.</p>`);
							else if (unref(paid)) _push(`<p class="sb-checkout-note" role="status"${_scopeId}>Оплачено</p>`);
							else {
								_push(`<!--[-->`);
								if (unref(activePayments).length && unref(activePaymentNeedsReview)) _push(`<p class="sb-checkout-note" role="status"${_scopeId}>Платёж уже начат и требует сверки. Обновите статус или обратитесь в поддержку; повторно оформлять заказ не нужно.</p>`);
								else if (unref(activePayment)) _push(`<p class="sb-checkout-hint"${_scopeId}>Платёж уже начат. Продолжите оплату выбранным способом.</p>`);
								else _push(`<!---->`);
								if (unref(payable) && !unref(activePaymentNeedsReview) && unref(paymentProviders).length) _push(ssrRenderComponent(_component_PaymentProviderSelect, {
									modelValue: unref(selectedPaymentProvider),
									"onUpdate:modelValue": ($event) => isRef(selectedPaymentProvider) ? selectedPaymentProvider.value = $event : null,
									providers: unref(paymentProviders),
									disabled: unref(paying) || unref(loading) || unref(capabilityPending),
									name: "order-payment-provider"
								}, null, _parent, _scopeId));
								else _push(`<!---->`);
								if (unref(payable) && !unref(activePaymentNeedsReview)) {
									_push(`<button class="sb-primary"${ssrIncludeBooleanAttr(!unref(canPay)) ? " disabled" : ""}${_scopeId}>${ssrInterpolate(unref(paying) ? "Открываем оплату…" : "Оплатить заказ")} `);
									_push(ssrRenderComponent(unref(CreditCard), { size: 18 }, null, _parent, _scopeId));
									_push(`</button>`);
								} else _push(`<!---->`);
								if (unref(capabilityPending)) _push(`<p role="status"${_scopeId}>Проверяем доступность оплаты…</p>`);
								else if (unref(payable) && !unref(paymentProviders).length && !unref(activePaymentNeedsReview)) _push(`<p class="sb-checkout-hint"${_scopeId}>${ssrInterpolate(unref(paymentAvailabilityError) || "Онлайн-оплата пока недоступна. Заказ сохранён без списания денег.")}</p>`);
								else _push(`<!---->`);
								_push(`<!--]-->`);
							}
							if (unref(paymentError)) _push(`<p class="sb-form-error" role="alert"${_scopeId}>${ssrInterpolate(unref(paymentError))}</p>`);
							else _push(`<!---->`);
							_push(`<button class="sb-checkout-secondary"${ssrIncludeBooleanAttr(unref(paying) || unref(loading)) ? " disabled" : ""}${_scopeId}>Обновить статус `);
							_push(ssrRenderComponent(unref(RefreshCw), { size: 18 }, null, _parent, _scopeId));
							_push(`</button>`);
							if (unref(accessToken)) _push(ssrRenderComponent(_component_NuxtLink, {
								to: "/account",
								class: "sb-checkout-text"
							}, {
								default: withCtx((_, _push, _parent, _scopeId) => {
									if (_push) _push(`Мои заказы`);
									else return [createTextVNode("Мои заказы")];
								}),
								_: 1
							}, _parent, _scopeId));
							else _push(`<!---->`);
							_push(ssrRenderComponent(_component_NuxtLink, {
								to: "/catalog",
								class: "sb-checkout-text"
							}, {
								default: withCtx((_, _push, _parent, _scopeId) => {
									if (_push) _push(`Продолжить покупки`);
									else return [createTextVNode("Продолжить покупки")];
								}),
								_: 1
							}, _parent, _scopeId));
							_push(`<small${_scopeId}>Номер заказа не заменяет защищённый доступ. Не передавайте доступ к браузеру посторонним.</small></aside></div><!--]-->`);
						}
						_push(`</div>`);
					} else return [createVNode("div", { class: "sb-order-page sb-cart-page" }, [
						createVNode("div", { class: "sb-breadcrumbs" }, [
							createVNode(_component_NuxtLink, { to: "/" }, {
								default: withCtx(() => [createTextVNode("Главная")]),
								_: 1
							}),
							createVNode("span", null, "/"),
							createVNode("span", null, "Заказ")
						]),
						createVNode("header", { class: "sb-page-title sb-checkout-heading" }, [createVNode("div", null, [createVNode("p", null, "ВАШ ЗАКАЗ"), createVNode("h1", null, toDisplayString(unref(validNumber) ? "Заказ " + unref(orderNumber) : "Заказ"), 1)])]),
						unref(loading) ? (openBlock(), createBlock("div", {
							key: 0,
							class: "sb-state",
							role: "status"
						}, "Загружаем защищённые данные заказа…")) : unref(error) || !unref(order) ? (openBlock(), createBlock("section", {
							key: 1,
							class: "sb-checkout-panel sb-order-access"
						}, [
							createVNode(unref(LockKeyhole), { size: 32 }),
							createVNode("h2", null, "Защищённый доступ к заказу"),
							createVNode("p", { role: "alert" }, toDisplayString(unref(error)), 1),
							createVNode("div", { class: "sb-order-actions" }, [createVNode("button", {
								class: "sb-primary",
								onClick: ($event) => unref(openAuth)("login")
							}, [createTextVNode("Войти "), createVNode(unref(ArrowRight), { size: 18 })], 8, ["onClick"]), createVNode("button", {
								class: "sb-checkout-secondary",
								onClick: retry
							}, [createTextVNode("Повторить "), createVNode(unref(RefreshCw), { size: 18 })])]),
							createVNode(_component_NuxtLink, {
								to: "/catalog",
								class: "sb-checkout-text"
							}, {
								default: withCtx(() => [createTextVNode("Вернуться в каталог")]),
								_: 1
							})
						])) : (openBlock(), createBlock(Fragment, { key: 2 }, [unref(notice) ? (openBlock(), createBlock("p", {
							key: 0,
							class: "sb-checkout-note",
							role: "status"
						}, toDisplayString(unref(notice)), 1)) : createCommentVNode("", true), createVNode("div", { class: "sb-checkout-flow" }, [createVNode("div", { class: "sb-checkout-stage sb-order-details" }, [
							createVNode("section", { class: "sb-checkout-panel" }, [
								createVNode("h2", null, [unref(paid) ? (openBlock(), createBlock(unref(CheckCircle2), {
									key: 0,
									size: 24
								})) : (openBlock(), createBlock(unref(Package), {
									key: 1,
									size: 24
								})), createTextVNode(" " + toDisplayString(unref(statusLabel)), 1)]),
								createVNode("p", null, toDisplayString(unref(reviewPaidCourse) ? "Оплата подтверждена. Проверяем данные заказа перед открытием доступа; повторная оплата не нужна. Если доступ долго не появляется, обратитесь в поддержку." : unref(paid) ? "Оплата подтверждена сервером. Спасибо за покупку!" : "Заказ сохранён. Здесь отображается актуальный статус, полученный с сервера."), 1),
								!unref(confirmed) && !unref(courseOrder) ? (openBlock(), createBlock("p", {
									key: 0,
									class: "sb-checkout-note"
								}, "Способ получения и стоимость доставки требуют подтверждения. Пока итог не согласован, оплатить заказ нельзя.")) : createCommentVNode("", true),
								!unref(confirmed) && unref(courseOrder) ? (openBlock(), createBlock("p", {
									key: 1,
									class: "sb-checkout-note"
								}, "Условия заказа ещё не подтверждены. Обновите статус перед оплатой.")) : createCommentVNode("", true),
								unref(reservationActive) && !unref(paid) ? (openBlock(), createBlock("p", {
									key: 2,
									class: "sb-checkout-hint"
								}, [createVNode(unref(Clock3), { size: 18 }), createTextVNode(" " + toDisplayString(unref(courseOrder) ? `На оплату осталось примерно ${unref(remainingMinutes)} мин.` : `Товары зарезервированы ещё примерно на ${unref(remainingMinutes)} мин.`), 1)])) : !unref(paid) && !unref(activePayments).length && [
									"NEW",
									"CONFIRMED",
									"PAYMENT_WAITING"
								].includes(unref(order).status) ? (openBlock(), createBlock("p", {
									key: 3,
									class: "sb-checkout-note"
								}, toDisplayString(unref(courseOrder) ? "Срок оплаты заказа истёк. Вернитесь на страницу курса, чтобы оформить новый заказ." : "Действующий резерв отсутствует или истёк. Перед оплатой требуется проверка наличия сотрудником."), 1)) : createCommentVNode("", true),
								!unref(courseOrder) && !unref(digitalDelivery) && unref(customerWarehouseApplies)(unref(order)) ? (openBlock(), createBlock("section", {
									key: 4,
									class: "sb-order-warehouse",
									"aria-label": "Обработка заказа на складе"
								}, [
									createVNode("h3", null, "Обработка на складе"),
									createVNode("p", { role: "status" }, toDisplayString(unref(customerWarehouseLabel)(unref(order).warehouseStatus)), 1),
									unref(customerWarehouseAsOf)(unref(order).warehouseStatus) ? (openBlock(), createBlock("small", { key: 0 }, "Подтверждено " + toDisplayString(unref(customerWarehouseAsOf)(unref(order).warehouseStatus)), 1)) : createCommentVNode("", true)
								])) : createCommentVNode("", true)
							]),
							createVNode("section", { class: "sb-checkout-panel" }, [
								createVNode("h2", null, [createVNode(unref(UserRound), { size: 20 }), createTextVNode(" Получатель")]),
								unref(order).buyerName ? (openBlock(), createBlock("p", { key: 0 }, toDisplayString(unref(order).buyerName), 1)) : createCommentVNode("", true),
								unref(order).buyerEmail ? (openBlock(), createBlock("p", { key: 1 }, toDisplayString(unref(order).buyerEmail), 1)) : createCommentVNode("", true),
								unref(order).buyerPhone ? (openBlock(), createBlock("p", { key: 2 }, toDisplayString(unref(order).buyerPhone), 1)) : createCommentVNode("", true),
								!unref(courseOrder) ? (openBlock(), createBlock(Fragment, { key: 3 }, [
									createVNode("h2", { class: "sb-order-delivery-title" }, [unref(digitalDelivery) ? (openBlock(), createBlock(unref(Mail), {
										key: 0,
										size: 20
									})) : (openBlock(), createBlock(unref(MapPin), {
										key: 1,
										size: 20
									})), createTextVNode(" " + toDisplayString(unref(digitalDelivery) ? "Получение карты" : "Доставка"), 1)]),
									createVNode("p", null, toDisplayString(unref(digitalDelivery) ? "Электронная карта · " + (unref(order).buyerEmail || "Email указан при оформлении") : unref(deliveryAddress) || "Адрес уточняется"), 1),
									!unref(digitalDelivery) && unref(order).shippingAddress?.pickupPointName ? (openBlock(), createBlock("p", { key: 0 }, toDisplayString(unref(order).shippingAddress.pickupPointName), 1)) : createCommentVNode("", true)
								], 64)) : createCommentVNode("", true),
								unref(order).comments ? (openBlock(), createBlock("p", { key: 4 }, toDisplayString(unref(order).comments), 1)) : createCommentVNode("", true)
							]),
							unref(courseOrder) ? (openBlock(), createBlock("section", {
								key: 0,
								class: "sb-checkout-panel"
							}, [
								createVNode("h2", null, "Доступ к курсу"),
								unref(reviewPaidCourse) ? (openBlock(), createBlock("p", { key: 0 }, "Откроем доступ после проверки данных заказа.")) : unref(courseAccessReady) ? (openBlock(), createBlock("p", { key: 1 }, "Оплата подтверждена. Проверьте доступ в разделе «Мои курсы».")) : unref(paid) ? (openBlock(), createBlock("p", { key: 2 }, "Оплата подтверждена. Доступ к курсу подготавливается.")) : (openBlock(), createBlock("p", { key: 3 }, "После подтверждения оплаты курс появится в разделе «Мои курсы» этого аккаунта.")),
								unref(courseAccessReady) ? (openBlock(), createBlock(_component_NuxtLink, {
									key: 4,
									to: "/courses/my",
									class: "sb-checkout-text"
								}, {
									default: withCtx(() => [createTextVNode("Мои курсы "), createVNode(unref(ArrowRight), { size: 18 })]),
									_: 1
								})) : createCommentVNode("", true)
							])) : createCommentVNode("", true),
							unref(digitalDelivery) ? (openBlock(), createBlock("section", {
								key: 1,
								class: "sb-checkout-panel sb-order-gift-cards"
							}, [
								createVNode("h2", null, [createVNode(unref(CreditCard), { size: 20 }), createTextVNode(" Подарочные карты")]),
								!unref(paid) ? (openBlock(), createBlock("p", { key: 0 }, "Коды появятся здесь после подтверждения оплаты сервером.")) : !unref(issuedCards).length ? (openBlock(), createBlock("p", { key: 1 }, "Оплата подтверждена. Карты ещё подготавливаются — обновите статус через несколько секунд.")) : (openBlock(), createBlock("div", {
									key: 2,
									class: "sb-order-gift-list"
								}, [(openBlock(true), createBlock(Fragment, null, renderList(unref(issuedCards), (card, index) => {
									return openBlock(), createBlock("article", {
										key: card.id || index,
										class: "sb-order-gift-card"
									}, [
										createVNode("strong", null, "Подарочная карта " + toDisplayString(money(card.faceValue ?? card.nominal)), 1),
										createVNode("p", null, "Баланс: " + toDisplayString(money(card.balance)) + " · Действует до " + toDisplayString(cardExpiry(card.expiresAt)), 1),
										createVNode("code", null, toDisplayString(card.code), 1),
										createVNode("button", {
											type: "button",
											class: "sb-checkout-secondary",
											onClick: ($event) => copyGiftCode(card)
										}, [createTextVNode("Скопировать код "), createVNode(unref(Copy), { size: 18 })], 8, ["onClick"])
									]);
								}), 128))])),
								unref(copyNotice) ? (openBlock(), createBlock("p", {
									key: 3,
									class: "sb-checkout-hint",
									role: "status"
								}, toDisplayString(unref(copyNotice)), 1)) : createCommentVNode("", true),
								unref(issuedCards).length ? (openBlock(), createBlock("p", {
									key: 4,
									class: "sb-checkout-hint"
								}, "Код позволяет использовать баланс карты. Храните его как платёжные данные.")) : createCommentVNode("", true)
							])) : createCommentVNode("", true),
							createVNode("section", { class: "sb-checkout-panel" }, [createVNode("h2", null, [createVNode(unref(Package), { size: 20 }), createTextVNode(" Состав заказа")]), createVNode("div", { class: "sb-order-items" }, [(openBlock(true), createBlock(Fragment, null, renderList(unref(order).items, (item, index) => {
								return openBlock(), createBlock("article", { key: item.id || index }, [createVNode("div", null, [
									createVNode("b", null, toDisplayString(item.productName || item.variant?.product?.nameRu || "Товар"), 1),
									createVNode("small", null, [createTextVNode(toDisplayString(item.variantName || item.variant?.name), 1), item.externalSku || item.variant?.sku ? (openBlock(), createBlock(Fragment, { key: 0 }, [createTextVNode(" · " + toDisplayString(item.externalSku || item.variant?.sku), 1)], 64)) : createCommentVNode("", true)]),
									createVNode("span", null, toDisplayString(item.quantity) + " шт. × " + toDisplayString(money(item.price)), 1)
								]), createVNode("strong", null, toDisplayString(money(item.total ?? Number(item.price) * item.quantity)), 1)]);
							}), 128))])])
						]), createVNode("aside", { class: "sb-checkout-summary sb-checkout-panel sb-order-summary" }, [
							createVNode("p", { class: "sb-kicker" }, toDisplayString(unref(confirmed) ? "ИТОГО" : "ПРЕДВАРИТЕЛЬНАЯ СУММА"), 1),
							createVNode("h2", null, toDisplayString(money(unref(order).finalAmount)), 1),
							unref(snapshot).subtotal !== void 0 || unref(order).totalAmount !== void 0 ? (openBlock(), createBlock("div", { key: 0 }, [createVNode("span", null, toDisplayString(unref(courseOrder) ? "Курс" : "Товары"), 1), createVNode("b", null, toDisplayString(money(unref(snapshot).subtotal ?? unref(order).totalAmount)), 1)])) : createCommentVNode("", true),
							Number(unref(snapshot).discount ?? unref(order).discountAmount) > 0 ? (openBlock(), createBlock("div", { key: 1 }, [createVNode("span", null, "Скидка"), createVNode("b", null, "−" + toDisplayString(money(unref(snapshot).discount ?? unref(order).discountAmount)), 1)])) : createCommentVNode("", true),
							Number(unref(snapshot).bonusAmount) > 0 ? (openBlock(), createBlock("div", { key: 2 }, [createVNode("span", null, "Списание бонусов"), createVNode("b", null, "−" + toDisplayString(money(unref(snapshot).bonusAmount)), 1)])) : createCommentVNode("", true),
							Number(unref(snapshot).giftCardAmount ?? unref(order).giftCardAmount) > 0 ? (openBlock(), createBlock("div", { key: 3 }, [createVNode("span", null, "Подарочная карта"), createVNode("b", null, "−" + toDisplayString(money(unref(snapshot).giftCardAmount ?? unref(order).giftCardAmount)), 1)])) : createCommentVNode("", true),
							!unref(courseOrder) ? (openBlock(), createBlock("div", { key: 4 }, [createVNode("span", null, toDisplayString(unref(digitalDelivery) ? "Электронная доставка" : "Доставка"), 1), createVNode("b", null, toDisplayString(unref(confirmed) ? money(unref(snapshot).shippingAmount ?? unref(order).shippingCost) : "Требует подтверждения"), 1)])) : createCommentVNode("", true),
							!unref(confirmed) ? (openBlock(), createBlock("p", { key: 5 }, "Окончательную сумму подтвердим до оплаты.")) : createCommentVNode("", true),
							unref(reviewPaidCourse) ? (openBlock(), createBlock("p", {
								key: 6,
								class: "sb-checkout-note",
								role: "status"
							}, "Оплата подтверждена. Заказ на проверке.")) : unref(paid) ? (openBlock(), createBlock("p", {
								key: 7,
								class: "sb-checkout-note",
								role: "status"
							}, "Оплачено")) : (openBlock(), createBlock(Fragment, { key: 8 }, [
								unref(activePayments).length && unref(activePaymentNeedsReview) ? (openBlock(), createBlock("p", {
									key: 0,
									class: "sb-checkout-note",
									role: "status"
								}, "Платёж уже начат и требует сверки. Обновите статус или обратитесь в поддержку; повторно оформлять заказ не нужно.")) : unref(activePayment) ? (openBlock(), createBlock("p", {
									key: 1,
									class: "sb-checkout-hint"
								}, "Платёж уже начат. Продолжите оплату выбранным способом.")) : createCommentVNode("", true),
								unref(payable) && !unref(activePaymentNeedsReview) && unref(paymentProviders).length ? (openBlock(), createBlock(_component_PaymentProviderSelect, {
									key: 2,
									modelValue: unref(selectedPaymentProvider),
									"onUpdate:modelValue": ($event) => isRef(selectedPaymentProvider) ? selectedPaymentProvider.value = $event : null,
									providers: unref(paymentProviders),
									disabled: unref(paying) || unref(loading) || unref(capabilityPending),
									name: "order-payment-provider"
								}, null, 8, [
									"modelValue",
									"onUpdate:modelValue",
									"providers",
									"disabled"
								])) : createCommentVNode("", true),
								unref(payable) && !unref(activePaymentNeedsReview) ? (openBlock(), createBlock("button", {
									key: 3,
									class: "sb-primary",
									disabled: !unref(canPay),
									onClick: pay
								}, [createTextVNode(toDisplayString(unref(paying) ? "Открываем оплату…" : "Оплатить заказ") + " ", 1), createVNode(unref(CreditCard), { size: 18 })], 8, ["disabled"])) : createCommentVNode("", true),
								unref(capabilityPending) ? (openBlock(), createBlock("p", {
									key: 4,
									role: "status"
								}, "Проверяем доступность оплаты…")) : unref(payable) && !unref(paymentProviders).length && !unref(activePaymentNeedsReview) ? (openBlock(), createBlock("p", {
									key: 5,
									class: "sb-checkout-hint"
								}, toDisplayString(unref(paymentAvailabilityError) || "Онлайн-оплата пока недоступна. Заказ сохранён без списания денег."), 1)) : createCommentVNode("", true)
							], 64)),
							unref(paymentError) ? (openBlock(), createBlock("p", {
								key: 9,
								class: "sb-form-error",
								role: "alert"
							}, toDisplayString(unref(paymentError)), 1)) : createCommentVNode("", true),
							createVNode("button", {
								class: "sb-checkout-secondary",
								disabled: unref(paying) || unref(loading),
								onClick: retry
							}, [createTextVNode("Обновить статус "), createVNode(unref(RefreshCw), { size: 18 })], 8, ["disabled"]),
							unref(accessToken) ? (openBlock(), createBlock(_component_NuxtLink, {
								key: 10,
								to: "/account",
								class: "sb-checkout-text"
							}, {
								default: withCtx(() => [createTextVNode("Мои заказы")]),
								_: 1
							})) : createCommentVNode("", true),
							createVNode(_component_NuxtLink, {
								to: "/catalog",
								class: "sb-checkout-text"
							}, {
								default: withCtx(() => [createTextVNode("Продолжить покупки")]),
								_: 1
							}),
							createVNode("small", null, "Номер заказа не заменяет защищённый доступ. Не передавайте доступ к браузеру посторонним.")
						])])], 64))
					])];
				}),
				_: 1
			}, _parent));
		};
	}
});
// pages/orders/[orderNumber].vue
var _sfc_setup = _orderNumber__vue_vue_type_script_setup_true_lang_default.setup;
_orderNumber__vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/orders/[orderNumber].vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var _orderNumber__default = _orderNumber__vue_vue_type_script_setup_true_lang_default;

export { _orderNumber__default as default };;globalThis.__timing__.logEnd('Load chunks/build/_orderNumber_-BiPnX2TT');
//# sourceMappingURL=_orderNumber_-BiPnX2TT.mjs.map
