globalThis.__timing__.logStart('Load chunks/build/b2b-CAZmyvp6');import { c as useRoute, G as useRouter, L as useB2BSession, j as useState, n as navigateTo, N as NuxtLink, f as useRuntimeConfig, H as resolveProductImageUrl } from '../virtual/entry.mjs';
import { u as useCatalogDialog } from './useCatalogDialog-2pnsnnsL.mjs';
import { u as useContextMenu } from './useContextMenu-CQeSn2KJ.mjs';
import { u as useWorkspaceOperation } from './useWorkspaceOperation-DZ4fBozi.mjs';
import { defineComponent, ref, reactive, computed, watch, mergeProps, unref, withCtx, createTextVNode, createVNode, toDisplayString, openBlock, createBlock, createCommentVNode, useSSRContext } from 'vue';
import { onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router';
import { ssrRenderAttrs, ssrInterpolate, ssrIncludeBooleanAttr, ssrRenderComponent, ssrRenderAttr, ssrRenderList, ssrRenderClass, ssrLooseContain, ssrLooseEqual, ssrRenderStyle, ssrRenderTeleport, ssrRenderDynamicModel } from 'vue/server-renderer';
import { RefreshCw, UserPlus, Plus, ShoppingBag, CircleAlert, ChevronLeft, ChevronRight, X, ArrowRight, Clock3, CalendarDays, Globe, Users, Scissors, Search, Pencil, Save, Copy, ExternalLink, Code, PackageSearch, CircleHelp, Settings, Package, Minus, Trash2, ChevronDown, Repeat2, ShieldCheck, UserRound, History, ImagePlus } from '@lucide/vue';
import { a as customerWarehouseLabel, b as customerWarehouseAsOf } from '../_/customer-warehouse-status.mjs';
import { a as salonDay, b as salonCalendarPeriod, c as salonInstant, d as salonMinute, e as salonMonthDays, s as shiftSalonDay } from '../_/salon-calendar.mjs';
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

function salonMasterAvailable(member) {
  var _a, _b;
  return Boolean(member && member.isActive !== false && ["OWNER", "EMPLOYEE"].includes(member.role) && ((_a = member.user) == null ? void 0 : _a.isActive) !== false && (!((_b = member.user) == null ? void 0 : _b.role) || member.user.role === "CUSTOMER_B2B"));
}

function confirmedOneCAvailable(variant) {
  const value = variant == null ? void 0 : variant.available;
  return (variant == null ? void 0 : variant.availabilityStatus) === "CURRENT" && typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}
function confirmedAvailabilityLabel(variant) {
  const value = confirmedOneCAvailable(variant);
  return value === null ? "\u041E\u0441\u0442\u0430\u0442\u043A\u0438 1\u0421 \u0443\u0442\u043E\u0447\u043D\u044F\u044E\u0442\u0441\u044F" : value > 0 ? `\u0412 \u043D\u0430\u043B\u0438\u0447\u0438\u0438: ${value} \u0448\u0442.` : "\u041D\u0435\u0442 \u0432 \u043D\u0430\u043B\u0438\u0447\u0438\u0438";
}
function cartAvailabilityProblem(lines) {
  var _a, _b;
  for (const line of lines) {
    const available = confirmedOneCAvailable(line.variant);
    const name = ((_a = line.product) == null ? void 0 : _a.nameRu) || ((_b = line.variant) == null ? void 0 : _b.name) || "\u041F\u043E\u0437\u0438\u0446\u0438\u044F \u0437\u0430\u043A\u0430\u0437\u0430";
    if (available === null) return `${name}: \u043E\u0441\u0442\u0430\u0442\u043A\u0438 1\u0421 \u0443\u0442\u043E\u0447\u043D\u044F\u044E\u0442\u0441\u044F. \u0414\u043E\u0436\u0434\u0438\u0442\u0435\u0441\u044C \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u044F \u043D\u0430\u043B\u0438\u0447\u0438\u044F \u0438\u043B\u0438 \u0443\u0431\u0435\u0440\u0438\u0442\u0435 \u043F\u043E\u0437\u0438\u0446\u0438\u044E \u0438\u0437 \u0437\u0430\u043A\u0430\u0437\u0430.`;
    if (!Number.isSafeInteger(line.quantity) || line.quantity < 1 || line.quantity > available) return `${name}: \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u043E \u0432 \u043D\u0430\u043B\u0438\u0447\u0438\u0438 ${available} \u0448\u0442. \u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u043A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E \u0432 \u043A\u043E\u0440\u0437\u0438\u043D\u0435.`;
  }
  return "";
}

// composables/useBusinessWorkspace.ts
var purchasingSections = /* @__PURE__ */ new Set([
	"purchases",
	"catalog",
	"orders"
]);
function useBusinessWorkspace() {
	const route = useRoute();
	const canUseSalon = useState("business-can-use-salon", () => true);
	const section = computed(() => String(route.query.section || "dashboard"));
	const area = computed(() => !canUseSalon.value ? "purchases" : purchasingSections.has(section.value) ? "purchases" : [
		"dashboard",
		"calendar",
		"clients",
		"services",
		"online-booking"
	].includes(section.value) ? "salon" : route.query.area === "purchases" ? "purchases" : "salon");
	const label = computed(() => area.value === "salon" ? "Мой салон" : "Закупки SARKISIAN");
	const path = (id) => id === "dashboard" ? "/b2b" : `/b2b?section=${id}${[
		"team",
		"support",
		"settings"
	].includes(id) ? `&area=${area.value}` : ""}`;
	async function switchArea(event) {
		const value = event.target.value;
		await navigateTo(value === "purchases" ? "/b2b?section=purchases" : "/b2b");
		event.target.value = area.value;
	}
	return {
		area,
		section,
		label,
		path,
		switchArea,
		canUseSalon
	};
}
// components/SalonOrganizationCard.vue?vue&type=script&setup=true&lang.ts
var SalonOrganizationCard_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "SalonOrganizationCard",
	__ssrInlineRender: true,
	props: {
		profile: {},
		formatPrice: { type: Function }
	},
	setup(__props) {
		const { path } = useBusinessWorkspace();
		const statuses = {
			ACTIVE: "Активна",
			PROSPECT: "На проверке",
			ON_HOLD: "Приостановлена",
			ARCHIVED: "В архиве",
			PENDING: "На проверке",
			NEW: "На проверке",
			SUSPENDED: "Приостановлена",
			BLOCKED: "Заблокирована"
		};
		return (_ctx, _push, _parent, _attrs) => {
			const _component_NuxtLink = NuxtLink;
			_push(`<article${ssrRenderAttrs(mergeProps({
				class: "salon-organization",
				"aria-label": "Ваша организация"
			}, _attrs))}><div class="salon-organization-main"><small>Ваша организация</small><h2>${ssrInterpolate(__props.profile.name)}</h2><p><span>ИНН ${ssrInterpolate(__props.profile.inn || "не указан")}</span><span>${ssrInterpolate(__props.profile.legalAddress || "Адрес не указан")}</span></p>`);
			_push(ssrRenderComponent(_component_NuxtLink, { to: unref(path)("team") }, {
				default: withCtx((_, _push, _parent, _scopeId) => {
					if (_push) _push(`Команда и доступы <span aria-hidden="true"${_scopeId}>→</span>`);
					else return [createTextVNode("Команда и доступы "), createVNode("span", { "aria-hidden": "true" }, "→")];
				}),
				_: 1
			}, _parent));
			_push(`</div><div class="salon-organization-details"><span class="${ssrRenderClass([{ "is-active": __props.profile.status === "ACTIVE" }, "salon-organization-status"])}">${ssrInterpolate(statuses[__props.profile.status] || "Статус не указан")}</span>`);
			if (__props.profile.membership?.canSeeFinance) _push(`<div class="salon-organization-finance"><div><small>Уровень скидки</small><strong>${ssrInterpolate(__props.profile.discountTier === null ? "—" : `${__props.profile.discountTier || 0}%`)}</strong></div><div><small>Лимит закупок</small><strong>${ssrInterpolate(__props.formatPrice(__props.profile.creditLimit))}</strong></div></div>`);
			else _push(`<!---->`);
			_push(`</div></article>`);
		};
	}
});
// components/SalonOrganizationCard.vue
var _sfc_setup$14 = SalonOrganizationCard_vue_vue_type_script_setup_true_lang_default.setup;
SalonOrganizationCard_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/SalonOrganizationCard.vue");
	return _sfc_setup$14 ? _sfc_setup$14(props, ctx) : void 0;
};
var SalonOrganizationCard_default = Object.assign(SalonOrganizationCard_vue_vue_type_script_setup_true_lang_default, { __name: "SalonOrganizationCard" });
// components/SalonDashboard.vue?vue&type=script&setup=true&lang.ts
var SalonDashboard_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "SalonDashboard",
	__ssrInlineRender: true,
	props: {
		dashboard: {},
		profile: {}
	},
	setup(__props) {
		const props = __props;
		const canSeeFinance = computed(() => Boolean(props.profile.membership?.canSeeFinance));
		const date = (value) => new Date(value).toLocaleString("ru-RU", {
			timeZone: props.dashboard.timeZone || "Europe/Moscow",
			day: "numeric",
			month: "short",
			hour: "2-digit",
			minute: "2-digit"
		});
		const money = (value) => value === null ? "Недоступно" : new Intl.NumberFormat("ru-RU", {
			style: "currency",
			currency: "RUB",
			maximumFractionDigits: 2
		}).format(Number(value || 0));
		const duration = (booking) => booking.endTime ? Math.round((Date.parse(booking.endTime) - Date.parse(booking.startTime)) / 6e4) : booking.service.duration;
		const master = (booking) => [booking.masterMember?.user?.firstName, booking.masterMember?.user?.lastName].filter(Boolean).join(" ");
		return (_ctx, _push, _parent, _attrs) => {
			const _component_NuxtLink = NuxtLink;
			const _component_SalonOrganizationCard = SalonOrganizationCard_default;
			_push(`<section${ssrRenderAttrs(mergeProps({ class: "salon-overview business-workspace-overview" }, _attrs))}><div class="business-overview-metrics" aria-label="Показатели салона"><article><span>Записи сегодня</span><strong>${ssrInterpolate(__props.dashboard.bookingsToday || 0)}</strong><small>В расписании салона</small></article><article><span>Будущие записи</span><strong>${ssrInterpolate(__props.dashboard.upcoming || 0)}</strong><small>На следующие дни</small></article><article><span>Клиенты салона</span><strong>${ssrInterpolate(__props.dashboard.clients || 0)}</strong><small>В вашей клиентской базе</small></article>`);
			if (unref(canSeeFinance)) _push(`<article><span>Выручка за месяц</span><strong>${ssrInterpolate(money(__props.dashboard.serviceRevenueMonth))}</strong><small>По завершённым визитам</small></article>`);
			else _push(`<!---->`);
			_push(`</div><div class="business-overview-columns"><article class="salon-settings-panel business-upcoming-panel"><header class="salon-overview-heading"><div><h2>Ближайшие записи</h2><p>Клиенты, которых ждёте в салоне</p></div>`);
			_push(ssrRenderComponent(_component_NuxtLink, {
				to: "/b2b?section=calendar",
				class: "business-section-link",
				"aria-label": "Открыть календарь"
			}, {
				default: withCtx((_, _push, _parent, _scopeId) => {
					if (_push) {
						_push(`<span${_scopeId}>Календарь</span>`);
						_push(ssrRenderComponent(unref(ArrowRight), { size: 16 }, null, _parent, _scopeId));
					} else return [createVNode("span", null, "Календарь"), createVNode(unref(ArrowRight), { size: 16 })];
				}),
				_: 1
			}, _parent));
			_push(`</header>`);
			if (__props.dashboard.nextBookings?.length) {
				_push(`<ol class="business-upcoming-list"><!--[-->`);
				ssrRenderList(__props.dashboard.nextBookings, (booking) => {
					_push(`<li class="salon-overview-visit"><time${ssrRenderAttr("datetime", booking.startTime)}>${ssrInterpolate(date(booking.startTime))}</time><span><strong>${ssrInterpolate(booking.client.firstName)} ${ssrInterpolate(booking.client.lastName)}</strong><small>${ssrInterpolate(booking.service.name)}</small>`);
					if (master(booking)) _push(`<small>Мастер: ${ssrInterpolate(master(booking))}</small>`);
					else _push(`<!---->`);
					_push(`</span><span class="business-visit-duration">`);
					_push(ssrRenderComponent(unref(Clock3), { size: 14 }, null, _parent));
					_push(`${ssrInterpolate(duration(booking))} мин.</span></li>`);
				});
				_push(`<!--]--></ol>`);
			} else {
				_push(`<div class="business-dashboard-empty">`);
				_push(ssrRenderComponent(unref(CalendarDays), { size: 30 }, null, _parent));
				_push(`<h3>В расписании пока свободно</h3><p>Создайте запись в календаре или откройте онлайн-запись для клиентов.</p>`);
				_push(ssrRenderComponent(_component_NuxtLink, { to: "/b2b?section=calendar" }, {
					default: withCtx((_, _push, _parent, _scopeId) => {
						if (_push) {
							_push(`Открыть календарь`);
							_push(ssrRenderComponent(unref(ArrowRight), { size: 16 }, null, _parent, _scopeId));
						} else return [createTextVNode("Открыть календарь"), createVNode(unref(ArrowRight), { size: 16 })];
					}),
					_: 1
				}, _parent));
				_push(`</div>`);
			}
			_push(`</article><section class="business-overview-shortcuts" aria-label="Работа с салоном">`);
			_push(ssrRenderComponent(_component_NuxtLink, {
				to: "/b2b?section=online-booking",
				class: "business-shortcut"
			}, {
				default: withCtx((_, _push, _parent, _scopeId) => {
					if (_push) {
						_push(ssrRenderComponent(unref(Globe), { size: 21 }, null, _parent, _scopeId));
						_push(`<span${_scopeId}><strong${_scopeId}>Онлайн-запись</strong><small${_scopeId}>Страница, виджет и доступные часы</small></span>`);
						_push(ssrRenderComponent(unref(ArrowRight), { size: 17 }, null, _parent, _scopeId));
					} else return [
						createVNode(unref(Globe), { size: 21 }),
						createVNode("span", null, [createVNode("strong", null, "Онлайн-запись"), createVNode("small", null, "Страница, виджет и доступные часы")]),
						createVNode(unref(ArrowRight), { size: 17 })
					];
				}),
				_: 1
			}, _parent));
			_push(ssrRenderComponent(_component_NuxtLink, {
				to: "/b2b?section=clients",
				class: "business-shortcut"
			}, {
				default: withCtx((_, _push, _parent, _scopeId) => {
					if (_push) {
						_push(ssrRenderComponent(unref(Users), { size: 21 }, null, _parent, _scopeId));
						_push(`<span${_scopeId}><strong${_scopeId}>Ваши клиенты</strong><small${_scopeId}>Контакты и история посещений</small></span>`);
						_push(ssrRenderComponent(unref(ArrowRight), { size: 17 }, null, _parent, _scopeId));
					} else return [
						createVNode(unref(Users), { size: 21 }),
						createVNode("span", null, [createVNode("strong", null, "Ваши клиенты"), createVNode("small", null, "Контакты и история посещений")]),
						createVNode(unref(ArrowRight), { size: 17 })
					];
				}),
				_: 1
			}, _parent));
			_push(ssrRenderComponent(_component_NuxtLink, {
				to: "/b2b?section=services",
				class: "business-shortcut"
			}, {
				default: withCtx((_, _push, _parent, _scopeId) => {
					if (_push) {
						_push(ssrRenderComponent(unref(Scissors), { size: 21 }, null, _parent, _scopeId));
						_push(`<span${_scopeId}><strong${_scopeId}>Услуги и цены</strong><small${_scopeId}>Прайс, длительность и доступность</small></span>`);
						_push(ssrRenderComponent(unref(ArrowRight), { size: 17 }, null, _parent, _scopeId));
					} else return [
						createVNode(unref(Scissors), { size: 21 }),
						createVNode("span", null, [createVNode("strong", null, "Услуги и цены"), createVNode("small", null, "Прайс, длительность и доступность")]),
						createVNode(unref(ArrowRight), { size: 17 })
					];
				}),
				_: 1
			}, _parent));
			_push(`</section></div>`);
			_push(ssrRenderComponent(_component_SalonOrganizationCard, {
				profile: __props.profile,
				"format-price": money
			}, null, _parent));
			_push(`</section>`);
		};
	}
});
// components/SalonDashboard.vue
var _sfc_setup$13 = SalonDashboard_vue_vue_type_script_setup_true_lang_default.setup;
SalonDashboard_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/SalonDashboard.vue");
	return _sfc_setup$13 ? _sfc_setup$13(props, ctx) : void 0;
};
var SalonDashboard_default = Object.assign(SalonDashboard_vue_vue_type_script_setup_true_lang_default, { __name: "SalonDashboard" });
// components/SalonClients.vue?vue&type=script&setup=true&lang.ts
var SalonClients_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "SalonClients",
	__ssrInlineRender: true,
	props: {
		clients: {},
		canSeeFinance: { type: Boolean },
		formatPrice: { type: Function }
	},
	emits: ["edit", "context"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const query = ref(""), tag = ref(""), sort = ref("recent"), page = ref(1);
		const tags = computed(() => [...new Set(props.clients.flatMap((item) => item.tags || []))].sort((a, b) => a.localeCompare(b, "ru")));
		const name = (item) => [item.firstName, item.lastName].filter(Boolean).join(" ") || "Клиент";
		const phone = (value) => value.replace(/[^+\d]/g, "");
		const filtered = computed(() => {
			const needle = query.value.trim().toLocaleLowerCase("ru-RU"), digits = needle.replace(/\D/g, "");
			return props.clients.filter((item) => (!tag.value || item.tags?.includes(tag.value)) && (!needle || `${name(item)} ${item.phone || ""} ${item.email || ""} ${(item.tags || []).join(" ")}`.toLocaleLowerCase("ru-RU").includes(needle) || digits.length >= 3 && Boolean(item.phone?.replace(/\D/g, "").includes(digits)))).sort((a, b) => {
				if (sort.value === "name") return name(a).localeCompare(name(b), "ru");
				if (sort.value === "visits") return (b.totalVisits || 0) - (a.totalVisits || 0) || name(a).localeCompare(name(b), "ru");
				return (b.lastVisitAt ? Date.parse(b.lastVisitAt) : 0) - (a.lastVisitAt ? Date.parse(a.lastVisitAt) : 0) || name(a).localeCompare(name(b), "ru");
			});
		});
		const hasFilters = computed(() => Boolean(query.value.trim() || tag.value));
		const pageCount = computed(() => Math.max(1, Math.ceil(filtered.value.length / 25)));
		const visible = computed(() => filtered.value.slice((page.value - 1) * 25, page.value * 25));
		watch([
			query,
			tag,
			sort
		], () => {
			page.value = 1;
		});
		watch(pageCount, (value) => {
			page.value = Math.min(page.value, value);
		});
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<section${ssrRenderAttrs(mergeProps({
				class: "salon-services-panel salon-clients-panel business-register-panel",
				"aria-label": "Клиенты салона"
			}, _attrs))}><div class="salon-services-filters"><label class="salon-services-search">`);
			_push(ssrRenderComponent(unref(Search), { size: 18 }, null, _parent));
			_push(`<input${ssrRenderAttr("value", unref(query))} type="search" placeholder="Имя, телефон или email" aria-label="Поиск клиентов">`);
			if (unref(query)) {
				_push(`<button type="button" aria-label="Очистить поиск клиентов">`);
				_push(ssrRenderComponent(unref(X), { size: 16 }, null, _parent));
				_push(`</button>`);
			} else _push(`<!---->`);
			_push(`</label><select aria-label="Тег клиента"><option value=""${ssrIncludeBooleanAttr(Array.isArray(unref(tag)) ? ssrLooseContain(unref(tag), "") : ssrLooseEqual(unref(tag), "")) ? " selected" : ""}>Все теги</option><!--[-->`);
			ssrRenderList(unref(tags), (value) => {
				_push(`<option${ssrRenderAttr("value", value)}${ssrIncludeBooleanAttr(Array.isArray(unref(tag)) ? ssrLooseContain(unref(tag), value) : ssrLooseEqual(unref(tag), value)) ? " selected" : ""}>${ssrInterpolate(value)}</option>`);
			});
			_push(`<!--]--></select><select aria-label="Сортировка клиентов"><option value="recent"${ssrIncludeBooleanAttr(Array.isArray(unref(sort)) ? ssrLooseContain(unref(sort), "recent") : ssrLooseEqual(unref(sort), "recent")) ? " selected" : ""}>Последние визиты</option><option value="name"${ssrIncludeBooleanAttr(Array.isArray(unref(sort)) ? ssrLooseContain(unref(sort), "name") : ssrLooseEqual(unref(sort), "name")) ? " selected" : ""}>По имени</option><option value="visits"${ssrIncludeBooleanAttr(Array.isArray(unref(sort)) ? ssrLooseContain(unref(sort), "visits") : ssrLooseEqual(unref(sort), "visits")) ? " selected" : ""}>Частые гости</option></select></div><div class="business-results-summary"><span role="status" aria-live="polite">${ssrInterpolate(unref(hasFilters) ? `Найдено: ${unref(filtered).length} из ${__props.clients.length}` : `Всего клиентов: ${__props.clients.length}`)}</span>`);
			if (unref(hasFilters)) {
				_push(`<button type="button" class="business-text-control">Сбросить фильтры`);
				_push(ssrRenderComponent(unref(X), { size: 14 }, null, _parent));
				_push(`</button>`);
			} else _push(`<!---->`);
			_push(`</div>`);
			if (unref(filtered).length) {
				_push(`<table class="salon-services-table salon-clients-table" aria-label="Список клиентов"><thead><tr><th scope="col">Клиент</th><th scope="col">Контакты</th><th scope="col">Последний визит</th><th scope="col">Посещения</th>`);
				if (__props.canSeeFinance) _push(`<th scope="col" class="business-money-heading">Сумма услуг</th>`);
				else _push(`<!---->`);
				_push(`<th scope="col"><span class="salon-services-sr-only">Действия</span></th></tr></thead><tbody><!--[-->`);
				ssrRenderList(unref(visible), (item) => {
					_push(`<tr class="salon-service-row salon-client-row"><th scope="row" class="salon-service-info salon-client-info"><div><span class="salon-person-avatar" aria-hidden="true">${ssrInterpolate(name(item).slice(0, 1).toUpperCase())}</span><div><button type="button" class="b2b-edit-link">${ssrInterpolate(name(item))}</button>`);
					if (item.tags?.length) {
						_push(`<div class="salon-client-tags"><!--[-->`);
						ssrRenderList(item.tags, (value) => {
							_push(`<small>${ssrInterpolate(value)}</small>`);
						});
						_push(`<!--]--></div>`);
					} else _push(`<!---->`);
					_push(`</div></div></th><td class="salon-person-contacts">`);
					if (item.phone) _push(`<a${ssrRenderAttr("href", `tel:${phone(item.phone)}`)}>${ssrInterpolate(item.phone)}</a>`);
					else _push(`<!---->`);
					if (item.email) _push(`<a${ssrRenderAttr("href", `mailto:${item.email}`)}>${ssrInterpolate(item.email)}</a>`);
					else _push(`<!---->`);
					if (!item.phone && !item.email) _push(`<small>Не указаны</small>`);
					else _push(`<!---->`);
					_push(`</td><td class="salon-client-visit" data-label="Последний визит">${ssrInterpolate(item.lastVisitAt ? new Date(item.lastVisitAt).toLocaleDateString("ru-RU") : "Ещё не был")}</td><td class="salon-client-visits" data-label="Посещения">${ssrInterpolate(item.totalVisits || 0)}</td>`);
					if (__props.canSeeFinance) _push(`<td class="salon-client-spent" data-label="Сумма услуг"><strong>${ssrInterpolate(__props.formatPrice(item.totalSpent))}</strong></td>`);
					else _push(`<!---->`);
					_push(`<td class="salon-service-actions"><button type="button"${ssrRenderAttr("aria-label", `Редактировать ${name(item)}`)}${ssrRenderAttr("title", `Редактировать ${name(item)}`)}>`);
					_push(ssrRenderComponent(unref(Pencil), { size: 17 }, null, _parent));
					_push(`</button></td></tr>`);
				});
				_push(`<!--]--></tbody></table>`);
			} else {
				_push(`<div class="salon-services-empty">`);
				_push(ssrRenderComponent(unref(Users), { size: 24 }, null, _parent));
				_push(`<h3>${ssrInterpolate(__props.clients.length ? "Ничего не найдено" : "Клиентов пока нет")}</h3><p>${ssrInterpolate(__props.clients.length ? "Измените запрос или выбранный тег." : "Добавьте первого клиента кнопкой «Новый клиент» вверху страницы.")}</p>`);
				if (unref(hasFilters)) _push(`<button type="button">Сбросить фильтры</button>`);
				else _push(`<!---->`);
				_push(`</div>`);
			}
			if (unref(pageCount) > 1) {
				_push(`<footer class="salon-services-total"><small>Показаны ${ssrInterpolate((unref(page) - 1) * 25 + 1)}–${ssrInterpolate(Math.min(unref(page) * 25, unref(filtered).length))} из ${ssrInterpolate(unref(filtered).length)}</small><nav class="business-pagination" aria-label="Страницы клиентов"><button type="button"${ssrIncludeBooleanAttr(unref(page) === 1) ? " disabled" : ""} aria-label="Предыдущая страница клиентов">`);
				_push(ssrRenderComponent(unref(ChevronLeft), { size: 17 }, null, _parent));
				_push(`</button><span aria-live="polite">${ssrInterpolate(unref(page))} из ${ssrInterpolate(unref(pageCount))}</span><button type="button"${ssrIncludeBooleanAttr(unref(page) === unref(pageCount)) ? " disabled" : ""} aria-label="Следующая страница клиентов">`);
				_push(ssrRenderComponent(unref(ChevronRight), { size: 17 }, null, _parent));
				_push(`</button></nav></footer>`);
			} else _push(`<!---->`);
			_push(`</section>`);
		};
	}
});
// components/SalonClients.vue
var _sfc_setup$12 = SalonClients_vue_vue_type_script_setup_true_lang_default.setup;
SalonClients_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/SalonClients.vue");
	return _sfc_setup$12 ? _sfc_setup$12(props, ctx) : void 0;
};
var SalonClients_default = Object.assign(SalonClients_vue_vue_type_script_setup_true_lang_default, { __name: "SalonClients" });
// components/SalonCalendar.vue?vue&type=script&setup=true&lang.ts
var SalonCalendar_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "SalonCalendar",
	__ssrInlineRender: true,
	props: {
		bookings: {},
		members: {},
		day: {},
		mode: {},
		timeZone: {},
		busy: { type: Boolean },
		settings: {}
	},
	emits: [
		"create",
		"edit",
		"move",
		"selectDay"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const master = ref("");
		const status = ref("");
		const moving = ref(null);
		const statuses = {
			NEW: "Новая",
			CONFIRMED: "Подтверждена",
			COMPLETED: "Завершена",
			CANCELLED: "Отменена",
			NO_SHOW: "Не пришёл"
		};
		const filtered = computed(() => props.bookings.filter((b) => (!master.value || b.masterMemberId === master.value) && (!status.value || b.status === status.value)).sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime)));
		const monthDays = computed(() => salonMonthDays(props.day));
		const weekStart = computed(() => salonCalendarPeriod(props.day, "week").fromDay);
		const today = computed(() => salonDay(/* @__PURE__ */ new Date(), props.timeZone));
		const dayLabel = (day) => (/* @__PURE__ */ new Date(`${day}T12:00:00Z`)).toLocaleDateString("ru-RU", {
			timeZone: "UTC",
			day: "numeric",
			month: "long"
		});
		const monthVisits = (day) => filtered.value.filter((b) => salonDay(new Date(b.startTime), props.timeZone) === day);
		const name = (member) => [member.user?.firstName, member.user?.lastName].filter(Boolean).join(" ") || "Сотрудник";
		const calendarMembers = computed(() => {
			const result = new Map(props.members.filter(salonMasterAvailable).map((member) => [member.id, member]));
			for (const booking of props.bookings) if (booking.masterMemberId && !result.has(booking.masterMemberId)) {
				const member = props.members.find((item) => item.id === booking.masterMemberId) || booking.masterMember || {
					id: booking.masterMemberId,
					user: {}
				};
				result.set(booking.masterMemberId, member);
			}
			return [...result.values()];
		});
		const masterName = (member) => name(member) + (salonMasterAvailable(member) ? "" : " · недоступен");
		function fragment(b, day) {
			const startDay = salonDay(new Date(b.startTime), props.timeZone), endDay = salonDay(new Date(b.endTime), props.timeZone);
			const from = startDay < day ? 0 : salonMinute(b.startTime, props.timeZone), to = endDay > day ? 1440 : salonMinute(b.endTime, props.timeZone);
			return startDay <= day && endDay >= day && to > from ? {
				from,
				to
			} : null;
		}
		const hours = computed(() => {
			const visits = props.bookings.filter((b) => !["CANCELLED", "NO_SHOW"].includes(b.status));
			const days = props.mode === "week" ? Array.from({ length: 7 }, (_, i) => shiftSalonDay(weekStart.value, i)) : [props.day];
			const pieces = visits.flatMap((b) => days.map((day) => fragment(b, day)).filter(Boolean));
			const workdays = days.flatMap((day) => {
				const weekday = (/* @__PURE__ */ new Date(`${day}T12:00:00Z`)).getUTCDay();
				if (!props.settings?.workingDays?.includes(weekday)) return [];
				const schedule = props.settings.weeklySchedule?.find((row) => row.day === weekday) || props.settings;
				return [{
					from: schedule.startMinute,
					to: schedule.endMinute
				}];
			});
			return {
				from: Math.min(8, ...[...pieces, ...workdays].map((p) => Math.floor(p.from / 60))),
				to: Math.min(24, Math.max(22, ...[...pieces, ...workdays].map((p) => Math.ceil(p.to / 60))))
			};
		});
		const slots = computed(() => Array.from({ length: (hours.value.to - hours.value.from) * 4 }, (_, i) => hours.value.from * 60 + i * 15));
		const columns = computed(() => props.mode === "week" ? Array.from({ length: 7 }, (_, i) => ({
			id: shiftSalonDay(weekStart.value, i),
			day: shiftSalonDay(weekStart.value, i),
			master: master.value,
			label: (/* @__PURE__ */ new Date(`${shiftSalonDay(weekStart.value, i)}T12:00:00Z`)).toLocaleDateString("ru-RU", {
				weekday: "short",
				day: "numeric",
				month: "short",
				timeZone: "UTC"
			})
		})) : [...calendarMembers.value.filter((m) => !master.value || m.id === master.value).map((m) => ({
			id: m.id,
			day: props.day,
			master: m.id,
			label: masterName(m)
		})), ...!master.value ? [{
			id: "unassigned",
			day: props.day,
			master: "",
			label: "Без мастера"
		}] : []]);
		const visible = (column) => filtered.value.filter((b) => (status.value || !["CANCELLED", "NO_SHOW"].includes(b.status)) && fragment(b, column.day) && (props.mode === "week" || (b.masterMemberId || "") === column.master));
		const position = (b, day) => {
			const piece = fragment(b, day);
			const lanes = props.mode === "week" && !master.value ? [...new Set(filtered.value.filter((x) => fragment(x, day) && (status.value || !["CANCELLED", "NO_SHOW"].includes(x.status))).map((x) => x.masterMemberId || ""))] : [b.masterMemberId || ""];
			return {
				"--visit-top": `${(piece.from - hours.value.from * 60) * 1.6}px`,
				"--visit-height": `${Math.max(15, piece.to - piece.from) * 1.6}px`,
				"--visit-color": b.service?.color,
				"--visit-left": `${lanes.indexOf(b.masterMemberId || "") * 100 / lanes.length}%`,
				"--visit-width": `${100 / lanes.length}%`
			};
		};
		const time = (minute) => `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
		function unavailable(column, minute, duration = 15) {
			const target = props.mode === "week" && !master.value && moving.value ? moving.value.masterMemberId : column.master;
			if (target && !props.members.some((member) => member.id === target && salonMasterAvailable(member))) return "Мастер недоступен";
			if (!props.settings?.workingDays) return "";
			const day = (/* @__PURE__ */ new Date(`${column.day}T12:00:00Z`)).getUTCDay();
			if (!props.settings.workingDays.includes(day)) return "Выходной";
			const row = props.settings.weeklySchedule?.find((d) => d.day === day) || props.settings;
			if (minute < row.startMinute || minute + duration > row.endMinute) return "Вне рабочего времени";
			if (row.breaks?.some((b) => minute < b.endMinute && minute + duration > b.startMinute)) return "Перерыв";
			return "";
		}
		const past = (column, minute) => {
			const date = salonInstant(column.day, minute, props.timeZone);
			return !date || date.getTime() < Date.now();
		};
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<section${ssrRenderAttrs(mergeProps({
				class: "salon-calendar",
				"aria-label": "Календарь записи"
			}, _attrs))}><div class="salon-calendar-filter"><label>Мастер<select aria-label="Фильтр мастера"><option value=""${ssrIncludeBooleanAttr(Array.isArray(unref(master)) ? ssrLooseContain(unref(master), "") : ssrLooseEqual(unref(master), "")) ? " selected" : ""}>Все мастера</option><!--[-->`);
			ssrRenderList(unref(calendarMembers), (member) => {
				_push(`<option${ssrRenderAttr("value", member.id)}${ssrIncludeBooleanAttr(Array.isArray(unref(master)) ? ssrLooseContain(unref(master), member.id) : ssrLooseEqual(unref(master), member.id)) ? " selected" : ""}>${ssrInterpolate(masterName(member))}</option>`);
			});
			_push(`<!--]--></select></label><label>Статус<select aria-label="Фильтр статуса записи"><option value=""${ssrIncludeBooleanAttr(Array.isArray(unref(status)) ? ssrLooseContain(unref(status), "") : ssrLooseEqual(unref(status), "")) ? " selected" : ""}>Все статусы</option><!--[-->`);
			ssrRenderList(statuses, (label, key) => {
				_push(`<option${ssrRenderAttr("value", key)}${ssrIncludeBooleanAttr(Array.isArray(unref(status)) ? ssrLooseContain(unref(status), key) : ssrLooseEqual(unref(status), key)) ? " selected" : ""}>${ssrInterpolate(label)}</option>`);
			});
			_push(`<!--]--></select></label><small>Время салона: ${ssrInterpolate(__props.timeZone)} · шаг 15 минут</small></div>`);
			if (__props.mode === "list") {
				_push(`<div class="salon-agenda"><!--[-->`);
				ssrRenderList(unref(filtered), (booking) => {
					_push(`<button type="button"${ssrIncludeBooleanAttr(__props.busy) ? " disabled" : ""}><time>${ssrInterpolate(new Date(booking.startTime).toLocaleString("ru-RU", {
						timeZone: __props.timeZone,
						day: "numeric",
						month: "short",
						hour: "2-digit",
						minute: "2-digit"
					}))}</time><span><strong>${ssrInterpolate(booking.client.firstName)} ${ssrInterpolate(booking.client.lastName)}</strong><small>${ssrInterpolate(booking.service.name)}</small></span><span>${ssrInterpolate(statuses[booking.status])}</span></button>`);
				});
				_push(`<!--]-->`);
				if (!unref(filtered).length) _push(`<p>Записей за этот период нет.</p>`);
				else _push(`<!---->`);
				_push(`</div>`);
			} else if (__props.mode === "month") {
				_push(`<div class="salon-month-scroll" tabindex="0" aria-label="Месяц: календарь записей, прокрутка по горизонтали"><div class="salon-month-grid"><!--[-->`);
				ssrRenderList([
					"Пн",
					"Вт",
					"Ср",
					"Чт",
					"Пт",
					"Сб",
					"Вс"
				], (weekday) => {
					_push(`<div class="salon-month-weekday">${ssrInterpolate(weekday)}</div>`);
				});
				_push(`<!--]--><!--[-->`);
				ssrRenderList(unref(monthDays), (date) => {
					_push(`<section class="${ssrRenderClass([{
						"is-outside": date.slice(0, 7) !== __props.day.slice(0, 7),
						"is-today": date === unref(today)
					}, "salon-month-day"])}"${ssrRenderAttr("aria-label", dayLabel(date))}><button type="button" class="salon-month-date"${ssrIncludeBooleanAttr(__props.busy) ? " disabled" : ""}${ssrRenderAttr("aria-label", `Открыть день ${dayLabel(date)}`)}${ssrRenderAttr("aria-current", date === unref(today) ? "date" : void 0)}>${ssrInterpolate(Number(date.slice(-2)))}</button><!--[-->`);
					ssrRenderList(monthVisits(date).slice(0, 3), (booking) => {
						_push(`<button type="button"${ssrIncludeBooleanAttr(__props.busy) ? " disabled" : ""} class="${ssrRenderClass([`is-${booking.status.toLowerCase()}`, "salon-month-visit"])}"${ssrRenderAttr("title", `${booking.client.firstName} ${booking.client.lastName || ""} · ${booking.service.name} · ${statuses[booking.status]}`)}><time>${ssrInterpolate(time(unref(salonMinute)(booking.startTime, __props.timeZone)))}</time><span>${ssrInterpolate(booking.client.firstName)} ${ssrInterpolate(booking.client.lastName)}</span></button>`);
					});
					_push(`<!--]-->`);
					if (monthVisits(date).length > 3) _push(`<button class="salon-month-more" type="button"${ssrIncludeBooleanAttr(__props.busy) ? " disabled" : ""}>Ещё ${ssrInterpolate(monthVisits(date).length - 3)}</button>`);
					else _push(`<!---->`);
					_push(`</section>`);
				});
				_push(`<!--]--></div></div>`);
			} else {
				_push(`<div class="salon-calendar-scroll" tabindex="0" aria-label="Расписание по времени, прокрутка по горизонтали"><div class="salon-calendar-grid" style="${ssrRenderStyle({
					"--calendar-columns": unref(columns).length,
					"--calendar-height": `${(unref(hours).to - unref(hours).from) * 96}px`
				})}"><div class="salon-calendar-corner">Время</div><!--[-->`);
				ssrRenderList(unref(columns), (column) => {
					_push(`<div class="salon-calendar-heading">${ssrInterpolate(column.label)}</div>`);
				});
				_push(`<!--]--><div class="salon-calendar-times"><!--[-->`);
				ssrRenderList(unref(slots).filter((x) => x % 60 === 0), (minute) => {
					_push(`<span>${ssrInterpolate(time(minute))}</span>`);
				});
				_push(`<!--]--></div><!--[-->`);
				ssrRenderList(unref(columns), (column) => {
					_push(`<div class="salon-calendar-column"><!--[-->`);
					ssrRenderList(unref(slots), (minute) => {
						_push(`<button class="${ssrRenderClass([{
							"is-unavailable": unavailable(column, minute),
							"is-break": unavailable(column, minute) === "Перерыв"
						}, "salon-calendar-slot"])}"${ssrRenderAttr("title", unavailable(column, minute) || "Свободное время")} type="button"${ssrIncludeBooleanAttr(__props.busy || past(column, minute) || Boolean(unavailable(column, minute))) ? " disabled" : ""}${ssrRenderAttr("aria-label", `Создать запись: ${column.label}, ${column.day}, ${time(minute)}`)}></button>`);
					});
					_push(`<!--]--><!--[-->`);
					ssrRenderList(visible(column), (booking) => {
						_push(`<button${ssrRenderAttr("data-booking-id", booking.id)} type="button" class="${ssrRenderClass([`is-${booking.status.toLowerCase()}`, "salon-calendar-visit"])}" style="${ssrRenderStyle(position(booking, column.day))}"${ssrRenderAttr("draggable", !__props.busy && ["NEW", "CONFIRMED"].includes(booking.status))}${ssrIncludeBooleanAttr(__props.busy) ? " disabled" : ""}><time>${ssrInterpolate(time(unref(salonMinute)(booking.startTime, __props.timeZone)))}–${ssrInterpolate(time(unref(salonMinute)(booking.endTime, __props.timeZone)))}</time><strong>${ssrInterpolate(booking.client.firstName)} ${ssrInterpolate(booking.client.lastName)}</strong><small>${ssrInterpolate(booking.service.name)} · ${ssrInterpolate(statuses[booking.status])}</small></button>`);
					});
					_push(`<!--]--></div>`);
				});
				_push(`<!--]--></div></div>`);
			}
			_push(`<small class="salon-calendar-hint">${ssrInterpolate(__props.mode === "month" ? "Нажмите дату, чтобы открыть расписание дня, или запись для редактирования." : "Нажмите свободное время для записи, карточку — для редактирования. На компьютере запись можно перетащить; на телефоне перенести через карточку.")}</small></section>`);
		};
	}
});
// components/SalonCalendar.vue
var _sfc_setup$11 = SalonCalendar_vue_vue_type_script_setup_true_lang_default.setup;
SalonCalendar_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/SalonCalendar.vue");
	return _sfc_setup$11 ? _sfc_setup$11(props, ctx) : void 0;
};
var SalonCalendar_default = Object.assign(SalonCalendar_vue_vue_type_script_setup_true_lang_default, { __name: "SalonCalendar" });
// components/SalonWeeklySchedule.vue?vue&type=script&setup=true&lang.ts
var SalonWeeklySchedule_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "SalonWeeklySchedule",
	__ssrInlineRender: true,
	props: {
		modelValue: {},
		workingDays: {},
		startMinute: {},
		endMinute: {}
	},
	emits: ["update:modelValue"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const days = [
			{
				id: 1,
				label: "Понедельник"
			},
			{
				id: 2,
				label: "Вторник"
			},
			{
				id: 3,
				label: "Среда"
			},
			{
				id: 4,
				label: "Четверг"
			},
			{
				id: 5,
				label: "Пятница"
			},
			{
				id: 6,
				label: "Суббота"
			},
			{
				id: 0,
				label: "Воскресенье"
			}
		];
		const schedule = (day) => props.modelValue?.find((d) => d.day === day) || {
			day,
			startMinute: props.startMinute,
			endMinute: props.endMinute,
			breaks: []
		};
		const time = (minute) => `${String(Math.floor(minute / 60) % 24).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<section${ssrRenderAttrs(mergeProps({
				class: "salon-weekly-schedule",
				"aria-label": "График по дням и перерывы"
			}, _attrs))}><header class="salon-settings-group-title"><h3>Часы по дням и перерывы</h3></header><small>По умолчанию действует общий график. Разверните день, чтобы изменить часы или добавить перерыв.</small><!--[-->`);
			ssrRenderList(days.filter((d) => __props.workingDays.includes(d.id)), (day) => {
				_push(`<details class="salon-day-schedule"><summary><strong>${ssrInterpolate(day.label)}</strong><span>${ssrInterpolate(time(schedule(day.id).startMinute))}–${ssrInterpolate(time(schedule(day.id).endMinute))}`);
				if (schedule(day.id).breaks.length) _push(`<small> · ${ssrInterpolate(schedule(day.id).breaks.length)} перерыв</small>`);
				else _push(`<!---->`);
				_push(`</span></summary><div class="salon-day-schedule-fields"><label>Начало<input type="time" required${ssrRenderAttr("value", time(schedule(day.id).startMinute))}${ssrRenderAttr("aria-label", `Начало: ${day.label}`)}></label><label>Окончание<input type="time" required${ssrRenderAttr("value", time(schedule(day.id).endMinute))}${ssrRenderAttr("aria-label", `Окончание: ${day.label}`)}></label></div><!--[-->`);
				ssrRenderList(schedule(day.id).breaks, (pause, i) => {
					_push(`<div class="salon-day-break"><label>Перерыв с<input type="time" required${ssrRenderAttr("value", time(pause.startMinute))}${ssrRenderAttr("aria-label", `Перерыв с: ${day.label} ${i + 1}`)}></label><label>До<input type="time" required${ssrRenderAttr("value", time(pause.endMinute))}${ssrRenderAttr("aria-label", `Перерыв до: ${day.label} ${i + 1}`)}></label><button type="button"${ssrRenderAttr("aria-label", `Удалить перерыв: ${day.label} ${i + 1}`)}>`);
					_push(ssrRenderComponent(unref(Trash2), { size: 16 }, null, _parent));
					_push(`</button></div>`);
				});
				_push(`<!--]-->`);
				if (schedule(day.id).breaks.length < 4) {
					_push(`<button type="button"${ssrRenderAttr("aria-label", `Добавить перерыв: ${day.label}`)}>`);
					_push(ssrRenderComponent(unref(Plus), { size: 16 }, null, _parent));
					_push(`Добавить перерыв</button>`);
				} else _push(`<!---->`);
				_push(`</details>`);
			});
			_push(`<!--]--></section>`);
		};
	}
});
// components/SalonWeeklySchedule.vue
var _sfc_setup$10 = SalonWeeklySchedule_vue_vue_type_script_setup_true_lang_default.setup;
SalonWeeklySchedule_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/SalonWeeklySchedule.vue");
	return _sfc_setup$10 ? _sfc_setup$10(props, ctx) : void 0;
};
var SalonWeeklySchedule_default = Object.assign(SalonWeeklySchedule_vue_vue_type_script_setup_true_lang_default, { __name: "SalonWeeklySchedule" });
// components/SalonOnlineBookingSettings.vue?vue&type=script&setup=true&lang.ts
var SalonOnlineBookingSettings_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "SalonOnlineBookingSettings",
	__ssrInlineRender: true,
	props: {
		profile: {},
		scheduleOnly: { type: Boolean }
	},
	setup(__props, { expose: __expose }) {
		const props = __props;
		const config = useRuntimeConfig(), session = useB2BSession();
		const draft = reactive({
			enabled: false,
			timeZone: "Europe/Moscow",
			startMinute: 540,
			endMinute: 1200,
			slotStep: 15,
			horizonDays: 30,
			workingDays: [
				1,
				2,
				3,
				4,
				5,
				6
			],
			masterIds: [],
			weeklySchedule: []
		});
		const loading = ref(true), busy = ref(false), error = ref(""), notice = ref(""), baseline = ref("");
		const canEdit = computed(() => props.profile.membership?.role === "OWNER");
		const masterOptions = computed(() => {
			const active = props.profile.members.filter(salonMasterAvailable);
			return [...active, ...draft.masterIds.filter((id) => !active.some((member) => member.id === id)).map((id) => props.profile.members.find((member) => member.id === id) || {
				id,
				isActive: false,
				user: { firstName: "Мастер недоступен" }
			})];
		});
		const dirty = computed(() => Boolean(baseline.value) && JSON.stringify(draft) !== baseline.value);
		const days = [
			{
				id: 1,
				label: "Пн"
			},
			{
				id: 2,
				label: "Вт"
			},
			{
				id: 3,
				label: "Ср"
			},
			{
				id: 4,
				label: "Чт"
			},
			{
				id: 5,
				label: "Пт"
			},
			{
				id: 6,
				label: "Сб"
			},
			{
				id: 0,
				label: "Вс"
			}
		];
		const publicUrl = computed(() => `${String(config.public.siteUrl).replace(/\/$/, "")}/booking/${props.profile.id}`);
		const embed = computed(() => `<iframe src="${publicUrl.value}?embed=1" title="Онлайн-запись в салон" width="100%" height="720" loading="lazy"></iframe>`);
		const hours = (key) => computed({
			get: () => {
				const minute = draft[key] === 1440 ? 0 : draft[key];
				return `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
			},
			set: (value) => {
				const [h, m] = value.split(":").map(Number);
				if (Number.isFinite(h) && Number.isFinite(m)) draft[key] = key === "endMinute" && h === 0 && m === 0 ? 1440 : h * 60 + m;
			}
		});
		const opensAt = hours("startMinute"), closesAt = hours("endMinute");
		const fields = [
			"enabled",
			"timeZone",
			"startMinute",
			"endMinute",
			"slotStep",
			"horizonDays",
			"workingDays",
			"masterIds",
			"weeklySchedule"
		];
		computed(() => ({ Authorization: `Bearer ${session.token.value}` }));
		async function load() {
			loading.value = true;
			error.value = "";
			try {
				const value = await session.request("/b2b/booking-settings");
				for (const key of fields) if (value[key] !== void 0) draft[key] = value[key];
				baseline.value = JSON.stringify(draft);
			} catch {
				error.value = "Не удалось загрузить настройки онлайн-записи.";
			} finally {
				loading.value = false;
			}
		}
		function leave() {
			return !busy.value && (!dirty.value || (void 0).confirm("Настройки онлайн-записи не сохранены. Покинуть раздел?"));
		}
		async function refresh() {
			if (busy.value || loading.value) return;
			if (dirty.value && !(void 0).confirm("Настройки не сохранены. Отменить изменения и обновить?")) return;
			notice.value = "";
			await load();
		}
		__expose({
			refresh,
			busy,
			loading
		});
		onBeforeRouteLeave(leave);
		onBeforeRouteUpdate(leave);
		return (_ctx, _push, _parent, _attrs) => {
			const _component_SalonWeeklySchedule = SalonWeeklySchedule_default;
			_push(`<div${ssrRenderAttrs(mergeProps({ class: "salon-online-settings" }, _attrs))}>`);
			if (unref(error)) {
				_push(`<p role="alert" class="salon-settings-error">${ssrInterpolate(unref(error))} `);
				if (!unref(baseline)) _push(`<button type="button">Повторить</button>`);
				else _push(`<!---->`);
				_push(`</p>`);
			} else _push(`<!---->`);
			if (unref(loading)) _push(`<p role="status">Загружаем настройки…</p>`);
			else if (unref(baseline)) {
				_push(`<form class="salon-settings-panel"><header class="salon-settings-heading"><h2>Условия онлайн-записи</h2>`);
				if (!unref(canEdit)) _push(`<small>Изменять настройки может владелец компании.</small>`);
				else _push(`<!---->`);
				_push(`</header><fieldset${ssrIncludeBooleanAttr(unref(busy) || !unref(canEdit)) ? " disabled" : ""} class="ui-fieldset-reset"><label class="salon-publication-control"><span><strong>Включить публичную запись</strong><small>${ssrInterpolate(unref(draft).enabled ? "Клиенты могут записаться на странице и через виджет" : "Страница и виджет пока не принимают записи")}</small></span><span class="salon-switch"><input${ssrIncludeBooleanAttr(Array.isArray(unref(draft).enabled) ? ssrLooseContain(unref(draft).enabled, null) : unref(draft).enabled) ? " checked" : ""} type="checkbox" aria-label="Включить публичную запись"><span aria-hidden="true"></span></span></label><section class="salon-settings-group"><header class="salon-settings-group-title">`);
				_push(ssrRenderComponent(unref(CalendarDays), { size: 18 }, null, _parent));
				_push(`<h3>Расписание</h3></header><div class="salon-settings-fields"><label class="salon-settings-wide">Часовой пояс<input${ssrRenderAttr("value", unref(draft).timeZone)} required placeholder="Europe/Moscow"></label><label>Начало рабочего дня<input${ssrRenderAttr("value", unref(opensAt))} type="time" required></label><label>Конец рабочего дня<input${ssrRenderAttr("value", unref(closesAt))} type="time" required></label><label>Шаг записи, минут<input${ssrRenderAttr("value", unref(draft).slotStep)} type="number" min="5" max="60" required></label><label>Запись вперёд, дней<input${ssrRenderAttr("value", unref(draft).horizonDays)} type="number" min="1" max="90" required></label></div><fieldset class="salon-settings-days"><legend>Рабочие дни</legend><div class="salon-day-options"><!--[-->`);
				ssrRenderList(days, (day) => {
					_push(`<label><input${ssrIncludeBooleanAttr(Array.isArray(unref(draft).workingDays) ? ssrLooseContain(unref(draft).workingDays, day.id) : unref(draft).workingDays) ? " checked" : ""}${ssrRenderAttr("value", day.id)} type="checkbox"><span>${ssrInterpolate(day.label)}</span></label>`);
				});
				_push(`<!--]--></div></fieldset></section>`);
				_push(ssrRenderComponent(_component_SalonWeeklySchedule, {
					modelValue: unref(draft).weeklySchedule,
					"onUpdate:modelValue": ($event) => unref(draft).weeklySchedule = $event,
					"working-days": unref(draft).workingDays,
					"start-minute": unref(draft).startMinute,
					"end-minute": unref(draft).endMinute
				}, null, _parent));
				_push(`<fieldset class="salon-settings-masters"><legend>`);
				_push(ssrRenderComponent(unref(Users), { size: 18 }, null, _parent));
				_push(`Мастера для публичной записи</legend><div class="salon-master-options"><!--[-->`);
				ssrRenderList(unref(masterOptions), (member) => {
					_push(`<label><input${ssrIncludeBooleanAttr(Array.isArray(unref(draft).masterIds) ? ssrLooseContain(unref(draft).masterIds, member.id) : unref(draft).masterIds) ? " checked" : ""}${ssrRenderAttr("value", member.id)} type="checkbox"><span>${ssrInterpolate([member.user.firstName, member.user.lastName].filter(Boolean).join(" ") || "Сотрудник")}${ssrInterpolate(unref(salonMasterAvailable)(member) ? "" : " · недоступен")}</span></label>`);
				});
				_push(`<!--]-->`);
				if (!__props.profile.members.some(unref(salonMasterAvailable))) _push(`<small>Нет активных сотрудников.</small>`);
				else _push(`<!---->`);
				_push(`</div></fieldset></fieldset><details class="salon-settings-notes"><summary>Условия публикации</summary><p class="salon-settings-warning">Публикация доступна для активной организации. Часы по дням недели и перерывы действуют для всех выбранных мастеров. Индивидуальные смены и исключения по датам — следующий этап. Перед массовым запуском необходимо подключить подтверждение телефона.</p></details><footer class="salon-settings-save"><span role="status">${ssrInterpolate(unref(notice) || (unref(dirty) ? "Есть несохранённые изменения" : "Все изменения сохранены"))}</span>`);
				if (unref(canEdit)) {
					_push(`<button class="primary" type="submit"${ssrIncludeBooleanAttr(unref(busy) || !unref(dirty)) ? " disabled" : ""}>`);
					_push(ssrRenderComponent(unref(Save), { size: 16 }, null, _parent));
					_push(`${ssrInterpolate(unref(busy) ? "Сохраняем…" : "Сохранить настройки")}</button>`);
				} else _push(`<!---->`);
				_push(`</footer></form>`);
			} else _push(`<!---->`);
			if (!__props.scheduleOnly) {
				_push(`<aside class="salon-settings-channels"><section class="salon-settings-panel salon-booking-channel"><header class="salon-settings-group-title">`);
				_push(ssrRenderComponent(unref(Globe), { size: 18 }, null, _parent));
				_push(`<h2>Страница записи</h2></header><p>Поделитесь ссылкой с клиентами — установка на сайт не нужна.</p><label>Ссылка для клиентов<input${ssrRenderAttr("value", unref(publicUrl))} readonly aria-label="Ссылка онлайн-записи"></label><div class="salon-link-actions"><button type="button">`);
				_push(ssrRenderComponent(unref(Copy), { size: 16 }, null, _parent));
				_push(`Скопировать ссылку</button><a${ssrRenderAttr("href", unref(publicUrl))} target="_blank" rel="noopener" aria-label="Открыть страницу записи" title="Открыть страницу записи">`);
				_push(ssrRenderComponent(unref(ExternalLink), { size: 18 }, null, _parent));
				_push(`</a></div></section><section class="salon-settings-panel salon-booking-channel"><header class="salon-settings-group-title">`);
				_push(ssrRenderComponent(unref(Code), { size: 18 }, null, _parent));
				_push(`<h2>Виджет для сайта</h2></header><p>Добавьте форму записи на сайт салона. Услуги и свободное время обновляются автоматически.</p><details class="salon-widget-code"><summary>Код для сайта салона</summary><label><span class="salon-settings-code-label">HTML-код виджета</span><textarea readonly rows="5" aria-label="Код виджета">${ssrInterpolate(unref(embed))}</textarea></label></details><button type="button">`);
				_push(ssrRenderComponent(unref(Copy), { size: 16 }, null, _parent));
				_push(`Скопировать код виджета</button><small>Оба способа используют ваше расписание и настройки публикации.</small></section></aside>`);
			} else _push(`<!---->`);
			_push(`</div>`);
		};
	}
});
// components/SalonOnlineBookingSettings.vue
var _sfc_setup$9 = SalonOnlineBookingSettings_vue_vue_type_script_setup_true_lang_default.setup;
SalonOnlineBookingSettings_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/SalonOnlineBookingSettings.vue");
	return _sfc_setup$9 ? _sfc_setup$9(props, ctx) : void 0;
};
var SalonOnlineBookingSettings_default = Object.assign(SalonOnlineBookingSettings_vue_vue_type_script_setup_true_lang_default, { __name: "SalonOnlineBookingSettings" });
// components/BusinessPurchasesDashboard.vue?vue&type=script&setup=true&lang.ts
var BusinessPurchasesDashboard_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "BusinessPurchasesDashboard",
	__ssrInlineRender: true,
	props: {
		profile: {},
		dashboard: {},
		orders: {},
		formatPrice: { type: Function },
		statusLabels: {},
		fulfillment: { type: Function }
	},
	setup(__props) {
		const props = __props;
		const active = computed(() => props.orders.filter((order) => ![
			"DELIVERED",
			"CANCELLED",
			"REFUNDED"
		].includes(order.status)));
		const issues = computed(() => props.orders.filter((order) => order.needsAttention));
		const canSeeFinance = computed(() => Boolean(props.profile.membership?.canSeeFinance));
		const date = (value) => new Date(value).toLocaleDateString("ru-RU", {
			day: "numeric",
			month: "short"
		});
		return (_ctx, _push, _parent, _attrs) => {
			const _component_NuxtLink = NuxtLink;
			const _component_SalonOrganizationCard = SalonOrganizationCard_default;
			_push(`<section${ssrRenderAttrs(mergeProps({ class: "business-purchases-overview business-workspace-overview" }, _attrs))}><div class="business-overview-metrics" aria-label="Показатели закупок"><article><span>Заказы за месяц</span><strong>${ssrInterpolate(__props.dashboard.purchaseOrdersMonth || 0)}</strong><small>Оформлены вашей компанией</small></article>`);
			if (unref(canSeeFinance)) _push(`<article><span>Сумма закупок за месяц</span><strong>${ssrInterpolate(__props.formatPrice(__props.dashboard.purchasesMonth))}</strong><small>По заказам за текущий месяц</small></article>`);
			else _push(`<!---->`);
			_push(`<article><span>Заказы в работе</span><strong>${ssrInterpolate(unref(active).length)}</strong><small>Из загруженных заказов</small></article><article><span>Требуют проверки</span><strong>${ssrInterpolate(unref(issues).length)}</strong><small>Ошибки передачи заказа</small></article></div>`);
			if (unref(issues).length) {
				_push(`<div class="business-overview-notice" role="status">`);
				_push(ssrRenderComponent(unref(CircleAlert), { size: 20 }, null, _parent));
				_push(`<div><strong>Есть заказы с ошибкой передачи</strong><p>Откройте список заказов и свяжитесь с поддержкой для проверки статуса.</p></div>`);
				_push(ssrRenderComponent(_component_NuxtLink, { to: "/b2b?section=orders" }, {
					default: withCtx((_, _push, _parent, _scopeId) => {
						if (_push) {
							_push(`К заказам`);
							_push(ssrRenderComponent(unref(ArrowRight), { size: 16 }, null, _parent, _scopeId));
						} else return [createTextVNode("К заказам"), createVNode(unref(ArrowRight), { size: 16 })];
					}),
					_: 1
				}, _parent));
				_push(`</div>`);
			} else _push(`<!---->`);
			_push(`<div class="business-purchases-columns"><section class="salon-settings-panel business-recent-orders"><header class="salon-overview-heading"><div><h2>Последние заказы</h2><p>Состав, сумма и текущее состояние закупок</p></div>`);
			_push(ssrRenderComponent(_component_NuxtLink, {
				to: "/b2b?section=orders",
				class: "business-section-link",
				"aria-label": "Все заказы"
			}, {
				default: withCtx((_, _push, _parent, _scopeId) => {
					if (_push) {
						_push(`<span${_scopeId}>Все заказы</span>`);
						_push(ssrRenderComponent(unref(ArrowRight), { size: 16 }, null, _parent, _scopeId));
					} else return [createVNode("span", null, "Все заказы"), createVNode(unref(ArrowRight), { size: 16 })];
				}),
				_: 1
			}, _parent));
			_push(`</header><!--[-->`);
			ssrRenderList(__props.orders.slice(0, 5), (item) => {
				_push(ssrRenderComponent(_component_NuxtLink, {
					key: item.id,
					to: "/b2b?section=orders",
					class: "business-dashboard-order"
				}, {
					default: withCtx((_, _push, _parent, _scopeId) => {
						if (_push) {
							_push(`<span class="business-order-mark" aria-hidden="true"${_scopeId}>`);
							_push(ssrRenderComponent(unref(ShoppingBag), { size: 19 }, null, _parent, _scopeId));
							_push(`</span><div${_scopeId}><strong${_scopeId}>${ssrInterpolate(item.orderNumber)}</strong><small${_scopeId}>${ssrInterpolate(date(item.createdAt))} · ${ssrInterpolate(__props.statusLabels[item.status] || item.status)}</small><small class="${ssrRenderClass({ "sync-error": item.warehouseStatus?.isCurrent && item.warehouseStatus?.stage === "NEEDS_ATTENTION" })}"${_scopeId}>${ssrInterpolate(__props.fulfillment(item))}</small></div>`);
							if (unref(canSeeFinance)) _push(`<strong${_scopeId}>${ssrInterpolate(__props.formatPrice(item.finalAmount))}</strong>`);
							else _push(`<!---->`);
							_push(ssrRenderComponent(unref(ArrowRight), {
								size: 16,
								"aria-hidden": "true"
							}, null, _parent, _scopeId));
						} else return [
							createVNode("span", {
								class: "business-order-mark",
								"aria-hidden": "true"
							}, [createVNode(unref(ShoppingBag), { size: 19 })]),
							createVNode("div", null, [
								createVNode("strong", null, toDisplayString(item.orderNumber), 1),
								createVNode("small", null, toDisplayString(date(item.createdAt)) + " · " + toDisplayString(__props.statusLabels[item.status] || item.status), 1),
								createVNode("small", { class: { "sync-error": item.warehouseStatus?.isCurrent && item.warehouseStatus?.stage === "NEEDS_ATTENTION" } }, toDisplayString(__props.fulfillment(item)), 3)
							]),
							unref(canSeeFinance) ? (openBlock(), createBlock("strong", { key: 0 }, toDisplayString(__props.formatPrice(item.finalAmount)), 1)) : createCommentVNode("", true),
							createVNode(unref(ArrowRight), {
								size: 16,
								"aria-hidden": "true"
							})
						];
					}),
					_: 2
				}, _parent));
			});
			_push(`<!--]-->`);
			if (!__props.orders.length) {
				_push(`<div class="business-dashboard-empty">`);
				_push(ssrRenderComponent(unref(ShoppingBag), { size: 30 }, null, _parent));
				_push(`<h3>Начните первую закупку</h3><p>Подберите товары по персональным ценам. История и статусы заказов появятся здесь.</p>`);
				_push(ssrRenderComponent(_component_NuxtLink, { to: "/b2b?section=catalog" }, {
					default: withCtx((_, _push, _parent, _scopeId) => {
						if (_push) {
							_push(`Открыть каталог`);
							_push(ssrRenderComponent(unref(ArrowRight), { size: 16 }, null, _parent, _scopeId));
						} else return [createTextVNode("Открыть каталог"), createVNode(unref(ArrowRight), { size: 16 })];
					}),
					_: 1
				}, _parent));
				_push(`</div>`);
			} else _push(`<!---->`);
			_push(`</section><section class="business-overview-shortcuts" aria-label="Действия с закупками">`);
			_push(ssrRenderComponent(_component_NuxtLink, {
				to: "/b2b?section=catalog",
				class: "business-shortcut business-shortcut--primary"
			}, {
				default: withCtx((_, _push, _parent, _scopeId) => {
					if (_push) {
						_push(ssrRenderComponent(unref(PackageSearch), { size: 22 }, null, _parent, _scopeId));
						_push(`<span${_scopeId}><strong${_scopeId}>Подобрать товары</strong><small${_scopeId}>Каталог с персональными ценами</small></span>`);
						_push(ssrRenderComponent(unref(ArrowRight), { size: 18 }, null, _parent, _scopeId));
					} else return [
						createVNode(unref(PackageSearch), { size: 22 }),
						createVNode("span", null, [createVNode("strong", null, "Подобрать товары"), createVNode("small", null, "Каталог с персональными ценами")]),
						createVNode(unref(ArrowRight), { size: 18 })
					];
				}),
				_: 1
			}, _parent));
			_push(ssrRenderComponent(_component_NuxtLink, {
				to: "/b2b?section=support&area=purchases",
				class: "business-shortcut"
			}, {
				default: withCtx((_, _push, _parent, _scopeId) => {
					if (_push) {
						_push(ssrRenderComponent(unref(CircleHelp), { size: 21 }, null, _parent, _scopeId));
						_push(`<span${_scopeId}><strong${_scopeId}>Помощь с закупкой</strong><small${_scopeId}>Вопросы по товарам и заказам</small></span>`);
						_push(ssrRenderComponent(unref(ArrowRight), { size: 17 }, null, _parent, _scopeId));
					} else return [
						createVNode(unref(CircleHelp), { size: 21 }),
						createVNode("span", null, [createVNode("strong", null, "Помощь с закупкой"), createVNode("small", null, "Вопросы по товарам и заказам")]),
						createVNode(unref(ArrowRight), { size: 17 })
					];
				}),
				_: 1
			}, _parent));
			_push(ssrRenderComponent(_component_NuxtLink, {
				to: "/b2b?section=settings&area=purchases",
				class: "business-shortcut"
			}, {
				default: withCtx((_, _push, _parent, _scopeId) => {
					if (_push) {
						_push(ssrRenderComponent(unref(Settings), { size: 21 }, null, _parent, _scopeId));
						_push(`<span${_scopeId}><strong${_scopeId}>Данные компании</strong><small${_scopeId}>Реквизиты и контактные данные</small></span>`);
						_push(ssrRenderComponent(unref(ArrowRight), { size: 17 }, null, _parent, _scopeId));
					} else return [
						createVNode(unref(Settings), { size: 21 }),
						createVNode("span", null, [createVNode("strong", null, "Данные компании"), createVNode("small", null, "Реквизиты и контактные данные")]),
						createVNode(unref(ArrowRight), { size: 17 })
					];
				}),
				_: 1
			}, _parent));
			_push(`</section></div>`);
			_push(ssrRenderComponent(_component_SalonOrganizationCard, {
				profile: __props.profile,
				"format-price": __props.formatPrice
			}, null, _parent));
			_push(`</section>`);
		};
	}
});
// components/BusinessPurchasesDashboard.vue
var _sfc_setup$8 = BusinessPurchasesDashboard_vue_vue_type_script_setup_true_lang_default.setup;
BusinessPurchasesDashboard_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/BusinessPurchasesDashboard.vue");
	return _sfc_setup$8 ? _sfc_setup$8(props, ctx) : void 0;
};
var BusinessPurchasesDashboard_default = Object.assign(BusinessPurchasesDashboard_vue_vue_type_script_setup_true_lang_default, { __name: "BusinessPurchasesDashboard" });
// components/SalonServices.vue?vue&type=script&setup=true&lang.ts
var SalonServices_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "SalonServices",
	__ssrInlineRender: true,
	props: {
		services: {},
		formatPrice: { type: Function }
	},
	emits: ["edit"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const query = ref(""), availability = ref("all"), sort = ref("name"), page = ref(1);
		const filtered = computed(() => {
			const needle = query.value.trim().toLocaleLowerCase("ru-RU");
			return props.services.filter((item) => (availability.value === "all" || item.isActive === (availability.value === "active")) && (!needle || `${item.name} ${item.description || ""}`.toLocaleLowerCase("ru-RU").includes(needle))).sort((a, b) => {
				if (sort.value === "price") return Number(a.price) - Number(b.price) || a.name.localeCompare(b.name, "ru");
				if (sort.value === "duration") return a.duration - b.duration || a.name.localeCompare(b.name, "ru");
				return a.name.localeCompare(b.name, "ru");
			});
		});
		const hasFilters = computed(() => Boolean(query.value.trim()) || availability.value !== "all");
		const pageCount = computed(() => Math.max(1, Math.ceil(filtered.value.length / 25)));
		const visible = computed(() => filtered.value.slice((page.value - 1) * 25, page.value * 25));
		watch([
			query,
			availability,
			sort
		], () => {
			page.value = 1;
		});
		watch(pageCount, (value) => {
			page.value = Math.min(page.value, value);
		});
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<section${ssrRenderAttrs(mergeProps({
				class: "salon-services-panel business-register-panel",
				"aria-label": "Услуги салона"
			}, _attrs))}><div class="salon-services-filters"><label class="salon-services-search">`);
			_push(ssrRenderComponent(unref(Search), { size: 18 }, null, _parent));
			_push(`<input${ssrRenderAttr("value", unref(query))} type="search" placeholder="Название или описание услуги" aria-label="Поиск услуг">`);
			if (unref(query)) {
				_push(`<button type="button" aria-label="Очистить поиск услуг">`);
				_push(ssrRenderComponent(unref(X), { size: 16 }, null, _parent));
				_push(`</button>`);
			} else _push(`<!---->`);
			_push(`</label><select aria-label="Доступность услуг"><option value="all"${ssrIncludeBooleanAttr(Array.isArray(unref(availability)) ? ssrLooseContain(unref(availability), "all") : ssrLooseEqual(unref(availability), "all")) ? " selected" : ""}>Все услуги</option><option value="active"${ssrIncludeBooleanAttr(Array.isArray(unref(availability)) ? ssrLooseContain(unref(availability), "active") : ssrLooseEqual(unref(availability), "active")) ? " selected" : ""}>Доступные</option><option value="inactive"${ssrIncludeBooleanAttr(Array.isArray(unref(availability)) ? ssrLooseContain(unref(availability), "inactive") : ssrLooseEqual(unref(availability), "inactive")) ? " selected" : ""}>Выключенные</option></select><select aria-label="Сортировка услуг"><option value="name"${ssrIncludeBooleanAttr(Array.isArray(unref(sort)) ? ssrLooseContain(unref(sort), "name") : ssrLooseEqual(unref(sort), "name")) ? " selected" : ""}>По названию</option><option value="price"${ssrIncludeBooleanAttr(Array.isArray(unref(sort)) ? ssrLooseContain(unref(sort), "price") : ssrLooseEqual(unref(sort), "price")) ? " selected" : ""}>Сначала дешевле</option><option value="duration"${ssrIncludeBooleanAttr(Array.isArray(unref(sort)) ? ssrLooseContain(unref(sort), "duration") : ssrLooseEqual(unref(sort), "duration")) ? " selected" : ""}>Сначала короче</option></select></div><div class="business-results-summary"><span role="status" aria-live="polite">${ssrInterpolate(unref(hasFilters) ? `Найдено: ${unref(filtered).length} из ${__props.services.length}` : `Услуг: ${__props.services.length} · Доступно для записи: ${__props.services.filter((service) => service.isActive).length}`)}</span>`);
			if (unref(hasFilters)) {
				_push(`<button type="button" class="business-text-control">Сбросить фильтры`);
				_push(ssrRenderComponent(unref(X), { size: 14 }, null, _parent));
				_push(`</button>`);
			} else _push(`<!---->`);
			_push(`</div>`);
			if (unref(filtered).length) {
				_push(`<table class="salon-services-table" aria-label="Список услуг"><thead><tr><th scope="col">Услуга</th><th scope="col" class="business-money-heading">Цена</th><th scope="col">Длительность</th><th scope="col">Доступность</th><th scope="col"><span class="salon-services-sr-only">Действия</span></th></tr></thead><tbody><!--[-->`);
				ssrRenderList(unref(visible), (item) => {
					_push(`<tr class="salon-service-row"><th scope="row" class="salon-service-info"><div><span class="salon-service-color" style="${ssrRenderStyle({ "--service-color": item.color || "var(--ui-accent)" })}" aria-hidden="true"></span><div><button type="button" class="b2b-edit-link">${ssrInterpolate(item.name)}</button>`);
					if (item.description) _push(`<p>${ssrInterpolate(item.description)}</p>`);
					else _push(`<!---->`);
					_push(`</div></div></th><td class="salon-service-price" data-label="Цена"><strong>${ssrInterpolate(__props.formatPrice(item.price))}</strong></td><td class="salon-service-duration" data-label="Длительность"><span>`);
					_push(ssrRenderComponent(unref(Clock3), { size: 14 }, null, _parent));
					_push(`${ssrInterpolate(item.duration)} мин.</span></td><td class="salon-service-availability"><span class="${ssrRenderClass([{ "is-active": item.isActive }, "salon-service-status"])}"><i aria-hidden="true"></i>${ssrInterpolate(item.isActive ? "Доступна" : "Выключена")}</span></td><td class="salon-service-actions"><button type="button"${ssrRenderAttr("aria-label", `Редактировать ${item.name}`)}${ssrRenderAttr("title", `Редактировать ${item.name}`)}>`);
					_push(ssrRenderComponent(unref(Pencil), { size: 17 }, null, _parent));
					_push(`</button></td></tr>`);
				});
				_push(`<!--]--></tbody></table>`);
			} else {
				_push(`<div class="salon-services-empty">`);
				_push(ssrRenderComponent(unref(Scissors), { size: 24 }, null, _parent));
				_push(`<h3>${ssrInterpolate(__props.services.length ? "Ничего не найдено" : "Услуг пока нет")}</h3><p>${ssrInterpolate(__props.services.length ? "Измените запрос или доступность услуг." : "Добавьте первую услугу кнопкой «Новая услуга» вверху страницы.")}</p>`);
				if (unref(hasFilters)) _push(`<button type="button">Сбросить фильтры</button>`);
				else _push(`<!---->`);
				_push(`</div>`);
			}
			if (unref(pageCount) > 1) {
				_push(`<footer class="salon-services-total"><small>Показаны ${ssrInterpolate((unref(page) - 1) * 25 + 1)}–${ssrInterpolate(Math.min(unref(page) * 25, unref(filtered).length))} из ${ssrInterpolate(unref(filtered).length)}</small><nav class="business-pagination" aria-label="Страницы услуг"><button type="button"${ssrIncludeBooleanAttr(unref(page) === 1) ? " disabled" : ""} aria-label="Предыдущая страница услуг">`);
				_push(ssrRenderComponent(unref(ChevronLeft), { size: 17 }, null, _parent));
				_push(`</button><span aria-live="polite">${ssrInterpolate(unref(page))} из ${ssrInterpolate(unref(pageCount))}</span><button type="button"${ssrIncludeBooleanAttr(unref(page) === unref(pageCount)) ? " disabled" : ""} aria-label="Следующая страница услуг">`);
				_push(ssrRenderComponent(unref(ChevronRight), { size: 17 }, null, _parent));
				_push(`</button></nav></footer>`);
			} else _push(`<!---->`);
			_push(`</section>`);
		};
	}
});
// components/SalonServices.vue
var _sfc_setup$7 = SalonServices_vue_vue_type_script_setup_true_lang_default.setup;
SalonServices_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/SalonServices.vue");
	return _sfc_setup$7 ? _sfc_setup$7(props, ctx) : void 0;
};
var SalonServices_default = Object.assign(SalonServices_vue_vue_type_script_setup_true_lang_default, { __name: "SalonServices" });
// components/BusinessCatalog.vue?vue&type=script&setup=true&lang.ts
var perPage = 12;
var BusinessCatalog_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "BusinessCatalog",
	__ssrInlineRender: true,
	props: {
		products: {},
		cart: {},
		canOrder: { type: Boolean },
		busy: { type: Boolean },
		formatPrice: { type: Function }
	},
	emits: ["quantity", "checkout"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const config = useRuntimeConfig();
		const query = ref(""), category = ref(""), stock = ref("all"), sort = ref("name"), page = ref(1);
		const failed = ref({});
		ref(null);
		const categories = computed(() => {
			const values = /* @__PURE__ */ new Map();
			for (const product of props.products) for (const item of product.categories || []) values.set(item.category.id, item.category.nameRu || item.category.name);
			return [...values.entries()].sort((a, b) => a[1].localeCompare(b[1], "ru"));
		});
		const price = (product) => Math.min(...product.variants.map((variant) => Number(variant.b2bPrice)));
		const filtered = computed(() => props.products.filter((product) => {
			const matchesQuery = !query.value.trim() || `${product.nameRu} ${product.sku} ${product.variants.map((variant) => variant.sku).join(" ")}`.toLocaleLowerCase("ru").includes(query.value.trim().toLocaleLowerCase("ru"));
			const available = product.variants.some((variant) => (confirmedOneCAvailable(variant) || 0) > 0);
			const empty = product.variants.length > 0 && product.variants.every((variant) => confirmedOneCAvailable(variant) === 0);
			const unknown = product.variants.some((variant) => confirmedOneCAvailable(variant) === null);
			return matchesQuery && (!category.value || product.categories?.some((item) => item.category.id === category.value)) && (stock.value === "all" || (stock.value === "available" ? available : stock.value === "unavailable" ? empty : unknown));
		}).sort((a, b) => sort.value === "price" ? price(a) - price(b) : sort.value === "price-desc" ? price(b) - price(a) : a.nameRu.localeCompare(b.nameRu, "ru")));
		const pageCount = computed(() => Math.max(1, Math.ceil(filtered.value.length / perPage)));
		const visible = computed(() => filtered.value.slice((page.value - 1) * perPage, page.value * perPage));
		const hasFilters = computed(() => Boolean(query.value.trim() || category.value || stock.value !== "all"));
		const lines = computed(() => props.products.flatMap((product) => product.variants.filter((variant) => props.cart[variant.id] > 0).map((variant) => ({
			product,
			variant,
			quantity: props.cart[variant.id]
		}))));
		const total = computed(() => lines.value.reduce((sum, line) => sum + line.quantity * Math.round(Number(line.variant.b2bPrice) * 100), 0) / 100);
		const units = computed(() => lines.value.reduce((sum, line) => sum + line.quantity, 0));
		const orphanedCartIds = computed(() => {
			const known = new Set(props.products.flatMap((product) => product.variants.map((variant) => variant.id)));
			return Object.keys(props.cart).filter((id) => props.cart[id] > 0 && !known.has(id));
		});
		const cartIssue = computed(() => orphanedCartIds.value.length ? "Некоторые позиции больше недоступны в каталоге. Уберите их из корзины." : cartAvailabilityProblem(lines.value));
		const image = (product) => failed.value[product.id] ? "" : resolveProductImageUrl(product.images?.[0]?.url, config.public.apiBase, String(config.public.siteUrl || ""));
		watch([
			query,
			category,
			stock,
			sort
		], () => {
			page.value = 1;
		});
		watch(pageCount, (value) => {
			page.value = Math.min(page.value, value);
		});
		return (_ctx, _push, _parent, _attrs) => {
			const _component_NuxtLink = NuxtLink;
			_push(`<div${ssrRenderAttrs(mergeProps({ class: "business-catalog" }, _attrs))}><section class="business-catalog-products" aria-label="Товары для закупки"><div class="salon-services-panel business-catalog-controls"><div class="salon-services-filters business-catalog-filters"><label class="salon-services-search">`);
			_push(ssrRenderComponent(unref(Search), { size: 18 }, null, _parent));
			_push(`<input${ssrRenderAttr("value", unref(query))} type="search" placeholder="Название или артикул" aria-label="Поиск оптовых товаров">`);
			if (unref(query)) {
				_push(`<button type="button" aria-label="Очистить поиск товаров">`);
				_push(ssrRenderComponent(unref(X), { size: 16 }, null, _parent));
				_push(`</button>`);
			} else _push(`<!---->`);
			_push(`</label><select aria-label="Категория оптовых товаров"><option value=""${ssrIncludeBooleanAttr(Array.isArray(unref(category)) ? ssrLooseContain(unref(category), "") : ssrLooseEqual(unref(category), "")) ? " selected" : ""}>Все категории</option><!--[-->`);
			ssrRenderList(unref(categories), ([id, label]) => {
				_push(`<option${ssrRenderAttr("value", id)}${ssrIncludeBooleanAttr(Array.isArray(unref(category)) ? ssrLooseContain(unref(category), id) : ssrLooseEqual(unref(category), id)) ? " selected" : ""}>${ssrInterpolate(label)}</option>`);
			});
			_push(`<!--]--></select><select aria-label="Наличие оптовых товаров"><option value="all"${ssrIncludeBooleanAttr(Array.isArray(unref(stock)) ? ssrLooseContain(unref(stock), "all") : ssrLooseEqual(unref(stock), "all")) ? " selected" : ""}>Любой остаток</option><option value="available"${ssrIncludeBooleanAttr(Array.isArray(unref(stock)) ? ssrLooseContain(unref(stock), "available") : ssrLooseEqual(unref(stock), "available")) ? " selected" : ""}>В наличии</option><option value="unavailable"${ssrIncludeBooleanAttr(Array.isArray(unref(stock)) ? ssrLooseContain(unref(stock), "unavailable") : ssrLooseEqual(unref(stock), "unavailable")) ? " selected" : ""}>Нет в наличии</option><option value="unconfirmed"${ssrIncludeBooleanAttr(Array.isArray(unref(stock)) ? ssrLooseContain(unref(stock), "unconfirmed") : ssrLooseEqual(unref(stock), "unconfirmed")) ? " selected" : ""}>Остатки уточняются</option></select><select aria-label="Сортировка оптовых товаров"><option value="name"${ssrIncludeBooleanAttr(Array.isArray(unref(sort)) ? ssrLooseContain(unref(sort), "name") : ssrLooseEqual(unref(sort), "name")) ? " selected" : ""}>По названию</option><option value="price"${ssrIncludeBooleanAttr(Array.isArray(unref(sort)) ? ssrLooseContain(unref(sort), "price") : ssrLooseEqual(unref(sort), "price")) ? " selected" : ""}>Сначала дешевле</option><option value="price-desc"${ssrIncludeBooleanAttr(Array.isArray(unref(sort)) ? ssrLooseContain(unref(sort), "price-desc") : ssrLooseEqual(unref(sort), "price-desc")) ? " selected" : ""}>Сначала дороже</option></select></div><div class="business-results-summary"><span role="status" aria-live="polite">${ssrInterpolate(unref(hasFilters) ? `Найдено: ${unref(filtered).length} из ${__props.products.length}` : `Товаров в каталоге: ${__props.products.length}`)}</span>`);
			if (unref(hasFilters)) {
				_push(`<button type="button" class="business-text-control">Сбросить фильтры `);
				_push(ssrRenderComponent(unref(X), { size: 14 }, null, _parent));
				_push(`</button>`);
			} else _push(`<!---->`);
			_push(`</div></div>`);
			if (unref(lines).length) {
				_push(`<button type="button" class="business-cart-jump">`);
				_push(ssrRenderComponent(unref(ShoppingBag), { size: 18 }, null, _parent));
				_push(`<span>Ваш заказ · ${ssrInterpolate(unref(units))} шт.</span><strong>${ssrInterpolate(__props.formatPrice(unref(total)))}</strong>`);
				_push(ssrRenderComponent(unref(ArrowRight), { size: 17 }, null, _parent));
				_push(`</button>`);
			} else _push(`<!---->`);
			if (unref(visible).length) {
				_push(`<div class="business-product-grid"><!--[-->`);
				ssrRenderList(unref(visible), (product) => {
					_push(`<article class="${ssrRenderClass([{ "is-selected": product.variants.some((variant) => __props.cart[variant.id] > 0) }, "business-product"])}"><div class="business-product-image">`);
					if (image(product)) _push(`<img${ssrRenderAttr("src", image(product))}${ssrRenderAttr("alt", product.nameRu)} loading="lazy">`);
					else _push(ssrRenderComponent(unref(Package), {
						size: 32,
						"aria-label": "Изображение товара отсутствует"
					}, null, _parent));
					_push(`</div><div class="business-product-heading"><small>${ssrInterpolate(product.sku)}</small><h3>${ssrInterpolate(product.nameRu)}</h3></div>`);
					if (!product.variants.length) _push(`<p class="business-product-no-variants">Варианты товара сейчас недоступны</p>`);
					else _push(`<!---->`);
					_push(`<!--[-->`);
					ssrRenderList(product.variants, (variant) => {
						_push(`<div class="business-product-variant"><div>`);
						if (product.variants.length > 1) _push(`<small>${ssrInterpolate(variant.name || variant.sku)}</small>`);
						else _push(`<!---->`);
						_push(`<div class="business-product-prices"><strong>${ssrInterpolate(__props.formatPrice(variant.b2bPrice))}</strong>`);
						if (Number(variant.retailPrice) > Number(variant.b2bPrice)) _push(`<s>${ssrInterpolate(__props.formatPrice(variant.retailPrice))}</s>`);
						else _push(`<!---->`);
						_push(`</div><small class="${ssrRenderClass([{ "is-available": (unref(confirmedOneCAvailable)(variant) || 0) > 0 }, "business-product-stock"])}"><i aria-hidden="true"></i>${ssrInterpolate(unref(confirmedAvailabilityLabel)(variant))}</small></div><div class="business-quantity"><button type="button"${ssrIncludeBooleanAttr(__props.busy || !__props.canOrder || !__props.cart[variant.id]) ? " disabled" : ""}${ssrRenderAttr("aria-label", `Уменьшить количество ${variant.sku}`)}>`);
						_push(ssrRenderComponent(unref(Minus), { size: 15 }, null, _parent));
						_push(`</button><input type="number" inputmode="numeric" min="0"${ssrRenderAttr("max", unref(confirmedOneCAvailable)(variant) ?? void 0)}${ssrRenderAttr("value", __props.cart[variant.id] || 0)}${ssrIncludeBooleanAttr(__props.busy || !__props.canOrder || (unref(confirmedOneCAvailable)(variant) || 0) < 1) ? " disabled" : ""}${ssrRenderAttr("aria-label", `Количество ${variant.sku}`)}><button type="button"${ssrIncludeBooleanAttr(__props.busy || !__props.canOrder || unref(confirmedOneCAvailable)(variant) === null || (__props.cart[variant.id] || 0) >= (unref(confirmedOneCAvailable)(variant) || 0)) ? " disabled" : ""}${ssrRenderAttr("aria-label", `Добавить ${variant.sku}`)}>`);
						_push(ssrRenderComponent(unref(Plus), { size: 15 }, null, _parent));
						_push(`</button></div></div>`);
					});
					_push(`<!--]--></article>`);
				});
				_push(`<!--]--></div>`);
			} else {
				_push(`<div class="salon-services-panel salon-services-empty business-catalog-empty">`);
				_push(ssrRenderComponent(unref(Package), { size: 30 }, null, _parent));
				_push(`<h3>${ssrInterpolate(__props.products.length ? "Подходящих товаров нет" : "Каталог пока пуст")}</h3><p>${ssrInterpolate(__props.products.length ? "Попробуйте другое название, категорию или наличие." : "Товары появятся здесь после публикации. Менеджер поможет с подбором.")}</p>`);
				if (unref(hasFilters)) _push(`<button type="button">Показать все товары</button>`);
				else if (!__props.products.length) _push(ssrRenderComponent(_component_NuxtLink, { to: "/b2b?section=support&area=purchases" }, {
					default: withCtx((_, _push, _parent, _scopeId) => {
						if (_push) _push(`Связаться с поддержкой`);
						else return [createTextVNode("Связаться с поддержкой")];
					}),
					_: 1
				}, _parent));
				else _push(`<!---->`);
				_push(`</div>`);
			}
			if (unref(pageCount) > 1) {
				_push(`<nav class="business-catalog-pagination" aria-label="Страницы каталога"><button type="button"${ssrIncludeBooleanAttr(unref(page) === 1) ? " disabled" : ""} aria-label="Предыдущая страница товаров">`);
				_push(ssrRenderComponent(unref(ChevronLeft), { size: 17 }, null, _parent));
				_push(`Назад</button><span aria-live="polite">${ssrInterpolate(unref(page))} из ${ssrInterpolate(unref(pageCount))}</span><button type="button"${ssrIncludeBooleanAttr(unref(page) === unref(pageCount)) ? " disabled" : ""} aria-label="Следующая страница товаров">Далее`);
				_push(ssrRenderComponent(unref(ChevronRight), { size: 17 }, null, _parent));
				_push(`</button></nav>`);
			} else _push(`<!---->`);
			_push(`</section><aside class="business-cart salon-settings-panel" aria-label="Корзина закупок" tabindex="-1"><header><div class="business-cart-title">`);
			_push(ssrRenderComponent(unref(ShoppingBag), { size: 20 }, null, _parent));
			_push(`<h2>Ваш заказ</h2>`);
			if (unref(lines).length) _push(`<span class="business-count-badge">${ssrInterpolate(unref(lines).length)}</span>`);
			else _push(`<!---->`);
			_push(`</div><small>${ssrInterpolate(unref(lines).length ? `Товаров: ${unref(units)} шт.` : "Пока ничего не добавлено")}</small></header>`);
			if (!unref(lines).length) {
				_push(`<div class="business-cart-empty">`);
				_push(ssrRenderComponent(unref(Package), { size: 28 }, null, _parent));
				_push(`<p>Укажите количество у нужного товара — он появится здесь.</p></div>`);
			} else _push(`<!---->`);
			_push(`<!--[-->`);
			ssrRenderList(unref(lines), (line) => {
				_push(`<div class="business-cart-line"><div><strong>${ssrInterpolate(line.product.nameRu)}</strong>`);
				if (line.product.variants.length > 1) _push(`<small>${ssrInterpolate(line.variant.name || line.variant.sku)}</small>`);
				else _push(`<!---->`);
				_push(`<small>${ssrInterpolate(line.quantity)} × ${ssrInterpolate(__props.formatPrice(line.variant.b2bPrice))}</small></div><strong>${ssrInterpolate(__props.formatPrice(line.quantity * line.variant.b2bPrice))}</strong><button type="button"${ssrIncludeBooleanAttr(__props.busy) ? " disabled" : ""}${ssrRenderAttr("aria-label", `Убрать ${line.variant.sku} из корзины`)}>`);
				_push(ssrRenderComponent(unref(Trash2), { size: 16 }, null, _parent));
				_push(`</button></div>`);
			});
			_push(`<!--]-->`);
			if (unref(cartIssue)) _push(`<p class="business-cart-availability" role="status">${ssrInterpolate(unref(cartIssue))}</p>`);
			else _push(`<!---->`);
			if (unref(orphanedCartIds).length) _push(`<button type="button" class="business-text-control">Убрать недоступные позиции</button>`);
			else _push(`<!---->`);
			_push(`<footer><span>Итого<strong>${ssrInterpolate(__props.formatPrice(unref(total)))}</strong></span><button type="button" class="primary"${ssrIncludeBooleanAttr(__props.busy || !__props.canOrder || !unref(lines).length || !!unref(cartIssue)) ? " disabled" : ""}>Оформить заказ`);
			_push(ssrRenderComponent(unref(ArrowRight), { size: 17 }, null, _parent));
			_push(`</button><small>${ssrInterpolate(__props.canOrder ? "Перед подтверждением покажем состав и итоговую сумму." : "Создание заказа доступно сотруднику с правом закупок.")}</small></footer></aside></div>`);
		};
	}
});
// components/BusinessCatalog.vue
var _sfc_setup$6 = BusinessCatalog_vue_vue_type_script_setup_true_lang_default.setup;
BusinessCatalog_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/BusinessCatalog.vue");
	return _sfc_setup$6 ? _sfc_setup$6(props, ctx) : void 0;
};
var BusinessCatalog_default = Object.assign(BusinessCatalog_vue_vue_type_script_setup_true_lang_default, { __name: "BusinessCatalog" });
// components/BusinessOrders.vue?vue&type=script&setup=true&lang.ts
var BusinessOrders_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "BusinessOrders",
	__ssrInlineRender: true,
	props: {
		organizationId: {},
		busy: { type: Boolean },
		canOrder: { type: Boolean },
		canSeeFinance: { type: Boolean },
		formatPrice: { type: Function },
		statusLabels: {},
		fulfillment: { type: Function }
	},
	emits: ["repeat", "context"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const session = useB2BSession();
		const query = ref(""), status = ref(""), sort = ref("newest"), expanded = ref(""), page = ref(1);
		const orders = ref([]), total = ref(0), pageCount = ref(1), loading = ref(false), error = ref(""), legacyLimited = ref(false);
		const statuses = [
			"NEW",
			"CONFIRMED",
			"PAYMENT_WAITING",
			"PAID",
			"ASSEMBLING",
			"SHIPPED",
			"DELIVERED",
			"CANCELLED",
			"REFUNDED"
		];
		const hasFilters = computed(() => Boolean(query.value.trim() || status.value));
		let requestVersion = 0, timer;
		async function load() {
			if (!props.organizationId) return;
			const version = ++requestVersion, organizationId = props.organizationId, identity = session.generation.value;
			loading.value = true;
			error.value = "";
			try {
				const result = await session.request("/b2b/orders", { query: {
					page: page.value,
					search: query.value.trim() || void 0,
					status: status.value || void 0,
					sort: sort.value
				} });
				if (version !== requestVersion || organizationId !== props.organizationId || identity !== session.generation.value) return;
				if (Array.isArray(result)) {
					const filtered = result.filter((order) => (!status.value || order.status === status.value) && `${order.orderNumber} ${(order.items || []).map((item) => item.productName).join(" ")}`.toLocaleLowerCase("ru").includes(query.value.trim().toLocaleLowerCase("ru"))).sort((a, b) => (Date.parse(b.createdAt) - Date.parse(a.createdAt)) * (sort.value === "newest" ? 1 : -1));
					total.value = filtered.length;
					pageCount.value = Math.max(1, Math.ceil(filtered.length / 20));
					page.value = Math.min(page.value, pageCount.value);
					orders.value = filtered.slice((page.value - 1) * 20, page.value * 20);
					legacyLimited.value = result.length >= 100;
				} else {
					if (!result || !Array.isArray(result.items) || !Number.isSafeInteger(result.total) || !Number.isSafeInteger(result.page) || !Number.isSafeInteger(result.pages)) throw new Error("invalid response");
					orders.value = result.items;
					total.value = result.total;
					page.value = result.page;
					pageCount.value = result.pages;
					legacyLimited.value = false;
				}
			} catch (e) {
				if (version !== requestVersion || organizationId !== props.organizationId || identity !== session.generation.value) return;
				orders.value = [];
				total.value = 0;
				pageCount.value = 1;
				error.value = typeof e?.data?.message === "string" ? e.data.message : "Не удалось загрузить заказы. Проверьте подключение и повторите попытку.";
			} finally {
				if (version === requestVersion && organizationId === props.organizationId && identity === session.generation.value) loading.value = false;
			}
		}
		function schedule(delay = 0) {
			requestVersion++;
			clearTimeout(timer);
			page.value = 1;
			expanded.value = "";
			loading.value = true;
			timer = setTimeout(() => void load(), delay);
		}
		watch(query, () => schedule(250));
		watch([
			status,
			sort,
			() => props.organizationId
		], () => schedule(), { immediate: true });
		return (_ctx, _push, _parent, _attrs) => {
			const _component_NuxtLink = NuxtLink;
			_push(`<section${ssrRenderAttrs(mergeProps({
				class: "salon-services-panel business-orders-panel business-register-panel",
				"aria-label": "Ваши закупочные заказы"
			}, _attrs))}><div class="salon-services-filters"><label class="salon-services-search">`);
			_push(ssrRenderComponent(unref(Search), { size: 18 }, null, _parent));
			_push(`<input${ssrRenderAttr("value", unref(query))} type="search" placeholder="Номер заказа или товар" aria-label="Поиск закупочных заказов">`);
			if (unref(query)) {
				_push(`<button type="button" aria-label="Очистить поиск заказов">`);
				_push(ssrRenderComponent(unref(X), { size: 16 }, null, _parent));
				_push(`</button>`);
			} else _push(`<!---->`);
			_push(`</label><select aria-label="Статус закупочного заказа"><option value=""${ssrIncludeBooleanAttr(Array.isArray(unref(status)) ? ssrLooseContain(unref(status), "") : ssrLooseEqual(unref(status), "")) ? " selected" : ""}>Все статусы</option><!--[-->`);
			ssrRenderList(statuses, (value) => {
				_push(`<option${ssrRenderAttr("value", value)}${ssrIncludeBooleanAttr(Array.isArray(unref(status)) ? ssrLooseContain(unref(status), value) : ssrLooseEqual(unref(status), value)) ? " selected" : ""}>${ssrInterpolate(__props.statusLabels[value] || value)}</option>`);
			});
			_push(`<!--]--></select><select aria-label="Сортировка закупочных заказов"><option value="newest"${ssrIncludeBooleanAttr(Array.isArray(unref(sort)) ? ssrLooseContain(unref(sort), "newest") : ssrLooseEqual(unref(sort), "newest")) ? " selected" : ""}>Сначала новые</option><option value="oldest"${ssrIncludeBooleanAttr(Array.isArray(unref(sort)) ? ssrLooseContain(unref(sort), "oldest") : ssrLooseEqual(unref(sort), "oldest")) ? " selected" : ""}>Сначала старые</option></select></div><div class="business-results-summary"><span role="status" aria-live="polite">${ssrInterpolate(unref(loading) ? "Загружаем заказы…" : unref(error) ? "Заказы не загружены" : unref(hasFilters) ? `Найдено заказов: ${unref(total)}` : `Всего заказов: ${unref(total)}`)}</span>`);
			if (unref(hasFilters)) {
				_push(`<button type="button" class="business-text-control">Сбросить фильтры`);
				_push(ssrRenderComponent(unref(X), { size: 14 }, null, _parent));
				_push(`</button>`);
			} else if (unref(orders).length && !unref(loading)) _push(`<small>Нажмите на номер, чтобы посмотреть состав</small>`);
			else _push(`<!---->`);
			_push(`</div>`);
			if (unref(legacyLimited)) _push(`<p class="crm-inline-note">Сервер вернул только последние 100 заказов. Для полной истории обновите приложение.</p>`);
			else _push(`<!---->`);
			if (unref(error)) _push(`<div class="salon-services-empty" role="alert"><p>${ssrInterpolate(unref(error))}</p><button type="button">Повторить</button></div>`);
			else if (unref(orders).length && !unref(loading)) {
				_push(`<table class="salon-services-table business-orders-table" aria-label="Список закупочных заказов"><thead><tr><th scope="col">Заказ</th><th scope="col">Статус</th><th scope="col">Склад и передача</th>`);
				if (__props.canSeeFinance) _push(`<th scope="col" class="business-money-heading">Сумма</th>`);
				else _push(`<!---->`);
				_push(`<th scope="col"><span class="salon-services-sr-only">Действия</span></th></tr></thead><tbody><!--[-->`);
				ssrRenderList(unref(orders), (item) => {
					_push(`<!--[--><tr class="${ssrRenderClass([{ "is-expanded": unref(expanded) === item.id }, "salon-service-row business-order-row"])}"><th scope="row" class="salon-service-info"><button type="button" class="b2b-edit-link business-order-expand"${ssrRenderAttr("aria-expanded", unref(expanded) === item.id)}${ssrRenderAttr("aria-controls", `business-order-${item.id}`)}${ssrRenderAttr("aria-label", `Состав заказа ${item.orderNumber}`)}>${ssrInterpolate(item.orderNumber)}`);
					_push(ssrRenderComponent(unref(ChevronDown), { size: 15 }, null, _parent));
					_push(`</button><small>${ssrInterpolate(new Date(item.createdAt).toLocaleDateString("ru-RU"))} · Позиций: ${ssrInterpolate(item.items.length)}</small></th><td data-label="Статус"><span class="${ssrRenderClass([{
						"is-active": item.status === "DELIVERED",
						"is-cancelled": ["CANCELLED", "REFUNDED"].includes(item.status)
					}, "salon-service-status"])}"><i aria-hidden="true"></i>${ssrInterpolate(__props.statusLabels[item.status] || item.status)}</span></td><td data-label="Склад и передача"><span class="${ssrRenderClass({ "sync-error": item.warehouseStatus?.isCurrent && item.warehouseStatus?.stage === "NEEDS_ATTENTION" })}">${ssrInterpolate(__props.fulfillment(item))}</span>`);
					if (unref(customerWarehouseAsOf)(item.warehouseStatus)) _push(`<small>Подтверждено ${ssrInterpolate(unref(customerWarehouseAsOf)(item.warehouseStatus))}</small>`);
					else _push(`<!---->`);
					if (item.trackingNumber) _push(`<small>Трек: ${ssrInterpolate(item.trackingNumber)}</small>`);
					else _push(`<!---->`);
					_push(`</td>`);
					if (__props.canSeeFinance) _push(`<td data-label="Сумма" class="salon-client-spent"><strong>${ssrInterpolate(__props.formatPrice(item.finalAmount))}</strong></td>`);
					else _push(`<!---->`);
					_push(`<td class="business-order-actions"><button type="button"${ssrIncludeBooleanAttr(__props.busy || !__props.canOrder) ? " disabled" : ""}${ssrRenderAttr("aria-label", `Повторить заказ ${item.orderNumber}`)}>`);
					_push(ssrRenderComponent(unref(Repeat2), { size: 16 }, null, _parent));
					_push(`<span>Повторить</span></button></td></tr>`);
					if (unref(expanded) === item.id) {
						_push(`<tr${ssrRenderAttr("id", `business-order-${item.id}`)} class="business-order-details"><td${ssrRenderAttr("colspan", __props.canSeeFinance ? 5 : 4)}><div><h3>Состав заказа ${ssrInterpolate(item.orderNumber)}</h3><!--[-->`);
						ssrRenderList(item.items, (line, index) => {
							_push(`<div class="business-order-line"><span><strong>${ssrInterpolate(line.productName)}</strong><small>${ssrInterpolate(line.variantName || line.externalSku)}</small></span><span>${ssrInterpolate(line.quantity)} шт.</span>`);
							if (__props.canSeeFinance) _push(`<strong>${ssrInterpolate(__props.formatPrice(line.total))}</strong>`);
							else _push(`<!---->`);
							_push(`</div>`);
						});
						_push(`<!--]-->`);
						if (item.comments) _push(`<p class="business-order-comment">${ssrInterpolate(item.comments)}</p>`);
						else _push(`<!---->`);
						_push(`<small class="business-order-repeat-note">При повторе проверим актуальные цены и наличие. Передачу в 1С подтверждает настроенное подключение.</small></div></td></tr>`);
					} else _push(`<!---->`);
					_push(`<!--]-->`);
				});
				_push(`<!--]--></tbody></table>`);
			} else if (!unref(loading)) {
				_push(`<div class="salon-services-empty">`);
				_push(ssrRenderComponent(unref(PackageSearch), { size: 30 }, null, _parent));
				_push(`<h3>${ssrInterpolate(unref(hasFilters) ? "Заказы не найдены" : "Заказов пока нет")}</h3><p>${ssrInterpolate(unref(hasFilters) ? "Попробуйте другой номер, название товара или статус." : "Выберите товары в каталоге. После оформления здесь появятся состав и состояние заказа.")}</p>`);
				if (unref(hasFilters)) _push(`<button type="button">Показать все заказы</button>`);
				else _push(ssrRenderComponent(_component_NuxtLink, { to: "/b2b?section=catalog" }, {
					default: withCtx((_, _push, _parent, _scopeId) => {
						if (_push) _push(`Открыть каталог`);
						else return [createTextVNode("Открыть каталог")];
					}),
					_: 1
				}, _parent));
				_push(`</div>`);
			} else _push(`<!---->`);
			if (unref(pageCount) > 1 && !unref(error)) {
				_push(`<footer class="salon-services-total"><small>Показаны ${ssrInterpolate((unref(page) - 1) * 20 + 1)}–${ssrInterpolate(Math.min(unref(page) * 20, unref(total)))} из ${ssrInterpolate(unref(total))}</small><nav class="business-pagination" aria-label="Страницы заказов"><button type="button"${ssrIncludeBooleanAttr(unref(loading) || unref(page) === 1) ? " disabled" : ""} aria-label="Предыдущая страница заказов">`);
				_push(ssrRenderComponent(unref(ChevronLeft), { size: 17 }, null, _parent));
				_push(`</button><span aria-live="polite">${ssrInterpolate(unref(page))} из ${ssrInterpolate(unref(pageCount))}</span><button type="button"${ssrIncludeBooleanAttr(unref(loading) || unref(page) === unref(pageCount)) ? " disabled" : ""} aria-label="Следующая страница заказов">`);
				_push(ssrRenderComponent(unref(ChevronRight), { size: 17 }, null, _parent));
				_push(`</button></nav></footer>`);
			} else _push(`<!---->`);
			_push(`</section>`);
		};
	}
});
// components/BusinessOrders.vue
var _sfc_setup$5 = BusinessOrders_vue_vue_type_script_setup_true_lang_default.setup;
BusinessOrders_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/BusinessOrders.vue");
	return _sfc_setup$5 ? _sfc_setup$5(props, ctx) : void 0;
};
var BusinessOrders_default = Object.assign(BusinessOrders_vue_vue_type_script_setup_true_lang_default, { __name: "BusinessOrders" });
// components/SalonTeam.vue?vue&type=script&setup=true&lang.ts
var SalonTeam_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "SalonTeam",
	__ssrInlineRender: true,
	props: { profile: {} },
	emits: ["changed"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		useB2BSession();
		const query = ref(""), role = ref(""), data = ref(null), loading = ref(true), busy = ref(false), error = ref(""), notice = ref(""), localLink = ref("");
		const edit = ref(null), selected = ref(null), baseline = ref("");
		const form = reactive({
			email: "",
			role: "EMPLOYEE",
			canOrder: false,
			canSeeFinance: false,
			isActive: true,
			targetMemberId: "",
			currentPassword: "",
			confirmed: false,
			key: ""
		});
		const roles = {
			OWNER: "Владелец",
			EMPLOYEE: "Сотрудник",
			BUYER: "Закупщик",
			ACCOUNTANT: "Бухгалтер"
		};
		const members = computed(() => data.value?.members || props.profile.members || []), canManage = computed(() => data.value?.canManage === true);
		const name = (item) => [item.user.firstName, item.user.lastName].filter(Boolean).join(" ") || item.user.email || "Сотрудник";
		const filtered = computed(() => members.value.filter((item) => (!role.value || item.role === role.value) && `${name(item)} ${item.user.email || ""} ${item.user.phone || ""}`.toLocaleLowerCase("ru-RU").includes(query.value.trim().toLocaleLowerCase("ru-RU"))));
		const candidates = computed(() => members.value.filter((item) => item.isActive && item.id !== data.value?.currentMemberId));
		const dirty = computed(() => Boolean(edit.value) && JSON.stringify(form) !== baseline.value);
		function access(item) {
			return [
				["OWNER", "EMPLOYEE"].includes(item.role) ? "Запись и клиенты" : null,
				item.canOrder ? "Закупки" : null,
				item.canSeeFinance ? "Финансы" : null,
				item.role === "OWNER" ? "Настройки и команда" : null
			].filter(Boolean);
		}
		function close() {
			if (busy.value || dirty.value && !(void 0).confirm("Изменения команды не сохранены. Закрыть форму?")) return false;
			edit.value = null;
			form.currentPassword = "";
			return true;
		}
		useCatalogDialog(computed(() => Boolean(edit.value)), close);
		function leave() {
			return !busy.value && (!dirty.value || (void 0).confirm("Изменения команды не сохранены. Покинуть раздел?"));
		}
		onBeforeRouteLeave(leave);
		onBeforeRouteUpdate(leave);
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<!--[--><section class="salon-services-panel salon-team-panel" aria-label="Команда организации"><header class="salon-overview-heading"><div><h2>Команда</h2><p>Доступ к записям, закупкам и финансам для каждого сотрудника.</p></div>`);
			if (unref(canManage)) {
				_push(`<button type="button" class="primary"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}>`);
				_push(ssrRenderComponent(unref(UserPlus), { size: 18 }, null, _parent));
				_push(`Пригласить сотрудника</button>`);
			} else _push(`<!---->`);
			_push(`</header>`);
			if (unref(loading)) _push(`<p role="status">Загружаем команду…</p>`);
			else _push(`<!---->`);
			if (unref(error) && !unref(edit)) _push(`<p class="salon-settings-error" role="alert">${ssrInterpolate(unref(error))} <button type="button">Обновить команду</button></p>`);
			else _push(`<!---->`);
			if (unref(notice)) _push(`<p role="status">${ssrInterpolate(unref(notice))}</p>`);
			else _push(`<!---->`);
			if (unref(localLink)) {
				_push(`<div class="salon-settings-notes"><strong>Локальный режим: отправка писем отключена</strong><p>Передайте ссылку адресату приглашения. Она показывается один раз и действует 7 дней.</p><label>Ссылка приглашения<input${ssrRenderAttr("value", unref(localLink))} readonly></label><button type="button">`);
				_push(ssrRenderComponent(unref(Copy), { size: 16 }, null, _parent));
				_push(`Скопировать ссылку</button></div>`);
			} else _push(`<!---->`);
			_push(`<div class="salon-services-filters salon-team-filters"><label class="salon-services-search">`);
			_push(ssrRenderComponent(unref(Search), { size: 18 }, null, _parent));
			_push(`<input${ssrRenderAttr("value", unref(query))} type="search" placeholder="Имя, email или телефон" aria-label="Поиск сотрудников"></label><select aria-label="Роль сотрудника"><option value=""${ssrIncludeBooleanAttr(Array.isArray(unref(role)) ? ssrLooseContain(unref(role), "") : ssrLooseEqual(unref(role), "")) ? " selected" : ""}>Все роли</option><!--[-->`);
			ssrRenderList(roles, (label, value) => {
				_push(`<option${ssrRenderAttr("value", value)}${ssrIncludeBooleanAttr(Array.isArray(unref(role)) ? ssrLooseContain(unref(role), value) : ssrLooseEqual(unref(role), value)) ? " selected" : ""}>${ssrInterpolate(label)}</option>`);
			});
			_push(`<!--]--></select></div>`);
			if (unref(filtered).length) {
				_push(`<table class="salon-services-table salon-team-table" aria-label="Список сотрудников"><thead><tr><th scope="col">Сотрудник</th><th scope="col">Контакты</th><th scope="col">Роль</th><th scope="col">Доступы</th>`);
				if (unref(canManage)) _push(`<th scope="col">Действия</th>`);
				else _push(`<!---->`);
				_push(`</tr></thead><tbody><!--[-->`);
				ssrRenderList(unref(filtered), (item) => {
					_push(`<tr class="salon-service-row salon-team-row"><th scope="row" class="salon-service-info"><div><span class="salon-person-avatar" aria-hidden="true">${ssrInterpolate(name(item).slice(0, 1).toUpperCase())}</span><strong>${ssrInterpolate(name(item))}</strong></div>`);
					if (item.isActive === false) _push(`<small>Доступ отключён</small>`);
					else _push(`<!---->`);
					_push(`</th><td class="salon-person-contacts" data-label="Контакты">`);
					if (item.user.email) _push(`<a${ssrRenderAttr("href", `mailto:${item.user.email}`)}>${ssrInterpolate(item.user.email)}</a>`);
					else _push(`<!---->`);
					if (item.user.phone) _push(`<a${ssrRenderAttr("href", `tel:${item.user.phone.replace(/[^+\d]/g, "")}`)}>${ssrInterpolate(item.user.phone)}</a>`);
					else _push(`<!---->`);
					_push(`</td><td class="salon-team-role" data-label="Роль"><span class="${ssrRenderClass([{ "is-owner": item.role === "OWNER" }, "salon-service-status"])}">${ssrInterpolate(roles[item.role])}</span></td><td class="salon-team-access" data-label="Доступы"><div class="salon-client-tags"><!--[-->`);
					ssrRenderList(access(item), (label) => {
						_push(`<small>${ssrInterpolate(label)}</small>`);
					});
					_push(`<!--]-->`);
					if (!access(item).length) _push(`<small>Без расширенных доступов</small>`);
					else _push(`<!---->`);
					_push(`</div></td>`);
					if (unref(canManage)) {
						_push(`<td data-label="Действия">`);
						if (item.id !== unref(data).currentMemberId) {
							_push(`<button type="button"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}${ssrRenderAttr("aria-label", `Изменить доступ ${name(item)}`)}>`);
							_push(ssrRenderComponent(unref(Settings), { size: 16 }, null, _parent));
							_push(`Доступ</button>`);
						} else _push(`<small>Вы</small>`);
						_push(`</td>`);
					} else _push(`<!---->`);
					_push(`</tr>`);
				});
				_push(`<!--]--></tbody></table>`);
			} else if (!unref(loading)) {
				_push(`<div class="salon-services-empty">`);
				_push(ssrRenderComponent(unref(Users), { size: 24 }, null, _parent));
				_push(`<h3>Сотрудники не найдены</h3><p>Измените поиск или пригласите сотрудника.</p></div>`);
			} else _push(`<!---->`);
			if (unref(canManage) && unref(data)?.invitations?.length) {
				_push(`<section class="business-team-invitations"><h3>Приглашения</h3><!--[-->`);
				ssrRenderList(unref(data).invitations, (item) => {
					_push(`<article><div><strong>${ssrInterpolate(item.email)}</strong><small>${ssrInterpolate(roles[item.role])} · ${ssrInterpolate({
						PENDING: "Ожидает ответа",
						ACCEPTED: "Принято",
						REVOKED: "Отозвано",
						EXPIRED: "Срок истёк"
					}[item.status])}</small></div>`);
					if (item.status === "PENDING") _push(`<button type="button"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}${ssrRenderAttr("aria-label", `Отозвать приглашение ${item.email}`)}>Отозвать</button>`);
					else _push(`<!---->`);
					_push(`</article>`);
				});
				_push(`<!--]--></section>`);
			} else _push(`<!---->`);
			_push(`<footer class="salon-services-total"><small>Сотрудников: ${ssrInterpolate(unref(filtered).length)} из ${ssrInterpolate(unref(members).length)}</small>`);
			if (unref(canManage) && unref(candidates).length) {
				_push(`<button type="button"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}>`);
				_push(ssrRenderComponent(unref(ShieldCheck), { size: 16 }, null, _parent));
				_push(`Передать управление</button>`);
			} else _push(`<!---->`);
			_push(`</footer></section>`);
			ssrRenderTeleport(_push, (_push) => {
				if (unref(edit)) {
					_push(`<div class="business-team-backdrop"><section class="business-team-dialog admin-dialog" role="dialog" aria-modal="true" aria-labelledby="business-team-title" tabindex="-1"><header><h2 id="business-team-title">${ssrInterpolate(unref(edit) === "invite" ? "Пригласить сотрудника" : unref(edit) === "transfer" ? "Передать управление" : `Доступ: ${name(unref(selected))}`)}</h2><button type="button"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""} aria-label="Закрыть форму команды">`);
					_push(ssrRenderComponent(unref(X), { size: 20 }, null, _parent));
					_push(`</button></header><form>`);
					if (unref(edit) !== "transfer") {
						_push(`<!--[-->`);
						if (unref(edit) === "invite") _push(`<label>Email сотрудника<input${ssrRenderAttr("value", unref(form).email)} type="email" maxlength="254" required${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}></label>`);
						else _push(`<!---->`);
						_push(`<label>Роль<select aria-label="Роль"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}><option value="EMPLOYEE"${ssrIncludeBooleanAttr(Array.isArray(unref(form).role) ? ssrLooseContain(unref(form).role, "EMPLOYEE") : ssrLooseEqual(unref(form).role, "EMPLOYEE")) ? " selected" : ""}>Сотрудник — записи и клиенты салона</option><option value="BUYER"${ssrIncludeBooleanAttr(Array.isArray(unref(form).role) ? ssrLooseContain(unref(form).role, "BUYER") : ssrLooseEqual(unref(form).role, "BUYER")) ? " selected" : ""}>Закупщик — каталог и заказы</option><option value="ACCOUNTANT"${ssrIncludeBooleanAttr(Array.isArray(unref(form).role) ? ssrLooseContain(unref(form).role, "ACCOUNTANT") : ssrLooseEqual(unref(form).role, "ACCOUNTANT")) ? " selected" : ""}>Бухгалтер — заказы и документы</option></select></label><label class="business-team-check"><input${ssrIncludeBooleanAttr(Array.isArray(unref(form).canOrder) ? ssrLooseContain(unref(form).canOrder, null) : unref(form).canOrder) ? " checked" : ""} type="checkbox"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}>Разрешить оформление закупок</label><label class="business-team-check"><input${ssrIncludeBooleanAttr(Array.isArray(unref(form).canSeeFinance) ? ssrLooseContain(unref(form).canSeeFinance, null) : unref(form).canSeeFinance) ? " checked" : ""} type="checkbox"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}>Разрешить просмотр финансов</label>`);
						if (unref(edit) === "member") _push(`<label class="business-team-check"><input${ssrIncludeBooleanAttr(Array.isArray(unref(form).isActive) ? ssrLooseContain(unref(form).isActive, null) : unref(form).isActive) ? " checked" : ""} type="checkbox"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}>Доступ сотрудника включён</label>`);
						else _push(`<!---->`);
						_push(`<p>Доступ к настройкам и управлению командой остаётся у владельца. Отключение доступа сохраняет записи клиентов и историю.</p><!--]-->`);
					} else {
						_push(`<!--[--><p>Новый владелец получит настройки компании, команду, закупки и финансы. Вы останетесь сотрудником салона; доступ к закупкам и финансам будет отключён.</p><label>Новый владелец<select aria-label="Новый владелец" required${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}><option value="" disabled${ssrIncludeBooleanAttr(Array.isArray(unref(form).targetMemberId) ? ssrLooseContain(unref(form).targetMemberId, "") : ssrLooseEqual(unref(form).targetMemberId, "")) ? " selected" : ""}>Выберите сотрудника</option><!--[-->`);
						ssrRenderList(unref(candidates), (item) => {
							_push(`<option${ssrRenderAttr("value", item.id)}${ssrIncludeBooleanAttr(Array.isArray(unref(form).targetMemberId) ? ssrLooseContain(unref(form).targetMemberId, item.id) : ssrLooseEqual(unref(form).targetMemberId, item.id)) ? " selected" : ""}>${ssrInterpolate(name(item))}</option>`);
						});
						_push(`<!--]--></select></label><label>Ваш текущий пароль<input${ssrRenderAttr("value", unref(form).currentPassword)} type="password" autocomplete="current-password" required maxlength="128"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}></label><label class="business-team-check"><input${ssrIncludeBooleanAttr(Array.isArray(unref(form).confirmed) ? ssrLooseContain(unref(form).confirmed, null) : unref(form).confirmed) ? " checked" : ""} type="checkbox" required${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}>Подтверждаю передачу управления и изменение моего доступа</label><!--]-->`);
					}
					if (unref(error)) _push(`<p role="alert" class="salon-settings-error">${ssrInterpolate(unref(error))}</p>`);
					else _push(`<!---->`);
					_push(`<footer><button type="button"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}>Отмена</button><button type="submit" class="primary"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}>${ssrInterpolate(unref(busy) ? "Сохраняем…" : unref(edit) === "invite" ? "Отправить приглашение" : unref(edit) === "transfer" ? "Передать управление" : "Сохранить доступ")}</button></footer></form></section></div>`);
				} else _push(`<!---->`);
			}, "body", false, _parent);
			_push(`<!--]-->`);
		};
	}
});
// components/SalonTeam.vue
var _sfc_setup$4 = SalonTeam_vue_vue_type_script_setup_true_lang_default.setup;
SalonTeam_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/SalonTeam.vue");
	return _sfc_setup$4 ? _sfc_setup$4(props, ctx) : void 0;
};
var SalonTeam_default = Object.assign(SalonTeam_vue_vue_type_script_setup_true_lang_default, { __name: "SalonTeam" });
// components/SalonPresentationSettings.vue?vue&type=script&setup=true&lang.ts
var SalonPresentationSettings_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "SalonPresentationSettings",
	__ssrInlineRender: true,
	props: { profile: {} },
	setup(__props, { expose: __expose }) {
		const props = __props;
		const config = useRuntimeConfig(), session = useB2BSession(), branding = useState("salon-branding", () => null);
		const draft = reactive({
			displayName: "",
			address: "",
			phones: [],
			emails: [],
			socialLinks: []
		});
		const loading = ref(true), busy = ref(false), error = ref(""), notice = ref(""), baseline = ref(""), logo = ref("");
		const logoFailed = ref(false), logoRetry = ref(0);
		const canEdit = computed(() => props.profile.membership?.role === "OWNER");
		const dirty = computed(() => !!baseline.value && JSON.stringify(draft) !== baseline.value);
		const logoSrc = computed(() => {
			if (!logo.value) return "";
			const url = new URL(logo.value, config.public.apiBase);
			if (logoRetry.value) url.searchParams.set("preview", String(logoRetry.value));
			return url.toString();
		});
		watch(logo, () => {
			logoFailed.value = false;
			logoRetry.value = 0;
		});
		const request = (path, options = {}) => session.request(path, options);
		function apply(value) {
			for (const key of Object.keys(draft)) if (value[key] !== void 0) draft[key] = value[key];
			logo.value = value.logoUrl || "";
			branding.value = value;
			baseline.value = JSON.stringify(draft);
		}
		async function load() {
			loading.value = true;
			error.value = "";
			try {
				apply(await request("/b2b/salon-presentation"));
			} catch {
				error.value = "Не удалось загрузить оформление салона.";
			} finally {
				loading.value = false;
			}
		}
		function leave() {
			return !busy.value && (!dirty.value || (void 0).confirm("Оформление салона не сохранено. Покинуть раздел?"));
		}
		async function refresh() {
			if (busy.value || loading.value) return;
			if (dirty.value && !(void 0).confirm("Отменить несохранённое оформление?")) return;
			await load();
		}
		__expose({ refresh });
		onBeforeRouteLeave(leave);
		onBeforeRouteUpdate(leave);
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<form${ssrRenderAttrs(mergeProps({
				class: "salon-settings-panel salon-presentation-settings",
				"aria-label": "Оформление салона"
			}, _attrs))}><header class="salon-settings-heading"><h2>Ваш салон: оформление и контакты</h2><small>Общие данные для кабинета, страницы и виджета записи. Часы работы задаются в расписании выше.</small></header>`);
			if (unref(error)) {
				_push(`<p role="alert">${ssrInterpolate(unref(error))} `);
				if (!unref(baseline)) _push(`<button type="button">Повторить</button>`);
				else _push(`<!---->`);
				_push(`</p>`);
			} else _push(`<!---->`);
			if (unref(loading)) _push(`<p role="status">Загружаем оформление…</p>`);
			else if (unref(baseline)) {
				_push(`<fieldset class="ui-fieldset-reset"${ssrIncludeBooleanAttr(unref(busy) || !unref(canEdit)) ? " disabled" : ""}><div class="salon-logo-editor"><div class="salon-logo-preview">`);
				if (unref(logoSrc) && !unref(logoFailed)) _push(`<img${ssrRenderAttr("src", unref(logoSrc))} alt="Логотип салона">`);
				else _push(ssrRenderComponent(unref(ImagePlus), { size: 28 }, null, _parent));
				_push(`</div><div><strong>Логотип салона</strong><small>PNG, JPG или WEBP · до 3 МБ. Изображение сохраняется сразу.</small>`);
				if (unref(logoFailed)) _push(`<p role="alert">Логотип сохранён, но картинка не загрузилась. <button type="button">Повторить загрузку логотипа</button></p>`);
				else _push(`<!---->`);
				_push(`<div class="salon-logo-actions"><label class="salon-upload-control">Загрузить логотип<input type="file" accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp" aria-label="Загрузить логотип салона"></label>`);
				if (unref(logo)) {
					_push(`<button type="button" aria-label="Удалить логотип салона">`);
					_push(ssrRenderComponent(unref(Trash2), { size: 16 }, null, _parent));
					_push(`</button>`);
				} else _push(`<!---->`);
				_push(`</div></div></div><div class="salon-settings-fields"><label>Название для клиентов<input${ssrRenderAttr("value", unref(draft).displayName)} maxlength="120"${ssrRenderAttr("placeholder", __props.profile.name)} aria-label="Название салона для клиентов"></label><label>Адрес салона<input${ssrRenderAttr("value", unref(draft).address)} maxlength="500" placeholder="Город, улица, дом" aria-label="Адрес салона"></label></div><div class="salon-contact-columns"><!--[-->`);
				ssrRenderList(["phones", "emails"], (kind) => {
					_push(`<section class="salon-settings-group"><h3>${ssrInterpolate(kind === "phones" ? "Телефоны" : "Электронная почта")}</h3><!--[-->`);
					ssrRenderList(unref(draft)[kind], (_, i) => {
						_push(`<div class="salon-contact-row"><input${ssrRenderDynamicModel(kind === "phones" ? "tel" : "email", unref(draft)[kind][i], null)}${ssrRenderAttr("type", kind === "phones" ? "tel" : "email")} required${ssrRenderAttr("maxlength", kind === "phones" ? 40 : 254)}${ssrRenderAttr("aria-label", `${kind === "phones" ? "Телефон" : "Email"} салона ${i + 1}`)}><button type="button"${ssrRenderAttr("aria-label", `Удалить ${kind === "phones" ? "телефон" : "email"} ${i + 1}`)}>`);
						_push(ssrRenderComponent(unref(Trash2), { size: 16 }, null, _parent));
						_push(`</button></div>`);
					});
					_push(`<!--]-->`);
					if (unref(draft)[kind].length < 5) {
						_push(`<button type="button">`);
						_push(ssrRenderComponent(unref(Plus), { size: 16 }, null, _parent));
						_push(`${ssrInterpolate(kind === "phones" ? "Добавить телефон" : "Добавить email")}</button>`);
					} else _push(`<!---->`);
					_push(`</section>`);
				});
				_push(`<!--]--></div><section class="salon-settings-group"><h3>Социальные сети</h3><!--[-->`);
				ssrRenderList(unref(draft).socialLinks, (link, i) => {
					_push(`<div class="salon-contact-row salon-social-row"><input${ssrRenderAttr("value", link.label)} maxlength="40" required placeholder="Название"${ssrRenderAttr("aria-label", `Название соцсети ${i + 1}`)}><input${ssrRenderAttr("value", link.url)} type="url" pattern="https://.*" maxlength="500" required placeholder="https://…"${ssrRenderAttr("aria-label", `Ссылка соцсети ${i + 1}`)}><button type="button"${ssrRenderAttr("aria-label", `Удалить соцсеть ${i + 1}`)}>`);
					_push(ssrRenderComponent(unref(Trash2), { size: 16 }, null, _parent));
					_push(`</button></div>`);
				});
				_push(`<!--]-->`);
				if (unref(draft).socialLinks.length < 8) {
					_push(`<button type="button">`);
					_push(ssrRenderComponent(unref(Plus), { size: 16 }, null, _parent));
					_push(`Добавить соцсеть</button>`);
				} else _push(`<!---->`);
				_push(`</section></fieldset>`);
			} else _push(`<!---->`);
			if (unref(baseline)) {
				_push(`<footer class="salon-settings-save"><span role="status">${ssrInterpolate(unref(notice) || (unref(dirty) ? "Есть несохранённые изменения" : "Все изменения сохранены"))}</span>`);
				if (unref(canEdit)) {
					_push(`<button type="submit" class="primary"${ssrIncludeBooleanAttr(unref(busy) || !unref(dirty)) ? " disabled" : ""}>`);
					_push(ssrRenderComponent(unref(Save), { size: 16 }, null, _parent));
					_push(`Сохранить оформление</button>`);
				} else _push(`<small>Изменять оформление может владелец.</small>`);
				_push(`</footer>`);
			} else _push(`<!---->`);
			_push(`</form>`);
		};
	}
});
// components/SalonPresentationSettings.vue
var _sfc_setup$3 = SalonPresentationSettings_vue_vue_type_script_setup_true_lang_default.setup;
SalonPresentationSettings_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/SalonPresentationSettings.vue");
	return _sfc_setup$3 ? _sfc_setup$3(props, ctx) : void 0;
};
var SalonPresentationSettings_default = Object.assign(SalonPresentationSettings_vue_vue_type_script_setup_true_lang_default, { __name: "SalonPresentationSettings" });
// composables/useUserProfilePanel.ts
function useUserProfilePanel() {
	const isOpen = useState("user-profile-panel-open", () => false);
	const openProfile = () => {
		isOpen.value = true;
	};
	const closeProfile = () => {
		isOpen.value = false;
	};
	return {
		isOpen,
		openProfile,
		closeProfile
	};
}
// components/BusinessSettings.vue?vue&type=script&setup=true&lang.ts
var BusinessSettings_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "BusinessSettings",
	__ssrInlineRender: true,
	props: {
		profile: {},
		area: {}
	},
	setup(__props, { expose: __expose }) {
		const props = __props;
		const session = useB2BSession(); useUserProfilePanel();
		const draft = reactive({
			name: props.profile.name || "",
			legalName: props.profile.legalName || "",
			legalAddress: props.profile.legalAddress || ""
		});
		const baseline = ref(JSON.stringify(draft)), busy = ref(false), error = ref(""), notice = ref("");
		const canEdit = computed(() => props.profile.membership?.role === "OWNER"), dirty = computed(() => baseline.value !== JSON.stringify(draft));
		const presentationPanel = ref(null), schedulePanel = ref(null);
		async function refresh() {
			if (busy.value || !leave()) return;
			busy.value = true;
			error.value = "";
			try {
				const value = await session.request("/b2b/profile");
				Object.assign(draft, {
					name: value.name || "",
					legalName: value.legalName || "",
					legalAddress: value.legalAddress || ""
				});
				baseline.value = JSON.stringify(draft);
			} catch {
				error.value = "Не удалось обновить данные компании.";
			} finally {
				busy.value = false;
			}
			await presentationPanel.value?.refresh();
			await schedulePanel.value?.refresh();
		}
		__expose({ refresh });
		function leave() {
			return !busy.value && (!dirty.value || (void 0).confirm("Данные компании не сохранены. Покинуть раздел?"));
		}
		onBeforeRouteLeave(leave);
		onBeforeRouteUpdate(leave);
		return (_ctx, _push, _parent, _attrs) => {
			const _component_SalonPresentationSettings = SalonPresentationSettings_default;
			const _component_SalonOnlineBookingSettings = SalonOnlineBookingSettings_default;
			_push(`<div${ssrRenderAttrs(mergeProps({ class: "business-settings" }, _attrs))}><nav class="business-settings-jumps" aria-label="Разделы настроек"><a href="#business-company">Организация</a><a href="#business-personal">Мой профиль</a>`);
			if (__props.area === "salon") _push(`<!--[--><a href="#business-presentation">Страница салона</a><a href="#business-schedule">Расписание</a><!--]-->`);
			else _push(`<!---->`);
			_push(`</nav><form id="business-company" class="salon-settings-panel business-company-settings"><header class="salon-settings-heading"><h2>Данные организации</h2><small>ИНН, статус, скидки и финансовые условия изменяются через вашего менеджера.</small></header>`);
			if (unref(error)) _push(`<p role="alert">${ssrInterpolate(unref(error))}</p>`);
			else _push(`<!---->`);
			_push(`<fieldset class="ui-fieldset-reset"${ssrIncludeBooleanAttr(unref(busy) || !unref(canEdit)) ? " disabled" : ""}><div class="salon-settings-fields"><label>Название компании<input${ssrRenderAttr("value", unref(draft).name)} required maxlength="120"></label><label>Юридическое название<input${ssrRenderAttr("value", unref(draft).legalName)} maxlength="250"></label><label class="salon-settings-wide">Юридический адрес<input${ssrRenderAttr("value", unref(draft).legalAddress)} maxlength="500"></label><label>ИНН<input${ssrRenderAttr("value", __props.profile.inn || "Не указан")} readonly></label><label>КПП<input${ssrRenderAttr("value", __props.profile.kpp || "Не указан")} readonly></label></div></fieldset><footer class="salon-settings-save"><span role="status">${ssrInterpolate(unref(notice) || (unref(dirty) ? "Есть несохранённые изменения" : "Все изменения сохранены"))}</span>`);
			if (unref(canEdit)) {
				_push(`<button class="primary" type="submit"${ssrIncludeBooleanAttr(unref(busy) || !unref(dirty)) ? " disabled" : ""}>`);
				_push(ssrRenderComponent(unref(Save), { size: 16 }, null, _parent));
				_push(`Сохранить компанию</button>`);
			} else _push(`<small>Изменять данные может владелец.</small>`);
			_push(`</footer></form><section id="business-personal" class="salon-settings-panel business-personal-settings"><div><h2>Личная учётная запись</h2><p>Имя, контакты, пароль и уведомления вашего профиля.</p></div><button type="button">`);
			_push(ssrRenderComponent(unref(UserRound), { size: 16 }, null, _parent));
			_push(`Открыть мой профиль</button></section>`);
			if (__props.area === "salon") {
				_push(`<!--[--><div id="business-presentation">`);
				_push(ssrRenderComponent(_component_SalonPresentationSettings, {
					ref_key: "presentationPanel",
					ref: presentationPanel,
					profile: __props.profile
				}, null, _parent));
				_push(`</div><div id="business-schedule">`);
				_push(ssrRenderComponent(_component_SalonOnlineBookingSettings, {
					ref_key: "schedulePanel",
					ref: schedulePanel,
					profile: __props.profile,
					"schedule-only": ""
				}, null, _parent));
				_push(`</div><!--]-->`);
			} else _push(`<!---->`);
			_push(`</div>`);
		};
	}
});
// components/BusinessSettings.vue
var _sfc_setup$2 = BusinessSettings_vue_vue_type_script_setup_true_lang_default.setup;
BusinessSettings_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/BusinessSettings.vue");
	return _sfc_setup$2 ? _sfc_setup$2(props, ctx) : void 0;
};
var BusinessSettings_default = Object.assign(BusinessSettings_vue_vue_type_script_setup_true_lang_default, { __name: "BusinessSettings" });
// components/SalonBookingHistory.vue?vue&type=script&setup=true&lang.ts
var SalonBookingHistory_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "SalonBookingHistory",
	__ssrInlineRender: true,
	props: {
		bookingId: {},
		timeZone: {},
		members: {}
	},
	setup(__props) {
		const props = __props;
		const session = useB2BSession(), rows = ref([]), busy = ref(false), error = ref("");
		let controller;
		const actions = {
			CREATED: "Запись создана",
			MOVED: "Запись перенесена",
			STATUS_CHANGED: "Статус изменён",
			COMPLETED: "Визит завершён",
			UPDATED: "Комментарий изменён",
			BASELINE: "Состояние при обновлении системы"
		};
		const statuses = {
			NEW: "Новая",
			CONFIRMED: "Подтверждена",
			COMPLETED: "Завершена",
			CANCELLED: "Отменена",
			NO_SHOW: "Не пришёл"
		};
		const date = (value) => new Date(value).toLocaleString("ru-RU", {
			timeZone: props.timeZone,
			day: "numeric",
			month: "short",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit"
		});
		const master = (id) => {
			const member = props.members.find((item) => item.id === id);
			return id ? member ? [member.user?.firstName, member.user?.lastName].filter(Boolean).join(" ") || "Мастер" : "Мастер отключён" : "Не назначен";
		};
		function changes(row) {
			const before = row.before, after = row.after, result = [];
			if (!before) {
				result.push(`${date(after.startTime)} · ${statuses[after.status] || after.status}`);
				if (after.priceSnapshot !== null && after.priceSnapshot !== void 0) result.push(`Стоимость визита: ${new Intl.NumberFormat("ru-RU", {
					style: "currency",
					currency: "RUB"
				}).format(Number(after.priceSnapshot))}`);
				return result;
			}
			if (before.startTime !== after.startTime) result.push(`Время: ${date(before.startTime)} → ${date(after.startTime)}`);
			if (before.masterMemberId !== after.masterMemberId) result.push(`Мастер: ${master(before.masterMemberId)} → ${master(after.masterMemberId)}`);
			if (before.status !== after.status) result.push(`Статус: ${statuses[before.status] || before.status} → ${statuses[after.status] || after.status}`);
			if (before.notes !== after.notes) result.push(after.notes ? `Комментарий: ${after.notes}` : "Комментарий удалён");
			return result;
		}
		async function load() {
			controller?.abort();
			const current = new AbortController();
			controller = current;
			busy.value = true;
			error.value = "";
			try {
				const result = await session.request(`/b2b/bookings/${props.bookingId}/history`, {
					signal: current.signal,
					timeout: 2e4
				});
				if (controller === current) rows.value = result;
			} catch (e) {
				if (!current.signal.aborted) error.value = typeof e.data?.message === "string" ? e.data.message : "Не удалось загрузить историю записи.";
			} finally {
				if (controller === current) busy.value = false;
			}
		}
		watch(() => props.bookingId, () => {
			rows.value = [];
			load();
		}, { immediate: true });
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<section${ssrRenderAttrs(mergeProps({
				class: "salon-booking-history",
				"aria-label": "История записи"
			}, _attrs))}><header><h3>`);
			_push(ssrRenderComponent(unref(History), { size: 18 }, null, _parent));
			_push(`История записи</h3><button type="button"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""} aria-label="Обновить историю записи">`);
			_push(ssrRenderComponent(unref(RefreshCw), { size: 16 }, null, _parent));
			_push(`</button></header>`);
			if (unref(busy)) _push(`<p role="status">Загружаем историю…</p>`);
			else if (unref(error)) _push(`<p role="alert">${ssrInterpolate(unref(error))}</p>`);
			else if (!unref(rows).length) _push(`<p>Изменений пока нет.</p>`);
			else {
				_push(`<ol><!--[-->`);
				ssrRenderList(unref(rows), (row) => {
					_push(`<li><strong>${ssrInterpolate(actions[row.action] || "Запись изменена")}</strong><small>${ssrInterpolate(row.actorLabel)} · ${ssrInterpolate(date(row.createdAt))}</small><!--[-->`);
					ssrRenderList(changes(row), (line) => {
						_push(`<p>${ssrInterpolate(line)}</p>`);
					});
					_push(`<!--]--></li>`);
				});
				_push(`<!--]--></ol>`);
			}
			_push(`</section>`);
		};
	}
});
// components/SalonBookingHistory.vue
var _sfc_setup$1 = SalonBookingHistory_vue_vue_type_script_setup_true_lang_default.setup;
SalonBookingHistory_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/SalonBookingHistory.vue");
	return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
var SalonBookingHistory_default = Object.assign(SalonBookingHistory_vue_vue_type_script_setup_true_lang_default, { __name: "SalonBookingHistory" });
// pages/b2b.vue?vue&type=script&setup=true&lang.ts
var b2b_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "b2b",
	__ssrInlineRender: true,
	setup(__props) {
		const route = useRoute();
		const { canUseSalon, area } = useBusinessWorkspace();
		const router = useRouter();
		const session = useB2BSession();
		const businessSigningOut = useState("b2b-signing-out", () => false);
		const { openContextMenu, copyText } = useContextMenu();
		const profile = ref(null), dashboard = ref({}), clients = ref([]), services = ref([]), bookings = ref([]), catalog = ref([]), orders = ref([]), tickets = ref([]);
		const salonBranding = useState("salon-branding", () => null);
		const loading = ref(true), error = ref(""), notice = ref(""), dialog = ref("");
		const search = ref("");
		const onlineSettingsPanel = ref(null);
		const companySettingsPanel = ref(null);
		const cart = reactive({});
		const pendingCheckout = ref(null);
		const pendingRepeats = ref({});
		const draft = reactive({});
		const { actionBusy: saving, runOperation } = useWorkspaceOperation(error);
		const portalReady = ref(false), draftBaseline = ref(""), calendarMode = ref("day"), calendarAnchor = ref(/* @__PURE__ */ new Date());
		const bookingSettings = ref({ timeZone: "Europe/Moscow" });
		const calendarDay = computed(() => salonDay(calendarAnchor.value, bookingSettings.value.timeZone));
		const dialogDirty = computed(() => Boolean(dialog.value) && JSON.stringify(draft) !== draftBaseline.value);
		ref({});
		const calendarRange = computed(() => {
			const zone = bookingSettings.value.timeZone;
			const day = calendarDay.value;
			const period = salonCalendarPeriod(day, calendarMode.value);
			return {
				from: salonInstant(period.fromDay, 0, zone),
				to: salonInstant(period.toDay, 0, zone)
			};
		});
		computed(() => calendarMode.value === "month" ? calendarAnchor.value.toLocaleDateString("ru-RU", {
			month: "long",
			year: "numeric",
			timeZone: bookingSettings.value.timeZone
		}) : `${calendarRange.value.from.toLocaleDateString("ru-RU", { timeZone: bookingSettings.value.timeZone })} — ${(/* @__PURE__ */ new Date(calendarRange.value.to.getTime() - 1)).toLocaleDateString("ru-RU", { timeZone: bookingSettings.value.timeZone })}`);
		function openCalendarDay(day) {
			calendarAnchor.value = salonInstant(day, 720, bookingSettings.value.timeZone);
			calendarMode.value = "day";
		}
		let loadVersion = 0;
		let loadController;
		let loadedOrganizationId = "";
		const section = computed(() => String(route.query.section || "dashboard"));
		computed(() => ({ Authorization: `Bearer ${session.token.value}` }));
		const titles = {
			dashboard: [
				"ЦЕНТР УПРАВЛЕНИЯ",
				"Обзор бизнеса",
				"Главное о салоне, клиентах, записи и закупках"
			],
			calendar: [
				"РАБОЧИЙ КАЛЕНДАРЬ",
				"Записи",
				"Расписание клиентов и загрузка команды"
			],
			clients: [
				"КЛИЕНТСКАЯ БАЗА",
				"Мои клиенты",
				"История посещений, контакты и заметки"
			],
			services: [
				"ПРАЙС-ЛИСТ",
				"Услуги и цены",
				"Продолжительность, стоимость и доступность услуг"
			],
			catalog: [
				"ПАРТНЁРСКИЙ КАТАЛОГ",
				"Закупить товары",
				"Персональные B2B-цены и актуальные остатки 1С"
			],
			orders: [
				"ИСТОРИЯ ЗАКУПОК",
				"Мои заказы",
				"Статусы, состав и быстрый повтор заказа"
			],
			team: [
				"ОРГАНИЗАЦИЯ",
				"Команда",
				"Сотрудники и права в кабинете"
			],
			support: [
				"ПОМОЩЬ БИЗНЕСУ",
				"Поддержка",
				"Обращения к команде Sarkisian и контроль ответов"
			]
		};
		const currentTitle = computed(() => titles[section.value] || titles.dashboard);
		const money = (v) => v === null ? "—" : new Intl.NumberFormat("ru-RU", {
			style: "currency",
			currency: "RUB",
			maximumFractionDigits: 0
		}).format(Number(v || 0));
		const statusLabels = {
			NEW: "Новая",
			CONFIRMED: "Подтверждена",
			COMPLETED: "Завершена",
			CANCELLED: "Отменена",
			NO_SHOW: "Не пришёл",
			PAYMENT_WAITING: "Ожидает оплаты",
			PAID: "Оплачен",
			ASSEMBLING: "Собирается",
			SHIPPED: "Отправлен",
			DELIVERED: "Доставлен",
			REFUNDED: "Возврат",
			OPEN: "В работе",
			WAITING_REQUESTER: "Ожидает ответа",
			WAITING_CUSTOMER: "Ждём ответ",
			WAITING_INTERNAL: "На уточнении",
			RESOLVED: "Решена",
			CLOSED: "Закрыта"
		};
		titles.purchases = [
			"ОПТОВЫЕ ЗАКУПКИ",
			"Обзор закупок",
			"Заказы, условия компании и поставки SARKISIAN"
		];
		titles.dashboard = [
			"САЛОН",
			"Обзор салона",
			"Запись, клиенты и загрузка команды"
		];
		titles["online-booking"] = [
			"САЛОН",
			"Онлайн-запись",
			"Публичная страница и виджет записи"
		];
		titles.settings = [
			"НАСТРОЙКИ",
			"Настройки",
			"Данные организации и личного кабинета"
		];
		function fulfillmentLabel(item) {
			return customerWarehouseLabel(item.warehouseStatus);
		}
		const cartLines = computed(() => catalog.value.flatMap((p) => p.variants.filter((v) => cart[v.id]).map((v) => ({
			product: p,
			variant: v,
			quantity: cart[v.id]
		}))));
		const cartTotal = computed(() => cartLines.value.reduce((s, l) => s + l.variant.b2bPrice * l.quantity, 0));
		const cartAvailabilityIssue = computed(() => {
			const ids = new Set(cartLines.value.map((line) => line.variant.id));
			if (Object.keys(cart).some((id) => cart[id] > 0 && !ids.has(id))) return "Некоторые позиции больше недоступны. Обновите корзину в каталоге.";
			return cartAvailabilityProblem(cartLines.value);
		});
		async function api(path, options = {}) {
			return session.request(path, options);
		}
		async function load() {
			if (!portalReady.value || !session.token.value) return;
			const version = ++loadVersion, identity = session.generation.value;
			loadController?.abort();
			const controller = new AbortController();
			loadController = controller;
			loading.value = true;
			error.value = "";
			const sectionSources = {
				dashboard: ["dashboard"],
				purchases: ["dashboard", "orders"],
				clients: ["clients"],
				services: ["services"],
				calendar: [
					"clients",
					"services",
					"bookings",
					"booking-settings"
				],
				catalog: ["catalog"],
				orders: [],
				team: [],
				support: ["support"],
				"online-booking": [],
				settings: []
			};
			const sources = ["profile", ...sectionSources[section.value] || sectionSources.dashboard];
			try {
				await session.loadOrganizations();
				if (version !== loadVersion || session.generation.value !== identity) return;
				const requestedOrganization = typeof route.query.organization === "string" ? route.query.organization : "";
				if (requestedOrganization && !session.organizations.value.some((item) => item.id === requestedOrganization)) {
					session.selectOrganization("");
					throw { data: { message: "Выбранная организация недоступна. Выберите другую организацию в верхней панели." } };
				}
				if (requestedOrganization && requestedOrganization !== session.selectedOrganizationId.value) session.selectOrganization(requestedOrganization);
				if (!session.selectedOrganizationId.value) throw { data: { message: session.organizations.value.length ? "Выберите организацию в верхней панели кабинета." : "Для вашей учётной записи нет доступных организаций. Обратитесь в поддержку." } };
				if (loadedOrganizationId !== session.selectedOrganizationId.value) {
					loadedOrganizationId = session.selectedOrganizationId.value;
					profile.value = null;
					dashboard.value = {};
					clients.value = [];
					services.value = [];
					bookings.value = [];
					catalog.value = [];
					orders.value = [];
					tickets.value = [];
					Object.keys(cart).forEach((key) => delete cart[key]);
					pendingCheckout.value = null;
					pendingRepeats.value = {};
					resetDialog();
					salonBranding.value = null;
					search.value = "";
					bookingSettings.value = { timeZone: "Europe/Moscow" };
				}
				const company = await api("/b2b/profile", {
					signal: controller.signal,
					timeout: 2e4
				});
				if (version !== loadVersion || session.generation.value !== identity) return;
				salonBranding.value = company.presentation || null;
				canUseSalon.value = company.capabilities?.salon ?? ["OWNER", "EMPLOYEE"].includes(company.membership?.role);
				if (!canUseSalon.value && [
					"dashboard",
					"calendar",
					"clients",
					"services",
					"online-booking"
				].includes(section.value)) {
					profile.value = company;
					await router.replace("/b2b?section=purchases");
					return;
				}
				if (section.value === "calendar") bookingSettings.value = await api("/b2b/booking-settings", {
					signal: controller.signal,
					timeout: 2e4
				});
				const result = await Promise.all(sources.map((source) => source === "profile" ? Promise.resolve(company) : source === "booking-settings" ? Promise.resolve(bookingSettings.value) : api("/b2b/" + source, {
					signal: controller.signal,
					timeout: 2e4,
					...source === "bookings" ? { query: {
						from: calendarRange.value.from.toISOString(),
						to: calendarRange.value.to.toISOString()
					} } : {}
				})));
				if (version !== loadVersion || session.generation.value !== identity) return;
				const targets = {
					profile,
					dashboard,
					clients,
					services,
					bookings,
					catalog,
					orders,
					support: tickets,
					"booking-settings": bookingSettings
				};
				sources.forEach((source, index) => targets[source].value = result[index]);
			} catch (e) {
				if (version === loadVersion && !controller.signal.aborted) error.value = typeof e?.data?.message === "string" ? e.data.message : "Не удалось загрузить раздел кабинета. Повторите попытку.";
			} finally {
				if (version === loadVersion) loading.value = false;
			}
		}
		function flash(value) {
			notice.value = value;
			setTimeout(() => notice.value = "", 2500);
		}
		function resetDialog() {
			dialog.value = "";
			draftBaseline.value = "";
			bookingConflict.value = false;
		}
		function close() {
			if (saving.value) return false;
			if (dialogDirty.value && !(void 0).confirm("Закрыть форму без сохранения изменений?")) return false;
			resetDialog();
			return true;
		}
		function open(type, value = {}) {
			if (!close()) return;
			Object.keys(draft).forEach((key) => delete draft[key]);
			Object.assign(draft, JSON.parse(JSON.stringify(value)));
			draftBaseline.value = JSON.stringify(draft);
			dialog.value = type;
			error.value = "";
		}
		useCatalogDialog(computed(() => Boolean(dialog.value)), close);
		onBeforeRouteLeave(() => !session.token.value || !saving.value && (!dialogDirty.value || (void 0).confirm("Есть несохранённые изменения. Покинуть кабинет?")));
		onBeforeRouteUpdate((to) => {
			if (saving.value) return false;
			if (to.query.organization && to.query.organization !== session.selectedOrganizationId.value && cartLines.value.length && !(void 0).confirm("При смене организации корзина будет очищена. Переключить организацию?")) return false;
			if (dialogDirty.value && !(void 0).confirm("Есть несохранённые изменения. Перейти в другой раздел?")) return false;
			resetDialog();
			return true;
		});
		watch(section, () => {
			search.value = "";
			load();
		});
		watch(() => route.query.organization, () => {
			if (portalReady.value) load();
		});
		watch([calendarMode, calendarAnchor], () => {
			if (section.value === "calendar") load();
		});
		function openCalendarBooking(value) {
			const zone = bookingSettings.value.timeZone;
			const instant = new Date(value.startTime);
			const minute = salonMinute(instant.toISOString(), zone);
			open("booking", {
				...value,
				originalStart: value.startTime,
				originalStatus: value.status,
				startTime: `${salonDay(instant, zone)}T${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`
			});
		}
		const bookingConflict = ref(false);
		async function moveCalendarBooking(value) {
			if (saving.value || !(void 0).confirm("Перенести запись на выбранное время?")) return;
			await runOperation(async () => {
				await api(`/b2b/bookings/${value.booking.id}`, {
					method: "PATCH",
					body: {
						version: value.booking.version,
						startTime: value.startTime,
						masterMemberId: value.masterMemberId
					}
				});
				await load();
				flash("Запись перенесена");
			});
		}
		async function repeatOrder(item) {
			if (!profile.value?.membership?.canOrder || saving.value) return;
			if (!(void 0).confirm("Создать новый заказ из этих позиций по актуальным ценам и остаткам?")) return;
			await runOperation(async () => {
				pendingRepeats.value[item.id] ||= requestKey();
				await api(`/b2b/orders/${item.id}/repeat`, {
					method: "POST",
					body: { requestKey: pendingRepeats.value[item.id] }
				});
				await load();
				delete pendingRepeats.value[item.id];
				flash("Повторный заказ создан");
			});
		}
		function clientMenu(e, item) {
			openContextMenu(e, `${item.firstName} ${item.lastName || ""}`, [
				{
					label: "Редактировать клиента",
					icon: "open",
					action: () => open("client", {
						...item,
						tags: (item.tags || []).join(", "),
						personalDataConsent: Boolean(item.consentPersonalDataAt)
					})
				},
				{
					label: "Создать запись",
					icon: "open",
					action: () => open("booking", { clientId: item.id })
				},
				{
					label: "Копировать телефон",
					icon: "copy",
					action: () => copyText(item.phone || "", "Телефон скопирован")
				}
			], item.phone || item.email || "Клиент");
		}
		function orderMenu(e, item) {
			openContextMenu(e, item.orderNumber, [{
				label: "Повторить заказ",
				icon: "copy",
				action: () => repeatOrder(item)
			}, {
				label: "Копировать номер",
				icon: "copy",
				action: () => copyText(item.orderNumber, "Номер заказа скопирован")
			}], statusLabels[item.status] || item.status);
		}
		watch(() => session.token.value, (value, previous) => {
			if (!previous || value || !portalReady.value) return;
			portalReady.value = false;
			++loadVersion;
			loadController?.abort();
			resetDialog();
			profile.value = null;
			dashboard.value = {};
			clients.value = [];
			services.value = [];
			bookings.value = [];
			catalog.value = [];
			orders.value = [];
			tickets.value = [];
			Object.keys(cart).forEach((key) => delete cart[key]);
			pendingCheckout.value = null;
			pendingRepeats.value = {};
			salonBranding.value = null;
			loading.value = false;
			error.value = "Сессия завершена. Войдите в бизнес-аккаунт снова.";
			if (!businessSigningOut.value) navigateTo({
				path: "/b2b-login",
				query: { redirect: route.fullPath }
			});
		});
		return (_ctx, _push, _parent, _attrs) => {
			const _component_NuxtLink = NuxtLink;
			const _component_SalonDashboard = SalonDashboard_default;
			const _component_SalonClients = SalonClients_default;
			const _component_SalonCalendar = SalonCalendar_default;
			const _component_SalonOnlineBookingSettings = SalonOnlineBookingSettings_default;
			const _component_BusinessPurchasesDashboard = BusinessPurchasesDashboard_default;
			const _component_SalonServices = SalonServices_default;
			const _component_BusinessCatalog = BusinessCatalog_default;
			const _component_BusinessOrders = BusinessOrders_default;
			const _component_SalonTeam = SalonTeam_default;
			const _component_BusinessSettings = BusinessSettings_default;
			const _component_SalonBookingHistory = SalonBookingHistory_default;
			_push(`<main${ssrRenderAttrs(mergeProps({
				"data-v-ui-5c3d2dc5697c": "",
				class: "portal"
			}, _attrs))}><header data-v-ui-5c3d2dc5697c class="top"><div data-v-ui-5c3d2dc5697c><h1 data-v-ui-5c3d2dc5697c>${ssrInterpolate(unref(currentTitle)[1])}</h1><span data-v-ui-5c3d2dc5697c>${ssrInterpolate(unref(currentTitle)[2])}</span></div><div data-v-ui-5c3d2dc5697c class="top-actions"><button data-v-ui-5c3d2dc5697c type="button"${ssrIncludeBooleanAttr(unref(loading) || unref(saving) || unref(onlineSettingsPanel)?.busy || unref(onlineSettingsPanel)?.loading) ? " disabled" : ""}>`);
			_push(ssrRenderComponent(unref(RefreshCw), {
				"data-v-ui-5c3d2dc5697c": "",
				size: 15
			}, null, _parent));
			_push(`Обновить</button>`);
			if (unref(section) === "clients") {
				_push(`<button data-v-ui-5c3d2dc5697c class="primary">`);
				_push(ssrRenderComponent(unref(UserPlus), {
					"data-v-ui-5c3d2dc5697c": "",
					size: 15
				}, null, _parent));
				_push(`Новый клиент</button>`);
			} else if (unref(section) === "calendar") {
				_push(`<button data-v-ui-5c3d2dc5697c class="primary">`);
				_push(ssrRenderComponent(unref(Plus), {
					"data-v-ui-5c3d2dc5697c": "",
					size: 15
				}, null, _parent));
				_push(`Новая запись</button>`);
			} else if (unref(section) === "services") {
				_push(`<button data-v-ui-5c3d2dc5697c class="primary">`);
				_push(ssrRenderComponent(unref(Plus), {
					"data-v-ui-5c3d2dc5697c": "",
					size: 15
				}, null, _parent));
				_push(`Новая услуга</button>`);
			} else if (unref(section) === "support") {
				_push(`<button data-v-ui-5c3d2dc5697c class="primary">`);
				_push(ssrRenderComponent(unref(Plus), {
					"data-v-ui-5c3d2dc5697c": "",
					size: 15
				}, null, _parent));
				_push(`Обращение</button>`);
			} else if (unref(section) === "catalog") {
				_push(`<button data-v-ui-5c3d2dc5697c class="primary">`);
				_push(ssrRenderComponent(unref(ShoppingBag), {
					"data-v-ui-5c3d2dc5697c": "",
					size: 15
				}, null, _parent));
				_push(`Корзина · ${ssrInterpolate(unref(cartLines).length)}</button>`);
			} else _push(`<!---->`);
			_push(`</div></header>`);
			if (unref(loading)) _push(`<div data-v-ui-5c3d2dc5697c class="loading"> Загружаем рабочее пространство… </div>`);
			else if (unref(error) && !unref(dialog)) {
				_push(`<div data-v-ui-5c3d2dc5697c class="page-error" role="alert"><span>`);
				_push(ssrRenderComponent(unref(CircleAlert), { size: 16 }, null, _parent));
				_push(`${ssrInterpolate(unref(error))}</span><button type="button" class="b2b-retry">`);
				_push(ssrRenderComponent(unref(RefreshCw), { size: 16 }, null, _parent));
				_push(`Повторить загрузку </button></div>`);
			} else {
				_push(`<section data-v-ui-5c3d2dc5697c class="body">`);
				if ([
					"purchases",
					"catalog",
					"orders"
				].includes(unref(section)) && unref(profile)?.capabilities?.purchaseRestriction) {
					_push(`<div class="salon-settings-notes" role="status"><p>${ssrInterpolate(unref(profile).capabilities.purchaseRestriction)}</p>`);
					_push(ssrRenderComponent(_component_NuxtLink, { to: "/b2b?section=support&area=purchases" }, {
						default: withCtx((_, _push, _parent, _scopeId) => {
							if (_push) _push(`Связаться с поддержкой`);
							else return [createTextVNode("Связаться с поддержкой")];
						}),
						_: 1
					}, _parent));
					_push(`</div>`);
				} else _push(`<!---->`);
				if (unref(section) === "dashboard") _push(ssrRenderComponent(_component_SalonDashboard, {
					dashboard: unref(dashboard),
					profile: unref(profile)
				}, null, _parent));
				else if (unref(section) === "clients") _push(ssrRenderComponent(_component_SalonClients, {
					clients: unref(clients),
					"can-see-finance": Boolean(unref(profile).membership?.canSeeFinance),
					"format-price": money,
					onContext: clientMenu,
					onEdit: ($event) => open("client", {
						...$event,
						tags: ($event.tags || []).join(", "),
						personalDataConsent: Boolean($event.consentPersonalDataAt)
					})
				}, null, _parent));
				else if (unref(section) === "calendar") {
					_push(`<!--[--><div class="salon-calendar-tools"><button type="button" aria-label="Предыдущий период">`);
					_push(ssrRenderComponent(unref(ChevronLeft), { size: 16 }, null, _parent));
					_push(`</button><input type="date"${ssrRenderAttr("value", unref(calendarDay))} aria-label="Дата календаря"><button type="button" aria-label="Следующий период">`);
					_push(ssrRenderComponent(unref(ChevronRight), { size: 16 }, null, _parent));
					_push(`</button><button type="button"> Сегодня </button><div class="salon-calendar-modes"><!--[-->`);
					ssrRenderList([
						{
							id: "day",
							label: "День"
						},
						{
							id: "week",
							label: "Неделя"
						},
						{
							id: "month",
							label: "Месяц"
						},
						{
							id: "list",
							label: "Список"
						}
					], (mode) => {
						_push(`<button type="button" class="${ssrRenderClass({ active: unref(calendarMode) === mode.id })}"${ssrRenderAttr("aria-pressed", unref(calendarMode) === mode.id)}>${ssrInterpolate(mode.label)}</button>`);
					});
					_push(`<!--]--></div></div>`);
					_push(ssrRenderComponent(_component_SalonCalendar, {
						bookings: unref(bookings),
						members: unref(profile).members,
						day: unref(calendarDay),
						mode: unref(calendarMode),
						"time-zone": unref(bookingSettings).timeZone,
						busy: unref(saving),
						settings: unref(bookingSettings),
						onCreate: openCalendarBooking,
						onEdit: openCalendarBooking,
						onMove: moveCalendarBooking,
						onSelectDay: openCalendarDay
					}, null, _parent));
					_push(`<!--]-->`);
				} else if (unref(section) === "online-booking") _push(ssrRenderComponent(_component_SalonOnlineBookingSettings, {
					ref_key: "onlineSettingsPanel",
					ref: onlineSettingsPanel,
					profile: unref(profile)
				}, null, _parent));
				else if (unref(section) === "purchases") _push(ssrRenderComponent(_component_BusinessPurchasesDashboard, {
					profile: unref(profile),
					dashboard: unref(dashboard),
					orders: unref(orders),
					"format-price": money,
					"status-labels": statusLabels,
					fulfillment: fulfillmentLabel
				}, null, _parent));
				else if (unref(section) === "services") _push(ssrRenderComponent(_component_SalonServices, {
					services: unref(services),
					"format-price": money,
					onEdit: ($event) => open("service", $event)
				}, null, _parent));
				else if (unref(section) === "catalog") _push(ssrRenderComponent(_component_BusinessCatalog, {
					products: unref(catalog),
					cart: unref(cart),
					"can-order": Boolean(unref(profile).membership?.canOrder),
					busy: unref(saving),
					"format-price": money,
					onQuantity: (id, value) => unref(cart)[id] = value,
					onCheckout: ($event) => open("cart")
				}, null, _parent));
				else if (unref(section) === "orders") _push(ssrRenderComponent(_component_BusinessOrders, {
					"organization-id": unref(session).selectedOrganizationId.value || "",
					"can-order": Boolean(unref(profile).membership?.canOrder),
					"can-see-finance": Boolean(unref(profile).membership?.canSeeFinance),
					busy: unref(saving),
					"format-price": money,
					"status-labels": statusLabels,
					fulfillment: fulfillmentLabel,
					onRepeat: repeatOrder,
					onContext: orderMenu
				}, null, _parent));
				else if (unref(section) === "team") _push(ssrRenderComponent(_component_SalonTeam, {
					profile: unref(profile),
					onChanged: ($event) => {
						load();
						flash($event);
					}
				}, null, _parent));
				else if (unref(section) === "settings") _push(ssrRenderComponent(_component_BusinessSettings, {
					ref_key: "companySettingsPanel",
					ref: companySettingsPanel,
					profile: unref(profile),
					area: unref(area)
				}, null, _parent));
				else if (unref(section) === "support") {
					_push(`<article data-v-ui-5c3d2dc5697c class="panel list-panel"><header data-v-ui-5c3d2dc5697c><div data-v-ui-5c3d2dc5697c><p data-v-ui-5c3d2dc5697c>МОИ ОБРАЩЕНИЯ</p><h3 data-v-ui-5c3d2dc5697c>${ssrInterpolate(unref(tickets).length)} заявок</h3></div></header><div data-v-ui-5c3d2dc5697c class="table tickets"><div data-v-ui-5c3d2dc5697c class="row labels"><span data-v-ui-5c3d2dc5697c>Номер</span><span data-v-ui-5c3d2dc5697c>Тема</span><span data-v-ui-5c3d2dc5697c>Приоритет</span><span data-v-ui-5c3d2dc5697c>Статус</span><span data-v-ui-5c3d2dc5697c>Создано</span></div><!--[-->`);
					ssrRenderList(unref(tickets), (item) => {
						_push(`<div data-v-ui-5c3d2dc5697c class="row"><b data-v-ui-5c3d2dc5697c>${ssrInterpolate(item.number)}</b><span data-v-ui-5c3d2dc5697c>${ssrInterpolate(item.subject)}</span><span data-v-ui-5c3d2dc5697c>${ssrInterpolate(item.priority === "CRITICAL" ? "Критичный" : item.priority === "HIGH" ? "Высокий" : item.priority === "LOW" ? "Низкий" : "Обычный")}</span><em data-v-ui-5c3d2dc5697c>${ssrInterpolate(statusLabels[item.status] || item.status)}</em><span data-v-ui-5c3d2dc5697c>${ssrInterpolate(new Date(item.createdAt).toLocaleDateString("ru-RU"))}</span></div>`);
					});
					_push(`<!--]-->`);
					if (!unref(tickets).length) _push(`<div data-v-ui-5c3d2dc5697c class="empty"> Обращений пока нет. </div>`);
					else _push(`<!---->`);
					_push(`</div></article>`);
				} else _push(`<!---->`);
				_push(`</section>`);
			}
			if (unref(dialog)) {
				_push(`<div data-v-ui-5c3d2dc5697c class="backdrop admin-dialog-backdrop"><form data-v-ui-5c3d2dc5697c class="drawer admin-dialog admin-dialog--drawer" role="dialog" aria-modal="true" tabindex="-1"><header data-v-ui-5c3d2dc5697c><div data-v-ui-5c3d2dc5697c><p data-v-ui-5c3d2dc5697c>${ssrInterpolate(unref(dialog) === "client" ? "КЛИЕНТСКАЯ БАЗА" : unref(dialog) === "service" ? "ПРАЙС-ЛИСТ" : unref(dialog) === "booking" ? "КАЛЕНДАРЬ" : unref(dialog) === "support" ? "HELPDESK" : "ЗАКУПКА")}</p><h2 data-v-ui-5c3d2dc5697c>${ssrInterpolate(unref(dialog) === "client" ? unref(draft).id ? "Карточка клиента" : "Новый клиент" : unref(dialog) === "service" ? unref(draft).id ? "Карточка услуги" : "Новая услуга" : unref(dialog) === "booking" ? unref(draft).id ? "Карточка записи" : "Новая запись" : unref(dialog) === "support" ? "Новое обращение" : "Подтверждение заказа")}</h2></div><button data-v-ui-5c3d2dc5697c type="button"${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""}>`);
				_push(ssrRenderComponent(unref(X), {
					"data-v-ui-5c3d2dc5697c": "",
					size: 18,
					"aria-hidden": "true"
				}, null, _parent));
				_push(`<span class="b2b-visually-hidden">Закрыть форму</span></button></header><div data-v-ui-5c3d2dc5697c class="drawer-body admin-dialog-body"><fieldset data-v-ui-5c3d2dc5697c class="ui-fieldset-reset"${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""}>`);
				if (unref(dialog) === "client") _push(`<!--[--><div data-v-ui-5c3d2dc5697c class="two"><label data-v-ui-5c3d2dc5697c>Имя<input data-v-ui-5c3d2dc5697c${ssrRenderAttr("value", unref(draft).firstName)} required></label><label data-v-ui-5c3d2dc5697c>Фамилия<input data-v-ui-5c3d2dc5697c${ssrRenderAttr("value", unref(draft).lastName)}></label></div><label data-v-ui-5c3d2dc5697c>Телефон<input data-v-ui-5c3d2dc5697c${ssrRenderAttr("value", unref(draft).phone)} placeholder="+7 900 000-00-00"></label><label data-v-ui-5c3d2dc5697c>Email<input data-v-ui-5c3d2dc5697c${ssrRenderAttr("value", unref(draft).email)} type="email"></label><label data-v-ui-5c3d2dc5697c>Теги через запятую<input data-v-ui-5c3d2dc5697c${ssrRenderAttr("value", unref(draft).tags)} placeholder="VIP, маникюр"></label><label data-v-ui-5c3d2dc5697c>Заметки<textarea data-v-ui-5c3d2dc5697c rows="4">${ssrInterpolate(unref(draft).notes)}</textarea></label><label data-v-ui-5c3d2dc5697c class="check"><input data-v-ui-5c3d2dc5697c${ssrIncludeBooleanAttr(Array.isArray(unref(draft).personalDataConsent) ? ssrLooseContain(unref(draft).personalDataConsent, null) : unref(draft).personalDataConsent) ? " checked" : ""} type="checkbox"><span data-v-ui-5c3d2dc5697c><b data-v-ui-5c3d2dc5697c>Согласие на обработку данных получено</b><small data-v-ui-5c3d2dc5697c>Зафиксировать согласие клиента в карточке</small></span></label><!--]-->`);
				else if (unref(dialog) === "service") {
					_push(`<!--[--><label data-v-ui-5c3d2dc5697c>Название<input data-v-ui-5c3d2dc5697c${ssrRenderAttr("value", unref(draft).name)} required></label><label data-v-ui-5c3d2dc5697c>Описание<textarea data-v-ui-5c3d2dc5697c rows="4">${ssrInterpolate(unref(draft).description)}</textarea></label><div data-v-ui-5c3d2dc5697c class="two"><label data-v-ui-5c3d2dc5697c>Длительность, минут<input data-v-ui-5c3d2dc5697c${ssrRenderAttr("value", unref(draft).duration)} type="number" min="10" required></label><label data-v-ui-5c3d2dc5697c>Цена, ₽<input data-v-ui-5c3d2dc5697c${ssrRenderAttr("value", unref(draft).price)} type="number" min="0" required></label></div><label data-v-ui-5c3d2dc5697c>Цвет в календаре<input data-v-ui-5c3d2dc5697c${ssrRenderAttr("value", unref(draft).color)} type="color"></label>`);
					if (unref(draft).id) _push(`<label class="check"><input${ssrIncludeBooleanAttr(Array.isArray(unref(draft).isActive) ? ssrLooseContain(unref(draft).isActive, null) : unref(draft).isActive) ? " checked" : ""} type="checkbox">Услуга доступна для записи</label>`);
					else _push(`<!---->`);
					_push(`<!--]-->`);
				} else if (unref(dialog) === "booking") {
					_push(`<!--[--><label>Клиент<select aria-label="Клиент" required${ssrIncludeBooleanAttr(Boolean(unref(draft).id)) ? " disabled" : ""}><option value="" disabled${ssrIncludeBooleanAttr(Array.isArray(unref(draft).clientId) ? ssrLooseContain(unref(draft).clientId, "") : ssrLooseEqual(unref(draft).clientId, "")) ? " selected" : ""}>Выберите клиента</option><!--[-->`);
					ssrRenderList(unref(clients), (item) => {
						_push(`<option${ssrRenderAttr("value", item.id)}${ssrIncludeBooleanAttr(Array.isArray(unref(draft).clientId) ? ssrLooseContain(unref(draft).clientId, item.id) : ssrLooseEqual(unref(draft).clientId, item.id)) ? " selected" : ""}>${ssrInterpolate(item.firstName)} ${ssrInterpolate(item.lastName)}</option>`);
					});
					_push(`<!--]--></select></label><label>Услуга<select aria-label="Услуга" required${ssrIncludeBooleanAttr(Boolean(unref(draft).id)) ? " disabled" : ""}><option value="" disabled${ssrIncludeBooleanAttr(Array.isArray(unref(draft).serviceId) ? ssrLooseContain(unref(draft).serviceId, "") : ssrLooseEqual(unref(draft).serviceId, "")) ? " selected" : ""}>Выберите услугу</option><!--[-->`);
					ssrRenderList(unref(services).filter((x) => x.isActive || x.id === unref(draft).serviceId), (item) => {
						_push(`<option${ssrRenderAttr("value", item.id)}${ssrIncludeBooleanAttr(Array.isArray(unref(draft).serviceId) ? ssrLooseContain(unref(draft).serviceId, item.id) : ssrLooseEqual(unref(draft).serviceId, item.id)) ? " selected" : ""}>${ssrInterpolate(item.name)} · ${ssrInterpolate(item.duration)} мин. </option>`);
					});
					_push(`<!--]--></select></label><label>Мастер<select aria-label="Мастер"${ssrIncludeBooleanAttr(unref(draft).originalStatus === "COMPLETED") ? " disabled" : ""}><option value=""${ssrIncludeBooleanAttr(Array.isArray(unref(draft).masterMemberId) ? ssrLooseContain(unref(draft).masterMemberId, "") : ssrLooseEqual(unref(draft).masterMemberId, "")) ? " selected" : ""}>Не назначать</option>`);
					if (unref(draft).masterMemberId && !unref(profile).members.some((item) => item.id === unref(draft).masterMemberId && unref(salonMasterAvailable)(item))) _push(`<option${ssrRenderAttr("value", unref(draft).masterMemberId)} disabled${ssrIncludeBooleanAttr(Array.isArray(unref(draft).masterMemberId) ? ssrLooseContain(unref(draft).masterMemberId, unref(draft).masterMemberId) : ssrLooseEqual(unref(draft).masterMemberId, unref(draft).masterMemberId)) ? " selected" : ""}>Мастер недоступен</option>`);
					else _push(`<!---->`);
					_push(`<!--[-->`);
					ssrRenderList(unref(profile).members.filter(unref(salonMasterAvailable)), (item) => {
						_push(`<option${ssrRenderAttr("value", item.id)}${ssrIncludeBooleanAttr(Array.isArray(unref(draft).masterMemberId) ? ssrLooseContain(unref(draft).masterMemberId, item.id) : ssrLooseEqual(unref(draft).masterMemberId, item.id)) ? " selected" : ""}>${ssrInterpolate(item.user.firstName)} ${ssrInterpolate(item.user.lastName)}</option>`);
					});
					_push(`<!--]--></select></label><label>Дата и время салона<input${ssrRenderAttr("value", unref(draft).startTime)} type="datetime-local" required${ssrIncludeBooleanAttr(unref(draft).originalStatus === "COMPLETED") ? " disabled" : ""}></label>`);
					if (unref(draft).id) {
						_push(`<label>Статус<select${ssrIncludeBooleanAttr(unref(draft).originalStatus === "COMPLETED") ? " disabled" : ""}><!--[-->`);
						ssrRenderList([
							"NEW",
							"CONFIRMED",
							"COMPLETED",
							"CANCELLED",
							"NO_SHOW"
						], (status) => {
							_push(`<option${ssrRenderAttr("value", status)}${ssrIncludeBooleanAttr(Array.isArray(unref(draft).status) ? ssrLooseContain(unref(draft).status, status) : ssrLooseEqual(unref(draft).status, status)) ? " selected" : ""}>${ssrInterpolate(statusLabels[status])}</option>`);
						});
						_push(`<!--]--></select></label>`);
					} else _push(`<!---->`);
					_push(`<label>Комментарий<textarea rows="3">${ssrInterpolate(unref(draft).notes)}</textarea></label>`);
					if (unref(bookingConflict)) _push(`<p role="alert" class="salon-booking-conflict">Запись изменилась. Проверьте актуальные данные перед сохранением. <button type="button">Обновить данные записи</button></p>`);
					else _push(`<!---->`);
					if (unref(draft).id) _push(ssrRenderComponent(_component_SalonBookingHistory, {
						"booking-id": unref(draft).id,
						"time-zone": unref(bookingSettings).timeZone,
						members: unref(profile).members
					}, null, _parent));
					else _push(`<!---->`);
					_push(`<!--]-->`);
				} else if (unref(dialog) === "support") _push(`<!--[--><label data-v-ui-5c3d2dc5697c>Тема<input data-v-ui-5c3d2dc5697c${ssrRenderAttr("value", unref(draft).subject)} required></label><label data-v-ui-5c3d2dc5697c>Приоритет<select data-v-ui-5c3d2dc5697c><option data-v-ui-5c3d2dc5697c value="LOW"${ssrIncludeBooleanAttr(Array.isArray(unref(draft).priority) ? ssrLooseContain(unref(draft).priority, "LOW") : ssrLooseEqual(unref(draft).priority, "LOW")) ? " selected" : ""}>Низкий</option><option data-v-ui-5c3d2dc5697c value="MEDIUM"${ssrIncludeBooleanAttr(Array.isArray(unref(draft).priority) ? ssrLooseContain(unref(draft).priority, "MEDIUM") : ssrLooseEqual(unref(draft).priority, "MEDIUM")) ? " selected" : ""}>Обычный</option><option data-v-ui-5c3d2dc5697c value="HIGH"${ssrIncludeBooleanAttr(Array.isArray(unref(draft).priority) ? ssrLooseContain(unref(draft).priority, "HIGH") : ssrLooseEqual(unref(draft).priority, "HIGH")) ? " selected" : ""}>Высокий</option><option data-v-ui-5c3d2dc5697c value="CRITICAL"${ssrIncludeBooleanAttr(Array.isArray(unref(draft).priority) ? ssrLooseContain(unref(draft).priority, "CRITICAL") : ssrLooseEqual(unref(draft).priority, "CRITICAL")) ? " selected" : ""}> Критичный </option></select></label><label data-v-ui-5c3d2dc5697c>Опишите вопрос<textarea data-v-ui-5c3d2dc5697c rows="7" required>${ssrInterpolate(unref(draft).description)}</textarea></label><!--]-->`);
				else if (!unref(cartLines).length) {
					_push(`<div class="b2b-empty-cart" role="status">`);
					_push(ssrRenderComponent(unref(ShoppingBag), {
						size: 28,
						"aria-hidden": "true"
					}, null, _parent));
					_push(`<h3>Корзина пока пуста</h3><p>Добавьте товары из каталога, чтобы увидеть состав и итоговую сумму заказа.</p><button type="button">Перейти в каталог</button></div>`);
				} else {
					_push(`<!--[--><div data-v-ui-5c3d2dc5697c class="checkout-lines"><!--[-->`);
					ssrRenderList(unref(cartLines), (line) => {
						_push(`<div data-v-ui-5c3d2dc5697c><span data-v-ui-5c3d2dc5697c>${ssrInterpolate(line.product.nameRu)}<small data-v-ui-5c3d2dc5697c>${ssrInterpolate(line.quantity)} шт.</small></span><b data-v-ui-5c3d2dc5697c>${ssrInterpolate(money(line.quantity * line.variant.b2bPrice))}</b></div>`);
					});
					_push(`<!--]--></div>`);
					if (unref(cartAvailabilityIssue)) _push(`<p class="form-error" role="status">${ssrInterpolate(unref(cartAvailabilityIssue))}</p>`);
					else _push(`<!---->`);
					_push(`<div data-v-ui-5c3d2dc5697c class="checkout-total"><span data-v-ui-5c3d2dc5697c>К оплате</span><b data-v-ui-5c3d2dc5697c>${ssrInterpolate(money(unref(cartTotal)))}</b></div><p data-v-ui-5c3d2dc5697c class="checkout-note"> Заказ появится в системе обработки закупок. Передача в 1С зависит от настроенного подключения; её статус будет виден в заказе. </p><!--]-->`);
				}
				_push(`</fieldset>`);
				if (unref(error)) _push(`<p data-v-ui-5c3d2dc5697c class="form-error" role="alert">${ssrInterpolate(unref(error))}</p>`);
				else _push(`<!---->`);
				_push(`</div><footer data-v-ui-5c3d2dc5697c><button data-v-ui-5c3d2dc5697c type="button"${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""}> Отмена</button><button data-v-ui-5c3d2dc5697c class="primary"${ssrIncludeBooleanAttr(unref(saving) || unref(dialog) === "cart" && (!unref(cartLines).length || !unref(profile)?.membership?.canOrder || !!unref(cartAvailabilityIssue))) ? " disabled" : ""}>${ssrInterpolate(unref(saving) ? "Сохраняем…" : unref(dialog) === "cart" ? "Оформить заказ" : "Сохранить")}</button></footer></form></div>`);
			} else _push(`<!---->`);
			if (unref(notice)) _push(`<div data-v-ui-5c3d2dc5697c class="toast" role="status" aria-live="polite">${ssrInterpolate(unref(notice))}</div>`);
			else _push(`<!---->`);
			_push(`</main>`);
		};
	}
});
// pages/b2b.vue
var _sfc_setup = b2b_vue_vue_type_script_setup_true_lang_default.setup;
b2b_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/b2b.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var b2b_default = b2b_vue_vue_type_script_setup_true_lang_default;

export { b2b_default as default };;globalThis.__timing__.logEnd('Load chunks/build/b2b-CAZmyvp6');
//# sourceMappingURL=b2b-CAZmyvp6.mjs.map
