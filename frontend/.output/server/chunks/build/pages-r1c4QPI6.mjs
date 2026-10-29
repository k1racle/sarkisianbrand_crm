globalThis.__timing__.logStart('Load chunks/build/pages-r1c4QPI6');import { q as useStorefrontPanels, p as useStorefront, A as useHomeLocale, u as useHead, x as useStorefrontContent, _ as defaultSiteContent, S as SiteShell_default, Q as ProductCard_default, N as NuxtLink, a0 as storefrontActiveCategories, o as storefrontCatalogLink, f as useRuntimeConfig, n as navigateTo } from '../virtual/entry.mjs';
import { u as useFetch, _ as _virtual_public__2Fstorefront_2Fhome_2Fhero_wordmark_default } from './fetch-Bp2XUQ0E.mjs';
import { u as useStorefrontSeo } from './useStorefrontSeo-DvgEOsDg.mjs';
import { defineComponent, withAsyncContext, computed, mergeProps, withCtx, unref, createTextVNode, toDisplayString, createVNode, openBlock, createBlock, createCommentVNode, Fragment, renderList, useSSRContext } from 'vue';
import { p as publicAssetsURL } from '../routes/renderer.mjs';
import { ssrRenderComponent, ssrInterpolate, ssrRenderList, ssrRenderAttr, ssrRenderClass } from 'vue/server-renderer';
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
import 'unhead/utils';
import 'vue-router';
import '@lucide/vue';
import './addons-CwJPC5tM.mjs';
import '@vue/shared';
import 'fnv1a-64';
import 'object-identity';
import 'vue-bundle-renderer/runtime';
import 'devalue';

// \0virtual:public?%2Fstorefront%2Fhome%2Fsvetlana-hero.png
var _virtual_public__2Fstorefront_2Fhome_2Fsvetlana_hero_default = publicAssetsURL("/storefront/home/svetlana-hero.png");
// \0virtual:public?%2Fstorefront%2Fhome%2Fclub-wordmark.svg
var _virtual_public__2Fstorefront_2Fhome_2Fclub_wordmark_default = publicAssetsURL("/storefront/home/club-wordmark.svg");
// \0virtual:public?%2Fstorefront%2Fhome%2Freferral-title.svg
var _virtual_public__2Fstorefront_2Fhome_2Freferral_title_default = publicAssetsURL("/storefront/home/referral-title.svg");
// \0virtual:public?%2Fstorefront%2Fhome%2Forbit-outer.svg
var _virtual_public__2Fstorefront_2Fhome_2Forbit_outer_default = publicAssetsURL("/storefront/home/orbit-outer.svg");
// \0virtual:public?%2Fstorefront%2Fhome%2Forbit-top.svg
var _virtual_public__2Fstorefront_2Fhome_2Forbit_top_default = publicAssetsURL("/storefront/home/orbit-top.svg");
// \0virtual:public?%2Fstorefront%2Fhome%2Forbit-inner.svg
var _virtual_public__2Fstorefront_2Fhome_2Forbit_inner_default = publicAssetsURL("/storefront/home/orbit-inner.svg");
// \0virtual:public?%2Fstorefront%2Fhome%2Feyedropper.svg
var _virtual_public__2Fstorefront_2Fhome_2Feyedropper_default = publicAssetsURL("/storefront/home/eyedropper.svg");
// pages/index.vue?vue&type=script&setup=true&lang.ts
var index_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "index",
	__ssrInlineRender: true,
	async setup(__props) {
		let __temp, __restore;
		const config = useRuntimeConfig();
		const { openAuth } = useStorefrontPanels();
		const { user } = useStorefront();
		const { t, english, region, rates, ratesLoading, ratesError, loadRates } = useHomeLocale();
		useHead(() => ({ htmlAttrs: { lang: english.value ? "en" : "ru" } }));
		const { content, siteContent, loadStorefrontContent, storefrontMediaUrl } = useStorefrontContent();
		[__temp, __restore] = withAsyncContext(() => loadStorefrontContent()), await __temp, __restore();
		const home = computed(() => siteContent.value.home);
		const designOrder = [
			"hero",
			"manifesto",
			"story",
			"bestsellers",
			"benefits",
			"business",
			"club",
			"referral",
			"bloggers"
		];
		const visibleSections = computed(() => (home.value.order.join() === defaultSiteContent.home.order.join() ? designOrder : home.value.order).filter((key) => !home.value.hidden.includes(key)));
		const productQuery = computed(() => home.value.bestsellers.mode === "manual" ? {
			limit: 8,
			ids: home.value.bestsellers.productIds.join(","),
			sort: "new"
		} : {
			limit: 6,
			sort: "popular"
		});
		const { data, pending, error, refresh } = ([__temp, __restore] = withAsyncContext(() => useFetch("/products", {
			baseURL: config.public.apiBase,
			query: productQuery
		}, "$yJAWSXPbDj")), __temp = await __temp, __restore(), __temp);
		const products = computed(() => {
			const items = (data.value?.items || []).filter((item) => item.isActive !== false);
			if (home.value.bestsellers.mode !== "manual") return items.slice(0, 6);
			const byId = new Map(items.map((item) => [item.id, item]));
			return home.value.bestsellers.productIds.flatMap((id) => byId.has(id) ? [byId.get(id)] : []);
		});
		const joinClub = () => user.value ? navigateTo("/account?tab=loyalty") : openAuth("register");
		const founderPortrait = computed(() => home.value.story.portraitUrl === defaultSiteContent.home.story.portraitUrl ? "/storefront/home/svetlana-founder.png" : storefrontMediaUrl(home.value.story.portraitUrl));
		const orbitLabels = [
			{
				key: "salon",
				text: "[ За привлечение нового салона ]"
			},
			{
				key: "reward",
				text: "[ Фиксированная награда ]"
			},
			{
				key: "share",
				text: "[ Делитесь опытом с аудиторией ]"
			},
			{
				key: "track",
				text: "[ Следите за рекомендациями ]"
			},
			{
				key: "payment",
				text: "[ Получайте денежное вознаграждение ]"
			}
		];
		useStorefrontSeo({
			title: () => `${siteContent.value.brand.name} — профессиональные материалы для маникюра`,
			description: "Официальный интернет-магазин SARKISIAN BRAND. Профессиональные материалы для маникюра, клуб мастеров и решения для бизнеса.",
			image: "/storefront/home/svetlana-hero.png"
		});
		return (_ctx, _push, _parent, _attrs) => {
			const _component_SiteShell = SiteShell_default;
			const _component_ProductCard = ProductCard_default;
			const _component_NuxtLink = NuxtLink;
			_push(ssrRenderComponent(_component_SiteShell, mergeProps({ editorial: "" }, _attrs), {
				default: withCtx((_, _push, _parent, _scopeId) => {
					if (_push) {
						if (unref(home).hidden.includes("hero")) _push(`<h1 class="sb-visually-hidden"${_scopeId}>${ssrInterpolate(unref(siteContent).brand.name)} — материалы для мастеров маникюра</h1>`);
						else _push(`<!---->`);
						_push(`<!--[-->`);
						ssrRenderList(unref(visibleSections), (section) => {
							_push(`<!--[-->`);
							if (section === "hero") _push(`<section class="sh-hero sh-container"${_scopeId}><h1${_scopeId}><span class="sb-visually-hidden"${_scopeId}>SARKISIAN — профессиональные материалы для мастеров маникюра</span><img${ssrRenderAttr("src", _virtual_public__2Fstorefront_2Fhome_2Fhero_wordmark_default)} alt="" fetchpriority="high"${_scopeId}></h1><div class="sh-hero-copy"${_scopeId}><p${_scopeId}>${ssrInterpolate(unref(t)("Премиальный бренд для мастеров маникюра, который понимает профессию изнутри."))}<br${_scopeId}>${ssrInterpolate(unref(t)("Материалы, которые помогают работать быстрее и увереннее"))}</p><span${_scopeId}>${ssrInterpolate(unref(t)("От мастера — к мастерам"))}</span></div><img class="sh-hero-portrait"${ssrRenderAttr("src", _virtual_public__2Fstorefront_2Fhome_2Fsvetlana_hero_default)} alt="Светлана Саркисян — основательница бренда" width="796" height="1195" fetchpriority="high"${_scopeId}></section>`);
							else if (section === "manifesto") _push(`<section id="about" class="sh-about sh-container"${_scopeId}><h2 class="sh-about-label"${_scopeId}><span${_scopeId}>${ssrInterpolate(unref(t)("О"))}</span><span${_scopeId}>${ssrInterpolate(unref(t)("бренде"))}</span></h2><div class="sh-about-intro"${_scopeId}><span aria-hidden="true"${_scopeId}>SARKISIAN</span><p${_scopeId}>${ssrInterpolate(unref(t)(unref(home).manifesto.text))}<br${_scopeId}>${ssrInterpolate(unref(t)("Материалы, которые помогают работать быстрее и увереннее."))}</p></div><p class="sh-about-body"${_scopeId}>${ssrInterpolate(unref(t)(unref(home).story.body))}</p><div class="sh-media-placeholder sh-about-media" aria-hidden="true"${_scopeId}></div></section>`);
							else if (section === "story") _push(`<section class="sh-founder sh-container" aria-labelledby="founder-heading"${_scopeId}><h2 id="founder-heading"${_scopeId}><span class="sh-founder-first"${_scopeId}>${ssrInterpolate(unref(t)("Светлана"))}</span><span class="sh-founder-last"${_scopeId}>${ssrInterpolate(unref(t)("Саркисян"))}</span></h2><p class="sh-founder-intro"${_scopeId}>${ssrInterpolate(unref(t)("В её работе встречаются два направления: практика мастера и создание профессиональных материалов для ногтевого сервиса."))}</p><img class="sh-founder-portrait"${ssrRenderAttr("src", unref(founderPortrait))} alt="Светлана Саркисян" width="609" height="914" loading="lazy"${_scopeId}><ul class="sh-founder-roles"${_scopeId}><li${_scopeId}>${ssrInterpolate(unref(t)("Основатель"))}<br${_scopeId}>${ssrInterpolate(unref(t)("бренда"))}</li><li${_scopeId}>${ssrInterpolate(unref(t)("Блогер"))}</li><li${_scopeId}>${ssrInterpolate(unref(t)("Мастер"))}<br${_scopeId}>${ssrInterpolate(unref(t)("маникюра"))}</li></ul><div class="sh-founder-story"${_scopeId}><p${_scopeId}>${ssrInterpolate(unref(t)("Понимаем профессию изнутри"))}</p><p${_scopeId}>${ssrInterpolate(unref(t)("Опыт ежедневной работы стал основой бренда. SARKISIAN выпускает материалы для маникюра под личным контролем Светланы — с вниманием к тому, как продукт ведёт себя в руках мастера."))}</p></div><p class="sh-founder-caption"${_scopeId}>${ssrInterpolate(unref(t)("Бренд объединяет материалы и инструменты для мастеров, которые ценят понятный выбор и внимательное отношение к своей работе."))}</p></section>`);
							else if (section === "bestsellers") {
								_push(`<section id="products" class="sh-products sh-container" aria-labelledby="products-heading"${_scopeId}><h2 id="products-heading" class="sh-products-title"${_scopeId}>${ssrInterpolate(unref(t)("Продукты"))}</h2><p class="sh-products-intro"${_scopeId}>${ssrInterpolate(unref(t)("В каталоге представлены гели, гель-лаки, базы, топы, фрезы и инструменты."))}<br${_scopeId}>${ssrInterpolate(unref(t)("В карточках товаров можно посмотреть фотографии, описание, стоимость и доступные варианты."))}</p>`);
								if (unref(region).currency !== "RUB") {
									_push(`<div class="sh-products-currency" role="status"${_scopeId}><span${_scopeId}>${ssrInterpolate(unref(t)(unref(rates) ? "Приблизительный пересчёт. Оплата в рублях." : unref(ratesLoading) ? "Загружаем курсы. Пока цены в рублях." : "Курсы недоступны — цены показаны в рублях."))}</span>`);
									if (unref(rates)) _push(`<a href="https://www.cbr.ru/currency_base/daily/" target="_blank" rel="noopener noreferrer"${_scopeId}>${ssrInterpolate(unref(t)("Курс ЦБ от"))} ${ssrInterpolate(unref(rates).date)}</a>`);
									else _push(`<!---->`);
									if (unref(ratesError)) _push(`<button${_scopeId}>${ssrInterpolate(unref(t)("Обновить курсы"))}</button>`);
									else _push(`<!---->`);
									_push(`</div>`);
								} else _push(`<!---->`);
								if (unref(pending)) _push(`<div class="sh-products-state" role="status"${_scopeId}>${ssrInterpolate(unref(t)("Загружаем каталог…"))}</div>`);
								else if (unref(error)) _push(`<div class="sh-products-state" role="alert"${_scopeId}><p${_scopeId}>${ssrInterpolate(unref(t)("Не удалось загрузить товары."))}</p><button class="sh-pill"${_scopeId}>${ssrInterpolate(unref(t)("Попробовать ещё раз"))}</button></div>`);
								else if (!unref(products).length) _push(`<div class="sh-products-state"${_scopeId}>${ssrInterpolate(unref(t)("Товары подборки пока недоступны."))}</div>`);
								else {
									_push(`<div class="sh-product-grid"${_scopeId}><!--[-->`);
									ssrRenderList(unref(products), (product) => {
										_push(ssrRenderComponent(_component_ProductCard, {
											key: product.id,
											product,
											editorial: ""
										}, null, _parent, _scopeId));
									});
									_push(`<!--]--></div>`);
								}
								_push(`<div class="sh-products-outro"${_scopeId}>`);
								_push(ssrRenderComponent(_component_NuxtLink, {
									to: "/catalog",
									class: "sh-pill"
								}, {
									default: withCtx((_, _push, _parent, _scopeId) => {
										if (_push) _push(`${ssrInterpolate(unref(t)(unref(home).bestsellers.buttonLabel))}`);
										else return [createTextVNode(toDisplayString(unref(t)(unref(home).bestsellers.buttonLabel)), 1)];
									}),
									_: 2
								}, _parent, _scopeId));
								_push(`<p${_scopeId}>${ssrInterpolate(unref(t)("Выбирайте продукты под привычную технику и задачи. Если сомневаетесь,"))} `);
								_push(ssrRenderComponent(_component_NuxtLink, { to: "/contacts" }, {
									default: withCtx((_, _push, _parent, _scopeId) => {
										if (_push) _push(`${ssrInterpolate(unref(t)("напишите нам"))}`);
										else return [createTextVNode(toDisplayString(unref(t)("напишите нам")), 1)];
									}),
									_: 2
								}, _parent, _scopeId));
								_push(`${ssrInterpolate(unref(t)(": поможем разобраться в ассортименте, не обещая универсального решения для всех."))}</p></div></section>`);
							} else if (section === "categories") {
								_push(`<section class="sh-categories sh-container"${_scopeId}><h2${_scopeId}>${ssrInterpolate(unref(t)(unref(home).categories.title))}</h2><div${_scopeId}><!--[-->`);
								ssrRenderList(("storefrontActiveCategories" in _ctx ? _ctx.storefrontActiveCategories : unref(storefrontActiveCategories))(unref(content).categories).filter((item) => !item.parentId), (category) => {
									_push(ssrRenderComponent(_component_NuxtLink, {
										key: category.id,
										class: "sh-pill",
										to: ("storefrontCatalogLink" in _ctx ? _ctx.storefrontCatalogLink : unref(storefrontCatalogLink))(category.slug)
									}, {
										default: withCtx((_, _push, _parent, _scopeId) => {
											if (_push) _push(`${ssrInterpolate(category.nameRu)}`);
											else return [createTextVNode(toDisplayString(category.nameRu), 1)];
										}),
										_: 2
									}, _parent, _scopeId));
								});
								_push(`<!--]--></div></section>`);
							} else if (section === "benefits") {
								_push(`<section class="sh-benefits sh-container" aria-labelledby="benefits-heading"${_scopeId}><h2 id="benefits-heading"${_scopeId}><span${_scopeId}>${ssrInterpolate(unref(t)("Почему"))}</span><span${_scopeId}>${ssrInterpolate(unref(t)("нас? выбирают"))}</span></h2><div class="sh-benefit-grid"${_scopeId}><!--[-->`);
								ssrRenderList(unref(home).benefits, (benefit, index) => {
									_push(`<article${_scopeId}><span class="sh-benefit-number" aria-hidden="true"${_scopeId}>${ssrInterpolate(String(index + 1).padStart(2, "0"))}</span><h3${_scopeId}>${ssrInterpolate(unref(t)(benefit.title))}</h3><p${_scopeId}>${ssrInterpolate(unref(t)(benefit.body))}</p></article>`);
								});
								_push(`<!--]--></div>`);
								_push(ssrRenderComponent(_component_NuxtLink, {
									to: "/catalog",
									class: "sh-pill"
								}, {
									default: withCtx((_, _push, _parent, _scopeId) => {
										if (_push) _push(`${ssrInterpolate(unref(t)("Заказать"))}`);
										else return [createTextVNode(toDisplayString(unref(t)("Заказать")), 1)];
									}),
									_: 2
								}, _parent, _scopeId));
								_push(`</section>`);
							} else if (section === "business") {
								_push(`<section class="sh-business sh-container" aria-labelledby="business-heading"${_scopeId}><div class="sh-business-swatches" aria-hidden="true"${_scopeId}><span${_scopeId}></span><span${_scopeId}></span><span${_scopeId}></span></div><div class="sh-business-copy"${_scopeId}><p${_scopeId}>${ssrInterpolate(unref(t)(unref(home).business.body))}</p><p${_scopeId}>${ssrInterpolate(unref(t)(unref(home).business.title))}<br${_scopeId}>${ssrInterpolate(unref(t)(unref(home).business.accent))}</p><h2 id="business-heading"${_scopeId}>${ssrInterpolate(unref(t)("Для"))}<br${_scopeId}>${ssrInterpolate(unref(t)("бизнеса"))}</h2></div><nav class="sh-business-directions" aria-label="Решения для бизнеса"${_scopeId}>`);
								_push(ssrRenderComponent(_component_NuxtLink, { to: unref(home).business.url }, {
									default: withCtx((_, _push, _parent, _scopeId) => {
										if (_push) _push(`${ssrInterpolate(unref(t)("Мой"))}<br${_scopeId}>${ssrInterpolate(unref(t)("салон"))}`);
										else return [
											createTextVNode(toDisplayString(unref(t)("Мой")), 1),
											createVNode("br"),
											createTextVNode(toDisplayString(unref(t)("салон")), 1)
										];
									}),
									_: 2
								}, _parent, _scopeId));
								_push(ssrRenderComponent(_component_NuxtLink, { to: unref(home).business.url }, {
									default: withCtx((_, _push, _parent, _scopeId) => {
										if (_push) _push(`${ssrInterpolate(unref(t)("Онлайн"))}<br${_scopeId}>${ssrInterpolate(unref(t)("запись"))}`);
										else return [
											createTextVNode(toDisplayString(unref(t)("Онлайн")), 1),
											createVNode("br"),
											createTextVNode(toDisplayString(unref(t)("запись")), 1)
										];
									}),
									_: 2
								}, _parent, _scopeId));
								_push(ssrRenderComponent(_component_NuxtLink, { to: unref(home).business.url }, {
									default: withCtx((_, _push, _parent, _scopeId) => {
										if (_push) _push(`${ssrInterpolate(unref(t)("Закупки"))}<br${_scopeId}>SARKISIAN`);
										else return [
											createTextVNode(toDisplayString(unref(t)("Закупки")), 1),
											createVNode("br"),
											createTextVNode("SARKISIAN")
										];
									}),
									_: 2
								}, _parent, _scopeId));
								_push(`</nav><div class="sh-business-media sh-media-placeholder" aria-hidden="true"${_scopeId}>`);
								if (unref(home).business.visualImageUrl) _push(`<img${ssrRenderAttr("src", unref(storefrontMediaUrl)(unref(home).business.visualImageUrl))} alt="" loading="lazy"${_scopeId}>`);
								else _push(`<!---->`);
								_push(`</div>`);
								_push(ssrRenderComponent(_component_NuxtLink, {
									to: unref(home).business.url,
									class: "sh-pill sh-business-open"
								}, {
									default: withCtx((_, _push, _parent, _scopeId) => {
										if (_push) _push(`${ssrInterpolate(unref(t)("Открыть"))}`);
										else return [createTextVNode(toDisplayString(unref(t)("Открыть")), 1)];
									}),
									_: 2
								}, _parent, _scopeId));
								_push(`</section>`);
							} else if (section === "club") {
								_push(`<section class="sh-club sh-container" aria-labelledby="club-heading"${_scopeId}><ul${_scopeId}><!--[-->`);
								ssrRenderList([...unref(home).club.benefits].reverse(), (benefit) => {
									_push(`<li${_scopeId}>${ssrInterpolate(unref(t)(benefit.text))}</li>`);
								});
								_push(`<!--]--></ul><p class="sh-club-lead"${_scopeId}>${ssrInterpolate(unref(t)(unref(home).club.title))}</p><h2 id="club-heading"${_scopeId}><img${ssrRenderAttr("src", _virtual_public__2Fstorefront_2Fhome_2Fclub_wordmark_default)}${ssrRenderAttr("alt", unref(home).club.label)} loading="lazy"${_scopeId}></h2><p${_scopeId}>${ssrInterpolate(unref(t)(unref(home).club.accent))}</p><div class="sh-club-actions"${_scopeId}>`);
								_push(ssrRenderComponent(_component_NuxtLink, {
									to: "/club",
									class: "sh-pill"
								}, {
									default: withCtx((_, _push, _parent, _scopeId) => {
										if (_push) _push(`${ssrInterpolate(unref(t)(unref(home).club.aboutLabel))}`);
										else return [createTextVNode(toDisplayString(unref(t)(unref(home).club.aboutLabel)), 1)];
									}),
									_: 2
								}, _parent, _scopeId));
								_push(`<button class="sh-pill"${_scopeId}>${ssrInterpolate(unref(t)(unref(home).club.joinLabel))}</button></div></section>`);
							} else if (section === "referral") {
								_push(`<section class="sh-referral" aria-labelledby="referral-heading"${_scopeId}><div class="sh-container"${_scopeId}><div class="sh-referral-copy"${_scopeId}><p${_scopeId}>${ssrInterpolate(unref(t)(unref(home).referral.body))}</p>`);
								_push(ssrRenderComponent(_component_NuxtLink, {
									to: unref(home).referral.url,
									class: "sh-pill"
								}, {
									default: withCtx((_, _push, _parent, _scopeId) => {
										if (_push) _push(`${ssrInterpolate(unref(t)("Как это работает?"))}`);
										else return [createTextVNode(toDisplayString(unref(t)("Как это работает?")), 1)];
									}),
									_: 2
								}, _parent, _scopeId));
								_push(`</div><h2 id="referral-heading"${_scopeId}>`);
								if (unref(english)) _push(`<span class="sh-referral-english"${_scopeId}>From a professional.<br${_scopeId}>To friends.</span>`);
								else _push(`<img${ssrRenderAttr("src", _virtual_public__2Fstorefront_2Fhome_2Freferral_title_default)} alt="От мастера — друзьям" loading="lazy"${_scopeId}>`);
								_push(`</h2></div><div class="sh-referral-media" aria-hidden="true"${_scopeId}><div${_scopeId}>`);
								if (unref(home).referral.visualImageUrl) _push(`<img${ssrRenderAttr("src", unref(storefrontMediaUrl)(unref(home).referral.visualImageUrl))} alt="" loading="lazy"${_scopeId}>`);
								else _push(`<!---->`);
								_push(`</div><div${_scopeId}></div></div></section>`);
							} else if (section === "bloggers") {
								_push(`<section class="sh-bloggers sh-container" aria-labelledby="bloggers-heading"${_scopeId}><div class="sh-bloggers-copy"${_scopeId}><p${_scopeId}>${ssrInterpolate(unref(t)("За привлечение нового салона или бизнеса предусмотрена отдельная фиксированная награда."))}</p>`);
								_push(ssrRenderComponent(_component_NuxtLink, {
									to: unref(home).bloggers.url,
									class: "sh-pill"
								}, {
									default: withCtx((_, _push, _parent, _scopeId) => {
										if (_push) _push(`${ssrInterpolate(unref(t)("Узнать подробнее"))}`);
										else return [createTextVNode(toDisplayString(unref(t)("Узнать подробнее")), 1)];
									}),
									_: 2
								}, _parent, _scopeId));
								_push(`</div><div class="sh-orbit"${_scopeId}><h2 id="bloggers-heading"${_scopeId}>${ssrInterpolate(unref(t)("Для"))}<br${_scopeId}>${ssrInterpolate(unref(t)("блогеров"))}</h2><img class="sh-orbit-outer"${ssrRenderAttr("src", _virtual_public__2Fstorefront_2Fhome_2Forbit_outer_default)} alt="" loading="lazy"${_scopeId}><img class="sh-orbit-top"${ssrRenderAttr("src", _virtual_public__2Fstorefront_2Fhome_2Forbit_top_default)} alt="" loading="lazy"${_scopeId}><img class="sh-orbit-inner"${ssrRenderAttr("src", _virtual_public__2Fstorefront_2Fhome_2Forbit_inner_default)} alt="" loading="lazy"${_scopeId}><img class="sh-orbit-eyedropper"${ssrRenderAttr("src", _virtual_public__2Fstorefront_2Fhome_2Feyedropper_default)} alt="" loading="lazy"${_scopeId}><!--[-->`);
								ssrRenderList(orbitLabels, (item) => {
									_push(`<div class="${ssrRenderClass([`sh-orbit-${item.key}`, "sh-orbit-chip"])}"${_scopeId}><img${ssrRenderAttr("src", `/storefront/home/sample-${item.key}.svg`)} alt="" loading="lazy"${_scopeId}><span${_scopeId}>${ssrInterpolate(unref(t)(item.text))}</span></div>`);
								});
								_push(`<!--]--></div></section>`);
							} else _push(`<!---->`);
							_push(`<!--]-->`);
						});
						_push(`<!--]-->`);
					} else return [unref(home).hidden.includes("hero") ? (openBlock(), createBlock("h1", {
						key: 0,
						class: "sb-visually-hidden"
					}, toDisplayString(unref(siteContent).brand.name) + " — материалы для мастеров маникюра", 1)) : createCommentVNode("", true), (openBlock(true), createBlock(Fragment, null, renderList(unref(visibleSections), (section) => {
						return openBlock(), createBlock(Fragment, { key: section }, [section === "hero" ? (openBlock(), createBlock("section", {
							key: 0,
							class: "sh-hero sh-container"
						}, [
							createVNode("h1", null, [createVNode("span", { class: "sb-visually-hidden" }, "SARKISIAN — профессиональные материалы для мастеров маникюра"), createVNode("img", {
								src: _virtual_public__2Fstorefront_2Fhome_2Fhero_wordmark_default,
								alt: "",
								fetchpriority: "high"
							})]),
							createVNode("div", { class: "sh-hero-copy" }, [createVNode("p", null, [
								createTextVNode(toDisplayString(unref(t)("Премиальный бренд для мастеров маникюра, который понимает профессию изнутри.")), 1),
								createVNode("br"),
								createTextVNode(toDisplayString(unref(t)("Материалы, которые помогают работать быстрее и увереннее")), 1)
							]), createVNode("span", null, toDisplayString(unref(t)("От мастера — к мастерам")), 1)]),
							createVNode("img", {
								class: "sh-hero-portrait",
								src: _virtual_public__2Fstorefront_2Fhome_2Fsvetlana_hero_default,
								alt: "Светлана Саркисян — основательница бренда",
								width: "796",
								height: "1195",
								fetchpriority: "high"
							})
						])) : section === "manifesto" ? (openBlock(), createBlock("section", {
							key: 1,
							id: "about",
							class: "sh-about sh-container"
						}, [
							createVNode("h2", { class: "sh-about-label" }, [createVNode("span", null, toDisplayString(unref(t)("О")), 1), createVNode("span", null, toDisplayString(unref(t)("бренде")), 1)]),
							createVNode("div", { class: "sh-about-intro" }, [createVNode("span", { "aria-hidden": "true" }, "SARKISIAN"), createVNode("p", null, [
								createTextVNode(toDisplayString(unref(t)(unref(home).manifesto.text)), 1),
								createVNode("br"),
								createTextVNode(toDisplayString(unref(t)("Материалы, которые помогают работать быстрее и увереннее.")), 1)
							])]),
							createVNode("p", { class: "sh-about-body" }, toDisplayString(unref(t)(unref(home).story.body)), 1),
							createVNode("div", {
								class: "sh-media-placeholder sh-about-media",
								"aria-hidden": "true"
							})
						])) : section === "story" ? (openBlock(), createBlock("section", {
							key: 2,
							class: "sh-founder sh-container",
							"aria-labelledby": "founder-heading"
						}, [
							createVNode("h2", { id: "founder-heading" }, [createVNode("span", { class: "sh-founder-first" }, toDisplayString(unref(t)("Светлана")), 1), createVNode("span", { class: "sh-founder-last" }, toDisplayString(unref(t)("Саркисян")), 1)]),
							createVNode("p", { class: "sh-founder-intro" }, toDisplayString(unref(t)("В её работе встречаются два направления: практика мастера и создание профессиональных материалов для ногтевого сервиса.")), 1),
							createVNode("img", {
								class: "sh-founder-portrait",
								src: unref(founderPortrait),
								alt: "Светлана Саркисян",
								width: "609",
								height: "914",
								loading: "lazy"
							}, null, 8, ["src"]),
							createVNode("ul", { class: "sh-founder-roles" }, [
								createVNode("li", null, [
									createTextVNode(toDisplayString(unref(t)("Основатель")), 1),
									createVNode("br"),
									createTextVNode(toDisplayString(unref(t)("бренда")), 1)
								]),
								createVNode("li", null, toDisplayString(unref(t)("Блогер")), 1),
								createVNode("li", null, [
									createTextVNode(toDisplayString(unref(t)("Мастер")), 1),
									createVNode("br"),
									createTextVNode(toDisplayString(unref(t)("маникюра")), 1)
								])
							]),
							createVNode("div", { class: "sh-founder-story" }, [createVNode("p", null, toDisplayString(unref(t)("Понимаем профессию изнутри")), 1), createVNode("p", null, toDisplayString(unref(t)("Опыт ежедневной работы стал основой бренда. SARKISIAN выпускает материалы для маникюра под личным контролем Светланы — с вниманием к тому, как продукт ведёт себя в руках мастера.")), 1)]),
							createVNode("p", { class: "sh-founder-caption" }, toDisplayString(unref(t)("Бренд объединяет материалы и инструменты для мастеров, которые ценят понятный выбор и внимательное отношение к своей работе.")), 1)
						])) : section === "bestsellers" ? (openBlock(), createBlock("section", {
							key: 3,
							id: "products",
							class: "sh-products sh-container",
							"aria-labelledby": "products-heading"
						}, [
							createVNode("h2", {
								id: "products-heading",
								class: "sh-products-title"
							}, toDisplayString(unref(t)("Продукты")), 1),
							createVNode("p", { class: "sh-products-intro" }, [
								createTextVNode(toDisplayString(unref(t)("В каталоге представлены гели, гель-лаки, базы, топы, фрезы и инструменты.")), 1),
								createVNode("br"),
								createTextVNode(toDisplayString(unref(t)("В карточках товаров можно посмотреть фотографии, описание, стоимость и доступные варианты.")), 1)
							]),
							unref(region).currency !== "RUB" ? (openBlock(), createBlock("div", {
								key: 0,
								class: "sh-products-currency",
								role: "status"
							}, [
								createVNode("span", null, toDisplayString(unref(t)(unref(rates) ? "Приблизительный пересчёт. Оплата в рублях." : unref(ratesLoading) ? "Загружаем курсы. Пока цены в рублях." : "Курсы недоступны — цены показаны в рублях.")), 1),
								unref(rates) ? (openBlock(), createBlock("a", {
									key: 0,
									href: "https://www.cbr.ru/currency_base/daily/",
									target: "_blank",
									rel: "noopener noreferrer"
								}, toDisplayString(unref(t)("Курс ЦБ от")) + " " + toDisplayString(unref(rates).date), 1)) : createCommentVNode("", true),
								unref(ratesError) ? (openBlock(), createBlock("button", {
									key: 1,
									onClick: unref(loadRates)
								}, toDisplayString(unref(t)("Обновить курсы")), 9, ["onClick"])) : createCommentVNode("", true)
							])) : createCommentVNode("", true),
							unref(pending) ? (openBlock(), createBlock("div", {
								key: 1,
								class: "sh-products-state",
								role: "status"
							}, toDisplayString(unref(t)("Загружаем каталог…")), 1)) : unref(error) ? (openBlock(), createBlock("div", {
								key: 2,
								class: "sh-products-state",
								role: "alert"
							}, [createVNode("p", null, toDisplayString(unref(t)("Не удалось загрузить товары.")), 1), createVNode("button", {
								class: "sh-pill",
								onClick: ($event) => unref(refresh)()
							}, toDisplayString(unref(t)("Попробовать ещё раз")), 9, ["onClick"])])) : !unref(products).length ? (openBlock(), createBlock("div", {
								key: 3,
								class: "sh-products-state"
							}, toDisplayString(unref(t)("Товары подборки пока недоступны.")), 1)) : (openBlock(), createBlock("div", {
								key: 4,
								class: "sh-product-grid"
							}, [(openBlock(true), createBlock(Fragment, null, renderList(unref(products), (product) => {
								return openBlock(), createBlock(_component_ProductCard, {
									key: product.id,
									product,
									editorial: ""
								}, null, 8, ["product"]);
							}), 128))])),
							createVNode("div", { class: "sh-products-outro" }, [createVNode(_component_NuxtLink, {
								to: "/catalog",
								class: "sh-pill"
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(t)(unref(home).bestsellers.buttonLabel)), 1)]),
								_: 1
							}), createVNode("p", null, [
								createTextVNode(toDisplayString(unref(t)("Выбирайте продукты под привычную технику и задачи. Если сомневаетесь,")) + " ", 1),
								createVNode(_component_NuxtLink, { to: "/contacts" }, {
									default: withCtx(() => [createTextVNode(toDisplayString(unref(t)("напишите нам")), 1)]),
									_: 1
								}),
								createTextVNode(toDisplayString(unref(t)(": поможем разобраться в ассортименте, не обещая универсального решения для всех.")), 1)
							])])
						])) : section === "categories" ? (openBlock(), createBlock("section", {
							key: 4,
							class: "sh-categories sh-container"
						}, [createVNode("h2", null, toDisplayString(unref(t)(unref(home).categories.title)), 1), createVNode("div", null, [(openBlock(true), createBlock(Fragment, null, renderList(("storefrontActiveCategories" in _ctx ? _ctx.storefrontActiveCategories : unref(storefrontActiveCategories))(unref(content).categories).filter((item) => !item.parentId), (category) => {
							return openBlock(), createBlock(_component_NuxtLink, {
								key: category.id,
								class: "sh-pill",
								to: ("storefrontCatalogLink" in _ctx ? _ctx.storefrontCatalogLink : unref(storefrontCatalogLink))(category.slug)
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(category.nameRu), 1)]),
								_: 2
							}, 1032, ["to"]);
						}), 128))])])) : section === "benefits" ? (openBlock(), createBlock("section", {
							key: 5,
							class: "sh-benefits sh-container",
							"aria-labelledby": "benefits-heading"
						}, [
							createVNode("h2", { id: "benefits-heading" }, [createVNode("span", null, toDisplayString(unref(t)("Почему")), 1), createVNode("span", null, toDisplayString(unref(t)("нас? выбирают")), 1)]),
							createVNode("div", { class: "sh-benefit-grid" }, [(openBlock(true), createBlock(Fragment, null, renderList(unref(home).benefits, (benefit, index) => {
								return openBlock(), createBlock("article", { key: benefit.id }, [
									createVNode("span", {
										class: "sh-benefit-number",
										"aria-hidden": "true"
									}, toDisplayString(String(index + 1).padStart(2, "0")), 1),
									createVNode("h3", null, toDisplayString(unref(t)(benefit.title)), 1),
									createVNode("p", null, toDisplayString(unref(t)(benefit.body)), 1)
								]);
							}), 128))]),
							createVNode(_component_NuxtLink, {
								to: "/catalog",
								class: "sh-pill"
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(t)("Заказать")), 1)]),
								_: 1
							})
						])) : section === "business" ? (openBlock(), createBlock("section", {
							key: 6,
							class: "sh-business sh-container",
							"aria-labelledby": "business-heading"
						}, [
							createVNode("div", {
								class: "sh-business-swatches",
								"aria-hidden": "true"
							}, [
								createVNode("span"),
								createVNode("span"),
								createVNode("span")
							]),
							createVNode("div", { class: "sh-business-copy" }, [
								createVNode("p", null, toDisplayString(unref(t)(unref(home).business.body)), 1),
								createVNode("p", null, [
									createTextVNode(toDisplayString(unref(t)(unref(home).business.title)), 1),
									createVNode("br"),
									createTextVNode(toDisplayString(unref(t)(unref(home).business.accent)), 1)
								]),
								createVNode("h2", { id: "business-heading" }, [
									createTextVNode(toDisplayString(unref(t)("Для")), 1),
									createVNode("br"),
									createTextVNode(toDisplayString(unref(t)("бизнеса")), 1)
								])
							]),
							createVNode("nav", {
								class: "sh-business-directions",
								"aria-label": "Решения для бизнеса"
							}, [
								createVNode(_component_NuxtLink, { to: unref(home).business.url }, {
									default: withCtx(() => [
										createTextVNode(toDisplayString(unref(t)("Мой")), 1),
										createVNode("br"),
										createTextVNode(toDisplayString(unref(t)("салон")), 1)
									]),
									_: 1
								}, 8, ["to"]),
								createVNode(_component_NuxtLink, { to: unref(home).business.url }, {
									default: withCtx(() => [
										createTextVNode(toDisplayString(unref(t)("Онлайн")), 1),
										createVNode("br"),
										createTextVNode(toDisplayString(unref(t)("запись")), 1)
									]),
									_: 1
								}, 8, ["to"]),
								createVNode(_component_NuxtLink, { to: unref(home).business.url }, {
									default: withCtx(() => [
										createTextVNode(toDisplayString(unref(t)("Закупки")), 1),
										createVNode("br"),
										createTextVNode("SARKISIAN")
									]),
									_: 1
								}, 8, ["to"])
							]),
							createVNode("div", {
								class: "sh-business-media sh-media-placeholder",
								"aria-hidden": "true"
							}, [unref(home).business.visualImageUrl ? (openBlock(), createBlock("img", {
								key: 0,
								src: unref(storefrontMediaUrl)(unref(home).business.visualImageUrl),
								alt: "",
								loading: "lazy"
							}, null, 8, ["src"])) : createCommentVNode("", true)]),
							createVNode(_component_NuxtLink, {
								to: unref(home).business.url,
								class: "sh-pill sh-business-open"
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(t)("Открыть")), 1)]),
								_: 1
							}, 8, ["to"])
						])) : section === "club" ? (openBlock(), createBlock("section", {
							key: 7,
							class: "sh-club sh-container",
							"aria-labelledby": "club-heading"
						}, [
							createVNode("ul", null, [(openBlock(true), createBlock(Fragment, null, renderList([...unref(home).club.benefits].reverse(), (benefit) => {
								return openBlock(), createBlock("li", { key: benefit.id }, toDisplayString(unref(t)(benefit.text)), 1);
							}), 128))]),
							createVNode("p", { class: "sh-club-lead" }, toDisplayString(unref(t)(unref(home).club.title)), 1),
							createVNode("h2", { id: "club-heading" }, [createVNode("img", {
								src: _virtual_public__2Fstorefront_2Fhome_2Fclub_wordmark_default,
								alt: unref(home).club.label,
								loading: "lazy"
							}, null, 8, ["alt"])]),
							createVNode("p", null, toDisplayString(unref(t)(unref(home).club.accent)), 1),
							createVNode("div", { class: "sh-club-actions" }, [createVNode(_component_NuxtLink, {
								to: "/club",
								class: "sh-pill"
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(t)(unref(home).club.aboutLabel)), 1)]),
								_: 1
							}), createVNode("button", {
								class: "sh-pill",
								onClick: joinClub
							}, toDisplayString(unref(t)(unref(home).club.joinLabel)), 1)])
						])) : section === "referral" ? (openBlock(), createBlock("section", {
							key: 8,
							class: "sh-referral",
							"aria-labelledby": "referral-heading"
						}, [createVNode("div", { class: "sh-container" }, [createVNode("div", { class: "sh-referral-copy" }, [createVNode("p", null, toDisplayString(unref(t)(unref(home).referral.body)), 1), createVNode(_component_NuxtLink, {
							to: unref(home).referral.url,
							class: "sh-pill"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(t)("Как это работает?")), 1)]),
							_: 1
						}, 8, ["to"])]), createVNode("h2", { id: "referral-heading" }, [unref(english) ? (openBlock(), createBlock("span", {
							key: 0,
							class: "sh-referral-english"
						}, [
							createTextVNode("From a professional."),
							createVNode("br"),
							createTextVNode("To friends.")
						])) : (openBlock(), createBlock("img", {
							key: 1,
							src: _virtual_public__2Fstorefront_2Fhome_2Freferral_title_default,
							alt: "От мастера — друзьям",
							loading: "lazy"
						}))])]), createVNode("div", {
							class: "sh-referral-media",
							"aria-hidden": "true"
						}, [createVNode("div", null, [unref(home).referral.visualImageUrl ? (openBlock(), createBlock("img", {
							key: 0,
							src: unref(storefrontMediaUrl)(unref(home).referral.visualImageUrl),
							alt: "",
							loading: "lazy"
						}, null, 8, ["src"])) : createCommentVNode("", true)]), createVNode("div")])])) : section === "bloggers" ? (openBlock(), createBlock("section", {
							key: 9,
							class: "sh-bloggers sh-container",
							"aria-labelledby": "bloggers-heading"
						}, [createVNode("div", { class: "sh-bloggers-copy" }, [createVNode("p", null, toDisplayString(unref(t)("За привлечение нового салона или бизнеса предусмотрена отдельная фиксированная награда.")), 1), createVNode(_component_NuxtLink, {
							to: unref(home).bloggers.url,
							class: "sh-pill"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(t)("Узнать подробнее")), 1)]),
							_: 1
						}, 8, ["to"])]), createVNode("div", { class: "sh-orbit" }, [
							createVNode("h2", { id: "bloggers-heading" }, [
								createTextVNode(toDisplayString(unref(t)("Для")), 1),
								createVNode("br"),
								createTextVNode(toDisplayString(unref(t)("блогеров")), 1)
							]),
							createVNode("img", {
								class: "sh-orbit-outer",
								src: _virtual_public__2Fstorefront_2Fhome_2Forbit_outer_default,
								alt: "",
								loading: "lazy"
							}),
							createVNode("img", {
								class: "sh-orbit-top",
								src: _virtual_public__2Fstorefront_2Fhome_2Forbit_top_default,
								alt: "",
								loading: "lazy"
							}),
							createVNode("img", {
								class: "sh-orbit-inner",
								src: _virtual_public__2Fstorefront_2Fhome_2Forbit_inner_default,
								alt: "",
								loading: "lazy"
							}),
							createVNode("img", {
								class: "sh-orbit-eyedropper",
								src: _virtual_public__2Fstorefront_2Fhome_2Feyedropper_default,
								alt: "",
								loading: "lazy"
							}),
							(openBlock(), createBlock(Fragment, null, renderList(orbitLabels, (item) => {
								return createVNode("div", {
									key: item.key,
									class: ["sh-orbit-chip", `sh-orbit-${item.key}`]
								}, [createVNode("img", {
									src: `/storefront/home/sample-${item.key}.svg`,
									alt: "",
									loading: "lazy"
								}, null, 8, ["src"]), createVNode("span", null, toDisplayString(unref(t)(item.text)), 1)], 2);
							}), 64))
						])])) : createCommentVNode("", true)], 64);
					}), 128))];
				}),
				_: 1
			}, _parent));
		};
	}
});
// pages/index.vue
var _sfc_setup = index_vue_vue_type_script_setup_true_lang_default.setup;
index_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/index.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var pages_default = index_vue_vue_type_script_setup_true_lang_default;

export { pages_default as default };;globalThis.__timing__.logEnd('Load chunks/build/pages-r1c4QPI6');
//# sourceMappingURL=pages-r1c4QPI6.mjs.map
