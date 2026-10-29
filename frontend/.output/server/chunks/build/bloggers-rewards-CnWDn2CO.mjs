globalThis.__timing__.logStart('Load chunks/build/bloggers-rewards-CnWDn2CO');import { u as useHead } from '../virtual/entry.mjs';
import { P as PartnerWorkspacePage_default } from './PartnerWorkspacePage-SHPqpej7.mjs';
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

// pages/admin-workspace/bloggers-rewards.vue?vue&type=script&setup=true&lang.ts
var bloggers_rewards_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "bloggers-rewards",
	__ssrInlineRender: true,
	setup(__props) {
		useHead({ meta: [{
			name: "robots",
			content: "noindex, nofollow"
		}] });
		return (_ctx, _push, _parent, _attrs) => {
			_push(ssrRenderComponent(PartnerWorkspacePage_default, mergeProps({
				kind: "BLOGGER",
				section: "rewards"
			}, _attrs), null, _parent));
		};
	}
});
// pages/admin-workspace/bloggers-rewards.vue
var _sfc_setup = bloggers_rewards_vue_vue_type_script_setup_true_lang_default.setup;
bloggers_rewards_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/admin-workspace/bloggers-rewards.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var bloggers_rewards_default = bloggers_rewards_vue_vue_type_script_setup_true_lang_default;

export { bloggers_rewards_default as default };;globalThis.__timing__.logEnd('Load chunks/build/bloggers-rewards-CnWDn2CO');
//# sourceMappingURL=bloggers-rewards-CnWDn2CO.mjs.map
