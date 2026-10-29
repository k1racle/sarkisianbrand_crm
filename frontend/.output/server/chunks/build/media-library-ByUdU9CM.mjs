globalThis.__timing__.logStart('Load chunks/build/media-library-ByUdU9CM');import { u as useHead } from '../virtual/entry.mjs';
import { A as AdminMediaBrowser_default } from './AdminMediaBrowser-BENAljZN.mjs';
import { defineComponent, ref, mergeProps, unref, useSSRContext } from 'vue';
import { ssrRenderAttrs, ssrRenderComponent, ssrInterpolate, ssrRenderAttr } from 'vue/server-renderer';
import { Images, Copy } from '@lucide/vue';
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

// pages/media-library.vue?vue&type=script&setup=true&lang.ts
var media_library_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "media-library",
	__ssrInlineRender: true,
	setup(__props) {
		const selected = ref(null);
		const copied = ref(false);
		const copyError = ref("");
		useHead({
			title: "Медиатека — SARKISIAN",
			meta: [{
				name: "robots",
				content: "noindex, nofollow"
			}]
		});
		return (_ctx, _push, _parent, _attrs) => {
			const _component_AdminMediaBrowser = AdminMediaBrowser_default;
			_push(`<main${ssrRenderAttrs(mergeProps({
				"data-v-ui-cdcb039fc38c": "",
				class: "admin-media-page"
			}, _attrs))}><header data-v-ui-cdcb039fc38c class="page-header"><div data-v-ui-cdcb039fc38c><p data-v-ui-cdcb039fc38c class="kicker">SARKISIAN / МЕДИАТЕКА</p><h1 data-v-ui-cdcb039fc38c>Медиатека</h1><span data-v-ui-cdcb039fc38c>Общие изображения для сайта и рабочих разделов. Загрузите файл или выберите уже добавленный.</span></div></header><section data-v-ui-cdcb039fc38c class="admin-media-page__body">`);
			_push(ssrRenderComponent(_component_AdminMediaBrowser, { onSelect: ($event) => {
				selected.value = $event;
				copied.value = false;
				copyError.value = "";
			} }, null, _parent));
			if (unref(selected)) {
				_push(`<section data-v-ui-cdcb039fc38c class="admin-media-selection" aria-labelledby="media-selection-title"><h2 data-v-ui-cdcb039fc38c id="media-selection-title">`);
				_push(ssrRenderComponent(unref(Images), {
					"data-v-ui-cdcb039fc38c": "",
					size: 20
				}, null, _parent));
				_push(` ${ssrInterpolate(unref(selected).originalName)}</h2><label data-v-ui-cdcb039fc38c>Ссылка на изображение<input data-v-ui-cdcb039fc38c${ssrRenderAttr("value", unref(selected).url)} readonly></label><button data-v-ui-cdcb039fc38c type="button">`);
				_push(ssrRenderComponent(unref(Copy), {
					"data-v-ui-cdcb039fc38c": "",
					size: 18
				}, null, _parent));
				_push(` ${ssrInterpolate(unref(copied) ? "Ссылка скопирована" : "Скопировать ссылку")}</button>`);
				if (unref(copyError)) _push(`<p data-v-ui-cdcb039fc38c role="alert">${ssrInterpolate(unref(copyError))}</p>`);
				else _push(`<!---->`);
				_push(`</section>`);
			} else _push(`<!---->`);
			_push(`</section></main>`);
		};
	}
});
// pages/media-library.vue
var _sfc_setup = media_library_vue_vue_type_script_setup_true_lang_default.setup;
media_library_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/media-library.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var media_library_default = media_library_vue_vue_type_script_setup_true_lang_default;

export { media_library_default as default };;globalThis.__timing__.logEnd('Load chunks/build/media-library-ByUdU9CM');
//# sourceMappingURL=media-library-ByUdU9CM.mjs.map
