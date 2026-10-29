globalThis.__timing__.logStart('Load chunks/build/site-content-nmF8Il6q');import { u as useHead } from '../virtual/entry.mjs';
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

// pages/admin-workspace/site-content.vue?vue&type=script&setup=true&lang.ts
var site_content_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "site-content",
	__ssrInlineRender: true,
	setup(__props) {
		useHead({ meta: [{
			name: "robots",
			content: "noindex, nofollow"
		}] });
		return (_ctx, _push, _parent, _attrs) => {
			_push(ssrRenderComponent(StoreWorkspacePage_default, mergeProps({ "page-section": "site-content" }, _attrs), null, _parent));
		};
	}
});
// pages/admin-workspace/site-content.vue
var _sfc_setup = site_content_vue_vue_type_script_setup_true_lang_default.setup;
site_content_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/admin-workspace/site-content.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var site_content_default = site_content_vue_vue_type_script_setup_true_lang_default;

export { site_content_default as default };;globalThis.__timing__.logEnd('Load chunks/build/site-content-nmF8Il6q');
//# sourceMappingURL=site-content-nmF8Il6q.mjs.map
