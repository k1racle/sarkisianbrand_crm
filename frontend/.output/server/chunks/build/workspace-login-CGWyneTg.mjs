globalThis.__timing__.logStart('Load chunks/build/workspace-login-CGWyneTg');import { c as useRoute, a as useWorkspaceSession, N as NuxtLink } from '../virtual/entry.mjs';
import { _ as _virtual_public__2Fsarkisian_logo_default } from './_virtual_public-Bnta_Oua.mjs';
import { defineComponent, ref, mergeProps, withCtx, createVNode, unref, createTextVNode, useSSRContext } from 'vue';
import { ssrRenderAttrs, ssrRenderComponent, ssrRenderAttr, ssrIncludeBooleanAttr, ssrRenderDynamicModel, ssrInterpolate } from 'vue/server-renderer';
import { LockKeyhole, EyeOff, Eye, ArrowRight } from '@lucide/vue';
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

// pages/workspace-login.vue?vue&type=script&setup=true&lang.ts
var workspace_login_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "workspace-login",
	__ssrInlineRender: true,
	setup(__props) {
		useRoute();
		useWorkspaceSession();
		const email = ref("admin@sarkisianbrand.ru");
		const password = ref("");
		const showPassword = ref(false);
		const loading = ref(false);
		const error = ref("");
		return (_ctx, _push, _parent, _attrs) => {
			const _component_NuxtLink = NuxtLink;
			_push(`<main${ssrRenderAttrs(mergeProps({
				"data-v-ui-cf8895abb452": "",
				class: "login-page workspace-login sb-storefront"
			}, _attrs))}><section data-v-ui-cf8895abb452 class="login-brand" aria-label="SARKISIAN Workspace">`);
			_push(ssrRenderComponent(_component_NuxtLink, {
				"data-v-ui-cf8895abb452": "",
				to: "/",
				class: "login-logo",
				"aria-label": "SARKISIAN — на главную сайта"
			}, {
				default: withCtx((_, _push, _parent, _scopeId) => {
					if (_push) _push(`<img data-v-ui-cf8895abb452${ssrRenderAttr("src", _virtual_public__2Fsarkisian_logo_default)} alt="SARKISIAN" width="200" height="40"${_scopeId}>`);
					else return [createVNode("img", {
						"data-v-ui-cf8895abb452": "",
						src: _virtual_public__2Fsarkisian_logo_default,
						alt: "SARKISIAN",
						width: "200",
						height: "40"
					})];
				}),
				_: 1
			}, _parent));
			_push(`<div data-v-ui-cf8895abb452 class="login-brand-copy"><p data-v-ui-cf8895abb452 class="login-brand-kicker">Единая бизнес-платформа</p><h2 data-v-ui-cf8895abb452>Вся компания.<br data-v-ui-cf8895abb452><em data-v-ui-cf8895abb452>В одном ритме.</em></h2><p data-v-ui-cf8895abb452 class="login-brand-description">Продажи, клиенты, маркетплейсы, поддержка и управленческие показатели — в одной экосистеме.</p><div data-v-ui-cf8895abb452 class="login-brand-note">`);
			_push(ssrRenderComponent(unref(LockKeyhole), {
				"data-v-ui-cf8895abb452": "",
				size: 18,
				"aria-hidden": "true"
			}, null, _parent));
			_push(`<span data-v-ui-cf8895abb452>Один кабинет. Доступ согласно вашей роли.</span></div></div><footer data-v-ui-cf8895abb452>Рабочее пространство команды SARKISIAN</footer></section><section data-v-ui-cf8895abb452 class="login-area" aria-labelledby="workspace-login-title"><form data-v-ui-cf8895abb452 class="login-card"${ssrRenderAttr("aria-busy", unref(loading))}><header data-v-ui-cf8895abb452 class="login-card-header"><div data-v-ui-cf8895abb452 class="login-symbol">`);
			_push(ssrRenderComponent(unref(LockKeyhole), {
				"data-v-ui-cf8895abb452": "",
				size: 22,
				"aria-hidden": "true"
			}, null, _parent));
			_push(`</div><p data-v-ui-cf8895abb452 class="eyebrow">SARKISIAN WORKSPACE</p></header><h1 data-v-ui-cf8895abb452 id="workspace-login-title">Вход в систему</h1><p data-v-ui-cf8895abb452 id="workspace-login-hint" class="hint">Используйте корпоративную учётную запись. Доступные разделы появятся согласно вашей роли.</p><label data-v-ui-cf8895abb452 for="workspace-email">Корпоративный email</label><input data-v-ui-cf8895abb452 id="workspace-email"${ssrRenderAttr("value", unref(email))} type="email" name="username" autocomplete="username" autocapitalize="none"${ssrRenderAttr("spellcheck", false)} inputmode="email" placeholder="name@sarkisianbrand.ru"${ssrIncludeBooleanAttr(unref(loading)) ? " disabled" : ""} aria-describedby="workspace-login-hint"${ssrRenderAttr("aria-invalid", Boolean(unref(error)))} required><label data-v-ui-cf8895abb452 for="workspace-password">Пароль</label><div data-v-ui-cf8895abb452 class="password"><input data-v-ui-cf8895abb452 id="workspace-password"${ssrRenderDynamicModel(unref(showPassword) ? "text" : "password", unref(password), null)}${ssrRenderAttr("type", unref(showPassword) ? "text" : "password")} name="password" autocomplete="current-password" placeholder="Введите пароль"${ssrIncludeBooleanAttr(unref(loading)) ? " disabled" : ""}${ssrRenderAttr("aria-invalid", Boolean(unref(error)))}${ssrRenderAttr("aria-describedby", unref(error) ? "workspace-login-error" : void 0)} required><button data-v-ui-cf8895abb452 type="button"${ssrIncludeBooleanAttr(unref(loading)) ? " disabled" : ""}${ssrRenderAttr("aria-label", unref(showPassword) ? "Скрыть пароль" : "Показать пароль")}${ssrRenderAttr("aria-pressed", unref(showPassword))} aria-controls="workspace-password">`);
			if (unref(showPassword)) _push(ssrRenderComponent(unref(EyeOff), {
				"data-v-ui-cf8895abb452": "",
				size: 20,
				"aria-hidden": "true"
			}, null, _parent));
			else _push(ssrRenderComponent(unref(Eye), {
				"data-v-ui-cf8895abb452": "",
				size: 20,
				"aria-hidden": "true"
			}, null, _parent));
			_push(`</button></div>`);
			if (unref(error)) _push(`<p data-v-ui-cf8895abb452 id="workspace-login-error" class="login-error" role="alert">${ssrInterpolate(unref(error))}</p>`);
			else _push(`<!---->`);
			_push(`<button data-v-ui-cf8895abb452 class="submit" type="submit"${ssrIncludeBooleanAttr(unref(loading)) ? " disabled" : ""}><span data-v-ui-cf8895abb452>${ssrInterpolate(unref(loading) ? "Проверяем данные…" : "Войти в Workspace")}</span>`);
			_push(ssrRenderComponent(unref(ArrowRight), {
				"data-v-ui-cf8895abb452": "",
				size: 20,
				"aria-hidden": "true"
			}, null, _parent));
			_push(`</button><small data-v-ui-cf8895abb452>Проблемы со входом? Создайте обращение в IT Helpdesk.</small>`);
			_push(ssrRenderComponent(_component_NuxtLink, {
				"data-v-ui-cf8895abb452": "",
				to: "/",
				class: "login-site-link"
			}, {
				default: withCtx((_, _push, _parent, _scopeId) => {
					if (_push) {
						_push(`Вернуться на сайт `);
						_push(ssrRenderComponent(unref(ArrowRight), {
							"data-v-ui-cf8895abb452": "",
							size: 16,
							"aria-hidden": "true"
						}, null, _parent, _scopeId));
					} else return [createTextVNode("Вернуться на сайт "), createVNode(unref(ArrowRight), {
						"data-v-ui-cf8895abb452": "",
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
// pages/workspace-login.vue
var _sfc_setup = workspace_login_vue_vue_type_script_setup_true_lang_default.setup;
workspace_login_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/workspace-login.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var workspace_login_default = workspace_login_vue_vue_type_script_setup_true_lang_default;

export { workspace_login_default as default };;globalThis.__timing__.logEnd('Load chunks/build/workspace-login-CGWyneTg');
//# sourceMappingURL=workspace-login-CGWyneTg.mjs.map
