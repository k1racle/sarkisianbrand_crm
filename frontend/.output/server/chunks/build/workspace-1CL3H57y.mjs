globalThis.__timing__.logStart('Load chunks/build/workspace-1CL3H57y');import { n as navigateTo, W as WorkspaceLoading_default } from '../virtual/entry.mjs';
import { defineComponent, withAsyncContext, mergeProps, useSSRContext } from 'vue';
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

// pages/workspace.vue?vue&type=script&setup=true&lang.ts
var workspace_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "workspace",
	__ssrInlineRender: true,
	async setup(__props) {
		let __temp, __restore;
		[__temp, __restore] = withAsyncContext(() => navigateTo("/crm/", { replace: true })), await __temp, __restore();
		return (_ctx, _push, _parent, _attrs) => {
			_push(ssrRenderComponent(WorkspaceLoading_default, mergeProps({ label: "Открываем CRM" }, _attrs), null, _parent));
		};
	}
});
// pages/workspace.vue
var _sfc_setup = workspace_vue_vue_type_script_setup_true_lang_default.setup;
workspace_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/workspace.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var workspace_default = workspace_vue_vue_type_script_setup_true_lang_default;

export { workspace_default as default };;globalThis.__timing__.logEnd('Load chunks/build/workspace-1CL3H57y');
//# sourceMappingURL=workspace-1CL3H57y.mjs.map
