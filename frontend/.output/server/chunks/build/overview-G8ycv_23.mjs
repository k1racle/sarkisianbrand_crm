globalThis.__timing__.logStart('Load chunks/build/overview-G8ycv_23');import { u as useHead } from '../virtual/entry.mjs';
import { u as useCrmNavigation } from './useCrmNavigation-DNjlvJcr.mjs';
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

// pages/crm/reports/overview.vue?vue&type=script&setup=true&lang.ts
var overview_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "overview",
	__ssrInlineRender: true,
	setup(__props) {
		const { active } = useCrmNavigation();
		useHead(() => ({ title: `${active.value?.label || "Рабочее пространство"} — SARKISIAN CRM` }));
		return (_ctx, _push, _parent, _attrs) => {
			_push(ssrRenderComponent(ReportsWorkspacePage_default, mergeProps({ "page-section": "overview" }, _attrs), null, _parent));
		};
	}
});
// pages/crm/reports/overview.vue
var _sfc_setup = overview_vue_vue_type_script_setup_true_lang_default.setup;
overview_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/crm/reports/overview.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var overview_default = overview_vue_vue_type_script_setup_true_lang_default;

export { overview_default as default };;globalThis.__timing__.logEnd('Load chunks/build/overview-G8ycv_23');
//# sourceMappingURL=overview-G8ycv_23.mjs.map
