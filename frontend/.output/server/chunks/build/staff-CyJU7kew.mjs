globalThis.__timing__.logStart('Load chunks/build/staff-CyJU7kew');import { u as useHead } from '../virtual/entry.mjs';
import { S as SystemWorkspacePage_default } from './SystemWorkspacePage-DiH6zXBr.mjs';
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
import './useContextMenu-CQeSn2KJ.mjs';
import './CrmCardTabs-CwDu8QcL.mjs';

// pages/system-settings/staff.vue?vue&type=script&setup=true&lang.ts
var staff_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "staff",
	__ssrInlineRender: true,
	setup(__props) {
		useHead({ meta: [{
			name: "robots",
			content: "noindex, nofollow"
		}] });
		return (_ctx, _push, _parent, _attrs) => {
			_push(ssrRenderComponent(SystemWorkspacePage_default, mergeProps({ "page-section": "staff" }, _attrs), null, _parent));
		};
	}
});
// pages/system-settings/staff.vue
var _sfc_setup = staff_vue_vue_type_script_setup_true_lang_default.setup;
staff_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/system-settings/staff.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var staff_default = staff_vue_vue_type_script_setup_true_lang_default;

export { staff_default as default };;globalThis.__timing__.logEnd('Load chunks/build/staff-CyJU7kew');
//# sourceMappingURL=staff-CyJU7kew.mjs.map
