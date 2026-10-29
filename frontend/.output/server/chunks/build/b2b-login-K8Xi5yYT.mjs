globalThis.__timing__.logStart('Load chunks/build/b2b-login-K8Xi5yYT');import { L as useB2BSession, c as useRoute, j as useState, N as NuxtLink } from '../virtual/entry.mjs';
import { _ as _virtual_public__2Fsarkisian_logo_default } from './_virtual_public-Bnta_Oua.mjs';
import { defineComponent, ref, mergeProps, withCtx, createVNode, unref, createTextVNode, useSSRContext } from 'vue';
import { ssrRenderAttrs, ssrRenderComponent, ssrRenderAttr, ssrIncludeBooleanAttr, ssrRenderDynamicModel, ssrInterpolate } from 'vue/server-renderer';
import { Building2, EyeOff, Eye, ArrowRight } from '@lucide/vue';
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

// pages/b2b-login.vue?vue&type=script&setup=true&lang.ts
var b2b_login_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "b2b-login",
	__ssrInlineRender: true,
	setup(__props) {
		const { login, hydrate, token, logoutWarning } = useB2BSession();
		useRoute();
		const email = ref("");
		const password = ref("");
		const show = ref(false);
		const loading = ref(false);
		const error = ref("");
		useState("b2b-signing-out", () => false);
		return (_ctx, _push, _parent, _attrs) => {
			const _component_NuxtLink = NuxtLink;
			_push(`<main${ssrRenderAttrs(mergeProps({
				"data-v-ui-9238ae0be0ec": "",
				class: "login-page b2b-login"
			}, _attrs))}><section data-v-ui-9238ae0be0ec class="login-brand" aria-label="SARKISIAN для бизнеса">`);
			_push(ssrRenderComponent(_component_NuxtLink, {
				"data-v-ui-9238ae0be0ec": "",
				to: "/",
				class: "login-logo",
				"aria-label": "SARKISIAN — на главную сайта"
			}, {
				default: withCtx((_, _push, _parent, _scopeId) => {
					if (_push) _push(`<img data-v-ui-9238ae0be0ec${ssrRenderAttr("src", _virtual_public__2Fsarkisian_logo_default)} alt="SARKISIAN" width="200" height="40"${_scopeId}>`);
					else return [createVNode("img", {
						"data-v-ui-9238ae0be0ec": "",
						src: _virtual_public__2Fsarkisian_logo_default,
						alt: "SARKISIAN",
						width: "200",
						height: "40"
					})];
				}),
				_: 1
			}, _parent));
			_push(`<div data-v-ui-9238ae0be0ec class="login-brand-copy"><p data-v-ui-9238ae0be0ec class="login-brand-kicker">SARKISIAN для бизнеса</p><h2 data-v-ui-9238ae0be0ec>Ваш салон.<br data-v-ui-9238ae0be0ec><em data-v-ui-9238ae0be0ec>В одном окне.</em></h2><p data-v-ui-9238ae0be0ec class="login-brand-description">Клиенты, календарь записей, услуги, команда и закупки профессиональных материалов — в одной экосистеме.</p><div data-v-ui-9238ae0be0ec class="login-brand-note">`);
			_push(ssrRenderComponent(unref(Building2), {
				"data-v-ui-9238ae0be0ec": "",
				size: 18,
				"aria-hidden": "true"
			}, null, _parent));
			_push(`<span data-v-ui-9238ae0be0ec>Один кабинет для владельца и команды.</span></div></div><footer data-v-ui-9238ae0be0ec>Рабочее пространство партнёров SARKISIAN</footer></section><section data-v-ui-9238ae0be0ec class="login-area" aria-labelledby="b2b-login-title"><form data-v-ui-9238ae0be0ec class="login-card"${ssrRenderAttr("aria-busy", unref(loading))}><header data-v-ui-9238ae0be0ec class="login-card-header"><div data-v-ui-9238ae0be0ec class="login-symbol">`);
			_push(ssrRenderComponent(unref(Building2), {
				"data-v-ui-9238ae0be0ec": "",
				size: 22,
				"aria-hidden": "true"
			}, null, _parent));
			_push(`</div><p data-v-ui-9238ae0be0ec class="eyebrow">КАБИНЕТ ПАРТНЁРА</p></header><h1 data-v-ui-9238ae0be0ec id="b2b-login-title">Вход для бизнеса</h1><p data-v-ui-9238ae0be0ec id="b2b-login-hint" class="hint">Используйте учётную запись владельца или сотрудника организации.</p><label data-v-ui-9238ae0be0ec for="b2b-email">Email</label><input data-v-ui-9238ae0be0ec id="b2b-email"${ssrRenderAttr("value", unref(email))} type="email" name="username" autocomplete="username" autocapitalize="none"${ssrRenderAttr("spellcheck", false)} inputmode="email" placeholder="name@company.ru"${ssrIncludeBooleanAttr(unref(loading)) ? " disabled" : ""}${ssrRenderAttr("aria-invalid", Boolean(unref(error)))}${ssrRenderAttr("aria-describedby", unref(error) ? "b2b-login-error" : "b2b-login-hint")} required><label data-v-ui-9238ae0be0ec for="b2b-password">Пароль</label><div data-v-ui-9238ae0be0ec class="password"><input data-v-ui-9238ae0be0ec id="b2b-password"${ssrRenderDynamicModel(unref(show) ? "text" : "password", unref(password), null)}${ssrRenderAttr("type", unref(show) ? "text" : "password")} name="password" autocomplete="current-password" placeholder="Введите пароль"${ssrIncludeBooleanAttr(unref(loading)) ? " disabled" : ""}${ssrRenderAttr("aria-invalid", Boolean(unref(error)))}${ssrRenderAttr("aria-describedby", unref(error) ? "b2b-login-error" : void 0)} required><button data-v-ui-9238ae0be0ec type="button"${ssrIncludeBooleanAttr(unref(loading)) ? " disabled" : ""}${ssrRenderAttr("aria-label", unref(show) ? "Скрыть пароль" : "Показать пароль")}${ssrRenderAttr("aria-pressed", unref(show))} aria-controls="b2b-password">`);
			if (unref(show)) _push(ssrRenderComponent(unref(EyeOff), {
				"data-v-ui-9238ae0be0ec": "",
				size: 20,
				"aria-hidden": "true"
			}, null, _parent));
			else _push(ssrRenderComponent(unref(Eye), {
				"data-v-ui-9238ae0be0ec": "",
				size: 20,
				"aria-hidden": "true"
			}, null, _parent));
			_push(`</button></div>`);
			if (unref(error)) _push(`<p data-v-ui-9238ae0be0ec id="b2b-login-error" class="login-error" role="alert">${ssrInterpolate(unref(error))}</p>`);
			else _push(`<!---->`);
			if (unref(logoutWarning)) _push(`<p class="login-error" role="status">${ssrInterpolate(unref(logoutWarning))}</p>`);
			else _push(`<!---->`);
			_push(`<button data-v-ui-9238ae0be0ec class="submit" type="submit"${ssrIncludeBooleanAttr(unref(loading)) ? " disabled" : ""}><span data-v-ui-9238ae0be0ec>${ssrInterpolate(unref(loading) ? "Проверяем данные…" : "Войти в кабинет")}</span>`);
			_push(ssrRenderComponent(unref(ArrowRight), {
				"data-v-ui-9238ae0be0ec": "",
				size: 20,
				"aria-hidden": "true"
			}, null, _parent));
			_push(`</button><small data-v-ui-9238ae0be0ec>Нет B2B-доступа? `);
			_push(ssrRenderComponent(_component_NuxtLink, { to: "/business-registration" }, {
				default: withCtx((_, _push, _parent, _scopeId) => {
					if (_push) _push(`Зарегистрировать салон или бизнес`);
					else return [createTextVNode("Зарегистрировать салон или бизнес")];
				}),
				_: 1
			}, _parent));
			_push(`</small>`);
			_push(ssrRenderComponent(_component_NuxtLink, {
				"data-v-ui-9238ae0be0ec": "",
				to: "/",
				class: "login-site-link"
			}, {
				default: withCtx((_, _push, _parent, _scopeId) => {
					if (_push) {
						_push(`Вернуться на сайт `);
						_push(ssrRenderComponent(unref(ArrowRight), {
							"data-v-ui-9238ae0be0ec": "",
							size: 16,
							"aria-hidden": "true"
						}, null, _parent, _scopeId));
					} else return [createTextVNode("Вернуться на сайт "), createVNode(unref(ArrowRight), {
						"data-v-ui-9238ae0be0ec": "",
						size: 16,
						"aria-hidden": "true"
					})];
				}),
				_: 1
			}, _parent));
			_push(`</form></section></main>`);
		};
	}
});
// pages/b2b-login.vue
var _sfc_setup = b2b_login_vue_vue_type_script_setup_true_lang_default.setup;
b2b_login_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/b2b-login.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var b2b_login_default = b2b_login_vue_vue_type_script_setup_true_lang_default;

export { b2b_login_default as default };;globalThis.__timing__.logEnd('Load chunks/build/b2b-login-K8Xi5yYT');
//# sourceMappingURL=b2b-login-K8Xi5yYT.mjs.map
