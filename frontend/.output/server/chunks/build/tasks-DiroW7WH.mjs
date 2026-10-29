globalThis.__timing__.logStart('Load chunks/build/tasks-DiroW7WH');import { u as useHead, c as useRoute, G as useRouter, a as useWorkspaceSession, b as useWorkspaceAccess, $ as $fetch$1, W as WorkspaceLoading_default, f as useRuntimeConfig } from '../virtual/entry.mjs';
import { u as useCatalogDialog } from './useCatalogDialog-2pnsnnsL.mjs';
import { u as useContextMenu } from './useContextMenu-CQeSn2KJ.mjs';
import { C as CrmCardTabs_default } from './CrmCardTabs-CwDu8QcL.mjs';
import { u as useCrmDrive } from './CrmFilePreview-D4bnqJky.mjs';
import { u as useCrmCardDrag, C as CrmTaskFiles_default } from './useCrmCardDrag-DCjeNwkh.mjs';
import { b as CrmSubtasks_default, C as CrmCardComments_default, a as CrmChangeHistory_default, c as CrmTaskPeoplePicker_default } from './CrmChangeHistory-ha9Jk_jf.mjs';
import { defineComponent, ref, computed, reactive, watch, mergeProps, unref, createVNode, resolveDynamicComponent, isRef, withCtx, openBlock, createBlock, toDisplayString, createCommentVNode, useSSRContext } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import { ssrRenderAttrs, ssrInterpolate, ssrIncludeBooleanAttr, ssrRenderComponent, ssrRenderList, ssrRenderAttr, ssrRenderClass, ssrRenderVNode, ssrRenderStyle, ssrLooseContain, ssrLooseEqual, ssrRenderTeleport } from 'vue/server-renderer';
import { Sparkles, RefreshCw, Plus, Search, LayoutGrid, GanttChartSquare, CalendarDays, List, ListChecks, Clock3, MessageSquare, UsersRound, ChevronLeft, ChevronRight, X, CornerDownRight, Trash2, UserPlus, Play, Save, AlarmClock, CheckCircle2 } from '@lucide/vue';
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

function crmTaskDraft(task) {
  const copy = JSON.parse(JSON.stringify(task));
  copy.status = copy.workflowStatus || copy.status;
  for (const field of ["startDate", "dueDate"]) copy[field] = copy[field] ? String(copy[field]).slice(0, 10) : "";
  return copy;
}

// components/CrmTaskParticipants.vue?vue&type=script&setup=true&lang.ts
var CrmTaskParticipants_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "CrmTaskParticipants",
	__ssrInlineRender: true,
	props: {
		modelValue: {},
		taskId: {},
		writable: { type: Boolean },
		disabled: { type: Boolean }
	},
	emits: ["update:modelValue", "busy"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const { request, message } = useCrmDrive();
		const choosing = ref(false), busy = ref(false), error = ref("");
		const person = (u) => [u?.firstName, u?.lastName].filter(Boolean).join(" ") || u?.email || "Сотрудник";
		async function change(user, remove = false) {
			if (busy.value || props.disabled) return;
			busy.value = true;
			emit("busy", true);
			error.value = "";
			try {
				const rows = props.taskId ? await request(`tasks/${props.taskId}/participants${remove ? "/" + user.id : ""}`, {
					method: remove ? "DELETE" : "POST",
					...!remove ? { body: { userId: user.id } } : {}
				}) : remove ? props.modelValue.filter((row) => row.userId !== user.id) : [...props.modelValue, {
					userId: user.id,
					user
				}];
				emit("update:modelValue", rows);
				choosing.value = false;
			} catch (e) {
				error.value = message(e);
			} finally {
				busy.value = false;
				emit("busy", false);
			}
		}
		return (_ctx, _push, _parent, _attrs) => {
			const _component_CrmTaskPeoplePicker = CrmTaskPeoplePicker_default;
			_push(`<section${ssrRenderAttrs(mergeProps({ class: "crm-task-participants" }, _attrs))}><header><h3 class="crm-icon-heading">`);
			_push(ssrRenderComponent(unref(UsersRound), { size: 18 }, null, _parent));
			_push(`<span>Участники <small>${ssrInterpolate(__props.modelValue.length)}</small></span></h3>`);
			if (__props.writable) {
				_push(`<button type="button" class="crm-button"${ssrIncludeBooleanAttr(unref(busy) || __props.disabled || __props.modelValue.length >= 30) ? " disabled" : ""}>`);
				_push(ssrRenderComponent(unref(UserPlus), { size: 16 }, null, _parent));
				_push(`Добавить</button>`);
			} else _push(`<!---->`);
			_push(`</header><p class="crm-muted">Помогают выполнить задачу и получают уведомления о новых комментариях.</p>`);
			if (unref(error)) _push(`<p class="crm-work-error" role="alert">${ssrInterpolate(unref(error))}</p>`);
			else _push(`<!---->`);
			if (__props.modelValue.length) {
				_push(`<div class="crm-task-participant-list"><!--[-->`);
				ssrRenderList(__props.modelValue, (row) => {
					_push(`<div class="crm-task-participant"><span class="crm-avatar">${ssrInterpolate(person(row.user).slice(0, 1))}</span><span>${ssrInterpolate(person(row.user))}</span>`);
					if (__props.writable) {
						_push(`<button type="button" class="crm-button crm-button--icon"${ssrIncludeBooleanAttr(unref(busy) || __props.disabled) ? " disabled" : ""}${ssrRenderAttr("aria-label", "Удалить участника " + person(row.user))}>`);
						_push(ssrRenderComponent(unref(X), { size: 15 }, null, _parent));
						_push(`</button>`);
					} else _push(`<!---->`);
					_push(`</div>`);
				});
				_push(`<!--]--></div>`);
			} else _push(`<!---->`);
			if (unref(choosing) && __props.writable) _push(ssrRenderComponent(_component_CrmTaskPeoplePicker, {
				"task-id": __props.taskId,
				exclude: __props.modelValue.map((row) => row.userId),
				disabled: unref(busy) || __props.disabled,
				onSelect: ($event) => change($event),
				onClose: ($event) => choosing.value = false
			}, null, _parent));
			else _push(`<!---->`);
			_push(`</section>`);
		};
	}
});
// components/CrmTaskParticipants.vue
var _sfc_setup$3 = CrmTaskParticipants_vue_vue_type_script_setup_true_lang_default.setup;
CrmTaskParticipants_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/CrmTaskParticipants.vue");
	return _sfc_setup$3 ? _sfc_setup$3(props, ctx) : void 0;
};
var CrmTaskParticipants_default = Object.assign(CrmTaskParticipants_vue_vue_type_script_setup_true_lang_default, { __name: "CrmTaskParticipants" });
// components/CrmTaskAutomation.vue?vue&type=script&setup=true&lang.ts
var CrmTaskAutomation_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "CrmTaskAutomation",
	__ssrInlineRender: true,
	props: {
		modelValue: { type: Boolean },
		pipelineId: {}
	},
	emits: ["update:modelValue", "created"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const config = useRuntimeConfig();
		const { token } = useWorkspaceSession();
		const templates = ref([]), reminders = ref([]), team = ref([]);
		const tab = ref("templates"), saving = ref(false), loading = ref(false), error = ref("");
		const draft = reactive({
			name: "",
			title: "",
			description: "",
			priority: "MEDIUM",
			labels: "",
			estimateMinutes: 60,
			dueInHours: 24,
			reminderBeforeMin: 60,
			defaultAssigneeId: ""
		});
		const headers = computed(() => ({ Authorization: `Bearer ${token.value}` }));
		const priorityLabels = {
			LOW: "Низкий",
			MEDIUM: "Обычный",
			HIGH: "Высокий",
			CRITICAL: "Критичный"
		};
		function person(user) {
			return [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email || "Не назначен";
		}
		async function load() {
			loading.value = true;
			error.value = "";
			try {
				[templates.value, reminders.value, team.value] = await Promise.all([
					$fetch$1("/crm/task-templates", {
						baseURL: config.public.apiBase,
						headers: headers.value
					}),
					$fetch$1("/crm/reminders", {
						baseURL: config.public.apiBase,
						headers: headers.value
					}),
					$fetch$1("/crm/team", {
						baseURL: config.public.apiBase,
						headers: headers.value
					})
				]);
			} catch (reason) {
				error.value = reason?.data?.message || "Не удалось загрузить шаблоны и напоминания. Повторите попытку.";
			} finally {
				loading.value = false;
			}
		}
		function closeAutomation() {
			if (saving.value) return;
			if ((draft.name || draft.title || draft.description) && !(void 0).confirm("Закрыть настройки без сохранения шаблона?")) return;
			emit("update:modelValue", false);
		}
		useCatalogDialog(computed(() => props.modelValue), closeAutomation);
		watch(() => props.modelValue, (value) => {
			if (value) load();
		}, { immediate: true });
		return (_ctx, _push, _parent, _attrs) => {
			const _component_WorkspaceLoading = WorkspaceLoading_default;
			ssrRenderTeleport(_push, (_push) => {
				if (__props.modelValue) {
					_push(`<div data-v-ui-bd6e1294cf28 class="automation-backdrop admin-dialog-backdrop"><section data-v-ui-bd6e1294cf28 role="dialog" aria-modal="true" aria-labelledby="task-automation-title" tabindex="-1" class="automation admin-dialog admin-dialog--drawer"><header data-v-ui-bd6e1294cf28><div data-v-ui-bd6e1294cf28><p data-v-ui-bd6e1294cf28>CRM / АВТОМАТИЗАЦИЯ</p><h2 id="task-automation-title" data-v-ui-bd6e1294cf28>Шаблоны и напоминания</h2><span data-v-ui-bd6e1294cf28>Повторяемые сценарии работы команды</span></div><button class="crm-button crm-button--icon" aria-label="Закрыть настройки задач"${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""} data-v-ui-bd6e1294cf28>`);
					_push(ssrRenderComponent(unref(X), {
						"data-v-ui-bd6e1294cf28": "",
						size: 18
					}, null, _parent));
					_push(`</button></header>`);
					if (unref(error)) _push(`<p class="operation-error" role="alert">${ssrInterpolate(unref(error))}<button class="crm-button"${ssrIncludeBooleanAttr(unref(loading)) ? " disabled" : ""}>Повторить</button></p>`);
					else _push(`<!---->`);
					if (unref(loading)) _push(ssrRenderComponent(_component_WorkspaceLoading, { label: "Загружаем шаблоны и напоминания" }, null, _parent));
					else _push(`<!---->`);
					_push(`<nav data-v-ui-bd6e1294cf28><button data-v-ui-bd6e1294cf28 class="${ssrRenderClass([{ active: unref(tab) === "templates" }, "crm-button"])}"${ssrRenderAttr("aria-pressed", unref(tab) === "templates")}>Шаблоны задач <em data-v-ui-bd6e1294cf28>${ssrInterpolate(unref(templates).length)}</em></button><button data-v-ui-bd6e1294cf28 class="${ssrRenderClass([{ active: unref(tab) === "reminders" }, "crm-button"])}"${ssrRenderAttr("aria-pressed", unref(tab) === "reminders")}>Активные напоминания <em data-v-ui-bd6e1294cf28>${ssrInterpolate(unref(reminders).length)}</em></button></nav>`);
					if (unref(tab) === "templates") {
						_push(`<main class="crm-standard" data-v-ui-bd6e1294cf28><section data-v-ui-bd6e1294cf28 class="template-list"><!--[-->`);
						ssrRenderList(unref(templates), (item) => {
							_push(`<article data-v-ui-bd6e1294cf28><i data-v-ui-bd6e1294cf28>`);
							_push(ssrRenderComponent(unref(Clock3), {
								"data-v-ui-bd6e1294cf28": "",
								size: 17
							}, null, _parent));
							_push(`</i><span data-v-ui-bd6e1294cf28><b data-v-ui-bd6e1294cf28>${ssrInterpolate(item.name)}</b><strong data-v-ui-bd6e1294cf28>${ssrInterpolate(item.title)}</strong><small data-v-ui-bd6e1294cf28>${ssrInterpolate(priorityLabels[item.priority])} · срок через ${ssrInterpolate(item.dueInHours || "—")} ч · напомнить за ${ssrInterpolate(item.reminderBeforeMin || 0)} мин</small>`);
							if (item.defaultAssignee) _push(`<em data-v-ui-bd6e1294cf28>${ssrInterpolate(person(item.defaultAssignee))}</em>`);
							else _push(`<!---->`);
							_push(`</span><button class="crm-button" data-v-ui-bd6e1294cf28 title="Создать задачу">`);
							_push(ssrRenderComponent(unref(Play), {
								"data-v-ui-bd6e1294cf28": "",
								size: 14
							}, null, _parent));
							_push(`</button><button data-v-ui-bd6e1294cf28 class="delete crm-button crm-button--danger" title="Архивировать шаблон">`);
							_push(ssrRenderComponent(unref(Trash2), {
								"data-v-ui-bd6e1294cf28": "",
								size: 14
							}, null, _parent));
							_push(`</button></article>`);
						});
						_push(`<!--]-->`);
						if (!unref(templates).length) _push(`<p data-v-ui-bd6e1294cf28>Шаблонов пока нет</p>`);
						else _push(`<!---->`);
						_push(`</section><form data-v-ui-bd6e1294cf28><h3 data-v-ui-bd6e1294cf28>`);
						_push(ssrRenderComponent(unref(Plus), {
							"data-v-ui-bd6e1294cf28": "",
							size: 16
						}, null, _parent));
						_push(`Новый шаблон</h3><div data-v-ui-bd6e1294cf28 class="two"><label class="crm-field" data-v-ui-bd6e1294cf28>Название шаблона<input class="crm-input" data-v-ui-bd6e1294cf28${ssrRenderAttr("value", unref(draft).name)} required></label><label class="crm-field" data-v-ui-bd6e1294cf28>Название задачи<input class="crm-input" data-v-ui-bd6e1294cf28${ssrRenderAttr("value", unref(draft).title)} required></label></div><label class="crm-field" data-v-ui-bd6e1294cf28>Описание<textarea class="crm-input" data-v-ui-bd6e1294cf28 rows="3">${ssrInterpolate(unref(draft).description)}</textarea></label><div data-v-ui-bd6e1294cf28 class="three"><label class="crm-field" data-v-ui-bd6e1294cf28>Приоритет<select class="crm-input" data-v-ui-bd6e1294cf28><!--[-->`);
						ssrRenderList(priorityLabels, (label, key) => {
							_push(`<option data-v-ui-bd6e1294cf28${ssrRenderAttr("value", key)}${ssrIncludeBooleanAttr(Array.isArray(unref(draft).priority) ? ssrLooseContain(unref(draft).priority, key) : ssrLooseEqual(unref(draft).priority, key)) ? " selected" : ""}>${ssrInterpolate(label)}</option>`);
						});
						_push(`<!--]--></select></label><label class="crm-field" data-v-ui-bd6e1294cf28>Срок через, часов<input class="crm-input" data-v-ui-bd6e1294cf28${ssrRenderAttr("value", unref(draft).dueInHours)} type="number" min="1"></label><label class="crm-field" data-v-ui-bd6e1294cf28>Напомнить за, минут<input class="crm-input" data-v-ui-bd6e1294cf28${ssrRenderAttr("value", unref(draft).reminderBeforeMin)} type="number" min="0"></label></div><div data-v-ui-bd6e1294cf28 class="two"><label class="crm-field" data-v-ui-bd6e1294cf28>Ответственный по умолчанию<select class="crm-input" data-v-ui-bd6e1294cf28><option data-v-ui-bd6e1294cf28 value=""${ssrIncludeBooleanAttr(Array.isArray(unref(draft).defaultAssigneeId) ? ssrLooseContain(unref(draft).defaultAssigneeId, "") : ssrLooseEqual(unref(draft).defaultAssigneeId, "")) ? " selected" : ""}>Создатель задачи</option><!--[-->`);
						ssrRenderList(unref(team), (member) => {
							_push(`<option data-v-ui-bd6e1294cf28${ssrRenderAttr("value", member.id)}${ssrIncludeBooleanAttr(Array.isArray(unref(draft).defaultAssigneeId) ? ssrLooseContain(unref(draft).defaultAssigneeId, member.id) : ssrLooseEqual(unref(draft).defaultAssigneeId, member.id)) ? " selected" : ""}>${ssrInterpolate(person(member))}</option>`);
						});
						_push(`<!--]--></select></label><label class="crm-field" data-v-ui-bd6e1294cf28>Метки через запятую<input class="crm-input" data-v-ui-bd6e1294cf28${ssrRenderAttr("value", unref(draft).labels)} placeholder="звонок, документы"></label></div>`);
						if (unref(error)) _push(`<p data-v-ui-bd6e1294cf28 class="error">${ssrInterpolate(unref(error))}</p>`);
						else _push(`<!---->`);
						_push(`<button data-v-ui-bd6e1294cf28 class="save crm-button crm-button--primary"${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""}>`);
						_push(ssrRenderComponent(unref(Save), {
							"data-v-ui-bd6e1294cf28": "",
							size: 14
						}, null, _parent));
						_push(`${ssrInterpolate(unref(saving) ? "Сохраняем…" : "Сохранить шаблон")}</button></form></main>`);
					} else {
						_push(`<main data-v-ui-bd6e1294cf28 class="reminders crm-standard"><!--[-->`);
						ssrRenderList(unref(reminders), (item) => {
							_push(`<article data-v-ui-bd6e1294cf28><i data-v-ui-bd6e1294cf28>`);
							_push(ssrRenderComponent(unref(AlarmClock), {
								"data-v-ui-bd6e1294cf28": "",
								size: 18
							}, null, _parent));
							_push(`</i><span data-v-ui-bd6e1294cf28><b data-v-ui-bd6e1294cf28>${ssrInterpolate(item.task.title)}</b><small data-v-ui-bd6e1294cf28>Срок ${ssrInterpolate(item.task.dueDate ? new Date(item.task.dueDate).toLocaleString("ru-RU") : "не задан")}</small></span><button class="crm-button" data-v-ui-bd6e1294cf28>`);
							_push(ssrRenderComponent(unref(CheckCircle2), {
								"data-v-ui-bd6e1294cf28": "",
								size: 15
							}, null, _parent));
							_push(`Убрать напоминание</button></article>`);
						});
						_push(`<!--]-->`);
						if (!unref(reminders).length) _push(`<p data-v-ui-bd6e1294cf28>Сейчас активных напоминаний нет</p>`);
						else _push(`<!---->`);
						_push(`</main>`);
					}
					_push(`</section></div>`);
				} else _push(`<!---->`);
			}, "body", false, _parent);
		};
	}
});
// components/CrmTaskAutomation.vue
var _sfc_setup$2 = CrmTaskAutomation_vue_vue_type_script_setup_true_lang_default.setup;
CrmTaskAutomation_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/CrmTaskAutomation.vue");
	return _sfc_setup$2 ? _sfc_setup$2(props, ctx) : void 0;
};
var CrmTaskAutomation_default = Object.assign(CrmTaskAutomation_vue_vue_type_script_setup_true_lang_default, { __name: "CrmTaskAutomation" });
// components/crm/CrmTaskPipelineEditor.vue?vue&type=script&setup=true&lang.ts
var CrmTaskPipelineEditor_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "CrmTaskPipelineEditor",
	__ssrInlineRender: true,
	props: {
		pipeline: {},
		departments: {}
	},
	emits: ["close", "saved"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const defaults = {
			BACKLOG: "Бэклог",
			TODO: "К выполнению",
			IN_PROGRESS: "В работе",
			REVIEW: "Проверка",
			OVERDUE: "Просрочено",
			DONE: "Готово"
		};
		const draft = reactive({
			name: props.pipeline?.name || "",
			departmentId: props.pipeline?.departmentId || "",
			labels: { ...props.pipeline?.labels || defaults }
		});
		const baseline = JSON.stringify(draft), busy = ref(false), error = ref("");
		useWorkspaceSession();
		function discard() {
			return !busy.value && (JSON.stringify(draft) === baseline || (void 0).confirm("Закрыть настройки без сохранения?"));
		}
		function close() {
			if (discard()) emit("close");
		}
		const opened = ref(false);
		useCatalogDialog(computed(() => opened.value), close);
		onBeforeRouteLeave(discard);
		return (_ctx, _push, _parent, _attrs) => {
			ssrRenderTeleport(_push, (_push) => {
				_push(`<div class="admin-dialog-backdrop crm-detail-backdrop"><form class="admin-dialog admin-dialog--drawer crm-detail-card" role="dialog" aria-modal="true" aria-labelledby="task-pipeline-title" tabindex="-1"><header><h2 id="task-pipeline-title">${ssrInterpolate(__props.pipeline ? "Настройки воронки" : "Новая воронка задач")}</h2><button type="button" class="crm-button crm-button--icon" aria-label="Закрыть настройки воронки"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}>`);
				_push(ssrRenderComponent(unref(X), { size: 18 }, null, _parent));
				_push(`</button></header><fieldset class="admin-dialog-body crm-detail-body crm-stack ui-fieldset-reset"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}>`);
				if (unref(error)) _push(`<p role="alert">${ssrInterpolate(unref(error))}</p>`);
				else _push(`<!---->`);
				_push(`<label class="crm-field">Название воронки<input${ssrRenderAttr("value", unref(draft).name)} class="crm-input" required maxlength="100"></label><label class="crm-field">Отдел<select aria-label="Отдел" class="crm-input"${ssrIncludeBooleanAttr(__props.pipeline?.id === "00000000-0000-4000-8000-000000000001") ? " disabled" : ""}><option value=""${ssrIncludeBooleanAttr(Array.isArray(unref(draft).departmentId) ? ssrLooseContain(unref(draft).departmentId, "") : ssrLooseEqual(unref(draft).departmentId, "")) ? " selected" : ""}>Все отделы</option><!--[-->`);
				ssrRenderList(__props.departments, (department) => {
					_push(`<option${ssrRenderAttr("value", department.id)}${ssrIncludeBooleanAttr(Array.isArray(unref(draft).departmentId) ? ssrLooseContain(unref(draft).departmentId, department.id) : ssrLooseEqual(unref(draft).departmentId, department.id)) ? " selected" : ""}>${ssrInterpolate(department.name)}</option>`);
				});
				_push(`<!--]--></select></label><p class="crm-inline-note">Отдел помогает организовать работу. Доступ к задачам определяется правами сотрудников.</p><h3>Названия статусов</h3><!--[-->`);
				ssrRenderList(defaults, (label, key) => {
					_push(`<label class="crm-field">${ssrInterpolate(label)}<input${ssrRenderAttr("value", unref(draft).labels[key])} class="crm-input" required maxlength="60"></label>`);
				});
				_push(`<!--]--><p class="crm-inline-note">Названия действуют только в этой воронке. Завершение задач, проверка сроков и напоминания сохраняют свой смысл.</p></fieldset><footer class="crm-detail-footer"><button type="button" class="crm-button"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}>Отмена</button><button type="submit" class="crm-button crm-button--primary"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}>${ssrInterpolate(unref(busy) ? "Сохраняем…" : "Сохранить воронку")}</button></footer></form></div>`);
			}, "body", false, _parent);
		};
	}
});
// components/crm/CrmTaskPipelineEditor.vue
var _sfc_setup$1 = CrmTaskPipelineEditor_vue_vue_type_script_setup_true_lang_default.setup;
CrmTaskPipelineEditor_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/crm/CrmTaskPipelineEditor.vue");
	return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
var CrmTaskPipelineEditor_default = Object.assign(CrmTaskPipelineEditor_vue_vue_type_script_setup_true_lang_default, { __name: "CrmTaskPipelineEditor" });
// pages/crm/tasks.vue?vue&type=script&setup=true&lang.ts
var tasks_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "tasks",
	__ssrInlineRender: true,
	setup(__props) {
		useHead({ title: "Задачи — SARKISIAN CRM" });
		const config = useRuntimeConfig(), route = useRoute();
		const router = useRouter();
		const { token, user } = useWorkspaceSession();
		useContextMenu(); const tasks = ref([]), team = ref([]), leads = ref([]), loading = ref(true), view = ref("kanban"), search = ref(""), selected = ref(null), dialog = ref(false), automationOpen = ref(false), saving = ref(false), notice = ref(""), comment = ref("");
		ref("");
		const month = ref(/* @__PURE__ */ new Date());
		const error = ref("");
		const selectedBaseline = ref("");
		const cardTab = ref("general");
		useCatalogDialog(computed(() => !!selected.value), () => {
			closeTask(true);
		});
		useCatalogDialog(computed(() => dialog.value), closeCreate);
		const createBaseline = ref("");
		const subtaskTitle = ref(""), subtaskAssignee = ref(""), attachmentBusy = ref(false), commentLoading = ref(false);
		const { can } = useWorkspaceAccess();
		const writable = computed(() => can("crm.write"));
		const cardDrag = useCrmCardDrag();
		const taskChildren = computed(() => selected.value?.children || []);
		const dirty = computed(() => !!selected.value && JSON.stringify(selected.value) !== selectedBaseline.value);
		const createDirty = computed(() => dialog.value && JSON.stringify(draft) !== createBaseline.value);
		const cloneTask = crmTaskDraft;
		function openTask(task) {
			if (!task) return;
			if (!task || saving.value || !closeTask()) return;
			cardTab.value = "general";
			selected.value = cloneTask(tasks.value.find((item) => item.id === task.id) || task);
			selectedBaseline.value = JSON.stringify(selected.value);
			subtaskTitle.value = "";
			subtaskAssignee.value = selected.value.assignedToId;
			error.value = "";
		}
		function canDiscard() {
			return !saving.value && !attachmentBusy.value && (!(dirty.value || createDirty.value || comment.value.trim() || subtaskTitle.value.trim()) || (void 0).confirm("Отменить несохранённые изменения и текст комментария?"));
		}
		function closeTask(clearLink = false) {
			if (!canDiscard()) return false;
			selected.value = null;
			selectedBaseline.value = "";
			comment.value = "";
			subtaskTitle.value = "";
			if (clearLink && route.query.task) router.replace({ query: {
				...route.query,
				task: void 0,
				tab: void 0,
				notification: void 0
			} });
			return true;
		}
		function closeCreate() {
			if (!canDiscard()) return false;
			dialog.value = false;
			return true;
		}
		function failure(exception) {
			error.value = Array.isArray(exception?.data?.message) ? exception.data.message.join(", ") : exception?.data?.message || "Не удалось выполнить действие. Изменения не сохранены — повторите попытку.";
		}
		function commitTask(task) {
			tasks.value = tasks.value.map((item) => item.id === task.id ? JSON.parse(JSON.stringify(task)) : item);
		}
		onBeforeRouteLeave(() => canDiscard());
		const draft = reactive({
			title: "",
			description: "",
			participants: [],
			assignedToId: "",
			leadId: "",
			status: "TODO",
			priority: "MEDIUM",
			progress: 0,
			startDate: "",
			dueDate: "",
			estimateMinutes: 60,
			labels: "",
			reminderBeforeMinutes: 60
		});
		const headers = computed(() => ({ Authorization: `Bearer ${token.value}` }));
		const pipelineId = ref("00000000-0000-4000-8000-000000000001");
		const pipelines = ref([]), departments = ref([]), canManagePipelines = ref(false);
		const pipelineEditor = ref(false), editingPipeline = ref(null);
		const activePipeline = computed(() => pipelines.value.find((item) => item.id === pipelineId.value));
		const baseColumns = [
			{
				id: "BACKLOG",
				label: "Бэклог",
				color: "#8b8f98"
			},
			{
				id: "TODO",
				label: "К выполнению",
				color: "#4f7dcf"
			},
			{
				id: "IN_PROGRESS",
				label: "В работе",
				color: "#d58a35"
			},
			{
				id: "REVIEW",
				label: "Проверка",
				color: "#7f65c7"
			},
			{
				id: "OVERDUE",
				label: "Просрочено",
				color: "#bb5145"
			},
			{
				id: "DONE",
				label: "Готово",
				color: "#2d9568"
			}
		];
		const columns = computed(() => baseColumns.map((column) => ({
			...column,
			label: activePipeline.value?.labels?.[column.id] || column.label
		})));
		const selectedColumns = computed(() => baseColumns.map((column) => ({
			...column,
			label: pipelines.value.find((item) => item.id === selected.value?.pipelineId)?.labels?.[column.id] || column.label
		})));
		async function pipelineSaved(id) {
			pipelineEditor.value = false;
			pipelineId.value = id;
			await load();
			flash("Воронка сохранена");
		}
		const priorityLabels = {
			LOW: "Низкий",
			MEDIUM: "Обычный",
			HIGH: "Высокий",
			CRITICAL: "Критичный"
		};
		const taskSavedView = ref("all");
		function matchesTaskView(task, view = taskSavedView.value) {
			if (view === "mine") return Boolean(user.value?.id) && (task.assignedToId === user.value?.id || (task.participants || []).some((p) => (p.userId || p.user?.id) === user.value?.id));
			if (view === "overdue") return !["DONE", "CANCELLED"].includes(task.status) && Boolean(task.dueDate) && new Date(task.dueDate).getTime() < Date.now();
			return true;
		}
		const taskSavedViews = computed(() => [
			{
				id: "all",
				label: "Все задачи",
				count: tasks.value.length
			},
			{
				id: "mine",
				label: "Мои задачи",
				count: tasks.value.filter((t) => matchesTaskView(t, "mine")).length
			},
			{
				id: "overdue",
				label: "Просроченные",
				count: tasks.value.filter((t) => matchesTaskView(t, "overdue")).length
			}
		]);
		const filtered = computed(() => tasks.value.filter((task) => matchesTaskView(task)).filter((t) => !search.value || `${t.title} ${t.description || ""} ${person(t.assignedTo)} ${t.assignedTo?.email || ""} ${(t.participants || []).map((row) => person(row.user)).join(" ")}`.toLowerCase().includes(search.value.toLowerCase())));
		const boardTasks = computed(() => filtered.value.filter((task) => search.value || !task.parentId));
		const monthLabel = computed(() => month.value.toLocaleDateString("ru-RU", {
			month: "long",
			year: "numeric"
		}));
		const calendarDays = computed(() => {
			const y = month.value.getFullYear(), m = month.value.getMonth(), offset = (new Date(y, m, 1).getDay() + 6) % 7, total = new Date(y, m + 1, 0).getDate();
			return Array.from({ length: 42 }, (_, i) => {
				const day = i - offset + 1;
				const date = new Date(y, m, day);
				return {
					date,
					inside: day >= 1 && day <= total,
					tasks: filtered.value.filter((t) => t.dueDate && new Date(t.dueDate).toDateString() === date.toDateString())
				};
			});
		});
		const ganttRange = computed(() => {
			const dates = filtered.value.flatMap((t) => [t.startDate, t.dueDate].filter(Boolean).map((x) => new Date(x).getTime()));
			const start = dates.length ? Math.min(...dates) : Date.now();
			const end = dates.length ? Math.max(...dates) : Date.now() + 2592e6;
			return {
				start: /* @__PURE__ */ new Date(start - 864e5),
				end: new Date(Math.max(end + 864e5, start + 12096e5))
			};
		});
		function ganttStyle(t) {
			const s = new Date(t.startDate || t.createdAt).getTime(), e = new Date(t.dueDate || t.startDate || t.createdAt).getTime() + 864e5, total = ganttRange.value.end.getTime() - ganttRange.value.start.getTime();
			return {
				left: `${Math.max(0, (s - ganttRange.value.start.getTime()) / total * 100)}%`,
				width: `${Math.max(2, (e - s) / total * 100)}%`
			};
		}
		async function load() {
			loading.value = true;
			error.value = "";
			try {
				const settings = await $fetch$1("/crm/task-pipelines", {
					baseURL: config.public.apiBase,
					headers: headers.value
				});
				pipelines.value = settings.pipelines;
				departments.value = settings.departments;
				canManagePipelines.value = settings.canManage;
				if (!pipelines.value.some((item) => item.id === pipelineId.value)) pipelineId.value = pipelines.value[0]?.id || "";
				[tasks.value, team.value, leads.value] = await Promise.all([
					$fetch$1("/crm/tasks", {
						query: { pipelineId: pipelineId.value },
						baseURL: config.public.apiBase,
						headers: headers.value
					}),
					$fetch$1("/crm/team", {
						baseURL: config.public.apiBase,
						headers: headers.value
					}),
					$fetch$1("/crm/leads", {
						baseURL: config.public.apiBase,
						headers: headers.value
					})
				]);
			} catch (exception) {
				failure(exception);
			} finally {
				loading.value = false;
			}
		}
		function flash(v) {
			notice.value = v;
			setTimeout(() => notice.value = "", 2300);
		}
		function person(u) {
			return [u?.firstName, u?.lastName].filter(Boolean).join(" ") || u?.email || "Не назначен";
		}
		async function patchTask(id, body) {
			const updated = await $fetch$1(`/crm/tasks/${id}`, {
				baseURL: config.public.apiBase,
				method: "PATCH",
				headers: headers.value,
				body
			});
			commitTask(updated);
			return updated;
		}
		async function refreshRelated() {
			try {
				tasks.value = await $fetch$1("/crm/tasks", {
					baseURL: config.public.apiBase,
					headers: headers.value,
					query: { pipelineId: pipelineId.value }
				});
			} catch {
				error.value = "Изменения сохранены, но обновить список не удалось. Нажмите «Обновить».";
				return;
			}
			const fresh = tasks.value.find((task) => task.id === selected.value?.id);
			if (fresh && selected.value) {
				const baseline = JSON.parse(selectedBaseline.value);
				for (const field of [
					"children",
					"progress",
					"_count"
				]) {
					selected.value[field] = fresh[field];
					baseline[field] = fresh[field];
				}
				if (baseline.status === "DONE" && fresh.status !== "DONE") {
					selected.value.status = fresh.status;
					baseline.status = fresh.status;
				}
				selectedBaseline.value = JSON.stringify(baseline);
			}
		}
		async function addSubtask() {
			if (!writable.value || !selected.value || saving.value || !subtaskTitle.value.trim()) return;
			saving.value = true;
			error.value = "";
			try {
				await $fetch$1("/crm/tasks", {
					baseURL: config.public.apiBase,
					headers: headers.value,
					method: "POST",
					body: {
						title: subtaskTitle.value.trim(),
						parentId: selected.value.id,
						assignedToId: subtaskAssignee.value || selected.value.assignedToId,
						leadId: selected.value.leadId || void 0
					}
				});
				subtaskTitle.value = "";
				await refreshRelated();
				flash("Подзадача создана");
			} catch (e) {
				failure(e);
			} finally {
				saving.value = false;
			}
		}
		async function toggleSubtask(task) {
			if (!writable.value || saving.value) return;
			saving.value = true;
			error.value = "";
			try {
				await patchTask(task.id, { status: task.status === "DONE" ? "TODO" : "DONE" });
				await refreshRelated();
			} catch (e) {
				failure(e);
			} finally {
				saving.value = false;
			}
		}
		async function moreComments() {
			if (!selected.value || commentLoading.value) return;
			const id = selected.value.id;
			commentLoading.value = true;
			try {
				const rows = await $fetch$1(`/crm/tasks/${id}/comments`, {
					baseURL: config.public.apiBase,
					headers: headers.value,
					query: { before: selected.value.comments?.at(-1)?.id }
				});
				if (selected.value?.id !== id) return;
				const baseline = JSON.parse(selectedBaseline.value);
				for (const target of [selected.value, baseline]) target.comments = [...target.comments || [], ...rows.filter((row) => !target.comments?.some((old) => old.id === row.id))];
				selectedBaseline.value = JSON.stringify(baseline);
			} catch (e) {
				failure(e);
			} finally {
				commentLoading.value = false;
			}
		}
		function updateParticipants(rows) {
			if (!selected.value) return;
			const baseline = JSON.parse(selectedBaseline.value);
			selected.value.participants = rows;
			baseline.participants = rows;
			selectedBaseline.value = JSON.stringify(baseline);
			const task = tasks.value.find((item) => item.id === selected.value.id);
			if (task) commitTask({
				...task,
				participants: rows
			});
		}
		async function addComment(mentionIds = []) {
			if (!writable.value || !selected.value || !comment.value.trim() || saving.value) return;
			const id = selected.value.id;
			saving.value = true;
			error.value = "";
			try {
				const created = await $fetch$1(`/crm/tasks/${id}/comments`, {
					baseURL: config.public.apiBase,
					method: "POST",
					headers: headers.value,
					body: {
						body: comment.value,
						mentionIds
					}
				});
				comment.value = "";
				if (created.participants) updateParticipants(created.participants);
				const task = tasks.value.find((item) => item.id === id);
				if (task) commitTask({
					...task,
					comments: [created, ...task.comments || []],
					_count: {
						...task._count,
						comments: Number(task._count?.comments || 0) + 1
					}
				});
				const baseline = JSON.parse(selectedBaseline.value);
				for (const target of [selected.value, baseline]) {
					target.comments = [created, ...target.comments || []];
					target._count = {
						...target._count,
						comments: Number(target._count?.comments || 0) + 1
					};
				}
				selectedBaseline.value = JSON.stringify(baseline);
				flash("Комментарий добавлен");
			} catch (exception) {
				failure(exception);
			} finally {
				saving.value = false;
			}
		}
		let notificationTaskVersion = 0;
		watch(() => [
			route.query.task,
			route.query.tab,
			route.query.notification
		], async ([id]) => {
			const version = ++notificationTaskVersion, identity = token.value;
			if (typeof id !== "string" || !id || !closeTask()) return;
			try {
				const task = await $fetch$1(`/crm/tasks/${encodeURIComponent(id)}`, {
					baseURL: config.public.apiBase,
					headers: headers.value
				});
				if (version !== notificationTaskVersion || identity !== token.value) return;
				pipelineId.value = task.pipelineId;
				await load();
				if (version === notificationTaskVersion && identity === token.value) {
					openTask(task);
					if (route.query.tab === "comments") cardTab.value = "comments";
				}
			} catch (e) {
				if (version === notificationTaskVersion && identity === token.value) failure(e);
			}
		});
		return (_ctx, _push, _parent, _attrs) => {
			const _component_WorkspaceLoading = WorkspaceLoading_default;
			const _component_CrmCardTabs = CrmCardTabs_default;
			const _component_CrmTaskParticipants = CrmTaskParticipants_default;
			const _component_CrmSubtasks = CrmSubtasks_default;
			const _component_CrmTaskFiles = CrmTaskFiles_default;
			const _component_CrmCardComments = CrmCardComments_default;
			const _component_CrmChangeHistory = CrmChangeHistory_default;
			const _component_CrmTaskAutomation = CrmTaskAutomation_default;
			const _component_CrmTaskPipelineEditor = CrmTaskPipelineEditor_default;
			_push(`<main${ssrRenderAttrs(mergeProps({
				"data-v-ui-acc13851dfa0": "",
				class: "tasks-page crm-standard crm-operational-page crm-ops-tasks"
			}, _attrs))}>`);
			if (unref(error)) {
				_push(`<div data-v-ui-acc13851dfa0 class="operation-error" role="alert">${ssrInterpolate(unref(error))} `);
				if (!unref(selected) && !unref(dialog)) _push(`<button class="crm-button" data-v-ui-acc13851dfa0${ssrIncludeBooleanAttr(unref(loading) || unref(saving)) ? " disabled" : ""}>Повторить загрузку</button>`);
				else _push(`<!---->`);
				_push(`</div>`);
			} else _push(`<!---->`);
			if (unref(loading)) _push(ssrRenderComponent(_component_WorkspaceLoading, { label: "Загружаем задачи команды" }, null, _parent));
			else {
				_push(`<!--[--><header data-v-ui-acc13851dfa0 class="page-head crm-page-header"><div data-v-ui-acc13851dfa0><h1 data-v-ui-acc13851dfa0>Задачи</h1></div><div data-v-ui-acc13851dfa0>`);
				if (unref(writable)) {
					_push(`<button data-v-ui-acc13851dfa0 class="light crm-button">`);
					_push(ssrRenderComponent(unref(Sparkles), {
						"data-v-ui-acc13851dfa0": "",
						size: 16
					}, null, _parent));
					_push(`Автоматизация </button>`);
				} else _push(`<!---->`);
				_push(`<button data-v-ui-acc13851dfa0 class="light crm-button crm-button--refresh"${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""}>`);
				_push(ssrRenderComponent(unref(RefreshCw), {
					"data-v-ui-acc13851dfa0": "",
					size: 16
				}, null, _parent));
				_push(`Обновить</button>`);
				if (unref(writable)) {
					_push(`<button class="crm-button crm-button--primary" data-v-ui-acc13851dfa0>`);
					_push(ssrRenderComponent(unref(Plus), {
						"data-v-ui-acc13851dfa0": "",
						size: 16
					}, null, _parent));
					_push(`Новая задача </button>`);
				} else _push(`<!---->`);
				_push(`</div></header><nav class="crm-ops-views" aria-label="Представления задач"><!--[-->`);
				ssrRenderList(unref(taskSavedViews), (item) => {
					_push(`<button class="crm-button crm-button--quiet"${ssrRenderAttr("aria-pressed", unref(taskSavedView) === item.id)}>${ssrInterpolate(item.label)}<span>${ssrInterpolate(item.count)}</span></button>`);
				});
				_push(`<!--]--></nav><div class="crm-task-controls"><section class="crm-toolbar crm-task-pipeline-toolbar" aria-label="Воронки задач"><label class="crm-field"><span class="wn-sr-only">Воронка задач</span><select aria-label="Воронка задач" class="crm-input"${ssrRenderAttr("value", unref(pipelineId))}${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""}><!--[-->`);
				ssrRenderList(unref(pipelines), (pipeline) => {
					_push(`<option${ssrRenderAttr("value", pipeline.id)}>${ssrInterpolate(pipeline.name)}${ssrInterpolate(pipeline.department ? ` · ${pipeline.department.name}` : "")}</option>`);
				});
				_push(`<!--]--></select></label>`);
				if (unref(canManagePipelines)) _push(`<button class="crm-button"${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""}>Настроить статусы</button>`);
				else _push(`<!---->`);
				if (unref(canManagePipelines)) {
					_push(`<button class="crm-button"${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""}>`);
					_push(ssrRenderComponent(unref(Plus), { size: 16 }, null, _parent));
					_push(`Новая воронка</button>`);
				} else _push(`<!---->`);
				_push(`</section><section data-v-ui-acc13851dfa0 class="toolbar crm-toolbar"><label class="crm-input-group" data-v-ui-acc13851dfa0>`);
				_push(ssrRenderComponent(unref(Search), {
					"data-v-ui-acc13851dfa0": "",
					size: 15
				}, null, _parent));
				_push(`<input class="crm-input" data-v-ui-acc13851dfa0 id="task-query" aria-label="Поиск задач"${ssrRenderAttr("value", unref(search))} placeholder="Найти задачу или сотрудника"></label><nav data-v-ui-acc13851dfa0><!--[-->`);
				ssrRenderList([
					{
						id: "kanban",
						l: "Канбан",
						i: unref(LayoutGrid)
					},
					{
						id: "gantt",
						l: "Гант",
						i: unref(GanttChartSquare)
					},
					{
						id: "calendar",
						l: "Календарь",
						i: unref(CalendarDays)
					},
					{
						id: "list",
						l: "Список",
						i: unref(List)
					}
				], (v) => {
					_push(`<button data-v-ui-acc13851dfa0 class="${ssrRenderClass([{ active: unref(view) === v.id }, "crm-button"])}"${ssrRenderAttr("aria-pressed", unref(view) === v.id)}>`);
					ssrRenderVNode(_push, createVNode(resolveDynamicComponent(v.i), {
						"data-v-ui-acc13851dfa0": "",
						size: 14
					}, null), _parent);
					_push(`${ssrInterpolate(v.l)}</button>`);
				});
				_push(`<!--]--></nav></section></div>`);
				if (!unref(error)) {
					_push(`<div class="crm-ops-result"><span role="status">Найдено задач: ${ssrInterpolate(unref(filtered).length)}</span>`);
					if (unref(search) || unref(taskSavedView) !== "all") _push(`<button class="crm-button crm-button--text">Сбросить фильтры</button>`);
					else _push(`<!---->`);
					_push(`</div>`);
				} else _push(`<!---->`);
				if (!unref(error) && !unref(filtered).length) {
					_push(`<section class="crm-ops-empty" aria-label="Нет подходящих задач">`);
					_push(ssrRenderComponent(unref(ListChecks), { size: 28 }, null, _parent));
					_push(`<h2>${ssrInterpolate(unref(search) || unref(taskSavedView) !== "all" ? "Задачи не найдены" : "Запланируйте работу команды")}</h2><p>${ssrInterpolate(unref(search) || unref(taskSavedView) !== "all" ? "Измените запрос или выберите другое представление." : "Создайте задачу, назначьте ответственного и укажите срок.")}</p>`);
					if (unref(search) || unref(taskSavedView) !== "all") _push(`<button class="crm-button">Показать все задачи</button>`);
					else if (unref(writable)) _push(`<button class="crm-button crm-button--primary">Создать задачу</button>`);
					else _push(`<!---->`);
					_push(`</section>`);
				} else _push(`<!---->`);
				if (unref(view) === "kanban") {
					_push(`<section data-v-ui-acc13851dfa0 class="kanban crm-board" style="${ssrRenderStyle(!unref(error) ? null : { display: "none" })}"><!--[-->`);
					ssrRenderList(unref(columns), (col) => {
						_push(`<article data-v-ui-acc13851dfa0${ssrRenderAttr("data-crm-drop", col.id)} class="${ssrRenderClass([{ "is-drop-target": unref(cardDrag).over.value === col.id }, "crm-board-column crm-surface"])}"><header data-v-ui-acc13851dfa0><i data-v-ui-acc13851dfa0 style="${ssrRenderStyle({ background: col.color })}"></i><b data-v-ui-acc13851dfa0>${ssrInterpolate(col.label)}</b><span data-v-ui-acc13851dfa0>${ssrInterpolate(unref(boardTasks).filter((t) => t.status === col.id).length)}</span></header><div data-v-ui-acc13851dfa0><!--[-->`);
						ssrRenderList(unref(boardTasks).filter((t) => t.status === col.id), (t) => {
							_push(`<div data-v-ui-acc13851dfa0 class="${ssrRenderClass([{ "crm-card-lifted": unref(cardDrag).active.value === t.id }, "task-card crm-item-card crm-card-action"])}"${ssrRenderAttr("draggable", !unref(saving) && unref(writable))}${ssrRenderAttr("data-crm-card", t.id)} role="button" tabindex="0"><div data-v-ui-acc13851dfa0><em data-v-ui-acc13851dfa0 class="${ssrRenderClass(t.priority.toLowerCase())}">${ssrInterpolate(priorityLabels[t.priority])}</em><small data-v-ui-acc13851dfa0>${ssrInterpolate(t.progress)}%</small></div><h3 data-v-ui-acc13851dfa0>${ssrInterpolate(t.title)}</h3><progress class="crm-task-progress"${ssrRenderAttr("value", t.progress)} max="100"${ssrRenderAttr("aria-label", `Выполнено ${t.progress}%`)}></progress>`);
							if (t.children?.length) {
								_push(`<small class="crm-task-summary">`);
								_push(ssrRenderComponent(unref(ListChecks), { size: 14 }, null, _parent));
								_push(`${ssrInterpolate(t.children.filter((c) => c.status === "DONE").length)}/${ssrInterpolate(t.children.length)} подзадач</small>`);
							} else _push(`<!---->`);
							if (t.lead) _push(`<p data-v-ui-acc13851dfa0> Сделка: ${ssrInterpolate(t.lead.title || t.lead.contactName)}</p>`);
							else _push(`<!---->`);
							_push(`<footer data-v-ui-acc13851dfa0><span data-v-ui-acc13851dfa0>${ssrInterpolate(person(t.assignedTo).slice(0, 1))}</span><time data-v-ui-acc13851dfa0 class="${ssrRenderClass({ late: t.status === "OVERDUE" })}">`);
							_push(ssrRenderComponent(unref(Clock3), {
								"data-v-ui-acc13851dfa0": "",
								size: 12
							}, null, _parent));
							_push(`${ssrInterpolate(t.dueDate ? new Date(t.dueDate).toLocaleDateString("ru-RU") : "Без срока")}</time></footer>`);
							if (t._count?.comments) {
								_push(`<small class="crm-task-summary">`);
								_push(ssrRenderComponent(unref(MessageSquare), { size: 14 }, null, _parent));
								_push(`${ssrInterpolate(t._count.comments)} комм.</small>`);
							} else _push(`<!---->`);
							if (t.participants?.length) {
								_push(`<small class="crm-task-summary">`);
								_push(ssrRenderComponent(unref(UsersRound), { size: 14 }, null, _parent));
								_push(`Участники: ${ssrInterpolate(t.participants.length)}</small>`);
							} else _push(`<!---->`);
							_push(`</div>`);
						});
						_push(`<!--]-->`);
						if (unref(writable)) {
							_push(`<button data-v-ui-acc13851dfa0 class="add crm-button">`);
							_push(ssrRenderComponent(unref(Plus), {
								"data-v-ui-acc13851dfa0": "",
								size: 13
							}, null, _parent));
							_push(`Добавить </button>`);
						} else _push(`<!---->`);
						_push(`</div></article>`);
					});
					_push(`<!--]--></section>`);
				} else if (unref(view) === "gantt") {
					_push(`<section data-v-ui-acc13851dfa0 class="gantt panel crm-surface" style="${ssrRenderStyle(!unref(error) ? null : { display: "none" })}"><header data-v-ui-acc13851dfa0><span data-v-ui-acc13851dfa0>Задача и ответственный</span><b data-v-ui-acc13851dfa0>${ssrInterpolate(unref(ganttRange).start.toLocaleDateString("ru-RU"))} — ${ssrInterpolate(unref(ganttRange).end.toLocaleDateString("ru-RU"))}</b></header><!--[-->`);
					ssrRenderList(unref(filtered), (t) => {
						_push(`<div data-v-ui-acc13851dfa0 class="gantt-row crm-card-action" role="button" tabindex="0"><span data-v-ui-acc13851dfa0><strong data-v-ui-acc13851dfa0>${ssrInterpolate(t.title)}</strong><small data-v-ui-acc13851dfa0>${ssrInterpolate(person(t.assignedTo))}</small></span><div data-v-ui-acc13851dfa0><i data-v-ui-acc13851dfa0 style="${ssrRenderStyle(ganttStyle(t))}" class="${ssrRenderClass(t.status.toLowerCase())}">${ssrInterpolate(t.progress)}%</i></div></div>`);
					});
					_push(`<!--]--></section>`);
				} else if (unref(view) === "calendar") {
					_push(`<section data-v-ui-acc13851dfa0 class="calendar panel crm-surface" style="${ssrRenderStyle(!unref(error) ? null : { display: "none" })}"><header data-v-ui-acc13851dfa0><button class="crm-button crm-button--icon" aria-label="Предыдущий месяц" data-v-ui-acc13851dfa0>`);
					_push(ssrRenderComponent(unref(ChevronLeft), {
						"data-v-ui-acc13851dfa0": "",
						size: 16
					}, null, _parent));
					_push(`</button><h2 data-v-ui-acc13851dfa0>${ssrInterpolate(unref(monthLabel))}</h2><button class="crm-button crm-button--icon" aria-label="Следующий месяц" data-v-ui-acc13851dfa0>`);
					_push(ssrRenderComponent(unref(ChevronRight), {
						"data-v-ui-acc13851dfa0": "",
						size: 16
					}, null, _parent));
					_push(`</button></header><div data-v-ui-acc13851dfa0 class="week"><!--[-->`);
					ssrRenderList([
						"Пн",
						"Вт",
						"Ср",
						"Чт",
						"Пт",
						"Сб",
						"Вс"
					], (d) => {
						_push(`<b data-v-ui-acc13851dfa0>${ssrInterpolate(d)}</b>`);
					});
					_push(`<!--]--></div><div data-v-ui-acc13851dfa0 class="calendar-grid"><!--[-->`);
					ssrRenderList(unref(calendarDays), (day) => {
						_push(`<article data-v-ui-acc13851dfa0 class="${ssrRenderClass({
							outside: !day.inside,
							today: day.date.toDateString() === (/* @__PURE__ */ new Date()).toDateString()
						})}"><time data-v-ui-acc13851dfa0>${ssrInterpolate(day.date.getDate())}</time><!--[-->`);
						ssrRenderList(day.tasks.slice(0, 3), (t) => {
							_push(`<button data-v-ui-acc13851dfa0 class="${ssrRenderClass([t.status.toLowerCase(), "crm-button"])}"${ssrRenderAttr("title", t.title)}>${ssrInterpolate(t.title)}</button>`);
						});
						_push(`<!--]-->`);
						if (day.tasks.length > 3) _push(`<small data-v-ui-acc13851dfa0>+ ещё ${ssrInterpolate(day.tasks.length - 3)}</small>`);
						else _push(`<!---->`);
						_push(`</article>`);
					});
					_push(`<!--]--></div></section>`);
				} else {
					_push(`<section data-v-ui-acc13851dfa0 class="list panel crm-surface" style="${ssrRenderStyle(!unref(error) ? null : { display: "none" })}"><div data-v-ui-acc13851dfa0 class="list-row head crm-table-head"><span data-v-ui-acc13851dfa0>Задача</span><span data-v-ui-acc13851dfa0>Ответственный</span><span data-v-ui-acc13851dfa0>Статус</span><span data-v-ui-acc13851dfa0>Приоритет</span><span data-v-ui-acc13851dfa0>Срок</span><span data-v-ui-acc13851dfa0>Прогресс</span></div><!--[-->`);
					ssrRenderList(unref(filtered), (t) => {
						_push(`<div data-v-ui-acc13851dfa0 class="list-row crm-card-action" role="button" tabindex="0"><strong data-v-ui-acc13851dfa0>${ssrInterpolate(t.title)}</strong><span data-v-ui-acc13851dfa0>${ssrInterpolate(person(t.assignedTo))}</span><em data-v-ui-acc13851dfa0>${ssrInterpolate(unref(columns).find((c) => c.id === t.status)?.label)}</em><span data-v-ui-acc13851dfa0>${ssrInterpolate(priorityLabels[t.priority])}</span><span data-v-ui-acc13851dfa0>${ssrInterpolate(t.dueDate ? new Date(t.dueDate).toLocaleDateString("ru-RU") : "—")}</span><b data-v-ui-acc13851dfa0>${ssrInterpolate(t.progress)}%</b></div>`);
					});
					_push(`<!--]--></section>`);
				}
				_push(`<!--]-->`);
			}
			if (unref(selected)) {
				_push(`<aside data-v-ui-acc13851dfa0 class="backdrop admin-dialog-backdrop crm-detail-backdrop"><div data-v-ui-acc13851dfa0 tabindex="-1" role="dialog" aria-modal="true" aria-label="Карточка задачи" class="drawer admin-dialog admin-dialog--drawer crm-detail-card"><header data-v-ui-acc13851dfa0><div data-v-ui-acc13851dfa0><p data-v-ui-acc13851dfa0>КАРТОЧКА ЗАДАЧИ</p><h2 data-v-ui-acc13851dfa0>${ssrInterpolate(unref(selected).title)}</h2></div><button class="crm-button crm-button--icon" data-v-ui-acc13851dfa0${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""} aria-label="Закрыть задачу">`);
				_push(ssrRenderComponent(unref(X), {
					"data-v-ui-acc13851dfa0": "",
					size: 18
				}, null, _parent));
				_push(`</button></header>`);
				_push(ssrRenderComponent(_component_CrmCardTabs, {
					modelValue: unref(cardTab),
					"onUpdate:modelValue": ($event) => isRef(cardTab) ? cardTab.value = $event : null,
					prefix: "task"
				}, null, _parent));
				_push(`<fieldset data-v-ui-acc13851dfa0 ui-inline-i-acc13851dfa0-1 class="body fields admin-dialog-body crm-detail-body"${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""}>`);
				if (unref(error)) _push(`<p data-v-ui-acc13851dfa0 class="operation-error" role="alert">${ssrInterpolate(unref(error))}</p>`);
				else _push(`<!---->`);
				if (unref(dirty)) _push(`<p data-v-ui-acc13851dfa0 role="status">Есть несохранённые изменения</p>`);
				else _push(`<!---->`);
				_push(`<section id="task-general-panel" role="tabpanel" aria-labelledby="task-general-tab" class="crm-card-general crm-detail-general" style="${ssrRenderStyle(unref(cardTab) === "general" ? null : { display: "none" })}"><label class="crm-field">Воронка<select class="crm-input"${ssrIncludeBooleanAttr(!unref(writable) || !!unref(selected).parentId || !!unref(selected)._count?.children) ? " disabled" : ""}><!--[-->`);
				ssrRenderList(unref(pipelines), (pipeline) => {
					_push(`<option${ssrRenderAttr("value", pipeline.id)}${ssrIncludeBooleanAttr(Array.isArray(unref(selected).pipelineId) ? ssrLooseContain(unref(selected).pipelineId, pipeline.id) : ssrLooseEqual(unref(selected).pipelineId, pipeline.id)) ? " selected" : ""}>${ssrInterpolate(pipeline.name)}</option>`);
				});
				_push(`<!--]--></select>`);
				if (unref(selected).parentId || unref(selected)._count?.children) _push(`<small>Задачи с подзадачами остаются в одной воронке.</small>`);
				else _push(`<!---->`);
				_push(`</label><label class="crm-field" data-v-ui-acc13851dfa0>Название<input${ssrIncludeBooleanAttr(!unref(writable)) ? " readonly" : ""} class="crm-input" data-v-ui-acc13851dfa0${ssrRenderAttr("value", unref(selected).title)}></label><label class="crm-field" data-v-ui-acc13851dfa0>Описание<textarea${ssrIncludeBooleanAttr(!unref(writable)) ? " readonly" : ""} class="crm-input" data-v-ui-acc13851dfa0 rows="4">${ssrInterpolate(unref(selected).description)}</textarea></label><div data-v-ui-acc13851dfa0 class="two"><label class="crm-field" data-v-ui-acc13851dfa0>Статус<select${ssrIncludeBooleanAttr(!unref(writable)) ? " disabled" : ""} class="crm-input" data-v-ui-acc13851dfa0><!--[-->`);
				ssrRenderList(unref(selectedColumns), (c) => {
					_push(`<option data-v-ui-acc13851dfa0${ssrRenderAttr("value", c.id)}${ssrIncludeBooleanAttr(Array.isArray(unref(selected).status) ? ssrLooseContain(unref(selected).status, c.id) : ssrLooseEqual(unref(selected).status, c.id)) ? " selected" : ""}>${ssrInterpolate(c.label)}</option>`);
				});
				_push(`<!--]--></select></label><label class="crm-field" data-v-ui-acc13851dfa0>Приоритет<select${ssrIncludeBooleanAttr(!unref(writable)) ? " disabled" : ""} class="crm-input" data-v-ui-acc13851dfa0><!--[-->`);
				ssrRenderList(priorityLabels, (l, k) => {
					_push(`<option data-v-ui-acc13851dfa0${ssrRenderAttr("value", k)}${ssrIncludeBooleanAttr(Array.isArray(unref(selected).priority) ? ssrLooseContain(unref(selected).priority, k) : ssrLooseEqual(unref(selected).priority, k)) ? " selected" : ""}>${ssrInterpolate(l)}</option>`);
				});
				_push(`<!--]--></select></label></div><label class="crm-field" data-v-ui-acc13851dfa0>Ответственный<select${ssrIncludeBooleanAttr(!unref(writable)) ? " disabled" : ""} class="crm-input" data-v-ui-acc13851dfa0><!--[-->`);
				ssrRenderList(unref(team), (u) => {
					_push(`<option data-v-ui-acc13851dfa0${ssrRenderAttr("value", u.id)}${ssrIncludeBooleanAttr(Array.isArray(unref(selected).assignedToId) ? ssrLooseContain(unref(selected).assignedToId, u.id) : ssrLooseEqual(unref(selected).assignedToId, u.id)) ? " selected" : ""}>${ssrInterpolate(person(u))}</option>`);
				});
				_push(`<!--]--></select></label><div data-v-ui-acc13851dfa0 class="two"><label class="crm-field" data-v-ui-acc13851dfa0>Начало<input${ssrIncludeBooleanAttr(!unref(writable)) ? " readonly" : ""} class="crm-input" data-v-ui-acc13851dfa0${ssrRenderAttr("value", unref(selected).startDate)} type="date"></label><label class="crm-field" data-v-ui-acc13851dfa0>Срок<input${ssrIncludeBooleanAttr(!unref(writable)) ? " readonly" : ""} class="crm-input" data-v-ui-acc13851dfa0${ssrRenderAttr("value", unref(selected).dueDate)} type="date"></label></div>`);
				_push(ssrRenderComponent(_component_CrmTaskParticipants, {
					key: unref(selected).id,
					"model-value": unref(selected).participants || [],
					"task-id": unref(selected).id,
					writable: unref(writable),
					disabled: unref(saving),
					"onUpdate:modelValue": updateParticipants,
					onBusy: ($event) => attachmentBusy.value = $event
				}, null, _parent));
				if (unref(selected).parent) {
					_push(`<button class="crm-work-button crm-button">`);
					_push(ssrRenderComponent(unref(CornerDownRight), { size: 16 }, null, _parent));
					_push(`${ssrInterpolate(unref(selected).parent.title)}</button>`);
				} else _push(`<!---->`);
				_push(`<label data-v-ui-acc13851dfa0>Прогресс — ${ssrInterpolate(unref(selected).progress)}%<input data-v-ui-acc13851dfa0${ssrRenderAttr("value", unref(selected).progress)}${ssrIncludeBooleanAttr(!!unref(taskChildren).length || !unref(writable)) ? " disabled" : ""} type="range" min="0" max="100"></label></section><section id="task-subtasks-panel" role="tabpanel" aria-labelledby="task-subtasks-tab" style="${ssrRenderStyle(unref(cardTab) === "subtasks" ? null : { display: "none" })}">`);
				_push(ssrRenderComponent(_component_CrmSubtasks, {
					title: unref(subtaskTitle),
					"onUpdate:title": ($event) => isRef(subtaskTitle) ? subtaskTitle.value = $event : null,
					assignee: unref(subtaskAssignee),
					"onUpdate:assignee": ($event) => isRef(subtaskAssignee) ? subtaskAssignee.value = $event : null,
					rows: unref(taskChildren),
					team: unref(team),
					busy: unref(saving),
					writable: unref(writable),
					description: "Общий прогресс рассчитывается по подзадачам. Завершите их перед закрытием задачи.",
					onCreate: addSubtask,
					onToggle: toggleSubtask,
					onOpen: openTask
				}, null, _parent));
				_push(`</section><section id="task-files-panel" role="tabpanel" aria-labelledby="task-files-tab" style="${ssrRenderStyle(unref(cardTab) === "files" ? null : { display: "none" })}">`);
				_push(ssrRenderComponent(_component_CrmTaskFiles, {
					key: unref(selected).id,
					"task-id": unref(selected).id,
					onBusy: ($event) => attachmentBusy.value = $event
				}, null, _parent));
				_push(`</section><section id="task-comments-panel" role="tabpanel" aria-labelledby="task-comments-tab" style="${ssrRenderStyle(unref(cardTab) === "comments" ? null : { display: "none" })}">`);
				_push(ssrRenderComponent(_component_CrmCardComments, {
					key: unref(selected).id,
					modelValue: unref(comment),
					"onUpdate:modelValue": ($event) => isRef(comment) ? comment.value = $event : null,
					"task-id": unref(selected).id,
					entries: unref(selected).comments || [],
					total: unref(selected)._count?.comments || 0,
					busy: unref(saving) || unref(attachmentBusy),
					writable: unref(writable),
					onSend: addComment
				}, {
					default: withCtx((_, _push, _parent, _scopeId) => {
						if (_push) {
							if ((unref(selected).comments?.length || 0) < (unref(selected)._count?.comments || 0)) _push(`<button class="crm-button"${ssrIncludeBooleanAttr(unref(commentLoading)) ? " disabled" : ""}${_scopeId}>${ssrInterpolate(unref(commentLoading) ? "Загружаем…" : "Ранее написанные комментарии")}</button>`);
							else _push(`<!---->`);
						} else return [(unref(selected).comments?.length || 0) < (unref(selected)._count?.comments || 0) ? (openBlock(), createBlock("button", {
							key: 0,
							class: "crm-button",
							disabled: unref(commentLoading),
							onClick: moreComments
						}, toDisplayString(unref(commentLoading) ? "Загружаем…" : "Ранее написанные комментарии"), 9, ["disabled"])) : createCommentVNode("", true)];
					}),
					_: 1
				}, _parent));
				_push(`</section>`);
				if (unref(cardTab) === "history") {
					_push(`<section id="task-history-panel" role="tabpanel" aria-labelledby="task-history-tab">`);
					_push(ssrRenderComponent(_component_CrmChangeHistory, {
						kind: "tasks",
						"entity-id": unref(selected).id,
						team: unref(team)
					}, null, _parent));
					_push(`</section>`);
				} else _push(`<!---->`);
				_push(`</fieldset><footer class="crm-detail-footer">`);
				if (unref(writable)) {
					_push(`<button type="button" class="crm-button crm-button--danger"${ssrIncludeBooleanAttr(unref(saving) || unref(attachmentBusy)) ? " disabled" : ""}>`);
					_push(ssrRenderComponent(unref(Trash2), { size: 18 }, null, _parent));
					_push(`В архив</button>`);
				} else _push(`<!---->`);
				_push(`<button type="button" class="crm-button"${ssrIncludeBooleanAttr(unref(saving) || unref(attachmentBusy)) ? " disabled" : ""}>Отмена</button>`);
				if (unref(writable)) _push(`<button type="button" class="crm-button crm-button--primary"${ssrIncludeBooleanAttr(unref(saving) || unref(attachmentBusy) || !unref(dirty)) ? " disabled" : ""}>${ssrInterpolate(unref(saving) ? "Сохраняем…" : "Сохранить изменения")}</button>`);
				else _push(`<!---->`);
				_push(`</footer></div></aside>`);
			} else _push(`<!---->`);
			if (unref(dialog)) {
				_push(`<div data-v-ui-acc13851dfa0 class="backdrop admin-dialog-backdrop crm-detail-backdrop"><form data-v-ui-acc13851dfa0 tabindex="-1" role="dialog" aria-modal="true" aria-labelledby="task-create-title" class="drawer create admin-dialog admin-dialog--drawer crm-detail-card"><header data-v-ui-acc13851dfa0><div data-v-ui-acc13851dfa0><h2 data-v-ui-acc13851dfa0 id="task-create-title">Создать задачу</h2></div><button class="crm-button crm-button--icon" data-v-ui-acc13851dfa0 type="button"${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""} aria-label="Закрыть создание задачи">`);
				_push(ssrRenderComponent(unref(X), {
					"data-v-ui-acc13851dfa0": "",
					size: 18
				}, null, _parent));
				_push(`</button></header><fieldset data-v-ui-acc13851dfa0 ui-inline-i-acc13851dfa0-2 class="body fields admin-dialog-body crm-detail-body"${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""}>`);
				if (unref(error)) _push(`<p data-v-ui-acc13851dfa0 class="operation-error" role="alert">${ssrInterpolate(unref(error))}</p>`);
				else _push(`<!---->`);
				_push(`<label class="crm-field" data-v-ui-acc13851dfa0>Название<input class="crm-input" data-v-ui-acc13851dfa0${ssrRenderAttr("value", unref(draft).title)} required></label><label class="crm-field" data-v-ui-acc13851dfa0>Описание<textarea class="crm-input" data-v-ui-acc13851dfa0 rows="4">${ssrInterpolate(unref(draft).description)}</textarea></label><div data-v-ui-acc13851dfa0 class="two"><label class="crm-field" data-v-ui-acc13851dfa0>Ответственный<select class="crm-input" data-v-ui-acc13851dfa0><!--[-->`);
				ssrRenderList(unref(team), (u) => {
					_push(`<option data-v-ui-acc13851dfa0${ssrRenderAttr("value", u.id)}${ssrIncludeBooleanAttr(Array.isArray(unref(draft).assignedToId) ? ssrLooseContain(unref(draft).assignedToId, u.id) : ssrLooseEqual(unref(draft).assignedToId, u.id)) ? " selected" : ""}>${ssrInterpolate(person(u))}</option>`);
				});
				_push(`<!--]--></select></label><label class="crm-field" data-v-ui-acc13851dfa0>Приоритет<select class="crm-input" data-v-ui-acc13851dfa0><!--[-->`);
				ssrRenderList(priorityLabels, (l, k) => {
					_push(`<option data-v-ui-acc13851dfa0${ssrRenderAttr("value", k)}${ssrIncludeBooleanAttr(Array.isArray(unref(draft).priority) ? ssrLooseContain(unref(draft).priority, k) : ssrLooseEqual(unref(draft).priority, k)) ? " selected" : ""}>${ssrInterpolate(l)}</option>`);
				});
				_push(`<!--]--></select></label></div><label class="crm-field" data-v-ui-acc13851dfa0>Связанная сделка<select class="crm-input" data-v-ui-acc13851dfa0><option data-v-ui-acc13851dfa0 value=""${ssrIncludeBooleanAttr(Array.isArray(unref(draft).leadId) ? ssrLooseContain(unref(draft).leadId, "") : ssrLooseEqual(unref(draft).leadId, "")) ? " selected" : ""}>Без сделки</option><!--[-->`);
				ssrRenderList(unref(leads), (l) => {
					_push(`<option data-v-ui-acc13851dfa0${ssrRenderAttr("value", l.id)}${ssrIncludeBooleanAttr(Array.isArray(unref(draft).leadId) ? ssrLooseContain(unref(draft).leadId, l.id) : ssrLooseEqual(unref(draft).leadId, l.id)) ? " selected" : ""}>${ssrInterpolate(l.title || l.contactName)}</option>`);
				});
				_push(`<!--]--></select></label>`);
				_push(ssrRenderComponent(_component_CrmTaskParticipants, {
					modelValue: unref(draft).participants,
					"onUpdate:modelValue": ($event) => unref(draft).participants = $event,
					writable: unref(writable),
					disabled: unref(saving)
				}, null, _parent));
				_push(`<div data-v-ui-acc13851dfa0 class="two"><label class="crm-field" data-v-ui-acc13851dfa0>Начало<input class="crm-input" data-v-ui-acc13851dfa0${ssrRenderAttr("value", unref(draft).startDate)} type="datetime-local"></label><label class="crm-field" data-v-ui-acc13851dfa0>Срок<input class="crm-input" data-v-ui-acc13851dfa0${ssrRenderAttr("value", unref(draft).dueDate)} type="datetime-local"></label></div><label class="crm-field" data-v-ui-acc13851dfa0>Метки<input class="crm-input" data-v-ui-acc13851dfa0${ssrRenderAttr("value", unref(draft).labels)} placeholder="Важно, звонок, документы"></label><label class="crm-field" data-v-ui-acc13851dfa0>Напомнить до срока<select class="crm-input" data-v-ui-acc13851dfa0><option data-v-ui-acc13851dfa0${ssrRenderAttr("value", 0)}${ssrIncludeBooleanAttr(Array.isArray(unref(draft).reminderBeforeMinutes) ? ssrLooseContain(unref(draft).reminderBeforeMinutes, 0) : ssrLooseEqual(unref(draft).reminderBeforeMinutes, 0)) ? " selected" : ""}>В момент наступления срока</option><option data-v-ui-acc13851dfa0${ssrRenderAttr("value", 15)}${ssrIncludeBooleanAttr(Array.isArray(unref(draft).reminderBeforeMinutes) ? ssrLooseContain(unref(draft).reminderBeforeMinutes, 15) : ssrLooseEqual(unref(draft).reminderBeforeMinutes, 15)) ? " selected" : ""}>За 15 минут</option><option data-v-ui-acc13851dfa0${ssrRenderAttr("value", 60)}${ssrIncludeBooleanAttr(Array.isArray(unref(draft).reminderBeforeMinutes) ? ssrLooseContain(unref(draft).reminderBeforeMinutes, 60) : ssrLooseEqual(unref(draft).reminderBeforeMinutes, 60)) ? " selected" : ""}>За 1 час</option><option data-v-ui-acc13851dfa0${ssrRenderAttr("value", 1440)}${ssrIncludeBooleanAttr(Array.isArray(unref(draft).reminderBeforeMinutes) ? ssrLooseContain(unref(draft).reminderBeforeMinutes, 1440) : ssrLooseEqual(unref(draft).reminderBeforeMinutes, 1440)) ? " selected" : ""}>За 1 день</option><option data-v-ui-acc13851dfa0${ssrRenderAttr("value", 4320)}${ssrIncludeBooleanAttr(Array.isArray(unref(draft).reminderBeforeMinutes) ? ssrLooseContain(unref(draft).reminderBeforeMinutes, 4320) : ssrLooseEqual(unref(draft).reminderBeforeMinutes, 4320)) ? " selected" : ""}>За 3 дня</option></select></label></fieldset><footer data-v-ui-acc13851dfa0 class="crm-detail-footer"><button data-v-ui-acc13851dfa0 type="button" class="light crm-button"${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""}> Отмена</button><button class="crm-button" data-v-ui-acc13851dfa0${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""}>${ssrInterpolate(unref(saving) ? "Создаём…" : "Создать задачу")}</button></footer></form></div>`);
			} else _push(`<!---->`);
			if (unref(automationOpen) && unref(writable)) _push(ssrRenderComponent(_component_CrmTaskAutomation, {
				modelValue: unref(automationOpen),
				"onUpdate:modelValue": ($event) => isRef(automationOpen) ? automationOpen.value = $event : null,
				"pipeline-id": unref(pipelineId),
				onCreated: ($event) => {
					load();
					flash("Задача создана по шаблону");
				}
			}, null, _parent));
			else _push(`<!---->`);
			if (unref(pipelineEditor)) _push(ssrRenderComponent(_component_CrmTaskPipelineEditor, {
				pipeline: unref(editingPipeline),
				departments: unref(departments),
				onClose: ($event) => pipelineEditor.value = false,
				onSaved: pipelineSaved
			}, null, _parent));
			else _push(`<!---->`);
			if (unref(notice)) _push(`<div data-v-ui-acc13851dfa0 class="toast">${ssrInterpolate(unref(notice))}</div>`);
			else _push(`<!---->`);
			_push(`</main>`);
		};
	}
});
// pages/crm/tasks.vue
var _sfc_setup = tasks_vue_vue_type_script_setup_true_lang_default.setup;
tasks_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/crm/tasks.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var tasks_default = tasks_vue_vue_type_script_setup_true_lang_default;

export { tasks_default as default };;globalThis.__timing__.logEnd('Load chunks/build/tasks-DiroW7WH');
//# sourceMappingURL=tasks-DiroW7WH.mjs.map
