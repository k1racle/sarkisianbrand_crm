globalThis.__timing__.logStart('Load chunks/build/catalog-menu-CeIr0J6C');import { u as useHead } from '../virtual/entry.mjs';
import { S as StoreWorkspacePage_default } from './StoreWorkspacePage-DrvHlwmI.mjs';
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
import './AdminMediaBrowser-BENAljZN.mjs';
import './useCatalogDialog-2pnsnnsL.mjs';
import './useContextMenu-CQeSn2KJ.mjs';
import '../_/warehouse-execution.mjs';

// pages/admin-workspace/catalog-menu.vue?vue&type=script&setup=true&lang.ts
var catalog_menu_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "catalog-menu",
	__ssrInlineRender: true,
	setup(__props) {
		useHead({ meta: [{
			name: "robots",
			content: "noindex, nofollow"
		}] });
		return (_ctx, _push, _parent, _attrs) => {
			_push(ssrRenderComponent(StoreWorkspacePage_default, mergeProps({ "page-section": "catalog-menu" }, _attrs), null, _parent));
		};
	}
});
// pages/admin-workspace/catalog-menu.vue
var _sfc_setup = catalog_menu_vue_vue_type_script_setup_true_lang_default.setup;
catalog_menu_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/admin-workspace/catalog-menu.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var catalog_menu_default = catalog_menu_vue_vue_type_script_setup_true_lang_default;

export { catalog_menu_default as default };;globalThis.__timing__.logEnd('Load chunks/build/catalog-menu-CeIr0J6C');
//# sourceMappingURL=catalog-menu-CeIr0J6C.mjs.map
