globalThis.__timing__.logStart('Load chunks/build/referrals-OMIs4cQK');import { t as createError$2, S as SiteShell_default, f as useRuntimeConfig } from '../virtual/entry.mjs';
import { u as useFetch } from './fetch-Bp2XUQ0E.mjs';
import { S as SiteContentPage_default } from './SiteContentPage-CgmrDdXN.mjs';
import { u as useStorefrontSeo } from './useStorefrontSeo-DvgEOsDg.mjs';
import { defineComponent, withAsyncContext, mergeProps, withCtx, unref, openBlock, createBlock, createCommentVNode, useSSRContext } from 'vue';
import { ssrRenderComponent } from 'vue/server-renderer';
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
import '@lucide/vue';
import './addons-CwJPC5tM.mjs';
import '@vue/shared';
import 'fnv1a-64';
import 'object-identity';
import './_virtual_public-Bnta_Oua.mjs';

// pages/club/referrals.vue?vue&type=script&setup=true&lang.ts
var referrals_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "referrals",
	__ssrInlineRender: true,
	async setup(__props) {
		let __temp, __restore;
		const config = useRuntimeConfig();
		const { data: page, error } = ([__temp, __restore] = withAsyncContext(() => useFetch("/products/storefront-pages/club-referrals", { baseURL: config.public.apiBase }, "$rpGAssSqOR")), __temp = await __temp, __restore(), __temp);
		if (error.value) throw createError$2({
			statusCode: error.value.statusCode || 503,
			statusMessage: error.value.statusCode === 404 ? "Страница не найдена" : "Не удалось загрузить страницу"
		});
		useStorefrontSeo({
			title: () => `${page.value?.title || "SARKISIAN CLUB"} — программа лояльности`,
			description: () => page.value?.seoDescription || page.value?.lead,
			reviewRequired: () => Boolean(page.value?.reviewRequired)
		});
		return (_ctx, _push, _parent, _attrs) => {
			const _component_SiteShell = SiteShell_default;
			const _component_SiteContentPage = SiteContentPage_default;
			_push(ssrRenderComponent(_component_SiteShell, mergeProps({ editorial: "" }, _attrs), {
				default: withCtx((_, _push, _parent, _scopeId) => {
					if (_push) {
						if (unref(page)) _push(ssrRenderComponent(_component_SiteContentPage, { page: unref(page) }, null, _parent, _scopeId));
						else _push(`<!---->`);
					} else return [unref(page) ? (openBlock(), createBlock(_component_SiteContentPage, {
						key: 0,
						page: unref(page)
					}, null, 8, ["page"])) : createCommentVNode("", true)];
				}),
				_: 1
			}, _parent));
		};
	}
});
// pages/club/referrals.vue
var _sfc_setup = referrals_vue_vue_type_script_setup_true_lang_default.setup;
referrals_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/club/referrals.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var referrals_default = referrals_vue_vue_type_script_setup_true_lang_default;

export { referrals_default as default };;globalThis.__timing__.logEnd('Load chunks/build/referrals-OMIs4cQK');
//# sourceMappingURL=referrals-OMIs4cQK.mjs.map
