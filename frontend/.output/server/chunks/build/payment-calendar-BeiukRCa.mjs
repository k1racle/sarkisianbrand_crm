globalThis.__timing__.logStart('Load chunks/build/payment-calendar-BeiukRCa');import { u as useHead, a as useWorkspaceSession } from '../virtual/entry.mjs';
import { u as useCatalogDialog } from './useCatalogDialog-2pnsnnsL.mjs';
import { defineComponent, ref, reactive, computed, mergeProps, unref, useSSRContext } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import { ssrRenderAttrs, ssrIncludeBooleanAttr, ssrRenderComponent, ssrRenderList, ssrRenderAttr, ssrInterpolate, ssrRenderClass, ssrLooseContain, ssrLooseEqual, ssrRenderTeleport } from 'vue/server-renderer';
import { RefreshCw, Plus, ChevronLeft, ChevronRight, CalendarCheck2, X } from '@lucide/vue';
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

// pages/crm/payment-calendar.vue?vue&type=script&setup=true&lang.ts
var payment_calendar_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "payment-calendar",
	__ssrInlineRender: true,
	setup(__props) {
		useHead({ title: "Календарь платежей — SARKISIAN CRM" });
		useWorkspaceSession();
		const data = ref(null), month = ref(""), search = ref(""), status = ref("ALL"), mode = ref("calendar"), day = ref("");
		const loading = ref(false), opening = ref(false), saving = ref(false), error = ref(""), formError = ref(""), notice = ref(""), opened = ref(false), selected = ref(null), occurrence = ref(null), baseline = ref("");
		ref("");
		ref("");
		const paidOn = ref(""), reason = ref("");
		const draft = reactive({
			title: "",
			vendor: "",
			category: "SUBSCRIPTIONS",
			notes: "",
			amount: "",
			startDate: "",
			endDate: "",
			frequency: "MONTH",
			interval: 1,
			visibility: "PERSONAL"
		});
		const categories = {
			COMMUNICATION: "Связь",
			INTERNET: "Интернет",
			SERVERS: "Серверы",
			SUBSCRIPTIONS: "Подписки",
			RENT: "Аренда",
			OTHER: "Прочее"
		};
		const scopes = {
			PERSONAL: "Личный план",
			DEPARTMENT: "Мой отдел",
			COMPANY: "Компания"
		};
		const dirty = computed(() => opened.value && baseline.value !== JSON.stringify(draft));
		const money = (cents) => new Intl.NumberFormat("ru-RU", {
			style: "currency",
			currency: "RUB",
			maximumFractionDigits: 2
		}).format(cents / 100);
		const dateLabel = (value) => (/* @__PURE__ */ new Date(value + "T12:00:00Z")).toLocaleDateString("ru-RU", {
			day: "numeric",
			month: "long",
			timeZone: "UTC"
		});
		const statusLabel = (value) => ({
			PAID: "Отмечено вручную",
			OVERDUE: "Просрочено",
			PLANNED: "К оплате"
		})[value] || value;
		const period = (plan) => plan.frequency === "ONCE" ? "Разово" : `Каждые ${plan.interval} ${{
			WEEK: "нед.",
			MONTH: "мес.",
			YEAR: "г."
		}[plan.frequency]}`;
		const filtered = computed(() => (data.value?.items || []).filter((item) => (status.value === "ALL" || (status.value === "UNPAID" ? !item.paidOn : item.status === status.value)) && `${item.title} ${item.vendor} ${categories[item.category]}`.toLocaleLowerCase("ru").includes(search.value.trim().toLocaleLowerCase("ru"))));
		const visible = computed(() => filtered.value.filter((item) => !day.value || item.dueDate === day.value));
		const plans = computed(() => (data.value?.plans || []).filter((plan) => `${plan.title} ${plan.vendor}`.toLocaleLowerCase("ru").includes(search.value.trim().toLocaleLowerCase("ru"))));
		const cells = computed(() => {
			if (!/^\d{4}-\d{2}$/.test(month.value)) return [];
			const [year, m] = month.value.split("-").map(Number), offset = (new Date(Date.UTC(year, m - 1, 1)).getUTCDay() + 6) % 7, days = new Date(Date.UTC(year, m, 0)).getUTCDate();
			return Array.from({ length: Math.ceil((offset + days) / 7) * 7 }, (_, i) => {
				const number = i - offset + 1, key = number > 0 && number <= days ? `${month.value}-${String(number).padStart(2, "0")}` : "";
				return {
					key,
					number,
					items: key ? filtered.value.filter((item) => item.dueDate === key) : []
				};
			});
		});
		function leave() {
			return !saving.value && (!(opened.value && (dirty.value || reason.value.trim())) || (void 0).confirm("Изменения не сохранены. Закрыть карточку?"));
		}
		function close() {
			if (leave()) opened.value = false;
		}
		useCatalogDialog(computed(() => opened.value), close);
		onBeforeRouteLeave(leave);
		const opsFiltersOpen = ref(false);
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<main${ssrRenderAttrs(mergeProps({ class: "crm-standard crm-operational-page crm-ops-payment-calendar" }, _attrs))}><header class="crm-page-header"><h1>Календарь платежей</h1><div class="crm-action-bar"><button class="crm-button crm-button--refresh"${ssrIncludeBooleanAttr(unref(loading)) ? " disabled" : ""}>`);
			_push(ssrRenderComponent(unref(RefreshCw), { size: 18 }, null, _parent));
			_push(`Обновить</button>`);
			if (unref(data)?.canWrite) {
				_push(`<button class="crm-button crm-button--primary"${ssrIncludeBooleanAttr(unref(loading) || unref(opening)) ? " disabled" : ""}>`);
				_push(ssrRenderComponent(unref(Plus), { size: 18 }, null, _parent));
				_push(`Новый платёж</button>`);
			} else _push(`<!---->`);
			_push(`</div></header><div class="crm-page-content crm-page-content--stack"><p class="crm-inline-note">Здесь сотрудники ведут планы и вручную отмечают оплаты. Эти отметки пока не передаются в 1С и не подтверждаются ею.</p><nav class="crm-ops-views" aria-label="Представления платежей"><!--[-->`);
			ssrRenderList([
				["ALL", "Все платежи"],
				["UNPAID", "К оплате"],
				["OVERDUE", "Просроченные"],
				["PAID", "Отмеченные"]
			], ([key, label]) => {
				_push(`<button class="crm-button crm-button--quiet"${ssrRenderAttr("aria-pressed", unref(status) === key)}${ssrIncludeBooleanAttr(unref(mode) === "plans") ? " disabled" : ""}>${ssrInterpolate(label)}</button>`);
			});
			_push(`<!--]--></nav><button class="crm-button crm-ops-filter-toggle" type="button"${ssrRenderAttr("aria-expanded", unref(opsFiltersOpen))} aria-controls="ops-payment-calendar-filters">Период, статус и поиск</button><form id="ops-payment-calendar-filters" class="${ssrRenderClass([{ "is-expanded": unref(opsFiltersOpen) }, "crm-toolbar crm-filter-form crm-ops-filters"])}" aria-label="Фильтры платежей"><label class="crm-field">Месяц<input${ssrRenderAttr("value", unref(month))} class="crm-input" type="month" min="2000-01" max="2100-12" required></label><label class="crm-field">Статус<select class="crm-input"${ssrIncludeBooleanAttr(unref(mode) === "plans") ? " disabled" : ""}><option value="ALL"${ssrIncludeBooleanAttr(Array.isArray(unref(status)) ? ssrLooseContain(unref(status), "ALL") : ssrLooseEqual(unref(status), "ALL")) ? " selected" : ""}>Все платежи</option><option value="UNPAID"${ssrIncludeBooleanAttr(Array.isArray(unref(status)) ? ssrLooseContain(unref(status), "UNPAID") : ssrLooseEqual(unref(status), "UNPAID")) ? " selected" : ""}>К оплате</option><option value="OVERDUE"${ssrIncludeBooleanAttr(Array.isArray(unref(status)) ? ssrLooseContain(unref(status), "OVERDUE") : ssrLooseEqual(unref(status), "OVERDUE")) ? " selected" : ""}>Просроченные</option><option value="PAID"${ssrIncludeBooleanAttr(Array.isArray(unref(status)) ? ssrLooseContain(unref(status), "PAID") : ssrLooseEqual(unref(status), "PAID")) ? " selected" : ""}>Отмеченные вручную</option></select></label><label class="crm-field">Название или поставщик<input${ssrRenderAttr("value", unref(search))} class="crm-input" maxlength="160" placeholder="Например, интернет"></label><button class="crm-button" type="submit">Найти</button></form>`);
			if (unref(error)) _push(`<p class="operation-error" role="alert">${ssrInterpolate(unref(error))}<button class="crm-button"${ssrIncludeBooleanAttr(unref(loading)) ? " disabled" : ""}>Повторить загрузку</button></p>`);
			else _push(`<!---->`);
			if (unref(notice)) _push(`<p role="status">${ssrInterpolate(unref(notice))}</p>`);
			else _push(`<!---->`);
			if (unref(loading)) _push(`<p role="status">Загружаем платежи…</p>`);
			else _push(`<!---->`);
			if (unref(opening)) _push(`<p role="status">Открываем карточку…</p>`);
			else _push(`<!---->`);
			if (unref(data) && !unref(loading)) {
				_push(`<!--[--><section class="crm-ops-month-summary" aria-label="Итоги месяца"><h2 class="wn-sr-only">План расходов за выбранный месяц</h2><div class="crm-summary-grid"><div><small>Запланировано</small><strong>${ssrInterpolate(money(unref(data).totals.plannedCents))}</strong></div><div><small>Отмечено вручную</small><strong>${ssrInterpolate(money(unref(data).totals.paidCents))}</strong></div><div><small>Осталось отметить</small><strong>${ssrInterpolate(money(unref(data).totals.outstandingCents))}</strong></div><div><small>Просрочено</small><strong>${ssrInterpolate(money(unref(data).totals.overdueCents))}</strong></div></div></section><section class="crm-surface" aria-label="Календарь расходов"><header class="crm-panel-header"><div class="crm-action-bar"><button class="crm-button crm-button--icon" aria-label="Предыдущий месяц"${ssrIncludeBooleanAttr(unref(month) <= "2000-01") ? " disabled" : ""}>`);
				_push(ssrRenderComponent(unref(ChevronLeft), { size: 18 }, null, _parent));
				_push(`</button><h2>${ssrInterpolate((/* @__PURE__ */ new Date(unref(month) + "-01T12:00:00Z")).toLocaleDateString("ru-RU", {
					month: "long",
					year: "numeric",
					timeZone: "UTC"
				}))}</h2><button class="crm-button crm-button--icon" aria-label="Следующий месяц"${ssrIncludeBooleanAttr(unref(month) >= "2100-12") ? " disabled" : ""}>`);
				_push(ssrRenderComponent(unref(ChevronRight), { size: 18 }, null, _parent));
				_push(`</button></div><div class="crm-action-bar crm-view-switch" role="group" aria-label="Вид календаря"><!--[-->`);
				ssrRenderList([
					["calendar", "Месяц"],
					["list", "Список"],
					["plans", "Планы"]
				], ([key, label]) => {
					_push(`<button class="crm-button"${ssrRenderAttr("aria-pressed", unref(mode) === key)}>${ssrInterpolate(label)}</button>`);
				});
				_push(`<!--]--></div></header><div class="crm-register crm-stack">`);
				if (unref(mode) === "calendar") {
					_push(`<div class="crm-month-grid" aria-label="Даты платежей"><!--[-->`);
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
							_push(`<button class="crm-month-day crm-card-action"${ssrRenderAttr("aria-pressed", unref(day) === cell.key)}${ssrRenderAttr("aria-current", cell.key === unref(data).today ? "date" : void 0)}${ssrRenderAttr("aria-label", `${dateLabel(cell.key)}: платежей ${cell.items.length}`)}><strong>${ssrInterpolate(cell.number)}</strong>`);
							if (cell.items.length) _push(`<small>${ssrInterpolate(cell.items.length)} шт.</small>`);
							else _push(`<!---->`);
							if (cell.items.length) _push(`<small class="crm-month-detail">${ssrInterpolate(money(cell.items.reduce((sum, item) => sum + item.amountCents, 0)))}</small>`);
							else _push(`<!---->`);
							_push(`</button>`);
						} else _push(`<span aria-hidden="true"></span>`);
						_push(`<!--]-->`);
					});
					_push(`<!--]--></div>`);
				} else _push(`<!---->`);
				if (unref(mode) !== "plans") {
					_push(`<!--[--><div class="crm-action-bar crm-action-bar--spread"><h3>${ssrInterpolate(unref(day) ? dateLabel(unref(day)) : "Платежи месяца")} · ${ssrInterpolate(unref(visible).length)}</h3>`);
					if (unref(day)) _push(`<button class="crm-button crm-button--text">Все даты</button>`);
					else _push(`<!---->`);
					_push(`</div><!--[-->`);
					ssrRenderList(unref(visible), (item) => {
						_push(`<article class="crm-item-card crm-record"><span><strong>${ssrInterpolate(item.title)}</strong><small>${ssrInterpolate(categories[item.category])}${ssrInterpolate(item.vendor ? " · " + item.vendor : "")}</small><small>${ssrInterpolate(dateLabel(item.dueDate))}${ssrInterpolate(item.paidOn ? " · Отмечено " + dateLabel(item.paidOn) : "")}</small></span><span><strong>${ssrInterpolate(money(item.amountCents))}</strong><small><span class="${ssrRenderClass([{ "crm-badge--danger": item.status === "OVERDUE" }, "crm-badge"])}"${ssrRenderAttr("data-status", item.status)}>${ssrInterpolate(statusLabel(item.status))}</span></small></span><button class="crm-button"${ssrIncludeBooleanAttr(unref(opening)) ? " disabled" : ""}${ssrRenderAttr("aria-label", `Открыть платёж ${item.title}, ${item.dueDate}`)}>Открыть</button></article>`);
					});
					_push(`<!--]-->`);
					if (!unref(visible).length) {
						_push(`<div class="crm-empty">`);
						_push(ssrRenderComponent(unref(CalendarCheck2), { size: 28 }, null, _parent));
						_push(`<h3>Платежей по этим условиям нет</h3><p>Выберите другой месяц, сбросьте фильтры или добавьте план.</p>`);
						if (unref(search) || unref(status) !== "ALL" || unref(day)) _push(`<button class="crm-button">Сбросить фильтры</button>`);
						else if (unref(data).canWrite) _push(`<button class="crm-button crm-button--primary">Добавить платёж</button>`);
						else _push(`<!---->`);
						_push(`</div>`);
					} else _push(`<!---->`);
					_push(`<!--]-->`);
				} else {
					_push(`<!--[--><p class="crm-inline-note">Все доступные планы, включая завершённые. Месяц и статус не ограничивают этот список.</p><!--[-->`);
					ssrRenderList(unref(plans), (plan) => {
						_push(`<article class="crm-item-card crm-record"><span><strong>${ssrInterpolate(plan.title)}</strong><small>${ssrInterpolate(period(plan))} · с ${ssrInterpolate(dateLabel(plan.startDate))}${ssrInterpolate(plan.endDate ? " по " + dateLabel(plan.endDate) : "")}</small></span><span><strong>${ssrInterpolate(money(plan.amountCents))}</strong><small>${ssrInterpolate(scopes[plan.visibility])}</small></span><button class="crm-button"${ssrIncludeBooleanAttr(unref(opening)) ? " disabled" : ""}${ssrRenderAttr("aria-label", `Открыть план ${plan.title}`)}>Открыть</button></article>`);
					});
					_push(`<!--]-->`);
					if (!unref(plans).length) _push(`<p class="crm-empty">Планов пока нет. Добавьте первый расход.</p>`);
					else _push(`<!---->`);
					_push(`<!--]-->`);
				}
				_push(`</div></section><p class="crm-inline-note">Даты — по Москве. Итоги — за весь выбранный месяц, до фильтров списка; просрочка в других месяцах в них не входит.</p><!--]-->`);
			} else _push(`<!---->`);
			_push(`</div>`);
			ssrRenderTeleport(_push, (_push) => {
				if (unref(opened)) {
					_push(`<div class="admin-dialog-backdrop crm-detail-backdrop"><form class="admin-dialog admin-dialog--drawer crm-detail-card" role="dialog" aria-modal="true" aria-labelledby="payment-title" tabindex="-1"><header><div><p>План расходов</p><h2 id="payment-title">${ssrInterpolate(unref(selected) ? unref(selected).title : "Новый платёж")}</h2></div><button class="crm-button crm-button--icon" type="button" aria-label="Закрыть карточку"${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""}>`);
					_push(ssrRenderComponent(unref(X), { size: 18 }, null, _parent));
					_push(`</button></header><div class="admin-dialog-body crm-detail-body crm-stack">`);
					if (unref(formError)) {
						_push(`<div class="crm-stack" role="alert"><p>${ssrInterpolate(unref(formError))}</p>`);
						if (unref(selected)) _push(`<button class="crm-button" type="button"${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""}>Загрузить актуальную карточку</button>`);
						else _push(`<!---->`);
						_push(`</div>`);
					} else _push(`<!---->`);
					if (unref(occurrence)) {
						_push(`<section class="crm-surface crm-surface--tint crm-record crm-stack" aria-label="Отметка оплаты"><h3>${ssrInterpolate(dateLabel(unref(occurrence).dueDate))} · ${ssrInterpolate(money(unref(occurrence).amountCents))}</h3><p>${ssrInterpolate(statusLabel(unref(occurrence).status))}${ssrInterpolate(unref(occurrence).paidOn ? " · " + dateLabel(unref(occurrence).paidOn) : "")}</p>`);
						if (unref(data)?.canSettle) {
							_push(`<!--[-->`);
							if (!unref(occurrence).paidOn) _push(`<label class="crm-field">Дата оплаты<input${ssrRenderAttr("value", unref(paidOn))} class="crm-input" type="date"${ssrRenderAttr("max", unref(data).today)}${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""}></label>`);
							else _push(`<!---->`);
							_push(`<label class="crm-field">${ssrInterpolate(unref(occurrence).paidOn ? "Причина исправления" : "Комментарий к оплате")}<input${ssrRenderAttr("value", unref(reason))} class="crm-input" maxlength="500"${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""}></label><button class="crm-button" type="button"${ssrIncludeBooleanAttr(unref(saving) || unref(dirty)) ? " disabled" : ""}>${ssrInterpolate(unref(occurrence).paidOn ? "Снять отметку оплаты" : "Отметить оплачено")}</button>`);
							if (unref(dirty)) _push(`<p>Сначала сохраните изменения плана.</p>`);
							else _push(`<!---->`);
							_push(`<!--]-->`);
						} else _push(`<!---->`);
						_push(`</section>`);
					} else _push(`<!---->`);
					if (!unref(data)?.canWrite) _push(`<p>План доступен только для просмотра.</p>`);
					else _push(`<!---->`);
					_push(`<fieldset class="ui-fieldset-reset crm-stack"${ssrIncludeBooleanAttr(unref(saving) || !unref(data)?.canWrite) ? " disabled" : ""}><label class="crm-field">Название платежа<input${ssrRenderAttr("value", unref(draft).title)} class="crm-input" required maxlength="160" placeholder="Например, сервер сайта"></label><div class="two"><label class="crm-field">Категория<select class="crm-input"><!--[-->`);
					ssrRenderList(categories, (label, key) => {
						_push(`<option${ssrRenderAttr("value", key)}${ssrIncludeBooleanAttr(Array.isArray(unref(draft).category) ? ssrLooseContain(unref(draft).category, key) : ssrLooseEqual(unref(draft).category, key)) ? " selected" : ""}>${ssrInterpolate(label)}</option>`);
					});
					_push(`<!--]--></select></label><label class="crm-field">Сумма, ₽<input${ssrRenderAttr("value", unref(draft).amount)} class="crm-input" inputmode="decimal" required placeholder="0,00"></label></div><label class="crm-field">Поставщик<input${ssrRenderAttr("value", unref(draft).vendor)} class="crm-input" maxlength="160" placeholder="Компания или сервис"></label><div class="two"><label class="crm-field">Первый платёж<input${ssrRenderAttr("value", unref(draft).startDate)} class="crm-input" type="date" required${ssrIncludeBooleanAttr(unref(selected)?.scheduleLocked) ? " disabled" : ""}></label><label class="crm-field">Повторение<select class="crm-input"${ssrIncludeBooleanAttr(unref(selected)?.scheduleLocked) ? " disabled" : ""}><option value="ONCE"${ssrIncludeBooleanAttr(Array.isArray(unref(draft).frequency) ? ssrLooseContain(unref(draft).frequency, "ONCE") : ssrLooseEqual(unref(draft).frequency, "ONCE")) ? " selected" : ""}>Разовый платёж</option><option value="WEEK"${ssrIncludeBooleanAttr(Array.isArray(unref(draft).frequency) ? ssrLooseContain(unref(draft).frequency, "WEEK") : ssrLooseEqual(unref(draft).frequency, "WEEK")) ? " selected" : ""}>По неделям</option><option value="MONTH"${ssrIncludeBooleanAttr(Array.isArray(unref(draft).frequency) ? ssrLooseContain(unref(draft).frequency, "MONTH") : ssrLooseEqual(unref(draft).frequency, "MONTH")) ? " selected" : ""}>По месяцам</option><option value="YEAR"${ssrIncludeBooleanAttr(Array.isArray(unref(draft).frequency) ? ssrLooseContain(unref(draft).frequency, "YEAR") : ssrLooseEqual(unref(draft).frequency, "YEAR")) ? " selected" : ""}>По годам</option></select></label></div>`);
					if (unref(draft).frequency !== "ONCE") _push(`<div class="two"><label class="crm-field">Интервал повторения<input${ssrRenderAttr("value", unref(draft).interval)} class="crm-input" type="number" min="1" max="36" required${ssrIncludeBooleanAttr(unref(selected)?.scheduleLocked) ? " disabled" : ""}></label><label class="crm-field">Последняя дата (необязательно)<input${ssrRenderAttr("value", unref(draft).endDate)} class="crm-input" type="date"${ssrRenderAttr("min", unref(draft).startDate)}></label></div>`);
					else _push(`<!---->`);
					_push(`<p class="crm-inline-note">Интервал 1 — каждую неделю, месяц или год; 3 месяца — раз в квартал. Если нужного числа нет, платёж приходится на последний день месяца. Последняя дата ограничивает повторы включительно.</p>`);
					if (unref(selected)?.scheduleLocked) _push(`<p>У плана уже есть история оплат: начало и периодичность закреплены. Чтобы изменить их, завершите этот план датой окончания и создайте новый.</p>`);
					else _push(`<!---->`);
					_push(`<label class="crm-field">Кто видит план<select class="crm-input"><!--[-->`);
					ssrRenderList([.../* @__PURE__ */ new Set([...unref(data)?.visibilities || [], unref(draft).visibility])], (value) => {
						_push(`<option${ssrRenderAttr("value", value)}${ssrIncludeBooleanAttr(Array.isArray(unref(draft).visibility) ? ssrLooseContain(unref(draft).visibility, value) : ssrLooseEqual(unref(draft).visibility, value)) ? " selected" : ""}>${ssrInterpolate(scopes[value])}</option>`);
					});
					_push(`<!--]--></select></label><p class="crm-inline-note">Личный план виден вам, администраторам и высшему руководству; план отдела — также сотрудникам этого отдела с финансовым доступом.</p><label class="crm-field">Примечание<textarea class="crm-input" rows="3" maxlength="3000" placeholder="Тариф, лицевой счёт или условия оплаты. Не указывайте пароли и данные карты.">${ssrInterpolate(unref(draft).notes)}</textarea></label></fieldset>`);
					if (unref(selected)) _push(`<p class="crm-inline-note">Сумма и описание изменятся для всех неоплаченных дат этого плана. Оплаченные даты сохраняют прежние сумму, название и поставщика.</p>`);
					else _push(`<!---->`);
					_push(`</div><footer class="crm-detail-footer"><button class="crm-button" type="button"${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""}>Закрыть</button>`);
					if (unref(data)?.canWrite) _push(`<button class="crm-button crm-button--primary" type="submit"${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""}>${ssrInterpolate(unref(saving) ? "Сохраняем…" : "Сохранить план")}</button>`);
					else _push(`<!---->`);
					_push(`</footer></form></div>`);
				} else _push(`<!---->`);
			}, "body", false, _parent);
			_push(`</main>`);
		};
	}
});
// pages/crm/payment-calendar.vue
var _sfc_setup = payment_calendar_vue_vue_type_script_setup_true_lang_default.setup;
payment_calendar_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/crm/payment-calendar.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var payment_calendar_default = payment_calendar_vue_vue_type_script_setup_true_lang_default;

export { payment_calendar_default as default };;globalThis.__timing__.logEnd('Load chunks/build/payment-calendar-BeiukRCa');
//# sourceMappingURL=payment-calendar-BeiukRCa.mjs.map
