globalThis.__timing__.logStart('Load chunks/build/catalog-BxLEtyQM');import { S as SiteCatalogPage_default } from './SiteCatalogPage-7oJrOyIU.mjs';
import { defineComponent, useSSRContext } from 'vue';
import { ssrRenderComponent } from 'vue/server-renderer';
import '../virtual/entry.mjs';
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
import './fetch-Bp2XUQ0E.mjs';
import './addons-CwJPC5tM.mjs';
import '@vue/shared';
import 'fnv1a-64';
import 'object-identity';
import './useStorefrontSeo-DvgEOsDg.mjs';

// pages/catalog.vue?vue&type=script&setup=true&lang.ts
var catalog_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "catalog",
	__ssrInlineRender: true,
	setup(__props) {
		return (_ctx, _push, _parent, _attrs) => {
			_push(ssrRenderComponent(SiteCatalogPage_default, _attrs, null, _parent));
		};
	}
});
// pages/catalog.vue
var _sfc_setup = catalog_vue_vue_type_script_setup_true_lang_default.setup;
catalog_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/catalog.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var catalog_default = catalog_vue_vue_type_script_setup_true_lang_default;

export { catalog_default as default };;globalThis.__timing__.logEnd('Load chunks/build/catalog-BxLEtyQM');
//# sourceMappingURL=catalog-BxLEtyQM.mjs.map
