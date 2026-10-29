globalThis.__timing__.logStart('Load chunks/build/crm-B7Hb_pC1');import { u as useHead, a as useWorkspaceSession, b as useWorkspaceAccess, N as NuxtLink } from '../virtual/entry.mjs';
import { C as CrmWorkClock_default } from './CrmWorkClock-Dx7xM2cg.mjs';
import { defineComponent, computed, ref, watch, mergeProps, unref, withCtx, createVNode, createTextVNode, toDisplayString, openBlock, createBlock, Fragment, createCommentVNode, renderList, nextTick, useSSRContext } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import { ssrRenderAttrs, ssrInterpolate, ssrIncludeBooleanAttr, ssrRenderComponent, ssrRenderList, ssrRenderClass, ssrRenderAttr, ssrRenderStyle, ssrRenderSlot } from 'vue/server-renderer';
import { RefreshCw, SlidersHorizontal, Plus, ListTodo, Kanban, AlertTriangle, CalendarDays, ClipboardList, ArrowRight, CheckCircle2, ArrowUpRight, MessageSquareText, ContactRound, GripVertical, ArrowUp, ArrowDown, EyeOff } from '@lucide/vue';
import { c as calendarDay } from '../_/crm-meetings.mjs';
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

const DAY_WIDGETS = [
  { id: "queue", title: "\u0422\u0440\u0435\u0431\u0443\u0435\u0442 \u0432\u043D\u0438\u043C\u0430\u043D\u0438\u044F", widths: [6, 8, 12], defaultWidth: 8 },
  { id: "calendar", title: "\u041A\u0430\u043B\u0435\u043D\u0434\u0430\u0440\u044C \u043D\u0430 \u0441\u0435\u0433\u043E\u0434\u043D\u044F", widths: [4, 6, 12], defaultWidth: 4 },
  { id: "results", title: "\u0420\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u044B \u043F\u0440\u043E\u0434\u0430\u0436", widths: [6, 12], defaultWidth: 12 },
  { id: "clock", title: "\u0423\u0447\u0451\u0442 \u0440\u0430\u0431\u043E\u0447\u0435\u0433\u043E \u0432\u0440\u0435\u043C\u0435\u043D\u0438", widths: [6, 12], defaultWidth: 12 },
  { id: "funnel", title: "\u041F\u0440\u043E\u0434\u0430\u0436\u0438 \u043F\u043E \u044D\u0442\u0430\u043F\u0430\u043C", widths: [4, 6, 12], defaultWidth: 6 },
  { id: "interactions", title: "\u041F\u043E\u0441\u043B\u0435\u0434\u043D\u0438\u0435 \u043A\u043E\u043D\u0442\u0430\u043A\u0442\u044B", widths: [4, 6, 12], defaultWidth: 6 },
  { id: "shortcuts", title: "\u0420\u0430\u0431\u043E\u0447\u0438\u0435 \u0440\u0430\u0437\u0434\u0435\u043B\u044B", widths: [6, 12], defaultWidth: 12 }
];
const DAY_WIDGET_WIDTH_LABELS = { 4: "\u2153 \u0441\u0442\u0440\u043E\u043A\u0438", 6: "\xBD \u0441\u0442\u0440\u043E\u043A\u0438", 8: "\u2154 \u0441\u0442\u0440\u043E\u043A\u0438", 12: "\u0412\u0441\u044F \u0441\u0442\u0440\u043E\u043A\u0430" };
function createDefaultDayWidgets() {
  return DAY_WIDGETS.map((widget) => ({ id: widget.id, width: widget.defaultWidth, visible: true }));
}
function sanitizeDayWidgetLayout(value) {
  const result = [], seen = /* @__PURE__ */ new Set();
  for (const item of Array.isArray(value) ? value.slice(0, 100) : []) {
    if (!item || typeof item !== "object") continue;
    const definition = DAY_WIDGETS.find((widget) => widget.id === item.id);
    if (!definition || seen.has(definition.id)) continue;
    seen.add(definition.id);
    result.push({ id: definition.id, width: definition.widths.includes(item.width) ? item.width : definition.defaultWidth, visible: typeof item.visible === "boolean" ? item.visible : true });
  }
  for (const widget of createDefaultDayWidgets()) if (!seen.has(widget.id)) result.push(widget);
  return result;
}
function encodeDayWidgetSettings(layout) {
  return JSON.stringify({ version: 1, widgets: sanitizeDayWidgetLayout(layout) });
}

// components/crm/CrmDayWidget.vue?vue&type=script&setup=true&lang.ts
var CrmDayWidget_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "CrmDayWidget",
	__ssrInlineRender: true,
	props: {
		id: {},
		width: {},
		editing: { type: Boolean },
		first: { type: Boolean },
		last: { type: Boolean },
		dragging: { type: Boolean },
		pending: { type: Boolean }
	},
	emits: [
		"move",
		"width",
		"hide",
		"startDrag",
		"endDrag",
		"dropWidget"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const definition = computed(() => DAY_WIDGETS.find((widget) => widget.id === props.id));
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<section${ssrRenderAttrs(mergeProps({
				class: ["crm-day-widget", {
					"crm-day-widget--editing": __props.editing,
					"crm-day-widget--dragging": __props.dragging
				}],
				"data-day-widget": __props.id,
				"data-width": __props.width,
				style: { "--day-widget-span": __props.width }
			}, _attrs))}>`);
			if (__props.editing) {
				_push(`<div class="crm-day-widget-tools"${ssrRenderAttr("aria-label", `Настройка виджета ${unref(definition).title}`)}><button class="crm-button crm-button--icon crm-widget-handle crm-day-widget-grip" type="button" draggable="true"${ssrRenderAttr("aria-label", `Переместить ${unref(definition).title}. Используйте стрелки вверх и вниз`)} title="Перетащите или используйте кнопки перемещения">`);
				_push(ssrRenderComponent(unref(GripVertical), { size: 18 }, null, _parent));
				_push(`</button><span class="crm-day-widget-label">${ssrInterpolate(unref(definition).title)}</span><div class="crm-day-widget-tool-actions"><label class="crm-day-widget-size"><span class="sr-only">Ширина: ${ssrInterpolate(unref(definition).title)}</span><select class="crm-input"${ssrRenderAttr("value", __props.width)}${ssrRenderAttr("aria-label", `Ширина: ${unref(definition).title}`)}><!--[-->`);
				ssrRenderList(unref(definition).widths, (size) => {
					_push(`<option${ssrRenderAttr("value", size)}>${ssrInterpolate(unref(DAY_WIDGET_WIDTH_LABELS)[size])}</option>`);
				});
				_push(`<!--]--></select></label><button class="crm-button crm-button--icon" type="button"${ssrIncludeBooleanAttr(__props.first) ? " disabled" : ""}${ssrRenderAttr("aria-label", `Выше: ${unref(definition).title}`)}>`);
				_push(ssrRenderComponent(unref(ArrowUp), { size: 18 }, null, _parent));
				_push(`</button><button class="crm-button crm-button--icon" type="button"${ssrIncludeBooleanAttr(__props.last) ? " disabled" : ""}${ssrRenderAttr("aria-label", `Ниже: ${unref(definition).title}`)}>`);
				_push(ssrRenderComponent(unref(ArrowDown), { size: 18 }, null, _parent));
				_push(`</button><button class="crm-button crm-button--icon" type="button"${ssrRenderAttr("aria-label", `Скрыть: ${unref(definition).title}`)}>`);
				_push(ssrRenderComponent(unref(EyeOff), { size: 18 }, null, _parent));
				_push(`</button></div></div>`);
			} else _push(`<!---->`);
			if (__props.pending) _push(`<p class="crm-day-widget-pending">Содержимое загрузится после сохранения настройки.</p>`);
			else {
				_push(`<div class="crm-day-widget-content"${ssrIncludeBooleanAttr(__props.editing || void 0) ? " inert" : ""}>`);
				ssrRenderSlot(_ctx.$slots, "default", {}, null, _push, _parent);
				_push(`</div>`);
			}
			_push(`</section>`);
		};
	}
});
// components/crm/CrmDayWidget.vue
var _sfc_setup$1 = CrmDayWidget_vue_vue_type_script_setup_true_lang_default.setup;
CrmDayWidget_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/crm/CrmDayWidget.vue");
	return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
var CrmDayWidget_default = Object.assign(CrmDayWidget_vue_vue_type_script_setup_true_lang_default, { __name: "CrmDayWidget" });
// composables/useCrmDayWidgets.ts
/** Employee display preferences are local to this browser; business data never enters storage. */
function useCrmDayWidgets(allowed) {
	const session = useWorkspaceSession();
	const access = useWorkspaceAccess();
	const saved = ref(createDefaultDayWidgets());
	const draft = ref(createDefaultDayWidgets());
	const editing = ref(false), ready = ref(false), notice = ref(""), storageWarning = ref("");
	let owner = "", externalChange = false, lastAllowed = null;
	const identity = () => `${session.user.value?.id || ""}:${session.generation.value}`;
	const storageKey = () => session.user.value?.id ? `sarkisian-crm-day-widgets:v1:${encodeURIComponent(session.user.value.id)}` : null;
	const current = computed(() => editing.value ? draft.value : saved.value);
	const available = computed(() => ready.value ? current.value.filter((widget) => allowed.value.includes(widget.id)) : []);
	const visible = computed(() => available.value.filter((widget) => widget.visible));
	const hidden = computed(() => available.value.filter((widget) => !widget.visible));
	const dirty = computed(() => editing.value && encodeDayWidgetSettings(saved.value) !== encodeDayWidgetSettings(draft.value));
	function hydrate() {}
	function begin() {
		if (!ready.value) return;
		draft.value = sanitizeDayWidgetLayout(saved.value);
		editing.value = true;
		notice.value = "";
	}
	function cancel() {
		if (externalChange) owner = "";
		else {
			draft.value = sanitizeDayWidgetLayout(saved.value);
			editing.value = false;
		}
		notice.value = "Изменения отменены.";
	}
	function reset() {
		if (!editing.value) return;
		draft.value = createDefaultDayWidgets();
		notice.value = "Стандартный вид восстановлен в черновике. Нажмите «Сохранить» или отмените изменения.";
	}
	function save() {
		if (!editing.value || !ready.value || owner !== identity()) return;
		const next = sanitizeDayWidgetLayout(draft.value), key = storageKey();
		let persisted = false;
		try {
			if (key) {
				const encoded = encodeDayWidgetSettings(next);
				localStorage.setItem(key, encoded);
				persisted = localStorage.getItem(key) === encoded;
			}
		} catch {}
		saved.value = next;
		draft.value = sanitizeDayWidgetLayout(next);
		editing.value = false;
		externalChange = false;
		storageWarning.value = persisted ? "" : "Браузер не разрешил сохранить настройки. Изменения применены до закрытия страницы и могут исчезнуть после перезагрузки.";
		notice.value = persisted ? "Вид сохранён для вашего аккаунта в этом браузере." : "Вид применён на этой странице.";
	}
	function setWidth(id, width) {
		if (!editing.value || !allowed.value.includes(id)) return;
		if (!DAY_WIDGETS.find((widget) => widget.id === id)?.widths.includes(width)) return;
		draft.value = draft.value.map((widget) => widget.id === id ? {
			...widget,
			width
		} : widget);
	}
	function setVisible(id, value) {
		if (!editing.value || !allowed.value.includes(id)) return;
		draft.value = draft.value.map((widget) => widget.id === id ? {
			...widget,
			visible: value
		} : widget);
	}
	function move(id, direction) {
		if (!editing.value) return;
		const items = available.value.filter((widget) => widget.visible), other = items[items.findIndex((widget) => widget.id === id) + direction];
		if (!other) return;
		const copy = [...draft.value], from = copy.findIndex((widget) => widget.id === id), to = copy.findIndex((widget) => widget.id === other.id);
		[copy[from], copy[to]] = [copy[to], copy[from]];
		draft.value = copy;
		notice.value = `Виджет «${DAY_WIDGETS.find((widget) => widget.id === id)?.title}» перемещён ${direction < 0 ? "выше" : "ниже"}.`;
	}
	function reorder(source, target) {
		if (!editing.value || source === target || !allowed.value.includes(source) || !allowed.value.includes(target)) return;
		const next = [...draft.value], from = next.findIndex((widget) => widget.id === source), to = next.findIndex((widget) => widget.id === target);
		if (from < 0 || to < 0) return;
		const [item] = next.splice(from, 1);
		next.splice(to, 0, item);
		draft.value = next;
		notice.value = `Положение «${DAY_WIDGETS.find((widget) => widget.id === source)?.title}» изменено.`;
	}
	function isEnabled(id) {
		return ready.value && saved.value.some((widget) => widget.id === id && widget.visible) && allowed.value.includes(id);
	}
	watch([() => session.user.value?.id, session.generation], () => {
		owner = "";
		ready.value = false;
		editing.value = false;
		saved.value = createDefaultDayWidgets();
		draft.value = createDefaultDayWidgets();
	}, { flush: "sync" });
	watch(() => access.ready.value ? allowed.value.join(",") : null, (signature) => {
		if (signature === null) return;
		if (lastAllowed !== null && lastAllowed !== signature && editing.value) {
			draft.value = sanitizeDayWidgetLayout(saved.value);
			editing.value = false;
			notice.value = "Доступные разделы изменились. Несохранённая настройка отменена.";
		}
		lastAllowed = signature;
	}, { immediate: true });
	return {
		ready,
		editing,
		dirty,
		notice,
		storageWarning,
		current,
		available,
		visible,
		hidden,
		saved,
		hydrate,
		begin,
		cancel,
		reset,
		save,
		setWidth,
		setVisible,
		move,
		reorder,
		isEnabled
	};
}
// pages/crm/index.vue?vue&type=script&setup=true&lang.ts
var index_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "index",
	__ssrInlineRender: true,
	setup(__props) {
		useHead({ title: "Мой день — SARKISIAN CRM" });
		const session = useWorkspaceSession();
		const access = useWorkspaceAccess();
		const { can } = access;
		const widgets = useCrmDayWidgets(computed(() => DAY_WIDGETS.filter((widget) => widget.id === "calendar" ? can("meetings.read") : widget.id === "clock" ? can("work_time.read") : widget.id === "queue" ? can("crm.read") || can("meetings.read") : can("crm.read")).map((widget) => widget.id)));
		const draggedWidget = ref(null);
		watch(widgets.editing, (editing) => {
			if (!editing) draggedWidget.value = null;
		});
		function moveWidget(id, direction) {
			widgets.move(id, direction);
			nextTick(() => (void 0).querySelector(`[data-day-widget="${id}"] .crm-day-widget-grip`)?.focus());
		}
		function startWidgetDrag(id, event) {
			if (!widgets.editing.value || !event.dataTransfer) return;
			draggedWidget.value = id;
			event.dataTransfer.effectAllowed = "move";
			event.dataTransfer.setData("text/x-sarkisian-day-widget", id);
		}
		function dropWidget(id) {
			if (draggedWidget.value) widgets.reorder(draggedWidget.value, id);
			draggedWidget.value = null;
		}
		const dashboard = ref(null);
		const tasks = ref([]);
		const meetings = ref([]);
		const meetingTotal = ref(0);
		const dashboardError = ref("");
		const tasksError = ref("");
		const meetingsError = ref("");
		const dashboardLoading = ref(true);
		const tasksLoading = ref(true);
		const meetingsLoading = ref(true);
		const clientReady = ref(false);
		const now = ref(/* @__PURE__ */ new Date());
		const loading = computed(() => dashboardLoading.value || tasksLoading.value || meetingsLoading.value);
		const today = computed(() => calendarDay(now.value));
		const dayLabel = computed(() => now.value.toLocaleDateString("ru-RU", {
			weekday: "long",
			day: "numeric",
			month: "long"
		}));
		const monthLabel = computed(() => now.value.toLocaleDateString("ru-RU", { month: "long" }));
		const taskStatus = {
			BACKLOG: "В очереди",
			TODO: "Запланирована",
			IN_PROGRESS: "В работе",
			REVIEW: "На проверке",
			OVERDUE: "Просрочена",
			DONE: "Выполнена",
			CANCELLED: "В архиве"
		};
		const money = (value) => new Intl.NumberFormat("ru-RU", {
			style: "currency",
			currency: "RUB",
			maximumFractionDigits: 0
		}).format(Number(value || 0));
		const person = (user) => [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email || "Не назначен";
		const validDate = (value) => {
			const date = value ? new Date(value) : null;
			return date && Number.isFinite(date.getTime()) ? date : null;
		};
		const isLate = (task) => task.status === "OVERDUE" || Boolean(validDate(task.dueDate) && validDate(task.dueDate).getTime() < now.value.getTime());
		const activeTasks = computed(() => tasks.value.filter((task) => !["DONE", "CANCELLED"].includes(task.status)));
		const overdueCount = computed(() => activeTasks.value.filter(isLate).length);
		const dueTodayCount = computed(() => activeTasks.value.filter((task) => {
			const date = validDate(task.dueDate);
			return date && calendarDay(date) === today.value;
		}).length);
		const invitationMeetings = computed(() => meetings.value.filter((meeting) => meeting.canRespond && !["ACCEPTED", "DECLINED"].includes(meeting.myResponse || "")));
		const timeLabel = (value) => validDate(value)?.toLocaleTimeString("ru-RU", {
			hour: "2-digit",
			minute: "2-digit"
		}) || "—";
		function dueLabel(task) {
			const date = validDate(task.dueDate);
			if (!date) return "Без срока";
			return calendarDay(date) === today.value ? `Сегодня, ${timeLabel(task.dueDate)}` : date.toLocaleDateString("ru-RU", {
				day: "numeric",
				month: "short"
			});
		}
		const queue = computed(() => [...activeTasks.value.map((task) => ({
			id: `task-${task.id}`,
			kind: "task",
			title: task.title,
			description: `${person(task.assignedTo)} · ${taskStatus[task.status] || "Задача"}`,
			note: dueLabel(task),
			late: isLate(task),
			order: isLate(task) ? 0 : 1,
			due: validDate(task.dueDate)?.getTime() || Infinity,
			to: {
				path: "/crm/tasks",
				query: { task: task.id }
			},
			action: "Открыть"
		})), ...invitationMeetings.value.map((meeting) => ({
			id: `meeting-${meeting.id}`,
			kind: "meeting",
			title: `Подтвердить участие: ${meeting.title}`,
			description: `${timeLabel(meeting.startsAt)} · ${meeting.location || (meeting.meetingUrl ? "Онлайн-встреча" : "Место не указано")}`,
			note: "Приглашение",
			late: false,
			order: 1,
			due: validDate(meeting.startsAt)?.getTime() || Infinity,
			to: {
				path: "/crm/meetings",
				query: { meeting: meeting.id }
			},
			action: "Ответить"
		}))].sort((a, b) => a.order - b.order || a.due - b.due || a.id.localeCompare(b.id)));
		const visibleQueue = computed(() => queue.value.slice(0, 6));
		const funnelMax = computed(() => Math.max(1, ...(dashboard.value?.funnel || []).map((stage) => Number(stage.count) || 0)));
		const week = computed(() => {
			const start = new Date(now.value.getFullYear(), now.value.getMonth(), now.value.getDate() - (now.value.getDay() + 6) % 7);
			return Array.from({ length: 7 }, (_, index) => {
				const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index);
				return {
					key: calendarDay(date),
					date: date.getDate(),
					weekday: date.toLocaleDateString("ru-RU", { weekday: "short" }),
					label: date.toLocaleDateString("ru-RU", {
						weekday: "long",
						day: "numeric",
						month: "long"
					})
				};
			});
		});
		function responseLabel(meeting) {
			if (meeting.myResponse === "DECLINED") return "Вы не участвуете";
			if (meeting.canRespond && meeting.myResponse !== "ACCEPTED") return "Нужен ваш ответ";
			if (meeting.responses) return `Участвуют ${meeting.responses.accepted + 1} из ${meeting.members.length + 1}`;
			return meeting.myResponse === "ACCEPTED" ? "Вы участвуете" : "Вы организатор";
		}
		function duration(meeting) {
			const start = validDate(meeting.startsAt), end = validDate(meeting.endsAt);
			return start && end ? `${Math.round((end.getTime() - start.getTime()) / 6e4)} мин` : "";
		}
		function clear() {
			dashboard.value = null;
			tasks.value = [];
			meetings.value = [];
			meetingTotal.value = 0;
			dashboardError.value = "";
			tasksError.value = "";
			meetingsError.value = "";
			dashboardLoading.value = false;
			tasksLoading.value = false;
			meetingsLoading.value = false;
		}
		async function load() {
			await access.ensure();
		}
		watch(() => [
			session.generation.value,
			access.ready.value,
			can("crm.read"),
			can("meetings.read")
		], () => {
			clear();
		});
		watch(() => widgets.saved.value.filter((widget) => widget.visible).map((widget) => widget.id).sort().join(","), () => {
			clear();
		});
		onBeforeRouteLeave(() => !widgets.dirty.value || (void 0).confirm("Изменения вида рабочего стола не сохранены. Выйти без сохранения?"));
		return (_ctx, _push, _parent, _attrs) => {
			const _component_NuxtLink = NuxtLink;
			const _component_CrmDayWidget = CrmDayWidget_default;
			const _component_CrmWorkClock = CrmWorkClock_default;
			_push(`<main${ssrRenderAttrs(mergeProps({ class: "crm-main crm-day-page" }, _attrs))}><header class="crm-day-head"><div><h1>Мой день</h1>`);
			if (unref(clientReady)) _push(`<p class="crm-day-date">${ssrInterpolate(unref(dayLabel))} · всё важное для вашей работы</p>`);
			else _push(`<!---->`);
			_push(`</div><div class="crm-day-head-actions"><button class="crm-button crm-button--icon"${ssrIncludeBooleanAttr(unref(loading)) ? " disabled" : ""} aria-label="Обновить рабочий стол" title="Обновить рабочий стол">`);
			_push(ssrRenderComponent(unref(RefreshCw), {
				size: 18,
				class: { "crm-day-refreshing": unref(loading) }
			}, null, _parent));
			_push(`</button>`);
			if (unref(access).ready.value && !unref(widgets).editing.value) {
				_push(`<button class="crm-button crm-day-customize">`);
				_push(ssrRenderComponent(unref(SlidersHorizontal), { size: 18 }, null, _parent));
				_push(`Настроить вид</button>`);
			} else _push(`<!---->`);
			if (unref(can)("crm.write")) {
				_push(`<details class="crm-day-create"><summary class="crm-button crm-button--primary">Создать `);
				_push(ssrRenderComponent(unref(Plus), { size: 18 }, null, _parent));
				_push(`</summary><nav aria-label="Создание в CRM">`);
				if (unref(can)("crm.write")) _push(ssrRenderComponent(_component_NuxtLink, { to: "/crm/tasks?create=1" }, {
					default: withCtx((_, _push, _parent, _scopeId) => {
						if (_push) {
							_push(ssrRenderComponent(unref(ListTodo), { size: 18 }, null, _parent, _scopeId));
							_push(`Задачу`);
						} else return [createVNode(unref(ListTodo), { size: 18 }), createTextVNode("Задачу")];
					}),
					_: 1
				}, _parent));
				else _push(`<!---->`);
				if (unref(can)("crm.write")) _push(ssrRenderComponent(_component_NuxtLink, { to: "/crm/deals?create=1" }, {
					default: withCtx((_, _push, _parent, _scopeId) => {
						if (_push) {
							_push(ssrRenderComponent(unref(Kanban), { size: 18 }, null, _parent, _scopeId));
							_push(`Сделку`);
						} else return [createVNode(unref(Kanban), { size: 18 }), createTextVNode("Сделку")];
					}),
					_: 1
				}, _parent));
				else _push(`<!---->`);
				_push(`</nav></details>`);
			} else _push(`<!---->`);
			_push(`</div></header>`);
			if (unref(access).error.value) {
				_push(`<div class="crm-day-notice" role="alert">`);
				_push(ssrRenderComponent(unref(AlertTriangle), { size: 20 }, null, _parent));
				_push(`<p>${ssrInterpolate(unref(access).error.value)}</p><button class="crm-button">Повторить</button></div>`);
			} else if (unref(access).ready.value) {
				_push(`<!--[-->`);
				if (unref(widgets).editing.value) {
					_push(`<section class="crm-day-editor" aria-labelledby="crm-day-editor-title"><div class="crm-day-editor-heading"><div><h2 id="crm-day-editor-title">Настройте свой рабочий стол</h2><p>Перетаскивайте виджеты за ручку, используйте кнопки выше/ниже или Alt + стрелки на ручке. Ширина применяется на компьютере; на телефоне виджеты идут друг под другом.</p><p>Настройки сохраняются для вашего аккаунта только в этом браузере.</p></div><div class="crm-day-editor-actions"><button class="crm-button">Стандартный вид</button><button class="crm-button">Отмена</button><button class="crm-button crm-button--primary">Сохранить</button></div></div><details class="crm-day-widget-catalog" open><summary>Виджеты рабочего стола</summary><div><!--[-->`);
					ssrRenderList(unref(widgets).available.value, (widget) => {
						_push(`<label><input class="crm-check" type="checkbox"${ssrIncludeBooleanAttr(widget.visible) ? " checked" : ""}><span>${ssrInterpolate(unref(DAY_WIDGETS).find((definition) => definition.id === widget.id)?.title)}</span></label>`);
					});
					_push(`<!--]--></div></details></section>`);
				} else _push(`<!---->`);
				if (unref(widgets).storageWarning.value) _push(`<p class="crm-day-layout-warning" role="alert">${ssrInterpolate(unref(widgets).storageWarning.value)}</p>`);
				else _push(`<!---->`);
				if (unref(widgets).notice.value) _push(`<p class="crm-day-layout-notice" role="status" aria-live="polite">${ssrInterpolate(unref(widgets).notice.value)}</p>`);
				else _push(`<!---->`);
				if (!unref(widgets).ready.value) _push(`<p class="crm-day-placeholder" role="status">Загружаем вид рабочего стола…</p>`);
				else if (unref(widgets).visible.value.length) {
					_push(`<div class="${ssrRenderClass([{ "crm-day-widgets--editing": unref(widgets).editing.value }, "crm-day-widgets"])}"><!--[-->`);
					ssrRenderList(unref(widgets).visible.value, (widget, index) => {
						_push(ssrRenderComponent(_component_CrmDayWidget, {
							key: widget.id,
							id: widget.id,
							width: widget.width,
							editing: unref(widgets).editing.value,
							first: index === 0,
							last: index === unref(widgets).visible.value.length - 1,
							dragging: unref(draggedWidget) === widget.id,
							pending: unref(widgets).editing.value && !unref(widgets).isEnabled(widget.id),
							onMove: ($event) => moveWidget(widget.id, $event),
							onWidth: ($event) => unref(widgets).setWidth(widget.id, $event),
							onHide: ($event) => unref(widgets).setVisible(widget.id, false),
							onStartDrag: ($event) => startWidgetDrag(widget.id, $event),
							onEndDrag: ($event) => draggedWidget.value = null,
							onDropWidget: ($event) => dropWidget(widget.id)
						}, {
							default: withCtx((_, _push, _parent, _scopeId) => {
								if (_push) {
									if (widget.id === "queue") {
										_push(`<!--[-->`);
										if (unref(can)("crm.read") || unref(can)("meetings.read")) {
											_push(`<section class="crm-day-queue" aria-labelledby="crm-day-queue-title"${ssrRenderAttr("aria-busy", unref(tasksLoading) || unref(meetingsLoading))}${_scopeId}><header class="crm-day-section-head"${_scopeId}><h2 id="crm-day-queue-title"${_scopeId}>Требует внимания `);
											if (!unref(tasksLoading) && !unref(meetingsLoading)) _push(`<span class="crm-day-count"${_scopeId}>${ssrInterpolate(unref(queue).length)}</span>`);
											else _push(`<!---->`);
											_push(`</h2><span class="crm-day-scope"${_scopeId}>Задачи и приглашения</span></header>`);
											if (unref(tasksError)) {
												_push(`<div class="crm-day-notice" role="alert"${_scopeId}>`);
												_push(ssrRenderComponent(unref(AlertTriangle), { size: 18 }, null, _parent, _scopeId));
												_push(`<p${_scopeId}>${ssrInterpolate(unref(tasksError))}</p><button class="crm-button"${_scopeId}>Повторить</button></div>`);
											} else _push(`<!---->`);
											if (unref(meetingsError) && !unref(widgets).isEnabled("calendar")) {
												_push(`<div class="crm-day-notice" role="alert"${_scopeId}>`);
												_push(ssrRenderComponent(unref(AlertTriangle), { size: 18 }, null, _parent, _scopeId));
												_push(`<p${_scopeId}>Не удалось обновить приглашения: ${ssrInterpolate(unref(meetingsError))}</p><button class="crm-button"${_scopeId}>Повторить</button></div>`);
											} else _push(`<!---->`);
											if (unref(visibleQueue).length) {
												_push(`<div class="crm-day-queue-items"${_scopeId}><!--[-->`);
												ssrRenderList(unref(visibleQueue), (item, index) => {
													_push(`<article class="${ssrRenderClass([{ "crm-day-action--late": item.late }, "crm-day-action"])}"${_scopeId}><span class="crm-day-action-icon"${_scopeId}>`);
													if (item.kind === "meeting") _push(ssrRenderComponent(unref(CalendarDays), { size: 18 }, null, _parent, _scopeId));
													else if (item.late) _push(ssrRenderComponent(unref(AlertTriangle), { size: 18 }, null, _parent, _scopeId));
													else _push(ssrRenderComponent(unref(ClipboardList), { size: 18 }, null, _parent, _scopeId));
													_push(`</span><div class="crm-day-action-copy"${_scopeId}><h3${_scopeId}>${ssrInterpolate(item.title)}</h3><p${_scopeId}>${ssrInterpolate(item.description)}</p></div><div class="crm-day-action-target"${_scopeId}>`);
													_push(ssrRenderComponent(_component_NuxtLink, {
														to: item.to,
														class: ["crm-button", index === 0 ? "crm-button--primary" : "crm-button--text"],
														"aria-label": `${item.action}: ${item.title}`
													}, {
														default: withCtx((_, _push, _parent, _scopeId) => {
															if (_push) {
																_push(`${ssrInterpolate(item.action)}`);
																_push(ssrRenderComponent(unref(ArrowRight), { size: 16 }, null, _parent, _scopeId));
															} else return [createTextVNode(toDisplayString(item.action), 1), createVNode(unref(ArrowRight), { size: 16 })];
														}),
														_: 2
													}, _parent, _scopeId));
													_push(`<span class="${ssrRenderClass({ "crm-day-late": item.late })}"${_scopeId}>${ssrInterpolate(item.note)}</span></div></article>`);
												});
												_push(`<!--]--></div>`);
											} else if (unref(tasksLoading) || unref(meetingsLoading)) _push(`<p class="crm-day-placeholder" role="status"${_scopeId}>Собираем ближайшие задачи и приглашения…</p>`);
											else if (!unref(tasksError) && !unref(meetingsError)) {
												_push(`<div class="crm-day-empty"${_scopeId}>`);
												_push(ssrRenderComponent(unref(CheckCircle2), { size: 28 }, null, _parent, _scopeId));
												_push(`<h3${_scopeId}>Всё под контролем</h3><p${_scopeId}>Нет активных задач и приглашений, ожидающих ответа.</p>`);
												if (unref(can)("crm.write")) _push(ssrRenderComponent(_component_NuxtLink, {
													to: "/crm/tasks?create=1",
													class: "crm-button"
												}, {
													default: withCtx((_, _push, _parent, _scopeId) => {
														if (_push) _push(`Запланировать задачу`);
														else return [createTextVNode("Запланировать задачу")];
													}),
													_: 2
												}, _parent, _scopeId));
												else _push(`<!---->`);
												_push(`</div>`);
											} else _push(`<p class="crm-day-placeholder"${_scopeId}>Список действий загружен не полностью. Повторите загрузку недоступного раздела.</p>`);
											_push(`<footer class="crm-day-queue-footer"${_scopeId}>`);
											if (unref(can)("crm.read") && !unref(tasksLoading) && !unref(tasksError)) _push(`<span${_scopeId}>Просрочено: ${ssrInterpolate(unref(overdueCount))} · на сегодня: ${ssrInterpolate(unref(dueTodayCount))}</span>`);
											else _push(`<!---->`);
											if (unref(can)("crm.read")) _push(ssrRenderComponent(_component_NuxtLink, {
												to: "/crm/tasks",
												class: "crm-button crm-button--text"
											}, {
												default: withCtx((_, _push, _parent, _scopeId) => {
													if (_push) {
														_push(`Все задачи`);
														_push(ssrRenderComponent(unref(ArrowUpRight), { size: 16 }, null, _parent, _scopeId));
													} else return [createTextVNode("Все задачи"), createVNode(unref(ArrowUpRight), { size: 16 })];
												}),
												_: 2
											}, _parent, _scopeId));
											else _push(`<!---->`);
											_push(`</footer></section>`);
										} else _push(`<!---->`);
										_push(`<!--]-->`);
									} else _push(`<!---->`);
									if (widget.id === "calendar") {
										_push(`<!--[-->`);
										if (unref(can)("meetings.read")) {
											_push(`<aside class="crm-day-agenda" aria-labelledby="crm-day-agenda-title"${ssrRenderAttr("aria-busy", unref(meetingsLoading))}${_scopeId}><header class="crm-day-section-head"${_scopeId}><h2 id="crm-day-agenda-title"${_scopeId}>В календаре</h2>`);
											_push(ssrRenderComponent(_component_NuxtLink, {
												to: "/crm/meetings",
												class: "crm-button crm-button--icon",
												"aria-label": "Открыть календарь событий"
											}, {
												default: withCtx((_, _push, _parent, _scopeId) => {
													if (_push) _push(ssrRenderComponent(unref(ArrowUpRight), { size: 18 }, null, _parent, _scopeId));
													else return [createVNode(unref(ArrowUpRight), { size: 18 })];
												}),
												_: 2
											}, _parent, _scopeId));
											_push(`</header><div class="crm-day-week" aria-label="Текущая неделя"${_scopeId}><!--[-->`);
											ssrRenderList(unref(week), (day) => {
												_push(`<div class="${ssrRenderClass({ current: day.key === unref(today) })}"${ssrRenderAttr("aria-current", day.key === unref(today) ? "date" : void 0)}${ssrRenderAttr("title", day.label)}${_scopeId}><span${_scopeId}>${ssrInterpolate(day.weekday)}</span><strong${_scopeId}>${ssrInterpolate(day.date)}</strong></div>`);
											});
											_push(`<!--]--></div>`);
											if (unref(meetingsError)) {
												_push(`<div class="crm-day-notice" role="alert"${_scopeId}>`);
												_push(ssrRenderComponent(unref(AlertTriangle), { size: 18 }, null, _parent, _scopeId));
												_push(`<p${_scopeId}>${ssrInterpolate(unref(meetingsError))}</p><button class="crm-button"${_scopeId}>Повторить</button></div>`);
											} else if (unref(meetingsLoading)) _push(`<p class="crm-day-placeholder" role="status"${_scopeId}>Загружаем встречи на сегодня…</p>`);
											else if (unref(meetings).length) {
												_push(`<div class="crm-day-meetings"${_scopeId}><!--[-->`);
												ssrRenderList(unref(meetings).slice(0, 4), (meeting) => {
													_push(ssrRenderComponent(_component_NuxtLink, {
														key: meeting.id,
														to: {
															path: "/crm/meetings",
															query: { meeting: meeting.id }
														},
														class: "crm-day-meeting"
													}, {
														default: withCtx((_, _push, _parent, _scopeId) => {
															if (_push) _push(`<div class="crm-day-meeting-time"${_scopeId}><strong${_scopeId}>${ssrInterpolate(timeLabel(meeting.startsAt))}</strong><span${_scopeId}>${ssrInterpolate(duration(meeting))}</span></div><div class="crm-day-meeting-copy"${_scopeId}><h3${_scopeId}>${ssrInterpolate(meeting.title)}</h3><p${_scopeId}>${ssrInterpolate(meeting.location || (meeting.meetingUrl ? "Онлайн-встреча" : "Место не указано"))}</p><span class="${ssrRenderClass({ pending: meeting.canRespond && !["ACCEPTED", "DECLINED"].includes(meeting.myResponse || "") })}"${_scopeId}>${ssrInterpolate(responseLabel(meeting))}</span></div>`);
															else return [createVNode("div", { class: "crm-day-meeting-time" }, [createVNode("strong", null, toDisplayString(timeLabel(meeting.startsAt)), 1), createVNode("span", null, toDisplayString(duration(meeting)), 1)]), createVNode("div", { class: "crm-day-meeting-copy" }, [
																createVNode("h3", null, toDisplayString(meeting.title), 1),
																createVNode("p", null, toDisplayString(meeting.location || (meeting.meetingUrl ? "Онлайн-встреча" : "Место не указано")), 1),
																createVNode("span", { class: { pending: meeting.canRespond && !["ACCEPTED", "DECLINED"].includes(meeting.myResponse || "") } }, toDisplayString(responseLabel(meeting)), 3)
															])];
														}),
														_: 2
													}, _parent, _scopeId));
												});
												_push(`<!--]-->`);
												if (unref(meetingTotal) > 4) _push(`<p class="crm-day-more"${_scopeId}>Всего на сегодня: ${ssrInterpolate(unref(meetingTotal))}. Все события — в календаре.</p>`);
												else _push(`<!---->`);
												_push(`</div>`);
											} else {
												_push(`<div class="crm-day-agenda-empty"${_scopeId}>`);
												_push(ssrRenderComponent(unref(CalendarDays), { size: 24 }, null, _parent, _scopeId));
												_push(`<p${_scopeId}>На сегодня встреч нет</p><span${_scopeId}>Свободное время для ваших задач.</span></div>`);
											}
											_push(ssrRenderComponent(_component_NuxtLink, {
												to: "/crm/meetings",
												class: "crm-button crm-day-calendar-link"
											}, {
												default: withCtx((_, _push, _parent, _scopeId) => {
													if (_push) _push(`Открыть календарь`);
													else return [createTextVNode("Открыть календарь")];
												}),
												_: 2
											}, _parent, _scopeId));
											_push(`</aside>`);
										} else _push(`<!---->`);
										_push(`<!--]-->`);
									} else _push(`<!---->`);
									if (widget.id === "results") {
										_push(`<!--[-->`);
										if (unref(can)("crm.read")) {
											_push(`<section class="crm-day-results" aria-labelledby="crm-day-results-title"${ssrRenderAttr("aria-busy", unref(dashboardLoading))}${_scopeId}><header class="crm-day-section-head"${_scopeId}><h2 id="crm-day-results-title"${_scopeId}>Результаты · ${ssrInterpolate(unref(monthLabel))}</h2>`);
											_push(ssrRenderComponent(_component_NuxtLink, {
												to: "/crm/deals",
												class: "crm-button crm-button--text"
											}, {
												default: withCtx((_, _push, _parent, _scopeId) => {
													if (_push) {
														_push(`К сделкам`);
														_push(ssrRenderComponent(unref(ArrowUpRight), { size: 16 }, null, _parent, _scopeId));
													} else return [createTextVNode("К сделкам"), createVNode(unref(ArrowUpRight), { size: 16 })];
												}),
												_: 2
											}, _parent, _scopeId));
											_push(`</header>`);
											if (unref(dashboardError)) {
												_push(`<div class="crm-day-notice" role="alert"${_scopeId}>`);
												_push(ssrRenderComponent(unref(AlertTriangle), { size: 18 }, null, _parent, _scopeId));
												_push(`<p${_scopeId}>${ssrInterpolate(unref(dashboardError))}</p><button class="crm-button"${_scopeId}>Повторить</button></div>`);
											} else if (unref(dashboardLoading) && !unref(dashboard)) _push(`<p class="crm-day-placeholder" role="status"${_scopeId}>Загружаем показатели продаж…</p>`);
											else if (unref(dashboard)) _push(`<div class="crm-day-result-grid"${_scopeId}><article class="${ssrRenderClass({ "crm-day-metric-wide": money(unref(dashboard).wonMonth?.amount).length > 12 })}"${_scopeId}><h3${_scopeId}>Продано за месяц</h3><strong${_scopeId}>${ssrInterpolate(money(unref(dashboard).wonMonth?.amount))}</strong><p${_scopeId}>${ssrInterpolate(unref(dashboard).wonMonth?.count || 0)} успешных сделок</p></article><article class="${ssrRenderClass({ "crm-day-metric-wide": money(unref(dashboard).forecast).length > 12 })}"${_scopeId}><h3${_scopeId}>Прогноз продаж</h3><strong${_scopeId}>${ssrInterpolate(money(unref(dashboard).forecast))}</strong><p${_scopeId}>Взвешенная сумма открытых сделок</p></article><article${_scopeId}><h3${_scopeId}>Открытые сделки</h3><strong${_scopeId}>${ssrInterpolate(unref(dashboard).openLeads)}</strong><p${_scopeId}>${ssrInterpolate(!unref(can)("customers.read") || unref(dashboard).customersAvailable === false ? "База клиентов недоступна по вашим правам" : `${unref(dashboard).customers} клиентов в единой базе`)}</p></article><article${_scopeId}><h3${_scopeId}>Контроль задач</h3><strong class="${ssrRenderClass({ "crm-day-late": unref(dashboard).overdueTasks })}"${_scopeId}>${ssrInterpolate(unref(dashboard).overdueTasks)} <span${_scopeId}>просрочено</span></strong><p${_scopeId}>${ssrInterpolate(unref(dashboard).dueToday)} на сегодня</p></article></div>`);
											else _push(`<!---->`);
											_push(`</section>`);
										} else _push(`<!---->`);
										_push(`<!--]-->`);
									} else _push(`<!---->`);
									if (widget.id === "clock") {
										_push(`<!--[-->`);
										if (unref(can)("work_time.read")) {
											_push(`<div class="crm-day-clock"${_scopeId}>`);
											_push(ssrRenderComponent(_component_CrmWorkClock, { compact: "" }, null, _parent, _scopeId));
											_push(`</div>`);
										} else _push(`<!---->`);
										_push(`<!--]-->`);
									} else _push(`<!---->`);
									if (widget.id === "funnel") {
										_push(`<section aria-labelledby="crm-day-funnel-title"${_scopeId}><header class="crm-day-section-head"${_scopeId}><h2 id="crm-day-funnel-title"${_scopeId}>Продажи по этапам</h2>`);
										_push(ssrRenderComponent(_component_NuxtLink, {
											to: "/crm/deals",
											class: "crm-button crm-button--text"
										}, {
											default: withCtx((_, _push, _parent, _scopeId) => {
												if (_push) {
													_push(`Воронка`);
													_push(ssrRenderComponent(unref(ArrowUpRight), { size: 16 }, null, _parent, _scopeId));
												} else return [createTextVNode("Воронка"), createVNode(unref(ArrowUpRight), { size: 16 })];
											}),
											_: 2
										}, _parent, _scopeId));
										_push(`</header>`);
										if (unref(dashboardError)) _push(`<div class="crm-day-notice" role="alert"${_scopeId}><p${_scopeId}>${ssrInterpolate(unref(dashboardError))}</p><button class="crm-button"${_scopeId}>Повторить</button></div>`);
										else if (unref(dashboardLoading) && !unref(dashboard)) _push(`<p class="crm-day-placeholder" role="status"${_scopeId}>Загружаем воронку продаж…</p>`);
										else if (unref(dashboard)?.funnel?.length) {
											_push(`<div class="crm-day-funnel"${_scopeId}><!--[-->`);
											ssrRenderList(unref(dashboard).funnel, (stage) => {
												_push(ssrRenderComponent(_component_NuxtLink, {
													key: stage.id,
													to: "/crm/deals"
												}, {
													default: withCtx((_, _push, _parent, _scopeId) => {
														if (_push) _push(`<span class="crm-day-stage-name"${_scopeId}><i style="${ssrRenderStyle({ background: stage.color })}"${_scopeId}></i>${ssrInterpolate(stage.name)}</span><span class="crm-day-stage-values"${_scopeId}><strong${_scopeId}>${ssrInterpolate(stage.count)}</strong><span${_scopeId}>${ssrInterpolate(money(stage.amount))}</span></span><span class="crm-day-bar"${_scopeId}><i style="${ssrRenderStyle({
															width: `${Math.max(stage.count ? 8 : 0, stage.count / unref(funnelMax) * 100)}%`,
															background: stage.color
														})}"${_scopeId}></i></span>`);
														else return [
															createVNode("span", { class: "crm-day-stage-name" }, [createVNode("i", { style: { background: stage.color } }, null, 4), createTextVNode(toDisplayString(stage.name), 1)]),
															createVNode("span", { class: "crm-day-stage-values" }, [createVNode("strong", null, toDisplayString(stage.count), 1), createVNode("span", null, toDisplayString(money(stage.amount)), 1)]),
															createVNode("span", { class: "crm-day-bar" }, [createVNode("i", { style: {
																width: `${Math.max(stage.count ? 8 : 0, stage.count / unref(funnelMax) * 100)}%`,
																background: stage.color
															} }, null, 4)])
														];
													}),
													_: 2
												}, _parent, _scopeId));
											});
											_push(`<!--]--></div>`);
										} else _push(`<p class="crm-day-placeholder"${_scopeId}>Здесь появятся этапы и суммы сделок после настройки воронки продаж.</p>`);
										_push(`</section>`);
									} else _push(`<!---->`);
									if (widget.id === "interactions") {
										_push(`<section aria-labelledby="crm-day-activity-title"${_scopeId}><header class="crm-day-section-head"${_scopeId}><h2 id="crm-day-activity-title"${_scopeId}>Последние контакты</h2></header>`);
										if (unref(dashboardError)) _push(`<div class="crm-day-notice" role="alert"${_scopeId}><p${_scopeId}>${ssrInterpolate(unref(dashboardError))}</p><button class="crm-button"${_scopeId}>Повторить</button></div>`);
										else if (unref(dashboardLoading) && !unref(dashboard)) _push(`<p class="crm-day-placeholder" role="status"${_scopeId}>Загружаем историю контактов…</p>`);
										else if (unref(dashboard)?.recentInteractions?.length) {
											_push(`<div class="crm-day-interactions"${_scopeId}><!--[-->`);
											ssrRenderList(unref(dashboard).recentInteractions.slice(0, 4), (item) => {
												_push(ssrRenderComponent(_component_NuxtLink, {
													key: item.id,
													to: "/crm/deals"
												}, {
													default: withCtx((_, _push, _parent, _scopeId) => {
														if (_push) {
															_push(ssrRenderComponent(unref(MessageSquareText), { size: 18 }, null, _parent, _scopeId));
															_push(`<div${_scopeId}><h3${_scopeId}>${ssrInterpolate(item.lead?.title || item.lead?.contactName || "Контакт с клиентом")}</h3><p${_scopeId}>${ssrInterpolate(item.content)}</p><span${_scopeId}>${ssrInterpolate(person(item.user))} · ${ssrInterpolate(new Date(item.createdAt).toLocaleString("ru-RU", {
																day: "numeric",
																month: "short",
																hour: "2-digit",
																minute: "2-digit"
															}))}</span></div>`);
														} else return [createVNode(unref(MessageSquareText), { size: 18 }), createVNode("div", null, [
															createVNode("h3", null, toDisplayString(item.lead?.title || item.lead?.contactName || "Контакт с клиентом"), 1),
															createVNode("p", null, toDisplayString(item.content), 1),
															createVNode("span", null, toDisplayString(person(item.user)) + " · " + toDisplayString(new Date(item.createdAt).toLocaleString("ru-RU", {
																day: "numeric",
																month: "short",
																hour: "2-digit",
																minute: "2-digit"
															})), 1)
														])];
													}),
													_: 2
												}, _parent, _scopeId));
											});
											_push(`<!--]--></div>`);
										} else _push(`<p class="crm-day-placeholder"${_scopeId}>История появится после первого звонка, письма или заметки в сделке.</p>`);
										_push(`</section>`);
									} else _push(`<!---->`);
									if (widget.id === "shortcuts") {
										_push(`<!--[-->`);
										if (unref(can)("crm.read")) {
											_push(`<nav class="crm-day-shortcuts" aria-label="Рабочие разделы"${_scopeId}>`);
											_push(ssrRenderComponent(_component_NuxtLink, { to: "/crm/deals" }, {
												default: withCtx((_, _push, _parent, _scopeId) => {
													if (_push) {
														_push(ssrRenderComponent(unref(Kanban), { size: 18 }, null, _parent, _scopeId));
														_push(`Воронка продаж`);
														_push(ssrRenderComponent(unref(ArrowUpRight), { size: 16 }, null, _parent, _scopeId));
													} else return [
														createVNode(unref(Kanban), { size: 18 }),
														createTextVNode("Воронка продаж"),
														createVNode(unref(ArrowUpRight), { size: 16 })
													];
												}),
												_: 2
											}, _parent, _scopeId));
											if (unref(can)("customers.read")) _push(ssrRenderComponent(_component_NuxtLink, { to: "/crm/customers" }, {
												default: withCtx((_, _push, _parent, _scopeId) => {
													if (_push) {
														_push(ssrRenderComponent(unref(ContactRound), { size: 18 }, null, _parent, _scopeId));
														_push(`Клиенты 360°`);
														_push(ssrRenderComponent(unref(ArrowUpRight), { size: 16 }, null, _parent, _scopeId));
													} else return [
														createVNode(unref(ContactRound), { size: 18 }),
														createTextVNode("Клиенты 360°"),
														createVNode(unref(ArrowUpRight), { size: 16 })
													];
												}),
												_: 2
											}, _parent, _scopeId));
											else _push(`<!---->`);
											_push(ssrRenderComponent(_component_NuxtLink, { to: "/crm/tasks" }, {
												default: withCtx((_, _push, _parent, _scopeId) => {
													if (_push) {
														_push(ssrRenderComponent(unref(ListTodo), { size: 18 }, null, _parent, _scopeId));
														_push(`Задачи`);
														_push(ssrRenderComponent(unref(ArrowUpRight), { size: 16 }, null, _parent, _scopeId));
													} else return [
														createVNode(unref(ListTodo), { size: 18 }),
														createTextVNode("Задачи"),
														createVNode(unref(ArrowUpRight), { size: 16 })
													];
												}),
												_: 2
											}, _parent, _scopeId));
											_push(`</nav>`);
										} else _push(`<!---->`);
										_push(`<!--]-->`);
									} else _push(`<!---->`);
								} else return [
									widget.id === "queue" ? (openBlock(), createBlock(Fragment, { key: 0 }, [unref(can)("crm.read") || unref(can)("meetings.read") ? (openBlock(), createBlock("section", {
										key: 0,
										class: "crm-day-queue",
										"aria-labelledby": "crm-day-queue-title",
										"aria-busy": unref(tasksLoading) || unref(meetingsLoading)
									}, [
										createVNode("header", { class: "crm-day-section-head" }, [createVNode("h2", { id: "crm-day-queue-title" }, [createTextVNode("Требует внимания "), !unref(tasksLoading) && !unref(meetingsLoading) ? (openBlock(), createBlock("span", {
											key: 0,
											class: "crm-day-count"
										}, toDisplayString(unref(queue).length), 1)) : createCommentVNode("", true)]), createVNode("span", { class: "crm-day-scope" }, "Задачи и приглашения")]),
										unref(tasksError) ? (openBlock(), createBlock("div", {
											key: 0,
											class: "crm-day-notice",
											role: "alert"
										}, [
											createVNode(unref(AlertTriangle), { size: 18 }),
											createVNode("p", null, toDisplayString(unref(tasksError)), 1),
											createVNode("button", {
												class: "crm-button",
												onClick: load
											}, "Повторить")
										])) : createCommentVNode("", true),
										unref(meetingsError) && !unref(widgets).isEnabled("calendar") ? (openBlock(), createBlock("div", {
											key: 1,
											class: "crm-day-notice",
											role: "alert"
										}, [
											createVNode(unref(AlertTriangle), { size: 18 }),
											createVNode("p", null, "Не удалось обновить приглашения: " + toDisplayString(unref(meetingsError)), 1),
											createVNode("button", {
												class: "crm-button",
												onClick: load
											}, "Повторить")
										])) : createCommentVNode("", true),
										unref(visibleQueue).length ? (openBlock(), createBlock("div", {
											key: 2,
											class: "crm-day-queue-items"
										}, [(openBlock(true), createBlock(Fragment, null, renderList(unref(visibleQueue), (item, index) => {
											return openBlock(), createBlock("article", {
												key: item.id,
												class: ["crm-day-action", { "crm-day-action--late": item.late }]
											}, [
												createVNode("span", { class: "crm-day-action-icon" }, [item.kind === "meeting" ? (openBlock(), createBlock(unref(CalendarDays), {
													key: 0,
													size: 18
												})) : item.late ? (openBlock(), createBlock(unref(AlertTriangle), {
													key: 1,
													size: 18
												})) : (openBlock(), createBlock(unref(ClipboardList), {
													key: 2,
													size: 18
												}))]),
												createVNode("div", { class: "crm-day-action-copy" }, [createVNode("h3", null, toDisplayString(item.title), 1), createVNode("p", null, toDisplayString(item.description), 1)]),
												createVNode("div", { class: "crm-day-action-target" }, [createVNode(_component_NuxtLink, {
													to: item.to,
													class: ["crm-button", index === 0 ? "crm-button--primary" : "crm-button--text"],
													"aria-label": `${item.action}: ${item.title}`
												}, {
													default: withCtx(() => [createTextVNode(toDisplayString(item.action), 1), createVNode(unref(ArrowRight), { size: 16 })]),
													_: 2
												}, 1032, [
													"to",
													"class",
													"aria-label"
												]), createVNode("span", { class: { "crm-day-late": item.late } }, toDisplayString(item.note), 3)])
											], 2);
										}), 128))])) : unref(tasksLoading) || unref(meetingsLoading) ? (openBlock(), createBlock("p", {
											key: 3,
											class: "crm-day-placeholder",
											role: "status"
										}, "Собираем ближайшие задачи и приглашения…")) : !unref(tasksError) && !unref(meetingsError) ? (openBlock(), createBlock("div", {
											key: 4,
											class: "crm-day-empty"
										}, [
											createVNode(unref(CheckCircle2), { size: 28 }),
											createVNode("h3", null, "Всё под контролем"),
											createVNode("p", null, "Нет активных задач и приглашений, ожидающих ответа."),
											unref(can)("crm.write") ? (openBlock(), createBlock(_component_NuxtLink, {
												key: 0,
												to: "/crm/tasks?create=1",
												class: "crm-button"
											}, {
												default: withCtx(() => [createTextVNode("Запланировать задачу")]),
												_: 1
											})) : createCommentVNode("", true)
										])) : (openBlock(), createBlock("p", {
											key: 5,
											class: "crm-day-placeholder"
										}, "Список действий загружен не полностью. Повторите загрузку недоступного раздела.")),
										createVNode("footer", { class: "crm-day-queue-footer" }, [unref(can)("crm.read") && !unref(tasksLoading) && !unref(tasksError) ? (openBlock(), createBlock("span", { key: 0 }, "Просрочено: " + toDisplayString(unref(overdueCount)) + " · на сегодня: " + toDisplayString(unref(dueTodayCount)), 1)) : createCommentVNode("", true), unref(can)("crm.read") ? (openBlock(), createBlock(_component_NuxtLink, {
											key: 1,
											to: "/crm/tasks",
											class: "crm-button crm-button--text"
										}, {
											default: withCtx(() => [createTextVNode("Все задачи"), createVNode(unref(ArrowUpRight), { size: 16 })]),
											_: 1
										})) : createCommentVNode("", true)])
									], 8, ["aria-busy"])) : createCommentVNode("", true)], 64)) : createCommentVNode("", true),
									widget.id === "calendar" ? (openBlock(), createBlock(Fragment, { key: 1 }, [unref(can)("meetings.read") ? (openBlock(), createBlock("aside", {
										key: 0,
										class: "crm-day-agenda",
										"aria-labelledby": "crm-day-agenda-title",
										"aria-busy": unref(meetingsLoading)
									}, [
										createVNode("header", { class: "crm-day-section-head" }, [createVNode("h2", { id: "crm-day-agenda-title" }, "В календаре"), createVNode(_component_NuxtLink, {
											to: "/crm/meetings",
											class: "crm-button crm-button--icon",
											"aria-label": "Открыть календарь событий"
										}, {
											default: withCtx(() => [createVNode(unref(ArrowUpRight), { size: 18 })]),
											_: 1
										})]),
										createVNode("div", {
											class: "crm-day-week",
											"aria-label": "Текущая неделя"
										}, [(openBlock(true), createBlock(Fragment, null, renderList(unref(week), (day) => {
											return openBlock(), createBlock("div", {
												key: day.key,
												class: { current: day.key === unref(today) },
												"aria-current": day.key === unref(today) ? "date" : void 0,
												title: day.label
											}, [createVNode("span", null, toDisplayString(day.weekday), 1), createVNode("strong", null, toDisplayString(day.date), 1)], 10, ["aria-current", "title"]);
										}), 128))]),
										unref(meetingsError) ? (openBlock(), createBlock("div", {
											key: 0,
											class: "crm-day-notice",
											role: "alert"
										}, [
											createVNode(unref(AlertTriangle), { size: 18 }),
											createVNode("p", null, toDisplayString(unref(meetingsError)), 1),
											createVNode("button", {
												class: "crm-button",
												onClick: load
											}, "Повторить")
										])) : unref(meetingsLoading) ? (openBlock(), createBlock("p", {
											key: 1,
											class: "crm-day-placeholder",
											role: "status"
										}, "Загружаем встречи на сегодня…")) : unref(meetings).length ? (openBlock(), createBlock("div", {
											key: 2,
											class: "crm-day-meetings"
										}, [(openBlock(true), createBlock(Fragment, null, renderList(unref(meetings).slice(0, 4), (meeting) => {
											return openBlock(), createBlock(_component_NuxtLink, {
												key: meeting.id,
												to: {
													path: "/crm/meetings",
													query: { meeting: meeting.id }
												},
												class: "crm-day-meeting"
											}, {
												default: withCtx(() => [createVNode("div", { class: "crm-day-meeting-time" }, [createVNode("strong", null, toDisplayString(timeLabel(meeting.startsAt)), 1), createVNode("span", null, toDisplayString(duration(meeting)), 1)]), createVNode("div", { class: "crm-day-meeting-copy" }, [
													createVNode("h3", null, toDisplayString(meeting.title), 1),
													createVNode("p", null, toDisplayString(meeting.location || (meeting.meetingUrl ? "Онлайн-встреча" : "Место не указано")), 1),
													createVNode("span", { class: { pending: meeting.canRespond && !["ACCEPTED", "DECLINED"].includes(meeting.myResponse || "") } }, toDisplayString(responseLabel(meeting)), 3)
												])]),
												_: 2
											}, 1032, ["to"]);
										}), 128)), unref(meetingTotal) > 4 ? (openBlock(), createBlock("p", {
											key: 0,
											class: "crm-day-more"
										}, "Всего на сегодня: " + toDisplayString(unref(meetingTotal)) + ". Все события — в календаре.", 1)) : createCommentVNode("", true)])) : (openBlock(), createBlock("div", {
											key: 3,
											class: "crm-day-agenda-empty"
										}, [
											createVNode(unref(CalendarDays), { size: 24 }),
											createVNode("p", null, "На сегодня встреч нет"),
											createVNode("span", null, "Свободное время для ваших задач.")
										])),
										createVNode(_component_NuxtLink, {
											to: "/crm/meetings",
											class: "crm-button crm-day-calendar-link"
										}, {
											default: withCtx(() => [createTextVNode("Открыть календарь")]),
											_: 1
										})
									], 8, ["aria-busy"])) : createCommentVNode("", true)], 64)) : createCommentVNode("", true),
									widget.id === "results" ? (openBlock(), createBlock(Fragment, { key: 2 }, [unref(can)("crm.read") ? (openBlock(), createBlock("section", {
										key: 0,
										class: "crm-day-results",
										"aria-labelledby": "crm-day-results-title",
										"aria-busy": unref(dashboardLoading)
									}, [createVNode("header", { class: "crm-day-section-head" }, [createVNode("h2", { id: "crm-day-results-title" }, "Результаты · " + toDisplayString(unref(monthLabel)), 1), createVNode(_component_NuxtLink, {
										to: "/crm/deals",
										class: "crm-button crm-button--text"
									}, {
										default: withCtx(() => [createTextVNode("К сделкам"), createVNode(unref(ArrowUpRight), { size: 16 })]),
										_: 1
									})]), unref(dashboardError) ? (openBlock(), createBlock("div", {
										key: 0,
										class: "crm-day-notice",
										role: "alert"
									}, [
										createVNode(unref(AlertTriangle), { size: 18 }),
										createVNode("p", null, toDisplayString(unref(dashboardError)), 1),
										createVNode("button", {
											class: "crm-button",
											onClick: load
										}, "Повторить")
									])) : unref(dashboardLoading) && !unref(dashboard) ? (openBlock(), createBlock("p", {
										key: 1,
										class: "crm-day-placeholder",
										role: "status"
									}, "Загружаем показатели продаж…")) : unref(dashboard) ? (openBlock(), createBlock("div", {
										key: 2,
										class: "crm-day-result-grid"
									}, [
										createVNode("article", { class: { "crm-day-metric-wide": money(unref(dashboard).wonMonth?.amount).length > 12 } }, [
											createVNode("h3", null, "Продано за месяц"),
											createVNode("strong", null, toDisplayString(money(unref(dashboard).wonMonth?.amount)), 1),
											createVNode("p", null, toDisplayString(unref(dashboard).wonMonth?.count || 0) + " успешных сделок", 1)
										], 2),
										createVNode("article", { class: { "crm-day-metric-wide": money(unref(dashboard).forecast).length > 12 } }, [
											createVNode("h3", null, "Прогноз продаж"),
											createVNode("strong", null, toDisplayString(money(unref(dashboard).forecast)), 1),
											createVNode("p", null, "Взвешенная сумма открытых сделок")
										], 2),
										createVNode("article", null, [
											createVNode("h3", null, "Открытые сделки"),
											createVNode("strong", null, toDisplayString(unref(dashboard).openLeads), 1),
											createVNode("p", null, toDisplayString(!unref(can)("customers.read") || unref(dashboard).customersAvailable === false ? "База клиентов недоступна по вашим правам" : `${unref(dashboard).customers} клиентов в единой базе`), 1)
										]),
										createVNode("article", null, [
											createVNode("h3", null, "Контроль задач"),
											createVNode("strong", { class: { "crm-day-late": unref(dashboard).overdueTasks } }, [createTextVNode(toDisplayString(unref(dashboard).overdueTasks) + " ", 1), createVNode("span", null, "просрочено")], 2),
											createVNode("p", null, toDisplayString(unref(dashboard).dueToday) + " на сегодня", 1)
										])
									])) : createCommentVNode("", true)], 8, ["aria-busy"])) : createCommentVNode("", true)], 64)) : createCommentVNode("", true),
									widget.id === "clock" ? (openBlock(), createBlock(Fragment, { key: 3 }, [unref(can)("work_time.read") ? (openBlock(), createBlock("div", {
										key: 0,
										class: "crm-day-clock"
									}, [createVNode(_component_CrmWorkClock, { compact: "" })])) : createCommentVNode("", true)], 64)) : createCommentVNode("", true),
									widget.id === "funnel" ? (openBlock(), createBlock("section", {
										key: 4,
										"aria-labelledby": "crm-day-funnel-title"
									}, [createVNode("header", { class: "crm-day-section-head" }, [createVNode("h2", { id: "crm-day-funnel-title" }, "Продажи по этапам"), createVNode(_component_NuxtLink, {
										to: "/crm/deals",
										class: "crm-button crm-button--text"
									}, {
										default: withCtx(() => [createTextVNode("Воронка"), createVNode(unref(ArrowUpRight), { size: 16 })]),
										_: 1
									})]), unref(dashboardError) ? (openBlock(), createBlock("div", {
										key: 0,
										class: "crm-day-notice",
										role: "alert"
									}, [createVNode("p", null, toDisplayString(unref(dashboardError)), 1), createVNode("button", {
										class: "crm-button",
										onClick: load
									}, "Повторить")])) : unref(dashboardLoading) && !unref(dashboard) ? (openBlock(), createBlock("p", {
										key: 1,
										class: "crm-day-placeholder",
										role: "status"
									}, "Загружаем воронку продаж…")) : unref(dashboard)?.funnel?.length ? (openBlock(), createBlock("div", {
										key: 2,
										class: "crm-day-funnel"
									}, [(openBlock(true), createBlock(Fragment, null, renderList(unref(dashboard).funnel, (stage) => {
										return openBlock(), createBlock(_component_NuxtLink, {
											key: stage.id,
											to: "/crm/deals"
										}, {
											default: withCtx(() => [
												createVNode("span", { class: "crm-day-stage-name" }, [createVNode("i", { style: { background: stage.color } }, null, 4), createTextVNode(toDisplayString(stage.name), 1)]),
												createVNode("span", { class: "crm-day-stage-values" }, [createVNode("strong", null, toDisplayString(stage.count), 1), createVNode("span", null, toDisplayString(money(stage.amount)), 1)]),
												createVNode("span", { class: "crm-day-bar" }, [createVNode("i", { style: {
													width: `${Math.max(stage.count ? 8 : 0, stage.count / unref(funnelMax) * 100)}%`,
													background: stage.color
												} }, null, 4)])
											]),
											_: 2
										}, 1024);
									}), 128))])) : (openBlock(), createBlock("p", {
										key: 3,
										class: "crm-day-placeholder"
									}, "Здесь появятся этапы и суммы сделок после настройки воронки продаж."))])) : createCommentVNode("", true),
									widget.id === "interactions" ? (openBlock(), createBlock("section", {
										key: 5,
										"aria-labelledby": "crm-day-activity-title"
									}, [createVNode("header", { class: "crm-day-section-head" }, [createVNode("h2", { id: "crm-day-activity-title" }, "Последние контакты")]), unref(dashboardError) ? (openBlock(), createBlock("div", {
										key: 0,
										class: "crm-day-notice",
										role: "alert"
									}, [createVNode("p", null, toDisplayString(unref(dashboardError)), 1), createVNode("button", {
										class: "crm-button",
										onClick: load
									}, "Повторить")])) : unref(dashboardLoading) && !unref(dashboard) ? (openBlock(), createBlock("p", {
										key: 1,
										class: "crm-day-placeholder",
										role: "status"
									}, "Загружаем историю контактов…")) : unref(dashboard)?.recentInteractions?.length ? (openBlock(), createBlock("div", {
										key: 2,
										class: "crm-day-interactions"
									}, [(openBlock(true), createBlock(Fragment, null, renderList(unref(dashboard).recentInteractions.slice(0, 4), (item) => {
										return openBlock(), createBlock(_component_NuxtLink, {
											key: item.id,
											to: "/crm/deals"
										}, {
											default: withCtx(() => [createVNode(unref(MessageSquareText), { size: 18 }), createVNode("div", null, [
												createVNode("h3", null, toDisplayString(item.lead?.title || item.lead?.contactName || "Контакт с клиентом"), 1),
												createVNode("p", null, toDisplayString(item.content), 1),
												createVNode("span", null, toDisplayString(person(item.user)) + " · " + toDisplayString(new Date(item.createdAt).toLocaleString("ru-RU", {
													day: "numeric",
													month: "short",
													hour: "2-digit",
													minute: "2-digit"
												})), 1)
											])]),
											_: 2
										}, 1024);
									}), 128))])) : (openBlock(), createBlock("p", {
										key: 3,
										class: "crm-day-placeholder"
									}, "История появится после первого звонка, письма или заметки в сделке."))])) : createCommentVNode("", true),
									widget.id === "shortcuts" ? (openBlock(), createBlock(Fragment, { key: 6 }, [unref(can)("crm.read") ? (openBlock(), createBlock("nav", {
										key: 0,
										class: "crm-day-shortcuts",
										"aria-label": "Рабочие разделы"
									}, [
										createVNode(_component_NuxtLink, { to: "/crm/deals" }, {
											default: withCtx(() => [
												createVNode(unref(Kanban), { size: 18 }),
												createTextVNode("Воронка продаж"),
												createVNode(unref(ArrowUpRight), { size: 16 })
											]),
											_: 1
										}),
										unref(can)("customers.read") ? (openBlock(), createBlock(_component_NuxtLink, {
											key: 0,
											to: "/crm/customers"
										}, {
											default: withCtx(() => [
												createVNode(unref(ContactRound), { size: 18 }),
												createTextVNode("Клиенты 360°"),
												createVNode(unref(ArrowUpRight), { size: 16 })
											]),
											_: 1
										})) : createCommentVNode("", true),
										createVNode(_component_NuxtLink, { to: "/crm/tasks" }, {
											default: withCtx(() => [
												createVNode(unref(ListTodo), { size: 18 }),
												createTextVNode("Задачи"),
												createVNode(unref(ArrowUpRight), { size: 16 })
											]),
											_: 1
										})
									])) : createCommentVNode("", true)], 64)) : createCommentVNode("", true)
								];
							}),
							_: 2
						}, _parent));
					});
					_push(`<!--]--></div>`);
				} else {
					_push(`<div class="crm-day-empty crm-day-all-hidden">`);
					_push(ssrRenderComponent(unref(SlidersHorizontal), { size: 28 }, null, _parent));
					_push(`<h2>Рабочий стол свободен</h2><p>Выберите виджеты, которые помогают вам в работе.</p>`);
					if (!unref(widgets).editing.value) _push(`<button class="crm-button">Добавить виджеты</button>`);
					else _push(`<!---->`);
					_push(`</div>`);
				}
				_push(`<!--]-->`);
			} else _push(`<p class="crm-day-placeholder" role="status">Проверяем доступ к рабочему столу…</p>`);
			_push(`</main>`);
		};
	}
});
// pages/crm/index.vue
var _sfc_setup = index_vue_vue_type_script_setup_true_lang_default.setup;
index_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/crm/index.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var crm_default = index_vue_vue_type_script_setup_true_lang_default;

export { crm_default as default };;globalThis.__timing__.logEnd('Load chunks/build/crm-B7Hb_pC1');
//# sourceMappingURL=crm-B7Hb_pC1.mjs.map
