globalThis.__timing__.logStart('Load chunks/build/sales-D4i6UYa_');import { u as useHead } from '../virtual/entry.mjs';
import { R as ReportsWorkspacePage_default } from './ReportsWorkspacePage-wipxTm-O.mjs';
import { defineComponent, mergeProps, useSSRContext } from 'vue';
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

// pages/leadership/sales.vue?vue&type=script&setup=true&lang.ts
var sales_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "sales",
	__ssrInlineRender: true,
	setup(__props) {
		useHead({ meta: [{
			name: "robots",
			content: "noindex, nofollow"
		}] });
		return (_ctx, _push, _parent, _attrs) => {
			_push(ssrRenderComponent(ReportsWorkspacePage_default, mergeProps({ "page-section": "sales" }, _attrs), null, _parent));
		};
	}
});
// pages/leadership/sales.vue
var _sfc_setup = sales_vue_vue_type_script_setup_true_lang_default.setup;
sales_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/leadership/sales.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var sales_default = sales_vue_vue_type_script_setup_true_lang_default;

export { sales_default as default };;globalThis.__timing__.logEnd('Load chunks/build/sales-D4i6UYa_');
//# sourceMappingURL=sales-D4i6UYa_.mjs.map
