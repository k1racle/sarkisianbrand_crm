globalThis.__timing__.logStart('Load chunks/build/registrations-DBw8bB8L');import { u as useHead } from '../virtual/entry.mjs';
import { P as PartnerWorkspacePage_default } from './PartnerWorkspacePage-SHPqpej7.mjs';
import { u as useCrmNavigation } from './useCrmNavigation-DNjlvJcr.mjs';
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
import './useCatalogDialog-2pnsnnsL.mjs';

// pages/crm/bloggers/registrations.vue?vue&type=script&setup=true&lang.ts
var registrations_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "registrations",
	__ssrInlineRender: true,
	setup(__props) {
		const { active } = useCrmNavigation();
		useHead(() => ({ title: `${active.value?.label || "Рабочее пространство"} — SARKISIAN CRM` }));
		return (_ctx, _push, _parent, _attrs) => {
			_push(ssrRenderComponent(PartnerWorkspacePage_default, mergeProps({
				kind: "BLOGGER",
				section: "registrations"
			}, _attrs), null, _parent));
		};
	}
});
// pages/crm/bloggers/registrations.vue
var _sfc_setup = registrations_vue_vue_type_script_setup_true_lang_default.setup;
registrations_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/crm/bloggers/registrations.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var registrations_default = registrations_vue_vue_type_script_setup_true_lang_default;

export { registrations_default as default };;globalThis.__timing__.logEnd('Load chunks/build/registrations-DBw8bB8L');
//# sourceMappingURL=registrations-DBw8bB8L.mjs.map
