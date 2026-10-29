globalThis.__timing__.logStart('Load chunks/build/queues-Df4TEfFO');import { u as useHead } from '../virtual/entry.mjs';
import { S as SupportWorkspacePage_default } from './SupportWorkspacePage-1ZlDEmZh.mjs';
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
import './useContextMenu-CQeSn2KJ.mjs';

// pages/helpdesk/queues.vue?vue&type=script&setup=true&lang.ts
var queues_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "queues",
	__ssrInlineRender: true,
	setup(__props) {
		useHead({ meta: [{
			name: "robots",
			content: "noindex, nofollow"
		}] });
		return (_ctx, _push, _parent, _attrs) => {
			_push(ssrRenderComponent(SupportWorkspacePage_default, mergeProps({ "page-section": "queues" }, _attrs), null, _parent));
		};
	}
});
// pages/helpdesk/queues.vue
var _sfc_setup = queues_vue_vue_type_script_setup_true_lang_default.setup;
queues_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/helpdesk/queues.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var queues_default = queues_vue_vue_type_script_setup_true_lang_default;

export { queues_default as default };;globalThis.__timing__.logEnd('Load chunks/build/queues-Df4TEfFO');
//# sourceMappingURL=queues-Df4TEfFO.mjs.map
