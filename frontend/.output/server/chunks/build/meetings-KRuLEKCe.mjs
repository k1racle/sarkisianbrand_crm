globalThis.__timing__.logStart('Load chunks/build/meetings-KRuLEKCe');import { a as useWorkspaceSession, u as useHead, c as useRoute, $ as $fetch$1, f as useRuntimeConfig } from '../virtual/entry.mjs';
import { u as useCatalogDialog } from './useCatalogDialog-2pnsnnsL.mjs';
import { _ as _plugin_vue_export_helper_default } from './_plugin-vue_export-helper-DjkACiAr.mjs';
import { C as CrmCardTabs_default } from './CrmCardTabs-CwDu8QcL.mjs';
import { useSSRContext, defineComponent, computed, mergeProps, unref, ref, watch, reactive, isRef } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import { ssrRenderAttrs, ssrRenderComponent, ssrInterpolate, ssrIncludeBooleanAttr, ssrRenderList, ssrRenderClass, ssrRenderAttr, ssrRenderTeleport, ssrLooseContain, ssrLooseEqual, ssrRenderStyle } from 'vue/server-renderer';
import { CalendarClock, ChevronLeft, ChevronRight, Plus, MapPin, Users, RefreshCw, Copy, UserPlus, X, Link, Download } from '@lucide/vue';
import { m as meetingMonthDays, c as calendarDay, a as meetingKind, b as meetingResponse } from '../_/crm-meetings.mjs';
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

// components/crm/CrmMeetingCalendar.vue?vue&type=script&setup=true&lang.ts
var CrmMeetingCalendar_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "CrmMeetingCalendar",
	__ssrInlineRender: true,
	props: {
		items: {},
		month: {},
		day: {},
		canCreate: { type: Boolean },
		loading: { type: Boolean }
	},
	emits: [
		"day",
		"month",
		"open",
		"create"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const days = computed(() => meetingMonthDays(props.month)), today = calendarDay(/* @__PURE__ */ new Date());
		const events = (day) => props.items.filter((m) => new Date(m.startsAt) < new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1) && new Date(m.endsAt) > day);
		const agenda = computed(() => props.day ? events(/* @__PURE__ */ new Date(props.day + "T00:00:00")) : []);
		const caption = computed(() => props.month ? (/* @__PURE__ */ new Date(props.month + "-01T12:00:00")).toLocaleDateString("ru-RU", {
			month: "long",
			year: "numeric"
		}) : "Календарь");
		const dayCaption = computed(() => props.day ? (/* @__PURE__ */ new Date(props.day + "T12:00:00")).toLocaleDateString("ru-RU", {
			weekday: "long",
			day: "numeric",
			month: "long"
		}) : "Выберите день");
		const time = (value) => new Date(value).toLocaleTimeString("ru-RU", {
			hour: "2-digit",
			minute: "2-digit"
		});
		const dayLabel = (date) => date.toLocaleDateString("ru-RU", {
			day: "numeric",
			month: "long",
			year: "numeric"
		}) + ` · событий: ${events(date).length}`;
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<section${ssrRenderAttrs(mergeProps({
				class: "crm-surface meeting-calendar",
				"aria-label": "Календарь мероприятий и совещаний",
				"aria-busy": __props.loading
			}, _attrs))} data-v-8a11c081><header class="meeting-calendar-head" data-v-8a11c081><div data-v-8a11c081>`);
			_push(ssrRenderComponent(unref(CalendarClock), { size: 21 }, null, _parent));
			_push(`<h2 data-v-8a11c081>${ssrInterpolate(unref(caption))}</h2></div><div data-v-8a11c081><button class="crm-button crm-button--icon" aria-label="Предыдущий месяц"${ssrIncludeBooleanAttr(__props.loading) ? " disabled" : ""} data-v-8a11c081>`);
			_push(ssrRenderComponent(unref(ChevronLeft), { size: 18 }, null, _parent));
			_push(`</button><button class="crm-button"${ssrIncludeBooleanAttr(__props.loading) ? " disabled" : ""} data-v-8a11c081>Сегодня</button><button class="crm-button crm-button--icon" aria-label="Следующий месяц"${ssrIncludeBooleanAttr(__props.loading) ? " disabled" : ""} data-v-8a11c081>`);
			_push(ssrRenderComponent(unref(ChevronRight), { size: 18 }, null, _parent));
			_push(`</button></div></header><div class="meeting-calendar-layout" data-v-8a11c081><div class="meeting-month" data-v-8a11c081><div class="meeting-weekdays" data-v-8a11c081><!--[-->`);
			ssrRenderList([
				"Пн",
				"Вт",
				"Ср",
				"Чт",
				"Пт",
				"Сб",
				"Вс"
			], (day) => {
				_push(`<span data-v-8a11c081>${ssrInterpolate(day)}</span>`);
			});
			_push(`<!--]--></div><div class="meeting-month-grid" data-v-8a11c081><!--[-->`);
			ssrRenderList(unref(days), (date) => {
				_push(`<div class="${ssrRenderClass([{
					"is-selected": __props.day === unref(calendarDay)(date),
					"is-outside": unref(calendarDay)(date).slice(0, 7) !== __props.month,
					"is-today": unref(calendarDay)(date) === unref(today)
				}, "meeting-day"])}" data-v-8a11c081><button class="meeting-day-number crm-card-action"${ssrRenderAttr("aria-label", dayLabel(date))}${ssrRenderAttr("aria-pressed", __props.day === unref(calendarDay)(date))}${ssrRenderAttr("aria-current", unref(calendarDay)(date) === unref(today) ? "date" : void 0)}${ssrIncludeBooleanAttr(__props.loading) ? " disabled" : ""} data-v-8a11c081><span data-v-8a11c081>${ssrInterpolate(date.getDate())}</span>`);
				if (events(date).length) _push(`<i data-v-8a11c081>${ssrInterpolate(events(date).length)}</i>`);
				else _push(`<!---->`);
				_push(`</button><!--[-->`);
				ssrRenderList(events(date).slice(0, 2), (event) => {
					_push(`<button class="${ssrRenderClass([{ "is-cancelled": event.status === "CANCELLED" }, "meeting-day-event crm-card-action"])}"${ssrIncludeBooleanAttr(__props.loading) ? " disabled" : ""}${ssrRenderAttr("title", event.title)} data-v-8a11c081><time data-v-8a11c081>${ssrInterpolate(time(event.startsAt))}</time><span data-v-8a11c081>${ssrInterpolate(event.title)}</span></button>`);
				});
				_push(`<!--]-->`);
				if (events(date).length > 2) _push(`<button class="meeting-day-more crm-card-action"${ssrIncludeBooleanAttr(__props.loading) ? " disabled" : ""} data-v-8a11c081>Ещё ${ssrInterpolate(events(date).length - 2)}</button>`);
				else _push(`<!---->`);
				_push(`</div>`);
			});
			_push(`<!--]--></div></div><aside class="meeting-day-agenda" aria-label="События выбранного дня" data-v-8a11c081><header data-v-8a11c081><h3 data-v-8a11c081>${ssrInterpolate(unref(dayCaption))}</h3>`);
			if (__props.canCreate) {
				_push(`<button class="crm-button crm-button--icon"${ssrIncludeBooleanAttr(__props.loading) ? " disabled" : ""} aria-label="Создать событие в выбранный день" data-v-8a11c081>`);
				_push(ssrRenderComponent(unref(Plus), { size: 18 }, null, _parent));
				_push(`</button>`);
			} else _push(`<!---->`);
			_push(`</header>`);
			if (!unref(agenda).length && !__props.loading) _push(`<p class="meeting-calendar-empty" data-v-8a11c081>${ssrInterpolate(__props.canCreate ? "На этот день событий нет. Выберите другую дату или создайте событие." : "На этот день событий нет. Выберите другую дату.")}</p>`);
			else _push(`<!---->`);
			_push(`<!--[-->`);
			ssrRenderList(unref(agenda), (event) => {
				_push(`<button class="meeting-agenda-event crm-card-action"${ssrIncludeBooleanAttr(__props.loading) ? " disabled" : ""} data-v-8a11c081><span class="meeting-agenda-time" data-v-8a11c081>${ssrInterpolate(time(event.startsAt))} — ${ssrInterpolate(time(event.endsAt))}</span><strong data-v-8a11c081>${ssrInterpolate(event.title)}</strong><small data-v-8a11c081>${ssrInterpolate(unref(meetingKind)(event.kind))} · ${ssrInterpolate(event.status === "CANCELLED" ? "Отменено" : event.myResponse ? unref(meetingResponse)(event.myResponse) : "Запланировано")}</small>`);
				if (event.location) {
					_push(`<span data-v-8a11c081>`);
					_push(ssrRenderComponent(unref(MapPin), { size: 14 }, null, _parent));
					_push(`${ssrInterpolate(event.location)}</span>`);
				} else if (event.meetingUrl) _push(`<span data-v-8a11c081>Онлайн</span>`);
				else _push(`<!---->`);
				_push(`<span data-v-8a11c081>`);
				_push(ssrRenderComponent(unref(Users), { size: 14 }, null, _parent));
				_push(`${ssrInterpolate(event.members.length + 1)} участников`);
				if (event.responses) _push(`<span data-v-8a11c081> · подтвердили ${ssrInterpolate(event.responses.accepted)}</span>`);
				else _push(`<!---->`);
				_push(`</span></button>`);
			});
			_push(`<!--]--></aside></div></section>`);
		};
	}
});
// components/crm/CrmMeetingCalendar.vue
var _sfc_setup$3 = CrmMeetingCalendar_vue_vue_type_script_setup_true_lang_default.setup;
CrmMeetingCalendar_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/crm/CrmMeetingCalendar.vue");
	return _sfc_setup$3 ? _sfc_setup$3(props, ctx) : void 0;
};
var CrmMeetingCalendar_default = /*#__PURE__*/ Object.assign(_plugin_vue_export_helper_default(CrmMeetingCalendar_vue_vue_type_script_setup_true_lang_default, [["__scopeId", "data-v-8a11c081"]]), { __name: "CrmMeetingCalendar" });
// components/crm/CrmMeetingGuests.vue?vue&type=script&setup=true&lang.ts
var CrmMeetingGuests_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "CrmMeetingGuests",
	__ssrInlineRender: true,
	props: {
		meetingId: {},
		version: {},
		disabled: { type: Boolean },
		active: { type: Boolean }
	},
	emits: ["busy", "refresh"],
	setup(__props, { expose: __expose, emit: __emit }) {
		const props = __props;
		const config = useRuntimeConfig(), session = useWorkspaceSession();
		const rows = ref([]), loading = ref(false), busy = ref(false), error = ref(""), label = ref(""), canInvite = ref(false), reserved = ref(0), employeeCount = ref(0), issued = ref(null), copied = ref(false);
		ref("");
		const request = (suffix, options = {}) => $fetch$1(`/crm/meetings/${props.meetingId}${suffix}`, {
			baseURL: config.public.apiBase,
			headers: { Authorization: `Bearer ${session.token.value}` },
			timeout: 15e3,
			retry: 0,
			...options
		});
		const message = (e) => Array.isArray(e?.data?.message) ? e.data.message.join(". ") : e?.data?.message || "Не удалось выполнить действие. Обновите список и повторите.";
		const state = (row) => row.guest?.state || (row.revokedAt ? "REVOKED" : new Date(row.expiresAt) < /* @__PURE__ */ new Date() ? "EXPIRED" : "INVITED");
		const stateLabel = (value) => ({
			INVITED: "Приглашение выдано",
			WAITING: "Ожидает допуска",
			ADMITTED: "Допущен",
			REJECTED: "Отклонён",
			REVOKED: "Доступ отозван",
			LEFT: "Вышел",
			EXPIRED: "Срок истёк"
		})[value] || value;
		const when = (value) => new Date(value).toLocaleString("ru-RU");
		let revision = 0, timer;
		function schedule() {
			clearTimeout(timer);
			if (props.active) timer = setTimeout(() => load(true), 5e3);
		}
		async function load(quiet = false) {
			if (busy.value) {
				schedule();
				return;
			}
			const current = ++revision;
			if (!quiet) loading.value = true;
			try {
				const data = await request("/invitations");
				if (current !== revision) return;
				rows.value = data.items;
				reserved.value = data.reserved;
				employeeCount.value = data.employeeCount;
				canInvite.value = data.canInvite;
				if (!quiet) error.value = "";
			} catch (e) {
				if (current === revision) error.value = message(e);
			} finally {
				if (current === revision) loading.value = false;
				schedule();
			}
		}
		watch(() => props.active, (value) => {
			if (value) load();
			else {
				clearTimeout(timer);
				++revision;
				loading.value = false;
			}
		});
		__expose({ hasUnsaved: computed(() => Boolean(issued.value && !copied.value) || Boolean(label.value.trim())) });
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<section${ssrRenderAttrs(mergeProps({
				class: "crm-detail-section",
				"aria-label": "Гости встречи"
			}, _attrs))}><div class="crm-action-bar"><button type="button" class="crm-button crm-button--refresh"${ssrIncludeBooleanAttr(unref(loading) || unref(busy)) ? " disabled" : ""}>`);
			_push(ssrRenderComponent(unref(RefreshCw), { size: 18 }, null, _parent));
			_push(`Обновить гостей</button></div><p>Приглашения можно выдавать за 29 дней до встречи. Ссылка рассчитана на одного гостя. PIN и ссылка показываются один раз. Вход — за 30 минут до встречи, затем гость ждёт вашего допуска. Имя гость указывает самостоятельно.</p><p class="crm-inline-note">Видеосервер пока не подключён: допуск не запускает звонок.</p>`);
			if (unref(error)) _push(`<div role="alert" class="crm-stack"><p>${ssrInterpolate(unref(error))}</p><button class="crm-button" type="button"${ssrIncludeBooleanAttr(unref(busy) || __props.disabled) ? " disabled" : ""}>Обновить карточку встречи</button></div>`);
			else _push(`<!---->`);
			if (__props.disabled) _push(`<p>Сначала сохраните изменения встречи. При переносе или отмене старые приглашения отзываются.</p>`);
			else _push(`<!---->`);
			if (unref(loading)) _push(`<p role="status">Загружаем приглашения…</p>`);
			else _push(`<!---->`);
			if (unref(issued)) {
				_push(`<section class="crm-surface crm-register crm-stack" aria-label="Новое приглашение"><strong>Сохраните данные для гостя</strong><label class="crm-field">Ссылка<input class="crm-input" readonly${ssrRenderAttr("value", unref(issued).link)}></label><label class="crm-field">PIN<input class="crm-input" readonly${ssrRenderAttr("value", unref(issued).pin)}></label><small>Действует до ${ssrInterpolate(when(unref(issued).expiresAt))}. Передайте только адресату.</small><button type="button" class="crm-button">`);
				_push(ssrRenderComponent(unref(Copy), { size: 18 }, null, _parent));
				_push(`${ssrInterpolate(unref(copied) ? "Скопировано" : "Копировать приглашение")}</button><button type="button" class="crm-button">Данные сохранены — скрыть</button></section>`);
			} else {
				_push(`<fieldset class="ui-fieldset-reset crm-stack"${ssrIncludeBooleanAttr(__props.disabled || unref(busy) || !unref(canInvite)) ? " disabled" : ""}><legend>Пригласить гостя · ${ssrInterpolate(unref(employeeCount) + unref(reserved))}/10 мест</legend><label class="crm-field">Для кого приглашение<input${ssrRenderAttr("value", unref(label))} class="crm-input" maxlength="80" placeholder="Например, кандидат Анна"></label><button type="button" class="crm-button crm-button--primary"${ssrIncludeBooleanAttr(!unref(label).trim() || unref(employeeCount) + unref(reserved) >= 10) ? " disabled" : ""}>`);
				_push(ssrRenderComponent(unref(UserPlus), { size: 18 }, null, _parent));
				_push(`Создать приглашение</button></fieldset>`);
			}
			_push(`<!--[-->`);
			ssrRenderList(unref(rows), (row) => {
				_push(`<div class="crm-item-card crm-register crm-stack"><strong>${ssrInterpolate(row.label)}</strong><span class="crm-badge"${ssrRenderAttr("data-status", ["REVOKED", "REJECTED"].includes(state(row)) ? "REJECTED" : void 0)}>${ssrInterpolate(stateLabel(state(row)))}</span>`);
				if (row.guest) _push(`<p>Имя гостя: ${ssrInterpolate(row.guest.displayName)}</p>`);
				else _push(`<!---->`);
				_push(`<small>Приглашение до ${ssrInterpolate(when(row.expiresAt))}</small><div class="crm-action-bar">`);
				if (state(row) === "WAITING") _push(`<!--[--><button type="button" class="crm-button crm-button--primary"${ssrIncludeBooleanAttr(__props.disabled || unref(busy)) ? " disabled" : ""}>Допустить</button><button type="button" class="crm-button crm-button--danger"${ssrIncludeBooleanAttr(__props.disabled || unref(busy)) ? " disabled" : ""}>Отклонить</button><!--]-->`);
				else if (!row.revokedAt && new Date(row.expiresAt) > /* @__PURE__ */ new Date()) _push(`<button type="button" class="crm-button crm-button--danger"${ssrIncludeBooleanAttr(__props.disabled || unref(busy)) ? " disabled" : ""}>Отозвать доступ</button>`);
				else _push(`<!---->`);
				_push(`</div></div>`);
			});
			_push(`<!--]-->`);
			if (!unref(loading) && !unref(rows).length) _push(`<p>Гостевых приглашений пока нет.</p>`);
			else _push(`<!---->`);
			_push(`</section>`);
		};
	}
});
// components/crm/CrmMeetingGuests.vue
var _sfc_setup$2 = CrmMeetingGuests_vue_vue_type_script_setup_true_lang_default.setup;
CrmMeetingGuests_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/crm/CrmMeetingGuests.vue");
	return _sfc_setup$2 ? _sfc_setup$2(props, ctx) : void 0;
};
var CrmMeetingGuests_default = Object.assign(CrmMeetingGuests_vue_vue_type_script_setup_true_lang_default, { __name: "CrmMeetingGuests" });
// components/crm/CrmMeetingCalendarSync.vue?vue&type=script&setup=true&lang.ts
var CrmMeetingCalendarSync_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "CrmMeetingCalendarSync",
	__ssrInlineRender: true,
	props: { modelValue: { type: Boolean } },
	emits: ["update:modelValue"],
	setup(__props, { emit: __emit }) {
		const props = __props, emit = __emit;
		const session = useWorkspaceSession(), config = useRuntimeConfig();
		const busy = ref(false), enabled = ref(false), feed = ref(""), error = ref(""), notice = ref("");
		const provider = ref("google");
		const api = (options = {}) => $fetch$1("/crm/meetings/calendar-subscription", {
			baseURL: config.public.apiBase,
			headers: { Authorization: `Bearer ${session.token.value}` },
			retry: 0,
			timeout: 15e3,
			...options
		});
		function close() {
			if (!busy.value) {
				feed.value = "";
				emit("update:modelValue", false);
			}
		}
		useCatalogDialog(computed(() => props.modelValue), close);
		const localAddress = computed(() => {
			if (!feed.value) return false;
			const host = new URL(feed.value).hostname;
			return host === "localhost" || host === "127.0.0.1" || /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host);
		});
		const instructions = computed(() => ({
			google: "Google Календарь → Другие календари → «+» → Добавить по URL. Вставьте персональную ссылку.",
			yandex: "Яндекс Календарь → Новая подписка. Вставьте ссылку и нажмите «Создать».",
			apple: "Календарь Apple → Добавить календарь → Подписной календарь. На Mac: Файл → Новая подписка на календарь. Вставьте ссылку."
		})[provider.value]);
		async function run(action) {
			if (busy.value) return;
			busy.value = true;
			error.value = "";
			notice.value = "";
			try {
				await action();
			} catch (e) {
				error.value = e?.data?.message || "Не удалось настроить подписку";
			} finally {
				busy.value = false;
			}
		}
		watch(() => props.modelValue, (value) => {
			if (value) run(async () => {
				const status = await api();
				enabled.value = status.enabled;
			});
		});
		return (_ctx, _push, _parent, _attrs) => {
			ssrRenderTeleport(_push, (_push) => {
				if (__props.modelValue) {
					_push(`<div class="admin-dialog-backdrop crm-detail-backdrop"><section class="admin-dialog admin-dialog--drawer crm-detail-card" role="dialog" aria-modal="true" aria-labelledby="calendar-sync-title" tabindex="-1"><header><div><p>Ваш календарь</p><h2 id="calendar-sync-title">Google, Яндекс и Apple</h2></div><button type="button" class="crm-button crm-button--icon" aria-label="Закрыть подключение календаря"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}>`);
					_push(ssrRenderComponent(unref(X), { size: 18 }, null, _parent));
					_push(`</button></header><div class="admin-dialog-body crm-detail-body crm-stack"><p>Подпишитесь на свои события CRM: новые приглашения, переносы и отмены будут обновляться во внешнем календаре. Ответы об участии и изменение событий — в CRM.</p><p>Обновления приходят с интервалом, который задаёт внешний сервис. Скачанный файл .ics добавляет разовую копию события; подписка по ссылке получает изменения.</p>`);
					if (unref(error)) _push(`<p role="alert">${ssrInterpolate(unref(error))}</p>`);
					else _push(`<!---->`);
					if (unref(notice)) _push(`<p role="status">${ssrInterpolate(unref(notice))}</p>`);
					else _push(`<!---->`);
					_push(`<section class="crm-stack"><h3>Персональная подписка</h3><p>${ssrInterpolate(unref(enabled) ? "Подписка включена. Ссылка показывается только после создания. Новая ссылка отключит предыдущую." : "Создайте ссылку и добавьте её в выбранный календарь.")}</p><button class="crm-button crm-button--primary" type="button"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}>`);
					_push(ssrRenderComponent(unref(Link), { size: 17 }, null, _parent));
					_push(`${ssrInterpolate(unref(enabled) ? "Заменить ссылку подписки" : "Создать ссылку подписки")}</button>`);
					if (unref(feed)) {
						_push(`<!--[--><label class="crm-field">Ссылка на ваш календарь<input class="crm-input"${ssrRenderAttr("value", unref(feed))} readonly></label><button type="button" class="crm-button">`);
						_push(ssrRenderComponent(unref(Copy), { size: 16 }, null, _parent));
						_push(`Скопировать ссылку</button><p>Ссылка открывает ваши события без входа. Передавайте её только своему календарному приложению.</p>`);
						if (unref(localAddress)) _push(`<p class="crm-inline-note">Сейчас сайт открыт в локальной сети. Для Google и Яндекса потребуется публичный HTTPS-адрес CRM; до публикации можно скачивать события в .ics.</p>`);
						else _push(`<!---->`);
						_push(`<!--]-->`);
					} else _push(`<!---->`);
					_push(`</section><label class="crm-field">Куда подключить<select class="crm-input"><option value="google"${ssrIncludeBooleanAttr(Array.isArray(unref(provider)) ? ssrLooseContain(unref(provider), "google") : ssrLooseEqual(unref(provider), "google")) ? " selected" : ""}>Google Календарь</option><option value="yandex"${ssrIncludeBooleanAttr(Array.isArray(unref(provider)) ? ssrLooseContain(unref(provider), "yandex") : ssrLooseEqual(unref(provider), "yandex")) ? " selected" : ""}>Яндекс Календарь</option><option value="apple"${ssrIncludeBooleanAttr(Array.isArray(unref(provider)) ? ssrLooseContain(unref(provider), "apple") : ssrLooseEqual(unref(provider), "apple")) ? " selected" : ""}>Apple Календарь</option></select></label><p>${ssrInterpolate(unref(instructions))}</p><p>`);
					_push(ssrRenderComponent(unref(Download), { size: 16 }, null, _parent));
					_push(` Чтобы скачать отдельное событие, откройте его карточку и нажмите «Скачать .ics».</p>`);
					if (unref(enabled)) _push(`<button type="button" class="crm-button crm-button--danger"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}>Отключить подписку</button>`);
					else _push(`<!---->`);
					_push(`</div><footer class="crm-detail-footer"><button class="crm-button" type="button"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}>Закрыть</button></footer></section></div>`);
				} else _push(`<!---->`);
			}, "body", false, _parent);
		};
	}
});
// components/crm/CrmMeetingCalendarSync.vue
var _sfc_setup$1 = CrmMeetingCalendarSync_vue_vue_type_script_setup_true_lang_default.setup;
CrmMeetingCalendarSync_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/crm/CrmMeetingCalendarSync.vue");
	return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
var CrmMeetingCalendarSync_default = Object.assign(CrmMeetingCalendarSync_vue_vue_type_script_setup_true_lang_default, { __name: "CrmMeetingCalendarSync" });
// pages/crm/meetings.vue?vue&type=script&setup=true&lang.ts
var meetings_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "meetings",
	__ssrInlineRender: true,
	setup(__props) {
		useHead({ title: "Календарь событий — SARKISIAN CRM" });
		const session = useWorkspaceSession(), config = useRuntimeConfig();
		const request = (path = "", options = {}) => $fetch$1("/crm/meetings" + path, {
			baseURL: config.public.apiBase,
			headers: { Authorization: `Bearer ${session.token.value}` },
			timeout: 15e3,
			retry: 0,
			...options
		});
		const items = ref([]), total = ref(0), page = ref(1), pages = ref(1), canCreate = ref(false);
		const month = ref(""), status = ref("SCHEDULED"), search = ref(""), zone = ref("");
		const displayMode = ref("calendar"), day = ref(calendarDay(/* @__PURE__ */ new Date())), mine = ref(false), syncOpened = ref(false), declining = ref(false), declineReason = ref(""), responseNotice = ref("");
		const route = useRoute();
		const loading = ref(false), saving = ref(false), opening = ref(false), error = ref(""), formError = ref("");
		const opened = ref(false), selected = ref(null), baseline = ref(""), requestKey = ref("");
		const team = ref([]), teamSearch = ref(""), teamError = ref(""), teamLoading = ref(false), teamHasMore = ref(false);
		const cancelMode = ref(false), cancelReason = ref("");
		const activeTab = ref("general"), guestsVisited = ref(false), guestBusy = ref(false);
		const guestPanel = ref(null);
		const cardTabs = computed(() => selected.value?.canManage ? [
			["general", "Общее"],
			["participants", "Участники"],
			["guests", "Гости"]
		] : [["general", "Общее"], ["participants", "Участники"]]);
		watch(activeTab, (value) => {
			if (value === "guests") guestsVisited.value = true;
		});
		const draft = reactive({
			title: "",
			agenda: "",
			kind: "MEETING",
			location: "",
			meetingUrl: "",
			reminderMinutes: 30,
			start: "",
			end: "",
			memberIds: []
		});
		const dirty = computed(() => opened.value && baseline.value !== JSON.stringify(draft));
		const editable = computed(() => selected.value ? selected.value.canManage : canCreate.value);
		const candidates = computed(() => Array.from(new Map([...team.value, ...selected.value?.members || []].map((person) => [person.id, person])).values()).filter((person) => person.id !== selected.value?.organizerId));
		const label = (person) => [person.firstName, person.lastName].filter(Boolean).join(" ") || "Сотрудник";
		const kindLabel = meetingKind;
		const message = (e, fallback) => Array.isArray(e?.data?.message) ? e.data.message.join(". ") : e?.data?.message || fallback;
		const localInput = (date) => (/* @__PURE__ */ new Date(date.getTime() - date.getTimezoneOffset() * 6e4)).toISOString().slice(0, 16);
		const when = (value) => new Date(value).toLocaleString("ru-RU", {
			day: "numeric",
			month: "long",
			hour: "2-digit",
			minute: "2-digit"
		});
		let listVersion = 0, teamVersion = 0, detailVersion = 0;
		async function load(reset = false) {
			if (reset) page.value = 1;
			const version = ++listVersion;
			loading.value = true;
			error.value = "";
			try {
				if (!/^\d{4}-\d{2}$/.test(month.value)) throw new Error("Выберите месяц");
				const [year, number] = month.value.split("-").map(Number);
				const dates = meetingMonthDays(month.value), calendar = displayMode.value === "calendar";
				const query = {
					from: (calendar ? dates[0] : new Date(year, number - 1, 1)).toISOString(),
					to: (calendar ? new Date(dates[41].getFullYear(), dates[41].getMonth(), dates[41].getDate() + 1) : new Date(year, number, 1)).toISOString(),
					status: status.value,
					q: search.value.trim(),
					mine: String(mine.value),
					page: calendar ? 1 : page.value,
					limit: calendar ? 100 : 30
				};
				const result = await request("", { query });
				if (calendar) for (let next = 2; next <= result.pages; next++) {
					if (version !== listVersion) return;
					const more = await request("", { query: {
						...query,
						page: next
					} });
					result.items.push(...more.items);
				}
				if (version !== listVersion) return;
				items.value = result.items;
				total.value = result.total;
				pages.value = result.pages;
				canCreate.value = result.canCreate;
				if (page.value > result.pages) {
					page.value = result.pages;
					await load();
				}
			} catch (e) {
				if (version === listVersion) {
					items.value = [];
					total.value = 0;
					canCreate.value = false;
					error.value = message(e, "Не удалось загрузить встречи. Выберите месяц и повторите попытку.");
				}
			} finally {
				if (version === listVersion) loading.value = false;
			}
		}
		async function loadTeam() {
			const version = ++teamVersion;
			teamLoading.value = true;
			teamError.value = "";
			try {
				const result = await request("/team", { query: { q: teamSearch.value.trim() } });
				if (version === teamVersion && opened.value) {
					team.value = [...result.items, ...team.value.filter((person) => draft.memberIds.includes(person.id))];
					teamHasMore.value = result.hasMore;
				}
			} catch (e) {
				if (version === teamVersion) teamError.value = message(e, "Не удалось загрузить сотрудников");
			} finally {
				if (version === teamVersion) teamLoading.value = false;
			}
		}
		function fill(row) {
			selected.value = row;
			formError.value = "";
			cancelMode.value = false;
			cancelReason.value = "";
			declining.value = false;
			declineReason.value = row?.myDeclineReason || "";
			responseNotice.value = "";
			const start = /* @__PURE__ */ new Date(Math.ceil((Date.now() + 36e5) / 9e5) * 9e5);
			Object.assign(draft, {
				title: row?.title || "",
				agenda: row?.agenda || "",
				kind: row?.kind || "MEETING",
				location: row?.location || "",
				meetingUrl: row?.meetingUrl || "",
				reminderMinutes: row?.reminderMinutes ?? 30,
				start: localInput(row ? new Date(row.startsAt) : start),
				end: localInput(row ? new Date(row.endsAt) : /* @__PURE__ */ new Date(+start + 36e5)),
				memberIds: row?.members.map((member) => member.id) || []
			});
			baseline.value = JSON.stringify(draft);
		}
		function create(date) {
			if (!canCreate.value || opening.value) return;
			activeTab.value = "general";
			guestsVisited.value = false;
			guestBusy.value = false;
			fill(null);
			requestKey.value = crypto.randomUUID();
			opened.value = true;
			if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
				draft.start = date + "T10:00";
				draft.end = date + "T11:00";
				baseline.value = JSON.stringify(draft);
			}
			team.value = [];
			teamSearch.value = "";
			loadTeam();
		}
		async function open(row) {
			if (opening.value) return;
			const version = ++detailVersion;
			opening.value = true;
			error.value = "";
			try {
				const detail = await request("/" + row.id);
				if (version !== detailVersion) return;
				activeTab.value = "general";
				guestsVisited.value = false;
				guestBusy.value = false;
				fill(detail);
				opened.value = true;
				team.value = [];
				teamSearch.value = "";
				if (detail.canManage) loadTeam();
			} catch (e) {
				if (version === detailVersion) error.value = message(e, "Встреча недоступна");
			} finally {
				if (version === detailVersion) opening.value = false;
			}
		}
		function leave() {
			if (saving.value || guestBusy.value) return false;
			if ((dirty.value || cancelMode.value && cancelReason.value.trim() || declining.value && declineReason.value.trim()) && !(void 0).confirm("Изменения встречи не сохранены. Выйти без сохранения?")) return false;
			return !guestPanel.value?.hasUnsaved || (void 0).confirm("Приглашение не скопировано или не создано. Закрыть карточку? Ссылку и PIN нельзя посмотреть повторно.");
		}
		function close() {
			if (leave()) {
				opened.value = false;
				++teamVersion;
				teamLoading.value = false;
			}
		}
		useCatalogDialog(computed(() => opened.value), close);
		async function reloadCard() {
			if (!selected.value || saving.value || !leave()) return;
			saving.value = true;
			formError.value = "";
			try {
				fill(await request("/" + selected.value.id));
				if (!selected.value?.canManage) activeTab.value = "general";
				if (editable.value) await loadTeam();
			} catch (e) {
				formError.value = message(e, "Не удалось обновить карточку");
			} finally {
				saving.value = false;
			}
		}
		function changeMonth(value) {
			month.value = value;
			if (!day.value.startsWith(value)) day.value = value + "-01";
			load(true);
		}
		function openLinked() {
			const id = route.query.meeting;
			if (typeof id === "string" && /^[a-f0-9-]{36}$/i.test(id)) open({ id });
		}
		watch(() => route.query.meeting, () => {
			if (!opened.value || leave()) openLinked();
		});
		onBeforeRouteLeave(leave);
		const opsFiltersOpen = ref(false);
		return (_ctx, _push, _parent, _attrs) => {
			const _component_CrmMeetingCalendar = CrmMeetingCalendar_default;
			const _component_CrmCardTabs = CrmCardTabs_default;
			const _component_CrmMeetingGuests = CrmMeetingGuests_default;
			const _component_CrmMeetingCalendarSync = CrmMeetingCalendarSync_default;
			_push(`<main${ssrRenderAttrs(mergeProps({ class: "crm-standard crm-meetings-page crm-operational-page crm-ops-meetings" }, _attrs))} data-v-1463aafc><header class="crm-page-header" data-v-1463aafc><div data-v-1463aafc><h1 data-v-1463aafc>Календарь событий</h1><p data-v-1463aafc>Мероприятия, совещания и встречи команды. Приглашайте сотрудников и собирайте подтверждения участия.</p></div><div class="crm-action-bar" data-v-1463aafc><button class="crm-button" data-v-1463aafc>Подключить календарь</button><button class="crm-button crm-button--refresh"${ssrIncludeBooleanAttr(unref(loading)) ? " disabled" : ""} data-v-1463aafc>`);
			_push(ssrRenderComponent(unref(RefreshCw), { size: 18 }, null, _parent));
			_push(`Обновить</button>`);
			if (unref(canCreate)) {
				_push(`<button class="crm-button crm-button--primary"${ssrIncludeBooleanAttr(unref(loading) || unref(opening)) ? " disabled" : ""} data-v-1463aafc>`);
				_push(ssrRenderComponent(unref(Plus), { size: 18 }, null, _parent));
				_push(`Новое событие</button>`);
			} else _push(`<!---->`);
			_push(`</div></header><div class="crm-page-content crm-page-content--stack" data-v-1463aafc><button class="crm-button crm-ops-filter-toggle" type="button"${ssrRenderAttr("aria-expanded", unref(opsFiltersOpen))} aria-controls="ops-meetings-filters" data-v-1463aafc>Период, статус и поиск</button><form id="ops-meetings-filters" class="${ssrRenderClass([{ "is-expanded": unref(opsFiltersOpen) }, "crm-toolbar crm-filter-form crm-ops-filters"])}" aria-label="Фильтры встреч" data-v-1463aafc><label class="crm-field" data-v-1463aafc>Месяц<input${ssrRenderAttr("value", unref(month))} type="month" class="crm-input" required data-v-1463aafc></label><label class="crm-field" data-v-1463aafc>Статус<select class="crm-input" data-v-1463aafc><option value="SCHEDULED" data-v-1463aafc${ssrIncludeBooleanAttr(Array.isArray(unref(status)) ? ssrLooseContain(unref(status), "SCHEDULED") : ssrLooseEqual(unref(status), "SCHEDULED")) ? " selected" : ""}>Запланированные</option><option value="CANCELLED" data-v-1463aafc${ssrIncludeBooleanAttr(Array.isArray(unref(status)) ? ssrLooseContain(unref(status), "CANCELLED") : ssrLooseEqual(unref(status), "CANCELLED")) ? " selected" : ""}>Отменённые</option><option value="ALL" data-v-1463aafc${ssrIncludeBooleanAttr(Array.isArray(unref(status)) ? ssrLooseContain(unref(status), "ALL") : ssrLooseEqual(unref(status), "ALL")) ? " selected" : ""}>Все встречи</option></select></label><label class="crm-field" data-v-1463aafc>Поиск по названию<input${ssrRenderAttr("value", unref(search))} class="crm-input" maxlength="120" placeholder="Название встречи" data-v-1463aafc></label><button class="crm-button" type="submit"${ssrIncludeBooleanAttr(unref(loading)) ? " disabled" : ""} data-v-1463aafc>Найти</button></form><div class="crm-action-bar" data-v-1463aafc><button class="crm-button"${ssrRenderAttr("aria-pressed", unref(displayMode) === "calendar")} data-v-1463aafc>Календарь</button><button class="crm-button"${ssrRenderAttr("aria-pressed", unref(displayMode) === "list")} data-v-1463aafc>Список</button><label class="crm-toggle-row" data-v-1463aafc><input${ssrIncludeBooleanAttr(Array.isArray(unref(mine)) ? ssrLooseContain(unref(mine), null) : unref(mine)) ? " checked" : ""} type="checkbox" class="crm-check" data-v-1463aafc>Только мои события</label><small data-v-1463aafc>Время встреч · ${ssrInterpolate(unref(zone))}</small></div>`);
			if (unref(error)) _push(`<p class="operation-error" role="alert" data-v-1463aafc>${ssrInterpolate(unref(error))}<button class="crm-button"${ssrIncludeBooleanAttr(unref(loading)) ? " disabled" : ""} data-v-1463aafc>Повторить загрузку</button></p>`);
			else _push(`<!---->`);
			if (unref(loading)) _push(`<p role="status" data-v-1463aafc>Загружаем встречи…</p>`);
			else _push(`<!---->`);
			if (unref(opening)) _push(`<p role="status" data-v-1463aafc>Открываем карточку…</p>`);
			else _push(`<!---->`);
			if (unref(displayMode) === "calendar" && !unref(error)) _push(ssrRenderComponent(_component_CrmMeetingCalendar, {
				items: unref(items),
				month: unref(month),
				day: unref(day),
				"can-create": unref(canCreate),
				loading: unref(loading) || unref(opening),
				onDay: ($event) => day.value = $event,
				onMonth: changeMonth,
				onOpen: open,
				onCreate: create
			}, null, _parent));
			else if (unref(displayMode) === "list" && !unref(error)) {
				_push(`<section class="crm-surface" aria-label="Расписание встреч"${ssrRenderAttr("aria-busy", unref(loading))} data-v-1463aafc><header class="crm-panel-header" data-v-1463aafc><div data-v-1463aafc><p data-v-1463aafc>КОМАНДА</p><h2 data-v-1463aafc>Расписание встреч</h2></div><small data-v-1463aafc>Время устройства: ${ssrInterpolate(unref(zone) || "определяем…")}</small></header><div class="crm-register crm-record-list" data-v-1463aafc><!--[-->`);
				ssrRenderList(unref(items), (meeting) => {
					_push(`<article class="crm-item-card crm-record" data-v-1463aafc><span data-v-1463aafc><strong data-v-1463aafc>${ssrInterpolate(meeting.title)}</strong><small data-v-1463aafc>${ssrInterpolate(unref(kindLabel)(meeting.kind))} · ${ssrInterpolate(meeting.status === "CANCELLED" ? "Отменено" : "Запланировано")}</small><small data-v-1463aafc>${ssrInterpolate(when(meeting.startsAt))} — ${ssrInterpolate(when(meeting.endsAt))}</small><small data-v-1463aafc>${ssrInterpolate(meeting.location || "Онлайн")}`);
					if (meeting.myResponse) _push(`<!--[--> · ${ssrInterpolate(unref(meetingResponse)(meeting.myResponse))}<!--]-->`);
					else _push(`<!---->`);
					_push(`</small></span><span data-v-1463aafc><strong data-v-1463aafc>${ssrInterpolate(label(meeting.organizer))}</strong><small data-v-1463aafc>Организатор · участников: ${ssrInterpolate(meeting.members.length + 1)}</small>`);
					if (meeting.responses) _push(`<small data-v-1463aafc>Подтвердили ${ssrInterpolate(meeting.responses.accepted)} · ждём ${ssrInterpolate(meeting.responses.pending)} · не смогут ${ssrInterpolate(meeting.responses.declined)}</small>`);
					else _push(`<!---->`);
					_push(`</span><button class="crm-button"${ssrIncludeBooleanAttr(unref(opening) || unref(loading)) ? " disabled" : ""}${ssrRenderAttr("aria-label", `Открыть встречу ${meeting.title}`)} data-v-1463aafc>${ssrInterpolate(meeting.myResponse === "PENDING" ? "Ответить на приглашение" : "Открыть")}</button></article>`);
				});
				_push(`<!--]-->`);
				if (!unref(loading) && !unref(error) && !unref(items).length) {
					_push(`<div class="crm-empty" data-v-1463aafc>`);
					_push(ssrRenderComponent(unref(CalendarClock), { size: 28 }, null, _parent));
					_push(`<h2 data-v-1463aafc>Встреч пока нет</h2><p data-v-1463aafc>За выбранный период нет доступных вам встреч. Измените фильтры или запланируйте новую.</p>`);
					if (unref(search) || unref(mine) || unref(status) !== "SCHEDULED") _push(`<button class="crm-button" data-v-1463aafc>Сбросить фильтры</button>`);
					else if (unref(canCreate)) _push(`<button class="crm-button crm-button--primary" data-v-1463aafc>Запланировать событие</button>`);
					else _push(`<!---->`);
					_push(`</div>`);
				} else _push(`<!---->`);
				if (!unref(error)) _push(`<div class="crm-pagination" data-v-1463aafc><span data-v-1463aafc>Всего: ${ssrInterpolate(unref(total))} · ${ssrInterpolate(unref(page))} / ${ssrInterpolate(unref(pages))}</span><button class="crm-button"${ssrIncludeBooleanAttr(unref(loading) || unref(page) <= 1) ? " disabled" : ""} data-v-1463aafc>Назад</button><button class="crm-button"${ssrIncludeBooleanAttr(unref(loading) || unref(page) >= unref(pages)) ? " disabled" : ""} data-v-1463aafc>Далее</button></div>`);
				else _push(`<!---->`);
				_push(`</div></section>`);
			} else _push(`<!---->`);
			_push(`<p class="crm-inline-note" data-v-1463aafc>Приглашения, изменения и ответы приходят в уведомления CRM. После изменения темы, времени или места участникам нужно подтвердить участие заново.</p></div>`);
			ssrRenderTeleport(_push, (_push) => {
				if (unref(opened)) {
					_push(`<div class="admin-dialog-backdrop crm-detail-backdrop" data-v-1463aafc><form class="admin-dialog admin-dialog--drawer crm-detail-card" role="dialog" aria-modal="true" aria-labelledby="meeting-title" tabindex="-1" data-v-1463aafc><header data-v-1463aafc><div data-v-1463aafc><p data-v-1463aafc>Карточка события</p><h2 id="meeting-title" data-v-1463aafc>${ssrInterpolate(unref(selected) ? unref(selected).title : "Новое событие")}</h2></div><button class="crm-button crm-button--icon" aria-label="Закрыть встречу" type="button"${ssrIncludeBooleanAttr(unref(saving) || unref(guestBusy)) ? " disabled" : ""} data-v-1463aafc>`);
					_push(ssrRenderComponent(unref(X), { size: 18 }, null, _parent));
					_push(`</button></header>`);
					if (unref(selected)) _push(ssrRenderComponent(_component_CrmCardTabs, {
						modelValue: unref(activeTab),
						"onUpdate:modelValue": ($event) => isRef(activeTab) ? activeTab.value = $event : null,
						prefix: "meeting-card",
						tabs: unref(cardTabs),
						label: "Разделы встречи"
					}, null, _parent));
					else _push(`<!---->`);
					_push(`<div class="admin-dialog-body crm-detail-body crm-stack" data-v-1463aafc>`);
					if (unref(formError)) {
						_push(`<div role="alert" class="crm-stack" data-v-1463aafc><p data-v-1463aafc>${ssrInterpolate(unref(formError))}</p>`);
						if (unref(selected)) _push(`<button class="crm-button" type="button"${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""} data-v-1463aafc>Загрузить актуальную карточку</button>`);
						else _push(`<!---->`);
						_push(`</div>`);
					} else _push(`<!---->`);
					_push(`<section id="meeting-card-general-panel" class="crm-stack"${ssrRenderAttr("role", unref(selected) ? "tabpanel" : void 0)}${ssrRenderAttr("aria-labelledby", unref(selected) ? "meeting-card-general-tab" : void 0)} style="${ssrRenderStyle(unref(activeTab) === "general" ? null : { display: "none" })}" data-v-1463aafc>`);
					if (unref(selected)) _push(`<p data-v-1463aafc>Организатор: ${ssrInterpolate(label(unref(selected).organizer))}. ${ssrInterpolate(unref(selected).canManage ? "Вы можете изменить или отменить событие." : "Сведения о событии.")}</p>`);
					else _push(`<!---->`);
					if (unref(selected)) _push(`<button type="button" class="crm-button"${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""} data-v-1463aafc>Скачать .ics</button>`);
					else _push(`<!---->`);
					if (unref(selected)?.meetingUrl) _push(`<p data-v-1463aafc><a${ssrRenderAttr("href", unref(selected).meetingUrl)} target="_blank" rel="noopener noreferrer" data-v-1463aafc>Открыть онлайн-встречу</a></p>`);
					else _push(`<!---->`);
					if (unref(selected)?.canRespond) {
						_push(`<section class="crm-surface meeting-rsvp crm-stack" aria-label="Ваш ответ на приглашение" data-v-1463aafc><h3 data-v-1463aafc>Вы участвуете?</h3><p data-v-1463aafc>${ssrInterpolate(unref(meetingResponse)(unref(selected).myResponse))}`);
						if (unref(selected).myDeclineReason) _push(`<!--[--> · ${ssrInterpolate(unref(selected).myDeclineReason)}<!--]-->`);
						else _push(`<!---->`);
						_push(`</p>`);
						if (unref(responseNotice)) _push(`<p role="status" data-v-1463aafc>${ssrInterpolate(unref(responseNotice))}</p>`);
						else _push(`<!---->`);
						_push(`<div class="crm-action-bar" data-v-1463aafc><button class="crm-button crm-button--primary" type="button"${ssrIncludeBooleanAttr(unref(saving) || unref(dirty)) ? " disabled" : ""} data-v-1463aafc>Участвую</button><button class="crm-button" type="button"${ssrIncludeBooleanAttr(unref(saving) || unref(dirty)) ? " disabled" : ""} data-v-1463aafc>Не смогу</button></div>`);
						if (unref(declining)) _push(`<!--[--><label class="crm-field" data-v-1463aafc>Почему не сможете участвовать<textarea class="crm-input" rows="3" maxlength="1000"${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""} data-v-1463aafc>${ssrInterpolate(unref(declineReason))}</textarea></label><button class="crm-button" type="button"${ssrIncludeBooleanAttr(unref(saving) || unref(dirty) || !unref(declineReason).trim()) ? " disabled" : ""} data-v-1463aafc>Отправить причину отказа</button><!--]-->`);
						else _push(`<!---->`);
						_push(`</section>`);
					} else _push(`<!---->`);
					if (unref(selected)?.status === "CANCELLED") _push(`<p data-v-1463aafc>Встреча отменена: ${ssrInterpolate(unref(selected).cancellationReason)}</p>`);
					else _push(`<!---->`);
					_push(`<fieldset class="ui-fieldset-reset crm-stack"${ssrIncludeBooleanAttr(unref(saving) || unref(guestBusy) || !unref(editable) || unref(cancelMode)) ? " disabled" : ""} data-v-1463aafc><label class="crm-field" data-v-1463aafc>Тема события<input${ssrRenderAttr("value", unref(draft).title)} class="crm-input" maxlength="160" required data-v-1463aafc></label><label class="crm-field" data-v-1463aafc>Формат<select class="crm-input" data-v-1463aafc><option value="MEETING" data-v-1463aafc${ssrIncludeBooleanAttr(Array.isArray(unref(draft).kind) ? ssrLooseContain(unref(draft).kind, "MEETING") : ssrLooseEqual(unref(draft).kind, "MEETING")) ? " selected" : ""}>Совещание</option><option value="EVENT" data-v-1463aafc${ssrIncludeBooleanAttr(Array.isArray(unref(draft).kind) ? ssrLooseContain(unref(draft).kind, "EVENT") : ssrLooseEqual(unref(draft).kind, "EVENT")) ? " selected" : ""}>Мероприятие</option><option value="TEAM" data-v-1463aafc${ssrIncludeBooleanAttr(Array.isArray(unref(draft).kind) ? ssrLooseContain(unref(draft).kind, "TEAM") : ssrLooseEqual(unref(draft).kind, "TEAM")) ? " selected" : ""}>Планёрка</option><option value="INTERVIEW" data-v-1463aafc${ssrIncludeBooleanAttr(Array.isArray(unref(draft).kind) ? ssrLooseContain(unref(draft).kind, "INTERVIEW") : ssrLooseEqual(unref(draft).kind, "INTERVIEW")) ? " selected" : ""}>Собеседование</option><option value="OTHER" data-v-1463aafc${ssrIncludeBooleanAttr(Array.isArray(unref(draft).kind) ? ssrLooseContain(unref(draft).kind, "OTHER") : ssrLooseEqual(unref(draft).kind, "OTHER")) ? " selected" : ""}>Другая встреча</option></select></label><p data-v-1463aafc>Время вашего устройства: ${ssrInterpolate(unref(zone))}. Длительность — от 1 минуты до 12 часов.</p><div class="two" data-v-1463aafc><label class="crm-field" data-v-1463aafc>Начало<input${ssrRenderAttr("value", unref(draft).start)} class="crm-input" type="datetime-local" required data-v-1463aafc></label><label class="crm-field" data-v-1463aafc>Окончание<input${ssrRenderAttr("value", unref(draft).end)} class="crm-input" type="datetime-local" required data-v-1463aafc></label></div><label class="crm-field" data-v-1463aafc>Место проведения<input${ssrRenderAttr("value", unref(draft).location)} class="crm-input" maxlength="500"${ssrIncludeBooleanAttr(!unref(draft).meetingUrl && ["MEETING", "EVENT"].includes(unref(draft).kind)) ? " required" : ""} placeholder="Офис, переговорная, адрес или название площадки" data-v-1463aafc></label><label class="crm-field" data-v-1463aafc>Ссылка на онлайн-встречу<input${ssrRenderAttr("value", unref(draft).meetingUrl)} class="crm-input" type="url" maxlength="2000" placeholder="https://…" data-v-1463aafc></label><label class="crm-field" data-v-1463aafc>Напомнить участникам<select class="crm-input" data-v-1463aafc><option${ssrRenderAttr("value", 0)} data-v-1463aafc${ssrIncludeBooleanAttr(Array.isArray(unref(draft).reminderMinutes) ? ssrLooseContain(unref(draft).reminderMinutes, 0) : ssrLooseEqual(unref(draft).reminderMinutes, 0)) ? " selected" : ""}>Без напоминания</option><option${ssrRenderAttr("value", 5)} data-v-1463aafc${ssrIncludeBooleanAttr(Array.isArray(unref(draft).reminderMinutes) ? ssrLooseContain(unref(draft).reminderMinutes, 5) : ssrLooseEqual(unref(draft).reminderMinutes, 5)) ? " selected" : ""}>За 5 минут</option><option${ssrRenderAttr("value", 15)} data-v-1463aafc${ssrIncludeBooleanAttr(Array.isArray(unref(draft).reminderMinutes) ? ssrLooseContain(unref(draft).reminderMinutes, 15) : ssrLooseEqual(unref(draft).reminderMinutes, 15)) ? " selected" : ""}>За 15 минут</option><option${ssrRenderAttr("value", 30)} data-v-1463aafc${ssrIncludeBooleanAttr(Array.isArray(unref(draft).reminderMinutes) ? ssrLooseContain(unref(draft).reminderMinutes, 30) : ssrLooseEqual(unref(draft).reminderMinutes, 30)) ? " selected" : ""}>За 30 минут</option><option${ssrRenderAttr("value", 60)} data-v-1463aafc${ssrIncludeBooleanAttr(Array.isArray(unref(draft).reminderMinutes) ? ssrLooseContain(unref(draft).reminderMinutes, 60) : ssrLooseEqual(unref(draft).reminderMinutes, 60)) ? " selected" : ""}>За час</option><option${ssrRenderAttr("value", 1440)} data-v-1463aafc${ssrIncludeBooleanAttr(Array.isArray(unref(draft).reminderMinutes) ? ssrLooseContain(unref(draft).reminderMinutes, 1440) : ssrLooseEqual(unref(draft).reminderMinutes, 1440)) ? " selected" : ""}>За день</option></select></label><label class="crm-field" data-v-1463aafc>Повестка<textarea class="crm-input" rows="4" maxlength="5000" placeholder="Что обсудим и что подготовить участникам" data-v-1463aafc>${ssrInterpolate(unref(draft).agenda)}</textarea></label><fieldset class="ui-fieldset-reset crm-stack" data-v-1463aafc><legend data-v-1463aafc>Пригласить сотрудников · ${ssrInterpolate(unref(draft).memberIds.length + 1)}/200</legend><p data-v-1463aafc>Организатор включён автоматически. После сохранения приглашённые получат уведомление и смогут подтвердить участие или написать причину отказа. Доступны сотрудники вашего отдела; администраторы и высшее руководство могут приглашать всю компанию.</p>`);
					if (unref(editable)) {
						_push(`<!--[--><label class="crm-field" data-v-1463aafc>Найти сотрудника<input${ssrRenderAttr("value", unref(teamSearch))} class="crm-input" maxlength="80" data-v-1463aafc></label><button class="crm-button" type="button"${ssrIncludeBooleanAttr(unref(teamLoading)) ? " disabled" : ""} data-v-1463aafc>Найти сотрудников</button>`);
						if (unref(teamLoading)) _push(`<p role="status" data-v-1463aafc>Загружаем сотрудников…</p>`);
						else _push(`<!---->`);
						if (unref(teamError)) _push(`<p role="alert" data-v-1463aafc>${ssrInterpolate(unref(teamError))}</p>`);
						else _push(`<!---->`);
						if (unref(teamHasMore)) _push(`<p data-v-1463aafc>Показаны первые 100 сотрудников. Уточните поиск.</p>`);
						else _push(`<!---->`);
						_push(`<!--]-->`);
					} else _push(`<!---->`);
					_push(`<!--[-->`);
					ssrRenderList(unref(candidates), (person) => {
						_push(`<label class="crm-toggle-row" data-v-1463aafc><span data-v-1463aafc>${ssrInterpolate(label(person))}${ssrInterpolate(person.isActive ? "" : " · Неактивен, исключите из нового состава")}</span><input${ssrIncludeBooleanAttr(Array.isArray(unref(draft).memberIds) ? ssrLooseContain(unref(draft).memberIds, person.id) : unref(draft).memberIds) ? " checked" : ""} class="crm-check" type="checkbox"${ssrRenderAttr("value", person.id)}${ssrIncludeBooleanAttr((!person.isActive || unref(draft).memberIds.length >= 199) && !unref(draft).memberIds.includes(person.id)) ? " disabled" : ""} data-v-1463aafc></label>`);
					});
					_push(`<!--]-->`);
					if (!unref(candidates).length && !unref(teamLoading)) _push(`<p data-v-1463aafc>${ssrInterpolate(unref(editable) ? "Нет доступных сотрудников по этому запросу. Можно сохранить встречу только с организатором." : "Дополнительные участники не назначены.")}</p>`);
					else _push(`<!---->`);
					_push(`</fieldset></fieldset>`);
					if (unref(selected)?.canManage) {
						_push(`<section class="crm-stack" data-v-1463aafc>`);
						if (!unref(cancelMode)) _push(`<button class="crm-button crm-button--danger" type="button"${ssrIncludeBooleanAttr(unref(saving) || unref(dirty)) ? " disabled" : ""} data-v-1463aafc>Отменить встречу</button>`);
						else _push(`<!--[--><label class="crm-field" data-v-1463aafc>Причина отмены<textarea class="crm-input" rows="2" maxlength="500"${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""} data-v-1463aafc>${ssrInterpolate(unref(cancelReason))}</textarea></label><div class="crm-action-bar" data-v-1463aafc><button class="crm-button" type="button"${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""} data-v-1463aafc>Не отменять</button><button class="crm-button crm-button--danger" type="button"${ssrIncludeBooleanAttr(unref(saving) || !unref(cancelReason).trim()) ? " disabled" : ""} data-v-1463aafc>Подтвердить отмену</button></div><!--]-->`);
						_push(`</section>`);
					} else _push(`<!---->`);
					_push(`</section>`);
					if (unref(selected)) {
						_push(`<section id="meeting-card-participants-panel" role="tabpanel" aria-labelledby="meeting-card-participants-tab" class="crm-stack" style="${ssrRenderStyle(unref(activeTab) === "participants" ? null : { display: "none" })}" data-v-1463aafc><h3 data-v-1463aafc>Ответы участников</h3>`);
						if (unref(selected).responses) _push(`<p data-v-1463aafc>Участвуют: ${ssrInterpolate(unref(selected).responses.accepted + 1)} · ждём ответа: ${ssrInterpolate(unref(selected).responses.pending)} · не смогут: ${ssrInterpolate(unref(selected).responses.declined)}</p>`);
						else _push(`<!---->`);
						_push(`<article class="meeting-response-row" data-v-1463aafc><strong data-v-1463aafc>${ssrInterpolate(label(unref(selected).organizer))}</strong><span data-v-1463aafc>Организатор · участвует</span></article><!--[-->`);
						ssrRenderList(unref(selected).members, (person) => {
							_push(`<article class="meeting-response-row" data-v-1463aafc><strong data-v-1463aafc>${ssrInterpolate(label(person))}</strong><span data-v-1463aafc>${ssrInterpolate(unref(meetingResponse)(person.response))}</span>`);
							if (person.declineReason) _push(`<p data-v-1463aafc>Причина отказа: ${ssrInterpolate(person.declineReason)}</p>`);
							else _push(`<!---->`);
							if (person.respondedAt) _push(`<small data-v-1463aafc>Ответ ${ssrInterpolate(when(person.respondedAt))}</small>`);
							else _push(`<!---->`);
							_push(`</article>`);
						});
						_push(`<!--]--></section>`);
					} else _push(`<!---->`);
					if (unref(selected)?.canManage && unref(guestsVisited)) {
						_push(`<section id="meeting-card-guests-panel" role="tabpanel" aria-labelledby="meeting-card-guests-tab" style="${ssrRenderStyle(unref(activeTab) === "guests" ? null : { display: "none" })}" data-v-1463aafc>`);
						_push(ssrRenderComponent(_component_CrmMeetingGuests, {
							ref_key: "guestPanel",
							ref: guestPanel,
							"meeting-id": unref(selected).id,
							version: unref(selected).version,
							active: unref(activeTab) === "guests",
							disabled: unref(saving) || unref(dirty) || unref(cancelMode),
							onBusy: ($event) => guestBusy.value = $event,
							onRefresh: reloadCard
						}, null, _parent));
						_push(`</section>`);
					} else _push(`<!---->`);
					_push(`</div><footer class="crm-detail-footer" data-v-1463aafc><button type="button" class="crm-button"${ssrIncludeBooleanAttr(unref(saving) || unref(guestBusy)) ? " disabled" : ""} data-v-1463aafc>Закрыть</button>`);
					if (unref(activeTab) === "general" && unref(editable) && !unref(cancelMode)) _push(`<button type="submit" class="crm-button crm-button--primary"${ssrIncludeBooleanAttr(unref(saving) || unref(guestBusy) || !unref(draft).title.trim() || unref(selected) && !unref(dirty)) ? " disabled" : ""} data-v-1463aafc>${ssrInterpolate(unref(saving) ? "Сохраняем…" : unref(selected) ? "Сохранить изменения" : "Создать и пригласить")}</button>`);
					else _push(`<!---->`);
					_push(`</footer></form></div>`);
				} else _push(`<!---->`);
			}, "body", false, _parent);
			_push(ssrRenderComponent(_component_CrmMeetingCalendarSync, {
				modelValue: unref(syncOpened),
				"onUpdate:modelValue": ($event) => isRef(syncOpened) ? syncOpened.value = $event : null
			}, null, _parent));
			_push(`</main>`);
		};
	}
});
// pages/crm/meetings.vue
var _sfc_setup = meetings_vue_vue_type_script_setup_true_lang_default.setup;
meetings_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/crm/meetings.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var meetings_default = /*#__PURE__*/ _plugin_vue_export_helper_default(meetings_vue_vue_type_script_setup_true_lang_default, [["__scopeId", "data-v-1463aafc"]]);

export { meetings_default as default };;globalThis.__timing__.logEnd('Load chunks/build/meetings-KRuLEKCe');
//# sourceMappingURL=meetings-KRuLEKCe.mjs.map
