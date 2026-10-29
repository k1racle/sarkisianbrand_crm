globalThis.__timing__.logStart('Load chunks/build/callback-_CrDTea2');import { c as useRoute, p as useStorefront, r as useSeoMeta, S as SiteShell_default } from '../virtual/entry.mjs';
import { defineComponent, ref, withCtx, unref, createVNode, toDisplayString, useSSRContext } from 'vue';
import { ssrRenderComponent, ssrInterpolate } from 'vue/server-renderer';
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

// pages/auth/callback.vue?vue&type=script&setup=true&lang.ts
var callback_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "callback",
	__ssrInlineRender: true,
	setup(__props) {
		useRoute();
		const message = ref("Завершаем безопасный вход…");
		useStorefront();
		useSeoMeta({ title: "Вход — SARKISIAN BRAND" });
		return (_ctx, _push, _parent, _attrs) => {
			_push(ssrRenderComponent(SiteShell_default, _attrs, {
				default: withCtx((_, _push, _parent, _scopeId) => {
					if (_push) _push(`<div class="sb-reset-page"${_scopeId}><div class="sb-reset-card sb-state" role="status"${_scopeId}>${ssrInterpolate(unref(message))}</div></div>`);
					else return [createVNode("div", { class: "sb-reset-page" }, [createVNode("div", {
						class: "sb-reset-card sb-state",
						role: "status"
					}, toDisplayString(unref(message)), 1)])];
				}),
				_: 1
			}, _parent));
		};
	}
});
// pages/auth/callback.vue
var _sfc_setup = callback_vue_vue_type_script_setup_true_lang_default.setup;
callback_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/auth/callback.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var callback_default = callback_vue_vue_type_script_setup_true_lang_default;

export { callback_default as default };;globalThis.__timing__.logEnd('Load chunks/build/callback-_CrDTea2');
//# sourceMappingURL=callback-_CrDTea2.mjs.map
