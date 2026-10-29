globalThis.__timing__.logStart('Load chunks/build/useWorkspaceEntityDraft-DQuVCmKr');import { u as useCatalogDialog } from './useCatalogDialog-2pnsnnsL.mjs';
import { ref, computed, defineComponent, mergeProps, unref, useSSRContext } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import { ssrRenderAttrs, ssrRenderAttr, ssrRenderList, ssrInterpolate } from 'vue/server-renderer';

// components/CrmAccountManagerField.vue?vue&type=script&setup=true&lang.ts
var CrmAccountManagerField_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "CrmAccountManagerField",
	__ssrInlineRender: true,
	props: {
		modelValue: {},
		people: {},
		current: {}
	},
	emits: ["update:modelValue"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const name = (person) => [person.firstName, person.lastName].filter(Boolean).join(" ") || person.email || "Сотрудник";
		const options = computed(() => props.current && !props.people.some((person) => person.id === props.current.id) ? [props.current, ...props.people] : props.people);
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<label${ssrRenderAttrs(mergeProps({ class: "crm-field" }, _attrs))}>Ответственный за клиента <select class="crm-input"${ssrRenderAttr("value", __props.modelValue || "")}><option value="">Не назначен</option><!--[-->`);
			ssrRenderList(unref(options), (person) => {
				_push(`<option${ssrRenderAttr("value", person.id)}>${ssrInterpolate(name(person))}</option>`);
			});
			_push(`<!--]--></select></label>`);
		};
	}
});
// components/CrmAccountManagerField.vue
var _sfc_setup = CrmAccountManagerField_vue_vue_type_script_setup_true_lang_default.setup;
CrmAccountManagerField_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/CrmAccountManagerField.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var CrmAccountManagerField_default = Object.assign(CrmAccountManagerField_vue_vue_type_script_setup_true_lang_default, { __name: "CrmAccountManagerField" });
// composables/useWorkspaceEntityDraft.ts
/** Isolated editor with save/discard guard, keyboard focus and route protection. */
function useWorkspaceEntityDraft(busy) {
	const selected = ref(null);
	const baseline = ref("");
	const draftDirty = computed(() => selected.value !== null && JSON.stringify(selected.value) !== baseline.value);
	const clone = (entity) => JSON.parse(JSON.stringify(entity));
	function setEntity(entity) {
		selected.value = clone(entity);
		baseline.value = JSON.stringify(selected.value);
	}
	function closeEditor() {
		if (busy.value) return false;
		if (draftDirty.value && !(void 0).confirm("Закрыть карточку без сохранения изменений?")) return false;
		selected.value = null;
		baseline.value = "";
		return true;
	}
	function markSaved(entity) {
		if (entity) selected.value = clone(entity);
		baseline.value = JSON.stringify(selected.value);
	}
	onBeforeRouteLeave(() => !busy.value && (!draftDirty.value || (void 0).confirm("Есть несохранённые изменения. Покинуть страницу?")));
	const { panel: entityPanel, keyboard: entityKeys } = useCatalogDialog(computed(() => selected.value !== null), closeEditor);
	return {
		selected,
		draftDirty,
		setEntity,
		closeEditor,
		markSaved,
		entityPanel,
		entityKeys
	};
}

export { CrmAccountManagerField_default as C, useWorkspaceEntityDraft as u };;globalThis.__timing__.logEnd('Load chunks/build/useWorkspaceEntityDraft-DQuVCmKr');
//# sourceMappingURL=useWorkspaceEntityDraft-DQuVCmKr.mjs.map
