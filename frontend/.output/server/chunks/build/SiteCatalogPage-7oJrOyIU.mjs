globalThis.__timing__.logStart('Load chunks/build/SiteCatalogPage-7oJrOyIU');import { c as useRoute, G as useRouter, A as useHomeLocale, p as useStorefront, q as useStorefrontPanels, u as useHead, S as SiteShell_default, N as NuxtLink, Q as ProductCard_default, f as useRuntimeConfig, o as storefrontCatalogLink } from '../virtual/entry.mjs';
import { u as useFetch, _ as _virtual_public__2Fstorefront_2Fhome_2Fhero_wordmark_default } from './fetch-Bp2XUQ0E.mjs';
import { u as useStorefrontSeo } from './useStorefrontSeo-DvgEOsDg.mjs';
import { defineComponent, computed, withAsyncContext, mergeProps, withCtx, createVNode, unref, createTextVNode, toDisplayString, openBlock, createBlock, createCommentVNode, Fragment, renderList, reactive, ref, watch, useSSRContext } from 'vue';
import { ssrRenderComponent, ssrRenderAttr, ssrInterpolate, ssrRenderClass, ssrRenderStyle, ssrRenderList, ssrIncludeBooleanAttr, ssrRenderAttrs, ssrLooseContain, ssrLooseEqual } from 'vue/server-renderer';
import { Heart, ChevronLeft, ChevronRight, Funnel } from '@lucide/vue';

// components/storefront/SiteCatalogDesignFilters.vue?vue&type=script&setup=true&lang.ts
var SiteCatalogDesignFilters_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "SiteCatalogDesignFilters",
	__ssrInlineRender: true,
	props: {
		model: {},
		facets: {}
	},
	emits: ["apply", "reset"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const { t } = useHomeLocale();
		const copy = () => ({
			...props.model,
			categories: [...props.model.categories],
			volumes: [...props.model.volumes],
			purposes: [...props.model.purposes],
			features: [...props.model.features]
		});
		const draft = reactive(copy());
		const priceError = ref("");
		const expanded = ref(Boolean(props.model.search || props.model.purposes.length || props.model.features.length || props.model.inStock || props.model.sort !== "new"));
		watch(() => props.model, () => {
			Object.assign(draft, copy());
			priceError.value = "";
		}, { deep: true });
		const volumes = computed(() => [.../* @__PURE__ */ new Set([...props.facets.volumes || [], ...props.model.volumes])].sort((a, b) => Number(a) - Number(b)));
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<form${ssrRenderAttrs(mergeProps({ class: "sc-filters" }, _attrs))}><div class="sc-filter-main"><button type="button" class="sc-filter-toggle"${ssrRenderAttr("aria-label", unref(t)("Фильтры и сортировка"))}${ssrRenderAttr("aria-expanded", unref(expanded))} aria-controls="catalog-extra-filters">`);
			_push(ssrRenderComponent(unref(Funnel), { "stroke-width": 1 }, null, _parent));
			_push(`</button><fieldset class="sc-filter-price"><legend>${ssrInterpolate(unref(t)("Цена"))}</legend><label><span>${ssrInterpolate(unref(t)("от"))}</span><input${ssrRenderAttr("value", unref(draft).minPrice)}${ssrRenderAttr("aria-label", unref(t)("Цена от"))} type="number" min="0" max="100000000" step="0.01" inputmode="decimal"></label><label><span>${ssrInterpolate(unref(t)("до"))}</span><input${ssrRenderAttr("value", unref(draft).maxPrice)}${ssrRenderAttr("aria-label", unref(t)("Цена до"))} type="number" min="0" max="100000000" step="0.01" inputmode="decimal"></label></fieldset><fieldset class="sc-filter-volumes"><legend>${ssrInterpolate(unref(t)("Объём"))}</legend><!--[-->`);
			ssrRenderList(unref(volumes), (volume) => {
				_push(`<label class="sc-filter-option"><span>${ssrInterpolate(volume)}</span><input${ssrIncludeBooleanAttr(Array.isArray(unref(draft).volumes) ? ssrLooseContain(unref(draft).volumes, volume) : unref(draft).volumes) ? " checked" : ""} type="checkbox"${ssrRenderAttr("value", volume)}${ssrRenderAttr("aria-label", `${unref(t)("Объём")} ${volume}`)}></label>`);
			});
			_push(`<!--]-->`);
			if (!unref(volumes).length) _push(`<span class="sc-filter-note">${ssrInterpolate(unref(t)("Не указан"))}</span>`);
			else _push(`<!---->`);
			_push(`</fieldset><fieldset class="sc-filter-categories"><legend>${ssrInterpolate(unref(t)("Категория"))}</legend><!--[-->`);
			ssrRenderList(__props.facets.categories, (category) => {
				_push(`<label class="sc-filter-option"><span>${ssrInterpolate(category.nameRu)}</span><input${ssrIncludeBooleanAttr(Array.isArray(unref(draft).categories) ? ssrLooseContain(unref(draft).categories, category.slug) : unref(draft).categories) ? " checked" : ""} type="checkbox"${ssrRenderAttr("value", category.slug)}></label>`);
			});
			_push(`<!--]-->`);
			if (!__props.facets.categories.length) _push(`<span class="sc-filter-note">${ssrInterpolate(unref(t)("Все товары"))}</span>`);
			else _push(`<!---->`);
			_push(`</fieldset></div><div id="catalog-extra-filters" class="sc-filter-extra" style="${ssrRenderStyle(unref(expanded) ? null : { display: "none" })}"><label>${ssrInterpolate(unref(t)("Поиск"))}<input${ssrRenderAttr("value", unref(draft).search)} type="search"${ssrRenderAttr("placeholder", unref(t)("Название или артикул"))} maxlength="200"></label><label>${ssrInterpolate(unref(t)("Сортировка"))}<select><option value="new"${ssrIncludeBooleanAttr(Array.isArray(unref(draft).sort) ? ssrLooseContain(unref(draft).sort, "new") : ssrLooseEqual(unref(draft).sort, "new")) ? " selected" : ""}>${ssrInterpolate(unref(t)("Сначала новинки"))}</option><option value="popular"${ssrIncludeBooleanAttr(Array.isArray(unref(draft).sort) ? ssrLooseContain(unref(draft).sort, "popular") : ssrLooseEqual(unref(draft).sort, "popular")) ? " selected" : ""}>${ssrInterpolate(unref(t)("По популярности"))}</option><option value="price-asc"${ssrIncludeBooleanAttr(Array.isArray(unref(draft).sort) ? ssrLooseContain(unref(draft).sort, "price-asc") : ssrLooseEqual(unref(draft).sort, "price-asc")) ? " selected" : ""}>${ssrInterpolate(unref(t)("Сначала дешевле"))}</option><option value="price-desc"${ssrIncludeBooleanAttr(Array.isArray(unref(draft).sort) ? ssrLooseContain(unref(draft).sort, "price-desc") : ssrLooseEqual(unref(draft).sort, "price-desc")) ? " selected" : ""}>${ssrInterpolate(unref(t)("Сначала дороже"))}</option><option value="name"${ssrIncludeBooleanAttr(Array.isArray(unref(draft).sort) ? ssrLooseContain(unref(draft).sort, "name") : ssrLooseEqual(unref(draft).sort, "name")) ? " selected" : ""}>${ssrInterpolate(unref(t)("По названию"))}</option></select></label><label class="sc-filter-option"><span>${ssrInterpolate(unref(t)("Только в наличии"))}</span><input${ssrIncludeBooleanAttr(Array.isArray(unref(draft).inStock) ? ssrLooseContain(unref(draft).inStock, null) : unref(draft).inStock) ? " checked" : ""} type="checkbox"></label>`);
			if (__props.facets.purposes.length) {
				_push(`<fieldset><legend>${ssrInterpolate(unref(t)("Для чего"))}</legend><!--[-->`);
				ssrRenderList(__props.facets.purposes, (purpose) => {
					_push(`<label class="sc-filter-option"><span>${ssrInterpolate(purpose)}</span><input${ssrIncludeBooleanAttr(Array.isArray(unref(draft).purposes) ? ssrLooseContain(unref(draft).purposes, purpose) : unref(draft).purposes) ? " checked" : ""} type="checkbox"${ssrRenderAttr("value", purpose)}></label>`);
				});
				_push(`<!--]--></fieldset>`);
			} else _push(`<!---->`);
			if (__props.facets.features.length) {
				_push(`<fieldset><legend>${ssrInterpolate(unref(t)("Особенности"))}</legend><!--[-->`);
				ssrRenderList(__props.facets.features, (feature) => {
					_push(`<label class="sc-filter-option"><span>${ssrInterpolate(feature)}</span><input${ssrIncludeBooleanAttr(Array.isArray(unref(draft).features) ? ssrLooseContain(unref(draft).features, feature) : unref(draft).features) ? " checked" : ""} type="checkbox"${ssrRenderAttr("value", feature)}></label>`);
				});
				_push(`<!--]--></fieldset>`);
			} else _push(`<!---->`);
			_push(`</div>`);
			if (unref(priceError)) _push(`<p class="sc-filter-error" role="alert">${ssrInterpolate(unref(t)(unref(priceError)))}</p>`);
			else _push(`<!---->`);
			_push(`<div class="sc-filter-buttons"><button type="submit" class="sb-design-button">${ssrInterpolate(unref(t)("Применить"))}</button><button type="button" class="sb-design-button">${ssrInterpolate(unref(t)("Сбросить"))}</button></div></form>`);
		};
	}
});
// components/storefront/SiteCatalogDesignFilters.vue
var _sfc_setup$1 = SiteCatalogDesignFilters_vue_vue_type_script_setup_true_lang_default.setup;
SiteCatalogDesignFilters_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/storefront/SiteCatalogDesignFilters.vue");
	return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
var SiteCatalogDesignFilters_default = Object.assign(SiteCatalogDesignFilters_vue_vue_type_script_setup_true_lang_default, { __name: "SiteCatalogDesignFilters" });
// components/storefront/SiteCatalogPage.vue?vue&type=script&setup=true&lang.ts
var SiteCatalogPage_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "SiteCatalogPage",
	__ssrInlineRender: true,
	props: { categorySlug: {} },
	async setup(__props) {
		let __temp, __restore;
		const props = __props;
		const route = useRoute();
		const router = useRouter();
		const config = useRuntimeConfig();
		const { t, english } = useHomeLocale();
		const { favoriteIds } = useStorefront();
		const { openFavorites } = useStorefrontPanels();
		const str = (v) => typeof v === "string" ? v : "";
		const tags = (v) => [...new Set(str(v).split(",").map((s) => s.trim()).filter(Boolean))].slice(0, 20);
		const price = (v) => str(v) !== "" && Number.isFinite(Number(v)) && Number(v) >= 0 && Number(v) <= 1e8 ? String(Number(v)) : "";
		const model = computed(() => ({
			search: str(route.query.search).slice(0, 200),
			categories: props.categorySlug ? [props.categorySlug] : tags(route.query.category),
			volumes: tags(route.query.volume).filter((value) => /^\d{1,5}(?:\.\d{1,2})?$/.test(value)),
			purposes: tags(route.query.purpose),
			features: tags(route.query.feature),
			minPrice: price(route.query.minPrice),
			maxPrice: price(route.query.maxPrice),
			inStock: route.query.inStock === "true",
			sort: [
				"new",
				"popular",
				"price-asc",
				"price-desc",
				"name"
			].includes(str(route.query.sort)) ? str(route.query.sort) : "new",
			page: Math.min(1e5, Math.max(1, Math.floor(Number(route.query.page) || 1)))
		}));
		function params(value) {
			return {
				search: value.search || void 0,
				category: value.categories.join(",") || void 0,
				volume: value.volumes.join(",") || void 0,
				purpose: value.purposes.join(",") || void 0,
				feature: value.features.join(",") || void 0,
				minPrice: value.minPrice || void 0,
				maxPrice: value.maxPrice || void 0,
				inStock: value.inStock ? "true" : void 0,
				sort: value.sort === "new" ? void 0 : value.sort,
				page: value.page === 1 ? void 0 : value.page
			};
		}
		const query = computed(() => ({
			...params(model.value),
			limit: 12
		}));
		const apiBase = config.seoApiBase;
		const { data, pending, error, refresh } = ([__temp, __restore] = withAsyncContext(() => useFetch("/products", {
			key: `catalog-design-products:${props.categorySlug || "all"}`,
			baseURL: apiBase,
			query
		}, "$j_kd996lxg")), __temp = await __temp, __restore(), __temp);
		const { data: filterData, error: filterError, refresh: refreshFilters } = ([__temp, __restore] = withAsyncContext(() => useFetch("/products/filters", {
			key: "catalog-design-facets",
			baseURL: apiBase
		}, "$alBVbclBMB")), __temp = await __temp, __restore(), __temp);
		const facets = computed(() => ({
			categories: [],
			purposes: [],
			features: [],
			volumes: [],
			price: {
				min: 0,
				max: 0
			},
			...filterData.value
		}));
		const selectedCategory = computed(() => model.value.categories.length === 1 ? facets.value.categories.find((category) => category.slug === model.value.categories[0]) : null);
		const catalogTitle = computed(() => t(selectedCategory.value?.nameRu || "Каталог"));
		const collectionWordScale = computed(() => Math.min(1, 4 / Array.from(catalogTitle.value).length));
		const categoryDescription = computed(() => typeof selectedCategory.value?.description === "string" ? selectedCategory.value.description : selectedCategory.value?.description?.ru || "");
		const products = computed(() => data.value?.items || []);
		const pagination = computed(() => data.value?.pagination || {
			pages: 0,
			total: 0
		});
		async function apply(value) {
			const next = params(value);
			await router.push({
				path: value.categories.length === 1 ? storefrontCatalogLink(value.categories[0]) : "/catalog",
				query: value.categories.length === 1 ? {
					...next,
					category: void 0
				} : next
			});
		}
		function reset() {
			return apply({
				search: "",
				categories: [],
				volumes: [],
				purposes: [],
				features: [],
				minPrice: "",
				maxPrice: "",
				inStock: false,
				sort: "new",
				page: 1
			});
		}
		async function changePage(page) {
			await apply({
				...model.value,
				page
			});
			(void 0).querySelector("#catalog-heading")?.scrollIntoView({
				behavior: "instant",
				block: "start"
			});
		}
		useHead(() => ({ htmlAttrs: { lang: english.value ? "en" : "ru" } }));
		useStorefrontSeo({
			title: () => `${selectedCategory.value?.nameRu || "Каталог"} — SARKISIAN BRAND`,
			description: () => categoryDescription.value || "Материалы и инструменты для маникюра. Выберите категорию, объём и стоимость.",
			noindex: () => model.value.categories.some((slug) => !facets.value.categories.some((category) => category.slug === slug))
		});
		return (_ctx, _push, _parent, _attrs) => {
			const _component_SiteShell = SiteShell_default;
			const _component_NuxtLink = NuxtLink;
			const _component_SiteCatalogDesignFilters = SiteCatalogDesignFilters_default;
			const _component_ProductCard = ProductCard_default;
			_push(ssrRenderComponent(_component_SiteShell, mergeProps({
				editorial: "",
				catalog: ""
			}, _attrs), {
				default: withCtx((_, _push, _parent, _scopeId) => {
					if (_push) {
						_push(`<div class="sc-page"${_scopeId}><header class="sc-hero sh-container"${_scopeId}>`);
						_push(ssrRenderComponent(_component_NuxtLink, {
							to: "/",
							class: "sc-wordmark",
							"aria-label": "SARKISIAN — на главную"
						}, {
							default: withCtx((_, _push, _parent, _scopeId) => {
								if (_push) _push(`<img${ssrRenderAttr("src", _virtual_public__2Fstorefront_2Fhome_2Fhero_wordmark_default)} alt="SARKISIAN" width="1412" height="196" fetchpriority="high"${_scopeId}>`);
								else return [createVNode("img", {
									src: _virtual_public__2Fstorefront_2Fhome_2Fhero_wordmark_default,
									alt: "SARKISIAN",
									width: "1412",
									height: "196",
									fetchpriority: "high"
								})];
							}),
							_: 1
						}, _parent, _scopeId));
						_push(`<div class="sc-hero-copy"${_scopeId}><p${_scopeId}>${ssrInterpolate(unref(t)("Премиальный бренд для мастеров маникюра, который понимает профессию изнутри."))}<br${_scopeId}>${ssrInterpolate(unref(t)("Материалы, которые помогают работать быстрее и увереннее"))}</p><span${_scopeId}>${ssrInterpolate(unref(t)("От мастера — к мастерам"))}</span></div></header><section class="sc-catalog sh-container" aria-labelledby="catalog-heading"${_scopeId}><header class="sc-heading"${_scopeId}><h1 id="catalog-heading" class="${ssrRenderClass({ "sc-category-title": unref(selectedCategory) })}"${_scopeId}>${ssrInterpolate(unref(catalogTitle))}</h1><button type="button" class="sc-favorites"${ssrRenderAttr("aria-label", unref(t)("Избранное"))}${_scopeId}>`);
						_push(ssrRenderComponent(unref(Heart), { "stroke-width": 1.5 }, null, _parent, _scopeId));
						if (unref(favoriteIds).length) _push(`<span${_scopeId}>${ssrInterpolate(unref(favoriteIds).length)}</span>`);
						else _push(`<!---->`);
						_push(`</button></header>`);
						if (unref(categoryDescription)) _push(`<p class="sc-category-description"${_scopeId}>${ssrInterpolate(unref(categoryDescription))}</p>`);
						else _push(`<!---->`);
						if (unref(filterError)) _push(`<p class="sc-state" role="alert"${_scopeId}>${ssrInterpolate(unref(t)("Не удалось загрузить фильтры."))} <button type="button" class="sb-design-button"${_scopeId}>${ssrInterpolate(unref(t)("Повторить"))}</button></p>`);
						else _push(`<!---->`);
						_push(ssrRenderComponent(_component_SiteCatalogDesignFilters, {
							model: unref(model),
							facets: unref(facets),
							onApply: apply,
							onReset: reset
						}, null, _parent, _scopeId));
						_push(`<section class="sc-results"${ssrRenderAttr("aria-label", unref(t)("Товары"))}${ssrRenderAttr("aria-busy", unref(pending))}${_scopeId}>`);
						if (unref(pending)) _push(`<div class="sc-state" role="status"${_scopeId}>${ssrInterpolate(unref(t)("Загружаем товары…"))}</div>`);
						else if (unref(error)) _push(`<div class="sc-state" role="alert"${_scopeId}><p${_scopeId}>${ssrInterpolate(unref(t)("Не удалось загрузить каталог."))}</p><button type="button" class="sb-design-button"${_scopeId}>${ssrInterpolate(unref(t)("Повторить"))}</button></div>`);
						else if (unref(products).length) {
							_push(`<div class="${ssrRenderClass([`sc-count-${unref(products).length}`, "sc-product-grid"])}"${_scopeId}><span class="sc-collection-word" style="${ssrRenderStyle({ "--sc-word-scale": unref(collectionWordScale) })}" aria-hidden="true"${_scopeId}>${ssrInterpolate(unref(catalogTitle))}</span><!--[-->`);
							ssrRenderList(unref(products), (product) => {
								_push(ssrRenderComponent(_component_ProductCard, {
									key: product.id,
									product,
									volumes: unref(model).volumes,
									catalog: ""
								}, null, _parent, _scopeId));
							});
							_push(`<!--]--></div>`);
						} else _push(`<div class="sc-state"${_scopeId}><h2${_scopeId}>${ssrInterpolate(unref(t)("Товары не найдены"))}</h2><p${_scopeId}>${ssrInterpolate(unref(t)("Измените параметры или сбросьте фильтры."))}</p><button type="button" class="sb-design-button"${_scopeId}>${ssrInterpolate(unref(t)("Сбросить фильтры"))}</button></div>`);
						if (unref(pagination).pages > 1) {
							_push(`<nav class="sc-pagination"${ssrRenderAttr("aria-label", unref(t)("Страницы каталога"))}${_scopeId}><button type="button"${ssrIncludeBooleanAttr(unref(model).page <= 1) ? " disabled" : ""}${ssrRenderAttr("aria-label", unref(t)("Предыдущая страница"))}${_scopeId}>`);
							_push(ssrRenderComponent(unref(ChevronLeft), { size: 20 }, null, _parent, _scopeId));
							_push(`</button><span${_scopeId}>${ssrInterpolate(unref(model).page)} / ${ssrInterpolate(unref(pagination).pages)}</span><button type="button"${ssrIncludeBooleanAttr(unref(model).page >= unref(pagination).pages) ? " disabled" : ""}${ssrRenderAttr("aria-label", unref(t)("Следующая страница"))}${_scopeId}>`);
							_push(ssrRenderComponent(unref(ChevronRight), { size: 20 }, null, _parent, _scopeId));
							_push(`</button></nav>`);
						} else _push(`<!---->`);
						_push(`</section></section></div>`);
					} else return [createVNode("div", { class: "sc-page" }, [createVNode("header", { class: "sc-hero sh-container" }, [createVNode(_component_NuxtLink, {
						to: "/",
						class: "sc-wordmark",
						"aria-label": "SARKISIAN — на главную"
					}, {
						default: withCtx(() => [createVNode("img", {
							src: _virtual_public__2Fstorefront_2Fhome_2Fhero_wordmark_default,
							alt: "SARKISIAN",
							width: "1412",
							height: "196",
							fetchpriority: "high"
						})]),
						_: 1
					}), createVNode("div", { class: "sc-hero-copy" }, [createVNode("p", null, [
						createTextVNode(toDisplayString(unref(t)("Премиальный бренд для мастеров маникюра, который понимает профессию изнутри.")), 1),
						createVNode("br"),
						createTextVNode(toDisplayString(unref(t)("Материалы, которые помогают работать быстрее и увереннее")), 1)
					]), createVNode("span", null, toDisplayString(unref(t)("От мастера — к мастерам")), 1)])]), createVNode("section", {
						class: "sc-catalog sh-container",
						"aria-labelledby": "catalog-heading"
					}, [
						createVNode("header", { class: "sc-heading" }, [createVNode("h1", {
							id: "catalog-heading",
							class: { "sc-category-title": unref(selectedCategory) }
						}, toDisplayString(unref(catalogTitle)), 3), createVNode("button", {
							type: "button",
							class: "sc-favorites",
							"aria-label": unref(t)("Избранное"),
							onClick: unref(openFavorites)
						}, [createVNode(unref(Heart), { "stroke-width": 1.5 }), unref(favoriteIds).length ? (openBlock(), createBlock("span", { key: 0 }, toDisplayString(unref(favoriteIds).length), 1)) : createCommentVNode("", true)], 8, ["aria-label", "onClick"])]),
						unref(categoryDescription) ? (openBlock(), createBlock("p", {
							key: 0,
							class: "sc-category-description"
						}, toDisplayString(unref(categoryDescription)), 1)) : createCommentVNode("", true),
						unref(filterError) ? (openBlock(), createBlock("p", {
							key: 1,
							class: "sc-state",
							role: "alert"
						}, [createTextVNode(toDisplayString(unref(t)("Не удалось загрузить фильтры.")) + " ", 1), createVNode("button", {
							type: "button",
							class: "sb-design-button",
							onClick: ($event) => unref(refreshFilters)()
						}, toDisplayString(unref(t)("Повторить")), 9, ["onClick"])])) : createCommentVNode("", true),
						createVNode(_component_SiteCatalogDesignFilters, {
							model: unref(model),
							facets: unref(facets),
							onApply: apply,
							onReset: reset
						}, null, 8, ["model", "facets"]),
						createVNode("section", {
							class: "sc-results",
							"aria-label": unref(t)("Товары"),
							"aria-busy": unref(pending)
						}, [unref(pending) ? (openBlock(), createBlock("div", {
							key: 0,
							class: "sc-state",
							role: "status"
						}, toDisplayString(unref(t)("Загружаем товары…")), 1)) : unref(error) ? (openBlock(), createBlock("div", {
							key: 1,
							class: "sc-state",
							role: "alert"
						}, [createVNode("p", null, toDisplayString(unref(t)("Не удалось загрузить каталог.")), 1), createVNode("button", {
							type: "button",
							class: "sb-design-button",
							onClick: ($event) => unref(refresh)()
						}, toDisplayString(unref(t)("Повторить")), 9, ["onClick"])])) : unref(products).length ? (openBlock(), createBlock("div", {
							key: 2,
							class: ["sc-product-grid", `sc-count-${unref(products).length}`]
						}, [createVNode("span", {
							class: "sc-collection-word",
							style: { "--sc-word-scale": unref(collectionWordScale) },
							"aria-hidden": "true"
						}, toDisplayString(unref(catalogTitle)), 5), (openBlock(true), createBlock(Fragment, null, renderList(unref(products), (product) => {
							return openBlock(), createBlock(_component_ProductCard, {
								key: product.id,
								product,
								volumes: unref(model).volumes,
								catalog: ""
							}, null, 8, ["product", "volumes"]);
						}), 128))], 2)) : (openBlock(), createBlock("div", {
							key: 3,
							class: "sc-state"
						}, [
							createVNode("h2", null, toDisplayString(unref(t)("Товары не найдены")), 1),
							createVNode("p", null, toDisplayString(unref(t)("Измените параметры или сбросьте фильтры.")), 1),
							createVNode("button", {
								type: "button",
								class: "sb-design-button",
								onClick: reset
							}, toDisplayString(unref(t)("Сбросить фильтры")), 1)
						])), unref(pagination).pages > 1 ? (openBlock(), createBlock("nav", {
							key: 4,
							class: "sc-pagination",
							"aria-label": unref(t)("Страницы каталога")
						}, [
							createVNode("button", {
								type: "button",
								disabled: unref(model).page <= 1,
								"aria-label": unref(t)("Предыдущая страница"),
								onClick: ($event) => changePage(unref(model).page - 1)
							}, [createVNode(unref(ChevronLeft), { size: 20 })], 8, [
								"disabled",
								"aria-label",
								"onClick"
							]),
							createVNode("span", null, toDisplayString(unref(model).page) + " / " + toDisplayString(unref(pagination).pages), 1),
							createVNode("button", {
								type: "button",
								disabled: unref(model).page >= unref(pagination).pages,
								"aria-label": unref(t)("Следующая страница"),
								onClick: ($event) => changePage(unref(model).page + 1)
							}, [createVNode(unref(ChevronRight), { size: 20 })], 8, [
								"disabled",
								"aria-label",
								"onClick"
							])
						], 8, ["aria-label"])) : createCommentVNode("", true)], 8, ["aria-label", "aria-busy"])
					])])];
				}),
				_: 1
			}, _parent));
		};
	}
});
// components/storefront/SiteCatalogPage.vue
var _sfc_setup = SiteCatalogPage_vue_vue_type_script_setup_true_lang_default.setup;
SiteCatalogPage_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/storefront/SiteCatalogPage.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var SiteCatalogPage_default = Object.assign(SiteCatalogPage_vue_vue_type_script_setup_true_lang_default, { __name: "SiteCatalogPage" });

export { SiteCatalogPage_default as S };;globalThis.__timing__.logEnd('Load chunks/build/SiteCatalogPage-7oJrOyIU');
//# sourceMappingURL=SiteCatalogPage-7oJrOyIU.mjs.map
