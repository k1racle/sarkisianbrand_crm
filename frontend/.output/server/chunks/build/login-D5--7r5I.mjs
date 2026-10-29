globalThis.__timing__.logStart('Load chunks/build/login-D5--7r5I');import { c as useRoute, p as useStorefront, r as useSeoMeta, S as SiteShell_default, N as NuxtLink, Y as SiteSocialLoginButtons_default, $ as $fetch$1, n as navigateTo, f as useRuntimeConfig } from '../virtual/entry.mjs';
import { defineComponent, ref, reactive, withCtx, unref, createVNode, createTextVNode, toDisplayString, withModifiers, openBlock, createBlock, withDirectives, vModelText, createCommentVNode, vModelDynamic, useSSRContext } from 'vue';
import { ssrRenderComponent, ssrRenderClass, ssrInterpolate, ssrRenderAttr, ssrRenderDynamicModel, ssrIncludeBooleanAttr } from 'vue/server-renderer';
import { BriefcaseBusiness, ArrowRight, EyeOff, Eye, LockKeyhole, UserPlus } from '@lucide/vue';
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

// pages/login.vue?vue&type=script&setup=true&lang.ts
var login_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "login",
	__ssrInlineRender: true,
	setup(__props) {
		const config = useRuntimeConfig();
		const route = useRoute();
		const mode = ref("login");
		const showPassword = ref(false);
		const busy = ref(false);
		const error = ref("");
		const socialNotice = ref("");
		const form = reactive({
			email: "",
			password: "",
			firstName: "",
			lastName: "",
			phone: ""
		});
		const { login, register } = useStorefront();
		if (route.query.social_error) socialNotice.value = String(route.query.social_error);
		async function submit() {
			error.value = "";
			busy.value = true;
			try {
				if (mode.value === "login") await login(form.email, form.password);
				else await register(form);
				await navigateTo(String(route.query.return || "/account"));
			} catch (e) {
				error.value = Array.isArray(e?.data?.message) ? e.data.message.join(". ") : e?.data?.message || "Не удалось войти. Проверьте данные.";
			} finally {
				busy.value = false;
			}
		}
		async function social(provider) {
			socialNotice.value = "";
			try {
				const result = await $fetch$1(`/auth/social/${provider}/start`, {
					baseURL: config.public.apiBase,
					query: { returnUrl: String(route.query.return || "/account") }
				});
				if (result.authorizationUrl) (void 0).location.href = result.authorizationUrl;
			} catch (e) {
				socialNotice.value = e?.data?.message || `Вход через ${provider === "yandex" ? "Яндекс" : "VK"} будет доступен после подключения приложения в настройках экосистемы.`;
			}
		}
		useSeoMeta({ title: "Вход и регистрация — SARKISIAN BRAND" });
		return (_ctx, _push, _parent, _attrs) => {
			const _component_SiteShell = SiteShell_default;
			const _component_NuxtLink = NuxtLink;
			const _component_SiteSocialLoginButtons = SiteSocialLoginButtons_default;
			_push(ssrRenderComponent(_component_SiteShell, _attrs, {
				default: withCtx((_, _push, _parent, _scopeId) => {
					if (_push) {
						_push(`<div class="sb-auth-page"${_scopeId}><section class="sb-auth-intro"${_scopeId}><p${_scopeId}>ЛИЧНЫЙ КАБИНЕТ</p><h1${_scopeId}>Покупки становятся <em${_scopeId}>удобнее</em></h1><ul${_scopeId}><li${_scopeId}>История и статусы заказов</li><li${_scopeId}>Бонусный баланс и персональные предложения</li><li${_scopeId}>Быстрое оформление с сохранёнными данными</li></ul>`);
						_push(ssrRenderComponent(_component_NuxtLink, { to: "/b2b-login" }, {
							default: withCtx((_, _push, _parent, _scopeId) => {
								if (_push) {
									_push(ssrRenderComponent(unref(BriefcaseBusiness), { size: 18 }, null, _parent, _scopeId));
									_push(`<span${_scopeId}><b${_scopeId}>Вы покупаете для салона?</b>Перейти во вход для B2B-клиентов</span>`);
									_push(ssrRenderComponent(unref(ArrowRight), { size: 18 }, null, _parent, _scopeId));
								} else return [
									createVNode(unref(BriefcaseBusiness), { size: 18 }),
									createVNode("span", null, [createVNode("b", null, "Вы покупаете для салона?"), createTextVNode("Перейти во вход для B2B-клиентов")]),
									createVNode(unref(ArrowRight), { size: 18 })
								];
							}),
							_: 1
						}, _parent, _scopeId));
						_push(`</section><section class="sb-auth-card"${_scopeId}><div class="sb-auth-tabs"${_scopeId}><button class="${ssrRenderClass({ active: unref(mode) === "login" })}"${_scopeId}>Вход</button><button class="${ssrRenderClass({ active: unref(mode) === "register" })}"${_scopeId}>Регистрация</button></div><div${_scopeId}><p class="sb-kicker"${_scopeId}>SARKISIAN CLUB</p><h2${_scopeId}>${ssrInterpolate(unref(mode) === "login" ? "С возвращением" : "Создать аккаунт")}</h2><span${_scopeId}>${ssrInterpolate(unref(mode) === "login" ? "Войдите, чтобы продолжить покупки." : "Получайте бонусы уже с первого заказа.")}</span></div><form${_scopeId}>`);
						if (unref(mode) === "register") _push(`<div class="sb-auth-row"${_scopeId}><label${_scopeId}>Имя<input${ssrRenderAttr("value", unref(form).firstName)} autocomplete="given-name" required${_scopeId}></label><label${_scopeId}>Фамилия<input${ssrRenderAttr("value", unref(form).lastName)} autocomplete="family-name"${_scopeId}></label></div>`);
						else _push(`<!---->`);
						_push(`<label${_scopeId}>Email<input${ssrRenderAttr("value", unref(form).email)} type="email" autocomplete="email" required${_scopeId}></label>`);
						if (unref(mode) === "register") _push(`<label${_scopeId}>Телефон<input${ssrRenderAttr("value", unref(form).phone)} type="tel" autocomplete="tel" placeholder="+7 999 000-00-00"${_scopeId}></label>`);
						else _push(`<!---->`);
						_push(`<label${_scopeId}>Пароль<div class="sb-password"${_scopeId}><input${ssrRenderDynamicModel(unref(showPassword) ? "text" : "password", unref(form).password, null)}${ssrRenderAttr("type", unref(showPassword) ? "text" : "password")}${ssrRenderAttr("autocomplete", unref(mode) === "login" ? "current-password" : "new-password")} minlength="10" required${_scopeId}><button type="button"${ssrRenderAttr("aria-label", unref(showPassword) ? "Скрыть пароль" : "Показать пароль")}${_scopeId}>`);
						if (unref(showPassword)) _push(ssrRenderComponent(unref(EyeOff), { size: 18 }, null, _parent, _scopeId));
						else _push(ssrRenderComponent(unref(Eye), { size: 18 }, null, _parent, _scopeId));
						_push(`</button></div></label>`);
						if (unref(error)) _push(`<p class="sb-form-error"${_scopeId}>${ssrInterpolate(unref(error))}</p>`);
						else _push(`<!---->`);
						_push(`<button class="sb-primary"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}${_scopeId}>`);
						if (unref(mode) === "login") _push(ssrRenderComponent(unref(LockKeyhole), { size: 18 }, null, _parent, _scopeId));
						else _push(ssrRenderComponent(unref(UserPlus), { size: 18 }, null, _parent, _scopeId));
						_push(`${ssrInterpolate(unref(busy) ? "Подождите…" : unref(mode) === "login" ? "Войти" : "Зарегистрироваться")}</button></form><div class="sb-social-divider"${_scopeId}><span${_scopeId}>или продолжить через</span></div>`);
						_push(ssrRenderComponent(_component_SiteSocialLoginButtons, { onSelect: social }, null, _parent, _scopeId));
						if (unref(socialNotice)) _push(`<p class="sb-social-notice"${_scopeId}>${ssrInterpolate(unref(socialNotice))}</p>`);
						else _push(`<!---->`);
						_push(`</section></div>`);
					} else return [createVNode("div", { class: "sb-auth-page" }, [createVNode("section", { class: "sb-auth-intro" }, [
						createVNode("p", null, "ЛИЧНЫЙ КАБИНЕТ"),
						createVNode("h1", null, [createTextVNode("Покупки становятся "), createVNode("em", null, "удобнее")]),
						createVNode("ul", null, [
							createVNode("li", null, "История и статусы заказов"),
							createVNode("li", null, "Бонусный баланс и персональные предложения"),
							createVNode("li", null, "Быстрое оформление с сохранёнными данными")
						]),
						createVNode(_component_NuxtLink, { to: "/b2b-login" }, {
							default: withCtx(() => [
								createVNode(unref(BriefcaseBusiness), { size: 18 }),
								createVNode("span", null, [createVNode("b", null, "Вы покупаете для салона?"), createTextVNode("Перейти во вход для B2B-клиентов")]),
								createVNode(unref(ArrowRight), { size: 18 })
							]),
							_: 1
						})
					]), createVNode("section", { class: "sb-auth-card" }, [
						createVNode("div", { class: "sb-auth-tabs" }, [createVNode("button", {
							class: { active: unref(mode) === "login" },
							onClick: ($event) => mode.value = "login"
						}, "Вход", 10, ["onClick"]), createVNode("button", {
							class: { active: unref(mode) === "register" },
							onClick: ($event) => mode.value = "register"
						}, "Регистрация", 10, ["onClick"])]),
						createVNode("div", null, [
							createVNode("p", { class: "sb-kicker" }, "SARKISIAN CLUB"),
							createVNode("h2", null, toDisplayString(unref(mode) === "login" ? "С возвращением" : "Создать аккаунт"), 1),
							createVNode("span", null, toDisplayString(unref(mode) === "login" ? "Войдите, чтобы продолжить покупки." : "Получайте бонусы уже с первого заказа."), 1)
						]),
						createVNode("form", { onSubmit: withModifiers(submit, ["prevent"]) }, [
							unref(mode) === "register" ? (openBlock(), createBlock("div", {
								key: 0,
								class: "sb-auth-row"
							}, [createVNode("label", null, [createTextVNode("Имя"), withDirectives(createVNode("input", {
								"onUpdate:modelValue": ($event) => unref(form).firstName = $event,
								autocomplete: "given-name",
								required: ""
							}, null, 8, ["onUpdate:modelValue"]), [[vModelText, unref(form).firstName]])]), createVNode("label", null, [createTextVNode("Фамилия"), withDirectives(createVNode("input", {
								"onUpdate:modelValue": ($event) => unref(form).lastName = $event,
								autocomplete: "family-name"
							}, null, 8, ["onUpdate:modelValue"]), [[vModelText, unref(form).lastName]])])])) : createCommentVNode("", true),
							createVNode("label", null, [createTextVNode("Email"), withDirectives(createVNode("input", {
								"onUpdate:modelValue": ($event) => unref(form).email = $event,
								type: "email",
								autocomplete: "email",
								required: ""
							}, null, 8, ["onUpdate:modelValue"]), [[vModelText, unref(form).email]])]),
							unref(mode) === "register" ? (openBlock(), createBlock("label", { key: 1 }, [createTextVNode("Телефон"), withDirectives(createVNode("input", {
								"onUpdate:modelValue": ($event) => unref(form).phone = $event,
								type: "tel",
								autocomplete: "tel",
								placeholder: "+7 999 000-00-00"
							}, null, 8, ["onUpdate:modelValue"]), [[vModelText, unref(form).phone]])])) : createCommentVNode("", true),
							createVNode("label", null, [createTextVNode("Пароль"), createVNode("div", { class: "sb-password" }, [withDirectives(createVNode("input", {
								"onUpdate:modelValue": ($event) => unref(form).password = $event,
								type: unref(showPassword) ? "text" : "password",
								autocomplete: unref(mode) === "login" ? "current-password" : "new-password",
								minlength: "10",
								required: ""
							}, null, 8, [
								"onUpdate:modelValue",
								"type",
								"autocomplete"
							]), [[vModelDynamic, unref(form).password]]), createVNode("button", {
								type: "button",
								"aria-label": unref(showPassword) ? "Скрыть пароль" : "Показать пароль",
								onClick: ($event) => showPassword.value = !unref(showPassword)
							}, [unref(showPassword) ? (openBlock(), createBlock(unref(EyeOff), {
								key: 0,
								size: 18
							})) : (openBlock(), createBlock(unref(Eye), {
								key: 1,
								size: 18
							}))], 8, ["aria-label", "onClick"])])]),
							unref(error) ? (openBlock(), createBlock("p", {
								key: 2,
								class: "sb-form-error"
							}, toDisplayString(unref(error)), 1)) : createCommentVNode("", true),
							createVNode("button", {
								class: "sb-primary",
								disabled: unref(busy)
							}, [unref(mode) === "login" ? (openBlock(), createBlock(unref(LockKeyhole), {
								key: 0,
								size: 18
							})) : (openBlock(), createBlock(unref(UserPlus), {
								key: 1,
								size: 18
							})), createTextVNode(toDisplayString(unref(busy) ? "Подождите…" : unref(mode) === "login" ? "Войти" : "Зарегистрироваться"), 1)], 8, ["disabled"])
						], 32),
						createVNode("div", { class: "sb-social-divider" }, [createVNode("span", null, "или продолжить через")]),
						createVNode(_component_SiteSocialLoginButtons, { onSelect: social }),
						unref(socialNotice) ? (openBlock(), createBlock("p", {
							key: 0,
							class: "sb-social-notice"
						}, toDisplayString(unref(socialNotice)), 1)) : createCommentVNode("", true)
					])])];
				}),
				_: 1
			}, _parent));
		};
	}
});
// pages/login.vue
var _sfc_setup = login_vue_vue_type_script_setup_true_lang_default.setup;
login_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/login.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var login_default = login_vue_vue_type_script_setup_true_lang_default;

export { login_default as default };;globalThis.__timing__.logEnd('Load chunks/build/login-D5--7r5I');
//# sourceMappingURL=login-D5--7r5I.mjs.map
