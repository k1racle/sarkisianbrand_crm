globalThis.__timing__.logStart('Load chunks/build/business-registration-s8CINSzV');import { n as navigateTo } from '../virtual/entry.mjs';
import { defineComponent, withAsyncContext, useSSRContext } from 'vue';
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
import 'vue/server-renderer';
import 'vue-bundle-renderer/runtime';
import 'devalue';
import 'unhead/utils';
import 'vue-router';
import '@lucide/vue';

// pages/business-registration.vue?vue&type=script&setup=true&lang.ts
var business_registration_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "business-registration",
	async setup(__props) {
		let __temp, __restore;
		[__temp, __restore] = withAsyncContext(() => navigateTo({
			path: "/business",
			query: { registration: "open" }
		}, { replace: true })), await __temp, __restore();
		return () => {};
	}
});
// pages/business-registration.vue
var _sfc_setup = business_registration_vue_vue_type_script_setup_true_lang_default.setup;
business_registration_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/business-registration.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var business_registration_default = business_registration_vue_vue_type_script_setup_true_lang_default;

export { business_registration_default as default };;globalThis.__timing__.logEnd('Load chunks/build/business-registration-s8CINSzV');
//# sourceMappingURL=business-registration-s8CINSzV.mjs.map
