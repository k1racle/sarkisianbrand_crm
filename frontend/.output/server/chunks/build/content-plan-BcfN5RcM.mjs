globalThis.__timing__.logStart('Load chunks/build/content-plan-BcfN5RcM');import { u as useHead, c as useRoute, a as useWorkspaceSession, b as useWorkspaceAccess, N as NuxtLink, $ as $fetch$1, f as useRuntimeConfig } from '../virtual/entry.mjs';
import { u as useCatalogDialog } from './useCatalogDialog-2pnsnnsL.mjs';
import { u as useCrmCardDrag, C as CrmTaskFiles_default } from './useCrmCardDrag-DCjeNwkh.mjs';
import { defineComponent, computed, ref, reactive, watch, mergeProps, unref, withCtx, createVNode, createTextVNode, useSSRContext } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import { ssrRenderAttrs, ssrIncludeBooleanAttr, ssrRenderComponent, ssrInterpolate, ssrLooseContain, ssrLooseEqual, ssrRenderAttr, ssrRenderClass, ssrRenderList, ssrRenderTeleport } from 'vue/server-renderer';
import { RefreshCw, Plus, ChevronLeft, ChevronRight, CalendarDays, List, Kanban, Search, X, Archive, UserRound, Lightbulb, ExternalLink, Copy, MessageSquare, Check } from '@lucide/vue';
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
import './CrmFilePreview-D4bnqJky.mjs';

const contentPlatforms = { INSTAGRAM: "Instagram", YOUTUBE: "YouTube", VK: "\u0412\u041A\u043E\u043D\u0442\u0430\u043A\u0442\u0435", TELEGRAM: "Telegram", MAX: "MAX", TIKTOK: "TikTok", OTHER: "\u0414\u0440\u0443\u0433\u0430\u044F \u043F\u043B\u043E\u0449\u0430\u0434\u043A\u0430" };
const contentFormats = { REELS: "Reels", SHORTS: "Shorts", STORY: "Stories", POST: "\u041F\u043E\u0441\u0442", VIDEO: "\u0412\u0438\u0434\u0435\u043E", LIVE: "\u042D\u0444\u0438\u0440" };
const contentStages = { IDEA: "\u0418\u0434\u0435\u044F", SCRIPT: "\u0421\u0446\u0435\u043D\u0430\u0440\u0438\u0439", SHOOTING: "\u0421\u044A\u0451\u043C\u043A\u0430", EDITING: "\u041C\u043E\u043D\u0442\u0430\u0436", REVIEW: "\u0421\u043E\u0433\u043B\u0430\u0441\u043E\u0432\u0430\u043D\u0438\u0435", SCHEDULED: "\u0413\u043E\u0442\u043E\u0432\u043E \u043A \u043F\u0443\u0431\u043B\u0438\u043A\u0430\u0446\u0438\u0438", PUBLISHED: "\u041E\u043F\u0443\u0431\u043B\u0438\u043A\u043E\u0432\u0430\u043D\u043E" };
function contentLocal(iso, zone) {
  if (!iso) return "";
  const p = Object.fromEntries(new Intl.DateTimeFormat("sv-SE", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}
function contentInstant(local, zone) {
  if (!local) return null;
  const desired = (/* @__PURE__ */ new Date(local + "Z")).getTime();
  if (!Number.isFinite(desired)) throw new Error("\u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0434\u0430\u0442\u0443 \u0438 \u0432\u0440\u0435\u043C\u044F");
  let guess = desired;
  for (let i = 0; i < 4; i++) {
    const rendered = (/* @__PURE__ */ new Date(contentLocal(new Date(guess).toISOString(), zone) + "Z")).getTime();
    const delta = desired - rendered;
    guess += delta;
    if (!delta) break;
  }
  const result = new Date(guess).toISOString();
  if (contentLocal(result, zone) !== local.slice(0, 16)) throw new Error("\u0422\u0430\u043A\u043E\u0433\u043E \u0432\u0440\u0435\u043C\u0435\u043D\u0438 \u043D\u0435\u0442 \u0432 \u0432\u044B\u0431\u0440\u0430\u043D\u043D\u043E\u043C \u0447\u0430\u0441\u043E\u0432\u043E\u043C \u043F\u043E\u044F\u0441\u0435. \u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0434\u0440\u0443\u0433\u043E\u0435 \u0432\u0440\u0435\u043C\u044F.");
  return result;
}

// pages/crm/content-plan.vue?vue&type=script&setup=true&lang.ts
var content_plan_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "content-plan",
	__ssrInlineRender: true,
	setup(__props) {
		useHead({ title: "Контент-план — SARKISIAN CRM" });
		const config = useRuntimeConfig();
		useRoute();
		const { token, user } = useWorkspaceSession(), { can } = useWorkspaceAccess();
		const writable = computed(() => can("content_plan.write"));
		const request = (path = "", options = {}) => $fetch$1(`/crm/content-plan${path}`, {
			baseURL: config.public.apiBase,
			...options,
			headers: { Authorization: `Bearer ${token.value}` },
			retry: 0
		});
		const items = ref([]), team = ref([]), total = ref(0), loading = ref(false), busy = ref(false), error = ref(""), notice = ref("");
		const zone = ref("Europe/Moscow");
		const view = ref("calendar"), search = ref(""), platform = ref(""), status = ref(""), assignee = ref(""), archived = ref(false), period = ref("month"), date = ref(contentLocal((/* @__PURE__ */ new Date()).toISOString(), zone.value).slice(0, 10));
		const contentFiltersOpen = ref(false);
		const opened = ref(false), selected = ref(null), baseline = ref(""), formError = ref(""), comments = ref([]), comment = ref(""), commentsMore = ref(false), attachmentBusy = ref(false);
		const blank = () => ({
			title: "",
			platform: "INSTAGRAM",
			format: "REELS",
			assignedToId: user.value?.id || "",
			campaign: "",
			brief: "",
			script: "",
			caption: "",
			cta: "",
			scheduledAt: "",
			timezone: zone.value,
			status: "IDEA",
			publishedUrl: ""
		});
		const draft = reactive(blank());
		const dirty = computed(() => opened.value && (JSON.stringify(draft) !== baseline.value || !!comment.value.trim()));
		function discard() {
			return !busy.value && !attachmentBusy.value && (!dirty.value || (void 0).confirm("Закрыть без сохранения изменений и комментария?"));
		}
		function close() {
			if (discard()) {
				opened.value = false;
				formError.value = "";
			}
		}
		useCatalogDialog(computed(() => opened.value), close);
		onBeforeRouteLeave(() => discard());
		const person = (p) => [p?.firstName, p?.lastName].filter(Boolean).join(" ") || p?.email || "Не назначен";
		const message = (e) => Array.isArray(e?.data?.message) ? e.data.message.join(", ") : e?.data?.message || e?.message || "Не удалось выполнить действие";
		const dayKey = (row) => contentLocal(row.scheduledAt, zone.value).slice(0, 10);
		const today = computed(() => contentLocal((/* @__PURE__ */ new Date()).toISOString(), zone.value).slice(0, 10));
		const bounds = computed(() => {
			const start = /* @__PURE__ */ new Date(date.value + "T12:00:00Z");
			if (period.value === "month") start.setUTCDate(1);
			else start.setUTCDate(start.getUTCDate() - (start.getUTCDay() + 6) % 7);
			const end = new Date(start);
			if (period.value === "month") end.setUTCMonth(end.getUTCMonth() + 1);
			else end.setUTCDate(end.getUTCDate() + 7);
			return {
				from: start.toISOString().slice(0, 10),
				to: end.toISOString().slice(0, 10)
			};
		});
		const days = computed(() => {
			const result = [];
			const d = /* @__PURE__ */ new Date(bounds.value.from + "T12:00:00Z");
			while (d.toISOString().slice(0, 10) < bounds.value.to) {
				result.push(d.toISOString().slice(0, 10));
				d.setUTCDate(d.getUTCDate() + 1);
			}
			return result;
		});
		const heading = computed(() => new Intl.DateTimeFormat("ru-RU", {
			month: "long",
			year: "numeric",
			timeZone: "UTC"
		}).format(/* @__PURE__ */ new Date(date.value + "T12:00:00Z")));
		const planned = computed(() => items.value.filter((x) => x.scheduledAt)), unscheduled = computed(() => items.value.filter((x) => !x.scheduledAt));
		const hasFilters = computed(() => Boolean(search.value || platform.value || status.value || assignee.value));
		const humanDay = (value) => new Intl.DateTimeFormat("ru-RU", {
			day: "numeric",
			month: "long",
			timeZone: "UTC"
		}).format(/* @__PURE__ */ new Date(value + "T12:00:00Z"));
		const periodHeading = computed(() => period.value === "month" ? heading.value : humanDay(bounds.value.from) + " — " + humanDay(days.value.at(-1)));
		const calendarCells = computed(() => {
			const leading = period.value === "month" ? ((/* @__PURE__ */ new Date(bounds.value.from + "T12:00:00Z")).getUTCDay() + 6) % 7 : 0;
			const cells = [...Array(leading).fill(null), ...days.value];
			while (cells.length % 7) cells.push(null);
			return cells;
		});
		const focusedDay = ref(date.value);
		watch(bounds, (value) => {
			if (focusedDay.value < value.from || focusedDay.value >= value.to) focusedDay.value = today.value >= value.from && today.value < value.to ? today.value : value.from;
		});
		const focusedItems = computed(() => planned.value.filter((row) => dayKey(row) === focusedDay.value));
		const plannedGroups = computed(() => [...new Set(planned.value.map(dayKey))].sort().map((day) => ({
			day,
			items: planned.value.filter((row) => dayKey(row) === day).sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
		})));
		const late = (row) => row.status !== "PUBLISHED" && row.scheduledAt && new Date(row.scheduledAt).getTime() < Date.now();
		let sequence = 0, timer;
		async function load(more = false) {
			const seq = ++sequence;
			loading.value = true;
			error.value = "";
			try {
				const result = await request("", { query: {
					from: contentInstant(bounds.value.from + "T00:00", zone.value),
					to: contentInstant(bounds.value.to + "T00:00", zone.value),
					search: search.value || void 0,
					platform: platform.value || void 0,
					status: status.value || void 0,
					assignedToId: assignee.value || void 0,
					archived: String(archived.value),
					offset: more ? items.value.length : 0
				} });
				if (seq !== sequence) return;
				items.value = more ? [...items.value, ...result.items] : result.items;
				total.value = result.total;
			} catch (e) {
				if (seq === sequence) error.value = message(e);
			} finally {
				if (seq === sequence) loading.value = false;
			}
		}
		watch([
			search,
			platform,
			status,
			assignee,
			archived,
			date,
			period,
			zone
		], (next, previous) => {
			clearTimeout(timer);
			++sequence;
			if (next[0] !== previous[0]) timer = setTimeout(() => load(), 300);
			else load();
		});
		useCrmCardDrag();
		async function attachmentsChanged() {
			const id = selected.value?.id;
			if (!id) return;
			try {
				const row = await request(`/${id}`);
				if (selected.value?.id !== id) return;
				selected.value = row;
				if (row.status === "REVIEW" && draft.status !== "REVIEW") {
					draft.status = "REVIEW";
					notice.value = "Материалы изменились. Публикацию нужно согласовать повторно.";
				}
				await load();
			} catch (e) {
				formError.value = message(e);
			}
		}
		return (_ctx, _push, _parent, _attrs) => {
			const _component_NuxtLink = NuxtLink;
			const _component_CrmTaskFiles = CrmTaskFiles_default;
			_push(`<main${ssrRenderAttrs(mergeProps({ class: "crm-work-page crm-content-page crm-standard crm-operational-page crm-ops-content-plan" }, _attrs))}><header class="crm-work-header crm-page-header"><h1>Контент-план</h1><div class="crm-work-actions"><button class="crm-work-button crm-button crm-button--refresh"${ssrIncludeBooleanAttr(unref(loading)) ? " disabled" : ""}>`);
			_push(ssrRenderComponent(unref(RefreshCw), { size: 18 }, null, _parent));
			_push(`Обновить</button>`);
			if (unref(writable)) {
				_push(`<button class="crm-primary-button crm-button crm-button--primary">`);
				_push(ssrRenderComponent(unref(Plus), { size: 18 }, null, _parent));
				_push(`Новая публикация</button>`);
			} else _push(`<!---->`);
			_push(`</div></header>`);
			if (unref(error)) _push(`<p role="alert" class="crm-work-error">${ssrInterpolate(unref(error))}<button class="crm-button"${ssrIncludeBooleanAttr(unref(loading)) ? " disabled" : ""}>Повторить загрузку</button></p>`);
			else _push(`<!---->`);
			if (unref(notice)) _push(`<p role="status" class="crm-content-notice">${ssrInterpolate(unref(notice))}</p>`);
			else _push(`<!---->`);
			_push(`<section class="crm-content-workbar crm-surface" aria-label="Управление контент-планом"><div class="crm-content-navigation"><div class="crm-content-date-controls"><div class="crm-content-period-picker"><button class="crm-button crm-button--icon" aria-label="Предыдущий период">`);
			_push(ssrRenderComponent(unref(ChevronLeft), { size: 18 }, null, _parent));
			_push(`</button><strong>${ssrInterpolate(unref(periodHeading))}</strong><button class="crm-button crm-button--icon" aria-label="Следующий период">`);
			_push(ssrRenderComponent(unref(ChevronRight), { size: 18 }, null, _parent));
			_push(`</button></div><button class="crm-button">Сегодня</button><select class="crm-input" aria-label="Период"><option value="month"${ssrIncludeBooleanAttr(Array.isArray(unref(period)) ? ssrLooseContain(unref(period), "month") : ssrLooseEqual(unref(period), "month")) ? " selected" : ""}>Месяц</option><option value="week"${ssrIncludeBooleanAttr(Array.isArray(unref(period)) ? ssrLooseContain(unref(period), "week") : ssrLooseEqual(unref(period), "week")) ? " selected" : ""}>Неделя</option></select></div><div class="crm-content-view-switch" role="group" aria-label="Вид контент-плана"><button class="crm-button"${ssrRenderAttr("aria-pressed", unref(view) === "calendar")}>`);
			_push(ssrRenderComponent(unref(CalendarDays), { size: 18 }, null, _parent));
			_push(`<span>Календарь</span></button><button class="crm-button"${ssrRenderAttr("aria-pressed", unref(view) === "list")}>`);
			_push(ssrRenderComponent(unref(List), { size: 18 }, null, _parent));
			_push(`<span>Список</span></button><button class="crm-button"${ssrRenderAttr("aria-pressed", unref(view) === "board")}>`);
			_push(ssrRenderComponent(unref(Kanban), { size: 18 }, null, _parent));
			_push(`<span>Доска</span></button></div></div><div class="${ssrRenderClass([{ "is-expanded": unref(contentFiltersOpen) }, "crm-content-filterbar"])}" aria-label="Фильтры контент-плана"><div class="crm-input-group crm-content-filter-search">`);
			_push(ssrRenderComponent(unref(Search), {
				size: 18,
				"aria-hidden": "true"
			}, null, _parent));
			_push(`<input class="crm-input"${ssrRenderAttr("value", unref(search))} type="search" placeholder="Тема, текст или кампания" aria-label="Поиск публикаций">`);
			if (unref(search)) {
				_push(`<button class="crm-directory-clear crm-button crm-button--icon" aria-label="Очистить поиск">`);
				_push(ssrRenderComponent(unref(X), { size: 16 }, null, _parent));
				_push(`</button>`);
			} else _push(`<!---->`);
			_push(`</div><button class="crm-button crm-ops-filter-toggle" type="button"${ssrRenderAttr("aria-expanded", unref(contentFiltersOpen))} aria-controls="content-platform-filter content-status-filter content-assignee-filter content-archive-filter">Фильтры`);
			if (unref(platform) || unref(status) || unref(assignee) || unref(archived)) _push(`<span> · ${ssrInterpolate(Number(Boolean(unref(platform))) + Number(Boolean(unref(status))) + Number(Boolean(unref(assignee))) + Number(unref(archived)))}</span>`);
			else _push(`<!---->`);
			_push(`</button><select id="content-platform-filter" class="crm-input crm-content-advanced" aria-label="Площадка"><option value=""${ssrIncludeBooleanAttr(Array.isArray(unref(platform)) ? ssrLooseContain(unref(platform), "") : ssrLooseEqual(unref(platform), "")) ? " selected" : ""}>Все площадки</option><!--[-->`);
			ssrRenderList(unref(contentPlatforms), (name, key) => {
				_push(`<option${ssrRenderAttr("value", key)}${ssrIncludeBooleanAttr(Array.isArray(unref(platform)) ? ssrLooseContain(unref(platform), key) : ssrLooseEqual(unref(platform), key)) ? " selected" : ""}>${ssrInterpolate(name)}</option>`);
			});
			_push(`<!--]--></select><select id="content-status-filter" class="crm-input crm-content-advanced" aria-label="Этап"><option value=""${ssrIncludeBooleanAttr(Array.isArray(unref(status)) ? ssrLooseContain(unref(status), "") : ssrLooseEqual(unref(status), "")) ? " selected" : ""}>Все этапы</option><!--[-->`);
			ssrRenderList(unref(contentStages), (name, key) => {
				_push(`<option${ssrRenderAttr("value", key)}${ssrIncludeBooleanAttr(Array.isArray(unref(status)) ? ssrLooseContain(unref(status), key) : ssrLooseEqual(unref(status), key)) ? " selected" : ""}>${ssrInterpolate(name)}</option>`);
			});
			_push(`<!--]--></select><select id="content-assignee-filter" class="crm-input crm-content-advanced" aria-label="Ответственный"><option value=""${ssrIncludeBooleanAttr(Array.isArray(unref(assignee)) ? ssrLooseContain(unref(assignee), "") : ssrLooseEqual(unref(assignee), "")) ? " selected" : ""}>Вся команда</option><!--[-->`);
			ssrRenderList(unref(team), (p) => {
				_push(`<option${ssrRenderAttr("value", p.id)}${ssrIncludeBooleanAttr(Array.isArray(unref(assignee)) ? ssrLooseContain(unref(assignee), p.id) : ssrLooseEqual(unref(assignee), p.id)) ? " selected" : ""}>${ssrInterpolate(person(p))}</option>`);
			});
			_push(`<!--]--></select><button id="content-archive-filter" class="crm-button crm-content-advanced"${ssrRenderAttr("aria-pressed", unref(archived))}>`);
			_push(ssrRenderComponent(unref(Archive), { size: 16 }, null, _parent));
			_push(`Архив</button></div>`);
			if (unref(hasFilters) || unref(archived)) {
				_push(`<div class="crm-content-filter-state"><small>${ssrInterpolate(unref(archived) ? "Показаны архивные публикации" : "Применены фильтры")}</small>`);
				if (unref(hasFilters)) {
					_push(`<button class="crm-button crm-button--text">`);
					_push(ssrRenderComponent(unref(X), { size: 15 }, null, _parent));
					_push(`Сбросить фильтры</button>`);
				} else _push(`<!---->`);
				if (unref(archived)) _push(`<button class="crm-button crm-button--text">Вернуться к плану</button>`);
				else _push(`<!---->`);
				_push(`</div>`);
			} else _push(`<!---->`);
			_push(`</section><div class="crm-content-result-bar"><span role="status">${ssrInterpolate(unref(error) ? "Не удалось обновить план" : unref(loading) ? "Обновляем план…" : "Найдено: " + unref(total))}</span><small>Время публикаций · ${ssrInterpolate(unref(zone))}</small></div>`);
			if (unref(view) === "board") {
				_push(`<div class="crm-content-board crm-board"${ssrRenderAttr("aria-busy", unref(loading))}><!--[-->`);
				ssrRenderList(unref(contentStages), (name, key) => {
					_push(`<section class="crm-board-column crm-surface"${ssrRenderAttr("data-crm-drop", key)}><header><h2>${ssrInterpolate(name)}</h2><small>${ssrInterpolate(unref(items).filter((x) => x.status === key).length)}</small></header><!--[-->`);
					ssrRenderList(unref(items).filter((x) => x.status === key), (row) => {
						_push(`<article role="button" tabindex="0" class="crm-publication crm-item-card crm-card-action"${ssrRenderAttr("draggable", unref(writable) && !unref(archived))}${ssrRenderAttr("data-crm-card", row.id)}><small>${ssrInterpolate(unref(contentPlatforms)[row.platform])} · ${ssrInterpolate(unref(contentFormats)[row.format])}</small><strong>${ssrInterpolate(row.task.title)}</strong><time class="${ssrRenderClass({ "crm-content-late": late(row) })}">${ssrInterpolate(row.scheduledAt ? humanDay(dayKey(row)) + " · " + unref(contentLocal)(row.scheduledAt, unref(zone)).slice(11) : "Без даты")}</time><small>${ssrInterpolate(person(row.task.assignedTo))}</small></article>`);
					});
					_push(`<!--]-->`);
					if (!unref(error) && !unref(items).some((x) => x.status === key)) _push(`<p class="crm-content-column-empty">Пока нет публикаций</p>`);
					else _push(`<!---->`);
					_push(`</section>`);
				});
				_push(`<!--]--></div>`);
			} else {
				_push(`<div class="crm-content-planner"${ssrRenderAttr("aria-busy", unref(loading))}><section class="crm-surface crm-content-schedule"${ssrRenderAttr("aria-label", unref(view) === "calendar" ? "Календарь публикаций" : "Запланированные публикации")}><header class="crm-content-section-heading"><div><h2>${ssrInterpolate(unref(archived) ? "Архив по датам" : "План публикаций")}</h2><small>${ssrInterpolate(humanDay(unref(bounds).from))} — ${ssrInterpolate(humanDay(unref(days).at(-1)))} · С датой: ${ssrInterpolate(unref(planned).length)}${ssrInterpolate(unref(items).length < unref(total) ? " в загруженной части" : "")}</small></div>`);
				_push(ssrRenderComponent(unref(CalendarDays), { size: 20 }, null, _parent));
				_push(`</header>`);
				if (unref(view) === "calendar") {
					_push(`<!--[--><div class="crm-content-weekdays" aria-hidden="true"><!--[-->`);
					ssrRenderList([
						"Пн",
						"Вт",
						"Ср",
						"Чт",
						"Пт",
						"Сб",
						"Вс"
					], (day) => {
						_push(`<span>${ssrInterpolate(day)}</span>`);
					});
					_push(`<!--]--></div><div class="crm-content-month-grid"><!--[-->`);
					ssrRenderList(unref(calendarCells), (day, index) => {
						_push(`<!--[-->`);
						if (day) {
							_push(`<section class="${ssrRenderClass([{
								"is-today": day === unref(today),
								"is-selected": day === unref(focusedDay)
							}, "crm-content-date-cell"])}"><header><span class="crm-content-desktop-day">${ssrInterpolate(Number(day.slice(-2)))}</span><button class="crm-content-day-number crm-button crm-card-action"${ssrRenderAttr("aria-label", "Публикации на " + humanDay(day))}${ssrRenderAttr("aria-pressed", unref(focusedDay) === day)}>${ssrInterpolate(Number(day.slice(-2)))}</button>`);
							if (unref(writable) && !unref(archived)) {
								_push(`<button class="crm-button crm-button--icon crm-content-day-add"${ssrRenderAttr("aria-label", "Добавить публикацию на " + day)}>`);
								_push(ssrRenderComponent(unref(Plus), { size: 15 }, null, _parent));
								_push(`</button>`);
							} else _push(`<!---->`);
							_push(`</header>`);
							if (unref(planned).some((x) => dayKey(x) === day)) _push(`<span class="crm-content-day-count">${ssrInterpolate(unref(planned).filter((x) => dayKey(x) === day).length)}</span>`);
							else _push(`<!---->`);
							_push(`<!--[-->`);
							ssrRenderList(unref(planned).filter((x) => dayKey(x) === day), (row) => {
								_push(`<button${ssrRenderAttr("draggable", unref(writable) && !unref(archived))} class="crm-publication crm-button crm-card-action crm-item-card crm-content-calendar-entry"${ssrRenderAttr("title", row.task.title)}><small class="${ssrRenderClass({ "crm-content-late": late(row) })}">${ssrInterpolate(unref(contentLocal)(row.scheduledAt, unref(zone)).slice(11))} · ${ssrInterpolate(unref(contentPlatforms)[row.platform])}</small><strong>${ssrInterpolate(row.task.title)}</strong><span class="crm-badge"${ssrRenderAttr("data-stage", row.status)}>${ssrInterpolate(unref(contentStages)[row.status])}</span></button>`);
							});
							_push(`<!--]--></section>`);
						} else _push(`<div class="crm-content-date-placeholder" aria-hidden="true"></div>`);
						_push(`<!--]-->`);
					});
					_push(`<!--]--></div><section class="crm-content-day-agenda" aria-label="Публикации выбранного дня"><header><strong>${ssrInterpolate(humanDay(unref(focusedDay)))}</strong>`);
					if (unref(writable) && !unref(archived)) {
						_push(`<button class="crm-button crm-button--icon"${ssrRenderAttr("aria-label", "Добавить публикацию на " + unref(focusedDay))}>`);
						_push(ssrRenderComponent(unref(Plus), { size: 16 }, null, _parent));
						_push(`</button>`);
					} else _push(`<!---->`);
					_push(`</header><!--[-->`);
					ssrRenderList(unref(focusedItems), (row) => {
						_push(`<button class="crm-publication crm-button crm-card-action crm-item-card"><small>${ssrInterpolate(unref(contentLocal)(row.scheduledAt, unref(zone)).slice(11))} · ${ssrInterpolate(unref(contentPlatforms)[row.platform])}</small><strong>${ssrInterpolate(row.task.title)}</strong><span class="crm-badge"${ssrRenderAttr("data-stage", row.status)}>${ssrInterpolate(unref(contentStages)[row.status])}</span></button>`);
					});
					_push(`<!--]-->`);
					if (!unref(error) && !unref(focusedItems).length) _push(`<p>На этот день публикаций нет.</p>`);
					else _push(`<!---->`);
					_push(`</section><!--]-->`);
				} else {
					_push(`<!--[--><!--[-->`);
					ssrRenderList(unref(plannedGroups), (group) => {
						_push(`<div class="crm-content-date-group"><h3>${ssrInterpolate(humanDay(group.day))} <span>${ssrInterpolate(group.items.length)}</span></h3><!--[-->`);
						ssrRenderList(group.items, (row) => {
							_push(`<button class="crm-publication crm-button crm-card-action crm-item-card crm-content-list-entry"><time class="${ssrRenderClass({ "crm-content-late": late(row) })}">${ssrInterpolate(unref(contentLocal)(row.scheduledAt, unref(zone)).slice(11))}</time><span class="crm-content-entry-title"><strong>${ssrInterpolate(row.task.title)}</strong><small>${ssrInterpolate(unref(contentPlatforms)[row.platform])} · ${ssrInterpolate(unref(contentFormats)[row.format])}`);
							if (row.campaign) _push(`<!--[--> · ${ssrInterpolate(row.campaign)}<!--]-->`);
							else _push(`<!---->`);
							_push(`</small><small class="crm-content-entry-person">`);
							_push(ssrRenderComponent(unref(UserRound), { size: 14 }, null, _parent));
							_push(`${ssrInterpolate(person(row.task.assignedTo))}</small></span><span class="crm-badge"${ssrRenderAttr("data-stage", row.status)}>${ssrInterpolate(unref(contentStages)[row.status])}</span>`);
							_push(ssrRenderComponent(unref(ChevronRight), { size: 16 }, null, _parent));
							_push(`</button>`);
						});
						_push(`<!--]--></div>`);
					});
					_push(`<!--]-->`);
					if (!unref(loading) && !unref(error) && !unref(planned).length) {
						_push(`<div class="crm-content-empty">`);
						_push(ssrRenderComponent(unref(CalendarDays), { size: 28 }, null, _parent));
						_push(`<h2>${ssrInterpolate(unref(hasFilters) ? "Публикации не найдены" : unref(archived) ? "Архив за этот период пуст" : "Период пока свободен")}</h2><p>${ssrInterpolate(unref(hasFilters) ? "Измените условия поиска или сбросьте фильтры." : unref(unscheduled).length ? "Идеи без даты находятся рядом. Откройте идею и назначьте время публикации." : "Добавьте публикацию на нужный день или начните с идеи без даты.")}</p>`);
						if (unref(hasFilters)) _push(`<button class="crm-button">Сбросить фильтры</button>`);
						else if (unref(writable) && !unref(archived)) {
							_push(`<button class="crm-button">`);
							_push(ssrRenderComponent(unref(Plus), { size: 16 }, null, _parent));
							_push(`Запланировать публикацию</button>`);
						} else _push(`<!---->`);
						_push(`</div>`);
					} else _push(`<!---->`);
					_push(`<!--]-->`);
				}
				_push(`</section><aside class="crm-content-ideas crm-surface" aria-label="Идеи без даты"><header class="crm-content-section-heading"><div><h2>Идеи без даты <span>${ssrInterpolate(unref(unscheduled).length)}</span></h2><small>Назначьте день, когда материал будет готов</small></div>`);
				_push(ssrRenderComponent(unref(Lightbulb), { size: 20 }, null, _parent));
				_push(`</header><div class="crm-content-idea-list"><!--[-->`);
				ssrRenderList(unref(unscheduled), (row) => {
					_push(`<button class="crm-publication crm-button crm-card-action crm-item-card crm-content-idea"><small>${ssrInterpolate(unref(contentPlatforms)[row.platform])} · ${ssrInterpolate(unref(contentFormats)[row.format])}</small><strong>${ssrInterpolate(row.task.title)}</strong><span class="crm-badge"${ssrRenderAttr("data-stage", row.status)}>${ssrInterpolate(unref(contentStages)[row.status])}</span><small class="crm-content-entry-person">`);
					_push(ssrRenderComponent(unref(UserRound), { size: 14 }, null, _parent));
					_push(`${ssrInterpolate(person(row.task.assignedTo))}</small></button>`);
				});
				_push(`<!--]-->`);
				if (!unref(loading) && !unref(error) && !unref(unscheduled).length) {
					_push(`<div class="crm-content-ideas-empty">`);
					_push(ssrRenderComponent(unref(Lightbulb), { size: 26 }, null, _parent));
					_push(`<strong>${ssrInterpolate(unref(archived) ? "Нет идей в архиве" : "Место для новых идей")}</strong><p>${ssrInterpolate(unref(hasFilters) ? "По этим фильтрам идей без даты нет." : "Сохраните тему сейчас. Сценарий, материалы и дату можно добавить позже.")}</p></div>`);
				} else _push(`<!---->`);
				if (unref(writable) && !unref(archived)) {
					_push(`<button class="crm-button crm-content-add-idea">`);
					_push(ssrRenderComponent(unref(Plus), { size: 16 }, null, _parent));
					_push(`Добавить идею</button>`);
				} else _push(`<!---->`);
				_push(`</div></aside></div>`);
			}
			if (unref(items).length < unref(total)) _push(`<button${ssrIncludeBooleanAttr(unref(loading)) ? " disabled" : ""} class="crm-work-button crm-button crm-content-load-more">Показать ещё · ${ssrInterpolate(unref(total) - unref(items).length)}</button>`);
			else _push(`<!---->`);
			_push(`<p class="crm-muted crm-content-footnote">Публикации размещаются вручную. После размещения добавьте ссылку в карточку и выберите этап «Опубликовано».</p> `);
			ssrRenderTeleport(_push, (_push) => {
				if (unref(opened)) {
					_push(`<div class="crm-work-overlay admin-dialog-backdrop crm-detail-backdrop"><section class="admin-dialog admin-dialog--drawer crm-detail-card crm-content-editor" tabindex="-1" role="dialog" aria-modal="true" aria-label="Карточка публикации"><header class="crm-work-header"><div><h2>${ssrInterpolate(unref(selected)?.id ? "Публикация" : unref(selected)?.sourceId ? "Версия для другой площадки" : "Новая публикация")}</h2><p class="crm-muted">${ssrInterpolate(unref(selected)?.archivedAt ? "В архиве" : unref(selected)?.approvedAt ? "Сценарий и текст согласованы" : "Подготовка и согласование материала")}</p></div><button class="crm-icon-button crm-button crm-button--icon" aria-label="Закрыть публикацию">`);
					_push(ssrRenderComponent(unref(X), { size: 20 }, null, _parent));
					_push(`</button></header><div class="admin-dialog-body crm-detail-body">`);
					if (unref(formError)) {
						_push(`<p class="crm-work-error" role="alert">${ssrInterpolate(unref(formError))}`);
						if (unref(selected)?.id) _push(`<button class="crm-work-button crm-button">Перезагрузить карточку</button>`);
						else _push(`<!---->`);
						_push(`</p>`);
					} else _push(`<!---->`);
					_push(`<form id="crm-publication-form"><fieldset${ssrIncludeBooleanAttr(unref(busy) || !unref(writable) || !!unref(selected)?.archivedAt) ? " disabled" : ""} class="crm-content-fields"><label class="wide crm-field">Тема публикации<input class="crm-input"${ssrRenderAttr("value", unref(draft).title)} maxlength="200" required></label><label class="crm-field">Площадка<select class="crm-input"><!--[-->`);
					ssrRenderList(unref(contentPlatforms), (name, key) => {
						_push(`<option${ssrRenderAttr("value", key)}${ssrIncludeBooleanAttr(Array.isArray(unref(draft).platform) ? ssrLooseContain(unref(draft).platform, key) : ssrLooseEqual(unref(draft).platform, key)) ? " selected" : ""}>${ssrInterpolate(name)}</option>`);
					});
					_push(`<!--]--></select></label><label class="crm-field">Формат<select class="crm-input"><!--[-->`);
					ssrRenderList(unref(contentFormats), (name, key) => {
						_push(`<option${ssrRenderAttr("value", key)}${ssrIncludeBooleanAttr(Array.isArray(unref(draft).format) ? ssrLooseContain(unref(draft).format, key) : ssrLooseEqual(unref(draft).format, key)) ? " selected" : ""}>${ssrInterpolate(name)}</option>`);
					});
					_push(`<!--]--></select></label><label class="crm-field">Когда публикуем<input class="crm-input"${ssrRenderAttr("value", unref(draft).scheduledAt)} type="datetime-local"></label><label class="crm-field">Часовой пояс<input class="crm-input"${ssrRenderAttr("value", unref(draft).timezone)} placeholder="Europe/Moscow" required><small>Время выше относится к этому поясу</small></label><label class="crm-field">Ответственный<select class="crm-input" required><!--[-->`);
					ssrRenderList(unref(team), (p) => {
						_push(`<option${ssrRenderAttr("value", p.id)}${ssrIncludeBooleanAttr(Array.isArray(unref(draft).assignedToId) ? ssrLooseContain(unref(draft).assignedToId, p.id) : ssrLooseEqual(unref(draft).assignedToId, p.id)) ? " selected" : ""}>${ssrInterpolate(person(p))}</option>`);
					});
					_push(`<!--]--></select></label><label class="crm-field">Кампания / рубрика<input class="crm-input"${ssrRenderAttr("value", unref(draft).campaign)} maxlength="150" placeholder="Например, запуск новой коллекции"></label>`);
					if (unref(selected)?.id) {
						_push(`<label class="crm-field">Этап<select class="crm-input"><!--[-->`);
						ssrRenderList(unref(contentStages), (name, key) => {
							_push(`<option${ssrRenderAttr("value", key)}${ssrIncludeBooleanAttr(Array.isArray(unref(draft).status) ? ssrLooseContain(unref(draft).status, key) : ssrLooseEqual(unref(draft).status, key)) ? " selected" : ""}>${ssrInterpolate(name)}</option>`);
						});
						_push(`<!--]--></select></label>`);
					} else _push(`<!---->`);
					if (unref(selected)?.id) _push(`<label class="crm-field">Ссылка на публикацию<input class="crm-input"${ssrRenderAttr("value", unref(draft).publishedUrl)} type="url" maxlength="2048" placeholder="https://…"></label>`);
					else _push(`<!---->`);
					_push(`<label class="wide crm-field">Задача и идея<textarea class="crm-input" rows="3" maxlength="10000" placeholder="Для кого материал, что показываем и какой результат хотим получить">${ssrInterpolate(unref(draft).brief)}</textarea></label><label class="wide crm-field">Сценарий<textarea class="crm-input" rows="7" maxlength="30000" placeholder="Зацепка → сцены и реплики → демонстрация → финал. Можно указать таймкоды и что должно быть в кадре.">${ssrInterpolate(unref(draft).script)}</textarea></label><label class="wide crm-field">Текст публикации<textarea class="crm-input" rows="4" maxlength="10000">${ssrInterpolate(unref(draft).caption)}</textarea></label><label class="wide crm-field">Призыв к действию<input class="crm-input"${ssrRenderAttr("value", unref(draft).cta)} maxlength="1000" placeholder="Что зритель должен сделать после просмотра"></label></fieldset>`);
					if (unref(selected)?.approvedAt) _push(`<p class="crm-content-notice">При изменении сценария или текста потребуется повторное согласование. Перед правкой переведите материал на этап «Согласование».</p>`);
					else _push(`<!---->`);
					_push(`</form>`);
					if (unref(selected)?.id) {
						_push(`<div class="crm-content-related"><div class="crm-work-actions">`);
						if (unref(can)("crm.read")) _push(ssrRenderComponent(_component_NuxtLink, {
							class: "crm-work-button crm-button",
							to: `/crm/tasks?task=${unref(selected).taskId}`
						}, {
							default: withCtx((_, _push, _parent, _scopeId) => {
								if (_push) {
									_push(ssrRenderComponent(unref(ExternalLink), { size: 16 }, null, _parent, _scopeId));
									_push(`Задача подготовки`);
								} else return [createVNode(unref(ExternalLink), { size: 16 }), createTextVNode("Задача подготовки")];
							}),
							_: 1
						}, _parent));
						else _push(`<!---->`);
						if (unref(writable) && !unref(selected).archivedAt) {
							_push(`<button class="crm-work-button crm-button"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}>`);
							_push(ssrRenderComponent(unref(Copy), { size: 16 }, null, _parent));
							_push(`Версия для площадки</button>`);
						} else _push(`<!---->`);
						if (unref(writable)) {
							_push(`<button class="crm-work-button crm-button"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}>`);
							_push(ssrRenderComponent(unref(Archive), { size: 16 }, null, _parent));
							_push(`${ssrInterpolate(unref(selected).archivedAt ? "Восстановить" : "В архив")}</button>`);
						} else _push(`<!---->`);
						_push(`</div>`);
						_push(ssrRenderComponent(_component_CrmTaskFiles, {
							key: unref(selected).id,
							"task-id": unref(selected).taskId,
							"publication-id": unref(selected).id,
							onBusy: ($event) => attachmentBusy.value = $event,
							onChanged: attachmentsChanged
						}, null, _parent));
						_push(`<section class="crm-content-comments"><h3 class="crm-icon-heading">`);
						_push(ssrRenderComponent(unref(MessageSquare), {
							size: 18,
							"aria-hidden": "true"
						}, null, _parent));
						_push(`<span>Обсуждение и согласование</span></h3>`);
						if (unref(writable)) _push(`<div class="crm-content-comment-form"><label class="crm-field">Комментарий<textarea class="crm-input" maxlength="10000" rows="3">${ssrInterpolate(unref(comment))}</textarea></label><button class="crm-work-button crm-button"${ssrIncludeBooleanAttr(unref(busy) || !unref(comment).trim()) ? " disabled" : ""}>Отправить комментарий</button></div>`);
						else _push(`<!---->`);
						_push(`<!--[-->`);
						ssrRenderList(unref(comments), (entry) => {
							_push(`<article><header><strong>${ssrInterpolate(person(entry.author))}</strong><time>${ssrInterpolate(new Date(entry.createdAt).toLocaleString("ru-RU", { timeZone: unref(zone) }))}</time></header><p>${ssrInterpolate(entry.body)}</p></article>`);
						});
						_push(`<!--]-->`);
						if (unref(commentsMore)) _push(`<button class="crm-work-button crm-button">Предыдущие комментарии</button>`);
						else _push(`<!---->`);
						_push(`</section></div>`);
					} else _push(`<!---->`);
					_push(`</div><footer class="crm-detail-footer"><button type="button" class="crm-button"${ssrIncludeBooleanAttr(unref(busy) || unref(attachmentBusy)) ? " disabled" : ""}>Закрыть</button>`);
					if (unref(selected)?.id && unref(can)("content_plan.approve") && unref(draft).status === "REVIEW" && !unref(selected).approvedAt && !unref(selected).archivedAt) _push(`<button type="button" class="crm-button"${ssrIncludeBooleanAttr(unref(busy) || unref(attachmentBusy)) ? " disabled" : ""}>Согласовать</button>`);
					else _push(`<!---->`);
					if (unref(writable) && !unref(selected)?.archivedAt) {
						_push(`<button type="submit" form="crm-publication-form" class="crm-button crm-button--primary"${ssrIncludeBooleanAttr(unref(busy) || unref(attachmentBusy)) ? " disabled" : ""}>`);
						_push(ssrRenderComponent(unref(Check), { size: 18 }, null, _parent));
						_push(`${ssrInterpolate(unref(busy) ? "Сохраняем…" : "Сохранить")}</button>`);
					} else _push(`<!---->`);
					_push(`</footer></section></div>`);
				} else _push(`<!---->`);
			}, "body", false, _parent);
			_push(`</main>`);
		};
	}
});
// pages/crm/content-plan.vue
var _sfc_setup = content_plan_vue_vue_type_script_setup_true_lang_default.setup;
content_plan_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/crm/content-plan.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var content_plan_default = content_plan_vue_vue_type_script_setup_true_lang_default;

export { content_plan_default as default };;globalThis.__timing__.logEnd('Load chunks/build/content-plan-BcfN5RcM');
//# sourceMappingURL=content-plan-BcfN5RcM.mjs.map
