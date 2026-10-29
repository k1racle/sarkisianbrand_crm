globalThis.__timing__.logStart('Load chunks/build/catalog-path-DhUZt0U6');import { c as useRoute, f as useRuntimeConfig, t as createError$2, R as catalogProductPath, n as navigateTo, T as catalogProductCategory, C as useNuxtApp, A as useHomeLocale, p as useStorefront, x as useStorefrontContent, k as storefrontProductImage, U as storefrontVariantPrice, V as catalogVolume, u as useHead, M as storefrontProductLink, S as SiteShell_default, N as NuxtLink, o as storefrontCatalogLink, O as SiteQuantityControl_default, Q as ProductCard_default } from '../virtual/entry.mjs';
import { u as useFetch, _ as _virtual_public__2Fstorefront_2Fhome_2Fhero_wordmark_default } from './fetch-Bp2XUQ0E.mjs';
import { u as useStorefrontSeo } from './useStorefrontSeo-DvgEOsDg.mjs';
import { S as SiteCatalogPage_default } from './SiteCatalogPage-7oJrOyIU.mjs';
import { defineComponent, withAsyncContext, ref, unref, mergeProps, computed, watch, withCtx, createVNode, createTextVNode, toDisplayString, openBlock, createBlock, Fragment, createCommentVNode, renderList, useSSRContext } from 'vue';
import { ssrRenderComponent, ssrRenderAttr, ssrInterpolate, ssrRenderClass, ssrRenderList, ssrIncludeBooleanAttr } from 'vue/server-renderer';
import { Heart, ChevronDown, Check, ShoppingBag, Truck, ArrowRight, ShieldCheck, ArrowLeft } from '@lucide/vue';
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
import './addons-CwJPC5tM.mjs';
import '@vue/shared';
import 'fnv1a-64';
import 'object-identity';

// components/storefront/SiteProductPage.vue?vue&type=script&setup=true&lang.ts
var SiteProductPage_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "SiteProductPage",
	__ssrInlineRender: true,
	props: { product: {} },
	async setup(__props) {
		let __temp, __restore;
		const props = __props;
		const product = computed(() => props.product);
		const productCategory = computed(() => catalogProductCategory(product.value));
		const config = useRuntimeConfig();
		const nuxtApp = useNuxtApp();
		const { t, english, formatPrice } = useHomeLocale();
		const name = computed(() => english.value && product.value?.nameEn ? product.value.nameEn : product.value?.nameRu);
		const description = computed(() => (english.value && product.value?.descriptionEn ? product.value.descriptionEn : product.value?.descriptionRu) || t("Подробное описание уточняйте у команды магазина. Перед применением ознакомьтесь с инструкцией на упаковке."));
		const quantity = ref(1);
		const added = ref(false);
		const adding = ref(false);
		const addError = ref("");
		const selectedImage = ref(0);
		const failedImages = ref([]);
		const selectedVariantId = ref("");
		let addedTimer;
		const apiBase = config.seoApiBase;
		const { data: catalog } = ([__temp, __restore] = withAsyncContext(() => useFetch("/products", {
			key: "product-page-recommendations",
			baseURL: apiBase,
			query: { limit: 24 }
		}, "$31lnvzPg06")), __temp = await __temp, __restore(), __temp);
		const { addToCart, favoriteIds, toggleFavorite} = useStorefront();
		const { storefrontMediaUrl, siteContent } = useStorefrontContent();
		const images = computed(() => {
			const primary = nuxtApp.runWithContext(() => storefrontProductImage(product.value));
			const gallery = (product.value?.images || []).filter((item) => typeof item.url === "string" && !item.url.startsWith("/catalog/")).slice().sort((a, b) => a.sortOrder - b.sortOrder).map((item) => storefrontMediaUrl(item.url));
			return [...new Set([primary, ...gallery].filter(Boolean))];
		});
		const image = computed(() => images.value[selectedImage.value] || images.value[0]);
		const variants = computed(() => (product.value?.variants || []).filter((item) => item.isActive !== false));
		const isGiftCard = computed(() => product.value?.productType === "GIFT_CARD");
		const variant = computed(() => variants.value.find((item) => item.id === selectedVariantId.value) || variants.value.find((item) => Number(item.stock) > Number(item.reserved || 0)) || variants.value[0]);
		const available = computed(() => isGiftCard.value && variant.value ? 99 : Math.max(0, Number(variant.value?.stock || 0) - Number(variant.value?.reserved || 0)));
		const price = computed(() => variant.value ? storefrontVariantPrice(variant.value, isGiftCard.value) : Number(product.value?.basePrice ?? 0));
		const regularPrice = computed(() => Number(variant.value?.regularPrice ?? variant.value?.price ?? product.value?.basePrice ?? 0));
		const volume = computed(() => isGiftCard.value ? "" : catalogVolume(variant.value, product.value));
		const options = computed(() => Object.entries(variant.value?.options || {}).filter(([key, value]) => ![
			"giftCard",
			"nominal",
			"validityDays"
		].includes(key) && (typeof value === "string" || typeof value === "number")));
		const optionLabels = {
			volume: "Объём",
			color: "Цвет",
			size: "Размер",
			weight: "Вес"
		};
		const inFavorite = computed(() => product.value && favoriteIds.value.includes(product.value.id));
		const otherProducts = computed(() => (catalog.value?.items || []).filter((item) => item.id !== product.value?.id));
		const sameCategory = computed(() => {
			const categoryIds = new Set((product.value?.categories || []).map((item) => item.categoryId || item.category?.id));
			return otherProducts.value.filter((item) => item.categories?.some((relation) => categoryIds.has(relation.categoryId || relation.category?.id)));
		});
		const boughtTogether = computed(() => {
			const complementary = otherProducts.value.filter((item) => !sameCategory.value.some((similar) => similar.id === item.id));
			return (complementary.length >= 4 ? complementary : otherProducts.value).slice(0, 4);
		});
		const similarProducts = computed(() => {
			const used = new Set(boughtTogether.value.map((item) => item.id));
			return [...sameCategory.value, ...otherProducts.value].filter((item, index, list) => !used.has(item.id) && list.findIndex((candidate) => candidate.id === item.id) === index).slice(0, 4);
		});
		function resetPurchase() {
			clearTimeout(addedTimer);
			quantity.value = 1;
			added.value = false;
			addError.value = "";
		}
		watch(() => variant.value?.id, resetPurchase);
		watch(() => product.value?.id, () => {
			selectedImage.value = 0;
			selectedVariantId.value = "";
			failedImages.value = [];
			resetPurchase();
		});
		async function add() {
			if (adding.value || !available.value) return;
			const variantId = variant.value?.id;
			adding.value = true;
			addError.value = "";
			try {
				await addToCart(product.value, quantity.value, variantId);
				if (variant.value?.id !== variantId) return;
				added.value = true;
				clearTimeout(addedTimer);
				addedTimer = setTimeout(() => {
					added.value = false;
				}, 1800);
			} catch (error) {
				if (variant.value?.id === variantId) addError.value = Array.isArray(error?.data?.message) ? error.data.message.join(". ") : error?.data?.message || t("Не удалось добавить товар. Попробуйте ещё раз.");
			} finally {
				adding.value = false;
			}
		}
		useHead(() => ({ htmlAttrs: { lang: english.value ? "en" : "ru" } }));
		useStorefrontSeo({
			title: () => product.value?.seo?.metaTitle || (name.value || t("Товар")) + " — " + siteContent.value.brand.name,
			description: () => product.value?.seo?.metaDesc || description.value,
			image: () => image.value,
			canonical: () => storefrontProductLink(product.value)
		});
		return (_ctx, _push, _parent, _attrs) => {
			const _component_SiteShell = SiteShell_default;
			const _component_NuxtLink = NuxtLink;
			const _component_SiteQuantityControl = SiteQuantityControl_default;
			const _component_ProductCard = ProductCard_default;
			_push(ssrRenderComponent(_component_SiteShell, mergeProps({
				editorial: "",
				product: ""
			}, _attrs), {
				default: withCtx((_, _push, _parent, _scopeId) => {
					if (_push) {
						if (unref(product)) {
							_push(`<div class="sp-page sh-container"${_scopeId}><header class="sp-masthead"${_scopeId}>`);
							_push(ssrRenderComponent(_component_NuxtLink, {
								to: "/",
								class: "sp-wordmark",
								"aria-label": unref(t)("На главную")
							}, {
								default: withCtx((_, _push, _parent, _scopeId) => {
									if (_push) _push(`<img${ssrRenderAttr("src", _virtual_public__2Fstorefront_2Fhome_2Fhero_wordmark_default)} alt="SARKISIAN" width="1412" height="196"${_scopeId}>`);
									else return [createVNode("img", {
										src: _virtual_public__2Fstorefront_2Fhome_2Fhero_wordmark_default,
										alt: "SARKISIAN",
										width: "1412",
										height: "196"
									})];
								}),
								_: 1
							}, _parent, _scopeId));
							_push(`<div class="sp-toolbar"${_scopeId}><nav class="sp-breadcrumbs"${ssrRenderAttr("aria-label", unref(t)("Навигация по каталогу"))}${_scopeId}>`);
							_push(ssrRenderComponent(_component_NuxtLink, { to: "/" }, {
								default: withCtx((_, _push, _parent, _scopeId) => {
									if (_push) _push(`${ssrInterpolate(unref(t)("Главная"))}`);
									else return [createTextVNode(toDisplayString(unref(t)("Главная")), 1)];
								}),
								_: 1
							}, _parent, _scopeId));
							_push(`<span aria-hidden="true"${_scopeId}>/</span>`);
							_push(ssrRenderComponent(_component_NuxtLink, { to: "/catalog" }, {
								default: withCtx((_, _push, _parent, _scopeId) => {
									if (_push) _push(`${ssrInterpolate(unref(t)("Каталог"))}`);
									else return [createTextVNode(toDisplayString(unref(t)("Каталог")), 1)];
								}),
								_: 1
							}, _parent, _scopeId));
							if (unref(productCategory)) {
								_push(`<!--[--><span aria-hidden="true"${_scopeId}>/</span>`);
								_push(ssrRenderComponent(_component_NuxtLink, { to: ("storefrontCatalogLink" in _ctx ? _ctx.storefrontCatalogLink : unref(storefrontCatalogLink))(unref(productCategory)) }, {
									default: withCtx((_, _push, _parent, _scopeId) => {
										if (_push) _push(`${ssrInterpolate(unref(t)(unref(productCategory).nameRu))}`);
										else return [createTextVNode(toDisplayString(unref(t)(unref(productCategory).nameRu)), 1)];
									}),
									_: 1
								}, _parent, _scopeId));
								_push(`<!--]-->`);
							} else _push(`<!---->`);
							_push(`<span aria-hidden="true"${_scopeId}>/</span><span aria-current="page"${_scopeId}>${ssrInterpolate(unref(name))}</span></nav></div></header><div class="sp-layout"${_scopeId}><div class="sp-media"${_scopeId}><div class="sp-gallery sb-design-frame"${_scopeId}><div class="sp-gallery-label"${_scopeId}><span${_scopeId}>${ssrInterpolate(unref(t)(unref(productCategory)?.nameRu || "SARKISIAN BRAND"))}</span>`);
							if (unref(images).length > 1) _push(`<span${_scopeId}>${ssrInterpolate(String(unref(selectedImage) + 1).padStart(2, "0"))} / ${ssrInterpolate(String(unref(images).length).padStart(2, "0"))}</span>`);
							else _push(`<!---->`);
							_push(`</div>`);
							if (unref(image) && !unref(failedImages).includes(unref(image))) _push(`<img class="sp-main-image"${ssrRenderAttr("src", unref(image))}${ssrRenderAttr("alt", unref(name))} fetchpriority="high"${_scopeId}>`);
							else _push(`<div class="${ssrRenderClass([{ "is-gift": unref(isGiftCard) }, "sp-placeholder"])}"${_scopeId}><span${_scopeId}>SARKISIAN</span><small${_scopeId}>${ssrInterpolate(unref(t)(unref(isGiftCard) ? "Подарочная карта" : "Фото появится позже"))}</small></div>`);
							_push(`<div class="sp-gallery-caption"${_scopeId}><span${_scopeId}>${ssrInterpolate(unref(t)("От мастера — к мастерам"))}</span><span${_scopeId}>${ssrInterpolate(unref(volume) || "SARKISIAN BRAND")}</span></div></div>`);
							if (unref(images).length > 1) {
								_push(`<div class="sp-thumbnails" role="group"${ssrRenderAttr("aria-label", unref(t)("Фотографии товара"))}${_scopeId}><!--[-->`);
								ssrRenderList(unref(images), (src, index) => {
									_push(`<button type="button" class="${ssrRenderClass({ "is-active": unref(selectedImage) === index })}"${ssrRenderAttr("aria-label", unref(t)("Фотография") + " " + (index + 1))}${ssrRenderAttr("aria-pressed", unref(selectedImage) === index)}${_scopeId}>`);
									if (!unref(failedImages).includes(src)) _push(`<img${ssrRenderAttr("src", src)} alt="" loading="lazy"${_scopeId}>`);
									else _push(`<span${_scopeId}>${ssrInterpolate(index + 1)}</span>`);
									_push(`</button>`);
								});
								_push(`<!--]--></div>`);
							} else _push(`<!---->`);
							_push(`</div><section class="sp-info" aria-labelledby="product-heading"${_scopeId}><div class="sp-eyebrow"${_scopeId}><span${_scopeId}>SARKISIAN BRAND</span><button type="button" class="${ssrRenderClass([{ "is-active": unref(inFavorite) }, "sp-favorite"])}"${ssrRenderAttr("aria-label", unref(t)(unref(inFavorite) ? "Убрать из избранного" : "Добавить в избранное"))}${ssrRenderAttr("aria-pressed", Boolean(unref(inFavorite)))}${_scopeId}>`);
							_push(ssrRenderComponent(unref(Heart), {
								size: 25,
								"stroke-width": 1.3,
								fill: unref(inFavorite) ? "currentColor" : "none"
							}, null, _parent, _scopeId));
							_push(`</button></div><h1 id="product-heading"${_scopeId}>${ssrInterpolate(unref(name))}</h1><div class="sp-meta"${_scopeId}>`);
							if (unref(variant)?.sku || unref(product).sku) _push(`<span${_scopeId}>${ssrInterpolate(unref(t)("Артикул"))}: ${ssrInterpolate(unref(variant)?.sku || unref(product).sku)}</span>`);
							else _push(`<!---->`);
							_push(`<span class="${ssrRenderClass([{ "is-unavailable": !unref(available) }, "sp-stock"])}"${_scopeId}>${ssrInterpolate(unref(t)(unref(isGiftCard) ? "Электронная карта" : unref(available) ? "В наличии" : "Нет в наличии"))}</span></div><div class="sp-price" aria-live="polite" aria-atomic="true"${_scopeId}><strong${_scopeId}>${ssrInterpolate(unref(formatPrice)(unref(price), unref(product).currency))}</strong>`);
							if (unref(regularPrice) > unref(price)) _push(`<del${_scopeId}>${ssrInterpolate(unref(formatPrice)(unref(regularPrice), unref(product).currency))}</del>`);
							else _push(`<!---->`);
							if (unref(volume)) _push(`<span${_scopeId}>${ssrInterpolate(unref(volume))}</span>`);
							else _push(`<!---->`);
							_push(`</div>`);
							if (unref(variants).length > 1) {
								_push(`<label class="sp-variant"${_scopeId}><span${_scopeId}>${ssrInterpolate(unref(t)(unref(isGiftCard) ? "Номинал карты" : "Вариант товара"))}</span><span class="sp-select"${_scopeId}><select${ssrRenderAttr("value", unref(variant)?.id)}${ssrIncludeBooleanAttr(unref(adding)) ? " disabled" : ""}${_scopeId}><!--[-->`);
								ssrRenderList(unref(variants), (item) => {
									_push(`<option${ssrRenderAttr("value", item.id)}${_scopeId}>${ssrInterpolate(item.name)}${ssrInterpolate(!unref(isGiftCard) && Number(item.stock) <= Number(item.reserved || 0) ? " — " + unref(t)("Нет в наличии") : "")}</option>`);
								});
								_push(`<!--]--></select>`);
								_push(ssrRenderComponent(unref(ChevronDown), {
									size: 18,
									"aria-hidden": "true"
								}, null, _parent, _scopeId));
								_push(`</span></label>`);
							} else _push(`<!---->`);
							if (unref(isGiftCard)) {
								_push(`<p class="sp-gift-note"${_scopeId}>${ssrInterpolate(unref(t)("Код станет доступен на странице заказа после подтверждения оплаты."))} `);
								if (unref(variant)?.options?.validityDays || unref(product).giftCardValidityDays) _push(`<!--[-->${ssrInterpolate(unref(t)("Срок действия"))} — ${ssrInterpolate(unref(variant)?.options?.validityDays || unref(product).giftCardValidityDays)} ${ssrInterpolate(unref(t)("дней с момента выпуска."))}<!--]-->`);
								else _push(`<!---->`);
								_push(`${ssrInterpolate(unref(t)("Карту можно использовать частями; остаток сохраняется. Покупка оформляется отдельно, без доставки и скидок."))}</p>`);
							} else _push(`<!---->`);
							_push(`<div class="sp-buy"${_scopeId}>`);
							_push(ssrRenderComponent(_component_SiteQuantityControl, {
								quantity: unref(quantity),
								max: unref(available),
								disabled: unref(adding) || !unref(available),
								onChange: ($event) => quantity.value = $event
							}, null, _parent, _scopeId));
							_push(`<button type="button" class="sb-design-button sp-add"${ssrIncludeBooleanAttr(unref(adding) || !unref(available)) ? " disabled" : ""}${_scopeId}>`);
							if (unref(added)) _push(ssrRenderComponent(unref(Check), { size: 18 }, null, _parent, _scopeId));
							else _push(ssrRenderComponent(unref(ShoppingBag), {
								size: 18,
								"stroke-width": 1.5
							}, null, _parent, _scopeId));
							_push(`${ssrInterpolate(unref(t)(unref(adding) ? "Добавляем…" : unref(added) ? "Добавлено" : unref(available) ? "Добавить в корзину" : "Нет в наличии"))}</button></div><span class="sb-visually-hidden" role="status"${_scopeId}>${ssrInterpolate(unref(added) ? unref(t)("Добавлено в корзину") : "")}</span>`);
							if (unref(addError)) _push(`<p class="sp-error" role="alert"${_scopeId}>${ssrInterpolate(unref(addError))}</p>`);
							else _push(`<!---->`);
							if (!unref(isGiftCard)) {
								_push(`<div class="sp-assurances"${_scopeId}>`);
								_push(ssrRenderComponent(_component_NuxtLink, { to: "/delivery" }, {
									default: withCtx((_, _push, _parent, _scopeId) => {
										if (_push) {
											_push(ssrRenderComponent(unref(Truck), {
												size: 21,
												"stroke-width": 1.3
											}, null, _parent, _scopeId));
											_push(`<span${_scopeId}>${ssrInterpolate(unref(t)("Доставка по России"))}<small${_scopeId}>${ssrInterpolate(unref(t)("Условия доставки и оплаты"))}</small></span>`);
											_push(ssrRenderComponent(unref(ArrowRight), {
												size: 18,
												"stroke-width": 1.3
											}, null, _parent, _scopeId));
										} else return [
											createVNode(unref(Truck), {
												size: 21,
												"stroke-width": 1.3
											}),
											createVNode("span", null, [createTextVNode(toDisplayString(unref(t)("Доставка по России")), 1), createVNode("small", null, toDisplayString(unref(t)("Условия доставки и оплаты")), 1)]),
											createVNode(unref(ArrowRight), {
												size: 18,
												"stroke-width": 1.3
											})
										];
									}),
									_: 1
								}, _parent, _scopeId));
								_push(`<div${_scopeId}>`);
								_push(ssrRenderComponent(unref(ShieldCheck), {
									size: 21,
									"stroke-width": 1.3
								}, null, _parent, _scopeId));
								_push(`<span${_scopeId}>${ssrInterpolate(unref(t)("Оригинальный продукт"))}<small${_scopeId}>${ssrInterpolate(unref(t)("Напрямую от производителя"))}</small></span></div></div>`);
							} else _push(`<!---->`);
							_push(`<div class="sp-details"${_scopeId}><details open${_scopeId}><summary${_scopeId}>${ssrInterpolate(unref(t)("О продукте"))}<span aria-hidden="true"${_scopeId}></span></summary><div class="sp-detail-body"${_scopeId}><p${_scopeId}>${ssrInterpolate(unref(description))}</p></div></details><details${_scopeId}><summary${_scopeId}>${ssrInterpolate(unref(t)("Сведения о товаре"))}<span aria-hidden="true"${_scopeId}></span></summary><div class="sp-detail-body"${_scopeId}><dl${_scopeId}><div${_scopeId}><dt${_scopeId}>${ssrInterpolate(unref(t)("Артикул"))}</dt><dd${_scopeId}>${ssrInterpolate(unref(variant)?.sku || unref(product).sku)}</dd></div>`);
							if (unref(variant)) _push(`<div${_scopeId}><dt${_scopeId}>${ssrInterpolate(unref(t)("Вариант"))}</dt><dd${_scopeId}>${ssrInterpolate(unref(t)(unref(variant).name))}</dd></div>`);
							else _push(`<!---->`);
							_push(`<!--[-->`);
							ssrRenderList(unref(options), ([key, value]) => {
								_push(`<div${_scopeId}><dt${_scopeId}>${ssrInterpolate(unref(t)(optionLabels[key] || key))}</dt><dd${_scopeId}>${ssrInterpolate(value)}</dd></div>`);
							});
							_push(`<!--]--></dl></div></details><details${_scopeId}><summary${_scopeId}>${ssrInterpolate(unref(t)("Покупка и возврат"))}<span aria-hidden="true"${_scopeId}></span></summary><div class="sp-detail-body"${_scopeId}><p${_scopeId}>${ssrInterpolate(unref(t)("Проверьте выбранный вариант и ознакомьтесь с условиями магазина."))}</p>`);
							_push(ssrRenderComponent(_component_NuxtLink, { to: "/returns" }, {
								default: withCtx((_, _push, _parent, _scopeId) => {
									if (_push) _push(`${ssrInterpolate(unref(t)("Правила возврата"))}`);
									else return [createTextVNode(toDisplayString(unref(t)("Правила возврата")), 1)];
								}),
								_: 1
							}, _parent, _scopeId));
							_push(ssrRenderComponent(_component_NuxtLink, { to: "/oferta" }, {
								default: withCtx((_, _push, _parent, _scopeId) => {
									if (_push) _push(`${ssrInterpolate(unref(t)("Публичная оферта"))}`);
									else return [createTextVNode(toDisplayString(unref(t)("Публичная оферта")), 1)];
								}),
								_: 1
							}, _parent, _scopeId));
							_push(`</div></details></div>`);
							_push(ssrRenderComponent(_component_NuxtLink, {
								to: "/contacts",
								class: "sp-help"
							}, {
								default: withCtx((_, _push, _parent, _scopeId) => {
									if (_push) {
										_push(`${ssrInterpolate(unref(t)("Поможем с выбором"))}`);
										_push(ssrRenderComponent(unref(ArrowRight), {
											size: 19,
											"stroke-width": 1.3
										}, null, _parent, _scopeId));
									} else return [createTextVNode(toDisplayString(unref(t)("Поможем с выбором")), 1), createVNode(unref(ArrowRight), {
										size: 19,
										"stroke-width": 1.3
									})];
								}),
								_: 1
							}, _parent, _scopeId));
							_push(`</section></div>`);
							if (unref(boughtTogether).length) {
								_push(`<section class="sp-recommendations" aria-labelledby="product-related-heading"${_scopeId}><header class="sp-section-heading"${_scopeId}><p${_scopeId}>${ssrInterpolate(unref(t)("Дополните свой набор"))}</p><div${_scopeId}><h2 id="product-related-heading"${_scopeId}>${ssrInterpolate(unref(t)("Вам также может понравиться"))}</h2>`);
								_push(ssrRenderComponent(_component_NuxtLink, {
									to: "/catalog",
									class: "sp-catalog-link"
								}, {
									default: withCtx((_, _push, _parent, _scopeId) => {
										if (_push) {
											_push(`${ssrInterpolate(unref(t)("Весь каталог"))}`);
											_push(ssrRenderComponent(unref(ArrowRight), {
												size: 32,
												"stroke-width": 1
											}, null, _parent, _scopeId));
										} else return [createTextVNode(toDisplayString(unref(t)("Весь каталог")), 1), createVNode(unref(ArrowRight), {
											size: 32,
											"stroke-width": 1
										})];
									}),
									_: 1
								}, _parent, _scopeId));
								_push(`</div></header><div class="sp-related-grid"${_scopeId}><!--[-->`);
								ssrRenderList(unref(boughtTogether), (item) => {
									_push(ssrRenderComponent(_component_ProductCard, {
										key: item.id,
										product: item,
										catalog: ""
									}, null, _parent, _scopeId));
								});
								_push(`<!--]--></div></section>`);
							} else _push(`<!---->`);
							if (unref(similarProducts).length) {
								_push(`<section class="sp-recommendations" aria-labelledby="product-similar-heading"${_scopeId}><header class="sp-section-heading"${_scopeId}><p${_scopeId}>${ssrInterpolate(unref(t)("Продолжите знакомство"))}</p><div${_scopeId}><h2 id="product-similar-heading"${_scopeId}>${ssrInterpolate(unref(t)("Похожие товары"))}</h2>`);
								_push(ssrRenderComponent(_component_NuxtLink, {
									to: unref(productCategory) ? ("storefrontCatalogLink" in _ctx ? _ctx.storefrontCatalogLink : unref(storefrontCatalogLink))(unref(productCategory)) : "/catalog",
									class: "sp-catalog-link"
								}, {
									default: withCtx((_, _push, _parent, _scopeId) => {
										if (_push) {
											_push(`${ssrInterpolate(unref(t)("Смотреть все"))}`);
											_push(ssrRenderComponent(unref(ArrowRight), {
												size: 32,
												"stroke-width": 1
											}, null, _parent, _scopeId));
										} else return [createTextVNode(toDisplayString(unref(t)("Смотреть все")), 1), createVNode(unref(ArrowRight), {
											size: 32,
											"stroke-width": 1
										})];
									}),
									_: 1
								}, _parent, _scopeId));
								_push(`</div></header><div class="sp-related-grid"${_scopeId}><!--[-->`);
								ssrRenderList(unref(similarProducts), (item) => {
									_push(ssrRenderComponent(_component_ProductCard, {
										key: item.id,
										product: item,
										catalog: ""
									}, null, _parent, _scopeId));
								});
								_push(`<!--]--></div></section>`);
							} else _push(`<!---->`);
							_push(ssrRenderComponent(_component_NuxtLink, {
								to: "/catalog",
								class: "sp-back sb-design-button"
							}, {
								default: withCtx((_, _push, _parent, _scopeId) => {
									if (_push) {
										_push(ssrRenderComponent(unref(ArrowLeft), { size: 18 }, null, _parent, _scopeId));
										_push(`${ssrInterpolate(unref(t)("Вернуться в каталог"))}`);
									} else return [createVNode(unref(ArrowLeft), { size: 18 }), createTextVNode(toDisplayString(unref(t)("Вернуться в каталог")), 1)];
								}),
								_: 1
							}, _parent, _scopeId));
							_push(`</div>`);
						} else {
							_push(`<div class="sp-empty sh-container"${_scopeId}><h1${_scopeId}>${ssrInterpolate(unref(t)("Товар не найден"))}</h1>`);
							_push(ssrRenderComponent(_component_NuxtLink, {
								to: "/catalog",
								class: "sb-design-button"
							}, {
								default: withCtx((_, _push, _parent, _scopeId) => {
									if (_push) _push(`${ssrInterpolate(unref(t)("Вернуться в каталог"))}`);
									else return [createTextVNode(toDisplayString(unref(t)("Вернуться в каталог")), 1)];
								}),
								_: 1
							}, _parent, _scopeId));
							_push(`</div>`);
						}
					} else return [unref(product) ? (openBlock(), createBlock("div", {
						key: 0,
						class: "sp-page sh-container"
					}, [
						createVNode("header", { class: "sp-masthead" }, [createVNode(_component_NuxtLink, {
							to: "/",
							class: "sp-wordmark",
							"aria-label": unref(t)("На главную")
						}, {
							default: withCtx(() => [createVNode("img", {
								src: _virtual_public__2Fstorefront_2Fhome_2Fhero_wordmark_default,
								alt: "SARKISIAN",
								width: "1412",
								height: "196"
							})]),
							_: 1
						}, 8, ["aria-label"]), createVNode("div", { class: "sp-toolbar" }, [createVNode("nav", {
							class: "sp-breadcrumbs",
							"aria-label": unref(t)("Навигация по каталогу")
						}, [
							createVNode(_component_NuxtLink, { to: "/" }, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(t)("Главная")), 1)]),
								_: 1
							}),
							createVNode("span", { "aria-hidden": "true" }, "/"),
							createVNode(_component_NuxtLink, { to: "/catalog" }, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(t)("Каталог")), 1)]),
								_: 1
							}),
							unref(productCategory) ? (openBlock(), createBlock(Fragment, { key: 0 }, [createVNode("span", { "aria-hidden": "true" }, "/"), createVNode(_component_NuxtLink, { to: ("storefrontCatalogLink" in _ctx ? _ctx.storefrontCatalogLink : unref(storefrontCatalogLink))(unref(productCategory)) }, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(t)(unref(productCategory).nameRu)), 1)]),
								_: 1
							}, 8, ["to"])], 64)) : createCommentVNode("", true),
							createVNode("span", { "aria-hidden": "true" }, "/"),
							createVNode("span", { "aria-current": "page" }, toDisplayString(unref(name)), 1)
						], 8, ["aria-label"])])]),
						createVNode("div", { class: "sp-layout" }, [createVNode("div", { class: "sp-media" }, [createVNode("div", { class: "sp-gallery sb-design-frame" }, [
							createVNode("div", { class: "sp-gallery-label" }, [createVNode("span", null, toDisplayString(unref(t)(unref(productCategory)?.nameRu || "SARKISIAN BRAND")), 1), unref(images).length > 1 ? (openBlock(), createBlock("span", { key: 0 }, toDisplayString(String(unref(selectedImage) + 1).padStart(2, "0")) + " / " + toDisplayString(String(unref(images).length).padStart(2, "0")), 1)) : createCommentVNode("", true)]),
							unref(image) && !unref(failedImages).includes(unref(image)) ? (openBlock(), createBlock("img", {
								key: unref(image),
								class: "sp-main-image",
								src: unref(image),
								alt: unref(name),
								fetchpriority: "high",
								onError: ($event) => unref(failedImages).push(unref(image))
							}, null, 40, [
								"src",
								"alt",
								"onError"
							])) : (openBlock(), createBlock("div", {
								key: 1,
								class: ["sp-placeholder", { "is-gift": unref(isGiftCard) }]
							}, [createVNode("span", null, "SARKISIAN"), createVNode("small", null, toDisplayString(unref(t)(unref(isGiftCard) ? "Подарочная карта" : "Фото появится позже")), 1)], 2)),
							createVNode("div", { class: "sp-gallery-caption" }, [createVNode("span", null, toDisplayString(unref(t)("От мастера — к мастерам")), 1), createVNode("span", null, toDisplayString(unref(volume) || "SARKISIAN BRAND"), 1)])
						]), unref(images).length > 1 ? (openBlock(), createBlock("div", {
							key: 0,
							class: "sp-thumbnails",
							role: "group",
							"aria-label": unref(t)("Фотографии товара")
						}, [(openBlock(true), createBlock(Fragment, null, renderList(unref(images), (src, index) => {
							return openBlock(), createBlock("button", {
								key: src,
								type: "button",
								class: { "is-active": unref(selectedImage) === index },
								"aria-label": unref(t)("Фотография") + " " + (index + 1),
								"aria-pressed": unref(selectedImage) === index,
								onClick: ($event) => selectedImage.value = index
							}, [!unref(failedImages).includes(src) ? (openBlock(), createBlock("img", {
								key: 0,
								src,
								alt: "",
								loading: "lazy",
								onError: ($event) => unref(failedImages).push(src)
							}, null, 40, ["src", "onError"])) : (openBlock(), createBlock("span", { key: 1 }, toDisplayString(index + 1), 1))], 10, [
								"aria-label",
								"aria-pressed",
								"onClick"
							]);
						}), 128))], 8, ["aria-label"])) : createCommentVNode("", true)]), createVNode("section", {
							class: "sp-info",
							"aria-labelledby": "product-heading"
						}, [
							createVNode("div", { class: "sp-eyebrow" }, [createVNode("span", null, "SARKISIAN BRAND"), createVNode("button", {
								type: "button",
								class: ["sp-favorite", { "is-active": unref(inFavorite) }],
								"aria-label": unref(t)(unref(inFavorite) ? "Убрать из избранного" : "Добавить в избранное"),
								"aria-pressed": Boolean(unref(inFavorite)),
								onClick: ($event) => unref(toggleFavorite)(unref(product).id)
							}, [createVNode(unref(Heart), {
								size: 25,
								"stroke-width": 1.3,
								fill: unref(inFavorite) ? "currentColor" : "none"
							}, null, 8, ["fill"])], 10, [
								"aria-label",
								"aria-pressed",
								"onClick"
							])]),
							createVNode("h1", { id: "product-heading" }, toDisplayString(unref(name)), 1),
							createVNode("div", { class: "sp-meta" }, [unref(variant)?.sku || unref(product).sku ? (openBlock(), createBlock("span", { key: 0 }, toDisplayString(unref(t)("Артикул")) + ": " + toDisplayString(unref(variant)?.sku || unref(product).sku), 1)) : createCommentVNode("", true), createVNode("span", { class: ["sp-stock", { "is-unavailable": !unref(available) }] }, toDisplayString(unref(t)(unref(isGiftCard) ? "Электронная карта" : unref(available) ? "В наличии" : "Нет в наличии")), 3)]),
							createVNode("div", {
								class: "sp-price",
								"aria-live": "polite",
								"aria-atomic": "true"
							}, [
								createVNode("strong", null, toDisplayString(unref(formatPrice)(unref(price), unref(product).currency)), 1),
								unref(regularPrice) > unref(price) ? (openBlock(), createBlock("del", { key: 0 }, toDisplayString(unref(formatPrice)(unref(regularPrice), unref(product).currency)), 1)) : createCommentVNode("", true),
								unref(volume) ? (openBlock(), createBlock("span", { key: 1 }, toDisplayString(unref(volume)), 1)) : createCommentVNode("", true)
							]),
							unref(variants).length > 1 ? (openBlock(), createBlock("label", {
								key: 0,
								class: "sp-variant"
							}, [createVNode("span", null, toDisplayString(unref(t)(unref(isGiftCard) ? "Номинал карты" : "Вариант товара")), 1), createVNode("span", { class: "sp-select" }, [createVNode("select", {
								value: unref(variant)?.id,
								disabled: unref(adding),
								onChange: ($event) => selectedVariantId.value = $event.target.value
							}, [(openBlock(true), createBlock(Fragment, null, renderList(unref(variants), (item) => {
								return openBlock(), createBlock("option", {
									key: item.id,
									value: item.id
								}, toDisplayString(item.name) + toDisplayString(!unref(isGiftCard) && Number(item.stock) <= Number(item.reserved || 0) ? " — " + unref(t)("Нет в наличии") : ""), 9, ["value"]);
							}), 128))], 40, [
								"value",
								"disabled",
								"onChange"
							]), createVNode(unref(ChevronDown), {
								size: 18,
								"aria-hidden": "true"
							})])])) : createCommentVNode("", true),
							unref(isGiftCard) ? (openBlock(), createBlock("p", {
								key: 1,
								class: "sp-gift-note"
							}, [
								createTextVNode(toDisplayString(unref(t)("Код станет доступен на странице заказа после подтверждения оплаты.")) + " ", 1),
								unref(variant)?.options?.validityDays || unref(product).giftCardValidityDays ? (openBlock(), createBlock(Fragment, { key: 0 }, [createTextVNode(toDisplayString(unref(t)("Срок действия")) + " — " + toDisplayString(unref(variant)?.options?.validityDays || unref(product).giftCardValidityDays) + " " + toDisplayString(unref(t)("дней с момента выпуска.")), 1)], 64)) : createCommentVNode("", true),
								createTextVNode(toDisplayString(unref(t)("Карту можно использовать частями; остаток сохраняется. Покупка оформляется отдельно, без доставки и скидок.")), 1)
							])) : createCommentVNode("", true),
							createVNode("div", { class: "sp-buy" }, [createVNode(_component_SiteQuantityControl, {
								quantity: unref(quantity),
								max: unref(available),
								disabled: unref(adding) || !unref(available),
								onChange: ($event) => quantity.value = $event
							}, null, 8, [
								"quantity",
								"max",
								"disabled",
								"onChange"
							]), createVNode("button", {
								type: "button",
								class: "sb-design-button sp-add",
								disabled: unref(adding) || !unref(available),
								onClick: add
							}, [unref(added) ? (openBlock(), createBlock(unref(Check), {
								key: 0,
								size: 18
							})) : (openBlock(), createBlock(unref(ShoppingBag), {
								key: 1,
								size: 18,
								"stroke-width": 1.5
							})), createTextVNode(toDisplayString(unref(t)(unref(adding) ? "Добавляем…" : unref(added) ? "Добавлено" : unref(available) ? "Добавить в корзину" : "Нет в наличии")), 1)], 8, ["disabled"])]),
							createVNode("span", {
								class: "sb-visually-hidden",
								role: "status"
							}, toDisplayString(unref(added) ? unref(t)("Добавлено в корзину") : ""), 1),
							unref(addError) ? (openBlock(), createBlock("p", {
								key: 2,
								class: "sp-error",
								role: "alert"
							}, toDisplayString(unref(addError)), 1)) : createCommentVNode("", true),
							!unref(isGiftCard) ? (openBlock(), createBlock("div", {
								key: 3,
								class: "sp-assurances"
							}, [createVNode(_component_NuxtLink, { to: "/delivery" }, {
								default: withCtx(() => [
									createVNode(unref(Truck), {
										size: 21,
										"stroke-width": 1.3
									}),
									createVNode("span", null, [createTextVNode(toDisplayString(unref(t)("Доставка по России")), 1), createVNode("small", null, toDisplayString(unref(t)("Условия доставки и оплаты")), 1)]),
									createVNode(unref(ArrowRight), {
										size: 18,
										"stroke-width": 1.3
									})
								]),
								_: 1
							}), createVNode("div", null, [createVNode(unref(ShieldCheck), {
								size: 21,
								"stroke-width": 1.3
							}), createVNode("span", null, [createTextVNode(toDisplayString(unref(t)("Оригинальный продукт")), 1), createVNode("small", null, toDisplayString(unref(t)("Напрямую от производителя")), 1)])])])) : createCommentVNode("", true),
							createVNode("div", { class: "sp-details" }, [
								createVNode("details", { open: "" }, [createVNode("summary", null, [createTextVNode(toDisplayString(unref(t)("О продукте")), 1), createVNode("span", { "aria-hidden": "true" })]), createVNode("div", { class: "sp-detail-body" }, [createVNode("p", null, toDisplayString(unref(description)), 1)])]),
								createVNode("details", null, [createVNode("summary", null, [createTextVNode(toDisplayString(unref(t)("Сведения о товаре")), 1), createVNode("span", { "aria-hidden": "true" })]), createVNode("div", { class: "sp-detail-body" }, [createVNode("dl", null, [
									createVNode("div", null, [createVNode("dt", null, toDisplayString(unref(t)("Артикул")), 1), createVNode("dd", null, toDisplayString(unref(variant)?.sku || unref(product).sku), 1)]),
									unref(variant) ? (openBlock(), createBlock("div", { key: 0 }, [createVNode("dt", null, toDisplayString(unref(t)("Вариант")), 1), createVNode("dd", null, toDisplayString(unref(t)(unref(variant).name)), 1)])) : createCommentVNode("", true),
									(openBlock(true), createBlock(Fragment, null, renderList(unref(options), ([key, value]) => {
										return openBlock(), createBlock("div", { key }, [createVNode("dt", null, toDisplayString(unref(t)(optionLabels[key] || key)), 1), createVNode("dd", null, toDisplayString(value), 1)]);
									}), 128))
								])])]),
								createVNode("details", null, [createVNode("summary", null, [createTextVNode(toDisplayString(unref(t)("Покупка и возврат")), 1), createVNode("span", { "aria-hidden": "true" })]), createVNode("div", { class: "sp-detail-body" }, [
									createVNode("p", null, toDisplayString(unref(t)("Проверьте выбранный вариант и ознакомьтесь с условиями магазина.")), 1),
									createVNode(_component_NuxtLink, { to: "/returns" }, {
										default: withCtx(() => [createTextVNode(toDisplayString(unref(t)("Правила возврата")), 1)]),
										_: 1
									}),
									createVNode(_component_NuxtLink, { to: "/oferta" }, {
										default: withCtx(() => [createTextVNode(toDisplayString(unref(t)("Публичная оферта")), 1)]),
										_: 1
									})
								])])
							]),
							createVNode(_component_NuxtLink, {
								to: "/contacts",
								class: "sp-help"
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(t)("Поможем с выбором")), 1), createVNode(unref(ArrowRight), {
									size: 19,
									"stroke-width": 1.3
								})]),
								_: 1
							})
						])]),
						unref(boughtTogether).length ? (openBlock(), createBlock("section", {
							key: 0,
							class: "sp-recommendations",
							"aria-labelledby": "product-related-heading"
						}, [createVNode("header", { class: "sp-section-heading" }, [createVNode("p", null, toDisplayString(unref(t)("Дополните свой набор")), 1), createVNode("div", null, [createVNode("h2", { id: "product-related-heading" }, toDisplayString(unref(t)("Вам также может понравиться")), 1), createVNode(_component_NuxtLink, {
							to: "/catalog",
							class: "sp-catalog-link"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(t)("Весь каталог")), 1), createVNode(unref(ArrowRight), {
								size: 32,
								"stroke-width": 1
							})]),
							_: 1
						})])]), createVNode("div", { class: "sp-related-grid" }, [(openBlock(true), createBlock(Fragment, null, renderList(unref(boughtTogether), (item) => {
							return openBlock(), createBlock(_component_ProductCard, {
								key: item.id,
								product: item,
								catalog: ""
							}, null, 8, ["product"]);
						}), 128))])])) : createCommentVNode("", true),
						unref(similarProducts).length ? (openBlock(), createBlock("section", {
							key: 1,
							class: "sp-recommendations",
							"aria-labelledby": "product-similar-heading"
						}, [createVNode("header", { class: "sp-section-heading" }, [createVNode("p", null, toDisplayString(unref(t)("Продолжите знакомство")), 1), createVNode("div", null, [createVNode("h2", { id: "product-similar-heading" }, toDisplayString(unref(t)("Похожие товары")), 1), createVNode(_component_NuxtLink, {
							to: unref(productCategory) ? ("storefrontCatalogLink" in _ctx ? _ctx.storefrontCatalogLink : unref(storefrontCatalogLink))(unref(productCategory)) : "/catalog",
							class: "sp-catalog-link"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(t)("Смотреть все")), 1), createVNode(unref(ArrowRight), {
								size: 32,
								"stroke-width": 1
							})]),
							_: 1
						}, 8, ["to"])])]), createVNode("div", { class: "sp-related-grid" }, [(openBlock(true), createBlock(Fragment, null, renderList(unref(similarProducts), (item) => {
							return openBlock(), createBlock(_component_ProductCard, {
								key: item.id,
								product: item,
								catalog: ""
							}, null, 8, ["product"]);
						}), 128))])])) : createCommentVNode("", true),
						createVNode(_component_NuxtLink, {
							to: "/catalog",
							class: "sp-back sb-design-button"
						}, {
							default: withCtx(() => [createVNode(unref(ArrowLeft), { size: 18 }), createTextVNode(toDisplayString(unref(t)("Вернуться в каталог")), 1)]),
							_: 1
						})
					])) : (openBlock(), createBlock("div", {
						key: 1,
						class: "sp-empty sh-container"
					}, [createVNode("h1", null, toDisplayString(unref(t)("Товар не найден")), 1), createVNode(_component_NuxtLink, {
						to: "/catalog",
						class: "sb-design-button"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(t)("Вернуться в каталог")), 1)]),
						_: 1
					})]))];
				}),
				_: 1
			}, _parent));
		};
	}
});
// components/storefront/SiteProductPage.vue
var _sfc_setup$1 = SiteProductPage_vue_vue_type_script_setup_true_lang_default.setup;
SiteProductPage_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/storefront/SiteProductPage.vue");
	return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
var SiteProductPage_default = Object.assign(SiteProductPage_vue_vue_type_script_setup_true_lang_default, { __name: "SiteProductPage" });
// pages/catalog-path.vue?vue&type=script&setup=true&lang.ts
var catalog_path_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "catalog-path",
	__ssrInlineRender: true,
	async setup(__props) {
		let __temp, __restore;
		const route = useRoute();
		const apiBase = useRuntimeConfig().seoApiBase;
		let segments;
		try {
			segments = route.path.slice(9).replace(/\/+$/, "").split("/").map((segment) => decodeURIComponent(segment));
		} catch {
			throw createError$2({
				statusCode: 404,
				statusMessage: "Страница каталога не найдена"
			});
		}
		if (segments.length < 1 || segments.length > 2 || segments.some((segment) => !segment || /[\/\\?#\s]/.test(segment))) throw createError$2({
			statusCode: 404,
			statusMessage: "Страница каталога не найдена"
		});
		const { data: categories, error: categoryError } = ([__temp, __restore] = withAsyncContext(() => useFetch("/products/categories", {
			key: "catalog-route-categories",
			baseURL: apiBase
		}, "$nLJ7BIyQgz")), __temp = await __temp, __restore(), __temp);
		if (categoryError.value) throw createError$2({
			statusCode: 503,
			statusMessage: "Не удалось загрузить каталог"
		});
		const category = categories.value?.find((item) => item.slug === segments[0]);
		const isCategory = segments.length === 1 && Boolean(category);
		const product = ref(null);
		if (!isCategory) {
			if (segments.length === 2 && !category) throw createError$2({
				statusCode: 404,
				statusMessage: "Категория не найдена"
			});
			const { data, error } = ([__temp, __restore] = withAsyncContext(() => useFetch(`/products/${encodeURIComponent(segments.at(-1))}`, {
				key: `catalog-route-product:${segments.at(-1)}`,
				baseURL: apiBase
			}, "$hKgEsMdNmO")), __temp = await __temp, __restore(), __temp);
			if (error.value || !data.value) throw createError$2({
				statusCode: error.value?.statusCode === 404 || !error.value && !data.value ? 404 : 503,
				statusMessage: error.value?.statusCode === 404 ? "Товар не найден" : "Не удалось загрузить товар"
			});
			if (segments.length === 2 && !data.value.categories?.some((item) => item.category?.slug === category.slug)) throw createError$2({
				statusCode: 404,
				statusMessage: "Товар не найден в этой категории"
			});
			const canonical = catalogProductPath(data.value);
			if (route.path.replace(/\/+$/, "") !== canonical) [__temp, __restore] = withAsyncContext(() => navigateTo(canonical, { replace: true })), await __temp, __restore();
			product.value = data.value;
		}
		return (_ctx, _push, _parent, _attrs) => {
			const _component_SiteCatalogPage = SiteCatalogPage_default;
			const _component_SiteProductPage = SiteProductPage_default;
			if (unref(isCategory)) _push(ssrRenderComponent(_component_SiteCatalogPage, mergeProps({ "category-slug": unref(category).slug }, _attrs), null, _parent));
			else if (unref(product)) _push(ssrRenderComponent(_component_SiteProductPage, mergeProps({ product: unref(product) }, _attrs), null, _parent));
			else _push(`<!---->`);
		};
	}
});
// pages/catalog-path.vue
var _sfc_setup = catalog_path_vue_vue_type_script_setup_true_lang_default.setup;
catalog_path_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/catalog-path.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var catalog_path_default = catalog_path_vue_vue_type_script_setup_true_lang_default;

export { catalog_path_default as default };;globalThis.__timing__.logEnd('Load chunks/build/catalog-path-DhUZt0U6');
//# sourceMappingURL=catalog-path-DhUZt0U6.mjs.map
