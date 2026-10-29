globalThis.__timing__.logStart('Load chunks/build/departments-BQ8b0VBX');import { u as useHead, a as useWorkspaceSession, $ as $fetch$1, f as useRuntimeConfig } from '../virtual/entry.mjs';
import { u as useCatalogDialog } from './useCatalogDialog-2pnsnnsL.mjs';
import { defineComponent, ref, reactive, computed, watch, mergeProps, unref, useSSRContext } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import { ssrRenderAttrs, ssrIncludeBooleanAttr, ssrRenderComponent, ssrInterpolate, ssrLooseContain, ssrRenderList, ssrRenderTeleport, ssrRenderAttr, ssrLooseEqual } from 'vue/server-renderer';
import { RefreshCw, Plus, Users, X } from '@lucide/vue';
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

// pages/crm/settings/departments.vue?vue&type=script&setup=true&lang.ts
var departments_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "departments",
	__ssrInlineRender: true,
	setup(__props) {
		useHead({ title: "Отделы — SARKISIAN CRM" });
		const session = useWorkspaceSession(), config = useRuntimeConfig();
		const departments = ref([]), staff = ref([]), loading = ref(false), saving = ref(false), error = ref(""), formError = ref("");
		const opened = ref(false), selected = ref(null), baseline = ref("");
		const showArchived = ref(false);
		const draft = reactive({
			name: "",
			parentId: "",
			leaderId: "",
			memberIds: []
		});
		const dirty = computed(() => opened.value && baseline.value !== JSON.stringify(draft));
		const request = (path, options = {}) => $fetch$1("/system-settings" + path, {
			baseURL: config.public.apiBase,
			headers: { Authorization: `Bearer ${session.token.value}` },
			...options
		});
		const label = (person) => [person.firstName, person.lastName].filter(Boolean).join(" ") || person.email;
		const assigned = computed(() => new Map(departments.value.flatMap((department) => department.members.map((member) => [member.id, department.id]))));
		const candidates = computed(() => staff.value.filter((member) => (!assigned.value.has(member.id) || assigned.value.get(member.id) === selected.value?.id) && (member.isActive || draft.memberIds.includes(member.id))));
		function descendants(id) {
			return departments.value.filter((department) => department.parentId === id).flatMap((department) => [department.id, ...descendants(department.id)]);
		}
		const parents = computed(() => departments.value.filter((department) => department.id !== selected.value?.id && !descendants(selected.value?.id || "").includes(department.id)));
		async function load() {
			loading.value = true;
			error.value = "";
			try {
				const [list, team] = await Promise.all([request("/departments", { query: { status: showArchived.value ? "archived" : "active" } }), request("/staff")]);
				departments.value = list;
				staff.value = team;
			} catch (e) {
				error.value = e?.data?.message || "Не удалось загрузить отделы";
			} finally {
				loading.value = false;
			}
		}
		function leave() {
			return !saving.value && (!dirty.value || (void 0).confirm("Изменения отдела не сохранены. Выйти без сохранения?"));
		}
		function close() {
			if (leave()) opened.value = false;
		}
		useCatalogDialog(computed(() => opened.value), close);
		watch(() => [...draft.memberIds], (ids) => {
			if (draft.leaderId && !ids.includes(draft.leaderId)) draft.leaderId = "";
		});
		watch(showArchived, load);
		onBeforeRouteLeave(leave);
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<main${ssrRenderAttrs(mergeProps({ class: "crm-standard" }, _attrs))}><header class="crm-page-header"><div><h1>Отделы</h1><p>Структура команды, руководители и состав подразделений.</p></div><div class="crm-action-bar"><button class="crm-button crm-button--refresh"${ssrIncludeBooleanAttr(unref(loading) || unref(saving)) ? " disabled" : ""}>`);
			_push(ssrRenderComponent(unref(RefreshCw), { size: 18 }, null, _parent));
			_push(`Обновить</button><button class="crm-button crm-button--primary"${ssrIncludeBooleanAttr(unref(loading) || unref(saving) || unref(showArchived)) ? " disabled" : ""}>`);
			_push(ssrRenderComponent(unref(Plus), { size: 18 }, null, _parent));
			_push(`Новый отдел</button></div></header>`);
			if (unref(error)) _push(`<p role="alert">${ssrInterpolate(unref(error))}</p>`);
			else _push(`<!---->`);
			if (unref(loading)) _push(`<p role="status">Загружаем структуру…</p>`);
			else _push(`<!---->`);
			_push(`<section class="crm-surface crm-register crm-stack"><p>Сотрудник входит в один отдел. Для перевода сначала исключите его из прежнего отдела. Отдел пока не ограничивает видимость данных. При смене состава или подчинённости сессии затронутых сотрудников завершаются — им потребуется войти снова.</p><label class="crm-toggle-row"><span>Архив отделов</span><input${ssrIncludeBooleanAttr(Array.isArray(unref(showArchived)) ? ssrLooseContain(unref(showArchived), null) : unref(showArchived)) ? " checked" : ""} type="checkbox" class="crm-check"${ssrIncludeBooleanAttr(unref(loading) || unref(saving)) ? " disabled" : ""}></label><!--[-->`);
			ssrRenderList(unref(departments), (department) => {
				_push(`<article class="crm-item-card crm-record"><span><strong>${ssrInterpolate(department.name)}</strong><small>${ssrInterpolate(department.parentId ? unref(departments).find((item) => item.id === department.parentId)?.name || "Дочерний отдел" : "Самостоятельный отдел")}</small></span><span><strong>${ssrInterpolate(department.leader ? label(department.leader) : "Руководитель не назначен")}</strong><small>Сотрудников: ${ssrInterpolate(department.members.length)}</small></span>`);
				if (!unref(showArchived)) _push(`<!--[--><button class="crm-button"${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""}>Изменить</button><button class="crm-button crm-button--danger"${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""}>В архив</button><!--]-->`);
				else _push(`<button class="crm-button"${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""}>Восстановить</button>`);
				_push(`</article>`);
			});
			_push(`<!--]-->`);
			if (!unref(loading) && !unref(departments).length) {
				_push(`<div class="crm-empty">`);
				_push(ssrRenderComponent(unref(Users), { size: 28 }, null, _parent));
				_push(`<h2>${ssrInterpolate(unref(showArchived) ? "В архиве нет отделов" : "Создайте первый отдел")}</h2><p>${ssrInterpolate(unref(showArchived) ? "Архивные отделы можно восстановить с сохранением истории." : "Например, «Продажи», «Маркетинг» или «Поддержка».")}</p></div>`);
			} else _push(`<!---->`);
			_push(`</section>`);
			ssrRenderTeleport(_push, (_push) => {
				if (unref(opened)) {
					_push(`<div class="admin-dialog-backdrop crm-detail-backdrop"><form class="admin-dialog admin-dialog--drawer crm-detail-card" role="dialog" aria-modal="true" aria-labelledby="department-title" tabindex="-1"><header><h2 id="department-title">${ssrInterpolate(unref(selected) ? "Редактировать отдел" : "Новый отдел")}</h2><button class="crm-button crm-button--icon" aria-label="Закрыть отдел" type="button"${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""}>`);
					_push(ssrRenderComponent(unref(X), { size: 18 }, null, _parent));
					_push(`</button></header><div class="admin-dialog-body crm-detail-body crm-stack">`);
					if (unref(formError)) _push(`<p role="alert">${ssrInterpolate(unref(formError))}</p>`);
					else _push(`<!---->`);
					_push(`<fieldset class="ui-fieldset-reset crm-stack"${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""}><label class="crm-field">Название<input${ssrRenderAttr("value", unref(draft).name)} class="crm-input" required maxlength="100"></label><label class="crm-field">Родительский отдел<select class="crm-input"><option value=""${ssrIncludeBooleanAttr(Array.isArray(unref(draft).parentId) ? ssrLooseContain(unref(draft).parentId, "") : ssrLooseEqual(unref(draft).parentId, "")) ? " selected" : ""}>Самостоятельный отдел</option><!--[-->`);
					ssrRenderList(unref(parents), (department) => {
						_push(`<option${ssrRenderAttr("value", department.id)}${ssrIncludeBooleanAttr(Array.isArray(unref(draft).parentId) ? ssrLooseContain(unref(draft).parentId, department.id) : ssrLooseEqual(unref(draft).parentId, department.id)) ? " selected" : ""}>${ssrInterpolate(department.name)}</option>`);
					});
					_push(`<!--]--></select></label><fieldset class="ui-fieldset-reset crm-stack"><legend>Сотрудники отдела</legend><p>Доступны сотрудники без отдела и текущий состав.</p><!--[-->`);
					ssrRenderList(unref(candidates), (member) => {
						_push(`<label class="crm-record crm-item-card crm-toggle-row"><input${ssrIncludeBooleanAttr(Array.isArray(unref(draft).memberIds) ? ssrLooseContain(unref(draft).memberIds, member.id) : unref(draft).memberIds) ? " checked" : ""} type="checkbox" class="crm-check"${ssrRenderAttr("value", member.id)}><span><strong>${ssrInterpolate(label(member))}</strong><small>${ssrInterpolate(member.email)}${ssrInterpolate(member.isActive ? "" : " · Заблокирован")}</small></span></label>`);
					});
					_push(`<!--]-->`);
					if (!unref(candidates).length) _push(`<p>Нет доступных сотрудников. Добавьте сотрудника или освободите его от прежнего отдела.</p>`);
					else _push(`<!---->`);
					_push(`</fieldset><label class="crm-field">Руководитель<select class="crm-input"><option value=""${ssrIncludeBooleanAttr(Array.isArray(unref(draft).leaderId) ? ssrLooseContain(unref(draft).leaderId, "") : ssrLooseEqual(unref(draft).leaderId, "")) ? " selected" : ""}>Не назначен</option><!--[-->`);
					ssrRenderList(unref(candidates).filter((item) => item.isActive && unref(draft).memberIds.includes(item.id)), (member) => {
						_push(`<option${ssrRenderAttr("value", member.id)}${ssrIncludeBooleanAttr(Array.isArray(unref(draft).leaderId) ? ssrLooseContain(unref(draft).leaderId, member.id) : ssrLooseEqual(unref(draft).leaderId, member.id)) ? " selected" : ""}>${ssrInterpolate(label(member))}</option>`);
					});
					_push(`<!--]--></select></label></fieldset></div><footer class="crm-detail-footer"><button type="button" class="crm-button"${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""}>Отмена</button><button type="submit" class="crm-button crm-button--primary"${ssrIncludeBooleanAttr(unref(saving) || !unref(draft).name.trim() || unref(selected) && !unref(dirty)) ? " disabled" : ""}>${ssrInterpolate(unref(saving) ? "Сохраняем…" : "Сохранить отдел")}</button></footer></form></div>`);
				} else _push(`<!---->`);
			}, "body", false, _parent);
			_push(`</main>`);
		};
	}
});
// pages/crm/settings/departments.vue
var _sfc_setup = departments_vue_vue_type_script_setup_true_lang_default.setup;
departments_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/crm/settings/departments.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var departments_default = departments_vue_vue_type_script_setup_true_lang_default;

export { departments_default as default };;globalThis.__timing__.logEnd('Load chunks/build/departments-BQ8b0VBX');
//# sourceMappingURL=departments-BQ8b0VBX.mjs.map
