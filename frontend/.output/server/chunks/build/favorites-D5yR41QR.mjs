globalThis.__timing__.logStart('Load chunks/build/favorites-D5yR41QR');import { p as useStorefront, r as useSeoMeta, S as SiteShell_default, N as NuxtLink, Q as ProductCard_default, X as fetchFavoriteProducts, $ as $fetch$1, f as useRuntimeConfig } from '../virtual/entry.mjs';
import { defineComponent, ref, computed, withCtx, createTextVNode, unref, createVNode, openBlock, createBlock, toDisplayString, Fragment, createCommentVNode, renderList, useSSRContext } from 'vue';
import { ssrRenderComponent, ssrInterpolate, ssrRenderList } from 'vue/server-renderer';
import { Heart } from '@lucide/vue';
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

// pages/favorites.vue?vue&type=script&setup=true&lang.ts
var favorites_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "favorites",
	__ssrInlineRender: true,
	setup(__props) {
		const config = useRuntimeConfig();
		const { favoriteIds, favoriteSyncError, syncFavorites, authReady, accessToken, user } = useStorefront();
		const loadedProducts = ref([]), loading = ref(true), error = ref("");
		const products = computed(() => loadedProducts.value.filter((product) => favoriteIds.value.includes(product.id)));
		const unavailable = computed(() => Math.max(0, new Set(favoriteIds.value).size - products.value.length));
		let revision = 0;
		async function load(sync = false) {
			const current = ++revision;
			const token = accessToken.value, owner = user.value?.id;
			loading.value = true;
			error.value = "";
			loadedProducts.value = [];
			try {
				if (!authReady.value) return;
				if (token && !owner) throw new Error("Не удалось подтвердить вход. Проверьте соединение и повторите попытку.");
				if (sync) await syncFavorites();
				if (current !== revision || token !== accessToken.value || owner !== user.value?.id) return;
				const ids = [...favoriteIds.value];
				const result = await fetchFavoriteProducts(ids, (batch) => $fetch$1("/products", {
					baseURL: config.public.apiBase,
					query: {
						limit: 8,
						ids: batch.join(",")
					}
				}));
				if (current === revision && token === accessToken.value && owner === user.value?.id) loadedProducts.value = result;
			} catch {
				if (current === revision) error.value = token && !owner ? "Не удалось подтвердить вход. Проверьте соединение и повторите попытку." : "Не удалось загрузить избранное. Проверьте соединение и повторите попытку.";
			} finally {
				if (current === revision && authReady.value) loading.value = false;
			}
		}
		useSeoMeta({ title: "Избранное — SARKISIAN BRAND" });
		return (_ctx, _push, _parent, _attrs) => {
			const _component_SiteShell = SiteShell_default;
			const _component_NuxtLink = NuxtLink;
			const _component_ProductCard = ProductCard_default;
			_push(ssrRenderComponent(_component_SiteShell, _attrs, {
				default: withCtx((_, _push, _parent, _scopeId) => {
					if (_push) {
						_push(`<div class="sb-simple-page"${_scopeId}><div class="sb-breadcrumbs"${_scopeId}>`);
						_push(ssrRenderComponent(_component_NuxtLink, { to: "/" }, {
							default: withCtx((_, _push, _parent, _scopeId) => {
								if (_push) _push(`Главная`);
								else return [createTextVNode("Главная")];
							}),
							_: 1
						}, _parent, _scopeId));
						_push(`<span${_scopeId}>/</span><span${_scopeId}>Избранное</span></div><div class="sb-page-title"${_scopeId}><p${_scopeId}>ВАША ПОДБОРКА</p><h1${_scopeId}>Избранное</h1></div>`);
						if (unref(loading)) _push(`<div class="sb-state" role="status"${_scopeId}>Загружаем товары…</div>`);
						else if (unref(error)) _push(`<div class="sb-state"${_scopeId}><p role="alert"${_scopeId}>${ssrInterpolate(unref(error))}</p><button type="button" class="sb-primary"${_scopeId}>Повторить загрузку</button></div>`);
						else {
							_push(`<!--[-->`);
							if (unref(favoriteSyncError)) _push(`<p class="sb-state" role="status"${_scopeId}>Не удалось синхронизировать избранное с аккаунтом. Показаны товары, сохранённые на этом устройстве. <button type="button"${_scopeId}>Повторить</button></p>`);
							else _push(`<!---->`);
							if (unref(unavailable) && !unref(favoriteSyncError)) _push(`<p class="sb-state" role="status"${_scopeId}>Некоторые сохранённые товары сейчас недоступны.</p>`);
							else _push(`<!---->`);
							if (unref(products).length) {
								_push(`<div class="sb-product-grid"${_scopeId}><!--[-->`);
								ssrRenderList(unref(products), (product) => {
									_push(ssrRenderComponent(_component_ProductCard, {
										key: product.id,
										product
									}, null, _parent, _scopeId));
								});
								_push(`<!--]--></div>`);
							} else if (unref(favoriteIds).length && !unref(favoriteSyncError)) {
								_push(`<div class="sb-empty"${_scopeId}>`);
								_push(ssrRenderComponent(unref(Heart), { size: 36 }, null, _parent, _scopeId));
								_push(`<h2${_scopeId}>Сохранённые товары сейчас недоступны</h2><p${_scopeId}>Они могут появиться позже.</p>`);
								_push(ssrRenderComponent(_component_NuxtLink, {
									to: "/catalog",
									class: "sb-primary"
								}, {
									default: withCtx((_, _push, _parent, _scopeId) => {
										if (_push) _push(`Перейти в каталог`);
										else return [createTextVNode("Перейти в каталог")];
									}),
									_: 1
								}, _parent, _scopeId));
								_push(`</div>`);
							} else if (!unref(favoriteSyncError)) {
								_push(`<div class="sb-empty"${_scopeId}>`);
								_push(ssrRenderComponent(unref(Heart), { size: 36 }, null, _parent, _scopeId));
								_push(`<h2${_scopeId}>Здесь пока пусто</h2><p${_scopeId}>Нажимайте на сердечко в карточке товара, чтобы сохранить его.</p>`);
								_push(ssrRenderComponent(_component_NuxtLink, {
									to: "/catalog",
									class: "sb-primary"
								}, {
									default: withCtx((_, _push, _parent, _scopeId) => {
										if (_push) _push(`Перейти в каталог`);
										else return [createTextVNode("Перейти в каталог")];
									}),
									_: 1
								}, _parent, _scopeId));
								_push(`</div>`);
							} else _push(`<!---->`);
							_push(`<!--]-->`);
						}
						_push(`</div>`);
					} else return [createVNode("div", { class: "sb-simple-page" }, [
						createVNode("div", { class: "sb-breadcrumbs" }, [
							createVNode(_component_NuxtLink, { to: "/" }, {
								default: withCtx(() => [createTextVNode("Главная")]),
								_: 1
							}),
							createVNode("span", null, "/"),
							createVNode("span", null, "Избранное")
						]),
						createVNode("div", { class: "sb-page-title" }, [createVNode("p", null, "ВАША ПОДБОРКА"), createVNode("h1", null, "Избранное")]),
						unref(loading) ? (openBlock(), createBlock("div", {
							key: 0,
							class: "sb-state",
							role: "status"
						}, "Загружаем товары…")) : unref(error) ? (openBlock(), createBlock("div", {
							key: 1,
							class: "sb-state"
						}, [createVNode("p", { role: "alert" }, toDisplayString(unref(error)), 1), createVNode("button", {
							type: "button",
							class: "sb-primary",
							onClick: ($event) => load(true)
						}, "Повторить загрузку", 8, ["onClick"])])) : (openBlock(), createBlock(Fragment, { key: 2 }, [
							unref(favoriteSyncError) ? (openBlock(), createBlock("p", {
								key: 0,
								class: "sb-state",
								role: "status"
							}, [createTextVNode("Не удалось синхронизировать избранное с аккаунтом. Показаны товары, сохранённые на этом устройстве. "), createVNode("button", {
								type: "button",
								onClick: ($event) => load(true)
							}, "Повторить", 8, ["onClick"])])) : createCommentVNode("", true),
							unref(unavailable) && !unref(favoriteSyncError) ? (openBlock(), createBlock("p", {
								key: 1,
								class: "sb-state",
								role: "status"
							}, "Некоторые сохранённые товары сейчас недоступны.")) : createCommentVNode("", true),
							unref(products).length ? (openBlock(), createBlock("div", {
								key: 2,
								class: "sb-product-grid"
							}, [(openBlock(true), createBlock(Fragment, null, renderList(unref(products), (product) => {
								return openBlock(), createBlock(_component_ProductCard, {
									key: product.id,
									product
								}, null, 8, ["product"]);
							}), 128))])) : unref(favoriteIds).length && !unref(favoriteSyncError) ? (openBlock(), createBlock("div", {
								key: 3,
								class: "sb-empty"
							}, [
								createVNode(unref(Heart), { size: 36 }),
								createVNode("h2", null, "Сохранённые товары сейчас недоступны"),
								createVNode("p", null, "Они могут появиться позже."),
								createVNode(_component_NuxtLink, {
									to: "/catalog",
									class: "sb-primary"
								}, {
									default: withCtx(() => [createTextVNode("Перейти в каталог")]),
									_: 1
								})
							])) : !unref(favoriteSyncError) ? (openBlock(), createBlock("div", {
								key: 4,
								class: "sb-empty"
							}, [
								createVNode(unref(Heart), { size: 36 }),
								createVNode("h2", null, "Здесь пока пусто"),
								createVNode("p", null, "Нажимайте на сердечко в карточке товара, чтобы сохранить его."),
								createVNode(_component_NuxtLink, {
									to: "/catalog",
									class: "sb-primary"
								}, {
									default: withCtx(() => [createTextVNode("Перейти в каталог")]),
									_: 1
								})
							])) : createCommentVNode("", true)
						], 64))
					])];
				}),
				_: 1
			}, _parent));
		};
	}
});
// pages/favorites.vue
var _sfc_setup = favorites_vue_vue_type_script_setup_true_lang_default.setup;
favorites_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/favorites.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var favorites_default = favorites_vue_vue_type_script_setup_true_lang_default;

export { favorites_default as default };;globalThis.__timing__.logEnd('Load chunks/build/favorites-D5yR41QR');
//# sourceMappingURL=favorites-D5yR41QR.mjs.map
