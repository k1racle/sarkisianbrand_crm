globalThis.__timing__.logStart('Load chunks/build/useCrmCardDrag-DCjeNwkh');import { b as useWorkspaceAccess } from '../virtual/entry.mjs';
import { u as useCrmDrive, C as CrmDrivePicker_default, a as CrmFilePreview_default } from './CrmFilePreview-D4bnqJky.mjs';
import { ref, defineComponent, computed, watch, mergeProps, unref, useSSRContext } from 'vue';
import { ssrRenderAttrs, ssrRenderComponent, ssrInterpolate, ssrIncludeBooleanAttr, ssrRenderAttr, ssrRenderList } from 'vue/server-renderer';
import { Paperclip, Upload, FolderOpen, FileText, X } from '@lucide/vue';

// components/CrmTaskFiles.vue?vue&type=script&setup=true&lang.ts
var CrmTaskFiles_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "CrmTaskFiles",
	__ssrInlineRender: true,
	props: {
		taskId: {},
		leadId: {},
		publicationId: {}
	},
	emits: ["busy", "changed"],
	setup(__props, { emit: __emit }) {
		const props = __props, emit = __emit;
		const apiRoot = props.publicationId ? "/crm/content-plan" : "/crm";
		const filesPath = computed(() => props.publicationId ? `${props.publicationId}/files` : props.leadId ? `leads/${props.leadId}/files` : `tasks/${props.taskId}/files`);
		const { request, message, size } = useCrmDrive(apiRoot), { can } = useWorkspaceAccess();
		const writable = computed(() => can(props.publicationId ? "content_plan.write" : "crm.write")), files = ref([]), error = ref(""), busy = ref(false), loading = ref(false), picker = ref(false), preview = ref(null);
		ref(null);
		const progress = ref(0);
		let sequence = 0;
		watch(filesPath, async (path) => {
			const seq = ++sequence;
			loading.value = true;
			error.value = "";
			files.value = [];
			try {
				const result = await request(path);
				if (seq === sequence) files.value = result;
			} catch (e) {
				error.value = message(e);
			} finally {
				if (seq === sequence) loading.value = false;
			}
		}, { immediate: true });
		watch(busy, (value) => emit("busy", value));
		async function attach(node) {
			const attached = await request(filesPath.value, {
				method: "POST",
				body: { nodeId: node.id }
			});
			files.value = [attached, ...files.value.filter((x) => x.nodeId !== node.id)];
			emit("changed");
		}
		async function choose(node) {
			if (busy.value) return;
			busy.value = true;
			error.value = "";
			try {
				await attach(node);
				picker.value = false;
			} catch (e) {
				error.value = message(e);
			} finally {
				busy.value = false;
			}
		}
		return (_ctx, _push, _parent, _attrs) => {
			const _component_CrmDrivePicker = CrmDrivePicker_default;
			const _component_CrmFilePreview = CrmFilePreview_default;
			_push(`<section${ssrRenderAttrs(mergeProps({ class: "crm-task-files" }, _attrs))}><header class="crm-work-header"><h3 class="crm-icon-heading">`);
			_push(ssrRenderComponent(unref(Paperclip), {
				size: 18,
				"aria-hidden": "true"
			}, null, _parent));
			_push(`<span>Вложения · ${ssrInterpolate(unref(files).length)}</span></h3>`);
			if (unref(writable)) {
				_push(`<div class="crm-work-actions"><button class="crm-work-button crm-button"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}>`);
				_push(ssrRenderComponent(unref(Upload), { size: 16 }, null, _parent));
				_push(`Загрузить</button><button class="crm-work-button crm-button"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}>`);
				_push(ssrRenderComponent(unref(FolderOpen), { size: 16 }, null, _parent));
				_push(`С диска</button><input class="crm-visually-hidden" type="file" multiple aria-label="Выбрать вложения к карточке"></div>`);
			} else _push(`<!---->`);
			_push(`</header><p class="crm-muted">Вложения сохраняются в «Файлах» с доступом по карточкам. Для общего файла нужен доступ ко всем связанным карточкам; после отвязки ограничения остаются.</p>`);
			if (unref(error)) _push(`<p class="crm-work-error" role="alert">${ssrInterpolate(unref(error))}</p>`);
			else _push(`<!---->`);
			if (unref(loading)) _push(`<p>Загружаем вложения…</p>`);
			else _push(`<!---->`);
			if (unref(busy)) _push(`<progress${ssrRenderAttr("value", unref(progress))} max="100" aria-label="Загрузка вложения"></progress>`);
			else _push(`<!---->`);
			if (!unref(loading) && !unref(files).length) _push(`<p class="crm-muted">Пока нет вложений</p>`);
			else _push(`<!---->`);
			_push(`<!--[-->`);
			ssrRenderList(unref(files), (item) => {
				_push(`<div class="crm-attachment"><button class="crm-work-button crm-button">`);
				_push(ssrRenderComponent(unref(FileText), { size: 20 }, null, _parent));
				_push(`<span>${ssrInterpolate(item.node.name)}<small>${ssrInterpolate(unref(size)(item.node.size))}</small></span></button>`);
				if (unref(writable)) {
					_push(`<button class="crm-icon-button crm-button crm-button--icon"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}${ssrRenderAttr("aria-label", `Убрать вложение ${item.node.name}`)}>`);
					_push(ssrRenderComponent(unref(X), { size: 18 }, null, _parent));
					_push(`</button>`);
				} else _push(`<!---->`);
				_push(`</div>`);
			});
			_push(`<!--]-->`);
			if (unref(picker)) _push(ssrRenderComponent(_component_CrmDrivePicker, {
				"api-root": unref(apiRoot),
				onClose: ($event) => !unref(busy) && (picker.value = false),
				onChoose: choose
			}, null, _parent));
			else _push(`<!---->`);
			if (unref(preview)) _push(ssrRenderComponent(_component_CrmFilePreview, {
				"api-root": unref(apiRoot),
				item: unref(preview),
				onClose: ($event) => preview.value = null
			}, null, _parent));
			else _push(`<!---->`);
			_push(`</section>`);
		};
	}
});
// components/CrmTaskFiles.vue
var _sfc_setup = CrmTaskFiles_vue_vue_type_script_setup_true_lang_default.setup;
CrmTaskFiles_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/CrmTaskFiles.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var CrmTaskFiles_default = Object.assign(CrmTaskFiles_vue_vue_type_script_setup_true_lang_default, { __name: "CrmTaskFiles" });
// composables/useCrmCardDrag.ts
/** Native mouse dragging + touch long-press. Short swipes keep native scrolling. */
function useCrmCardDrag(onDrop) {
	const active = ref(""), over = ref("");
	let timer, source = null, touchId = "", suppressUntil = 0;
	function clear() {
		if (timer) clearTimeout(timer);
		timer = void 0;
		source?.classList.remove("crm-card-lifted");
		source = null;
		touchId = "";
		active.value = "";
		over.value = "";
	}
	function touchStart(event, id) {
		if (event.touches.length !== 1 || event.target.closest("button,input,textarea,select,a")) return;
		clear();
		source = event.currentTarget;
		event.touches[0].clientX;
		event.touches[0].clientY;
		touchId = id;
		timer = setTimeout(() => {
			active.value = touchId;
			source?.classList.add("crm-card-lifted");
			(void 0).vibrate?.(15);
		}, 350);
	}
	function start(event, id) {
		if (event.target.closest("button,input,textarea,select,a")) {
			event.preventDefault();
			return;
		}
		active.value = id;
		if (event.dataTransfer) {
			event.dataTransfer.effectAllowed = "move";
			event.dataTransfer.setData("text/plain", id);
		}
	}
	function finish() {
		suppressUntil = Date.now() + 300;
		clear();
	}
	const allowClick = () => Date.now() > suppressUntil;
	return {
		active,
		over,
		start,
		finish,
		touchStart,
		allowClick
	};
}

export { CrmTaskFiles_default as C, useCrmCardDrag as u };;globalThis.__timing__.logEnd('Load chunks/build/useCrmCardDrag-DCjeNwkh');
//# sourceMappingURL=useCrmCardDrag-DCjeNwkh.mjs.map
