globalThis.__timing__.logStart('Load chunks/build/CrmChangeHistory-ha9Jk_jf');import { u as useCrmDrive } from './CrmFilePreview-D4bnqJky.mjs';
import { defineComponent, useModel, ref, computed, watch, mergeProps, unref, mergeModels, nextTick, useId, useSSRContext } from 'vue';
import { ssrRenderAttrs, ssrRenderComponent, ssrInterpolate, ssrRenderAttr, ssrIncludeBooleanAttr, ssrRenderList, ssrRenderClass, ssrRenderSlot, ssrLooseContain, ssrLooseEqual } from 'vue/server-renderer';
import { MessageSquare, AtSign, History, RefreshCw, ListChecks, ExternalLink, Plus, Search, X } from '@lucide/vue';

// components/CrmSubtasks.vue?vue&type=script&setup=true&lang.ts
var CrmSubtasks_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "CrmSubtasks",
	__ssrInlineRender: true,
	props: /*@__PURE__*/ mergeModels({
		rows: {},
		team: {},
		busy: { type: Boolean },
		writable: { type: Boolean },
		description: {}
	}, {
		"title": { default: "" },
		"titleModifiers": {},
		"assignee": { default: "" },
		"assigneeModifiers": {}
	}),
	emits: /*@__PURE__*/ mergeModels([
		"create",
		"toggle",
		"open"
	], ["update:title", "update:assignee"]),
	setup(__props) {
		const title = useModel(__props, "title");
		const assignee = useModel(__props, "assignee");
		const person = (user) => [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email || "Не назначен";
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<section${ssrRenderAttrs(mergeProps({ class: "crm-detail-section" }, _attrs))}><h3 class="crm-icon-heading">`);
			_push(ssrRenderComponent(unref(ListChecks), {
				size: 18,
				"aria-hidden": "true"
			}, null, _parent));
			_push(`<span>Подзадачи · ${ssrInterpolate(__props.rows.filter((row) => row.status === "DONE").length)}/${ssrInterpolate(__props.rows.length)}</span></h3><p class="crm-muted">${ssrInterpolate(__props.description)}</p>`);
			if (!__props.rows.length) _push(`<p class="crm-muted">Подзадач пока нет. Разбейте работу на небольшие шаги.</p>`);
			else _push(`<!---->`);
			_push(`<!--[-->`);
			ssrRenderList(__props.rows, (task) => {
				_push(`<div class="crm-detail-subtask"><input class="crm-check" type="checkbox"${ssrIncludeBooleanAttr(task.status === "DONE") ? " checked" : ""}${ssrIncludeBooleanAttr(__props.busy || !__props.writable) ? " disabled" : ""}${ssrRenderAttr("aria-label", `Выполнено: ${task.title}`)}><div><strong>${ssrInterpolate(task.title)}</strong><small>${ssrInterpolate(person(task.assignedTo || __props.team.find((user) => user.id === task.assignedToId)))} · ${ssrInterpolate(task.progress || 0)}%</small><progress${ssrRenderAttr("value", task.progress || 0)} max="100"${ssrRenderAttr("aria-label", `Прогресс: ${task.progress || 0}%`)}></progress></div><button type="button" class="crm-button crm-button--icon"${ssrIncludeBooleanAttr(__props.busy) ? " disabled" : ""}${ssrRenderAttr("aria-label", `Открыть подзадачу: ${task.title}`)}>`);
				_push(ssrRenderComponent(unref(ExternalLink), { size: 18 }, null, _parent));
				_push(`</button></div>`);
			});
			_push(`<!--]-->`);
			if (__props.writable) {
				_push(`<div class="crm-detail-subtask-create"><label class="crm-field crm-detail-wide">Название подзадачи<input class="crm-input"${ssrRenderAttr("value", title.value)} maxlength="200" placeholder="Что нужно сделать?"${ssrIncludeBooleanAttr(__props.busy) ? " disabled" : ""}></label><label class="crm-field">Ответственный за подзадачу<select class="crm-input"${ssrIncludeBooleanAttr(__props.busy) ? " disabled" : ""}><!--[-->`);
				ssrRenderList(__props.team, (user) => {
					_push(`<option${ssrRenderAttr("value", user.id)}${ssrIncludeBooleanAttr(Array.isArray(assignee.value) ? ssrLooseContain(assignee.value, user.id) : ssrLooseEqual(assignee.value, user.id)) ? " selected" : ""}>${ssrInterpolate(person(user))}</option>`);
				});
				_push(`<!--]--></select></label><button type="button" class="crm-button"${ssrIncludeBooleanAttr(__props.busy || !title.value.trim()) ? " disabled" : ""}>`);
				_push(ssrRenderComponent(unref(Plus), { size: 16 }, null, _parent));
				_push(`Добавить подзадачу</button></div>`);
			} else _push(`<!---->`);
			_push(`</section>`);
		};
	}
});
// components/CrmSubtasks.vue
var _sfc_setup$3 = CrmSubtasks_vue_vue_type_script_setup_true_lang_default.setup;
CrmSubtasks_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/CrmSubtasks.vue");
	return _sfc_setup$3 ? _sfc_setup$3(props, ctx) : void 0;
};
var CrmSubtasks_default = Object.assign(CrmSubtasks_vue_vue_type_script_setup_true_lang_default, { __name: "CrmSubtasks" });
// components/CrmTaskPeoplePicker.vue?vue&type=script&setup=true&lang.ts
var CrmTaskPeoplePicker_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "CrmTaskPeoplePicker",
	__ssrInlineRender: true,
	props: {
		taskId: {},
		exclude: { default: () => [] },
		disabled: { type: Boolean }
	},
	emits: ["select", "close"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const { request, message } = useCrmDrive(), query = ref(""), users = ref([]), loading = ref(false), error = ref(""), active = ref(0);
		ref();
		const listId = useId();
		const people = computed(() => users.value.filter((user) => !props.exclude.includes(user.id)));
		const person = (u) => [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email;
		let sequence = 0, timer;
		async function load() {
			const seq = ++sequence;
			loading.value = true;
			error.value = "";
			try {
				const result = await request("task-people", { query: {
					q: query.value,
					taskId: props.taskId
				} });
				if (seq === sequence) {
					users.value = result;
					active.value = 0;
				}
			} catch (e) {
				if (seq === sequence) error.value = message(e);
			} finally {
				if (seq === sequence) loading.value = false;
			}
		}
		watch(query, () => {
			clearTimeout(timer);
			++sequence;
			loading.value = true;
			timer = setTimeout(load, 200);
		});
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<div${ssrRenderAttrs(mergeProps({ class: "crm-task-people-picker" }, _attrs))}><div class="crm-task-people-search"><label class="crm-input-group">`);
			_push(ssrRenderComponent(unref(Search), { size: 16 }, null, _parent));
			_push(`<input class="crm-input"${ssrRenderAttr("value", unref(query))} placeholder="Имя или фамилия сотрудника" aria-label="Найти сотрудника" role="combobox" aria-autocomplete="list"${ssrRenderAttr("aria-expanded", true)}${ssrRenderAttr("aria-controls", unref(listId))}${ssrRenderAttr("aria-activedescendant", unref(people)[unref(active)] ? `${unref(listId)}-${unref(active)}` : void 0)}${ssrIncludeBooleanAttr(__props.disabled) ? " disabled" : ""}></label><button type="button" class="crm-button crm-button--icon" aria-label="Закрыть выбор сотрудника">`);
			_push(ssrRenderComponent(unref(X), { size: 16 }, null, _parent));
			_push(`</button></div>`);
			if (unref(error)) _push(`<p class="crm-work-error" role="alert">${ssrInterpolate(unref(error))} <button type="button" class="crm-button">Повторить</button></p>`);
			else if (unref(loading)) _push(`<p class="crm-muted" role="status">Ищем сотрудников…</p>`);
			else {
				_push(`<div${ssrRenderAttr("id", unref(listId))} role="listbox" aria-label="Сотрудники" class="crm-task-people-results"><!--[-->`);
				ssrRenderList(unref(people), (user, index) => {
					_push(`<button${ssrRenderAttr("id", `${unref(listId)}-${index}`)} type="button" role="option"${ssrRenderAttr("aria-selected", index === unref(active))} class="crm-task-person-option crm-card-action"${ssrIncludeBooleanAttr(__props.disabled) ? " disabled" : ""}><span class="crm-avatar">${ssrInterpolate(person(user).slice(0, 1))}</span><span><strong>${ssrInterpolate(person(user))}</strong><small>${ssrInterpolate(user.department?.name || user.email)}</small></span></button>`);
				});
				_push(`<!--]-->`);
				if (!unref(people).length) _push(`<p class="crm-muted">Сотрудники не найдены. Показаны сотрудники с доступом к задаче.</p>`);
				else _push(`<!---->`);
				_push(`</div>`);
			}
			_push(`</div>`);
		};
	}
});
// components/CrmTaskPeoplePicker.vue
var _sfc_setup$2 = CrmTaskPeoplePicker_vue_vue_type_script_setup_true_lang_default.setup;
CrmTaskPeoplePicker_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/CrmTaskPeoplePicker.vue");
	return _sfc_setup$2 ? _sfc_setup$2(props, ctx) : void 0;
};
var CrmTaskPeoplePicker_default = Object.assign(CrmTaskPeoplePicker_vue_vue_type_script_setup_true_lang_default, { __name: "CrmTaskPeoplePicker" });
// components/CrmCardComments.vue?vue&type=script&setup=true&lang.ts
var CrmCardComments_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "CrmCardComments",
	__ssrInlineRender: true,
	props: /*@__PURE__*/ mergeModels({
		entries: {},
		total: {},
		busy: { type: Boolean },
		writable: { type: Boolean },
		taskId: {}
	}, {
		"modelValue": { default: "" },
		"modelModifiers": {}
	}),
	emits: /*@__PURE__*/ mergeModels(["send"], ["update:modelValue"]),
	setup(__props, { emit: __emit }) {
		const props = __props;
		const text = useModel(__props, "modelValue");
		const person = (user) => [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email || "Система";
		const textarea = ref(), choosing = ref(false), mentions = ref([]);
		let insertion = 0;
		const activeMentions = computed(() => mentions.value.filter((user) => text.value.includes("@" + person(user))));
		async function pick(user) {
			const end = insertion + (text.value[insertion] === "@" ? 1 : 0);
			const token = "@" + person(user) + " ";
			text.value = text.value.slice(0, insertion) + token + text.value.slice(end);
			if (!mentions.value.some((row) => row.id === user.id)) mentions.value.push(user);
			choosing.value = false;
			await nextTick();
			textarea.value?.focus();
			textarea.value?.setSelectionRange(insertion + token.length, insertion + token.length);
		}
		function parts(entry) {
			const names = (Array.isArray(entry.mentions) ? entry.mentions : []).map((u) => "@" + u.name).sort((a, b) => b.length - a.length);
			if (!names.length) return [{
				text: entry.body,
				mention: false
			}];
			const escaped = names.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
			return String(entry.body).split(new RegExp("(" + escaped.join("|") + ")", "g")).map((part) => ({
				text: part,
				mention: names.includes(part)
			}));
		}
		watch(text, (value) => {
			if (!value) {
				mentions.value = [];
				choosing.value = false;
			}
		});
		watch(() => props.taskId, () => {
			mentions.value = [];
			choosing.value = false;
		});
		return (_ctx, _push, _parent, _attrs) => {
			const _component_CrmTaskPeoplePicker = CrmTaskPeoplePicker_default;
			_push(`<section${ssrRenderAttrs(mergeProps({ class: "crm-detail-section" }, _attrs))}><h3 class="crm-icon-heading">`);
			_push(ssrRenderComponent(unref(MessageSquare), {
				size: 18,
				"aria-hidden": "true"
			}, null, _parent));
			_push(`<span>Комментарии · ${ssrInterpolate(__props.total)}</span></h3>`);
			if (__props.writable) {
				_push(`<div class="crm-detail-compose"><textarea class="crm-input" rows="3" maxlength="10000" aria-label="Текст комментария"${ssrRenderAttr("placeholder", __props.taskId ? "Написать комментарий… @ — упомянуть сотрудника" : "Написать комментарий")}${ssrIncludeBooleanAttr(__props.busy) ? " disabled" : ""}>${ssrInterpolate(text.value)}</textarea>`);
				if (unref(choosing) && __props.taskId) _push(ssrRenderComponent(_component_CrmTaskPeoplePicker, {
					"task-id": __props.taskId,
					exclude: unref(activeMentions).map((user) => user.id),
					disabled: __props.busy,
					onSelect: pick,
					onClose: ($event) => {
						choosing.value = false;
						unref(textarea)?.focus();
					}
				}, null, _parent));
				else _push(`<!---->`);
				if (unref(activeMentions).length) _push(`<p class="crm-task-mention-hint">Получат уведомление: ${ssrInterpolate(unref(activeMentions).map(person).join(", "))}. Они также станут участниками задачи.</p>`);
				else _push(`<!---->`);
				_push(`<div class="crm-task-comment-actions">`);
				if (__props.taskId) {
					_push(`<button type="button" class="crm-button"${ssrIncludeBooleanAttr(__props.busy) ? " disabled" : ""}>`);
					_push(ssrRenderComponent(unref(AtSign), { size: 16 }, null, _parent));
					_push(`Упомянуть</button>`);
				} else _push(`<!---->`);
				_push(`<button type="button" class="crm-button crm-button--primary"${ssrIncludeBooleanAttr(__props.busy || !text.value.trim()) ? " disabled" : ""}>${ssrInterpolate(__props.busy ? "Отправляем…" : "Отправить")}</button></div></div>`);
			} else _push(`<!---->`);
			if (!__props.entries.length) _push(`<p class="crm-muted">Комментариев пока нет.</p>`);
			else _push(`<!---->`);
			_push(`<!--[-->`);
			ssrRenderList(__props.entries, (entry) => {
				_push(`<article class="crm-detail-comment"><span class="crm-avatar">${ssrInterpolate(person(entry.author).slice(0, 1))}</span><div><strong>${ssrInterpolate(person(entry.author))}</strong><p><!--[-->`);
				ssrRenderList(parts(entry), (part, index) => {
					_push(`<span class="${ssrRenderClass({ "crm-task-mention": part.mention })}">${ssrInterpolate(part.text)}</span>`);
				});
				_push(`<!--]--></p><time${ssrRenderAttr("datetime", entry.createdAt)}>${ssrInterpolate(new Date(entry.createdAt).toLocaleString("ru-RU"))}</time></div></article>`);
			});
			_push(`<!--]-->`);
			ssrRenderSlot(_ctx.$slots, "default", {}, null, _push, _parent);
			_push(`</section>`);
		};
	}
});
// components/CrmCardComments.vue
var _sfc_setup$1 = CrmCardComments_vue_vue_type_script_setup_true_lang_default.setup;
CrmCardComments_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/CrmCardComments.vue");
	return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
var CrmCardComments_default = Object.assign(CrmCardComments_vue_vue_type_script_setup_true_lang_default, { __name: "CrmCardComments" });
// components/CrmChangeHistory.vue?vue&type=script&setup=true&lang.ts
var CrmChangeHistory_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "CrmChangeHistory",
	__ssrInlineRender: true,
	props: {
		kind: {},
		entityId: {},
		team: {},
		stages: {},
		revision: {}
	},
	setup(__props) {
		const props = __props;
		const { request, message } = useCrmDrive();
		const items = ref([]), more = ref(false), loading = ref(false), error = ref("");
		let sequence = 0;
		const labels = {
			participants: "Участники",
			title: "Название",
			description: "Описание",
			status: "Статус",
			priority: "Приоритет",
			progress: "Выполнение, %",
			assignedToId: "Ответственный",
			managerId: "Ответственный",
			parentId: "Родительская задача",
			leadId: "Сделка",
			startDate: "Начало",
			dueDate: "Срок",
			labels: "Метки",
			estimateMinutes: "Оценка, мин",
			contactName: "Контакт",
			contactPhone: "Телефон",
			contactEmail: "Почта",
			stageId: "Этап",
			amount: "Сумма",
			probability: "Вероятность, %",
			expectedCloseAt: "План закрытия",
			nextContactAt: "Следующий контакт",
			lostReason: "Причина проигрыша",
			tags: "Теги",
			file: "Файл",
			task: "Подзадача"
		};
		const names = {
			BACKLOG: "В очереди",
			TODO: "К выполнению",
			IN_PROGRESS: "В работе",
			REVIEW: "На проверке",
			OVERDUE: "Просрочена",
			DONE: "Выполнена",
			CANCELLED: "В архиве",
			LOW: "Низкий",
			MEDIUM: "Обычный",
			HIGH: "Высокий",
			CRITICAL: "Критический",
			NEW: "Новая",
			WON: "Успешно",
			LOST: "Проиграна",
			CONTACTED: "Первичный контакт",
			QUALIFIED: "Квалификация",
			NEGOTIATION: "Переговоры"
		};
		const person = (u) => [u?.firstName, u?.lastName].filter(Boolean).join(" ") || u?.email || "Система";
		function value(field, v) {
			if (v === null || v === void 0 || v === "") return "Не задано";
			if (["assignedToId", "managerId"].includes(field)) return person(props.team?.find((x) => x.id === v)) === "Система" ? "Сотрудник (не в текущей команде)" : person(props.team?.find((x) => x.id === v));
			if (field === "stageId") return props.stages?.find((x) => x.id === v)?.name || "Этап вне текущей воронки";
			if (["parentId", "leadId"].includes(field)) return "Связанная карточка";
			if (/Date$|At$/.test(field)) return new Date(v).toLocaleString("ru-RU");
			if (Array.isArray(v)) return v.join(", ") || "Не задано";
			return names[v] || String(v);
		}
		async function load(append = false) {
			const seq = ++sequence;
			loading.value = true;
			error.value = "";
			try {
				const result = await request(`${props.kind}/${props.entityId}/history`, { query: { before: append ? items.value.at(-1)?.id : void 0 } });
				if (seq === sequence) {
					items.value = append ? [...items.value, ...result.items] : result.items;
					more.value = result.more;
				}
			} catch (e) {
				error.value = message(e);
			} finally {
				if (seq === sequence) loading.value = false;
			}
		}
		watch(() => [props.entityId, props.revision], () => load(), { immediate: true });
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<section${ssrRenderAttrs(mergeProps({ class: "crm-change-history" }, _attrs))}><header class="crm-work-header"><h3 class="crm-icon-heading">`);
			_push(ssrRenderComponent(unref(History), {
				size: 18,
				"aria-hidden": "true"
			}, null, _parent));
			_push(`<span>История изменений</span></h3><button class="crm-work-button crm-button crm-button--refresh"${ssrIncludeBooleanAttr(unref(loading)) ? " disabled" : ""}>`);
			_push(ssrRenderComponent(unref(RefreshCw), { size: 16 }, null, _parent));
			_push(`Обновить</button></header><p class="crm-muted">События фиксируются с момента подключения истории. Старые изменения не восстанавливаются задним числом.</p>`);
			if (unref(error)) _push(`<p role="alert" class="crm-work-error">${ssrInterpolate(unref(error))}</p>`);
			else _push(`<!---->`);
			if (unref(loading)) _push(`<p role="status">Загружаем историю…</p>`);
			else _push(`<!---->`);
			if (!unref(loading) && !unref(items).length) _push(`<p class="crm-muted">Изменений пока нет.</p>`);
			else _push(`<!---->`);
			_push(`<!--[-->`);
			ssrRenderList(unref(items), (item) => {
				_push(`<article><header><strong>${ssrInterpolate(person(item.actor))}</strong><time>${ssrInterpolate(new Date(item.createdAt).toLocaleString("ru-RU"))}</time></header><p>${ssrInterpolate(item.action)}</p><dl><!--[-->`);
				ssrRenderList(item.payload?.changes || [], (change, index) => {
					_push(`<!--[--><dt>${ssrInterpolate(labels[change.field] || change.field)}</dt><dd><span class="crm-history-before">${ssrInterpolate(value(change.field, change.from))}</span><span aria-hidden="true"> → </span><span>${ssrInterpolate(value(change.field, change.to))}</span></dd><!--]-->`);
				});
				_push(`<!--]--></dl></article>`);
			});
			_push(`<!--]-->`);
			if (unref(more)) _push(`<button class="crm-work-button crm-button"${ssrIncludeBooleanAttr(unref(loading)) ? " disabled" : ""}>Ранее</button>`);
			else _push(`<!---->`);
			_push(`</section>`);
		};
	}
});
// components/CrmChangeHistory.vue
var _sfc_setup = CrmChangeHistory_vue_vue_type_script_setup_true_lang_default.setup;
CrmChangeHistory_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/CrmChangeHistory.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var CrmChangeHistory_default = Object.assign(CrmChangeHistory_vue_vue_type_script_setup_true_lang_default, { __name: "CrmChangeHistory" });

export { CrmCardComments_default as C, CrmChangeHistory_default as a, CrmSubtasks_default as b, CrmTaskPeoplePicker_default as c };;globalThis.__timing__.logEnd('Load chunks/build/CrmChangeHistory-ha9Jk_jf');
//# sourceMappingURL=CrmChangeHistory-ha9Jk_jf.mjs.map
