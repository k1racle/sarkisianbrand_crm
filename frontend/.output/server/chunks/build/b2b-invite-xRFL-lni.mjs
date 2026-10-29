globalThis.__timing__.logStart('Load chunks/build/b2b-invite-xRFL-lni');import { L as useB2BSession, u as useHead, N as NuxtLink } from '../virtual/entry.mjs';
import { _ as _virtual_public__2Fsarkisian_logo_default } from './_virtual_public-Bnta_Oua.mjs';
import { defineComponent, ref, reactive, watch, mergeProps, withCtx, createVNode, unref, createTextVNode, useSSRContext } from 'vue';
import { ssrRenderAttrs, ssrRenderComponent, ssrRenderAttr, ssrInterpolate, ssrIncludeBooleanAttr, ssrLooseContain } from 'vue/server-renderer';
import { Building2, ArrowRight } from '@lucide/vue';
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

// pages/b2b-invite.vue?vue&type=script&setup=true&lang.ts
var b2b_invite_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "b2b-invite",
	__ssrInlineRender: true,
	setup(__props) {
		const session = useB2BSession();
		ref("");
		const preview = ref(null), terms = ref(null), termsError = ref(""), loading = ref(true), busy = ref(false), error = ref(""), mode = ref("login");
		const form = reactive({
			email: "",
			password: "",
			firstName: "",
			lastName: ""
		}), consent = ref(false);
		const roles = {
			EMPLOYEE: "Сотрудник салона",
			BUYER: "Закупщик",
			ACCOUNTANT: "Бухгалтер"
		};
		watch(mode, () => {
			error.value = "";
		});
		useHead({
			title: "Приглашение в команду — SARKISIAN",
			meta: [{
				name: "robots",
				content: "noindex, nofollow"
			}, {
				name: "referrer",
				content: "no-referrer"
			}]
		});
		return (_ctx, _push, _parent, _attrs) => {
			const _component_NuxtLink = NuxtLink;
			_push(`<main${ssrRenderAttrs(mergeProps({ class: "login-page b2b-login business-invite" }, _attrs))}><section class="login-brand">`);
			_push(ssrRenderComponent(_component_NuxtLink, {
				to: "/",
				class: "login-logo"
			}, {
				default: withCtx((_, _push, _parent, _scopeId) => {
					if (_push) _push(`<img${ssrRenderAttr("src", _virtual_public__2Fsarkisian_logo_default)} alt="SARKISIAN" width="200" height="40"${_scopeId}>`);
					else return [createVNode("img", {
						src: _virtual_public__2Fsarkisian_logo_default,
						alt: "SARKISIAN",
						width: "200",
						height: "40"
					})];
				}),
				_: 1
			}, _parent));
			_push(`<div class="login-brand-copy">`);
			_push(ssrRenderComponent(unref(Building2), { size: 28 }, null, _parent));
			_push(`<h2>Ваша команда.<br>В одном кабинете.</h2><p class="login-brand-description">Записи клиентов и закупки для бизнеса — с доступами, которые назначил владелец компании.</p></div></section><section class="login-area"><form class="login-card"${ssrRenderAttr("aria-busy", unref(busy))}><h1>Приглашение в команду</h1>`);
			if (unref(loading)) _push(`<p role="status">Проверяем приглашение…</p>`);
			else _push(`<!---->`);
			if (unref(preview)) {
				_push(`<!--[--><p class="hint">${ssrInterpolate(unref(preview).organizationName)} · ${ssrInterpolate(roles[unref(preview).role])}</p><p>Приглашение для ${ssrInterpolate(unref(preview).emailHint)}. ${ssrInterpolate(unref(preview).canOrder ? "Разрешены закупки." : "")} ${ssrInterpolate(unref(preview).canSeeFinance ? "Разрешён просмотр финансов." : "")}</p>`);
				if (!unref(session).token.value) {
					_push(`<!--[--><div class="business-invite-tabs" role="tablist" aria-label="Бизнес-аккаунт"><button type="button"${ssrRenderAttr("aria-selected", unref(mode) === "login")} role="tab"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}>Войти</button><button type="button"${ssrRenderAttr("aria-selected", unref(mode) === "register")} role="tab"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}>Создать бизнес-аккаунт</button></div><p class="hint">Используйте отдельный бизнес-аккаунт. Обычный аккаунт покупателя не изменяется.</p>`);
					if (unref(mode) === "register") _push(`<!--[--><label>Имя<input${ssrRenderAttr("value", unref(form).firstName)} autocomplete="given-name" maxlength="80" required${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}></label><label>Фамилия<input${ssrRenderAttr("value", unref(form).lastName)} autocomplete="family-name" maxlength="80"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}></label><!--]-->`);
					else _push(`<!---->`);
					_push(`<label>Email из приглашения<input${ssrRenderAttr("value", unref(form).email)} type="email" autocomplete="username" maxlength="254" required${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}></label><label>Пароль<input${ssrRenderAttr("value", unref(form).password)} type="password"${ssrRenderAttr("autocomplete", unref(mode) === "login" ? "current-password" : "new-password")}${ssrRenderAttr("minlength", unref(mode) === "register" ? 10 : void 0)} maxlength="72" required${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}></label>`);
					if (unref(mode) === "register") {
						_push(`<label class="business-invite-consent"><input${ssrIncludeBooleanAttr(Array.isArray(unref(consent)) ? ssrLooseContain(unref(consent), null) : unref(consent)) ? " checked" : ""} type="checkbox" required${ssrIncludeBooleanAttr(unref(busy) || !unref(terms)) ? " disabled" : ""}>Принимаю `);
						_push(ssrRenderComponent(_component_NuxtLink, {
							to: "/privacy",
							target: "_blank"
						}, {
							default: withCtx((_, _push, _parent, _scopeId) => {
								if (_push) _push(`политику конфиденциальности`);
								else return [createTextVNode("политику конфиденциальности")];
							}),
							_: 1
						}, _parent));
						_push(` и `);
						_push(ssrRenderComponent(_component_NuxtLink, {
							to: "/oferta",
							target: "_blank"
						}, {
							default: withCtx((_, _push, _parent, _scopeId) => {
								if (_push) _push(`условия использования`);
								else return [createTextVNode("условия использования")];
							}),
							_: 1
						}, _parent));
						_push(`.</label>`);
					} else _push(`<!---->`);
					if (unref(mode) === "register" && unref(termsError)) _push(`<p class="login-error" role="alert">${ssrInterpolate(unref(termsError))}</p>`);
					else _push(`<!---->`);
					_push(`<!--]-->`);
				} else _push(`<!--[--><p>Вы вошли как ${ssrInterpolate(unref(session).user.value?.email)}.</p><button type="button"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}>Войти в другой бизнес-аккаунт</button><!--]-->`);
				_push(`<!--]-->`);
			} else _push(`<!---->`);
			if (unref(error)) _push(`<p class="login-error" role="alert">${ssrInterpolate(unref(error))}</p>`);
			else _push(`<!---->`);
			if (unref(preview)) {
				_push(`<button class="submit" type="submit"${ssrIncludeBooleanAttr(unref(busy) || unref(loading)) ? " disabled" : ""}><span>${ssrInterpolate(unref(busy) ? "Подключаем…" : "Принять приглашение")}</span>`);
				_push(ssrRenderComponent(unref(ArrowRight), { size: 20 }, null, _parent));
				_push(`</button>`);
			} else _push(`<!---->`);
			_push(ssrRenderComponent(_component_NuxtLink, {
				to: "/b2b-login",
				class: "login-site-link"
			}, {
				default: withCtx((_, _push, _parent, _scopeId) => {
					if (_push) _push(`Открыть вход для бизнеса`);
					else return [createTextVNode("Открыть вход для бизнеса")];
				}),
				_: 1
			}, _parent));
			_push(`</form></section></main>`);
		};
	}
});
// pages/b2b-invite.vue
var _sfc_setup = b2b_invite_vue_vue_type_script_setup_true_lang_default.setup;
b2b_invite_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/b2b-invite.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var b2b_invite_default = b2b_invite_vue_vue_type_script_setup_true_lang_default;

export { b2b_invite_default as default };;globalThis.__timing__.logEnd('Load chunks/build/b2b-invite-xRFL-lni');
//# sourceMappingURL=b2b-invite-xRFL-lni.mjs.map
