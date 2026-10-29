globalThis.__timing__.logStart('Load chunks/build/accounts-DAXsd7j_');import { u as useHead } from '../virtual/entry.mjs';
import { u as useCrmNavigation } from './useCrmNavigation-DNjlvJcr.mjs';
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

// pages/crm/settings/accounts.vue?vue&type=script&setup=true&lang.ts
var accounts_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "accounts",
	__ssrInlineRender: true,
	setup(__props) {
		const { active } = useCrmNavigation();
		useHead(() => ({ title: `${active.value?.label || "Настройки"} — SARKISIAN CRM` }));
		return (_ctx, _push, _parent, _attrs) => {
			_push(ssrRenderComponent(SystemWorkspacePage_default, mergeProps({ "page-section": "accounts" }, _attrs), null, _parent));
		};
	}
});
// pages/crm/settings/accounts.vue
var _sfc_setup = accounts_vue_vue_type_script_setup_true_lang_default.setup;
accounts_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/crm/settings/accounts.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var accounts_default = accounts_vue_vue_type_script_setup_true_lang_default;

export { accounts_default as default };;globalThis.__timing__.logEnd('Load chunks/build/accounts-DAXsd7j_');
//# sourceMappingURL=accounts-DAXsd7j_.mjs.map
