globalThis.__timing__.logStart('Load chunks/build/contact-messages-dFm0EtGe');import { u as useHead } from '../virtual/entry.mjs';
import { C as ContactMessagesWorkspace_default } from './ContactMessagesWorkspace-DkOv7dhq.mjs';
import { defineComponent, useSSRContext } from 'vue';
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

// pages/admin-workspace/contact-messages.vue?vue&type=script&setup=true&lang.ts
var contact_messages_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "contact-messages",
	__ssrInlineRender: true,
	setup(__props) {
		useHead({ meta: [{
			name: "robots",
			content: "noindex, nofollow"
		}] });
		return (_ctx, _push, _parent, _attrs) => {
			_push(ssrRenderComponent(ContactMessagesWorkspace_default, _attrs, null, _parent));
		};
	}
});
// pages/admin-workspace/contact-messages.vue
var _sfc_setup = contact_messages_vue_vue_type_script_setup_true_lang_default.setup;
contact_messages_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/admin-workspace/contact-messages.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var contact_messages_default = contact_messages_vue_vue_type_script_setup_true_lang_default;

export { contact_messages_default as default };;globalThis.__timing__.logEnd('Load chunks/build/contact-messages-dFm0EtGe');
//# sourceMappingURL=contact-messages-dFm0EtGe.mjs.map
