globalThis.__timing__.logStart('Load chunks/build/CrmFilePreview-D4bnqJky');import { a as useWorkspaceSession, $ as $fetch$1, f as useRuntimeConfig } from '../virtual/entry.mjs';
import { u as useCatalogDialog } from './useCatalogDialog-2pnsnnsL.mjs';
import { defineComponent, ref, computed, mergeProps, unref, createVNode, resolveDynamicComponent, shallowRef, watch, useSSRContext } from 'vue';
import { ssrRenderAttrs, ssrInterpolate, ssrRenderComponent, ssrRenderList, ssrIncludeBooleanAttr, ssrRenderVNode, ssrRenderAttr, ssrLooseContain, ssrLooseEqual, ssrRenderStyle } from 'vue/server-renderer';
import { X, ChevronRight, Folder, FileText, Download, ChevronLeft } from '@lucide/vue';

// composables/useCrmDrive.ts
function useCrmDrive(apiRoot = "/crm") {
	const config = useRuntimeConfig(), { token } = useWorkspaceSession();
	const request = async (path, options = {}) => {
		try {
			return await $fetch$1(`${apiRoot}/${path}`, {
				baseURL: config.public.apiBase,
				...options,
				headers: { Authorization: `Bearer ${token.value}` },
				retry: 0
			});
		} catch (error) {
			if (options.responseType !== "blob") throw error;
			let data = error?.data;
			if (data instanceof Blob) try {
				data = data.size <= 16384 ? JSON.parse(await data.text()) : null;
			} catch {
				data = null;
			}
			const statusCode = error?.statusCode || error?.response?.status;
			const fallback = statusCode === 401 ? "Войдите в CRM заново." : [403, 404].includes(statusCode) ? "Файл не найден или недоступен." : "Не удалось получить файл. Повторите попытку.";
			throw {
				statusCode,
				data: { message: typeof data?.message === "string" ? data.message : fallback }
			};
		}
	};
	const message = (e) => Array.isArray(e?.data?.message) ? e.data.message.join(", ") : e?.data?.message || e?.message || "Не удалось выполнить действие. Повторите попытку.";
	const size = (bytes) => !bytes ? "0 байт" : bytes >= 1024 ** 3 ? `${(bytes / 1024 ** 3).toFixed(1)} ГиБ` : bytes >= 1024 ** 2 ? `${(bytes / 1024 ** 2).toFixed(1)} МиБ` : `${Math.max(1, Math.round(bytes / 1024))} КиБ`;
	function upload(file, scope, parentId, progress = () => {}) {
		const query = new URLSearchParams({ scope });
		if (parentId) query.set("parentId", parentId);
		return uploadTo(`drive/upload?${query}`, file, progress);
	}
	function uploadAttachment(filesPath, file, progress = () => {}) {
		return uploadTo(`${filesPath}/upload`, file, progress);
	}
	function uploadTo(path, file, progress) {
		return new Promise((resolve, reject) => {
			const xhr = new (void 0)();
			xhr.open("POST", `${config.public.apiBase}${apiRoot}/${path}`);
			xhr.setRequestHeader("Authorization", `Bearer ${token.value}`);
			xhr.timeout = 18e4;
			xhr.upload.onprogress = (event) => {
				if (event.lengthComputable) progress(Math.round(event.loaded / event.total * 100));
			};
			xhr.onload = () => {
				let data;
				try {
					data = JSON.parse(xhr.responseText);
				} catch {
					data = {};
				}
				xhr.status >= 200 && xhr.status < 300 ? resolve(data) : reject({ data });
			};
			xhr.onerror = () => reject(/* @__PURE__ */ new Error("Ошибка сети. Файл не загружен."));
			xhr.ontimeout = () => reject(/* @__PURE__ */ new Error("Загрузка заняла слишком много времени. Повторите попытку."));
			const form = new FormData();
			form.append("file", file);
			xhr.send(form);
		});
	}
	async function download(item) {
		const blob = await request(`drive/${item.id}/content`, { responseType: "blob" });
		const url = URL.createObjectURL(blob), a = (void 0).createElement("a");
		a.href = url;
		a.download = item.name;
		a.click();
		setTimeout(() => URL.revokeObjectURL(url), 15e3);
	}
	return {
		request,
		upload,
		uploadAttachment,
		download,
		message,
		size
	};
}
// components/CrmDrivePicker.vue?vue&type=script&setup=true&lang.ts
var CrmDrivePicker_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "CrmDrivePicker",
	__ssrInlineRender: true,
	props: {
		scope: { default: "TEAM" },
		mode: { default: "file" },
		exclude: { default: () => [] },
		apiRoot: { default: "/crm" }
	},
	emits: ["close", "choose"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const opened = ref(false);
		useCatalogDialog(computed(() => opened.value), () => emit("close"));
		useCrmDrive(props.apiRoot);
		ref(null);
		const data = ref({
			items: [],
			crumbs: [],
			total: 0
		}), loading = ref(false), error = ref("");
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<div${ssrRenderAttrs(mergeProps({ class: "crm-work-overlay" }, _attrs))}><section tabindex="-1" class="admin-dialog crm-drive-picker" role="dialog" aria-modal="true" aria-label="Выбор на диске"><header class="crm-work-header"><h2>${ssrInterpolate(__props.mode === "folder" ? "Куда переместить" : "Прикрепить с диска команды")}</h2><button class="crm-icon-button crm-button crm-button--icon" aria-label="Закрыть выбор файла">`);
			_push(ssrRenderComponent(unref(X), { size: 20 }, null, _parent));
			_push(`</button></header><nav class="crm-drive-crumbs" aria-label="Путь к папке"><button class="crm-button crm-button--text">Корень диска</button><!--[-->`);
			ssrRenderList(unref(data).crumbs, (crumb) => {
				_push(`<!--[-->`);
				_push(ssrRenderComponent(unref(ChevronRight), { size: 14 }, null, _parent));
				_push(`<button class="crm-button">${ssrInterpolate(crumb.name)}</button><!--]-->`);
			});
			_push(`<!--]--></nav>`);
			if (unref(error)) _push(`<p role="alert">${ssrInterpolate(unref(error))}</p>`);
			else _push(`<!---->`);
			if (unref(loading)) _push(`<p role="status">Загружаем…</p>`);
			else _push(`<!---->`);
			_push(`<div class="crm-picker-items"><!--[-->`);
			ssrRenderList(unref(data).items.filter((i) => !__props.exclude.includes(i.id) && (__props.mode === "file" || i.kind === "FOLDER")), (item) => {
				_push(`<button${ssrIncludeBooleanAttr(unref(loading)) ? " disabled" : ""} class="crm-picker-item crm-button crm-button--row">`);
				ssrRenderVNode(_push, createVNode(resolveDynamicComponent(item.kind === "FOLDER" ? unref(Folder) : unref(FileText)), { size: 24 }, null), _parent);
				_push(`<span>${ssrInterpolate(item.name)}</span>`);
				if (item.kind === "FOLDER") _push(ssrRenderComponent(unref(ChevronRight), { size: 16 }, null, _parent));
				else _push(`<!---->`);
				_push(`</button>`);
			});
			_push(`<!--]--></div>`);
			if (!unref(loading) && !unref(data).items.length) _push(`<p class="crm-muted">Папка пуста</p>`);
			else _push(`<!---->`);
			if (unref(data).items.length < unref(data).total) _push(`<button class="crm-work-button crm-button"${ssrIncludeBooleanAttr(unref(loading)) ? " disabled" : ""}>Показать ещё</button>`);
			else _push(`<!---->`);
			_push(`<footer class="crm-work-actions"><button class="crm-work-button crm-button">Отмена</button>`);
			if (__props.mode === "folder") _push(`<button class="crm-primary-button crm-button crm-button--primary"${ssrIncludeBooleanAttr(unref(loading) || !!unref(error)) ? " disabled" : ""}>Переместить сюда</button>`);
			else _push(`<!---->`);
			_push(`</footer></section></div>`);
		};
	}
});
// components/CrmDrivePicker.vue
var _sfc_setup$2 = CrmDrivePicker_vue_vue_type_script_setup_true_lang_default.setup;
CrmDrivePicker_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/CrmDrivePicker.vue");
	return _sfc_setup$2 ? _sfc_setup$2(props, ctx) : void 0;
};
var CrmDrivePicker_default = Object.assign(CrmDrivePicker_vue_vue_type_script_setup_true_lang_default, { __name: "CrmDrivePicker" });
// components/CrmPdfViewer.vue?vue&type=script&setup=true&lang.ts
var CrmPdfViewer_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "CrmPdfViewer",
	__ssrInlineRender: true,
	props: { blob: {} },
	setup(__props) {
		ref(null);
		ref(null);
		const pageNumber = ref(1), pages = ref(0), zoom = ref(1), loading = ref(true), error = ref(""), pageText = ref("");
		const dimensions = ref({
			width: "100%",
			height: "auto"
		});
		async function render() {}
		watch([pageNumber, zoom], () => {
			error.value = "";
			render();
		});
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<div${ssrRenderAttrs(mergeProps({ class: "crm-pdf-viewer" }, _attrs))}><nav class="crm-work-actions" aria-label="Страницы PDF"><button class="crm-icon-button crm-button crm-button--icon" aria-label="Предыдущая страница PDF"${ssrIncludeBooleanAttr(unref(loading) || unref(pageNumber) <= 1) ? " disabled" : ""}>`);
			_push(ssrRenderComponent(unref(ChevronLeft), { size: 18 }, null, _parent));
			_push(`</button><span>Страница ${ssrInterpolate(unref(pageNumber))} из ${ssrInterpolate(unref(pages) || "…")}</span><button class="crm-icon-button crm-button crm-button--icon" aria-label="Следующая страница PDF"${ssrIncludeBooleanAttr(unref(loading) || unref(pageNumber) >= unref(pages)) ? " disabled" : ""}>`);
			_push(ssrRenderComponent(unref(ChevronRight), { size: 18 }, null, _parent));
			_push(`</button><select class="crm-input" aria-label="Масштаб PDF"><option${ssrRenderAttr("value", 1)}${ssrIncludeBooleanAttr(Array.isArray(unref(zoom)) ? ssrLooseContain(unref(zoom), 1) : ssrLooseEqual(unref(zoom), 1)) ? " selected" : ""}>По ширине</option><option${ssrRenderAttr("value", 1.5)}${ssrIncludeBooleanAttr(Array.isArray(unref(zoom)) ? ssrLooseContain(unref(zoom), 1.5) : ssrLooseEqual(unref(zoom), 1.5)) ? " selected" : ""}>150%</option><option${ssrRenderAttr("value", 2)}${ssrIncludeBooleanAttr(Array.isArray(unref(zoom)) ? ssrLooseContain(unref(zoom), 2) : ssrLooseEqual(unref(zoom), 2)) ? " selected" : ""}>200%</option></select></nav>`);
			if (unref(loading)) _push(`<p role="status">Отрисовываем страницу…</p>`);
			else _push(`<!---->`);
			if (unref(error)) _push(`<p class="crm-work-error" role="alert">${ssrInterpolate(unref(error))}</p>`);
			else _push(`<!---->`);
			_push(`<div class="crm-pdf-stage"><canvas style="${ssrRenderStyle(unref(dimensions))}" role="img"${ssrRenderAttr("aria-label", `Страница ${unref(pageNumber)} PDF`)}></canvas></div>`);
			if (unref(pageText)) _push(`<details class="crm-pdf-text"><summary>Текст страницы</summary><p>${ssrInterpolate(unref(pageText))}</p></details>`);
			else _push(`<!---->`);
			_push(`</div>`);
		};
	}
});
// components/CrmPdfViewer.vue
var _sfc_setup$1 = CrmPdfViewer_vue_vue_type_script_setup_true_lang_default.setup;
CrmPdfViewer_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/CrmPdfViewer.vue");
	return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
var CrmPdfViewer_default = Object.assign(CrmPdfViewer_vue_vue_type_script_setup_true_lang_default, { __name: "CrmPdfViewer" });
// components/CrmFilePreview.vue?vue&type=script&setup=true&lang.ts
var CrmFilePreview_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "CrmFilePreview",
	__ssrInlineRender: true,
	props: {
		item: {},
		apiRoot: {}
	},
	emits: ["close"],
	setup(__props, { emit: __emit }) {
		const props = __props, emit = __emit;
		const { request, message, size } = useCrmDrive(props.apiRoot);
		const loading = ref(true), error = ref(""), url = ref(""), text = ref("");
		const pdf = shallowRef(null);
		const opened = ref(false);
		useCatalogDialog(computed(() => opened.value), () => emit("close"));
		const supported = computed(() => [
			"image/png",
			"image/jpeg",
			"image/webp",
			"application/pdf",
			"text/plain"
		].includes(props.item.mime));
		let generation = 0;
		watch(() => props.item.id, async () => {
			const current = ++generation;
			if (url.value) URL.revokeObjectURL(url.value);
			url.value = "";
			text.value = "";
			pdf.value = null;
			loading.value = true;
			error.value = "";
			try {
				if (!supported.value) return;
				if (props.item.mime === "text/plain" && props.item.size > 1048576) {
					error.value = "Для текста больше 1 МиБ доступно скачивание.";
					return;
				}
				const blob = await request(`drive/${props.item.id}/content`, { responseType: "blob" });
				if (current !== generation) return;
				if (props.item.mime === "application/pdf") pdf.value = blob;
				else if (props.item.mime === "text/plain") text.value = await blob.text();
				else url.value = URL.createObjectURL(new Blob([blob], { type: props.item.mime }));
			} catch (e) {
				if (current === generation) error.value = message(e);
			} finally {
				if (current === generation) loading.value = false;
			}
		}, { immediate: true });
		return (_ctx, _push, _parent, _attrs) => {
			const _component_CrmPdfViewer = CrmPdfViewer_default;
			_push(`<div${ssrRenderAttrs(mergeProps({ class: "crm-work-overlay" }, _attrs))}><section tabindex="-1" class="admin-dialog crm-file-preview" role="dialog" aria-modal="true"${ssrRenderAttr("aria-label", `Предпросмотр: ${__props.item.name}`)}><header class="crm-work-header"><div><h2>${ssrInterpolate(__props.item.name)}</h2><small>${ssrInterpolate(unref(size)(__props.item.size))} · Закрытый файл CRM</small></div><button class="crm-work-button crm-button">`);
			_push(ssrRenderComponent(unref(Download), { size: 18 }, null, _parent));
			_push(`Скачать</button><button class="crm-icon-button crm-button crm-button--icon" aria-label="Закрыть предпросмотр" autofocus>`);
			_push(ssrRenderComponent(unref(X), { size: 20 }, null, _parent));
			_push(`</button></header><div class="crm-preview-body">`);
			if (unref(loading)) _push(`<p role="status">Открываем файл…</p>`);
			else if (unref(error)) _push(`<p role="alert">${ssrInterpolate(unref(error))}</p>`);
			else if (unref(url) && __props.item.mime.startsWith("image/")) _push(`<img${ssrRenderAttr("src", unref(url))}${ssrRenderAttr("alt", __props.item.name)}>`);
			else if (unref(pdf)) _push(ssrRenderComponent(_component_CrmPdfViewer, {
				key: __props.item.id,
				blob: unref(pdf)
			}, null, _parent));
			else if (__props.item.mime === "text/plain") _push(`<pre>${ssrInterpolate(unref(text))}</pre>`);
			else {
				_push(`<div class="crm-work-empty">`);
				_push(ssrRenderComponent(unref(FileText), { size: 40 }, null, _parent));
				_push(`<h3>Этот формат можно скачать</h3><p>Предпросмотр доступен для изображений, PDF и текстовых файлов.</p></div>`);
			}
			_push(`</div></section></div>`);
		};
	}
});
// components/CrmFilePreview.vue
var _sfc_setup = CrmFilePreview_vue_vue_type_script_setup_true_lang_default.setup;
CrmFilePreview_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/CrmFilePreview.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var CrmFilePreview_default = Object.assign(CrmFilePreview_vue_vue_type_script_setup_true_lang_default, { __name: "CrmFilePreview" });

export { CrmDrivePicker_default as C, CrmFilePreview_default as a, useCrmDrive as u };;globalThis.__timing__.logEnd('Load chunks/build/CrmFilePreview-D4bnqJky');
//# sourceMappingURL=CrmFilePreview-D4bnqJky.mjs.map
