globalThis.__timing__.logStart('Load chunks/build/CrmCardTabs-CwDu8QcL');import { defineComponent, computed, mergeProps, unref, useSSRContext } from 'vue';
import { ssrRenderAttrs, ssrRenderList, ssrRenderAttr, ssrInterpolate } from 'vue/server-renderer';

// components/CrmCardTabs.vue?vue&type=script&setup=true&lang.ts
var CrmCardTabs_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "CrmCardTabs",
	__ssrInlineRender: true,
	props: {
		modelValue: {},
		prefix: {},
		tabs: {},
		label: {}
	},
	emits: ["update:modelValue"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const tabs = computed(() => props.tabs || [
			["general", "Общее"],
			["subtasks", "Подзадачи"],
			["files", "Вложения"],
			["comments", "Комментарии"],
			["history", "История изменений"]
		]);
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<nav${ssrRenderAttrs(mergeProps({
				class: "crm-card-tabs",
				role: "tablist",
				"aria-label": __props.label || "Разделы карточки"
			}, _attrs))}><!--[-->`);
			ssrRenderList(unref(tabs), (tab, index) => {
				_push(`<button class="crm-button"${ssrRenderAttr("id", `${__props.prefix}-${tab[0]}-tab`)} type="button" role="tab"${ssrRenderAttr("aria-selected", __props.modelValue === tab[0])}${ssrRenderAttr("aria-controls", `${__props.prefix}-${tab[0]}-panel`)}${ssrRenderAttr("tabindex", __props.modelValue === tab[0] ? 0 : -1)}>${ssrInterpolate(tab[1])}</button>`);
			});
			_push(`<!--]--></nav>`);
		};
	}
});
// components/CrmCardTabs.vue
var _sfc_setup = CrmCardTabs_vue_vue_type_script_setup_true_lang_default.setup;
CrmCardTabs_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/CrmCardTabs.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var CrmCardTabs_default = Object.assign(CrmCardTabs_vue_vue_type_script_setup_true_lang_default, { __name: "CrmCardTabs" });

export { CrmCardTabs_default as C };;globalThis.__timing__.logEnd('Load chunks/build/CrmCardTabs-CwDu8QcL');
//# sourceMappingURL=CrmCardTabs-CwDu8QcL.mjs.map
