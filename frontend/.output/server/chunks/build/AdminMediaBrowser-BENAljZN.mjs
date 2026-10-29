globalThis.__timing__.logStart('Load chunks/build/AdminMediaBrowser-BENAljZN');import { a as useWorkspaceSession, f as useRuntimeConfig } from '../virtual/entry.mjs';
import { defineComponent, computed, ref, watch, mergeProps, unref, useSSRContext } from 'vue';
import { ssrRenderAttrs, ssrIncludeBooleanAttr, ssrRenderClass, ssrRenderComponent, ssrInterpolate, ssrRenderAttr, ssrRenderList } from 'vue/server-renderer';
import { Upload, Check } from '@lucide/vue';

// components/AdminMediaBrowser.vue?vue&type=script&setup=true&lang.ts
var limit = 24;
var AdminMediaBrowser_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "AdminMediaBrowser",
	__ssrInlineRender: true,
	props: {
		apiBase: {},
		token: {},
		disabled: {
			type: Boolean,
			default: false
		},
		showCancel: {
			type: Boolean,
			default: false
		}
	},
	emits: ["select", "cancel"],
	setup(__props, { expose: __expose, emit: __emit }) {
		const props = __props;
		const config = useRuntimeConfig();
		const session = useWorkspaceSession();
		const apiBase = computed(() => props.apiBase ?? String(config.public.apiBase || ""));
		const token = computed(() => props.token ?? session.token.value);
		const fileInput = ref(null);
		const q = ref("");
		const page = ref(1);
		const total = ref(0);
		const assets = ref([]);
		const loaded = ref(false);
		const loading = ref(false);
		const uploading = ref(false);
		const error = ref("");
		const status = ref("");
		const selectedId = ref("");
		const dragDepth = ref(0);
		const allowedMimes = /* @__PURE__ */ new Set([
			"image/jpeg",
			"image/png",
			"image/webp",
			"image/avif"
		]);
		const controllers = /* @__PURE__ */ new Set();
		let timer;
		const pages = computed(() => Math.max(1, Math.ceil(total.value / limit)));
		const selected = computed(() => assets.value.find((asset) => asset.id === selectedId.value));
		const busy = computed(() => props.disabled || uploading.value);
		function canonicalUrl(value) {
			return /^\/api\/v1\/media\/files\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:jpg|png|webp|avif)$/.test(value);
		}
		function displayUrl(value) {
			if (!canonicalUrl(value)) return "";
			try {
				return new URL(value, new URL(apiBase.value, String(config.public.siteUrl || "http://localhost:3001")).origin).href;
			} catch {
				return "";
			}
		}
		const supported = (asset) => allowedMimes.has(asset.mime) && Boolean(displayUrl(asset.url));
		const sizeLabel = (bytes) => bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MiB` : `${Math.ceil(bytes / 1024)} KiB`;
		const dateLabel = (value) => Number.isNaN(new Date(value).getTime()) ? "Дата не указана" : new Date(value).toLocaleDateString("ru-RU");
		async function load(targetPage = 1) {}
		function stopRequests() {
			controllers.forEach((controller) => controller.abort());
			if (timer) clearTimeout(timer);
			timer = void 0;
			loading.value = false;
			uploading.value = false;
			dragDepth.value = 0;
			if (fileInput.value) fileInput.value.value = "";
		}
		function chooseFile() {
			if (busy.value) return;
			if (fileInput.value) {
				fileInput.value.value = "";
				fileInput.value.click();
			}
		}
		watch(q, () => {});
		watch(() => [
			apiBase.value,
			token.value,
			props.disabled
		], () => {
			stopRequests();
			assets.value = [];
			total.value = 0;
			loaded.value = false;
			page.value = 1;
			selectedId.value = "";
			error.value = "";
			status.value = "";
		});
		__expose({
			chooseFile,
			refresh: load,
			cancelPending: stopRequests
		});
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<section${ssrRenderAttrs(mergeProps({
				class: "admin-media-library aml-browser",
				"aria-label": "Медиабиблиотека"
			}, _attrs))}><input type="file" class="aml-file-input" accept="image/jpeg,image/png,image/webp,image/avif,.jpg,.jpeg,.png,.webp,.avif"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""} aria-label="Загрузить изображение"><div class="${ssrRenderClass([{
				"aml-dropzone--active": unref(dragDepth) > 0,
				"aml-dropzone--busy": unref(busy)
			}, "aml-dropzone"])}"><span class="aml-dropzone-icon" aria-hidden="true">`);
			_push(ssrRenderComponent(unref(Upload), { size: 24 }, null, _parent));
			_push(`</span><div><strong>${ssrInterpolate(unref(uploading) ? "Загружаем изображение…" : "Перетащите изображение сюда")}</strong><p class="aml-help">JPEG, PNG, WebP или AVIF · до 8 MiB · по одному файлу</p></div><button type="button" class="aml-button aml-button--white crm-button"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}>Выбрать файл</button></div>`);
			if (unref(status)) _push(`<p class="aml-message" role="status">${ssrInterpolate(unref(status))}</p>`);
			else _push(`<!---->`);
			_push(`<div class="aml-toolbar"><label class="aml-search"><span>Поиск по названию</span><input class="crm-input"${ssrRenderAttr("value", unref(q))} type="search" maxlength="120"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""} placeholder="Название файла"></label><button type="button" class="aml-button aml-button--white crm-button"${ssrIncludeBooleanAttr(unref(busy) || unref(loading)) ? " disabled" : ""}>Обновить список</button><span class="aml-total" role="status">${ssrInterpolate(unref(loaded) ? `Файлов: ${unref(total)}` : "Загрузка списка…")}</span></div>`);
			if (unref(error)) _push(`<p class="aml-message" role="alert">${ssrInterpolate(unref(error))} <button type="button" class="aml-button aml-button--white crm-button"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}>Повторить загрузку списка</button></p>`);
			else _push(`<!---->`);
			if (unref(loading) || unref(uploading)) _push(`<p class="aml-message" role="status">${ssrInterpolate(unref(uploading) ? "Загружаем изображение…" : "Загружаем медиабиблиотеку…")}</p>`);
			else if (unref(loaded) && unref(assets).length) {
				_push(`<div class="aml-grid" role="group" aria-label="Изображения медиабиблиотеки"><!--[-->`);
				ssrRenderList(unref(assets), (asset) => {
					_push(`<button type="button" class="${ssrRenderClass([{ "is-selected": unref(selectedId) === asset.id }, "aml-asset crm-button crm-card-action crm-item-card"])}"${ssrIncludeBooleanAttr(!supported(asset) || unref(busy)) ? " disabled" : ""}${ssrRenderAttr("aria-pressed", unref(selectedId) === asset.id)}${ssrRenderAttr("aria-label", `Выбрать ${asset.originalName}`)}><div class="aml-image">`);
					if (supported(asset)) _push(`<img${ssrRenderAttr("src", displayUrl(asset.url))}${ssrRenderAttr("alt", asset.originalName)} loading="lazy">`);
					else _push(`<span>Формат недоступен</span>`);
					if (unref(selectedId) === asset.id) {
						_push(`<span class="aml-selected-mark" aria-hidden="true">`);
						_push(ssrRenderComponent(unref(Check), { size: 16 }, null, _parent));
						_push(`</span>`);
					} else _push(`<!---->`);
					_push(`</div><span class="aml-filename">${ssrInterpolate(asset.originalName)}</span><small>${ssrInterpolate(asset.mime.replace("image/", "").toUpperCase())} · ${ssrInterpolate(sizeLabel(asset.size))}</small><small>${ssrInterpolate(dateLabel(asset.createdAt))}</small></button>`);
				});
				_push(`<!--]--></div>`);
			} else if (unref(loaded) && !unref(error)) _push(`<p class="aml-message">${ssrInterpolate(unref(q).trim() ? "По этому запросу файлов не найдено." : "В медиабиблиотеке пока нет файлов.")}</p>`);
			else _push(`<!---->`);
			if (unref(pages) > 1) _push(`<nav class="aml-pagination" aria-label="Страницы медиабиблиотеки"><button type="button" class="aml-button aml-button--white crm-button"${ssrIncludeBooleanAttr(unref(loading) || unref(busy) || unref(page) === 1) ? " disabled" : ""}>Назад</button><span>Страница ${ssrInterpolate(unref(page))} из ${ssrInterpolate(unref(pages))}</span><button type="button" class="aml-button aml-button--white crm-button"${ssrIncludeBooleanAttr(unref(loading) || unref(busy) || unref(page) === unref(pages)) ? " disabled" : ""}>Далее</button></nav>`);
			else _push(`<!---->`);
			_push(`<footer class="aml-footer"><span>${ssrInterpolate(unref(selected)?.originalName || "Изображение не выбрано")}</span><div class="aml-actions">`);
			if (__props.showCancel) _push(`<button type="button" class="aml-button aml-button--white crm-button">Отмена</button>`);
			else _push(`<!---->`);
			_push(`<button type="button" class="aml-button crm-button"${ssrIncludeBooleanAttr(!unref(selected) || !supported(unref(selected)) || unref(loading) || unref(busy)) ? " disabled" : ""}>Использовать изображение</button></div></footer></section>`);
		};
	}
});
// components/AdminMediaBrowser.vue
var _sfc_setup = AdminMediaBrowser_vue_vue_type_script_setup_true_lang_default.setup;
AdminMediaBrowser_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/AdminMediaBrowser.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var AdminMediaBrowser_default = Object.assign(AdminMediaBrowser_vue_vue_type_script_setup_true_lang_default, { __name: "AdminMediaBrowser" });

export { AdminMediaBrowser_default as A };;globalThis.__timing__.logEnd('Load chunks/build/AdminMediaBrowser-BENAljZN');
//# sourceMappingURL=AdminMediaBrowser-BENAljZN.mjs.map
