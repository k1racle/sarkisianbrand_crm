globalThis.__timing__.logStart('Load chunks/build/b2b-orders-BrtqAWKS');import { _ as _plugin_vue_export_helper_default } from './_plugin-vue_export-helper-DjkACiAr.mjs';
import { C as CrmOrdersRegister_default } from './CrmOrdersRegister-L-ybON7k.mjs';
import { useSSRContext } from 'vue';
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
import './CrmCardTabs-CwDu8QcL.mjs';
import '../_/warehouse-execution.mjs';

// pages/crm/b2b-orders.vue
var _sfc_main = {};
function _sfc_ssrRender(_ctx, _push, _parent, _attrs) {
	_push(ssrRenderComponent(CrmOrdersRegister_default, _attrs, null, _parent));
}
var _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/crm/b2b-orders.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var b2b_orders_default = /*#__PURE__*/ _plugin_vue_export_helper_default(_sfc_main, [["ssrRender", _sfc_ssrRender]]);

export { b2b_orders_default as default };;globalThis.__timing__.logEnd('Load chunks/build/b2b-orders-BrtqAWKS');
//# sourceMappingURL=b2b-orders-BrtqAWKS.mjs.map
