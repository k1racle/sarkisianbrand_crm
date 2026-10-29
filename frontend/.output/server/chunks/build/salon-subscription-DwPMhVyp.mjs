globalThis.__timing__.logStart('Load chunks/build/salon-subscription-DwPMhVyp');import { u as useHead } from '../virtual/entry.mjs';
import { S as SalonSubscriptionSettings_default } from './SalonSubscriptionSettings-HDvEQrHM.mjs';
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

// pages/crm/settings/salon-subscription.vue?vue&type=script&setup=true&lang.ts
var salon_subscription_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "salon-subscription",
	__ssrInlineRender: true,
	setup(__props) {
		useHead({ title: "Подписка салонов — SARKISIAN CRM" });
		return (_ctx, _push, _parent, _attrs) => {
			_push(ssrRenderComponent(SalonSubscriptionSettings_default, _attrs, null, _parent));
		};
	}
});
// pages/crm/settings/salon-subscription.vue
var _sfc_setup = salon_subscription_vue_vue_type_script_setup_true_lang_default.setup;
salon_subscription_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/crm/settings/salon-subscription.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var salon_subscription_default = salon_subscription_vue_vue_type_script_setup_true_lang_default;

export { salon_subscription_default as default };;globalThis.__timing__.logEnd('Load chunks/build/salon-subscription-DwPMhVyp');
//# sourceMappingURL=salon-subscription-DwPMhVyp.mjs.map
