globalThis.__timing__.logStart('Load chunks/build/files-BAEnFtzS');import { u as useHead, b as useWorkspaceAccess } from '../virtual/entry.mjs';
import { u as useCatalogDialog } from './useCatalogDialog-2pnsnnsL.mjs';
import { u as useCrmDrive, C as CrmDrivePicker_default, a as CrmFilePreview_default } from './CrmFilePreview-D4bnqJky.mjs';
import { defineComponent, computed, ref, mergeProps, unref, createVNode, resolveDynamicComponent, useSSRContext } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import { ssrRenderAttrs, ssrIncludeBooleanAttr, ssrRenderComponent, ssrRenderClass, ssrRenderAttr, ssrInterpolate, ssrLooseContain, ssrLooseEqual, ssrRenderList, ssrRenderVNode } from 'vue/server-renderer';
import { FolderPlus, Upload, HardDrive, UsersRound, Clock3, Trash2, Search, LayoutGrid, List, ChevronRight, RotateCcw, Pencil, MoveRight, Download, X, Folder, FileText, Check } from '@lucide/vue';
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

// components/CrmDriveThumbnail.vue?vue&type=script&setup=true&lang.ts
var CrmDriveThumbnail_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "CrmDriveThumbnail",
	__ssrInlineRender: true,
	props: { item: {} },
	setup(__props) {
		useCrmDrive();
		const host = ref(null), url = ref("");
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<span${ssrRenderAttrs(mergeProps({
				ref_key: "host",
				ref: host,
				class: "crm-file-thumbnail"
			}, _attrs))}>`);
			if (unref(url)) _push(`<img${ssrRenderAttr("src", unref(url))} alt="">`);
			else ssrRenderVNode(_push, createVNode(resolveDynamicComponent(__props.item.kind === "FOLDER" ? unref(Folder) : unref(FileText)), {
				size: 42,
				"aria-hidden": "true"
			}, null), _parent);
			_push(`</span>`);
		};
	}
});
// components/CrmDriveThumbnail.vue
var _sfc_setup$1 = CrmDriveThumbnail_vue_vue_type_script_setup_true_lang_default.setup;
CrmDriveThumbnail_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/CrmDriveThumbnail.vue");
	return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
var CrmDriveThumbnail_default = Object.assign(CrmDriveThumbnail_vue_vue_type_script_setup_true_lang_default, { __name: "CrmDriveThumbnail" });
// pages/crm/files.vue?vue&type=script&setup=true&lang.ts
var files_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "files",
	__ssrInlineRender: true,
	setup(__props) {
		useHead({ title: "Файлы — SARKISIAN CRM" });
		const { request, message, size } = useCrmDrive();
		const { can } = useWorkspaceAccess();
		const writable = computed(() => can("crm.write"));
		const scope = ref("PERSONAL"), view = ref("files"), layout = ref("grid"), search = ref(""), sort = ref("name");
		const parentId = ref(null), data = ref({
			items: [],
			crumbs: [],
			total: 0,
			used: 0,
			quota: 1024 ** 3
		});
		const loading = ref(false), busy = ref(false), error = ref(""), notice = ref(""), selected = ref([]), preview = ref(null), picker = ref(false), editing = ref(null), name = ref("");
		ref(null);
		const hover = ref("");
		const queue = ref([]), uploading = computed(() => queue.value.some((item) => item.state === "loading" || item.state === "waiting"));
		useCatalogDialog(computed(() => !!editing.value), () => {
			if (!busy.value) editing.value = null;
		});
		let sequence = 0;
		async function load(more = false) {
			const seq = ++sequence;
			loading.value = true;
			error.value = "";
			try {
				const result = await request("drive", { query: {
					scope: scope.value,
					parentId: parentId.value || void 0,
					view: view.value,
					search: search.value || void 0,
					sort: sort.value,
					direction: sort.value === "name" ? "asc" : "desc",
					offset: more ? data.value.items.length : 0
				} });
				if (seq !== sequence) return;
				data.value = {
					...result,
					items: more ? [...data.value.items, ...result.items] : result.items
				};
				if (!more) selected.value = [];
			} catch (e) {
				if (seq === sequence) error.value = message(e);
			} finally {
				if (seq === sequence) loading.value = false;
			}
		}
		async function run(action) {
			if (busy.value) return;
			busy.value = true;
			error.value = "";
			notice.value = "";
			try {
				await action();
				await load();
				return true;
			} catch (e) {
				const failure = message(e);
				await load();
				error.value = failure;
				return false;
			} finally {
				busy.value = false;
			}
		}
		const chosen = computed(() => data.value.items.filter((item) => selected.value.includes(item.id)));
		async function move(destination, ids = [...selected.value]) {
			if (await run(async () => {
				for (const id of ids) if (id !== destination.id) await request(`drive/${id}`, {
					method: "PATCH",
					body: { parentId: destination.id }
				});
			})) {
				picker.value = false;
				notice.value = "Перемещено";
			}
		}
		onBeforeRouteLeave(() => !uploading.value && (!editing.value || !name.value || (void 0).confirm("Закрыть без сохранения названия?")));
		return (_ctx, _push, _parent, _attrs) => {
			const _component_CrmDriveThumbnail = CrmDriveThumbnail_default;
			const _component_CrmDrivePicker = CrmDrivePicker_default;
			const _component_CrmFilePreview = CrmFilePreview_default;
			_push(`<main${ssrRenderAttrs(mergeProps({ class: "crm-work-page crm-drive-page crm-standard crm-operational-page crm-ops-files" }, _attrs))}><header class="crm-work-header crm-page-header"><div><h1>Файлы</h1><p class="crm-muted">Документы и материалы команды — всё по папкам.</p></div>`);
			if (unref(writable)) {
				_push(`<div class="crm-work-actions"><button class="crm-work-button crm-button"${ssrIncludeBooleanAttr(unref(busy) || unref(view) !== "files" || !!unref(search)) ? " disabled" : ""}>`);
				_push(ssrRenderComponent(unref(FolderPlus), { size: 18 }, null, _parent));
				_push(`Новая папка</button><button class="crm-primary-button crm-button crm-button--primary"${ssrIncludeBooleanAttr(unref(view) === "trash") ? " disabled" : ""}>`);
				_push(ssrRenderComponent(unref(Upload), { size: 18 }, null, _parent));
				_push(`Загрузить файлы</button><input class="crm-visually-hidden" type="file" multiple aria-label="Выбрать файлы"></div>`);
			} else _push(`<!---->`);
			_push(`</header><div class="crm-drive-layout"><aside class="crm-drive-nav" aria-label="Разделы диска"><button class="${ssrRenderClass([{ active: unref(scope) === "PERSONAL" && unref(view) === "files" }, "crm-button"])}"${ssrRenderAttr("aria-pressed", unref(scope) === "PERSONAL" && unref(view) === "files")}>`);
			_push(ssrRenderComponent(unref(HardDrive), { size: 20 }, null, _parent));
			_push(`Мой диск</button><button class="${ssrRenderClass([{ active: unref(scope) === "TEAM" && unref(view) === "files" }, "crm-button"])}"${ssrRenderAttr("aria-pressed", unref(scope) === "TEAM" && unref(view) === "files")}>`);
			_push(ssrRenderComponent(unref(UsersRound), { size: 20 }, null, _parent));
			_push(`Диск команды</button><button class="${ssrRenderClass([{ active: unref(view) === "recent" }, "crm-button"])}"${ssrRenderAttr("aria-pressed", unref(view) === "recent")}>`);
			_push(ssrRenderComponent(unref(Clock3), { size: 20 }, null, _parent));
			_push(`Недавние</button><button class="${ssrRenderClass([{ active: unref(view) === "trash" }, "crm-button"])}"${ssrRenderAttr("aria-pressed", unref(view) === "trash")}>`);
			_push(ssrRenderComponent(unref(Trash2), { size: 20 }, null, _parent));
			_push(`Корзина</button><div class="crm-drive-storage"><small>${ssrInterpolate(unref(scope) === "TEAM" ? "Командный диск" : "Личный диск")}</small><progress${ssrRenderAttr("value", unref(data).used)}${ssrRenderAttr("max", unref(data).quota)}${ssrRenderAttr("aria-label", `Доступные файлы ${unref(size)(unref(data).used)}, лимит диска ${unref(size)(unref(data).quota)}`)}></progress><small>Доступные файлы: ${ssrInterpolate(unref(size)(unref(data).used))} · лимит диска ${ssrInterpolate(unref(size)(unref(data).quota))}</small></div></aside><section class="${ssrRenderClass([{ "is-drop-target": unref(hover) === "surface" }, "crm-drive-surface crm-surface"])}"><div class="crm-drive-toolbar"><form class="crm-drive-search crm-input-group">`);
			_push(ssrRenderComponent(unref(Search), { size: 18 }, null, _parent));
			_push(`<input class="crm-input"${ssrRenderAttr("value", unref(search))} aria-label="Поиск файлов" placeholder="Найти файл или папку"><button class="crm-work-button crm-button" type="submit">Найти</button></form><select class="crm-input" aria-label="Сортировка файлов"><option value="name"${ssrIncludeBooleanAttr(Array.isArray(unref(sort)) ? ssrLooseContain(unref(sort), "name") : ssrLooseEqual(unref(sort), "name")) ? " selected" : ""}>По названию</option><option value="updatedAt"${ssrIncludeBooleanAttr(Array.isArray(unref(sort)) ? ssrLooseContain(unref(sort), "updatedAt") : ssrLooseEqual(unref(sort), "updatedAt")) ? " selected" : ""}>Сначала новые</option><option value="size"${ssrIncludeBooleanAttr(Array.isArray(unref(sort)) ? ssrLooseContain(unref(sort), "size") : ssrLooseEqual(unref(sort), "size")) ? " selected" : ""}>По размеру</option></select><div class="crm-work-actions"><button class="crm-icon-button crm-button crm-button--icon"${ssrRenderAttr("aria-pressed", unref(layout) === "grid")} aria-label="Плитка">`);
			_push(ssrRenderComponent(unref(LayoutGrid), { size: 18 }, null, _parent));
			_push(`</button><button class="crm-icon-button crm-button crm-button--icon"${ssrRenderAttr("aria-pressed", unref(layout) === "list")} aria-label="Список">`);
			_push(ssrRenderComponent(unref(List), { size: 18 }, null, _parent));
			_push(`</button></div></div><nav class="crm-drive-crumbs" aria-label="Папка"><button class="crm-button crm-button--text">${ssrInterpolate(unref(scope) === "TEAM" ? "Диск команды" : "Мой диск")}</button>`);
			if (unref(view) === "files" && !unref(search)) {
				_push(`<!--[-->`);
				ssrRenderList(unref(data).crumbs, (crumb) => {
					_push(`<!--[-->`);
					_push(ssrRenderComponent(unref(ChevronRight), { size: 14 }, null, _parent));
					_push(`<button class="crm-button">${ssrInterpolate(crumb.name)}</button><!--]-->`);
				});
				_push(`<!--]-->`);
			} else _push(`<!---->`);
			if (unref(search)) _push(`<span>/ Результаты поиска</span>`);
			else if (unref(view) !== "files") _push(`<span>/ ${ssrInterpolate(unref(view) === "trash" ? "Корзина" : "Недавние")}</span>`);
			else _push(`<!---->`);
			_push(`</nav><p class="crm-muted">${ssrInterpolate(unref(scope) === "TEAM" ? "Общие файлы доступны команде. Вложения — только при доступе ко всем связанным карточкам." : "Эти файлы доступны только вам.")} ${ssrInterpolate(unref(view) === "trash" ? "Восстановите файл или папку, чтобы вернуть их в работу." : "До 30 МиБ на файл.")}</p>`);
			if (unref(error)) _push(`<p class="crm-work-error" role="alert">${ssrInterpolate(unref(error))} <button class="crm-work-button crm-button">Повторить</button></p>`);
			else _push(`<!---->`);
			if (unref(notice)) _push(`<p role="status">${ssrInterpolate(unref(notice))}</p>`);
			else _push(`<!---->`);
			if (unref(selected).length) {
				_push(`<div class="crm-drive-selection"><span>Выбрано: ${ssrInterpolate(unref(selected).length)}</span>`);
				if (unref(writable)) {
					_push(`<!--[-->`);
					if (unref(view) === "trash") {
						_push(`<button class="crm-work-button crm-button"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}>`);
						_push(ssrRenderComponent(unref(RotateCcw), { size: 16 }, null, _parent));
						_push(`Восстановить</button>`);
					} else {
						_push(`<!--[-->`);
						if (unref(selected).length === 1) {
							_push(`<button class="crm-work-button crm-button"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}>`);
							_push(ssrRenderComponent(unref(Pencil), { size: 16 }, null, _parent));
							_push(`Название</button>`);
						} else _push(`<!---->`);
						_push(`<button class="crm-work-button crm-button"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}>`);
						_push(ssrRenderComponent(unref(MoveRight), { size: 16 }, null, _parent));
						_push(`Переместить</button><button class="crm-work-button danger crm-button crm-button--danger"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}>`);
						_push(ssrRenderComponent(unref(Trash2), { size: 16 }, null, _parent));
						_push(`В корзину</button><!--]-->`);
					}
					_push(`<!--]-->`);
				} else _push(`<!---->`);
				if (unref(view) !== "trash" && unref(chosen).length === 1 && unref(chosen)[0].kind === "FILE") {
					_push(`<button class="crm-work-button crm-button">`);
					_push(ssrRenderComponent(unref(Download), { size: 16 }, null, _parent));
					_push(`Скачать</button>`);
				} else _push(`<!---->`);
				_push(`<button class="crm-icon-button crm-button crm-button--icon" aria-label="Снять выделение">`);
				_push(ssrRenderComponent(unref(X), { size: 18 }, null, _parent));
				_push(`</button></div>`);
			} else _push(`<!---->`);
			if (unref(loading)) _push(`<p role="status">Загружаем содержимое…</p>`);
			else if (!unref(error) && !unref(data).items.length) {
				_push(`<div class="crm-work-empty">`);
				_push(ssrRenderComponent(unref(Folder), { size: 48 }, null, _parent));
				_push(`<h2>${ssrInterpolate(unref(search) ? "Ничего не найдено" : unref(view) === "trash" ? "Корзина пуста" : "Здесь пока нет файлов")}</h2><p>${ssrInterpolate(unref(search) ? "Попробуйте другое название." : unref(view) === "trash" ? "Удалённые файлы можно будет восстановить здесь." : unref(writable) ? "Перетащите файлы сюда или нажмите «Загрузить файлы»." : "Файлы появятся здесь, когда ответственный добавит материалы.")}</p>`);
				if (unref(search)) _push(`<button class="crm-button">Сбросить поиск</button>`);
				else if (unref(writable) && unref(view) === "files") _push(`<button class="crm-button crm-button--primary">Загрузить файлы</button>`);
				else _push(`<!---->`);
				_push(`</div>`);
			} else _push(`<!---->`);
			_push(`<div class="${ssrRenderClass([`crm-drive-${unref(layout)}`, "crm-drive-items"])}"><!--[-->`);
			ssrRenderList(unref(data).items, (item) => {
				_push(`<article class="${ssrRenderClass([{
					selected: unref(selected).includes(item.id),
					"is-drop-target": unref(hover) === item.id,
					"is-folder": item.kind === "FOLDER"
				}, "crm-drive-item crm-item-card"])}"${ssrRenderAttr("draggable", unref(writable) && !unref(busy) && unref(view) !== "trash")}><input class="crm-drive-checkbox crm-check crm-switch-overlay" type="checkbox"${ssrIncludeBooleanAttr(unref(selected).includes(item.id)) ? " checked" : ""}${ssrRenderAttr("aria-label", `Выбрать ${item.name}`)}><button class="crm-file-open crm-button crm-card-action"${ssrRenderAttr("aria-label", `${item.kind === "FOLDER" ? "Открыть папку" : "Предпросмотр"} ${item.name}`)}>`);
				_push(ssrRenderComponent(_component_CrmDriveThumbnail, { item }, null, _parent));
				_push(`<strong>${ssrInterpolate(item.name)}</strong><small>${ssrInterpolate(item.kind === "FOLDER" ? "Папка" : unref(size)(item.size))}</small>`);
				if (item.restricted) _push(`<small class="crm-badge">Доступ по карточкам</small>`);
				else _push(`<!---->`);
				_push(`<time>${ssrInterpolate(new Date(item.updatedAt).toLocaleDateString("ru-RU"))}</time></button></article>`);
			});
			_push(`<!--]--></div>`);
			if (unref(data).items.length < unref(data).total) _push(`<button class="crm-work-button crm-button"${ssrIncludeBooleanAttr(unref(loading)) ? " disabled" : ""}>Показать ещё · ${ssrInterpolate(unref(data).total - unref(data).items.length)}</button>`);
			else _push(`<!---->`);
			_push(`</section></div>`);
			if (unref(queue).length) {
				_push(`<section class="crm-upload-queue" aria-label="Очередь загрузки"><header class="crm-work-header"><h2>Загрузки ${ssrInterpolate(unref(queue).filter((x) => x.state === "done").length)}/${ssrInterpolate(unref(queue).length)}</h2>`);
				if (!unref(uploading)) {
					_push(`<button class="crm-icon-button crm-button crm-button--icon" aria-label="Закрыть загрузки">`);
					_push(ssrRenderComponent(unref(X), { size: 18 }, null, _parent));
					_push(`</button>`);
				} else _push(`<!---->`);
				_push(`</header>`);
				if (unref(uploading)) _push(`<p class="crm-muted">Дождитесь окончания загрузки перед переходом на другую страницу.</p>`);
				else _push(`<!---->`);
				_push(`<!--[-->`);
				ssrRenderList(unref(queue), (entry) => {
					_push(`<div class="crm-upload-row">`);
					_push(ssrRenderComponent(unref(FileText), { size: 20 }, null, _parent));
					_push(`<div><strong>${ssrInterpolate(entry.file.name)}</strong>`);
					if (entry.state === "error") _push(`<small class="crm-work-error">${ssrInterpolate(entry.error)}</small>`);
					else if (entry.state !== "done") _push(`<progress${ssrRenderAttr("value", entry.progress)} max="100"${ssrRenderAttr("aria-label", `Загрузка ${entry.file.name}`)}></progress>`);
					else _push(`<!---->`);
					_push(`<small>${ssrInterpolate(entry.state === "done" ? "Загружен" : entry.state === "loading" ? `${entry.progress}%` : entry.state === "waiting" ? "В очереди" : "Не загружен")}</small></div>`);
					if (entry.state === "done") _push(ssrRenderComponent(unref(Check), { size: 18 }, null, _parent));
					else _push(`<!---->`);
					if (entry.state === "error") _push(`<button class="crm-work-button crm-button">Повторить</button>`);
					else _push(`<!---->`);
					_push(`</div>`);
				});
				_push(`<!--]--></section>`);
			} else _push(`<!---->`);
			if (unref(editing)) {
				_push(`<div class="crm-work-overlay"><form tabindex="-1" class="admin-dialog crm-drive-picker" role="dialog" aria-modal="true"${ssrRenderAttr("aria-label", unref(editing) === "folder" ? "Новая папка" : "Переименовать")}><h2>${ssrInterpolate(unref(editing) === "folder" ? "Новая папка" : "Переименовать")}</h2><label class="crm-work-field crm-field">Название<input class="crm-input"${ssrRenderAttr("value", unref(name))} autofocus required maxlength="180"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}></label>`);
				if (unref(error)) _push(`<p role="alert" class="crm-work-error">${ssrInterpolate(unref(error))}</p>`);
				else _push(`<!---->`);
				_push(`<footer class="crm-work-actions"><button type="button" class="crm-work-button crm-button"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}>Отмена</button><button class="crm-primary-button crm-button crm-button--primary"${ssrIncludeBooleanAttr(unref(busy) || !unref(name).trim()) ? " disabled" : ""}>${ssrInterpolate(unref(busy) ? "Сохраняем…" : "Сохранить")}</button></footer></form></div>`);
			} else _push(`<!---->`);
			if (unref(picker)) _push(ssrRenderComponent(_component_CrmDrivePicker, {
				scope: unref(scope),
				mode: "folder",
				exclude: unref(selected),
				onClose: ($event) => !unref(busy) && (picker.value = false),
				onChoose: move
			}, null, _parent));
			else _push(`<!---->`);
			if (unref(preview)) _push(ssrRenderComponent(_component_CrmFilePreview, {
				item: unref(preview),
				onClose: ($event) => preview.value = null
			}, null, _parent));
			else _push(`<!---->`);
			_push(`</main>`);
		};
	}
});
// pages/crm/files.vue
var _sfc_setup = files_vue_vue_type_script_setup_true_lang_default.setup;
files_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/crm/files.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var files_default = files_vue_vue_type_script_setup_true_lang_default;

export { files_default as default };;globalThis.__timing__.logEnd('Load chunks/build/files-BAEnFtzS');
//# sourceMappingURL=files-BAEnFtzS.mjs.map
