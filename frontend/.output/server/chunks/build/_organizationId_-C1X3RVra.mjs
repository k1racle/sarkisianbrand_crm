globalThis.__timing__.logStart('Load chunks/build/_organizationId_-C1X3RVra');import { c as useRoute, u as useHead } from '../virtual/entry.mjs';
import { _ as _virtual_public__2Fsarkisian_logo_default } from './_virtual_public-Bnta_Oua.mjs';
import { defineComponent, ref, mergeProps, unref, useSSRContext } from 'vue';
import { ssrRenderAttrs, ssrRenderAttr, ssrInterpolate, ssrRenderComponent, ssrIncludeBooleanAttr, ssrRenderList, ssrRenderClass } from 'vue/server-renderer';
import { CalendarCheck, ArrowRight } from '@lucide/vue';
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

// pages/booking-manage/[organizationId].vue?vue&type=script&setup=true&lang.ts
var _organizationId__vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "[organizationId]",
	__ssrInlineRender: true,
	setup(__props) {
		const route = useRoute();
		useHead({
			title: "Управление записью",
			meta: [{
				name: "referrer",
				content: "no-referrer"
			}, {
				name: "robots",
				content: "noindex,nofollow"
			}]
		});
		String(route.params.organizationId || "");
		ref("");
		const booking = ref(null), date = ref(""), slots = ref([]), selected = ref("");
		const loading = ref(true), busy = ref(false), error = ref(""), notice = ref("");
		const dateTime = (value) => new Date(value).toLocaleString("ru-RU", {
			timeZone: booking.value?.timeZone || "Europe/Moscow",
			day: "numeric",
			month: "long",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit"
		});
		const time = (value) => new Date(value).toLocaleTimeString("ru-RU", {
			timeZone: booking.value?.timeZone || "Europe/Moscow",
			hour: "2-digit",
			minute: "2-digit"
		});
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<main${ssrRenderAttrs(mergeProps({ class: "public-salon-booking" }, _attrs))}><section class="public-booking-card"><header><img${ssrRenderAttr("src", _virtual_public__2Fsarkisian_logo_default)} alt="SARKISIAN"><small>Онлайн-запись</small><h1>Управление записью</h1></header>`);
			if (unref(loading)) _push(`<p role="status">Загружаем запись…</p>`);
			else _push(`<!---->`);
			if (unref(error)) _push(`<p class="public-booking-error" role="alert">${ssrInterpolate(unref(error))}</p>`);
			else _push(`<!---->`);
			if (unref(notice)) _push(`<p role="status">${ssrInterpolate(unref(notice))}</p>`);
			else _push(`<!---->`);
			if (unref(booking) && !unref(loading)) {
				_push(`<!--[--><div class="public-booking-success">`);
				_push(ssrRenderComponent(unref(CalendarCheck), { size: 40 }, null, _parent));
				_push(`<h2>${ssrInterpolate(unref(booking).serviceName)}</h2><p>${ssrInterpolate(dateTime(unref(booking).startTime))}</p><small>Время салона: ${ssrInterpolate(unref(booking).timeZone)}</small>`);
				if (unref(booking).status === "CANCELLED") _push(`<strong>Запись отменена</strong>`);
				else _push(`<!---->`);
				_push(`</div>`);
				if (unref(booking).canChange) {
					_push(`<div class="public-booking-stage"><h2>Перенести запись</h2><label>Новая дата<input${ssrRenderAttr("value", unref(date))} type="date"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}></label><button type="button"${ssrIncludeBooleanAttr(!unref(date) || unref(busy)) ? " disabled" : ""}>Показать свободное время</button>`);
					if (unref(slots).length) {
						_push(`<div class="public-booking-slots" role="group" aria-label="Свободное время"><!--[-->`);
						ssrRenderList(unref(slots), (slot) => {
							_push(`<button type="button"${ssrRenderAttr("aria-pressed", unref(selected) === slot)} class="${ssrRenderClass({ selected: unref(selected) === slot })}"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}>${ssrInterpolate(time(slot))}</button>`);
						});
						_push(`<!--]--></div>`);
					} else _push(`<!---->`);
					if (unref(selected)) {
						_push(`<button type="button" class="public-booking-primary"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}>Перенести на ${ssrInterpolate(time(unref(selected)))} `);
						_push(ssrRenderComponent(unref(ArrowRight), { size: 16 }, null, _parent));
						_push(`</button>`);
					} else _push(`<!---->`);
					_push(`<button type="button"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}>Отменить запись</button></div>`);
				} else if (unref(booking).status !== "CANCELLED") _push(`<p>Для изменения визита свяжитесь с салоном.</p>`);
				else _push(`<!---->`);
				if (unref(error) && unref(booking)) _push(`<button type="button"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}>Обновить запись</button>`);
				else _push(`<!---->`);
				_push(`<small>Ссылка даёт доступ к изменению записи. Не передавайте её другим людям.</small><!--]-->`);
			} else _push(`<!---->`);
			_push(`</section></main>`);
		};
	}
});
// pages/booking-manage/[organizationId].vue
var _sfc_setup = _organizationId__vue_vue_type_script_setup_true_lang_default.setup;
_organizationId__vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/booking-manage/[organizationId].vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var _organizationId__default = _organizationId__vue_vue_type_script_setup_true_lang_default;

export { _organizationId__default as default };;globalThis.__timing__.logEnd('Load chunks/build/_organizationId_-C1X3RVra');
//# sourceMappingURL=_organizationId_-C1X3RVra.mjs.map
