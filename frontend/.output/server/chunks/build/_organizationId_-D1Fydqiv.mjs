globalThis.__timing__.logStart('Load chunks/build/_organizationId_-D1Fydqiv');import { c as useRoute, u as useHead, f as useRuntimeConfig, $ as $fetch$1 } from '../virtual/entry.mjs';
import { defineComponent, mergeProps, unref, ref, computed, watch, nextTick, useSSRContext } from 'vue';
import { ssrRenderComponent, ssrRenderAttrs, ssrRenderAttr, ssrRenderClass, ssrInterpolate, ssrRenderList, ssrIncludeBooleanAttr, ssrLooseContain, ssrLooseEqual } from 'vue/server-renderer';
import { Check, ArrowRight, ArrowLeft, CalendarCheck } from '@lucide/vue';
import { s as shiftSalonDay } from '../_/salon-calendar.mjs';
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
import 'vue-router';

// components/SalonBookingForm.vue?vue&type=script&setup=true&lang.ts
var SalonBookingForm_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "SalonBookingForm",
	__ssrInlineRender: true,
	props: {
		organizationId: {},
		embedded: { type: Boolean }
	},
	setup(__props) {
		const props = __props;
		const config = useRuntimeConfig();
		const logoFailed = ref(false);
		const logoSrc = computed(() => profile.value?.presentation?.logoUrl && !logoFailed.value ? new URL(profile.value.presentation.logoUrl, config.public.apiBase).toString() : "/sarkisian-logo.png");
		const hours = (minute) => `${String(Math.floor(minute / 60) % 24).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
		const weekdays = [
			"Вс",
			"Пн",
			"Вт",
			"Ср",
			"Чт",
			"Пт",
			"Сб"
		];
		const profile = ref(null), loading = ref(true), error = ref(""), step = ref(1), servicesId = ref(""), masterId = ref(""), day = ref(""), selected = ref(""), slots = ref([]), slotsLoading = ref(false), busy = ref(false), result = ref(null);
		watch(() => profile.value?.presentation?.logoUrl, () => {
			logoFailed.value = false;
		});
		const firstName = ref(""), phone = ref(""), email = ref(""), consent = ref(false);
		const manageLink = computed(() => (result.value?.manageToken, ""));
		const slotsError = ref("");
		const stageHeading = ref(null), successHeading = ref(null);
		const stageLabels = [
			"Выберите услугу",
			"Выберите удобное время",
			"Проверьте запись"
		];
		const nearestDays = computed(() => profile.value ? Array.from({ length: Math.min(7, profile.value.horizonDays) }, (_, index) => ({
			value: shiftSalonDay(profile.value.today, index),
			label: index === 0 ? "Сегодня" : index === 1 ? "Завтра" : (/* @__PURE__ */ new Date(shiftSalonDay(profile.value.today, index) + "T12:00:00Z")).toLocaleDateString("ru-RU", {
				weekday: "short",
				day: "numeric",
				month: "short",
				timeZone: "UTC"
			})
		})) : []);
		watch(step, async () => {
			await nextTick();
			(step.value === 4 ? successHeading.value : stageHeading.value)?.focus();
		});
		const service = computed(() => profile.value?.services.find((s) => s.id === servicesId.value));
		const master = computed(() => profile.value?.masters.find((m) => m.id === masterId.value));
		const bookingAvailable = computed(() => Boolean(profile.value?.services?.length && profile.value?.masters?.length));
		const maxDay = computed(() => profile.value ? shiftSalonDay(profile.value.today, profile.value.horizonDays - 1) : "");
		const time = (value) => new Date(value).toLocaleTimeString("ru-RU", {
			timeZone: profile.value.timeZone,
			hour: "2-digit",
			minute: "2-digit"
		});
		const fullDate = (value) => new Date(value).toLocaleString("ru-RU", {
			timeZone: profile.value.timeZone,
			day: "numeric",
			month: "long",
			hour: "2-digit",
			minute: "2-digit"
		});
		const price = (value) => new Intl.NumberFormat("ru-RU", {
			style: "currency",
			currency: "RUB",
			maximumFractionDigits: 2
		}).format(Number(value));
		let version = 0, controller;
		async function loadSlots() {
			const current = ++version;
			controller?.abort();
			selected.value = "";
			slots.value = [];
			slotsError.value = "";
			slotsLoading.value = false;
			if (!servicesId.value || !masterId.value || !day.value) return;
			controller = new AbortController();
			slotsLoading.value = true;
			try {
				const value = await $fetch$1(`/salon-booking/${encodeURIComponent(props.organizationId)}/slots`, {
					baseURL: config.public.apiBase,
					signal: controller.signal,
					timeout: 2e4,
					query: {
						serviceId: servicesId.value,
						masterMemberId: masterId.value,
						date: day.value
					}
				});
				if (current === version) slots.value = value.slots;
			} catch (e) {
				if (current === version && e.name !== "AbortError") slotsError.value = typeof e.data?.message === "string" ? e.data.message : "Не удалось загрузить свободное время.";
			} finally {
				if (current === version) slotsLoading.value = false;
			}
		}
		watch([
			servicesId,
			masterId,
			day
		], () => {
			error.value = "";
			loadSlots();
		});
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<main${ssrRenderAttrs(mergeProps({ class: ["public-salon-booking", { "is-embedded": __props.embedded }] }, _attrs))}><section class="public-booking-card"><header><img${ssrRenderAttr("src", unref(logoSrc))} class="${ssrRenderClass({ "public-salon-logo": unref(profile)?.presentation?.logoUrl && !unref(logoFailed) })}"${ssrRenderAttr("alt", unref(profile)?.presentation?.logoUrl && !unref(logoFailed) ? unref(profile).name : "SARKISIAN")}><small>Онлайн-запись</small><h1>${ssrInterpolate(unref(profile)?.name || "Запись в салон")}</h1>`);
			if (unref(profile)?.presentation) {
				_push(`<!--[-->`);
				if (unref(profile).presentation.address) _push(`<p class="public-salon-address">${ssrInterpolate(unref(profile).presentation.address)}</p>`);
				else _push(`<!---->`);
				_push(`<details class="public-salon-info"><summary>Контакты и часы работы</summary><div class="public-salon-contacts">`);
				if (unref(profile).workingDays?.length && !unref(profile).weeklySchedule?.length) _push(`<p>${ssrInterpolate(unref(profile).workingDays.map((day) => weekdays[day]).join(", "))} · ${ssrInterpolate(hours(unref(profile).startMinute))}–${ssrInterpolate(hours(unref(profile).endMinute))} <small>${ssrInterpolate(unref(profile).timeZone)}</small></p>`);
				else _push(`<!---->`);
				_push(`<div><!--[-->`);
				ssrRenderList(unref(profile).presentation.phones, (phone) => {
					_push(`<a${ssrRenderAttr("href", `tel:${phone.replace(/[^+\d]/g, "")}`)}>${ssrInterpolate(phone)}</a>`);
				});
				_push(`<!--]--><!--[-->`);
				ssrRenderList(unref(profile).presentation.emails, (email) => {
					_push(`<a${ssrRenderAttr("href", `mailto:${email}`)}>${ssrInterpolate(email)}</a>`);
				});
				_push(`<!--]--><!--[-->`);
				ssrRenderList(unref(profile).presentation.socialLinks, (link) => {
					_push(`<a${ssrRenderAttr("href", link.url)} target="_blank" rel="noopener noreferrer">${ssrInterpolate(link.label)}</a>`);
				});
				_push(`<!--]--></div>`);
				if (unref(profile).weeklySchedule?.length) {
					_push(`<details class="public-salon-hours"><summary>Часы работы и перерывы</summary><!--[-->`);
					ssrRenderList(unref(profile).workingDays, (day) => {
						_push(`<div><strong>${ssrInterpolate(weekdays[day])}</strong><span>${ssrInterpolate(hours((unref(profile).weeklySchedule.find((row) => row.day === day) || unref(profile)).startMinute))}–${ssrInterpolate(hours((unref(profile).weeklySchedule.find((row) => row.day === day) || unref(profile)).endMinute))}</span><!--[-->`);
						ssrRenderList(unref(profile).weeklySchedule.find((row) => row.day === day)?.breaks || [], (pause, i) => {
							_push(`<small>Перерыв ${ssrInterpolate(hours(pause.startMinute))}–${ssrInterpolate(hours(pause.endMinute))}</small>`);
						});
						_push(`<!--]--></div>`);
					});
					_push(`<!--]--></details>`);
				} else _push(`<!---->`);
				_push(`</div></details><!--]-->`);
			} else _push(`<!---->`);
			_push(`</header>`);
			if (unref(loading)) _push(`<p role="status">Загружаем услуги и расписание…</p>`);
			else _push(`<!---->`);
			if (unref(error)) _push(`<p role="alert" class="public-booking-error">${ssrInterpolate(unref(error))}</p>`);
			else _push(`<!---->`);
			if (!unref(loading) && !unref(profile)) _push(`<button type="button">Повторить загрузку</button>`);
			else _push(`<!---->`);
			if (unref(profile) && !unref(loading)) {
				_push(`<!--[-->`);
				if (unref(step) < 4 && unref(bookingAvailable)) {
					_push(`<ol class="public-booking-steps" aria-label="Этапы записи"><!--[-->`);
					ssrRenderList([
						"Услуга",
						"Время",
						"Контакты"
					], (label, index) => {
						_push(`<li${ssrRenderAttr("aria-current", unref(step) === index + 1 ? "step" : void 0)} class="${ssrRenderClass({
							active: unref(step) === index + 1,
							done: unref(step) > index + 1
						})}"><span>`);
						if (unref(step) > index + 1) _push(ssrRenderComponent(unref(Check), {
							size: 14,
							"aria-hidden": "true"
						}, null, _parent));
						else _push(`<!--[-->${ssrInterpolate(index + 1)}<!--]-->`);
						_push(`</span>${ssrInterpolate(label)}</li>`);
					});
					_push(`<!--]--></ol>`);
				} else _push(`<!---->`);
				if (unref(step) < 4 && unref(bookingAvailable)) _push(`<h2 tabindex="-1" class="public-booking-title">${ssrInterpolate(stageLabels[unref(step) - 1])}</h2>`);
				else _push(`<!---->`);
				if (!unref(bookingAvailable)) _push(`<div class="public-booking-stage" role="status"><h2>Онлайн-запись пока недоступна</h2><p>Сейчас нет доступных услуг или мастеров. Свяжитесь с салоном, чтобы подобрать услугу и время.</p></div>`);
				else if (unref(step) === 1) {
					_push(`<form><label>Услуга<select aria-label="Услуга" required><option disabled value=""${ssrIncludeBooleanAttr(Array.isArray(unref(servicesId)) ? ssrLooseContain(unref(servicesId), "") : ssrLooseEqual(unref(servicesId), "")) ? " selected" : ""}>Выберите услугу</option><!--[-->`);
					ssrRenderList(unref(profile).services, (item) => {
						_push(`<option${ssrRenderAttr("value", item.id)}${ssrIncludeBooleanAttr(Array.isArray(unref(servicesId)) ? ssrLooseContain(unref(servicesId), item.id) : ssrLooseEqual(unref(servicesId), item.id)) ? " selected" : ""}>${ssrInterpolate(item.name)} · ${ssrInterpolate(item.duration)} мин. · ${ssrInterpolate(price(item.price))}</option>`);
					});
					_push(`<!--]--></select></label><label>Мастер<select aria-label="Мастер" required><option disabled value=""${ssrIncludeBooleanAttr(Array.isArray(unref(masterId)) ? ssrLooseContain(unref(masterId), "") : ssrLooseEqual(unref(masterId), "")) ? " selected" : ""}>Выберите мастера</option><!--[-->`);
					ssrRenderList(unref(profile).masters, (item) => {
						_push(`<option${ssrRenderAttr("value", item.id)}${ssrIncludeBooleanAttr(Array.isArray(unref(masterId)) ? ssrLooseContain(unref(masterId), item.id) : ssrLooseEqual(unref(masterId), item.id)) ? " selected" : ""}>${ssrInterpolate(item.name)}</option>`);
					});
					_push(`<!--]--></select></label>`);
					if (unref(service)) _push(`<p class="public-booking-service-preview"><span>${ssrInterpolate(unref(service).duration)} мин.<small>Продолжительность визита</small></span><strong>${ssrInterpolate(price(unref(service).price))}</strong></p>`);
					else _push(`<!---->`);
					_push(`<button type="submit" class="public-booking-primary"${ssrIncludeBooleanAttr(!unref(servicesId) || !unref(masterId)) ? " disabled" : ""}>Выбрать время`);
					_push(ssrRenderComponent(unref(ArrowRight), { size: 16 }, null, _parent));
					_push(`</button></form>`);
				} else if (unref(step) === 2) {
					_push(`<div class="public-booking-stage"><p class="public-booking-summary"><strong>${ssrInterpolate(unref(service)?.name)}</strong><small>${ssrInterpolate(unref(master)?.name)} · ${ssrInterpolate(unref(service)?.duration)} мин.</small></p><div class="public-booking-nearest" role="group" aria-label="Ближайшие даты записи"><!--[-->`);
					ssrRenderList(unref(nearestDays), (item) => {
						_push(`<button type="button"${ssrRenderAttr("aria-pressed", unref(day) === item.value)}>${ssrInterpolate(item.label)}</button>`);
					});
					_push(`<!--]--></div><label>Дата визита<input${ssrRenderAttr("value", unref(day))} type="date"${ssrRenderAttr("min", unref(profile).today)}${ssrRenderAttr("max", unref(maxDay))} required></label><small>Время салона: ${ssrInterpolate(unref(profile).timeZone)}</small>`);
					if (unref(slotsLoading)) _push(`<p role="status">Ищем свободное время…</p>`);
					else if (unref(slotsError)) _push(`<div class="public-booking-error"><p role="alert">${ssrInterpolate(unref(slotsError))}</p><button type="button">Повторить поиск времени</button></div>`);
					else {
						_push(`<div class="public-booking-slots" role="group" aria-label="Свободное время"><!--[-->`);
						ssrRenderList(unref(slots), (slot) => {
							_push(`<button type="button"${ssrRenderAttr("aria-pressed", unref(selected) === slot)} class="${ssrRenderClass({ selected: unref(selected) === slot })}">${ssrInterpolate(time(slot))}</button>`);
						});
						_push(`<!--]--></div>`);
					}
					if (!unref(slotsLoading) && !unref(slotsError) && !unref(slots).length) _push(`<p>На эту дату свободного времени нет. Выберите другой день или мастера.</p>`);
					else _push(`<!---->`);
					_push(`<footer><button type="button">`);
					_push(ssrRenderComponent(unref(ArrowLeft), { size: 16 }, null, _parent));
					_push(`Назад</button><button type="button" class="public-booking-primary"${ssrIncludeBooleanAttr(!unref(selected) || unref(slotsLoading)) ? " disabled" : ""}>Продолжить`);
					_push(ssrRenderComponent(unref(ArrowRight), { size: 16 }, null, _parent));
					_push(`</button></footer></div>`);
				} else if (unref(step) === 3) {
					_push(`<form><p class="public-booking-summary"><strong>${ssrInterpolate(unref(service)?.name)}</strong><span>${ssrInterpolate(fullDate(unref(selected)))} · ${ssrInterpolate(unref(master)?.name)}</span><small>${ssrInterpolate(unref(service)?.duration)} мин. · ${ssrInterpolate(price(unref(service)?.price))}</small></p><fieldset${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}><label>Ваше имя<input${ssrRenderAttr("value", unref(firstName))} required maxlength="80" autocomplete="given-name"></label><label>Телефон<input${ssrRenderAttr("value", unref(phone))} type="tel" required minlength="8" maxlength="30" autocomplete="tel" placeholder="+7 900 000-00-00"></label><label>Email <small>необязательно</small><input${ssrRenderAttr("value", unref(email))} type="email" maxlength="254" autocomplete="email" placeholder="name@example.ru"></label><label class="public-booking-consent"><input${ssrIncludeBooleanAttr(Array.isArray(unref(consent)) ? ssrLooseContain(unref(consent), null) : unref(consent)) ? " checked" : ""} type="checkbox" required>Согласен на обработку контактных данных для оформления записи и связи по визиту.</label></fieldset><footer><button type="button"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}>`);
					_push(ssrRenderComponent(unref(ArrowLeft), { size: 16 }, null, _parent));
					_push(`Назад</button><button type="submit" class="public-booking-primary"${ssrIncludeBooleanAttr(unref(busy) || !unref(consent) || !unref(firstName).trim()) ? " disabled" : ""}>${ssrInterpolate(unref(busy) ? "Записываем…" : "Записаться")}`);
					_push(ssrRenderComponent(unref(Check), { size: 16 }, null, _parent));
					_push(`</button></footer></form>`);
				} else {
					_push(`<div class="public-booking-success" role="status">`);
					_push(ssrRenderComponent(unref(CalendarCheck), { size: 40 }, null, _parent));
					_push(`<h2 tabindex="-1">Запись создана</h2><strong>${ssrInterpolate(unref(result).serviceName)}</strong><p>${ssrInterpolate(fullDate(unref(result).startTime))} · ${ssrInterpolate(unref(master)?.name)}</p><small>Салон увидит запись в календаре. ${ssrInterpolate(unref(email).trim() ? "Если отправка почты подключена, на указанный адрес придёт письмо." : "Чтобы не потерять доступ, сохраните ссылку на эту запись.")}</small>`);
					if (unref(manageLink)) _push(`<a${ssrRenderAttr("href", unref(manageLink))} target="_blank" rel="noopener noreferrer">Управлять записью</a>`);
					else _push(`<!---->`);
					if (unref(manageLink)) _push(`<small>Сохраните ссылку и не передавайте её другим людям.</small>`);
					else _push(`<small>Для изменения визита свяжитесь с салоном.</small>`);
					_push(`</div>`);
				}
				_push(`<!--]-->`);
			} else _push(`<!---->`);
			_push(`<small class="public-booking-powered">Работает на платформе SARKISIAN</small></section></main>`);
		};
	}
});
// components/SalonBookingForm.vue
var _sfc_setup$1 = SalonBookingForm_vue_vue_type_script_setup_true_lang_default.setup;
SalonBookingForm_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/SalonBookingForm.vue");
	return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
var SalonBookingForm_default = Object.assign(SalonBookingForm_vue_vue_type_script_setup_true_lang_default, { __name: "SalonBookingForm" });
// pages/booking/[organizationId].vue?vue&type=script&setup=true&lang.ts
var _organizationId__vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "[organizationId]",
	__ssrInlineRender: true,
	setup(__props) {
		const route = useRoute();
		useHead({
			title: "Онлайн-запись — SARKISIAN",
			meta: [{
				name: "robots",
				content: "noindex,nofollow"
			}]
		});
		return (_ctx, _push, _parent, _attrs) => {
			_push(ssrRenderComponent(SalonBookingForm_default, mergeProps({
				"organization-id": String(unref(route).params.organizationId),
				embedded: unref(route).query.embed === "1"
			}, _attrs), null, _parent));
		};
	}
});
// pages/booking/[organizationId].vue
var _sfc_setup = _organizationId__vue_vue_type_script_setup_true_lang_default.setup;
_organizationId__vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/booking/[organizationId].vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var _organizationId__default = _organizationId__vue_vue_type_script_setup_true_lang_default;

export { _organizationId__default as default };;globalThis.__timing__.logEnd('Load chunks/build/_organizationId_-D1Fydqiv');
//# sourceMappingURL=_organizationId_-D1Fydqiv.mjs.map
