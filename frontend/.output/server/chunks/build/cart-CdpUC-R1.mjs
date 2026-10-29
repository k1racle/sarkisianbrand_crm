globalThis.__timing__.logStart('Load chunks/build/cart-CdpUC-R1');import { r as useSeoMeta, S as SiteShell_default, J as useCookie, p as useStorefront, q as useStorefrontPanels, N as NuxtLink, M as storefrontProductLink, k as storefrontProductImage, O as SiteQuantityControl_default, P as SiteCartRecommendations_default, $ as $fetch$1, f as useRuntimeConfig } from '../virtual/entry.mjs';
import { u as usePaymentProviders, P as PaymentProviderSelect_default, a as PAYMENT_PROVIDER_NAMES } from './usePaymentProviders-CQ8-qJn6.mjs';
import { defineComponent, withCtx, createVNode, ref, reactive, computed, watch, mergeProps, createTextVNode, unref, openBlock, createBlock, toDisplayString, isRef, useSSRContext } from 'vue';
import { ssrRenderComponent, ssrRenderAttrs, ssrInterpolate, ssrRenderList, ssrRenderAttr, ssrRenderClass, ssrIncludeBooleanAttr, ssrLooseContain, ssrLooseEqual } from 'vue/server-renderer';
import { CheckCircle2, ArrowRight, Check, Trash2, UserRound, ArrowLeft, Mail, Truck, Package, MapPin, X, CreditCard, ShoppingBag } from '@lucide/vue';
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

// components/storefront/SiteCheckout.vue?vue&type=script&setup=true&lang.ts
var SiteCheckout_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "SiteCheckout",
	__ssrInlineRender: true,
	setup(__props) {
		const config = useRuntimeConfig();
		useCookie("sb-partner-attribution");
		useSeoMeta({ robots: "noindex, nofollow" });
		const { cartSession, cart, user, accessToken, authHeaders } = useStorefront();
		useStorefrontPanels();
		const loading = ref(true), busy = ref(false), modifying = ref(false), error = ref(""), quoteError = ref(""), success = ref(null), step = ref(1), accepted = ref(false);
		ref();
		const contact = reactive({
			firstName: "",
			lastName: "",
			email: "",
			phone: ""
		});
		const address = reactive({
			city: "",
			street: "",
			house: "",
			apartment: "",
			pickupPointName: "",
			pickupPointAddress: "",
			cityCode: ""
		});
		const deliveryMethod = ref("COURIER"), shippingProvider = ref(""), comments = ref("");
		const promoInput = ref(""), promoCode = ref(""), useBonuses = ref(false), giftInput = ref(""), giftCardCode = ref("");
		ref("");
		const giftRecoveryInput = ref(""), giftError = ref("");
		const quote = ref(null), quotePending = ref(false), shippingPending = ref(false);
		const shippingCapabilities = ref([]), capabilitiesPending = ref(true);
		const { available: paymentProviders, selected: selectedPaymentProvider, choice: paymentCapability, error: paymentAvailabilityError} = usePaymentProviders();
		const providerName = (provider) => provider === "CDEK" ? "СДЭК" : provider === "YANDEX_DELIVERY" ? "Яндекс Доставка" : "Ozon Доставка";
		const shippingResult = ref(null), pickupPoints = ref([]), pickupCode = ref(""), pickupPending = ref(false), pickupMessage = ref("");
		const savedAddresses = ref([]), savedAddressId = ref(""), addressesError = ref("");
		const cities = ref([]), selectedCity = ref(null), cityPending = ref(false), cityMessage = ref(""), cityActive = ref(-1);
		const intent = ref(null);
		const isGiftOrder = computed(() => cart.value?.items?.length ? cart.value.items.every((item) => item.variant?.product?.productType === "GIFT_CARD") : intent.value?.quote?.digitalDelivery === true || quote.value?.digitalDelivery === true);
		const mixedBasket = computed(() => Boolean(cart.value?.items?.some((item) => item.variant?.product?.productType === "GIFT_CARD") && cart.value?.items?.some((item) => item.variant?.product?.productType !== "GIFT_CARD")));
		const steps = computed(() => [
			"Корзина",
			"Контактные данные",
			isGiftOrder.value ? "Получение карты" : "Доставка",
			"Проверка и оплата"
		]);
		const locked = computed(() => busy.value || Boolean(intent.value?.uncertain));
		const contactValid = computed(() => Boolean(contact.firstName.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email.trim()) && /^(?=(?:\D*\d){7,})\+?[\d\s()-]{7,24}$/.test(contact.phone.trim())));
		const cityCode = computed(() => shippingProvider.value === "CDEK" && selectedCity.value?.city === address.city.trim() && selectedCity.value.code === Number(address.cityCode) ? selectedCity.value.code : void 0);
		const capability = computed(() => shippingCapabilities.value.find((item) => item.provider === shippingProvider.value));
		const actualPoint = computed(() => pickupPoints.value.find((point) => point.code === pickupCode.value));
		const deliveryValid = computed(() => isGiftOrder.value ? contactValid.value : Boolean(shippingProvider.value && address.city.trim() && (deliveryMethod.value === "COURIER" ? address.street.trim() && address.house.trim() : actualPoint.value || address.pickupPointName.trim() && address.pickupPointAddress.trim())));
		const basketTotal = computed(() => Number(cart.value?.total || 0));
		const displayTotal = computed(() => step.value <= 2 && quote.value ? quote.value.subtotal - quote.value.discount : quote.value?.total ?? basketTotal.value);
		const summaryMessages = computed(() => (quote.value?.messages || []).filter((message) => {
			if (/^Стоимость доставки (?:пока не рассчитана|подтвердим до оплаты)/i.test(message)) return false;
			if (step.value < 4 && /^Списание бонусов доступно участникам SARKISIAN CLUB/i.test(message)) return false;
			return true;
		}));
		const deliveryLabel = computed(() => isGiftOrder.value ? "Электронная подарочная карта" : deliveryMethod.value === "COURIER" ? "Курьером до двери" : "В пункт выдачи");
		const deliveryAddress = computed(() => isGiftOrder.value ? contact.email.trim() : [address.city, deliveryMethod.value === "COURIER" ? [
			address.street,
			"д. " + address.house,
			address.apartment ? "кв. " + address.apartment : ""
		].filter(Boolean).join(", ") : [actualPoint.value?.name || address.pickupPointName, actualPoint.value?.address || address.pickupPointAddress].join(", ")].join(", "));
		computed(() => "sb-checkout-draft:" + cartSession.value);
		const canSubmit = computed(() => !busy.value && !mixedBasket.value && accepted.value && (Boolean(intent.value?.uncertain && !intent.value.needsGiftCardCode) || !intent.value?.uncertain && contactValid.value && deliveryValid.value && Boolean(quote.value) && !quotePending.value && !shippingPending.value && !quoteError.value));
		const coveredByGift = computed(() => !isGiftOrder.value && quote.value?.total === 0 && quote.value.giftCardAmount > 0 && quote.value.deliveryConfirmed && quote.value.canPay);
		const onlinePayment = computed(() => quote.value?.canPay === true && quote.value.total > 0 && quote.value.deliveryConfirmed === true && paymentCapability.value?.available === true);
		const basketSignature = computed(() => JSON.stringify((cart.value?.items || []).map((item) => ({
			id: item.variantId || item.variant?.id || item.id,
			quantity: item.quantity,
			price: String(item.variant?.price ?? item.price ?? "")
		})).sort((a, b) => a.id.localeCompare(b.id))));
		let citiesTimer;
		function friendlyError(e) {
			const message = e?.data?.message;
			return Array.isArray(message) ? message.join(". ") : typeof message === "string" ? message : "Не удалось выполнить действие. Попробуйте ещё раз.";
		}
		function money(value) {
			return value.toLocaleString("ru-RU", { maximumFractionDigits: 2 }) + " ₽";
		}
		function persistDraft() {}
		function queueCities() {
			clearTimeout(citiesTimer);
			cities.value = [];
			cityActive.value = -1;
			cityPending.value = false;
			cityMessage.value = "";
		}
		async function change(item, quantity) {
			if (modifying.value || locked.value) return;
			modifying.value = true;
			error.value = "";
			try {
				cart.value = await $fetch$1("/cart/items/" + item.id, {
					baseURL: config.public.apiBase,
					method: "PATCH",
					headers: {
						...authHeaders.value,
						"x-cart-session": cartSession.value
					},
					body: { quantity },
					retry: 0
				});
			} catch (e) {
				error.value = friendlyError(e);
			} finally {
				modifying.value = false;
			}
		}
		watch(user, (value) => {
			if (!value || locked.value) return;
			for (const key of [
				"firstName",
				"lastName",
				"email",
				"phone"
			]) if (!contact[key] && value[key]) contact[key] = String(value[key]);
		}, { immediate: true });
		watch([
			contact,
			comments,
			promoCode,
			useBonuses,
			accessToken
		], () => {}, { deep: true });
		watch(isGiftOrder, () => {});
		watch([
			address,
			deliveryMethod,
			shippingProvider,
			basketSignature,
			pickupCode
		], () => {}, { deep: true });
		watch([
			() => address.city,
			() => address.cityCode,
			shippingProvider,
			deliveryMethod
		], () => {});
		watch(shippingProvider, () => {
			if (!locked.value) {
				selectedCity.value = null;
				address.cityCode = "";
			}
		});
		watch([
			() => address.city,
			capability,
			step
		], queueCities);
		watch(step, () => {});
		watch(accessToken, async () => {
			if (!accessToken.value) useBonuses.value = false;
		});
		watch(pickupCode, (value) => {
			const point = pickupPoints.value.find((item) => item.code === value);
			if (point) {
				address.pickupPointName = point.name;
				address.pickupPointAddress = point.address;
			}
		});
		watch([promoInput, accepted], persistDraft);
		return (_ctx, _push, _parent, _attrs) => {
			const _component_NuxtLink = NuxtLink;
			const _component_SiteQuantityControl = SiteQuantityControl_default;
			const _component_SiteCartRecommendations = SiteCartRecommendations_default;
			const _component_PaymentProviderSelect = PaymentProviderSelect_default;
			_push(`<div${ssrRenderAttrs(mergeProps({ class: "sb-cart-page" }, _attrs))}><div class="sb-breadcrumbs">`);
			_push(ssrRenderComponent(_component_NuxtLink, { to: "/" }, {
				default: withCtx((_, _push, _parent, _scopeId) => {
					if (_push) _push(`Главная`);
					else return [createTextVNode("Главная")];
				}),
				_: 1
			}, _parent));
			_push(`<span>/</span><span>Оформление заказа</span></div><header class="sb-page-title sb-checkout-heading"><div><p>ВАШ ЗАКАЗ</p><h1>${ssrInterpolate(unref(success) ? "Заказ принят" : unref(steps)[unref(step) - 1])}</h1></div></header>`);
			if (unref(success)) {
				_push(`<section class="sb-checkout-confirmation sb-checkout-panel" role="status">`);
				_push(ssrRenderComponent(unref(CheckCircle2), { size: 32 }, null, _parent));
				_push(`<h2>Спасибо за заказ!</h2><strong>${ssrInterpolate(unref(success).orderNumber)}</strong><p>${ssrInterpolate(unref(success).requiresDeliveryConfirmation ? "Заказ сохранён. Способ получения и стоимость доставки подтвердим до оплаты." : "Заказ сохранён. Статус и условия оплаты доступны на его странице.")}</p>`);
				if (unref(error)) _push(`<p class="sb-form-error" role="alert">${ssrInterpolate(unref(error))}</p>`);
				else _push(ssrRenderComponent(_component_NuxtLink, {
					to: "/orders/" + encodeURIComponent(unref(success).orderNumber),
					class: "sb-primary"
				}, {
					default: withCtx((_, _push, _parent, _scopeId) => {
						if (_push) {
							_push(`Открыть заказ `);
							_push(ssrRenderComponent(unref(ArrowRight), { size: 18 }, null, _parent, _scopeId));
						} else return [createTextVNode("Открыть заказ "), createVNode(unref(ArrowRight), { size: 18 })];
					}),
					_: 1
				}, _parent));
				_push(ssrRenderComponent(_component_NuxtLink, {
					to: "/catalog",
					class: "sb-checkout-text"
				}, {
					default: withCtx((_, _push, _parent, _scopeId) => {
						if (_push) _push(`Продолжить покупки`);
						else return [createTextVNode("Продолжить покупки")];
					}),
					_: 1
				}, _parent));
				_push(`</section>`);
			} else if (unref(loading)) _push(`<div class="sb-state" role="status">Загружаем корзину…</div>`);
			else if (unref(cart)?.items?.length || unref(intent)?.uncertain) {
				_push(`<div><nav class="sb-checkout-steps" aria-label="Шаги оформления"><!--[-->`);
				ssrRenderList(unref(steps), (label, index) => {
					_push(`<button type="button"${ssrRenderAttr("aria-current", unref(step) === index + 1 ? "step" : void 0)} class="${ssrRenderClass({
						active: unref(step) === index + 1,
						complete: unref(step) > index + 1
					})}"${ssrIncludeBooleanAttr(unref(locked) || index + 1 > unref(step)) ? " disabled" : ""}><i>`);
					if (unref(step) > index + 1) _push(ssrRenderComponent(unref(Check), { size: 16 }, null, _parent));
					else _push(`<!--[-->${ssrInterpolate(index + 1)}<!--]-->`);
					_push(`</i><span>${ssrInterpolate(label)}</span>`);
					if (index < 3) _push(ssrRenderComponent(unref(ArrowRight), {
						size: 18,
						"aria-hidden": "true"
					}, null, _parent));
					else _push(ssrRenderComponent(unref(Check), {
						size: 18,
						"aria-hidden": "true"
					}, null, _parent));
					_push(`</button>`);
				});
				_push(`<!--]--></nav>`);
				if (unref(error)) _push(`<p class="sb-form-error" role="alert">${ssrInterpolate(unref(error))}</p>`);
				else _push(`<!---->`);
				if (unref(mixedBasket)) _push(`<p class="sb-form-error" role="alert">Подарочные карты и обычные товары оформляются отдельными заказами. Уберите из корзины один из типов товаров.</p>`);
				else _push(`<!---->`);
				if (unref(intent)?.uncertain) _push(`<p class="sb-checkout-note" role="status">Проверяем ранее отправленный заказ. Не меняйте состав и данные: повторная отправка с тем же ключом безопасна и не создаст второй заказ.</p>`);
				else _push(`<!---->`);
				if (unref(intent)?.uncertain && unref(intent).needsGiftCardCode) {
					_push(`<section class="sb-checkout-panel sb-checkout-cart-promo"><p>Для безопасного повтора введите тот же код подарочной карты. Мы не сохраняем сам код в браузере.</p><form class="sb-checkout-promo"><label for="sb-gift-recovery">Код для повторной отправки</label><div><input id="sb-gift-recovery"${ssrRenderAttr("value", unref(giftRecoveryInput))} maxlength="100" autocomplete="off"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}><button class="sb-checkout-secondary"${ssrIncludeBooleanAttr(unref(busy) || !unref(giftRecoveryInput).trim()) ? " disabled" : ""}>Подтвердить</button></div></form>`);
					if (unref(giftError)) _push(`<p class="sb-form-error" role="alert">${ssrInterpolate(unref(giftError))}</p>`);
					else _push(`<!---->`);
					_push(`</section>`);
				} else _push(`<!---->`);
				_push(`<div class="sb-checkout-flow"><div class="sb-checkout-stage">`);
				if (unref(step) === 1) {
					_push(`<!--[--><section class="sb-cart-items"><!--[-->`);
					ssrRenderList(unref(cart).items, (item) => {
						_push(`<article class="sb-cart-item">`);
						_push(ssrRenderComponent(_component_NuxtLink, {
							to: ("storefrontProductLink" in _ctx ? _ctx.storefrontProductLink : unref(storefrontProductLink))(item.variant.product),
							class: "sb-cart-thumb"
						}, {
							default: withCtx((_, _push, _parent, _scopeId) => {
								if (_push) {
									if (("storefrontProductImage" in _ctx ? _ctx.storefrontProductImage : unref(storefrontProductImage))(item.variant.product)) _push(`<img${ssrRenderAttr("src", ("storefrontProductImage" in _ctx ? _ctx.storefrontProductImage : unref(storefrontProductImage))(item.variant.product))}${ssrRenderAttr("alt", item.variant.product.nameRu)}${_scopeId}>`);
									else _push(`<span${_scopeId}>S</span>`);
								} else return [("storefrontProductImage" in _ctx ? _ctx.storefrontProductImage : unref(storefrontProductImage))(item.variant.product) ? (openBlock(), createBlock("img", {
									key: 0,
									src: ("storefrontProductImage" in _ctx ? _ctx.storefrontProductImage : unref(storefrontProductImage))(item.variant.product),
									alt: item.variant.product.nameRu
								}, null, 8, ["src", "alt"])) : (openBlock(), createBlock("span", { key: 1 }, "S"))];
							}),
							_: 2
						}, _parent));
						_push(`<div><h2>`);
						_push(ssrRenderComponent(_component_NuxtLink, { to: ("storefrontProductLink" in _ctx ? _ctx.storefrontProductLink : unref(storefrontProductLink))(item.variant.product) }, {
							default: withCtx((_, _push, _parent, _scopeId) => {
								if (_push) _push(`${ssrInterpolate(item.variant.product.nameRu)}`);
								else return [createTextVNode(toDisplayString(item.variant.product.nameRu), 1)];
							}),
							_: 2
						}, _parent));
						_push(`</h2><p>${ssrInterpolate(item.variant.name)} · ${ssrInterpolate(item.variant.sku)}</p>`);
						_push(ssrRenderComponent(_component_SiteQuantityControl, {
							quantity: item.quantity,
							disabled: unref(modifying) || unref(locked),
							compact: "",
							onChange: ($event) => change(item, $event)
						}, null, _parent));
						_push(`</div><strong>${ssrInterpolate(money(Number(item.variant.price) * item.quantity))}</strong><button class="sb-remove"${ssrIncludeBooleanAttr(unref(modifying) || unref(locked)) ? " disabled" : ""} aria-label="Удалить товар">`);
						_push(ssrRenderComponent(unref(Trash2), { size: 18 }, null, _parent));
						_push(`</button></article>`);
					});
					_push(`<!--]--></section>`);
					if (!unref(isGiftOrder)) _push(ssrRenderComponent(_component_SiteCartRecommendations, null, null, _parent));
					else _push(`<!---->`);
					_push(`<!--]-->`);
				} else if (unref(step) === 2) {
					_push(`<section class="sb-checkout-panel sb-checkout"><h2>`);
					_push(ssrRenderComponent(unref(UserRound), { size: 20 }, null, _parent));
					_push(` Контактные данные</h2><p>Укажите, с кем связаться по заказу. Покупка доступна и без регистрации.</p>`);
					if (!unref(user)) _push(`<div class="sb-checkout-auth"><span>Есть аккаунт? Войдите, чтобы сохранить заказ в кабинете и использовать бонусы.</span><div><button type="button" class="sb-checkout-text">Войти</button><button type="button" class="sb-checkout-text">Зарегистрироваться</button></div></div>`);
					else _push(`<p class="sb-checkout-account">Вы вошли как ${ssrInterpolate(unref(user).email)}</p>`);
					_push(`<form><div class="sb-checkout-row"><label>Имя<input${ssrRenderAttr("value", unref(contact).firstName)} autocomplete="given-name" maxlength="100"${ssrIncludeBooleanAttr(unref(locked)) ? " disabled" : ""} required></label><label>Фамилия<input${ssrRenderAttr("value", unref(contact).lastName)} autocomplete="family-name" maxlength="100"${ssrIncludeBooleanAttr(unref(locked)) ? " disabled" : ""}></label></div><label>Электронная почта<input${ssrRenderAttr("value", unref(contact).email)} type="email" autocomplete="email" maxlength="254"${ssrIncludeBooleanAttr(unref(locked)) ? " disabled" : ""} required></label><label>Телефон<input${ssrRenderAttr("value", unref(contact).phone)} type="tel" autocomplete="tel" placeholder="+7 999 000-00-00" pattern="\\+?[0-9\\s\\(\\)\\-]{7,24}" maxlength="24"${ssrIncludeBooleanAttr(unref(locked)) ? " disabled" : ""} required></label><div class="sb-checkout-actions"><button type="button" class="sb-checkout-text"${ssrIncludeBooleanAttr(unref(locked)) ? " disabled" : ""}>`);
					_push(ssrRenderComponent(unref(ArrowLeft), { size: 18 }, null, _parent));
					_push(` Назад</button><button class="sb-primary"${ssrIncludeBooleanAttr(!unref(contactValid) || unref(locked)) ? " disabled" : ""}>${ssrInterpolate(unref(isGiftOrder) ? "К получению карты" : "К доставке")} `);
					_push(ssrRenderComponent(unref(ArrowRight), { size: 18 }, null, _parent));
					_push(`</button></div></form></section>`);
				} else if (unref(step) === 3 && unref(isGiftOrder)) {
					_push(`<section class="sb-checkout-panel sb-checkout"><h2>`);
					_push(ssrRenderComponent(unref(Mail), { size: 20 }, null, _parent));
					_push(` Получение карты</h2><p>Электронная подарочная карта будет доступна в защищённом заказе после подтверждения оплаты. Укажите действующий email для получения уведомления.</p><p class="sb-checkout-note">Email получателя: ${ssrInterpolate(unref(contact).email)}. Доставка бесплатная, адрес и выбор ПВЗ не нужны.</p><div class="sb-checkout-actions"><button type="button" class="sb-checkout-text"${ssrIncludeBooleanAttr(unref(locked)) ? " disabled" : ""}>`);
					_push(ssrRenderComponent(unref(ArrowLeft), { size: 18 }, null, _parent));
					_push(` Назад</button><button class="sb-primary"${ssrIncludeBooleanAttr(!unref(deliveryValid) || unref(locked)) ? " disabled" : ""}>Проверить заказ `);
					_push(ssrRenderComponent(unref(ArrowRight), { size: 18 }, null, _parent));
					_push(`</button></div></section>`);
				} else if (unref(step) === 3) {
					_push(`<section class="sb-checkout-panel sb-checkout"><h2>`);
					_push(ssrRenderComponent(unref(Truck), { size: 20 }, null, _parent));
					_push(` Способ получения</h2><p>Выберите доставку до двери или получение в пункте выдачи.</p><div class="sb-delivery-providers" role="radiogroup" aria-label="Служба доставки"><!--[-->`);
					ssrRenderList(unref(shippingCapabilities), (provider) => {
						_push(`<button type="button" role="radio"${ssrRenderAttr("aria-checked", unref(shippingProvider) === provider.provider)} class="${ssrRenderClass({ active: unref(shippingProvider) === provider.provider })}"${ssrIncludeBooleanAttr(unref(locked)) ? " disabled" : ""}><span class="${ssrRenderClass(["is-" + provider.provider, "sb-delivery-provider__mark"])}">`);
						if (provider.provider === "CDEK") _push(ssrRenderComponent(unref(Package), {
							size: 19,
							"aria-hidden": "true"
						}, null, _parent));
						else if (provider.provider === "OZON_DELIVERY") _push(ssrRenderComponent(unref(Truck), {
							size: 19,
							"aria-hidden": "true"
						}, null, _parent));
						else _push(`<span class="sb-delivery-provider__logo" aria-hidden="true">Я</span>`);
						_push(`</span><strong>${ssrInterpolate(providerName(provider.provider))}</strong><span>${ssrInterpolate(provider.available === true ? "Пункт выдачи или курьер" : "Подключение службы уточняется")}</span></button>`);
					});
					_push(`<!--]--></div>`);
					if (unref(shippingProvider)) {
						_push(`<div class="sb-delivery-method-block"><p class="sb-checkout-label">Как получить заказ</p><div class="sb-delivery-options" role="group" aria-label="Способ получения"><button type="button"${ssrIncludeBooleanAttr(unref(locked)) ? " disabled" : ""}${ssrRenderAttr("aria-pressed", unref(deliveryMethod) === "COURIER")} class="${ssrRenderClass({ active: unref(deliveryMethod) === "COURIER" })}">`);
						_push(ssrRenderComponent(unref(Truck), { size: 20 }, null, _parent));
						_push(`<b>Курьером до двери</b><span>Привезём по указанному адресу</span></button><button type="button"${ssrIncludeBooleanAttr(unref(locked)) ? " disabled" : ""}${ssrRenderAttr("aria-pressed", unref(deliveryMethod) === "PICKUP_POINT")} class="${ssrRenderClass({ active: unref(deliveryMethod) === "PICKUP_POINT" })}">`);
						_push(ssrRenderComponent(unref(MapPin), { size: 20 }, null, _parent));
						_push(`<b>В пункт выдачи</b><span>Получение в удобном для вас ПВЗ</span></button></div></div>`);
					} else _push(`<!---->`);
					_push(`<form>`);
					if (!unref(shippingProvider)) _push(`<p class="sb-checkout-note">Сначала выберите службу доставки, затем способ получения заказа.</p>`);
					else _push(`<!---->`);
					if (unref(capabilitiesPending)) _push(`<p class="sb-checkout-hint" role="status">Проверяем доступность доставки…</p>`);
					else if (unref(capability)?.available !== true) _push(`<p class="sb-checkout-note">${ssrInterpolate(unref(capability)?.message || "Автоматический расчёт недоступен. Способ и стоимость доставки подтвердим до оплаты.")}</p>`);
					else _push(`<!---->`);
					if (unref(savedAddresses).length && unref(deliveryMethod) === "COURIER") {
						_push(`<label>Сохранённый адрес<select${ssrIncludeBooleanAttr(unref(locked)) ? " disabled" : ""}><option value=""${ssrIncludeBooleanAttr(Array.isArray(unref(savedAddressId)) ? ssrLooseContain(unref(savedAddressId), "") : ssrLooseEqual(unref(savedAddressId), "")) ? " selected" : ""}>Заполнить вручную</option><!--[-->`);
						ssrRenderList(unref(savedAddresses), (saved) => {
							_push(`<option${ssrRenderAttr("value", saved.id)}${ssrIncludeBooleanAttr(Array.isArray(unref(savedAddressId)) ? ssrLooseContain(unref(savedAddressId), saved.id) : ssrLooseEqual(unref(savedAddressId), saved.id)) ? " selected" : ""}>${ssrInterpolate(saved.label || [
								saved.city,
								saved.street,
								saved.house
							].filter(Boolean).join(", "))}</option>`);
						});
						_push(`<!--]--></select></label>`);
					} else _push(`<!---->`);
					if (unref(addressesError)) _push(`<p class="sb-checkout-hint">${ssrInterpolate(unref(addressesError))}</p>`);
					else _push(`<!---->`);
					_push(`<div class="sb-checkout-city"><label for="sb-checkout-city-input">Город</label><input id="sb-checkout-city-input"${ssrRenderAttr("value", unref(address).city)} autocomplete="off" maxlength="100"${ssrIncludeBooleanAttr(unref(locked)) ? " disabled" : ""} required role="combobox" aria-autocomplete="list"${ssrRenderAttr("aria-expanded", unref(cities).length > 0)} aria-controls="sb-checkout-city-results"${ssrRenderAttr("aria-activedescendant", unref(cityActive) >= 0 ? "sb-checkout-city-option-" + unref(cityActive) : void 0)} aria-describedby="sb-checkout-city-status">`);
					if (unref(cities).length) {
						_push(`<ul id="sb-checkout-city-results" class="sb-checkout-city-results" role="listbox" aria-label="Город и регион"><!--[-->`);
						ssrRenderList(unref(cities), (city, index) => {
							_push(`<li${ssrRenderAttr("id", "sb-checkout-city-option-" + index)} role="option"${ssrRenderAttr("aria-selected", unref(cityActive) === index)}><button type="button"${ssrIncludeBooleanAttr(unref(locked)) ? " disabled" : ""} class="${ssrRenderClass({ active: unref(cityActive) === index })}"><b>${ssrInterpolate(city.city)}</b><span>${ssrInterpolate(city.region || city.country || "Россия")}</span></button></li>`);
						});
						_push(`<!--]--></ul>`);
					} else _push(`<!---->`);
					_push(`<p id="sb-checkout-city-status" class="sb-checkout-hint" role="status">${ssrInterpolate(unref(cityPending) ? "Ищем город…" : unref(cityCode) ? [unref(selectedCity)?.city, unref(selectedCity)?.region].filter(Boolean).join(" · ") : unref(cityMessage) || (unref(capability)?.available === true ? "Выберите город из подсказок для расчёта доставки" : "Укажите город доставки"))}</p></div>`);
					if (unref(deliveryMethod) === "COURIER") _push(`<!--[--><label>Улица<input${ssrRenderAttr("value", unref(address).street)} autocomplete="address-line1" maxlength="200"${ssrIncludeBooleanAttr(unref(locked)) ? " disabled" : ""} required></label><div class="sb-checkout-row"><label>Дом, корпус<input${ssrRenderAttr("value", unref(address).house)} maxlength="40"${ssrIncludeBooleanAttr(unref(locked)) ? " disabled" : ""} required></label><label>Квартира или офис<input${ssrRenderAttr("value", unref(address).apartment)} maxlength="50"${ssrIncludeBooleanAttr(unref(locked)) ? " disabled" : ""}></label></div><!--]-->`);
					else {
						_push(`<!--[-->`);
						if (unref(pickupPending)) _push(`<p class="sb-checkout-hint" role="status">Загружаем пункты выдачи…</p>`);
						else _push(`<!---->`);
						if (unref(pickupPoints).length) {
							_push(`<label>Пункт выдачи<select${ssrIncludeBooleanAttr(unref(locked)) ? " disabled" : ""}><option value=""${ssrIncludeBooleanAttr(Array.isArray(unref(pickupCode)) ? ssrLooseContain(unref(pickupCode), "") : ssrLooseEqual(unref(pickupCode), "")) ? " selected" : ""}>Указать желаемый ПВЗ вручную</option><!--[-->`);
							ssrRenderList(unref(pickupPoints), (point) => {
								_push(`<option${ssrRenderAttr("value", point.code)}${ssrIncludeBooleanAttr(Array.isArray(unref(pickupCode)) ? ssrLooseContain(unref(pickupCode), point.code) : ssrLooseEqual(unref(pickupCode), point.code)) ? " selected" : ""}>${ssrInterpolate(point.name)} · ${ssrInterpolate(point.address)}</option>`);
							});
							_push(`<!--]--></select></label>`);
						} else _push(`<!---->`);
						if (unref(actualPoint)) {
							_push(`<p class="sb-checkout-note">${ssrInterpolate(unref(actualPoint).address)}`);
							if (unref(actualPoint).workTime) _push(`<!--[--> · ${ssrInterpolate(unref(actualPoint).workTime)}<!--]-->`);
							else _push(`<!---->`);
							_push(`</p>`);
						} else _push(`<!--[--><p class="sb-checkout-note">${ssrInterpolate(unref(pickupMessage) || "Укажите желаемый пункт выдачи. Мы проверим возможность доставки и подтвердим его перед оплатой.")}</p><label>Название желаемого ПВЗ<input${ssrRenderAttr("value", unref(address).pickupPointName)} placeholder="Например, СДЭК на Центральной" maxlength="200"${ssrIncludeBooleanAttr(unref(locked)) ? " disabled" : ""} required></label><label>Адрес желаемого ПВЗ<input${ssrRenderAttr("value", unref(address).pickupPointAddress)} placeholder="Улица и номер дома" maxlength="300"${ssrIncludeBooleanAttr(unref(locked)) ? " disabled" : ""} required></label><!--]-->`);
						_push(`<!--]-->`);
					}
					if (unref(shippingPending)) _push(`<p class="sb-checkout-hint" role="status">Рассчитываем доставку…</p>`);
					else if (unref(shippingResult)?.message) _push(`<p class="sb-checkout-note">${ssrInterpolate(unref(shippingResult).message)}</p>`);
					else _push(`<!---->`);
					if (unref(capability)?.canEstimate && unref(cityCode) && unref(deliveryValid) && (!unref(shippingResult)?.quoteId || !unref(quote)?.deliveryConfirmed)) {
						_push(`<button type="button" class="sb-checkout-secondary"${ssrIncludeBooleanAttr(unref(shippingPending) || unref(locked)) ? " disabled" : ""}>Обновить доставку `);
						_push(ssrRenderComponent(unref(ArrowRight), { size: 18 }, null, _parent));
						_push(`</button>`);
					} else _push(`<!---->`);
					_push(`<label>Комментарий к заказу<textarea maxlength="1000" rows="3"${ssrIncludeBooleanAttr(unref(locked)) ? " disabled" : ""} placeholder="Домофон, удобное время звонка или пожелания">${ssrInterpolate(unref(comments))}</textarea></label><div class="sb-checkout-actions"><button type="button" class="sb-checkout-text"${ssrIncludeBooleanAttr(unref(locked)) ? " disabled" : ""}>`);
					_push(ssrRenderComponent(unref(ArrowLeft), { size: 18 }, null, _parent));
					_push(` Назад</button><button class="sb-primary"${ssrIncludeBooleanAttr(!unref(deliveryValid) || unref(locked)) ? " disabled" : ""}>Проверить заказ `);
					_push(ssrRenderComponent(unref(ArrowRight), { size: 18 }, null, _parent));
					_push(`</button></div></form></section>`);
				} else {
					_push(`<section class="sb-checkout-panel sb-checkout"><h2>Проверьте заказ</h2><div class="sb-checkout-review"><article><div><b>Контактные данные</b><button class="sb-checkout-text"${ssrIncludeBooleanAttr(unref(locked)) ? " disabled" : ""}>Изменить</button></div><p>${ssrInterpolate(unref(contact).firstName)} ${ssrInterpolate(unref(contact).lastName)}</p><p>${ssrInterpolate(unref(contact).phone)} · ${ssrInterpolate(unref(contact).email)}</p></article><article><div><b>${ssrInterpolate(unref(deliveryLabel))}</b><button class="sb-checkout-text"${ssrIncludeBooleanAttr(unref(locked)) ? " disabled" : ""}>Изменить</button></div><p>${ssrInterpolate(unref(deliveryAddress))}</p>`);
					if (unref(comments)) _push(`<p>${ssrInterpolate(unref(comments))}</p>`);
					else _push(`<!---->`);
					_push(`</article><article><div><b>Товары · ${ssrInterpolate(unref(cart)?.items?.length || 0)} поз.</b><button class="sb-checkout-text"${ssrIncludeBooleanAttr(unref(locked)) ? " disabled" : ""}>Изменить</button></div><!--[-->`);
					ssrRenderList(unref(cart)?.items || [], (item) => {
						_push(`<p>${ssrInterpolate(item.variant.product.nameRu)} × ${ssrInterpolate(item.quantity)}</p>`);
					});
					_push(`<!--]--></article></div>`);
					if (!unref(isGiftOrder) && !unref(intent)?.uncertain) {
						_push(`<div class="sb-checkout-rewards"><section class="sb-checkout-cart-promo sb-checkout-gift-code sb-checkout-reward" aria-label="Оплата подарочной картой"><form class="sb-checkout-promo"><label for="sb-checkout-gift-code">Подарочная карта</label><div><input id="sb-checkout-gift-code"${ssrRenderAttr("value", unref(giftInput))} maxlength="100" autocomplete="off"${ssrIncludeBooleanAttr(unref(locked)) ? " disabled" : ""}><button class="sb-checkout-secondary sb-checkout-code-apply" aria-label="Применить" title="Применить подарочную карту"${ssrIncludeBooleanAttr(unref(locked) || !unref(giftInput).trim()) ? " disabled" : ""}>`);
						_push(ssrRenderComponent(unref(Check), {
							size: 18,
							"aria-hidden": "true"
						}, null, _parent));
						_push(`</button></div></form>`);
						if (unref(giftCardCode) && unref(quote) && unref(quote).giftCardAmount > 0 && !unref(quotePending) && !unref(quoteError)) _push(`<small class="sb-checkout-reward-status">Учтено в расчёте: ${ssrInterpolate(money(unref(quote).giftCardAmount))}</small>`);
						else _push(`<!---->`);
						if (unref(giftCardCode)) {
							_push(`<button type="button" class="sb-checkout-text"${ssrIncludeBooleanAttr(unref(locked)) ? " disabled" : ""}>Убрать подарочную карту `);
							_push(ssrRenderComponent(unref(X), { size: 18 }, null, _parent));
							_push(`</button>`);
						} else _push(`<!---->`);
						if (unref(giftError)) _push(`<p class="sb-form-error" role="alert">${ssrInterpolate(unref(giftError))}</p>`);
						else _push(`<!---->`);
						_push(`</section><section class="sb-checkout-final-bonuses sb-checkout-reward" aria-label="Бонусы SARKISIAN CLUB"><h3>Бонусы клуба</h3>`);
						if (unref(accessToken)) _push(`<label class="sb-checkout-check sb-checkout-bonuses"><input${ssrIncludeBooleanAttr(Array.isArray(unref(useBonuses)) ? ssrLooseContain(unref(useBonuses), null) : unref(useBonuses)) ? " checked" : ""} type="checkbox" role="switch" aria-describedby="sb-checkout-bonus-available"${ssrIncludeBooleanAttr(unref(locked) || !unref(useBonuses) && (!unref(quote) || unref(quote).maxBonusAmount <= 0)) ? " disabled" : ""}><span class="sb-checkout-bonus-copy">Использовать бонусы<small id="sb-checkout-bonus-available">${ssrInterpolate(unref(quote) ? "Доступно к списанию: " + unref(quote).maxBonusAmount.toLocaleString("ru-RU") + " бонусов" : "Проверяем доступный баланс…")}</small></span><i class="sb-checkout-bonus-switch" aria-hidden="true"></i></label>`);
						else _push(`<p class="sb-checkout-hint">Для списания бонусов <button type="button" class="sb-checkout-text">войдите</button> в аккаунт.</p>`);
						if (unref(quote) && unref(quote).earnEstimate > 0) _push(`<p class="sb-checkout-hint">После подтверждения оплаты: ${ssrInterpolate(unref(quote).earnEstimate.toLocaleString("ru-RU"))} бонусов.</p>`);
						else _push(`<!---->`);
						_push(`</section></div>`);
					} else _push(`<!---->`);
					_push(`<h2>`);
					_push(ssrRenderComponent(unref(CreditCard), { size: 20 }, null, _parent));
					_push(` Оплата</h2>`);
					if (unref(onlinePayment)) _push(ssrRenderComponent(_component_PaymentProviderSelect, {
						modelValue: unref(selectedPaymentProvider),
						"onUpdate:modelValue": ($event) => isRef(selectedPaymentProvider) ? selectedPaymentProvider.value = $event : null,
						providers: unref(paymentProviders),
						disabled: unref(locked),
						name: "checkout-payment-provider"
					}, null, _parent));
					else _push(`<!---->`);
					_push(`<p class="sb-checkout-note">${ssrInterpolate(unref(coveredByGift) ? "Сумма заказа полностью покрывается подарочной картой. Подтвердите оформление — отдельный платёж не потребуется." : unref(onlinePayment) && unref(selectedPaymentProvider) ? `После оформления откроется защищённая страница ${unref(PAYMENT_PROVIDER_NAMES)[unref(selectedPaymentProvider)]}. Статус оплаты подтвердит сервер.` : unref(quote)?.deliveryConfirmed ? unref(paymentAvailabilityError) || "Онлайн-оплата пока недоступна. Заказ будет сохранён без списания денег." : "Стоимость и способ доставки ещё требуют подтверждения. Отправьте заказ: мы согласуем условия до оплаты. Сейчас деньги не списываются.")}</p><label class="sb-checkout-check"><input${ssrIncludeBooleanAttr(Array.isArray(unref(accepted)) ? ssrLooseContain(unref(accepted), null) : unref(accepted)) ? " checked" : ""} type="checkbox"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}><span>Принимаю `);
					_push(ssrRenderComponent(_component_NuxtLink, {
						to: "/oferta",
						target: "_blank"
					}, {
						default: withCtx((_, _push, _parent, _scopeId) => {
							if (_push) _push(`условия оферты`);
							else return [createTextVNode("условия оферты")];
						}),
						_: 1
					}, _parent));
					_push(` и ознакомлен с `);
					_push(ssrRenderComponent(_component_NuxtLink, {
						to: "/privacy",
						target: "_blank"
					}, {
						default: withCtx((_, _push, _parent, _scopeId) => {
							if (_push) _push(`политикой конфиденциальности`);
							else return [createTextVNode("политикой конфиденциальности")];
						}),
						_: 1
					}, _parent));
					_push(`.</span></label><div class="sb-checkout-actions"><button type="button" class="sb-checkout-text"${ssrIncludeBooleanAttr(unref(locked)) ? " disabled" : ""}>`);
					_push(ssrRenderComponent(unref(ArrowLeft), { size: 18 }, null, _parent));
					_push(` Назад</button></div></section>`);
				}
				_push(`</div><aside class="sb-checkout-summary sb-checkout-panel"${ssrRenderAttr("aria-busy", unref(quotePending) || unref(shippingPending))}><p class="sb-kicker">${ssrInterpolate(unref(intent)?.uncertain ? "ПРЕДЫДУЩИЙ РАСЧЁТ" : "ВАШ ЗАКАЗ")}</p><h2>${ssrInterpolate(money(unref(displayTotal)))}</h2><div><span>Товары</span><b>${ssrInterpolate(money(unref(quote)?.subtotal ?? unref(basketTotal)))}</b></div>`);
				if (unref(quote) && unref(quote).discount > 0) _push(`<div><span>Скидка</span><b>−${ssrInterpolate(money(unref(quote).discount))}</b></div>`);
				else _push(`<!---->`);
				if (unref(step) === 4 && unref(quote) && unref(quote).bonusAmount > 0) _push(`<div><span>Списание бонусов</span><b>−${ssrInterpolate(money(unref(quote).bonusAmount))}</b></div>`);
				else _push(`<!---->`);
				if (unref(step) === 4 && unref(quote) && unref(quote).giftCardAmount > 0) _push(`<div><span>Подарочная карта</span><b>−${ssrInterpolate(money(unref(quote).giftCardAmount))}</b></div>`);
				else _push(`<!---->`);
				if (unref(step) >= 3) _push(`<div><span>${ssrInterpolate(unref(isGiftOrder) ? "Электронная доставка" : "Доставка")}</span><b>${ssrInterpolate(unref(quote)?.shippingAmount !== null && unref(quote)?.shippingAmount !== void 0 ? money(unref(quote).shippingAmount) : "Требует расчёта")}</b></div>`);
				else _push(`<!---->`);
				if (unref(quotePending) || unref(shippingPending)) _push(`<p role="status">Обновляем расчёт…</p>`);
				else if (unref(intent)?.uncertain) _push(`<p>Показываем расчёт отправленного заказа. Актуальные данные появятся после подтверждения результата.</p>`);
				else if (unref(step) >= 3 && !unref(quote)?.deliveryConfirmed) _push(`<p>Предварительная сумма. Итог с доставкой подтвердим до оплаты.</p>`);
				else if (unref(step) >= 3) _push(`<p>Итоговая сумма с доставкой.</p>`);
				else _push(`<!---->`);
				_push(`<!--[-->`);
				ssrRenderList(unref(summaryMessages), (message) => {
					_push(`<p class="sb-checkout-hint">${ssrInterpolate(message)}</p>`);
				});
				_push(`<!--]-->`);
				if (!unref(isGiftOrder)) {
					_push(`<section class="sb-checkout-cart-promo sb-checkout-summary-promo" aria-label="Промокод заказа"><form class="sb-checkout-promo"><label for="sb-checkout-promo-code">Промокод</label><div><input id="sb-checkout-promo-code"${ssrRenderAttr("value", unref(promoInput))} maxlength="40" autocomplete="off"${ssrIncludeBooleanAttr(unref(locked)) ? " disabled" : ""}><button class="sb-checkout-secondary sb-checkout-code-apply" aria-label="Применить" title="Применить промокод"${ssrIncludeBooleanAttr(unref(locked) || !unref(promoInput).trim()) ? " disabled" : ""}>`);
					_push(ssrRenderComponent(unref(Check), {
						size: 18,
						"aria-hidden": "true"
					}, null, _parent));
					_push(`</button></div></form>`);
					if (unref(promoCode)) {
						_push(`<button type="button" class="sb-checkout-text"${ssrIncludeBooleanAttr(unref(locked)) ? " disabled" : ""}>Убрать промокод ${ssrInterpolate(unref(promoCode))} `);
						_push(ssrRenderComponent(unref(X), { size: 18 }, null, _parent));
						_push(`</button>`);
					} else _push(`<!---->`);
					_push(`</section>`);
				} else _push(`<!---->`);
				if (!unref(intent)?.uncertain) {
					_push(`<!--[-->`);
					if (unref(quoteError)) _push(`<p class="sb-form-error" role="alert">${ssrInterpolate(unref(quoteError))}</p>`);
					else _push(`<!---->`);
					if (unref(quoteError)) {
						_push(`<button class="sb-checkout-secondary"${ssrIncludeBooleanAttr(unref(quotePending) || unref(locked)) ? " disabled" : ""}>Обновить расчёт `);
						_push(ssrRenderComponent(unref(ArrowRight), { size: 18 }, null, _parent));
						_push(`</button>`);
					} else _push(`<!---->`);
					_push(`<!--]-->`);
				} else _push(`<!---->`);
				if (unref(step) === 1) {
					_push(`<button class="sb-primary"${ssrIncludeBooleanAttr(unref(modifying) || unref(locked) || unref(mixedBasket)) ? " disabled" : ""}>К оформлению `);
					_push(ssrRenderComponent(unref(ArrowRight), { size: 18 }, null, _parent));
					_push(`</button>`);
				} else _push(`<!---->`);
				if (unref(step) === 4) {
					_push(`<button class="sb-primary"${ssrIncludeBooleanAttr(!unref(canSubmit)) ? " disabled" : ""}>${ssrInterpolate(unref(busy) ? "Оформляем…" : unref(intent)?.uncertain ? "Повторить безопасно" : unref(onlinePayment) ? "Оформить и оплатить" : "Подтвердить заказ")} `);
					_push(ssrRenderComponent(unref(Check), { size: 18 }, null, _parent));
					_push(`</button>`);
				} else _push(`<!---->`);
				if (unref(step) === 1) _push(ssrRenderComponent(_component_NuxtLink, {
					to: "/catalog",
					class: "sb-checkout-text"
				}, {
					default: withCtx((_, _push, _parent, _scopeId) => {
						if (_push) _push(`Продолжить покупки`);
						else return [createTextVNode("Продолжить покупки")];
					}),
					_: 1
				}, _parent));
				else _push(`<small>Шаг ${ssrInterpolate(unref(step))} из 4</small>`);
				_push(`</aside></div></div>`);
			} else if (unref(error)) {
				_push(`<div class="sb-empty"><h2>Корзина недоступна</h2><p>${ssrInterpolate(unref(error))}</p><button class="sb-primary">Повторить `);
				_push(ssrRenderComponent(unref(ArrowRight), { size: 18 }, null, _parent));
				_push(`</button></div>`);
			} else {
				_push(`<div class="sb-empty">`);
				_push(ssrRenderComponent(unref(ShoppingBag), { size: 32 }, null, _parent));
				_push(`<h2>Корзина пока пуста</h2><p>Добавьте продукты, с которыми хочется работать.</p>`);
				_push(ssrRenderComponent(_component_NuxtLink, {
					to: "/catalog",
					class: "sb-primary"
				}, {
					default: withCtx((_, _push, _parent, _scopeId) => {
						if (_push) {
							_push(`Перейти в каталог `);
							_push(ssrRenderComponent(unref(ArrowRight), { size: 18 }, null, _parent, _scopeId));
						} else return [createTextVNode("Перейти в каталог "), createVNode(unref(ArrowRight), { size: 18 })];
					}),
					_: 1
				}, _parent));
				_push(`</div>`);
			}
			_push(`</div>`);
		};
	}
});
// components/storefront/SiteCheckout.vue
var _sfc_setup$1 = SiteCheckout_vue_vue_type_script_setup_true_lang_default.setup;
SiteCheckout_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/storefront/SiteCheckout.vue");
	return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
var SiteCheckout_default = Object.assign(SiteCheckout_vue_vue_type_script_setup_true_lang_default, { __name: "SiteCheckout" });
// pages/cart.vue?vue&type=script&setup=true&lang.ts
var cart_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "cart",
	__ssrInlineRender: true,
	setup(__props) {
		useSeoMeta({ title: "Оформление заказа — SARKISIAN BRAND" });
		return (_ctx, _push, _parent, _attrs) => {
			const _component_SiteShell = SiteShell_default;
			const _component_SiteCheckout = SiteCheckout_default;
			_push(ssrRenderComponent(_component_SiteShell, _attrs, {
				default: withCtx((_, _push, _parent, _scopeId) => {
					if (_push) _push(ssrRenderComponent(_component_SiteCheckout, null, null, _parent, _scopeId));
					else return [createVNode(_component_SiteCheckout)];
				}),
				_: 1
			}, _parent));
		};
	}
});
// pages/cart.vue
var _sfc_setup = cart_vue_vue_type_script_setup_true_lang_default.setup;
cart_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/cart.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var cart_default = cart_vue_vue_type_script_setup_true_lang_default;

export { cart_default as default };;globalThis.__timing__.logEnd('Load chunks/build/cart-CdpUC-R1');
//# sourceMappingURL=cart-CdpUC-R1.mjs.map
