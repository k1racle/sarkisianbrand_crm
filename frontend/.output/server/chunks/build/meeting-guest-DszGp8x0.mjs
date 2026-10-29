globalThis.__timing__.logStart('Load chunks/build/meeting-guest-DszGp8x0');import { u as useHead } from '../virtual/entry.mjs';
import { _ as _virtual_public__2Fcrm_2Fpwa_2Ficon_default } from './_virtual_public-Dz_MkdLu.mjs';
import { defineComponent, ref, computed, mergeProps, unref, useSSRContext } from 'vue';
import { ssrRenderAttrs, ssrRenderAttr, ssrRenderComponent, ssrInterpolate, ssrIncludeBooleanAttr } from 'vue/server-renderer';
import { CalendarClock, RefreshCw } from '@lucide/vue';
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

// pages/meeting-guest.vue?vue&type=script&setup=true&lang.ts
var meeting_guest_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "meeting-guest",
	__ssrInlineRender: true,
	setup(__props) {
		useHead({
			title: "Гостевой вход на встречу — SARKISIAN",
			htmlAttrs: {
				lang: "ru",
				"data-crm-ui": "true"
			},
			meta: [{
				name: "robots",
				content: "noindex, nofollow"
			}, {
				name: "referrer",
				content: "no-referrer"
			}],
			link: [{
				rel: "icon",
				type: "image/svg+xml",
				href: "/crm/pwa/icon.svg?v=brand2"
			}]
		});
		const invitation = ref(""), pin = ref(""), name = ref("");
		ref("");
		ref("");
		const busy = ref(false), error = ref(""), connectionLost = ref(false), status = ref(null), ready = ref(false), terminal = computed(() => status.value && !["WAITING", "ADMITTED"].includes(status.value.state));
		const when = (value) => new Date(value).toLocaleString("ru-RU");
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<main${ssrRenderAttrs(mergeProps({ class: "crm-app-login crm-standard" }, _attrs))}><header class="crm-login-brand"><img class="crm-brand-mark"${ssrRenderAttr("src", _virtual_public__2Fcrm_2Fpwa_2Ficon_default)} width="42" height="42" alt=""><strong>SARKISIAN · Встречи</strong></header><section class="crm-login-card crm-surface crm-stack">`);
			_push(ssrRenderComponent(unref(CalendarClock), {
				size: 28,
				"aria-hidden": "true"
			}, null, _parent));
			_push(`<h1>Гостевой вход</h1>`);
			if (!unref(ready)) _push(`<p>Подготавливаем приглашение…</p>`);
			else if (!unref(invitation)) _push(`<p role="alert">Откройте полную ссылку от организатора. В ней должен быть код приглашения.</p>`);
			else _push(`<!---->`);
			if (unref(error)) _push(`<p role="alert">${ssrInterpolate(unref(error))}</p>`);
			else _push(`<!---->`);
			if (unref(status)) {
				_push(`<!--[-->`);
				if (unref(connectionLost)) _push(`<p role="status">Связь потеряна. Текущий допуск не подтверждён; восстанавливаем соединение.</p>`);
				else _push(`<!---->`);
				if (!unref(terminal)) {
					_push(`<!--[--><strong>${ssrInterpolate(unref(status).meeting?.title)}</strong>`);
					if (unref(status).meeting) _push(`<small>${ssrInterpolate(when(unref(status).meeting.startsAt))} — ${ssrInterpolate(when(unref(status).meeting.endsAt))} · время вашего устройства</small>`);
					else _push(`<!---->`);
					_push(`<h2>${ssrInterpolate(unref(status).state === "ADMITTED" ? "Организатор допустил вас" : "Ожидайте допуска")}</h2><p>${ssrInterpolate(unref(status).state === "ADMITTED" ? "Допуск получен, но видеосервер ещё не подключён. Камера и микрофон не включаются." : "Организатор видит вашу заявку. Статус обновляется автоматически.")}</p><button type="button" class="crm-button"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}>`);
					_push(ssrRenderComponent(unref(RefreshCw), { size: 18 }, null, _parent));
					_push(`Проверить статус</button><button type="button" class="crm-button crm-button--danger"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}>Выйти</button><!--]-->`);
				} else _push(`<!--[--><h2>${ssrInterpolate(unref(status).state === "REJECTED" ? "Вход отклонён" : unref(status).state === "LEFT" ? "Вы вышли" : unref(status).state === "EXPIRED" ? "Срок доступа истёк" : "Доступ закрыт")}</h2><p>Для нового входа попросите организатора выдать новое приглашение.</p><!--]-->`);
				_push(`<!--]-->`);
			} else if (unref(ready) && unref(invitation)) _push(`<form class="crm-stack"><p>Регистрация не нужна. Введите имя и 8-значный PIN, затем дождитесь допуска организатора. Вход откроется за 30 минут до встречи.</p><label class="crm-field">Ваше имя<input${ssrRenderAttr("value", unref(name))} class="crm-input" autocomplete="name" maxlength="80" required${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}></label><label class="crm-field">PIN приглашения<input${ssrRenderAttr("value", unref(pin))} class="crm-input" type="password" inputmode="numeric" autocomplete="off" pattern="[0-9]{8}" minlength="8" maxlength="8" required${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}></label><button type="submit" class="crm-button crm-button--primary"${ssrIncludeBooleanAttr(unref(busy) || !unref(name).trim() || !/^\d{8}$/.test(unref(pin))) ? " disabled" : ""}>${ssrInterpolate(unref(busy) ? "Проверяем…" : "Войти в зал ожидания")}</button></form>`);
			else _push(`<!---->`);
			_push(`<p class="crm-inline-note">Видеосвязь пока не подключена. Гостевой доступ не открывает CRM и данные компании.</p></section></main>`);
		};
	}
});
// pages/meeting-guest.vue
var _sfc_setup = meeting_guest_vue_vue_type_script_setup_true_lang_default.setup;
meeting_guest_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/meeting-guest.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var meeting_guest_default = meeting_guest_vue_vue_type_script_setup_true_lang_default;

export { meeting_guest_default as default };;globalThis.__timing__.logEnd('Load chunks/build/meeting-guest-DszGp8x0');
//# sourceMappingURL=meeting-guest-DszGp8x0.mjs.map
