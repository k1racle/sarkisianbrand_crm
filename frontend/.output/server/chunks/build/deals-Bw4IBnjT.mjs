globalThis.__timing__.logStart('Load chunks/build/deals-Bw4IBnjT');import { u as useHead, a as useWorkspaceSession, b as useWorkspaceAccess, W as WorkspaceLoading_default, $ as $fetch$1, n as navigateTo, f as useRuntimeConfig } from '../virtual/entry.mjs';
import { u as useCatalogDialog } from './useCatalogDialog-2pnsnnsL.mjs';
import { u as useContextMenu } from './useContextMenu-CQeSn2KJ.mjs';
import { C as CrmCardTabs_default } from './CrmCardTabs-CwDu8QcL.mjs';
import { u as useCrmDrive } from './CrmFilePreview-D4bnqJky.mjs';
import { u as useCrmCardDrag, C as CrmTaskFiles_default } from './useCrmCardDrag-DCjeNwkh.mjs';
import { C as CrmCardComments_default, a as CrmChangeHistory_default, b as CrmSubtasks_default } from './CrmChangeHistory-ha9Jk_jf.mjs';
import { defineComponent, ref, computed, reactive, watch, mergeProps, unref, isRef, useSSRContext } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import { ssrRenderAttrs, ssrRenderComponent, ssrInterpolate, ssrIncludeBooleanAttr, ssrRenderAttr, ssrLooseContain, ssrLooseEqual, ssrRenderList, ssrRenderStyle, ssrRenderClass, ssrRenderTeleport, ssrRenderDynamicAttr } from 'vue/server-renderer';
import { Settings2, RefreshCw, Plus, Search, MoreHorizontal, UserRound, Phone, CalendarClock, X, Check, ArrowUpRight, ArrowUp, ArrowDown, Trash2, GripVertical, Pencil } from '@lucide/vue';
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

// components/CrmLeadTasks.vue?vue&type=script&setup=true&lang.ts
var CrmLeadTasks_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "CrmLeadTasks",
	__ssrInlineRender: true,
	props: {
		leadId: {},
		team: {},
		managerId: {}
	},
	emits: ["busy"],
	setup(__props, { emit: __emit }) {
		const props = __props, emit = __emit;
		const { user } = useWorkspaceSession(), { can } = useWorkspaceAccess(), { request, message } = useCrmDrive();
		const rows = ref([]), title = ref(""), assignee = ref(props.managerId || user.value?.id || ""), busy = ref(false), error = ref("");
		watch(busy, (x) => emit("busy", x));
		async function load() {
			try {
				const lead = await request(`leads/${props.leadId}`);
				rows.value = (lead.tasks || []).filter((t) => t.status !== "CANCELLED");
			} catch (e) {
				error.value = message(e);
			}
		}
		async function create() {
			if (busy.value || !title.value.trim()) return;
			busy.value = true;
			error.value = "";
			try {
				await request("tasks", {
					method: "POST",
					body: {
						title: title.value.trim(),
						assignedToId: assignee.value,
						leadId: props.leadId
					}
				});
				title.value = "";
				await load();
			} catch (e) {
				error.value = message(e);
			} finally {
				busy.value = false;
			}
		}
		async function toggle(task) {
			busy.value = true;
			error.value = "";
			try {
				await request(`tasks/${task.id}`, {
					method: "PATCH",
					body: { status: task.status === "DONE" ? "TODO" : "DONE" }
				});
				await load();
			} catch (e) {
				error.value = message(e);
			} finally {
				busy.value = false;
			}
		}
		watch(() => props.leadId, load, { immediate: true });
		return (_ctx, _push, _parent, _attrs) => {
			const _component_CrmSubtasks = CrmSubtasks_default;
			_push(`<div${ssrRenderAttrs(_attrs)}>`);
			if (unref(error)) _push(`<p role="alert" class="crm-work-error">${ssrInterpolate(unref(error))}</p>`);
			else _push(`<!---->`);
			_push(ssrRenderComponent(_component_CrmSubtasks, {
				title: unref(title),
				"onUpdate:title": ($event) => isRef(title) ? title.value = $event : null,
				assignee: unref(assignee),
				"onUpdate:assignee": ($event) => isRef(assignee) ? assignee.value = $event : null,
				rows: unref(rows),
				team: __props.team,
				busy: unref(busy),
				writable: unref(can)("crm.write"),
				description: "Эти задачи также доступны в общем списке задач команды.",
				onCreate: create,
				onToggle: toggle,
				onOpen: (task) => ("navigateTo" in _ctx ? _ctx.navigateTo : unref(navigateTo))("/crm/tasks?task=" + task.id)
			}, null, _parent));
			_push(`</div>`);
		};
	}
});
// components/CrmLeadTasks.vue
var _sfc_setup$2 = CrmLeadTasks_vue_vue_type_script_setup_true_lang_default.setup;
CrmLeadTasks_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/CrmLeadTasks.vue");
	return _sfc_setup$2 ? _sfc_setup$2(props, ctx) : void 0;
};
var CrmLeadTasks_default = Object.assign(CrmLeadTasks_vue_vue_type_script_setup_true_lang_default, { __name: "CrmLeadTasks" });
// components/CrmPipelineSettings.vue?vue&type=script&setup=true&lang.ts
var CrmPipelineSettings_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "CrmPipelineSettings",
	__ssrInlineRender: true,
	props: {
		modelValue: { type: Boolean },
		currentId: {}
	},
	emits: [
		"update:modelValue",
		"changed",
		"select"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const config = useRuntimeConfig();
		const { token } = useWorkspaceSession();
		const headers = computed(() => ({ Authorization: "Bearer " + token.value }));
		const pipelines = ref([]);
		const selectedId = ref("");
		const selected = computed(() => pipelines.value.find((item) => item.id === selectedId.value));
		const loading = ref(false), saving = ref(false), error = ref(""), notice = ref("");
		const tab = ref("stages");
		const tabs = [
			{
				id: "stages",
				label: "Этапы"
			},
			{
				id: "fields",
				label: "Поля сделки"
			},
			{
				id: "reasons",
				label: "Причины отказа"
			},
			{
				id: "settings",
				label: "Настройки"
			}
		];
		const draft = ref(null), baseline = ref("");
		const creating = ref(false), newName = ref(""), newReason = ref("");
		const stageDraft = ref(null), stageBaseline = ref(""), draggedStage = ref("");
		const pipelineDirty = computed(() => Boolean(draft.value && JSON.stringify(draft.value) !== baseline.value));
		const stageDirty = computed(() => Boolean(stageDraft.value && JSON.stringify(stageDraft.value) !== stageBaseline.value));
		const dirty = computed(() => pipelineDirty.value || stageDirty.value || Boolean(creating.value && newName.value.trim()) || Boolean(newReason.value.trim()));
		const fieldOptions = [
			{
				id: "title",
				label: "Название сделки",
				hint: "Краткое описание запроса"
			},
			{
				id: "contactName",
				label: "Контакт",
				hint: "Имя контактного лица"
			},
			{
				id: "contactPhone",
				label: "Телефон",
				hint: "Номер для связи"
			},
			{
				id: "contactEmail",
				label: "Email",
				hint: "Адрес электронной почты"
			},
			{
				id: "amount",
				label: "Сумма",
				hint: "Планируемая сумма сделки"
			},
			{
				id: "managerId",
				label: "Ответственный",
				hint: "Менеджер сделки"
			},
			{
				id: "organizationId",
				label: "Организация",
				hint: "Связанная компания"
			},
			{
				id: "expectedCloseAt",
				label: "Дата закрытия",
				hint: "Планируемое завершение"
			},
			{
				id: "nextContactAt",
				label: "Следующий контакт",
				hint: "Дата следующего обращения"
			}
		];
		const stageKind = (stage) => stage.isWon ? "won" : stage.isLost ? "lost" : "open";
		const kindLabel = (stage) => stage.isWon ? "Успешный" : stage.isLost ? "Проигранный" : "В работе";
		function fail(exception) {
			error.value = Array.isArray(exception?.data?.message) ? exception.data.message.join(", ") : exception?.data?.message || "Не удалось сохранить изменения. Повторите попытку.";
		}
		function resetDraft() {
			const item = selected.value;
			draft.value = item ? {
				name: item.name,
				isDefault: Boolean(item.isDefault),
				requiredFields: [...item.requiredFields || []],
				lostReasons: [...item.lostReasons || []]
			} : null;
			baseline.value = JSON.stringify(draft.value);
			stageDraft.value = null;
			stageBaseline.value = "";
			newReason.value = "";
			error.value = "";
			notice.value = "";
		}
		function allowDiscard() {
			return !saving.value && (!dirty.value || (void 0).confirm("Есть несохранённые изменения. Закрыть их без сохранения?"));
		}
		function close() {
			if (allowDiscard()) emit("update:modelValue", false);
		}
		useCatalogDialog(computed(() => props.modelValue), close);
		onBeforeRouteLeave(() => !props.modelValue || allowDiscard());
		async function load() {
			loading.value = true;
			error.value = "";
			try {
				pipelines.value = await $fetch$1("/crm/pipelines", {
					baseURL: config.public.apiBase,
					headers: headers.value
				});
				selectedId.value = pipelines.value.some((item) => item.id === props.currentId) ? props.currentId : pipelines.value[0]?.id || "";
				creating.value = false;
				newName.value = "";
				resetDraft();
				tab.value = "stages";
			} catch (exception) {
				fail(exception);
			} finally {
				loading.value = false;
			}
		}
		watch(() => props.modelValue, (value) => {
			if (value) load();
		}, { immediate: true });
		return (_ctx, _push, _parent, _attrs) => {
			const _component_WorkspaceLoading = WorkspaceLoading_default;
			ssrRenderTeleport(_push, (_push) => {
				if (__props.modelValue) {
					_push(`<div class="pipeline-settings-backdrop admin-dialog-backdrop crm-pipeline-backdrop"><section class="pipeline-settings admin-dialog admin-dialog--modal crm-pipeline-settings" role="dialog" aria-modal="true" aria-labelledby="pipeline-settings-title" tabindex="-1"><header class="crm-pipeline-header"><div><h2 id="pipeline-settings-title">Воронки продаж</h2><p>Настройте процесс работы со сделками</p></div><button class="crm-button crm-button--icon"${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""} aria-label="Закрыть настройки воронки">`);
					_push(ssrRenderComponent(unref(X), { size: 20 }, null, _parent));
					_push(`</button></header><div class="crm-pipeline-layout"><aside class="crm-pipeline-sidebar" aria-label="Выбор воронки"><div class="crm-pipeline-sidebar-heading"><strong>Ваши воронки</strong><span>${ssrInterpolate(unref(pipelines).length)}</span></div><select class="crm-input crm-pipeline-mobile-select"${ssrRenderAttr("value", unref(selectedId))}${ssrIncludeBooleanAttr(unref(saving) || unref(loading) || !unref(pipelines).length) ? " disabled" : ""} aria-label="Редактируемая воронка">`);
					if (!unref(pipelines).length) _push(`<option value="">Нет воронок</option>`);
					else _push(`<!---->`);
					_push(`<!--[-->`);
					ssrRenderList(unref(pipelines), (item) => {
						_push(`<option${ssrRenderAttr("value", item.id)}>${ssrInterpolate(item.name)}</option>`);
					});
					_push(`<!--]--></select><nav class="crm-pipeline-list" aria-label="Список воронок"><!--[-->`);
					ssrRenderList(unref(pipelines), (item) => {
						_push(`<button class="crm-button"${ssrRenderAttr("aria-pressed", item.id === unref(selectedId) && !unref(creating))}${ssrIncludeBooleanAttr(unref(saving) || unref(loading)) ? " disabled" : ""}><span><strong>${ssrInterpolate(item.name)}</strong><small>${ssrInterpolate(item.stages.length)} этапов`);
						if (item.isDefault) _push(`<!--[--> · Основная<!--]-->`);
						else _push(`<!---->`);
						_push(`</small></span>`);
						if (item.id === unref(selectedId) && !unref(creating)) _push(ssrRenderComponent(unref(Check), { size: 16 }, null, _parent));
						else _push(`<!---->`);
						_push(`</button>`);
					});
					_push(`<!--]--></nav><button class="crm-button crm-pipeline-create"${ssrIncludeBooleanAttr(unref(saving) || unref(loading)) ? " disabled" : ""}>`);
					_push(ssrRenderComponent(unref(Plus), { size: 18 }, null, _parent));
					_push(`<span>Новая воронка</span></button></aside><div class="crm-pipeline-workspace">`);
					if (unref(loading)) _push(ssrRenderComponent(_component_WorkspaceLoading, { label: "Загружаем воронки" }, null, _parent));
					else {
						_push(`<!--[-->`);
						if (unref(selected) && !unref(creating)) {
							_push(`<div class="crm-pipeline-current"><div><h3>${ssrInterpolate(unref(selected).name)}</h3><span>${ssrInterpolate(unref(selected).stages.length)} этапов`);
							if (unref(selected).isDefault) _push(`<!--[--> · Основная воронка<!--]-->`);
							else _push(`<!---->`);
							_push(`</span></div><button class="crm-button crm-button--text"${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""}>К сделкам `);
							_push(ssrRenderComponent(unref(ArrowUpRight), { size: 16 }, null, _parent));
							_push(`</button></div>`);
						} else _push(`<!---->`);
						if (unref(selected) && !unref(creating)) {
							_push(`<nav class="crm-pipeline-tabs" role="tablist" aria-label="Настройки воронки"><!--[-->`);
							ssrRenderList(tabs, (item) => {
								_push(`<button${ssrRenderAttr("id", "pipeline-tab-" + item.id)} class="crm-button" role="tab"${ssrRenderAttr("aria-selected", unref(tab) === item.id)}${ssrRenderAttr("tabindex", unref(tab) === item.id ? 0 : -1)}${ssrRenderAttr("aria-controls", "pipeline-panel-" + item.id)}>${ssrInterpolate(item.label)}</button>`);
							});
							_push(`<!--]--></nav>`);
						} else _push(`<!---->`);
						_push(`<div class="crm-pipeline-body">`);
						if (unref(error)) _push(`<p class="operation-error" role="alert">${ssrInterpolate(unref(error))}</p>`);
						else _push(`<!---->`);
						if (unref(creating)) _push(`<form id="pipeline-create-form" class="crm-pipeline-new-form"><h3>Новая воронка</h3><p>Отдельный процесс для отдела или направления продаж.</p><label>Название воронки<input id="pipeline-new-name" class="crm-input"${ssrRenderAttr("value", unref(newName))}${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""} required maxlength="120" placeholder="Например, Оптовые продажи"></label><p class="crm-pipeline-note">Добавим стандартные этапы. Их можно переименовать и настроить под вашу команду.</p></form>`);
						else if (unref(selected) && unref(draft)) {
							_push(`<!--[--><section id="pipeline-panel-stages" role="tabpanel" aria-labelledby="pipeline-tab-stages"${ssrRenderDynamicAttr("hidden", unref(tab) !== "stages")}><div class="crm-pipeline-section-heading"><div><h3>Этапы сделки</h3><p>От первого обращения до результата</p></div><button class="crm-button"${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""}>`);
							_push(ssrRenderComponent(unref(Plus), { size: 16 }, null, _parent));
							_push(` Добавить этап</button></div><p class="crm-pipeline-hint">Перетаскивайте этапы за ручку, чтобы изменить порядок.</p>`);
							if (unref(stageDraft)) {
								_push(`<form id="pipeline-stage-form" class="crm-pipeline-stage-editor"><div class="crm-pipeline-editor-heading"><h4>${ssrInterpolate(unref(stageDraft).id ? "Редактирование этапа" : "Новый этап")}</h4><button class="crm-button crm-button--icon" type="button"${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""} aria-label="Закрыть редактирование этапа">`);
								_push(ssrRenderComponent(unref(X), { size: 18 }, null, _parent));
								_push(`</button></div><fieldset class="ui-fieldset-reset crm-pipeline-stage-fields"${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""}><label class="crm-pipeline-stage-name">Название<input id="pipeline-stage-name" class="crm-input"${ssrRenderAttr("value", unref(stageDraft).name)} required maxlength="100" placeholder="Например, Согласование условий"></label><label class="crm-pipeline-color">Цвет<input${ssrRenderAttr("value", unref(stageDraft).color)} type="color"></label><label>Тип этапа<select class="crm-input" aria-label="Тип этапа"><option value="open"${ssrIncludeBooleanAttr(Array.isArray(unref(stageDraft).kind) ? ssrLooseContain(unref(stageDraft).kind, "open") : ssrLooseEqual(unref(stageDraft).kind, "open")) ? " selected" : ""}>В работе</option><option value="won"${ssrIncludeBooleanAttr(Array.isArray(unref(stageDraft).kind) ? ssrLooseContain(unref(stageDraft).kind, "won") : ssrLooseEqual(unref(stageDraft).kind, "won")) ? " selected" : ""}>Успешный</option><option value="lost"${ssrIncludeBooleanAttr(Array.isArray(unref(stageDraft).kind) ? ssrLooseContain(unref(stageDraft).kind, "lost") : ssrLooseEqual(unref(stageDraft).kind, "lost")) ? " selected" : ""}>Проигранный</option></select></label><label class="crm-pipeline-probability">Вероятность, %<input class="crm-input" aria-label="Вероятность, %"${ssrRenderAttr("value", unref(stageDraft).probability)} type="number" min="0" max="100" required></label></fieldset><p class="crm-pipeline-hint">${ssrInterpolate(unref(stageDraft).kind === "open" ? "Вероятность используется в прогнозе продаж." : unref(stageDraft).kind === "won" ? "При переходе на этот этап сделка считается выигранной." : "При переходе на этот этап сделка считается проигранной.")}</p>`);
								if (unref(stageDraft).id) {
									_push(`<div class="crm-pipeline-position"><span>Положение в списке</span><button class="crm-button crm-button--icon" type="button"${ssrIncludeBooleanAttr(unref(saving) || unref(selected).stages[0]?.id === unref(stageDraft).id) ? " disabled" : ""} aria-label="Поднять этап">`);
									_push(ssrRenderComponent(unref(ArrowUp), { size: 16 }, null, _parent));
									_push(`</button><button class="crm-button crm-button--icon" type="button"${ssrIncludeBooleanAttr(unref(saving) || unref(selected).stages[unref(selected).stages.length - 1]?.id === unref(stageDraft).id) ? " disabled" : ""} aria-label="Опустить этап">`);
									_push(ssrRenderComponent(unref(ArrowDown), { size: 16 }, null, _parent));
									_push(`</button></div>`);
								} else _push(`<!---->`);
								_push(`<div class="crm-pipeline-editor-actions">`);
								if (unref(stageDraft).id) {
									_push(`<button class="crm-button crm-button--danger crm-pipeline-delete" type="button"${ssrIncludeBooleanAttr(unref(saving) || unref(selected).stages.length <= 1) ? " disabled" : ""}>`);
									_push(ssrRenderComponent(unref(Trash2), { size: 16 }, null, _parent));
									_push(` Удалить</button>`);
								} else _push(`<!---->`);
								_push(`</div></form>`);
							} else _push(`<!---->`);
							_push(`<div class="crm-pipeline-stages"><!--[-->`);
							ssrRenderList(unref(selected).stages, (stage, index) => {
								_push(`<article class="${ssrRenderClass([{
									"is-dragging": unref(draggedStage) === stage.id,
									"is-editing": unref(stageDraft)?.id === stage.id
								}, "crm-pipeline-stage"])}"><button class="stage-drag-handle crm-button crm-button--icon"${ssrRenderAttr("draggable", !unref(saving))}${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""}${ssrRenderAttr("aria-label", "Переместить этап " + stage.name)} title="Перетащить; Alt + стрелка вверх или вниз">`);
								_push(ssrRenderComponent(unref(GripVertical), { size: 18 }, null, _parent));
								_push(`</button><button class="crm-button crm-pipeline-stage-open"${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""}${ssrRenderAttr("aria-label", "Настроить этап " + stage.name)}><span class="crm-pipeline-stage-dot" style="${ssrRenderStyle({ backgroundColor: stage.color })}"></span><span class="crm-pipeline-stage-description"><strong>${ssrInterpolate(stage.name)}</strong><span class="crm-pipeline-stage-kind"${ssrRenderAttr("data-kind", stageKind(stage))}>${ssrInterpolate(kindLabel(stage))}</span></span><span class="crm-pipeline-stage-chance" title="Вероятность успеха">${ssrInterpolate(stage.probability)}%</span>`);
								_push(ssrRenderComponent(unref(Pencil), { size: 16 }, null, _parent));
								_push(`</button></article>`);
							});
							_push(`<!--]--></div></section><section id="pipeline-panel-fields" role="tabpanel" aria-labelledby="pipeline-tab-fields"${ssrRenderDynamicAttr("hidden", unref(tab) !== "fields")}><div class="crm-pipeline-section-heading"><div><h3>Обязательные поля</h3><p>Без этих данных сотрудник не сможет сохранить сделку.</p></div></div><fieldset class="ui-fieldset-reset crm-pipeline-required-fields"${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""}><!--[-->`);
							ssrRenderList(fieldOptions, (field) => {
								_push(`<label class="${ssrRenderClass({ "is-required": unref(draft).requiredFields.includes(field.id) })}"><span><strong>${ssrInterpolate(field.label)}</strong><small>${ssrInterpolate(field.hint)}</small></span><input class="crm-check"${ssrIncludeBooleanAttr(Array.isArray(unref(draft).requiredFields) ? ssrLooseContain(unref(draft).requiredFields, field.id) : unref(draft).requiredFields) ? " checked" : ""} type="checkbox"${ssrRenderAttr("value", field.id)}${ssrRenderAttr("aria-label", field.label)}></label>`);
							});
							_push(`<!--]--></fieldset></section><section id="pipeline-panel-reasons" role="tabpanel" aria-labelledby="pipeline-tab-reasons"${ssrRenderDynamicAttr("hidden", unref(tab) !== "reasons")}><div class="crm-pipeline-section-heading"><div><h3>Почему сделка не состоялась</h3><p>Сотрудник выберет одну из причин при закрытии проигранной сделки.</p></div></div><div class="crm-pipeline-reasons"><!--[-->`);
							ssrRenderList(unref(draft).lostReasons, (reason, index) => {
								_push(`<div><span class="crm-pipeline-reason-number">${ssrInterpolate(index + 1)}</span><input class="crm-input"${ssrRenderAttr("value", unref(draft).lostReasons[index])}${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""}${ssrRenderAttr("aria-label", "Причина отказа " + (index + 1))}><button class="crm-button crm-button--icon"${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""}${ssrRenderAttr("aria-label", "Удалить причину " + reason)}>`);
								_push(ssrRenderComponent(unref(X), { size: 16 }, null, _parent));
								_push(`</button></div>`);
							});
							_push(`<!--]--></div>`);
							if (!unref(draft).lostReasons.length) _push(`<p class="crm-pipeline-note">Причины пока не заданы. При закрытии сделки выбор причины не потребуется.</p>`);
							else _push(`<!---->`);
							_push(`<form class="crm-pipeline-add-reason"><input class="crm-input"${ssrRenderAttr("value", unref(newReason))}${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""} aria-label="Новая причина отказа" placeholder="Например, Не подошёл ассортимент"><button class="crm-button"${ssrIncludeBooleanAttr(unref(saving) || !unref(newReason).trim()) ? " disabled" : ""} type="submit">`);
							_push(ssrRenderComponent(unref(Plus), { size: 16 }, null, _parent));
							_push(` Добавить</button></form></section><section id="pipeline-panel-settings" role="tabpanel" aria-labelledby="pipeline-tab-settings"${ssrRenderDynamicAttr("hidden", unref(tab) !== "settings")}><div class="crm-pipeline-section-heading"><div><h3>Общие настройки</h3><p>Название и назначение воронки</p></div></div><label>Название воронки<input class="crm-input"${ssrRenderAttr("value", unref(draft).name)}${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""} maxlength="120"></label><label class="crm-pipeline-default"><span><strong>Основная воронка</strong><small>Используется по умолчанию для новых сделок.</small></span><input class="crm-check"${ssrIncludeBooleanAttr(Array.isArray(unref(draft).isDefault) ? ssrLooseContain(unref(draft).isDefault, null) : unref(draft).isDefault) ? " checked" : ""}${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""} type="checkbox"></label><div class="crm-pipeline-archive"><div><h4>Архив воронки</h4><p>${ssrInterpolate(unref(selected).isDefault ? "Для архивации сначала назначьте другую основную воронку." : "Уберите воронку из активных. История сделок сохранится.")}</p></div><button class="crm-button crm-button--danger"${ssrIncludeBooleanAttr(unref(saving) || unref(selected).isDefault) ? " disabled" : ""}>`);
							_push(ssrRenderComponent(unref(Trash2), { size: 16 }, null, _parent));
							_push(` В архив</button></div></section><!--]-->`);
						} else {
							_push(`<div class="crm-pipeline-empty"><h3>${ssrInterpolate(unref(error) ? "Не удалось загрузить воронки" : "Создайте первую воронку")}</h3>`);
							if (!unref(error)) _push(`<p>Настройте этапы под процесс вашей команды.</p>`);
							else _push(`<!---->`);
							_push(`<button class="crm-button"${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""}>`);
							if (!unref(error)) _push(ssrRenderComponent(unref(Plus), { size: 18 }, null, _parent));
							else _push(`<!---->`);
							_push(`${ssrInterpolate(unref(error) ? "Повторить загрузку" : "Новая воронка")}</button></div>`);
						}
						_push(`</div><!--]-->`);
					}
					_push(`</div></div><footer class="crm-pipeline-footer"><span role="status">${ssrInterpolate(unref(saving) ? "Сохраняем…" : unref(dirty) ? "Есть несохранённые изменения" : unref(notice) || "Все изменения сохранены")}</span>`);
					if (unref(creating)) _push(`<!--[--><button class="crm-button"${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""}>Отмена</button><button class="crm-button crm-button--primary" type="submit" form="pipeline-create-form"${ssrIncludeBooleanAttr(unref(saving) || !unref(newName).trim()) ? " disabled" : ""}>Создать воронку</button><!--]-->`);
					else if (unref(stageDraft) && unref(tab) === "stages") _push(`<!--[--><button class="crm-button"${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""}>Отмена</button><button class="crm-button crm-button--primary" type="submit" form="pipeline-stage-form"${ssrIncludeBooleanAttr(unref(saving) || !!unref(stageDraft).id && !unref(stageDirty)) ? " disabled" : ""}>${ssrInterpolate(unref(stageDraft).id ? "Сохранить этап" : "Добавить этап")}</button><!--]-->`);
					else {
						_push(`<!--[-->`);
						if (unref(pipelineDirty) || unref(newReason).trim()) _push(`<button class="crm-button crm-button--primary"${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""}>Сохранить настройки</button>`);
						else _push(`<!---->`);
						_push(`<button class="crm-button"${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""}>Готово</button><!--]-->`);
					}
					_push(`</footer></section></div>`);
				} else _push(`<!---->`);
			}, "body", false, _parent);
		};
	}
});
// components/CrmPipelineSettings.vue
var _sfc_setup$1 = CrmPipelineSettings_vue_vue_type_script_setup_true_lang_default.setup;
CrmPipelineSettings_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/CrmPipelineSettings.vue");
	return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
var CrmPipelineSettings_default = Object.assign(CrmPipelineSettings_vue_vue_type_script_setup_true_lang_default, { __name: "CrmPipelineSettings" });
// pages/crm/deals.vue?vue&type=script&setup=true&lang.ts
var deals_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "deals",
	__ssrInlineRender: true,
	setup(__props) {
		useHead({ title: "Сделки — SARKISIAN CRM" });
		const config = useRuntimeConfig();
		const { token, user } = useWorkspaceSession();
		useContextMenu();
		const { can } = useWorkspaceAccess();
		const cardDrag = useCrmCardDrag(), pipeline = ref({ stages: [] }), pipelines = ref([]), activePipelineId = ref(""), settingsOpen = ref(false), team = ref([]), loading = ref(true), pageLoaded = ref(false), saving = ref(false), search = ref(""), selected = ref(null), createOpen = ref(false), notice = ref(""), error = ref("");
		ref("");
		const activityText = ref("");
		const cardTab = ref("general"), relatedBusy = ref(false), selectedBaseline = ref(""), createBaseline = ref("");
		const customerCandidates = ref([]);
		const createLostStage = computed(() => pipeline.value.stages.some((stage) => stage.id === draft.stageId && stage.isLost));
		const commentEntries = computed(() => (selected.value?.interactions || []).filter((entry) => !["CREATED", "STAGE_CHANGED"].includes(entry.type)).map((entry) => ({
			...entry,
			author: entry.user,
			body: entry.content
		})));
		const selectedDirty = computed(() => !!selected.value && JSON.stringify(selected.value) !== selectedBaseline.value);
		function canLeave() {
			return !saving.value && !relatedBusy.value && (!(selectedDirty.value || activityText.value.trim() || createOpen.value && JSON.stringify(draft) !== createBaseline.value) || (void 0).confirm("Есть несохранённые изменения. Закрыть без сохранения?"));
		}
		function closeLead() {
			if (canLeave()) {
				selected.value = null;
				activityText.value = "";
			}
		}
		useCatalogDialog(computed(() => !!selected.value), closeLead);
		onBeforeRouteLeave(canLeave);
		const draft = reactive({
			source: "MANUAL",
			contactName: "",
			contactPhone: "",
			contactEmail: "",
			title: "",
			amount: 0,
			managerId: "",
			stageId: "",
			expectedCloseAt: "",
			nextContactAt: "",
			tags: "",
			customerId: "",
			lostReason: ""
		});
		watch(() => [draft.contactPhone, draft.contactEmail], () => {
			customerCandidates.value = [];
			draft.customerId = "";
		});
		const headers = computed(() => ({ Authorization: `Bearer ${token.value}` }));
		const money = (v) => new Intl.NumberFormat("ru-RU", {
			style: "currency",
			currency: "RUB",
			maximumFractionDigits: 0
		}).format(Number(v || 0));
		const dealSavedView = ref("all");
		function matchesDealView(lead) {
			return dealSavedView.value === "mine" ? Boolean(user.value?.id) && lead.managerId === user.value?.id : dealSavedView.value === "no-contact" ? !lead.nextContactAt && !["WON", "LOST"].includes(lead.status) : true;
		}
		const dealCount = computed(() => filteredStages.value.reduce((sum, stage) => sum + stage.leads.length, 0));
		const filteredStages = computed(() => pipeline.value.stages.map((stage) => ({
			...stage,
			leads: stage.leads.filter((lead) => matchesDealView(lead)).filter((lead) => !search.value || `${lead.title} ${lead.contactName} ${lead.contactPhone} ${lead.organization?.name || ""}`.toLowerCase().includes(search.value.toLowerCase()))
		})));
		async function load() {
			loading.value = true;
			error.value = "";
			try {
				[pipelines.value, team.value] = await Promise.all([$fetch$1("/crm/pipelines", {
					baseURL: config.public.apiBase,
					headers: headers.value
				}), $fetch$1("/crm/team", {
					baseURL: config.public.apiBase,
					headers: headers.value
				})]);
				if (!pipelines.value.some((item) => item.id === activePipelineId.value)) activePipelineId.value = pipelines.value[0]?.id || "";
				pipeline.value = await $fetch$1("/crm/pipeline", {
					baseURL: config.public.apiBase,
					headers: headers.value,
					query: activePipelineId.value ? { pipelineId: activePipelineId.value } : {}
				});
			} catch (reason) {
				error.value = typeof reason?.data?.message === "string" ? reason.data.message : "Не удалось загрузить воронку. Повторите попытку.";
			} finally {
				loading.value = false;
				pageLoaded.value = true;
			}
		}
		async function switchPipeline() {
			await load();
			navigateTo({
				path: "/crm/deals",
				query: { pipeline: activePipelineId.value }
			}, { replace: true });
		}
		function flash(v) {
			notice.value = v;
			setTimeout(() => notice.value = "", 2400);
		}
		async function addActivity(type = "NOTE") {
			if (!can("crm.write") || !selected.value || !activityText.value.trim() || saving.value) return;
			saving.value = true;
			error.value = "";
			try {
				const interaction = await $fetch$1(`/crm/leads/${selected.value.id}/interactions`, {
					baseURL: config.public.apiBase,
					method: "POST",
					headers: headers.value,
					body: {
						type,
						content: activityText.value
					}
				});
				activityText.value = "";
				selected.value.interactions = [interaction, ...selected.value.interactions || []];
				const previous = JSON.parse(selectedBaseline.value);
				previous.interactions = selected.value.interactions;
				selectedBaseline.value = JSON.stringify(previous);
				flash("Действие добавлено");
			} catch (e) {
				error.value = e?.data?.message || "Не удалось отправить комментарий";
			} finally {
				saving.value = false;
			}
		}
		return (_ctx, _push, _parent, _attrs) => {
			const _component_WorkspaceLoading = WorkspaceLoading_default;
			const _component_CrmCardTabs = CrmCardTabs_default;
			const _component_CrmLeadTasks = CrmLeadTasks_default;
			const _component_CrmTaskFiles = CrmTaskFiles_default;
			const _component_CrmCardComments = CrmCardComments_default;
			const _component_CrmChangeHistory = CrmChangeHistory_default;
			const _component_CrmPipelineSettings = CrmPipelineSettings_default;
			_push(`<main${ssrRenderAttrs(mergeProps({
				"data-v-ui-c1ada31b5812": "",
				class: "pipeline-page crm-standard crm-operational-page crm-ops-deals"
			}, _attrs))}>`);
			if (unref(loading) && !unref(pageLoaded)) _push(ssrRenderComponent(_component_WorkspaceLoading, { label: "Загружаем воронку продаж" }, null, _parent));
			else {
				_push(`<!--[--><header data-v-ui-c1ada31b5812 class="page-head crm-page-header"><div data-v-ui-c1ada31b5812><h1 data-v-ui-c1ada31b5812>${ssrInterpolate(unref(pipeline).name || "Воронка продаж")}</h1><span data-v-ui-c1ada31b5812>Сделки, прогноз и история контактов в едином процессе</span></div><div data-v-ui-c1ada31b5812>`);
				if (unref(can)("crm.write")) {
					_push(`<button data-v-ui-c1ada31b5812 class="light crm-button">`);
					_push(ssrRenderComponent(unref(Settings2), {
						"data-v-ui-c1ada31b5812": "",
						size: 16
					}, null, _parent));
					_push(`Настроить </button>`);
				} else _push(`<!---->`);
				_push(`<button data-v-ui-c1ada31b5812 class="light crm-button crm-button--refresh">`);
				_push(ssrRenderComponent(unref(RefreshCw), {
					"data-v-ui-c1ada31b5812": "",
					size: 16
				}, null, _parent));
				_push(`Обновить</button>`);
				if (unref(can)("crm.write")) {
					_push(`<button class="crm-button crm-button--primary" data-v-ui-c1ada31b5812>`);
					_push(ssrRenderComponent(unref(Plus), {
						"data-v-ui-c1ada31b5812": "",
						size: 16
					}, null, _parent));
					_push(`Новая сделка </button>`);
				} else _push(`<!---->`);
				_push(`</div></header>`);
				if (unref(error)) _push(`<p data-v-ui-c1ada31b5812 class="operation-error" role="alert">${ssrInterpolate(unref(error))} <button class="crm-button"${ssrIncludeBooleanAttr(unref(loading)) ? " disabled" : ""}>Повторить загрузку</button></p>`);
				else _push(`<!---->`);
				if (unref(pipeline).requiresSetup) _push(`<section class="crm-surface crm-register crm-stack" role="status"><h2>Воронка ещё не создана</h2><p>${ssrInterpolate(unref(can)("crm.write") ? "Создайте первую сделку — появится основная воронка со стандартными этапами. Или добавьте свою в настройках." : "Сотрудник с правом настройки продаж должен создать воронку.")}</p></section>`);
				else _push(`<!---->`);
				_push(`<nav class="crm-ops-views" aria-label="Представления сделок"><button class="crm-button crm-button--quiet"${ssrRenderAttr("aria-pressed", unref(dealSavedView) === "all")}>Все сделки</button><button class="crm-button crm-button--quiet"${ssrRenderAttr("aria-pressed", unref(dealSavedView) === "mine")}>Мои сделки</button><button class="crm-button crm-button--quiet"${ssrRenderAttr("aria-pressed", unref(dealSavedView) === "no-contact")}>Без следующего контакта</button></nav><section data-v-ui-c1ada31b5812 class="toolbar crm-toolbar crm-filter-toolbar"><select class="crm-input" data-v-ui-c1ada31b5812${ssrIncludeBooleanAttr(!unref(pipelines).length) ? " disabled" : ""} aria-label="Воронка продаж">`);
				if (!unref(pipelines).length) _push(`<option value=""${ssrIncludeBooleanAttr(Array.isArray(unref(activePipelineId)) ? ssrLooseContain(unref(activePipelineId), "") : ssrLooseEqual(unref(activePipelineId), "")) ? " selected" : ""}>Нет активных воронок</option>`);
				else _push(`<!---->`);
				_push(`<!--[-->`);
				ssrRenderList(unref(pipelines), (item) => {
					_push(`<option data-v-ui-c1ada31b5812${ssrRenderAttr("value", item.id)}${ssrIncludeBooleanAttr(Array.isArray(unref(activePipelineId)) ? ssrLooseContain(unref(activePipelineId), item.id) : ssrLooseEqual(unref(activePipelineId), item.id)) ? " selected" : ""}>${ssrInterpolate(item.name)}</option>`);
				});
				_push(`<!--]--></select><label class="crm-input-group" data-v-ui-c1ada31b5812>`);
				_push(ssrRenderComponent(unref(Search), {
					"data-v-ui-c1ada31b5812": "",
					size: 16
				}, null, _parent));
				_push(`<input class="crm-input" data-v-ui-c1ada31b5812 id="pipeline-query" aria-label="Поиск сделок"${ssrRenderAttr("value", unref(search))} placeholder="Название, контакт, телефон или компания"></label><span data-v-ui-c1ada31b5812>${ssrInterpolate(unref(pipeline).stages.reduce((sum, s) => sum + s.leads.length, 0))} сделок</span><b data-v-ui-c1ada31b5812>${ssrInterpolate(money(unref(pipeline).stages.reduce((sum, s) => sum + s.leads.reduce((a, l) => a + Number(l.amount), 0), 0)))}</b></section>`);
				if (!unref(error)) {
					_push(`<div class="crm-ops-result"><span role="status">Найдено сделок: ${ssrInterpolate(unref(dealCount))}</span>`);
					if (unref(search) || unref(dealSavedView) !== "all") _push(`<button class="crm-button crm-button--text">Сбросить фильтры</button>`);
					else _push(`<!---->`);
					_push(`</div>`);
				} else _push(`<!---->`);
				if (!unref(error) && !unref(dealCount) && !unref(pipeline).requiresSetup) {
					_push(`<div class="crm-ops-empty">`);
					_push(ssrRenderComponent(unref(Search), { size: 28 }, null, _parent));
					_push(`<h2>${ssrInterpolate(unref(search) || unref(dealSavedView) !== "all" ? "Сделки не найдены" : "Начните с первой сделки")}</h2><p>${ssrInterpolate(unref(search) || unref(dealSavedView) !== "all" ? "Измените запрос или выберите другое представление." : "Добавьте клиента, сумму и следующий контакт — команда увидит движение по этапам.")}</p>`);
					if (unref(search) || unref(dealSavedView) !== "all") _push(`<button class="crm-button">Показать все сделки</button>`);
					else if (unref(can)("crm.write")) _push(`<button class="crm-button crm-button--primary">Создать сделку</button>`);
					else _push(`<!---->`);
					_push(`</div>`);
				} else _push(`<!---->`);
				_push(`<section data-v-ui-c1ada31b5812 class="board crm-board" style="${ssrRenderStyle(!unref(error) ? null : { display: "none" })}"><!--[-->`);
				ssrRenderList(unref(filteredStages), (stage) => {
					_push(`<article data-v-ui-c1ada31b5812${ssrRenderAttr("data-crm-drop", stage.id)} class="${ssrRenderClass([{ "is-drop-target": unref(cardDrag).over.value === stage.id }, "column crm-board-column crm-surface"])}"><header data-v-ui-c1ada31b5812><i data-v-ui-c1ada31b5812 style="${ssrRenderStyle({ background: stage.color })}"></i><div data-v-ui-c1ada31b5812><strong data-v-ui-c1ada31b5812>${ssrInterpolate(stage.name)}</strong><small data-v-ui-c1ada31b5812>${ssrInterpolate(stage.leads.length)} · ${ssrInterpolate(money(stage.leads.reduce((s, l) => s + Number(l.amount), 0)))}</small></div></header><div data-v-ui-c1ada31b5812 class="cards"><!--[-->`);
					ssrRenderList(stage.leads, (lead) => {
						_push(`<div data-v-ui-c1ada31b5812 class="deal crm-item-card crm-card-action"${ssrRenderAttr("draggable", !unref(saving) && unref(can)("crm.write"))}${ssrRenderAttr("data-crm-card", lead.id)} role="button" tabindex="0"><div data-v-ui-c1ada31b5812 class="deal-top"><em data-v-ui-c1ada31b5812>${ssrInterpolate(lead.source)}</em>`);
						_push(ssrRenderComponent(unref(MoreHorizontal), {
							"data-v-ui-c1ada31b5812": "",
							size: 16
						}, null, _parent));
						_push(`</div><h3 data-v-ui-c1ada31b5812>${ssrInterpolate(lead.title || lead.contactName)}</h3><p data-v-ui-c1ada31b5812>`);
						_push(ssrRenderComponent(unref(UserRound), {
							"data-v-ui-c1ada31b5812": "",
							size: 13
						}, null, _parent));
						_push(`${ssrInterpolate(lead.organization?.name || lead.contactName)}</p>`);
						if (lead.contactPhone) {
							_push(`<p data-v-ui-c1ada31b5812>`);
							_push(ssrRenderComponent(unref(Phone), {
								"data-v-ui-c1ada31b5812": "",
								size: 13
							}, null, _parent));
							_push(`${ssrInterpolate(lead.contactPhone)}</p>`);
						} else _push(`<!---->`);
						_push(`<footer data-v-ui-c1ada31b5812><b data-v-ui-c1ada31b5812>${ssrInterpolate(money(lead.amount))}</b><span data-v-ui-c1ada31b5812>${ssrInterpolate(lead.probability)}%</span></footer>`);
						if (lead.nextContactAt) {
							_push(`<small data-v-ui-c1ada31b5812 class="next">`);
							_push(ssrRenderComponent(unref(CalendarClock), {
								"data-v-ui-c1ada31b5812": "",
								size: 12
							}, null, _parent));
							_push(`Следующий контакт ${ssrInterpolate(new Date(lead.nextContactAt).toLocaleDateString("ru-RU"))}</small>`);
						} else _push(`<!---->`);
						_push(`</div>`);
					});
					_push(`<!--]-->`);
					if (unref(can)("crm.write")) {
						_push(`<button data-v-ui-c1ada31b5812 class="add-card crm-button">`);
						_push(ssrRenderComponent(unref(Plus), {
							"data-v-ui-c1ada31b5812": "",
							size: 14
						}, null, _parent));
						_push(`Добавить сделку </button>`);
					} else _push(`<!---->`);
					_push(`</div></article>`);
				});
				_push(`<!--]--></section><!--]-->`);
			}
			if (unref(selected)) {
				_push(`<aside data-v-ui-c1ada31b5812 class="backdrop admin-dialog-backdrop crm-detail-backdrop"><div data-v-ui-c1ada31b5812 tabindex="-1" role="dialog" aria-modal="true" aria-label="Карточка сделки" class="drawer admin-dialog admin-dialog--drawer crm-detail-card"><header data-v-ui-c1ada31b5812><div data-v-ui-c1ada31b5812><p data-v-ui-c1ada31b5812>КАРТОЧКА СДЕЛКИ</p><h2 data-v-ui-c1ada31b5812>${ssrInterpolate(unref(selected).title || unref(selected).contactName)}</h2></div><button class="crm-button crm-button--icon" data-v-ui-c1ada31b5812 aria-label="Закрыть сделку">`);
				_push(ssrRenderComponent(unref(X), {
					"data-v-ui-c1ada31b5812": "",
					size: 18
				}, null, _parent));
				_push(`</button></header>`);
				_push(ssrRenderComponent(_component_CrmCardTabs, {
					modelValue: unref(cardTab),
					"onUpdate:modelValue": ($event) => isRef(cardTab) ? cardTab.value = $event : null,
					prefix: "lead"
				}, null, _parent));
				_push(`<div data-v-ui-c1ada31b5812 class="drawer-body admin-dialog-body crm-detail-body">`);
				if (unref(error)) _push(`<p class="crm-work-error" role="alert">${ssrInterpolate(unref(error))}</p>`);
				else _push(`<!---->`);
				if (unref(selectedDirty)) _push(`<p class="crm-muted">Есть несохранённые изменения</p>`);
				else _push(`<!---->`);
				_push(`<section id="lead-general-panel" role="tabpanel" aria-labelledby="lead-general-tab" class="crm-detail-general" style="${ssrRenderStyle(unref(cardTab) === "general" ? null : { display: "none" })}"><div data-v-ui-c1ada31b5812 class="fields two"><label class="crm-field" data-v-ui-c1ada31b5812>Название<input${ssrIncludeBooleanAttr(!unref(can)("crm.write")) ? " readonly" : ""} class="crm-input" data-v-ui-c1ada31b5812${ssrRenderAttr("value", unref(selected).title)}></label><label class="crm-field" data-v-ui-c1ada31b5812>Этап<select${ssrIncludeBooleanAttr(!unref(can)("crm.write")) ? " disabled" : ""} class="crm-input" data-v-ui-c1ada31b5812><!--[-->`);
				ssrRenderList(unref(pipeline).stages, (s) => {
					_push(`<option data-v-ui-c1ada31b5812${ssrRenderAttr("value", s.id)}${ssrIncludeBooleanAttr(Array.isArray(unref(selected).stageId) ? ssrLooseContain(unref(selected).stageId, s.id) : ssrLooseEqual(unref(selected).stageId, s.id)) ? " selected" : ""}>${ssrInterpolate(s.name)}</option>`);
				});
				_push(`<!--]--></select></label><label class="crm-field" data-v-ui-c1ada31b5812>Контакт<input${ssrIncludeBooleanAttr(!unref(can)("crm.write")) ? " readonly" : ""} class="crm-input" data-v-ui-c1ada31b5812${ssrRenderAttr("value", unref(selected).contactName)}></label><label class="crm-field" data-v-ui-c1ada31b5812>Телефон<input${ssrIncludeBooleanAttr(!unref(can)("crm.write")) ? " readonly" : ""} class="crm-input" data-v-ui-c1ada31b5812${ssrRenderAttr("value", unref(selected).contactPhone)}></label><label class="crm-field" data-v-ui-c1ada31b5812>Email<input class="crm-input" data-v-ui-c1ada31b5812${ssrIncludeBooleanAttr(!unref(can)("crm.write")) ? " readonly" : ""}${ssrRenderAttr("value", unref(selected).contactEmail)} type="email"></label><label class="crm-field" data-v-ui-c1ada31b5812>Ответственный<select${ssrIncludeBooleanAttr(!unref(can)("crm.write")) ? " disabled" : ""} class="crm-input" data-v-ui-c1ada31b5812><option data-v-ui-c1ada31b5812 value=""${ssrIncludeBooleanAttr(Array.isArray(unref(selected).managerId) ? ssrLooseContain(unref(selected).managerId, "") : ssrLooseEqual(unref(selected).managerId, "")) ? " selected" : ""}>Не назначен</option><!--[-->`);
				ssrRenderList(unref(team), (u) => {
					_push(`<option data-v-ui-c1ada31b5812${ssrRenderAttr("value", u.id)}${ssrIncludeBooleanAttr(Array.isArray(unref(selected).managerId) ? ssrLooseContain(unref(selected).managerId, u.id) : ssrLooseEqual(unref(selected).managerId, u.id)) ? " selected" : ""}>${ssrInterpolate([u.firstName, u.lastName].filter(Boolean).join(" ") || u.email)}</option>`);
				});
				_push(`<!--]--></select></label><label class="crm-field" data-v-ui-c1ada31b5812>Сумма, ₽<input class="crm-input" data-v-ui-c1ada31b5812${ssrIncludeBooleanAttr(!unref(can)("crm.write")) ? " readonly" : ""}${ssrRenderAttr("value", unref(selected).amount)} type="number" min="0"></label><label class="crm-field" data-v-ui-c1ada31b5812>Вероятность, %<input class="crm-input" data-v-ui-c1ada31b5812${ssrIncludeBooleanAttr(!unref(can)("crm.write")) ? " readonly" : ""}${ssrRenderAttr("value", unref(selected).probability)} type="number" min="0" max="100"></label><label class="crm-field" data-v-ui-c1ada31b5812>План закрытия<input class="crm-input" data-v-ui-c1ada31b5812${ssrIncludeBooleanAttr(!unref(can)("crm.write")) ? " readonly" : ""}${ssrRenderAttr("value", unref(selected).expectedCloseAt)} type="date"></label><label class="crm-field" data-v-ui-c1ada31b5812>Следующий контакт<input class="crm-input" data-v-ui-c1ada31b5812${ssrIncludeBooleanAttr(!unref(can)("crm.write")) ? " readonly" : ""}${ssrRenderAttr("value", unref(selected).nextContactAt)} type="datetime-local"></label><label data-v-ui-c1ada31b5812 class="wide crm-field">Причина проигрыша`);
				if (unref(pipeline).lostReasons?.length) {
					_push(`<select class="crm-input" data-v-ui-c1ada31b5812${ssrIncludeBooleanAttr(!unref(can)("crm.write")) ? " disabled" : ""}><option data-v-ui-c1ada31b5812 value=""${ssrIncludeBooleanAttr(Array.isArray(unref(selected).lostReason) ? ssrLooseContain(unref(selected).lostReason, "") : ssrLooseEqual(unref(selected).lostReason, "")) ? " selected" : ""}>Не выбрана</option><!--[-->`);
					ssrRenderList(unref(pipeline).lostReasons, (reason) => {
						_push(`<option data-v-ui-c1ada31b5812${ssrRenderAttr("value", reason)}${ssrIncludeBooleanAttr(Array.isArray(unref(selected).lostReason) ? ssrLooseContain(unref(selected).lostReason, reason) : ssrLooseEqual(unref(selected).lostReason, reason)) ? " selected" : ""}>${ssrInterpolate(reason)}</option>`);
					});
					_push(`<!--]--></select>`);
				} else _push(`<input${ssrIncludeBooleanAttr(!unref(can)("crm.write")) ? " readonly" : ""} class="crm-input" data-v-ui-c1ada31b5812${ssrRenderAttr("value", unref(selected).lostReason)}>`);
				_push(`</label></div></section><section id="lead-subtasks-panel" role="tabpanel" aria-labelledby="lead-subtasks-tab" style="${ssrRenderStyle(unref(cardTab) === "subtasks" ? null : { display: "none" })}">`);
				_push(ssrRenderComponent(_component_CrmLeadTasks, {
					key: unref(selected).id,
					"lead-id": unref(selected).id,
					"manager-id": unref(selected).managerId,
					team: unref(team),
					onBusy: ($event) => relatedBusy.value = $event
				}, null, _parent));
				_push(`</section><section id="lead-files-panel" role="tabpanel" aria-labelledby="lead-files-tab" style="${ssrRenderStyle(unref(cardTab) === "files" ? null : { display: "none" })}">`);
				_push(ssrRenderComponent(_component_CrmTaskFiles, {
					key: unref(selected).id,
					"lead-id": unref(selected).id,
					onBusy: ($event) => relatedBusy.value = $event
				}, null, _parent));
				_push(`</section><section id="lead-comments-panel" role="tabpanel" aria-labelledby="lead-comments-tab" style="${ssrRenderStyle(unref(cardTab) === "comments" ? null : { display: "none" })}">`);
				_push(ssrRenderComponent(_component_CrmCardComments, {
					modelValue: unref(activityText),
					"onUpdate:modelValue": ($event) => isRef(activityText) ? activityText.value = $event : null,
					entries: unref(commentEntries),
					total: unref(commentEntries).length,
					busy: unref(saving),
					writable: unref(can)("crm.write"),
					onSend: ($event) => addActivity("NOTE")
				}, null, _parent));
				_push(`</section>`);
				if (unref(cardTab) === "history") {
					_push(`<section id="lead-history-panel" role="tabpanel" aria-labelledby="lead-history-tab">`);
					_push(ssrRenderComponent(_component_CrmChangeHistory, {
						kind: "leads",
						"entity-id": unref(selected).id,
						team: unref(team),
						stages: unref(pipeline).stages
					}, null, _parent));
					_push(`</section>`);
				} else _push(`<!---->`);
				_push(`</div><footer class="crm-detail-footer"><button type="button" class="crm-button"${ssrIncludeBooleanAttr(unref(saving) || unref(relatedBusy)) ? " disabled" : ""}>Отмена</button>`);
				if (unref(can)("crm.write")) _push(`<button type="button" class="crm-button crm-button--primary"${ssrIncludeBooleanAttr(unref(saving) || unref(relatedBusy) || !unref(selectedDirty)) ? " disabled" : ""}>${ssrInterpolate(unref(saving) ? "Сохраняем…" : "Сохранить изменения")}</button>`);
				else _push(`<!---->`);
				_push(`</footer></div></aside>`);
			} else _push(`<!---->`);
			if (unref(createOpen)) {
				_push(`<div data-v-ui-c1ada31b5812 class="backdrop admin-dialog-backdrop crm-detail-backdrop"><form data-v-ui-c1ada31b5812 class="drawer create admin-dialog admin-dialog--drawer crm-detail-card"><header data-v-ui-c1ada31b5812><div data-v-ui-c1ada31b5812><p data-v-ui-c1ada31b5812>НОВАЯ ВОЗМОЖНОСТЬ</p><h2 data-v-ui-c1ada31b5812>Создать сделку</h2></div><button class="crm-button crm-button--icon" data-v-ui-c1ada31b5812 aria-label="Закрыть создание сделки" type="button">`);
				_push(ssrRenderComponent(unref(X), {
					"data-v-ui-c1ada31b5812": "",
					size: 18
				}, null, _parent));
				_push(`</button></header><div data-v-ui-c1ada31b5812 class="drawer-body fields admin-dialog-body crm-detail-body"><label class="crm-field" data-v-ui-c1ada31b5812>Название сделки<input class="crm-input" data-v-ui-c1ada31b5812${ssrRenderAttr("value", unref(draft).title)} placeholder="Например, стартовый набор для салона"></label><label class="crm-field" data-v-ui-c1ada31b5812>Контактное лицо<input class="crm-input" data-v-ui-c1ada31b5812${ssrRenderAttr("value", unref(draft).contactName)} required></label><div data-v-ui-c1ada31b5812 class="two"><label class="crm-field" data-v-ui-c1ada31b5812>Телефон<input class="crm-input" data-v-ui-c1ada31b5812${ssrRenderAttr("value", unref(draft).contactPhone)}${ssrIncludeBooleanAttr(unref(pipeline).requiresSetup || unref(pipeline).requiredFields?.includes("contactPhone")) ? " required" : ""}></label><label class="crm-field" data-v-ui-c1ada31b5812>Email<input class="crm-input" data-v-ui-c1ada31b5812${ssrRenderAttr("value", unref(draft).contactEmail)} type="email"></label></div>`);
				if (unref(customerCandidates).length) {
					_push(`<label class="crm-field" data-v-ui-c1ada31b5812>Клиент для сделки <select class="crm-input" data-v-ui-c1ada31b5812 required><option value="" disabled${ssrIncludeBooleanAttr(Array.isArray(unref(draft).customerId) ? ssrLooseContain(unref(draft).customerId, "") : ssrLooseEqual(unref(draft).customerId, "")) ? " selected" : ""}>Выберите клиента из совпадений</option><!--[-->`);
					ssrRenderList(unref(customerCandidates), (customer) => {
						_push(`<option${ssrRenderAttr("value", customer.id)}${ssrIncludeBooleanAttr(Array.isArray(unref(draft).customerId) ? ssrLooseContain(unref(draft).customerId, customer.id) : ssrLooseEqual(unref(draft).customerId, customer.id)) ? " selected" : ""}>${ssrInterpolate([customer.firstName, customer.lastName].filter(Boolean).join(" ") || "Без имени")} · ${ssrInterpolate(customer.email || customer.phone || "Без контактов")}</option>`);
					});
					_push(`<!--]--></select><small>Показаны до 10 совпадений. Если нужного клиента нет, уточните телефон или email.</small></label>`);
				} else _push(`<!---->`);
				_push(`<div data-v-ui-c1ada31b5812 class="two"><label class="crm-field" data-v-ui-c1ada31b5812>Этап<select class="crm-input" data-v-ui-c1ada31b5812>`);
				if (!unref(pipeline).stages.length) _push(`<option value=""${ssrIncludeBooleanAttr(Array.isArray(unref(draft).stageId) ? ssrLooseContain(unref(draft).stageId, "") : ssrLooseEqual(unref(draft).stageId, "")) ? " selected" : ""}>Первый этап основной воронки</option>`);
				else _push(`<!---->`);
				_push(`<!--[-->`);
				ssrRenderList(unref(pipeline).stages, (s) => {
					_push(`<option data-v-ui-c1ada31b5812${ssrRenderAttr("value", s.id)}${ssrIncludeBooleanAttr(Array.isArray(unref(draft).stageId) ? ssrLooseContain(unref(draft).stageId, s.id) : ssrLooseEqual(unref(draft).stageId, s.id)) ? " selected" : ""}>${ssrInterpolate(s.name)}</option>`);
				});
				_push(`<!--]--></select></label><label class="crm-field" data-v-ui-c1ada31b5812>Ответственный<select class="crm-input" data-v-ui-c1ada31b5812><option data-v-ui-c1ada31b5812 value=""${ssrIncludeBooleanAttr(Array.isArray(unref(draft).managerId) ? ssrLooseContain(unref(draft).managerId, "") : ssrLooseEqual(unref(draft).managerId, "")) ? " selected" : ""}>Я</option><!--[-->`);
				ssrRenderList(unref(team), (u) => {
					_push(`<option data-v-ui-c1ada31b5812${ssrRenderAttr("value", u.id)}${ssrIncludeBooleanAttr(Array.isArray(unref(draft).managerId) ? ssrLooseContain(unref(draft).managerId, u.id) : ssrLooseEqual(unref(draft).managerId, u.id)) ? " selected" : ""}>${ssrInterpolate([u.firstName, u.lastName].filter(Boolean).join(" ") || u.email)}</option>`);
				});
				_push(`<!--]--></select></label></div>`);
				if (unref(createLostStage)) {
					_push(`<label class="crm-field" data-v-ui-c1ada31b5812>Причина отказа `);
					if (unref(pipeline).lostReasons?.length) {
						_push(`<select class="crm-input" data-v-ui-c1ada31b5812 required><option value="" disabled${ssrIncludeBooleanAttr(Array.isArray(unref(draft).lostReason) ? ssrLooseContain(unref(draft).lostReason, "") : ssrLooseEqual(unref(draft).lostReason, "")) ? " selected" : ""}>Выберите причину</option><!--[-->`);
						ssrRenderList(unref(pipeline).lostReasons, (reason) => {
							_push(`<option${ssrRenderAttr("value", reason)}${ssrIncludeBooleanAttr(Array.isArray(unref(draft).lostReason) ? ssrLooseContain(unref(draft).lostReason, reason) : ssrLooseEqual(unref(draft).lostReason, reason)) ? " selected" : ""}>${ssrInterpolate(reason)}</option>`);
						});
						_push(`<!--]--></select>`);
					} else _push(`<input class="crm-input" data-v-ui-c1ada31b5812${ssrRenderAttr("value", unref(draft).lostReason)}>`);
					_push(`</label>`);
				} else _push(`<!---->`);
				_push(`<div data-v-ui-c1ada31b5812 class="two"><label class="crm-field" data-v-ui-c1ada31b5812>Сумма, ₽<input class="crm-input" data-v-ui-c1ada31b5812${ssrRenderAttr("value", unref(draft).amount)} type="number" min="0"></label><label class="crm-field" data-v-ui-c1ada31b5812>План закрытия<input class="crm-input" data-v-ui-c1ada31b5812${ssrRenderAttr("value", unref(draft).expectedCloseAt)} type="date"></label></div><label class="crm-field" data-v-ui-c1ada31b5812>Теги<input class="crm-input" data-v-ui-c1ada31b5812${ssrRenderAttr("value", unref(draft).tags)} placeholder="B2B, тёплый лид"></label>`);
				if (unref(error)) _push(`<p data-v-ui-c1ada31b5812 class="error">${ssrInterpolate(unref(error))}</p>`);
				else _push(`<!---->`);
				_push(`</div><footer data-v-ui-c1ada31b5812 class="crm-detail-footer"><button data-v-ui-c1ada31b5812 type="button" class="light crm-button"> Отмена</button><button class="crm-button" data-v-ui-c1ada31b5812${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""}>${ssrInterpolate(unref(saving) ? "Создаём…" : "Создать сделку")}</button></footer></form></div>`);
			} else _push(`<!---->`);
			_push(ssrRenderComponent(_component_CrmPipelineSettings, {
				modelValue: unref(settingsOpen),
				"onUpdate:modelValue": ($event) => isRef(settingsOpen) ? settingsOpen.value = $event : null,
				"current-id": unref(activePipelineId),
				onChanged: load,
				onSelect: (id) => {
					activePipelineId.value = id;
					switchPipeline();
				}
			}, null, _parent));
			if (unref(notice)) _push(`<div data-v-ui-c1ada31b5812 class="toast">${ssrInterpolate(unref(notice))}</div>`);
			else _push(`<!---->`);
			_push(`</main>`);
		};
	}
});
// pages/crm/deals.vue
var _sfc_setup = deals_vue_vue_type_script_setup_true_lang_default.setup;
deals_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/crm/deals.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var deals_default = deals_vue_vue_type_script_setup_true_lang_default;

export { deals_default as default };;globalThis.__timing__.logEnd('Load chunks/build/deals-Bw4IBnjT');
//# sourceMappingURL=deals-Bw4IBnjT.mjs.map
