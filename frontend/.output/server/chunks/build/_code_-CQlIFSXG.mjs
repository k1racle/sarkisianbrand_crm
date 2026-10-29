globalThis.__timing__.logStart('Load chunks/build/_code_-CQlIFSXG');import { c as useRoute, u as useHead, S as SiteShell_default, J as useCookie, N as NuxtLink } from '../virtual/entry.mjs';
import { defineComponent, withCtx, unref, createVNode, ref, mergeProps, createTextVNode, useSSRContext } from 'vue';
import { ssrRenderComponent, ssrRenderAttrs, ssrInterpolate, ssrIncludeBooleanAttr, ssrLooseContain } from 'vue/server-renderer';
import { ArrowRight, Building2 } from '@lucide/vue';
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

// components/storefront/SitePartnerLink.vue?vue&type=script&setup=true&lang.ts
var SitePartnerLink_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "SitePartnerLink",
	__ssrInlineRender: true,
	props: { code: {} },
	setup(__props) {
		const data = ref(null), loading = ref(true), busy = ref(false), error = ref(""), consent = ref(false);
		useCookie("sb-partner-visitor", { watch: false });
		return (_ctx, _push, _parent, _attrs) => {
			const _component_NuxtLink = NuxtLink;
			_push(`<section${ssrRenderAttrs(mergeProps({ class: "sa-ui sp-landing sa-panel" }, _attrs))}><p class="sa-eyebrow">SARKISIAN · ПАРТНЁРСКАЯ ПРОГРАММА</p><h1>${ssrInterpolate(unref(data) ? "Вас приглашает " + unref(data).displayName : "Приглашение в SARKISIAN")}</h1>`);
			if (unref(loading)) _push(`<p role="status">Проверяем ссылку…</p>`);
			else _push(`<!---->`);
			if (unref(error)) _push(`<p class="sa-feedback" role="alert">${ssrInterpolate(unref(error))}</p>`);
			else _push(`<!---->`);
			if (unref(data)) {
				_push(`<!--[--><p>Выберите товары в магазине${ssrInterpolate(unref(data).businessRegistration ? " или зарегистрируйте свой салон или бизнес" : "")}.</p><label class="sp-check"><input${ssrIncludeBooleanAttr(Array.isArray(unref(consent)) ? ssrLooseContain(unref(consent), null) : unref(consent)) ? " checked" : ""} type="checkbox">Согласен сохранить партнёрский переход на этом устройстве для привязки покупок${ssrInterpolate(unref(data).businessRegistration ? " и регистрации организации" : "")} в течение ${ssrInterpolate(unref(data).attributionDays)} дней.</label><p class="sa-muted">Сохранение происходит после вашего согласия. Партнёр не получает ваши контакты или адрес. `);
				_push(ssrRenderComponent(_component_NuxtLink, { to: "/privacy" }, {
					default: withCtx((_, _push, _parent, _scopeId) => {
						if (_push) _push(`Политика обработки данных`);
						else return [createTextVNode("Политика обработки данных")];
					}),
					_: 1
				}, _parent));
				_push(`</p><div class="sa-actions"><button class="sa-button"${ssrIncludeBooleanAttr(unref(busy) || !unref(consent)) ? " disabled" : ""}>Перейти в магазин`);
				_push(ssrRenderComponent(unref(ArrowRight), { size: 18 }, null, _parent));
				_push(`</button>`);
				if (unref(data).businessRegistration) {
					_push(`<button class="sa-button sa-secondary"${ssrIncludeBooleanAttr(unref(busy) || !unref(consent)) ? " disabled" : ""}>`);
					_push(ssrRenderComponent(unref(Building2), { size: 18 }, null, _parent));
					_push(`Зарегистрировать бизнес</button>`);
				} else _push(`<!---->`);
				_push(`</div><!--]-->`);
			} else if (!unref(loading)) _push(ssrRenderComponent(_component_NuxtLink, {
				to: "/catalog",
				class: "sa-button sa-secondary"
			}, {
				default: withCtx((_, _push, _parent, _scopeId) => {
					if (_push) _push(`Открыть магазин`);
					else return [createTextVNode("Открыть магазин")];
				}),
				_: 1
			}, _parent));
			else _push(`<!---->`);
			_push(`</section>`);
		};
	}
});
// components/storefront/SitePartnerLink.vue
var _sfc_setup$1 = SitePartnerLink_vue_vue_type_script_setup_true_lang_default.setup;
SitePartnerLink_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/storefront/SitePartnerLink.vue");
	return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
var SitePartnerLink_default = Object.assign(SitePartnerLink_vue_vue_type_script_setup_true_lang_default, { __name: "SitePartnerLink" });
// pages/r/[code].vue?vue&type=script&setup=true&lang.ts
var _code__vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "[code]",
	__ssrInlineRender: true,
	setup(__props) {
		const route = useRoute();
		useHead({
			title: "Приглашение в SARKISIAN",
			meta: [{
				name: "robots",
				content: "noindex, nofollow"
			}]
		});
		return (_ctx, _push, _parent, _attrs) => {
			const _component_SiteShell = SiteShell_default;
			const _component_SitePartnerLink = SitePartnerLink_default;
			_push(ssrRenderComponent(_component_SiteShell, _attrs, {
				default: withCtx((_, _push, _parent, _scopeId) => {
					if (_push) _push(ssrRenderComponent(_component_SitePartnerLink, { code: String(unref(route).params.code) }, null, _parent, _scopeId));
					else return [createVNode(_component_SitePartnerLink, { code: String(unref(route).params.code) }, null, 8, ["code"])];
				}),
				_: 1
			}, _parent));
		};
	}
});
// pages/r/[code].vue
var _sfc_setup = _code__vue_vue_type_script_setup_true_lang_default.setup;
_code__vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/r/[code].vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var _code__default = _code__vue_vue_type_script_setup_true_lang_default;

export { _code__default as default };;globalThis.__timing__.logEnd('Load chunks/build/_code_-CQlIFSXG');
//# sourceMappingURL=_code_-CQlIFSXG.mjs.map
