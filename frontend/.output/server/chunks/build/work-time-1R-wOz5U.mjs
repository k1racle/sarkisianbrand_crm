globalThis.__timing__.logStart('Load chunks/build/work-time-1R-wOz5U');import { u as useHead, a as useWorkspaceSession, b as useWorkspaceAccess, N as NuxtLink, $ as $fetch$1, f as useRuntimeConfig } from '../virtual/entry.mjs';
import { u as useCatalogDialog } from './useCatalogDialog-2pnsnnsL.mjs';
import { C as CrmCardTabs_default } from './CrmCardTabs-CwDu8QcL.mjs';
import { C as CrmWorkClock_default, w as workTimeDuration, a as workTimeLocal } from './CrmWorkClock-Dx7xM2cg.mjs';
import { defineComponent, ref, computed, watch, mergeProps, unref, withCtx, createTextVNode, isRef, nextTick, reactive, useSSRContext } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import { ssrRenderAttrs, ssrRenderComponent, ssrInterpolate, ssrRenderStyle, ssrRenderAttr, ssrIncludeBooleanAttr, ssrRenderList, ssrLooseContain, ssrLooseEqual, ssrRenderTeleport } from 'vue/server-renderer';
import { RefreshCw, Plus, X, Trash2, Download, ArrowRight } from '@lucide/vue';
import { r as requestKey } from '../_/request-key.mjs';
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

const sheetStatus = { DRAFT: "\u0420\u0430\u0431\u043E\u0447\u0438\u0439 \u043E\u0442\u0447\u0451\u0442", REVIEWED: "\u041F\u0440\u043E\u0432\u0435\u0440\u0435\u043D", APPROVED: "\u0423\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043D", CLOSED: "\u0417\u0430\u043A\u0440\u044B\u0442" };
const sheetAction = { REVIEW: "\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u044C \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0443", APPROVE: "\u0423\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u044C \u0442\u0430\u0431\u0435\u043B\u044C", CLOSE: "\u0417\u0430\u043A\u0440\u044B\u0442\u044C \u043C\u0435\u0441\u044F\u0446", REOPEN: "\u041F\u0435\u0440\u0435\u043E\u0442\u043A\u0440\u044B\u0442\u044C \u043C\u0435\u0441\u044F\u0446" };
const sheetEvent = { REVIEW: "\u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0430", APPROVE: "\u0422\u0430\u0431\u0435\u043B\u044C \u0443\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043D", CLOSE: "\u041C\u0435\u0441\u044F\u0446 \u0437\u0430\u043A\u0440\u044B\u0442", REOPEN: "\u041C\u0435\u0441\u044F\u0446 \u043F\u0435\u0440\u0435\u043E\u0442\u043A\u0440\u044B\u0442" };
const sheetPerson = (person) => [person.firstName, person.lastName].filter(Boolean).join(" ") || "\u0421\u043E\u0442\u0440\u0443\u0434\u043D\u0438\u043A";
function sheetIssueLabels(issues) {
  return [issues.overlap ? "\u041F\u0435\u0440\u0435\u0441\u0435\u0447\u0435\u043D\u0438\u0435 \u043E\u0442\u043C\u0435\u0442\u043E\u043A" : "", issues.unclosed ? `\u041D\u0435\u0437\u0430\u043A\u0440\u044B\u0442\u044B\u0445 \u0438\u043D\u0442\u0435\u0440\u0432\u0430\u043B\u043E\u0432: ${issues.unclosed}` : "", issues.pending ? `\u0418\u0441\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0439 \u043D\u0430 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0435: ${issues.pending}` : "", issues.missing ? typeof issues.missing === "number" ? `\u0414\u043D\u0435\u0439 \u043F\u043E \u043F\u043B\u0430\u043D\u0443 \u0431\u0435\u0437 \u043E\u0442\u043C\u0435\u0442\u043E\u043A: ${issues.missing}` : "\u0415\u0441\u0442\u044C \u043F\u043B\u0430\u043D, \u043D\u0435\u0442 \u043E\u0442\u043C\u0435\u0442\u043E\u043A" : "", issues.planUnavailable ? "\u041F\u043B\u0430\u043D \u043D\u0435 \u0440\u0430\u0441\u0441\u0447\u0438\u0442\u0430\u043D" : ""].filter(Boolean);
}

// components/crm/CrmTimeCorrections.vue?vue&type=script&setup=true&lang.ts
var CrmTimeCorrections_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "CrmTimeCorrections",
	__ssrInlineRender: true,
	props: {
		visible: { type: Boolean },
		scope: {},
		canCreate: { type: Boolean },
		canReview: { type: Boolean },
		timezone: {},
		month: {}
	},
	emits: ["changed", "showMine"],
	setup(__props, { expose: __expose, emit: __emit }) {
		const props = __props;
		const { token, user } = useWorkspaceSession(), config = useRuntimeConfig();
		const request = (path, options = {}) => $fetch$1("/crm/work-time" + path, {
			baseURL: config.public.apiBase,
			headers: { Authorization: `Bearer ${token.value}` },
			timeout: 15e3,
			retry: 0,
			...options
		});
		const listing = ref(null), page = ref(1), status = ref("PENDING"), loading = ref(false), error = ref("");
		const unclosed = ref(null), unclosedPage = ref(1);
		const opened = ref(false), busy = ref(false), formError = ref(""), selected = ref(null), source = ref(null), note = ref("");
		const pending = ref(null), requestKey$1 = ref(""), baseline = ref("");
		const draft = reactive({
			startLocal: "",
			endLocal: "",
			timezone: "Europe/Moscow",
			reason: "",
			breaks: []
		});
		const labels = {
			PENDING: "На проверке",
			APPROVED: "Принято",
			REJECTED: "Отклонено",
			CANCELLED: "Отозвано"
		};
		const message = (e) => Array.isArray(e?.data?.message) ? e.data.message.join(". ") : e?.data?.message || "Нет подтверждения от сервера. Введённые данные сохранены в форме.";
		const person = (row) => [row.firstName, row.lastName].filter(Boolean).join(" ") || "Сотрудник";
		const date = (value, timezone = props.timezone) => value ? new Date(value).toLocaleString("ru-RU", {
			timeZone: timezone,
			day: "numeric",
			month: "short",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit"
		}) : "Не завершён";
		const dirty = computed(() => opened.value && (pending.value || (selected.value ? Boolean(note.value.trim()) : baseline.value !== JSON.stringify(draft))));
		let loadVersion = 0, openVersion = 0;
		async function load() {
			if (!props.visible || false) return;
			const version = ++loadVersion, identity = token.value;
			loading.value = true;
			error.value = "";
			listing.value = null;
			unclosed.value = null;
			try {
				const [rows, open] = await Promise.all([request("/corrections", { query: {
					scope: props.scope,
					page: page.value,
					...status.value ? { status: status.value } : {}
				} }), props.scope === "REVIEW" && props.canReview ? request("/unclosed", { query: { page: unclosedPage.value } }) : null]);
				if (version === loadVersion && identity === token.value) {
					listing.value = rows;
					unclosed.value = open;
				}
			} catch (e) {
				if (version === loadVersion && identity === token.value) error.value = message(e);
			} finally {
				if (version === loadVersion && identity === token.value) loading.value = false;
			}
		}
		function leave() {
			return !busy.value && (!dirty.value || (void 0).confirm("Изменения формы не сохранены или ещё не подтверждены сервером. Закрыть форму?"));
		}
		function close() {
			if (leave()) {
				opened.value = false;
				++openVersion;
			}
		}
		useCatalogDialog(computed(() => opened.value), close);
		function create(row = null) {
			if (!props.canCreate || !leave()) return;
			source.value = row;
			selected.value = null;
			pending.value = null;
			note.value = "";
			formError.value = "";
			requestKey$1.value = requestKey();
			const tz = row?.timezone || props.timezone;
			Object.assign(draft, {
				startLocal: row ? workTimeLocal(row.startedAt, tz) : props.month + "-01T09:00",
				endLocal: row?.endedAt ? workTimeLocal(row.endedAt, tz) : "",
				timezone: tz,
				reason: "",
				breaks: row?.breaks.map((pause) => ({
					startLocal: workTimeLocal(pause.startedAt, tz),
					endLocal: pause.endedAt ? workTimeLocal(pause.endedAt, tz) : ""
				})) || []
			});
			baseline.value = JSON.stringify(draft);
			opened.value = true;
		}
		async function open(id) {
			if (!leave()) return;
			const version = ++openVersion, identity = token.value;
			busy.value = true;
			error.value = "";
			formError.value = "";
			try {
				const row = await request("/corrections/" + id);
				if (version === openVersion && identity === token.value) {
					selected.value = row;
					source.value = null;
					note.value = "";
					pending.value = null;
					opened.value = true;
				}
			} catch (e) {
				if (version === openVersion && identity === token.value) {
					if (opened.value) formError.value = message(e);
					else error.value = message(e);
				}
			} finally {
				if (version === openVersion && identity === token.value) busy.value = false;
			}
		}
		watch(() => [props.visible, props.scope], () => {
			++loadVersion;
			listing.value = null;
			unclosed.value = null;
			page.value = 1;
			unclosedPage.value = 1;
			if (props.visible) load();
		});
		watch(token, () => {
			++loadVersion;
			++openVersion;
			opened.value = false;
			busy.value = false;
			pending.value = null;
			selected.value = null;
			source.value = null;
			listing.value = null;
			unclosed.value = null;
			load();
		});
		onBeforeRouteLeave(() => leave());
		__expose({
			create,
			open,
			refresh: load
		});
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<!--[-->`);
			if (__props.visible) {
				_push(`<div class="crm-page-content--stack crm-time-corrections"><section class="crm-surface"${ssrRenderAttr("aria-label", __props.scope === "REVIEW" ? "Проверка исправлений" : "Мои исправления")}><header class="crm-panel-header"><div><p>${ssrInterpolate(__props.scope === "REVIEW" ? "ПРОВЕРКА ВРЕМЕНИ" : "МОИ ЗАЯВКИ")}</p><h2>${ssrInterpolate(__props.scope === "REVIEW" ? "Исправления сотрудников" : "Запросы на исправление")}</h2></div>`);
				if (__props.scope === "MINE" && __props.canCreate) {
					_push(`<button class="crm-button crm-button--primary"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}>`);
					_push(ssrRenderComponent(unref(Plus), { size: 18 }, null, _parent));
					_push(`Добавить пропущенный день</button>`);
				} else _push(`<!---->`);
				_push(`</header><div class="crm-register crm-page-content--stack"><p class="crm-inline-note">${ssrInterpolate(__props.scope === "REVIEW" ? "Сравните исходные и предложенные отметки. Подтвердить свои часы нельзя; при изменении исходной отметки нужна новая заявка." : "Часы изменятся только после принятия другим руководителем. Здесь видны заявки за все месяцы. Для изменения существующей отметки откройте её в истории.")}</p>`);
				if (__props.scope === "REVIEW" && unref(listing)?.ownPendingTotal) _push(`<aside class="crm-time-own-request" role="status"><div><strong>Ваши заявки ожидают другого руководителя: ${ssrInterpolate(unref(listing).ownPendingTotal)}</strong><p>Они находятся в «Моих исправлениях». Свою заявку нельзя согласовать самостоятельно, поэтому в очередь проверки команды она не входит.</p></div><button class="crm-button" type="button">Мои исправления</button></aside>`);
				else _push(`<!---->`);
				if (__props.scope === "REVIEW" && unref(listing)?.reviewScope) _push(`<p class="crm-inline-note">${ssrInterpolate(unref(listing).reviewScope === "COMPANY" ? "Здесь заявки остальных сотрудников всей компании." : "Здесь заявки сотрудников отделов, которыми вы руководите. Заявки вне этих отделов проверяет высшее руководство или администратор с правом проверки времени.")}</p>`);
				else _push(`<!---->`);
				_push(`<div class="crm-filter-form crm-filter-form--compact"><label>Состояние заявки<select class="crm-input"><option value=""${ssrIncludeBooleanAttr(Array.isArray(unref(status)) ? ssrLooseContain(unref(status), "") : ssrLooseEqual(unref(status), "")) ? " selected" : ""}>Все состояния</option><!--[-->`);
				ssrRenderList(labels, (label, key) => {
					_push(`<option${ssrRenderAttr("value", key)}${ssrIncludeBooleanAttr(Array.isArray(unref(status)) ? ssrLooseContain(unref(status), key) : ssrLooseEqual(unref(status), key)) ? " selected" : ""}>${ssrInterpolate(label)}</option>`);
				});
				_push(`<!--]--></select></label><button class="crm-button crm-button--refresh"${ssrIncludeBooleanAttr(unref(loading) || unref(busy)) ? " disabled" : ""}>`);
				_push(ssrRenderComponent(unref(RefreshCw), { size: 18 }, null, _parent));
				_push(`Обновить заявки</button></div>`);
				if (unref(loading)) _push(`<p role="status">Загружаем заявки…</p>`);
				else _push(`<!---->`);
				if (unref(error)) _push(`<p role="alert">${ssrInterpolate(unref(error))}</p>`);
				else _push(`<!---->`);
				if (unref(listing)) {
					_push(`<!--[-->`);
					if (!unref(listing).items.length) _push(`<p>${ssrInterpolate(__props.scope === "REVIEW" ? "Заявок других сотрудников с выбранным состоянием нет." : "Заявок с выбранным состоянием пока нет.")}</p>`);
					else _push(`<!---->`);
					_push(`<!--[-->`);
					ssrRenderList(unref(listing).items, (row) => {
						_push(`<article class="crm-item-card crm-record"><span><strong>${ssrInterpolate(__props.scope === "REVIEW" ? person(row.employee) : date(row.proposal.startedAt, row.proposal.timezone))}</strong><small>${ssrInterpolate(row.reason)}</small><small>${ssrInterpolate(date(row.proposal.startedAt, row.proposal.timezone))} — ${ssrInterpolate(date(row.proposal.endedAt, row.proposal.timezone))}</small>`);
						if (row.stale) _push(`<small>Исходная отметка уже изменена</small>`);
						else _push(`<!---->`);
						_push(`</span><span class="crm-badge">${ssrInterpolate(labels[row.status])}</span><button class="crm-button"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}${ssrRenderAttr("aria-label", "Открыть заявку: " + row.reason)}>Открыть</button></article>`);
					});
					_push(`<!--]--><div class="crm-action-bar crm-action-bar--spread"><span>Всего заявок: ${ssrInterpolate(unref(listing).total)} · ${ssrInterpolate(unref(listing).page)} / ${ssrInterpolate(unref(listing).pages)}</span><div class="crm-action-bar"><button class="crm-button"${ssrIncludeBooleanAttr(unref(loading) || unref(page) <= 1) ? " disabled" : ""}>Назад</button><button class="crm-button"${ssrIncludeBooleanAttr(unref(loading) || unref(page) >= unref(listing).pages) ? " disabled" : ""}>Далее</button></div></div><!--]-->`);
				} else _push(`<!---->`);
				_push(`</div></section>`);
				if (__props.scope === "REVIEW" && unref(unclosed)) {
					_push(`<section class="crm-surface" aria-label="Незакрытые дни команды"><header class="crm-panel-header"><div><p>НУЖНО ПРОВЕРИТЬ</p><h2>Дни, открытые больше 24 часов</h2></div></header><div class="crm-register crm-page-content--stack"><p class="crm-inline-note">Возможны забытые отметки. Попросите сотрудника отправить исправление из истории времени. Эти часы нельзя автоматически считать достоверными для зарплаты.</p>`);
					if (!unref(unclosed).items.length) _push(`<p>Таких дней у доступных сотрудников нет.</p>`);
					else _push(`<!---->`);
					_push(`<!--[-->`);
					ssrRenderList(unref(unclosed).items, (row) => {
						_push(`<article class="crm-item-card crm-record"><span><strong>${ssrInterpolate(person(row.employee))}</strong><small>Открыт ${ssrInterpolate(date(row.startedAt, row.timezone))} · ${ssrInterpolate(row.timezone)}</small></span><span>${ssrInterpolate(unref(workTimeDuration)(row.totals.workedMs))} по незакрытым отметкам</span></article>`);
					});
					_push(`<!--]--><div class="crm-action-bar crm-action-bar--spread"><span>Всего: ${ssrInterpolate(unref(unclosed).total)} · ${ssrInterpolate(unref(unclosed).page)} / ${ssrInterpolate(unref(unclosed).pages)}</span><div class="crm-action-bar"><button class="crm-button"${ssrIncludeBooleanAttr(unref(loading) || unref(unclosedPage) <= 1) ? " disabled" : ""}>Предыдущие дни</button><button class="crm-button"${ssrIncludeBooleanAttr(unref(loading) || unref(unclosedPage) >= unref(unclosed).pages) ? " disabled" : ""}>Следующие дни</button></div></div></div></section>`);
				} else _push(`<!---->`);
				_push(`</div>`);
			} else _push(`<!---->`);
			ssrRenderTeleport(_push, (_push) => {
				if (unref(opened)) {
					_push(`<div class="admin-dialog-backdrop crm-detail-backdrop"><form class="admin-dialog admin-dialog--drawer crm-detail-card" role="dialog" aria-modal="true" aria-labelledby="time-correction-title" tabindex="-1"><header><div><p>Рабочее время</p><h2 id="time-correction-title">${ssrInterpolate(unref(selected) ? "Проверка исправления" : unref(source) ? "Исправить отметку" : "Добавить пропущенный день")}</h2></div><button class="crm-button crm-button--icon" type="button" aria-label="Закрыть исправление"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}>`);
					_push(ssrRenderComponent(unref(X), { size: 18 }, null, _parent));
					_push(`</button></header><div class="admin-dialog-body crm-detail-body crm-stack">`);
					if (unref(formError)) _push(`<p role="alert">${ssrInterpolate(unref(formError))}</p>`);
					else _push(`<!---->`);
					if (unref(pending) && !unref(busy)) _push(`<p class="crm-inline-note">Ответ не подтверждён. «Проверить сохранение» повторит прежний запрос, не создавая второй.</p>`);
					else _push(`<!---->`);
					if (!unref(selected)) {
						_push(`<!--[--><p class="crm-inline-note">${ssrInterpolate(unref(draft).timezone)} · Точность исправления — минута. Заполните фактический законченный интервал, не план. Прежние отметки сохранятся в истории.</p><fieldset class="ui-fieldset-reset crm-stack"${ssrIncludeBooleanAttr(unref(busy) || Boolean(unref(pending))) ? " disabled" : ""}><div class="two"><label class="crm-field">Начало работы<input${ssrRenderAttr("value", unref(draft).startLocal)} class="crm-input" type="datetime-local" required></label><label class="crm-field">Окончание работы<input${ssrRenderAttr("value", unref(draft).endLocal)} class="crm-input" type="datetime-local" required></label></div><h3>Перерывы</h3>`);
						if (!unref(draft).breaks.length) _push(`<p class="crm-inline-note">Перерывов нет. Если они были, добавьте каждый интервал.</p>`);
						else _push(`<!---->`);
						_push(`<!--[-->`);
						ssrRenderList(unref(draft).breaks, (pause, index) => {
							_push(`<div class="crm-stack"><div class="two"><label class="crm-field">Начало перерыва ${ssrInterpolate(index + 1)}<input${ssrRenderAttr("value", pause.startLocal)} class="crm-input" type="datetime-local" required></label><label class="crm-field">Конец перерыва ${ssrInterpolate(index + 1)}<input${ssrRenderAttr("value", pause.endLocal)} class="crm-input" type="datetime-local" required></label></div><button class="crm-button crm-button--text" type="button">`);
							_push(ssrRenderComponent(unref(Trash2), { size: 18 }, null, _parent));
							_push(`Удалить перерыв ${ssrInterpolate(index + 1)}</button></div>`);
						});
						_push(`<!--]--><button class="crm-button" type="button"${ssrIncludeBooleanAttr(unref(draft).breaks.length >= 24) ? " disabled" : ""}>`);
						_push(ssrRenderComponent(unref(Plus), { size: 18 }, null, _parent));
						_push(`Добавить перерыв</button><label class="crm-field">Причина исправления<textarea class="crm-input" rows="3" minlength="5" maxlength="1000" required placeholder="Например, забыл завершить день после смены">${ssrInterpolate(unref(draft).reason)}</textarea></label></fieldset><!--]-->`);
					} else {
						_push(`<!--[--><p><strong>${ssrInterpolate(person(unref(selected).employee))}</strong> · <span class="crm-badge">${ssrInterpolate(labels[unref(selected).status])}</span></p><p>${ssrInterpolate(unref(selected).reason)}</p><p class="crm-inline-note">Часовой пояс: ${ssrInterpolate(unref(selected).proposal.timezone)}</p>`);
						if (unref(selected).status === "PENDING" && unref(selected).employee.id === unref(user)?.id) _push(`<p class="crm-notice" role="status">Это ваша заявка. Её должен проверить другой сотрудник с правом согласования времени: руководитель вашего отдела, высшее руководство или администратор. До согласования часы в табеле остаются прежними.</p>`);
						else _push(`<!---->`);
						_push(`<section class="crm-stack" aria-label="Исходные отметки"><h3>Было</h3>`);
						if (unref(selected).original) {
							_push(`<!--[--><p>${ssrInterpolate(date(unref(selected).original.startedAt, unref(selected).original.timezone))} — ${ssrInterpolate(date(unref(selected).original.endedAt, unref(selected).original.timezone))}</p><!--[-->`);
							ssrRenderList(unref(selected).original.breaks, (pause, index) => {
								_push(`<p class="crm-inline-note">Перерыв: ${ssrInterpolate(date(pause.startedAt, unref(selected).original.timezone))} — ${ssrInterpolate(date(pause.endedAt, unref(selected).original.timezone))}</p>`);
							});
							_push(`<!--]--><!--]-->`);
						} else _push(`<p>Отметки нет — запрошен пропущенный день.</p>`);
						_push(`</section><section class="crm-stack" aria-label="Предложенные отметки"><h3>Предложено</h3><p>${ssrInterpolate(date(unref(selected).proposal.startedAt, unref(selected).proposal.timezone))} — ${ssrInterpolate(date(unref(selected).proposal.endedAt, unref(selected).proposal.timezone))}</p><!--[-->`);
						ssrRenderList(unref(selected).proposal.breaks, (pause, index) => {
							_push(`<p class="crm-inline-note">Перерыв: ${ssrInterpolate(date(pause.startedAt, unref(selected).proposal.timezone))} — ${ssrInterpolate(date(pause.endedAt, unref(selected).proposal.timezone))}</p>`);
						});
						_push(`<!--]--><strong>Работа: ${ssrInterpolate(unref(workTimeDuration)(unref(selected).proposal.totals.workedMs))} · Перерывы: ${ssrInterpolate(unref(workTimeDuration)(unref(selected).proposal.totals.breakMs))}</strong></section>`);
						if (unref(selected).stale) _push(`<p role="alert">После подачи заявки исходная отметка изменилась. Подтвердить прежние значения нельзя: нужна новая заявка.</p>`);
						else _push(`<!---->`);
						if (unref(selected).reviewerName) _push(`<p class="crm-inline-note">${ssrInterpolate(unref(selected).reviewerName)} · ${ssrInterpolate(date(unref(selected).reviewedAt))} · ${ssrInterpolate(unref(selected).reviewNote)}</p>`);
						else _push(`<!---->`);
						if (unref(selected).canApprove || unref(selected).canReject || unref(selected).canCancel) _push(`<label class="crm-field">Комментарий к решению<textarea class="crm-input" rows="3" minlength="3" maxlength="1000"${ssrIncludeBooleanAttr(unref(busy) || Boolean(unref(pending))) ? " disabled" : ""}>${ssrInterpolate(unref(note))}</textarea></label>`);
						else _push(`<!---->`);
						if (unref(formError) && !unref(pending)) _push(`<button class="crm-button" type="button"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}>Обновить заявку</button>`);
						else _push(`<!---->`);
						_push(`<!--]-->`);
					}
					_push(`</div><footer class="crm-detail-footer"><button class="crm-button" type="button"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}>Закрыть</button>`);
					if (unref(pending) && !unref(busy)) _push(`<button class="crm-button crm-button--primary" type="button">Проверить сохранение</button>`);
					else if (unref(selected)) {
						_push(`<!--[-->`);
						if (unref(selected).canCancel) _push(`<button class="crm-button" type="button"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}>Отозвать заявку</button>`);
						else _push(`<!---->`);
						if (unref(selected).canReject) _push(`<button class="crm-button crm-button--danger" type="button"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}>Отклонить</button>`);
						else _push(`<!---->`);
						if (unref(selected).canApprove) _push(`<button class="crm-button crm-button--primary" type="button"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}>Принять исправление</button>`);
						else _push(`<!---->`);
						_push(`<!--]-->`);
					} else _push(`<button class="crm-button crm-button--primary" type="submit"${ssrIncludeBooleanAttr(unref(busy) || !__props.canCreate) ? " disabled" : ""}>${ssrInterpolate(unref(busy) ? "Отправляем…" : "Отправить на проверку")}</button>`);
					_push(`</footer></form></div>`);
				} else _push(`<!---->`);
			}, "body", false, _parent);
			_push(`<!--]-->`);
		};
	}
});
// components/crm/CrmTimeCorrections.vue
var _sfc_setup$2 = CrmTimeCorrections_vue_vue_type_script_setup_true_lang_default.setup;
CrmTimeCorrections_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/crm/CrmTimeCorrections.vue");
	return _sfc_setup$2 ? _sfc_setup$2(props, ctx) : void 0;
};
var CrmTimeCorrections_default = Object.assign(CrmTimeCorrections_vue_vue_type_script_setup_true_lang_default, { __name: "CrmTimeCorrections" });
// components/crm/CrmTimesheet.vue?vue&type=script&setup=true&lang.ts
var CrmTimesheet_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "CrmTimesheet",
	__ssrInlineRender: true,
	props: { visible: { type: Boolean } },
	emits: ["correction"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const { token, user } = useWorkspaceSession(), config = useRuntimeConfig();
		const month = ref(new Intl.DateTimeFormat("sv-SE", { timeZone: user.value?.timezone || "Europe/Moscow" }).format(/* @__PURE__ */ new Date()).slice(0, 7)), departmentId = ref(""), search = ref(""), attention = ref(false);
		const data = ref(null), options = ref(null), loading = ref(false), error = ref("");
		const exporting = ref(false), exportError = ref("");
		let exportController = null;
		const opened = ref(false), detail = ref(null), detailLoading = ref(false), detailError = ref(""), target = ref(null);
		const action = ref("REVIEW"), reason = ref(""), saving = ref(false), actionError = ref(""), notice = ref("");
		const pending = ref(null);
		let version = 0;
		const request = (path, query = {}) => $fetch$1("/crm/work-time/timesheet" + path, {
			baseURL: config.public.apiBase,
			headers: { Authorization: `Bearer ${token.value}` },
			query,
			timeout: 35e3,
			retry: 0
		});
		const message = (e) => Array.isArray(e?.data?.message) ? e.data.message.join(". ") : e?.data?.message || "Не удалось загрузить табель. Попробуйте ещё раз.";
		const duration = (ms) => ms === null ? "—" : workTimeDuration(ms);
		const date = (value) => value ? new Date(value).toLocaleString("ru-RU", {
			timeZone: detail.value?.timezone || "Europe/Moscow",
			day: "numeric",
			month: "short",
			hour: "2-digit",
			minute: "2-digit"
		}) : "Не завершено";
		const dayLabel = (value) => (/* @__PURE__ */ new Date(value + "T12:00Z")).toLocaleDateString("ru-RU", {
			timeZone: "UTC",
			day: "numeric",
			month: "short",
			weekday: "short"
		});
		const intervals = computed(() => new Map(detail.value?.intervals.map((row) => [row.id, row]) || []));
		function close() {
			if (saving.value) return;
			opened.value = false;
			detail.value = null;
			detailError.value = "";
			detailLoading.value = false;
			target.value = null;
			pending.value = null;
			actionError.value = "";
		}
		useCatalogDialog(computed(() => opened.value), close);
		async function load(page = 1) {
			if (!props.visible) return;
			const current = ++version, identity = token.value;
			loading.value = true;
			data.value = null;
			error.value = "";
			exportError.value = "";
			close();
			const query = {
				month: month.value,
				...departmentId.value ? { departmentId: departmentId.value } : {},
				...search.value.trim() ? { search: search.value.trim() } : {},
				view: attention.value ? "ATTENTION" : "ALL",
				page
			};
			try {
				const [result, choices] = await Promise.all([request("", query), request("/options")]);
				if (current === version && identity === token.value) {
					data.value = result;
					options.value = choices;
				}
			} catch (e) {
				if (current === version && identity === token.value) error.value = message(e);
			} finally {
				if (current === version && identity === token.value) loading.value = false;
			}
		}
		function reset() {
			++version;
			exportController?.abort();
			exportController = null;
			exporting.value = false;
			exportError.value = "";
			saving.value = false;
			close();
			data.value = null;
			options.value = null;
			loading.value = false;
			error.value = "";
			notice.value = "";
		}
		watch(() => props.visible, (visible) => {
			reset();
			if (visible) load();
		});
		watch(token, () => {
			reset();
			departmentId.value = "";
			search.value = "";
			attention.value = false;
			if (props.visible) load();
		});
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<!--[-->`);
			if (__props.visible) {
				_push(`<div class="crm-page-content--stack crm-timesheet-workspace"><form class="crm-toolbar crm-filter-form" aria-label="Фильтры табеля"><label>Месяц табеля<input${ssrRenderAttr("value", unref(month))} class="crm-input" type="month" required min="2000-01" max="2099-12"></label><label>Отдел<select class="crm-input" aria-label="Отдел"><option value=""${ssrIncludeBooleanAttr(Array.isArray(unref(departmentId)) ? ssrLooseContain(unref(departmentId), "") : ssrLooseEqual(unref(departmentId), "")) ? " selected" : ""}>Все доступные</option><!--[-->`);
				ssrRenderList(unref(options)?.departments || [], (row) => {
					_push(`<option${ssrRenderAttr("value", row.id)}${ssrIncludeBooleanAttr(Array.isArray(unref(departmentId)) ? ssrLooseContain(unref(departmentId), row.id) : ssrLooseEqual(unref(departmentId), row.id)) ? " selected" : ""}>${ssrInterpolate(row.name)}${ssrInterpolate(row.archivedAt ? " · архив" : "")}</option>`);
				});
				_push(`<!--]--></select></label><label>Сотрудник<input${ssrRenderAttr("value", unref(search))} class="crm-input" maxlength="80" placeholder="Имя или фамилия"></label><button class="crm-button crm-button--refresh"${ssrIncludeBooleanAttr(unref(loading)) ? " disabled" : ""}>`);
				_push(ssrRenderComponent(unref(RefreshCw), { size: 18 }, null, _parent));
				_push(`Обновить табель</button>`);
				if (unref(options)?.canExport) {
					_push(`<button type="button" class="crm-button"${ssrIncludeBooleanAttr(unref(loading) || unref(exporting) || !unref(data)) ? " disabled" : ""}>`);
					_push(ssrRenderComponent(unref(Download), { size: 18 }, null, _parent));
					_push(`${ssrInterpolate(unref(exporting) ? "Готовим Excel…" : "Скачать Excel")}</button>`);
				} else _push(`<!---->`);
				_push(`</form><label class="crm-toggle-row"><span>Только требующие проверки</span><input${ssrIncludeBooleanAttr(Array.isArray(unref(attention)) ? ssrLooseContain(unref(attention), null) : unref(attention)) ? " checked" : ""} class="crm-check" type="checkbox"></label>`);
				if (unref(loading)) _push(`<p role="status">Рассчитываем табель по всей выбранной команде…</p>`);
				else _push(`<!---->`);
				if (unref(error)) _push(`<p role="alert">${ssrInterpolate(unref(error))}</p>`);
				else _push(`<!---->`);
				if (unref(notice)) _push(`<p role="status">${ssrInterpolate(unref(notice))}</p>`);
				else _push(`<!---->`);
				if (unref(exportError)) _push(`<p role="alert">${ssrInterpolate(unref(exportError))}</p>`);
				else _push(`<!---->`);
				if (unref(data)) {
					_push(`<section class="crm-surface" aria-label="Табель команды"><h2 class="wn-sr-only">Табель команды за ${ssrInterpolate(unref(data).month)}</h2><div class="crm-register crm-page-content--stack"><div class="crm-summary-grid"><div><small>Сотрудников</small><strong>${ssrInterpolate(unref(data).summary.employees)}</strong></div><div><small>План</small><strong>${ssrInterpolate(duration(unref(data).summary.plannedMs))}</strong></div><div><small>Факт работы</small><strong>${ssrInterpolate(duration(unref(data).summary.workedMs))}</strong></div><div><small>Требуют проверки</small><strong>${ssrInterpolate(unref(data).summary.attention)}</strong></div></div>`);
					if (unref(data).summary.unavailablePlan || unref(data).summary.unavailableActual) _push(`<p role="status">${ssrInterpolate(unref(data).summary.unavailablePlan ? `Не рассчитан план сотрудников: ${unref(data).summary.unavailablePlan}. ` : "")}${ssrInterpolate(unref(data).summary.unavailableActual ? `Есть пересечения отметок у сотрудников: ${unref(data).summary.unavailableActual}.` : "")} Вместо недостоверного общего итога показан прочерк.</p>`);
					else _push(`<!---->`);
					_push(`</div><div role="table" aria-label="План и факт сотрудников"><div class="crm-table-head crm-responsive-row crm-responsive-head" role="row"><span role="columnheader">Сотрудник</span><span role="columnheader">План</span><span role="columnheader">Факт</span><span role="columnheader">Перерывы</span><span role="columnheader">Проверка</span><span role="columnheader" aria-label="Открыть"></span></div><!--[-->`);
					ssrRenderList(unref(data).items, (row) => {
						_push(`<div class="crm-table-row crm-responsive-row" role="row"><div class="crm-responsive-main" role="cell"><strong>${ssrInterpolate(unref(sheetPerson)(row.employee))}</strong><br><small class="crm-inline-note">${ssrInterpolate(row.employee.department?.name || "Без отдела")}${ssrInterpolate(row.employee.isActive ? "" : " · Неактивен")}</small><br><small class="crm-inline-note">${ssrInterpolate(row.timezone || unref(data).timezone)}</small></div><span class="crm-responsive-cell" role="cell" data-label="План">${ssrInterpolate(duration(row.plannedMs))}</span><span class="crm-responsive-cell" role="cell" data-label="Факт">${ssrInterpolate(duration(row.workedMs))}</span><span class="crm-responsive-cell" role="cell" data-label="Перерывы">${ssrInterpolate(duration(row.breakMs))}</span><div class="crm-responsive-cell" role="cell" data-label="Проверка"><div>`);
						if (row.workflow) _push(`<span class="crm-badge">${ssrInterpolate(unref(sheetStatus)[row.workflow.status])} · v${ssrInterpolate(row.workflow.edition)}</span>`);
						else _push(`<!---->`);
						if (row.workflow) _push(`<br>`);
						else _push(`<!---->`);
						if (row.workflow?.stale) _push(`<small>Данные изменились · нужна проверка<br></small>`);
						else _push(`<!---->`);
						_push(`<!--[-->`);
						ssrRenderList(unref(sheetIssueLabels)(row.issues), (label) => {
							_push(`<small>${ssrInterpolate(label)}<br></small>`);
						});
						_push(`<!--]-->`);
						if (!row.needsAttention) _push(`<small>${ssrInterpolate(row.openSessions ? "Рабочий день идёт" : "Нет замечаний")}</small>`);
						else _push(`<!---->`);
						_push(`</div></div><button class="crm-button crm-button--icon crm-responsive-action"${ssrRenderAttr("aria-label", "Открыть табель: " + unref(sheetPerson)(row.employee))}>`);
						_push(ssrRenderComponent(unref(ArrowRight), { size: 18 }, null, _parent));
						_push(`</button></div>`);
					});
					_push(`<!--]--></div><details class="crm-ops-help crm-register"><summary>Как читать табель и выгрузку</summary><p class="crm-inline-note">Пояс новых отчётов: ${ssrInterpolate(unref(data).timezone)}. После начала проверки пояс закрепляется за табелем сотрудника и указан в строке. Закрытые месяцы показаны по сохранённой версии; остальные — на момент обновления. Итоги относятся ко всей выборке.</p><p class="crm-inline-note">Фильтр отдела — по текущей принадлежности. В закрытой версии имя и отдел сохранены на момент закрытия. ${ssrInterpolate(unref(data).scope === "COMPANY" ? "Включены неактивные сотрудники." : "Доступны только табели своих текущих отделов, без чужой истории.")} День с планом без отметок — повод проверить данные, а не автоматически считать прогул.</p>`);
					if (unref(options)?.canExport) _push(`<p class="crm-inline-note">Excel содержит всю выборку последнего обновления, включая остальные страницы. Открытые табели пересчитываются при скачивании.</p>`);
					else _push(`<!---->`);
					_push(`</details><div class="crm-register">`);
					if (!unref(data).items.length) _push(`<p>Сотрудников по выбранным условиям нет.</p>`);
					else _push(`<!---->`);
					_push(`<div class="crm-action-bar crm-action-bar--spread"><span>Всего: ${ssrInterpolate(unref(data).total)} · Страница ${ssrInterpolate(unref(data).page)} / ${ssrInterpolate(unref(data).pages)}</span><div class="crm-action-bar"><button class="crm-button"${ssrIncludeBooleanAttr(unref(data).page <= 1 || unref(loading)) ? " disabled" : ""}>Назад</button><button class="crm-button"${ssrIncludeBooleanAttr(unref(data).page >= unref(data).pages || unref(loading)) ? " disabled" : ""}>Далее</button></div></div></div></section>`);
				} else _push(`<!---->`);
				_push(`</div>`);
			} else _push(`<!---->`);
			ssrRenderTeleport(_push, (_push) => {
				if (unref(opened)) {
					_push(`<div class="admin-dialog-backdrop crm-detail-backdrop"><section class="admin-dialog admin-dialog--drawer crm-detail-card" role="dialog" aria-modal="true" aria-labelledby="timesheet-title" tabindex="-1"><header><div><p>ТАБЕЛЬ · ${ssrInterpolate(unref(target)?.month)}</p><h2 id="timesheet-title">${ssrInterpolate(unref(detail) ? unref(sheetPerson)(unref(detail).employee) : "Табель сотрудника")}</h2></div><button class="crm-button crm-button--icon"${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""} aria-label="Закрыть табель">`);
					_push(ssrRenderComponent(unref(X), { size: 18 }, null, _parent));
					_push(`</button></header><div class="admin-dialog-body crm-detail-body crm-stack">`);
					if (unref(detailLoading)) _push(`<p role="status">Загружаем расшифровку…</p>`);
					else _push(`<!---->`);
					if (unref(detailError)) _push(`<p role="alert">${ssrInterpolate(unref(detailError))}</p>`);
					else _push(`<!---->`);
					if (unref(detailError) && unref(target)) _push(`<button class="crm-button">Повторить загрузку табеля</button>`);
					else _push(`<!---->`);
					if (unref(detail)) {
						_push(`<!--[-->`);
						if (unref(detail).workflow) {
							_push(`<section class="crm-stack" aria-label="Состояние табеля"><h3>${ssrInterpolate(unref(sheetStatus)[unref(detail).workflow.status])} · Версия ${ssrInterpolate(unref(detail).workflow.edition)}</h3>`);
							if (unref(detail).workflow.status === "CLOSED") _push(`<p class="crm-inline-note">${ssrInterpolate(unref(detail).workflow.archived ? "Архивная версия." : "Месяц закрыт.")} Это сохранённые данные на ${ssrInterpolate(date(unref(detail).serverTime))}; график и отметки за закрытый период защищены от правок.</p>`);
							else _push(`<!---->`);
							if (unref(detail).workflow.stale) _push(`<p role="status">После проверки данные изменились. Подтвердите проверку заново перед утверждением.</p>`);
							else _push(`<!---->`);
							_push(`<!--[-->`);
							ssrRenderList(unref(detail).workflow.blockers || [], (blocker) => {
								_push(`<p class="crm-inline-note">${ssrInterpolate(blocker)}</p>`);
							});
							_push(`<!--]-->`);
							if (unref(detail).workflow.actions?.length) {
								_push(`<form class="crm-stack" aria-label="Решение по табелю"><label>Действие с табелем<select class="crm-input"${ssrIncludeBooleanAttr(unref(saving) || !!unref(pending)) ? " disabled" : ""}><!--[-->`);
								ssrRenderList(unref(detail).workflow.actions, (value) => {
									_push(`<option${ssrRenderAttr("value", value)}${ssrIncludeBooleanAttr(Array.isArray(unref(action)) ? ssrLooseContain(unref(action), value) : ssrLooseEqual(unref(action), value)) ? " selected" : ""}>${ssrInterpolate(unref(sheetAction)[value])}</option>`);
								});
								_push(`<!--]--></select></label>`);
								if (unref(action) === "REOPEN") _push(`<p class="crm-inline-note">Предыдущая закрытая версия останется в истории. Новую версию потребуется проверить, утвердить и закрыть повторно.</p>`);
								else _push(`<!---->`);
								_push(`<label>Комментарий решения<textarea class="crm-input" rows="2" minlength="5" maxlength="1000" required${ssrIncludeBooleanAttr(unref(saving) || !!unref(pending)) ? " disabled" : ""}${ssrRenderAttr("placeholder", unref(action) === "REOPEN" ? "Почему необходимо изменить закрытый месяц?" : "Что проверено или на основании чего принято решение?")}>${ssrInterpolate(unref(reason))}</textarea></label>`);
								if (unref(actionError)) _push(`<p role="alert">${ssrInterpolate(unref(actionError))}</p>`);
								else _push(`<!---->`);
								_push(`<button class="crm-button crm-button--primary"${ssrIncludeBooleanAttr(unref(saving) || !unref(pending) && unref(reason).trim().length < 5) ? " disabled" : ""}>${ssrInterpolate(unref(saving) ? "Сохраняем…" : unref(pending) ? "Повторить отправку" : unref(sheetAction)[unref(action)])}</button></form>`);
							} else _push(`<!---->`);
							if (unref(detail).workflow.events?.length) {
								_push(`<details class="crm-item-card crm-register"><summary>История решений · ${ssrInterpolate(unref(detail).workflow.events.length)}</summary><div class="crm-stack"><p class="crm-inline-note">Последние 100 решений. Закрытые версии доступны только для просмотра.</p><!--[-->`);
								ssrRenderList(unref(detail).workflow.events, (event) => {
									_push(`<article class="crm-item-card crm-register crm-stack"><strong>${ssrInterpolate(unref(sheetEvent)[event.action])} · v${ssrInterpolate(event.edition)}</strong><small class="crm-inline-note">${ssrInterpolate(event.actorName)} · ${ssrInterpolate(date(event.createdAt))}</small><p>${ssrInterpolate(event.reason)}</p>`);
									if (event.action === "CLOSE" && unref(target)) _push(`<button class="crm-button"${ssrIncludeBooleanAttr(unref(saving) || !!unref(pending)) ? " disabled" : ""}>Просмотреть версию ${ssrInterpolate(event.edition)}</button>`);
									else _push(`<!---->`);
									_push(`</article>`);
								});
								_push(`<!--]--></div></details>`);
							} else _push(`<!---->`);
							_push(`</section>`);
						} else _push(`<!---->`);
						_push(`<p class="crm-inline-note">${ssrInterpolate(unref(detail).timezone)} · ${ssrInterpolate(unref(detail).employee.department?.name || "Без отдела")}. Ночные интервалы разделяются по датам отчёта. Плановый перерыв распределяется пропорционально, фактический — по отметкам. Это не расчёт зарплаты.</p><div class="crm-summary-grid"><div><small>План</small><strong>${ssrInterpolate(duration(unref(detail).plannedMs))}</strong></div><div><small>Факт</small><strong>${ssrInterpolate(duration(unref(detail).workedMs))}</strong></div><div><small>Перерывы</small><strong>${ssrInterpolate(duration(unref(detail).breakMs))}</strong></div></div>`);
						if (unref(detail).planWarning) _push(`<p role="status">${ssrInterpolate(unref(detail).planWarning)}</p>`);
						else _push(`<!---->`);
						if (unref(detail).corrections.length) {
							_push(`<div class="crm-stack"><h3>Исправления на проверке</h3><!--[-->`);
							ssrRenderList(unref(detail).corrections, (row, index) => {
								_push(`<button class="crm-button">Открыть исправление ${ssrInterpolate(index + 1)}${ssrInterpolate(row.stale ? " · отметка уже изменена" : "")}`);
								_push(ssrRenderComponent(unref(ArrowRight), { size: 18 }, null, _parent));
								_push(`</button>`);
							});
							_push(`<!--]--></div>`);
						} else _push(`<!---->`);
						_push(`<h3>По дням</h3><!--[-->`);
						ssrRenderList(unref(detail).days, (day) => {
							_push(`<details class="crm-item-card crm-register"><summary>${ssrInterpolate(dayLabel(day.date))} · План ${ssrInterpolate(duration(day.plannedMs))} · Факт ${ssrInterpolate(duration(day.workedMs))}</summary><div class="crm-stack"><p class="crm-inline-note">Перерывы за эту дату: ${ssrInterpolate(duration(day.breakMs))}${ssrInterpolate(day.openSessions ? " · Есть открытый интервал" : "")}</p><!--[-->`);
							ssrRenderList(unref(sheetIssueLabels)(day.issues), (label) => {
								_push(`<p class="crm-inline-note">${ssrInterpolate(label)}</p>`);
							});
							_push(`<!--]-->`);
							if (!day.sessionIds.length) _push(`<p class="crm-inline-note">Фактических отметок нет.</p>`);
							else _push(`<!---->`);
							_push(`<!--[-->`);
							ssrRenderList(day.sessionIds, (id) => {
								_push(`<!--[-->`);
								if (unref(intervals).get(id)) {
									_push(`<div class="crm-stack"><strong>Интервал: ${ssrInterpolate(date(unref(intervals).get(id).startedAt))} — ${ssrInterpolate(date(unref(intervals).get(id).endedAt))}</strong><small class="crm-inline-note">Пояс исходной отметки: ${ssrInterpolate(unref(intervals).get(id).timezone)}. Выше показаны границы всего интервала; в итог даты входит только её часть.</small><!--[-->`);
									ssrRenderList(unref(intervals).get(id).breaks, (pause, index) => {
										_push(`<small class="crm-inline-note">Перерыв ${ssrInterpolate(index + 1)}: ${ssrInterpolate(date(pause.startedAt))} — ${ssrInterpolate(date(pause.endedAt))}</small>`);
									});
									_push(`<!--]--></div>`);
								} else _push(`<!---->`);
								_push(`<!--]-->`);
							});
							_push(`<!--]--></div></details>`);
						});
						_push(`<!--]--><!--]-->`);
					} else _push(`<!---->`);
					_push(`</div><footer class="crm-detail-footer"><button class="crm-button"${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""}>Закрыть</button>`);
					if (unref(target)) {
						_push(`<button class="crm-button crm-button--refresh"${ssrIncludeBooleanAttr(unref(detailLoading) || unref(saving) || !!unref(pending)) ? " disabled" : ""}>`);
						_push(ssrRenderComponent(unref(RefreshCw), { size: 18 }, null, _parent));
						_push(`${ssrInterpolate(unref(target).revision ? "К текущей версии" : "Обновить табель сотрудника")}</button>`);
					} else _push(`<!---->`);
					_push(`</footer></section></div>`);
				} else _push(`<!---->`);
			}, "body", false, _parent);
			_push(`<!--]-->`);
		};
	}
});
// components/crm/CrmTimesheet.vue
var _sfc_setup$1 = CrmTimesheet_vue_vue_type_script_setup_true_lang_default.setup;
CrmTimesheet_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/crm/CrmTimesheet.vue");
	return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
var CrmTimesheet_default = Object.assign(CrmTimesheet_vue_vue_type_script_setup_true_lang_default, { __name: "CrmTimesheet" });
// pages/crm/work-time.vue?vue&type=script&setup=true&lang.ts
var work_time_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "work-time",
	__ssrInlineRender: true,
	setup(__props) {
		useHead({ title: "Рабочее время — SARKISIAN CRM" });
		const { token, user } = useWorkspaceSession(), { can } = useWorkspaceAccess(), config = useRuntimeConfig();
		const month = ref(new Intl.DateTimeFormat("sv-SE", { timeZone: user.value?.timezone || "Europe/Moscow" }).format(/* @__PURE__ */ new Date()).slice(0, 7));
		const data = ref(null), loading = ref(false), error = ref("");
		const section = ref("history"), clock = ref(null), corrections = ref(null);
		const options = ref(null), optionsError = ref("");
		const tabs = computed(() => [
			["history", "Мои отметки"],
			["mine", "Мои исправления"],
			...options.value?.canReview ? [["review", "Проверка команды"], ["sheet", "Табель команды"]] : []
		]);
		let version = 0, optionsVersion = 0;
		async function loadOptions() {
			const current = ++optionsVersion, identity = token.value;
			options.value = null;
			optionsError.value = "";
			try {
				const result = await $fetch$1("/crm/work-time/corrections/options", {
					baseURL: config.public.apiBase,
					headers: { Authorization: `Bearer ${identity}` },
					timeout: 15e3,
					retry: 0
				});
				if (current === optionsVersion && token.value === identity) {
					options.value = result;
					if (["review", "sheet"].includes(section.value) && !result.canReview) section.value = "history";
				}
			} catch (e) {
				if (current === optionsVersion && token.value === identity) optionsError.value = e?.data?.message || "Не удалось проверить доступ к исправлениям";
			}
		}
		function refreshTime() {
			load();
			clock.value?.refresh();
		}
		async function openSheetCorrection(id, employeeId) {
			section.value = employeeId === user.value?.id ? "mine" : "review";
			await nextTick();
			corrections.value?.open(id);
		}
		const date = (value) => value ? new Date(value).toLocaleString("ru-RU", {
			timeZone: data.value?.timezone || "Europe/Moscow",
			day: "numeric",
			month: "short",
			hour: "2-digit",
			minute: "2-digit"
		}) : "Не завершено";
		async function load() {
			const requestVersion = ++version, identity = token.value;
			loading.value = true;
			error.value = "";
			data.value = null;
			try {
				const result = await $fetch$1("/crm/work-time", {
					baseURL: config.public.apiBase,
					headers: { Authorization: `Bearer ${token.value}` },
					query: { month: month.value },
					timeout: 15e3,
					retry: 0
				});
				if (requestVersion === version && token.value === identity) data.value = result;
			} catch (e) {
				if (requestVersion === version && token.value === identity) error.value = e?.data?.message || "Не удалось загрузить историю рабочего времени";
			} finally {
				if (requestVersion === version) loading.value = false;
			}
		}
		watch(token, () => {
			section.value = "history";
			load();
			loadOptions();
		});
		return (_ctx, _push, _parent, _attrs) => {
			const _component_NuxtLink = NuxtLink;
			const _component_CrmCardTabs = CrmCardTabs_default;
			const _component_CrmWorkClock = CrmWorkClock_default;
			const _component_CrmTimeCorrections = CrmTimeCorrections_default;
			const _component_CrmTimesheet = CrmTimesheet_default;
			_push(`<main${ssrRenderAttrs(mergeProps({ class: "crm-standard crm-operational-page crm-ops-work-time" }, _attrs))}><header class="crm-page-header"><h1>Рабочее время</h1>`);
			if (unref(can)("work_schedule.read")) _push(ssrRenderComponent(_component_NuxtLink, {
				to: "/crm/work-schedule",
				class: "crm-button"
			}, {
				default: withCtx((_, _push, _parent, _scopeId) => {
					if (_push) _push(`Открыть график`);
					else return [createTextVNode("Открыть график")];
				}),
				_: 1
			}, _parent));
			else _push(`<!---->`);
			_push(`</header><div class="crm-page-content crm-page-content--stack">`);
			_push(ssrRenderComponent(_component_CrmCardTabs, {
				modelValue: unref(section),
				"onUpdate:modelValue": ($event) => isRef(section) ? section.value = $event : null,
				prefix: "work-time",
				tabs: unref(tabs),
				label: "Разделы рабочего времени"
			}, null, _parent));
			if (unref(optionsError)) _push(`<div class="crm-notice crm-action-bar"><p role="alert">${ssrInterpolate(unref(optionsError))}</p><button class="crm-button">Проверить доступ к исправлениям</button></div>`);
			else _push(`<!---->`);
			_push(`<div id="work-time-history-panel" role="tabpanel" aria-labelledby="work-time-history-tab" class="crm-page-content--stack" style="${ssrRenderStyle(unref(section) === "history" ? null : { display: "none" })}">`);
			_push(ssrRenderComponent(_component_CrmWorkClock, {
				ref_key: "clock",
				ref: clock,
				onChanged: load
			}, null, _parent));
			_push(`<section class="crm-surface" aria-label="История рабочего времени"><header class="crm-panel-header"><h2>История рабочего времени</h2><form class="crm-filter-form crm-filter-form--compact" aria-label="Фильтры истории времени"><label class="crm-field"><span class="wn-sr-only">Месяц</span><input${ssrRenderAttr("value", unref(month))} class="crm-input" type="month" min="2000-01" max="2099-12" required></label><button class="crm-button crm-button--refresh"${ssrIncludeBooleanAttr(unref(loading)) ? " disabled" : ""}>`);
			_push(ssrRenderComponent(unref(RefreshCw), { size: 18 }, null, _parent));
			_push(`Обновить историю</button></form></header><div class="crm-register crm-page-content--stack">`);
			if (unref(error)) _push(`<p class="operation-error" role="alert">${ssrInterpolate(unref(error))}<button class="crm-button"${ssrIncludeBooleanAttr(unref(loading)) ? " disabled" : ""}>Повторить загрузку</button></p>`);
			else _push(`<!---->`);
			if (unref(loading)) _push(`<p role="status">Загружаем историю…</p>`);
			else _push(`<!---->`);
			if (unref(data)) {
				_push(`<!--[--><div class="crm-summary-grid"><div><small>План месяца</small><strong>${ssrInterpolate(unref(data).plan?.available ? unref(workTimeDuration)(unref(data).plan.plannedMs || 0) : "—")}</strong></div><div><small>Рабочее время</small><strong>${ssrInterpolate(unref(workTimeDuration)(unref(data).totals.workedMs))}</strong></div><div><small>Перерывы</small><strong>${ssrInterpolate(unref(workTimeDuration)(unref(data).totals.breakMs))}</strong></div><div><small>${ssrInterpolate(unref(data).plan?.available && unref(data).totals.workedMs > (unref(data).plan.plannedMs || 0) ? "Сверх плана месяца" : "Осталось до плана месяца")}</small><strong>${ssrInterpolate(unref(data).plan?.available ? unref(workTimeDuration)(Math.abs((unref(data).plan.plannedMs || 0) - unref(data).totals.workedMs)) : "—")}</strong></div></div><details class="crm-ops-help"><summary>Как считаются план и фактическое время</summary><p class="crm-inline-note">Итоги за выбранный месяц · ${ssrInterpolate(unref(data).timezone)}. Ночные интервалы разделяются по границам месяца. Это фактические отметки, не утверждённый табель.</p><p class="crm-inline-note">План — все опубликованные смены выбранного месяца, включая шаблоны и ручные исключения. При переходе через границу месяца плановый перерыв распределяется пропорционально. Разница с фактом не является расчётом переработки или зарплаты.</p></details>`);
				if (unref(data).plan?.warning) _push(`<p role="status">${ssrInterpolate(unref(data).plan.warning)}</p>`);
				else _push(`<!---->`);
				if (unref(options)?.canCreate && unref(data).canRequestCorrection && unref(data).items.length) _push(`<button class="crm-button">Добавить пропущенный день</button>`);
				else _push(`<!---->`);
				if (!unref(data).items.length) {
					_push(`<div class="crm-ops-empty"><h2>Отметок за месяц пока нет</h2><p>Начните рабочий день в блоке выше или укажите пропущенное время.</p>`);
					if (unref(options)?.canCreate && unref(data).canRequestCorrection) _push(`<button class="crm-button">Добавить пропущенный день</button>`);
					else _push(`<!---->`);
					_push(`</div>`);
				} else _push(`<!---->`);
				_push(`<!--[-->`);
				ssrRenderList(unref(data).items, (row) => {
					_push(`<details class="crm-item-card crm-register"><summary>${ssrInterpolate(date(row.startedAt))} — ${ssrInterpolate(date(row.endedAt))} · ${ssrInterpolate(unref(workTimeDuration)(row.periodTotals?.workedMs || 0))} работы</summary><div class="crm-page-content--stack"><p class="crm-inline-note">${ssrInterpolate(row.status === "FINISHED" ? "Рабочий день завершён" : row.status === "BREAK" ? "На перерыве" : "Рабочий день идёт")} · Перерывы в выбранном месяце: ${ssrInterpolate(unref(workTimeDuration)(row.periodTotals?.breakMs || 0))}. Для открытого дня итоги — на момент обновления.</p>`);
					if (!row.breaks.length) _push(`<p class="crm-inline-note">Перерывов не было.</p>`);
					else _push(`<!---->`);
					_push(`<!--[-->`);
					ssrRenderList(row.breaks, (pause, index) => {
						_push(`<p class="crm-inline-note">Перерыв ${ssrInterpolate(index + 1)}: ${ssrInterpolate(date(pause.startedAt))} — ${ssrInterpolate(date(pause.endedAt))}</p>`);
					});
					_push(`<!--]-->`);
					if (unref(options)?.canCreate && unref(data).canRequestCorrection) _push(`<button class="crm-button">Исправить отметку</button>`);
					else _push(`<!---->`);
					_push(`</div></details>`);
				});
				_push(`<!--]--><!--]-->`);
			} else _push(`<!---->`);
			_push(`</div></section></div><div${ssrRenderAttr("id", "work-time-" + (unref(section) === "review" ? "review" : "mine") + "-panel")} role="tabpanel"${ssrRenderAttr("aria-labelledby", "work-time-" + (unref(section) === "review" ? "review" : "mine") + "-tab")} style="${ssrRenderStyle(["mine", "review"].includes(unref(section)) ? null : { display: "none" })}">`);
			_push(ssrRenderComponent(_component_CrmTimeCorrections, {
				ref_key: "corrections",
				ref: corrections,
				visible: ["mine", "review"].includes(unref(section)),
				scope: unref(section) === "review" ? "REVIEW" : "MINE",
				"can-create": Boolean(unref(options)?.canCreate),
				"can-review": Boolean(unref(options)?.canReview),
				timezone: unref(options)?.timezone || unref(data)?.timezone || "Europe/Moscow",
				month: unref(month),
				onChanged: refreshTime,
				onShowMine: ($event) => section.value = "mine"
			}, null, _parent));
			_push(`</div><div id="work-time-sheet-panel" role="tabpanel" aria-labelledby="work-time-sheet-tab" style="${ssrRenderStyle(unref(section) === "sheet" ? null : { display: "none" })}">`);
			_push(ssrRenderComponent(_component_CrmTimesheet, {
				visible: unref(section) === "sheet",
				onCorrection: openSheetCorrection
			}, null, _parent));
			_push(`</div></div></main>`);
		};
	}
});
// pages/crm/work-time.vue
var _sfc_setup = work_time_vue_vue_type_script_setup_true_lang_default.setup;
work_time_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/crm/work-time.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var work_time_default = work_time_vue_vue_type_script_setup_true_lang_default;

export { work_time_default as default };;globalThis.__timing__.logEnd('Load chunks/build/work-time-1R-wOz5U');
//# sourceMappingURL=work-time-1R-wOz5U.mjs.map
