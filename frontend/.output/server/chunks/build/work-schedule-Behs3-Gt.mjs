globalThis.__timing__.logStart('Load chunks/build/work-schedule-Behs3-Gt');import { u as useHead, a as useWorkspaceSession, $ as $fetch$1, f as useRuntimeConfig } from '../virtual/entry.mjs';
import { u as useCatalogDialog } from './useCatalogDialog-2pnsnnsL.mjs';
import { C as CrmCardTabs_default } from './CrmCardTabs-CwDu8QcL.mjs';
import { defineComponent, ref, reactive, computed, watch, mergeProps, unref, isRef, useSSRContext } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import { ssrRenderAttrs, ssrIncludeBooleanAttr, ssrRenderComponent, ssrRenderAttr, ssrRenderClass, ssrLooseContain, ssrLooseEqual, ssrRenderList, ssrInterpolate, ssrRenderStyle, ssrRenderTeleport } from 'vue/server-renderer';
import { RefreshCw, Plus, ChevronLeft, ChevronRight, CalendarFold, X } from '@lucide/vue';
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

function intersectsScheduleDay(row, day) {
  const next = new Date(Date.parse(day + "T00:00Z") + 864e5).toISOString().slice(0, 10);
  return row.startLocal < next + "T00:00" && row.endLocal > day + "T00:00";
}
function workingEmployeeCount(rows, day) {
  return new Set(rows.filter((row) => row.kind === "SHIFT" && row.status !== "CANCELLED" && intersectsScheduleDay(row, day)).map((row) => row.employeeId)).size;
}
const employeePlural = new Intl.PluralRules("ru");
function employeeCountLabel(count) {
  const form = employeePlural.select(count);
  return `${count} ${form === "one" ? "\u0441\u043E\u0442\u0440\u0443\u0434\u043D\u0438\u043A" : form === "few" ? "\u0441\u043E\u0442\u0440\u0443\u0434\u043D\u0438\u043A\u0430" : "\u0441\u043E\u0442\u0440\u0443\u0434\u043D\u0438\u043A\u043E\u0432"}`;
}

// components/crm/CrmSchedulePatterns.vue?vue&type=script&setup=true&lang.ts
var CrmSchedulePatterns_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "CrmSchedulePatterns",
	__ssrInlineRender: true,
	props: {
		patterns: {},
		people: {},
		canCreate: { type: Boolean },
		canPublish: { type: Boolean },
		month: {}
	},
	emits: ["changed"],
	setup(__props, { expose: __expose, emit: __emit }) {
		const props = __props;
		const session = useWorkspaceSession(), config = useRuntimeConfig();
		const request = (path = "", options = {}) => $fetch$1("/crm/work-schedule/patterns" + path, {
			baseURL: config.public.apiBase,
			headers: { Authorization: `Bearer ${session.token.value}` },
			timeout: 15e3,
			retry: 0,
			...options
		});
		const labels = {
			WEEKDAYS: "5/2 — понедельник–пятница",
			CYCLE_5_2: "5/2 — цикл от даты начала",
			CYCLE_2_2: "2/2 — два рабочих, два выходных",
			CYCLE_3_3: "3/3 — три рабочих, три выходных"
		};
		const statuses = {
			DRAFT: "Черновик",
			PUBLISHED: "Опубликован",
			CANCELLED: "Отменён"
		};
		const actions = {
			CREATE: "Создан шаблон",
			PUBLISH: "Применён график",
			END: "Задано окончание",
			CANCEL: "Отменён шаблон"
		};
		const opened = ref(false), busy = ref(false), error = ref(""), formError = ref(""), selected = ref(null), tab = ref("general"), baseline = ref("");
		ref("");
		const preview = ref(null), previewSignature = ref(""), reason = ref(""), lastDate = ref("");
		const draft = reactive({
			employeeId: "",
			pattern: "WEEKDAYS",
			startDate: "",
			endDate: "",
			startTime: "09:00",
			endTime: "18:00",
			timezone: "Europe/Moscow",
			breakMinutes: 60,
			note: "",
			status: "PUBLISHED"
		});
		const dirty = computed(() => opened.value && (selected.value ? Boolean(reason.value.trim()) || lastDate.value !== (selected.value.endDate || (selected.value.startDate > selected.value.today ? selected.value.startDate : selected.value.today)) : baseline.value !== JSON.stringify(draft)));
		const previewCurrent = computed(() => preview.value && previewSignature.value === JSON.stringify(draft));
		const candidates = computed(() => props.people.filter((person) => person.canAssign));
		const personName = (person) => [person.firstName, person.lastName].filter(Boolean).join(" ") || `Сотрудник ${person.id.slice(0, 6)}`;
		const dateLabel = (value) => (/* @__PURE__ */ new Date(value + "T12:00:00Z")).toLocaleDateString("ru-RU", {
			day: "numeric",
			month: "long",
			year: "numeric",
			timeZone: "UTC"
		});
		const message = (e) => Array.isArray(e?.data?.message) ? e.data.message.join(". ") : e?.data?.message || "Не удалось выполнить действие. Введённые данные сохранены в форме.";
		function fill(row) {
			selected.value = row;
			formError.value = "";
			reason.value = "";
			preview.value = null;
			previewSignature.value = "";
			tab.value = "general";
			const parts = new Intl.DateTimeFormat("en-CA", {
				timeZone: "Europe/Moscow",
				year: "numeric",
				month: "2-digit",
				day: "2-digit"
			}).formatToParts(/* @__PURE__ */ new Date());
			const today = [
				"year",
				"month",
				"day"
			].map((key) => parts.find((p) => p.type === key).value).join("-");
			Object.assign(draft, {
				employeeId: row?.employeeId || candidates.value[0]?.id || "",
				pattern: row?.pattern || "WEEKDAYS",
				startDate: row?.startDate || (props.month === today.slice(0, 7) ? today : props.month + "-01"),
				endDate: row?.endDate || "",
				startTime: row?.startTime || "09:00",
				endTime: row?.endTime || "18:00",
				timezone: row?.timezone || "Europe/Moscow",
				breakMinutes: row?.breakMinutes ?? 60,
				note: row?.note || "",
				status: row?.status || (props.canPublish ? "PUBLISHED" : "DRAFT")
			});
			lastDate.value = row ? row.endDate || (row.startDate > row.today ? row.startDate : row.today) : "";
			baseline.value = JSON.stringify(draft);
		}
		async function open(id) {
			if (busy.value) return;
			busy.value = true;
			error.value = "";
			try {
				fill(await request("/" + id));
				opened.value = true;
			} catch (e) {
				error.value = message(e);
			} finally {
				busy.value = false;
			}
		}
		__expose({ open });
		function leave() {
			return !busy.value && (!dirty.value || (void 0).confirm("Изменения шаблона не сохранены. Закрыть без сохранения?"));
		}
		function close() {
			if (leave()) opened.value = false;
		}
		useCatalogDialog(computed(() => opened.value), close);
		onBeforeRouteLeave(() => leave());
		return (_ctx, _push, _parent, _attrs) => {
			const _component_CrmCardTabs = CrmCardTabs_default;
			_push(`<section${ssrRenderAttrs(mergeProps({
				class: "crm-surface",
				"aria-label": "Повторяющиеся графики"
			}, _attrs))}><header class="crm-panel-header"><div><p>5/2 · 2/2 · 3/3</p><h2>Повторяющиеся графики</h2></div>`);
			if (__props.canCreate) {
				_push(`<button class="crm-button crm-button--primary"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}>`);
				_push(ssrRenderComponent(unref(Plus), { size: 18 }, null, _parent));
				_push(`Применить шаблон</button>`);
			} else _push(`<!---->`);
			_push(`</header><div class="crm-register crm-stack"><p class="crm-inline-note">Назначьте шаблон один раз: смены и отдых появятся во всех следующих месяцах. Без даты окончания график действует постоянно. Здесь показаны все доступные шаблоны, независимо от выбранного месяца и состояния записей.</p>`);
			if (unref(error)) _push(`<p role="alert">${ssrInterpolate(unref(error))}</p>`);
			else _push(`<!---->`);
			if (unref(busy) && !unref(opened)) _push(`<p role="status">Открываем шаблон…</p>`);
			else _push(`<!---->`);
			_push(`<!--[-->`);
			ssrRenderList(__props.patterns, (pattern) => {
				_push(`<article class="crm-item-card crm-record"><span><strong>${ssrInterpolate(personName(pattern.employee))} · ${ssrInterpolate(pattern.label)}</strong><small>С ${ssrInterpolate(dateLabel(pattern.startDate))}${ssrInterpolate(pattern.endDate ? " по " + dateLabel(pattern.endDate) : " · Постоянно")}</small><small>${ssrInterpolate(pattern.startTime)}–${ssrInterpolate(pattern.endTime)} · ${ssrInterpolate(pattern.timezone)} · Перерыв ${ssrInterpolate(pattern.breakMinutes)} мин</small></span><span class="crm-badge"${ssrRenderAttr("data-status", pattern.status)}>${ssrInterpolate(statuses[pattern.status])}</span><button class="crm-button"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}${ssrRenderAttr("aria-label", `Открыть шаблон ${personName(pattern.employee)}, ${pattern.startDate}`)}>Открыть</button></article>`);
			});
			_push(`<!--]-->`);
			if (!__props.patterns.length) _push(`<p class="crm-empty">${ssrInterpolate(__props.canCreate ? "Шаблоны пока не назначены. Выберите сотрудника, режим и первый день." : "Ваш опубликованный шаблон появится здесь после назначения.")}</p>`);
			else _push(`<!---->`);
			_push(`</div>`);
			ssrRenderTeleport(_push, (_push) => {
				if (unref(opened)) {
					_push(`<div class="admin-dialog-backdrop crm-detail-backdrop"><form class="admin-dialog admin-dialog--drawer crm-detail-card" role="dialog" aria-modal="true" aria-labelledby="pattern-title" tabindex="-1"><header><div><p>Постоянный график</p><h2 id="pattern-title">${ssrInterpolate(unref(selected) ? personName(unref(selected).employee) + " · " + unref(selected).label : "Применить шаблон")}</h2></div><button class="crm-button crm-button--icon" type="button" aria-label="Закрыть шаблон"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}>`);
					_push(ssrRenderComponent(unref(X), { size: 18 }, null, _parent));
					_push(`</button></header>`);
					if (unref(selected)) _push(ssrRenderComponent(_component_CrmCardTabs, {
						modelValue: unref(tab),
						"onUpdate:modelValue": ($event) => isRef(tab) ? tab.value = $event : null,
						prefix: "work-pattern",
						tabs: [["general", "Общее"], ["history", "История изменений"]]
					}, null, _parent));
					else _push(`<!---->`);
					_push(`<div${ssrRenderAttr("id", `work-pattern-${unref(tab)}-panel`)}${ssrRenderAttr("role", unref(selected) ? "tabpanel" : void 0)}${ssrRenderAttr("aria-labelledby", unref(selected) ? `work-pattern-${unref(tab)}-tab` : void 0)} class="admin-dialog-body crm-detail-body crm-stack">`);
					if (unref(formError)) {
						_push(`<div role="alert" class="crm-stack"><p>${ssrInterpolate(unref(formError))}</p>`);
						if (unref(selected)) _push(`<button class="crm-button" type="button"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}>Загрузить актуальный шаблон</button>`);
						else _push(`<!---->`);
						_push(`</div>`);
					} else _push(`<!---->`);
					if (unref(tab) === "general") {
						_push(`<!--[-->`);
						if (unref(selected)) _push(`<p><span class="crm-badge"${ssrRenderAttr("data-status", unref(selected).status)}>${ssrInterpolate(statuses[unref(selected).status])}</span> · Версия ${ssrInterpolate(unref(selected).version)}</p>`);
						else _push(`<!---->`);
						_push(`<fieldset class="ui-fieldset-reset crm-stack"${ssrIncludeBooleanAttr(unref(busy) || Boolean(unref(selected))) ? " disabled" : ""}><label class="crm-field">Сотрудник<select class="crm-input" required><option value="" disabled${ssrIncludeBooleanAttr(Array.isArray(unref(draft).employeeId) ? ssrLooseContain(unref(draft).employeeId, "") : ssrLooseEqual(unref(draft).employeeId, "")) ? " selected" : ""}>Выберите сотрудника</option><!--[-->`);
						ssrRenderList(unref(selected) ? [unref(selected).employee] : unref(candidates), (person) => {
							_push(`<option${ssrRenderAttr("value", person.id)}${ssrIncludeBooleanAttr(Array.isArray(unref(draft).employeeId) ? ssrLooseContain(unref(draft).employeeId, person.id) : ssrLooseEqual(unref(draft).employeeId, person.id)) ? " selected" : ""}>${ssrInterpolate(personName(person))}</option>`);
						});
						_push(`<!--]--></select></label><label class="crm-field">Шаблон графика<select class="crm-input"><!--[-->`);
						ssrRenderList(labels, (label, key) => {
							_push(`<option${ssrRenderAttr("value", key)}${ssrIncludeBooleanAttr(Array.isArray(unref(draft).pattern) ? ssrLooseContain(unref(draft).pattern, key) : ssrLooseEqual(unref(draft).pattern, key)) ? " selected" : ""}>${ssrInterpolate(label)}</option>`);
						});
						_push(`<!--]--></select></label><div class="two"><label class="crm-field">Дата начала<input${ssrRenderAttr("value", unref(draft).startDate)} class="crm-input" type="date" min="2000-01-01" max="2099-12-31" required></label><label class="crm-field">Последний день (необязательно)<input${ssrRenderAttr("value", unref(draft).endDate)} class="crm-input" type="date"${ssrRenderAttr("min", unref(draft).startDate)} max="2099-12-31"></label></div><p class="crm-inline-note">${ssrInterpolate(unref(draft).pattern === "WEEKDAYS" ? "Рабочие дни — понедельник–пятница, отдых — суббота и воскресенье. Дата начала включает график, даже если это выходной." : "Дата начала — первый рабочий день цикла. Чередование продолжается через границы месяцев и лет, не начинается заново с понедельника.")} Пустая последняя дата — постоянно.</p><div class="two"><label class="crm-field">Начало смены<input${ssrRenderAttr("value", unref(draft).startTime)} class="crm-input" type="time" required></label><label class="crm-field">Окончание смены<input${ssrRenderAttr("value", unref(draft).endTime)} class="crm-input" type="time" required></label></div><p class="crm-inline-note">Если окончание не позже начала, смена заканчивается на следующий день. После ночной смены отдых начинается с её окончания. Праздники автоматически не исключаются.</p><div class="two"><label class="crm-field">Перерыв, минут<input${ssrRenderAttr("value", unref(draft).breakMinutes)} class="crm-input" type="number" min="0" max="1439" required></label><label class="crm-field">Часовой пояс<input${ssrRenderAttr("value", unref(draft).timezone)} class="crm-input" required maxlength="80"></label></div>`);
						if (!unref(selected)) {
							_push(`<label class="crm-field">Применение<select class="crm-input">`);
							if (__props.canPublish) _push(`<option value="PUBLISHED"${ssrIncludeBooleanAttr(Array.isArray(unref(draft).status) ? ssrLooseContain(unref(draft).status, "PUBLISHED") : ssrLooseEqual(unref(draft).status, "PUBLISHED")) ? " selected" : ""}>Сразу опубликовать сотруднику</option>`);
							else _push(`<!---->`);
							_push(`<option value="DRAFT"${ssrIncludeBooleanAttr(Array.isArray(unref(draft).status) ? ssrLooseContain(unref(draft).status, "DRAFT") : ssrLooseEqual(unref(draft).status, "DRAFT")) ? " selected" : ""}>Сохранить черновиком</option></select></label>`);
						} else _push(`<!---->`);
						_push(`<label class="crm-field">Примечание<textarea class="crm-input" rows="2" maxlength="1000">${ssrInterpolate(unref(draft).note)}</textarea></label></fieldset><p class="crm-inline-note">Ручные опубликованные смены, выходные и отсутствия имеют приоритет: пересекающаяся запись шаблона пропускается целиком. Черновик ручной записи не отменяет опубликованную смену шаблона. Для исключения отдельного дня добавьте и опубликуйте ручную запись.</p>`);
						if (!unref(selected)) {
							_push(`<!--[--><button class="crm-button" type="button"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}>Предпросмотр</button>`);
							if (unref(preview) && !unref(previewCurrent)) _push(`<p role="status">Параметры изменены. Обновите предпросмотр перед применением.</p>`);
							else _push(`<!---->`);
							if (unref(previewCurrent) && unref(preview)) {
								_push(`<section class="crm-stack" aria-label="Предпросмотр шаблона"><h3>С ${ssrInterpolate(dateLabel(unref(preview).from))} по ${ssrInterpolate(dateLabel(unref(preview).to))}</h3><p class="crm-inline-note">Это первые 35 дней, не ограничение действия шаблона. ${ssrInterpolate(unref(preview).permanent ? "График продолжится постоянно." : "Повторы закончатся выбранной датой.")}</p><p>Рабочих смен: ${ssrInterpolate(unref(preview).items.filter((item) => item.kind === "SHIFT" && !item.overridden).length)} · Приоритет ручных записей: ${ssrInterpolate(unref(preview).items.filter((item) => item.overridden).length)}</p><!--[-->`);
								ssrRenderList(unref(preview).issues, (issue) => {
									_push(`<p role="alert">${ssrInterpolate(dateLabel(issue.date))}: ${ssrInterpolate(issue.message)}</p>`);
								});
								_push(`<!--]--><details><summary>Показать все дни предпросмотра</summary><div class="crm-stack"><!--[-->`);
								ssrRenderList(unref(preview).items, (item) => {
									_push(`<article class="crm-item-card crm-record"><span><strong>${ssrInterpolate(dateLabel(item.occurrenceDate))}</strong><small>${ssrInterpolate(item.kind === "SHIFT" ? item.startLocal.slice(11) + "–" + item.endLocal.slice(11) : "Отдых")}</small></span><span>${ssrInterpolate(item.overridden ? "Ручная запись сохранится" : item.kind === "SHIFT" ? item.plannedMinutes + " мин работы" : "Выходной")}</span></article>`);
								});
								_push(`<!--]--></div></details></section>`);
							} else _push(`<!---->`);
							_push(`<!--]-->`);
						} else {
							_push(`<!--[--><p class="crm-inline-note">Чтобы сменить режим или часы, завершите этот график и назначьте новый с нужной даты. Прошедшие дни не переписываются. Текущую ночную смену окончание графика не обрезает.</p>`);
							if (unref(selected).canPublish || unref(selected).canEnd || unref(selected).canCancel) _push(`<label class="crm-field">Причина изменения<input${ssrRenderAttr("value", unref(reason))} class="crm-input" maxlength="500"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}></label>`);
							else _push(`<!---->`);
							if (unref(selected).canEnd) _push(`<label class="crm-field">Последний день этого графика<input${ssrRenderAttr("value", unref(lastDate))} class="crm-input" type="date"${ssrRenderAttr("min", unref(selected).startDate > unref(selected).today ? unref(selected).startDate : unref(selected).today)}${ssrRenderAttr("max", unref(selected).endDate || "2099-12-31")}${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}></label>`);
							else _push(`<!---->`);
							_push(`<div class="crm-action-bar">`);
							if (unref(selected).canPublish) _push(`<button class="crm-button" type="button"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}>Опубликовать шаблон</button>`);
							else _push(`<!---->`);
							if (unref(selected).canEnd) _push(`<button class="crm-button" type="button"${ssrIncludeBooleanAttr(unref(busy) || !unref(lastDate)) ? " disabled" : ""}>Завершить график</button>`);
							else _push(`<!---->`);
							if (unref(selected).canCancel) _push(`<button class="crm-button crm-button--danger" type="button"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}>Отменить шаблон</button>`);
							else _push(`<!---->`);
							_push(`</div><!--]-->`);
						}
						_push(`<!--]-->`);
					} else {
						_push(`<section class="crm-stack" aria-label="История шаблона"><h3>История изменений</h3><!--[-->`);
						ssrRenderList(unref(selected)?.events, (event) => {
							_push(`<article class="crm-item-card crm-stack"><strong>${ssrInterpolate(actions[event.action])} · Версия ${ssrInterpolate(event.version)}</strong><span>${ssrInterpolate(event.actorName)} · ${ssrInterpolate(new Date(event.createdAt).toLocaleString("ru-RU"))}</span><p>${ssrInterpolate(event.reason)}</p></article>`);
						});
						_push(`<!--]--><p class="crm-inline-note">Последние 50 доступных событий.</p></section>`);
					}
					_push(`</div><footer class="crm-detail-footer"><button class="crm-button" type="button"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}>Закрыть</button>`);
					if (!unref(selected)) _push(`<button class="crm-button crm-button--primary" type="submit"${ssrIncludeBooleanAttr(unref(busy) || !unref(previewCurrent) || Boolean(unref(preview)?.issues.length)) ? " disabled" : ""}>${ssrInterpolate(unref(busy) ? "Проверяем…" : unref(draft).status === "PUBLISHED" ? "Применить график" : "Сохранить шаблон")}</button>`);
					else _push(`<!---->`);
					_push(`</footer></form></div>`);
				} else _push(`<!---->`);
			}, "body", false, _parent);
			_push(`</section>`);
		};
	}
});
// components/crm/CrmSchedulePatterns.vue
var _sfc_setup$1 = CrmSchedulePatterns_vue_vue_type_script_setup_true_lang_default.setup;
CrmSchedulePatterns_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/crm/CrmSchedulePatterns.vue");
	return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
var CrmSchedulePatterns_default = Object.assign(CrmSchedulePatterns_vue_vue_type_script_setup_true_lang_default, { __name: "CrmSchedulePatterns" });
// pages/crm/work-schedule.vue?vue&type=script&setup=true&lang.ts
var work_schedule_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "work-schedule",
	__ssrInlineRender: true,
	setup(__props) {
		useHead({ title: "Графики работы — SARKISIAN CRM" });
		const patternPanel = ref(null);
		const session = useWorkspaceSession(), config = useRuntimeConfig();
		const request = (path = "", options = {}) => $fetch$1("/crm/work-schedule" + path, {
			baseURL: config.public.apiBase,
			headers: { Authorization: `Bearer ${session.token.value}` },
			timeout: 15e3,
			retry: 0,
			...options
		});
		const month = ref(""), departmentId = ref(""), employeeId = ref(""), status = ref(""), day = ref("");
		const section = ref("calendar"), onShiftDate = ref(""), showNonWorking = ref(false);
		const data = ref(null), people = ref([]), departments = ref([]);
		const loading = ref(false), opening = ref(false), saving = ref(false), error = ref(""), formError = ref(""), opened = ref(false), selected = ref(null), tab = ref("general"), reason = ref(""), baseline = ref("");
		ref("");
		const draft = reactive({
			employeeId: "",
			kind: "SHIFT",
			startLocal: "",
			endLocal: "",
			timezone: "Europe/Moscow",
			breakMinutes: 60,
			note: ""
		});
		const dirty = computed(() => opened.value && (JSON.stringify(draft) !== baseline.value || Boolean(reason.value.trim())));
		const editable = computed(() => selected.value ? selected.value.canEdit : data.value?.canCreate);
		const candidates = computed(() => people.value.filter((person) => person.canAssign));
		const personName = (person) => [person.firstName, person.lastName].filter(Boolean).join(" ") || `Сотрудник ${person.id.slice(0, 6)}`;
		const kinds = {
			SHIFT: "Рабочая смена",
			DAY_OFF: "Выходной",
			ABSENCE: "Отсутствие"
		};
		const statuses = {
			DRAFT: "Черновик",
			PUBLISHED: "Опубликовано",
			CANCELLED: "Отменено"
		};
		const actions = {
			CREATE: "Создан черновик",
			UPDATE: "Изменён черновик",
			PUBLISHED: "Опубликовано",
			CANCELLED: "Отменено"
		};
		const hours = (minutes) => `${Math.floor(minutes / 60)} ч ${minutes % 60} мин`;
		const dateLabel = (date) => (/* @__PURE__ */ new Date(date.slice(0, 10) + "T12:00:00Z")).toLocaleDateString("ru-RU", {
			day: "numeric",
			month: "long",
			timeZone: "UTC"
		});
		const visible = computed(() => (data.value?.items || []).filter((row) => (showNonWorking.value || row.kind === "SHIFT") && (!day.value || intersectsScheduleDay(row, day.value))));
		const onShift = computed(() => {
			const groups = /* @__PURE__ */ new Map();
			for (const row of data.value?.items || []) {
				if (row.kind !== "SHIFT" || row.status !== "PUBLISHED" || !onShiftDate.value || !intersectsScheduleDay(row, onShiftDate.value)) continue;
				if (!groups.has(row.employeeId)) groups.set(row.employeeId, {
					employee: row.employee,
					rows: []
				});
				groups.get(row.employeeId).rows.push(row);
			}
			return [...groups.values()].sort((a, b) => personName(a.employee).localeCompare(personName(b.employee), "ru"));
		});
		const cells = computed(() => {
			if (!/^\d{4}-\d{2}$/.test(month.value)) return [];
			const [year, m] = month.value.split("-").map(Number), offset = (new Date(Date.UTC(year, m - 1, 1)).getUTCDay() + 6) % 7, days = new Date(Date.UTC(year, m, 0)).getUTCDate();
			return Array.from({ length: Math.ceil((offset + days) / 7) * 7 }, (_, i) => {
				const number = i - offset + 1, key = number > 0 && number <= days ? `${month.value}-${String(number).padStart(2, "0")}` : "";
				return {
					number,
					key,
					count: key ? workingEmployeeCount(data.value?.items || [], key) : 0
				};
			});
		});
		const message = (e, fallback) => Array.isArray(e?.data?.message) ? e.data.message.join(". ") : e?.data?.message || fallback;
		let loadVersion = 0;
		async function load() {
			const version = ++loadVersion;
			loading.value = true;
			error.value = "";
			day.value = "";
			try {
				const [calendar, options] = await Promise.all([request("", { query: {
					month: month.value,
					...departmentId.value ? { departmentId: departmentId.value } : {},
					...employeeId.value ? { employeeId: employeeId.value } : {},
					...section.value === "on-shift" ? { status: "PUBLISHED" } : section.value === "calendar" && status.value ? { status: status.value } : {}
				} }), request("/options")]);
				if (version === loadVersion) {
					data.value = calendar;
					people.value = options.people;
					departments.value = options.departments;
				}
			} catch (e) {
				if (version === loadVersion) {
					data.value = null;
					people.value = [];
					departments.value = [];
					error.value = message(e, "Не удалось загрузить графики. Повторите попытку.");
				}
			} finally {
				if (version === loadVersion) loading.value = false;
			}
		}
		function loadShiftDate() {
			if (!/^20\d{2}-\d{2}-\d{2}$/.test(onShiftDate.value)) return;
			month.value = onShiftDate.value.slice(0, 7);
			load();
		}
		watch(section, () => {
			if (section.value === "on-shift") loadShiftDate();
			else load();
		});
		function leave() {
			return !saving.value && (!dirty.value || (void 0).confirm("Изменения графика не сохранены. Закрыть без сохранения?"));
		}
		function close() {
			if (leave()) opened.value = false;
		}
		useCatalogDialog(computed(() => opened.value), close);
		onBeforeRouteLeave(() => leave());
		const opsFiltersOpen = ref(false);
		return (_ctx, _push, _parent, _attrs) => {
			const _component_CrmCardTabs = CrmCardTabs_default;
			_push(`<main${ssrRenderAttrs(mergeProps({ class: "crm-standard crm-operational-page crm-ops-work-schedule" }, _attrs))}><header class="crm-page-header"><div><h1>Графики работы</h1></div><div class="crm-action-bar"><button class="crm-button crm-button--refresh"${ssrIncludeBooleanAttr(unref(loading)) ? " disabled" : ""}>`);
			_push(ssrRenderComponent(unref(RefreshCw), { size: 18 }, null, _parent));
			_push(`Обновить</button>`);
			if (unref(data)?.canCreate && unref(section) !== "patterns") {
				_push(`<button class="crm-button crm-button--primary"${ssrIncludeBooleanAttr(unref(loading) || unref(opening)) ? " disabled" : ""}>`);
				_push(ssrRenderComponent(unref(Plus), { size: 18 }, null, _parent));
				_push(`Новая запись</button>`);
			} else _push(`<!---->`);
			_push(`</div></header><div class="crm-page-content crm-page-content--stack">`);
			_push(ssrRenderComponent(_component_CrmCardTabs, {
				modelValue: unref(section),
				"onUpdate:modelValue": ($event) => isRef(section) ? section.value = $event : null,
				prefix: "work-schedule-view",
				tabs: [
					["calendar", "График"],
					["on-shift", "Кто на смене"],
					["patterns", "Шаблоны"]
				],
				label: "Разделы графиков работы"
			}, null, _parent));
			_push(`<button class="crm-button crm-ops-filter-toggle" type="button"${ssrRenderAttr("aria-expanded", unref(opsFiltersOpen))} aria-controls="ops-work-schedule-filters">Отдел, сотрудник и период</button><form id="ops-work-schedule-filters" class="${ssrRenderClass([{ "is-expanded": unref(opsFiltersOpen) }, "crm-toolbar crm-filter-form crm-ops-filters"])}" aria-label="Фильтры графика">`);
			if (unref(section) === "calendar") _push(`<label class="crm-field">Месяц<input${ssrRenderAttr("value", unref(month))} class="crm-input" type="month" min="2000-01" max="2099-12" required></label>`);
			else _push(`<!---->`);
			if (unref(section) === "on-shift") _push(`<label class="crm-field">Дата смены<input${ssrRenderAttr("value", unref(onShiftDate))} class="crm-input" type="date" min="2000-01-01" max="2099-12-31" required></label>`);
			else _push(`<!---->`);
			_push(`<label class="crm-field">Отдел<select class="crm-input"><option value=""${ssrIncludeBooleanAttr(Array.isArray(unref(departmentId)) ? ssrLooseContain(unref(departmentId), "") : ssrLooseEqual(unref(departmentId), "")) ? " selected" : ""}>Все доступные</option><!--[-->`);
			ssrRenderList(unref(departments), (department) => {
				_push(`<option${ssrRenderAttr("value", department.id)}${ssrIncludeBooleanAttr(Array.isArray(unref(departmentId)) ? ssrLooseContain(unref(departmentId), department.id) : ssrLooseEqual(unref(departmentId), department.id)) ? " selected" : ""}>${ssrInterpolate(department.name)}</option>`);
			});
			_push(`<!--]--></select></label><label class="crm-field">Сотрудник<select class="crm-input"><option value=""${ssrIncludeBooleanAttr(Array.isArray(unref(employeeId)) ? ssrLooseContain(unref(employeeId), "") : ssrLooseEqual(unref(employeeId), "")) ? " selected" : ""}>Все доступные</option><!--[-->`);
			ssrRenderList(unref(people), (person) => {
				_push(`<option${ssrRenderAttr("value", person.id)}${ssrIncludeBooleanAttr(Array.isArray(unref(employeeId)) ? ssrLooseContain(unref(employeeId), person.id) : ssrLooseEqual(unref(employeeId), person.id)) ? " selected" : ""}>${ssrInterpolate(personName(person))}</option>`);
			});
			_push(`<!--]--></select></label><button class="crm-button"${ssrIncludeBooleanAttr(unref(loading)) ? " disabled" : ""} type="submit">Показать</button></form>`);
			if (unref(error)) _push(`<p class="operation-error" role="alert">${ssrInterpolate(unref(error))}<button class="crm-button"${ssrIncludeBooleanAttr(unref(loading)) ? " disabled" : ""}>Повторить загрузку</button></p>`);
			else _push(`<!---->`);
			if (unref(loading)) _push(`<p role="status">Загружаем графики…</p>`);
			else _push(`<!---->`);
			if (unref(opening)) _push(`<p role="status">Открываем карточку…</p>`);
			else _push(`<!---->`);
			if (unref(data) && !unref(loading)) {
				_push(`<!--[--><div id="work-schedule-view-patterns-panel" role="tabpanel" aria-labelledby="work-schedule-view-patterns-tab" style="${ssrRenderStyle(unref(section) === "patterns" ? null : { display: "none" })}">`);
				_push(ssrRenderComponent(CrmSchedulePatterns_default, {
					ref_key: "patternPanel",
					ref: patternPanel,
					patterns: unref(data).patterns || [],
					people: unref(people),
					"can-create": unref(data).canCreate,
					"can-publish": Boolean(unref(data).canPublishPatterns),
					month: unref(month),
					onChanged: load
				}, null, _parent));
				_push(`</div>`);
				if (unref(data).warnings?.length) {
					_push(`<div class="crm-surface crm-register crm-stack" role="alert"><strong>Не все даты шаблона рассчитаны — итоги неполные.</strong><!--[-->`);
					ssrRenderList(unref(data).warnings, (warning) => {
						_push(`<p>${ssrInterpolate(dateLabel(warning.date))}: ${ssrInterpolate(warning.message)}. Уточните график или добавьте ручную запись.</p>`);
					});
					_push(`<!--]--></div>`);
				} else _push(`<!---->`);
				if (unref(section) === "calendar") {
					_push(`<div id="work-schedule-view-calendar-panel" role="tabpanel" aria-labelledby="work-schedule-view-calendar-tab" class="crm-stack"><section class="crm-ops-month-summary" aria-label="Сводка графика"><h2 class="wn-sr-only">План рабочего времени</h2><div class="crm-summary-grid"><div><small>Записей</small><strong>${ssrInterpolate(unref(data).totals.entries)}</strong></div><div><small>Сотрудников</small><strong>${ssrInterpolate(new Set(unref(data).items.map((row) => row.employeeId)).size)}</strong></div><div><small>Опубликованный план</small><strong>${ssrInterpolate(hours(unref(data).totals.publishedMinutes))}</strong></div><div><small>В черновиках</small><strong>${ssrInterpolate(hours(unref(data).totals.draftMinutes))}</strong></div></div></section><section class="crm-surface" aria-label="Календарь команды"><header class="crm-panel-header"><div class="crm-action-bar"><button class="crm-button crm-button--icon" aria-label="Предыдущий месяц"${ssrIncludeBooleanAttr(unref(month) <= "2000-01") ? " disabled" : ""}>`);
					_push(ssrRenderComponent(unref(ChevronLeft), { size: 18 }, null, _parent));
					_push(`</button><h2>${ssrInterpolate((/* @__PURE__ */ new Date(unref(month) + "-01T12:00:00Z")).toLocaleDateString("ru-RU", {
						month: "long",
						year: "numeric",
						timeZone: "UTC"
					}))}</h2><button class="crm-button crm-button--icon" aria-label="Следующий месяц"${ssrIncludeBooleanAttr(unref(month) >= "2099-12") ? " disabled" : ""}>`);
					_push(ssrRenderComponent(unref(ChevronRight), { size: 18 }, null, _parent));
					_push(`</button></div></header><div class="crm-register crm-stack"><div class="crm-action-bar crm-view-switch" role="group" aria-label="Состояние графика"><!--[-->`);
					ssrRenderList([
						["", "Действующие"],
						["DRAFT", "Черновики"],
						["PUBLISHED", "Опубликованные"],
						["CANCELLED", "Отменённые"]
					], ([key, label]) => {
						_push(`<button class="crm-button"${ssrRenderAttr("aria-pressed", unref(status) === key)}>${ssrInterpolate(label)}</button>`);
					});
					_push(`<!--]--></div><details class="crm-ops-help"><summary>Как считается график</summary><p class="crm-inline-note">В календаре — сотрудники с рабочей сменой: каждый учитывается один раз за день. Выходные, отсутствия и отменённые смены не считаются. Даты и время — в часовом поясе записи; ночная смена видна в обоих днях.</p></details><div class="crm-month-grid" aria-label="Даты графика"><!--[-->`);
					ssrRenderList([
						"Пн",
						"Вт",
						"Ср",
						"Чт",
						"Пт",
						"Сб",
						"Вс"
					], (weekday) => {
						_push(`<span class="crm-month-weekday">${ssrInterpolate(weekday)}</span>`);
					});
					_push(`<!--]--><!--[-->`);
					ssrRenderList(unref(cells), (cell, index) => {
						_push(`<!--[-->`);
						if (cell.key) {
							_push(`<button type="button" class="crm-button crm-month-day crm-card-action"${ssrRenderAttr("aria-pressed", unref(day) === cell.key)}${ssrRenderAttr("aria-label", `${dateLabel(cell.key)}: ${unref(employeeCountLabel)(cell.count)}`)}><strong>${ssrInterpolate(cell.number)}</strong>`);
							if (cell.count) _push(`<small class="crm-month-count"><span class="crm-month-count--compact">${ssrInterpolate(cell.count)} чел.</span><span class="crm-month-count--full">${ssrInterpolate(unref(employeeCountLabel)(cell.count))}</span></small>`);
							else _push(`<!---->`);
							_push(`</button>`);
						} else _push(`<span aria-hidden="true"></span>`);
						_push(`<!--]-->`);
					});
					_push(`<!--]--></div><label class="crm-toggle-row"><span>Показывать выходные и отсутствия в списке</span><input${ssrIncludeBooleanAttr(Array.isArray(unref(showNonWorking)) ? ssrLooseContain(unref(showNonWorking), null) : unref(showNonWorking)) ? " checked" : ""} class="crm-check" type="checkbox"></label><div class="crm-action-bar crm-action-bar--spread"><h3>${ssrInterpolate(unref(day) ? dateLabel(unref(day)) : "Записи месяца")} · ${ssrInterpolate(unref(visible).length)}</h3>`);
					if (unref(day)) _push(`<button class="crm-button crm-button--text">Все даты</button>`);
					else _push(`<!---->`);
					_push(`</div><!--[-->`);
					ssrRenderList(unref(visible), (row) => {
						_push(`<article class="crm-item-card crm-record"><span><strong>${ssrInterpolate(personName(row.employee))}</strong><small>${ssrInterpolate(kinds[row.kind])} · ${ssrInterpolate(row.departmentName || "Без отдела")}</small>`);
						if (row.patternId) _push(`<small>По шаблону ${ssrInterpolate(row.patternLabel)}</small>`);
						else _push(`<!---->`);
						_push(`<small>${ssrInterpolate(dateLabel(row.startLocal))} ${ssrInterpolate(row.startLocal.slice(11))} — ${ssrInterpolate(dateLabel(row.endLocal))} ${ssrInterpolate(row.endLocal.slice(11))} · ${ssrInterpolate(row.timezone)}</small></span><span><strong>${ssrInterpolate(row.kind === "SHIFT" ? hours(row.plannedMinutes) : "Не рабочее время")}</strong><small><span class="crm-badge"${ssrRenderAttr("data-status", row.status)}>${ssrInterpolate(statuses[row.status])}</span></small></span><button class="crm-button"${ssrIncludeBooleanAttr(unref(opening)) ? " disabled" : ""}${ssrRenderAttr("aria-label", `Открыть график ${personName(row.employee)}, ${row.startLocal}`)}>Открыть</button></article>`);
					});
					_push(`<!--]-->`);
					if (!unref(visible).length) {
						_push(`<div class="crm-empty">`);
						_push(ssrRenderComponent(unref(CalendarFold), { size: 28 }, null, _parent));
						_push(`<h3>${ssrInterpolate(unref(showNonWorking) ? "Записей по этим условиям нет" : "Рабочих смен по этим условиям нет")}</h3><p>${ssrInterpolate(unref(data).canCreate ? "Добавьте смену или выберите другой период." : "Ваш опубликованный график появится здесь после назначения.")}</p>`);
						if (unref(employeeId) || unref(departmentId) || unref(status)) _push(`<button class="crm-button">Сбросить фильтры</button>`);
						else if (unref(data).canCreate) _push(`<button class="crm-button crm-button--primary">Добавить смену</button>`);
						else _push(`<!---->`);
						_push(`</div>`);
					} else _push(`<!---->`);
					_push(`</div></section><p class="crm-inline-note">Итоги относятся ко всей отфильтрованной выборке, до выбора дня. Переходящие через границу месяца смены включены целиком. Это план занятости, не табель и не расчёт зарплаты. Публикация пока без автоматических уведомлений.</p></div>`);
				} else _push(`<!---->`);
				if (unref(section) === "on-shift") {
					_push(`<section id="work-schedule-view-on-shift-panel" role="tabpanel" aria-labelledby="work-schedule-view-on-shift-tab" class="crm-surface"><header class="crm-panel-header"><div><p>ПО ОПУБЛИКОВАННОМУ ГРАФИКУ</p><h2>${ssrInterpolate(dateLabel(unref(onShiftDate)))} · ${ssrInterpolate(unref(employeeCountLabel)(unref(onShift).length))}</h2></div></header><div class="crm-register crm-stack"><p class="crm-inline-note">Сотрудники с рабочей сменой на выбранную дату. Это план, а не подтверждение фактического выхода. Выходные, отсутствия, черновики и отменённые смены не показаны.</p><!--[-->`);
					ssrRenderList(unref(onShift), (group) => {
						_push(`<article class="crm-item-card"><header class="crm-record"><strong>${ssrInterpolate(personName(group.employee))}</strong></header><!--[-->`);
						ssrRenderList(group.rows, (row) => {
							_push(`<div class="crm-record"><span><small>${ssrInterpolate(row.departmentName || "Без отдела")}</small><span>${ssrInterpolate(dateLabel(row.startLocal))} ${ssrInterpolate(row.startLocal.slice(11))} — ${ssrInterpolate(dateLabel(row.endLocal))} ${ssrInterpolate(row.endLocal.slice(11))}</span><small>${ssrInterpolate(row.timezone)} · ${ssrInterpolate(hours(row.plannedMinutes))}`);
							if (row.patternId) _push(`<!--[--> · По шаблону ${ssrInterpolate(row.patternLabel)}<!--]-->`);
							else _push(`<!---->`);
							_push(`</small></span><button class="crm-button"${ssrIncludeBooleanAttr(unref(opening)) ? " disabled" : ""}${ssrRenderAttr("aria-label", `Открыть график ${personName(row.employee)}, ${row.startLocal}`)}>Открыть</button></div>`);
						});
						_push(`<!--]--></article>`);
					});
					_push(`<!--]-->`);
					if (!unref(onShift).length) {
						_push(`<div class="crm-empty">`);
						_push(ssrRenderComponent(unref(CalendarFold), { size: 28 }, null, _parent));
						_push(`<h3>На эту дату смены не назначены</h3><p>Выберите другую дату или опубликуйте график.</p></div>`);
					} else _push(`<!---->`);
					_push(`</div></section>`);
				} else _push(`<!---->`);
				_push(`<!--]-->`);
			} else _push(`<!---->`);
			_push(`</div>`);
			ssrRenderTeleport(_push, (_push) => {
				if (unref(opened)) {
					_push(`<div class="admin-dialog-backdrop crm-detail-backdrop"><form class="admin-dialog admin-dialog--drawer crm-detail-card" role="dialog" aria-modal="true" aria-labelledby="schedule-title" tabindex="-1"><header><div><p>График работы</p><h2 id="schedule-title">${ssrInterpolate(unref(selected) ? personName(unref(selected).employee) : "Новая запись")}</h2></div><button class="crm-button crm-button--icon" type="button" aria-label="Закрыть карточку"${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""}>`);
					_push(ssrRenderComponent(unref(X), { size: 18 }, null, _parent));
					_push(`</button></header>`);
					if (unref(selected)) _push(ssrRenderComponent(_component_CrmCardTabs, {
						modelValue: unref(tab),
						"onUpdate:modelValue": ($event) => isRef(tab) ? tab.value = $event : null,
						prefix: "schedule",
						tabs: [["general", "Общее"], ["history", "История изменений"]]
					}, null, _parent));
					else _push(`<!---->`);
					_push(`<div${ssrRenderAttr("id", `schedule-${unref(tab)}-panel`)}${ssrRenderAttr("role", unref(selected) ? "tabpanel" : void 0)}${ssrRenderAttr("aria-labelledby", unref(selected) ? `schedule-${unref(tab)}-tab` : void 0)} class="admin-dialog-body crm-detail-body crm-stack">`);
					if (unref(formError)) {
						_push(`<div class="crm-stack" role="alert"><p>${ssrInterpolate(unref(formError))}</p>`);
						if (unref(selected)) _push(`<button class="crm-button" type="button"${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""}>Загрузить актуальную карточку</button>`);
						else _push(`<!---->`);
						_push(`</div>`);
					} else _push(`<!---->`);
					if (unref(tab) === "general") {
						_push(`<!--[-->`);
						if (unref(selected)) _push(`<p><span class="crm-badge"${ssrRenderAttr("data-status", unref(selected).status)}>${ssrInterpolate(statuses[unref(selected).status])}</span> · Версия ${ssrInterpolate(unref(selected).version)}</p>`);
						else _push(`<!---->`);
						if (unref(selected) && !unref(editable)) _push(`<p class="crm-inline-note">Запись доступна для просмотра. Для изменения опубликованного графика уполномоченный сотрудник отменяет запись с причиной и создаёт новую.</p>`);
						else _push(`<!---->`);
						_push(`<fieldset class="ui-fieldset-reset crm-stack"${ssrIncludeBooleanAttr(unref(saving) || !unref(editable)) ? " disabled" : ""}><label class="crm-field">Сотрудник<select class="crm-input" required${ssrIncludeBooleanAttr(Boolean(unref(selected))) ? " disabled" : ""}><option value="" disabled${ssrIncludeBooleanAttr(Array.isArray(unref(draft).employeeId) ? ssrLooseContain(unref(draft).employeeId, "") : ssrLooseEqual(unref(draft).employeeId, "")) ? " selected" : ""}>Выберите сотрудника</option><!--[-->`);
						ssrRenderList(unref(selected) ? [unref(selected).employee] : unref(candidates), (person) => {
							_push(`<option${ssrRenderAttr("value", person.id)}${ssrIncludeBooleanAttr(Array.isArray(unref(draft).employeeId) ? ssrLooseContain(unref(draft).employeeId, person.id) : ssrLooseEqual(unref(draft).employeeId, person.id)) ? " selected" : ""}>${ssrInterpolate(personName(person))}</option>`);
						});
						_push(`<!--]--></select></label><label class="crm-field">Тип записи<select class="crm-input"><!--[-->`);
						ssrRenderList(kinds, (label, key) => {
							_push(`<option${ssrRenderAttr("value", key)}${ssrIncludeBooleanAttr(Array.isArray(unref(draft).kind) ? ssrLooseContain(unref(draft).kind, key) : ssrLooseEqual(unref(draft).kind, key)) ? " selected" : ""}>${ssrInterpolate(label)}</option>`);
						});
						_push(`<!--]--></select></label>`);
						if (unref(draft).kind === "SHIFT") _push(`<div class="two"><label class="crm-field">Начало смены<input${ssrRenderAttr("value", unref(draft).startLocal)} class="crm-input" type="datetime-local" required></label><label class="crm-field">Окончание смены<input${ssrRenderAttr("value", unref(draft).endLocal)} class="crm-input" type="datetime-local" required></label></div>`);
						else _push(`<label class="crm-field">Дата<input${ssrRenderAttr("value", unref(draft).startLocal.slice(0, 10))} class="crm-input" type="date" required></label>`);
						_push(`<div class="two"><label class="crm-field">Часовой пояс<input${ssrRenderAttr("value", unref(draft).timezone)} class="crm-input" required maxlength="80" list="schedule-zones"></label>`);
						if (unref(draft).kind === "SHIFT") _push(`<label class="crm-field">Перерыв, минут<input${ssrRenderAttr("value", unref(draft).breakMinutes)} class="crm-input" type="number" min="0" max="1439" required></label>`);
						else _push(`<!---->`);
						_push(`</div><datalist id="schedule-zones"><option value="Europe/Moscow"></option><option value="Europe/Kaliningrad"></option><option value="Asia/Yekaterinburg"></option><option value="Asia/Novosibirsk"></option><option value="Asia/Vladivostok"></option><option value="UTC"></option></datalist><p class="crm-inline-note">Для ночной смены укажите окончание на следующий день. Перерыв вычитается из плановой длительности. Выходной и отсутствие занимают один полный день и не добавляют рабочие часы.</p><label class="crm-field">Примечание<textarea class="crm-input" rows="3" maxlength="1000" placeholder="Место работы или условия смены. Не указывайте медицинские диагнозы.">${ssrInterpolate(unref(draft).note)}</textarea></label></fieldset>`);
						if (unref(selected) && (unref(editable) || unref(selected).canPublish || unref(selected).canCancel)) _push(`<label class="crm-field">Причина изменения<input${ssrRenderAttr("value", unref(reason))} class="crm-input" maxlength="500"${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""} placeholder="Обязательна для изменения, публикации или отмены"></label>`);
						else _push(`<!---->`);
						if (unref(selected)?.canPublish || unref(selected)?.canCancel) {
							_push(`<div class="crm-action-bar">`);
							if (unref(selected).canPublish) _push(`<button class="crm-button" type="button"${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""}>Опубликовать</button>`);
							else _push(`<!---->`);
							if (unref(selected).canCancel) _push(`<button class="crm-button crm-button--danger" type="button"${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""}>Отменить запись</button>`);
							else _push(`<!---->`);
							_push(`</div>`);
						} else _push(`<!---->`);
						_push(`<!--]-->`);
					} else {
						_push(`<section class="crm-stack" aria-label="История графика"><h3>История изменений</h3><p class="crm-inline-note">Последние 50 событий. Сотруднику доступны события публикации и отмены своего графика.</p><!--[-->`);
						ssrRenderList(unref(selected)?.events, (event) => {
							_push(`<article class="crm-item-card crm-stack"><strong>${ssrInterpolate(actions[event.action])} · Версия ${ssrInterpolate(event.version)}</strong><span>${ssrInterpolate(event.actorName)} · ${ssrInterpolate(new Date(event.createdAt).toLocaleString("ru-RU"))}</span><p>${ssrInterpolate(event.reason)}</p></article>`);
						});
						_push(`<!--]-->`);
						if (!unref(selected)?.events?.length) _push(`<p>Событий пока нет.</p>`);
						else _push(`<!---->`);
						_push(`</section>`);
					}
					_push(`</div><footer class="crm-detail-footer"><button class="crm-button" type="button"${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""}>Закрыть</button>`);
					if (unref(editable) && unref(tab) === "general") _push(`<button class="crm-button crm-button--primary" type="submit"${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""}>${ssrInterpolate(unref(saving) ? "Сохраняем…" : "Сохранить черновик")}</button>`);
					else _push(`<!---->`);
					_push(`</footer></form></div>`);
				} else _push(`<!---->`);
			}, "body", false, _parent);
			_push(`</main>`);
		};
	}
});
// pages/crm/work-schedule.vue
var _sfc_setup = work_schedule_vue_vue_type_script_setup_true_lang_default.setup;
work_schedule_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/crm/work-schedule.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var work_schedule_default = work_schedule_vue_vue_type_script_setup_true_lang_default;

export { work_schedule_default as default };;globalThis.__timing__.logEnd('Load chunks/build/work-schedule-Behs3-Gt');
//# sourceMappingURL=work-schedule-Behs3-Gt.mjs.map
